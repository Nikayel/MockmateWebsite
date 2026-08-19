/**
 * House-voice guard for DSA problem statements (2026-08-18 originality sweep).
 *
 * The sweep rewrote all 221 DSA scenarios from near-verbatim LeetCode text into
 * original expression. This test is the rule-as-a-test that keeps it that way:
 * a NEW scenario pasted in from LeetCode fails the build instead of quietly
 * re-introducing copied text.
 *
 * What it enforces:
 *  - statements never open the way LeetCode's do ("Given ...", "You are given")
 *  - no LeetCode-distinctive boilerplate phrases anywhere learner-facing
 *  - no em dashes in learner-facing prose (house content rule)
 *  - no approach spoilers on the pre-solve surfaces: starter-code comments, an
 *    algorithm attribution appended to a title, or a technique tag occupying a
 *    card slot while a neutral tag sits unused (second describe block below)
 *
 * The full one-time sweep verifier (baseline diff, similarity ceiling, frozen
 * field hashes) lives in scripts/dsa-originality/verify.ts.
 */

import { describe, expect, it } from "vitest"
import { scenarios } from "@/lib/scenarios"
import type { DSAScenario } from "@/lib/scenarios/types"

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

const dsaScenarios = (scenarios as Array<{ type: string }>).filter(
  (s): s is DSAScenario => s.type === "dsa"
)

function learnerFacingText(s: DSAScenario): string {
  return [
    s.problemStatement,
    s.description,
    ...s.constraints,
    ...s.examples.flatMap((e) => [e.input, e.output, e.explanation ?? ""]),
  ].join("\n")
}

describe("DSA statements stay in the house voice", () => {
  it("covers the whole corpus", () => {
    expect(dsaScenarios.length).toBeGreaterThanOrEqual(221)
  })

  it.each(dsaScenarios.map((s) => [s.id, s] as const))(
    "%s carries no LeetCode fingerprints or banned openers",
    (_id, s) => {
      const stmt = s.problemStatement.trim()
      expect(stmt.length).toBeGreaterThan(0)

      for (const opener of BANNED_OPENERS) {
        expect(stmt, `statement opens like LeetCode (${opener})`).not.toMatch(opener)
      }

      const text = learnerFacingText(s).toLowerCase()
      for (const phrase of LC_FINGERPRINTS) {
        expect(text, `LeetCode fingerprint: "${phrase}"`).not.toContain(phrase)
      }

      expect(learnerFacingText(s), "em dash in learner-facing text").not.toContain("—")
    }
  )
})

/**
 * The spoiler rule covers every surface the candidate sees BEFORE choosing to look,
 * not just the statement. The 2026-08-19 adversarial audit found the approach handed
 * over on three of them while statements were clean:
 *
 *   starterCode comments   "Use stack, iterate right to left" sits in the editor buffer
 *   title                  "Maximum Subarray (Kadane's Algorithm)"
 *   tags[0..1]             rendered on the scenario card by ScenarioListRow
 *
 * Hints stay exempt: they are blurred, click-to-reveal, and are where the approach is
 * SUPPOSED to live.
 */
const TECHNIQUE_WORDS = [
  "bfs",
  "dfs",
  "breadth-first",
  "depth-first",
  "union-find",
  "union find",
  "topological",
  "dijkstra",
  "kadane",
  "backtrack",
  "memoi",
  "dynamic programming",
  "monotonic",
  "two pointer",
  "two-pointer",
  "sliding window",
  "binary search",
  "morris",
  "greedy",
  "xor",
  "slow and fast",
  "fast and slow",
  "dummy node",
  "priority queue",
  "min heap",
  "max heap",
  "prefix sum",
  "hash map",
  "hashmap",
  "flood fill",
  "divide and conquer",
]

/** Technique names that must not lead the tag list (the card shows the first two). */
const TECHNIQUE_TAGS = new Set([
  "bfs",
  "dfs",
  "breadth-first-search",
  "depth-first-search",
  "union-find",
  "topological-sort",
  "dijkstra",
  "kadane",
  "backtracking",
  "memoization",
  "dynamic-programming",
  "monotonic-stack",
  "two-pointers",
  "sliding-window",
  "binary-search",
  "morris-traversal",
  "greedy",
  "xor",
  "divide-and-conquer",
  "prefix-sum",
  "recursion",
  // Named methods that read as topics but are approaches: each of these sat in
  // "reserve" behind another technique tag and would have been promoted onto the card
  // as though it were neutral.
  "minimum-spanning-tree",
  "binary-exponentiation",
  "multi-source-bfs",
  "string-matching",
  "combinatorics",
  "inorder",
  "preorder",
  "postorder",
  "heap",
  "two-heaps",
  "priority-queue",
])

function starterComments(s: DSAScenario): string[] {
  const out: string[] = []
  for (const source of Object.values(s.starterCode ?? {})) {
    if (typeof source !== "string") continue
    for (const line of source.split(/\\n|\n/)) {
      const match = line.match(/(?:\/\/|#)\s*(.+)$/)
      if (match) out.push(match[1].trim())
    }
  }
  return out
}

describe("DSA pre-solve surfaces carry no approach spoilers", () => {
  it.each(dsaScenarios.map((s) => [s.id, s] as const))(
    "%s keeps its starter comments, title and card tags technique-free",
    (_id, s) => {
      for (const comment of starterComments(s)) {
        const lowered = comment.toLowerCase()
        for (const word of TECHNIQUE_WORDS) {
          expect(lowered, `starter comment names a technique: "${comment}"`).not.toContain(word)
        }
      }

      // Titles are canonical problem names, so "Binary Search Tree Iterator" and
      // "Binary Search" are fine: the words belong to the problem's identity. What is
      // not fine is an appended attribution, which is pure technique disclosure and is
      // how "Maximum Subarray (Kadane's Algorithm)" shipped.
      const parenthetical = s.title.match(/\(([^)]+)\)/)?.[1]?.toLowerCase()
      if (parenthetical) {
        for (const word of TECHNIQUE_WORDS) {
          expect(
            parenthetical,
            `title appends a technique attribution: "${s.title}"`
          ).not.toContain(word)
        }
      }

      // Only the first two tags reach the scenario card; the rest are filter metadata.
      //
      // The rule is "don't leak when you don't have to", not "never carry a technique
      // tag". Plenty of problems genuinely have one neutral descriptor and nothing else
      // ("array" + "binary-search"), and inventing a second neutral tag to satisfy a
      // test would corrupt the filter vocabulary to decorate a card. So a technique tag
      // in a card slot fails only when a neutral tag is sitting further down the array
      // unused, which is exactly the state the audit found: 24 of 27 graph scenarios led
      // with bfs/dfs/union-find while "graph" and "matrix" waited at position 3.
      const tags = s.tags ?? []
      const isTechnique = (tag: string) => TECHNIQUE_TAGS.has(tag.toLowerCase())
      const cardTags = tags.slice(0, 2)
      const neutralInReserve = tags.slice(2).filter((tag) => !isTechnique(tag))
      const techniqueOnCard = cardTags.filter(isTechnique)

      expect(
        Math.min(techniqueOnCard.length, neutralInReserve.length),
        `card shows technique tag(s) [${techniqueOnCard}] while neutral tag(s) [${neutralInReserve}] sit unused further down`
      ).toBe(0)
    }
  )
})
