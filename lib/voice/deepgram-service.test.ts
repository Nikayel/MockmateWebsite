import { describe, expect, it } from "vitest"
import { buildListenUrl } from "./deepgram-service"

/**
 * The service resolves defaults in its constructor, so these fixtures mirror a
 * fully-resolved config rather than the sparse object a caller passes in.
 */
function resolvedConfig(overrides: Parameters<typeof buildListenUrl>[0] = {}) {
  return {
    language: "en-US",
    model: "nova-2" as const,
    punctuate: true,
    interimResults: true,
    smartFormat: true,
    utteranceEndMs: 1000,
    vadEvents: true,
    endpointing: 300,
    ...overrides,
  }
}

describe("buildListenUrl", () => {
  it("targets the Deepgram streaming endpoint", () => {
    const url = new URL(buildListenUrl(resolvedConfig()))

    expect(url.protocol).toBe("wss:")
    expect(url.host).toBe("api.deepgram.com")
    expect(url.pathname).toBe("/v1/listen")
  })

  it("carries the transcription options Deepgram expects", () => {
    const params = new URL(buildListenUrl(resolvedConfig())).searchParams

    expect(params.get("model")).toBe("nova-2")
    expect(params.get("language")).toBe("en-US")
    expect(params.get("punctuate")).toBe("true")
    expect(params.get("interim_results")).toBe("true")
    expect(params.get("smart_format")).toBe("true")
    expect(params.get("utterance_end_ms")).toBe("1000")
    expect(params.get("vad_events")).toBe("true")
  })

  it("sends endpointing when it is a number", () => {
    const params = new URL(buildListenUrl(resolvedConfig({ endpointing: 500 }))).searchParams

    expect(params.get("endpointing")).toBe("500")
  })

  it("omits endpointing entirely when it is disabled", () => {
    const params = new URL(buildListenUrl(resolvedConfig({ endpointing: false }))).searchParams

    expect(params.has("endpointing")).toBe(false)
  })

  describe("access token", () => {
    // A browser cannot set an Authorization header on a WebSocket, and a granted
    // JWT is too long for Sec-WebSocket-Protocol, so it has to ride the query string.
    it("carries a granted token as access_token", () => {
      const params = new URL(buildListenUrl(resolvedConfig(), "granted.jwt.value")).searchParams

      expect(params.get("access_token")).toBe("granted.jwt.value")
    })

    it("omits access_token when no token is supplied", () => {
      const params = new URL(buildListenUrl(resolvedConfig())).searchParams

      expect(params.has("access_token")).toBe(false)
    })

    it("percent-encodes the token so JWT padding cannot break the query string", () => {
      const url = buildListenUrl(resolvedConfig(), "a+b/c=")

      expect(url).not.toContain("a+b/c=")
      expect(new URL(url).searchParams.get("access_token")).toBe("a+b/c=")
    })
  })
})
