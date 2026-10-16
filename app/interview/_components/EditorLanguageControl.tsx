"use client"

import { LockKeyhole } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
}

const languageLabel = (language: EditorLanguage) =>
  `${LANGUAGE_NAMES[language]}${isLanguageSupported(language) ? "" : " (Coming Soon)"}`

export function EditorLanguageControl({
  value,
  onChange,
  isWorkspace,
}: EditorLanguageControlProps) {
  const changeLanguage = (language: string) => {
    if (EDITOR_LANGUAGES.includes(language as EditorLanguage)) onChange(language as EditorLanguage)
  }

  if (isWorkspace) {
    return (
      <span
        className="text-muted-foreground inline-flex min-h-11 items-center gap-1.5 px-2 text-xs"
        title={`${LANGUAGE_NAMES[value]} is fixed for this workspace. Its files and tests use this language.`}
      >
        <LockKeyhole className="h-3 w-3" aria-hidden="true" />
        <span>{LANGUAGE_NAMES[value]}</span>
        <span className="sr-only">Fixed for this workspace</span>
      </span>
    )
  }

  return (
    <Select value={value} onValueChange={changeLanguage}>
      <SelectTrigger
        aria-label="Editor language"
        title="Choose editor language"
        className="bg-card text-foreground h-11 w-36 max-w-full text-sm"
      >
        <SelectValue>{LANGUAGE_NAMES[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent className="interview-workspace max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-56">
        {EDITOR_LANGUAGES.map((language) => (
          <SelectItem
            key={language}
            value={language}
            className="focus:bg-muted focus:text-foreground min-h-11"
          >
            {languageLabel(language)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
