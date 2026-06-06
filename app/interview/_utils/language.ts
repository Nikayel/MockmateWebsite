import type { Scenario } from "@/lib/scenarios"
import {
  EDITOR_LANGUAGES,
  SUPPORTED_LANGUAGES,
  type EditorLanguage,
  type SupportedLanguage,
} from "../_types"

export { EDITOR_LANGUAGES, SUPPORTED_LANGUAGES }
export type { EditorLanguage, SupportedLanguage }

export const isLanguageSupported = (lang: string): lang is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}

export const getBugfixScenarioLanguage = (
  scenario: Scenario,
  preferredLanguage: EditorLanguage
): EditorLanguage => {
  if (scenario.type !== "bugfix") {
    return preferredLanguage
  }

  const buggyCode = (scenario as { buggyCode?: Partial<Record<SupportedLanguage, string>> })
    .buggyCode

  if (!buggyCode) {
    return preferredLanguage
  }

  if (isLanguageSupported(preferredLanguage) && buggyCode[preferredLanguage]) {
    return preferredLanguage
  }

  return SUPPORTED_LANGUAGES.find((language) => Boolean(buggyCode[language])) ?? preferredLanguage
}
