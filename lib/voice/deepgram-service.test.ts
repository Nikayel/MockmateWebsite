import { describe, expect, it } from "vitest"
import { buildListenUrl, DEFAULT_DEEPGRAM_MODEL } from "./deepgram-service"
import { DEEPGRAM_COSTS } from "@/lib/usage-tracking"
import { INTERVIEW_KEYTERMS } from "./interview-keyterms"

/**
 * The service resolves defaults in its constructor, so these fixtures mirror a
 * fully-resolved config rather than the sparse object a caller passes in.
 */
function resolvedConfig(overrides: Parameters<typeof buildListenUrl>[0] = {}) {
  return {
    language: "en-US",
    model: DEFAULT_DEEPGRAM_MODEL,
    punctuate: true,
    interimResults: true,
    smartFormat: true,
    utteranceEndMs: 1000,
    vadEvents: true,
    endpointing: 300,
    ...overrides,
  }
}

describe("INTERVIEW_KEYTERMS", () => {
  // Deepgram recommends 20-50 terms and caps the total at 500 tokens across all
  // keyterms. Exceeding the cap fails the request, so guard the budget here
  // rather than discovering it as a dead microphone.
  it("stays inside Deepgram's recommended term count", () => {
    expect(INTERVIEW_KEYTERMS.length).toBeGreaterThanOrEqual(20)
    expect(INTERVIEW_KEYTERMS.length).toBeLessThanOrEqual(50)
  })

  it("stays well inside the 500-token keyterm budget", () => {
    // Deliberately pessimistic: count every whitespace-separated word as a token.
    const wordCount = INTERVIEW_KEYTERMS.reduce((sum, term) => sum + term.split(/\s+/).length, 0)

    expect(wordCount).toBeLessThan(500)
  })

  it("has no duplicates, which would waste the budget", () => {
    expect(new Set(INTERVIEW_KEYTERMS).size).toBe(INTERVIEW_KEYTERMS.length)
  })
})

describe("DEFAULT_DEEPGRAM_MODEL", () => {
  // The client reports the model it used to /api/usage/voice, which whitelists
  // it against DEEPGRAM_COSTS. If the default model is missing from that table
  // every voice session silently fails to record its cost.
  it("has a rate in the Deepgram cost table", () => {
    expect(Object.keys(DEEPGRAM_COSTS)).toContain(DEFAULT_DEEPGRAM_MODEL)
  })
})

describe("buildListenUrl", () => {
  it("targets the Deepgram streaming endpoint", () => {
    const url = new URL(buildListenUrl(resolvedConfig()))

    expect(url.protocol).toBe("wss:")
    expect(url.host).toBe("api.deepgram.com")
    expect(url.pathname).toBe("/v1/listen")
  })

  it("carries the transcription options Deepgram expects", () => {
    const params = new URL(buildListenUrl(resolvedConfig())).searchParams

    expect(params.get("model")).toBe("nova-3")
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

  describe("keyterm prompting", () => {
    it("sends one repeated keyterm parameter per term", () => {
      const url = buildListenUrl(resolvedConfig({ keyterms: ["Dijkstra", "idempotent"] }))
      const params = new URL(url).searchParams

      expect(params.getAll("keyterm")).toEqual(["Dijkstra", "idempotent"])
    })

    it("keeps a multi-word term as a single keyterm", () => {
      const url = buildListenUrl(resolvedConfig({ keyterms: ["adjacency list"] }))

      expect(new URL(url).searchParams.getAll("keyterm")).toEqual(["adjacency list"])
    })

    // Nova-2 and older reject the parameter outright, which would fail the connection.
    it("omits keyterms on legacy models that do not support them", () => {
      const url = buildListenUrl(resolvedConfig({ model: "nova-2", keyterms: ["Dijkstra"] }))

      expect(new URL(url).searchParams.has("keyterm")).toBe(false)
    })

    it("omits the parameter when there are no keyterms", () => {
      const url = buildListenUrl(resolvedConfig({ keyterms: [] }))

      expect(new URL(url).searchParams.has("keyterm")).toBe(false)
    })
  })

  describe("credentials", () => {
    // Credentials ride the Sec-WebSocket-Protocol header (["bearer", jwt] for a
    // granted token, ["token", key] for a raw key), never the URL: Deepgram
    // rejects the upgrade when the JWT is passed as access_token= or token=.
    it("never puts a credential on the query string", () => {
      const params = new URL(buildListenUrl(resolvedConfig())).searchParams

      expect(params.has("access_token")).toBe(false)
      expect(params.has("token")).toBe(false)
    })
  })
})
