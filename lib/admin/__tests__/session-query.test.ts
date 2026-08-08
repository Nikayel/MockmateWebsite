import { describe, it, expect } from "vitest"
import {
  parseSessionListQuery,
  encodeSessionCursor,
  decodeSessionCursor,
  parseDateBound,
  scanBudgetFor,
  canCountExactly,
  ABANDONED_AFTER_HOURS,
  SESSION_PAGE_SIZE_DEFAULT,
  SESSION_PAGE_SIZE_MAX,
  SESSION_SCAN_CEILING,
} from "../session-query"

/** Fixed clock so the abandoned cutoff is assertable. */
const NOW = new Date("2026-08-08T12:00:00.000Z")
/** NOW minus ABANDONED_AFTER_HOURS. */
const CUTOFF = new Date(NOW.getTime() - ABANDONED_AFTER_HOURS * 3600_000).toISOString()
/** A valid position, used wherever a test needs to be past the first page. */
const CURSOR = { startedAt: "2026-08-01T10:00:00.000Z", sessionId: "sess_42" }

function plan(query: string) {
  const result = parseSessionListQuery(new URLSearchParams(query), NOW)
  if (!result.ok) throw new Error(`expected a plan, got: ${result.error}`)
  return result.plan
}

function failure(query: string) {
  const result = parseSessionListQuery(new URLSearchParams(query), NOW)
  if (result.ok) throw new Error("expected a rejection")
  return result.error
}

describe("parseSessionListQuery: page size", () => {
  it("defaults when no limit is given", () => {
    expect(plan("").pageSize).toBe(SESSION_PAGE_SIZE_DEFAULT)
  })

  it("clamps a hostile limit rather than letting it reach .limit()", () => {
    expect(plan("limit=999999").pageSize).toBe(SESSION_PAGE_SIZE_MAX)
    expect(plan("limit=100000000").pageSize).toBe(SESSION_PAGE_SIZE_MAX)
  })

  it("clamps a limit below the floor", () => {
    expect(plan("limit=0").pageSize).toBe(1)
    expect(plan("limit=-40").pageSize).toBe(1)
  })

  it("rejects a non-integer limit instead of paginating by NaN", () => {
    expect(failure("limit=abc")).toMatch(/integer/)
    expect(failure("limit=25.5")).toMatch(/integer/)
    expect(failure("limit=1e9")).toMatch(/integer/)
  })

  it("keeps an in-range limit unchanged", () => {
    expect(plan("limit=40").pageSize).toBe(40)
  })
})

describe("parseSessionListQuery: filters", () => {
  it("defaults to every session, newest first", () => {
    const result = plan("")
    expect(result.status).toBe("all")
    expect(result.feedbackStatus).toBeNull()
    expect(result.openOnly).toBe(false)
    expect(result.direction).toBe("desc")
    expect(result.sessionType).toBeNull()
    expect(result.userId).toBeNull()
  })

  it("maps completed to an indexed feedback_status equality", () => {
    const result = plan("status=completed")
    expect(result.feedbackStatus).toEqual({ op: "==", value: "complete" })
    expect(result.openOnly).toBe(false)
  })

  it("maps scoring to the two in-flight feedback states", () => {
    expect(plan("status=scoring").feedbackStatus).toEqual({
      op: "in",
      values: ["pending", "processing"],
    })
  })

  it("plans in progress as a young created_at window plus the absence check", () => {
    const result = plan("status=in_progress")
    expect(result.openOnly).toBe(true)
    expect(result.feedbackStatus).toBeNull()
    expect(result.startedFrom).toBe(CUTOFF)
    expect(result.startedTo).toBeNull()
  })

  it("plans abandoned as an old created_at window plus the absence check", () => {
    const result = plan("status=abandoned")
    expect(result.openOnly).toBe(true)
    expect(result.startedTo).toBe(CUTOFF)
    expect(result.startedFrom).toBeNull()
  })

  it("intersects the caller's date range with the status window", () => {
    // A wide user range must not widen the abandoned cutoff back out.
    const abandoned = plan("status=abandoned&from=2026-01-01&to=2026-12-31")
    expect(abandoned.startedFrom).toBe("2026-01-01T00:00:00.000Z")
    expect(abandoned.startedTo).toBe(CUTOFF)

    const live = plan("status=in_progress&from=2026-01-01")
    expect(live.startedFrom).toBe(CUTOFF)
  })

  it("rejects an unknown status rather than silently listing everything", () => {
    expect(failure("status=nonsense")).toMatch(/status must be one of/)
  })

  it("passes through a valid type and user id", () => {
    const result = plan("type=system-design&userId=abc123XYZ_-")
    expect(result.sessionType).toBe("system-design")
    expect(result.userId).toBe("abc123XYZ_-")
  })

  it("rejects a type or user id that is not an identifier", () => {
    expect(failure("type=drop table")).toMatch(/type/)
    expect(failure(`type=${"x".repeat(65)}`)).toMatch(/type/)
    expect(failure("userId=has%20space")).toMatch(/user id/)
    expect(failure(`userId=${"u".repeat(129)}`)).toMatch(/user id/)
  })
})

describe("parseSessionListQuery: dates", () => {
  it("covers the whole of a date-only upper bound", () => {
    const result = plan("from=2026-08-01&to=2026-08-03")
    expect(result.startedFrom).toBe("2026-08-01T00:00:00.000Z")
    // Midnight here would have hidden every session on the 3rd.
    expect(result.startedTo).toBe("2026-08-03T23:59:59.999Z")
  })

  it("accepts a full ISO instant unchanged", () => {
    expect(plan("from=2026-08-01T09:30:00.000Z").startedFrom).toBe("2026-08-01T09:30:00.000Z")
  })

  it("rejects an unparseable date", () => {
    expect(failure("from=yesterday")).toMatch(/valid date/)
    expect(failure("to=2026-13-45")).toMatch(/valid date/)
  })

  it("rejects an inverted range", () => {
    expect(failure("from=2026-08-05&to=2026-08-01")).toMatch(/must not be after/)
  })

  it("parseDateBound reports absence and invalidity differently", () => {
    expect(parseDateBound(null, "start")).toBeNull()
    expect(parseDateBound("   ", "start")).toBeNull()
    expect(parseDateBound("not-a-date", "start")).toBe(false)
  })
})

describe("parseSessionListQuery: ordering", () => {
  it("accepts both directions on the one sortable column", () => {
    expect(plan("sortBy=startedAt&direction=asc").direction).toBe("asc")
    expect(plan("direction=desc").direction).toBe("desc")
  })

  it("refuses a sort column no index can serve", () => {
    // Ordering on completed_at drops every unfinished round, which is a changed
    // result set masquerading as a reorder.
    expect(failure("sortBy=completedAt")).toMatch(/sortBy/)
    expect(failure("sortBy=performanceScore")).toMatch(/sortBy/)
  })

  it("refuses an unknown direction", () => {
    expect(failure("direction=sideways")).toMatch(/asc or desc/)
  })
})

describe("session cursors", () => {
  const cursor = CURSOR

  it("round-trips through the opaque token", () => {
    expect(decodeSessionCursor(encodeSessionCursor(cursor))).toEqual(cursor)
  })

  it("produces a URL-safe token", () => {
    expect(encodeSessionCursor(cursor)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("returns null for absent input", () => {
    expect(decodeSessionCursor(null)).toBeNull()
    expect(decodeSessionCursor(undefined)).toBeNull()
    expect(decodeSessionCursor("")).toBeNull()
  })

  it("returns null for a token that is not a position", () => {
    expect(decodeSessionCursor("!!!not base64!!!")).toBeNull()
    expect(decodeSessionCursor(Buffer.from("not json").toString("base64url"))).toBeNull()
    expect(decodeSessionCursor(Buffer.from('{"s":"x"}').toString("base64url"))).toBeNull()
    expect(
      decodeSessionCursor(Buffer.from('{"s":"nope","i":"a"}').toString("base64url"))
    ).toBeNull()
    expect(decodeSessionCursor(Buffer.from('{"s":"","i":"a"}').toString("base64url"))).toBeNull()
    expect(decodeSessionCursor(Buffer.from("[1,2,3]").toString("base64url"))).toBeNull()
  })

  it("rejects a bad cursor at the route boundary instead of restarting page one", () => {
    // Silently dropping it would page the admin back to the top forever.
    expect(failure("cursor=garbage!!")).toMatch(/pagination cursor/)
  })

  it("carries a good cursor into the plan and stops charging for the total", () => {
    const result = plan(`cursor=${encodeSessionCursor(cursor)}`)
    expect(result.cursor).toEqual(cursor)
    expect(result.includeTotal).toBe(false)
  })

  it("counts only on the first page", () => {
    expect(plan("").includeTotal).toBe(true)
  })
})

describe("canCountExactly", () => {
  it("counts a fully indexed first page", () => {
    expect(canCountExactly(plan(""))).toBe(true)
    expect(canCountExactly(plan("status=completed&type=dsa"))).toBe(true)
  })

  it("does not count again once the admin has paged past the first page", () => {
    expect(canCountExactly(plan(`cursor=${encodeSessionCursor(CURSOR)}`))).toBe(false)
  })

  it("refuses to count a status the index cannot see", () => {
    // The aggregation would include every completed round in the window and
    // report 400 next to a page of 12.
    expect(canCountExactly(plan("status=in_progress"))).toBe(false)
    expect(canCountExactly(plan("status=abandoned"))).toBe(false)
  })
})

describe("scanBudgetFor", () => {
  it("reads one page plus a probe row when the plan is fully indexed", () => {
    expect(scanBudgetFor(plan("limit=30"))).toBe(31)
  })

  it("bounds the over-fetch when the status needs a post-read check", () => {
    expect(scanBudgetFor(plan("status=in_progress"))).toBe(SESSION_SCAN_CEILING)
    expect(scanBudgetFor(plan("status=abandoned&limit=100"))).toBe(SESSION_SCAN_CEILING)
  })
})
