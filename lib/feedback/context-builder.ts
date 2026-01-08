/**
 * RAG-enhanced feedback context builder
 *
 * This module builds context from RAG (Retrieval Augmented Generation) sources
 * including pattern knowledge, similar solutions, and user performance data.
 * Supports DSA, bug fix, and system design scenario types.
 */

import { buildFeedbackContext } from "@/lib/rag/context-builder"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import {
  getAllDebuggingKnowledge,
  getDebuggingKnowledge,
  formatDebuggingKnowledgeForContext,
  type BugCategory,
} from "@/lib/rag/knowledge-base/debugging-knowledge"
import {
  getAllSystemDesignKnowledge,
  getSystemDesignKnowledge,
  formatSystemDesignKnowledgeForContext,
} from "@/lib/rag/knowledge-base/system-design-knowledge"
import { getUserPerformanceProfile, getUserRecommendations } from "@/lib/rag/user-performance-rag"
import { logger } from "@/lib/logger"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

/**
 * Scenario types supported by the feedback context builder
 */
export type ScenarioType = "dsa" | "bugfix" | "system-design"

/**
 * Build RAG-enhanced context for feedback generation
 * Retrieves pattern knowledge, similar solutions, and user performance insights
 */
export async function buildRAGFeedbackContext(options: {
  problemText: string
  userCode: string
  testResults: { passed: number; total: number }
  scenarioPattern?: string
  scenarioType?: ScenarioType
  bugCategory?: string
  difficulty?: "easy" | "medium" | "hard"
  userId?: string
}): Promise<string> {
  const ragParts: string[] = []

  try {
    const scenarioType = options.scenarioType || "dsa"

    // 1. Get scenario-specific feedback criteria based on type
    if (scenarioType === "bugfix") {
      // Bug fix scenario - use debugging knowledge
      if (options.bugCategory) {
        const debugKnowledge = getDebuggingKnowledge(options.bugCategory as BugCategory)
        if (debugKnowledge) {
          ragParts.push(formatDebuggingKnowledgeForContext(debugKnowledge))
        }
      } else {
        // No specific category - provide general debugging guidance
        ragParts.push(`
## Debugging Evaluation Criteria

### Key Areas to Evaluate
- Bug identification accuracy: Did they correctly identify the bug type and location?
- Debugging methodology: Did they use systematic debugging approach (console logs, breakpoints, test cases)?
- Root cause analysis: Did they understand WHY the bug occurred, not just WHAT was wrong?
- Fix quality: Is the fix correct, minimal, and doesn't introduce new issues?

### Common Bug Categories to Check
- Off-by-one errors in loops/indices
- Null/undefined reference handling
- Type coercion issues
- Logic errors in conditionals
- Boundary condition handling
- Async/await and promise handling
`)
      }
    } else if (scenarioType === "system-design") {
      // System design scenario - use system design knowledge
      const systemDesignConcepts = getAllSystemDesignKnowledge()
      const relevantConcepts = identifyRelevantSystemDesignConcepts(
        options.problemText,
        systemDesignConcepts
      )

      if (relevantConcepts.length > 0) {
        ragParts.push(`
## System Design Evaluation Context

${relevantConcepts
  .slice(0, 3)
  .map((concept) => formatSystemDesignKnowledgeForContext(concept))
  .join("\n\n")}
`)
      } else {
        ragParts.push(`
## System Design Evaluation Criteria

### Key Areas to Evaluate
- Requirements clarification: Did they ask about scale, constraints, and use cases?
- High-level design: Is the architecture sound and appropriate for the requirements?
- Component selection: Did they choose appropriate components (databases, caches, queues)?
- Scalability considerations: Did they address horizontal scaling, load balancing, sharding?
- Trade-off analysis: Did they discuss pros/cons of their design decisions?
- Estimations: Did they provide reasonable back-of-envelope calculations?

### Common Evaluation Points
- Data model and storage decisions
- API design and communication patterns
- Caching strategy and invalidation
- Load balancing and fault tolerance
- Monitoring and observability
`)
      }
    } else {
      // DSA scenario - use pattern knowledge (existing logic)
      if (options.scenarioPattern) {
        const patternKnowledge = getPatternKnowledge(options.scenarioPattern as DSAPattern)
        if (patternKnowledge) {
          ragParts.push(`
## Pattern-Specific Evaluation: ${patternKnowledge.displayName}

### Expected Approach
${patternKnowledge.keyInsights
  .slice(0, 3)
  .map((i) => `- ${i}`)
  .join("\n")}

### Common Mistakes to Check For
${patternKnowledge.commonMistakes
  .slice(0, 3)
  .map((m) => `- ${m}`)
  .join("\n")}

### Expected Complexity
- Optimal Time: ${patternKnowledge.timeComplexity.typical}
- Optimal Space: ${patternKnowledge.spaceComplexity.typical}
- Better Than Brute Force: ${(patternKnowledge.timeComplexity as any).bruteForce || "N/A"}
`)
        }
      }
    }

    // 2. Build feedback context from RAG (for DSA scenarios)
    const feedbackContext = await buildFeedbackContext({
      problemText: options.problemText,
      userCode: options.userCode,
      testResults: options.testResults,
      pattern: options.scenarioPattern as DSAPattern,
      difficulty: options.difficulty,
    })

    if (feedbackContext.retrievedDocs.length > 0) {
      ragParts.push(`
## Reference Solutions (${feedbackContext.retrievedDocs.length} found)

${feedbackContext.retrievedDocs
  .slice(0, 2)
  .map(
    (doc, i) => `
### Reference ${i + 1} (Relevance: ${Math.round(doc.finalScore * 100)}%)
${doc.text.substring(0, 300)}${doc.text.length > 300 ? "..." : ""}
`
  )
  .join("\n")}
`)
    }

    // 3. Get user performance profile for personalized feedback
    if (options.userId) {
      const userProfile = await getUserPerformanceProfile(options.userId)
      if (userProfile) {
        const patternStrength = options.scenarioPattern
          ? (userProfile.patternProficiency as any)[options.scenarioPattern as DSAPattern]
          : null

        ragParts.push(`
## User Performance Context

- Average Score: ${Math.round(userProfile.averageScore)}%
- Sessions Completed: ${userProfile.totalSessions}
- Trend: ${userProfile.recentTrend}
${patternStrength ? `- Proficiency in ${options.scenarioPattern}: ${patternStrength.level} (${patternStrength.successRate}% success rate)` : ""}

### Strengths
${userProfile.strengths
  .slice(0, 2)
  .map((s) => `- ${s}`)
  .join("\n")}

### Areas for Improvement
${userProfile.weaknesses
  .slice(0, 2)
  .map((w) => `- ${w}`)
  .join("\n")}
`)

        // Get personalized recommendations
        const recommendations = await getUserRecommendations(options.userId)
        if (recommendations && recommendations.length > 0) {
          ragParts.push(`
### Personalized Recommendations
${recommendations
  .slice(0, 2)
  .map(
    (rec, i) =>
      `${i + 1}. ${rec.reason || (rec as any).scenario?.title || "Practice similar problems"}`
  )
  .join("\n")}
`)
        }
      }
    }
  } catch (error) {
    logger.error("[Feedback API] RAG context build error", { error })
    // Continue without RAG context - don't fail the feedback generation
  }

  if (ragParts.length === 0) {
    return ""
  }

  return `
=== RAG-ENHANCED FEEDBACK CONTEXT ===
${ragParts.join("\n")}
=== END RAG CONTEXT ===
`
}

/**
 * Identify relevant system design concepts based on problem text
 * Uses keyword matching to find applicable concepts
 */
function identifyRelevantSystemDesignConcepts(
  problemText: string,
  allConcepts: ReturnType<typeof getAllSystemDesignKnowledge>
): ReturnType<typeof getAllSystemDesignKnowledge> {
  const lowerText = problemText.toLowerCase()

  // Keywords for each concept category
  const conceptKeywords: Record<string, string[]> = {
    "horizontal-scaling": ["scale", "million users", "high traffic", "distributed", "horizontal"],
    "vertical-scaling": ["upgrade", "single server", "vertical", "more memory", "more cpu"],
    "load-balancing": ["load balancer", "distribute traffic", "multiple servers", "round robin"],
    "database-sharding": [
      "shard",
      "partition",
      "large dataset",
      "billions of rows",
      "data distribution",
    ],
    caching: ["cache", "redis", "memcached", "fast reads", "reduce latency", "frequently accessed"],
    "sql-vs-nosql": ["database", "sql", "nosql", "mongodb", "postgres", "mysql", "data model"],
    "cap-theorem": ["consistency", "availability", "partition", "distributed database", "cap"],
    "high-availability": [
      "uptime",
      "fault tolerant",
      "redundant",
      "failover",
      "disaster recovery",
      "99.9%",
    ],
    "rate-limiting": [
      "rate limit",
      "throttle",
      "api limit",
      "requests per second",
      "abuse prevention",
    ],
    "circuit-breaker": ["circuit breaker", "failure cascade", "microservice", "service resilience"],
    "message-queue": ["queue", "kafka", "rabbitmq", "async", "event driven", "pub/sub", "decouple"],
    cdn: ["cdn", "static content", "global", "edge", "content delivery", "latency"],
    "api-gateway": ["api gateway", "authentication", "rate limiting", "routing", "single entry"],
    dns: ["dns", "domain", "resolution", "nameserver"],
    "back-of-envelope": ["estimate", "calculate", "how many", "capacity", "storage", "bandwidth"],
  }

  const matchedConcepts: Array<{
    concept: ReturnType<typeof getAllSystemDesignKnowledge>[0]
    score: number
  }> = []

  for (const concept of allConcepts) {
    const keywords = conceptKeywords[concept.concept] || []
    let score = 0

    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += 1
      }
    }

    // Also check if problem mentions the concept directly
    if (lowerText.includes(concept.displayName.toLowerCase())) {
      score += 3
    }

    if (score > 0) {
      matchedConcepts.push({ concept, score })
    }
  }

  // Sort by relevance score and return top matches
  return matchedConcepts.sort((a, b) => b.score - a.score).map((m) => m.concept)
}
