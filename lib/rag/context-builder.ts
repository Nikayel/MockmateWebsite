/**
 * RAG Context Builder
 *
 * Builds rich context from RAG retrieval for AI prompts.
 * Supports multiple context types:
 * - Roadmap generation context
 * - Interview preparation context
 * - Problem-solving hints context
 * - Personalized learning context
 */

import { getAdvancedRetriever, type EnhancedRetrievalResult } from "./retrieval/advanced-retrieval"
import { getPatternKnowledge, patternKnowledgeToDocument } from "./knowledge-base/dsa-knowledge"
import {
  getCompanyInterviewKnowledge,
  companyKnowledgeToDocument,
} from "./knowledge-base/company-knowledge"
import {
  getComplexityKnowledge,
  getPatternComplexityRules,
} from "./knowledge-base/complexity-knowledge"
import {
  getEnhancedProfileService,
  type EnhancedUserProfile,
  type UserInsight,
} from "./enhanced-user-profile"
import { getMisconceptionTracker } from "./misconception-detection"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { CompanyId } from "@/lib/data/company-questions/types"

/**
 * Context types for different use cases
 */
export type ContextType =
  | "roadmap-generation"
  | "interview-prep"
  | "problem-solving"
  | "hint-generation"
  | "learning-path"
  | "feedback-generation"

/**
 * Built context result
 */
export interface BuiltContext {
  type: ContextType
  systemContext: string // For system prompt
  userContext: string // For user message augmentation
  retrievedDocs: EnhancedRetrievalResult[]
  metadata: {
    patternsIncluded: DSAPattern[]
    companiesIncluded: CompanyId[]
    docCount: number
    buildTimeMs: number
  }
}

/**
 * Roadmap generation context options
 */
export interface RoadmapContextOptions {
  targetCompany: CompanyId
  experienceLevel: "intern" | "beginner" | "intermediate" | "advanced"
  daysRemaining: number
  patternFamiliarity: { pattern: DSAPattern; level: string }[]
  hoursPerDay: number
  userId?: string
}

/**
 * Problem solving context options
 */
export interface ProblemContextOptions {
  problemText: string
  problemPattern?: DSAPattern
  userCode?: string
  language?: string
  userId?: string
}

/**
 * RAG Context Builder class
 */
export class RAGContextBuilder {
  private retriever = getAdvancedRetriever()

  /**
   * Build context for roadmap generation
   */
  async buildRoadmapContext(options: RoadmapContextOptions): Promise<BuiltContext> {
    const startTime = Date.now()
    const retrievedDocs: EnhancedRetrievalResult[] = []

    // 1. Get company-specific interview knowledge
    const companyKnowledge = getCompanyInterviewKnowledge(options.targetCompany)
    let companyContext = ""
    if (companyKnowledge) {
      companyContext = companyKnowledgeToDocument(companyKnowledge)
    }

    // 2. Retrieve additional company knowledge from RAG
    const companyDocs = await this.retriever.retrieveCompanyKnowledge(options.targetCompany, {
      limit: 3,
    })
    retrievedDocs.push(...companyDocs)

    // 3. Get pattern knowledge for weak areas
    const weakPatterns = options.patternFamiliarity
      .filter((p) => p.level === "unknown" || p.level === "seen")
      .map((p) => p.pattern)

    const patternContexts: string[] = []
    for (const pattern of weakPatterns.slice(0, 5)) {
      const knowledge = getPatternKnowledge(pattern)
      if (knowledge) {
        patternContexts.push(patternKnowledgeToDocument(knowledge))
      }
    }

    // 4. Retrieve relevant knowledge for the user's level
    const levelQuery = `${options.experienceLevel} level interview preparation strategies ${options.targetCompany}`
    const { results: levelDocs } = await this.retriever.retrieve({
      query: levelQuery,
      limit: 3,
      types: ["knowledge"],
      enableQueryExpansion: true,
    })
    retrievedDocs.push(...levelDocs)

    // 5. If user exists, get their performance context
    let userPerformanceContext = ""
    if (options.userId) {
      const userDocs = await this.retriever.retrieveUserSolutions(
        options.userId,
        "past performance patterns",
        { limit: 5 }
      )
      if (userDocs.length > 0) {
        userPerformanceContext = `
## User's Past Performance
Based on ${userDocs.length} previous sessions:
${userDocs.map((d) => `- Solved: ${d.metadata?.problemTitle || "Problem"} (${d.metadata?.pattern || "unknown pattern"})`).join("\n")}
`
      }
      retrievedDocs.push(...userDocs)
    }

    // Build system context
    const systemContext = `
# RAG-Enhanced Roadmap Generation Context

## Target Company: ${options.targetCompany.toUpperCase()}
${companyContext}

## Company-Specific Insights from Knowledge Base
${companyDocs.map((d) => d.text).join("\n\n---\n\n")}

## Weak Patterns to Focus On
${patternContexts.slice(0, 3).join("\n\n---\n\n")}

## Experience Level Guidance
${levelDocs.map((d) => d.text).join("\n\n---\n\n")}

${userPerformanceContext}

## Key Considerations for ${options.experienceLevel} Level
- Days remaining: ${options.daysRemaining}
- Daily hours available: ${options.hoursPerDay}
- Total available hours: ${options.daysRemaining * options.hoursPerDay}
`.trim()

    // Build user context (for augmenting user's request)
    const userContext = `
Creating a personalized study roadmap for ${options.targetCompany} interview.
Experience level: ${options.experienceLevel}
Time available: ${options.daysRemaining} days, ${options.hoursPerDay} hours/day
Weak patterns: ${weakPatterns.join(", ") || "None identified"}
`.trim()

    return {
      type: "roadmap-generation",
      systemContext,
      userContext,
      retrievedDocs,
      metadata: {
        patternsIncluded: weakPatterns,
        companiesIncluded: [options.targetCompany],
        docCount: retrievedDocs.length,
        buildTimeMs: Date.now() - startTime,
      },
    }
  }

  /**
   * Build context for problem-solving hints
   */
  async buildHintContext(options: ProblemContextOptions): Promise<BuiltContext> {
    const startTime = Date.now()
    const retrievedDocs: EnhancedRetrievalResult[] = []

    // 1. Get pattern-specific knowledge if known
    let patternContext = ""
    if (options.problemPattern) {
      const knowledge = getPatternKnowledge(options.problemPattern)
      if (knowledge) {
        patternContext = patternKnowledgeToDocument(knowledge)
      }
    }

    // 2. Retrieve contextual hints
    const hintDocs = await this.retriever.retrieveContextualHints(
      options.problemText,
      options.userCode || "",
      { limit: 5, pattern: options.problemPattern }
    )
    retrievedDocs.push(...hintDocs)

    // 3. Retrieve similar problems for reference
    const similarProblems = await this.retriever.retrieveSimilarProblems(options.problemText, {
      limit: 3,
    })
    retrievedDocs.push(...similarProblems)

    // 4. Get user's past solutions for similar problems
    let userSolutionsContext = ""
    if (options.userId) {
      const userSolutions = await this.retriever.retrieveUserSolutions(
        options.userId,
        options.problemText,
        { limit: 3, onlyPassed: true }
      )
      if (userSolutions.length > 0) {
        userSolutionsContext = `
## Your Past Similar Solutions
You've successfully solved similar problems before:
${userSolutions.map((s) => `- ${s.metadata?.problemTitle || "Similar Problem"}: Used ${s.metadata?.pattern || "pattern"} approach`).join("\n")}
`
      }
      retrievedDocs.push(...userSolutions)
    }

    const systemContext = `
# RAG-Enhanced Hint Generation Context

## Pattern Knowledge
${patternContext || "Pattern not identified. Consider suggesting pattern identification."}

## Similar Problems & Approaches
${similarProblems
  .map(
    (p) => `### ${p.metadata?.title || "Similar Problem"}
${p.text.substring(0, 500)}...`
  )
  .join("\n\n")}

## Relevant Hints from Knowledge Base
${hintDocs.map((h) => h.text).join("\n\n---\n\n")}

${userSolutionsContext}
`.trim()

    const userContext = `
Problem: ${options.problemText.substring(0, 200)}...
${options.userCode ? `Current code: ${options.userCode.substring(0, 300)}...` : "No code written yet"}
`.trim()

    return {
      type: "hint-generation",
      systemContext,
      userContext,
      retrievedDocs,
      metadata: {
        patternsIncluded: options.problemPattern ? [options.problemPattern] : [],
        companiesIncluded: [],
        docCount: retrievedDocs.length,
        buildTimeMs: Date.now() - startTime,
      },
    }
  }

  /**
   * Build context for interview preparation
   */
  async buildInterviewPrepContext(options: {
    company: CompanyId
    patterns: DSAPattern[]
    difficulty: "easy" | "medium" | "hard" | "mixed"
    userId?: string
  }): Promise<BuiltContext> {
    const startTime = Date.now()
    const retrievedDocs: EnhancedRetrievalResult[] = []

    // 1. Get company knowledge
    const companyKnowledge = getCompanyInterviewKnowledge(options.company)
    const companyContext = companyKnowledge
      ? companyKnowledgeToDocument(companyKnowledge)
      : `Interview preparation for ${options.company}`

    // 2. Get pattern knowledge for specified patterns
    const patternContexts: string[] = []
    for (const pattern of options.patterns.slice(0, 5)) {
      const knowledge = getPatternKnowledge(pattern)
      if (knowledge) {
        patternContexts.push(patternKnowledgeToDocument(knowledge))
      }
    }

    // 3. Retrieve interview tips
    const { results: tipDocs } = await this.retriever.retrieve({
      query: `${options.company} interview tips ${options.patterns.join(" ")} ${options.difficulty}`,
      limit: 5,
      types: ["knowledge"],
      companies: [options.company],
      patterns: options.patterns,
      enableQueryExpansion: true,
    })
    retrievedDocs.push(...tipDocs)

    // 4. Get user's history if available
    let userHistoryContext = ""
    if (options.userId) {
      const userDocs = await this.retriever.retrieveUserSolutions(
        options.userId,
        `${options.patterns.join(" ")} problems`,
        { limit: 5 }
      )
      if (userDocs.length > 0) {
        const passedCount = userDocs.filter((d) =>
          (d.metadata?.tags as string[])?.includes("passed")
        ).length
        userHistoryContext = `
## Your History
- Attempted ${userDocs.length} similar problems
- Passed ${passedCount} of them
- Focus on patterns you struggled with
`
      }
      retrievedDocs.push(...userDocs)
    }

    const systemContext = `
# Interview Preparation Context: ${options.company.toUpperCase()}

## Company Overview
${companyContext}

## Focus Patterns
${patternContexts.join("\n\n---\n\n")}

## Interview Tips
${tipDocs.map((t) => t.text).join("\n\n")}

${userHistoryContext}

## Difficulty Focus: ${options.difficulty}
${
  options.difficulty === "easy"
    ? "Focus on building confidence with fundamentals."
    : options.difficulty === "hard"
      ? "Push your limits with challenging problems."
      : options.difficulty === "medium"
        ? "Balance difficulty for optimal learning."
        : "Mix difficulties for comprehensive preparation."
}
`.trim()

    return {
      type: "interview-prep",
      systemContext,
      userContext: `Preparing for ${options.company} interview focusing on ${options.patterns.join(", ")}`,
      retrievedDocs,
      metadata: {
        patternsIncluded: options.patterns,
        companiesIncluded: [options.company],
        docCount: retrievedDocs.length,
        buildTimeMs: Date.now() - startTime,
      },
    }
  }

  /**
   * Build context for feedback generation
   */
  async buildFeedbackContext(options: {
    problemText: string
    userCode: string
    testResults: { passed: number; total: number }
    pattern?: DSAPattern
    difficulty?: "easy" | "medium" | "hard"
  }): Promise<BuiltContext> {
    const startTime = Date.now()
    const retrievedDocs: EnhancedRetrievalResult[] = []

    // 1. Get pattern-specific feedback criteria
    let patternContext = ""
    if (options.pattern) {
      const knowledge = getPatternKnowledge(options.pattern)
      if (knowledge) {
        patternContext = `
## Pattern: ${knowledge.displayName}

### Expected Approach
${knowledge.keyInsights.join("\n")}

### Common Mistakes to Look For
${knowledge.commonMistakes.join("\n")}

### Expected Complexity
- Time: ${knowledge.timeComplexity.typical}
- Space: ${knowledge.spaceComplexity.typical}
`
      }
    }

    // 2. Retrieve similar successful solutions for comparison
    const { results: solutionDocs } = await this.retriever.retrieve({
      query: options.problemText,
      limit: 3,
      types: ["solution"],
      enableReranking: true,
    })
    retrievedDocs.push(...solutionDocs)

    // 3. Get feedback guidelines
    const { results: feedbackDocs } = await this.retriever.retrieve({
      query: "interview feedback criteria code quality",
      limit: 2,
      types: ["knowledge"],
    })
    retrievedDocs.push(...feedbackDocs)

    const systemContext = `
# Feedback Generation Context

${patternContext}

## Test Results
- Passed: ${options.testResults.passed}/${options.testResults.total}
- Pass Rate: ${Math.round((options.testResults.passed / options.testResults.total) * 100)}%

## Reference Solutions for Comparison
${solutionDocs
  .map(
    (s, i) => `### Reference ${i + 1}
${s.text.substring(0, 500)}...`
  )
  .join("\n\n")}

## Feedback Guidelines
${feedbackDocs.map((f) => f.text).join("\n\n")}

## Difficulty: ${options.difficulty || "Unknown"}
Adjust expectations based on problem difficulty.
`.trim()

    return {
      type: "feedback-generation",
      systemContext,
      userContext: `Generate feedback for user's ${options.pattern || "coding"} solution`,
      retrievedDocs,
      metadata: {
        patternsIncluded: options.pattern ? [options.pattern] : [],
        companiesIncluded: [],
        docCount: retrievedDocs.length,
        buildTimeMs: Date.now() - startTime,
      },
    }
  }

  /**
   * Build generic context from a query
   */
  async buildQueryContext(
    query: string,
    options: {
      types?: BuiltContext["type"]
      patterns?: DSAPattern[]
      companies?: CompanyId[]
      limit?: number
    } = {}
  ): Promise<BuiltContext> {
    const startTime = Date.now()

    const { results: docs } = await this.retriever.retrieve({
      query,
      limit: options.limit || 10,
      patterns: options.patterns,
      companies: options.companies,
      enableQueryExpansion: true,
      enableReranking: true,
    })

    const systemContext = `
# RAG Context for Query

## Retrieved Documents
${docs
  .map(
    (d, i) => `### Document ${i + 1}: ${d.metadata?.title || "Untitled"}
Type: ${d.type}
Relevance: ${Math.round(d.finalScore * 100)}%

${d.text}
`
  )
  .join("\n\n---\n\n")}
`.trim()

    return {
      type: options.types || "learning-path",
      systemContext,
      userContext: query,
      retrievedDocs: docs,
      metadata: {
        patternsIncluded: options.patterns || [],
        companiesIncluded: options.companies || [],
        docCount: docs.length,
        buildTimeMs: Date.now() - startTime,
      },
    }
  }

  /**
   * Build enhanced context with full user profile insights
   * This is the most comprehensive context for personalized AI interactions
   */
  async buildEnhancedContext(options: {
    userId: string
    problemText?: string
    problemPattern?: DSAPattern
    userCode?: string
    contextType: ContextType
  }): Promise<BuiltContext & { enhancedProfile: EnhancedUserProfile }> {
    const startTime = Date.now()
    const retrievedDocs: EnhancedRetrievalResult[] = []

    // Get enhanced user profile
    const profileService = getEnhancedProfileService()
    const enhancedProfile = await profileService.getEnhancedProfile(options.userId)

    // Get misconceptions if relevant
    const misconceptionTracker = getMisconceptionTracker()
    const activeMisconceptions = options.problemPattern
      ? await misconceptionTracker.getPatternMisconceptionSummary(
          options.userId,
          options.problemPattern
        )
      : null

    // Build cognitive profile context
    const cognitiveContext = this.buildCognitiveContext(enhancedProfile)

    // Build knowledge gap context
    const knowledgeGapContext = this.buildKnowledgeGapContext(enhancedProfile)

    // Build misconception context
    const misconceptionContext =
      activeMisconceptions && activeMisconceptions.count > 0
        ? `
## Known Misconceptions for ${options.problemPattern}
- Common error type: ${activeMisconceptions.mostCommon || "various"}
- Occurrences: ${activeMisconceptions.count}
- Focus: ${activeMisconceptions.suggestedFocus}
`
        : ""

    // Build temporal context (decay, review needs)
    const temporalContext = this.buildTemporalContext(enhancedProfile, options.problemPattern)

    // Get pattern knowledge if applicable
    let patternContext = ""
    if (options.problemPattern) {
      const knowledge = getPatternKnowledge(options.problemPattern)
      if (knowledge) {
        patternContext = patternKnowledgeToDocument(knowledge)
      }
    }

    // Retrieve relevant documents
    if (options.problemText) {
      const { results: docs } = await this.retriever.retrieve({
        query: options.problemText,
        limit: 5,
        patterns: options.problemPattern ? [options.problemPattern] : undefined,
        enableQueryExpansion: true,
      })
      retrievedDocs.push(...docs)
    }

    const systemContext = `
# Enhanced RAG Context with User Profile

## User Profile Summary
- Level: ${enhancedProfile.interviewReadiness.overall >= 70 ? "Advanced" : enhancedProfile.interviewReadiness.overall >= 40 ? "Intermediate" : "Beginner"}
- Interview Readiness: ${enhancedProfile.interviewReadiness.overall}%
- Learning Pace: ${enhancedProfile.cognitive.patternRecognition.speed}
- Problem-Solving Style: ${enhancedProfile.cognitive.problemSolvingApproach.style}

${cognitiveContext}

${knowledgeGapContext}

${misconceptionContext}

${temporalContext}

## Pattern Knowledge
${patternContext || "No specific pattern context"}

## Active Insights
${enhancedProfile.insights
  .slice(0, 3)
  .map((i) => `- ${i.icon} ${i.title}: ${i.description}`)
  .join("\n")}

## Retrieved Context
${retrievedDocs.map((d) => d.text).join("\n\n---\n\n")}
`.trim()

    const userContext = `
User is ${enhancedProfile.interviewReadiness.overall >= 70 ? "well-prepared" : "still learning"}.
${options.problemPattern ? `Working on ${options.problemPattern} problem.` : ""}
${enhancedProfile.insights.length > 0 ? `Key insight: ${enhancedProfile.insights[0].description}` : ""}
`.trim()

    return {
      type: options.contextType,
      systemContext,
      userContext,
      retrievedDocs,
      metadata: {
        patternsIncluded: options.problemPattern ? [options.problemPattern] : [],
        companiesIncluded: [],
        docCount: retrievedDocs.length,
        buildTimeMs: Date.now() - startTime,
      },
      enhancedProfile,
    }
  }

  /**
   * Build complexity context for the AI interviewer
   * Provides knowledge about multiple approaches, trade-offs, and common mistakes
   */
  buildComplexityContext(problemId: string, pattern?: DSAPattern): string {
    const complexity = getComplexityKnowledge(problemId)
    const patternRules = pattern ? getPatternComplexityRules(pattern) : null

    if (!complexity && !patternRules) {
      return ""
    }

    let context = "## Complexity Knowledge for Interviewer\n\n"

    // Problem-specific complexity data
    if (complexity) {
      context += `### Problem: ${complexity.problemTitle} (LeetCode #${complexity.leetcodeNumber})\n\n`

      // Multiple approaches with trade-offs
      context += "**Valid Approaches (know ALL of these):**\n\n"
      for (const approach of complexity.approaches) {
        const optimalMarkers: string[] = []
        if (approach.isOptimalTime) optimalMarkers.push("optimal time")
        if (approach.isOptimalSpace) optimalMarkers.push("optimal space")
        const optimalNote = optimalMarkers.length > 0 ? ` [${optimalMarkers.join(", ")}]` : ""

        context += `**${approach.name}**${optimalNote}\n`
        context += `- Time: ${approach.timeComplexity}, Space: ${approach.spaceComplexity}\n`
        context += `- Trade-off: ${approach.tradeOff}\n`
        context += `- When to use: ${approach.whenToUse}\n\n`
      }

      // Common mistakes to watch for
      if (complexity.commonMistakes.length > 0) {
        context += "**Common Mistakes to Watch For:**\n"
        for (const mistake of complexity.commonMistakes) {
          context += `- ${mistake}\n`
        }
        context += "\n"
      }

      // Key operations
      if (complexity.keyOperations.length > 0) {
        context += "**Key Operations:**\n"
        for (const op of complexity.keyOperations) {
          context += `- ${op.operation}: ${op.complexity}`
          if (op.note) context += ` (${op.note})`
          context += "\n"
        }
        context += "\n"
      }
    }

    // Pattern-level rules (fallback or additional context)
    if (patternRules) {
      context += `### Pattern Rules: ${pattern}\n`
      context += `- Typical Time: ${patternRules.typicalTimeComplexity}\n`
      context += `- Typical Space: ${patternRules.typicalSpaceComplexity}\n`
      context += `- Key Insight: ${patternRules.keyInsight}\n`

      if (patternRules.variations && patternRules.variations.length > 0) {
        context += "\n**Variations:**\n"
        for (const v of patternRules.variations) {
          context += `- ${v.name}: ${v.time} / ${v.space} - ${v.note}\n`
        }
      }
      context += "\n"
    }

    // Interviewer instructions for complexity questioning
    context += `### How to Ask About Complexity

**TIMING IS CRITICAL - Don't ask too early:**
- ❌ DON'T ask about complexity when they're just confirming understanding ("So I can take 1 or 2 steps, right?")
- ❌ DON'T ask about complexity immediately after they mention an approach
- ✅ DO ask about complexity AFTER they've explained their approach in detail
- ✅ DO ask about complexity AFTER they've walked through how their solution works
- ✅ DO ask about complexity AFTER they finish coding (if not already discussed)

**Natural flow:**
1. Let them explore and explain their approach first
2. Ask clarifying questions: "Walk me through how that works", "What happens when..."
3. Once they've explained their approach in detail, THEN ask: "What time and space complexity do you expect?"
4. Listen carefully to their answer

**If they give WRONG complexity:**
- Don't immediately correct them
- Ask "Are you sure? Walk me through how you arrived at that"
- Guide them to identify their error: "What's the cost of [specific operation]?"

**If they give RIGHT complexity but suboptimal approach:**
- Acknowledge: "Good analysis"
- Probe trade-offs: "Is there a way to improve the ${complexity?.approaches.some((a) => a.isOptimalTime && !a.isOptimalSpace) ? "space" : "time"} complexity?"
- Discuss alternatives: "What if you used a different data structure?"

**If they used brute force:**
- Ask: "Can you think of a more efficient approach?"
- Hint at pattern: "What data structure might help with [key operation]?"

**Trade-off Discussion Points:**
${complexity?.approaches.map((a) => `- ${a.name}: ${a.tradeOff}`).join("\n") || "- Discuss time vs space trade-offs"}
`

    return context
  }

  /**
   * Build cognitive profile context for AI
   */
  private buildCognitiveContext(profile: EnhancedUserProfile): string {
    const cog = profile.cognitive
    return `
## Cognitive Profile
- Learning Style: ${cog.learningStyle.primary} (${cog.learningStyle.confidence}% confidence)
- Problem-Solving: ${cog.problemSolvingApproach.style} approach, ${cog.problemSolvingApproach.planningTendency} tendency
- Pattern Recognition: ${cog.patternRecognition.speed} speed, ${cog.patternRecognition.accuracy}% accuracy
- Transfer Ability: ${cog.patternRecognition.transferAbility}% (applying patterns to new contexts)
- Complexity Tolerance: ${cog.workingMemory.complexityTolerance}

### Personalization Notes
${cog.learningStyle.primary === "example-based" ? "- Provide code examples to illustrate concepts" : ""}
${cog.learningStyle.primary === "visual" ? "- Use diagrams and visual explanations when possible" : ""}
${cog.problemSolvingApproach.planningTendency === "improviser" ? "- Encourage pseudocode before implementation" : ""}
${cog.patternRecognition.speed === "slow" ? "- Give more time for pattern recognition, break down steps" : ""}
${cog.workingMemory.complexityTolerance === "low" ? "- Break complex problems into smaller steps" : ""}
`.trim()
  }

  /**
   * Build knowledge gap context for AI
   */
  private buildKnowledgeGapContext(profile: EnhancedUserProfile): string {
    const kg = profile.knowledgeGraph

    if (kg.gaps.length === 0 && kg.misconceptions.length === 0) {
      return "## Knowledge Status\nNo significant gaps or misconceptions detected."
    }

    let context = "## Knowledge Gaps & Misconceptions\n"

    if (kg.gaps.length > 0) {
      context += "\n### Prerequisite Gaps\n"
      for (const gap of kg.gaps.slice(0, 3)) {
        context += `- **${gap.pattern}**: Missing ${gap.missingPrerequisites.map((p) => p.concept).join(", ")} (${gap.impact})\n`
      }
    }

    if (kg.misconceptions.length > 0) {
      context += "\n### Active Misconceptions\n"
      for (const m of kg.misconceptions.filter((m) => m.status === "active").slice(0, 3)) {
        context += `- **${m.pattern}**: ${m.description} (seen ${m.frequency}x)\n`
        context += `  Fix: ${m.suggestedFix}\n`
      }
    }

    return context.trim()
  }

  /**
   * Build temporal context (decay, scheduling) for AI
   */
  private buildTemporalContext(profile: EnhancedUserProfile, pattern?: DSAPattern): string {
    const temporal = profile.temporal

    let context = "## Temporal Insights\n"

    // Growth trajectory
    context += `\n### Growth Trajectory\n`
    context += `- Current velocity: ${temporal.growth.currentVelocity > 0 ? "+" : ""}${temporal.growth.currentVelocity.toFixed(1)} points/week\n`
    context += `- Trend: ${temporal.growth.accelerating ? "Accelerating" : "Steady"}\n`
    context += `- Projected level: ${temporal.growth.projectedLevel}\n`

    // Decay warnings
    const urgentDecay = temporal.skillDecay.filter((sd) => sd.urgency !== "none")
    if (urgentDecay.length > 0) {
      context += `\n### Skills Needing Review\n`
      for (const sd of urgentDecay.slice(0, 3)) {
        const isCurrentPattern = pattern && sd.pattern === pattern
        context += `- ${sd.pattern}: ${sd.daysSincePractice} days, ~${Math.round(sd.estimatedDecay)}% decay${isCurrentPattern ? " (CURRENT)" : ""}\n`
      }
    }

    // Specific pattern context
    if (pattern) {
      const patternDecay = temporal.skillDecay.find((sd) => sd.pattern === pattern)
      const patternReview = temporal.reviewSchedule.find((r) => r.pattern === pattern)

      if (patternDecay || patternReview) {
        context += `\n### Current Pattern (${pattern})\n`
        if (patternDecay) {
          context += `- Days since practice: ${patternDecay.daysSincePractice}\n`
          context += `- Estimated decay: ${Math.round(patternDecay.estimatedDecay)}%\n`
        }
        if (patternReview) {
          context += `- Review priority: ${patternReview.priority}\n`
        }
      }
    }

    return context.trim()
  }
}

/**
 * Singleton instance
 */
let contextBuilderInstance: RAGContextBuilder | null = null

export function getContextBuilder(): RAGContextBuilder {
  if (!contextBuilderInstance) {
    contextBuilderInstance = new RAGContextBuilder()
  }
  return contextBuilderInstance
}

/**
 * Convenience functions
 */
export async function buildRoadmapContext(options: RoadmapContextOptions): Promise<BuiltContext> {
  return getContextBuilder().buildRoadmapContext(options)
}

export async function buildHintContext(options: ProblemContextOptions): Promise<BuiltContext> {
  return getContextBuilder().buildHintContext(options)
}

export async function buildFeedbackContext(options: {
  problemText: string
  userCode: string
  testResults: { passed: number; total: number }
  pattern?: DSAPattern
  difficulty?: "easy" | "medium" | "hard"
}): Promise<BuiltContext> {
  return getContextBuilder().buildFeedbackContext(options)
}

export async function buildEnhancedContext(options: {
  userId: string
  problemText?: string
  problemPattern?: DSAPattern
  userCode?: string
  contextType: ContextType
}): Promise<BuiltContext & { enhancedProfile: EnhancedUserProfile }> {
  return getContextBuilder().buildEnhancedContext(options)
}

/**
 * Build complexity context for interviewer AI
 * Includes multiple approaches, trade-offs, and questioning strategies
 */
export function buildComplexityContext(problemId: string, pattern?: DSAPattern): string {
  return getContextBuilder().buildComplexityContext(problemId, pattern)
}
