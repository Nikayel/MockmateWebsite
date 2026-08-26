/**
 * A returning guest's session doc must tell the truth about what they solved.
 *
 * POST reuses the guest's incomplete session (one doc per guest, by design),
 * but it used to return the doc unchanged even when the guest had picked a
 * DIFFERENT problem — and PUT's whitelist can never touch scenario fields, so
 * the completion landed on a doc whose topic/scenario_id still named the old
 * problem. After migration, the one session the whole lock flow sells would
 * show the wrong problem next to the score. Reuse now restamps the scenario
 * fields, and a second completion write is refused outright (the score is
 * written once; a stray autosave-era retry must not overwrite a real result).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const GUEST_ID = "guest-12345678-1234-1234-1234-123456789abc"

const state = vi.hoisted(() => ({
  existingDocs: [] as Array<{
    id: string
    data: Record<string, unknown>
    updates: Record<string, unknown>[]
  }>,
  putDocData: null as Record<string, unknown> | null,
  putUpdates: [] as Record<string, unknown>[],
}))

vi.mock("@/lib/rate-limit", () => ({
  guestSessionRateLimit: vi.fn(async () => null),
  guestApiRateLimit: vi.fn(async () => null),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({
      // POST path: query for the guest's existing sessions.
      where: () => ({
        where: () => ({
          limit: () => ({
            get: async () => ({
              empty: state.existingDocs.length === 0,
              docs: state.existingDocs.map((doc) => ({
                id: doc.id,
                data: () => doc.data,
                ref: {
                  update: async (fields: Record<string, unknown>) => {
                    doc.updates.push(fields)
                  },
                },
              })),
            }),
          }),
        }),
      }),
      // PUT path: direct doc access.
      doc: () => ({
        get: async () => ({
          exists: state.putDocData !== null,
          data: () => state.putDocData,
        }),
        update: async (fields: Record<string, unknown>) => {
          state.putUpdates.push(fields)
        },
        set: async () => {},
        id: "new-doc",
      }),
    }),
  },
}))

import { POST, PUT } from "../route"

function makeRequest(body: Record<string, unknown>) {
  return {
    headers: { get: () => null },
    json: async () => body,
  } as never
}

beforeEach(() => {
  state.existingDocs = []
  state.putDocData = null
  state.putUpdates = []
})

describe("POST /api/guest-session reusing an incomplete session", () => {
  it("restamps the scenario fields when the guest picked a different problem", async () => {
    state.existingDocs = [
      {
        id: "sess-1",
        data: { user_id: GUEST_ID, is_guest: true, scenario_id: "dsa-two-sum", topic: "Two Sum" },
        updates: [],
      },
    ]

    const response = (await POST(
      makeRequest({
        guestId: GUEST_ID,
        scenarioId: "dsa-three-sum",
        scenarioTitle: "3Sum",
        scenarioType: "dsa",
        difficulty: "medium",
      })
    )) as { status: number; data: any }

    expect(response.status).toBe(200)
    expect(response.data.sessionId).toBe("sess-1")
    expect(state.existingDocs[0].updates).toHaveLength(1)
    expect(state.existingDocs[0].updates[0]).toMatchObject({
      scenario_id: "dsa-three-sum",
      topic: "3Sum",
      difficulty: "medium",
      // The old problem's autosave must go with it: the client rehydrates
      // whatever session_state it finds, and problem A's code/chat painted
      // over problem B's statement is worse than starting clean.
      session_state: null,
    })
  })

  it("leaves the doc alone when the guest resumes the same problem", async () => {
    state.existingDocs = [
      {
        id: "sess-1",
        data: { user_id: GUEST_ID, is_guest: true, scenario_id: "dsa-two-sum", topic: "Two Sum" },
        updates: [],
      },
    ]

    const response = (await POST(
      makeRequest({
        guestId: GUEST_ID,
        scenarioId: "dsa-two-sum",
        scenarioTitle: "Two Sum",
        scenarioType: "dsa",
        difficulty: "easy",
      })
    )) as { status: number; data: any }

    expect(response.status).toBe(200)
    expect(state.existingDocs[0].updates).toHaveLength(0)
  })
})

describe("PUT /api/guest-session on an already-completed session", () => {
  it("refuses a second completion write", async () => {
    state.putDocData = {
      user_id: GUEST_ID,
      is_guest: true,
      completed_at: "2026-08-25T12:00:00.000Z",
      performance_score: 100,
    }

    const response = (await PUT(
      makeRequest({
        sessionId: "sess-1",
        guestId: GUEST_ID,
        performanceScore: 40,
        feedback: "second run",
      })
    )) as { status: number }

    expect(response.status).toBe(409)
    expect(state.putUpdates).toHaveLength(0)
  })

  it("still accepts resume-state saves after completion is refused territory", async () => {
    state.putDocData = { user_id: GUEST_ID, is_guest: true }

    const response = (await PUT(
      makeRequest({
        sessionId: "sess-1",
        guestId: GUEST_ID,
        performanceScore: 90,
        feedback: "first completion",
      })
    )) as { status: number }

    expect(response.status).toBe(200)
    expect(state.putUpdates).toHaveLength(1)
  })
})
