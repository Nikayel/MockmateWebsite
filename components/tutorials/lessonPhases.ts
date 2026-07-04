import { BookOpen, Dumbbell, PencilLine, type LucideIcon } from "lucide-react"
import type { LessonSection } from "@/lib/tutorials/types"

/**
 * Shared per-phase presentation for the Read → Apply → Practice tracker. Both the full stepper
 * (`LessonOutline`) and the collapsed slim strip (`LessonRailStrip`) read from here, so the two
 * views stay in lockstep: the same label, subtitle, and icon describe a phase whichever rail state
 * is showing. Keeping this in one place is what lets the dots and the stepper never drift apart.
 */
export const SECTION_LABEL: Record<LessonSection, string> = {
  teach: "Read",
  apply: "Apply",
  practice: "Practice",
}

export const SECTION_HINT: Record<LessonSection, string> = {
  teach: "Understand it",
  apply: "Write it yourself",
  practice: "A real-world variant",
}

/** The phase glyphs: an open book to read, a pencil to write it yourself, a dumbbell to drill it. */
export const PHASE_ICON: Record<LessonSection, LucideIcon> = {
  teach: BookOpen,
  apply: PencilLine,
  practice: Dumbbell,
}
