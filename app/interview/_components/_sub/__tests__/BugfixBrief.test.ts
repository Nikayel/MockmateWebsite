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
    expect(narrative).toContain("**Incident Report**")
  })

  it("leaves a statement with no redundant sections untouched", () => {
    // 8 of the 10 scenarios look like this.
    const statement = [
      "**Incident Report**",
      "After a backfill replayed the backup build, several accounts were billed twice.",
      "",
      "Read the codebase files and make the smallest fix.",
    ].join("\n")

    expect(extractIncidentNarrative(statement)).toBe(statement.trim())
  })

  it("returns an empty string when everything was redundant", () => {
    expect(extractIncidentNarrative("**Your Task**\n1. Fix it.\n")).toBe("")
  })
})
