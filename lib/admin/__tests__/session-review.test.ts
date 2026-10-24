import { describe, expect, it } from "vitest"
import { sessionConversations } from "../session-review/conversation"
import { sessionWork } from "../session-review/work"

const checkpoint = {
  saved_at: "2026-10-24T12:00:00Z",
  interviewer_messages: [
    { type: "user", message: "My hypothesis" },
    { type: "ai", message: "How will you verify?" },
  ],
  chat_messages: [{ type: "ai", message: "Compare the boundary cases." }],
}

describe("session conversation projection", () => {
  it("prefers the archive and preserves stored order without appending duplicate recovery messages", () => {
    const conversations = sessionConversations(
      {
        messages: [
          { role: "user", content: "First" },
          { role: "model", content: "Second" },
        ],
        original_message_count: 8,
        truncated: true,
        persisted_at: { toDate: () => new Date("2026-10-24T13:00:00Z") },
        secret: "never return",
      },
      checkpoint
    )
    expect(conversations).toEqual([
      {
        source: "archive",
        messages: [
          { role: "user", content: "First" },
          { role: "model", content: "Second" },
        ],
        originalCount: 8,
        truncated: true,
        persistedAt: "2026-10-24T13:00:00.000Z",
      },
    ])
  })
  it("uses separate recovery lanes when the archive is absent or invalid", () => {
    const conversations = sessionConversations(
      { messages: [null, 1, { role: "user", content: null }] },
      checkpoint
    )
    expect(conversations.map((conversation) => conversation.source)).toEqual([
      "interviewer_checkpoint",
      "partner_checkpoint",
    ])
    expect(conversations[0].messages.map((message) => message.role)).toEqual([
      "candidate",
      "interviewer",
    ])
    expect(conversations[1].messages[0].role).toBe("ai_partner")
  })
  it("reports no conversation honestly for legacy sessions", () => {
    expect(sessionConversations(undefined, {})).toEqual([])
  })
  it("bounds historical malformed or oversized archives and retains the truncation signal", () => {
    const result = sessionConversations(
      {
        messages: Array.from({ length: 210 }, (_, index) => ({
          role: "user",
          content: `${index}:` + "x".repeat(5000),
        })),
      },
      null
    )[0]
    expect(result.messages.length).toBeLessThanOrEqual(200)
    expect(result.messages.at(-1)?.content.startsWith("209:")).toBe(true)
    expect(result.messages.every((message) => message.content.length <= 4000)).toBe(true)
    expect(result.originalCount).toBe(210)
    expect(result.truncated).toBe(true)
  })
})

describe("session saved-work projection", () => {
  it("uses final code and final test counts over recovery values, including zero", () => {
    expect(
      sessionWork({
        final_code: "return 42",
        language: "python",
        tests_passed: 0,
        tests_total: 0,
        session_state: { code: "old", test_summary: { passed: 4, total: 4 } },
      })
    ).toMatchObject({
      code: "return 42",
      codeSource: "final",
      language: "python",
      testsPassed: 0,
      testsTotal: 0,
      testSource: "final",
    })
  })
  it("reads code, test summary and editable workspace files from paused checkpoints", () => {
    const work = sessionWork({
      session_state: {
        code: "checkpoint",
        language: "typescript",
        test_summary: { passed: 2, total: 3 },
        elapsed_time: 93,
        paused: true,
        workspace_context: [
          {
            path: "src/cache.ts",
            role: "editable",
            content: "fixed",
            originalContent: "secret original",
          },
          { path: "hidden.test.ts", role: "test", content: "hidden test body" },
          { path: "bad", role: "editable", content: 123 },
        ],
        silent_notes: ["private"],
        interviewer_input: "unsent draft",
      },
    })
    expect(work).toMatchObject({
      codeSource: "checkpoint",
      language: "typescript",
      testsPassed: 2,
      testsTotal: 3,
      testSource: "checkpoint",
      elapsedSeconds: 93,
      paused: true,
      files: [{ path: "src/cache.ts", content: "fixed" }],
    })
    expect(JSON.stringify(work)).not.toMatch(/hidden test|secret original|private|unsent draft/)
  })
  it("supports legacy saved test arrays and clamps inconsistent counts", () => {
    expect(sessionWork({ test_results: [{ passed: true }, { passed: false }] })).toMatchObject({
      testsPassed: 1,
      testsTotal: 2,
    })
    expect(sessionWork({ tests_passed: 10, tests_total: 2 })).toMatchObject({
      testsPassed: 2,
      testsTotal: 2,
    })
  })
  it("does not mix partial final metrics with a different checkpoint test run", () => {
    const result = sessionWork({
      tests_total: 5,
      session_state: { test_summary: { passed: 3, total: 3 } },
    })
    expect(result).toMatchObject({ testsPassed: null, testsTotal: 5, testSource: "final" })
  })
  it("keeps absent tests unknown and bounds code previews", () => {
    expect(sessionWork({})).toMatchObject({
      code: null,
      testsPassed: null,
      testsTotal: null,
      paused: null,
    })
    const work = sessionWork({ final_code: "x".repeat(100_001) })
    expect(work.code?.length).toBe(100_000)
    expect(work.truncated).toBe(true)
  })
})
