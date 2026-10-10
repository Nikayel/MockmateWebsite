import { describe, expect, it } from "vitest"
import { scenarios } from "@/lib/scenarios"
import { getScenarioLanguages } from "@/lib/scenarios/languages"
import { selectNextPractice } from "../next-practice"
import { EDITOR_LANGUAGES } from "@/lib/interview/languages"

describe("next practice against the real catalog", () => {
  it.each(["dsa", "bugfix", "system-design", "add-functionality"] as const)(
    "keeps %s recommendations in track and language",
    (type) => {
      let matches = 0
      for (const current of scenarios.filter((scenario) => scenario.type === type)) {
        const language =
          current.workspace?.language ??
          (current.type === "bugfix" ? current.pack?.language : undefined) ??
          (current.type === "dsa"
            ? Object.keys(current.starterCode)[0]
            : getScenarioLanguages(current)[0])
        const next = selectNextPractice(
          {
            id: "s",
            user_id: "u",
            started_at: "today",
            topic: current.title,
            type,
            scenario_id: current.id,
            difficulty: current.difficulty,
            language,
          },
          scenarios
        )
        if (!next) continue
        matches++
        expect(next.type).toBe(type)
        expect(next.scenarioId).not.toBe(current.id)
        const candidate = scenarios.find((scenario) => scenario.id === next.scenarioId)!
        if (candidate.workspace) {
          expect(
            EDITOR_LANGUAGES.some((supported) => supported === candidate.workspace?.language)
          ).toBe(true)
        }
        expect(["easy", "medium", "hard"].indexOf(candidate.difficulty)).toBeLessThanOrEqual(
          ["easy", "medium", "hard"].indexOf(current.difficulty)
        )
        if (candidate.workspace) expect(candidate.workspace.language).toBe(language)
        else if (type !== "system-design" && language)
          expect(new URL(next.href, "https://example.com").searchParams.get("language")).toBe(
            language
          )
        if (candidate.type === "bugfix") expect(candidate.bugfixKind).not.toBe("micro-debugging")
        expect(next.estimatedMinutes).toBe(candidate.estimatedTime)
      }
      expect(matches).toBeGreaterThan(0)
    }
  )

  it("ranks explicit debugging evidence ahead of generic similarity", () => {
    const current = scenarios.find(
      (scenario) => scenario.type === "bugfix" && scenario.workspace?.language === "javascript"
    )!
    if (current.type !== "bugfix") throw new Error("Expected a debugging fixture")
    const next = selectNextPractice(
      {
        id: "source",
        user_id: "owner",
        started_at: "today",
        topic: current.title,
        type: "bugfix",
        scenario_id: current.id,
        difficulty: current.difficulty,
        language: "javascript",
        bugfix_evidence_summary: { rootCauseExplained: false },
      },
      [
        current,
        { ...current, id: "generic", debuggingSkills: ["verification"], estimatedTime: 5 },
        {
          ...current,
          id: "root-cause",
          debuggingSkills: ["root cause analysis"],
          estimatedTime: 30,
        },
      ]
    )
    expect(next?.scenarioId).toBe("root-cause")
    expect(next?.focusSource).toBe("bugfix-evidence")
  })

  it("excludes tutorial-only SQL workspaces even when no language was stored", () => {
    const current = scenarios.find(
      (scenario) => scenario.type === "bugfix" && scenario.workspace?.language === "javascript"
    )!
    const sql = {
      ...current,
      id: "tutorial-only-sql",
      difficulty: "easy" as const,
      workspace: { ...current.workspace!, language: "sql" as const },
    }
    expect(
      selectNextPractice(
        {
          id: "source",
          user_id: "owner",
          started_at: "today",
          topic: current.title,
          type: current.type,
          scenario_id: current.id,
          difficulty: current.difficulty,
        },
        [current, sql]
      )
    ).toBeNull()
  })
})
