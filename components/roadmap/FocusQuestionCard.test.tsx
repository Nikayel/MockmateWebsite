// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { QuestionCard } from "./FocusQuestionCard"
import type { DailyPlan } from "@/lib/data/company-questions/types"

afterEach(cleanup)
const question: DailyPlan["questions"][number] = {
  scenarioId: "bugfix-maze-navigation",
  title: "Maze Library",
  difficulty: "hard",
  estimatedMinutes: 60,
  status: "pending",
  scenarioType: "bugfix",
  companyAlignment: "meta-maze",
}
function card(value: typeof question) {
  return (
    <QuestionCard
      question={value}
      index={0}
      isFirst
      canDefer={false}
      onStart={vi.fn()}
      onSkip={vi.fn()}
      onDefer={vi.fn()}
    />
  )
}

describe("roadmap debugging provenance", () => {
  it("shows the reviewed company profile and its evidence link", () => {
    render(card(question))
    fireEvent.click(screen.getByText("Meta task pattern · Maze debugging and extension"))
    expect(
      screen
        .getByRole("link", { name: "Public candidate reports of Meta's maze task" })
        .getAttribute("href")
    ).toContain("hellointerview.com/community/questions/maze-solver-path")
  })
  it("labels transferable practice as Generic", () => {
    render(card({ ...question, companyAlignment: "generic" }))
    expect(screen.getByText("Generic debugging")).toBeTruthy()
    expect(screen.queryByText(/Meta task pattern/)).toBeNull()
  })
  it("keeps legacy nodes without attribution readable", () => {
    const { companyAlignment: _alignment, ...legacy } = question
    render(card(legacy))
    expect(screen.getByText("Maze Library")).toBeTruthy()
    expect(screen.queryByText("Generic debugging")).toBeNull()
  })
})
