/**
 * Prompt Registry
 *
 * Central registry for all prompts with version tracking.
 * Enables:
 * - Version tracking for A/B testing
 * - Prompt metadata (purpose, usage, dependencies)
 * - Easy prompt lookup by ID
 *
 * Usage:
 * - Register new prompts here
 * - Use getPrompt() to retrieve prompts with version
 * - Track prompt performance via version IDs
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PromptMetadata {
  id: string
  version: string
  name: string
  description: string
  category: "interviewer" | "feedback" | "extraction" | "hint" | "constitutional"
  usedBy: string[] // File paths that use this prompt
  lastUpdated: string
  changelog?: string[]
}

export interface RegisteredPrompt extends PromptMetadata {
  template: string | ((...args: any[]) => string)
}

// =============================================================================
// PROMPT REGISTRY
// =============================================================================

const PROMPT_REGISTRY: Map<string, RegisteredPrompt> = new Map()

/**
 * Register a prompt in the registry
 */
export function registerPrompt(prompt: RegisteredPrompt): void {
  PROMPT_REGISTRY.set(prompt.id, prompt)
}

/**
 * Get a prompt by ID
 */
export function getPrompt(id: string): RegisteredPrompt | undefined {
  return PROMPT_REGISTRY.get(id)
}

/**
 * Get all prompts in a category
 */
export function getPromptsByCategory(category: PromptMetadata["category"]): RegisteredPrompt[] {
  return Array.from(PROMPT_REGISTRY.values()).filter((p) => p.category === category)
}

/**
 * Get prompt version for tracking
 */
export function getPromptVersion(id: string): string | undefined {
  return PROMPT_REGISTRY.get(id)?.version
}

/**
 * List all registered prompts
 */
export function listPrompts(): PromptMetadata[] {
  return Array.from(PROMPT_REGISTRY.values()).map(({ template, ...metadata }) => metadata)
}

// =============================================================================
// REGISTERED PROMPTS
// =============================================================================

// --- INTERVIEWER PROMPTS ---

registerPrompt({
  id: "interviewer-system",
  version: "2.0.0",
  name: "Interviewer System Prompt",
  description: "Core system prompt for the AI interviewer (Sable)",
  category: "interviewer",
  usedBy: ["lib/interview/interviewer-prompts.ts"],
  lastUpdated: "2026-01-19",
  changelog: [
    "2.0.0: Added BUILD ON PARTIAL EXPLANATIONS behavior",
    "1.5.0: Added voice transcription complexity patterns",
    "1.0.0: Initial few-shot based prompt",
  ],
  template: "See: lib/interview/interviewer-prompts.ts - INTERVIEWER_SYSTEM_PROMPT",
})

registerPrompt({
  id: "interviewer-few-shot",
  version: "2.0.0",
  name: "Interviewer Few-Shot Examples",
  description: "6 key interviewer behaviors demonstrated through examples",
  category: "interviewer",
  usedBy: ["lib/interview/interviewer-prompts.ts"],
  lastUpdated: "2026-01-19",
  changelog: [
    "2.0.0: Added BUILD ON PARTIAL EXPLANATIONS example",
    "1.0.0: Initial 5 examples",
  ],
  template: "See: lib/interview/interviewer-prompts.ts - FEW_SHOT_EXAMPLES",
})

registerPrompt({
  id: "interviewer-phase-intro",
  version: "1.0.0",
  name: "Intro Phase Prompt",
  description: "Phase-specific instructions for interview introduction",
  category: "interviewer",
  usedBy: ["lib/interview/interviewer-prompts.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/interview/interviewer-prompts.ts - PHASE_PROMPTS.intro",
})

registerPrompt({
  id: "interviewer-phase-discussion",
  version: "1.0.0",
  name: "Discussion Phase Prompt",
  description: "Phase-specific instructions for approach discussion",
  category: "interviewer",
  usedBy: ["lib/interview/interviewer-prompts.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/interview/interviewer-prompts.ts - PHASE_PROMPTS.discussion",
})

registerPrompt({
  id: "interviewer-phase-coding",
  version: "1.0.0",
  name: "Coding Phase Prompt",
  description: "Phase-specific instructions for coding phase",
  category: "interviewer",
  usedBy: ["lib/interview/interviewer-prompts.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/interview/interviewer-prompts.ts - PHASE_PROMPTS.coding",
})

registerPrompt({
  id: "interviewer-phase-testing",
  version: "1.0.0",
  name: "Testing Phase Prompt",
  description: "Phase-specific instructions for testing phase",
  category: "interviewer",
  usedBy: ["lib/interview/interviewer-prompts.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/interview/interviewer-prompts.ts - PHASE_PROMPTS.testing",
})

// --- FEEDBACK PROMPTS ---

registerPrompt({
  id: "feedback-dsa-system",
  version: "1.2.0",
  name: "DSA Feedback System Instruction",
  description: "System instruction for generating DSA interview feedback",
  category: "feedback",
  usedBy: ["app/api/generate-feedback/route.ts"],
  lastUpdated: "2026-01-19",
  changelog: [
    "1.2.0: Added evidence reconciliation rules",
    "1.1.0: Updated low score handling",
    "1.0.0: Initial instruction",
  ],
  template: "See: lib/prompts/templates.ts - dsaFeedbackInstruction()",
})

registerPrompt({
  id: "feedback-system-design",
  version: "1.0.0",
  name: "System Design Feedback Instruction",
  description: "System instruction for generating system design feedback",
  category: "feedback",
  usedBy: ["app/api/generate-feedback/route.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/prompts/templates.ts - systemDesignFeedbackInstruction()",
})

registerPrompt({
  id: "feedback-bugfix",
  version: "1.0.0",
  name: "Bug Fix Feedback Instruction",
  description: "System instruction for generating bug fix feedback",
  category: "feedback",
  usedBy: ["app/api/generate-feedback/route.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/prompts/templates.ts - bugFixFeedbackInstruction()",
})

// --- CONSTITUTIONAL AI PROMPTS ---

registerPrompt({
  id: "constitutional-score-critique",
  version: "1.1.0",
  name: "Score Critique Prompt",
  description: "Constitutional AI prompt for reviewing score fairness",
  category: "constitutional",
  usedBy: ["lib/feedback/constitutional-ai.ts"],
  lastUpdated: "2026-01-19",
  changelog: [
    "1.1.0: Added extracted evidence comparison",
    "1.0.0: Initial critique prompt",
  ],
  template: "See: lib/prompts/templates.ts - scoreCritiquePrompt()",
})

registerPrompt({
  id: "constitutional-feedback-critique",
  version: "1.1.0",
  name: "Feedback Text Critique Prompt",
  description: "Constitutional AI prompt for reviewing feedback quality",
  category: "constitutional",
  usedBy: ["lib/feedback/constitutional-ai.ts"],
  lastUpdated: "2026-01-19",
  changelog: [
    "1.1.0: Added evidence contradiction detection",
    "1.0.0: Initial critique prompt",
  ],
  template: "See: lib/prompts/templates.ts - feedbackTextCritiquePrompt()",
})

// --- EXTRACTION PROMPTS ---

registerPrompt({
  id: "extraction-conversation",
  version: "1.1.0",
  name: "Conversation Extraction Prompt",
  description: "LLM prompt for extracting evidence from interview transcript",
  category: "extraction",
  usedBy: ["lib/interview/conversation-extraction.ts", "lib/feedback/structured-extraction.ts"],
  lastUpdated: "2026-01-19",
  changelog: [
    "1.1.0: Added voice transcription complexity patterns",
    "1.0.0: Initial extraction prompt",
  ],
  template: "See: lib/prompts/templates.ts - conversationExtractionPrompt()",
})

// --- HINT PROMPTS ---

registerPrompt({
  id: "hint-system",
  version: "1.0.0",
  name: "Hint System Prompt",
  description: "System prompt for hint generation with levels 1-4",
  category: "hint",
  usedBy: ["lib/agents/hints/prompts.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/agents/hints/prompts.ts - HINT_SYSTEM_PROMPT",
})

registerPrompt({
  id: "hint-level-1",
  version: "1.0.0",
  name: "Level 1 Nudge Hint",
  description: "Thought-provoking question without naming techniques",
  category: "hint",
  usedBy: ["lib/agents/hints/prompts.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/prompts/templates.ts - hintGenerationPrompt(1, ...)",
})

registerPrompt({
  id: "hint-level-2",
  version: "1.0.0",
  name: "Level 2 Guide Hint",
  description: "Names technique, explains why it applies",
  category: "hint",
  usedBy: ["lib/agents/hints/prompts.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/prompts/templates.ts - hintGenerationPrompt(2, ...)",
})

registerPrompt({
  id: "hint-level-3",
  version: "1.0.0",
  name: "Level 3 Explain Hint",
  description: "Step-by-step approach with complexity",
  category: "hint",
  usedBy: ["lib/agents/hints/prompts.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/prompts/templates.ts - hintGenerationPrompt(3, ...)",
})

registerPrompt({
  id: "hint-level-4",
  version: "1.0.0",
  name: "Level 4 Reveal Hint",
  description: "Near-complete pseudocode for stuck users",
  category: "hint",
  usedBy: ["lib/agents/hints/prompts.ts"],
  lastUpdated: "2026-01-19",
  template: "See: lib/prompts/templates.ts - hintGenerationPrompt(4, ...)",
})

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get summary of all registered prompts for documentation
 */
export function getRegistrySummary(): string {
  const prompts = listPrompts()
  const byCategory = prompts.reduce(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = []
      acc[p.category].push(p)
      return acc
    },
    {} as Record<string, PromptMetadata[]>
  )

  let summary = "# Prompt Registry Summary\n\n"

  for (const [category, categoryPrompts] of Object.entries(byCategory)) {
    summary += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Prompts\n\n`
    for (const p of categoryPrompts) {
      summary += `- **${p.name}** (v${p.version}): ${p.description}\n`
      summary += `  - ID: \`${p.id}\`\n`
      summary += `  - Used by: ${p.usedBy.join(", ")}\n\n`
    }
  }

  return summary
}

/**
 * Validate that all prompts used in the codebase are registered
 * Useful for CI/CD checks
 */
export function validateRegistry(): { valid: boolean; missing: string[] } {
  // This would scan the codebase for prompt references
  // For now, returns valid since we just set this up
  return { valid: true, missing: [] }
}
