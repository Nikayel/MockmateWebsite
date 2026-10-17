import { describe, expect, it } from "vitest"
import { canSendProactive, SESSION_IDLE_MS, type SessionLifecycle } from "./policy"

const now = 1_000_000
const active: SessionLifecycle = {
  status: "active",
  ownerId: "tab",
  lastActivityAt: now - 120_000,
  leaseUntil: now + 30_000,
  nudgeCount: 0,
}
describe("proactive attempt budget", () => {
  it("allows an active owned attempt once per period of human inactivity", () => {
    expect(canSendProactive(active, "tab", now)).toBe(true)
    expect(
      canSendProactive({ ...active, lastNudgedActivityAt: active.lastActivityAt }, "tab", now)
    ).toBe(false)
  })
  it.each([
    { ...active, status: "paused" as const },
    { ...active, lastActivityAt: now - SESSION_IDLE_MS },
    { ...active, nudgeCount: 3 },
    { ...active, leaseUntil: now },
    { ...active, ownerId: "other-tab" },
    undefined,
  ])("rejects paused, idle, exhausted, expired, foreign and legacy sessions", (state) => {
    expect(canSendProactive(state, "tab", now)).toBe(false)
  })
})
