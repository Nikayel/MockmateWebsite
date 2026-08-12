/**
 * The workspace brief ticket scheme, enforced rather than documented.
 *
 * Briefs were authored ad hoc and drifted into eight invented prefixes across four header formats,
 * with two thirds carrying no ticket at all. Centralizing the scheme in
 * `lib/tutorials/curriculum/brief/` only helps if a new lesson cannot quietly opt out, so these
 * tests are the actual mechanism:
 *
 *  - the registry is append-only and collision-free, because a shipped ticket number is content;
 *  - registry and corpus are a bijection, so a new brief fails here instead of inventing a number;
 *  - every rendered brief opens with the canonical heading, so no hand-written header survives.
 *
 * Course-agnostic by construction: it walks every course's workspace exercises, so a new language
 * is covered the day it lands without touching this file.
 */
import { describe, expect, it } from "vitest"
import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"
import { SQL_LEVELS } from "@/lib/tutorials/sql/curriculum"
import {
  TICKETS,
  TICKET_ID_PATTERN,
  BRIEF_KINDS,
  HIDDEN_TESTS_NOTE,
  buildBrief,
  ticketFor,
  nextTicketId,
  type BriefSlot,
} from "@/lib/tutorials/curriculum/brief"

interface CorpusBrief {
  lesson: string
  slot: BriefSlot
  path: string
  content: string
}

/** Every markdown docs file shipped inside a workspace, across every course. */
function collectBriefs(): CorpusBrief[] {
  const found: CorpusBrief[] = []
  const levels: unknown[] = [...PYTHON_LEVELS, ...SQL_LEVELS]
  for (const level of levels as Array<{ modules: Array<{ lessons: unknown[] }> }>) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons as Array<Record<string, unknown> & { id: string }>) {
        for (const slot of ["apply", "practice"] as const) {
          const exercise = lesson[slot] as { workspace?: { files: CorpusFile[] } } | undefined
          const files = exercise?.workspace?.files
          if (!files) continue
          for (const file of files) {
            if (file.language !== "markdown") continue
            found.push({ lesson: lesson.id, slot, path: file.path, content: file.content })
          }
        }
      }
    }
  }
  return found
}

interface CorpusFile {
  path: string
  content: string
  language: string
}

const BRIEFS = collectBriefs()

/** `# CS-019 · Bug report · the asset sweep reports the wrong sizes` */
const HEADING = new RegExp(`^# (CS-\\d{3,}) · (${Object.values(BRIEF_KINDS).join("|")}) · (.+)$`)

describe("brief ticket registry", () => {
  it("covers a non-empty corpus", () => {
    expect(BRIEFS.length).toBeGreaterThan(0)
  })

  it("issues well-formed, unique ticket ids", () => {
    const bad = TICKETS.filter((entry) => !TICKET_ID_PATTERN.test(entry.id)).map((e) => e.id)
    expect(bad, `malformed ticket ids: ${bad.join(", ")}`).toEqual([])

    const seen = new Map<string, number>()
    for (const entry of TICKETS) seen.set(entry.id, (seen.get(entry.id) ?? 0) + 1)
    const duplicates = [...seen].filter(([, count]) => count > 1).map(([id]) => id)
    expect(duplicates, `duplicate ticket ids: ${duplicates.join(", ")}`).toEqual([])
  })

  it("is append-only, so a shipped number is never reused or reordered", () => {
    const numbers = TICKETS.map((entry) => Number(entry.id.slice(3)))
    const outOfOrder: string[] = []
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] <= numbers[i - 1]) {
        outOfOrder.push(`${TICKETS[i - 1].id} then ${TICKETS[i].id}`)
      }
    }
    expect(
      outOfOrder,
      `ticket numbers must strictly increase down the list; new briefs append with nextTicketId() ` +
        `(currently ${nextTicketId()}). Out of order: ${outOfOrder.join("; ")}`
    ).toEqual([])
  })

  it("registers exactly one ticket per brief, and no orphans", () => {
    const corpusKeys = new Set(BRIEFS.map((b) => `${b.lesson}:${b.slot}`))
    const registryKeys = new Set(TICKETS.map((t) => `${t.lesson}:${t.slot}`))

    const unregistered = [...corpusKeys].filter((key) => !registryKeys.has(key))
    expect(
      unregistered,
      `these workspace briefs have no ticket. Append them to TICKETS starting at ` +
        `${nextTicketId()}: ${unregistered.join(", ")}`
    ).toEqual([])

    const orphans = [...registryKeys].filter((key) => !corpusKeys.has(key))
    expect(
      orphans,
      `these tickets point at a brief that no longer exists: ${orphans.join(", ")}`
    ).toEqual([])
  })
})

describe("brief headings", () => {
  for (const brief of BRIEFS) {
    it(`${brief.lesson} [${brief.slot}] opens with its registered ticket`, () => {
      const firstLine = brief.content.trimStart().split("\n")[0]
      const match = HEADING.exec(firstLine)
      expect(
        match,
        `${brief.path} must open with the heading buildBrief() produces, got:\n  ${firstLine}`
      ).not.toBeNull()

      // The number in the file has to be the one the registry issued for THIS lesson, not merely a
      // well-formed number, so a copy-pasted header cannot pass.
      expect(match![1]).toBe(ticketFor(brief.lesson, brief.slot).id)

      // Headlines run into the heading, so a trailing period reads as a broken sentence.
      expect(match![3].endsWith("."), `headline should not end with a period: ${match![3]}`).toBe(
        false
      )

      // Casing is normalized by the builder, so the corpus cannot drift back into a mix.
      const opener = match![3].charAt(0)
      expect(
        /[a-z]/.test(opener),
        `headline should not open lower case, buildBrief normalizes this: ${match![3]}`
      ).toBe(false)
    })
  }

  it("states the hidden-tests promise at most once per brief", () => {
    const repeated = BRIEFS.filter(
      (brief) => brief.content.split(HIDDEN_TESTS_NOTE).length - 1 > 1
    ).map((brief) => `${brief.lesson}:${brief.slot}`)
    expect(repeated, `hidden-tests note appears twice in: ${repeated.join(", ")}`).toEqual([])
  })
})

describe("buildBrief", () => {
  const sample = TICKETS[0]

  it("resolves the ticket from the registry rather than trusting the call site", () => {
    const out = buildBrief({
      lesson: sample.lesson,
      slot: sample.slot,
      kind: "ticket",
      headline: "a worked example",
      body: "Body.",
    })
    // Headline given lower case; the builder normalizes it, which is why call sites need not agree.
    expect(out.startsWith(`# ${sample.id} · Ticket · A worked example`)).toBe(true)
    expect(out).toContain(HIDDEN_TESTS_NOTE)
  })

  it("omits the hidden-tests note when the exercise has no hidden suite", () => {
    const out = buildBrief({
      lesson: sample.lesson,
      slot: sample.slot,
      kind: "ticket",
      headline: "a worked example",
      body: "Body.",
      hiddenTests: false,
    })
    expect(out).not.toContain(HIDDEN_TESTS_NOTE)
  })

  it("refuses to render a brief that was never registered", () => {
    expect(() =>
      buildBrief({
        lesson: "py-l9-does-not-exist",
        kind: "ticket",
        headline: "unregistered",
        body: "Body.",
      })
    ).toThrow(/No ticket registered/)
  })
})
