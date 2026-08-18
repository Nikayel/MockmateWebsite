/**
 * DSA statement-originality sweep (2026-08-18): the verifier.
 *
 * Diffs the live corpus against baseline.json and enforces, per scenario:
 *
 * REWRITTEN (the point of the sweep)
 *  - problemStatement differs from baseline, and word-set Jaccard similarity
 *    is <= 0.60 (0.45-0.60 is a WARN band for human eyeballing)
 *  - statement does not open with "Given " or "You are given" (house voice
 *    opens in contracted second person) and carries no LeetCode fingerprint
 *  - example values changed: numeric multiset differs where numbers exist,
 *    full input text differs otherwise
 *
 * PRESERVED (the safety net)
 *  - id, title, pattern, difficulty unchanged (canonical titles stay)
 *  - testCases / hints / starterCode / interviewer fields hash-identical
 *  - constraint BOUNDS unchanged: the numeric-token multiset of the
 *    constraints must match baseline even though the prose changes
 *  - a statement that had a fenced diagram still has one
 *  - no em dashes anywhere learner-facing
 *
 * Run from the repo root, all scenarios or one pattern:
 *   npx tsx scripts/dsa-originality/verify.ts
 *   npx tsx scripts/dsa-originality/verify.ts --pattern graphs
 *
 * Exits 1 on any FAIL. Pre-sweep this MUST fail loudly (fingerprints +
 * unchanged statements); that failure is the proof it can catch a bad edit.
 */

import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { scenarios } from "../../lib/scenarios"
import type { DSAScenario } from "../../lib/scenarios/types"
import type { BaselineEntry } from "./baseline"

function sha1(value: unknown): string {
  return createHash("sha1")
    .update(JSON.stringify(value ?? null))
    .digest("hex")
}

const LC_FINGERPRINTS = [
  "you may assume that each input would have exactly one solution",
  "you may not use the same element twice",
  "you can return the answer in any order",
  "return the answer in any order",
  "it is guaranteed that",
  "such that they add up to",
  "given an array of integers nums",
  "you must write an algorithm",
  "determine if the linked list has a cycle in it",
  "without changing the order of the other elements",
  "you may assume that the input",
  "you may assume all",
]

const BANNED_OPENERS = [/^given /i, /^you are given/i]

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0)
  )
}

function jaccard(a: string, b: string): number {
  const wa = words(a)
  const wb = words(b)
  if (wa.size === 0 && wb.size === 0) return 1
  let inter = 0
  for (const w of wa) if (wb.has(w)) inter++
  return inter / (wa.size + wb.size - inter)
}

function numericTokens(text: string): string[] {
  return (text.match(/\d+(?:\^\d+)?(?:\.\d+)?/g) ?? []).sort()
}

const patternFilter = (() => {
  const i = process.argv.indexOf("--pattern")
  return i >= 0 ? process.argv[i + 1] : null
})()

// --ids a,b,c : verify only these scenario ids (agents splitting one pattern
// check their own half without tripping on the sibling's unfinished files).
const idsFilter = (() => {
  const i = process.argv.indexOf("--ids")
  return i >= 0 ? new Set(process.argv[i + 1].split(",").map((s) => s.trim())) : null
})()

const baselinePath = join(__dirname, "baseline.json")
const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as { entries: BaselineEntry[] }
const baseById = new Map(baseline.entries.map((e) => [e.id, e]))

const live = (scenarios as Array<{ type: string }>).filter(
  (s): s is DSAScenario => s.type === "dsa"
)
const liveById = new Map(live.map((s) => [s.id, s]))

let fails = 0
let warns = 0
let passes = 0
const lines: string[] = []

function fail(id: string, msg: string) {
  fails++
  lines.push(`FAIL ${id}: ${msg}`)
}
function warn(id: string, msg: string) {
  warns++
  lines.push(`warn ${id}: ${msg}`)
}

for (const base of baseline.entries) {
  if (patternFilter && base.pattern !== patternFilter) continue
  if (idsFilter && !idsFilter.has(base.id)) continue

  const s = liveById.get(base.id)
  if (!s) {
    fail(base.id, "scenario MISSING from live registry (ids are frozen)")
    continue
  }

  let ok = true
  const check = (cond: boolean, msg: string) => {
    if (!cond) {
      fail(base.id, msg)
      ok = false
    }
  }

  // ---- identity preserved ----
  check(s.title === base.title, `title changed: "${base.title}" -> "${s.title}"`)
  check(s.pattern === base.pattern, "pattern changed")
  check(s.difficulty === base.difficulty, "difficulty changed")

  // ---- frozen surfaces preserved ----
  const frozenNow: Record<string, string> = {
    testCases: sha1(s.testCases),
    hints: sha1(s.hints),
    starterCode: sha1(s.starterCode),
    clarifyingQuestions: sha1((s as Record<string, unknown>).clarifyingQuestions),
    commonWrongApproaches: sha1((s as Record<string, unknown>).commonWrongApproaches),
    whatIfQuestions: sha1((s as Record<string, unknown>).whatIfQuestions),
    midCodingProbes: sha1((s as Record<string, unknown>).midCodingProbes),
    optimizationPush: sha1((s as Record<string, unknown>).optimizationPush),
    optimalComplexity: sha1(s.optimalComplexity),
    companies: sha1(s.companies),
    tags: sha1(s.tags),
  }
  for (const [field, hash] of Object.entries(frozenNow)) {
    check(
      hash === base.frozen[field as keyof BaselineEntry["frozen"]],
      `frozen field TOUCHED: ${field}`
    )
  }

  // ---- statement rewritten ----
  const stmt = s.problemStatement
  check(stmt.trim().length > 0, "statement is empty")
  check(stmt !== base.problemStatement, "statement UNCHANGED")
  const sim = jaccard(stmt, base.problemStatement)
  if (sim > 0.6) {
    check(false, `statement too close to baseline (jaccard ${sim.toFixed(2)})`)
  } else if (sim > 0.45) {
    warn(base.id, `statement similarity ${sim.toFixed(2)} - eyeball this one`)
  }
  for (const opener of BANNED_OPENERS) {
    check(!opener.test(stmt.trim()), `statement opens like LeetCode (${opener})`)
  }
  const learnerFacing = [
    stmt,
    s.description,
    ...s.constraints,
    ...s.examples.flatMap((e) => [e.input, e.output, e.explanation ?? ""]),
  ].join("\n")
  const lcHit = LC_FINGERPRINTS.find((p) => learnerFacing.toLowerCase().includes(p))
  check(!lcHit, `LeetCode fingerprint present: "${lcHit}"`)
  check(!learnerFacing.includes("—"), "em dash in learner-facing text")
  if (base.problemStatement.includes("```")) {
    check(stmt.includes("```"), "baseline had a fenced diagram; rewrite lost the fence")
  }

  // ---- examples refreshed ----
  check(s.examples.length > 0, "examples emptied")
  const baseNums = base.examples.flatMap((e) => numericTokens(`${e.input} ${e.output}`))
  const liveNums = s.examples.flatMap((e) => numericTokens(`${e.input} ${e.output}`))
  const baseText = base.examples.map((e) => `${e.input}|${e.output}`).join(";")
  const liveText = s.examples.map((e) => `${e.input}|${e.output}`).join(";")
  if (baseNums.length > 0) {
    check(
      JSON.stringify(baseNums) !== JSON.stringify(liveNums),
      "example VALUES unchanged (numeric multiset identical to baseline)"
    )
  } else {
    check(baseText !== liveText, "example text unchanged")
  }

  // ---- constraints: prose fresh, bounds intact ----
  check(s.constraints.length > 0, "constraints emptied")
  const baseBounds = base.constraints.flatMap(numericTokens).sort()
  const liveBounds = s.constraints.flatMap(numericTokens).sort()
  check(
    JSON.stringify(baseBounds) === JSON.stringify(liveBounds),
    `constraint BOUNDS drifted: [${baseBounds}] -> [${liveBounds}]`
  )
  if (s.constraints.join("|") === base.constraints.join("|")) {
    warn(base.id, "constraints prose unchanged (bounds fine, wording still LeetCode's)")
  }

  if (ok) passes++
}

// Scenarios added since baseline (should not happen mid-sweep)
if (!idsFilter) {
  for (const s of live) {
    if (!baseById.has(s.id) && (!patternFilter || s.pattern === patternFilter)) {
      warn(s.id, "scenario not in baseline (added after snapshot?)")
    }
  }
}

console.log(lines.join("\n"))
console.log(
  `\n${patternFilter ? `[pattern=${patternFilter}] ` : ""}pass=${passes} warn=${warns} fail=${fails}`
)
process.exit(fails > 0 ? 1 : 0)
