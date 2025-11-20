import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { feedbackRateLimit } from "@/lib/rate-limit"

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await feedbackRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { code, scenarioTitle, scenarioType, testResults, language, timeSpent, aiCollaborationMetrics, interactionMetrics } = await request.json()

    if (!code || !scenarioTitle) {
      return NextResponse.json({ error: "Code and scenario title are required" }, { status: 400 })
    }

    if (!genAI || !process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured")
      return NextResponse.json(
        {
          error: "Feedback generation is temporarily unavailable. Please check API configuration.",
          feedback: `## Feedback for ${scenarioTitle}\n\nFeedback generation service is currently unavailable. Your solution has been submitted successfully.`
        },
        { status: 503 }
      )
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are a senior interviewer delivering a "Brutal Debrief & Action Plan." Reports were previously bloated—now you must be surgical, time-efficient, and direct.

Tone: candid, data-backed, encouraging. Never rant, never waffle.

HARD RULES
- Limit yourself to ~350 words. Omit fluff and generic advice.
- Tie every comment to observed signals (tests, time spent, interaction counts, hints, efficiency metrics, etc.).
- If the user has NO collaboration (no interviewer messages AND no AI partner messages), give BOTH "Reasoning & Explanation" and "AI Collaboration" a score of 0/100. This is a critical failure - they did not collaborate or explain their thinking at all.
- If the user has minimal collaboration (only 1-2 messages total), score "Reasoning & Explanation" and "AI Collaboration" proportionally based on actual collaboration level (e.g., 1 message = ~20/100, 2 messages = ~40/100, etc.). Never give free points for zero collaboration.
- If time spent < 120 seconds AND the user never messaged the interviewer/AI partner, assume they did NOT walk through their thinking. Give "Reasoning & Explanation" 0/100 and "AI Collaboration" 0/100 if there were no messages. Also cap the overall score appropriately based on collaboration level.
- If time spent ≥ 120 seconds but interviewer message count from the user is 0, still mention the missing walkthrough and score "Reasoning & Explanation" at 0/100.
- Use markdown with the exact sections below, in order, no extras:
  1. **TL;DR** – 1-2 sentences summarizing outcome + top risk.
  2. **Score Snapshot** – bullet list of the six ratings (Correctness, Efficiency, Code Quality, Reasoning & Explanation, AI Collaboration, Overall) formatted as "Label: X/100 – justification". All scores should be on a 0-100 scale.
  3. **What Worked** – up to 3 bullets, each ≤1 sentence describing concrete wins.
  4. **Fix Next** – up to 3 prioritized bullets focused on the highest-impact gaps.
  5. **Action Plan** – numbered list of exactly 3 steps, each with an owner suggestion (e.g., “You”) and a timeframe (“today”, “this week”).
  6. **AI & Communication Watchlist** – one concise paragraph calling out collaboration quality. If interaction counts are near zero, state “No evidence you walked the interviewer through your work—narrate next time.”

- Never invent data. If something wasn’t captured, say “No signal captured.”
- Prefer examples from the candidate’s code/tests over hypothetical ones.
- Mention edge cases/complexities only if relevant to the observed solution.
- Keep formatting tight—no tables, no nested sub-bullets, no code fences unless quoting the candidate’s own code.
`,
    })

    const testResultsSummary = testResults && Array.isArray(testResults)
      ? `\n\nTEST RESULTS:\n- Total tests: ${testResults.length}\n- Passed: ${testResults.filter((t: any) => t.passed).length}\n- Failed: ${testResults.filter((t: any) => t.passed === false).length}\n`
      : ""

    const timeInfo = timeSpent ? `\n\nTIME SPENT: ${Math.floor(timeSpent / 60)} minutes ${timeSpent % 60} seconds\n` : ""

    const aiCollaborationInfo = aiCollaborationMetrics ? `
AI COLLABORATION METRICS:
- Partner messages sent: ${aiCollaborationMetrics.partnerMessagesSent || 0}
- Partner messages received: ${aiCollaborationMetrics.partnerMessagesReceived || 0}
- Hints requested: ${aiCollaborationMetrics.partnerHintsRequested || 0}
- Code suggestions accepted: ${aiCollaborationMetrics.partnerCodeSuggestionsAccepted || 0}
- AI collaboration quality: ${aiCollaborationMetrics.aiCollaborationQuality || 'Not assessed'}
- AI questions quality: ${aiCollaborationMetrics.aiQuestionsQuality || 'Not assessed'}
- AI suggestions understood: ${aiCollaborationMetrics.aiSuggestionsUnderstood || 0}
- AI suggestions misunderstood: ${aiCollaborationMetrics.aiSuggestionsMisunderstood || 0}
- Strategic AI usage: ${aiCollaborationMetrics.strategicAiUsage || 'Not assessed'}
- AI over-dependency: ${aiCollaborationMetrics.aiOverDependency || 'Not assessed'}
` : ""

    const interactionInfo = interactionMetrics ? `
INTERACTION METRICS:
- Interviewer questions answered: ${interactionMetrics.interviewerQuestionsAnswered || 0}
- Clarifications requested: ${interactionMetrics.interviewerClarificationsRequested || 0}
- Feedback acknowledged: ${interactionMetrics.interviewerFeedbackAcknowledged || 0}
- Proactive interactions: ${interactionMetrics.proactiveInteractions || 0}
- Problem difficulty: ${interactionMetrics.problemDifficulty || 'Not specified'}
- Problem type: ${interactionMetrics.problemType || 'Not specified'}
- Skills demonstrated: ${interactionMetrics.skillsDemonstrated?.join(', ') || 'Not tracked'}
` : ""

    const prompt = `Provide a concise, brutally honest interview debrief using the exact structure from the system instruction.

PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType})` : ''}
LANGUAGE: ${language || 'JavaScript'}
${timeInfo}
${testResultsSummary}
${aiCollaborationInfo}
${interactionInfo}

SOLUTION CODE (for reference only):
\`\`\`${language || 'javascript'}
${code}
\`\`\`

${testResults && testResults.length > 0 ? `
FAILED TESTS DETAILS:
${testResults.filter((t: any) => !t.passed).map((t: any) =>
      `- ${t.description}\n  Input: ${JSON.stringify(t.input)}\n  Expected: ${JSON.stringify(t.expected)}\n  Got: ${JSON.stringify(t.actual)}${t.error ? `\n  Error: ${t.error}` : ''}`
    ).join('\n\n')}
` : ''}

Remember:
- Be explicit when tests pass but collaboration/explanation was missing; give 0/100 for Reasoning & Explanation and AI Collaboration if there was zero collaboration.
- Score collaboration proportionally: 0 messages = 0/100, 1-2 messages = 10-30/100, 3-5 messages = 40-60/100, 6+ quality messages = 70-100/100.
- Only include insights that materially change the candidate's next interview.
- Keep every section lean—if there's nothing meaningful to say, write "No major findings."
- If tests failed, highlight the most critical fix inside "Fix Next".
- For Code Quality, if the score is low (< 60/100), include specific reasons why in the justification (e.g., "Code Quality: 45/100 – Missing error handling, unclear variable names, no input validation").`

    // Generate content with retry logic
    let result: any = null
    const maxRetries = 3
    const baseDelay = 1000 // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        result = await model.generateContent(prompt)
        break // Success, exit retry loop
      } catch (error: any) {
        // Check if it's a retryable error (503, 429, or 500 with overload message)
        const isRetryable =
          error?.status === 503 ||
          error?.status === 429 ||
          (error?.status === 500 && error?.message?.includes('overloaded')) ||
          error?.message?.includes('503') ||
          error?.message?.includes('Service Unavailable')

        if (!isRetryable || attempt === maxRetries - 1) {
          throw error // Don't retry non-retryable errors or if last attempt
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    if (!result) {
      throw new Error("Failed to generate content after retries")
    }

    const response = await result.response
    const feedback = response.text()

    // Extract performance score (look for rating in feedback)
    // Scores are now on 0-100 scale, but feedback may still say X/10, so convert
    let performanceScore = 70 // Default (70/100)
    const overallMatch100 = feedback.match(/Overall:\s*(\d+)\/100/i)
    const overallMatch10 = feedback.match(/Overall:\s*(\d+)\/10/i)
    const genericMatch10 = feedback.match(/(\d+)\/10/)
    const ratingMatch = feedback.match(/rating[:\s]+(\d+)/i)
    if (overallMatch100) {
      performanceScore = parseInt(overallMatch100[1], 10)
    } else if (overallMatch10) {
      // Convert from 0-10 to 0-100 scale
      performanceScore = parseInt(overallMatch10[1], 10) * 10
    } else if (ratingMatch) {
      // Assume rating is 0-10, convert to 0-100
      const rating = parseInt(ratingMatch[1], 10)
      performanceScore = rating <= 10 ? rating * 10 : rating
    } else if (genericMatch10) {
      // Convert from 0-10 to 0-100 scale
      const score = parseInt(genericMatch10[1], 10)
      performanceScore = score <= 10 ? score * 10 : score
    }

    return NextResponse.json({
      feedback,
      performanceScore,
    })
  } catch (error) {
    console.error("Feedback generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate feedback" },
      { status: 500 }
    )
  }
}

