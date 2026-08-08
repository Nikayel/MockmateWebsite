import { describe, it, expect } from "vitest"
import { assembleSessionPage, cursorForSession, isOpenSession } from "../session-page"
import type { ScannedSession } from "../session-page"
import { parseSessionListQuery, SESSION_SCAN_CEILING } from "../session-query"

const NOW = new Date("2026-08-08T12:00:00.000Z")

function planFor(query: string) {
  const result = parseSessionListQuery(new URLSearchParams(query), NOW)
  if (!result.ok) throw new Error(result.error)
  return result.plan
}

/** `count` sessions, newest first, one minute apart, every `everyNth` still open. */
function scan(count: number, options: { openEvery?: number } = {}): ScannedSession[] {
  const { openEvery } = options
  return Array.from({ length: count }, (_, index) => {
    const startedAt = new Date(NOW.getTime() - (index + 1) * 60_000).toISOString()
    const open = openEvery !== undefined && index % openEvery === 0
    return {
      id: `sess_${index}`,
      data: {
        created_at: startedAt,
        ...(open ? {} : { completed_at: startedAt, feedback_status: "complete" }),
      },
    }
  })
}

describe("assembleSessionPage: fully indexed plans", () => {
  const plan = planFor("limit=10")

  it("returns a full page and a cursor when the probe row came back", () => {
    // 11 read for a page of 10: the 11th only says another page exists.
    const page = assembleSessionPage(scan(11), plan)
    expect(page.items).toHaveLength(10)
    expect(page.items[9].id).toBe("sess_9")
    expect(page.nextCursor).toEqual({
      startedAt: page.items[9].data.created_at,
      sessionId: "sess_9",
    })
    expect(page.scanCapped).toBe(false)
  })

  it("ends the list when the probe row did not come back", () => {
    const page = assembleSessionPage(scan(10), plan)
    expect(page.items).toHaveLength(10)
    // Exactly a page and no more: a cursor here would page forever.
    expect(page.hasMore).toBe(false)
    expect(page.nextCursor).toBeNull()
  })

  it("reports more results and a cursor together when both are true", () => {
    const page = assembleSessionPage(scan(11), plan)
    expect(page.hasMore).toBe(true)
    expect(page.nextCursor).not.toBeNull()
  })

  it("still reports more results when no cursor could be built from the last row", () => {
    // A document whose created_at is not an ISO string. Reporting no more results
    // here would silently truncate the list; the two flags disagreeing is what
    // lets the caller notice and log it.
    const scanned = scan(11)
    scanned[9].data = { created_at: 1723118400000 }
    const page = assembleSessionPage(scanned, plan)
    expect(page.hasMore).toBe(true)
    expect(page.nextCursor).toBeNull()
  })

  it("handles a partial final page", () => {
    const page = assembleSessionPage(scan(3), plan)
    expect(page.items).toHaveLength(3)
    expect(page.nextCursor).toBeNull()
    expect(page.scanned).toBe(3)
  })

  it("handles an empty result without inventing a cursor", () => {
    const page = assembleSessionPage([], plan)
    expect(page.items).toEqual([])
    expect(page.nextCursor).toBeNull()
    expect(page.scanCapped).toBe(false)
  })

  it("never reports a cap for a plan that does not over-fetch", () => {
    expect(assembleSessionPage(scan(11), plan).scanCapped).toBe(false)
  })
})

describe("assembleSessionPage: statuses the index cannot answer", () => {
  const plan = planFor("status=in_progress&limit=5")

  it("drops the completed rows the index could not exclude", () => {
    // Every third session is still open, so 30 read yields 10 matches.
    const page = assembleSessionPage(scan(30, { openEvery: 3 }), plan)
    expect(page.items).toHaveLength(5)
    expect(page.items.every((row) => isOpenSession(row.data))).toBe(true)
    expect(page.scanned).toBe(30)
  })

  it("resumes after the last row on the page when the page filled", () => {
    const scanned = scan(30, { openEvery: 3 })
    const page = assembleSessionPage(scanned, plan)
    expect(page.nextCursor?.sessionId).toBe(page.items[4].id)
  })

  it("resumes after the last document scanned when the ceiling cut it short", () => {
    // A ceiling-sized scan holding only two open sessions: the page cannot fill,
    // but there is certainly more collection behind it.
    const scanned = scan(SESSION_SCAN_CEILING)
    scanned[0].data = { created_at: scanned[0].data.created_at }
    scanned[1].data = { created_at: scanned[1].data.created_at }

    const page = assembleSessionPage(scanned, plan)
    expect(page.items).toHaveLength(2)
    expect(page.scanCapped).toBe(true)
    // Not sess_1, the last MATCH: everything from there to the ceiling was
    // already inspected and rejected, so resuming there would re-read it all.
    expect(page.nextCursor?.sessionId).toBe(`sess_${SESSION_SCAN_CEILING - 1}`)
  })

  it("ends the list when the scan came back short of the ceiling", () => {
    // Under the ceiling means the collection ran out, not the budget.
    const page = assembleSessionPage(scan(40, { openEvery: 20 }), plan)
    expect(page.items).toHaveLength(2)
    expect(page.scanCapped).toBe(false)
    expect(page.nextCursor).toBeNull()
  })

  it("reports a capped scan that matched nothing at all", () => {
    const page = assembleSessionPage(scan(SESSION_SCAN_CEILING), plan)
    expect(page.items).toEqual([])
    expect(page.scanCapped).toBe(true)
    // No matches on this stretch is not the end of the collection.
    expect(page.nextCursor).not.toBeNull()
  })

  it("keeps abandoned rounds, which are open sessions too", () => {
    const abandoned = planFor("status=abandoned&limit=5")
    const page = assembleSessionPage(scan(10, { openEvery: 2 }), abandoned)
    expect(page.items).toHaveLength(5)
    expect(page.items.every((row) => isOpenSession(row.data))).toBe(true)
  })
})

describe("cursorForSession", () => {
  it("reads the position off created_at", () => {
    expect(
      cursorForSession({ id: "sess_1", data: { created_at: "2026-08-08T10:00:00.000Z" } })
    ).toEqual({ startedAt: "2026-08-08T10:00:00.000Z", sessionId: "sess_1" })
  })

  it("returns null for a document whose created_at is not an ISO string", () => {
    expect(cursorForSession({ id: "sess_1", data: {} })).toBeNull()
    expect(cursorForSession({ id: "sess_1", data: { created_at: "" } })).toBeNull()
    expect(cursorForSession({ id: "sess_1", data: { created_at: 1723118400000 } })).toBeNull()
  })
})

describe("isOpenSession", () => {
  it("is exactly the absence of completed_at", () => {
    expect(isOpenSession({})).toBe(true)
    expect(isOpenSession({ created_at: "2026-08-08T10:00:00.000Z" })).toBe(true)
    expect(isOpenSession({ completed_at: "2026-08-08T10:30:00.000Z" })).toBe(false)
  })
})
