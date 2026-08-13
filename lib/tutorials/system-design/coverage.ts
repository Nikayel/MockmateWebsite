/**
 * What each System Design lesson actually carries: teach length, retrieval checks, simulations,
 * diagrams, and raw code fences.
 *
 * ## Why this is a module and not a script
 *
 * Three separate consumers need the same counts and had started to grow their own. The density-cap
 * test needs the set of interactive families so it can enforce one-per-lesson. Any sweep that adds
 * checks or converts ASCII art to diagrams needs a before-and-after measurement it can assert on.
 * And the audit script needs to print the corpus state for a human. Counting fences three ways is
 * how the three drift, so the counting lives here and the callers read it.
 *
 * The distinction that matters, and that a raw `cswidget` count hides: a `check` is a retrieval
 * question the learner answers inline, while the simulation families are interactive models the
 * learner manipulates. They carry completely different cognitive load, which is why only the
 * simulations (plus the two animated diagram types) are capped at one per lesson, and why a lesson
 * with nine checks and a lesson with nine simulations are not remotely the same lesson.
 *
 * Everything here is a pure read over the resolved curriculum. It walks `SYSTEM_DESIGN_LEVELS` the
 * same way the renderer does rather than grepping the level files, because those files keep teach
 * markdown in top-level consts far away from the lesson ids that use them, so a raw-file sweep
 * attributes fences to the wrong lesson.
 */
import { SYSTEM_DESIGN_LEVELS } from "./curriculum"
import { extractCsDiagramSources, extractCsWidgetSources } from "@/lib/tutorials/diagrams/extract"
import { parseDiagramSpec } from "@/lib/tutorials/diagrams/schema"
import { parseWidgetSpec } from "@/lib/tutorials/widgets/schema"
import type { DesignLevel } from "@/lib/tutorials/types"

/**
 * Widget families that model something the learner manipulates, as opposed to answering. These
 * count against the one-per-lesson density cap from the SD interactivity plan.
 */
export const SIMULATION_WIDGET_FAMILIES = new Set([
  "calc",
  "hash-ring",
  "sequence",
  "rate-limiter",
  "quorum",
  "cache-sim",
  "queue-sim",
  "partition-sim",
  "replication-lag",
  "watermark-sim",
  "steps",
])

/**
 * Diagram types that animate. They carry the same attention cost as a simulation, so they share its
 * budget. The remaining types (`table`, `er`, `pipeline`, and friends) render statically and are
 * exempt.
 */
export const ANIMATED_DIAGRAM_TYPES = new Set(["topology", "ladder"])

/** One lesson, measured. */
export interface LessonCoverage {
  lessonId: string
  levelId: number
  levelSlug: string
  title: string
  teachWords: number
  /** `summary` is contracted as one line; this is how long it actually is. */
  summaryChars: number
  /** Inline retrieval questions. Uncapped: more recall practice is simply better. */
  checks: number
  /** Simulation families plus animated diagram types present, capped at one in total. */
  heavy: string[]
  /** Diagram types that render statically. Uncapped. */
  staticDiagrams: string[]
  /**
   * Plain ``` fences: ASCII architecture drawings and code samples. A high count next to zero
   * diagrams is the signature of a lesson drawing its architecture in characters.
   */
  plainFences: number
}

/** One level, measured, with its lessons. */
export interface LevelCoverage {
  levelId: number
  slug: string
  title: string
  lessonCount: number
  teachWords: number
  /** Mean teach words per lesson, rounded. The clearest single indicator of a thin level. */
  averageTeachWords: number
  checks: number
  heavy: number
  staticDiagrams: number
  plainFences: number
  lessonsWithoutChecks: number
  lessonsWithoutDiagramOrSim: number
  lessons: LessonCoverage[]
}

export interface SystemDesignCoverage {
  levels: LevelCoverage[]
  lessons: LessonCoverage[]
  totals: {
    levelCount: number
    lessonCount: number
    teachWords: number
    checks: number
    heavy: number
    staticDiagrams: number
    lessonsWithoutChecks: number
    lessonsWithoutDiagramOrSim: number
    /** Neither a retrieval check nor any diagram or simulation: pure prose. */
    bareLessons: number
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Plain fences are the ones left after the two custom labels are removed. Counted by halving the
 * total delimiters, since an unterminated fence is `lesson-content-hygiene`'s job to catch, not
 * this module's.
 */
function countPlainFences(markdown: string): number {
  const delimiters = (markdown.match(/```/g) || []).length
  const custom = extractCsDiagramSources(markdown).length + extractCsWidgetSources(markdown).length
  return Math.max(0, Math.floor(delimiters / 2) - custom)
}

function measureLesson(
  lesson: DesignLevel["modules"][number]["lessons"][number],
  level: DesignLevel
): LessonCoverage {
  const markdown = lesson.teach.markdown
  const heavy: string[] = []
  const staticDiagrams: string[] = []
  let checks = 0

  for (const source of extractCsWidgetSources(markdown)) {
    const parsed = parseWidgetSpec(source)
    // A spec that does not parse is a content-integrity failure, reported there. Skipping it here
    // keeps a broken widget from silently counting as coverage the learner does not have.
    if (!parsed.ok) continue
    if (parsed.spec.type === "check") checks += 1
    if (SIMULATION_WIDGET_FAMILIES.has(parsed.spec.type)) heavy.push(parsed.spec.type)
  }

  for (const source of extractCsDiagramSources(markdown)) {
    const parsed = parseDiagramSpec(source)
    if (!parsed.ok) continue
    if (ANIMATED_DIAGRAM_TYPES.has(parsed.spec.type)) heavy.push(parsed.spec.type)
    else staticDiagrams.push(parsed.spec.type)
  }

  return {
    lessonId: lesson.id,
    levelId: level.id as number,
    levelSlug: level.slug,
    title: lesson.title,
    teachWords: countWords(markdown),
    summaryChars: lesson.summary.length,
    checks,
    heavy,
    staticDiagrams,
    plainFences: countPlainFences(markdown),
  }
}

/** True when a lesson offers the learner nothing but prose: no check, no diagram, no simulation. */
export function isBareLesson(lesson: LessonCoverage): boolean {
  return lesson.checks === 0 && lesson.heavy.length === 0 && lesson.staticDiagrams.length === 0
}

/** Measure the whole System Design corpus. Pure; safe to call from tests, scripts, and routes. */
export function buildSystemDesignCoverage(
  levels: DesignLevel[] = SYSTEM_DESIGN_LEVELS
): SystemDesignCoverage {
  const levelRows: LevelCoverage[] = levels.map((level) => {
    const lessons = level.modules.flatMap((mod) =>
      mod.lessons.map((lesson) => measureLesson(lesson, level))
    )
    const teachWords = lessons.reduce((n, l) => n + l.teachWords, 0)
    return {
      levelId: level.id as number,
      slug: level.slug,
      title: level.title,
      lessonCount: lessons.length,
      teachWords,
      averageTeachWords: lessons.length ? Math.round(teachWords / lessons.length) : 0,
      checks: lessons.reduce((n, l) => n + l.checks, 0),
      heavy: lessons.reduce((n, l) => n + l.heavy.length, 0),
      staticDiagrams: lessons.reduce((n, l) => n + l.staticDiagrams.length, 0),
      plainFences: lessons.reduce((n, l) => n + l.plainFences, 0),
      lessonsWithoutChecks: lessons.filter((l) => l.checks === 0).length,
      lessonsWithoutDiagramOrSim: lessons.filter(
        (l) => l.heavy.length === 0 && l.staticDiagrams.length === 0
      ).length,
      lessons,
    }
  })

  const allLessons = levelRows.flatMap((l) => l.lessons)

  return {
    levels: levelRows,
    lessons: allLessons,
    totals: {
      levelCount: levelRows.length,
      lessonCount: allLessons.length,
      teachWords: levelRows.reduce((n, l) => n + l.teachWords, 0),
      checks: levelRows.reduce((n, l) => n + l.checks, 0),
      heavy: levelRows.reduce((n, l) => n + l.heavy, 0),
      staticDiagrams: levelRows.reduce((n, l) => n + l.staticDiagrams, 0),
      lessonsWithoutChecks: allLessons.filter((l) => l.checks === 0).length,
      lessonsWithoutDiagramOrSim: allLessons.filter(
        (l) => l.heavy.length === 0 && l.staticDiagrams.length === 0
      ).length,
      bareLessons: allLessons.filter(isBareLesson).length,
    },
  }
}
