/**
 * A consent decision that fails to save must not fail silently.
 *
 * This endpoint records whether a learner agrees to participate in research. A dropped write leaves
 * the only two states that matter legally out of sync: what the user chose, and what we recorded.
 * If they were withdrawing, the platform keeps treating them as a participant. If they were opting
 * in, their data is excluded from research they agreed to join.
 *
 * The handler returned a 500 from a bare `catch`, so the user saw "Failed to save your choice" and
 * the server recorded nothing at all - not the user, not the direction, not the cause.
 *
 * Both properties are pinned: the body stays generic (it is shown to the user and must not leak
 * internals), and the log carries the detail.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const logs = vi.hoisted(() => ({ error: vi.fn() }))

vi.mock("@/lib/logger", () => ({
  logger: { error: logs.error, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// `withAuth` normally verifies a Firebase token. Here it just supplies a fixed user so the test
// exercises the handler body rather than the auth layer, which has its own coverage.
vi.mock("@/lib/auth-helpers", () => ({
  withAuth:
    (handler: (context: { userId: string; request: unknown }) => Promise<unknown>) =>
    (request: unknown) =>
      handler({ userId: "user-42", request }),
}))

const consentStore = vi.hoisted(() => ({ setShouldThrow: false }))

vi.mock("@/lib/tutorials/research-consent", () => ({
  RESEARCH_CONSENT_VERSION: 3,
  getResearchConsent: vi.fn(async () => null),
  setResearchConsent: vi.fn(async (userId: string, consented: boolean) => {
    if (consentStore.setShouldThrow) throw new Error("Firestore write rejected")
    return { userId, consented, version: 3 }
  }),
}))

const { PUT } = await import("../route")

/** A request whose body parses to the given payload. */
function putRequest(body: unknown) {
  return { json: async () => body } as never
}

interface StubbedResponse {
  data: { error?: string; consent?: unknown }
  status: number
}

describe("PUT /api/research-consent", () => {
  beforeEach(() => {
    logs.error.mockClear()
    consentStore.setShouldThrow = false
  })

  it("logs the user, the direction, and the cause when the write fails", async () => {
    consentStore.setShouldThrow = true

    const response = (await PUT(putRequest({ consented: false }))) as unknown as StubbedResponse

    expect(response.status).toBe(500)
    expect(logs.error).toHaveBeenCalledTimes(1)

    const [, context] = logs.error.mock.calls[0] as [string, Record<string, unknown>]
    expect(context.userId).toBe("user-42")
    // The direction is the part that cannot be reconstructed later. Without it the log says a
    // consent write failed but not whether someone was trying to opt in or to withdraw.
    expect(context.consented).toBe(false)
    expect(context.error).toBeInstanceOf(Error)
  })

  it("keeps the response body generic so nothing internal reaches the user", async () => {
    consentStore.setShouldThrow = true

    const response = (await PUT(putRequest({ consented: true }))) as unknown as StubbedResponse

    expect(response.data.error).toBe("Failed to save your choice")
    expect(JSON.stringify(response.data)).not.toContain("Firestore")
  })

  it("logs nothing when the decision is recorded", async () => {
    const response = (await PUT(putRequest({ consented: true }))) as unknown as StubbedResponse

    expect(response.status).toBe(200)
    expect(logs.error).not.toHaveBeenCalled()
  })

  it("rejects a malformed body before touching the consent store", async () => {
    const response = (await PUT(putRequest({ consented: "yes" }))) as unknown as StubbedResponse

    expect(response.status).toBe(400)
    expect(logs.error).not.toHaveBeenCalled()
  })
})
