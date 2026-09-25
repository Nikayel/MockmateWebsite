import { describe, expect, it } from "vitest"
import { createServerSentEventParser } from "../sse-parser"

const encoder = new TextEncoder()

describe("createServerSentEventParser", () => {
  it("preserves the event name when event and data arrive in different chunks", () => {
    const parser = createServerSentEventParser()

    expect(parser.push(encoder.encode("event: feedback\n"))).toEqual([])
    expect(parser.push(encoder.encode('data: {"raw":"complete"}\n\n'))).toEqual([
      { event: "feedback", data: '{"raw":"complete"}' },
    ])
  })

  it("preserves JSON split across arbitrary chunks", () => {
    const parser = createServerSentEventParser()

    expect(parser.push(encoder.encode('event: refined_scores\ndata: {"overall":'))).toEqual([])
    expect(parser.push(encoder.encode("83}\n\n"))).toEqual([
      { event: "refined_scores", data: '{"overall":83}' },
    ])
  })

  it("decodes a multibyte character split between byte chunks", () => {
    const parser = createServerSentEventParser()
    const prefix = encoder.encode('event: feedback\ndata: {"raw":"')
    const emoji = encoder.encode("✅")
    const suffix = encoder.encode('"}\n\n')

    const firstChunk = new Uint8Array(prefix.length + 1)
    firstChunk.set(prefix)
    firstChunk.set(emoji.slice(0, 1), prefix.length)

    const secondChunk = new Uint8Array(emoji.length - 1 + suffix.length)
    secondChunk.set(emoji.slice(1))
    secondChunk.set(suffix, emoji.length - 1)

    expect(parser.push(firstChunk)).toEqual([])
    expect(parser.push(secondChunk)).toEqual([
      { event: "feedback", data: '{"raw":"✅"}' },
    ])
  })

  it("parses multiple events from one chunk", () => {
    const parser = createServerSentEventParser()

    expect(
      parser.push(
        encoder.encode(
          'event: scores\ndata: {"overall":70}\n\nevent: done\ndata: {"success":true}\n\n'
        )
      )
    ).toEqual([
      { event: "scores", data: '{"overall":70}' },
      { event: "done", data: '{"success":true}' },
    ])
  })

  it("supports CRLF, multiline data, and heartbeat comments", () => {
    const parser = createServerSentEventParser()

    expect(
      parser.push(
        encoder.encode(
          ': heartbeat\r\n\r\nevent: message\r\ndata: {"first":true,\r\ndata: "second":true}\r\n\r\n'
        )
      )
    ).toEqual([{ event: "message", data: '{"first":true,\n"second":true}' }])
  })

  it("keeps later events intact after a malformed payload", () => {
    const parser = createServerSentEventParser()

    expect(
      parser.push(
        encoder.encode(
          'event: feedback\ndata: not-json\n\nevent: done\ndata: {"success":true}\n\n'
        )
      )
    ).toEqual([
      { event: "feedback", data: "not-json" },
      { event: "done", data: '{"success":true}' },
    ])
  })

  it("rejects an unterminated event at end of stream", () => {
    const parser = createServerSentEventParser()
    parser.push(encoder.encode('event: feedback\ndata: {"raw":"truncated"}'))

    expect(() => parser.finish()).toThrow("SSE stream ended with an incomplete event")
  })

  it("bounds an unterminated frame", () => {
    const parser = createServerSentEventParser(20)

    expect(() => parser.push(encoder.encode(`data: ${"x".repeat(20)}`))).toThrow(
      "SSE frame exceeded the maximum allowed size"
    )
  })
})
