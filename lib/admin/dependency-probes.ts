/**
 * Dependency probe framework for the admin System Health dashboard.
 *
 * The dashboard this replaces could not go red. Service cards were initialised
 * "healthy" and never reassigned, the 24h latency series was `Math.random()`,
 * and uptime was the literal 99.9. A dashboard that cannot go red is worse than
 * no dashboard, because it actively tells you nothing is wrong.
 *
 * The rules this framework enforces:
 *
 * - A probe that throws is unhealthy. Failure is never swallowed into green.
 * - A probe that does not answer within its timeout is degraded, and cannot
 *   hang the route: every probe is raced against its own timer, so one wedged
 *   vendor costs the poll one timeout and nothing more.
 * - "unknown" means nothing was measured, and it never aggregates to healthy.
 * - Probes must be free. A dependency that cannot be checked without paid API
 *   spend reports unknown rather than guessing.
 */

/**
 * healthy/degraded/unhealthy are measurements. `unknown` is the honest fourth
 * state: the probe ran but could not establish anything (no credential
 * configured, no free way to check). It is deliberately not a synonym for
 * healthy anywhere in this file.
 */
export type ProbeStatus = "healthy" | "degraded" | "unhealthy" | "unknown"

/** What a probe body reports. Latency is measured by the runner, not the probe. */
export interface ProbeOutcome {
  status: ProbeStatus
  /** One short sentence an admin can act on. Rendered verbatim on the card. */
  detail: string
}

export interface DependencyProbe {
  /** Stable id, used as the React key and in alert ids. */
  id: string
  /** Human label for the card. */
  label: string
  /**
   * True when losing this dependency takes the product down rather than
   * degrading it. Only critical failures make the whole platform unhealthy.
   */
  critical: boolean
  /**
   * A healthy answer slower than this is reported as degraded. Omit when the
   * dependency has no meaningful latency budget.
   */
  degradedAboveMs?: number
  /**
   * Perform the check. Must be free of paid API spend. The signal aborts at the
   * timeout; a probe that ignores it is still raced out by the runner.
   */
  run: (signal: AbortSignal) => Promise<ProbeOutcome>
}

export interface ProbeResult extends ProbeOutcome {
  id: string
  label: string
  critical: boolean
  /** Measured wall-clock time, or null when nothing was measured. */
  latencyMs: number | null
}

export interface ProbeSummary {
  status: ProbeStatus
  healthy: number
  degraded: number
  unhealthy: number
  unknown: number
  total: number
}

/**
 * An alert raised by a probe result. Alerts are derived, never stored: the only
 * thing persisted about them is whether an admin acknowledged one.
 */
export interface DependencyAlert {
  /** Stable across polls, so an acknowledgement can be keyed to it. */
  id: string
  type: "error" | "warning" | "info"
  title: string
  message: string
  /**
   * The exact state that was alerted on. An acknowledgement only silences the
   * state it was given, so a dependency that fails again in a new way speaks up.
   */
  signature: string
}

/**
 * Three seconds. Long enough that a healthy vendor never trips it, short enough
 * that a wedged one does not stall a 30 second dashboard poll.
 */
export const DEFAULT_PROBE_TIMEOUT_MS = 3000

/** Keeps vendor error text off the dashboard in unbounded quantities. */
const MAX_DETAIL_LENGTH = 200

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, MAX_DETAIL_LENGTH) || "Probe threw a non-Error value"
}

/**
 * Run one probe with its own timeout.
 *
 * The timeout is enforced two ways on purpose: the AbortSignal lets a
 * well-behaved probe cancel its own request, and the Promise.race guarantees
 * the runner returns even for a probe that ignores the signal entirely.
 */
async function runOne(probe: DependencyProbe, timeoutMs: number): Promise<ProbeResult> {
  const controller = new AbortController()
  const startedAt = Date.now()
  let timer: ReturnType<typeof setTimeout> | undefined

  const timedOut = new Promise<ProbeOutcome>((resolve) => {
    timer = setTimeout(() => {
      controller.abort()
      resolve({
        status: "degraded",
        detail: `No response within ${timeoutMs}ms`,
      })
    }, timeoutMs)
  })

  const base = { id: probe.id, label: probe.label, critical: probe.critical }

  try {
    const outcome = await Promise.race([probe.run(controller.signal), timedOut])
    const latencyMs = outcome.status === "unknown" ? null : Date.now() - startedAt

    // A slow success is still a symptom worth showing, so promote it here
    // rather than making every probe body re-implement the same threshold.
    if (
      outcome.status === "healthy" &&
      probe.degradedAboveMs !== undefined &&
      latencyMs !== null &&
      latencyMs > probe.degradedAboveMs
    ) {
      return {
        ...base,
        status: "degraded",
        detail: `Reachable but slow (${latencyMs}ms, budget ${probe.degradedAboveMs}ms)`,
        latencyMs,
      }
    }

    return { ...base, ...outcome, latencyMs }
  } catch (error) {
    return {
      ...base,
      status: "unhealthy",
      detail: describeError(error),
      latencyMs: Date.now() - startedAt,
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Run every probe concurrently. Never rejects: a probe that blows up becomes an
 * unhealthy card, because a health endpoint that 500s tells an admin less than
 * one that names the broken dependency.
 */
export async function runDependencyProbes(
  probes: DependencyProbe[],
  options: { timeoutMs?: number } = {}
): Promise<ProbeResult[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS

  const settled = await Promise.allSettled(probes.map((probe) => runOne(probe, timeoutMs)))

  return settled.map((entry, index) => {
    if (entry.status === "fulfilled") return entry.value
    const probe = probes[index]
    return {
      id: probe.id,
      label: probe.label,
      critical: probe.critical,
      status: "unhealthy",
      detail: describeError(entry.reason),
      latencyMs: null,
    }
  })
}

/**
 * Collapse probe results into one platform status.
 *
 * Only a critical dependency can make the platform unhealthy; a non-critical
 * outage degrades it. An empty result set is unknown, not healthy, because
 * measuring nothing is not evidence of health.
 */
export function summarizeProbes(results: ProbeResult[]): ProbeSummary {
  const summary: ProbeSummary = {
    status: "unknown",
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
    unknown: 0,
    total: results.length,
  }

  for (const result of results) {
    summary[result.status] += 1
  }

  if (results.length === 0) {
    return summary
  }

  if (results.some((result) => result.status === "unhealthy" && result.critical)) {
    summary.status = "unhealthy"
  } else if (summary.unhealthy > 0 || summary.degraded > 0) {
    summary.status = "degraded"
  } else if (summary.unknown > 0) {
    summary.status = "unknown"
  } else {
    summary.status = "healthy"
  }

  return summary
}

/**
 * Turn probe results into the alert list the dashboard shows.
 *
 * A healthy dependency raises nothing. Everything else raises exactly one alert
 * whose id is derived from the probe, so the same outage produces the same id on
 * every poll and an acknowledgement can outlive a page refresh.
 */
export function deriveDependencyAlerts(results: ProbeResult[]): DependencyAlert[] {
  const alerts: DependencyAlert[] = []

  for (const result of results) {
    if (result.status === "healthy") continue

    const type = result.status === "unhealthy" ? "error" : result.status === "degraded" ? "warning" : "info"
    const title =
      result.status === "unhealthy"
        ? `${result.label} is failing`
        : result.status === "degraded"
          ? `${result.label} is degraded`
          : `${result.label} is unverified`

    alerts.push({
      id: `dependency-${result.id}`,
      type,
      title,
      message: result.detail,
      signature: `${result.status}:${result.detail}`,
    })
  }

  // Loudest first, so an outage is never below a card that says "unverified".
  const order = { error: 0, warning: 1, info: 2 } as const
  return alerts.sort((a, b) => order[a.type] - order[b.type])
}
