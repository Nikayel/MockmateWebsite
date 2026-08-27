/**
 * Sprint Labs — pure workspace-file helpers shared by the server service
 * (`lib/sprint-labs/runs.ts`) and the client hook (`lib/sprint-labs/runs-client.ts`,
 * `hooks/useSprintLabRunSync.ts`).
 *
 * Split out from `runs.ts` deliberately: `runs.ts` imports `@/lib/firebase-admin`
 * (Node-only, Admin SDK credentials), so nothing that a "use client" hook needs
 * can live there without pulling the Admin SDK into the browser bundle. This
 * module has zero server-only dependencies and is safe to import from both
 * sides of that boundary — mirroring why `lib/sprint-labs/platform-capabilities.ts`
 * (Task 1) is its own file rather than a corner of `types.ts`.
 */

/** A path+content pair — the minimal shape both a seed file and a stored `WorkspaceFileDoc` satisfy. */
export interface WorkspaceFileLike {
  path: string
  content: string
}

/**
 * Upper bound on changed files accepted by one batched-save call
 * (`app/api/sprint-labs/runs/files/route.ts`). Shared with the client hook so
 * it can chunk an unusually large dirty-set (e.g. a bulk revert) into
 * server-accepted batches instead of firing one oversize request that the
 * route would reject outright.
 */
export const MAX_WORKSPACE_FILES_PER_SAVE = 40

/**
 * Encode a workspace-relative file path into a Firestore document id.
 *
 * Firestore document ids may not contain `/`, so a nested path like
 * `src/http/server.ts` cannot be a doc id verbatim. `encodeURIComponent`
 * percent-encodes `/` (and every other reserved character), so the result is
 * always a single path segment. Round-trips losslessly via
 * {@link decodeWorkspaceFilePathId} — see `__tests__/workspace-files.test.ts`.
 *
 * Callers must validate the path with `isValidWorkspacePath`
 * (`lib/workspace-execution/validators.ts`) BEFORE encoding it: this function
 * does not reject `.`, `..`, or empty segments itself, since that validation
 * already exists and this module must not fork it.
 */
export function encodeWorkspaceFilePathId(path: string): string {
  return encodeURIComponent(path)
}

/** Inverse of {@link encodeWorkspaceFilePathId}. */
export function decodeWorkspaceFilePathId(id: string): string {
  return decodeURIComponent(id)
}

/**
 * Reassemble the file list a workspace should show: the compiled seed tree
 * (base content for the current sprint) with the learner's saved overlay
 * merged on top. Mirrors `overlayWorkspaceFiles`
 * (`lib/workspace-execution/files.ts`) — same "overlay wins" precedence — but
 * decoupled from that module's `WorkspaceScenario` type, which belongs to a
 * different domain (DSA/bugfix scenarios), and generalized to also carry
 * forward overlay-only paths the seed doesn't have (a learner-created file).
 *
 * Pure and order-stable: seed order first, then any overlay-only paths
 * appended sorted by path, so a re-render doesn't reshuffle the file tree.
 */
export function reassembleWorkspaceFiles<T extends WorkspaceFileLike>(
  seed: readonly T[],
  overlay: readonly WorkspaceFileLike[]
): WorkspaceFileLike[] {
  const overlayByPath = new Map(overlay.map((file) => [file.path, file.content]))
  const seedPaths = new Set(seed.map((file) => file.path))

  const merged: WorkspaceFileLike[] = seed.map((file) => ({
    path: file.path,
    content: overlayByPath.get(file.path) ?? file.content,
  }))

  const overlayOnly = overlay
    .filter((file) => !seedPaths.has(file.path))
    .map((file) => ({ path: file.path, content: file.content }))
    .sort((a, b) => a.path.localeCompare(b.path))

  return [...merged, ...overlayOnly]
}
