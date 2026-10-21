/**
 * Local persistence for guided bug-fix lab progress.
 *
 * A guided lab can take 30-40 minutes, so a page reload must not reset the user
 * to milestone 1. Progress is keyed per scenario in localStorage and restored
 * synchronously at init (which also avoids any async "saved arrives after first
 * render" race). Milestone progress is low-sensitivity, so localStorage is an
 * acceptable store; a future enhancement can additionally sync the same shape
 * into InterviewSession.session_state.guided_lab_progress for cross-device resume.
 */

import { z } from "zod"
import type { GuidedLabProgress } from "./types"

const progressSchema = z.object({
  version: z.enum(["bookclub-guided-v1", "bookclub-guided-v2"]),
  currentMilestoneId: z.string(),
  milestoneStatus: z.record(z.enum(["locked", "active", "done"])),
  activeBugId: z.string().optional(),
  quizAnswers: z.array(
    z.object({ quizId: z.string(), selectedIndex: z.number().int().nonnegative() })
  ),
  checkpointAcks: z.array(z.string()),
  updatedAt: z.string(),
})

export function parseGuidedLabProgress(value: unknown): GuidedLabProgress | null {
  const parsed = progressSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

const keyFor = (scenarioId: string) => `codesparring:guided-lab:${scenarioId}`

export function loadGuidedLabProgress(scenarioId: string): GuidedLabProgress | null {
  if (typeof window === "undefined" || !scenarioId) return null
  try {
    const raw = window.localStorage.getItem(keyFor(scenarioId))
    if (!raw) return null
    return parseGuidedLabProgress(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveGuidedLabProgress(scenarioId: string, progress: GuidedLabProgress): void {
  if (typeof window === "undefined" || !scenarioId) return
  try {
    window.localStorage.setItem(keyFor(scenarioId), JSON.stringify(progress))
  } catch {
    // Ignore quota / serialization errors — persistence is best-effort.
  }
}
