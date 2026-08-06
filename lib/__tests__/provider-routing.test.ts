import { describe, expect, it, vi, beforeAll } from "vitest"

/**
 * The routing table is the whole model strategy, so it is worth pinning as a
 * contract rather than trusting a comment.
 *
 * Two classes of defect motivate this file. Both already happened once:
 *
 * 1. A provider pinned to a model the vendor had retired. `deepseek-chat` was
 *    removed by DeepSeek on 2026-07-24 and the fallback stayed "configured" and
 *    dead for two weeks, because nothing asserted which model id it names.
 * 2. A capability silently taking the API's default reasoning effort. Omitting
 *    `reasoning_effort` means `medium`, so a missing entry is not a crash, it is
 *    a quiet and permanent cost and latency change on that path.
 */

// The module logs provider status and reads env at import time.
vi.mock("../logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

type Providers = Record<string, { model: string; enabled: boolean; reasoningEffort?: string }>

let getProviderStatus: () => Providers
let FALLBACK_ORDER: Record<string, string[]>

beforeAll(async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-openai")
  vi.stubEnv("DEEPSEEK_API_KEY", "test-deepseek")
  vi.stubEnv("GEMINI_API_KEY", "test-gemini")
  const mod = await import("../ai-providers")
  getProviderStatus = mod.getProviderStatus as unknown as () => Providers
  FALLBACK_ORDER = mod.FALLBACK_ORDER as unknown as Record<string, string[]>
})

/**
 * The effort each capability is supposed to buy.
 *
 * Asserted against the real table below rather than standing in for it: a test
 * that only checks its own copy of a mapping proves nothing.
 */
const EXPECTED_EFFORT: Record<string, string> = {
  simple: "none",
  standard: "low",
  dialogue: "low",
  code: "low",
  complex: "high",
  critique: "xhigh",
}

describe("provider routing", () => {
  it("exposes every configured provider, including ones added after the accessor was written", () => {
    // getProviderStatus used to be a hand-written object literal, so a new
    // provider was invisible to the startup log and every status caller.
    const status = getProviderStatus()
    for (const provider of [
      "openai-none",
      "openai-low",
      "openai-high",
      "openai-xhigh",
      "gemini",
      "gemini-lite",
      "deepseek",
      "deepseek-chat",
      "claude",
    ]) {
      expect(status[provider], provider).toBeDefined()
    }
  })

  it("names no retired model id", () => {
    // `deepseek-chat` and `deepseek-reasoner` were retired 2026-07-24; the
    // gemini-2.5-* pins are retired by Google 2026-10-16.
    const RETIRED = [
      "deepseek-chat",
      "deepseek-reasoner",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ]
    const status = getProviderStatus()
    for (const [provider, config] of Object.entries(status)) {
      expect(RETIRED, `${provider} is pinned to a retired model: ${config.model}`).not.toContain(
        config.model
      )
    }
  })

  it("gives every OpenAI provider an explicit reasoning effort", () => {
    // An omitted effort is not a crash, it is a silent `medium`.
    const status = getProviderStatus()
    for (const [provider, config] of Object.entries(status)) {
      if (!provider.startsWith("openai-")) continue
      expect(config.reasoningEffort, `${provider} has no explicit effort`).toBeDefined()
      // The provider name IS the effort; a mismatch means the routing table
      // reads as one thing and behaves as another.
      expect(config.reasoningEffort, provider).toBe(provider.replace("openai-", ""))
    }
  })

  it("keeps every OpenAI provider on the same model, so effort is the only dial", () => {
    const status = getProviderStatus()
    const models = new Set(
      Object.entries(status)
        .filter(([p]) => p.startsWith("openai-"))
        .map(([, c]) => c.model)
    )
    expect(models.size, `expected one model, got ${[...models].join(", ")}`).toBe(1)
  })

  it("covers each capability's intended effort with a provider that exists", () => {
    const status = getProviderStatus()
    for (const [capability, effort] of Object.entries(EXPECTED_EFFORT)) {
      const provider = `openai-${effort}`
      expect(status[provider], `${capability} wants effort "${effort}"`).toBeDefined()
      expect(status[provider].reasoningEffort).toBe(effort)
    }
  })

  it("buys the most thinking on the scoring path", () => {
    // `critique` backs constitutional AI, structured extraction and transcript
    // analysis: its output becomes a number on a real user's session.
    const EFFORT_RANK = ["none", "low", "medium", "high", "xhigh", "max"]
    const critique = EXPECTED_EFFORT.critique
    for (const [capability, effort] of Object.entries(EXPECTED_EFFORT)) {
      if (capability === "critique") continue
      expect(
        EFFORT_RANK.indexOf(critique),
        `${capability} should not out-think critique`
      ).toBeGreaterThanOrEqual(EFFORT_RANK.indexOf(effort))
    }
  })

  it("keeps the conversational paths at low effort or below", () => {
    // dialogue runs ~20 turns a session. Reasoning tokens there are dead air,
    // and this is the regression that a well-meaning "raise quality" edit makes.
    const EFFORT_RANK = ["none", "low", "medium", "high", "xhigh", "max"]
    for (const capability of ["dialogue", "code", "simple"]) {
      expect(
        EFFORT_RANK.indexOf(EXPECTED_EFFORT[capability]),
        `${capability} must stay latency-first`
      ).toBeLessThanOrEqual(EFFORT_RANK.indexOf("low"))
    }
  })

  it("routes the two score-producing paths to the stronger DeepSeek tier", () => {
    // complex and critique fall back to `deepseek` (V4 Pro); everything else
    // falls back to `deepseek-chat` (V4 Flash). Before V4 both keys named the
    // same retired model, so this distinction was decorative.
    const status = getProviderStatus()
    expect(status["deepseek"].model).toBe("deepseek-v4-pro")
    expect(status["deepseek-chat"].model).toBe("deepseek-v4-flash")
  })

  it("orders every capability OpenAI -> DeepSeek -> Gemini", () => {
    expect(Object.keys(FALLBACK_ORDER).length).toBeGreaterThan(0)
    for (const [capability, chain] of Object.entries(FALLBACK_ORDER)) {
      expect(chain[0], `${capability} must lead with OpenAI`).toMatch(/^openai-/)
      expect(chain[1], `${capability} must fall back to DeepSeek`).toMatch(/^deepseek/)
      expect(chain[2], `${capability} must end on Gemini`).toMatch(/^gemini/)
    }
  })

  it("routes each capability to the effort this file documents", () => {
    // The real assertion: EXPECTED_EFFORT is checked against the shipped table,
    // so changing the routing without changing the stated intent fails here.
    expect(Object.keys(FALLBACK_ORDER).sort()).toEqual(Object.keys(EXPECTED_EFFORT).sort())
    for (const [capability, effort] of Object.entries(EXPECTED_EFFORT)) {
      expect(FALLBACK_ORDER[capability][0], capability).toBe(`openai-${effort}`)
    }
  })

  it("gives the score-producing capabilities the stronger DeepSeek rung", () => {
    for (const capability of ["complex", "critique"]) {
      expect(FALLBACK_ORDER[capability][1], capability).toBe("deepseek")
    }
    for (const capability of ["simple", "standard", "dialogue", "code"]) {
      expect(FALLBACK_ORDER[capability][1], capability).toBe("deepseek-chat")
    }
  })

  it("does not route anything to Claude", () => {
    // Kept configured for a preferredProvider override, but deliberately out of
    // the automatic chain. Three vendors is already deeper than the outage
    // history justifies.
    for (const [capability, chain] of Object.entries(FALLBACK_ORDER)) {
      expect(chain, capability).not.toContain("claude")
    }
  })
})
