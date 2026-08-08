/**
 * Guest work is the platform's most fragile data, and losing it used to be completely silent.
 *
 * A guest finishes an interview, signs up, and expects the session to follow them into the new
 * account. Three helpers stand between them and that outcome, and all three used to swallow their
 * failures: `updateGuestInterviewSession` and `migrateGuestSession` returned `false`, and
 * `findGuestSessions` returned `[]`.
 *
 * The last one is the worst, because `[]` is also the correct answer for a guest with nothing to
 * migrate. A query outage and an empty account produce the identical value, so
 * `migrateAllGuestSessions` reports `{ migrated: 0, failed: 0 }` - an unremarkable success - while
 * the user's work is abandoned. Nobody would ever look for a bug there.
 *
 * The return shapes are contracts and are unchanged. What is pinned here is that each failure is
 * now visible in the logs.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const logs = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn() }))

vi.mock("../logger", () => ({
  logger: { error: logs.error, warn: logs.warn, info: vi.fn(), debug: vi.fn() },
}))

const firestore = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({ id: "session-1" })),
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  getDoc: firestore.getDoc,
  setDoc: firestore.setDoc,
  getDocs: firestore.getDocs,
}))

const {
  findGuestSessions,
  getGuestSession,
  migrateAllGuestSessions,
  migrateGuestSession,
  updateGuestInterviewSession,
} = await import("../firestore-helpers")

/** A `getDoc` result for a session that really does belong to this guest. */
function ownedByGuest(guestId: string) {
  return {
    exists: () => true,
    data: () => ({ user_id: guestId, is_guest: true }),
  }
}

describe("guest session failures are visible", () => {
  beforeEach(() => {
    logs.error.mockClear()
    firestore.getDoc.mockReset()
    firestore.setDoc.mockReset()
    firestore.getDocs.mockReset()
  })

  it("logs when a read failure is about to look like a missing session", async () => {
    firestore.getDoc.mockRejectedValue(new Error("UNAVAILABLE"))

    await expect(getGuestSession("session-1", "guest-1")).resolves.toBeNull()
    expect(logs.error).toHaveBeenCalledTimes(1)
  })

  it("stays quiet when the session genuinely does not exist", async () => {
    firestore.getDoc.mockResolvedValue({ exists: () => false })

    await expect(getGuestSession("session-1", "guest-1")).resolves.toBeNull()
    expect(logs.error).not.toHaveBeenCalled()
  })

  it("logs when a finished interview fails to save", async () => {
    firestore.getDoc.mockResolvedValue(ownedByGuest("guest-1"))
    firestore.setDoc.mockRejectedValue(new Error("PERMISSION_DENIED"))

    const saved = await updateGuestInterviewSession("session-1", "guest-1", {
      performanceScore: 82,
      code: "def two_sum(nums, target): ...",
    })

    expect(saved).toBe(false)
    expect(logs.error).toHaveBeenCalled()
  })

  it("logs when ownership transfer to the new account fails", async () => {
    firestore.getDoc.mockResolvedValue(ownedByGuest("guest-1"))
    firestore.setDoc.mockRejectedValue(new Error("DEADLINE_EXCEEDED"))

    const migrated = await migrateGuestSession("session-1", "guest-1", "user-1")

    expect(migrated).toBe(false)
    expect(logs.error).toHaveBeenCalled()
  })

  it("logs when a lookup failure is about to be read as nothing to migrate", async () => {
    firestore.getDocs.mockRejectedValue(new Error("FAILED_PRECONDITION: index missing"))

    await expect(findGuestSessions("guest-1")).resolves.toEqual([])
    expect(logs.error).toHaveBeenCalledTimes(1)
  })

  it("does not turn an empty guest history into an error", async () => {
    firestore.getDocs.mockResolvedValue({ forEach: () => {} })

    await expect(findGuestSessions("guest-1")).resolves.toEqual([])
    expect(logs.error).not.toHaveBeenCalled()
  })

  it("reports the aggregate loss when signup migration drops sessions", async () => {
    firestore.getDocs.mockResolvedValue({
      forEach: (visit: (doc: { id: string; data: () => unknown }) => void) => {
        visit({ id: "session-1", data: () => ({}) })
        visit({ id: "session-2", data: () => ({}) })
      },
    })
    firestore.getDoc.mockResolvedValue(ownedByGuest("guest-1"))
    firestore.setDoc.mockRejectedValue(new Error("UNAVAILABLE"))

    const result = await migrateAllGuestSessions("guest-1", "user-1")

    // The counts are the caller's contract and are deliberately unchanged.
    expect(result).toEqual({ migrated: 0, failed: 2 })
    expect(
      logs.error.mock.calls.some(([, context]) => (context as { failed?: number })?.failed === 2)
    ).toBe(true)
  })
})
