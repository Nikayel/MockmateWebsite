import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

const h = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  reads: 0,
  duringRead: undefined as (() => void) | undefined,
}))
vi.mock("firebase-admin/firestore", async (importOriginal) => {
  const original = await importOriginal<typeof import("firebase-admin/firestore")>()
  return {
    ...original,
    FieldValue: {
      increment: (n: number) => ({ incrementBy: n }),
      serverTimestamp: () => "server-timestamp",
    },
  }
})
vi.mock("@/lib/firebase-admin", () => {
  function doc(path: string) {
    return {
      path,
      id: path.split("/").at(-1),
      collection: (name: string) => collection(`${path}/${name}`),
      get: async () => {
        const value = structuredClone(h.rows.get(path))
        return {
          exists: value !== undefined,
          data: () => value,
          get: (key: string) => value?.[key],
        }
      },
    }
  }
  function collection(path: string) {
    const filters: Array<[string, string, unknown]> = []
    let maximum = Infinity
    let cursor = ""
    let order = ""
    const query = {
      doc: (id: string) => doc(`${path}/${id}`),
      where: (key: string, op: string, value: unknown) => {
        filters.push([key, op, value])
        return query
      },
      orderBy: (key: string) => {
        order = key
        return query
      },
      limit: (n: number) => {
        maximum = n
        return query
      },
      startAfter: (last: { id: string }) => {
        cursor = last.id
        return query
      },
      select: () => query,
      get: async () => {
        h.reads++
        h.duringRead?.()
        const all = [...h.rows]
          .filter(
            ([key, value]) =>
              key.startsWith(`${path}/`) &&
              !key.slice(path.length + 1).includes("/") &&
              filters.every(([field, op, match]) =>
                op === "==" ? value[field] === match : value[field] != null
              )
          )
          .sort(
            ([a, av], [b, bv]) =>
              String(bv[order]).localeCompare(String(av[order])) || a.localeCompare(b)
          )
        const start = cursor ? all.findIndex(([key]) => key === `${path}/${cursor}`) + 1 : 0
        return {
          docs: all
            .slice(start, start + maximum)
            .map(([key, value]) => ({ id: key.split("/").at(-1), data: () => value })),
        }
      },
    }
    return query
  }
  function write(ref: { path: string }, fields: Record<string, unknown>, merge = false) {
    const previous = h.rows.get(ref.path) ?? {}
    const values = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        value && typeof value === "object" && "incrementBy" in value
          ? Number(previous[key] ?? 0) + Number(value.incrementBy)
          : value,
      ])
    )
    h.rows.set(ref.path, { ...(merge ? previous : {}), ...values })
  }
  return {
    adminDb: {
      collection,
      runTransaction: async (run: (transaction: unknown) => Promise<unknown>) =>
        run({
          get: (ref: ReturnType<typeof doc>) => ref.get(),
          set: (
            ref: { path: string },
            value: Record<string, unknown>,
            options?: { merge?: boolean }
          ) => write(ref, value, options?.merge),
          update: (ref: { path: string }, value: Record<string, unknown>) =>
            write(ref, value, true),
        }),
    },
  }
})
vi.mock("@/lib/usage-tracking", () => ({ trackUsageEvent: async () => undefined }))

import { loadUserMetrics } from "../repository"
import { persistFinalSession } from "../persist-final"
import { completeSessionMetrics } from "@/lib/session-metrics"

const now = "2026-10-25T12:00:00.000Z"
const session = (id: string, fields = {}) =>
  h.rows.set(`interview_sessions/${id}`, {
    user_id: "u1",
    type: "bugfix",
    scenario_id: "monitor",
    started_at: "2026-10-25T11:30:00Z",
    completed_at: now,
    feedback_status: "complete",
    performance_score: 81,
    ...fields,
  })
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(now))
  h.rows.clear()
  h.reads = 0
  h.duringRead = undefined
})
afterEach(() => vi.useRealTimers())

describe("canonical metrics persistence", () => {
  it("repairs old inflated totals and reads beyond a query page", async () => {
    h.rows.set("user_stats/u1", {
      totalSessions: 999,
      totalScore: 0,
      patternStats: { stale: { sessions: 999 } },
    })
    for (let i = 0; i < 260; i++) session(`page-${i}`)
    session("other-user", { user_id: "u2", performance_score: 0 })
    const result = await loadUserMetrics("u1")
    expect(result.overview).toMatchObject({ totalSessions: 260, averageScore: 81 })
    expect(h.reads).toBe(2)
    expect(h.rows.get("user_stats/u1")?.totalSessions).toBe(260)
    expect(h.rows.get("user_stats/u1")?.patternStats).not.toHaveProperty("stale")
  })
  it("caches a complete snapshot and refreshes after expiry", async () => {
    session("cache")
    await loadUserMetrics("u1")
    await loadUserMetrics("u1")
    expect(h.reads).toBe(1)
    vi.advanceTimersByTime(60_001)
    await loadUserMetrics("u1")
    expect(h.reads).toBe(2)
  })
  it("atomically invalidates the cache when final feedback replaces fallback scores", async () => {
    session("upgrade", { feedback_source: "fallback", performance_score: 20 })
    expect((await loadUserMetrics("u1")).overview.averageScore).toBe(20)
    expect(
      await persistFinalSession("upgrade", "u1", {
        feedback_status: "complete",
        feedback_source: "stream",
        performance_score: 81,
      })
    ).toBe(true)
    expect((await loadUserMetrics("u1")).overview.averageScore).toBe(81)
    expect((await loadUserMetrics("u1")).overview.totalSessions).toBe(1)
  })
  it("does not let a racing fallback replace real feedback", async () => {
    session("final", { feedback_source: "stream" })
    expect(
      await persistFinalSession("final", "u1", {
        feedback_status: "complete",
        feedback_source: "fallback",
        performance_score: 0,
      })
    ).toBe(false)
    expect(h.rows.get("interview_sessions/final")?.performance_score).toBe(81)
  })
  it("keeps a frozen score when written feedback arrives with different scores", async () => {
    session("frozen", {
      feedback_status: "queued",
      feedback_score_frozen: true,
      performance_score: 76,
      score_breakdown: { understandingScore: 70 },
    })
    expect((await loadUserMetrics("u1")).overview.averageScore).toBe(76)
    expect(
      await persistFinalSession("frozen", "u1", {
        feedback_status: "complete",
        feedback_source: "server",
        performance_score: 99,
        score_breakdown: { understandingScore: 99 },
      })
    ).toBe(true)
    expect(h.rows.get("interview_sessions/frozen")).toMatchObject({
      performance_score: 76,
      score_breakdown: { understandingScore: 70 },
    })
    expect((await loadUserMetrics("u1")).overview.averageScore).toBe(76)
  })
  it("does not let fallback complete a session with a queued frozen score", async () => {
    session("frozen", { feedback_status: "queued", feedback_score_frozen: true })
    expect(
      await persistFinalSession("frozen", "u1", {
        feedback_status: "complete",
        feedback_source: "fallback",
        performance_score: 0,
      })
    ).toBe(false)
    expect(h.rows.get("interview_sessions/frozen")?.feedback_status).toBe("queued")
  })
  it("does not cache an obsolete revision when feedback arrives during rebuild", async () => {
    session("race")
    h.duringRead = () => {
      h.duringRead = undefined
      h.rows.set("user_stats/u1", { metrics_revision: 1 })
      session("race", { performance_score: 90 })
    }
    expect((await loadUserMetrics("u1")).overview.averageScore).toBe(90)
    expect(h.reads).toBe(2)
  })
  it("checks ownership again inside the final-write transaction", async () => {
    session("not-owned", { user_id: "u2" })
    await expect(persistFinalSession("not-owned", "u1", {})).rejects.toThrow("ownership")
    expect(h.rows.has("user_stats/u1")).toBe(false)
  })
  it("completion retries neither overwrite lab feedback nor double-count metrics", async () => {
    session("guided", {
      is_guided_lab: true,
      score_breakdown: null,
      technical_score: null,
      performance_score: 100,
      mastery_score: 100,
    })
    const completion = {
      sessionId: "guided",
      finalCode: "return 'NO DATA'",
      language: "python",
      testsPassed: 1,
      testsTotal: 1,
      efficiencyScore: 50,
    }
    await completeSessionMetrics(completion)
    await completeSessionMetrics(completion)
    expect(h.rows.get("interview_sessions/guided")).toMatchObject({
      performance_score: 100,
      technical_score: null,
      score_breakdown: null,
    })
    const result = await loadUserMetrics("u1")
    expect(result.overview.totalSessions).toBe(0)
    expect(result.guidedLabs.sessions).toBe(1)
    expect(h.rows.get("user_learning_state/u1")?.total_sessions).toBe(1)
  })
})
