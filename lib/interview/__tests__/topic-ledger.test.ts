/**
 * Tests for the inert topic ledger. See the module header for why it has no
 * call sites yet.
 *
 * The property that matters most here is negative and easy to lose: past the
 * probe cap, `nextAction` must never return a "probe". The 2026-08-22 session
 * probed one thread seven times and then stated the answer, and the reason it
 * could was that nothing ever removed probing from its options. A test that
 * only checked "returns a hint eventually" would pass against that same broken
 * behaviour, so the assertions below check what is ABSENT as well.
 */

import { describe, expect, it } from "vitest"
import {
  PROBE_CAP,
  emptyLedger,
  formatForPrompt,
  nextAction,
  probeCount,
  recordAnswer,
  recordParked,
  recordProbe,
  recordRung,
  toStruggleContribution,
  type TopicLedger,
} from "../topic-ledger"

/** Probe a topic n times from empty. */
function probed(topicId: string, n: number): TopicLedger {
  let ledger = emptyLedger()
  for (let i = 0; i < n; i++) ledger = recordProbe(ledger, topicId)
  return ledger
}

describe("nextAction", () => {
  it("offers a first probe for a topic never seen", () => {
    expect(nextAction(emptyLedger(), "complexity")).toEqual({ kind: "probe", probeNumber: 1 })
  })

  it("keeps offering probes up to the cap", () => {
    expect(nextAction(probed("complexity", 1), "complexity")).toEqual({
      kind: "probe",
      probeNumber: 2,
    })
  })

  it("STOPS offering probes at the cap and offers rung 1 instead", () => {
    const action = nextAction(probed("complexity", PROBE_CAP), "complexity")

    expect(action).toEqual({ kind: "hint", level: 1 })
    expect(action.kind).not.toBe("probe")
  })

  it("never offers a probe however far past the cap it has run", () => {
    for (const n of [PROBE_CAP, PROBE_CAP + 1, 7, 20]) {
      expect(nextAction(probed("complexity", n), "complexity").kind).not.toBe("probe")
    }
  })

  it("climbs the ladder one rung at a time, never skipping", () => {
    let ledger = probed("complexity", PROBE_CAP)

    expect(nextAction(ledger, "complexity")).toEqual({ kind: "hint", level: 1 })
    ledger = recordRung(ledger, "complexity", 1)
    expect(nextAction(ledger, "complexity")).toEqual({ kind: "hint", level: 2 })
    ledger = recordRung(ledger, "complexity", 2)
    expect(nextAction(ledger, "complexity")).toEqual({ kind: "hint", level: 3 })
  })

  it("moves on once the ladder is exhausted rather than inventing a move", () => {
    let ledger = probed("complexity", PROBE_CAP)
    ledger = recordRung(ledger, "complexity", 4)

    expect(nextAction(ledger, "complexity")).toEqual({
      kind: "move_on",
      reason: "ladder_exhausted",
    })
  })

  it("respects a lower maxLevel when the agent generated fewer rungs", () => {
    let ledger = probed("complexity", PROBE_CAP)
    ledger = recordRung(ledger, "complexity", 2)

    expect(nextAction(ledger, "complexity", 2)).toEqual({
      kind: "move_on",
      reason: "ladder_exhausted",
    })
  })

  it("moves on immediately once a topic is answered", () => {
    const ledger = recordAnswer(probed("complexity", 1), "complexity")

    expect(nextAction(ledger, "complexity")).toEqual({ kind: "move_on", reason: "answered" })
  })

  it("tracks topics independently", () => {
    let ledger = probed("complexity", PROBE_CAP)
    ledger = recordProbe(ledger, "edge_cases")

    expect(nextAction(ledger, "complexity").kind).toBe("hint")
    expect(nextAction(ledger, "edge_cases")).toEqual({ kind: "probe", probeNumber: 2 })
  })
})

describe("recording", () => {
  it("ignores further probes once a topic is answered", () => {
    let ledger = recordAnswer(probed("complexity", 1), "complexity")
    ledger = recordProbe(ledger, "complexity")

    expect(probeCount(ledger, "complexity")).toBe(1)
    expect(nextAction(ledger, "complexity").reason).toBe("answered")
  })

  it("counts past the cap rather than clamping, so runaways stay visible", () => {
    expect(probeCount(probed("complexity", 7), "complexity")).toBe(7)
  })

  it("never lowers the highest rung delivered", () => {
    let ledger = probed("complexity", PROBE_CAP)
    ledger = recordRung(ledger, "complexity", 3)
    ledger = recordRung(ledger, "complexity", 1)

    expect(ledger.topics.complexity.lastRungIssued).toBe(3)
  })

  it("does not park a topic the candidate already answered", () => {
    const ledger = recordParked(recordAnswer(emptyLedger(), "complexity"), "complexity")

    expect(ledger.topics.complexity.status).toBe("answered")
  })

  it("treats every recorder as pure", () => {
    const before = probed("complexity", 1)
    const snapshot = JSON.stringify(before)

    recordProbe(before, "complexity")
    recordAnswer(before, "complexity")
    recordRung(before, "complexity", 2)
    recordParked(before, "complexity")

    expect(JSON.stringify(before)).toBe(snapshot)
  })
})

describe("toStruggleContribution", () => {
  it("reports nothing for an empty ledger", () => {
    expect(toStruggleContribution(emptyLedger())).toEqual({
      probesBeyondCap: 0,
      topicsHinted: 0,
      hintsRevealed: 0,
    })
  })

  it("counts only probes beyond the cap, summed across topics", () => {
    let ledger = probed("complexity", 7)
    for (let i = 0; i < PROBE_CAP + 1; i++) ledger = recordProbe(ledger, "edge_cases")

    expect(toStruggleContribution(ledger).probesBeyondCap).toBe(7 - PROBE_CAP + 1)
  })

  it("counts hinted topics, not rungs", () => {
    let ledger = probed("complexity", PROBE_CAP)
    ledger = recordRung(ledger, "complexity", 1)
    ledger = recordRung(ledger, "complexity", 2)
    ledger = recordRung(ledger, "complexity", 3)

    expect(toStruggleContribution(ledger).hintsRevealed).toBe(1)
    expect(toStruggleContribution(ledger).topicsHinted).toBe(1)
  })
})

describe("formatForPrompt", () => {
  it("renders nothing for an empty ledger", () => {
    expect(formatForPrompt(emptyLedger())).toBe("")
  })

  it("renders the same bytes for the same ledger regardless of insert order", () => {
    let a = emptyLedger()
    a = recordProbe(a, "edge_cases")
    a = recordProbe(a, "complexity")

    let b = emptyLedger()
    b = recordProbe(b, "complexity")
    b = recordProbe(b, "edge_cases")

    expect(formatForPrompt(a)).toBe(formatForPrompt(b))
  })

  it("states facts and issues no instruction", () => {
    let ledger = probed("complexity", PROBE_CAP)
    ledger = recordRung(ledger, "complexity", 2)
    const rendered = formatForPrompt(ledger)

    expect(rendered).toContain("complexity: hinted, probed 2x, hint rung 2 delivered")
    expect(rendered).not.toMatch(/\b(you MUST|do NOT|never|always)\b/i)
  })
})

describe("wiring", () => {
  it("is not imported anywhere yet, per the module header", async () => {
    // A cheap guard against someone activating this without reading the
    // preconditions in the header. Delete it in the commit that wires it up.
    const { execSync } = await import("node:child_process")
    const hits = execSync(
      "grep -rl 'topic-ledger' --include='*.ts' --include='*.tsx' lib app components || true",
      { encoding: "utf8" }
    )
      .split("\n")
      .filter((f) => f && !f.includes("__tests__") && !f.endsWith("topic-ledger.ts"))

    expect(hits).toEqual([])
  })
})
