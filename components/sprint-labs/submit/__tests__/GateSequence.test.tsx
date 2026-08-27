/**
 * @vitest-environment jsdom
 *
 * GateSequence — the task's own verification bar: "the staged reveal renders gates in order +
 * humanName-only hidden failures." Uses fake timers to drive `useGateReveal`'s step clock
 * deterministically instead of racing real setTimeout delays.
 */
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GateResult } from "@/lib/sprint-labs/types"
import { GateSequence } from "../GateSequence"

afterEach(cleanup)

const RESULTS: GateResult[] = [
  {
    gate: "visible",
    cases: [{ testId: "v", humanName: "10/10 visible tests passed", passed: true }],
  },
  {
    gate: "hidden",
    cases: [
      { testId: "h1", humanName: "a retry inside the window bills twice", passed: false },
      { testId: "h2", humanName: "a normal single submit", passed: true },
    ],
  },
  {
    gate: "regression",
    cases: [{ testId: "r", humanName: "128/128 regression tests passed", passed: true }],
  },
  { gate: "adversary", cases: [] },
]

describe("GateSequence", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("shows the queued state with no gate revealed while gateResults is null", () => {
    render(<GateSequence ticketKey="MER-305" gateResults={null} escapedDefects={[]} />)
    expect(screen.getByText("Waiting for a runner.")).not.toBeNull()
    expect(screen.getByText("Visible")).not.toBeNull()
    // Nothing settled yet: no escaped line, no headline.
    expect(screen.queryByText(/escaped/)).toBeNull()
  })

  it("reveals gates strictly in order — visible, then hidden, then regression, then adversary", () => {
    render(
      <GateSequence
        ticketKey="MER-305"
        gateResults={RESULTS}
        escapedDefects={["a retry inside the window bills twice"]}
      />
    )

    // Before any timer fires: still queued-looking (revealedCount 0).
    expect(screen.queryByText(/passed/)).toBeNull()

    act(() => {
      vi.advanceTimersByTime(650)
    })
    expect(screen.getByText("10/10 visible tests passed")).not.toBeNull()
    expect(screen.queryByText(/escaped/)).toBeNull() // hidden not revealed yet

    act(() => {
      vi.advanceTimersByTime(650)
    })
    expect(screen.getByText(/Escaped: a retry inside the window bills twice/)).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(650)
    })
    expect(screen.getByText("128/128 regression tests passed")).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(650)
    })
    // Fourth gate (adversary) settled too — headline now renders.
    expect(screen.getByText(/1 escaped defect on MER-305\./)).not.toBeNull()
  })

  it("renders the hidden gate's escaped failures as curated humanName text only — no stack, no diff, no raw output", () => {
    render(
      <GateSequence
        ticketKey="MER-305"
        gateResults={RESULTS}
        escapedDefects={["a retry inside the window bills twice"]}
      />
    )
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    const html = document.body.innerHTML
    expect(html).toContain("Escaped: a retry inside the window bills twice")
    expect(html).not.toMatch(/AssertionError|expected \d+, got \d+|stack|stdout/i)
  })

  it("fires onSettled exactly once when the fourth gate reveals", () => {
    const onSettled = vi.fn()
    render(
      <GateSequence
        ticketKey="MER-305"
        gateResults={RESULTS}
        escapedDefects={["a retry inside the window bills twice"]}
        onSettled={onSettled}
      />
    )
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(onSettled).toHaveBeenCalledTimes(1)
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(onSettled).toHaveBeenCalledTimes(1)
  })
})
