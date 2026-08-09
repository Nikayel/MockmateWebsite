import { describe, expect, it } from "vitest"

import { scenarios } from "@/lib/scenarios"
import { resolveClassInvocationKeys } from "@/lib/workspace-execution/js-sandbox/dsa-wrapper"

/**
 * A class-based DSA scenario is only runnable if the JS wrapper RECOGNISES it as class-based.
 *
 * `buildJsWrapper` decides that from the test case's input keys: it requires both `operations`
 * and `values` (js-sandbox/dsa-wrapper.ts). A scenario whose starter defines a class but whose
 * inputs use any other key shape falls through to the free-function path, finds no free
 * function in a class-only starter, and returns nothing. A correct solution scores 0/N and the
 * candidate is told their code is wrong.
 *
 * This is the same failure mode as the missing `assert.deepEqual`: the harness cannot run the
 * problem, and the candidate is billed for it. It differs in one way that makes it worse -
 * nothing has to be broken for a user to hit it.
 *
 * Kept as a data-shape check rather than an execution test because DSA starters are stubs by
 * design, so "the starter fails" carries no signal. What carries signal is the wrapper being
 * structurally unable to reach a correct solution.
 */

/**
 * Asks the wrapper's OWN resolver rather than restating its condition, so this cannot pass
 * while the real detection disagrees.
 */
function wrapperSeesClassBased(input: Record<string, unknown>): boolean {
  return resolveClassInvocationKeys(input) !== null
}

/**
 * Does the starter define a class the candidate is expected to implement? Helper types that
 * ship alongside a free-function solution do not count.
 */
const HELPER_CLASS_NAMES = new Set([
  "Node",
  "ListNode",
  "TreeNode",
  "Solution",
  "GraphNode",
  "Point",
])

/**
 * Round-trip problems (class Codec with serialize/deserialize) are runnable without
 * class-invocation inputs: the wrapper detects the method pair and asserts that decoding an
 * encoding returns the original, so `{ root: [...] }` is the correct input shape for them.
 */
function starterIsRoundTrip(starterCode: string): boolean {
  return (
    (/\bserialize\s*\(/.test(starterCode) && /\bdeserialize\s*\(/.test(starterCode)) ||
    (/\bencode\s*\(/.test(starterCode) && /\bdecode\s*\(/.test(starterCode))
  )
}

function starterRequiresAClass(starterCode: string): boolean {
  const declared = [...starterCode.matchAll(/class\s+(\w+)/g)].map((m) => m[1])
  const candidateClasses = declared.filter((name) => !HELPER_CLASS_NAMES.has(name))
  if (candidateClasses.length === 0) return false
  // If there is also a top-level function stub, the class is probably a helper type.
  const hasFreeFunction =
    /^\s*(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:function|\())/m.test(starterCode)
  return !hasFreeFunction
}

const dsaScenarios = scenarios.filter(
  (scenario) => scenario.type === "dsa" && Array.isArray(scenario.testCases)
)

describe("class-based DSA scenarios can actually be run", () => {
  it("found DSA scenarios to check", () => {
    expect(dsaScenarios.length).toBeGreaterThan(0)
  })

  it("every scenario whose starter needs a class is recognised as class-based", () => {
    const unreachable: string[] = []

    for (const scenario of dsaScenarios) {
      const starter = scenario.starterCode?.javascript ?? scenario.starterCode?.typescript ?? ""
      if (!starter || !starterRequiresAClass(starter)) continue
      if (starterIsRoundTrip(starter)) continue

      const firstCase = scenario.testCases?.[0]
      const input = (firstCase?.input ?? {}) as Record<string, unknown>
      if (wrapperSeesClassBased(input)) continue

      unreachable.push(`${scenario.id} (input keys: ${Object.keys(input).join(", ") || "none"})`)
    }

    expect(
      unreachable,
      `These scenarios ship a class-only starter, but buildJsWrapper does not recognise their ` +
        `test inputs as class-based, so it looks for a free function that does not exist. A ` +
        `correct solution scores 0 and the candidate is told their code is wrong:\n  ` +
        unreachable.join("\n  ")
    ).toEqual([])
  })

  it("names the class as the first operation, so no real call is swallowed", () => {
    // The wrapper treats operations[0] as the constructor call (`i === 0`). A list that starts
    // with a real method therefore loses that call: dsa-implement-trie began with "insert",
    // so `new Trie("apple")` ran instead and the following search for "apple" could not
    // succeed however correct the candidate's code was.
    const swallowed: string[] = []

    for (const scenario of dsaScenarios) {
      const starter = scenario.starterCode?.javascript ?? scenario.starterCode?.typescript ?? ""
      const declaredClasses = new Set([...starter.matchAll(/class\s+(\w+)/g)].map((m) => m[1]))
      if (declaredClasses.size === 0) continue

      for (const testCase of scenario.testCases ?? []) {
        const input = (testCase.input ?? {}) as Record<string, unknown>
        const keys = resolveClassInvocationKeys(input)
        // The constructor-tree shape builds the instance up front, so every operation is a
        // real call and none is consumed.
        if (!keys || keys.constructorTreeKey) continue

        const first = (input[keys.operationsKey] as unknown[])[0]
        if (typeof first === "string" && declaredClasses.has(first)) continue

        swallowed.push(`${scenario.id}: operations[0] = ${JSON.stringify(first)}`)
        break
      }
    }

    expect(
      swallowed,
      `These scenarios do not name their class as operations[0], so the wrapper consumes their ` +
        `first real method call as the constructor and a correct solution cannot pass:\n  ` +
        swallowed.join("\n  ")
    ).toEqual([])
  })

  it("expects exactly one result per operation", () => {
    // The wrapper pushes one entry per operation, including null for the constructor. A
    // shorter `expected` can never match, so the scenario is unpassable; a longer one is a
    // sign the operation list was edited without its expectations.
    const mismatched: string[] = []

    for (const scenario of dsaScenarios) {
      for (const testCase of scenario.testCases ?? []) {
        const input = (testCase.input ?? {}) as Record<string, unknown>
        const keys = resolveClassInvocationKeys(input)
        if (!keys) continue

        const operations = input[keys.operationsKey] as unknown[]
        const expected = testCase.expected
        if (!Array.isArray(expected)) continue
        if (expected.length === operations.length) continue

        mismatched.push(
          `${scenario.id} "${testCase.description}": ${operations.length} operations, ` +
            `${expected.length} expected`
        )
      }
    }

    expect(
      mismatched,
      `Each operation produces exactly one result, so these cases can never match:\n  ` +
        mismatched.join("\n  ")
    ).toEqual([])
  })

  it("a class-based scenario's values are argument arrays, not bare scalars", () => {
    // `new ClassName(...args)` spreads each entry, so a scalar throws before the candidate's
    // code runs.
    const malformed: string[] = []

    for (const scenario of dsaScenarios) {
      for (const testCase of scenario.testCases ?? []) {
        const input = (testCase.input ?? {}) as Record<string, unknown>
        if (!wrapperSeesClassBased(input)) continue
        const values = input.values
        if (!Array.isArray(values)) continue
        if (values.every((entry) => Array.isArray(entry))) continue
        malformed.push(`${scenario.id}: values=${JSON.stringify(values).slice(0, 80)}`)
        break
      }
    }

    expect(
      malformed,
      `Class-based test inputs must give each operation an ARGUMENT ARRAY. A bare scalar is ` +
        `spread into the constructor and throws before any candidate code runs:\n  ` +
        malformed.join("\n  ")
    ).toEqual([])
  })
})
