/**
 * The learner's last-chosen Python level, carried forward across the Path and the lesson workspace
 * (HANDOFF §B/§A — `localStorage["cs_py_level"]`, 1–4). This is a convenience pointer only; the
 * authoritative per-lesson progress lives in Firestore, never here.
 */
import type { PythonLevelId } from "./types"

export const LEVEL_STORAGE_KEY = "cs_py_level"

/** Persist the chosen level (no-op during SSR). */
export function rememberLevel(levelId: PythonLevelId): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LEVEL_STORAGE_KEY, String(levelId))
}

/** Read the chosen level, or `null` when unset/invalid/SSR. */
export function recallLevel(): PythonLevelId | null {
  if (typeof window === "undefined") return null
  const value = Number(window.localStorage.getItem(LEVEL_STORAGE_KEY))
  return value >= 1 && value <= 4 ? (value as PythonLevelId) : null
}
