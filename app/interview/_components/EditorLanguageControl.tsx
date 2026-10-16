"use client"

import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { EDITOR_LANGUAGES, isLanguageSupported, type EditorLanguage } from "../_utils/language"

const LANGUAGE_NAMES: Record<EditorLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
}

interface EditorLanguageControlProps {
  value: EditorLanguage
  onChange: (language: EditorLanguage) => void
  isWorkspace: boolean
  variant?: "select" | "menu"
}

const languageLabel = (language: EditorLanguage) =>
  `${LANGUAGE_NAMES[language]}${isLanguageSupported(language) ? "" : " (Coming Soon)"}`

export function EditorLanguageControl({
  value,
  onChange,
  isWorkspace,
  variant = "select",
}: EditorLanguageControlProps) {
  if (variant === "menu") {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={isWorkspace} className="lg:hidden">
          Language · {LANGUAGE_NAMES[value]}
          {isWorkspace ? " (workspace)" : ""}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="interview-workspace workspace-menu max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto">
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(language) => {
              if (EDITOR_LANGUAGES.includes(language as EditorLanguage))
                onChange(language as EditorLanguage)
            }}
          >
            {EDITOR_LANGUAGES.map((language) => (
              <DropdownMenuRadioItem key={language} value={language}>
                {languageLabel(language)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  }

  return (
    <select
      aria-label="Editor language"
      value={value}
      onChange={(event) => onChange(event.target.value as EditorLanguage)}
      disabled={isWorkspace}
      title={
        isWorkspace
          ? `Workspace scenario language: ${LANGUAGE_NAMES[value]}`
          : "Choose editor language"
      }
      className="focus:ring-ring border-border bg-card text-foreground hidden min-h-11 rounded-md border px-3 text-sm focus:ring-2 focus:outline-none lg:block"
    >
      {EDITOR_LANGUAGES.map((language) => (
        <option key={language} value={language}>
          {languageLabel(language)}
        </option>
      ))}
    </select>
  )
}
