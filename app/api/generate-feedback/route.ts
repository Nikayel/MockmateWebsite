import { NextRequest, NextResponse } from "next/server"
import { feedbackRateLimit } from "@/lib/rate-limit"
import { generateFeedbackResponse } from "@/lib/ai-providers"
import { trackFeedbackGenerationServer } from "@/lib/analytics-server"

// Structured feedback schema for reliable extraction
interface FeedbackScores {
  correctness: number
  efficiency: number
  codeQuality: number
  reasoningExplanation: number
  aiCollaboration: number
  overall: number
}

interface StructuredFeedback {
  scores: FeedbackScores
  tldr: string
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]
  aiWatchlist: string
  rawFeedback: string
}

/**
 * Extract scores from feedback text using multiple patterns
 * Falls back to intelligent defaults based on context
 */
function extractScores(feedback: string, metrics: {
  testsPassed: number
  testsTotal: number
  timeSpent: number
  collaborationMessages: number
  efficiencyMetrics?: {
    efficiencyScore?: number
    estimatedTimeComplexity?: string
    optimalTimeComplexity?: string
    estimatedSpaceComplexity?: string
    optimalSpaceComplexity?: string
  }
}): FeedbackScores {
  const scores: FeedbackScores = {
    correctness: 70,
    efficiency: 70,
    codeQuality: 70,
    reasoningExplanation: 70,
    aiCollaboration: 70,
    overall: 70,
  }

  // Pattern: "Label: X/100" or "Label: X/10"
  const patterns = [
    { key: 'correctness', patterns: [/Correctness[:\s]+(\d+)\/100/i, /Correctness[:\s]+(\d+)\/10/i] },
    { key: 'efficiency', patterns: [/Efficiency[:\s]+(\d+)\/100/i, /Efficiency[:\s]+(\d+)\/10/i] },
    { key: 'codeQuality', patterns: [/Code\s*Quality[:\s]+(\d+)\/100/i, /Code\s*Quality[:\s]+(\d+)\/10/i] },
    { key: 'reasoningExplanation', patterns: [/Reasoning\s*(?:&|and)?\s*Explanation[:\s]+(\d+)\/100/i, /Reasoning\s*(?:&|and)?\s*Explanation[:\s]+(\d+)\/10/i] },
    { key: 'aiCollaboration', patterns: [/AI\s*Collaboration[:\s]+(\d+)\/100/i, /AI\s*Collaboration[:\s]+(\d+)\/10/i] },
    { key: 'overall', patterns: [/Overall[:\s]+(\d+)\/100/i, /Overall[:\s]+(\d+)\/10/i] },
  ]

  for (const { key, patterns: patternList } of patterns) {
    for (const pattern of patternList) {
      const match = feedback.match(pattern)
      if (match) {
        let value = parseInt(match[1], 10)
        // Convert /10 scale to /100
        if (pattern.toString().includes('/10')) {
          value = value * 10
        }
        scores[key as keyof FeedbackScores] = Math.min(100, Math.max(0, value))
        break
      }
    }
  }

  // Apply penalties based on actual metrics if scores weren't extracted properly
  if (metrics.collaborationMessages === 0) {
    // No collaboration = 0 for these categories
    scores.reasoningExplanation = Math.min(scores.reasoningExplanation, 0)
    scores.aiCollaboration = Math.min(scores.aiCollaboration, 0)
  } else if (metrics.collaborationMessages <= 2) {
    // Minimal collaboration = capped scores
    scores.reasoningExplanation = Math.min(scores.reasoningExplanation, 30)
    scores.aiCollaboration = Math.min(scores.aiCollaboration, 30)
  }

  // Test-based correctness adjustment
  if (metrics.testsTotal > 0) {
    const passRate = (metrics.testsPassed / metrics.testsTotal) * 100
    // If tests failed but score is high, adjust
    if (passRate < 50 && scores.correctness > 60) {
      scores.correctness = Math.min(scores.correctness, passRate + 20)
    }
    // If all tests failed, cap correctness very low
    if (passRate === 0) {
      scores.correctness = Math.min(scores.correctness, 15)
    }
  }

  // Efficiency-based adjustments using actual code analysis
  if (metrics.efficiencyMetrics) {
    const eff = metrics.efficiencyMetrics
    const timeOptimal = eff.estimatedTimeComplexity === eff.optimalTimeComplexity
    const spaceOptimal = eff.estimatedSpaceComplexity === eff.optimalSpaceComplexity

    // Cap efficiency based on actual complexity analysis
    if (!timeOptimal && !spaceOptimal) {
      // Both suboptimal - cap at 50
      scores.efficiency = Math.min(scores.efficiency, 50)
    } else if (!timeOptimal) {
      // Time suboptimal - cap at 70
      scores.efficiency = Math.min(scores.efficiency, 70)
    } else if (!spaceOptimal) {
      // Space suboptimal - cap at 80
      scores.efficiency = Math.min(scores.efficiency, 80)
    }

    // Use actual efficiency score as a floor/ceiling reference
    if (eff.efficiencyScore !== undefined) {
      // Don't let AI score be more than 15 points higher than calculated
      scores.efficiency = Math.min(scores.efficiency, eff.efficiencyScore + 15)
    }
  }

  // ALWAYS recalculate overall from component scores to ensure accuracy
  // This is critical because 0s in reasoning/collaboration MUST affect overall
  const avgScore = Math.round(
    (scores.correctness + scores.efficiency + scores.codeQuality +
     scores.reasoningExplanation + scores.aiCollaboration) / 5
  )

  // Always use calculated average - don't trust AI's overall
  scores.overall = avgScore

  return scores
}

/**
 * Parse structured sections from feedback
 */
function parseFeedbackSections(feedback: string): Partial<StructuredFeedback> {
  const sections: Partial<StructuredFeedback> = {}

  // Extract TL;DR
  const tldrMatch = feedback.match(/\*\*TL;DR\*\*[:\s]*([^\n*]+)/i)
  if (tldrMatch) {
    sections.tldr = tldrMatch[1].trim()
  }

  // Extract What Worked (bullet points)
  const whatWorkedMatch = feedback.match(/\*\*What Worked\*\*[\s\S]*?((?:-[^\n]+\n?)+)/i)
  if (whatWorkedMatch) {
    sections.whatWorked = whatWorkedMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  // Extract Fix Next
  const fixNextMatch = feedback.match(/\*\*Fix Next\*\*[\s\S]*?((?:-[^\n]+\n?)+)/i)
  if (fixNextMatch) {
    sections.fixNext = fixNextMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  // Extract Action Plan
  const actionMatch = feedback.match(/\*\*Action Plan\*\*[\s\S]*?((?:\d+\.[^\n]+\n?)+)/i)
  if (actionMatch) {
    sections.actionPlan = actionMatch[1]
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  // Extract AI Watchlist
  const watchlistMatch = feedback.match(/\*\*AI\s*(?:&|and)?\s*Communication Watchlist\*\*[:\s]*([^\n]+(?:\n[^*\n]+)*)/i)
  if (watchlistMatch) {
    sections.aiWatchlist = watchlistMatch[1].trim()
  }

  return sections
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await feedbackRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const startTime = Date.now()

  try {
    const { code, scenarioTitle, scenarioType, testResults, language, timeSpent, aiCollaborationMetrics, interactionMetrics, efficiencyMetrics, sessionId, userId } = await request.json()

    if (!code || !scenarioTitle) {
      return NextResponse.json({ error: "Code and scenario title are required" }, { status: 400 })
    }

    // Calculate collaboration message count
    const collaborationMessages = (aiCollaborationMetrics?.partnerMessagesSent || 0) +
      (interactionMetrics?.interviewerQuestionsAnswered || 0)

    // Calculate test metrics
    const testsPassed = testResults?.filter((t: any) => t.passed).length || 0
    const testsTotal = testResults?.length || 0

    // Define system instruction for feedback generation (with structured output guidance)
    const systemInstruction = `You are a senior interviewer delivering a focused technical debrief. Be direct, data-driven, and constructive.

CRITICAL: Output ALL scores in EXACT format "Label: X/100" for reliable parsing.

## SCORING FRAMEWORK (follow strictly)

**Correctness (0-100):**
- 100% tests pass = 85-100 (depending on edge cases handled)
- 80-99% tests pass = 65-85
- 50-79% tests pass = 40-65
- Below 50% pass = 0-40
- 0% pass = 0-15

**Efficiency (0-100):**
- Optimal time AND space complexity = 85-100
- Optimal time OR space = 60-85
- Both suboptimal = 30-60
- Use provided efficiency metrics as reference

**Code Quality (0-100):**
- Clean structure, good naming, proper formatting = 80-100
- Acceptable but could improve = 60-80
- Poor organization or naming = 40-60
- Major quality issues = 0-40

**Reasoning & Explanation (0-100):**
- 0 messages = 0/100 (critical failure: no communication)
- 1-2 messages = 10-30/100
- 3-5 messages = 40-60/100
- 6+ quality messages with explanations = 70-100/100

**AI Collaboration (0-100):**
- Same scale as Reasoning based on message count
- Quality matters: strategic questions > random asks

## OUTPUT FORMAT (use exactly)

**TL;DR** – One sentence: what they did well + biggest gap.

**Score Snapshot**
- Correctness: X/100 – brief justification
- Efficiency: X/100 – brief justification
- Code Quality: X/100 – brief justification
- Reasoning & Explanation: X/100 – brief justification
- AI Collaboration: X/100 – brief justification
- Overall: X/100 – weighted average summary

**What Worked** (max 3 bullets)
- specific strength with evidence

**Fix Next** (max 3 bullets, prioritized)
- specific improvement with concrete action

**Action Plan** (3 numbered steps)
1. Immediate action
2. Short-term practice
3. Long-term skill development

**AI & Communication Watchlist** – One paragraph on collaboration quality. If zero messages: "No evidence of thinking out loud—narrate your approach next time."

RULES:
- ~300 words max. Be concise.
- Every point must reference actual data (tests, time, messages, complexity).
- Zero collaboration = 0/100 for Reasoning AND AI Collaboration.
- Never praise if tests fail. Address failures first.
- Don't invent data. Say "No signal captured" if missing.
`

    const testResultsSummary = testResults && Array.isArray(testResults)
      ? `\n\nTEST RESULTS:\n- Total tests: ${testsTotal}\n- Passed: ${testsPassed}\n- Failed: ${testsTotal - testsPassed}\n`
      : ""

    const timeInfo = timeSpent ? `\n\nTIME SPENT: ${Math.floor(timeSpent / 60)} minutes ${timeSpent % 60} seconds\n` : ""

    const aiCollaborationInfo = aiCollaborationMetrics ? `
AI COLLABORATION METRICS:
- Partner messages sent by user: ${aiCollaborationMetrics.partnerMessagesSent || 0}
- Partner messages received: ${aiCollaborationMetrics.partnerMessagesReceived || 0}
- Hints requested: ${aiCollaborationMetrics.partnerHintsRequested || 0}
- Code suggestions accepted: ${aiCollaborationMetrics.partnerCodeSuggestionsAccepted || 0}
- AI collaboration quality: ${aiCollaborationMetrics.aiCollaborationQuality || 'Not assessed'}
- AI questions quality: ${aiCollaborationMetrics.aiQuestionsQuality || 'Not assessed'}
- AI suggestions understood: ${aiCollaborationMetrics.aiSuggestionsUnderstood || 0}
- AI suggestions misunderstood: ${aiCollaborationMetrics.aiSuggestionsMisunderstood || 0}
- Strategic AI usage: ${aiCollaborationMetrics.strategicAiUsage || 'Not assessed'}
- AI over-dependency: ${aiCollaborationMetrics.aiOverDependency || 'Not assessed'}
` : `
AI COLLABORATION METRICS:
- Partner messages sent by user: 0
- No collaboration data available
`

    const interactionInfo = interactionMetrics ? `
INTERVIEWER INTERACTION METRICS:
- Questions answered by candidate: ${interactionMetrics.interviewerQuestionsAnswered || 0}
- Clarifications requested: ${interactionMetrics.interviewerClarificationsRequested || 0}
- Feedback acknowledged: ${interactionMetrics.interviewerFeedbackAcknowledged || 0}
- Proactive interactions: ${interactionMetrics.proactiveInteractions || 0}
- Problem difficulty: ${interactionMetrics.problemDifficulty || 'Not specified'}
- Problem type: ${interactionMetrics.problemType || 'Not specified'}
- Skills demonstrated: ${interactionMetrics.skillsDemonstrated?.join(', ') || 'Not tracked'}
` : `
INTERVIEWER INTERACTION METRICS:
- Questions answered by candidate: 0
- No interaction data available
`

    const efficiencyInfo = efficiencyMetrics ? `
CODE EFFICIENCY ANALYSIS:
- Lines of code: ${efficiencyMetrics.linesOfCode || 'N/A'}
- Code complexity level: ${efficiencyMetrics.complexity || 'N/A'}
- Estimated time complexity: ${efficiencyMetrics.estimatedTimeComplexity || 'N/A'}
- Optimal time complexity: ${efficiencyMetrics.optimalTimeComplexity || 'N/A'}
- Estimated space complexity: ${efficiencyMetrics.estimatedSpaceComplexity || 'N/A'}
- Optimal space complexity: ${efficiencyMetrics.optimalSpaceComplexity || 'N/A'}
- Efficiency score: ${efficiencyMetrics.efficiencyScore || 'N/A'}/100
- Time complexity match: ${efficiencyMetrics.estimatedTimeComplexity === efficiencyMetrics.optimalTimeComplexity ? 'YES - Optimal' : 'NO - Suboptimal'}
- Space complexity match: ${efficiencyMetrics.estimatedSpaceComplexity === efficiencyMetrics.optimalSpaceComplexity ? 'YES - Optimal' : 'NO - Suboptimal'}
` : `
CODE EFFICIENCY ANALYSIS:
- No efficiency data available
`

    const prompt = `Provide a concise, brutally honest interview debrief using the exact structure from the system instruction.

PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType})` : ''}
LANGUAGE: ${language || 'JavaScript'}
${timeInfo}
${testResultsSummary}
${aiCollaborationInfo}
${interactionInfo}
${efficiencyInfo}

TOTAL COLLABORATION MESSAGES FROM USER: ${collaborationMessages}

SOLUTION CODE (for reference only):
\`\`\`${language || 'javascript'}
${code.length > 5000 ? code.slice(0, 5000) + '\n// ... [truncated]' : code}
\`\`\`

${testResults && testResults.length > 0 ? `
FAILED TESTS DETAILS:
${testResults.filter((t: any) => !t.passed).slice(0, 5).map((t: any) =>
      `- ${t.description}\n  Input: ${JSON.stringify(t.input)}\n  Expected: ${JSON.stringify(t.expected)}\n  Got: ${JSON.stringify(t.actual)}${t.error ? `\n  Error: ${t.error}` : ''}`
    ).join('\n\n')}
` : ''}

Remember:
- Output ALL scores in exact "Label: X/100" format
- Be explicit when tests pass but collaboration/explanation was missing
- Score collaboration proportionally: 0 messages = 0/100, 1-2 messages = 10-30/100, 3-5 messages = 40-60/100, 6+ quality messages = 70-100/100
- Only include insights that materially change the candidate's next interview`

    // Use AI provider abstraction with complex task type for quality
    const aiResponse = await generateFeedbackResponse(
      systemInstruction,
      prompt,
      [] // No history needed for feedback
    )

    const feedback = aiResponse.text

    // Extract scores using robust parsing with efficiency validation
    const scores = extractScores(feedback, {
      testsPassed,
      testsTotal,
      timeSpent: timeSpent || 0,
      collaborationMessages,
      efficiencyMetrics: efficiencyMetrics ? {
        efficiencyScore: efficiencyMetrics.efficiencyScore,
        estimatedTimeComplexity: efficiencyMetrics.estimatedTimeComplexity,
        optimalTimeComplexity: efficiencyMetrics.optimalTimeComplexity,
        estimatedSpaceComplexity: efficiencyMetrics.estimatedSpaceComplexity,
        optimalSpaceComplexity: efficiencyMetrics.optimalSpaceComplexity,
      } : undefined,
    })

    // Parse structured sections
    const sections = parseFeedbackSections(feedback)

    // Build structured response
    const structuredFeedback: StructuredFeedback = {
      scores,
      tldr: sections.tldr || 'Feedback generated successfully.',
      whatWorked: sections.whatWorked || [],
      fixNext: sections.fixNext || [],
      actionPlan: sections.actionPlan || [],
      aiWatchlist: sections.aiWatchlist || 'No watchlist items captured.',
      rawFeedback: feedback,
    }

    // Track feedback generation
    const durationMinutes = Math.round((Date.now() - startTime) / 60000)
    if (sessionId) {
      trackFeedbackGenerationServer({
        sessionId,
        userId,
        scenarioType: scenarioType || 'unknown',
        performanceScore: scores.overall,
        durationMinutes,
      }).catch(err => console.error("Analytics tracking error:", err))
    }

    return NextResponse.json({
      feedback: feedback,
      performanceScore: scores.overall,
      scores: scores, // Full score breakdown
      structured: structuredFeedback, // Full structured data
      provider: aiResponse.provider,
      latencyMs: aiResponse.latencyMs,
    })
  } catch (error) {
    console.error("Feedback generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate feedback" },
      { status: 500 }
    )
  }
}
