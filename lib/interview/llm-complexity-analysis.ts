/**
 * LLM-Based Code Complexity Analysis
 *
 * Uses Claude to semantically analyze code complexity instead of regex pattern matching.
 * This provides accurate complexity analysis that understands:
 * - Recursion and its complexity (O(2^n) for naive fib, O(n) for memoized)
 * - Functional patterns (.map, .reduce, generators)
 * - Early returns and break conditions
 * - Language-specific idioms
 * - Algorithmic intent, not just syntax
 */

export interface LLMComplexityResult {
  timeComplexity: string
  spaceComplexity: string
  confidence: "high" | "medium" | "low"
  reasoning: string
  algorithmPattern?: string // e.g., "two-pointer", "sliding-window", "dynamic-programming"
  suggestions?: string[]
}

export interface LLMComplexityRequest {
  code: string
  language: string
  problemTitle?: string
  problemDescription?: string
  optimalTimeComplexity?: string
  optimalSpaceComplexity?: string
}

/**
 * Analyze code complexity using LLM.
 * Falls back to regex-based analysis if LLM fails.
 */
export async function analyzeComplexityWithLLM(
  request: LLMComplexityRequest
): Promise<LLMComplexityResult> {
  const { code, language, problemTitle, optimalTimeComplexity, optimalSpaceComplexity } = request

  const systemPrompt = `You are an expert algorithm analyst. Analyze the given code and determine its time and space complexity.

RULES:
1. Analyze the ACTUAL algorithm, not just syntax patterns
2. Consider recursion depth and branching factor
3. Account for early returns, break conditions, and optimizations
4. Recognize common patterns: two-pointer, sliding window, divide-and-conquer, DP, etc.
5. Consider amortized complexity where applicable
6. Be precise: O(n) is different from O(n log n) is different from O(n²)

CRITICAL - AMORTIZED COMPLEXITY PATTERNS:
Some algorithms have nested loops but are still O(n) due to amortized analysis:

- BUCKET SORT / COUNTING SORT: Even with nested loops iterating buckets, if total items across ALL buckets = n, the complexity is O(n), NOT O(n²). Example: Top K Frequent Elements using bucket sort.

- MONOTONIC STACK/QUEUE: Inner while loop may run multiple times, but each element is pushed/popped at most once total, so O(n) amortized.

- TWO POINTERS (same direction): Two pointers both moving forward = O(n) total, not O(n²).

When you see nested loops, ask: "Does the inner loop's TOTAL iterations across ALL outer iterations equal n?" If yes, it's O(n) amortized.

OUTPUT FORMAT (JSON only, no markdown):
{
  "timeComplexity": "O(n)" | "O(n log n)" | "O(n²)" | "O(2^n)" | etc.,
  "spaceComplexity": "O(1)" | "O(n)" | "O(log n)" | etc.,
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation of why this complexity",
  "algorithmPattern": "pattern name if recognized",
  "suggestions": ["optional improvement suggestions"]
}`

  const userPrompt = `Analyze this ${language} code${problemTitle ? ` for the problem "${problemTitle}"` : ""}:

\`\`\`${language}
${code}
\`\`\`

${optimalTimeComplexity ? `Known optimal time complexity: ${optimalTimeComplexity}` : ""}
${optimalSpaceComplexity ? `Known optimal space complexity: ${optimalSpaceComplexity}` : ""}

Return ONLY valid JSON, no markdown code blocks.`

  try {
    const response = await fetch("/api/analyze-complexity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        code,
        language,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()

    // Validate the response structure - handle various edge cases
    const timeComplexity = normalizeComplexity(result?.timeComplexity)
    const spaceComplexity = normalizeComplexity(result?.spaceComplexity)

    // If both are unknown, treat as a failure
    if (timeComplexity === "Unknown" && spaceComplexity === "Unknown") {
      throw new Error("LLM returned no usable complexity values")
    }

    // Validate confidence is a valid value
    const validConfidences = ["high", "medium", "low"] as const
    const confidence = validConfidences.includes(result?.confidence)
      ? (result.confidence as "high" | "medium" | "low")
      : "medium"

    return {
      timeComplexity,
      spaceComplexity,
      confidence,
      reasoning: typeof result?.reasoning === "string" ? result.reasoning : "",
      algorithmPattern:
        typeof result?.algorithmPattern === "string" ? result.algorithmPattern : undefined,
      suggestions: Array.isArray(result?.suggestions) ? result.suggestions : undefined,
    }
  } catch (error) {
    console.error("LLM complexity analysis failed, using fallback:", error)
    // Return a fallback that indicates we couldn't analyze
    return {
      timeComplexity: "Unknown",
      spaceComplexity: "Unknown",
      confidence: "low",
      reasoning:
        "LLM analysis unavailable, complexity will be evaluated during feedback generation",
    }
  }
}

/**
 * Normalize complexity notation to standard format
 */
function normalizeComplexity(complexity: string | null | undefined): string {
  if (!complexity) return "Unknown"

  const normalized = complexity.trim().toUpperCase()

  // Handle edge cases
  if (!normalized || normalized === "UNKNOWN" || normalized === "N/A") {
    return "Unknown"
  }

  // Handle common variations
  const mappings: Record<string, string> = {
    "O(1)": "O(1)",
    "O(N)": "O(n)",
    "O(LOGN)": "O(log n)",
    "O(LOG N)": "O(log n)",
    "O(LOG(N))": "O(log n)",
    "O(N LOG N)": "O(n log n)",
    "O(NLOGN)": "O(n log n)",
    "O(N*LOGN)": "O(n log n)",
    "O(N*LOG N)": "O(n log n)",
    "O(N * LOG N)": "O(n log n)",
    "O(N^2)": "O(n²)",
    "O(N*N)": "O(n²)",
    "O(N²)": "O(n²)",
    "O(N**2)": "O(n²)",
    "O(N^3)": "O(n³)",
    "O(N³)": "O(n³)",
    "O(N**3)": "O(n³)",
    "O(2^N)": "O(2^n)",
    "O(2**N)": "O(2^n)",
    "O(M*N)": "O(m×n)",
    "O(M * N)": "O(m×n)",
    "O(MN)": "O(m×n)",
    "O(M+N)": "O(m+n)",
    "O(M + N)": "O(m+n)",
    "O(K)": "O(k)",
    CONSTANT: "O(1)",
    LINEAR: "O(n)",
    LOGARITHMIC: "O(log n)",
    LINEARITHMIC: "O(n log n)",
    QUADRATIC: "O(n²)",
    CUBIC: "O(n³)",
    EXPONENTIAL: "O(2^n)",
  }

  return mappings[normalized] || complexity
}

/**
 * Compare user's stated complexity with actual complexity.
 * Returns a score and feedback.
 */
export function compareComplexity(
  userStated: { time?: string; space?: string },
  actual: LLMComplexityResult,
  optimal: { time?: string; space?: string }
): {
  timeCorrect: boolean
  spaceCorrect: boolean
  score: number
  feedback: string
} {
  const normalizedUserTime = userStated.time ? normalizeComplexity(userStated.time) : null
  const normalizedUserSpace = userStated.space ? normalizeComplexity(userStated.space) : null

  const timeCorrect = normalizedUserTime === actual.timeComplexity
  const spaceCorrect = normalizedUserSpace === actual.spaceComplexity

  // Check if solution matches optimal
  const isOptimalTime = optimal.time
    ? normalizeComplexity(optimal.time) === actual.timeComplexity
    : true
  const isOptimalSpace = optimal.space
    ? normalizeComplexity(optimal.space) === actual.spaceComplexity
    : true

  // Calculate score
  let score = 100

  // Deduct for suboptimal solution
  if (!isOptimalTime) score -= 20
  if (!isOptimalSpace) score -= 10

  // Deduct for incorrect understanding (user stated wrong)
  if (normalizedUserTime && !timeCorrect) score -= 15
  if (normalizedUserSpace && !spaceCorrect) score -= 10

  // Build feedback
  const feedbackParts: string[] = []

  if (!isOptimalTime) {
    feedbackParts.push(
      `Your solution runs in ${actual.timeComplexity}, but the optimal is ${optimal.time}.`
    )
  }

  if (normalizedUserTime && !timeCorrect) {
    feedbackParts.push(
      `You stated the time complexity as ${userStated.time}, but it's actually ${actual.timeComplexity}.`
    )
  }

  if (feedbackParts.length === 0) {
    feedbackParts.push("Your complexity analysis is correct!")
  }

  return {
    timeCorrect,
    spaceCorrect,
    score: Math.max(0, score),
    feedback: feedbackParts.join(" "),
  }
}
