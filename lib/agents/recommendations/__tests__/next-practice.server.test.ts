import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  session: { exists: true, data: {} as Record<string, unknown> },
  history: [] as Array<Record<string, unknown>>,
  account: vi.fn(),
  collection: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  select: vi.fn(),
  choose: vi.fn(),
}))
vi.mock("@/lib/firebase-admin", () => ({ adminDb: { collection: mocks.collection } }))
vi.mock("@/lib/account/overview.server", () => ({ getAccountOverview: mocks.account }))
vi.mock("@/lib/scenarios", () => ({ scenarios: [] }))
vi.mock("../next-practice", () => ({ selectNextPractice: mocks.choose }))
import { getNextPractice } from "../next-practice.server"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.session = {
    exists: true,
    data: { user_id: "owner", completed_at: "today", feedback: "report", scenario_id: "old" },
  }
  mocks.history = [{ scenario_id: "done", completed_at: "today" }, { scenario_id: "in-progress" }]
  mocks.account.mockResolvedValue({
    status: "ready",
    overview: { usage: { allowed: true, periodEnd: "tomorrow" } },
  })
  mocks.choose.mockReturnValue({ scenarioId: "next" })
  const query = {
    where: mocks.where,
    orderBy: mocks.orderBy,
    limit: mocks.limit,
    select: mocks.select,
    get: async () => ({
      docs: mocks.history.map((value) => ({ get: (key: string) => value[key] })),
    }),
    doc: () => ({
      get: async () => ({
        exists: mocks.session.exists,
        get: (key: string) => mocks.session.data[key],
        data: () => mocks.session.data,
      }),
    }),
  }
  mocks.collection.mockReturnValue(query)
  for (const method of [mocks.where, mocks.orderBy, mocks.limit, mocks.select])
    method.mockReturnValue(query)
})

describe("owned-session recommendation service", () => {
  it("makes foreign and missing sessions indistinguishable and stops before history or quota reads", async () => {
    expect(await getNextPractice("stranger", "session")).toEqual({ status: "not_found" })
    mocks.session.exists = false
    expect(await getNextPractice("owner", "session")).toEqual({ status: "not_found" })
    expect(mocks.account).not.toHaveBeenCalled()
    expect(mocks.where).not.toHaveBeenCalled()
    expect(mocks.choose).not.toHaveBeenCalled()
  })
  it.each(["pending", "processing", "queued", "failed"])(
    "waits for %s feedback",
    async (status) => {
      mocks.session.data.feedback_status = status
      expect(await getNextPractice("owner", "session")).toEqual({ status: "not_ready" })
      expect(mocks.account).not.toHaveBeenCalled()
    }
  )
  it("accepts legacy completed feedback; only loads bounded owned history", async () => {
    expect(await getNextPractice("owner", "session")).toEqual({
      status: "ready",
      recommendation: { scenarioId: "next" },
    })
    expect(mocks.where).toHaveBeenCalledWith("user_id", "==", "owner")
    expect(mocks.orderBy).toHaveBeenCalledWith("started_at", "desc")
    expect(mocks.limit).toHaveBeenCalledWith(40)
    expect(mocks.select).toHaveBeenCalledWith("scenario_id", "completed_at")
    expect(mocks.choose).toHaveBeenCalledWith(
      expect.objectContaining({ id: "session" }),
      [],
      ["done"]
    )
  })
  it("offers advice even when the account lookup is unavailable", async () => {
    mocks.account.mockResolvedValue({ status: "unavailable" })
    expect((await getNextPractice("owner", "session")).status).toBe("ready")
    expect(mocks.account).not.toHaveBeenCalled()
  })
  it("offers the same advice to free users with exhausted allowance without granting a start", async () => {
    mocks.account.mockResolvedValue({
      status: "ready",
      overview: { usage: { allowed: false, periodEnd: "tomorrow" } },
    })
    expect((await getNextPractice("owner", "session")).status).toBe("ready")
    expect(mocks.account).not.toHaveBeenCalled()
  })
  it("returns an honest empty state", async () => {
    mocks.choose.mockReturnValue(null)
    expect(await getNextPractice("owner", "session")).toEqual({ status: "no_match" })
  })
})
