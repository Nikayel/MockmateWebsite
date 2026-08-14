/**
 * Measure the answer-SHAPE tells in the System Design retrieval checks.
 *
 * `check-answer-shape.test.ts` is the gate; this is the instrument the gate is read from,
 * so an author rewriting a level can see where they stand without decoding an assertion
 * message. Two tells are measured:
 *
 *  - **Length.** Is the option marked `correct` also the longest label? At 80 percent
 *    corpus-wide a learner can click the longest option and score 80 percent without
 *    reading the stem.
 *  - **Echo.** Does the correct option share a long run of words with the paragraph
 *    immediately above the check? That is a filler check: it asks the learner to recall a
 *    phrase they read two lines earlier, which trains skimming rather than retrieval.
 *
 * Usage:
 *   npx tsx scripts/audit-check-shape.ts            # every level, summary table
 *   npx tsx scripts/audit-check-shape.ts 7          # one level, every offending check
 *   npx tsx scripts/audit-check-shape.ts 7 --echo   # one level, echo offenders only
 */
import { SYSTEM_DESIGN_LEVELS } from "@/lib/tutorials/system-design/curriculum"
import { extractCsWidgetSources } from "@/lib/tutorials/diagrams/extract"
import { parseWidgetSpec } from "@/lib/tutorials/widgets/schema"

/** Runs of this many identical consecutive words are a lift, not a coincidence. */
const ECHO_RUN = 8

interface CheckRow {
  levelId: number
  lessonId: string
  prompt: string
  correctIsLongest: boolean
  correctLabel: number
  longestLabel: number
  /** Longest shared word run between the correct option and the preceding paragraph. */
  echoRun: number
  echoText: string
}

/** The prose paragraph immediately before a fence, with markdown noise flattened out. */
function precedingParagraph(markdown: string, fenceStart: number): string {
  const before = markdown.slice(0, fenceStart)
  const paragraphs = before
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith("```") && !p.startsWith("#"))
  return paragraphs[paragraphs.length - 1] ?? ""
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

/** Longest run of consecutive words shared by two strings, and the run itself. */
function longestSharedRun(a: string, b: string): { length: number; text: string } {
  const wa = words(a)
  const wb = words(b)
  if (wa.length === 0 || wb.length === 0) return { length: 0, text: "" }
  // Standard LCSubstring over word arrays. Corpus-sized inputs, so the quadratic table is
  // fine and clearer than anything cleverer.
  let best = 0
  let bestEnd = 0
  let previous = new Array<number>(wb.length + 1).fill(0)
  for (let i = 1; i <= wa.length; i++) {
    const current = new Array<number>(wb.length + 1).fill(0)
    for (let j = 1; j <= wb.length; j++) {
      if (wa[i - 1] === wb[j - 1]) {
        current[j] = previous[j - 1] + 1
        if (current[j] > best) {
          best = current[j]
          bestEnd = i
        }
      }
    }
    previous = current
  }
  return { length: best, text: wa.slice(bestEnd - best, bestEnd).join(" ") }
}

function collect(): CheckRow[] {
  const rows: CheckRow[] = []
  for (const level of SYSTEM_DESIGN_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        const markdown = lesson.teach.markdown
        for (const source of extractCsWidgetSources(markdown)) {
          const parsed = parseWidgetSpec(source)
          if (!parsed.ok) continue
          const spec = parsed.spec
          if (spec.type !== "check" || spec.kind !== "predict" || !spec.options) continue
          const correct = spec.options.find((o) => o.correct === true)
          if (!correct) continue

          const lengths = spec.options.map((o) => o.label.length)
          const longest = Math.max(...lengths)
          const paragraph = precedingParagraph(markdown, markdown.indexOf(source))
          const echo = longestSharedRun(correct.label, paragraph)

          rows.push({
            levelId: level.id as number,
            lessonId: lesson.id,
            prompt: spec.prompt.slice(0, 70),
            correctIsLongest: correct.label.length === longest,
            correctLabel: correct.label.length,
            longestLabel: longest,
            echoRun: echo.length,
            echoText: echo.text,
          })
        }
      }
    }
  }
  return rows
}

const ROWS = collect()
const levelArg = process.argv[2]
const echoOnly = process.argv.includes("--echo")

if (levelArg === undefined) {
  console.log("lvl  predicts  correct-is-longest  pct   target(40%)  echo>=8")
  for (let lv = 0; lv <= 11; lv++) {
    const rows = ROWS.filter((r) => r.levelId === lv)
    if (rows.length === 0) continue
    const longest = rows.filter((r) => r.correctIsLongest).length
    const echoes = rows.filter((r) => r.echoRun >= ECHO_RUN).length
    const target = Math.floor(rows.length * 0.4)
    console.log(
      `${String(lv).padEnd(4)} ${String(rows.length).padEnd(9)} ${String(longest).padEnd(19)} ` +
        `${String(Math.round((longest / rows.length) * 100)).padEnd(5)} ${String(target).padEnd(12)} ${echoes}`
    )
  }
  const longest = ROWS.filter((r) => r.correctIsLongest).length
  const echoes = ROWS.filter((r) => r.echoRun >= ECHO_RUN).length
  console.log(
    `\nCORPUS ${longest}/${ROWS.length} correct-is-longest ` +
      `(${Math.round((longest / ROWS.length) * 100)}%, target 40%); ${echoes} checks echo their own prose`
  )
} else {
  const lv = Number(levelArg)
  const rows = ROWS.filter((r) => r.levelId === lv)
  const longest = rows.filter((r) => r.correctIsLongest)
  const echoes = rows.filter((r) => r.echoRun >= ECHO_RUN)
  console.log(
    `Level ${lv}: ${rows.length} predicts, ${longest.length} correct-is-longest ` +
      `(target ${Math.floor(rows.length * 0.4)} or fewer), ${echoes.length} echoing their own prose\n`
  )
  if (!echoOnly) {
    console.log("--- correct option is the longest label ---")
    for (const r of longest) {
      console.log(`${r.lessonId}  correct=${r.correctLabel} longest=${r.longestLabel}`)
      console.log(`    ${r.prompt}`)
    }
  }
  console.log("\n--- correct option echoes the paragraph above it ---")
  for (const r of echoes) {
    console.log(`${r.lessonId}  run=${r.echoRun} words: "${r.echoText}"`)
    console.log(`    ${r.prompt}`)
  }
}
