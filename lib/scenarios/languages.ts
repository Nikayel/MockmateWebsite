import type { Scenario, WorkspaceScenarioLanguage } from "./types"

export type ScenarioLanguage = WorkspaceScenarioLanguage

export const SCENARIO_LANGUAGES: readonly ScenarioLanguage[] = [
  "javascript",
  "typescript",
  "python",
  "sql",
]

export const SCENARIO_LANGUAGE_LABELS: Record<ScenarioLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  sql: "SQL",
}

const SCENARIO_LANGUAGE_SET = new Set<string>(SCENARIO_LANGUAGES)

function isScenarioLanguage(value: string): value is ScenarioLanguage {
  return SCENARIO_LANGUAGE_SET.has(value)
}

/** Languages a debugging scenario can actually be opened and completed in. */
export function getScenarioLanguages(scenario: Scenario): ScenarioLanguage[] {
  if (scenario.type !== "bugfix" && scenario.type !== "add-functionality") return []

  const languages = new Set<ScenarioLanguage>()
  const addLanguage = (language: string | undefined) => {
    if (language && isScenarioLanguage(language)) languages.add(language)
  }

  addLanguage(scenario.workspace?.language)

  if (scenario.type === "bugfix") {
    addLanguage(scenario.pack?.language)
    Object.keys(scenario.buggyCode).forEach(addLanguage)
  } else {
    Object.keys(scenario.existingCode).forEach(addLanguage)
  }

  return SCENARIO_LANGUAGES.filter((language) => languages.has(language))
}

export function scenarioSupportsAnyLanguage(
  scenario: Scenario,
  languages: readonly ScenarioLanguage[]
): boolean {
  if (languages.length === 0) return true
  const supported = getScenarioLanguages(scenario)
  return languages.some((language) => supported.includes(language))
}
