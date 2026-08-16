/**
 * The sealing test — the security gate for the public Learn corpus.
 *
 * `toPublicLessonPreview` is what stands between the authored curriculum and Googlebot. Every
 * `/learn/{track}/{levelSlug}/{lessonId}` page is statically generated from its output, so anything
 * that survives the projection is published permanently and cannot be recalled. This file runs the
 * projection over EVERY lesson in the live corpus (not a fixture, not a sample) and asserts three
 * independent invariants.
 *
 * ## Why the obvious test would be wrong
 *
 * The tempting assertion is "no reference solution string appears anywhere in the public output".
 * That assertion FAILS on the real corpus, and correctly so: in roughly two dozen lessons the Apply
 * exercise's `referenceSolution` appears verbatim inside `teach.markdown`, because Apply is a guided
 * re-application of the code the lesson just walked the learner through. `py-l1-hello` teaches
 * `def greet(name)` and then asks the learner to write it. That is pedagogy, not leakage, and it is
 * already visible to every signed-in learner in the Read phase today.
 *
 * So the invariant is stated precisely instead of loosely:
 *
 *  1. STRUCTURAL   no gated field NAME survives at any depth (catches a bad projection edit).
 *  2. EXACT KEYS   the key set is exactly the allowlist (catches a spread-and-delete refactor).
 *  3. NO NEW LEAK  no gated VALUE reaches the public output unless the author had already placed it
 *                  in text the projection publishes anyway, meaning the teaching prose, the worked
 *                  example, or the task statement.
 *  4. NO GIVEAWAY  no task statement contains its own answer, which is the only way invariant 3
 *                  could be satisfied vacuously.
 *
 * Invariant 3 is the load-bearing one. If someone adds `referenceSolution` to the projection, it
 * fails immediately on every lesson whose solution is not already taught inline, which is most of them.
 */
import { describe, expect, it } from "vitest"

import { listAllCatalogEntries, COURSE_IDS, type CatalogEntry } from "../course-catalog"
import {
  GATED_FIELD_NAMES,
  toPublicLessonPreview,
  type AuthoredExercise,
  type PublicLessonPreview,
} from "../public-preview"

const ENTRIES = listAllCatalogEntries()

/**
 * Top-level keys the public preview is allowed to have. Exact, not a superset.
 *
 * Hand-registered on purpose: this list is the gating control, so a field only becomes publishable
 * when someone types its name here. `supplied` shipped in `toPublicExercisePreview` without being
 * added to `ALLOWED_EXERCISE_KEYS` and stayed invisible until the first lesson authored one
 * (`b9f19500`). Add the projection and the allowlist entry in the same commit, every time.
 *
 * `seoDescription` is the newest entry. It is the lesson's own meta description, so publishing it is
 * its purpose rather than a disclosure, and `toPublicLessonPreview` writes the key unconditionally
 * so this assertion stays an equality rather than degrading to a subset check on the majority of
 * lessons that have no value for it.
 */
const ALLOWED_PREVIEW_KEYS = [
  "apply",
  "courseId",
  "difficulty",
  "estimatedMinutes",
  "extraPracticeCount",
  "id",
  "levelId",
  "levelSlug",
  "levelTagline",
  "levelTitle",
  "practice",
  "seoDescription",
  "skills",
  "summary",
  "teach",
  "title",
].sort()

const ALLOWED_TEACH_KEYS = [
  "demoCode",
  "demoSeedSql",
  "estimatedMinutes",
  "markdown",
  "showDemoInput",
]

/**
 * `supplied` is on this list for the same reason `prompt` and `thinkAbout` are: it is QUESTION
 * material. A critique exercise reads "Review the proposed design below", and a signed-out reader who
 * gets the sentence without the design is reading broken copy on the page Google indexes.
 *
 * It was added to `toPublicExercisePreview` when the field shipped, and NOT added here, which stayed
 * invisible for exactly as long as no lesson authored one. The first artifact to land tripped it. A
 * field allowlist that is only exercised by content is a latent failure until the content arrives, so
 * the next person adding a published exercise field should update both sides in the same commit.
 */
const ALLOWED_EXERCISE_KEYS = ["gradedCheckCount", "hintCount", "prompt", "supplied", "thinkAbout"]

/**
 * Strings shorter than this are not checked for containment. A 12-character expected value such as
 * `"Hello, Ada!"` occurs in ordinary prose constantly, so matching it would report noise rather than
 * leaks, and a string that short cannot carry an answer a reader could not have reconstructed.
 */
const MIN_LEAKABLE_LENGTH = 24

/** Walk every key name in a nested value. */
function collectKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, into)
    return
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      into.add(key)
      collectKeys(child, into)
    }
  }
}

/**
 * Every substantial gated string in one authored exercise: the model answer, the seed the learner
 * starts from, the hint text, and the grading data. Deliberately includes everything a competitor
 * would want, not only the fields named `referenceSolution`.
 */
function gatedStringsOf(exercise: AuthoredExercise): string[] {
  const out: string[] = []
  const push = (value: string | undefined): void => {
    if (value && value.length >= MIN_LEAKABLE_LENGTH) out.push(value)
  }

  if ("referenceSolution" in exercise) push(exercise.referenceSolution)
  if ("starterCode" in exercise) push(exercise.starterCode)
  if ("starterAnswer" in exercise) push(exercise.starterAnswer)
  if ("hints" in exercise && Array.isArray(exercise.hints)) exercise.hints.forEach(push)
  if ("modelAnswerOutline" in exercise && Array.isArray(exercise.modelAnswerOutline)) {
    exercise.modelAnswerOutline.forEach(push)
  }
  // A rubric's "strong" band is the model answer restated as a description of a good answer: on
  // `sd-l1-latency-percentiles` it computes `4000 x 0.096 = 384 against 300` outright. The KEY is in
  // GATED_FIELD_NAMES so the structural check covers it, but until this walked the bands the
  // no-gated-VALUE invariant had zero coverage across all 84 of them, which is name-only defence.
  if ("rubric" in exercise && Array.isArray(exercise.rubric)) {
    for (const dimension of exercise.rubric as Array<Record<string, unknown>>) {
      for (const band of ["weak", "adequate", "strong"]) {
        if (typeof dimension[band] === "string") push(dimension[band] as string)
      }
    }
  }
  if ("testCases" in exercise && exercise.testCases) {
    push(JSON.stringify(exercise.testCases))
  }
  if ("singleFile" in exercise && exercise.singleFile) {
    push(exercise.singleFile.seedSql)
    push(JSON.stringify(exercise.singleFile.expected))
  }
  if ("workspace" in exercise && exercise.workspace) {
    const workspace = exercise.workspace
    if ("seedSql" in workspace) push(workspace.seedSql)
    if ("assertions" in workspace && Array.isArray(workspace.assertions)) {
      workspace.assertions.forEach((assertion) => push(assertion.sql))
    }
    workspace.files.forEach((file) => push(file.content))
    workspace.referenceFiles?.forEach((file) => push(file.content))
  }
  return out
}

/**
 * The text the author deliberately made public: the teaching prose, its runnable worked example, and
 * the task statement itself. A gated string that already lives here was published on purpose, so
 * republishing it is not a NEW disclosure, which is exactly what this suite measures.
 *
 * Including the prompt is not a loophole. The projection publishes precisely `teach.*` and `prompt`,
 * and a prompt is a question by definition, so any gated value found inside one is an authoring
 * redundancy rather than a leak. Two hints in the live corpus are verbatim restatements of a line
 * already in their own prompt (`py-l1-lists`, `sql-l6-data-quality-checks`). The case where a prompt
 * really does give the answer away is a content defect, and it gets its own assertion below rather
 * than being silently excused here.
 */
function publishedText(entry: CatalogEntry, exercise: AuthoredExercise): string {
  const { teach } = entry.lesson
  const thinkAbout =
    "thinkAbout" in exercise && Array.isArray(exercise.thinkAbout)
      ? exercise.thinkAbout.join("\n")
      : ""
  return [
    teach.markdown,
    teach.demoCode ?? "",
    teach.demoSeedSql ?? "",
    exercise.prompt,
    thinkAbout,
  ].join("\n")
}

/** The teaching text alone, for assertions that must not credit the prompt. */
function teachingTextOnly(entry: CatalogEntry): string {
  const { teach } = entry.lesson
  return [teach.markdown, teach.demoCode ?? "", teach.demoSeedSql ?? ""].join("\n")
}

function previewOf(entry: CatalogEntry): PublicLessonPreview {
  return toPublicLessonPreview({
    courseId: entry.courseId,
    level: entry.level,
    lesson: entry.lesson,
  })
}

describe("public lesson preview sealing", () => {
  it("walks a real, non-empty corpus covering every course", () => {
    expect(ENTRIES.length).toBeGreaterThan(300)
    const covered = new Set(ENTRIES.map((entry) => entry.courseId))
    expect([...covered].sort()).toEqual([...COURSE_IDS].sort())
    // Ids are the Firestore progress key and the URL segment, so collisions would corrupt both.
    const ids = ENTRIES.map((entry) => entry.lesson.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("never carries a gated field name at any depth", () => {
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const keys = new Set<string>()
      collectKeys(previewOf(entry), keys)
      for (const gated of GATED_FIELD_NAMES) {
        if (keys.has(gated)) offenders.push(`${entry.lesson.id}: ${gated}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("exposes exactly the allowlisted keys and no others", () => {
    for (const entry of ENTRIES) {
      const preview = previewOf(entry)
      expect(Object.keys(preview).sort(), `top-level keys for ${entry.lesson.id}`).toEqual(
        ALLOWED_PREVIEW_KEYS
      )
      for (const key of Object.keys(preview.teach)) {
        expect(ALLOWED_TEACH_KEYS, `teach key on ${entry.lesson.id}`).toContain(key)
      }
      for (const exercise of [preview.apply, preview.practice]) {
        for (const key of Object.keys(exercise)) {
          expect(ALLOWED_EXERCISE_KEYS, `exercise key on ${entry.lesson.id}`).toContain(key)
        }
      }
    }
  })

  it("publishes no gated value that the teaching text had not already published", () => {
    const offenders: string[] = []

    for (const entry of ENTRIES) {
      const serialized = JSON.stringify(previewOf(entry))

      for (const exercise of [entry.lesson.apply, entry.lesson.practice]) {
        const alreadyPublic = publishedText(entry, exercise)
        for (const secret of gatedStringsOf(exercise)) {
          if (!serialized.includes(secret)) continue
          if (alreadyPublic.includes(secret)) continue
          offenders.push(`${entry.lesson.id}: ${secret.slice(0, 80).replace(/\s+/g, " ")}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it("never ships a prompt that gives away its own answer", () => {
    // The one way the invariant above could be satisfied vacuously: if an author wrote the solution
    // into the task statement, publishing the prompt would publish the answer and nothing would flag
    // it. This is that flag. It is a content-quality assertion, not a projection one.
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      for (const exercise of [entry.lesson.apply, entry.lesson.practice]) {
        const answers: string[] = []
        if ("referenceSolution" in exercise && exercise.referenceSolution) {
          answers.push(exercise.referenceSolution)
        }
        if ("modelAnswerOutline" in exercise && Array.isArray(exercise.modelAnswerOutline)) {
          answers.push(...exercise.modelAnswerOutline)
        }
        for (const answer of answers) {
          if (answer.length < MIN_LEAKABLE_LENGTH) continue
          if (!exercise.prompt.includes(answer)) continue
          offenders.push(`${exercise.id}: prompt contains its own answer`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("keeps prompts but not solutions, on a lesson whose solution is not taught inline", () => {
    // A targeted counterexample so the suite fails loudly if the projection is widened, rather than
    // relying only on the corpus-wide scan above.
    const entry = ENTRIES.find(
      (candidate) =>
        "referenceSolution" in candidate.lesson.apply &&
        typeof candidate.lesson.apply.referenceSolution === "string" &&
        candidate.lesson.apply.referenceSolution.length >= MIN_LEAKABLE_LENGTH &&
        !teachingTextOnly(candidate).includes(candidate.lesson.apply.referenceSolution)
    )
    expect(entry, "expected at least one lesson whose solution is not taught inline").toBeDefined()

    const preview = previewOf(entry!)
    const solution = (entry!.lesson.apply as { referenceSolution?: string }).referenceSolution!
    expect(preview.apply.prompt).toBe(entry!.lesson.apply.prompt)
    expect(JSON.stringify(preview)).not.toContain(solution)
  })

  it("counts hints and graded checks without revealing either", () => {
    const withHints = ENTRIES.find(
      (entry) => "hints" in entry.lesson.apply && entry.lesson.apply.hints.length > 0
    )
    expect(withHints).toBeDefined()
    const preview = previewOf(withHints!)
    expect(preview.apply.hintCount).toBe(
      (withHints!.lesson.apply as { hints: string[] }).hints.length
    )
    const hintText = (withHints!.lesson.apply as { hints: string[] }).hints.filter(
      (hint) => hint.length >= MIN_LEAKABLE_LENGTH
    )
    for (const hint of hintText) {
      if (teachingTextOnly(withHints!).includes(hint)) continue
      expect(JSON.stringify(preview)).not.toContain(hint)
    }
  })
})
