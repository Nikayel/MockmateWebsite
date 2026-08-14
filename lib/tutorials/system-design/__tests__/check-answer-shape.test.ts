/**
 * A ratchet on the SHAPE of a multiple-choice answer, as opposed to its content.
 *
 * ## The defect this exists to retire
 *
 * Measured across the resolved curriculum on 2026-08-13: for 309 of 386 predict checks
 * (80 percent), the option marked `correct` was also the LONGEST label. Chance for a
 * four-option question is 25 percent. A learner could therefore score about 80 percent on
 * every check in the course by clicking the longest option without reading the stem, which
 * is precisely the click-through reflex retrieval practice exists to prevent. It also means
 * a raw count of "516 checks" overstates how much assessment actually happens.
 *
 * It is not a defect of one authoring batch. L2 at 86 percent, L6 at 87 percent and L8 at
 * 90 percent all predate the check rollout; the rollout amplified an existing habit rather
 * than inventing it.
 *
 * ## Why it happens, which is what the fix has to address
 *
 * The correct option carries the nuance, so it attracts qualifying clauses ("..., which is
 * why the deploy order matters"), while distractors get written short and declarative. The
 * fix is NOT to pad distractors with filler, which would make four bad options instead of
 * one tell. It is to move the justification out of the correct LABEL and into that option's
 * FEEDBACK, where it belongs and where the learner reads it after committing.
 *
 * ## Why the target is 40 percent and not chance
 *
 * Forcing the rate to exactly 25 percent would itself be a pattern, and a learner who
 * noticed it could invert the heuristic. 40 percent is high enough to be indistinguishable
 * from noise at this corpus size and low enough that length carries no usable signal.
 *
 * ## How to use it
 *
 * The pins below are today's actual numbers, so this file is GREEN the moment it lands: a
 * gate that is red for six weeks is a gate people learn to ignore. Each rewriting batch
 * lowers its own level's pin in the same commit that earns it. Pins may only ever move
 * down. Confirmed to fail by appending a clause to one correct label.
 */
import { describe, expect, it } from "vitest"

import { SYSTEM_DESIGN_LEVELS } from "../curriculum"
import { extractCsWidgetSources } from "@/lib/tutorials/diagrams/extract"
import { parseWidgetSpec } from "@/lib/tutorials/widgets/schema"

interface PredictShape {
  lessonId: string
  levelId: number
  prompt: string
  correctIsLongest: boolean
  /**
   * The tell the first version of this gate did not measure, and which the sweep it was written
   * to drive promptly created.
   *
   * Twelve agents were told to reduce correct-is-longest. Most did it by chopping the correct
   * label and leaving the distractors untouched, which does not flatten the tell, it INVERTS it.
   * On L6 the agent edited zero distractor labels across nineteen rewritten checks: "always pick
   * the longest" fell from 87 percent to 38, while "always pick the shortest" rose from 8 percent
   * to 49. A one-sided gate produced a one-sided fix, exactly as Goodhart predicts.
   */
  correctIsShortest: boolean
  correctInTopTwo: boolean
  /** Longest label in the option set, which is what a length-guessing learner clicks. */
  longestLabel: number
  correctLabel: number
}

function collectPredicts(): PredictShape[] {
  const rows: PredictShape[] = []
  for (const level of SYSTEM_DESIGN_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        for (const source of extractCsWidgetSources(lesson.teach.markdown)) {
          const parsed = parseWidgetSpec(source)
          if (!parsed.ok) continue
          const spec = parsed.spec
          if (spec.type !== "check" || spec.kind !== "predict" || !spec.options) continue

          const lengths = spec.options.map((o) => o.label.length)
          const correctIndex = spec.options.findIndex((o) => o.correct === true)
          // Exactly-one-correct is enforced at parse time, so a miss here is impossible;
          // skipping rather than throwing keeps this gate from masking that one.
          if (correctIndex === -1) continue
          const correctLength = lengths[correctIndex]
          const descending = [...lengths].sort((a, b) => b - a)

          rows.push({
            lessonId: lesson.id,
            levelId: level.id as number,
            prompt: spec.prompt,
            correctIsLongest: correctLength === descending[0],
            correctIsShortest: correctLength === descending[descending.length - 1],
            correctInTopTwo: correctLength >= descending[Math.min(1, descending.length - 1)],
            longestLabel: descending[0],
            correctLabel: correctLength,
          })
        }
      }
    }
  }
  return rows
}

const PREDICTS = collectPredicts()

/**
 * COUNT of predicts whose correct option is the longest label, per level, as measured on
 * 2026-08-13. Lower a pin in the same commit that earns it; never raise one.
 *
 * Counts rather than percentages on purpose. A percentage pin has to be written to more
 * decimal places than anyone will maintain (65/67 is 97.01 percent, and `0.97` fails it),
 * and worse, it silently loosens when a level gains a check: at 0.97, level 10 could grow
 * from 67 predicts to 100 and quietly admit 32 more longest-correct answers. A count
 * cannot drift that way.
 *
 * The corpus target is 40 percent with no level above 55 percent (see the header for why
 * not chance). Until a level reaches it, its pin is simply where it stands.
 */
const LONGEST_PINS: Record<number, number> = {
  0: 9,
  1: 11,
  2: 9,
  3: 9,
  4: 8,
  5: 13,
  6: 15,
  7: 11,
  8: 11,
  9: 12,
  10: 26,
  11: 8,
}

/**
 * Corpus-wide pin. 309 of 386 (80 percent) when this file landed; 142 of 386 (37 percent) after
 * the twelve-agent sweep, which is under the ticket's 40 percent target. Ratcheted here in the
 * commit that verified the sweep, per this file's own rule that the batch lowers its own pin.
 */
const CORPUS_LONGEST_PIN = 142

/**
 * A label long enough to be its own paragraph is the shape this gate is really about: it
 * means the justification is living in the label instead of in the feedback. Three checks
 * are over 210 characters today, all in the levels the rewrite reaches, so this one is
 * pinned as a count too and drops to zero when they land.
 */
const LABEL_CHAR_CEILING = 210
const OVERLONG_LABEL_PIN = 3

/**
 * The inverse tell, pinned at what the first sweep left behind (158 of 386, 41 percent).
 *
 * Deliberately not pinned at chance. Moving justification out of a correct label makes it
 * shorter, and that is the fix working, not the fix failing; a short correct answer is very
 * often just the right answer. The line that matters is the next assertion.
 */
const CORPUS_SHORTEST_PIN = 158

/**
 * The number that actually describes the exploit, and the one this file should have led with.
 *
 * A guessing learner picks ONE strategy and sticks to it, so the exploitable rate is
 * `max(longest, shortest)`, not either alone. Before the sweep that was 309/386 (80 percent,
 * all of it "click the longest"). After, it is 158/386 (41 percent, now "click the shortest").
 * Chance is near 33 percent for a three-option check, so 41 percent is a real remaining edge,
 * which is why the pin sits at today's number rather than being declared done.
 *
 * Closing the last eight points needs distractor REBALANCING, not more chopping: the remaining
 * signal is checks where the correct label was cut and its distractors were never touched.
 */
const BEST_LENGTH_STRATEGY_PIN = 158

function countLongest(rows: PredictShape[]): number {
  return rows.filter((r) => r.correctIsLongest).length
}

describe("predict checks do not leak their answer through label length", () => {
  it("walks a real corpus, so every ratio below is measured and not vacuous", () => {
    expect(PREDICTS.length).toBeGreaterThan(300)
    expect(new Set(PREDICTS.map((p) => p.levelId)).size).toBe(12)
  })

  it("never lets the corpus-wide correct-is-longest count rise", () => {
    const count = countLongest(PREDICTS)
    const share = ((count / PREDICTS.length) * 100).toFixed(1)
    expect(
      count,
      `correct-is-longest rose to ${count}/${PREDICTS.length} (${share}%, pin ${CORPUS_LONGEST_PIN}). ` +
        `A rewrite lengthened a correct label, or shortened the distractors around it. ` +
        `Move the justification into that option's feedback instead.`
    ).toBeLessThanOrEqual(CORPUS_LONGEST_PIN)
  })

  it.each(Object.keys(LONGEST_PINS).map(Number))(
    "never lets level %i's correct-is-longest count rise",
    (levelId) => {
      const rows = PREDICTS.filter((p) => p.levelId === levelId)
      expect(rows.length).toBeGreaterThan(0)
      const count = countLongest(rows)
      expect(
        count,
        `level ${levelId} correct-is-longest rose to ${count}/${rows.length} ` +
          `(pin ${LONGEST_PINS[levelId]})`
      ).toBeLessThanOrEqual(LONGEST_PINS[levelId])
    }
  )

  it("never lets the INVERSE length tell grow past the one it replaced", () => {
    // Added after the first sweep, because the first sweep created this. Twelve agents were
    // told to reduce correct-is-longest and most did it by chopping the correct label while
    // leaving the distractors untouched, which inverts the tell rather than flattening it.
    // Corpus-wide, correct-is-shortest went from roughly 8 percent to 41 percent.
    //
    // Pinned generously on purpose. Some inversion is the honest cost of moving justification
    // out of the label, and a short correct answer is often simply the right answer. What must
    // not happen is the inverse becoming a BETTER strategy than the one we just removed.
    const shortest = PREDICTS.filter((p) => p.correctIsShortest).length
    const longest = countLongest(PREDICTS)
    expect(
      shortest,
      `correct-is-shortest is ${shortest}/${PREDICTS.length} against correct-is-longest ` +
        `${longest}. The fix for a long correct label is to move its justification into that ` +
        `option's feedback AND rebalance the distractors, not to chop one label and stop.`
    ).toBeLessThanOrEqual(CORPUS_SHORTEST_PIN)
  })

  it("keeps the best blind length strategy near chance", () => {
    // The metric that cannot be gamed by moving the tell around, and the one that should have
    // been written first. A guessing learner picks ONE strategy, so what matters is the best
    // one available, not either direction alone.
    const longest = countLongest(PREDICTS)
    const shortest = PREDICTS.filter((p) => p.correctIsShortest).length
    const best = Math.max(longest, shortest)
    const share = (best / PREDICTS.length) * 100
    expect(
      best,
      `the best blind length strategy pays ${share.toFixed(1)}% ` +
        `(longest ${longest}, shortest ${shortest}, pin ${BEST_LENGTH_STRATEGY_PIN}). ` +
        `Chance is near 33% for a three-option check.`
    ).toBeLessThanOrEqual(BEST_LENGTH_STRATEGY_PIN)
  })

  it("never ships more paragraph-length option labels than it has today", () => {
    // The mechanism behind the ratio, caught directly: a label carrying its own
    // justification is both the tell and the reason the tell exists.
    const offenders = PREDICTS.filter((p) => p.correctLabel > LABEL_CHAR_CEILING).map(
      (p) => `${p.lessonId}: correct label is ${p.correctLabel} chars`
    )
    expect(offenders.length, offenders.join("; ")).toBeLessThanOrEqual(OVERLONG_LABEL_PIN)
  })
})
