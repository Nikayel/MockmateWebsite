/**
 * SANDBOX_NOTICE — UX-SPEC.md §1.6's exact sandbox line, reused above the
 * submit screen's gate list (screen 7). §1.6 asks for "one exported constant
 * so it cannot drift," and `lib/sprint-labs/platform-capabilities.ts` already
 * IS that constant for the "server execution lands next month" half
 * (`SERVER_EXECUTION_MESSAGE`, whose own doc comment says "never hand-write
 * this sentence again; import it" — added specifically to stop this exact
 * sentence forking across the catalog card, the overview, and Sable's system
 * prompt, per docs/sprint-labs/INTEGRATION.md §4). This module composes the
 * screen-7 sentence from that same source plus the language list, rather
 * than hand-writing a second, competing "sandbox" string that could drift
 * from it.
 */

import {
  SERVER_EXECUTION_MESSAGE,
  SUPPORTED_WORKBOOK_LANGUAGES,
  type SupportedWorkbookLanguage,
} from "@/lib/sprint-labs/platform-capabilities"

const LANGUAGE_DISPLAY_NAME: Record<SupportedWorkbookLanguage, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  sql: "SQL",
}

function formatLanguageList(languages: readonly SupportedWorkbookLanguage[]): string {
  const names = languages.map((lang) => LANGUAGE_DISPLAY_NAME[lang] ?? lang)
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

export const SANDBOX_NOTICE = `${SERVER_EXECUTION_MESSAGE} Until then Sprint Labs runs ${formatLanguageList(SUPPORTED_WORKBOOK_LANGUAGES)} in your browser.`
