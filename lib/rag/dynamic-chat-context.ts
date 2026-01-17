/**
 * Dynamic Chat Context - RAG-Enhanced Conversation Flow
 *
 * Analyzes user messages in real-time and dynamically retrieves
 * relevant context based on what they're discussing.
 *
 * Features:
 * - Intent detection (asking about approach, debugging, optimization, etc.)
 * - Dynamic RAG queries based on conversation flow
 * - Context-aware hint retrieval
 * - Smart caching to minimize API costs
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { DSAScenario } from "@/lib/scenarios/types"
import { getAdvancedRetriever } from "./retrieval/advanced-retrieval"
import { getPatternKnowledge } from "./knowledge-base/dsa-knowledge"

// ============================================================================
// TYPES
// ============================================================================

/**
 * Detected intent from user message
 */
export type UserIntent =
  | "asking-approach" // "How should I approach this?"
  | "asking-complexity" // "What's the time complexity?"
  | "asking-edge-cases" // "What edge cases should I handle?"
  | "debugging" // "Why isn't this working?"
  | "optimization" // "How can I make this faster?"
  | "clarification" // "What does X mean?"
  | "stuck" // "I'm stuck" or similar
  | "data-structure" // "Should I use a hashmap?"
  | "algorithm-choice" // "Is BFS or DFS better?"
  | "general" // Default/unclear intent

/**
 * Dynamic context retrieved based on user intent
 */
export interface DynamicChatContext {
  intent: UserIntent
  confidence: number // 0-1
  retrievedContext: string
  suggestedTopics: string[]
  relevantPatternInfo?: string
  debuggingHints?: string[]
  /** Scenario-specific proactive data for tailored interventions */
  scenarioProactiveData?: {
    whatIfQuestions?: string[]
    commonWrongApproaches?: Array<{ description: string; intervention: string }>
    midCodingProbes?: Array<{ trigger: string; question: string }>
    optimizationPush?: { suboptimalComplexity: string; nudge: string }
  }
}

/**
 * Options for dynamic context retrieval
 */
export interface DynamicContextOptions {
  userMessage: string
  currentCode?: string
  pattern?: DSAPattern
  problemTitle?: string
  testResults?: { passed: number; total: number; failingTests?: string[] }
  conversationHistory?: Array<{ type: string; message: string }>
  /** Full scenario for accessing proactive data (whatIfQuestions, commonWrongApproaches, etc.) */
  scenario?: DSAScenario
}

// ============================================================================
// INTENT DETECTION
// ============================================================================

/**
 * Intent detection patterns (regex-based for speed)
 */
const INTENT_PATTERNS: Array<{ intent: UserIntent; patterns: RegExp[]; weight: number }> = [
  {
    intent: "asking-approach",
    patterns: [
      /how\s+(should|do|can|would)\s+(i|we)\s+(approach|start|tackle|solve)/i,
      /what('s|\s+is)\s+(the\s+)?(best|right|correct)\s+(approach|way|method)/i,
      /where\s+(should|do)\s+(i|we)\s+(start|begin)/i,
      /can\s+you\s+(help|guide)\s+(me\s+)?(with|on)\s+(the\s+)?approach/i,
      /what\s+pattern\s+(should|would)/i,
      /how\s+do\s+i\s+think\s+about/i,
    ],
    weight: 1.0,
  },
  {
    intent: "asking-complexity",
    patterns: [
      /time\s+complexity/i,
      /space\s+complexity/i,
      /big\s*o/i,
      /what('s|\s+is)\s+(the\s+)?complexity/i,
      /how\s+(fast|efficient)/i,
      /O\s*\(\s*[nN]\s*\)/,
      /runtime/i,
    ],
    weight: 1.0,
  },
  {
    intent: "asking-edge-cases",
    patterns: [
      /edge\s+case/i,
      /corner\s+case/i,
      /special\s+case/i,
      /what\s+(if|about)\s+(the\s+)?(input\s+is\s+)?(empty|null|zero|negative)/i,
      /boundary/i,
      /handle\s+(empty|null|edge)/i,
    ],
    weight: 1.0,
  },
  {
    intent: "debugging",
    patterns: [
      /why\s+(isn't|is\s+not|doesn't|does\s+not|won't)/i,
      /what('s|\s+is)\s+wrong/i,
      /not\s+working/i,
      /getting\s+(an?\s+)?error/i,
      /failing/i,
      /bug/i,
      /incorrect\s+(output|result)/i,
      /expected\s+.+\s+but\s+got/i,
    ],
    weight: 1.0,
  },
  {
    intent: "optimization",
    patterns: [
      /make\s+(it\s+)?(faster|more\s+efficient|better)/i,
      /optimize/i,
      /improve\s+(the\s+)?(performance|speed|efficiency)/i,
      /too\s+slow/i,
      /timeout/i,
      /reduce\s+(the\s+)?complexity/i,
      /more\s+efficient/i,
    ],
    weight: 1.0,
  },
  {
    intent: "clarification",
    patterns: [
      /what\s+(does|is)\s+.+\s+mean/i,
      /can\s+you\s+explain/i,
      /i\s+don't\s+understand/i,
      /what\s+do\s+you\s+mean/i,
      /clarify/i,
      /confused\s+(about|by)/i,
    ],
    weight: 0.9,
  },
  {
    intent: "stuck",
    patterns: [
      /i('m|\s+am)\s+stuck/i,
      /don't\s+know\s+(what|how|where)/i,
      /no\s+idea/i,
      /help/i,
      /hint/i,
      /lost/i,
      /can't\s+(figure|think)/i,
    ],
    weight: 0.8,
  },
  {
    intent: "data-structure",
    patterns: [
      /(should|can|do)\s+(i|we)\s+use\s+(a\s+)?(hash\s*map|set|array|stack|queue|tree|heap|graph)/i,
      /what\s+data\s+structure/i,
      /(hash\s*map|set|dictionary|map)\s+(vs|or|versus)/i,
      /which\s+(data\s+)?structure/i,
    ],
    weight: 1.0,
  },
  {
    intent: "algorithm-choice",
    patterns: [
      /(bfs|dfs|binary\s+search|two\s+pointers?|sliding\s+window|dynamic\s+programming|dp|recursion|iteration)/i,
      /(should|can|do)\s+(i|we)\s+use\s+(bfs|dfs|recursion|iteration)/i,
      /which\s+algorithm/i,
      /(bfs|dfs)\s+(vs|or|versus)/i,
    ],
    weight: 1.0,
  },
]

/**
 * Detect user intent from message
 */
export function detectIntent(message: string): { intent: UserIntent; confidence: number } {
  let bestIntent: UserIntent = "general"
  let bestScore = 0

  for (const { intent, patterns, weight } of INTENT_PATTERNS) {
    let matchCount = 0
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        matchCount++
      }
    }

    if (matchCount > 0) {
      const score = (matchCount / patterns.length) * weight
      if (score > bestScore) {
        bestScore = score
        bestIntent = intent
      }
    }
  }

  // Normalize confidence to 0-1 range
  const confidence = Math.min(bestScore * 2, 1)

  return { intent: bestIntent, confidence }
}

// ============================================================================
// DYNAMIC CONTEXT RETRIEVAL
// ============================================================================

// Cache for dynamic context (1 minute TTL)
const dynamicContextCache = new Map<string, { context: DynamicChatContext; timestamp: number }>()
const DYNAMIC_CONTEXT_CACHE_TTL = 60 * 1000 // 1 minute

/**
 * Generate cache key for dynamic context
 */
function getDynamicContextCacheKey(options: DynamicContextOptions): string {
  const { userMessage, pattern, intent } = {
    ...options,
    intent: detectIntent(options.userMessage).intent,
  }
  return `${intent}:${pattern || "unknown"}:${userMessage.substring(0, 50)}`
}

/**
 * Retrieve dynamic context based on user message and intent
 */
export async function getDynamicChatContext(
  options: DynamicContextOptions
): Promise<DynamicChatContext> {
  const { userMessage, currentCode, pattern, problemTitle, testResults } = options

  // Step 1: Detect intent
  const { intent, confidence } = detectIntent(userMessage)

  // Step 2: Check cache
  const cacheKey = getDynamicContextCacheKey(options)
  const cached = dynamicContextCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < DYNAMIC_CONTEXT_CACHE_TTL) {
    return cached.context
  }

  // Step 3: Build intent-specific RAG query
  const retriever = getAdvancedRetriever()
  let retrievedContext = ""
  let suggestedTopics: string[] = []
  let relevantPatternInfo: string | undefined
  let debuggingHints: string[] | undefined

  try {
    switch (intent) {
      case "asking-approach": {
        // Retrieve approach-related hints
        const query = `${pattern || ""} approach strategy how to solve ${problemTitle || ""}`
        const { results } = await retriever.retrieve({
          query,
          limit: 3,
          types: ["knowledge", "hint"],
          minSimilarity: 0.3,
        })

        if (results.length > 0) {
          retrievedContext = results
            .slice(0, 2)
            .map((r) => r.text.substring(0, 300))
            .join("\n\n")
        }

        // Add pattern-specific approach info
        if (pattern) {
          const patternKnowledge = getPatternKnowledge(pattern)
          if (patternKnowledge) {
            relevantPatternInfo = `
**${patternKnowledge.displayName} Approach:**
- When to use: ${patternKnowledge.whenToUse[0]}
- Key insight: ${patternKnowledge.keyInsights[0]}
- First step: ${patternKnowledge.interviewTips[0] || "Identify the pattern in the problem"}
`.trim()
          }
        }

        suggestedTopics = ["pattern identification", "initial approach", "problem breakdown"]
        break
      }

      case "asking-complexity": {
        // Retrieve complexity information
        if (pattern) {
          const patternKnowledge = getPatternKnowledge(pattern)
          if (patternKnowledge) {
            retrievedContext = `
**Expected Complexity for ${patternKnowledge.displayName}:**
- Time: ${patternKnowledge.timeComplexity.typical} (best: ${patternKnowledge.timeComplexity.best}, worst: ${patternKnowledge.timeComplexity.worst})
- Space: ${patternKnowledge.spaceComplexity.typical} (${patternKnowledge.spaceComplexity.notes})

**Key Insight:**
${patternKnowledge.keyInsights[0] || "- Consider space-time tradeoffs"}
`.trim()
          }
        }

        suggestedTopics = ["time complexity", "space complexity", "optimization possibilities"]
        break
      }

      case "asking-edge-cases": {
        // Retrieve edge case information
        const query = `${pattern || ""} edge cases boundary conditions empty input`
        const { results } = await retriever.retrieve({
          query,
          limit: 2,
          types: ["knowledge"],
          minSimilarity: 0.3,
        })

        // Add common edge cases for the pattern
        const commonEdgeCases: Record<string, string[]> = {
          "arrays-hashing": ["Empty array", "Single element", "All duplicates", "No valid pairs"],
          "two-pointers": ["Empty array", "Single element", "All same values", "Already sorted"],
          "binary-search": ["Empty array", "Single element", "Target not found", "All same values"],
          "sliding-window": ["Window larger than array", "Empty string", "All same characters"],
          trees: [
            "Null root",
            "Single node",
            "Skewed tree (all left/right)",
            "Balanced vs unbalanced",
          ],
          graphs: ["Empty graph", "Disconnected components", "Cycles", "Self-loops"],
          "linked-list": ["Null head", "Single node", "Cycle present", "Even vs odd length"],
          "dp-1d": ["n=0", "n=1", "Negative values", "All zeros"],
          "dp-2d": ["Empty matrix", "1x1 matrix", "Single row/column"],
        }

        const patternEdgeCases = pattern ? commonEdgeCases[pattern] || [] : []
        retrievedContext = `
**Common Edge Cases to Consider:**
${patternEdgeCases.map((ec) => `- ${ec}`).join("\n")}

${results.length > 0 ? `**From Knowledge Base:**\n${results[0].text.substring(0, 200)}` : ""}
`.trim()

        suggestedTopics = ["input validation", "boundary conditions", "error handling"]
        break
      }

      case "debugging": {
        // Retrieve debugging context based on code and errors
        const errorContext = testResults?.failingTests?.slice(0, 2).join(" ") || ""

        const query = `${pattern || ""} debugging fix error ${errorContext}`
        const { results } = await retriever.retrieve({
          query,
          limit: 3,
          types: ["knowledge", "hint"],
          minSimilarity: 0.25,
        })

        if (results.length > 0) {
          retrievedContext = results
            .slice(0, 2)
            .map((r) => r.text.substring(0, 250))
            .join("\n\n")
        }

        // Add debugging hints
        debuggingHints = [
          "Trace through your code with a simple example",
          "Check array/loop boundaries carefully",
          "Verify your base cases and edge conditions",
          "Print intermediate values to find where logic diverges",
        ]

        if (pattern) {
          const patternKnowledge = getPatternKnowledge(pattern)
          if (patternKnowledge?.commonMistakes) {
            debuggingHints = [
              ...patternKnowledge.commonMistakes.slice(0, 2),
              ...debuggingHints.slice(0, 2),
            ]
          }
        }

        suggestedTopics = ["common mistakes", "debugging strategy", "test case analysis"]
        break
      }

      case "optimization": {
        // Retrieve optimization strategies
        const query = `${pattern || ""} optimization faster efficient improve performance`
        const { results } = await retriever.retrieve({
          query,
          limit: 3,
          types: ["knowledge"],
          minSimilarity: 0.3,
        })

        if (pattern) {
          const patternKnowledge = getPatternKnowledge(pattern)
          if (patternKnowledge) {
            retrievedContext = `
**Optimization Strategies for ${patternKnowledge.displayName}:**
- Target complexity: ${patternKnowledge.timeComplexity.typical}
- Key insight: ${patternKnowledge.keyInsights[0]}
- Best case: ${patternKnowledge.timeComplexity.best}
- Worst case: ${patternKnowledge.timeComplexity.worst}
`.trim()
          }
        }

        if (results.length > 0) {
          retrievedContext += `\n\n**From Knowledge Base:**\n${results[0].text.substring(0, 200)}`
        }

        suggestedTopics = ["time optimization", "space optimization", "algorithm alternatives"]
        break
      }

      case "data-structure":
      case "algorithm-choice": {
        // Retrieve data structure / algorithm comparison info
        const query = `${userMessage} ${pattern || ""} comparison when to use`
        const { results } = await retriever.retrieve({
          query,
          limit: 3,
          types: ["knowledge"],
          minSimilarity: 0.3,
        })

        if (results.length > 0) {
          retrievedContext = results
            .slice(0, 2)
            .map((r) => r.text.substring(0, 300))
            .join("\n\n")
        }

        suggestedTopics = ["data structure choice", "algorithm comparison", "trade-offs"]
        break
      }

      case "stuck": {
        // Provide progressive hints
        if (pattern) {
          const patternKnowledge = getPatternKnowledge(pattern)
          if (patternKnowledge) {
            retrievedContext = `
**Hints for ${patternKnowledge.displayName}:**

1. **Think about:** ${patternKnowledge.whenToUse[0]}
2. **Key pattern:** ${patternKnowledge.keyInsights[0]}
3. **Common approach:** ${patternKnowledge.interviewTips[0] || "Break the problem into smaller steps"}
`.trim()
          }
        }

        // Retrieve additional hints
        const { results } = await retriever.retrieve({
          query: `${pattern || ""} hint approach ${problemTitle || ""} stuck`,
          limit: 2,
          types: ["hint"],
          minSimilarity: 0.3,
        })

        if (results.length > 0) {
          retrievedContext += `\n\n**Related Hint:**\n${results[0].text.substring(0, 200)}`
        }

        suggestedTopics = ["getting unstuck", "pattern recognition", "step-by-step approach"]
        break
      }

      default: {
        // General context - light retrieval
        if (pattern) {
          const patternKnowledge = getPatternKnowledge(pattern)
          if (patternKnowledge) {
            relevantPatternInfo = `Current pattern: ${patternKnowledge.displayName}`
          }
        }
        suggestedTopics = ["approach", "complexity", "edge cases"]
      }
    }
  } catch (error) {
    console.warn("[DynamicChatContext] RAG retrieval failed:", error)
  }

  // Extract scenario-specific proactive data if available
  const scenarioProactiveData = options.scenario
    ? {
        whatIfQuestions: options.scenario.whatIfQuestions,
        commonWrongApproaches: options.scenario.commonWrongApproaches?.map((wa) => ({
          description: wa.description,
          intervention: wa.intervention,
        })),
        midCodingProbes: options.scenario.midCodingProbes?.map((p) => ({
          trigger: p.trigger,
          question: p.question,
        })),
        optimizationPush: options.scenario.optimizationPush,
      }
    : undefined

  const result: DynamicChatContext = {
    intent,
    confidence,
    retrievedContext,
    suggestedTopics,
    relevantPatternInfo,
    debuggingHints,
    scenarioProactiveData,
  }

  // Cache the result
  dynamicContextCache.set(cacheKey, { context: result, timestamp: Date.now() })

  return result
}

/**
 * Format dynamic context for inclusion in AI prompt
 */
export function formatDynamicContextForPrompt(context: DynamicChatContext): string {
  const parts: string[] = []

  parts.push(
    `[User Intent: ${context.intent} (confidence: ${(context.confidence * 100).toFixed(0)}%)]`
  )

  if (context.relevantPatternInfo) {
    parts.push(`\n${context.relevantPatternInfo}`)
  }

  if (context.retrievedContext) {
    parts.push(`\n**Relevant Context:**\n${context.retrievedContext}`)
  }

  if (context.debuggingHints && context.debuggingHints.length > 0) {
    parts.push(
      `\n**Debugging Suggestions:**\n${context.debuggingHints.map((h) => `- ${h}`).join("\n")}`
    )
  }

  if (context.suggestedTopics.length > 0) {
    parts.push(`\n[Suggested follow-up topics: ${context.suggestedTopics.join(", ")}]`)
  }

  // Include scenario-specific proactive data for tailored AI responses
  if (context.scenarioProactiveData) {
    const proactive = context.scenarioProactiveData

    if (proactive.whatIfQuestions && proactive.whatIfQuestions.length > 0) {
      parts.push(
        `\n**Problem-Specific What-If Questions (use after solution works):**\n${proactive.whatIfQuestions.slice(0, 2).map((q) => `- ${q}`).join("\n")}`
      )
    }

    if (proactive.commonWrongApproaches && proactive.commonWrongApproaches.length > 0) {
      parts.push(
        `\n**Watch for Wrong Approaches:**\n${proactive.commonWrongApproaches.slice(0, 2).map((wa) => `- If: ${wa.description} → Say: "${wa.intervention}"`).join("\n")}`
      )
    }

    if (proactive.midCodingProbes && proactive.midCodingProbes.length > 0) {
      parts.push(
        `\n**Tailored Mid-Coding Questions:**\n${proactive.midCodingProbes.slice(0, 2).map((p) => `- When: ${p.trigger} → Ask: "${p.question}"`).join("\n")}`
      )
    }

    if (proactive.optimizationPush) {
      parts.push(
        `\n**Optimization Nudge:** If solution is ${proactive.optimizationPush.suboptimalComplexity}, say: "${proactive.optimizationPush.nudge}"`
      )
    }
  }

  return parts.join("\n")
}

/**
 * Check if dynamic context retrieval is worthwhile for this message
 * (Skip very short or simple messages to save costs)
 */
export function shouldRetrieveDynamicContext(message: string): boolean {
  // Skip very short messages
  if (message.length < 15) return false

  // Skip simple acknowledgments
  const simplePatterns = [
    /^(ok|okay|yes|no|sure|thanks|thank you|got it|i see|alright)\.?$/i,
    /^(hmm|um|uh|ah)\.?$/i,
  ]

  for (const pattern of simplePatterns) {
    if (pattern.test(message.trim())) return false
  }

  return true
}
