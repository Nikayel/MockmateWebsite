import { describe, expect, it } from "vitest"
import type { DSAScenario } from "@/lib/scenarios/types"
import type { InterviewSession } from "@/lib/types"
import { selectNextPractice } from "../next-practice"
import { getNextPracticeFocus } from "../next-practice-focus"
import { isNextPracticeEntry } from "@/lib/interview/next-practice-entry"

function problem(id: string, changes: Partial<DSAScenario> = {}): DSAScenario {
  return {
    id,
    title: id,
    type: "dsa",
    difficulty: "medium",
    pattern: "arrays-hashing",
    description: "Practice",
    tags: ["arrays"],
    companies: [],
    estimatedTime: 25,
    problemStatement: "Task",
    examples: [],
    constraints: [],
    hints: [],
    starterCode: { python: "pass", javascript: "// start" },
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    testCases: [],
    ...changes,
  }
}
const session: InterviewSession = {
  id: "session-1",
  user_id: "user-1",
  started_at: "2026-10-04T10:00:00Z",
  type: "dsa",
  scenario_id: "current",
  difficulty: "medium",
  topic: "current",
  language: "python",
}
const current = problem("current")

describe("exact next practice", () => {
  it("prefers the same pattern even when another problem is shorter", () => {
    const next = selectNextPractice(session, [
      current,
      problem("graph", { pattern: "graphs", estimatedTime: 5 }),
      problem("same"),
    ])
    expect(next?.scenarioId).toBe("same")
    expect(next?.estimatedMinutes).toBe(25)
    expect(next?.reason).toBe("Practice Arrays Hashing with a different problem.")
    const params = new URL(next!.href, "https://example.com").searchParams
    expect(isNextPracticeEntry(params)).toBe(true)
    expect(params.get("scenario")).toBe("same")
    expect(params.get("language")).toBe("python")
    expect(params.get("fromSession")).toBe(session.id)
    expect(params.has("practice")).toBe(false)
  })

  it("excludes current, recent, harder and unsupported-language tasks", () => {
    const catalog = [
      current,
      problem("done"),
      problem("hard", { difficulty: "hard" }),
      problem("js", { starterCode: { javascript: "start" } }),
      problem("eligible"),
    ]
    expect(selectNextPractice(session, catalog, ["done"])?.scenarioId).toBe("eligible")
    expect(selectNextPractice(session, catalog, ["done", "eligible"])).toBeNull()
  })

  it("prefers an easier task after a weak score and uses legacy mastery scores", () => {
    const catalog = [current, problem("medium"), problem("easy", { difficulty: "easy" })]
    expect(selectNextPractice({ ...session, technical_score: 40 }, catalog)?.scenarioId).toBe(
      "easy"
    )
    expect(selectNextPractice({ ...session, mastery_score: 40 }, catalog)?.scenarioId).toBe("easy")
    expect(selectNextPractice({ ...session, technical_score: 80 }, catalog)?.scenarioId).toBe(
      "medium"
    )
  })

  it("has a deterministic tie-break and never mutates the catalog", () => {
    const catalog = [current, problem("b"), problem("a")]
    expect(selectNextPractice(session, catalog)?.scenarioId).toBe("a")
    expect(selectNextPractice(session, [...catalog].reverse())?.scenarioId).toBe("a")
    expect(catalog.map((p) => p.id)).toEqual(["current", "b", "a"])
  })

  it("does not substitute an unrelated DSA skill when the matching pool is exhausted", () => {
    expect(
      selectNextPractice(session, [current, problem("graph", { pattern: "graphs" })])
    ).toBeNull()
  })

  it("rejects inconsistent track identity and invalid score units", () => {
    expect(
      selectNextPractice({ ...session, type: "bugfix" }, [current, problem("next")])
    ).toBeNull()
    const catalog = [current, problem("easy", { difficulty: "easy" }), problem("medium")]
    expect(selectNextPractice({ ...session, technical_score: -1 }, catalog)?.scenarioId).toBe(
      "medium"
    )
    expect(
      selectNextPractice({ ...session, technical_score: NaN, mastery_score: 40 }, catalog)
        ?.scenarioId
    ).toBe("easy")
  })

  it("does not treat malformed or paid-review URLs as recommendation entries", () => {
    for (const query of [
      "source=next-practice&scenario=next",
      "source=next-practice&scenario=next&fromSession=a%2Fb",
      "source=next-practice&scenario=next&fromSession=old&session=existing",
      "source=next-practice&scenario=next&fromSession=old&roadmap=true",
      "source=next-practice&scenario=next&fromSession=old&practice=true",
    ])
      expect(isNextPracticeEntry(new URLSearchParams(query))).toBe(false)
  })

  it("supports unique legacy titles but refuses unknown or ambiguous sessions", () => {
    expect(selectNextPractice({ ...session, scenario_id: "missing" }, [current])).toBeNull()
    const legacy = { ...session, scenario_id: undefined }
    expect(selectNextPractice(legacy, [current, problem("next")])?.scenarioId).toBe("next")
    expect(
      selectNextPractice(legacy, [current, problem("duplicate", { title: "current" })])
    ).toBeNull()
  })

  it("returns only public recommendation metadata, not solutions or tests", () => {
    const next = selectNextPractice(session, [current, problem("next")])!
    expect(Object.keys(next).sort()).toEqual(
      [
        "difficulty",
        "estimatedMinutes",
        "feedbackNote",
        "focus",
        "focusSource",
        "href",
        "reason",
        "scenarioId",
        "title",
        "type",
      ].sort()
    )
  })
})

describe("practice focus", () => {
  it("does not call missing evidence a weakness", () => {
    expect(getNextPracticeFocus(session).focusSource).toBe("transfer")
    expect(getNextPracticeFocus({ ...session, type: "bugfix" }).focusSource).toBe("transfer")
  })
  it("uses observed debugging evidence before generated advice", () => {
    const focus = getNextPracticeFocus({
      ...session,
      type: "bugfix",
      bugfix_evidence_summary: { reproducedBeforeEditing: false },
      structured_feedback: { fixNext: ["Generic advice"] },
    })
    expect(focus.focusSource).toBe("bugfix-evidence")
    expect(focus.focus).toContain("before editing")
  })
  it("targets a low recorded category and labels original feedback separately", () => {
    const focus = getNextPracticeFocus({
      ...session,
      score_breakdown: { understandingScore: 80, communicationScore: 30 },
      structured_feedback: { fixNext: ["  Explain tradeoffs.  "] },
    })
    expect(focus.focusSource).toBe("score-breakdown")
    expect(focus.focus).toContain("reasoning")
    expect(focus.feedbackNote).toBe("Explain tradeoffs.")
  })
  it("ignores invalid scores and does not diagnose high scores as weaknesses", () => {
    expect(
      getNextPracticeFocus({
        ...session,
        score_breakdown: {
          understandingScore: NaN,
          communicationScore: -10,
          codeQualityScore: 90,
        },
      }).focusSource
    ).toBe("transfer")
  })
})
