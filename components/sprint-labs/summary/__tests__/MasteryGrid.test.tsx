/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { MasteryGrid } from "../MasteryGrid"
import type { ObjectiveView } from "@/components/sprint-labs/ui/ObjectiveChip"

afterEach(cleanup)

const OBJECTIVES: ObjectiveView[] = [
  { id: "o1", label: "Idempotency", sentence: "I can dedupe a retry.", state: "demonstrated" },
  {
    id: "o2",
    label: "Keyset pagination",
    sentence: "I can paginate a large table.",
    state: "practicing",
  },
]

describe("MasteryGrid", () => {
  it("shows the empty line rather than a zeroed grid when nothing is measured yet", () => {
    render(<MasteryGrid objectives={[]} />)
    expect(screen.getByText("Nothing measured yet.")).not.toBeNull()
  })

  it("counts demonstrated and practicing objectives", () => {
    render(<MasteryGrid objectives={OBJECTIVES} />)
    expect(screen.getByText("1 demonstrated, 1 practicing")).not.toBeNull()
  })

  it("renders every objective as a chip", () => {
    render(<MasteryGrid objectives={OBJECTIVES} />)
    expect(screen.getByText("Idempotency")).not.toBeNull()
    expect(screen.getByText("Keyset pagination")).not.toBeNull()
  })

  it("omits the practicing count when everything is demonstrated", () => {
    render(
      <MasteryGrid
        objectives={[{ id: "o1", label: "Idempotency", sentence: "s", state: "demonstrated" }]}
      />
    )
    expect(screen.getByText("1 demonstrated")).not.toBeNull()
  })
})
