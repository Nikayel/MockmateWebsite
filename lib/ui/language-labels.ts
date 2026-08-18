/**
 * Display labels for workspace languages.
 *
 * CSS `capitalize` is the obvious shortcut and it is wrong for exactly the languages this app runs:
 * it renders "javascript" as "Javascript" and "sql" as "Sql". The labels are short enough that a
 * lookup table is cheaper than any rule, and a `Record<WorkspaceScenarioLanguage, string>` makes a
 * new language a compile error rather than a mis-cased badge.
 */
import type { WorkspaceScenarioLanguage } from "@/lib/scenarios/types"

const LABELS: Record<WorkspaceScenarioLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  sql: "SQL",
}

export function workspaceLanguageLabel(language: WorkspaceScenarioLanguage): string {
  return LABELS[language] ?? language
}
