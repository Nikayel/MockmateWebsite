import { afterEach, describe, expect, it, vi } from "vitest"

const mockGet = vi.fn()
const batchDelete = vi.fn()
const batchCommit = vi.fn()

type FakeDoc = { ref: { id: string }; data: () => { is_guest: boolean; expires_at: string } }

function guestDoc(id: string, isGuest = true): FakeDoc {
  return {
    ref: { id },
    data: () => ({ is_guest: isGuest, expires_at: "2020-01-01T00:00:00.000Z" }),
  }
}

async function importRoute(cronSecret: string | undefined, docs: FakeDoc[]) {
  vi.resetModules()
  vi.unstubAllEnvs()
  if (cronSecret) vi.stubEnv("CRON_SECRET", cronSecret)

  mockGet.mockReset().mockResolvedValue({ size: docs.length, docs })
  batchDelete.mockReset()
  batchCommit.mockReset().mockResolvedValue(undefined)

  const query: Record<string, unknown> = {}
  query.where = vi.fn(() => query)
  query.limit = vi.fn(() => query)
  query.get = mockGet

  vi.doMock("@/lib/firebase-admin", () => ({
    adminDb: {
      collection: vi.fn(() => query),
      batch: vi.fn(() => ({ delete: batchDelete, commit: batchCommit })),
    },
  }))
  vi.doMock("@/lib/logger", () => ({
    logger: { child: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }) },
  }))

  return import("./route")
}

function post(dryRun = false) {
  const url = `http://localhost/api/cron/guest-session-cleanup${dryRun ? "?dryRun=true" : ""}`
  return new Request(url, { method: "POST", headers: { authorization: "Bearer secret" } }) as never
}

describe("/api/cron/guest-session-cleanup", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("rejects requests without the cron secret", async () => {
    const { POST } = await importRoute("secret", [guestDoc("a")])
    const res = await POST(new Request("http://localhost/api/cron/guest-session-cleanup") as never)
    expect(res.status).toBe(401)
    expect(batchDelete).not.toHaveBeenCalled()
  })

  it("returns a server error when CRON_SECRET is missing", async () => {
    const { POST } = await importRoute(undefined, [])
    const res = await POST(new Request("http://localhost/api/cron/guest-session-cleanup") as never)
    expect(res.status).toBe(500)
  })

  it("deletes expired guest sessions for authorized requests", async () => {
    const { POST } = await importRoute("secret", [guestDoc("a"), guestDoc("b")])
    const res = await POST(post())
    expect(res.status).toBe(200)
    expect((res as { data: { deleted: number } }).data.deleted).toBe(2)
    expect(batchDelete).toHaveBeenCalledTimes(2)
    expect(batchCommit).toHaveBeenCalledTimes(1)
  })

  it("never deletes a non-guest doc, even if one slips into the result", async () => {
    const { POST } = await importRoute("secret", [guestDoc("a"), guestDoc("b", false)])
    const res = await POST(post())
    const data = (res as { data: { deleted: number; skippedNonGuest: number } }).data
    expect(data.deleted).toBe(1)
    expect(data.skippedNonGuest).toBe(1)
    expect(batchDelete).toHaveBeenCalledTimes(1)
  })

  it("dryRun counts without deleting", async () => {
    const { POST } = await importRoute("secret", [guestDoc("a"), guestDoc("b")])
    const res = await POST(post(true))
    const data = (res as { data: { deleted: number; wouldDelete: number } }).data
    expect(data.deleted).toBe(0)
    expect(data.wouldDelete).toBe(2)
    expect(batchDelete).not.toHaveBeenCalled()
    expect(batchCommit).not.toHaveBeenCalled()
  })
})
