import { describe, expect, it, vi } from "vitest"
import { addFunctionalityScenarios } from "@/lib/scenarios/add-functionality"
import { bugfixScenarios } from "@/lib/scenarios/real-world/bugfix/all"
import { buildSessionContext } from "@/lib/interview/session-context/snapshot"
import { loadSealedLegacyBugfix } from "@/lib/scenarios/sealed/legacy-registry.server"
import { buildChatModelInput } from "../model-input"
import { buildChatRequestContext } from "../request-context"
import type { ChatInterviewState } from "../interview-state"

vi.mock("../retrieval-context", () => ({ buildChatRetrievalContext: async () => "" }))

describe("published debugging scenario context", () => {
  const scenario = bugfixScenarios.find(
    (entry) => entry.id === "bugfix-rate-limiter-error-handling"
  )!
  const sessionContext = buildSessionContext({
    task: {
      id: scenario.id,
      title: scenario.title,
      type: scenario.type,
      description: scenario.description,
    },
    workspace: scenario.workspace!.files.map((file) => ({
      ...file,
      originalContent: file.content,
    })),
    code: scenario.buggyCode.javascript,
    interviewerMessages: [],
    partnerMessages: [],
  })
  const state: ChatInterviewState = {
    currentPhase: "discussion",
    phaseContext: {
      hasSubmitted: false,
      testsHaveRun: false,
      currentCodeLength: 0,
      starterCodeLength: 0,
      messageCount: 0,
    },
    tracker: undefined,
    testsHaveRunNow: false,
    testResultsArray: undefined,
    currentCodeLen: 0,
    starterLen: 0,
  }

  it.each(["interviewer", "partner"] as const)(
    "grounds the %s in the public task without a sealed answer",
    async (role) => {
      const input = await buildChatModelInput(
        buildChatRequestContext({
          role,
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          scenarioType: scenario.type,
          sessionContext,
          message: "I am reading the incident.",
        }),
        state,
        {},
        undefined
      )
      expect(input.systemPrompt).toContain("Every other thrown value must propagate unchanged")
      expect(input.systemPrompt).toContain(
        "A write timeout may occur after the reservation committed"
      )
      expect(input.systemPrompt).toContain("src/window-store.js")
      expect(input.systemPrompt).not.toContain("tests/rate-limiter.hidden.test.js")
      expect(input.systemPrompt).not.toContain(
        "if (error instanceof StoreUnavailableError) return false"
      )
      const sealed = await loadSealedLegacyBugfix(scenario.id)
      expect(input.systemPrompt).not.toContain(sealed!.bugDescription!)
    }
  )

  it("loads scenario-specific root-cause and trade-off feedback from the sealed registry", async () => {
    const sealed = await loadSealedLegacyBugfix(scenario.id)
    expect(sealed?.rootCauseRubric?.join(" ")).toContain("caller-owned reporting")
    expect(sealed?.fixTradeoffs).toContain("trades availability for quota enforcement")
    expect(sealed?.fixTradeoffs).toContain("do not call the entire request O(1)")
  })
  for (const published of [...bugfixScenarios, ...addFunctionalityScenarios]) {
    it.each(["interviewer", "partner"] as const)(
      `${published.id} gives the %s its full public assignment and excludes hidden tests`,
      async (role) => {
        const publicContext = buildSessionContext({
          task: {
            id: published.id,
            title: published.title,
            type: published.type,
            description: published.description,
          },
          workspace: published.workspace!.files.map((file) => ({
            ...file,
            originalContent: file.content,
          })),
          code: "",
          interviewerMessages: [],
          partnerMessages: [],
        })
        const input = await buildChatModelInput(
          buildChatRequestContext({
            role,
            scenarioId: published.id,
            scenarioTitle: published.title,
            scenarioType: published.type,
            sessionContext: publicContext,
            message: "I am reading the task.",
          }),
          state,
          {},
          undefined
        )
        const taskDocument = published.workspace!.files.find((file) => file.path === "task.md")!
        expect(input.systemPrompt).toContain(JSON.stringify(taskDocument.content))
        for (const file of published.workspace!.files) {
          if (file.hidden)
            expect(publicContext.files.some((entry) => entry.path === file.path)).toBe(false)
          else expect(input.systemPrompt).toContain(JSON.stringify(file.content))
        }
      }
    )
  }
})
