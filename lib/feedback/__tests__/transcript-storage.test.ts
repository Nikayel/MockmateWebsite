import { describe, it, expect } from "vitest"
import {
  prepareTranscriptForStorage,
  TRANSCRIPT_MAX_MESSAGES,
  TRANSCRIPT_MAX_CONTENT_CHARS,
  TRANSCRIPT_MAX_TOTAL_BYTES,
} from "../transcript-storage"

const msg = (role: string, content: string) => ({ role, content })

describe("prepareTranscriptForStorage", () => {
  it("returns null for empty or missing transcripts", () => {
    expect(prepareTranscriptForStorage(undefined)).toBeNull()
    expect(prepareTranscriptForStorage([])).toBeNull()
  })

  it("passes a normal conversation through untouched", () => {
    const result = prepareTranscriptForStorage([
      msg("interviewer", "Walk me through your approach."),
      msg("user", "I will sort first, then two-pointer."),
    ])
    expect(result).not.toBeNull()
    expect(result!.messages).toHaveLength(2)
    expect(result!.truncated).toBe(false)
    expect(result!.originalCount).toBe(2)
  })

  it("drops malformed entries instead of failing", () => {
    const result = prepareTranscriptForStorage([
      msg("user", "real"),
      { role: "user" } as never,
      { content: "no role" } as never,
      null as never,
    ])
    expect(result!.messages).toHaveLength(1)
  })

  it("keeps the most recent messages beyond the count cap", () => {
    const many = Array.from({ length: TRANSCRIPT_MAX_MESSAGES + 50 }, (_, i) =>
      msg("user", `m${i}`)
    )
    const result = prepareTranscriptForStorage(many)
    expect(result!.messages).toHaveLength(TRANSCRIPT_MAX_MESSAGES)
    expect(result!.messages.at(-1)!.content).toBe(`m${TRANSCRIPT_MAX_MESSAGES + 49}`)
    expect(result!.truncated).toBe(true)
    expect(result!.originalCount).toBe(TRANSCRIPT_MAX_MESSAGES + 50)
  })

  it("clips oversized single messages", () => {
    const result = prepareTranscriptForStorage([
      msg("user", "x".repeat(TRANSCRIPT_MAX_CONTENT_CHARS + 500)),
    ])
    expect(result!.messages[0].content).toHaveLength(TRANSCRIPT_MAX_CONTENT_CHARS)
    expect(result!.truncated).toBe(true)
  })

  it("stays under the total byte budget by shedding oldest messages", () => {
    const heavy = Array.from({ length: TRANSCRIPT_MAX_MESSAGES }, (_, i) =>
      msg("user", `${i}:` + "y".repeat(TRANSCRIPT_MAX_CONTENT_CHARS - 10))
    )
    const result = prepareTranscriptForStorage(heavy)
    expect(JSON.stringify(result!.messages).length).toBeLessThanOrEqual(TRANSCRIPT_MAX_TOTAL_BYTES)
    expect(result!.truncated).toBe(true)
    // Recency wins: the final message survives the shedding.
    expect(result!.messages.at(-1)!.content.startsWith(`${TRANSCRIPT_MAX_MESSAGES - 1}:`)).toBe(
      true
    )
  })
})
