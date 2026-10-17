export interface SessionRequestGuard {
  generationRef?: { current: number }
  isActive?: () => boolean
  ownerId?: string
  paused?: boolean
}

/** A pause/resume or attempt change invalidates work started under the old generation. */
export function captureSessionRequest(guard: SessionRequestGuard): () => boolean {
  const generation = guard.generationRef?.current
  return () =>
    guard.paused !== true &&
    guard.generationRef?.current === generation &&
    guard.isActive?.() !== false
}
