import { describe, expect, it } from "vitest"
import {
  buildDebuggingPacingGuidance,
  getInterviewerTurns,
  getProactiveBlockReason,
} from "../conversation-pacing"

describe("Sable conversation pacing", () => {
  it("does not ask another question while the candidate thinks", () => {
    expect(
      getProactiveBlockReason([
        { type: "user", message: "Two tests fail" },
        { type: "ai", message: "What observation supports your hypothesis?" },
      ])
    ).toContain("Waiting for the candidate")
  })

  it("also recognizes an imperative probe without a question mark", () => {
    expect(
      getProactiveBlockReason([{ type: "ai", message: "Walk me through the failure." }])
    ).toContain("Waiting")
  })

  it("does not keep checking in after a statement-only nudge", () => {
    expect(
      getProactiveBlockReason([
        { type: "user", message: "Reading" },
        { type: "ai", message: "Take your time." },
        { type: "ai", message: "I'm here if you need a clarification." },
      ])
    ).toContain("Already checked in")
  })

  it("a candidate reply reopens the conversation, while an acknowledgment permits one later check-in", () => {
    expect(
      getProactiveBlockReason([
        { type: "ai", message: "What happened?" },
        { type: "user", message: "Reading" },
      ])
    ).toBeNull()
    expect(
      getProactiveBlockReason([
        { type: "user", message: "Reading" },
        { type: "ai", message: "Take your time." },
      ])
    ).toBeNull()
  })

  it("does not count Sparra's question or the candidate's reply to Sparra as Sable turns", () => {
    const turns = getInterviewerTurns({
      timeline: [
        { id: "1", lane: "interviewer", role: "interviewer", content: "What did you observe?" },
        { id: "2", lane: "partner", role: "candidate", content: "Which file first?" },
        { id: "3", lane: "partner", role: "ai_partner", content: "Read the contract." },
      ],
    })
    expect(turns).toHaveLength(1)
    expect(getProactiveBlockReason(turns)).toContain("Waiting")
    expect(getInterviewerTurns(undefined, [{ type: "user", message: "legacy" }])).toHaveLength(1)
  })

  it("recognizes repeated hypothesis/evidence probes and informal candidate reasoning", () => {
    const guidance = buildDebuggingPacingGuidance([
      { type: "ai", message: "What is your hypothesis?" },
      { type: "user", message: "I think we check the array before its status" },
      { type: "ai", message: "What evidence supports that hypothesis?" },
    ])
    expect(guidance).toContain("debugging hypothesis: 2 probe(s)")
    expect(guidance).toContain("do not paraphrase it a third time")
    expect(guidance).toContain("Candidate has expressed debugging hypothesis")
    expect(guidance).not.toContain("correct hypothesis")
  })
})
