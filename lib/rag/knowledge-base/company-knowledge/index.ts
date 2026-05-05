import type { CompanyId } from "@/lib/data/company-questions/types"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { CompanyInterviewKnowledge } from "../types"
import { googleKnowledge } from "./companies/google"
import { metaKnowledge } from "./companies/meta"
import { amazonKnowledge } from "./companies/amazon"
import { microsoftKnowledge } from "./companies/microsoft"
import { appleKnowledge } from "./companies/apple"
import { stripeKnowledge } from "./companies/stripe"
import { netflixKnowledge } from "./companies/netflix"
import { uberKnowledge } from "./companies/uber"
import { airbnbKnowledge } from "./companies/airbnb"
import { linkedinKnowledge } from "./companies/linkedin"
import { lyftKnowledge } from "./companies/lyft"
import { veevaKnowledge } from "./companies/veeva"
import { doordashKnowledge } from "./companies/doordash"
import { robinhoodKnowledge } from "./companies/robinhood"
import { instacartKnowledge } from "./companies/instacart"
import { squareKnowledge } from "./companies/square"
import { figmaKnowledge } from "./companies/figma"
import { robloxKnowledge } from "./companies/roblox"
import { tiktokKnowledge } from "./companies/tiktok"
import { nvidiaKnowledge } from "./companies/nvidia"
import { salesforceKnowledge } from "./companies/salesforce"
import { snapKnowledge } from "./companies/snap"
import { pinterestKnowledge } from "./companies/pinterest"
import { redditKnowledge } from "./companies/reddit"
import { atlassianKnowledge } from "./companies/atlassian"
import { oracleKnowledge } from "./companies/oracle"
import { spotifyKnowledge } from "./companies/spotify"
import { twitchKnowledge } from "./companies/twitch"
import { ziprecruiterKnowledge } from "./companies/ziprecruiter"

export const COMPANY_INTERVIEW_KNOWLEDGE: CompanyInterviewKnowledge[] = [
  googleKnowledge,
  metaKnowledge,
  amazonKnowledge,
  microsoftKnowledge,
  appleKnowledge,
  stripeKnowledge,
  netflixKnowledge,
  uberKnowledge,
  airbnbKnowledge,
  linkedinKnowledge,
  lyftKnowledge,
  veevaKnowledge,
  doordashKnowledge,
  robinhoodKnowledge,
  instacartKnowledge,
  squareKnowledge,
  figmaKnowledge,
  robloxKnowledge,
  tiktokKnowledge,
  nvidiaKnowledge,
  salesforceKnowledge,
  snapKnowledge,
  pinterestKnowledge,
  redditKnowledge,
  atlassianKnowledge,
  oracleKnowledge,
  spotifyKnowledge,
  twitchKnowledge,
  ziprecruiterKnowledge,
]

/**
 * Get interview knowledge for a specific company
 */
export function getCompanyInterviewKnowledge(
  companyId: CompanyId
): CompanyInterviewKnowledge | undefined {
  return COMPANY_INTERVIEW_KNOWLEDGE.find((c) => c.companyId === companyId)
}

/**
 * Get all company interview knowledge
 */
export function getAllCompanyKnowledge(): CompanyInterviewKnowledge[] {
  return COMPANY_INTERVIEW_KNOWLEDGE
}

/**
 * Get top patterns across all companies
 */
export function getMostCommonPatterns(): {
  pattern: DSAPattern
  averageFrequency: number
  companies: CompanyId[]
}[] {
  const patternStats = new Map<DSAPattern, { totalFrequency: number; companies: CompanyId[] }>()

  for (const company of COMPANY_INTERVIEW_KNOWLEDGE) {
    for (const pattern of company.topPatterns) {
      const existing = patternStats.get(pattern.pattern) || { totalFrequency: 0, companies: [] }
      existing.totalFrequency += pattern.frequency
      existing.companies.push(company.companyId)
      patternStats.set(pattern.pattern, existing)
    }
  }

  return Array.from(patternStats.entries())
    .map(([pattern, stats]) => ({
      pattern,
      averageFrequency: stats.totalFrequency / stats.companies.length,
      companies: stats.companies,
    }))
    .sort((a, b) => b.averageFrequency - a.averageFrequency)
}

/**
 * Convert company knowledge to RAG document format
 */
export function companyKnowledgeToDocument(knowledge: CompanyInterviewKnowledge): string {
  return `
# ${knowledge.companyName} Interview Guide

## Interview Style
${knowledge.interviewStyle.description}

**Pace:** ${knowledge.interviewStyle.pace}

**Expectations:**
${knowledge.interviewStyle.expectations.map((e) => `- ${e}`).join("\n")}

## Top Patterns
${knowledge.topPatterns
  .map(
    (p) => `
### ${p.pattern} (${p.frequency}% frequency)
${p.tips.map((t) => `- ${t}`).join("\n")}
`
  )
  .join("\n")}

## Interview Process
${knowledge.interviewProcess.map((step, i) => `${i + 1}. ${step}`).join("\n")}

## Culture Tips
${knowledge.cultureTips.map((t) => `- ${t}`).join("\n")}

## Common Question Types
${knowledge.commonQuestionTypes.map((t) => `- ${t}`).join("\n")}

## Do's
${knowledge.dosDonts.dos.map((d) => `- ${d}`).join("\n")}

## Don'ts
${knowledge.dosDonts.donts.map((d) => `- ${d}`).join("\n")}
`.trim()
}
