import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({
  flush: vi.fn(async () => {}),
  client: vi.fn(),
  trace: vi.fn(),
  after: vi.fn(),
}))
vi.mock("langsmith", () => ({
  Client: class {
    constructor(options: unknown) {
      mocks.client(options)
    }
    awaitPendingTraceBatches = mocks.flush
  },
}))
vi.mock("langsmith/traceable", () => ({
  traceable: (run: () => Promise<unknown>, config: unknown) => {
    mocks.trace(config)
    return run
  },
}))
vi.mock("next/server", () => ({ after: mocks.after }))
import { handoffTraceSummary, tracePartnerHandoff } from "./tracing"
const result = {
  provider: "openai-none",
  latencyMs: 12,
  tokensIn: 20,
  tokensOut: 10,
  action: { type: "open_sparra" },
  text: "private conversation",
  prompt: "private code",
}
beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllEnvs())
describe("optional handoff tracing", () => {
  it("allowlists operational output only", () => {
    expect(handoffTraceSummary(result)).toEqual({
      provider: "openai-none",
      latency_ms: 12,
      input_tokens: 20,
      output_tokens: 10,
      handoff: true,
    })
  })
  it("runs with no tracing client when the API key is absent", async () => {
    vi.stubEnv("LANGSMITH_TRACING", "true")
    vi.stubEnv("LANGSMITH_API_KEY", "")
    expect(await tracePartnerHandoff(async () => result)).toBe(result)
    expect(mocks.client).not.toHaveBeenCalled()
    expect(mocks.trace).toHaveBeenCalledWith(expect.objectContaining({ tracingEnabled: false }))
  })
  it("flushes in serverless background work and redacts inputs", async () => {
    vi.stubEnv("LANGSMITH_TRACING", "true")
    vi.stubEnv("LANGSMITH_API_KEY", "fake-test-key")
    expect(await tracePartnerHandoff(async () => result)).toBe(result)
    expect(mocks.client).toHaveBeenCalledWith(
      expect.objectContaining({ hideInputs: true, omitTracedRuntimeInfo: true })
    )
    expect(mocks.after).toHaveBeenCalledOnce()
    await mocks.after.mock.calls[0][0]()
    expect(mocks.flush).toHaveBeenCalledOnce()
  })
  it("does not repeat an unsuccessful model call", async () => {
    vi.stubEnv("LANGSMITH_TRACING", "true")
    vi.stubEnv("LANGSMITH_API_KEY", "fake-test-key")
    const run = vi.fn(async () => {
      throw new Error("provider unavailable")
    })
    await expect(tracePartnerHandoff(run)).rejects.toThrow("provider unavailable")
    expect(run).toHaveBeenCalledOnce()
    expect(mocks.after).toHaveBeenCalledOnce()
  })
  it("still runs once if instrumentation initialization throws", async () => {
    vi.stubEnv("LANGSMITH_TRACING", "true")
    vi.stubEnv("LANGSMITH_API_KEY", "fake-test-key")
    mocks.trace.mockImplementationOnce(() => {
      throw new Error("tracer failed")
    })
    const run = vi.fn(async () => result)
    expect(await tracePartnerHandoff(run)).toBe(result)
    expect(run).toHaveBeenCalledOnce()
  })

  it("does not fail or regenerate a response when a trace flush fails", async () => {
    vi.stubEnv("LANGSMITH_TRACING", "true")
    vi.stubEnv("LANGSMITH_API_KEY", "fake-test-key")
    mocks.flush.mockRejectedValueOnce(new Error("tracing unavailable"))
    const run = vi.fn(async () => result)
    expect(await tracePartnerHandoff(run)).toBe(result)
    await expect(mocks.after.mock.calls[0][0]()).resolves.toBeUndefined()
    expect(run).toHaveBeenCalledOnce()
  })
})
