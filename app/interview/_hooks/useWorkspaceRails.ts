import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react"

/**
 * Persisted, draggable widths for the workspace side rails — the guided-lab /
 * problem rail on the left and the interviewer rail on the right. The center
 * editor column is `1fr`, so whatever the rails give up the code panel absorbs.
 *
 * This is the handoff's fix for "the code panel is too small": instead of fixed
 * rail widths, let the candidate size the rails themselves (and drag the editor
 * full-bleed). Widths are clamped to the handoff's ranges and saved to
 * localStorage so the layout survives reloads. Desktop-only — the mobile tab
 * layout (single column) ignores these vars.
 */
const LAB_MIN = 210
const LAB_MAX = 440
const LAB_DEFAULT = 272
const INT_MIN = 250
const INT_MAX = 460
const INT_DEFAULT = 312
const STORAGE_KEY = "codesparring:workspace-rails:v1"

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

interface StoredRails {
  lab: number
  int: number
  labCollapsed: boolean
  intCollapsed: boolean
}

function readStoredRails(): StoredRails | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredRails>
    if (typeof parsed.lab !== "number" || typeof parsed.int !== "number") return null
    return {
      lab: clamp(parsed.lab, LAB_MIN, LAB_MAX),
      int: clamp(parsed.int, INT_MIN, INT_MAX),
      labCollapsed: parsed.labCollapsed === true,
      intCollapsed: parsed.intCollapsed === true,
    }
  } catch {
    return null
  }
}

export interface WorkspaceRails {
  labWidth: number
  intWidth: number
  labCollapsed: boolean
  intCollapsed: boolean
  isDragging: boolean
  startLabDrag: (event: ReactPointerEvent<HTMLElement>) => void
  startIntDrag: (event: ReactPointerEvent<HTMLElement>) => void
  toggleLab: () => void
  toggleInt: () => void
}

export function useWorkspaceRails(containerRef: RefObject<HTMLElement | null>): WorkspaceRails {
  const [labWidth, setLabWidth] = useState(LAB_DEFAULT)
  const [intWidth, setIntWidth] = useState(INT_DEFAULT)
  const [labCollapsed, setLabCollapsed] = useState(false)
  const [intCollapsed, setIntCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Hydrate from localStorage after mount (kept out of the useState initializer
  // so server and first client render agree — no hydration mismatch).
  useEffect(() => {
    const stored = readStoredRails()
    if (stored) {
      setLabWidth(stored.lab)
      setIntWidth(stored.int)
      setLabCollapsed(stored.labCollapsed)
      setIntCollapsed(stored.intCollapsed)
    }
  }, [])

  // Persist whenever a width or collapsed flag settles.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lab: labWidth, int: intWidth, labCollapsed, intCollapsed })
      )
    } catch {
      // ignore quota / privacy-mode write failures
    }
  }, [labWidth, intWidth, labCollapsed, intCollapsed])

  const toggleLab = useCallback(() => setLabCollapsed((value) => !value), [])
  const toggleInt = useCallback(() => setIntCollapsed((value) => !value), [])

  // Shared pointer-capture drag loop; `apply` maps the pointer's x to a new width.
  const startDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      apply: (clientX: number, rect: DOMRect) => void
    ) => {
      const container = containerRef.current
      if (!container) return
      event.preventDefault()
      const handle = event.currentTarget
      const rect = container.getBoundingClientRect()
      handle.setPointerCapture(event.pointerId)
      setIsDragging(true)

      const onMove = (move: PointerEvent) => apply(move.clientX, rect)
      const onUp = () => {
        setIsDragging(false)
        handle.releasePointerCapture?.(event.pointerId)
        handle.removeEventListener("pointermove", onMove)
        handle.removeEventListener("pointerup", onUp)
        handle.removeEventListener("pointercancel", onUp)
      }
      handle.addEventListener("pointermove", onMove)
      handle.addEventListener("pointerup", onUp)
      handle.addEventListener("pointercancel", onUp)
    },
    [containerRef]
  )

  const startLabDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) =>
      startDrag(event, (clientX, rect) => setLabWidth(clamp(clientX - rect.left, LAB_MIN, LAB_MAX))),
    [startDrag]
  )

  const startIntDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) =>
      startDrag(event, (clientX, rect) => setIntWidth(clamp(rect.right - clientX, INT_MIN, INT_MAX))),
    [startDrag]
  )

  return {
    labWidth,
    intWidth,
    labCollapsed,
    intCollapsed,
    isDragging,
    startLabDrag,
    startIntDrag,
    toggleLab,
    toggleInt,
  }
}
