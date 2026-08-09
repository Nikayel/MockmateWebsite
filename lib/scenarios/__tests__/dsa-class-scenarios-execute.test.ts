import { describe, expect, it } from "vitest"

import { scenarios } from "@/lib/scenarios"
import { buildJsWrapper } from "@/lib/workspace-execution/js-sandbox/dsa-wrapper"
import { validateResultEnhanced } from "@/lib/validators/runner"

/**
 * Runs a real, correct solution through the real wrapper for each class-shaped DSA scenario.
 *
 * The sibling test (dsa-class-scenarios-solvable.test.ts) checks data invariants and would
 * have caught these bugs, but it can only prove that the wrapper RECOGNISES a scenario. This
 * one proves a correct answer actually scores full marks, which is the thing that was untrue:
 * every scenario below returned 0/N for a correct solution, with nothing broken on the
 * platform, because the wrapper could not see it as class-based and fell through to a
 * free-function lookup that found nothing in a class-only starter.
 *
 * Each case carries a negative control, so the test cannot pass by comparing nothing.
 */

function runScenario(scenarioId: string, solution: string) {
  const scenario = scenarios.find((entry) => entry.id === scenarioId)
  if (!scenario) throw new Error(`scenario ${scenarioId} not found`)

  return (scenario.testCases ?? []).map((testCase) => {
    const wrapper = buildJsWrapper(solution, testCase, solution, scenarioId)
    // The wrapper is a function body, exactly as the worker evaluates it.

    const actual = new Function(wrapper)()
    return { description: testCase.description, actual, expected: testCase.expected }
  })
}

function expectSolves(scenarioId: string, solution: string) {
  const results = runScenario(scenarioId, solution)
  expect(results.length, `${scenarioId} has no test cases`).toBeGreaterThan(0)
  for (const result of results) {
    expect(result.actual, `${scenarioId} / ${result.description}`).toEqual(result.expected)
  }
}

/** A correct solution must pass; a broken one must not. Otherwise this proves nothing. */
function expectRejects(scenarioId: string, brokenSolution: string) {
  const results = runScenario(scenarioId, brokenSolution)
  const anyWrong = results.some(
    (result) => JSON.stringify(result.actual) !== JSON.stringify(result.expected)
  )
  expect(anyWrong, `${scenarioId} accepted a deliberately broken solution`).toBe(true)
}

describe("class-shaped DSA scenarios accept a correct solution", () => {
  it("dsa-implement-trie", () => {
    // Test inputs name their arguments `args` rather than `values`.
    const solution = `class Trie {
      constructor() { this.root = {} }
      insert(word) { let node = this.root; for (const c of word) { node[c] = node[c] || {}; node = node[c] } node.$ = true }
      search(word) { let node = this.root; for (const c of word) { if (!node[c]) return false; node = node[c] } return !!node.$ }
      startsWith(prefix) { let node = this.root; for (const c of prefix) { if (!node[c]) return false; node = node[c] } return true }
    }`
    expectSolves("dsa-implement-trie", solution)
    expectRejects(
      "dsa-implement-trie",
      `class Trie {
      constructor() {}
      insert() {}
      search() { return false }
      startsWith() { return false }
    }`
    )
  })

  it("dsa-bst-iterator", () => {
    // The constructor consumes a tree under its own key; the wrapper builds it.
    const solution = `class BSTIterator {
      constructor(root) { this.stack = []; this._descend(root) }
      _descend(node) { while (node) { this.stack.push(node); node = node.left } }
      next() { const node = this.stack.pop(); this._descend(node.right); return node.val }
      hasNext() { return this.stack.length > 0 }
    }`
    expectSolves("dsa-bst-iterator", solution)
    expectRejects(
      "dsa-bst-iterator",
      `class BSTIterator {
      constructor() {}
      next() { return -1 }
      hasNext() { return false }
    }`
    )
  })

  it("dsa-serialize-deserialize-tree", () => {
    // Round-trip: the wrapper asserts deserialize(serialize(tree)) reproduces the tree.
    const solution = `class Codec {
      serialize(root) {
        const out = []
        const walk = (node) => { if (!node) { out.push("#"); return } out.push(String(node.val)); walk(node.left); walk(node.right) }
        walk(root)
        return out.join(",")
      }
      deserialize(data) {
        const tokens = data.split(",")
        let i = 0
        const build = () => {
          const value = tokens[i++]
          if (value === "#") return null
          const node = new TreeNode(Number(value))
          node.left = build(); node.right = build()
          return node
        }
        return build()
      }
    }`
    expectSolves("dsa-serialize-deserialize-tree", solution)
    expectRejects(
      "dsa-serialize-deserialize-tree",
      `class Codec {
      serialize() { return "" }
      deserialize() { return null }
    }`
    )
  })

  it("dsa-find-median-data-stream", () => {
    // Its `values` were bare scalars, which the constructor spread and threw on.
    const solution = `class MedianFinder {
      constructor() { this.values = [] }
      addNum(num) { this.values.push(num); this.values.sort((a, b) => a - b) }
      findMedian() {
        const mid = this.values.length >> 1
        return this.values.length % 2 ? this.values[mid] : (this.values[mid - 1] + this.values[mid]) / 2
      }
    }`
    expectSolves("dsa-find-median-data-stream", solution)
    expectRejects(
      "dsa-find-median-data-stream",
      `class MedianFinder {
      constructor() {}
      addNum() {}
      findMedian() { return 0 }
    }`
    )
  })

  it("dsa-add-search-word", () => {
    const solution = `class WordDictionary {
      constructor() { this.root = {} }
      addWord(word) { let node = this.root; for (const c of word) { node[c] = node[c] || {}; node = node[c] } node.$ = true }
      search(word) {
        const walk = (node, i) => {
          if (i === word.length) return !!node.$
          const c = word[i]
          if (c === ".") {
            return Object.keys(node).some((k) => k !== "$" && walk(node[k], i + 1))
          }
          return node[c] ? walk(node[c], i + 1) : false
        }
        return walk(this.root, 0)
      }
    }`
    expectSolves("dsa-add-search-word", solution)
    expectRejects(
      "dsa-add-search-word",
      `class WordDictionary {
      constructor() {}
      addWord() {}
      search() { return false }
    }`
    )
  })

  describe("scenarios that used to grade inverted", () => {
    // These two awarded full marks for a non-answer and zero for a correct one, so they wrote
    // actively wrong mastery signal rather than merely failing loudly. Both halves matter:
    // the real solution must pass AND the cheat must fail.
    it("dsa-first-bad-version rewards the binary search, not the smuggled answer", () => {
      expectSolves(
        "dsa-first-bad-version",
        `function firstBadVersion(n) {
          let low = 1, high = n
          while (low < high) {
            const mid = Math.floor((low + high) / 2)
            if (isBadVersion(mid)) high = mid; else low = mid + 1
          }
          return low
        }`
      )
      // `bad` used to arrive as an undocumented second positional argument.
      expectRejects("dsa-first-bad-version", `function firstBadVersion(n, bad) { return bad }`)
    })

    it("dsa-convert-sorted-array-bst rewards a real tree, not the literal string", () => {
      const results = runScenario(
        "dsa-convert-sorted-array-bst",
        `function sortedArrayToBST(nums) {
          const build = (lo, hi) => {
            if (lo > hi) return null
            const mid = (lo + hi) >> 1
            const node = new TreeNode(nums[mid])
            node.left = build(lo, mid - 1)
            node.right = build(mid + 1, hi)
            return node
          }
          return build(0, nums.length - 1)
        }`
      )

      for (const result of results) {
        const verdict = validateResultEnhanced(
          result.actual,
          {
            input: (scenarios.find((s) => s.id === "dsa-convert-sorted-array-bst")!.testCases ??
              [])[results.indexOf(result)].input,
            expected: result.expected,
            description: result.description ?? "",
          },
          "dsa-convert-sorted-array-bst",
          "javascript"
        )
        expect(verdict.passed, `correct BST rejected: ${result.description}`).toBe(true)
      }

      // The old expectation was the literal string "valid BST", so returning it scored 2/2.
      const cheat = runScenario(
        "dsa-convert-sorted-array-bst",
        `function sortedArrayToBST() { return "valid BST" }`
      )
      const cheatVerdict = validateResultEnhanced(
        cheat[0].actual,
        {
          input: (scenarios.find((s) => s.id === "dsa-convert-sorted-array-bst")!.testCases ??
            [])[0].input,
          expected: cheat[0].expected,
          description: "cheat",
        },
        "dsa-convert-sorted-array-bst",
        "javascript"
      )
      expect(cheatVerdict.passed, 'returning the literal "valid BST" still scores').toBe(false)
    })
  })

  it("dsa-time-based-key-value-store", () => {
    const solution = `class TimeMap {
      constructor() { this.store = new Map() }
      set(key, value, timestamp) {
        if (!this.store.has(key)) this.store.set(key, [])
        this.store.get(key).push([timestamp, value])
      }
      get(key, timestamp) {
        const entries = this.store.get(key) || []
        let low = 0, high = entries.length - 1, best = ""
        while (low <= high) {
          const mid = (low + high) >> 1
          if (entries[mid][0] <= timestamp) { best = entries[mid][1]; low = mid + 1 } else { high = mid - 1 }
        }
        return best
      }
    }`
    expectSolves("dsa-time-based-key-value-store", solution)
    expectRejects(
      "dsa-time-based-key-value-store",
      `class TimeMap {
      constructor() {}
      set() {}
      get() { return "" }
    }`
    )
  })
})
