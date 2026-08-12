/**
 * Renders a workspace brief (the `README.md` shipped inside a multi-file exercise).
 *
 * Split from `ticket-registry.ts` on purpose: that module owns brief **identity** (which ticket
 * number this is), this one owns **presentation** (what the header looks like). They change for
 * different reasons — a new lesson touches the registry, a design change to the header touches this
 * file — so they are separate modules rather than one "briefs" grab bag.
 *
 * Call sites pass `lesson` and `slot`, never a ticket number: the number is resolved from the
 * registry, so a lesson physically cannot invent its own. An unregistered brief throws at import.
 *
 * The body stays hand-written markdown. Briefs are prose about a specific scenario and templating
 * them past the header would make every ticket read the same, which is the opposite of the goal.
 * What is centralized is everything that should NOT vary: the ticket number, the header shape, the
 * kind vocabulary, and the hidden-tests footer.
 */
import { ticketFor, type BriefSlot } from "./ticket-registry"

/**
 * The kinds of brief a lesson can open with, and the label each renders as.
 *
 * A map rather than a switch in the builder, so adding a kind is one entry here and no change to
 * the rendering code. The vocabulary is closed on purpose: it was six inconsistent phrasings across
 * the corpus ("Ticket:", "Bug report:", "Postmortem:", "Capstone:", "Change log:", and untitled),
 * and a learner should be able to tell at a glance what kind of work they have been handed.
 */
export const BRIEF_KINDS = {
  /** Ordinary work item: build or extend something. */
  ticket: "Ticket",
  /** Something is broken in a described way; find and repair it. */
  "bug-report": "Bug report",
  /** A change already landed and broke something downstream. */
  "change-log": "Change log",
  /** An incident happened; the brief is the writeup and the follow-up work. */
  postmortem: "Postmortem",
  /** End-of-level work composing several of the level's skills. */
  capstone: "Capstone",
} as const

export type BriefKind = keyof typeof BRIEF_KINDS

export interface BriefInput {
  /** Lesson id, e.g. `"py-l4-concurrency"`. Must be registered in `TICKETS`. */
  lesson: string
  /** Defaults to `"practice"`, which is where all but the L5 briefs live. */
  slot?: BriefSlot
  kind: BriefKind
  /**
   * One line naming the problem, sentence case, no trailing period. It follows the ticket number in
   * the heading, so it should read as a ticket title: "the asset sweep reports the wrong sizes".
   */
  headline: string
  /** Hand-written markdown. The task, the contract, the constraints. */
  body: string
  /**
   * Whether the exercise carries a hidden suite. Defaults to true, which appends the standard
   * closing line. Centralized because it was hand-typed into most bodies in slightly different
   * words, and it is a promise about grading rather than part of any one scenario.
   */
  hiddenTests?: boolean
}

/** The sentence every brief with a hidden suite ends on. One wording, one place. */
export const HIDDEN_TESTS_NOTE = "Some tests are hidden, so cover the cases the visible ones imply."

/**
 * Capitalize the headline's first letter.
 *
 * Authors write headlines both ways ("Finish the reportkit split", "the deploy tool reads settings
 * files nobody agrees on") because a ticket title reads naturally in either. Normalizing here
 * rather than asking 32 call sites to agree is the difference between a rule and a habit.
 *
 * Leaves a non-letter opener alone, so a headline starting with inline code keeps its backtick.
 */
function capitalizeHeadline(headline: string): string {
  const trimmed = headline.trim()
  const first = trimmed.charAt(0)
  return /[a-z]/.test(first) ? first.toUpperCase() + trimmed.slice(1) : trimmed
}

/**
 * Build the brief markdown.
 *
 * Shape: `# CS-019 · Bug report · the asset sweep reports the wrong sizes`, then the body, then the
 * hidden-tests note. The heading carries all three facts because the brief renders in a narrow pane
 * where a multi-line header costs more than it gives.
 */
export function buildBrief({
  lesson,
  slot = "practice",
  kind,
  headline,
  body,
  hiddenTests = true,
}: BriefInput): string {
  const ticket = ticketFor(lesson, slot)
  const heading = `# ${ticket.id} · ${BRIEF_KINDS[kind]} · ${capitalizeHeadline(headline)}`
  const sections = [heading, body.trim()]
  if (hiddenTests) sections.push(HIDDEN_TESTS_NOTE)
  return `${sections.join("\n\n")}\n`
}
