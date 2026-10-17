import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ session: {} as Record<string, unknown>, update: vi.fn() }))
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({ doc: () => "session-ref" }),
    runTransaction: async (run: (transaction: unknown) => unknown) =>
      run({
        get: async () => ({ data: () => mocks.session }),
        update: mocks.update,
      }),
  },
}))
import { claimProactiveNudge, updateSessionLifecycle } from "./server"
beforeEach(() => {
  mocks.update.mockReset()
  mocks.session = {
    user_id: "u",
    session_lifecycle: {
      status: "active",
      ownerId: "tab",
      lastActivityAt: Date.now(),
      leaseUntil: Date.now() + 50000,
      nudgeCount: 0,
    },
  }
})
describe("owned lifecycle writes", () => {
  it("allows an explicit manual resume to claim the attempt in this tab", async () => {
    expect(
      await updateSessionLifecycle({
        sessionId: "s",
        userId: "u",
        ownerId: "new-tab",
        action: "activate",
        lastActivityAt: Date.now(),
        manual: true,
      })
    ).toEqual({ status: 200 })
    expect(mocks.update).toHaveBeenCalledWith(
      "session-ref",
      expect.objectContaining({
        session_lifecycle: expect.objectContaining({ ownerId: "new-tab", status: "active" }),
      })
    )
  })
  it("does not let a delayed heartbeat reactivate a paused attempt", async () => {
    mocks.session.session_lifecycle = {
      status: "paused",
      ownerId: "tab",
      leaseUntil: 0,
      nudgeCount: 0,
      lastActivityAt: Date.now(),
    }
    expect(
      await updateSessionLifecycle({
        sessionId: "s",
        userId: "u",
        ownerId: "tab",
        action: "heartbeat",
        lastActivityAt: Date.now(),
      })
    ).toEqual({ status: 409 })
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it("never lets another account or live tab claim the session", async () => {
    expect(await claimProactiveNudge("s", "foreign", "tab")).toBe(false)
    expect(
      await updateSessionLifecycle({
        sessionId: "s",
        userId: "u",
        ownerId: "foreign",
        action: "activate",
        lastActivityAt: Date.now(),
      })
    ).toEqual({ status: 409 })
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it("atomically records the nudge against the attempt and current idle period", async () => {
    expect(await claimProactiveNudge("s", "u", "tab")).toBe(true)
    expect(mocks.update).toHaveBeenCalledWith(
      "session-ref",
      expect.objectContaining({ "session_lifecycle.nudgeCount": 1 })
    )
  })
  it("cannot reactivate a submitted or evaluating attempt", async () => {
    mocks.session.feedback_status = "pending"
    expect(
      await updateSessionLifecycle({
        sessionId: "s",
        userId: "u",
        ownerId: "tab",
        action: "activate",
        lastActivityAt: Date.now(),
      })
    ).toEqual({ status: 409 })
    expect(await claimProactiveNudge("s", "u", "tab")).toBe(false)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
