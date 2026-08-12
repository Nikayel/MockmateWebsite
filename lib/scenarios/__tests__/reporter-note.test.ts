/**
 * The reporter's note reaches the candidate, and only when a human wrote it.
 *
 * `userReport` was required by `validateBugfixScenarioQuality`, tone-linted against
 * `USERREPORT_ANTI_PATTERNS`, leak-checked, and authored at 50 to 70 words in every legacy
 * scenario. It was also declared on the interview panel's prop type and never read, so not one word
 * of it ever rendered during an interview. Its only consumer was a browse card that prefers
 * `observedSymptoms[0]`, and every scenario carrying a report also carries observed symptoms, so it
 * was shadowed in all of them.
 *
 * Wiring it in is only safe because of the suppression rule these tests pin: the field is ALWAYS
 * populated, since `withBugfixIncidentDefaults` falls back to `description`. Printing that would
 * restore the say-it-twice duplication the brief exists to remove.
 */
import { describe, expect, it } from "vitest"
import { scenarios } from "@/lib/scenarios"
import { resolveReporterNote, withBugfixIncidentDefaults } from "../bugfix-quality"
import type { BugFixScenario } from "../types"

function makeScenario(overrides: Partial<BugFixScenario>): BugFixScenario {
  return {
    id: "test",
    type: "bugfix",
    description: "The totals are wrong.",
    problemStatement: "The service reports totals that disagree with the ledger.",
    ...overrides,
  } as BugFixScenario
}

describe("resolveReporterNote", () => {
  it("returns an authored report", () => {
    const note = resolveReporterNote(
      makeScenario({ userReport: "Billing team here. Two invoices went out for one charge." })
    )
    expect(note).toBe("Billing team here. Two invoices went out for one charge.")
  })

  it("suppresses the report the defaulter copied from the description", () => {
    // This is exactly what withBugfixIncidentDefaults produces for an unauthored scenario.
    const defaulted = withBugfixIncidentDefaults(makeScenario({ description: "Totals are wrong." }))
    expect(defaulted.userReport).toBe("Totals are wrong.")
    expect(resolveReporterNote(defaulted)).toBeUndefined()
  })

  it("suppresses a report the narrative already quotes verbatim", () => {
    const note = "Support agent here. The streak resets overnight."
    expect(
      resolveReporterNote(
        makeScenario({
          userReport: note,
          problemStatement: `Incident report\n\n${note}\n\nDetails.`,
        })
      )
    ).toBeUndefined()
  })

  it("suppresses an empty or whitespace-only report", () => {
    expect(resolveReporterNote(makeScenario({ userReport: "   " }))).toBeUndefined()
    expect(resolveReporterNote(makeScenario({ userReport: undefined }))).toBeUndefined()
  })
})

describe("the live bugfix corpus", () => {
  const bugfixes = (scenarios as unknown as BugFixScenario[])
    .filter((scenario) => scenario.type === "bugfix")
    .map(withBugfixIncidentDefaults)

  it("has bugfix scenarios to check", () => {
    expect(bugfixes.length).toBeGreaterThan(0)
  })

  it("surfaces every authored report and no defaulted one", () => {
    const shown = bugfixes.filter((scenario) => resolveReporterNote(scenario))
    // The legacy incident scenarios author a report; the sealed packs do not, and their field is
    // defaulted from the description. Both groups exist, so this is not vacuous in either
    // direction: a rule that showed everything or nothing would fail one of these.
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.length).toBeLessThan(bugfixes.length)

    for (const scenario of shown) {
      const note = resolveReporterNote(scenario)!
      expect(note, `${scenario.id} would print its description twice`).not.toBe(
        scenario.description?.trim()
      )
    }
  })

  it("never surfaces a note that leaks the root cause", () => {
    // The note now renders to candidates, so the leak guard matters in a way it did not before.
    const leaked = bugfixes
      .filter((scenario) => {
        const note = resolveReporterNote(scenario)?.toLowerCase()
        const cause = (scenario as { bugDescription?: string }).bugDescription?.toLowerCase().trim()
        return Boolean(note && cause && note.includes(cause))
      })
      .map((scenario) => scenario.id)
    expect(leaked, `reporter note states the root cause in: ${leaked.join(", ")}`).toEqual([])
  })
})
