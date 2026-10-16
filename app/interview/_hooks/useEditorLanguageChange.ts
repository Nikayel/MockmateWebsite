import { useCallback } from "react"
import { toast } from "sonner"
import type { Scenario } from "@/lib/scenarios"
import type { EditorLanguage } from "../_types"
import { isLanguageSupported } from "../_utils/language"
import { isWorkspaceScenario } from "../_utils/workspace"

/** One selection policy for desktop and mobile editor pickers. */
export function useEditorLanguageChange(
  scenario: Scenario | null,
  onChange: (language: EditorLanguage) => void
) {
  return useCallback(
    (language: EditorLanguage) => {
      if (isWorkspaceScenario(scenario)) return
      onChange(language)
      localStorage.setItem("mockmate_preferred_language", language)
      if (!isLanguageSupported(language)) {
        toast.warning(`${language.toUpperCase()} execution coming soon`, {
          description:
            "You can write code, but tests won't run. Use JavaScript, TypeScript, or Python for full support.",
          duration: 5000,
        })
      }
    },
    [scenario, onChange]
  )
}
