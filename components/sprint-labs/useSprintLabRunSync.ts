"use client"

/**
 * useSprintLabRunSync — load + autosave a run's workspace files.
 *
 * Generalizes `components/labs/useCaseLabRunSync.ts`'s debounce/flush
 * machinery from "one whole run object" to "a map of file paths", since the
 * workspace store is a per-file subcollection (PLAN.md Task 6), not a
 * whole-doc overwrite:
 *
 *  - Loads the run's saved overlay on mount (or when `runId` changes) and
 *    reassembles it onto the caller-supplied seed tree
 *    (`reassembleWorkspaceFiles`), the same "seed + overlay" the server-side
 *    load conceptually returns.
 *  - Tracks WHICH paths are dirty (changed since the last save) rather than
 *    diffing one snapshot string, so a batched save only ever posts the files
 *    that actually changed — required because a run can hold ~60 files and
 *    reposting all of them on every keystroke would be wasteful and would
 *    blow past the server's per-call batch cap on a large workspace.
 *  - Debounces at 1s, flushes on unmount and on `visibilitychange:hidden`,
 *    and dedupes so an autosave echo of just-loaded content never fires.
 *
 * Board/sprint moves are NOT this hook's job — those are explicit,
 * server-validated actions (`moveSprintLabRunTicket`, `advanceSprintLabRunSprint`
 * in `lib/sprint-labs/runs-client.ts`) triggered by user actions, not a
 * continuous autosave stream, so a page calls them directly.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  MAX_WORKSPACE_FILES_PER_SAVE,
  fetchSprintLabWorkspaceFiles,
  reassembleWorkspaceFiles,
  saveSprintLabWorkspaceFiles,
  type WorkspaceFileLike,
} from "@/lib/sprint-labs/runs-client"

const SAVE_DEBOUNCE_MS = 1000

export interface UseSprintLabRunSyncResult {
  /** The current file map (seed + overlay + live edits), keyed by path. */
  files: Record<string, string>
  /** Call on every editor change; marks the path dirty for the next debounced save. */
  setFileContent: (path: string, content: string) => void
  isLoading: boolean
  error: string | null
  /** Re-run the load (e.g. after a failed load, for a manual Retry). */
  reload: () => void
}

export function useSprintLabRunSync(
  runId: string | null,
  seedFiles: readonly WorkspaceFileLike[]
): UseSprintLabRunSyncResult {
  const [files, setFiles] = useState<Record<string, string>>({})
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const reload = useCallback(() => setReloadNonce((n) => n + 1), [])

  // Mirrors of the latest live values, read by the debounce timer and the
  // unmount/tab-hide flush WITHOUT those effects depending on `files` (which
  // changes every keystroke) — the same technique useCaseLabRunSync uses for
  // its `pending` ref, generalized to a per-path dirty set.
  const filesRef = useRef<Record<string, string>>({})
  const runIdRef = useRef<string | null>(runId)
  const seedRef = useRef<readonly WorkspaceFileLike[]>(seedFiles)
  filesRef.current = files
  runIdRef.current = runId
  seedRef.current = seedFiles

  const lastSaved = useRef<Record<string, string>>({})
  const dirty = useRef<Set<string>>(new Set())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load the saved overlay once per (runId, retry), reassembled onto the seed.
  // Guards against React StrictMode's dev double-invoke the same way
  // useCaseLabRunSync does: keyed on a persistent ref rather than a
  // per-invocation `cancelled` closure, so a genuine retry (which advances the
  // key) is never mistaken for a stale in-flight load.
  const loadedKey = useRef<string | null>(null)
  useEffect(() => {
    if (!runId) return
    const key = `${runId}:${reloadNonce}`
    if (loadedKey.current === key) return
    loadedKey.current = key

    setError(null)
    setLoading(true)
    fetchSprintLabWorkspaceFiles(runId)
      .then((overlay) => {
        if (loadedKey.current !== key) return
        const merged = reassembleWorkspaceFiles(seedRef.current, overlay ?? [])
        const map: Record<string, string> = {}
        for (const f of merged) map[f.path] = f.content
        // Seed the last-saved baseline to the just-loaded content so the
        // dirty-tracking effect below does not treat a fresh load as an
        // unsaved change and immediately re-save it back unchanged.
        lastSaved.current = { ...map }
        dirty.current = new Set()
        setFiles(map)
      })
      .catch(() => {
        if (loadedKey.current === key) setError("Couldn't load your saved workspace.")
      })
      .finally(() => {
        if (loadedKey.current === key) setLoading(false)
      })
  }, [runId, reloadNonce])

  const setFileContent = useCallback((path: string, content: string) => {
    setFiles((prev) => (prev[path] === content ? prev : { ...prev, [path]: content }))
  }, [])

  // Flush whatever is currently dirty. Stable identity (empty deps) so the
  // unmount/tab-hide effect below only sets up and tears down once, instead
  // of re-firing (and flushing) on every keystroke.
  const flushPending = useCallback(() => {
    const runIdNow = runIdRef.current
    const paths = Array.from(dirty.current)
    if (!runIdNow || paths.length === 0) return
    dirty.current = new Set()

    const snapshot = filesRef.current
    const changed = paths.map((path) => ({ path, content: snapshot[path] ?? "" }))
    // Mark as saved optimistically before the request resolves: a flush
    // triggered by unmount/tab-hide must not leave these paths dirty for a
    // save that will never run.
    for (const f of changed) lastSaved.current[f.path] = f.content

    void (async () => {
      for (let i = 0; i < changed.length; i += MAX_WORKSPACE_FILES_PER_SAVE) {
        const chunk = changed.slice(i, i + MAX_WORKSPACE_FILES_PER_SAVE)
        const saved = await saveSprintLabWorkspaceFiles(runIdNow, chunk)
        if (!saved) {
          // Failed: re-dirty so the next debounce (or the next flush) retries.
          for (const f of chunk) dirty.current.add(f.path)
          setError("Couldn't save your latest changes.")
        }
      }
    })()
  }, [])

  // Debounced autosave: whenever the live file map diverges from the
  // last-saved baseline, mark the changed paths dirty and (re)schedule a flush.
  useEffect(() => {
    let hasChange = false
    for (const [path, content] of Object.entries(files)) {
      if (lastSaved.current[path] !== content) {
        dirty.current.add(path)
        hasChange = true
      }
    }
    if (!hasChange) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      flushPending()
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
    }
  }, [files, flushPending])

  // Flush on unmount or when the tab is hidden, mirroring
  // useCaseLabRunSync's empty-deps effect (flushPending has a stable identity,
  // so this mounts/unmounts exactly once regardless of how often `files` changes).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (saveTimer.current) {
          clearTimeout(saveTimer.current)
          saveTimer.current = null
        }
        flushPending()
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      flushPending()
    }
  }, [flushPending])

  return { files, setFileContent, isLoading, error, reload }
}
