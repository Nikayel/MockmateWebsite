import { describe, expect, it, vi } from "vitest"
import { authorizeGuestChatTurn, refundGuestChatTurn } from "../guest-chat-auth"
import { GUEST_CHAT_LIMIT_CODE, GUEST_CHAT_TURN_LIMIT } from "@/lib/interview/guest-chat-limit"

const GUEST_ID = "guest-12345678-1234-1234-1234-123456789abc"
const OTHER_GUEST_ID = "guest-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

function createFakeDb(initialDoc: Record<string, unknown> | null) {
  let docData = initialDoc ? { ...initialDoc } : null
  const ref = { id: "sess-guest-1" }
  const db = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ref),
    })),
    runTransaction: vi.fn(
      async <T>(
        fn: (tx: {
          get: () => Promise<unknown>
          update: (r: unknown, patch: Record<string, unknown>) => void
        }) => Promise<T>
      ) => {
        const tx = {
          get: async () => ({
            exists: docData !== null,
            data: () => (docData ? { ...docData } : undefined),
          }),
          update: (_r: unknown, patch: Record<string, unknown>) => {
            if (docData) docData = { ...docData, ...patch }
          },
        }
        return fn(tx)
      }
    ),
  }
  return {
    db: db as unknown as FirebaseFirestore.Firestore,
    getDoc: () => docData,
  }
}

describe("authorizeGuestChatTurn", () => {
  it("allows up to GUEST_CHAT_TURN_LIMIT turns and blocks the next turn with 403", async () => {
    const { db, getDoc } = createFakeDb({
      user_id: GUEST_ID,
      is_guest: true,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    })

    for (let turn = 1; turn <= GUEST_CHAT_TURN_LIMIT; turn++) {
      const result = await authorizeGuestChatTurn(
        { guestId: GUEST_ID, sessionId: "sess-guest-1" },
        db
      )
      expect(result).toEqual({
        kind: "allowed",
        guestId: GUEST_ID,
        sessionId: "sess-guest-1",
        turnsUsed: turn,
        turnsRemaining: GUEST_CHAT_TURN_LIMIT - turn,
      })
    }

    expect(getDoc()?.guest_chat_turns_used).toBe(GUEST_CHAT_TURN_LIMIT)

    const blocked = await authorizeGuestChatTurn(
      { guestId: GUEST_ID, sessionId: "sess-guest-1" },
      db
    )
    expect(blocked).toEqual({
      kind: "denied",
      status: 403,
      body: expect.objectContaining({
        code: GUEST_CHAT_LIMIT_CODE,
        turnsUsed: GUEST_CHAT_TURN_LIMIT,
        turnsLimit: GUEST_CHAT_TURN_LIMIT,
      }),
    })
  })

  it("rejects invalid guest IDs, missing session IDs, and sessions owned by another guest", async () => {
    const { db } = createFakeDb({ user_id: OTHER_GUEST_ID, is_guest: true })

    expect(
      await authorizeGuestChatTurn({ guestId: "not-a-guest", sessionId: "sess-guest-1" }, db)
    ).toMatchObject({
      kind: "denied",
      status: 401,
    })

    expect(await authorizeGuestChatTurn({ guestId: GUEST_ID, sessionId: "" }, db)).toMatchObject({
      kind: "denied",
      status: 400,
    })

    expect(
      await authorizeGuestChatTurn({ guestId: GUEST_ID, sessionId: "sess-guest-1" }, db)
    ).toMatchObject({
      kind: "denied",
      status: 401,
    })
  })

  it("rejects completed or expired guest sessions and skips proactive nudges", async () => {
    const completed = createFakeDb({
      user_id: GUEST_ID,
      is_guest: true,
      completed_at: "2026-11-20T00:00:00.000Z",
    })
    expect(
      await authorizeGuestChatTurn({ guestId: GUEST_ID, sessionId: "sess-guest-1" }, completed.db)
    ).toMatchObject({ kind: "denied", status: 403, body: { code: "FREE_TRIAL_EXHAUSTED" } })

    const expired = createFakeDb({
      user_id: GUEST_ID,
      is_guest: true,
      expires_at: "2020-01-01T00:00:00.000Z",
    })
    expect(
      await authorizeGuestChatTurn({ guestId: GUEST_ID, sessionId: "sess-guest-1" }, expired.db)
    ).toMatchObject({ kind: "denied", status: 403, body: { code: "GUEST_SESSION_EXPIRED" } })

    expect(
      await authorizeGuestChatTurn(
        { guestId: GUEST_ID, sessionId: "sess-guest-1", isProactive: true },
        completed.db
      )
    ).toMatchObject({ kind: "skip" })
  })

  it("refunds a reserved turn without dropping below zero", async () => {
    const { db, getDoc } = createFakeDb({
      user_id: GUEST_ID,
      is_guest: true,
      guest_chat_turns_used: 1,
    })

    await refundGuestChatTurn("sess-guest-1", GUEST_ID, db)
    expect(getDoc()?.guest_chat_turns_used).toBe(0)

    // Repeated refund is a safe no-op
    await refundGuestChatTurn("sess-guest-1", GUEST_ID, db)
    expect(getDoc()?.guest_chat_turns_used).toBe(0)
  })
})
