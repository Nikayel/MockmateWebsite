// @vitest-environment jsdom
/**
 * The rubric renders where and when it should, and nowhere else.
 *
 * Two things here are behaviour rather than decoration:
 *
 *  1. The rubric is INSIDE the reveal, so it is gated behind saving exactly as the model answer is.
 *     A learner who can see the bands before writing has been handed the marking scheme, and will
 *     write to it instead of thinking.
 *  2. The rubric renders BEFORE the model answer in the DOM. Read the model answer first and an
 *     honest self-score becomes much harder: you grade the answer you now wish you had written. The
 *     ordering is the only thing keeping those two judgements separate, and ordering is exactly the
 *     kind of intent a later refactor drops without noticing.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DesignAnswerPanel } from "../DesignAnswerPanel"
import { rubricStorageKey } from "@/lib/tutorials/system-design/rubric"
import type { DesignExercise } from "@/lib/tutorials/types"

afterEach(cleanup)
beforeEach(() => window.localStorage.clear())

const RUBRIC = [
  {
    name: "Consistency contract",
    weak: "Does not say what a client sees between the write and the replica catching up.",
    adequate: "Names replication lag as a risk but does not say which reads are affected.",
    strong: "States the window and names which reads are routed to the primary during it.",
  },
  {
    name: "Failure modes",
    weak: "Describes only the path where every component is healthy.",
    adequate: "Names one failure without saying what recovers it.",
    strong: "Walks two failures end to end, including what detects each one.",
  },
  {
    name: "Cost",
    weak: "Never mentions what the design costs to run.",
    adequate: "Gestures at cost without attaching a number to any component.",
    strong: "Attaches a rough monthly figure to the dominant component.",
  },
]

const EXERCISE: DesignExercise = {
  id: "sd-l3-read-replicas-practice",
  prompt: "Review the proposed design below and name the strongest objection you would raise.",
  thinkAbout: [],
  modelAnswerOutline: ["Read-your-writes is broken by the replica read path."],
  rubric: RUBRIC,
}

function renderPanel(exercise: DesignExercise, savedAnswer = "") {
  return render(
    <DesignAnswerPanel
      exercise={exercise}
      answer={savedAnswer}
      onAnswerChange={vi.fn()}
      savedAnswer={savedAnswer}
    />
  )
}

function reveal() {
  fireEvent.click(screen.getByRole("button", { name: /reveal model answer/i }))
}

describe("rubric self-scoring", () => {
  it("stays hidden until the learner saves and reveals", () => {
    renderPanel(EXERCISE, "my saved answer")
    expect(screen.queryByRole("region", { name: "Score your answer" })).toBeNull()
    reveal()
    expect(screen.getByRole("region", { name: "Score your answer" })).toBeTruthy()
  })

  it("cannot be revealed at all before an answer is saved", () => {
    renderPanel(EXERCISE, "")
    const button = screen.getByRole("button", { name: /reveal model answer/i })
    expect(button.hasAttribute("disabled")).toBe(true)
  })

  it("renders before the model answer, so the score is made first", () => {
    const { container } = renderPanel(EXERCISE, "my saved answer")
    reveal()
    const rubric = screen.getByRole("region", { name: "Score your answer" })
    const model = screen.getByText("Model answer")
    // Node.compareDocumentPosition: FOLLOWING (4) means `model` comes after `rubric`.
    expect(rubric.compareDocumentPosition(model) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.textContent).toContain("Read-your-writes is broken")
  })

  it("does not render a panel when the exercise has no rubric", () => {
    const { rubric: _rubric, ...plain } = EXERCISE
    renderPanel(plain as DesignExercise, "my saved answer")
    reveal()
    expect(screen.queryByRole("region", { name: "Score your answer" })).toBeNull()
    // The model answer still reveals. The rubric is additive; removing it removes nothing else.
    expect(screen.getByText("Model answer")).toBeTruthy()
  })

  it("records a band and persists it", () => {
    renderPanel(EXERCISE, "my saved answer")
    reveal()
    const weak = screen.getByRole("radio", { name: /Never mentions what the design costs/ })
    fireEvent.click(weak)
    expect(weak.getAttribute("aria-checked")).toBe("true")
    expect(window.localStorage.getItem(rubricStorageKey(EXERCISE.id))).toContain("weak")
  })

  it("clears a band when the same one is clicked again", () => {
    // A misclick must be recoverable without hunting for a Reset that would also wipe the answer.
    renderPanel(EXERCISE, "my saved answer")
    reveal()
    const strong = screen.getByRole("radio", { name: /Walks two failures end to end/ })
    fireEvent.click(strong)
    fireEvent.click(strong)
    expect(strong.getAttribute("aria-checked")).toBe("false")
  })

  it("restores a previous session's score", () => {
    window.localStorage.setItem(rubricStorageKey(EXERCISE.id), JSON.stringify({ 1: "strong" }))
    renderPanel(EXERCISE, "my saved answer")
    reveal()
    expect(
      screen
        .getByRole("radio", { name: /Walks two failures end to end/ })
        .getAttribute("aria-checked")
    ).toBe("true")
  })

  it("names the weak axes once every row is scored", () => {
    // The whole output of the exercise. "Weakest: Cost" is actionable; a percentage is not.
    renderPanel(EXERCISE, "my saved answer")
    reveal()
    fireEvent.click(screen.getByRole("radio", { name: /States the window and names which reads/ }))
    fireEvent.click(screen.getByRole("radio", { name: /Names one failure without saying/ }))
    fireEvent.click(screen.getByRole("radio", { name: /Never mentions what the design costs/ }))
    expect(screen.getByRole("status").textContent).toContain("Weakest: Cost")
  })

  it("survives a storage backend that throws", () => {
    // Safari private browsing throws on setItem. Self-scoring is worth having without persistence;
    // a thrown error inside a click handler would take the whole reveal down.
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    renderPanel(EXERCISE, "my saved answer")
    reveal()
    const weak = screen.getByRole("radio", { name: /Never mentions what the design costs/ })
    expect(() => fireEvent.click(weak)).not.toThrow()
    expect(weak.getAttribute("aria-checked")).toBe("true")
    setItem.mockRestore()
  })
})
