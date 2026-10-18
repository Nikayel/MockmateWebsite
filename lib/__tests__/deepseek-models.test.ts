import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MODEL_CONTEXT_LIMITS, MODEL_FAMILIES } from "../token-counter"

describe("DeepSeek model configuration", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv("DEEPSEEK_MODEL_FLASH", "")
    vi.stubEnv("DEEPSEEK_MODEL_PRO", "")
  })

  afterEach(() => vi.unstubAllEnvs())

  it("uses the vendor's current Flash name while preserving Pro for scoring", async () => {
    const { DEEPSEEK_MODELS } = await import("../ai/model-ids")
    expect(DEEPSEEK_MODELS).toEqual({ flash: "deepseek-flash", pro: "deepseek-v4-pro" })
  })

  it("retains deployment overrides for both tiers", async () => {
    vi.stubEnv("DEEPSEEK_MODEL_FLASH", "deployment-flash")
    vi.stubEnv("DEEPSEEK_MODEL_PRO", "deployment-pro")
    const { DEEPSEEK_MODELS } = await import("../ai/model-ids")
    expect(DEEPSEEK_MODELS).toEqual({ flash: "deployment-flash", pro: "deployment-pro" })
  })

  it("recognizes every default model in token and context accounting", async () => {
    const { DEEPSEEK_MODELS } = await import("../ai/model-ids")
    for (const model of Object.values(DEEPSEEK_MODELS)) {
      expect(MODEL_FAMILIES).toHaveProperty(model, "cl100k_base")
      expect(MODEL_CONTEXT_LIMITS).toHaveProperty(model, 1_000_000)
    }
  })

  it("keeps the operational drill and example overrides aligned with production", async () => {
    const { DEEPSEEK_MODELS } = await import("../ai/model-ids")
    const drill = readFileSync("scripts/ai-fallback-drill.mjs", "utf8")
    const example = readFileSync(".env.example", "utf8")
    for (const [tier, model] of Object.entries(DEEPSEEK_MODELS)) {
      const envKey = `DEEPSEEK_MODEL_${tier.toUpperCase()}`
      expect(drill).toContain(`process.env.${envKey} || "${model}"`)
      expect(example).toContain(`# ${envKey}=${model}`)
    }
  })
})
