import { describe, it, expect } from "vitest"
import {
  deriveDependencyAlerts,
  runDependencyProbes,
  summarizeProbes,
  type DependencyProbe,
  type ProbeResult,
} from "../dependency-probes"

/**
 * The System Health dashboard used to be structurally incapable of going red:
 * cards were initialised "healthy" and never reassigned. These tests pin the
 * three properties that make the replacement trustworthy: failure surfaces,
 * a wedged dependency cannot hang the poll, and "unknown" is never healthy.
 */

function probe(overrides: Partial<DependencyProbe> & Pick<DependencyProbe, "id" | "run">) {
  return {
    label: overrides.id,
    critical: false,
    ...overrides,
  } as DependencyProbe
}

function resultOf(results: ProbeResult[], id: string): ProbeResult {
  const found = results.find((result) => result.id === id)
  if (!found) throw new Error(`No probe result for ${id}`)
  return found
}

describe("runDependencyProbes", () => {
  it("reports a failing probe as unhealthy instead of swallowing the error", async () => {
    const results = await runDependencyProbes([
      probe({ id: "broken", run: async () => Promise.reject(new Error("connection refused")) }),
    ])

    expect(resultOf(results, "broken").status).toBe("unhealthy")
    expect(resultOf(results, "broken").detail).toContain("connection refused")
  })

  it("does not let one broken probe hide the others", async () => {
    const results = await runDependencyProbes([
      probe({ id: "broken", run: async () => Promise.reject(new Error("boom")) }),
      probe({ id: "fine", run: async () => ({ status: "healthy", detail: "ok" }) }),
    ])

    expect(resultOf(results, "broken").status).toBe("unhealthy")
    expect(resultOf(results, "fine").status).toBe("healthy")
  })

  it("times a probe out rather than hanging the health poll", async () => {
    // A probe that ignores its abort signal entirely, which is the case the
    // AbortSignal alone cannot defend against.
    const wedged = probe({
      id: "wedged",
      run: () => new Promise<never>(() => {}),
    })

    const started = Date.now()
    const results = await runDependencyProbes([wedged], { timeoutMs: 30 })
    const elapsed = Date.now() - started

    expect(resultOf(results, "wedged").status).toBe("degraded")
    expect(resultOf(results, "wedged").detail).toContain("30ms")
    // Generous upper bound: the point is that it returned at all.
    expect(elapsed).toBeLessThan(2000)
  })

  it("aborts the signal it hands the probe when the timeout fires", async () => {
    let aborted = false
    const results = await runDependencyProbes(
      [
        probe({
          id: "abortable",
          run: (signal) =>
            new Promise((resolve) => {
              signal.addEventListener("abort", () => {
                aborted = true
                resolve({ status: "unhealthy", detail: "aborted" })
              })
            }),
        }),
      ],
      { timeoutMs: 20 }
    )

    expect(aborted).toBe(true)
    expect(results).toHaveLength(1)
  })

  it("runs probes concurrently so total time is not the sum of the parts", async () => {
    const slow = (id: string) =>
      probe({
        id,
        run: () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ status: "healthy", detail: "ok" }), 60)
          ),
      })

    const started = Date.now()
    await runDependencyProbes([slow("a"), slow("b"), slow("c")], { timeoutMs: 1000 })
    expect(Date.now() - started).toBeLessThan(150)
  })

  it("measures latency for measured probes and reports null for unknown ones", async () => {
    const results = await runDependencyProbes([
      probe({ id: "measured", run: async () => ({ status: "healthy", detail: "ok" }) }),
      probe({
        id: "unmeasured",
        run: async () => ({ status: "unknown", detail: "no credential" }),
      }),
    ])

    expect(resultOf(results, "measured").latencyMs).not.toBeNull()
    // A number would imply we timed something. We did not.
    expect(resultOf(results, "unmeasured").latencyMs).toBeNull()
  })

  it("demotes a healthy but slow probe to degraded", async () => {
    const results = await runDependencyProbes([
      probe({
        id: "sluggish",
        degradedAboveMs: 10,
        run: () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ status: "healthy", detail: "ok" }), 40)
          ),
      }),
    ])

    expect(resultOf(results, "sluggish").status).toBe("degraded")
    expect(resultOf(results, "sluggish").detail).toContain("slow")
  })
})

describe("summarizeProbes", () => {
  const result = (overrides: Partial<ProbeResult>): ProbeResult => ({
    id: "x",
    label: "X",
    critical: false,
    status: "healthy",
    detail: "",
    latencyMs: 1,
    ...overrides,
  })

  it("is healthy only when every probe measured healthy", () => {
    const summary = summarizeProbes([result({ id: "a" }), result({ id: "b" })])
    expect(summary.status).toBe("healthy")
    expect(summary.healthy).toBe(2)
  })

  it("never counts an unknown dependency among the healthy ones", () => {
    const summary = summarizeProbes([
      result({ id: "a" }),
      result({ id: "b", status: "unknown", latencyMs: null }),
    ])
    expect(summary.unknown).toBe(1)
    expect(summary.healthy).toBe(1)
  })

  it("an unknown CRITICAL dependency makes the platform unknown", () => {
    const summary = summarizeProbes([
      result({ id: "a" }),
      result({ id: "firestore", critical: true, status: "unknown", latencyMs: null }),
    ])
    expect(summary.status).toBe("unknown")
  })

  it("an unknown non-critical dependency does not block green", () => {
    // Sentry reports unknown even when correctly configured, because delivery
    // cannot be proven without sending a paid event. Letting that hold the
    // aggregate below healthy forever produced an indicator that could never be
    // green, which teaches its reader to ignore it.
    const summary = summarizeProbes([
      result({ id: "firestore", critical: true }),
      result({ id: "sentry", status: "unknown", latencyMs: null }),
    ])
    expect(summary.status).toBe("healthy")
    expect(summary.unknown).toBe(1)
  })

  it("treats an empty probe list as unknown, not healthy", () => {
    // Measuring nothing is not evidence of health.
    expect(summarizeProbes([]).status).toBe("unknown")
  })

  it("goes unhealthy when a critical dependency fails", () => {
    const summary = summarizeProbes([
      result({ id: "firestore", critical: true, status: "unhealthy" }),
      result({ id: "brevo" }),
    ])
    expect(summary.status).toBe("unhealthy")
  })

  it("degrades rather than fails when a non-critical dependency is down", () => {
    const summary = summarizeProbes([
      result({ id: "firestore", critical: true }),
      result({ id: "brevo", status: "unhealthy" }),
    ])
    expect(summary.status).toBe("degraded")
  })

  it("degrades on a slow dependency", () => {
    const summary = summarizeProbes([result({ id: "stripe", status: "degraded" })])
    expect(summary.status).toBe("degraded")
  })

  it("prefers the worst signal when statuses are mixed", () => {
    const summary = summarizeProbes([
      result({ id: "firestore", critical: true, status: "unhealthy" }),
      result({ id: "stripe", status: "degraded" }),
      result({ id: "sentry", status: "unknown", latencyMs: null }),
    ])
    expect(summary.status).toBe("unhealthy")
    expect(summary).toMatchObject({ unhealthy: 1, degraded: 1, unknown: 1, total: 3 })
  })
})

describe("deriveDependencyAlerts", () => {
  const result = (overrides: Partial<ProbeResult>): ProbeResult => ({
    id: "x",
    label: "X",
    critical: false,
    status: "healthy",
    detail: "",
    latencyMs: 1,
    ...overrides,
  })

  it("raises nothing for a working dependency", () => {
    expect(deriveDependencyAlerts([result({ id: "stripe" })])).toEqual([])
  })

  it("raises one alert per non-healthy dependency, loudest first", () => {
    const alerts = deriveDependencyAlerts([
      result({ id: "sentry", label: "Sentry", status: "unknown", detail: "unverifiable" }),
      result({ id: "stripe", label: "Stripe", status: "degraded", detail: "slow" }),
      result({ id: "firestore", label: "Firestore", status: "unhealthy", detail: "refused" }),
    ])

    expect(alerts.map((alert) => alert.type)).toEqual(["error", "warning", "info"])
    expect(alerts[0].id).toBe("dependency-firestore")
  })

  it("keeps ids stable across polls so an acknowledgement can outlive a refresh", () => {
    const failing = result({ id: "brevo", label: "Brevo", status: "unhealthy", detail: "401" })
    expect(deriveDependencyAlerts([failing])[0].id).toBe(
      deriveDependencyAlerts([failing])[0].id
    )
  })

  it("changes the signature when the failure changes, so an old ack cannot cover it", () => {
    const first = deriveDependencyAlerts([
      result({ id: "brevo", status: "unhealthy", detail: "credentials rejected" }),
    ])[0]
    const second = deriveDependencyAlerts([
      result({ id: "brevo", status: "unhealthy", detail: "vendor 503" }),
    ])[0]

    expect(first.id).toBe(second.id)
    expect(first.signature).not.toBe(second.signature)
  })
})
