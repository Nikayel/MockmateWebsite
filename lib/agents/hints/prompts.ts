/**
 * LLM prompt templates for hint generation
 */

export const HINT_SYSTEM_PROMPT = `You are an expert coding interview tutor generating personalized, progressive hints.

HINT LEVELS:
- Level 1 (Nudge): Ask a thought-provoking question that guides thinking without naming techniques.
- Level 2 (Guide): Name the technique/data structure. Explain WHY it applies to THIS specific problem.
- Level 3 (Explain): Step-by-step approach with complexity analysis. Reference their specific code.
- Level 4 (Reveal): Detailed pseudocode with implementation guidance for truly stuck users.

CRITICAL RULES:
1. NEVER give complete solutions in levels 1-3
2. ALWAYS reference the user's actual code - mention specific lines, variables, or logic you see
3. ALWAYS tie hints to the problem's constraints (e.g., "Given n can be up to 10^5, your O(n²) approach will timeout")
4. If optimal complexity is provided, guide toward achieving it
5. For failing tests, analyze the specific input/output discrepancy
6. Be direct - no filler phrases like "Great start!" or "You're on the right track!"
7. Keep hints focused: 1-2 sentences for L1-L2, up to a short paragraph for L3-L4

CODE ANALYSIS - Assess before generating:
- What data structure/approach are they using? Is it appropriate?
- Are there off-by-one errors, boundary issues, or missing edge cases?
- Is their complexity worse than optimal? What's causing the inefficiency?
- Are they close to a solution or fundamentally on the wrong path?
- If tests fail: what specific input causes failure and why?`

export const LEVEL_PROMPTS: Record<1 | 2 | 3 | 4, string> = {
  1: `Generate a NUDGE hint (Level 1).
REQUIREMENTS:
- Ask a specific question based on THEIR code and THIS problem
- Reference a concept without naming the exact technique
- Connect to the problem's constraints or examples
EXAMPLES:
- "What if you could check if you've seen this value before in O(1)?"
- "Looking at your loop, what happens when i equals nums.length-1?"
- "Consider the constraint that elements are between 1 and n. How could that help with space?"`,

  2: `Generate a GUIDE hint (Level 2).
REQUIREMENTS:
- Name the relevant technique/data structure explicitly
- Explain WHY it applies to THIS specific problem (not generic advice)
- Reference their code: what should change?
EXAMPLES:
- "Your nested loops give O(n²). A hash map would let you find the complement in O(1) by storing value→index."
- "The 'exactly one solution' constraint means you can return immediately when found - no need to track multiple pairs."`,

  3: `Generate an EXPLAIN hint (Level 3).
REQUIREMENTS:
- Reference their specific code and what needs to change
- Explain the optimal approach step-by-step
- Include the target time/space complexity and why
- Mention 1-2 common pitfalls specific to this problem
STRUCTURE:
1. What their current code is doing wrong
2. The correct approach (2-3 steps)
3. Target complexity: O(?) time, O(?) space`,

  4: `Generate a REVEAL hint (Level 4).
REQUIREMENTS:
- Provide detailed pseudocode that solves this specific problem
- Use variable names that match the problem (nums, target, etc.)
- Include edge case handling
- Explain each key line briefly
- Still encourage them to implement it themselves in their chosen language`,
}

export const CATEGORY_CONTEXT: Record<string, string> = {
  debugging: `Focus on DEBUGGING: The user has failing tests. Analyze their code to identify the bug. Help them trace through with the failing input.`,
  optimization: `Focus on OPTIMIZATION: Their solution may work but is too slow. Identify the bottleneck and suggest a more efficient approach.`,
  conceptual: `Focus on CONCEPTS: Help them understand the underlying pattern. They may not know which technique to apply.`,
  approach: `Focus on APPROACH: Help them choose the right algorithm or data structure. Explain trade-offs.`,
  implementation: `Focus on IMPLEMENTATION: They know the approach but struggle with coding it. Help with specific syntax or logic.`,
}

/**
 * Build the user prompt with all context
 */
export function buildUserPrompt(params: {
  level: 1 | 2 | 3 | 4
  category: string
  problemTitle: string
  problemText: string
  problemPattern?: string
  difficulty: string
  userCode: string
  language: string
  struggleLevel: string
  testFailures?: string[]
  optimalComplexity?: {
    time: string
    space: string
  }
  constraints?: string[]
  patternKnowledge?: {
    displayName: string
    whenToUse: string[]
    keyInsights: string[]
    commonMistakes: string[]
  }
}): string {
  const levelPrompt = LEVEL_PROMPTS[params.level]
  const categoryContext = CATEGORY_CONTEXT[params.category] || ""

  // Build problem context with constraints and optimal complexity
  let problemContext = `## Problem: ${params.problemTitle} (${params.difficulty})
${params.problemText.slice(0, 600)}${params.problemText.length > 600 ? "..." : ""}`

  if (params.problemPattern) {
    problemContext += `\n\n**Pattern:** ${params.problemPattern}`
  }

  if (params.constraints?.length) {
    problemContext += `\n\n**Constraints:**\n${params.constraints.slice(0, 4).map(c => `- ${c}`).join("\n")}`
  }

  if (params.optimalComplexity) {
    problemContext += `\n\n**Target Complexity:** Time: ${params.optimalComplexity.time}, Space: ${params.optimalComplexity.space}`
  }

  let prompt = `${levelPrompt}

${categoryContext}

${problemContext}`

  // Add pattern knowledge if available
  if (params.patternKnowledge) {
    prompt += `

## Pattern Knowledge: ${params.patternKnowledge.displayName}
- When to use: ${params.patternKnowledge.whenToUse.slice(0, 2).join("; ")}
- Key insight: ${params.patternKnowledge.keyInsights[0]}
- Common mistakes to avoid: ${params.patternKnowledge.commonMistakes.slice(0, 2).join("; ")}`
  }

  // User's code with analysis context
  prompt += `

## User's Current Code (${params.language})
\`\`\`${params.language}
${params.userCode || "// No code written yet - user hasn't started"}
\`\`\`

## User Context
- Struggle level: ${params.struggleLevel}
- Hint level requested: Level ${params.level}`

  // Add test failures if present - crucial for debugging hints
  if (params.testFailures?.length) {
    prompt += `

## FAILING TESTS (analyze these to give specific debugging help):
${params.testFailures
  .slice(0, 3)
  .map((t) => `- ${t}`)
  .join("\n")}`
  }

  prompt += `

---
RESPOND WITH JSON ONLY (no markdown, no explanation):
{
  "title": "3-5 word hint title",
  "content": "The personalized hint that references their code and this specific problem",
  "codeAnalysis": "Brief assessment: what's their current approach and what's blocking them?"
}`

  return prompt
}
