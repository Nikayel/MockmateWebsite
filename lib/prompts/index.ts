/**
 * Centralized Prompt System
 *
 * Single source of truth for all prompts in the interview system.
 * Follows DRY principles - change once, affect everywhere.
 *
 * Structure:
 * - /rubrics: Evaluation criteria shared across feedback generators
 * - /principles: Core interviewer behaviors and rules
 * - /templates: Reusable prompt templates
 * - /registry: Version tracking and prompt metadata
 *
 * Integration Guide:
 * ------------------
 * Existing prompt files reference this system but aren't fully migrated yet.
 * To complete migration:
 *
 * 1. lib/interview/interviewer-prompts.ts
 *    - Uses: INTERVIEWER_RULES, INTERVIEWER_PERSONALITY from principles
 *    - Status: Uses principles as source of truth
 *
 * 2. app/api/generate-feedback/route.ts
 *    - Uses: dsaFeedbackInstruction(), systemDesignFeedbackInstruction() from templates
 *    - Uses: DSA_RUBRIC, COMMUNICATION_RUBRIC from rubrics
 *    - Status: Can import templates for system instructions
 *
 * 3. lib/feedback/constitutional-ai.ts
 *    - Uses: scoreCritiquePrompt(), feedbackTextCritiquePrompt() from templates
 *    - Uses: FEEDBACK_PRINCIPLES from principles
 *    - Status: Can import templates for critique prompts
 *
 * 4. lib/agents/hints/prompts.ts
 *    - Uses: HINT_LEVELS from principles
 *    - Uses: hintGenerationPrompt() from templates
 *    - Status: Can import for hint generation
 */

// Re-export all prompt modules
export * from "./rubrics"
export * from "./principles"
export * from "./templates"
export * from "./registry"
