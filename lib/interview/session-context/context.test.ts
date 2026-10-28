import { describe, expect, it } from "vitest"
import {
  buildConversationTimeline,
  createChatMessage,
  timelineProviderHistory,
} from "./conversation"
import { buildSessionContext, workspaceRevision } from "./snapshot"
import { buildSessionBaselinePrompt, buildSessionEvidencePrompt } from "./prompts"
import { sessionContextSchema } from "./schema"

const task = {
  id: "debug",
  title: "Window rollup",
  type: "bugfix",
  description: "Reproduce the failure. Read task.md.",
}
const source = { path: "rollup.py", content: "before", originalContent: "before", role: "editable" }
const base = {
  task,
  workspace: [source],
  code: "before",
  interviewerMessages: [],
  partnerMessages: [],
}
describe("full attributed session context", () => {
  it("retains server generation identity from an AI reply through the feedback timeline", () => {
    const generationId = "a136081b-2732-48b4-953b-acf8b2658703"
    const message = createChatMessage("ai", "Inspect the failing branch", {
      generationId,
      feedbackAvailable: true,
    })
    expect(message.id).toBe(generationId)
    const context = buildSessionContext({ ...base, partnerMessages: [message] })
    expect(sessionContextSchema.parse(context).timeline[0]).toMatchObject({
      id: generationId,
      generationId,
      role: "ai_partner",
    })
    expect(JSON.stringify(createChatMessage("ai", "Legacy reply"))).not.toContain("generationId")
  })
  it("tracks the standalone solution alongside read-only supporting files", () => {
    const context = buildSessionContext({
      ...base,
      workspace: [{ ...source, role: "readonly" }],
      includeSolution: true,
      starterCode: "baseline",
      code: "my patch",
    })
    expect(context.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "solution",
          originalContent: "baseline",
          content: "my patch",
          status: "modified",
        }),
      ])
    )
    expect(context.currentRevision).not.toBe(
      buildSessionContext({
        ...base,
        includeSolution: true,
        starterCode: "baseline",
        code: "baseline",
      }).currentRevision
    )
  })
  it("interleaves both panels and preserves who asked whom", () => {
    const timeline = buildConversationTimeline(
      [{ type: "user", message: "I suspect boundaries", timestamp: 30 }],
      [
        { type: "user", message: "Help read this failure", timestamp: 10 },
        { type: "ai", message: "Inspect rollup.py", timestamp: 20 },
      ]
    )
    expect(timeline.map((entry) => [entry.role, entry.lane])).toEqual([
      ["candidate", "partner"],
      ["ai_partner", "partner"],
      ["candidate", "interviewer"],
    ])
    expect(timelineProviderHistory(timeline)[1].content).toContain("ai_partner; to=partner")
  })
  it("leaves legacy dates unknown instead of manufacturing a global chronology", () => {
    const timeline = buildConversationTimeline([{ type: "ai", message: "legacy" }], [])
    expect(timeline[0].timestamp).toBeUndefined()
    expect(timelineProviderHistory(timeline)[0].content).toContain("order unavailable")
  })
  it("includes every public file and excludes hidden grading files", () => {
    const snapshot = buildSessionContext({
      ...base,
      workspace: [
        ...Array.from({ length: 15 }, (_, i) => ({ ...source, path: `${i}.py` })),
        { ...source, path: "sealed", hidden: true },
      ],
    })
    expect(snapshot.files).toHaveLength(15)
    expect(sessionContextSchema.safeParse(snapshot).success).toBe(true)
  })
  it("pins a stable original baseline while current revisions change", () => {
    const initial = buildSessionContext(base)
    const changed = buildSessionContext({ ...base, workspace: [{ ...source, content: "after" }] })
    expect(changed.baselineVersion).toBe(initial.baselineVersion)
    expect(changed.currentRevision).not.toBe(initial.currentRevision)
    expect(changed.files[0]).toMatchObject({
      originalContent: "before",
      content: "after",
      status: "modified",
    })
    expect(buildSessionBaselinePrompt(changed)).toBe(buildSessionBaselinePrompt(initial))
  })
  it("recognizes reverted edits and does not assert missing legacy baselines", () => {
    expect(buildSessionContext(base).files[0].status).toBe("unchanged")
    expect(
      buildSessionContext({ ...base, workspace: [{ path: "old.py", content: "legacy" }] }).files[0]
        .status
    ).toBe("baseline_unknown")
  })
  it("invalidates passing-test evidence after any repository edit", () => {
    const testRunRevision = workspaceRevision([source], "before")
    expect(buildSessionContext({ ...base, testRunRevision }).testsMatchCurrentRevision).toBe(true)
    const changed = buildSessionContext({
      ...base,
      workspace: [{ ...source, content: "after" }],
      testRunRevision,
    })
    expect(changed.testsMatchCurrentRevision).toBe(false)
    expect(buildSessionEvidencePrompt(changed)).toContain('"testsMatchCurrentRevision":false')
  })
})

it("keeps the reaction on its candidate message without inventing an interviewer turn", () => {
  const timeline = buildConversationTimeline(
    [{ id: "ack", type: "user", message: "sure", reaction: "acknowledged" }],
    []
  )
  expect(timeline).toHaveLength(1)
  expect(timeline[0]).toMatchObject({
    role: "candidate",
    content: "sure",
    reaction: "acknowledged",
  })
  expect(
    sessionContextSchema.parse({ ...buildSessionContext(base), timeline }).timeline[0].reaction
  ).toBe("acknowledged")
})
