/**
 * The one place workspace brief ticket numbers are allocated.
 *
 * ## Why this exists
 *
 * Every multi-file exercise opens with a README written as a work ticket, because "here is a ticket,
 * go fix it" is the framing the exercise is simulating. Those tickets were authored ad hoc, so the
 * corpus grew `OPS-812`, `DEP-412`, `BILL-482`, `CFG-214`, `TOOL-72`, `OPS-318`, `DEV-318` and
 * `PERF-214`, invented independently, in four different header formats, while two thirds of the
 * briefs had no ticket at all. Two of them even collided on the number 318 by coincidence.
 *
 * A learner moving between lessons should read one product with one convention, not eight teams'
 * naming habits. So ticket identity lives here and nowhere else.
 *
 * ## The scheme
 *
 * One flat, course-agnostic sequence: `CS-001`, `CS-002`, ... The number encodes nothing. That is
 * deliberate: any scheme that encodes course, level or module has to be renumbered the moment
 * content moves between them, and these strings are learner-facing.
 *
 * ## Adding a brief
 *
 * Append one entry with the next unused number and call {@link buildBrief} with the same
 * `lesson`/`slot`. That is the whole procedure, and it is the same procedure for a new lesson, a new
 * module, a new level, or a whole new language: nothing here is Python-specific.
 *
 * Two rules, both enforced by `lib/tutorials/__tests__/brief-tickets.test.ts` rather than by
 * convention:
 *  - **Append only.** Numbers are strictly increasing and never reused, because a shipped ticket
 *    number is content a learner may have seen, screenshotted, or asked about.
 *  - **Total.** Every workspace brief in every course must be registered, and every entry must
 *    correspond to a real brief. A new lesson that skips this fails the suite instead of quietly
 *    inventing its own ticket.
 */

/** Which exercise slot a brief belongs to. Lessons can carry a workspace in either. */
export type BriefSlot = "apply" | "practice"

export interface TicketEntry {
  /** `CS-###`. Immutable once shipped. */
  id: string
  /** Lesson id, e.g. `"py-l4-concurrency"`. */
  lesson: string
  slot: BriefSlot
}

/**
 * Append-only. Seeded in curriculum order at the time the scheme was introduced; later entries go
 * on the end regardless of where their lesson sits in the course.
 */
export const TICKETS: readonly TicketEntry[] = [
  // Python L3 — Patterns
  { id: "CS-001", lesson: "py-l3-packages", slot: "practice" },
  { id: "CS-002", lesson: "py-l3-parse-config", slot: "practice" },
  { id: "CS-003", lesson: "py-l3-type-hints", slot: "practice" },
  { id: "CS-004", lesson: "py-l3-typing-module", slot: "practice" },
  { id: "CS-005", lesson: "py-l3-pytest-basics", slot: "practice" },
  { id: "CS-006", lesson: "py-l3-pytest-fixtures", slot: "practice" },
  { id: "CS-007", lesson: "py-l3-pathlib", slot: "practice" },
  { id: "CS-008", lesson: "py-l3-logging-errors", slot: "practice" },
  { id: "CS-009", lesson: "py-l3-cli", slot: "practice" },
  { id: "CS-010", lesson: "py-l3-rest-pydantic", slot: "practice" },
  { id: "CS-011", lesson: "py-l3-sqlite-parameterized", slot: "practice" },
  { id: "CS-012", lesson: "py-l3-uv-pyproject-capstone", slot: "practice" },
  { id: "CS-013", lesson: "py-l3-numpy-arrays", slot: "practice" },
  { id: "CS-014", lesson: "py-l3-pandas-dataframes", slot: "practice" },

  // Python L4 — Codebase
  { id: "CS-015", lesson: "py-l4-abc-protocols", slot: "practice" },
  { id: "CS-016", lesson: "py-l4-solid-patterns", slot: "practice" },
  { id: "CS-017", lesson: "py-l4-decorators-advanced", slot: "practice" },
  { id: "CS-018", lesson: "py-l4-descriptors-metaclasses", slot: "practice" },
  { id: "CS-019", lesson: "py-l4-concurrency", slot: "practice" },
  { id: "CS-020", lesson: "py-l4-asyncio", slot: "practice" },
  { id: "CS-021", lesson: "py-l4-performance", slot: "practice" },
  { id: "CS-022", lesson: "py-l4-config-logging", slot: "practice" },
  { id: "CS-023", lesson: "py-l4-testing-tooling", slot: "practice" },
  { id: "CS-024", lesson: "py-l4-packaging-capstone", slot: "practice" },

  // Python L5 — Judging code you did not write. The only lessons carrying a brief in BOTH slots.
  { id: "CS-025", lesson: "py-l5-where-the-rule-lives", slot: "apply" },
  { id: "CS-026", lesson: "py-l5-where-the-rule-lives", slot: "practice" },
  { id: "CS-027", lesson: "py-l5-the-other-caller", slot: "apply" },
  { id: "CS-028", lesson: "py-l5-the-other-caller", slot: "practice" },
  { id: "CS-029", lesson: "py-l5-pin-the-seam", slot: "apply" },
  { id: "CS-030", lesson: "py-l5-pin-the-seam", slot: "practice" },
  { id: "CS-031", lesson: "py-l5-unsafe-sink", slot: "apply" },
  { id: "CS-032", lesson: "py-l5-unsafe-sink", slot: "practice" },
]

/** `CS-` followed by at least three digits. The shape the enforcement test pins. */
export const TICKET_ID_PATTERN = /^CS-\d{3,}$/

const BY_KEY = new Map(TICKETS.map((entry) => [`${entry.lesson}:${entry.slot}`, entry]))

/**
 * The ticket for one brief.
 *
 * Throws rather than returning a fallback: an unregistered brief is an authoring mistake, and
 * failing at import time surfaces it in the build and the test run instead of shipping a brief with
 * a missing or made-up number.
 */
export function ticketFor(lesson: string, slot: BriefSlot): TicketEntry {
  const entry = BY_KEY.get(`${lesson}:${slot}`)
  if (!entry) {
    throw new Error(
      `No ticket registered for ${lesson} [${slot}]. Append one to TICKETS in ` +
        `lib/tutorials/curriculum/brief/ticket-registry.ts using ${nextTicketId()}.`
    )
  }
  return entry
}

/** The next number to append. Exported so authors and tooling never have to eyeball the list. */
export function nextTicketId(): string {
  const highest = TICKETS.reduce((max, entry) => Math.max(max, Number(entry.id.slice(3))), 0)
  return `CS-${String(highest + 1).padStart(3, "0")}`
}
