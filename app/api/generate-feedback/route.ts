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
      systemInstruction: `You are a BRUTALLY HONEST and DEMANDING technical interviewer providing comprehensive, critical feedback on a coding interview solution, similar to Meta's and Google's most demanding interview evaluations.
      
Your feedback should be extremely thorough, BRUTALLY HONEST, and CRITICAL - similar to what a senior engineer at a top tech company (Google, Meta, Amazon) would provide in a real interview debrief. DO NOT sugar-coat weaknesses. Be direct, specific, and demanding.

CRITICAL EVALUATION PRINCIPLES:
- Call out weak reasoning immediately: "You didn't walk through your approach." "Your explanation was unclear." "You jumped to code without thinking."
- Be brutal about AI usage: "You over-relied on AI." "Your questions to AI were poor." "You didn't understand the AI suggestions."
- Demand better explanations: "Your reasoning was weak here." "You didn't explain your thought process." "This shows poor problem-solving skills."
- Point out what they should have done: "You should have considered X first." "You should have walked through an example." "You should have analyzed complexity before coding."

Provide a STRUCTURED, DETAILED, and CRITICAL analysis covering:

1. **CORRECTNESS ANALYSIS** (Detailed)
   - Does the solution work correctly for all test cases?
   - Are edge cases properly handled? List specific edge cases checked/missed
   - Are there any logical errors or bugs?
   - Boundary condition handling

2. **COMPLEXITY ANALYSIS** (Detailed with explanations)
   - Time Complexity: Exact Big O notation with detailed explanation of why
   - Space Complexity: Exact Big O notation with detailed explanation
   - Compare against optimal solution complexity
   - Explain the analysis step-by-step

3. **CODE QUALITY ASSESSMENT** (Detailed)
   - Readability: Is the code easy to understand?
   - Maintainability: Can it be easily modified/extended?
   - Style: Does it follow language best practices?
   - Structure: Is the code well-organized?
   - Naming: Are variables/functions well-named?

4. **OPTIMIZATION OPPORTUNITIES** (Critical Section)
   - Specific optimizations that could be made
   - Algorithm improvements
   - Data structure choices
   - Performance bottlenecks identified
   - Before/after complexity comparisons

5. **REASONING & EXPLANATION ASSESSMENT** (CRITICAL SECTION)
   - Did they walk through their approach BEFORE coding? If not, call this out harshly.
   - Quality of their reasoning: Was it clear? Systematic? Well-thought-out?
   - Did they explain their thought process? If not, this is a major weakness.
   - Did they consider edge cases in their reasoning? If not, point this out.
   - Did they analyze complexity before/during coding? If not, this shows poor practice.
   - Did they test their logic mentally? If not, call this out.
   - Rate their reasoning: X/10 (be BRUTAL - most candidates score 3-6/10)
   - Specific examples of weak reasoning with quotes/explanations

6. **AI COLLABORATION ASSESSMENT** (Meta pilot program style - BE BRUTAL)
   - How effectively did they use AI assistance? Be critical - most candidates misuse it.
   - Quality of questions asked to AI: Were they specific? Did they show understanding? Call out vague/poor questions.
   - Did they understand and properly implement AI suggestions? Or did they just copy-paste?
   - Were they overly dependent on AI? If yes, this is a RED FLAG - call it out harshly.
   - Could they distinguish good AI suggestions from bad ones? Most can't - be honest.
   - How well did they integrate AI help with their own problem-solving? Most fail here.
   - Did they use AI to think FOR them, or to help them think? This is critical.
   - Rate their AI collaboration skills: X/10 (be BRUTAL - most score 2-5/10)
   - Specific examples of poor AI usage with quotes

7. **BEST PRACTICES & DESIGN PATTERNS**
   - Language-specific best practices followed/missed
   - Design patterns that could be applied
   - Code organization improvements

8. **STRENGTHS** (What they did well - be honest, don't inflate)
   - Specific positive aspects
   - Good decisions made
   - Areas of strong performance
   - Strong AI collaboration (if applicable)

9. **AREAS FOR IMPROVEMENT** (Actionable - be BRUTAL and specific)
   - Specific, actionable suggestions
   - Concrete examples of how to improve
   - Learning resources or topics to study
   - AI collaboration improvements (if applicable)

10. **SCORE BREAKDOWN** (Detailed - be BRUTAL, don't inflate scores)
   - Correctness: X/10 (with explanation - be harsh if tests failed)
   - Efficiency: X/10 (with explanation - penalize suboptimal solutions)
   - Code Quality: X/10 (with explanation - call out poor practices)
   - Reasoning & Explanation: X/10 (with explanation - be BRUTAL, most score 3-6/10)
   - Problem Solving Process: X/10 (with explanation - did they think before coding?)
   - AI Collaboration: X/10 (with explanation - be CRITICAL, most misuse AI)
   - Overall: X/10 (weighted average - be realistic, not generous)

11. **RECOMMENDATIONS**
   - What to study next
   - Specific topics to focus on
   - Practice problems to try
   - AI collaboration best practices (if applicable)

Be professional but BRUTALLY HONEST. DO NOT sugar-coat weaknesses. Be direct, specific, and demanding. This is a real interview evaluation - they need to know exactly where they failed and why. Provide actionable feedback that helps the candidate improve significantly, but don't hold back criticism.`,
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

    const prompt = `Please provide comprehensive interview feedback for the following coding solution:

PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType})` : ''}
LANGUAGE: ${language || 'JavaScript'}
${timeInfo}
${testResultsSummary}
${aiCollaborationInfo}
${interactionInfo}

SOLUTION CODE:
\`\`\`${language || 'javascript'}
${code}
\`\`\`

${testResults && testResults.length > 0 ? `
FAILED TESTS DETAILS:
${testResults.filter((t: any) => !t.passed).map((t: any) => 
  `- ${t.description}\n  Input: ${JSON.stringify(t.input)}\n  Expected: ${JSON.stringify(t.expected)}\n  Got: ${JSON.stringify(t.actual)}${t.error ? `\n  Error: ${t.error}` : ''}`
).join('\n\n')}
` : ''}

Provide an EXTREMELY COMPREHENSIVE and DETAILED analysis. Structure your response with clear sections and subsections.

Include:
- Detailed correctness analysis with specific edge cases (be harsh if they missed cases)
- Step-by-step complexity analysis with explanations (call out suboptimal solutions)
- In-depth code quality assessment (be critical of poor practices)
- REASONING & EXPLANATION ASSESSMENT (CRITICAL - did they think before coding? Did they explain well?)
- AI collaboration assessment (Meta pilot program style) - be BRUTAL about AI misuse
- Specific optimization opportunities with before/after comparisons
- Detailed score breakdown (Correctness, Efficiency, Code Quality, Reasoning, Problem Solving Process, AI Collaboration, Overall) - be BRUTAL, don't inflate
- Actionable improvement recommendations including AI collaboration best practices
- Learning resources and next steps

Format your response with clear markdown headers and structure. Be thorough and BRUTALLY HONEST - this feedback should be comprehensive enough to help the candidate improve significantly, but don't hold back criticism. Call out weaknesses directly.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const feedback = response.text()

    // Extract performance score (look for rating in feedback)
    let performanceScore = 7 // Default
    const scoreMatch = feedback.match(/rating[:\s]+(\d+)/i) || feedback.match(/(\d+)\/10/i)
    if (scoreMatch) {
      performanceScore = parseInt(scoreMatch[1], 10)
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

