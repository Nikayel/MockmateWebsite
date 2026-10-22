import { useGuidedLabStore } from "@/lib/stores/guided-lab-store"
import { describePatch } from "./patch"

interface SourceFile {
  path: string
  content: string
  originalContent?: string
  role?: string
}
// Source snapshots stay in memory; only bounded changed regions are persisted.
let previous: { scenarioId: string; generation: number; files: Map<string, string> } | undefined
export function captureLabCheckpoint(scenarioId: string, files: SourceFile[]): void {
  const store = useGuidedLabStore.getState()
  if (store.scenarioId !== scenarioId || !store.progress) return
  if (
    !previous ||
    previous.scenarioId !== scenarioId ||
    store.captureGeneration !== previous.generation
  )
    previous = { scenarioId, generation: store.captureGeneration, files: new Map() }
  const patches = files
    .filter((f) => f.role === "editable")
    .flatMap((file) => {
      const before = previous!.files.get(file.path) ?? file.originalContent
      previous!.files.set(file.path, file.content)
      // A restored workspace without a baseline cannot establish an earlier patch.
      if (before === undefined) return []
      const patch = describePatch(file.path, before, file.content)
      return patch ? [patch] : []
    })
    .slice(0, 20)
  if (patches.length) store.observe(scenarioId, { kind: "checkpoint", patches })
}

export function captureLabMessage(
  scenarioId: string,
  role: "candidate" | "interviewer" | "ai_partner",
  lane: "interviewer" | "partner",
  text: string,
  phaseId?: string
): void {
  useGuidedLabStore.getState().observe(
    scenarioId,
    {
      kind: "message",
      role,
      lane,
      text: text.slice(0, 3000),
      truncated: text.length > 3000,
    },
    phaseId
  )
}

/** Seed on mount/resume, before user edits. Existing changes are not new-phase work. */
export function seedLabCheckpoint(scenarioId: string, files: SourceFile[]): void {
  const store = useGuidedLabStore.getState()
  if (
    store.scenarioId !== scenarioId ||
    (previous?.scenarioId === scenarioId && previous.generation === store.captureGeneration)
  )
    return
  previous = {
    scenarioId,
    generation: store.captureGeneration,
    files: new Map(files.filter((f) => f.role === "editable").map((f) => [f.path, f.content])),
  }
}
