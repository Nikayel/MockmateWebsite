/**
 * Company-Specific Interviewer Styles
 *
 * Derives interviewer personality and behavior from the research-based
 * company knowledge in /lib/rag/knowledge-base/company-knowledge.ts
 *
 * This module converts company interview data into actionable interviewer behavior.
 */

import {
  COMPANY_INTERVIEW_KNOWLEDGE,
  getCompanyInterviewKnowledge,
} from "@/lib/rag/knowledge-base/company-knowledge"
import type { CompanyInterviewKnowledge } from "@/lib/rag/knowledge-base/types"
import type { CompanyId } from "@/lib/data/company-questions/types"

// =============================================================================
// INTERVIEWER STYLE TYPES
// =============================================================================

export interface CompanyInterviewerStyle {
  company: string
  companyId: string
  personality: string
  tone: "formal" | "casual" | "balanced"
  patienceLevel: "high" | "medium" | "low"
  hintingStyle: string
  focusAreas: string[]
  typicalPhrases: string[]
  thingsToAvoid: string[]
  complexityExpectation: "always_ask" | "ask_if_time" | "optional"
  optimizationPush: "aggressive" | "moderate" | "gentle"
  dialogExamples: {
    greeting: string
    probing: string
    hinting: string
    praising: string
    wrappingUp: string
  }
}

// =============================================================================
// PACE TO PATIENCE MAPPING
// =============================================================================

function derivePatienceLevel(pace: string): "high" | "medium" | "low" {
  const paceLower = pace.toLowerCase()
  if (paceLower.includes("fast") || paceLower.includes("speed") || paceLower.includes("quick")) {
    return "low"
  }
  if (
    paceLower.includes("moderate") ||
    paceLower.includes("methodical") ||
    paceLower.includes("balanced")
  ) {
    return "medium"
  }
  if (paceLower.includes("relaxed") || paceLower.includes("emphasis on communication")) {
    return "high"
  }
  return "medium"
}

// =============================================================================
// TONE DERIVATION
// =============================================================================

function deriveTone(knowledge: CompanyInterviewKnowledge): "formal" | "casual" | "balanced" {
  const description = knowledge.interviewStyle.description.toLowerCase()
  const tips = knowledge.cultureTips.join(" ").toLowerCase()

  // Formal indicators
  if (
    description.includes("enterprise") ||
    description.includes("compliance") ||
    description.includes("methodical") ||
    tips.includes("professional")
  ) {
    return "formal"
  }

  // Casual indicators
  if (
    description.includes("fast-paced") ||
    description.includes("startup") ||
    tips.includes("move fast") ||
    tips.includes("scrappy") ||
    tips.includes("casual")
  ) {
    return "casual"
  }

  return "balanced"
}

// =============================================================================
// DERIVE INTERVIEWER STYLE FROM COMPANY KNOWLEDGE
// =============================================================================

export function deriveInterviewerStyle(
  knowledge: CompanyInterviewKnowledge
): CompanyInterviewerStyle {
  const { companyId, companyName, interviewStyle, cultureTips, dosDonts } = knowledge

  // Derive core attributes
  const patienceLevel = derivePatienceLevel(interviewStyle.pace)
  const tone = deriveTone(knowledge)

  // Build personality from description and culture
  const personality = `${interviewStyle.description} ${cultureTips.slice(0, 2).join(". ")}.`

  // Build hinting style based on pace and expectations
  let hintingStyle: string
  if (patienceLevel === "low") {
    hintingStyle = "Direct hints to keep things moving. Values speed over discovery."
  } else if (patienceLevel === "high") {
    hintingStyle =
      "Socratic method - asks leading questions. Lets candidates struggle productively."
  } else {
    hintingStyle = "Progressive hints from subtle to direct. Balances guidance with independence."
  }

  // Build focus areas from expectations
  const focusAreas = interviewStyle.expectations.slice(0, 4)

  // Build typical phrases based on culture and style
  const typicalPhrases = buildTypicalPhrases(companyName, tone, patienceLevel, cultureTips)

  // Build things to avoid from donts
  const thingsToAvoid = dosDonts.donts.slice(0, 4).map((d) => `Don't let candidate: ${d}`)

  // Determine complexity and optimization expectations
  const complexityExpectation = interviewStyle.expectations.some(
    (e) => e.toLowerCase().includes("complexity") || e.toLowerCase().includes("optimal")
  )
    ? "always_ask"
    : "ask_if_time"

  const optimizationPush =
    patienceLevel === "low" ? "aggressive" : patienceLevel === "high" ? "gentle" : "moderate"

  // Build dialog examples
  const dialogExamples = buildDialogExamples(companyName, tone, patienceLevel)

  return {
    company: companyName,
    companyId,
    personality,
    tone,
    patienceLevel,
    hintingStyle,
    focusAreas,
    typicalPhrases,
    thingsToAvoid,
    complexityExpectation,
    optimizationPush,
    dialogExamples,
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildTypicalPhrases(
  company: string,
  tone: "formal" | "casual" | "balanced",
  patience: "high" | "medium" | "low",
  cultureTips: string[]
): string[] {
  const phrases: string[] = []

  // Greeting variations by tone
  if (tone === "formal") {
    phrases.push("Welcome. Let's begin with the problem.")
    phrases.push("Walk me through your approach.")
  } else if (tone === "casual") {
    phrases.push("Hey! Let's dive in.")
    phrases.push("What's your gut instinct here?")
  } else {
    phrases.push("Alright, take a look at the problem.")
    phrases.push("What are you thinking?")
  }

  // Probing by patience
  if (patience === "low") {
    phrases.push("What's the complexity? Quick.")
    phrases.push("Good, now optimize.")
  } else if (patience === "high") {
    phrases.push("Interesting. Walk me through your reasoning.")
    phrases.push("What made you choose that approach?")
  } else {
    phrases.push("That works. What's the trade-off?")
    phrases.push("Can you do better?")
  }

  // Culture-specific phrases
  if (cultureTips.some((t) => t.toLowerCase().includes("data-driven"))) {
    phrases.push("What data would help you decide?")
  }
  if (
    cultureTips.some(
      (t) => t.toLowerCase().includes("customer") || t.toLowerCase().includes("user")
    )
  ) {
    phrases.push("How does this impact the user?")
  }
  if (
    cultureTips.some((t) => t.toLowerCase().includes("scale") || t.toLowerCase().includes("impact"))
  ) {
    phrases.push("How would this scale?")
  }

  return phrases.slice(0, 6)
}

function buildDialogExamples(
  company: string,
  tone: "formal" | "casual" | "balanced",
  patience: "high" | "medium" | "low"
): CompanyInterviewerStyle["dialogExamples"] {
  // Greeting
  let greeting: string
  if (tone === "formal") {
    greeting = `Hello, I'll be your interviewer for ${company} today. Please take a moment to read through the problem, then walk me through your approach.`
  } else if (tone === "casual") {
    greeting = `Hey! I'm Sable, interviewing for ${company}. Let's jump into it - read the problem and tell me what you're thinking.`
  } else {
    greeting = `Hi there. I'm Sable, your interviewer for ${company}. Take a minute to understand the problem, then walk me through how you'd tackle it.`
  }

  // Probing
  let probing: string
  if (patience === "low") {
    probing = "That works. What's the time complexity?"
  } else if (patience === "high") {
    probing = "Interesting approach. What made you choose that over alternatives?"
  } else {
    probing = "Makes sense. What are the trade-offs with this approach?"
  }

  // Hinting
  let hinting: string
  if (patience === "low") {
    hinting = "Think about using a hash map here."
  } else if (patience === "high") {
    hinting = "What data structure might help with faster lookups?"
  } else {
    hinting = "Consider what you're optimizing for - time or space?"
  }

  // Praising
  let praising: string
  if (tone === "formal") {
    praising = "Good. That's the right insight."
  } else if (tone === "casual") {
    praising = "Nice! That's exactly it."
  } else {
    praising = "Good instinct there."
  }

  // Wrapping up
  const wrappingUp = `Nice work on this one. Click 'View Detailed Feedback' to see your full ${company} evaluation.`

  return { greeting, probing, hinting, praising, wrappingUp }
}

// =============================================================================
// STYLE RETRIEVAL FUNCTIONS
// =============================================================================

/**
 * Get interviewer style for a company, derived from research-based knowledge
 */
export function getCompanyInterviewerStyle(companyId: string | undefined): CompanyInterviewerStyle {
  if (!companyId) {
    return getGenericStyle()
  }

  // Cast to CompanyId - getCompanyInterviewKnowledge returns undefined for invalid IDs
  const knowledge = getCompanyInterviewKnowledge(companyId as CompanyId)
  if (!knowledge) {
    return getGenericStyle()
  }

  return deriveInterviewerStyle(knowledge)
}

/**
 * Get generic interviewer style for unknown companies
 */
export function getGenericStyle(): CompanyInterviewerStyle {
  return {
    company: "Generic",
    companyId: "generic",
    personality:
      "Balanced and fair technical interviewer. Direct but supportive. Focuses on understanding your problem-solving approach.",
    tone: "balanced",
    patienceLevel: "medium",
    hintingStyle:
      "Progressive hints - starts with leading questions, becomes more direct if needed.",
    focusAreas: [
      "Clear problem-solving approach",
      "Code quality and correctness",
      "Complexity analysis",
      "Communication skills",
    ],
    typicalPhrases: [
      "Walk me through your approach",
      "What's the complexity here?",
      "Can you trace through an example?",
      "What edge cases should we consider?",
      "Good - now can you optimize?",
    ],
    thingsToAvoid: [
      "Don't give away answers directly",
      "Don't let candidate skip complexity analysis",
      "Don't accept solutions without testing",
      "Don't repeat the same question more than twice",
    ],
    complexityExpectation: "always_ask",
    optimizationPush: "moderate",
    dialogExamples: {
      greeting:
        "Hey, I'm Sable, your interviewer today. Take a minute to read the problem, then walk me through your thinking.",
      probing: "Interesting. What made you choose that approach?",
      hinting: "Have you thought about what happens with edge cases?",
      praising: "Good reasoning there.",
      wrappingUp: "Nice work today. Click 'View Detailed Feedback' to see your full evaluation.",
    },
  }
}

/**
 * Build company-specific prompt section
 */
export function buildCompanyInterviewerPrompt(companyId: string | undefined): string {
  const style = getCompanyInterviewerStyle(companyId)

  return `
COMPANY: ${style.company}
INTERVIEWER PERSONALITY: ${style.personality}
TONE: ${style.tone} | PATIENCE: ${style.patienceLevel}
HINTING STYLE: ${style.hintingStyle}

FOCUS AREAS FOR THIS COMPANY:
${style.focusAreas.map((f) => `- ${f}`).join("\n")}

TYPICAL PHRASES TO USE:
${style.typicalPhrases.map((p) => `- "${p}"`).join("\n")}

THINGS TO AVOID:
${style.thingsToAvoid.map((t) => `- ${t}`).join("\n")}

COMPLEXITY DISCUSSION: ${style.complexityExpectation === "always_ask" ? "ALWAYS ask about complexity" : "Ask if time permits"}
OPTIMIZATION: ${style.optimizationPush === "aggressive" ? "Push hard for optimization" : style.optimizationPush === "gentle" ? "Gently encourage optimization" : "Encourage but don't force optimization"}

DIALOG STYLE EXAMPLES:
- Greeting: "${style.dialogExamples.greeting}"
- Probing: "${style.dialogExamples.probing}"
- Hinting: "${style.dialogExamples.hinting}"
- Praising: "${style.dialogExamples.praising}"
`
}

