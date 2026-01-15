/**
 * RAG-Enhanced Roadmap Generation Service
 *
 * Combines the existing roadmap prioritization algorithm with RAG capabilities
 * for more personalized and context-aware roadmap generation.
 *
 * Features:
 * - Pattern recommendations based on company knowledge
 * - Personalized study tips from knowledge base
 * - Adaptive difficulty based on user history
 * - AI-generated study milestones
 * - Contextual daily themes
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type {
  CompanyId,
  UserRoadmapAssessment,
  PersonalizedRoadmap,
  DailyPlan,
  Milestone,
  PrioritizedQuestion,
} from "@/lib/data/company-questions/types"
import { getCompanyById } from "@/lib/data/company-questions"
import {
  generatePersonalizedRoadmap,
  prioritizeQuestions,
  buildDailySchedule,
  createMilestones,
} from "@/lib/roadmap/prioritization-algorithm"
import { generateEnhancedRoadmap } from "@/lib/roadmap/enhanced-roadmap-generator"
import { buildRoadmapContext, type RoadmapContextOptions } from "./context-builder"
import { getAdvancedRetriever } from "./retrieval/advanced-retrieval"
import { getPatternKnowledge } from "./knowledge-base/dsa-knowledge"
import { getCompanyInterviewKnowledge } from "./knowledge-base/company-knowledge"
import type { DSAScenario } from "@/lib/scenarios"
import { adminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import {
  getCompanyFrequentQuestions,
  getPrioritizedQuestionsForCompany,
  type FrequentQuestion,
  type CompanyQuestionProfile,
} from "./question-frequency-rag"

/**
 * RAG-enhanced roadmap options
 */
export interface RAGRoadmapOptions {
  userId: string
  assessment: UserRoadmapAssessment
  scenarios: DSAScenario[]
  enableRAG?: boolean
  enableAIInsights?: boolean
}

/**
 * RAG-enhanced roadmap result
 */
export interface RAGEnhancedRoadmap extends PersonalizedRoadmap {
  ragEnhancements: {
    enabled: boolean
    patternInsights: PatternInsight[]
    companyTips: string[]
    personalizedAdvice: string[]
    adaptiveAdjustments: AdaptiveAdjustment[]
    studyStrategies: StudyStrategy[]
    // NEW: Company-specific question frequency data
    mustKnowQuestions: FrequentQuestion[]
    companyQuestionProfile?: CompanyQuestionProfile
  }
}

/**
 * Pattern insight from RAG
 */
export interface PatternInsight {
  pattern: DSAPattern
  importance: number // 1-10
  companyFrequency: number // 0-100
  suggestedApproach: string
  tips: string[]
  estimatedPracticeTime: number // hours
  prerequisitesMet: boolean
}

/**
 * Adaptive adjustment based on user history
 */
export interface AdaptiveAdjustment {
  type: "difficulty" | "pattern-focus" | "time-allocation" | "review-schedule"
  description: string
  reason: string
  impact: "high" | "medium" | "low"
}

/**
 * Study strategy recommendation
 */
export interface StudyStrategy {
  name: string
  description: string
  applicablePatterns: DSAPattern[]
  estimatedBenefit: string
  priority: number
}

/**
 * RAG-Enhanced Roadmap Generator
 */
export class RAGRoadmapGenerator {
  private retriever = getAdvancedRetriever()

  /**
   * Generate RAG-enhanced personalized roadmap
   */
  async generateEnhancedRoadmap(options: RAGRoadmapOptions): Promise<RAGEnhancedRoadmap | null> {
    const { userId, assessment, scenarios, enableRAG = true, enableAIInsights = true } = options

    // Step 1: Generate base roadmap using existing algorithm
    const baseRoadmap = generatePersonalizedRoadmap(scenarios, assessment, userId)
    if (!baseRoadmap) {
      return null
    }

    // If RAG is disabled, return base roadmap with empty enhancements
    if (!enableRAG) {
      return {
        ...baseRoadmap,
        ragEnhancements: {
          enabled: false,
          patternInsights: [],
          companyTips: [],
          personalizedAdvice: [],
          adaptiveAdjustments: [],
          studyStrategies: [],
          mustKnowQuestions: [],
          companyQuestionProfile: undefined,
        },
      }
    }

    // Step 2: Build RAG context for personalization
    const ragContext = await buildRoadmapContext({
      targetCompany: assessment.targetCompany,
      experienceLevel: assessment.experienceLevel,
      daysRemaining: assessment.daysRemaining,
      patternFamiliarity: assessment.patternFamiliarity,
      hoursPerDay: assessment.hoursPerDay,
      userId,
    })

    // Step 3: Generate pattern insights
    const patternInsights = await this.generatePatternInsights(assessment)

    // Step 4: Get company-specific tips
    const companyTips = await this.getCompanyTips(
      assessment.targetCompany,
      assessment.experienceLevel
    )

    // Step 5: Generate personalized advice based on user history
    const personalizedAdvice = await this.generatePersonalizedAdvice(userId, assessment)

    // Step 6: Calculate adaptive adjustments
    const adaptiveAdjustments = await this.calculateAdaptiveAdjustments(
      userId,
      assessment,
      baseRoadmap
    )

    // Step 7: Generate study strategies
    const studyStrategies = this.generateStudyStrategies(assessment, patternInsights)

    // Step 8: NEW - Get company-specific question frequency data
    const companyQuestionProfile = await getCompanyFrequentQuestions({
      companyId: assessment.targetCompany,
      experienceLevel: assessment.experienceLevel,
      limit: 15,
    })

    // Extract must-know questions
    const mustKnowQuestions = companyQuestionProfile.topQuestions.filter((q) => q.isMustkKnow)

    // Step 9: Enhance daily plans with RAG insights AND question frequency
    const enhancedDailyPlans = this.enhanceDailyPlans(
      baseRoadmap.dailyPlans,
      patternInsights,
      assessment,
      mustKnowQuestions // NEW: Pass must-know questions for prioritization
    )

    // Step 10: Enhance milestones
    const enhancedMilestones = this.enhanceMilestones(
      baseRoadmap.milestones,
      patternInsights,
      assessment
    )

    // Combine into enhanced roadmap
    const enhancedRoadmap: RAGEnhancedRoadmap = {
      ...baseRoadmap,
      dailyPlans: enhancedDailyPlans,
      milestones: enhancedMilestones,
      ragEnhancements: {
        enabled: true,
        patternInsights,
        companyTips,
        personalizedAdvice,
        adaptiveAdjustments,
        studyStrategies,
        mustKnowQuestions, // NEW
        companyQuestionProfile, // NEW
      },
    }

    return enhancedRoadmap
  }

  /**
   * Generate pattern insights using RAG
   */
  private async generatePatternInsights(
    assessment: UserRoadmapAssessment
  ): Promise<PatternInsight[]> {
    const insights: PatternInsight[] = []
    const companyData = getCompanyById(assessment.targetCompany)

    if (!companyData) return insights

    // Get company interview knowledge
    const companyKnowledge = getCompanyInterviewKnowledge(assessment.targetCompany)

    for (const patternFreq of companyData.topPatterns) {
      const patternKnowledge = getPatternKnowledge(patternFreq.pattern)
      const familiarity = assessment.patternFamiliarity.find(
        (p) => p.pattern === patternFreq.pattern
      )

      // Check prerequisites
      const prerequisitesMet =
        patternKnowledge?.prerequisites.every((prereq) => {
          const prereqFam = assessment.patternFamiliarity.find((p) => p.pattern === prereq)
          return prereqFam && (prereqFam.level === "practiced" || prereqFam.level === "confident")
        }) ?? true

      // Calculate importance based on frequency and familiarity gap
      const familiarityScore = {
        unknown: 0,
        seen: 0.3,
        practiced: 0.6,
        confident: 0.9,
      }[familiarity?.level || "unknown"]

      const gap = 1 - familiarityScore
      const importance = Math.round((patternFreq.frequency / 10) * gap)

      // Get company-specific tips for this pattern
      const companyPatternTips =
        companyKnowledge?.topPatterns.find((p) => p.pattern === patternFreq.pattern)?.tips || []

      // Estimate practice time based on difficulty and familiarity
      const baseTime = {
        unknown: 10,
        seen: 6,
        practiced: 3,
        confident: 1,
      }[familiarity?.level || "unknown"]

      const difficultyMultiplier = {
        easy: 0.8,
        medium: 1,
        hard: 1.5,
      }[patternFreq.typicalDifficulty]

      const estimatedPracticeTime = Math.round(baseTime * difficultyMultiplier)

      insights.push({
        pattern: patternFreq.pattern,
        importance,
        companyFrequency: patternFreq.frequency,
        suggestedApproach: patternKnowledge
          ? `Focus on ${patternKnowledge.keyInsights[0]}`
          : `Practice ${patternFreq.pattern} problems regularly`,
        tips: [...companyPatternTips, ...(patternKnowledge?.interviewTips || []).slice(0, 2)],
        estimatedPracticeTime,
        prerequisitesMet,
      })
    }

    // Sort by importance
    return insights.sort((a, b) => b.importance - a.importance)
  }

  /**
   * Get company-specific tips from knowledge base
   */
  private async getCompanyTips(companyId: CompanyId, experienceLevel: string): Promise<string[]> {
    const companyKnowledge = getCompanyInterviewKnowledge(companyId)
    if (!companyKnowledge) return []

    const tips: string[] = []

    // Add culture tips
    tips.push(...companyKnowledge.cultureTips.slice(0, 2))

    // Add do's relevant to experience level
    if (experienceLevel === "intern" || experienceLevel === "beginner") {
      tips.push(
        ...companyKnowledge.dosDonts.dos
          .filter(
            (d) =>
              d.toLowerCase().includes("ask") ||
              d.toLowerCase().includes("explain") ||
              d.toLowerCase().includes("communicate")
          )
          .slice(0, 2)
      )
    } else {
      tips.push(...companyKnowledge.dosDonts.dos.slice(0, 2))
    }

    // Add style-specific tips
    tips.push(`Interview pace: ${companyKnowledge.interviewStyle.pace}`)

    // Retrieve additional tips from RAG
    const { results } = await this.retriever.retrieve({
      query: `${companyId} interview tips ${experienceLevel}`,
      limit: 3,
      types: ["knowledge"],
      companies: [companyId],
    })

    for (const doc of results) {
      const text = doc.text.substring(0, 200)
      if (text && !tips.includes(text)) {
        tips.push(text)
      }
    }

    return tips.slice(0, 8)
  }

  /**
   * Generate personalized advice based on user history
   */
  private async generatePersonalizedAdvice(
    userId: string,
    assessment: UserRoadmapAssessment
  ): Promise<string[]> {
    const advice: string[] = []

    try {
      // Get user's past sessions from session_summaries subcollection
      const sessionsSnapshot = await adminDb
        .collection("users")
        .doc(userId)
        .collection("session_summaries")
        .orderBy("completedAt", "desc")
        .limit(20)
        .get()

      if (sessionsSnapshot.empty) {
        // New user advice
        advice.push("Welcome! Start with easier problems to build confidence.")
        advice.push("Focus on understanding patterns rather than memorizing solutions.")
        advice.push("Practice explaining your thought process out loud.")
        return advice
      }

      // Analyze past performance (session_summaries are all completed)
      const sessions = sessionsSnapshot.docs.map((doc) => doc.data())
      const avgScore =
        sessions.length > 0
          ? sessions.reduce((sum, s) => sum + (s.performanceScore || 0), 0) / sessions.length
          : 0

      // Score-based advice
      if (avgScore < 50) {
        advice.push("Focus on fundamentals. Review the pattern before attempting problems.")
        advice.push("Take time to understand the problem fully before coding.")
      } else if (avgScore < 70) {
        advice.push("Good progress! Work on optimizing your solutions.")
        advice.push("Practice time management - aim to solve faster.")
      } else {
        advice.push("Excellent performance! Challenge yourself with harder problems.")
        advice.push("Focus on edge cases and optimization.")
      }

      // Pattern-specific advice
      const weakPatterns = assessment.patternFamiliarity
        .filter((p) => p.level === "unknown" || p.level === "seen")
        .map((p) => p.pattern)

      if (weakPatterns.length > 3) {
        advice.push(
          `Focus on ${weakPatterns.slice(0, 2).join(" and ")} first - these are foundational.`
        )
      }

      // Time-based advice
      if (assessment.daysRemaining < 7) {
        advice.push("With limited time, focus on must-know problems for your target company.")
        advice.push("Prioritize patterns with highest frequency at your target company.")
      } else if (assessment.daysRemaining > 30) {
        advice.push("You have good time - build strong foundations before moving to harder topics.")
      }
    } catch (error) {
      console.error("[RAGRoadmap] Error generating personalized advice:", error)
      advice.push("Practice consistently and track your progress.")
    }

    return advice.slice(0, 5)
  }

  /**
   * Calculate adaptive adjustments based on user history
   */
  private async calculateAdaptiveAdjustments(
    userId: string,
    assessment: UserRoadmapAssessment,
    baseRoadmap: PersonalizedRoadmap
  ): Promise<AdaptiveAdjustment[]> {
    const adjustments: AdaptiveAdjustment[] = []

    try {
      // Check user's past performance from session_summaries subcollection
      const sessionsSnapshot = await adminDb
        .collection("users")
        .doc(userId)
        .collection("session_summaries")
        .orderBy("completedAt", "desc")
        .limit(10)
        .get()

      if (!sessionsSnapshot.empty) {
        const sessions = sessionsSnapshot.docs.map((doc) => doc.data())
        const recentScores = sessions
          .filter((s) => s.performanceScore !== undefined)
          .map((s) => s.performanceScore as number)

        // Difficulty adjustment
        const avgRecentScore =
          recentScores.length > 0
            ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
            : 50

        if (avgRecentScore < 40 && assessment.experienceLevel !== "intern") {
          adjustments.push({
            type: "difficulty",
            description: "Reduce initial difficulty",
            reason: "Recent scores suggest starting with easier problems will build confidence",
            impact: "high",
          })
        } else if (avgRecentScore > 80) {
          adjustments.push({
            type: "difficulty",
            description: "Increase difficulty earlier",
            reason: "Strong recent performance indicates readiness for harder challenges",
            impact: "medium",
          })
        }

        // Time allocation adjustment
        const avgDuration =
          sessions.filter((s) => s.duration).reduce((sum, s) => sum + s.duration, 0) /
          sessions.length

        if (avgDuration > 60 * 60) {
          // More than 1 hour average
          adjustments.push({
            type: "time-allocation",
            description: "Allocate more time per problem",
            reason: "You tend to spend more time on problems - plan accordingly",
            impact: "medium",
          })
        }
      }

      // Review schedule adjustment
      if (assessment.daysRemaining > 14) {
        adjustments.push({
          type: "review-schedule",
          description: "Include spaced repetition",
          reason: "With enough time, reviewing past patterns improves retention",
          impact: "medium",
        })
      }

      // Pattern focus adjustment
      const companyData = getCompanyById(assessment.targetCompany)
      if (companyData) {
        const topPatterns = companyData.topPatterns.slice(0, 3).map((p) => p.pattern)
        const weakTopPatterns = topPatterns.filter((pattern) => {
          const fam = assessment.patternFamiliarity.find((p) => p.pattern === pattern)
          return !fam || fam.level === "unknown" || fam.level === "seen"
        })

        if (weakTopPatterns.length > 0) {
          adjustments.push({
            type: "pattern-focus",
            description: `Prioritize ${weakTopPatterns.join(", ")}`,
            reason: `These are top patterns at ${companyData.name} but you need more practice`,
            impact: "high",
          })
        }
      }
    } catch (error) {
      console.error("[RAGRoadmap] Error calculating adjustments:", error)
    }

    return adjustments
  }

  /**
   * Generate study strategies
   */
  private generateStudyStrategies(
    assessment: UserRoadmapAssessment,
    patternInsights: PatternInsight[]
  ): StudyStrategy[] {
    const strategies: StudyStrategy[] = []

    // Pattern grouping strategy
    const relatedPatterns = patternInsights.filter((p) => !p.prerequisitesMet)
    if (relatedPatterns.length > 0) {
      strategies.push({
        name: "Prerequisites First",
        description: "Learn prerequisite patterns before advancing to complex ones",
        applicablePatterns: relatedPatterns.map((p) => p.pattern),
        estimatedBenefit: "Builds strong foundation, prevents confusion",
        priority: 1,
      })
    }

    // Spaced repetition strategy
    if (assessment.daysRemaining > 7) {
      strategies.push({
        name: "Spaced Repetition",
        description: "Review solved problems at increasing intervals",
        applicablePatterns: patternInsights.slice(0, 5).map((p) => p.pattern),
        estimatedBenefit: "Improves long-term retention",
        priority: 2,
      })
    }

    // Interleaving strategy
    strategies.push({
      name: "Interleaved Practice",
      description: "Mix different pattern types in each session",
      applicablePatterns: patternInsights.slice(0, 6).map((p) => p.pattern),
      estimatedBenefit: "Improves pattern recognition and problem-solving flexibility",
      priority: 3,
    })

    // Time-boxed practice
    strategies.push({
      name: "Time-Boxed Practice",
      description: "Set strict time limits matching interview conditions",
      applicablePatterns: patternInsights.map((p) => p.pattern),
      estimatedBenefit: "Builds speed and time management skills",
      priority: 4,
    })

    // Active recall
    strategies.push({
      name: "Active Recall",
      description: "Try to recall pattern approaches before looking at hints",
      applicablePatterns: patternInsights.filter((p) => p.importance > 5).map((p) => p.pattern),
      estimatedBenefit: "Strengthens pattern memory and recognition",
      priority: 5,
    })

    return strategies
  }

  /**
   * Enhance daily plans with RAG insights and question frequency data
   */
  private enhanceDailyPlans(
    dailyPlans: DailyPlan[],
    patternInsights: PatternInsight[],
    assessment: UserRoadmapAssessment,
    mustKnowQuestions: FrequentQuestion[] = []
  ): DailyPlan[] {
    return dailyPlans.map((plan, index) => {
      const enhancedPlan = { ...plan }

      // Add pattern-specific tips to notes
      if (plan.focusPatterns.length > 0) {
        const patternTips = plan.focusPatterns
          .map((pattern) => patternInsights.find((p) => p.pattern === pattern))
          .filter((p): p is PatternInsight => p !== undefined)
          .flatMap((p) => p.tips.slice(0, 1))

        if (patternTips.length > 0) {
          enhancedPlan.notes = enhancedPlan.notes
            ? `${enhancedPlan.notes}\n\nTips: ${patternTips.join(". ")}`
            : `Tips: ${patternTips.join(". ")}`
        }
      }

      // NEW: Highlight must-know questions in this day's plan
      if (mustKnowQuestions.length > 0 && plan.questions) {
        const mustKnowTitles = new Set(mustKnowQuestions.map((q) => q.title.toLowerCase()))
        const mustKnowInPlan = plan.questions.filter(
          (q) =>
            mustKnowTitles.has(q.title?.toLowerCase() || "") ||
            mustKnowQuestions.some((mkq) => q.scenarioId?.includes(mkq.scenarioId))
        )

        if (mustKnowInPlan.length > 0) {
          const highlight = `⭐ Must-Know: ${mustKnowInPlan
            .map((q) => q.title || q.scenarioId)
            .slice(0, 2)
            .join(", ")}`
          enhancedPlan.notes = enhancedPlan.notes
            ? `${highlight}\n\n${enhancedPlan.notes}`
            : highlight

          // Add company-specific tips for must-know questions
          for (const q of mustKnowInPlan.slice(0, 1)) {
            const mkq = mustKnowQuestions.find(
              (mkq) =>
                q.title?.toLowerCase() === mkq.title.toLowerCase() ||
                q.scenarioId?.includes(mkq.scenarioId)
            )
            if (mkq?.companySpecificTips.length) {
              enhancedPlan.notes += `\n💡 Tip for ${mkq.title}: ${mkq.companySpecificTips[0]}`
            }
          }
        }
      }

      // Add warm-up suggestion for first few days
      if (index < 3 && assessment.experienceLevel === "intern") {
        enhancedPlan.notes = enhancedPlan.notes
          ? `${enhancedPlan.notes}\n\nStart with the easier problems to warm up.`
          : "Start with the easier problems to warm up."
      }

      return enhancedPlan
    })
  }

  /**
   * Enhance milestones with context
   */
  private enhanceMilestones(
    milestones: Milestone[],
    patternInsights: PatternInsight[],
    assessment: UserRoadmapAssessment
  ): Milestone[] {
    return milestones.map((milestone) => {
      const enhanced = { ...milestone }

      // Add context to milestone descriptions
      if (milestone.id.startsWith("pattern-")) {
        const pattern = milestone.id.replace("pattern-", "") as DSAPattern
        const insight = patternInsights.find((p) => p.pattern === pattern)

        if (insight) {
          enhanced.description = `${milestone.description} (${insight.companyFrequency}% frequency at ${assessment.targetCompany})`
        }
      }

      return enhanced
    })
  }
}

/**
 * Singleton instance
 */
let generatorInstance: RAGRoadmapGenerator | null = null

export function getRAGRoadmapGenerator(): RAGRoadmapGenerator {
  if (!generatorInstance) {
    generatorInstance = new RAGRoadmapGenerator()
  }
  return generatorInstance
}

/**
 * Generate RAG-enhanced roadmap (convenience function)
 */
export async function generateRAGEnhancedRoadmap(
  options: RAGRoadmapOptions
): Promise<RAGEnhancedRoadmap | null> {
  return getRAGRoadmapGenerator().generateEnhancedRoadmap(options)
}

/**
 * Quick check if RAG is available
 */
export function isRAGAvailable(): boolean {
  // RAG is always available (TF-IDF fallback)
  return true
}
