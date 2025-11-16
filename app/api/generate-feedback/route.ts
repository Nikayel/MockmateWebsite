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
- If time spent < 120 seconds OR the user never messaged the interviewer/AI partner, assume they did NOT walk through their thinking. Explicitly call this out and cap BOTH "Reasoning & Explanation" and "AI Collaboration" at 4/10. Also cap the overall score at 9/10 in this situation, even if all tests pass.
- If time spent ≥ 120 seconds but interviewer message count from the user is 0, still mention the missing walkthrough.
- Use markdown with the exact sections below, in order, no extras:
  1. **TL;DR** – 1-2 sentences summarizing outcome + top risk.
  2. **Score Snapshot** – bullet list of the six ratings (Correctness, Efficiency, Code Quality, Reasoning & Explanation, AI Collaboration, Overall) formatted as “Label: X/10 – justification”.
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
- Be explicit when tests pass but collaboration/explanation was missing; enforce the score caps as stated.
- Only include insights that materially change the candidate’s next interview.
- Keep every section lean—if there’s nothing meaningful to say, write “No major findings.”
- If tests failed, highlight the most critical fix inside “Fix Next”.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const feedback = response.text()

    // Extract performance score (look for rating in feedback)
    let performanceScore = 7 // Default
    const overallMatch = feedback.match(/Overall:\s*(\d+)\/10/i)
    const genericMatch = feedback.match(/(\d+)\/10/)
    const ratingMatch = feedback.match(/rating[:\s]+(\d+)/i)
    if (overallMatch) {
      performanceScore = parseInt(overallMatch[1], 10)
    } else if (ratingMatch) {
      performanceScore = parseInt(ratingMatch[1], 10)
    } else if (genericMatch) {
      performanceScore = parseInt(genericMatch[1], 10)
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

