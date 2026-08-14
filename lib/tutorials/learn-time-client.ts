/**
 * Client-side active-time meter for Learn lessons.
 *
 * Measures ACTIVE time — tab visible and input seen recently — not wall clock, so a tab left
 * open overnight contributes nothing. Reading generates few events, so the idle timeout is
 * generous (3 min past the last scroll/keypress/pointer). Deliberately visibility+idle based
 * rather than focus based: a learner reading the lesson in a split screen while typing in
 * their own editor still counts, up to one idle timeout.
 *
 * Flushes are sparse by design — lesson switch, tab hidden, page teardown, and a 5-minute
 * heartbeat as a loss cap for crashed tabs — because every flush is a Firestore write on the
 * server. The server (`learn-time.ts`) clamps every reported delta to wall-clock elapsed, so
 * nothing here is trusted; this module just tries to be honest.
 *
 * Fire-and-forget like `item-responses-client.ts`: never throws, never retries, never
 * surfaces a failure, and signed-out learners drop silently (Learn is deliberately ungated).
 */
import { authHeaders } from "./learn-api-client"
import type { TutorialLevelId } from "./types"

const ENDPOINT = "/api/tutorials/learn-time"

/** No input for this long → the learner has walked away; stop crediting at the cutoff. */
export const IDLE_TIMEOUT_MS = 3 * 60 * 1000

/** Heartbeat flush while actively studying. Matches MAX_FLUSH_ACTIVE_MS server-side (+slack). */
export const PERIODIC_FLUSH_MS = 5 * 60 * 1000

/** How often the idle cutoff is evaluated. */
const IDLE_CHECK_INTERVAL_MS = 30 * 1000

/** Below this a drained delta is dust — dropped unless it carries the open. */
const MIN_REPORT_MS = 1000

/** Two mounts of one lesson within this window are one open (StrictMode, fast remounts). */
const OPEN_DEDUPE_MS = 30 * 1000

/**
 * The accumulation state machine, extracted pure (injectable clock) because the
 * banked-vs-running arithmetic is the part worth unit testing. One meter per lesson visit.
 */
export class LearnTimeMeter {
  private activeSince: number | null = null
  private lastActivityAt: number
  private pendingMs = 0

  constructor(private readonly clock: () => number = () => Date.now()) {
    this.lastActivityAt = this.clock()
  }

  /** Input observed (scroll, key, pointer). Restarts counting after an idle pause. */
  activity(): void {
    const now = this.clock()
    this.lastActivityAt = now
    if (this.activeSince === null) this.activeSince = now
  }

  /** Start counting (mount, tab became visible). Idempotent while already counting. */
  resume(): void {
    const now = this.clock()
    this.lastActivityAt = now
    if (this.activeSince === null) this.activeSince = now
  }

  /** Stop counting and bank the running span (tab hidden, teardown). */
  pause(): void {
    if (this.activeSince === null) return
    this.pendingMs += Math.max(0, this.clock() - this.activeSince)
    this.activeSince = null
  }

  /**
   * Periodic idle sweep. Past the timeout, bank only up to `lastActivity + timeout` — the
   * learner gets at most one idle-timeout of credit after walking away, never the whole gap.
   */
  checkIdle(): void {
    if (this.activeSince === null) return
    const now = this.clock()
    if (now - this.lastActivityAt <= IDLE_TIMEOUT_MS) return
    const cutoff = Math.min(now, this.lastActivityAt + IDLE_TIMEOUT_MS)
    this.pendingMs += Math.max(0, cutoff - this.activeSince)
    this.activeSince = null
  }

  /** Bank the running span without stopping the count, then return and clear the total. */
  drain(): number {
    if (this.activeSince !== null) {
      const now = this.clock()
      this.pendingMs += Math.max(0, now - this.activeSince)
      this.activeSince = now
    }
    const drained = this.pendingMs
    this.pendingMs = 0
    return drained
  }
}

interface ActiveTracking {
  lessonId: string
  levelId: TutorialLevelId
  meter: LearnTimeMeter
  /** True until the first successful hand-off of this visit's open to a flush. */
  openPending: boolean
  teardown: () => void
}

let current: ActiveTracking | null = null

/** Last open reported per lesson, for the StrictMode/remount dedupe window. */
const lastOpenAt = new Map<string, number>()

async function send(payload: {
  lessonId: string
  levelId: TutorialLevelId
  activeMs: number
  opened?: boolean
}): Promise<void> {
  try {
    const headers = await authHeaders()
    if (!headers) return
    await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      // Lets a teardown-triggered flush survive the page unload that caused it.
      keepalive: true,
    })
  } catch {
    // Deliberately silent: see the module docblock.
  }
}

function flushCurrent(): void {
  if (!current) return
  const activeMs = Math.round(current.meter.drain())
  const opened = current.openPending
  if (activeMs < MIN_REPORT_MS && !opened) return
  current.openPending = false
  void send({
    lessonId: current.lessonId,
    levelId: current.levelId,
    activeMs,
    ...(opened ? { opened: true } : {}),
  })
}

/**
 * Begin metering a lesson visit. Returns the stop function (pause + final flush + unbind).
 * Starting a new lesson stops the previous one first, so there is never more than one meter
 * running — which is also what makes the server's per-lesson wall-clock clamp sound.
 */
export function startLearnTimeTracking(lessonId: string, levelId: TutorialLevelId): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {}
  current?.teardown()

  const meter = new LearnTimeMeter()
  if (document.visibilityState === "visible") meter.resume()

  const now = Date.now()
  const openedRecently =
    now - (lastOpenAt.get(lessonId) ?? Number.NEGATIVE_INFINITY) < OPEN_DEDUPE_MS
  if (!openedRecently) lastOpenAt.set(lessonId, now)

  const onActivity = () => meter.activity()
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      meter.pause()
      flushCurrent()
    } else {
      meter.resume()
    }
  }
  const onPageHide = () => {
    meter.pause()
    flushCurrent()
  }

  // Capture phase so a widget calling stopPropagation cannot hide the learner's activity.
  const activityEvents: Array<keyof WindowEventMap> = [
    "pointerdown",
    "pointermove",
    "keydown",
    "wheel",
    "scroll",
    "touchstart",
  ]
  for (const event of activityEvents) {
    window.addEventListener(event, onActivity, { capture: true, passive: true })
  }
  document.addEventListener("visibilitychange", onVisibilityChange)
  window.addEventListener("pagehide", onPageHide)

  const idleInterval = setInterval(() => meter.checkIdle(), IDLE_CHECK_INTERVAL_MS)
  const flushInterval = setInterval(flushCurrent, PERIODIC_FLUSH_MS)

  let stopped = false
  const teardown = () => {
    if (stopped) return
    stopped = true
    meter.pause()
    flushCurrent()
    clearInterval(idleInterval)
    clearInterval(flushInterval)
    for (const event of activityEvents) {
      window.removeEventListener(event, onActivity, { capture: true })
    }
    document.removeEventListener("visibilitychange", onVisibilityChange)
    window.removeEventListener("pagehide", onPageHide)
    if (current?.meter === meter) current = null
  }

  current = { lessonId, levelId, meter, openPending: !openedRecently, teardown }
  return teardown
}

/** Test seam: drop all tracking state without flushing. */
export function __resetLearnTimeTrackingForTests(): void {
  current = null
  lastOpenAt.clear()
}
