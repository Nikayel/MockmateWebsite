import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const state = vi.hoisted(() => ({
  srHistoryThrows: false,
  srHistoryDocs: [] as Array<{ user_id: string; sent_at?: string; created_at: string }>,
  learningStates: [] as Array<{ id: string; data: Record<string, unknown> }>,
  problemsByUser: new Map<string, Array<Record<string, unknown>>>(),
  profilesByUser: new Map<string, Record<string, unknown>>(),
  sentEmails: [] as Array<{ userId: string; topic: string }>,
  loggedNotifications: [] as Array<Record<string, unknown>>,
}))

vi.mock("@/lib/cron-auth", () => ({
  verifyCronRequest: vi.fn(() => ({ ok: true })),
}))

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/email/consent/maintenance", () => ({
  maintainEmailConsent: vi.fn(async () => undefined),
}))

vi.mock("@/lib/practice-plan/reminder-worker", () => ({
  processPracticeReminders: vi.fn(async () => ({
    sent: 0,
    skipped: 0,
    failed: 0,
    uncertain: 0,
  })),
}))

vi.mock("@/lib/services/session-notifications", () => ({
  checkStreakAtRisk: vi.fn(async () => false),
  sendDailyReminderIfNeeded: vi.fn(async () => false),
}))

vi.mock("@/lib/quota/yearly-quota", () => ({
  updateQuotaToFree: vi.fn(async () => undefined),
  resetYearlySubscriberQuota: vi.fn(async () => undefined),
}))

vi.mock("@/lib/email", () => ({
  DEFAULT_TIMEZONE: "America/Los_Angeles",
  isReasonableHourForUser: vi.fn(() => ({ isReasonable: true, localHour: 12 })),
  isInQuietHours: vi.fn(() => false),
  canSendEmail: vi.fn(() => ({ allowed: true })),
  isToday: vi.fn(() => false),
  getTodayInTimezone: vi.fn(() => "2026-11-22"),
  getDateInTimezone: vi.fn(() => "2026-11-22"),
  sendWelcomeEmail: vi.fn(async () => ({ success: true })),
  sendActivationNudgeEmail: vi.fn(async () => ({ success: true })),
  sendFirstSessionFeedbackEmail: vi.fn(async () => ({ success: true })),
  sendInactivityEmail: vi.fn(async () => ({ success: true })),
  sendDailyRoadmapEmail: vi.fn(async () => ({ success: true })),
  sendInterviewCountdownEmail: vi.fn(async () => ({ success: true })),
  sendBehindScheduleEmail: vi.fn(async () => ({ success: true })),
  sendYearlyExpiredEmail: vi.fn(async () => ({ success: true })),
  sendYearlyExpiryReminderEmail: vi.fn(async () => ({ success: true })),
  sendSpacedRepetitionEmail: vi.fn(
    async (userId: string, _email: string, data: { topic: string }) => {
      state.sentEmails.push({ userId, topic: data.topic })
      return { success: true }
    }
  ),
}))

function emptySnap() {
  return { empty: true, docs: [] as Array<{ id: string; data: () => Record<string, unknown> }> }
}

function makeQuery(
  collectionName: string,
  filters: Array<{ field: string; op: string; value: unknown }> = []
) {
  const query = {
    where: (field: string, op: string, value: unknown) =>
      makeQuery(collectionName, [...filters, { field, op, value }]),
    orderBy: () => query,
    limit: () => query,
    get: async () => {
      if (collectionName === "email_notifications") {
        const isSR = filters.some(
          (f) => f.field === "email_type" && f.value === "spaced_repetition"
        )
        if (isSR) {
          if (state.srHistoryThrows) {
            throw new Error("FAILED_PRECONDITION: index missing")
          }
          return {
            empty: state.srHistoryDocs.length === 0,
            docs: state.srHistoryDocs.map((d, idx) => ({ id: `sr-${idx}`, data: () => d })),
          }
        }
        return emptySnap()
      }

      if (collectionName === "user_learning_state") {
        // Inactivity query filters by last_session_at; SR scan has no filters.
        if (filters.length > 0) return emptySnap()
        return {
          empty: state.learningStates.length === 0,
          docs: state.learningStates.map((row) => ({ id: row.id, data: () => row.data })),
        }
      }

      return emptySnap()
    },
  }
  return query
}

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => ({
      ...makeQuery(name),
      add: vi.fn(async (record: Record<string, unknown>) => {
        if (name === "email_notifications") state.loggedNotifications.push(record)
        return { id: "notif-1" }
      }),
      doc: (docId: string) => ({
        get: async () => {
          if (name === "profiles") {
            const p = state.profilesByUser.get(docId)
            return { exists: Boolean(p), data: () => p }
          }
          return { exists: false, data: () => undefined }
        },
        update: vi.fn(async () => undefined),
        set: vi.fn(async () => undefined),
        collection: (sub: string) => ({
          where: () => ({
            limit: () => ({
              get: async () => {
                if (name === "problem_mastery" && sub === "problems") {
                  const rows = state.problemsByUser.get(docId) ?? []
                  return {
                    empty: rows.length === 0,
                    docs: rows.map((r, i) => ({ id: `p-${i}`, data: () => r })),
                  }
                }
                return emptySnap()
              },
            }),
          }),
          limit: () => ({
            get: async () => {
              if (name === "problem_mastery" && sub === "problems") {
                const rows = state.problemsByUser.get(docId) ?? []
                return {
                  empty: rows.length === 0,
                  docs: rows.map((r, i) => ({ id: `p-${i}`, data: () => r })),
                }
              }
              return emptySnap()
            },
          }),
        }),
      }),
    }),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  state.srHistoryThrows = false
  state.srHistoryDocs = []
  state.learningStates = []
  state.problemsByUser.clear()
  state.profilesByUser.clear()
  state.sentEmails = []
  state.loggedNotifications = []
})

describe("GET /api/cron/email-notifications spaced-repetition backoff", () => {
  it("skips backed-off and dormant users while sending to an active overdue user", async () => {
    const now = Date.now()
    const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString()

    // 1. Active user, no unanswered SR sends -> SHOULD SEND (attempt #1)
    // 2. Backed-off user, last session 5d ago, sent 1 SR email 2d ago (needs 3d wait) -> SKIP
    // 3. Dormant user, last session 45d ago, no recent SR history -> SKIP
    state.learningStates = [
      { id: "u-active", data: { user_id: "u-active", last_session_at: daysAgo(3) } },
      { id: "u-backoff", data: { user_id: "u-backoff", last_session_at: daysAgo(5) } },
      { id: "u-dormant", data: { user_id: "u-dormant", last_session_at: daysAgo(45) } },
    ]
    state.srHistoryDocs = [{ user_id: "u-backoff", sent_at: daysAgo(2), created_at: daysAgo(2) }]

    for (const uid of ["u-active", "u-backoff", "u-dormant"]) {
      state.profilesByUser.set(uid, {
        id: uid,
        email: `${uid}@example.com`,
        full_name: uid,
      })
      state.problemsByUser.set(uid, [
        {
          problem_id: "two-sum",
          scenario_id: "two-sum",
          title: "Two Sum",
          pattern: "hash-map",
          next_review_at: daysAgo(2),
          last_score: 70,
          review_count: 1,
          mastery_level: "learning",
        },
      ])
    }

    const { GET } = await import("./route")
    const response = (await GET(
      new NextRequest("http://localhost/api/cron/email-notifications")
    )) as unknown as {
      status: number
      data: { results: { spacedRepetitionEmails: { sent: number; skipped: number } } }
    }

    expect(response.status).toBe(200)
    expect(state.sentEmails).toEqual([{ userId: "u-active", topic: "Two Sum" }])
    expect(response.data.results.spacedRepetitionEmails.sent).toBe(1)
    expect(response.data.results.spacedRepetitionEmails.skipped).toBe(2)
    expect(state.loggedNotifications[0]?.metadata).toMatchObject({ backoff_attempt: 1 })
  })

  it("fails closed when the spaced-repetition history query errors instead of spamming", async () => {
    const now = Date.now()
    const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString()

    state.srHistoryThrows = true
    state.learningStates = [
      { id: "u-active", data: { user_id: "u-active", last_session_at: daysAgo(3) } },
    ]
    state.profilesByUser.set("u-active", { id: "u-active", email: "u@example.com" })
    state.problemsByUser.set("u-active", [
      {
        problem_id: "two-sum",
        scenario_id: "two-sum",
        title: "Two Sum",
        next_review_at: daysAgo(2),
      },
    ])

    const { GET } = await import("./route")
    const response = (await GET(
      new NextRequest("http://localhost/api/cron/email-notifications")
    )) as unknown as {
      status: number
      data: { results: { spacedRepetitionEmails: { sent: number }; errors: string[] } }
    }

    expect(response.status).toBe(200)
    expect(state.sentEmails).toHaveLength(0)
    expect(response.data.results.spacedRepetitionEmails.sent).toBe(0)
    expect(response.data.results.errors.some((e) => e.includes("Spaced repetition"))).toBe(true)
  })
})
