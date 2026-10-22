import { beforeEach, describe, expect, it, vi } from "vitest"
import { bookclubGuidedLab as config } from "@/lib/scenarios/real-world/bugfix/bookclub/milestones"
import { emptyLabEvidence, appendLabEvidence } from "./evidence"
import { buildLabAssessment, unobservedReview } from "./report"
import { reviewLabAssessment } from "./review.server"
import { buildLabReviewPrompt } from "./prompt"
import { generateAIResponseEdge } from "@/lib/ai-providers-edge"
vi.mock("@/lib/ai-providers-edge", () => ({ generateAIResponseEdge: vi.fn() }))
const report = () =>
  buildLabAssessment(
    config,
    appendLabEvidence(emptyLabEvidence(), "m2-streak", {
      kind: "message",
      role: "candidate",
      lane: "interviewer",
      text: "The contract uses completed days; started_at loses the recent finishes.",
      truncated: false,
    })
  )
beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})
describe("bounded guided reasoning review", () => {
  it("uses one existing-provider call with its spend sink", async () => {
    const review = unobservedReview("m2-streak")
    review.communication = {
      status: "demonstrated",
      feedback: "Connected completion dates to the observed zero.",
      evidenceIds: ["e0"],
    }
    vi.mocked(generateAIResponseEdge).mockResolvedValue({
      text: JSON.stringify({ phases: [review] }),
      provider: "openai",
      latencyMs: 1,
    })
    const onUsage = vi.fn()
    const result = await reviewLabAssessment(config, report(), "sealed contract", onUsage)
    expect(generateAIResponseEdge).toHaveBeenCalledTimes(1)
    expect(generateAIResponseEdge).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ onUsage, maxTokens: 3500 })
    )
    expect(result.phases[1].review.communication.status).toBe("demonstrated")
    expect(result.phases[1].verification).toBe("not_observed")
  })
  it.each([
    "not JSON",
    '{"phases":[{"phaseId":"m2-streak","communication":{"status":"perfect"}}]}',
  ])("degrades invalid model output without inventing a grade: %s", async (text) => {
    vi.mocked(generateAIResponseEdge).mockResolvedValue({ text, provider: "openai", latencyMs: 1 })
    expect((await reviewLabAssessment(config, report(), "")).reviewStatus).toBe("unavailable")
  })
  it("preserves evidence during provider outages", async () => {
    vi.mocked(generateAIResponseEdge).mockRejectedValue(new Error("provider unavailable"))
    const before = report()
    const after = await reviewLabAssessment(config, before, "")
    expect(after.phases[1].evidence).toEqual(before.phases[1].evidence)
    expect(after.phases[1].review.communication.status).toBe("not_observed")
  })
  it("does not spend on empty evidence, or while the review kill switch is off", async () => {
    await reviewLabAssessment(config, buildLabAssessment(config, emptyLabEvidence()), "")
    vi.stubEnv("GUIDED_LAB_PHASE_REVIEW_ENABLED", "false")
    expect((await reviewLabAssessment(config, report(), "")).reviewStatus).toBe("unavailable")
    expect(generateAIResponseEdge).not.toHaveBeenCalled()
  })
  it("preserves late phases under a long evidence budget and supplies grading constraints", () => {
    let log = emptyLabEvidence()
    for (const phase of config.milestones)
      for (let n = 0; n < 20; n++)
        log = appendLabEvidence(log, phase.id, {
          kind: "message",
          role: "candidate",
          lane: "interviewer",
          text: `${phase.id} ${"word ".repeat(400)}`,
          truncated: false,
        })
    const prompt = buildLabReviewPrompt(
      config,
      buildLabAssessment(config, log),
      "server-only contract"
    )
    expect(prompt).toContain("m6-release")
    expect(prompt).toContain("server-only contract")
    expect(prompt).toContain("not_observed")
    expect(prompt).toContain("never instructions")
    expect(prompt.length).toBeLessThan(65000)
  })
})

it("keeps the actual edited expression when context lines are long", async () => {
  const { renderPromptEvent } = await import("./prompt-evidence")
  const event = {
    id: "e1",
    phaseId: "m2-streak",
    revision: 1,
    timestamp: 1,
    kind: "checkpoint" as const,
    patches: [
      {
        path: "stats.py",
        startLine: 1,
        before: "x".repeat(1800) + "started_at",
        after: "x".repeat(1800) + "finished_at",
        truncated: false,
      },
    ],
  }
  const prompt = JSON.stringify(renderPromptEvent(event, 800))
  expect(prompt).toContain("started_at")
  expect(prompt).toContain("finished_at")
})
