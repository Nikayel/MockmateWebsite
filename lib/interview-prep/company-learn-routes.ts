/**
 * Company interview intent -> the free Learn corpus.
 *
 * ## Why this module exists, and the measurement that shaped it
 *
 * `/interview-prep/{company}` knows exactly what a visitor is preparing for: it holds the company's
 * `topPatterns`, its round structure, and its difficulty mix. Until now none of that reached the one
 * thing on the platform a signed-out visitor can actually use straight away, which is the free,
 * public Learn corpus at `/learn/{track}/{levelSlug}/{lessonId}`. This module is that bridge.
 *
 * Before writing it we measured the overlap between the two vocabularies across the whole live
 * corpus. The result decided the design:
 *
 *  - company `topPatterns` values: 23 distinct DSA slugs (`arrays-hashing`, `two-pointers`, ...)
 *  - lesson `skills[]` values: 947 distinct authored tags over 364 lessons
 *  - **exact intersection: 0. case/punctuation-normalised intersection: 0.**
 *
 * They do not overlap at all, and that is not an authoring accident. `topPatterns` is a taxonomy of
 * *algorithm shapes*; `skills[]` is a taxonomy of *language and system mechanics* (`dictionaries`,
 * `recursion`, `GROUP BY`, `idempotency`). Auto-matching them would have produced nothing, and
 * fuzzy-matching them would have produced confident nonsense. So the join is an explicit, short,
 * hand-audited alias table, and {@link PATTERN_LEARN_ALIASES} states the honest claim: these lessons
 * teach the mechanics you build the pattern out of, not the pattern itself. The page copy says the
 * same thing, because promising "learn two-pointers here" would be a lie about content we have not
 * authored.
 *
 * ## Why the aliases resolve against Python only
 *
 * Skill tags collide across courses with different meanings (`indexing` is a dict lookup in Python
 * and a B-tree in SQL; `sorting` is a comparator in one and a query plan in the other). Patterns are
 * coding-round vocabulary and Python is the platform's coding course, so the pattern join is scoped
 * to it. The System Design join is scoped separately and structurally, below.
 *
 * ## Moving-target discipline
 *
 * A concurrent authoring loop commits lessons to `main` continuously. Nothing here names a lesson id
 * or a lesson count; every link is resolved from `course-catalog.ts` at build time.
 * `__tests__/company-learn-routes.test.ts` asserts every alias still resolves to at least one live
 * lesson, so a retagged or renamed lesson fails the suite loudly instead of quietly emptying a
 * section on 38 indexed pages.
 *
 * Server-only: importing `course-catalog` pulls in the full authored curriculum.
 */
import type { CompanyQuestionData } from "@/lib/data/company-questions/types"
import { PATTERN_METADATA, type DSAPattern } from "@/lib/types/dsa-patterns"
import {
  COURSE_IDS,
  listCourseEntries,
  listCourseLevels,
  type CatalogEntry,
} from "@/lib/tutorials/course-catalog"
import { LEARN_COURSE_LABEL, publicLessonPath, trackPath } from "@/lib/tutorials/lesson-routes"
import type { CourseId } from "@/lib/tutorials/types"

/**
 * DSA pattern -> Python `skills[]` tags that teach the mechanics the pattern is built from.
 *
 * Deliberately short and deliberately incomplete. Every tag on the right is a real tag on a real
 * lesson (verified by the test), and every row is a claim we are willing to defend in the page copy:
 * you cannot implement a hash-map counting solution without dicts and sets, or a DFS without
 * understanding the call stack, or a linked-list reversal without reference semantics.
 *
 * ## Precision beats coverage here, and the table was cut down to enforce that
 *
 * The first draft used broader tags and was checked by rendering the result for real companies. It
 * routed the `string` pattern to "Your first program: print & comments" (that lesson carries the
 * `strings` tag because it prints one) and `math-geometry` to "Variables & assignment" (it carries
 * `arithmetic`). Both links were technically derived and completely useless, which is worse than no
 * link at all on a page whose whole job is to be trusted. So broad tags such as `strings`,
 * `arithmetic`, `iteration`, `comparisons`, and `data-structures` were removed in favour of narrow
 * ones that only the right lesson carries, even where that leaves a pattern with a single link.
 *
 * ## Patterns deliberately absent
 *
 *  - `bit-manipulation`: nothing in the corpus teaches XOR tricks or masks.
 *  - `union-find`: the corpus teaches dicts and lists but never path compression or union by rank,
 *    and pointing at "Lists" for union-find is the kind of link that erodes trust.
 * Both appear on exactly one company each, so the honest cost is a slightly shorter section there.
 * A missing row contributes nothing; it never falls back to a generic lesson.
 */
export const PATTERN_LEARN_ALIASES: Partial<Record<DSAPattern, readonly string[]>> = {
  // Hash-map and set thinking: the lookup structures and the cost argument for choosing them.
  "arrays-hashing": ["dictionaries", "sets", "membership", "big-o", "counter"],
  // Positional access from both ends.
  "two-pointers": ["indexing", "slicing", "enumerate"],
  // The loop that expands and contracts, and the deque that backs a fixed window.
  "sliding-window": ["deque", "loops"],
  stack: ["lists", "append", "call-stack"],
  "monotonic-stack": ["lists", "append", "deque"],
  // The corpus has exactly one lesson on halving a search space (bisecting a failing input down to
  // a minimal reproduction). It is the same idea applied to debugging, and it is the honest link.
  "binary-search": ["bisection"],
  // Reference semantics: the reason reassigning `node.next` mutates the list the caller holds.
  "linked-list": ["references", "copying"],
  trees: ["recursion", "base-case", "call-stack"],
  "binary-tree": ["recursion", "base-case", "call-stack"],
  "binary-search-tree": ["recursion", "call-stack"],
  dfs: ["recursion", "call-stack"],
  // Adjacency in a dict, frontier in a deque.
  bfs: ["deque", "dictionaries"],
  graphs: ["dictionaries", "sets", "recursion"],
  "topological-sort": ["deque", "dictionaries"],
  backtracking: ["recursion", "call-stack", "lists"],
  // No heapq lesson exists. `sorted` with a key is the comparator work and the "why not just sort"
  // trade-off, which is the part of a heap answer an interviewer actually pushes on.
  heap: ["sorted"],
  "heap-priority-queue": ["sorted"],
  "priority-queue": ["sorted"],
  // Memoization and the cost analysis that decides whether the DP was worth it.
  "dp-1d": ["lru-cache", "recursion", "complexity"],
  "dp-2d": ["lru-cache", "complexity"],
  "dp-tree": ["lru-cache", "recursion", "call-stack"],
  greedy: ["sorted"],
  intervals: ["sorted", "tuples"],
  sorting: ["sorted", "lambdas", "higher-order-functions"],
  "merge-sort": ["sorted", "recursion"],
  "quick-sort": ["sorted", "recursion"],
  // Narrow on purpose: the bare `strings` tag also sits on the hello-world lesson.
  string: ["slicing", "string-methods", "f-strings"],
  "string-matching": ["regex", "re", "findall"],
  // Narrow on purpose: `arithmetic` also sits on the variables and functions lessons.
  "math-geometry": ["numbers", "floor-division", "modulo"],
  math: ["numbers", "floor-division", "modulo"],
} as const

/** The course the pattern aliases resolve against. See the module note on cross-course collisions. */
const PATTERN_ALIAS_COURSE: CourseId = "python"

/**
 * The System Design level that teaches how to *run* a design round: scoping, requirements,
 * estimation, dataflow, trade-off articulation. A company page links here only when that company
 * actually schedules a `system_design` round, so the link is earned by the company's own data.
 *
 * Anchored on a level slug rather than lesson ids on purpose: lessons are added to this level
 * weekly, slugs are structural and stable, and `findCatalogLevel` already validates the slug for the
 * public routes. If the slug ever moves, {@link listSystemDesignMethodLinks} returns nothing and the
 * section disappears rather than rendering an empty box; the test catches it the same day.
 */
const SYSTEM_DESIGN_METHOD_LEVEL_SLUG = "interview-method"

/** How many pattern-driven lessons one company page links. Enough to be useful, few enough to read. */
const PATTERN_LESSON_LIMIT = 6

/** At most this many lessons per pattern, so one broad pattern cannot fill the whole section. */
const LESSONS_PER_PATTERN = 2

/** How many System Design method lessons a company with a design round links. */
const SYSTEM_DESIGN_LESSON_LIMIT = 3

/** One public lesson link, projected to exactly what the interview-prep pages render. */
export interface CompanyLearnLink {
  courseId: CourseId
  /** Human course name, e.g. "Python". From `LEARN_COURSE_LABEL`. */
  courseLabel: string
  levelTitle: string
  lessonId: string
  title: string
  summary: string
  estimatedMinutes: number
  /** Canonical public reading URL. Never a workspace URL. */
  href: string
  /** Why this lesson is here, in the visitor's vocabulary. e.g. "Arrays & Hashing". */
  because: string
}

/** The two honest bridges from one company to the corpus. Either list may be empty. */
export interface CompanyLearnPaths {
  /** Python mechanics under the company's highest-priority DSA patterns. */
  patternLinks: CompanyLearnLink[]
  /** System Design method lessons, present only when the company runs a design round. */
  systemDesignLinks: CompanyLearnLink[]
}

/** One course row for the "what you can read right now" section on the hub. */
export interface LearnCourseSummary {
  courseId: CourseId
  label: string
  href: string
  lessonCount: number
  levelCount: number
}

/** Live totals for the whole free curriculum, derived at build time. */
export interface LearnCorpusSummary {
  lessonCount: number
  courses: LearnCourseSummary[]
}

/**
 * Normalise a skill tag for comparison.
 *
 * The corpus genuinely contains both `error handling` and `error-handling`, and both `code review`
 * and `code-review`, because three courses were authored by different passes. Comparing raw strings
 * would make an alias silently miss half its lessons, so both sides are lowercased and their
 * separators collapsed. Nothing else is stripped: `dicts` and `dictionaries` stay distinct words and
 * the alias table lists whichever one the corpus actually uses.
 */
function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[\s_-]+/g, "-")
}

/** Project a catalog entry onto a link, tagged with the reason it was selected. */
function toLearnLink(entry: CatalogEntry, because: string): CompanyLearnLink {
  return {
    courseId: entry.courseId,
    courseLabel: LEARN_COURSE_LABEL[entry.courseId],
    levelTitle: entry.level.title,
    lessonId: entry.lesson.id,
    title: entry.lesson.title,
    summary: entry.lesson.summary,
    estimatedMinutes: entry.lesson.estimatedMinutes,
    href: publicLessonPath(entry.courseId, entry.level.slug, entry.lesson.id),
    because,
  }
}

/**
 * Every live lesson of the alias course whose `skills[]` intersects `tags`, in curriculum order.
 *
 * Curriculum order matters: it puts the earliest, most foundational lesson first, which is the one a
 * visitor who is browsing a company guide is most likely to be able to start.
 */
export function findLessonsBySkillTags(tags: readonly string[]): CatalogEntry[] {
  const wanted = new Set(tags.map(normalizeSkill))
  return listCourseEntries(PATTERN_ALIAS_COURSE).filter((entry) =>
    entry.lesson.skills.some((skill) => wanted.has(normalizeSkill(skill)))
  )
}

/**
 * Lessons for one company's patterns, highest-priority pattern first.
 *
 * `priority` (1-10, "importance for passing interviews") is the authored ranking signal and
 * `frequency` breaks its ties, so the ordering is the company data's own opinion rather than ours.
 * Lessons are deduplicated across patterns and capped per pattern, so a broad pattern like
 * arrays-hashing cannot crowd out the rest of the company's loop.
 */
export function listPatternLearnLinks(company: CompanyQuestionData): CompanyLearnLink[] {
  const ranked = [...company.topPatterns].sort(
    (a, b) => b.priority - a.priority || b.frequency - a.frequency
  )

  const links: CompanyLearnLink[] = []
  const seenLessonIds = new Set<string>()

  for (const { pattern } of ranked) {
    if (links.length >= PATTERN_LESSON_LIMIT) break

    const tags = PATTERN_LEARN_ALIASES[pattern]
    if (!tags) continue

    const label = PATTERN_METADATA[pattern]?.name ?? pattern.replace(/-/g, " ")
    let takenForPattern = 0

    for (const entry of findLessonsBySkillTags(tags)) {
      if (takenForPattern >= LESSONS_PER_PATTERN) break
      if (links.length >= PATTERN_LESSON_LIMIT) break
      if (seenLessonIds.has(entry.lesson.id)) continue

      seenLessonIds.add(entry.lesson.id)
      links.push(toLearnLink(entry, label))
      takenForPattern += 1
    }
  }

  return links
}

/**
 * The opening lessons of the System Design interview-method level.
 *
 * Returns an empty array if the level slug no longer resolves, so the caller renders nothing rather
 * than an empty heading.
 */
export function listSystemDesignMethodLinks(): CompanyLearnLink[] {
  const level = listCourseLevels("system-design").find(
    (candidate) => candidate.slug === SYSTEM_DESIGN_METHOD_LEVEL_SLUG
  )
  if (!level) return []

  return level.modules
    .flatMap((mod) => mod.lessons)
    .slice(0, SYSTEM_DESIGN_LESSON_LIMIT)
    .map((lesson) =>
      toLearnLink({ courseId: "system-design", level, lesson }, "System design round")
    )
}

/** True when the company's authored process schedules a dedicated system design round. */
export function hasSystemDesignRound(company: CompanyQuestionData): boolean {
  return company.interviewProcess.rounds.some((round) => round.type === "system_design")
}

/**
 * Both bridges for one company. Either list can be empty, and the callers are expected to render
 * nothing at all in that case rather than an empty container.
 */
export function listCompanyLearnPaths(company: CompanyQuestionData): CompanyLearnPaths {
  return {
    patternLinks: listPatternLearnLinks(company),
    systemDesignLinks: hasSystemDesignRound(company) ? listSystemDesignMethodLinks() : [],
  }
}

/**
 * Live totals for the free curriculum.
 *
 * Lives here rather than in `course-catalog` because it is a presentation summary for the marketing
 * surfaces, not part of the catalog contract. Every number is counted from the registries at build
 * time, which is the whole point: the corpus grows weekly and a hand-written "350+ lessons" would be
 * stale within days and wrong forever after.
 */
export function summarizeLearnCorpus(): LearnCorpusSummary {
  const courses = COURSE_IDS.map<LearnCourseSummary>((courseId) => {
    const levels = listCourseLevels(courseId)
    return {
      courseId,
      label: LEARN_COURSE_LABEL[courseId],
      href: trackPath(courseId),
      levelCount: levels.length,
      lessonCount: levels.reduce(
        (total, level) =>
          total + level.modules.reduce((count, mod) => count + mod.lessons.length, 0),
        0
      ),
    }
  })

  return {
    lessonCount: courses.reduce((total, course) => total + course.lessonCount, 0),
    courses,
  }
}
