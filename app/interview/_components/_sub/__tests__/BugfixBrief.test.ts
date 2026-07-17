import { describe, expect, it } from "vitest"
import { extractIncidentNarrative } from "../BugfixBrief"

/**
 * The redesign's whole point is that the brief stops telling the same story twice.
 * Collapsing problemStatement was not enough: two scenarios embed a "**Your Task**"
 * block inside it, so the disclosure repeated the task the brief now states in its
 * own box.
 *
 * This trims presentation only. problemStatement stays whole in the data because
 * RAG vectorization embeds it.
 */
describe("extractIncidentNarrative", () => {
  it("drops a Your Task section that the task box already states", () => {
    const statement = [
      "**Incident Report**",
      "The badge sits one higher than the open comments.",
      "",
      "**Your Task**",
      "1. Reproduce the failing behavior.",
      "2. Write a hypothesis before editing.",
    ].join("\n")

    const narrative = extractIncidentNarrative(statement)
    expect(narrative).toContain("The badge sits one higher")
    expect(narrative).not.toContain("Your Task")
    expect(narrative).not.toContain("Write a hypothesis")
  })

  it("drops an Artifacts section that the file tree already shows", () => {
    const statement = [
      "**Incident Report**",
      "Totals are inflated.",
      "",
      "**Artifacts**",
      "- The contract is in `README.md`.",
    ].join("\n")

    const narrative = extractIncidentNarrative(statement)
    expect(narrative).toContain("Totals are inflated.")
    expect(narrative).not.toContain("README.md")
  })

  it("resumes keeping content at the next section heading", () => {
    const statement = [
      "**Artifacts**",
      "- src/main.py",
      "",
      "**Incident Report**",
      "The rollup double-counts a replayed build.",
    ].join("\n")

    const narrative = extractIncidentNarrative(statement)
    expect(narrative).not.toContain("src/main.py")
    expect(narrative).toContain("The rollup double-counts a replayed build.")
  })

  it("drops the Incident Report label but keeps its body", () => {
    // The narrative is rendered under the panel's own "The incident" label now, so
    // the embedded one is a duplicate label. It also renders badly: a single newline
    // after a **Bold** line is the same markdown paragraph, so the label came out as
    // an inline bold lead-in to its own first sentence.
    const statement = [
      "**Incident Report**",
      "After a backfill replayed the backup build, several accounts were billed twice.",
      "",
      "Read the codebase files and make the smallest fix.",
    ].join("\n")

    const narrative = extractIncidentNarrative(statement)
    expect(narrative).not.toContain("**Incident Report**")
    expect(narrative).toContain("several accounts were billed twice")
  })

  it("keeps the closing constraint, which appears nowhere else in the brief", () => {
    // 8 of 10 scenarios end this way. "Preserve the public API" is a real interview
    // constraint the candidate is graded against, not narration.
    const narrative = extractIncidentNarrative(
      "**Incident Report**\nIt broke.\n\nRead the codebase files, run the tests, and make the smallest fix. Preserve the public API because other console components call it directly."
    )

    expect(narrative).toContain("Preserve the public API")
  })

  it("leaves ## headings alone so pack briefs survive intact", () => {
    // Packs author "## The program" / "## Data contract" — their load-bearing
    // content. Broadening the heading match to ATX would strip exactly those, which
    // is why the regex stays narrow even though it no-ops on all 14 packs.
    const packish = [
      "# Rollup",
      "",
      "## Who reads this",
      "The on-call engineer.",
      "",
      "## Data contract",
      "- Columns are a,b,c.",
    ].join("\n")

    expect(extractIncidentNarrative(packish)).toBe(packish.trim())
  })

  it("returns an empty string when everything was redundant", () => {
    expect(extractIncidentNarrative("**Your Task**\n1. Fix it.\n")).toBe("")
  })
})

describe("every shipped bugfix scenario renders a usable incident", () => {
  // The narrative is always-visible now, so a stripper that ate a scenario would
  // render a titled but empty box instead of failing anywhere.
  it("never strips a real scenario down to nothing", async () => {
    const { realWorldBugFixScenarios } = await import("@/lib/scenarios-realworld")

    for (const scenario of realWorldBugFixScenarios) {
      const narrative = extractIncidentNarrative(scenario.problemStatement)
      expect(narrative.length, `${scenario.id} produced an empty incident`).toBeGreaterThan(80)
      expect(narrative, `${scenario.id} still labels its own incident`).not.toContain(
        "**Incident Report**"
      )
    }
  })
})
