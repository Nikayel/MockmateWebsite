import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { code, scenarioTitle, scenarioType, testResults, language, timeSpent } = await request.json()

    if (!code || !scenarioTitle) {
      return NextResponse.json({ error: "Code and scenario title are required" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are an experienced technical interviewer providing comprehensive feedback on a coding interview solution.
      
Your feedback should be detailed, constructive, and similar to what a real interviewer at a top tech company would provide.
Focus on:
1. Code correctness and edge cases
2. Time complexity (Big O notation) - analyze and explain
3. Space complexity (Big O notation) - analyze and explain
4. Code quality (readability, maintainability, style)
5. Algorithm efficiency and optimization opportunities
6. Best practices and design patterns
7. Specific improvements and suggestions
8. Overall assessment and strengths/weaknesses

Be professional, encouraging, but honest. Provide actionable feedback that helps the candidate improve.`,
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

Please provide detailed feedback covering:
1. **Correctness**: Does the solution work correctly? Are edge cases handled?
2. **Time Complexity**: What is the Big O time complexity? Explain your analysis.
3. **Space Complexity**: What is the Big O space complexity? Explain your analysis.
4. **Code Quality**: Is the code readable, maintainable, and well-structured?
5. **Efficiency**: Are there optimization opportunities? Could the algorithm be improved?
6. **Best Practices**: Does the code follow language-specific best practices?
7. **Strengths**: What did the candidate do well?
8. **Areas for Improvement**: Specific, actionable suggestions
9. **Overall Assessment**: Summary and rating (1-10 scale)

Format your response in a clear, structured way that would be helpful for interview preparation.`

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

