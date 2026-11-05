import type { Company } from "./types"

interface CompanyInterviewProfile {
  company: Company
  label: string
  round: string
  match: "format" | "reported-pattern"
  description: string
  source: { title: string; url: `https://${string}` }
}

/** Public format evidence, never a claim that our fixtures are a company's actual test. */
export const BUGFIX_COMPANY_PROFILES = {
  "google-code-comprehension": {
    company: "Google",
    label: "Google-style",
    round: "Code comprehension",
    match: "format",
    description:
      "Read an unfamiliar codebase, reproduce a regression, verify a repair, and explain its performance. An original practice task aligned with the reported format. Our research did not verify an exact Google prompt.",
    source: {
      title: "Reporting on Google's Gemini-assisted interview pilot",
      url: "https://www.businessinsider.com/google-job-interview-software-engineers-ai-assistant-coding-2026-5",
    },
  },
  "meta-maze": {
    company: "Meta",
    label: "Meta task pattern",
    round: "Maze debugging and extension",
    match: "reported-pattern",
    description:
      "Repair maze rendering and traversal, then handle directional cells and keys. Original code and tests based on publicly reported task patterns, with our own explicit contract.",
    source: {
      title: "Public candidate reports of Meta's maze task",
      url: "https://www.hellointerview.com/community/questions/maze-solver-path/cmjlp495e05fs08adwrayjwbr",
    },
  },
  "stripe-library-debugging": {
    company: "Stripe",
    label: "Stripe-style",
    round: "Library debugging",
    match: "format",
    description:
      "Investigate failing tests in an unfamiliar client library and preserve its public contracts. An original exercise matching the reported Bug Squash format, not a reproduction of a Stripe repository or exact patch.",
    source: {
      title: "Candidate account of Stripe's library debugging round",
      url: "https://www.reddit.com/r/leetcode/comments/1mgcc99/stripe_integration_and_bug_bash_rounds_interview/",
    },
  },
  "palantir-codebase-debugging": {
    company: "Palantir",
    label: "Palantir-style",
    round: "Codebase debugging",
    match: "format",
    description:
      "Follow data through an unfamiliar codebase, repair a regression, and discuss an extension. Original domain practice, not a company-provided question; reports vary by role.",
    source: {
      title: "Candidate discussion of codebase debugging and follow-ups",
      url: "https://www.reddit.com/r/InterviewCoderHQ/comments/1peo7ut/my_palantir_swe_intern_interview_experience_need/",
    },
  },
} as const satisfies Record<string, CompanyInterviewProfile>

export type BugfixCompanyAlignment = "generic" | keyof typeof BUGFIX_COMPANY_PROFILES

export function getBugfixCompanyProfile(alignment: BugfixCompanyAlignment) {
  return alignment === "generic" ? null : BUGFIX_COMPANY_PROFILES[alignment]
}

export function getBugfixCompanies(alignment: BugfixCompanyAlignment): Company[] {
  return [getBugfixCompanyProfile(alignment)?.company ?? "Generic"]
}
