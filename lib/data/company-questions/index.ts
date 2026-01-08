/**
 * Company Questions Database - Main Index
 * Aggregates all company interview data and provides helper functions
 */

export * from "./types"

import { CompanyQuestionData, CompanyId, PatternFrequency } from "./types"
import { faangCompanies } from "./faang"
import { topTechCompanies } from "./top-tech"
import { growthFinanceCompanies } from "./growth-finance"
import { emergingTechCompanies } from "./emerging-tech"
import { DSAPattern } from "@/lib/types/dsa-patterns"

// Re-export individual company data for direct access
export * from "./faang"
export * from "./top-tech"
export * from "./growth-finance"
export * from "./emerging-tech"

/**
 * All companies combined
 */
export const ALL_COMPANIES: CompanyQuestionData[] = [
  ...faangCompanies,
  ...topTechCompanies,
  ...growthFinanceCompanies,
  ...emergingTechCompanies,
]

/**
 * Company lookup map for O(1) access
 */
export const COMPANY_MAP: Record<CompanyId, CompanyQuestionData> = ALL_COMPANIES.reduce(
  (acc, company) => {
    acc[company.id] = company
    return acc
  },
  {} as Record<CompanyId, CompanyQuestionData>
)

/**
 * Company tiers for UI grouping
 */
export const COMPANY_TIERS = {
  faang: {
    name: "FAANG+",
    description: "Top tech giants with rigorous interview processes",
    companies: faangCompanies.map((c) => c.id),
  },
  topTech: {
    name: "Top Tech",
    description: "Leading technology companies",
    companies: topTechCompanies.map((c) => c.id),
  },
  growthFinance: {
    name: "Growth & Finance",
    description: "High-growth startups and finance firms",
    companies: growthFinanceCompanies.map((c) => c.id),
  },
  emergingTech: {
    name: "Emerging Tech & Delivery",
    description: "Fast-growing tech, fintech, and delivery companies",
    companies: emergingTechCompanies.map((c) => c.id),
  },
} as const

/**
 * Get company data by ID
 */
export function getCompanyById(id: CompanyId): CompanyQuestionData | undefined {
  return COMPANY_MAP[id]
}

/**
 * Get companies by difficulty level (based on interview difficulty)
 */
export function getCompaniesByDifficulty(
  level: "easier" | "moderate" | "harder"
): CompanyQuestionData[] {
  const harderCompanies: CompanyId[] = [
    "google",
    "netflix",
    "palantir",
    "jane-street",
    "databricks",
    "snowflake",
  ]
  const easierCompanies: CompanyId[] = ["microsoft", "linkedin", "bloomberg", "shopify", "lyft"]

  switch (level) {
    case "harder":
      return ALL_COMPANIES.filter((c) => harderCompanies.includes(c.id))
    case "easier":
      return ALL_COMPANIES.filter((c) => easierCompanies.includes(c.id))
    case "moderate":
      return ALL_COMPANIES.filter(
        (c) => !harderCompanies.includes(c.id) && !easierCompanies.includes(c.id)
      )
  }
}

/**
 * Get top patterns across multiple companies (for generic prep)
 */
export function getTopPatternsAcrossCompanies(
  companyIds: CompanyId[],
  limit: number = 10
): { pattern: DSAPattern; avgFrequency: number; companies: string[] }[] {
  const patternStats: Record<string, { totalFreq: number; count: number; companies: string[] }> = {}

  for (const id of companyIds) {
    const company = COMPANY_MAP[id]
    if (!company) continue

    for (const p of company.topPatterns) {
      if (!patternStats[p.pattern]) {
        patternStats[p.pattern] = { totalFreq: 0, count: 0, companies: [] }
      }
      patternStats[p.pattern].totalFreq += p.frequency
      patternStats[p.pattern].count += 1
      patternStats[p.pattern].companies.push(company.name)
    }
  }

  return Object.entries(patternStats)
    .map(([pattern, stats]) => ({
      pattern: pattern as DSAPattern,
      avgFrequency: Math.round(stats.totalFreq / stats.count),
      companies: stats.companies,
    }))
    .sort((a, b) => b.avgFrequency - a.avgFrequency)
    .slice(0, limit)
}

/**
 * Get estimated preparation time based on company difficulty
 */
export function getEstimatedPrepTime(
  companyId: CompanyId,
  experienceLevel: "beginner" | "intermediate" | "advanced"
): { minWeeks: number; maxWeeks: number; recommendedHoursPerWeek: number } {
  const company = COMPANY_MAP[companyId]
  if (!company) {
    return { minWeeks: 8, maxWeeks: 12, recommendedHoursPerWeek: 15 }
  }

  const hardMultiplier = company.difficultyDistribution.hard / 100
  const basePrepWeeks = {
    beginner: { min: 12, max: 20 },
    intermediate: { min: 6, max: 12 },
    advanced: { min: 3, max: 6 },
  }

  const base = basePrepWeeks[experienceLevel]
  const adjustedMin = Math.ceil(base.min * (1 + hardMultiplier * 0.5))
  const adjustedMax = Math.ceil(base.max * (1 + hardMultiplier * 0.5))

  return {
    minWeeks: adjustedMin,
    maxWeeks: adjustedMax,
    recommendedHoursPerWeek:
      experienceLevel === "beginner" ? 20 : experienceLevel === "intermediate" ? 15 : 10,
  }
}

/**
 * Get company comparison data for UI
 */
export function compareCompanies(ids: CompanyId[]): {
  companies: { id: CompanyId; name: string }[]
  patterns: { pattern: DSAPattern; frequencies: Record<CompanyId, number> }[]
  difficulty: { company: CompanyId; distribution: { easy: number; medium: number; hard: number } }[]
  processLength: { company: CompanyId; rounds: number; timeline: string }[]
} {
  const companies = ids.map((id) => ({ id, name: COMPANY_MAP[id]?.name || id }))

  // Collect all patterns mentioned by any company
  const allPatterns = new Set<DSAPattern>()
  for (const id of ids) {
    const company = COMPANY_MAP[id]
    if (company) {
      company.topPatterns.forEach((p) => allPatterns.add(p.pattern))
    }
  }

  const patterns = Array.from(allPatterns)
    .map((pattern) => {
      const frequencies: Record<CompanyId, number> = {} as Record<CompanyId, number>
      for (const id of ids) {
        const company = COMPANY_MAP[id]
        const patternData = company?.topPatterns.find((p) => p.pattern === pattern)
        frequencies[id] = patternData?.frequency || 0
      }
      return { pattern, frequencies }
    })
    .sort((a, b) => {
      const avgA = Object.values(a.frequencies).reduce((s, v) => s + v, 0) / ids.length
      const avgB = Object.values(b.frequencies).reduce((s, v) => s + v, 0) / ids.length
      return avgB - avgA
    })

  const difficulty = ids.map((id) => ({
    company: id,
    distribution: COMPANY_MAP[id]?.difficultyDistribution || { easy: 33, medium: 34, hard: 33 },
  }))

  const processLength = ids.map((id) => ({
    company: id,
    rounds: COMPANY_MAP[id]?.interviewProcess.totalRounds || 4,
    timeline: COMPANY_MAP[id]?.interviewProcess.timeline || "2-4 weeks",
  }))

  return { companies, patterns, difficulty, processLength }
}

/**
 * Search companies by name
 */
export function searchCompanies(query: string): CompanyQuestionData[] {
  const lowerQuery = query.toLowerCase()
  return ALL_COMPANIES.filter(
    (c) => c.name.toLowerCase().includes(lowerQuery) || c.id.includes(lowerQuery)
  )
}

/**
 * Get companies sorted by a specific pattern's importance
 */
export function getCompaniesByPatternImportance(pattern: DSAPattern): CompanyQuestionData[] {
  return ALL_COMPANIES.map((company) => {
    const patternData = company.topPatterns.find((p) => p.pattern === pattern)
    return {
      company,
      score: patternData ? patternData.frequency * patternData.priority : 0,
    }
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.company)
}
