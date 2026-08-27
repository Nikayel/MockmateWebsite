/**
 * Transcript persistence tests (PLAN.md Task 14). Extends
 * lib/feedback/transcript-storage.ts's bounded shape onto the
 * `sprintLabRuns/{runId}/transcripts/{ticketKey}` doc (firestore.rules
 * already reserves this exact subcollection for the partner, server-owned,
 * client writes denied). Firestore is faked with an in-memory doc store so
 * the bounded-cap behavior is exercised for real rather than mocked away.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SprintLabTranscriptMessage } from "@/lib/sprint-labs/types"

const mocks = vi.hoisted(() => ({
  requireOwnedActiveRun: vi.fn(),
  getSprintLabRun: vi.fn(),
}))

vi.mock("@/lib/sprint-labs/runs", () => ({
  requireOwnedActiveRun: mocks.requireOwnedActiveRun,
  getSprintLabRun: mocks.getSprintLabRun,
}))

// In-memory fake for the one collection path this module touches:
// sprintLabRuns/{runId}/transcripts/{ticketKey}.
const store = new Map<string, Record<string, unknown>>()

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (runId: string) => ({
        collection: (sub: string) => ({
          doc: (ticketKey: string) => {
            const key = `${name}/${runId}/${sub}/${ticketKey}`
            return {
              get: async () => ({
                exists: store.has(key),
                data: () => store.get(key),
              }),
              set: async (value: Record<string, unknown>) => {
                store.set(key, value)
              },
            }
          },
        }),
      }),
    }),
  },
}))

vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))

const USER = "user-1"
const RUN_ID = "run-1"
const TICKET = "MER-305"

function userMsg(content: string): SprintLabTranscriptMessage {
  return {
    role: "user",
    content,
    aiPolicy: "assisted",
    provenance: "human",
    capabilities: ["chat"],
  }
}
function assistantMsg(content: string): SprintLabTranscriptMessage {
  return {
    role: "assistant",
    content,
    aiPolicy: "assisted",
    provenance: "human",
    capabilities: ["chat"],
  }
}

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
  mocks.requireOwnedActiveRun.mockResolvedValue({ id: RUN_ID, userId: USER })
  mocks.getSprintLabRun.mockResolvedValue({ id: RUN_ID, userId: USER })
})

describe("getPartnerTranscript", () => {
  it("returns an empty transcript + no mutes when nothing has been saved yet", async () => {
    const { getPartnerTranscript } = await import("../transcript-store")
    const result = await getPartnerTranscript(USER, RUN_ID, TICKET)
    expect(result).toEqual({
      transcript: { messages: [], truncated: false, originalCount: 0 },
      mutedDirectiveIds: [],
    })
  })

  it("returns null when the caller does not own the run", async () => {
    mocks.getSprintLabRun.mockResolvedValue(null)
    const { getPartnerTranscript } = await import("../transcript-store")
    expect(await getPartnerTranscript(USER, RUN_ID, TICKET)).toBeNull()
  })
})

describe("appendPartnerTurns", () => {
  it("persists and returns both turns of one exchange", async () => {
    const { appendPartnerTurns, getPartnerTranscript } = await import("../transcript-store")
    const result = await appendPartnerTurns(USER, RUN_ID, TICKET, [
      userMsg("what does this endpoint do"),
      assistantMsg("it lists claims for a tenant"),
    ])
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].content).toBe("what does this endpoint do")

    const rehydrated = await getPartnerTranscript(USER, RUN_ID, TICKET)
    expect(rehydrated?.transcript.messages).toHaveLength(2)
  })

  it("accumulates across multiple calls rather than overwriting", async () => {
    const { appendPartnerTurns } = await import("../transcript-store")
    await appendPartnerTurns(USER, RUN_ID, TICKET, [userMsg("first"), assistantMsg("reply one")])
    const second = await appendPartnerTurns(USER, RUN_ID, TICKET, [
      userMsg("second"),
      assistantMsg("reply two"),
    ])
    expect(second.messages.map((m) => m.content)).toEqual([
      "first",
      "reply one",
      "second",
      "reply two",
    ])
  })

  it("caps at TRANSCRIPT_MAX_MESSAGES, keeping the most recent (recency wins)", async () => {
    const { appendPartnerTurns } = await import("../transcript-store")
    const { TRANSCRIPT_MAX_MESSAGES } = await import("@/lib/feedback/transcript-storage")

    // One exchange at a time, so the cap logic runs on every save, not just once at the end.
    let last
    for (let i = 0; i < TRANSCRIPT_MAX_MESSAGES / 2 + 5; i++) {
      last = await appendPartnerTurns(USER, RUN_ID, TICKET, [
        userMsg(`turn ${i} user`),
        assistantMsg(`turn ${i} assistant`),
      ])
    }
    expect(last!.messages.length).toBeLessThanOrEqual(TRANSCRIPT_MAX_MESSAGES)
    expect(last!.truncated).toBe(true)
    // The most recent turn must survive the cap.
    expect(last!.messages.at(-1)?.content).toContain("assistant")
  })

  it("truncates an over-long message's content rather than dropping the whole turn", async () => {
    const { appendPartnerTurns } = await import("../transcript-store")
    const { TRANSCRIPT_MAX_CONTENT_CHARS } = await import("@/lib/feedback/transcript-storage")
    const huge = "x".repeat(TRANSCRIPT_MAX_CONTENT_CHARS + 500)

    const result = await appendPartnerTurns(USER, RUN_ID, TICKET, [userMsg(huge)])
    expect(result.messages[0].content.length).toBe(TRANSCRIPT_MAX_CONTENT_CHARS)
    expect(result.truncated).toBe(true)
  })

  it("preserves mutedDirectiveIds already saved on the doc across an append", async () => {
    const { appendPartnerTurns, setPartnerDirectiveMuted, getPartnerTranscript } =
      await import("../transcript-store")
    await setPartnerDirectiveMuted(USER, RUN_ID, TICKET, "d1", true)
    await appendPartnerTurns(USER, RUN_ID, TICKET, [userMsg("hi"), assistantMsg("hello")])
    const result = await getPartnerTranscript(USER, RUN_ID, TICKET)
    expect(result?.mutedDirectiveIds).toEqual(["d1"])
  })

  it("requires an owned, active run (propagates the ownership error)", async () => {
    mocks.requireOwnedActiveRun.mockRejectedValue(new Error("RUN_NOT_ACTIVE"))
    const { appendPartnerTurns } = await import("../transcript-store")
    await expect(appendPartnerTurns(USER, RUN_ID, TICKET, [userMsg("hi")])).rejects.toThrow(
      "RUN_NOT_ACTIVE"
    )
  })
})

describe("setPartnerDirectiveMuted", () => {
  it("adds a directive id when muting, and can un-mute it again", async () => {
    const { setPartnerDirectiveMuted } = await import("../transcript-store")
    const afterMute = await setPartnerDirectiveMuted(USER, RUN_ID, TICKET, "d1", true)
    expect(afterMute).toEqual(["d1"])
    const afterUnmute = await setPartnerDirectiveMuted(USER, RUN_ID, TICKET, "d1", false)
    expect(afterUnmute).toEqual([])
  })

  it("is idempotent: muting the same id twice does not duplicate it", async () => {
    const { setPartnerDirectiveMuted } = await import("../transcript-store")
    await setPartnerDirectiveMuted(USER, RUN_ID, TICKET, "d1", true)
    const result = await setPartnerDirectiveMuted(USER, RUN_ID, TICKET, "d1", true)
    expect(result).toEqual(["d1"])
  })
})

describe("isValidTicketKeyForDocId", () => {
  it("accepts a realistic ticket key", async () => {
    const { isValidTicketKeyForDocId } = await import("../transcript-store")
    expect(isValidTicketKeyForDocId("MER-305")).toBe(true)
    expect(isValidTicketKeyForDocId("DEMO-101")).toBe(true)
  })

  it("rejects a path-shaped or otherwise unsafe value", async () => {
    const { isValidTicketKeyForDocId } = await import("../transcript-store")
    expect(isValidTicketKeyForDocId("../etc/passwd")).toBe(false)
    expect(isValidTicketKeyForDocId("a/b")).toBe(false)
    expect(isValidTicketKeyForDocId("")).toBe(false)
  })
})
