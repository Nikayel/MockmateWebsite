/**
 * Inventory the plain code fences in the System Design curriculum and classify each one as a
 * conversion candidate, so the diagram sweep works from a list rather than from a grep.
 *
 * ## Why a script and not a written list
 *
 * The corpus is edited continuously by concurrent authoring loops, so any list of "the 42 ASCII
 * drawings" is stale within a day. It is also the number everyone disagrees about: the council
 * brief said 42, the diagram survey said 55 with a strict box-and-arrow classifier, and one survey
 * said 100. The count moves entirely with how loose the classifier is, which is a good reason to
 * publish the classifier rather than the count.
 *
 * ## What it will not tell you
 *
 * Whether a drawing SHOULD be converted. Two shapes are deliberately staying as fences, and no
 * heuristic reliably separates them from the rest:
 *
 *  - **Decision branches** ("if count > 100 -> 429 / else allow"). `topology` has no decision node,
 *    and three edge labels leaving one node overlap into illegibility at 9px.
 *  - **Nodes whose content is an ordered list** (message-queue partitions drawn as `P0 [m0 m1 m2]`).
 *    No diagram type expresses this cheaply; `table` is sometimes the answer.
 *
 * The `hints` column flags both, and it is a prompt to look, not a verdict.
 *
 * Usage:
 *   npx tsx scripts/audit-ascii-drawings.ts           # summary by level
 *   npx tsx scripts/audit-ascii-drawings.ts 10        # one level, every fence with its body
 *   npx tsx scripts/audit-ascii-drawings.ts 10 --list # one level, one line per fence
 */
import { SYSTEM_DESIGN_LEVELS } from "@/lib/tutorials/system-design/curriculum"
import { extractCsDiagramSources, extractCsWidgetSources } from "@/lib/tutorials/diagrams/extract"
import { parseDiagramSpec } from "@/lib/tutorials/diagrams/schema"
import { parseWidgetSpec } from "@/lib/tutorials/widgets/schema"
import { isHeavyDiagram, SIMULATION_WIDGET_FAMILIES } from "@/lib/tutorials/system-design/coverage"

type Verdict = "architecture" | "linear-chain" | "comparison" | "leave-as-fence" | "not-a-drawing"

interface Fence {
  levelId: number
  lessonId: string
  lang: string
  lines: number
  widest: number
  body: string
  verdict: Verdict
  hints: string[]
  /** True when the lesson already carries a sim or animated diagram, so a staged topology is barred. */
  atDensityCap: boolean
}

const CONNECTOR = /-->|<--|->|<-|─|│|┌|┐|└|┘|├|┤|┬|┴|┼|═|║|\+--|--\+/g
const BOXCHARS = /[[\]|+]/g

function classify(body: string): { verdict: Verdict; hints: string[] } {
  const lines = body.split("\n").filter((l) => l.trim().length > 0)
  const connectors = (body.match(CONNECTOR) || []).length
  const boxes = (body.match(BOXCHARS) || []).length
  const hints: string[] = []

  // A decision branch names both outcomes of a condition. Topology has no decision node.
  if (/\bif\b.*\b(else|otherwise)\b/is.test(body) || /\?\s*$/m.test(body)) {
    hints.push("decision branch: topology has no decision node, leave as a fence")
  }
  // A node whose content is an ordered list, e.g. `P0 [m0 m1 m2]`.
  if (/\[[^\]]*\s+[^\]]*\s+[^\]]*\]/.test(body)) {
    hints.push("a node's content may be a list: consider `table`, or leave as a fence")
  }
  // Arithmetic and unit conversion are not architecture.
  const arithmetic = (body.match(/[=*/]|\d+\s*[x×]\s*\d+|\^\d/g) || []).length
  if (arithmetic > connectors && arithmetic > 4) {
    return { verdict: "not-a-drawing", hints: [...hints, "mostly arithmetic, this is a formula"] }
  }
  // Two or more columns of aligned text with no connectors is a comparison table.
  const aligned = lines.filter((l) => /\S\s{3,}\S/.test(l)).length
  if (connectors < 2 && aligned >= Math.max(2, lines.length - 2)) {
    return { verdict: "comparison", hints: [...hints, "aligned columns: `table` renders this"] }
  }
  if (connectors === 0) {
    return { verdict: "not-a-drawing", hints }
  }
  // A single left-to-right run with no branching is a pipeline, which is static and cap-exempt.
  const branching = boxes > connectors * 2 || lines.length > 4
  if (!branching && lines.length <= 3) {
    return {
      verdict: "linear-chain",
      hints: [
        ...hints,
        "strictly linear: `pipeline` is static and cap-exempt, and needs a `title`",
      ],
    }
  }
  if (hints.some((h) => h.startsWith("decision branch"))) {
    return { verdict: "leave-as-fence", hints }
  }
  return { verdict: "architecture", hints }
}

function collect(): Fence[] {
  const fences: Fence[] = []
  for (const level of SYSTEM_DESIGN_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        const markdown = lesson.teach.markdown
        const custom = new Set([
          ...extractCsDiagramSources(markdown),
          ...extractCsWidgetSources(markdown),
        ])

        // Does the lesson already spend its one animated slot?
        let heavy = 0
        for (const source of extractCsWidgetSources(markdown)) {
          const parsed = parseWidgetSpec(source)
          if (parsed.ok && SIMULATION_WIDGET_FAMILIES.has(parsed.spec.type)) heavy += 1
        }
        for (const source of extractCsDiagramSources(markdown)) {
          const parsed = parseDiagramSpec(source)
          if (parsed.ok && isHeavyDiagram(parsed.spec)) heavy += 1
        }

        const re = /```([^\n]*)\n([\s\S]*?)```/g
        let match: RegExpExecArray | null
        while ((match = re.exec(markdown))) {
          const lang = match[1].trim()
          const body = match[2]
          if (lang === "csdiagram" || lang === "cswidget" || custom.has(body)) continue
          const { verdict, hints } = classify(body)
          const lines = body.split("\n")
          fences.push({
            levelId: level.id as number,
            lessonId: lesson.id,
            lang,
            lines: lines.length,
            widest: Math.max(...lines.map((l) => l.length)),
            body,
            verdict,
            hints,
            atDensityCap: heavy >= 1,
          })
        }
      }
    }
  }
  return fences
}

const FENCES = collect()
const levelArg = process.argv[2]
const listOnly = process.argv.includes("--list")

const CONVERTIBLE: Verdict[] = ["architecture", "linear-chain", "comparison"]

if (levelArg === undefined) {
  console.log("lvl  fences  architecture  linear  comparison  leave  not-a-drawing  atCap")
  for (let lv = 0; lv <= 11; lv++) {
    const rows = FENCES.filter((f) => f.levelId === lv)
    if (rows.length === 0) continue
    const by = (v: Verdict) => rows.filter((f) => f.verdict === v).length
    const atCap = rows.filter((f) => f.atDensityCap && CONVERTIBLE.includes(f.verdict)).length
    console.log(
      `${String(lv).padEnd(4)} ${String(rows.length).padEnd(7)} ${String(by("architecture")).padEnd(13)} ` +
        `${String(by("linear-chain")).padEnd(7)} ${String(by("comparison")).padEnd(11)} ` +
        `${String(by("leave-as-fence")).padEnd(6)} ${String(by("not-a-drawing")).padEnd(14)} ${atCap}`
    )
  }
  const convertible = FENCES.filter((f) => CONVERTIBLE.includes(f.verdict))
  const capped = convertible.filter((f) => f.atDensityCap)
  console.log(
    `\n${FENCES.length} plain fences; ${convertible.length} are conversion candidates ` +
      `(${FENCES.filter((f) => f.verdict === "architecture").length} architecture).`
  )
  console.log(
    `${capped.length} of those sit in a lesson already at the density cap, so they need ` +
      `reveal: "all" (static, cap-exempt) rather than a staged topology.`
  )
} else {
  const lv = Number(levelArg)
  const rows = FENCES.filter((f) => f.levelId === lv)
  console.log(`Level ${lv}: ${rows.length} plain fences\n`)
  for (const f of rows) {
    const cap = f.atDensityCap ? '  AT CAP -> needs reveal:"all"' : ""
    console.log(
      `[${f.verdict}] ${f.lessonId}  lines=${f.lines} widest=${f.widest}${cap}` +
        (f.lang ? `  lang="${f.lang}"` : "")
    )
    for (const hint of f.hints) console.log(`    hint: ${hint}`)
    if (!listOnly && CONVERTIBLE.includes(f.verdict)) {
      console.log(
        f.body
          .split("\n")
          .map((l) => `    | ${l}`)
          .join("\n")
      )
    }
    console.log("")
  }
}
