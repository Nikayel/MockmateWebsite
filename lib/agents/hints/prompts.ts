/**
 * LLM prompt templates for hint generation
 */

export const HINT_SYSTEM_PROMPT = `You are an expert coding interview tutor. Generate progressive hints that help without giving away solutions.

HINT LEVELS:
- Level 1 (Nudge): Ask a thought-provoking question. Don't name techniques directly.
- Level 2 (Guide): Name the technique/data structure, explain when it applies.
- Level 3 (Explain): Step-by-step approach with reasoning and complexity analysis.
- Level 4 (Reveal): Near-complete pseudocode for truly stuck users.

RULES:
1. Never give complete solutions in levels 1-3
2. Analyze the user's actual code - reference specific issues you see
3. Keep hints concise: 1-2 sentences for L1-L2, up to a paragraph for L3-L4
4. If tests are failing, address the specific failure pattern
5. Be direct and helpful - no empty praise like "Great start!"

CODE ANALYSIS - Before generating a hint, assess:
- Progress: What has the user built so far?
- Approach: Are they on the right track or wrong path?
- Issues: Off-by-one errors, wrong data structure, missing edge cases?
- Stuck point: Conceptual confusion, implementation struggle, or optimization needed?`

export const LEVEL_PROMPTS: Record<1 | 2 | 3 | 4, string> = {
  1: `Generate a NUDGE hint (Level 1).
- Ask a question that guides their thinking
- Reference a concept without naming the exact technique
- Example: "What if you could check if you've seen this value before in O(1)?"`,

  2: `Generate a GUIDE hint (Level 2).
- Name the relevant technique or data structure
- Explain WHY it applies to this problem
- Example: "A hash map lets you track seen values in O(1). What would you store as keys vs values?"`,

  3: `Generate an EXPLAIN hint (Level 3).
- Provide step-by-step approach with reasoning
- Include time/space complexity
- Mention common pitfalls to avoid
- Reference their specific code if relevant`,

  4: `Generate a REVEAL hint (Level 4).
- Provide detailed pseudocode or algorithm steps
- This is for truly stuck users - be helpful
- Still encourage them to implement it themselves`,
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
  patternKnowledge?: {
    displayName: string
    whenToUse: string[]
    keyInsights: string[]
    commonMistakes: string[]
  }
}): string {
  const levelPrompt = LEVEL_PROMPTS[params.level]
  const categoryContext = CATEGORY_CONTEXT[params.category] || ""

  let prompt = `${levelPrompt}

${categoryContext}

## Problem
**${params.problemTitle}** (${params.difficulty})
${params.problemText.slice(0, 500)}${params.problemText.length > 500 ? "..." : ""}
${params.problemPattern ? `\nPattern: ${params.problemPattern}` : ""}`

  // Add pattern knowledge if available
  if (params.patternKnowledge) {
    prompt += `

## Pattern Knowledge: ${params.patternKnowledge.displayName}
- When to use: ${params.patternKnowledge.whenToUse.slice(0, 2).join("; ")}
- Key insight: ${params.patternKnowledge.keyInsights[0]}
- Common mistakes: ${params.patternKnowledge.commonMistakes.slice(0, 2).join("; ")}`
  }

  prompt += `

## User's Code (${params.language})
\`\`\`${params.language}
${params.userCode || "// No code written yet"}
\`\`\`

## Context
- Struggle level: ${params.struggleLevel}
- Hint level requested: ${params.level}`

  // Add test failures if present
  if (params.testFailures?.length) {
    prompt += `

## Failing Tests
${params.testFailures
  .slice(0, 3)
  .map((t) => `- ${t}`)
  .join("\n")}`
  }

  prompt += `

---
Respond with JSON only:
{
  "title": "Brief 3-5 word title",
  "content": "The hint text",
  "codeAnalysis": "One sentence about where they are stuck"
}`

  return prompt
}
