// @vitest-environment jsdom
import type { ReactNode } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SkillAssessment } from "./SkillAssessment"
import { CreateRoadmapSchema } from "@/lib/validations/api-schemas"
import { resolveCategoryMix } from "@/lib/roadmap/category-weights"

vi.mock("framer-motion", () => ({
  motion: { div: ({ children }: { children: ReactNode }) => <div>{children}</div> },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
afterEach(cleanup)

function next() {
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
}
function reachFocus() {
  fireEvent.click(screen.getByRole("button", { name: /Intern \/ Student/ }))
  next()
  next()
}

describe("roadmap assessment choices", () => {
  it("submits the recommended choice through the API schema and mix resolver", () => {
    const onComplete = vi.fn()
    render(<SkillAssessment onComplete={onComplete} />)
    reachFocus()
    expect(
      screen.getByRole("button", { name: /Debugging \+ algorithms/ }).getAttribute("aria-pressed")
    ).toBe("true")
    next()
    next()
    next()
    screen
      .getAllByRole("button", { name: "New", exact: true })
      .slice(0, 4)
      .forEach((button) => fireEvent.click(button))
    fireEvent.click(screen.getByRole("button", { name: "Generate Roadmap" }))
    expect(onComplete).toHaveBeenCalledOnce()
    const result = onComplete.mock.calls[0][0]
    const parsed = CreateRoadmapSchema.parse({
      targetCompany: "google",
      interviewDate: "2027-01-01",
      ...result,
    })
    expect(resolveCategoryMix({ ...parsed, companyId: parsed.targetCompany }).weights).toEqual({
      dsa: 50,
      bugfix: 50,
      decomposition: 0,
      "system-design": 0,
    })
  })

  it("lets debugging-only users finish without a DSA assessment", () => {
    const onComplete = vi.fn()
    render(<SkillAssessment onComplete={onComplete} />)
    reachFocus()
    fireEvent.click(screen.getByRole("button", { name: /^Custom/ }))
    fireEvent.click(screen.getByRole("button", { name: "Algorithms", exact: true }))
    next()
    expect(screen.getByText("How Much Time Can You Study Daily?")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Generate Roadmap" }))
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        mixMode: "custom",
        selectedCategories: ["bugfix"],
        patternFamiliarity: [],
      })
    )
  })

  it("keeps the custom category requirement", () => {
    render(<SkillAssessment onComplete={vi.fn()} />)
    reachFocus()
    fireEvent.click(screen.getByRole("button", { name: /^Custom/ }))
    fireEvent.click(screen.getByRole("button", { name: "Algorithms", exact: true }))
    fireEvent.click(screen.getByRole("button", { name: "Debugging", exact: true }))
    expect(screen.getByRole("button", { name: "Continue" })).toHaveProperty("disabled", true)
  })

  it("defaults omitted API choices to the same recommendation", () => {
    expect(
      CreateRoadmapSchema.parse({ targetCompany: "google", interviewDate: "2027-01-01" }).mixMode
    ).toBe("balanced")
  })
})
