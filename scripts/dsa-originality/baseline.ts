/**
 * DSA statement-originality sweep (2026-08-18): baseline extractor.
 *
 * Snapshots every DSA scenario's rewriteable surfaces (problemStatement,
 * examples, constraints, description, fuzzyStatement) as full text, and every
 * MUST-NOT-CHANGE surface (testCases, hints, starterCode, interviewer fields,
 * identity fields) as a hash. verify.ts diffs the live corpus against this
 * file, so a rewrite agent cannot silently touch grading or identity.
 *
 * Run once BEFORE the sweep, from the repo root:
 *   npx tsx scripts/dsa-originality/baseline.ts
 */

import { createHash } from "node:crypto"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { scenarios } from "../../lib/scenarios"
import type { DSAScenario } from "../../lib/scenarios/types"

function sha1(value: unknown): string {
  return createHash("sha1")
    .update(JSON.stringify(value ?? null))
    .digest("hex")
}

export interface BaselineEntry {
  id: string
  title: string
  pattern: string
  difficulty: string
  problemStatement: string
  description: string
  fuzzyStatement: string | null
  examples: Array<{ input: string; output: string; explanation?: string }>
  constraints: string[]
  /** Hashes of surfaces the sweep must not touch. */
  frozen: {
    testCases: string
    hints: string
    starterCode: string
    clarifyingQuestions: string
    commonWrongApproaches: string
    whatIfQuestions: string
    midCodingProbes: string
    optimizationPush: string
    optimalComplexity: string
    companies: string
    tags: string
  }
}

const dsa = (scenarios as Array<{ type: string }>).filter((s): s is DSAScenario => s.type === "dsa")

const entries: BaselineEntry[] = dsa.map((s) => ({
  id: s.id,
  title: s.title,
  pattern: s.pattern,
  difficulty: s.difficulty,
  problemStatement: s.problemStatement,
  description: s.description,
  fuzzyStatement: (s as { fuzzyStatement?: string }).fuzzyStatement ?? null,
  examples: s.examples.map((e) => ({ ...e })),
  constraints: [...s.constraints],
  frozen: {
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
  },
}))

const outPath = join(__dirname, "baseline.json")
writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 1))
console.log(`Baseline written: ${entries.length} DSA scenarios -> ${outPath}`)
