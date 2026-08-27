/**
 * Sprint Labs — platform capability facts, client-safe and dependency-free.
 *
 * "Supported languages" and "server execution lands next month" each need to
 * say the exact same thing in three places: the catalog card, the workbook
 * overview, and the Sable partner's system prompt (docs/sprint-labs/
 * INTEGRATION.md §4 names this failure mode explicitly — it already
 * happened once for supported languages). This module is the one place
 * that fact lives; everything else imports it.
 *
 * No imports, on purpose. Prompt builders, Server Components, Client
 * Components, and content scripts all need this, and none of them should
 * have to pull in Zod or the rest of the sprint-labs module graph just to
 * render one sentence or check one array membership.
 */

/** Every workbook language the platform can author against today. */
export const SUPPORTED_WORKBOOK_LANGUAGES = ["typescript", "javascript", "python", "sql"] as const

export type SupportedWorkbookLanguage = (typeof SUPPORTED_WORKBOOK_LANGUAGES)[number]

/** When the server-side sandbox (real isolated execution, more languages) is expected to land. */
export const SERVER_EXECUTION_ETA = "next month"

/**
 * One canonical sentence for the catalog card, the workbook overview, and
 * the Sable partner's system context, so the AI partner, the coder, and the
 * interviewer never say something different from what the UI shows.
 * EXECUTION-STATE.md owner decision 3. Never hand-write this sentence
 * again; import it.
 */
export const SERVER_EXECUTION_MESSAGE = `Server-side isolated grading and additional languages land ${SERVER_EXECUTION_ETA}.`

/**
 * The minimal shape this needs from a workbook to decide runnability. Kept
 * inline, rather than imported from ./types, so this file stays
 * dependency-free — a real `WorkbookSummary` satisfies this structurally.
 */
export interface WorkbookRunnabilityInput {
  language: string
  requiresServerExecution: boolean
}

/**
 * Whether a workbook runs today, entirely in the learner's browser. False
 * either because `language` isn't one the in-browser runners support yet, or
 * because the workbook itself declares it needs the server sandbox (real
 * Postgres RLS, queues, Docker, ...) regardless of language — the two
 * conditions are independent, which is why both are checked.
 */
export function workbookIsRunnable(summary: WorkbookRunnabilityInput): boolean {
  return (
    !summary.requiresServerExecution &&
    (SUPPORTED_WORKBOOK_LANGUAGES as readonly string[]).includes(summary.language)
  )
}
