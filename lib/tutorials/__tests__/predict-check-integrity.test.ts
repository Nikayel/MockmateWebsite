/**
 * A predict check earns its place only if the learner cannot read the answer off the page above it.
 *
 * ## The defect this catches
 *
 * An SEO pass adds an answer-first paragraph to the top of a teach section. Further down, a
 * `predict` check asks for that same consequence. The check still renders, still parses, still has
 * exactly one correct option, and is now worthless: the retrieval it was placed there to force has
 * already been done for the learner, and the answer ships in crawlable HTML besides. Nothing in the
 * widget schema can see this, because the fence and the prose are valid in isolation.
 *
 * ## What "spoiled" means here, precisely
 *
 * NEAR-VERBATIM REUSE, not semantic overlap. The correct option's own words appearing, in order, in
 * the prose that precedes the check. A run of {@link MIN_RUN} normalized words is the bar; a short
 * option (under that many words) has to appear whole. Everything is lowercased, stripped of
 * markdown and punctuation, and collapsed to single spaces first, so a rewrap or a bolding change
 * cannot smuggle a copy past.
 *
 * Paraphrase is deliberately out of scope. A test that tried to judge meaning would either need a
 * model or would fire on the curriculum's whole job, which is to teach the thing it later checks.
 * The rule this file enforces is narrower and mechanical: do not hand over the sentence.
 *
 * ## What counts as "the prose above"
 *
 * Only prose. Every fenced block before the check is excluded, which means a previous check's
 * option labels, its feedback, a diagram's caption JSON, and every code sample are all out of
 * scope. Feedback text legitimately states answers, and it is disclosed only after the learner has
 * committed, so counting it would flag the design the widget was built for.
 */
import { describe, expect, it } from "vitest"

import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"
import { SQL_LEVELS } from "@/lib/tutorials/sql/curriculum"
import { SYSTEM_DESIGN_LEVELS } from "@/lib/tutorials/system-design/curriculum"
import { parseWidgetSpec } from "@/lib/tutorials/widgets/schema"

/**
 * How many consecutive words shared with the correct option counts as handing it over.
 *
 * Eight is calibrated against the shipped corpus. At six it fires on ordinary technical phrasing
 * any lesson repeats ("name the concrete anomaly a user", "both execute and there is no"), which
 * would train authors to route around the guard rather than fix content. At eight every hit is a
 * clause the author actually copied.
 */
const MIN_RUN = 8

/**
 * Options shorter than {@link MIN_RUN} words are matched whole, but only from this length up.
 * Under six words an option label is vocabulary rather than an answer ("successful checkouts per
 * second"), and requiring it to be absent from the teach section above would be unmeetable.
 */
const MIN_WHOLE_OPTION = 6

/**
 * Pre-existing violations, each with the reason it is tolerated rather than repaired.
 *
 * Every entry below predates this file and was found by it on first run (2026-08-16). None was
 * repaired here: this change repairs the two spoilers it was written for (sd-l5-leader-election-
 * fencing and sd-l10-distributed-lock, both of which pass without an entry) and files the rest for
 * a content pass rather than editing seven unrelated lessons under an SEO ticket.
 *
 * The common shape is a cumulative end-of-teach check whose correct option restates the clause the
 * lesson just taught. That placement is sanctioned by the widget's own design notes ("one
 * cumulative check at teach end"), and the closure rule requires the FACT to live in teach prose,
 * so the fix is to reword the option rather than to delete the teaching. Add an entry only with a
 * note saying why the duplication is defensible, never to get a red build green.
 */
const ALLOWED: { lessonId: string; promptStartsWith: string; why: string }[] = [
  {
    lessonId: "py-l2-dunder-properties",
    promptStartsWith: "Your Point class worked fine as a dict key",
    why: "The teach recap states the __hash__ = None rule verbatim. It is a closure-rule fact and has to live in prose; the option should be reworded instead.",
  },
  {
    lessonId: "py-l5-shrink",
    promptStartsWith: "For apply_ops above with ops",
    why: "The walkthrough above names the growing-prefix strategy in the same words the option uses. The check is retrieval of a strategy the section demonstrates.",
  },
  {
    lessonId: "py-l5-the-other-caller",
    promptStartsWith: "One caller needs rounding that contradicts",
    why: "The prose states the rule ('the difference belongs in that caller or behind a new parameter') and the option repeats the clause.",
  },
  {
    lessonId: "py-l5-the-other-caller",
    promptStartsWith: "Yesterday's change to the shared helper",
    why: "Same lesson: 'the neighbor had no test at the boundary' is the section's own sentence, reused as the correct option.",
  },
  {
    lessonId: "sd-l6-consumer-groups",
    promptStartsWith: "A 12-partition topic is falling behind",
    why: "Kafka's one-consumer-per-partition guarantee is stated 16 lines above the check in the same words. The guarantee must stay in prose; the option needs rewording.",
  },
  {
    lessonId: "sd-l8-sessions-tokens",
    promptStartsWith: "Last call before the design write",
    why: "Explicitly a cumulative recap check, and its option is the recap sentence. Re-asking the taught answer is the intent here, so this one may be correct as authored.",
  },
  {
    lessonId: "sd-l9-table-formats-cdc",
    promptStartsWith: "With a transactional outbox plus Debezium",
    why: "The 'Interview nuance' paragraph gives the delivery guarantee in the option's exact words. Cumulative check; reword the option, keep the nuance.",
  },
]

interface PredictCheck {
  lessonId: string
  prompt: string
  correctLabel: string
  /** Every word of teach prose that renders before this check, normalized. */
  proseAbove: string
}

/** Lowercase, markdown-free, punctuation-free, single-spaced. Comparison happens only in here. */
function normalize(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** A fence the way remark sees one: ```label through the next line that is just ```. */
const FENCE = /```([a-zA-Z0-9_-]*)[^\n]*\n([\s\S]*?)\n```/g

/**
 * Walk one lesson's markdown once, accumulating prose as it goes and snapshotting it at each
 * predict check. Fence bodies never enter the accumulator, so the prose a check is judged against
 * is exactly the prose a reader scrolls past to reach it.
 */
function predictChecksIn(lessonId: string, markdown: string): PredictCheck[] {
  const checks: PredictCheck[] = []
  const proseParts: string[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  FENCE.lastIndex = 0
  while ((match = FENCE.exec(markdown)) !== null) {
    proseParts.push(markdown.slice(cursor, match.index))
    cursor = match.index + match[0].length
    if (match[1] !== "cswidget") continue
    const parsed = parseWidgetSpec(match[2])
    if (!parsed.ok) continue
    const spec = parsed.spec
    if (spec.type !== "check" || spec.kind !== "predict" || !spec.options) continue
    const correct = spec.options.find((option) => option.correct === true)
    if (!correct) continue
    checks.push({
      lessonId,
      prompt: spec.prompt,
      correctLabel: correct.label,
      proseAbove: normalize(proseParts.join("\n")),
    })
  }
  return checks
}

/** The longest run of the option's words that the prose above already contains, or "". */
function spoilingRun(check: PredictCheck): string {
  const words = normalize(check.correctLabel).split(" ").filter(Boolean)
  if (words.length < MIN_WHOLE_OPTION) return ""
  const run = Math.min(MIN_RUN, words.length)
  const padded = ` ${check.proseAbove} `
  for (let i = 0; i + run <= words.length; i++) {
    const phrase = words.slice(i, i + run).join(" ")
    if (padded.includes(` ${phrase} `)) return phrase
  }
  return ""
}

function isAllowed(check: PredictCheck): boolean {
  return ALLOWED.some(
    (entry) => entry.lessonId === check.lessonId && check.prompt.startsWith(entry.promptStartsWith)
  )
}

function violationsIn(checks: PredictCheck[]): string[] {
  return checks.flatMap((check) => {
    if (isAllowed(check)) return []
    const run = spoilingRun(check)
    return run
      ? [`${check.lessonId}: "${check.prompt.slice(0, 70)}…" reuses "${run}" from the prose above`]
      : []
  })
}

const CORPUS: PredictCheck[] = [...PYTHON_LEVELS, ...SQL_LEVELS, ...SYSTEM_DESIGN_LEVELS].flatMap(
  (level) =>
    level.modules.flatMap((mod) =>
      mod.lessons.flatMap((lesson) => predictChecksIn(lesson.id, lesson.teach.markdown))
    )
)

describe("predict checks are not pre-answered by the prose above them", () => {
  it("walks a real corpus of predict checks", () => {
    expect(CORPUS.length).toBeGreaterThan(100)
  })

  it("finds a correct option in every predict check it collected", () => {
    expect(CORPUS.filter((check) => !check.correctLabel.trim())).toEqual([])
  })

  it("never repeats the correct option's wording in the teach prose above the check", () => {
    expect(violationsIn(CORPUS)).toEqual([])
  })

  it("has no stale allow-list entries", () => {
    const stale = ALLOWED.filter(
      (entry) =>
        !CORPUS.some(
          (check) =>
            check.lessonId === entry.lessonId && check.prompt.startsWith(entry.promptStartsWith)
        )
    ).map((entry) => `${entry.lessonId}: ${entry.promptStartsWith}`)
    expect(stale).toEqual([])
  })
})

describe("the rule rejects what it is meant to reject", () => {
  // Without this block the corpus assertion above passes on a green corpus and would keep passing
  // with the detector inverted, which is exactly how a guard rots into decoration.
  const spoiledLesson = `## Leases

Leader L holds a lease it must renew. The failure everyone misses is that L completes its
in-flight write as if it were still leader, long after the lease has gone.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "L pauses past its lease and L2 is elected. What does L do the instant it wakes?",
  "options": [
    {
      "label": "Completes its in-flight write as if it were still leader",
      "correct": true,
      "feedback": "Right. L's view of the lease is stale and nothing on L's side can fix that."
    },
    {
      "label": "Notices its lease expired and steps down",
      "feedback": "Any lease check is code that runs after the wake-up."
    }
  ]
}
\`\`\`
`

  it("flags an answer copied verbatim into the prose above the check", () => {
    const checks = predictChecksIn("seeded-spoiler", spoiledLesson)
    expect(checks).toHaveLength(1)
    expect(violationsIn(checks)).toHaveLength(1)
  })

  it("passes the same lesson once the consequence moves below the check", () => {
    const repaired = spoiledLesson.replace(
      "The failure everyone misses is that L completes its\nin-flight write as if it were still leader, long after the lease has gone.",
      "A lease is a bet that a holder which has gone quiet is dead, and a pause has no bound."
    )
    const checks = predictChecksIn("seeded-repair", repaired)
    expect(checks).toHaveLength(1)
    expect(violationsIn(checks)).toEqual([])
  })

  it("ignores an identical copy that sits inside a fence rather than in prose", () => {
    // Option labels and feedback from an earlier check repeat answers by design, and the learner
    // only sees them after committing. Counting fences would flag the widget's whole purpose.
    const fenced = spoiledLesson.replace(
      "The failure everyone misses is that L completes its\nin-flight write as if it were still leader, long after the lease has gone.",
      "```text\nL completes its in-flight write as if it were still leader.\n```"
    )
    expect(violationsIn(predictChecksIn("seeded-fenced", fenced))).toEqual([])
  })

  it("does not fire on a check whose answer merely shares vocabulary with the prose", () => {
    const paraphrased = spoiledLesson.replace(
      "The failure everyone misses is that L completes its\nin-flight write as if it were still leader, long after the lease has gone.",
      "A leader writes, a lease expires, and the write is still in flight somewhere."
    )
    expect(violationsIn(predictChecksIn("seeded-paraphrase", paraphrased))).toEqual([])
  })
})
