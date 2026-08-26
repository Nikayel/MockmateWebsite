/**
 * Migration must treat "already done" as success.
 *
 * The client retries a failed upgrade (SignupPrompt re-enables its buttons,
 * the lock offers Try again), and between the server committing the update
 * and the client reading the 200 the network can die. The old check returned
 * 404 "Session not found or already migrated" whenever user_id !== guestId,
 * without asking whether user_id was already the CALLER — so a lost success
 * response turned every retry into a permanent failure loop on the exact
 * path a conversion depends on. A session someone ELSE owns must still 404:
 * idempotency is for the same caller, not a claim on foreign sessions.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  docData: null as Record<string, unknown> | null,
  docExists: true,
  updates: [] as Record<string, unknown>[],
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: vi.fn(async () => ({ uid: "user-new" })),
  },
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: async () => ({
          exists: state.docExists,
          data: () => state.docData,
        }),
        update: async (fields: Record<string, unknown>) => {
          state.updates.push(fields)
        },
      }),
    }),
  },
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from "../route"

const GUEST_ID = "guest-12345678-1234-1234-1234-123456789abc"

function makeRequest() {
  return {
    headers: { get: (name: string) => (name === "Authorization" ? "Bearer token-1" : null) },
    json: async () => ({ guestId: GUEST_ID, sessionId: "sess-1" }),
  } as never
}

beforeEach(() => {
  state.docData = null
  state.docExists = true
  state.updates = []
})

describe("POST /api/guest-session/migrate for a single session", () => {
  it("migrates a guest-owned session and reports it", async () => {
    state.docData = { user_id: GUEST_ID, is_guest: true }

    const response = (await POST(makeRequest())) as { status: number; data: any }

    expect(response.status).toBe(200)
    expect(response.data.migrated).toBe(1)
    expect(state.updates).toHaveLength(1)
    expect(state.updates[0]).toMatchObject({ user_id: "user-new", is_guest: false })
  })

  it("treats a session already migrated to the caller as success, not 404", async () => {
    state.docData = {
      user_id: "user-new",
      is_guest: false,
      migrated_from_guest: GUEST_ID,
    }

    const response = (await POST(makeRequest())) as { status: number; data: any }

    expect(response.status).toBe(200)
    expect(response.data.migrated).toBeGreaterThanOrEqual(1)
    // Idempotent success must not rewrite the document.
    expect(state.updates).toHaveLength(0)
  })

  it("still refuses a session owned by someone else", async () => {
    state.docData = { user_id: "user-other", is_guest: false }

    const response = (await POST(makeRequest())) as { status: number; data: any }

    expect(response.status).toBe(404)
    expect(state.updates).toHaveLength(0)
  })
})
