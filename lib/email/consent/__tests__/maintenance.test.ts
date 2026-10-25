import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const h = vi.hoisted(() => ({
  rows: [] as Array<{
    id: string
    email: string
    email_normalized: string
    notification_preferences: { email_notifications_enabled: boolean; marketing_emails: boolean }
    email_consent_sync?: { signature: string }
  }>,
  cursor: null as string | null,
  patch: vi.fn(),
  suppress: vi.fn(),
}))
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => {
      let cursor = "",
        maximum = Infinity
      const query = {
        doc: () => ({
          get: async () => ({ data: () => ({ cursor: h.cursor }) }),
          set: async (fields: { cursor: string | null }) => {
            h.cursor = fields.cursor
          },
        }),
        orderBy: () => query,
        where: () => query,
        count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }),
        limit: (n: number) => {
          maximum = n
          return query
        },
        startAfter: (id: string) => {
          cursor = id
          return query
        },
        get: async () => ({
          docs:
            name === "profiles"
              ? h.rows
                  .filter((row) => row.id > cursor)
                  .slice(0, maximum)
                  .map((row) => ({ id: row.id, data: () => row }))
              : [],
        }),
      }
      return query
    },
  },
}))
vi.mock("../preferences", () => ({ patchEmailPreferences: h.patch }))
vi.mock("../sync", () => ({
  syncEmailSuppression: h.suppress,
  retryEmailSuppressions: async () => ({ attempted: 0, synced: 0 }),
}))
vi.mock("../webhook-setup", () => ({ ensureConsentWebhook: async () => true }))
vi.mock("../job-auth", () => ({
  validSuppressionJob: (_id: string, job: { signature?: string }) => job.signature === "trusted",
}))
import { maintainEmailConsent } from "../maintenance"

beforeEach(() => {
  vi.clearAllMocks()
  h.rows = []
  h.cursor = null
  h.suppress.mockResolvedValue(true)
  h.patch.mockImplementation(async (id, _patch, source) => {
    if (source !== "reconciliation") return
    const row = h.rows.find((row) => row.id === id)!
    row.email_consent_sync = { signature: "trusted" }
  })
})
afterEach(() => vi.useRealTimers())
function row(id: string, enabled: boolean, marketing: boolean) {
  const email = `${id}@example.test`
  return {
    id,
    email,
    email_normalized: email,
    notification_preferences: { email_notifications_enabled: enabled, marketing_emails: marketing },
  }
}
describe("bounded historical consent repair", () => {
  it("resumes beyond the first page and never changes an opted-in contact", async () => {
    h.rows = [
      ...Array.from({ length: 45 }, (_, index) =>
        row(`u${String(index).padStart(3, "0")}`, true, false)
      ),
      row("z-opted-in", true, true),
    ]
    expect((await maintainEmailConsent()).history).toEqual({
      scanned: 20,
      repaired: 20,
      complete: false,
    })
    expect((await maintainEmailConsent()).history).toEqual({
      scanned: 20,
      repaired: 20,
      complete: false,
    })
    expect((await maintainEmailConsent()).history).toEqual({
      scanned: 6,
      repaired: 5,
      complete: true,
    })
    expect(h.suppress).toHaveBeenCalledTimes(45)
    expect(
      h.patch.mock.calls.some(
        ([id, , source]) => id === "z-opted-in" && source === "reconciliation"
      )
    ).toBe(false)
    expect(h.cursor).toBeNull()
  })
  it("global opt-outs retain per-category choices during historical repair", async () => {
    h.rows = [row("global-off", false, true)]
    await maintainEmailConsent()
    expect(h.patch).toHaveBeenCalledWith(
      "global-off",
      { email_notifications_enabled: false },
      "reconciliation"
    )
  })
})
