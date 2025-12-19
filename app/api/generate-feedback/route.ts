import { NextRequest, NextResponse } from "next/server"
import { feedbackRateLimit } from "@/lib/rate-limit"
import { generateFeedbackResponse } from "@/lib/ai-providers"
import { trackFeedbackGenerationServer } from "@/lib/analytics-server"

// Structured feedback schema - NEW GRADING CRITERIA
// Aligned with real Meta/Google AI-assisted interview scoring
interface FeedbackScores {
  // New grading criteria
  understanding: number       // 30% - Can you explain your approach?
  problemSolving: number      // 25% - Debug & optimize
  codeQuality: number         // 25% - Clean & efficient
  communication: number       // 20% - Think out loud
  // Legacy (kept for backward compatibility)
  correctness: number
  efficiency: number
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
 * Analyze conversation content quality for communication scoring
 * Returns a quality score based on what was actually discussed
 */
function analyzeConversationQuality(transcript: Array<{ role: string; content: string }> | undefined): {
  quality: number
  discussedComplexity: boolean
  discussedApproach: boolean
  discussedAlternatives: boolean
  discussedEdgeCases: boolean
} {
  if (!transcript || transcript.length === 0) {
    return { quality: 30, discussedComplexity: false, discussedApproach: false, discussedAlternatives: false, discussedEdgeCases: false }
  }

  // Get only candidate messages
  const candidateMessages = transcript.filter(m => m.role === 'candidate').map(m => m.content.toLowerCase())
  const allContent = candidateMessages.join(' ')

  // Check for quality indicators
  const discussedComplexity = /\b(time complexity|space complexity|big o|o\(n\)|o\(1\)|o\(n\^2\)|o\(log|linear|constant|quadratic)\b/i.test(allContent)
  const discussedApproach = /\b(approach|strategy|algorithm|method|idea|plan|thinking|would|could|let me|my approach|i('m| am|'ll| will)|first|then|next)\b/i.test(allContent)
  const discussedAlternatives = /\b(alternative|another way|different approach|could also|other option|instead of|trade-?off|brute force|optimiz)\b/i.test(allContent)
  const discussedEdgeCases = /\b(edge case|corner case|empty|null|negative|zero|duplicate|boundary|special case|what if|overflow)\b/i.test(allContent)

  // Calculate quality score based on content analysis
  let quality = 35 // Base score for any communication

  // Reward substantive content
  if (candidateMessages.length > 0) quality += 10
  if (candidateMessages.length >= 3) quality += 10
  if (discussedApproach) quality += 15
  if (discussedComplexity) quality += 15
  if (discussedAlternatives) quality += 10
  if (discussedEdgeCases) quality += 10

  // Reward longer, more detailed responses
  const avgLength = candidateMessages.reduce((sum, m) => sum + m.length, 0) / Math.max(1, candidateMessages.length)
  if (avgLength > 100) quality += 5
  if (avgLength > 200) quality += 5

  return {
    quality: Math.min(95, quality),
    discussedComplexity,
    discussedApproach,
    discussedAlternatives,
    discussedEdgeCases
  }
}

/**
 * Calculate understanding score algorithmically
 */
function calculateUnderstandingScore(
  passRate: number,
  conversationAnalysis: ReturnType<typeof analyzeConversationQuality>
): number {
  let score = 0

  // Base understanding on test pass rate
  if (passRate >= 80) {
    score = Math.min(90, passRate + 5)
  } else if (passRate >= 50) {
    score = passRate + 5
  } else {
    score = Math.max(20, passRate)
  }

  // Bonus for explaining approach and complexity
  if (conversationAnalysis.discussedApproach) score = Math.min(95, score + 5)
  if (conversationAnalysis.discussedComplexity) score = Math.min(98, score + 5)

  return Math.round(score)
}

/**
 * Calculate problem-solving score algorithmically
 */
function calculateProblemSolvingScore(
  passRate: number,
  efficiencyMetrics: { efficiencyScore?: number } | undefined,
  conversationAnalysis: ReturnType<typeof analyzeConversationQuality>
): number {
  const effScore = efficiencyMetrics?.efficiencyScore || 50
  let score = Math.round((passRate * 0.6) + (effScore * 0.4))

  // Bonus for discussing alternatives and edge cases
  if (conversationAnalysis.discussedAlternatives) score = Math.min(95, score + 5)
  if (conversationAnalysis.discussedEdgeCases) score = Math.min(95, score + 5)

  return score
}

/**
 * Calculate code quality score algorithmically
 */
function calculateCodeQualityScore(
  passRate: number,
  efficiencyMetrics: { efficiencyScore?: number } | undefined
): number {
  const effScore = efficiencyMetrics?.efficiencyScore || 50

  // Code quality = 50% test pass rate + 30% efficiency + 20% base
  let score = Math.round(
    passRate * 0.50 +
    effScore * 0.30 +
    50 * 0.20 // Base readability assumption
  )

  return Math.min(100, score)
}

/**
 * Extract scores from feedback text using multiple patterns
 * Falls back to algorithmic scores if AI parsing fails
 */
function extractScores(feedback: string, metrics: {
  testsPassed: number
  testsTotal: number
  timeSpent: number
  collaborationMessages: number
  conversationTranscript?: Array<{ role: string; content: string }>
  efficiencyMetrics?: {
    efficiencyScore?: number
    estimatedTimeComplexity?: string
    optimalTimeComplexity?: string
    estimatedSpaceComplexity?: string
    optimalSpaceComplexity?: string
  }
}): FeedbackScores {
  const scores: FeedbackScores = {
    // New grading criteria
    understanding: 70,
    problemSolving: 70,
    codeQuality: 70,
    communication: 70,
    // Legacy
    correctness: 70,
    efficiency: 70,
    reasoningExplanation: 70,
    aiCollaboration: 70,
    overall: 70,
  }

  // Pattern: "Label: X/100" or "Label: X/10"
  const patterns = [
    // NEW GRADING CRITERIA
    { key: 'understanding', patterns: [/Understanding[:\s]+(\d+)\/100/i, /Understanding[:\s]+(\d+)\/10/i] },
    { key: 'problemSolving', patterns: [/Problem[-\s]?Solving[:\s]+(\d+)\/100/i, /Problem[-\s]?Solving[:\s]+(\d+)\/10/i] },
    { key: 'codeQuality', patterns: [/Code\s*Quality[:\s]+(\d+)\/100/i, /Code\s*Quality[:\s]+(\d+)\/10/i] },
    { key: 'communication', patterns: [/Communication[:\s]+(\d+)\/100/i, /Communication[:\s]+(\d+)\/10/i] },
    // LEGACY (for backward compatibility)
    { key: 'correctness', patterns: [/Correctness[:\s]+(\d+)\/100/i, /Correctness[:\s]+(\d+)\/10/i] },
    { key: 'efficiency', patterns: [/Efficiency[:\s]+(\d+)\/100/i, /Efficiency[:\s]+(\d+)\/10/i] },
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

  // Derive new criteria from legacy if not parsed
  const passRate = metrics.testsTotal > 0 ? (metrics.testsPassed / metrics.testsTotal) * 100 : 50

  // Analyze conversation for understanding signals
  const conversationAnalysis = analyzeConversationQuality(metrics.conversationTranscript)

  // Understanding = based on test results AND explanation of approach
  // A correct solution shows understanding; explaining approach confirms it
  if (scores.understanding === 70) {
    // Base understanding on test pass rate
    if (passRate >= 80) {
      scores.understanding = Math.min(90, passRate + 5)
    } else if (passRate >= 50) {
      scores.understanding = passRate + 5
    } else {
      scores.understanding = Math.max(20, passRate)
    }

    // Bonus for explaining approach and complexity (shows deeper understanding)
    if (conversationAnalysis.discussedApproach) {
      scores.understanding = Math.min(95, scores.understanding + 5)
    }
    if (conversationAnalysis.discussedComplexity) {
      scores.understanding = Math.min(98, scores.understanding + 5)
    }
  }

  // Problem-Solving = based on debugging, optimization, and approach
  if (scores.problemSolving === 70) {
    const effScore = metrics.efficiencyMetrics?.efficiencyScore || 50
    scores.problemSolving = Math.round((passRate * 0.6) + (effScore * 0.4))

    // Bonus for discussing alternatives and edge cases (shows problem-solving thinking)
    if (conversationAnalysis.discussedAlternatives) {
      scores.problemSolving = Math.min(95, scores.problemSolving + 5)
    }
    if (conversationAnalysis.discussedEdgeCases) {
      scores.problemSolving = Math.min(95, scores.problemSolving + 5)
    }
  }

  // Communication = based on CONTENT QUALITY, not just message count
  // Uses the conversationAnalysis computed above
  if (scores.communication === 70) {
    // Use content-based quality score as the primary communication metric
    if (conversationAnalysis.quality > 50) {
      // Good communication detected based on content
      scores.communication = conversationAnalysis.quality

      // Bonus for discussing specific technical topics together
      if (conversationAnalysis.discussedComplexity && conversationAnalysis.discussedApproach) {
        scores.communication = Math.min(95, scores.communication + 5)
      }
    } else if (metrics.collaborationMessages > 0) {
      // Some messages sent but content analysis didn't find key indicators
      // Still give credit for attempting communication
      scores.communication = Math.max(45, conversationAnalysis.quality)
    } else {
      // No conversation transcript - use pass rate as proxy
      // A passing solution with good efficiency suggests some understanding
      if (passRate >= 80) {
        scores.communication = 50 // Benefit of doubt for correct solution
      } else {
        scores.communication = 35
      }
    }
  }

  // Test-based correctness adjustment (legacy)
  if (metrics.testsTotal > 0) {
    if (passRate < 50 && scores.correctness > 60) {
      scores.correctness = Math.min(scores.correctness, passRate + 20)
    }
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

  // Calculate overall using NEW WEIGHTED FORMULA
  // Understanding (30%) + Problem-Solving (25%) + Code Quality (25%) + Communication (20%)
  // But ensure correct solutions get fair scores
  const newOverall = Math.round(
    scores.understanding * 0.30 +
    scores.problemSolving * 0.25 +
    scores.codeQuality * 0.25 +
    scores.communication * 0.20
  )

  // Floor: Correct solutions with good communication deserve good scores
  // A correct, optimal solution should NEVER get an F grade
  const isOptimalSolution = metrics.efficiencyMetrics?.efficiencyScore !== undefined &&
    metrics.efficiencyMetrics.efficiencyScore >= 80
  const hasGoodCommunication = conversationAnalysis.quality >= 60 ||
    (conversationAnalysis.discussedComplexity && conversationAnalysis.discussedApproach)

  if (passRate >= 100 && isOptimalSolution && hasGoodCommunication) {
    // Perfect tests + optimal solution + good communication = A range minimum
    scores.overall = Math.max(85, newOverall)
  } else if (passRate >= 100 && isOptimalSolution) {
    // Perfect tests + optimal solution = B+ minimum
    scores.overall = Math.max(78, newOverall)
  } else if (passRate >= 90) {
    scores.overall = Math.max(70, newOverall) // At least B- for near-perfect tests
  } else if (passRate >= 80) {
    scores.overall = Math.max(65, newOverall) // At least C+ for 80%+ tests
  } else {
    scores.overall = newOverall
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
    const { code, scenarioTitle, scenarioType, testResults, language, timeSpent, aiCollaborationMetrics, interactionMetrics, efficiencyMetrics, conversationTranscript, sessionId, userId } = await request.json()

    if (!code || !scenarioTitle) {
      return NextResponse.json({ error: "Code and scenario title are required" }, { status: 400 })
    }

    // Calculate collaboration message count
    const collaborationMessages = (aiCollaborationMetrics?.partnerMessagesSent || 0) +
      (interactionMetrics?.interviewerQuestionsAnswered || 0)

    // Calculate test metrics
    const testsPassed = testResults?.filter((t: any) => t.passed).length || 0
    const testsTotal = testResults?.length || 0

    // Simplified system instruction - AI generates narrative only, scores are algorithmic
    const systemInstruction = `You are a senior interviewer delivering a focused technical debrief. Be direct and constructive.

IMPORTANT: Scores are PRE-CALCULATED. Just reference them in your feedback. Focus on actionable narrative.

## OUTPUT FORMAT

**TL;DR** – One sentence: what they did well + biggest gap.

**Score Snapshot** (use the PRE-CALCULATED SCORES provided)
- Understanding: X/100 – brief justification
- Problem-Solving: X/100 – brief justification
- Code Quality: X/100 – brief justification
- Communication: X/100 – brief justification
- Overall: X/100

**What Worked** (max 3 bullets)
- specific strength with evidence

**Fix Next** (max 3 bullets, prioritized)
- specific improvement with concrete action

**Action Plan** (3 numbered steps)
1. Immediate action
2. Short-term practice
3. Long-term skill development

RULES:
- ~200 words max. Be concise.
- Reference actual data (tests passed, complexity, time).
- Never praise if tests fail. Address failures first.
- Focus on actionable improvements.
`

    const testResultsSummary = testResults && Array.isArray(testResults)
      ? `\n\nTEST RESULTS:\n- Total tests: ${testsTotal}\n- Passed: ${testsPassed}\n- Failed: ${testsTotal - testsPassed}\n`
      : ""

    const timeInfo = timeSpent ? `TIME SPENT: ${Math.floor(timeSpent / 60)} minutes ${timeSpent % 60} seconds` : ""

    // Simplified efficiency info (removed redundant verbose metrics)
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

    // ALGORITHMIC ANALYSIS: Analyze conversation BEFORE AI call to save tokens
    // This makes scoring deterministic and reduces AI token usage
    const conversationAnalysis = analyzeConversationQuality(conversationTranscript)
    const passRate = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0

    // Pre-calculate scores algorithmically (AI will only generate narrative)
    const algorithmicScores = {
      understanding: calculateUnderstandingScore(passRate, conversationAnalysis),
      problemSolving: calculateProblemSolvingScore(passRate, efficiencyMetrics, conversationAnalysis),
      codeQuality: calculateCodeQualityScore(passRate, efficiencyMetrics),
      communication: conversationAnalysis.quality,
      overall: 0 // Will be calculated after
    }
    algorithmicScores.overall = Math.round(
      algorithmicScores.understanding * 0.30 +
      algorithmicScores.problemSolving * 0.25 +
      algorithmicScores.codeQuality * 0.25 +
      algorithmicScores.communication * 0.20
    )

    // Apply score floors for correct solutions
    const isOptimalSolution = efficiencyMetrics?.efficiencyScore !== undefined && efficiencyMetrics.efficiencyScore >= 80
    if (passRate >= 100 && isOptimalSolution && conversationAnalysis.quality >= 60) {
      algorithmicScores.overall = Math.max(85, algorithmicScores.overall)
    } else if (passRate >= 100 && isOptimalSolution) {
      algorithmicScores.overall = Math.max(78, algorithmicScores.overall)
    } else if (passRate >= 90) {
      algorithmicScores.overall = Math.max(70, algorithmicScores.overall)
    } else if (passRate >= 80) {
      algorithmicScores.overall = Math.max(65, algorithmicScores.overall)
    }

    // Send SUMMARY to AI instead of full transcript (saves ~500-1000 tokens)
    const conversationSummary = `
COMMUNICATION ANALYSIS (algorithmically detected):
- Discussed time/space complexity: ${conversationAnalysis.discussedComplexity ? 'YES' : 'NO'}
- Explained approach/algorithm: ${conversationAnalysis.discussedApproach ? 'YES' : 'NO'}
- Considered alternatives: ${conversationAnalysis.discussedAlternatives ? 'YES' : 'NO'}
- Mentioned edge cases: ${conversationAnalysis.discussedEdgeCases ? 'YES' : 'NO'}
- Communication quality score: ${conversationAnalysis.quality}/100
- Total candidate messages: ${conversationTranscript?.filter((m: { role: string }) => m.role === 'candidate').length || 0}

PRE-CALCULATED SCORES (use these as your scores):
- Understanding: ${algorithmicScores.understanding}/100
- Problem-Solving: ${algorithmicScores.problemSolving}/100
- Code Quality: ${algorithmicScores.codeQuality}/100
- Communication: ${algorithmicScores.communication}/100
- Overall: ${algorithmicScores.overall}/100
`

    const prompt = `Generate interview feedback narrative using the pre-calculated scores below.

PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType})` : ''}
LANGUAGE: ${language || 'JavaScript'}
${timeInfo}
${testResultsSummary}
${efficiencyInfo}
${conversationSummary}

SOLUTION CODE:
\`\`\`${language || 'javascript'}
${code.length > 2000 ? code.slice(0, 2000) + '\n// ... [truncated]' : code}
\`\`\`
${testResults && testResults.filter((t: any) => !t.passed).length > 0 ? `
FAILED TESTS (first 3):
${testResults.filter((t: any) => !t.passed).slice(0, 3).map((t: any) =>
      `- ${t.description}: expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(t.actual)}`
    ).join('\n')}
` : ''}

IMPORTANT: Use the PRE-CALCULATED SCORES above exactly. Focus on generating helpful narrative feedback, not recalculating scores.`

    // Use AI provider abstraction for narrative feedback only
    const aiResponse = await generateFeedbackResponse(
      systemInstruction,
      prompt,
      [] // No history needed for feedback
    )

    const feedback = aiResponse.text

    // USE ALGORITHMIC SCORES as primary (deterministic, token-efficient)
    // AI-generated narrative is just for user-facing feedback text
    const scores: FeedbackScores = {
      understanding: algorithmicScores.understanding,
      problemSolving: algorithmicScores.problemSolving,
      codeQuality: algorithmicScores.codeQuality,
      communication: algorithmicScores.communication,
      // Legacy scores for backward compatibility
      correctness: algorithmicScores.codeQuality,
      efficiency: efficiencyMetrics?.efficiencyScore || 50,
      reasoningExplanation: algorithmicScores.communication,
      aiCollaboration: collaborationMessages > 0 ? 70 : 50,
      overall: algorithmicScores.overall,
    }

    // Parse structured sections from AI narrative
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
