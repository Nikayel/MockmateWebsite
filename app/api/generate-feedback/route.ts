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
  }

  // Recalculate overall if needed
  const avgScore = Math.round(
    (scores.correctness + scores.efficiency + scores.codeQuality +
     scores.reasoningExplanation + scores.aiCollaboration) / 5
  )

  // If extracted overall seems wrong, use calculated average
  if (Math.abs(scores.overall - avgScore) > 30) {
    scores.overall = avgScore
  }

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
    const { code, scenarioTitle, scenarioType, testResults, language, timeSpent, aiCollaborationMetrics, interactionMetrics, sessionId, userId } = await request.json()

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
    const systemInstruction = `You are a senior interviewer delivering a "Brutal Debrief & Action Plan." You must be surgical, time-efficient, and direct.

CRITICAL: Output scores in EXACT format "Label: X/100" for reliable parsing.

Tone: candid, data-backed, encouraging. Never rant, never waffle.

HARD RULES
- Limit yourself to ~350 words. Omit fluff and generic advice.
- Tie every comment to observed signals (tests, time spent, interaction counts, hints, efficiency metrics, etc.).
- If the user has NO collaboration (no interviewer messages AND no AI partner messages), give BOTH "Reasoning & Explanation" and "AI Collaboration" a score of 0/100. This is a critical failure - they did not collaborate or explain their thinking at all.
- If the user has minimal collaboration (only 1-2 messages total), score "Reasoning & Explanation" and "AI Collaboration" proportionally based on actual collaboration level (e.g., 1 message = ~20/100, 2 messages = ~40/100, etc.). Never give free points for zero collaboration.
- If time spent < 120 seconds AND the user never messaged the interviewer/AI partner, assume they did NOT walk through their thinking. Give "Reasoning & Explanation" 0/100 and "AI Collaboration" 0/100 if there were no messages.
- Use markdown with the exact sections below, in order, no extras:

## REQUIRED OUTPUT FORMAT

**TL;DR** – 1-2 sentences summarizing outcome + top risk.

**Score Snapshot**
- Correctness: X/100 – justification
- Efficiency: X/100 – justification
- Code Quality: X/100 – justification
- Reasoning & Explanation: X/100 – justification
- AI Collaboration: X/100 – justification
- Overall: X/100 – justification

**What Worked**
- bullet 1
- bullet 2
- bullet 3 (max 3)

**Fix Next**
- bullet 1
- bullet 2
- bullet 3 (max 3, prioritized)

**Action Plan**
1. Step with owner and timeframe
2. Step with owner and timeframe
3. Step with owner and timeframe

**AI & Communication Watchlist** – one concise paragraph calling out collaboration quality. If interaction counts are near zero, state "No evidence you walked the interviewer through your work—narrate next time."

IMPORTANT SCORING RULES:
- ALL scores MUST be in X/100 format
- Zero collaboration = 0/100 for Reasoning & Explanation AND AI Collaboration
- Failed tests should cap Correctness score
- Never invent data. If something wasn't captured, say "No signal captured."
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

    const prompt = `Provide a concise, brutally honest interview debrief using the exact structure from the system instruction.

PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType})` : ''}
LANGUAGE: ${language || 'JavaScript'}
${timeInfo}
${testResultsSummary}
${aiCollaborationInfo}
${interactionInfo}

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

    // Extract scores using robust parsing
    const scores = extractScores(feedback, {
      testsPassed,
      testsTotal,
      timeSpent: timeSpent || 0,
      collaborationMessages,
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
