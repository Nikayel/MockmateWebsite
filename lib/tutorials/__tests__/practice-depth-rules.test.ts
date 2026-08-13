/**
 * The Practice depth rules, enforced rather than documented.
 *
 * A founder review found the L4 concurrency practice unusable: a blank file demanding six new
 * ideas at once, against a teach section whose only worked example was `executor.map`, the very
 * API whose ordering guarantee the practice made you rebuild by hand. A council traced it to the
 * spec's own wording ("a different, harder problem than Apply") and rewrote the rules. See
 * `docs/PYTHON-PRACTICE-DEPTH-SPEC.md`.
 *
 * All 23 practices were then fixed. This file exists so the twenty-fourth cannot drift back, and
 * it encodes the three rules that are mechanically checkable:
 *
 *  - the CLOSURE RULE: every fact the solution needs is reachable, and no starter pre-writes a
 *    decision. Facts are checkable; decisions are not, which is why only half of that rule lives
 *    here and the other half stays a review question.
 *  - the RAMP RULE: Apply is the rung between Teach and Practice, so a Practice cannot tower over
 *    the Apply that is supposed to prepare it.
 *  - the BUDGET RULE: an exercise states its own time, because an unstated estimate is an
 *    unchecked one, and that is how a 75-minute exercise shipped advertised as 28.
 *
 * Course-agnostic by construction: it walks the curriculum tree, so a new language track is
 * covered the day it lands.
 */
import { describe, expect, it } from "vitest"
import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"

interface WorkspaceFile {
  path: string
  content: string
  role: string
}

interface Exercise {
  estimatedMinutes?: number
  starterCode?: string
  referenceSolution?: string
  workspace?: { files?: WorkspaceFile[]; referenceFiles?: WorkspaceFile[] }
}

interface Lesson {
  id: string
  estimatedMinutes?: number
  teach?: { markdown?: string; demoCode?: string; estimatedMinutes?: number }
  apply?: Exercise
  practice?: Exercise
}

/** Every fenced code block, in any language: all of it is code the learner has seen. */
function fencedCode(markdown: string | undefined): string {
  return (markdown?.match(/```[\s\S]*?```/g) || []).join("\n")
}

function realLines(source: string): number {
  return source.split("\n").filter((line) => line.trim() && !line.trim().startsWith("#")).length
}

/** Lessons in the order a learner meets them, which is the order the closure rule reasons about. */
function lessonsInOrder(): Lesson[] {
  const out: Lesson[] = []
  for (const level of PYTHON_LEVELS as unknown as Array<{
    modules: Array<{ lessons: Lesson[] }>
  }>) {
    for (const mod of level.modules) out.push(...mod.lessons)
  }
  return out
}

const LESSONS = lessonsInOrder()
const WORKSPACE_PRACTICES = LESSONS.filter((lesson) => lesson.practice?.workspace)

/**
 * Method calls the reference solution makes. Deliberately crude: it catches `.rglob(`, not every
 * possible expression. A rule that flags real gaps and misses exotic ones beats a rule nobody can
 * read, and the failure mode is a false negative rather than a false alarm.
 */
function methodsCalled(source: string): string[] {
  const found = new Set<string>()
  const pattern = /\.([a-z_][a-z0-9_]{2,})\s*\(/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) found.add(match[1])
  return [...found]
}

describe("the corpus this file guards", () => {
  it("has workspace practices to check", () => {
    expect(WORKSPACE_PRACTICES.length).toBeGreaterThan(20)
  })
})

describe("closure rule: every fact the solution needs is reachable", () => {
  // Walked in curriculum order, accumulating everything taught so far, because a fact demonstrated
  // in an earlier lesson is a fact the learner has been given. Checking a lesson in isolation would
  // flag `str.split` as untaught in Level 5.
  const unreachable = new Map<string, string[]>()
  let seenSoFar = ""

  for (const lesson of LESSONS) {
    const ownTeaching =
      fencedCode(lesson.teach?.markdown) +
      "\n" +
      (lesson.teach?.demoCode || "") +
      "\n" +
      JSON.stringify(lesson.apply || {})

    const practice = lesson.practice
    if (practice?.workspace) {
      // Read-only harnesses, the README, and the starters are all in front of the learner.
      const given = (practice.workspace.files || []).map((file) => file.content).join("\n")
      const reference = (practice.workspace.referenceFiles || [])
        .map((file) => file.content)
        .join("\n")

      const reachable = seenSoFar + ownTeaching + given
      const missing = methodsCalled(reference).filter((name) => !reachable.includes(name))
      if (missing.length) unreachable.set(lesson.id, missing)

      seenSoFar += "\n" + given + "\n" + reference
    } else if (practice) {
      seenSoFar += "\n" + JSON.stringify(practice)
    }

    seenSoFar += "\n" + ownTeaching
  }

  it("never asks a practice to call an API the learner has not been shown", () => {
    const report = [...unreachable].map(([id, names]) => `${id}: ${names.join(", ")}`)
    expect(
      report,
      "These practice reference solutions call APIs that appear in no code the learner has seen " +
        "(no fenced example in this or any earlier lesson, no read-only workspace file, no README, " +
        "no starter). Demonstrate the API in the lesson's teach section. Do NOT answer this by " +
        "pre-filling the starter: the API is a fact and belongs upstream, while the decision to " +
        "reach for it stays the learner's.\n  " +
        report.join("\n  ")
    ).toEqual([])
  })
})

describe("ramp rule: Apply is the rung, not a warm-up", () => {
  /**
   * Measured when this rule was written: the median Practice was 10x its Apply and the worst was
   * 47x, which is the shape of a cliff rather than a curve. 12x is the smell threshold from the
   * spec, kept deliberately loose so it catches discontinuities and not judgement calls.
   */
  const MAX_RATIO = 12

  const steep: string[] = []
  for (const lesson of WORKSPACE_PRACTICES) {
    const applyLines = realLines(lesson.apply?.referenceSolution || "")
    // An Apply with no reference solution is measured by review, not here.
    if (!applyLines) continue
    const practiceLines = realLines(
      (lesson.practice?.workspace?.referenceFiles || []).map((file) => file.content).join("\n")
    )
    const ratio = practiceLines / applyLines
    if (ratio > MAX_RATIO) {
      steep.push(
        `${lesson.id}: practice ${practiceLines} lines vs apply ${applyLines} (${ratio.toFixed(1)}x)`
      )
    }
  }

  it("keeps a practice within reach of the apply that prepares it", () => {
    expect(
      steep,
      `A Practice more than ${MAX_RATIO}x its Apply is a missing rung, and the gap gets paid at ` +
        `the top of the cliff. Fix it by strengthening APPLY so it exercises the lesson's real ` +
        `skill, not by shrinking Practice.\n  ` +
        steep.join("\n  ")
    ).toEqual([])
  })
})

describe("budget rule: an exercise states its own time", () => {
  it("gives every workspace practice an estimate", () => {
    const missing = WORKSPACE_PRACTICES.filter(
      (lesson) => typeof lesson.practice?.estimatedMinutes !== "number"
    ).map((lesson) => lesson.id)
    expect(
      missing,
      "Practice must carry its own estimatedMinutes, derived by counting lines to read and lines " +
        "to write, with the derivation recorded in a source comment. An unstated estimate is an " +
        "unchecked one.\n  " +
        missing.join("\n  ")
    ).toEqual([])
  })

  it("keeps the lesson total honest against its parts", () => {
    const wrong: string[] = []
    for (const lesson of WORKSPACE_PRACTICES) {
      const teach = lesson.teach?.estimatedMinutes
      const apply = lesson.apply?.estimatedMinutes
      const practice = lesson.practice?.estimatedMinutes
      if (
        typeof teach !== "number" ||
        typeof apply !== "number" ||
        typeof practice !== "number" ||
        typeof lesson.estimatedMinutes !== "number"
      ) {
        continue
      }
      const parts = teach + apply + practice
      if (parts !== lesson.estimatedMinutes) {
        wrong.push(`${lesson.id}: lesson says ${lesson.estimatedMinutes}, parts sum to ${parts}`)
      }
    }
    expect(
      wrong,
      "A lesson's estimatedMinutes must equal teach + apply + practice. A learner who blows past " +
        "a wrong estimate by 3x reads it as their own failure.\n  " +
        wrong.join("\n  ")
    ).toEqual([])
  })
})
