/**
 * The guest PUT must not share the session-CREATION rate bucket.
 *
 * POST /api/guest-session is limited to 3/hour/IP (creation is the abuse
 * surface). The PUT carrying autosaves and the completion write used the same
 * bucket: a guest who worked for more than ~60 seconds had it exhausted by
 * autosaves, so the one PUT that stores the score silently 429'd — and since
 * the score lock shipped, that server document is the score's only copy.
 * This pins the split: an exhausted creation bucket must not block a PUT.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const buckets = vi.hoisted(() => ({
  creationExhausted: { data: { error: "rate limited" }, status: 429 },
  updates: [] as Record<string, unknown>[],
  guestSessionRateLimit: vi.fn(async () => buckets.creationExhausted as unknown),
  guestApiRateLimit: vi.fn(async () => null),
}))

vi.mock("@/lib/rate-limit", () => ({
  guestSessionRateLimit: buckets.guestSessionRateLimit,
  guestApiRateLimit: buckets.guestApiRateLimit,
}))

const GUEST_ID = "guest-12345678-1234-1234-1234-123456789abc"

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: async () => ({
          exists: true,
          data: () => ({ user_id: GUEST_ID, is_guest: true }),
        }),
        update: async (fields: Record<string, unknown>) => {
          buckets.updates.push(fields)
        },
      }),
      where: () => ({ where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) }),
    }),
  },
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { PUT } from "../route"

function makePutRequest() {
  return {
    headers: { get: () => null },
    json: async () => ({
      sessionId: "sess-1",
      guestId: GUEST_ID,
      performanceScore: 100,
      feedback: "Completed Two Sum with 2/2 tests passing",
    }),
  } as never
}

beforeEach(() => {
  buckets.updates = []
  buckets.guestSessionRateLimit.mockClear()
  buckets.guestApiRateLimit.mockClear()
})

describe("PUT /api/guest-session rate bucket", () => {
  it("completes the score write even when the creation bucket is exhausted", async () => {
    const response = (await PUT(makePutRequest())) as { status: number; data: any }

    expect(response.status).toBe(200)
    expect(buckets.updates).toHaveLength(1)
    expect(buckets.updates[0]).toMatchObject({ performance_score: 100 })
    // The write bucket, not the creation bucket, governs PUTs.
    expect(buckets.guestApiRateLimit).toHaveBeenCalledTimes(1)
    expect(buckets.guestSessionRateLimit).not.toHaveBeenCalled()
  })
})
