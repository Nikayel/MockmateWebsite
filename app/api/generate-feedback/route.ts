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
    const { code, scenarioTitle, scenarioType, testResults, language, timeSpent } = await request.json()

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
      systemInstruction: `You are an experienced technical interviewer providing comprehensive, detailed feedback on a coding interview solution.
      
Your feedback should be extremely thorough, constructive, and similar to what a senior engineer at a top tech company (Google, Meta, Amazon) would provide in a real interview debrief.

Provide a STRUCTURED, DETAILED analysis covering:

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

5. **BEST PRACTICES & DESIGN PATTERNS**
   - Language-specific best practices followed/missed
   - Design patterns that could be applied
   - Code organization improvements

6. **STRENGTHS** (What they did well)
   - Specific positive aspects
   - Good decisions made
   - Areas of strong performance

7. **AREAS FOR IMPROVEMENT** (Actionable)
   - Specific, actionable suggestions
   - Concrete examples of how to improve
   - Learning resources or topics to study

8. **SCORE BREAKDOWN** (Detailed)
   - Correctness: X/10 (with explanation)
   - Efficiency: X/10 (with explanation)
   - Code Quality: X/10 (with explanation)
   - Problem Solving: X/10 (with explanation)
   - Overall: X/10 (weighted average)

9. **RECOMMENDATIONS**
   - What to study next
   - Specific topics to focus on
   - Practice problems to try

Be professional, encouraging, but honest and thorough. Provide actionable feedback that helps the candidate improve significantly.`,
    })

    const testResultsSummary = testResults && Array.isArray(testResults) 
      ? `\n\nTEST RESULTS:\n- Total tests: ${testResults.length}\n- Passed: ${testResults.filter((t: any) => t.passed).length}\n- Failed: ${testResults.filter((t: any) => t.passed === false).length}\n`
      : ""

    const timeInfo = timeSpent ? `\n\nTIME SPENT: ${Math.floor(timeSpent / 60)} minutes ${timeSpent % 60} seconds\n` : ""

    const prompt = `Please provide comprehensive interview feedback for the following coding solution:

PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType})` : ''}
LANGUAGE: ${language || 'JavaScript'}
${timeInfo}
${testResultsSummary}

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
- Detailed correctness analysis with specific edge cases
- Step-by-step complexity analysis with explanations
- In-depth code quality assessment
- Specific optimization opportunities with before/after comparisons
- Detailed score breakdown (Correctness, Efficiency, Code Quality, Problem Solving, Overall)
- Actionable improvement recommendations
- Learning resources and next steps

Format your response with clear markdown headers and structure. Be thorough - this feedback should be comprehensive enough to help the candidate significantly improve.`

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

