/**
 * Print the System Design corpus's teaching and interactivity coverage, per level and per lesson.
 *
 * Reporting only: it never exits non-zero, because the corpus currently has known gaps and a script
 * that always fails is a script nobody runs. The gaps that must not regress are enforced by tests.
 *
 *   pnpm audit:sd            per-level table plus the bare-lesson list
 *   pnpm audit:sd --lessons  every lesson, one row each
 */
import { buildSystemDesignCoverage, isBareLesson } from "@/lib/tutorials/system-design/coverage"

const coverage = buildSystemDesignCoverage()
const showLessons = process.argv.includes("--lessons")

console.log("System Design curriculum coverage\n")
console.log(
  [
    "lvl",
    "slug".padEnd(20),
    "lsn",
    "avgProse",
    "checks",
    "sims",
    "diagrams",
    "ascii",
    "noCheck",
    "noVisual",
  ].join("  ")
)

for (const level of coverage.levels) {
  console.log(
    [
      String(level.levelId).padEnd(3),
      level.slug.padEnd(20),
      String(level.lessonCount).padStart(3),
      String(level.averageProseWords).padStart(8),
      String(level.checks).padStart(6),
      String(level.heavy).padStart(4),
      String(level.staticDiagrams).padStart(8),
      String(level.plainFences).padStart(5),
      String(level.lessonsWithoutChecks).padStart(7),
      String(level.lessonsWithoutDiagramOrSim).padStart(8),
    ].join("  ")
  )
}

const t = coverage.totals
console.log(
  `\n${t.lessonCount} lessons across ${t.levelCount} levels, ${t.teachWords.toLocaleString()} teach words`
)
console.log(
  `${t.checks} retrieval checks, ${t.heavy} simulations or animated diagrams, ${t.staticDiagrams} static diagrams`
)
console.log(
  `${t.lessonsWithoutChecks} lessons have no retrieval check; ${t.lessonsWithoutDiagramOrSim} have no diagram or simulation`
)
console.log(`${t.bareLessons} lessons are bare: prose only, nothing to answer and nothing to see`)

if (showLessons) {
  console.log(
    "\nlessonId                                    words  summary  checks  sims  diagrams  ascii"
  )
  for (const lesson of coverage.lessons) {
    console.log(
      [
        lesson.lessonId.padEnd(42),
        String(lesson.teachWords).padStart(5),
        String(lesson.summaryChars).padStart(7),
        String(lesson.checks).padStart(6),
        String(lesson.heavy.length).padStart(4),
        String(lesson.staticDiagrams.length).padStart(8),
        String(lesson.plainFences).padStart(5),
      ].join("  ")
    )
  }
} else {
  const bare = coverage.lessons.filter(isBareLesson)
  console.log(`\nBare lessons (${bare.length}):`)
  for (const lesson of bare) {
    console.log(`  L${lesson.levelId} ${lesson.lessonId} (${lesson.teachWords} words)`)
  }
}
