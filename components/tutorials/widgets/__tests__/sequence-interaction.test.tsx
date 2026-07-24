// @vitest-environment jsdom
/**
 * Interaction tests for the sequence stepper (Iteration 6 exit criteria): stepping
 * updates the live region, a toggle flip rebuilds and announces the new timeline,
 * and a predict step gates Next behind a committed guess. First jsdom +
 * testing-library suite in the repo; SSR safety stays covered in fence-render.
 */
import { describe, it, expect, afterEach } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { parseWidgetSpec } from "@/lib/tutorials/widgets/schema"
import { WidgetBody } from "../WidgetBody"

afterEach(cleanup)

const spec = {
  type: "sequence",
  title: "Timeout ambiguity",
  actors: [
    { id: "a", label: "Service A" },
    { id: "b", label: "Service B" },
  ],
  toggles: [
    { id: "drop", label: "Drop the response", description: "B does the work; A never hears." },
  ],
  steps: [
    { from: "a", to: "b", label: "charge $20", kind: "request" },
    { from: "b", to: "b", label: "work done", kind: "note", state: { charged: "1" } },
    { from: "b", to: "a", label: "200 OK", kind: "response", when: "!drop" },
    { from: "b", to: "a", label: "200 OK", kind: "response", status: "lost", when: "drop" },
    {
      from: "a",
      to: "b",
      label: "retry: charge $20",
      kind: "request",
      when: "drop",
      state: { charged: "2" },
      predict: {
        question: "A's timer fired. What does A do?",
        options: ["Give up", "Retry the charge"],
      },
    },
  ],
}

function renderWidget() {
  const parsed = parseWidgetSpec(JSON.stringify(spec))
  if (!parsed.ok) throw new Error(parsed.error)
  return render(<WidgetBody spec={parsed.spec} />)
}

const liveRegion = () => screen.getByRole("status")
/** The visible current-step line (the live region can hold the same text). */
const stepLine = () => document.querySelector("[data-current-step]")?.textContent ?? ""

describe("sequence stepper interactions", () => {
  it("steps forward and narrates each step through the live region", () => {
    renderWidget()
    expect(screen.getByText(/Not started\. 3 steps\./)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    expect(liveRegion().textContent).toContain("Step 1 of 3")
    expect(liveRegion().textContent).toContain("charge $20")
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    expect(liveRegion().textContent).toContain("Step 2 of 3")
    // The shared-state row surfaced after the step that carries state.
    expect(screen.getByText("charged = 1")).toBeTruthy()
  })

  it("flipping a failure toggle rebuilds the timeline, restarts it, and announces", () => {
    renderWidget()
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    fireEvent.click(screen.getByRole("button", { name: /drop the response/i }))
    expect(liveRegion().textContent).toContain("Timeline changed: 4 steps")
    expect(screen.getByText(/Not started\. 4 steps\./)).toBeTruthy()
    const toggle = screen.getByRole("button", { name: /drop the response/i })
    expect(toggle.getAttribute("aria-pressed")).toBe("true")
  })

  it("a predict step gates Next behind a committed guess, then reveals", () => {
    renderWidget()
    fireEvent.click(screen.getByRole("button", { name: /drop the response/i }))
    const next = () => fireEvent.click(screen.getByRole("button", { name: /next/i }))
    next() // step 1
    next() // step 2
    next() // step 3 (lost response)
    expect(liveRegion().textContent).toContain("lost")
    next() // step 4 has predict: shows the prompt instead of advancing
    expect(screen.getByText("A's timer fired. What does A do?")).toBeTruthy()
    expect(screen.queryByText(/Step 4 of 4/)).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Retry the charge" }))
    expect(liveRegion().textContent).toContain("Step 4 of 4")
    // The race becomes visible in the state row: the double charge.
    expect(screen.getByText("charged = 2")).toBeTruthy()
  })

  it("Back rewinds and Reset returns the widget to its initial state", () => {
    renderWidget()
    const next = () => fireEvent.click(screen.getByRole("button", { name: /next/i }))
    next()
    next()
    fireEvent.click(screen.getByRole("button", { name: /back/i }))
    expect(stepLine()).toContain("Step 1 of 3")
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    expect(stepLine()).toContain("Not started. 3 steps.")
  })
})
