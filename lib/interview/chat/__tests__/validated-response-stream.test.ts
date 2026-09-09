import { describe, expect, it, vi } from "vitest"
import {
  createValidatedChatStream,
  readValidatedChatStream,
  VALIDATED_CHAT_STREAM_CONTENT_TYPE,
} from "../validated-response-stream"

describe("validated chat response stream", () => {
  it("reveals only the finalized response and preserves its metadata", async () => {
    const response = createValidatedChatStream(
      {
        reply: "Let's walk through the trade-offs.",
        provider: "test-provider",
        latencyMs: 42,
      },
      { chunkDelayMs: 0 }
    )
    const onDelta = vi.fn()

    const complete = await readValidatedChatStream(response, onDelta)

    expect(response.headers.get("content-type")).toContain(VALIDATED_CHAT_STREAM_CONTENT_TYPE)
    expect(onDelta.mock.calls.flat()).toEqual(["Let's walk through the trade-offs."])
    expect(complete).toEqual({
      reply: "Let's walk through the trade-offs.",
      provider: "test-provider",
      latencyMs: 42,
    })
  })
})
