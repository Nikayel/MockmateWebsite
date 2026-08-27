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
 *
 * Fix round 2026-08-26 (I3, M1-M4): see the inline notes below at each fix's
 * site; task-6-report.md's "Fix round" section has the full rationale.
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

/** A dirty path remembers the run it was edited under and its live content, captured at
 * mark time — NOT re-read at flush time (M3). Both matter under a runId switch mid-edit:
 * `runIdRef.current` may already point at a different run by the time the debounce timer
 * fires, and `files` may already hold the NEW run's content for a colliding path. Capturing
 * both at the moment of the edit is the only way flushing later still targets the run the
 * edit actually belongs to, with the content it actually had. */
interface DirtyEntry {
  runId: string
  content: string
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

  const runIdRef = useRef<string | null>(runId)
  const seedRef = useRef<readonly WorkspaceFileLike[]>(seedFiles)
  runIdRef.current = runId
  seedRef.current = seedFiles

  const lastSaved = useRef<Record<string, string>>({})
  const dirty = useRef<Map<string, DirtyEntry>>(new Map())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // I3: a load failure must not be indistinguishable from "nothing saved yet".
  // While true, no network save is ever attempted (both the scheduling below
  // and `flushPending` itself no-op) until a successful load clears it — a
  // failed load leaves `files` untouched rather than resetting it to
  // seed-only content that a subsequent edit could then save over the
  // learner's real progress. Dirty-MARKING still proceeds while this is true
  // (see the debounce effect below) so an edit made during the outage is not
  // forgotten, only its network flush is deferred.
  const loadFailed = useRef(false)

  // Flush whatever is currently dirty. Stable identity (empty deps) so the
  // unmount/tab-hide effect further down only sets up and tears down once,
  // instead of re-firing (and flushing) on every keystroke. Declared before
  // the load effect below because that effect now also schedules a flush
  // through it (when a load resolves with edits still pending).
  const flushPending = useCallback(() => {
    if (loadFailed.current) return
    const entries = Array.from(dirty.current.entries())
    if (entries.length === 0) return
    dirty.current = new Map()

    // M3: group by the runId captured WITH each entry, not the current
    // runIdRef — almost always one group, but correct even if `runId`
    // changed while these edits were pending.
    const byRun = new Map<string, Array<{ path: string; content: string }>>()
    const previousSaved = new Map<string, string | undefined>()
    for (const [path, { runId: entryRunId, content }] of entries) {
      const group = byRun.get(entryRunId) ?? []
      group.push({ path, content })
      byRun.set(entryRunId, group)
      // Optimistic: mark as saved before the request resolves so an
      // unrelated edit's debounce cycle does not re-send an in-flight path.
      // Reverted below (M1) for any path whose save actually fails.
      previousSaved.set(path, lastSaved.current[path])
      lastSaved.current[path] = content
    }

    void (async () => {
      let anyFailed = false
      for (const [targetRunId, changed] of byRun) {
        for (let i = 0; i < changed.length; i += MAX_WORKSPACE_FILES_PER_SAVE) {
          const chunk = changed.slice(i, i + MAX_WORKSPACE_FILES_PER_SAVE)
          const saved = await saveSprintLabWorkspaceFiles(targetRunId, chunk)
          if (!saved) {
            anyFailed = true
            for (const f of chunk) {
              // M1: put the path back in the dirty set AND revert its
              // lastSaved baseline. Without the revert, `lastSaved` would
              // already equal the unsaved content, so the next compare would
              // see no difference and never reschedule a retry.
              dirty.current.set(f.path, { runId: targetRunId, content: f.content })
              const prior = previousSaved.get(f.path)
              if (prior === undefined) delete lastSaved.current[f.path]
              else lastSaved.current[f.path] = prior
            }
          }
        }
      }

      if (anyFailed) {
        setError("Couldn't save your latest changes.")
        // M1: actively reschedule, rather than waiting for an unrelated edit
        // to re-trigger the debounce effect (which may never happen).
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null
          flushPending()
        }, SAVE_DEBOUNCE_MS)
      } else {
        setError(null) // M2: clear a prior failure once a save actually lands.
      }
    })()
  }, [])

  const loadedKey = useRef<string | null>(null)
  useEffect(() => {
    if (!runId) return
    const key = `${runId}:${reloadNonce}`
    if (loadedKey.current === key) return
    loadedKey.current = key

    setError(null)
    setLoading(true)
    fetchSprintLabWorkspaceFiles(runId)
      .then((result) => {
        if (loadedKey.current !== key) return

        if (!result.ok) {
          // I3: do not touch `files`/`lastSaved` at all — whatever was there
          // (blank on a first mount, or the last good state on a failed
          // reload) stays exactly as it was.
          loadFailed.current = true
          setError("Couldn't load your saved workspace.")
          return
        }
        loadFailed.current = false

        const merged = reassembleWorkspaceFiles(seedRef.current, result.files)
        const map: Record<string, string> = {}
        for (const f of merged) map[f.path] = f.content

        // M4: an edit that started while THIS load was still in flight (or
        // that landed during a PRIOR failed load, per the note on
        // `loadFailed` above) must not be clobbered by this load's result. A
        // path currently in `dirty` keeps its live (unsaved) value;
        // `lastSaved` for that path is left at whatever it already was (not
        // the just-loaded server value), so the pending edit is both
        // preserved in the UI and still recognized as needing a save.
        const nextLastSaved: Record<string, string> = {}
        for (const [path, content] of Object.entries(map)) {
          const pending = dirty.current.get(path)
          if (pending) {
            map[path] = pending.content
            const priorBaseline = lastSaved.current[path]
            if (priorBaseline !== undefined) nextLastSaved[path] = priorBaseline
          } else {
            nextLastSaved[path] = content
          }
        }
        // A path the user created (not in seed or overlay) while this load
        // was in flight: keep it; do not invent a lastSaved baseline for it.
        for (const [path, entry] of dirty.current) {
          if (!(path in map)) map[path] = entry.content
        }

        lastSaved.current = nextLastSaved
        setFiles(map)

        // Anything still in `dirty` at this point has not been scheduled for
        // a network save yet (it either arrived during this load, or during
        // a prior outage while `loadFailed` blocked scheduling). Schedule it
        // now rather than waiting for a further edit that may never come.
        if (dirty.current.size > 0) {
          if (saveTimer.current) clearTimeout(saveTimer.current)
          saveTimer.current = setTimeout(() => {
            saveTimer.current = null
            flushPending()
          }, SAVE_DEBOUNCE_MS)
        }
      })
      .catch(() => {
        if (loadedKey.current === key) {
          loadFailed.current = true
          setError("Couldn't load your saved workspace.")
        }
      })
      .finally(() => {
        if (loadedKey.current === key) setLoading(false)
      })
  }, [runId, reloadNonce, flushPending])

  const setFileContent = useCallback((path: string, content: string) => {
    setFiles((prev) => (prev[path] === content ? prev : { ...prev, [path]: content }))
  }, [])

  // Debounced autosave: whenever the live file map diverges from the
  // last-saved baseline, mark the changed paths dirty (tagged with the
  // CURRENT runId, per M3) and (re)schedule a flush.
  //
  // Dirty-marking itself is UNCONDITIONAL, even while `loadFailed` is true:
  // an edit made during a failed-load window must still land in `dirty`, or
  // a later successful reload's merge (above) would have no record of it and
  // would silently drop it. Only the actual network flush is gated on
  // `loadFailed` — both here (don't schedule) and in `flushPending` itself
  // (don't send), so "autosave disabled until a successful reload()" holds
  // without losing track of what still needs saving once it resumes.
  useEffect(() => {
    let hasChange = false
    const currentRunId = runIdRef.current
    for (const [path, content] of Object.entries(files)) {
      if (lastSaved.current[path] !== content) {
        if (currentRunId) dirty.current.set(path, { runId: currentRunId, content })
        hasChange = true
      }
    }
    if (!hasChange || loadFailed.current) return

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
