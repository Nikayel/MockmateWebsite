/**
 * Property-based validation system for coding challenges
 *
 * Instead of hardcoded expected values, we define:
 * 1. Properties that a correct answer must satisfy
 * 2. Optional reference solutions that generate expected outputs
 * 3. Flexible output parsing/normalization
 */

/**
 * Reference solution for dynamic validation
 * Imported from ast-validator.ts - re-exported here for convenience
 */
export interface ReferenceSolution {
  code: {
    python: string
    javascript: string
    typescript?: string
  }
  functionName: string
  inputSpec?: {
    params: Array<{
      name: string
      type: "int" | "float" | "string" | "boolean" | "array" | "matrix" | "object"
      minLength?: number
      maxLength?: number
      min?: number
      max?: number
      elementType?: "int" | "float" | "string" | "boolean"
      elementMin?: number
      elementMax?: number
    }>
    constraints?: Array<{
      type: "sum-exists" | "sorted" | "unique" | "custom"
      params?: string[]
    }>
  }
  outputComparison?: "exact" | "set" | "any-valid" | "property-based"
}

export type ValidationMode =
  | "exact" // Must match exactly (default for simple cases)
  | "property" // Must satisfy defined properties
  | "reference" // Compare against reference solution output
  | "any-valid" // Any output satisfying constraints is valid

export type OutputNormalization =
  | "none" // No normalization
  | "sort-array" // Sort arrays before comparison
  | "sort-nested" // Sort arrays and nested arrays
  | "set" // Treat as set (order doesn't matter, no duplicates)
  | "multiset" // Order doesn't matter, duplicates allowed
  | "normalize-whitespace" // Trim and normalize whitespace

export interface ValidatorContext {
  input: Record<string, any>
  output: any
  expected?: any // Optional - not needed for property-based
  language: string
  scenarioId: string
}

/**
 * A validator function returns true if the output is correct
 * It receives the full context to make intelligent decisions
 */
export type ValidatorFn = (ctx: ValidatorContext) => boolean | Promise<boolean>

/**
 * Property definition - a named check that must pass
 */
export interface Property {
  name: string
  description: string
  check: ValidatorFn
}

/**
 * Validator configuration for a test case
 */
export interface ValidatorConfig {
  mode: ValidationMode

  // For 'exact' mode - traditional expected value
  expected?: any

  // For 'property' mode - list of properties that must hold
  properties?: Property[]

  // For 'reference' mode - reference solution code
  referenceSolution?: {
    [language: string]: string
  }

  // Output normalization before comparison
  normalize?: OutputNormalization[]

  // Numeric tolerance for floating point comparisons
  tolerance?: number

  // Allow multiple valid outputs
  multipleValidOutputs?: any[]

  // Custom validator function (escape hatch for complex cases)
  customValidator?: ValidatorFn
}

/**
 * Enhanced test case with validator support
 */
export interface ValidatedTestCase {
  input: Record<string, any>
  description: string

  // NEW: Validation config instead of just 'expected'
  validation: ValidatorConfig

  // DEPRECATED: Keep for backwards compatibility, but prefer validation.expected
  expected?: any

  // Hints for debugging when test fails
  debugHints?: string[]
}

/**
 * Common property builders for DSA problems
 */
export const PropertyBuilders = {
  /**
   * Two-sum style: output indices point to values that sum to target
   */
  twoSumValid: (numsKey = "nums", targetKey = "target"): Property => ({
    name: "valid-two-sum",
    description: "Output indices point to values that sum to target",
    check: (ctx) => {
      const { input, output } = ctx
      const nums = input[numsKey]
      const target = input[targetKey]

      if (!Array.isArray(output) || output.length !== 2) return false
      const [i, j] = output

      // Indices must be valid, different, and values must sum to target
      return (
        Number.isInteger(i) &&
        Number.isInteger(j) &&
        i >= 0 &&
        i < nums.length &&
        j >= 0 &&
        j < nums.length &&
        i !== j &&
        nums[i] + nums[j] === target
      )
    },
  }),

  /**
   * Array contains exactly the expected elements (order doesn't matter)
   */
  arrayAsSet: (expectedKey: string): Property => ({
    name: "array-as-set",
    description: "Output contains exactly the expected elements (any order)",
    check: (ctx) => {
      const { output, expected } = ctx
      if (!Array.isArray(output) || !Array.isArray(expected)) return false
      if (output.length !== expected.length) return false

      const sortedOutput = [...output].sort()
      const sortedExpected = [...expected].sort()
      return JSON.stringify(sortedOutput) === JSON.stringify(sortedExpected)
    },
  }),

  /**
   * Linked list cycle detection: output is boolean or node reference
   */
  hasCycle: (): Property => ({
    name: "cycle-detection",
    description: "Correctly identifies if cycle exists",
    check: (ctx) => {
      const { output, expected } = ctx
      // Accept boolean or truthy/falsy
      return Boolean(output) === Boolean(expected)
    },
  }),

  /**
   * Valid BST traversal
   */
  validBSTTraversal: (order: "inorder" | "preorder" | "postorder"): Property => ({
    name: `valid-${order}-traversal`,
    description: `Output is valid ${order} BST traversal`,
    check: (ctx) => {
      const { output, expected } = ctx
      if (!Array.isArray(output)) return false
      // For traversals, exact match is usually required
      return JSON.stringify(output) === JSON.stringify(expected)
    },
  }),

  /**
   * The output is a height-balanced BST holding exactly the input array's values.
   *
   * Written for dsa-convert-sorted-array-bst, whose test cases used `expected: "valid BST"`
   * as a literal string. A correct solution returns a tree, which the wrapper serialises to
   * an array, so it never matched and scored 0/2, while `return "valid BST"` scored 2/2. The
   * scenario graded INVERTED and wrote that into mastery.
   *
   * A property rather than a fixed answer because several different balanced BSTs are
   * correct for the same input, depending on which midpoint the candidate picks.
   */
  balancedBstFromSorted: (numsKey = "nums"): Property => ({
    name: "balanced-bst-from-sorted",
    description: "Output is a height-balanced BST containing exactly the input values",
    check: (ctx) => {
      const { input, output } = ctx
      const source: number[] = input[numsKey] ?? []
      if (!Array.isArray(output)) return false

      // Rebuild the tree from the level-order array so its structure can be inspected.
      const values: number[] = []
      interface Rebuilt {
        val: number
        left: Rebuilt | null
        right: Rebuilt | null
      }
      const build = (): Rebuilt | null => {
        if (output.length === 0 || output[0] === null) return null
        const root: Rebuilt = { val: output[0], left: null, right: null }
        const queue: Rebuilt[] = [root]
        let i = 1
        while (queue.length > 0 && i < output.length) {
          const node = queue.shift() as Rebuilt
          if (i < output.length) {
            const value = output[i++]
            if (value !== null && value !== undefined) {
              node.left = { val: value, left: null, right: null }
              queue.push(node.left)
            }
          }
          if (i < output.length) {
            const value = output[i++]
            if (value !== null && value !== undefined) {
              node.right = { val: value, left: null, right: null }
              queue.push(node.right)
            }
          }
        }
        return root
      }

      const root = build()
      if (source.length === 0) return root === null

      // In-order traversal must reproduce the sorted input exactly: same values, sorted.
      const inorder = (node: Rebuilt | null): void => {
        if (!node) return
        inorder(node.left)
        values.push(node.val)
        inorder(node.right)
      }
      inorder(root)
      if (JSON.stringify(values) !== JSON.stringify([...source].sort((a, b) => a - b))) {
        return false
      }

      // Height-balanced: no node's subtree heights differ by more than one.
      let balanced = true
      const height = (node: Rebuilt | null): number => {
        if (!node) return 0
        const left = height(node.left)
        const right = height(node.right)
        if (Math.abs(left - right) > 1) balanced = false
        return Math.max(left, right) + 1
      }
      height(root)
      return balanced
    },
  }),

  /**
   * The output is a valid BST holding exactly the input tree's values with one
   * instance of `key` removed.
   *
   * Written for dsa-delete-node-bst (2026-08-19). Deleting a node with two children
   * admits several correct trees: promoting the in-order successor and promoting the
   * predecessor are both textbook, and the statement says so. The scenario was graded
   * by exact match against the successor-shaped answer, so a correct predecessor
   * solution scored 0 - the same defect this file already records for
   * balancedBstFromSorted, left unfixed on the sibling scenario.
   *
   * Deleting a key the tree does not hold is a no-op, which this handles naturally:
   * the surviving multiset is then the original one.
   */
  bstAfterDeletion: (rootKey = "root", keyKey = "key"): Property => ({
    name: "bst-after-deletion",
    description: "Output is a valid BST holding the input values minus the deleted key",
    check: (ctx) => {
      const { input, output } = ctx
      const source = input[rootKey]
      const key = input[keyKey]
      if (!Array.isArray(source) || !Array.isArray(output)) return false

      // In-order values of a level-order array, via the sorted-values shortcut: a BST's
      // in-order traversal is its values in ascending order, so validity and contents can
      // both be decided from the serialised array plus a structural walk.
      interface Node {
        val: number
        left: Node | null
        right: Node | null
      }
      const build = (arr: Array<number | null>): Node | null => {
        if (arr.length === 0 || arr[0] === null || arr[0] === undefined) return null
        const root: Node = { val: arr[0] as number, left: null, right: null }
        const queue: Node[] = [root]
        let i = 1
        while (queue.length > 0 && i < arr.length) {
          const node = queue.shift() as Node
          if (i < arr.length) {
            const value = arr[i++]
            if (value !== null && value !== undefined) {
              node.left = { val: value as number, left: null, right: null }
              queue.push(node.left)
            }
          }
          if (i < arr.length) {
            const value = arr[i++]
            if (value !== null && value !== undefined) {
              node.right = { val: value as number, left: null, right: null }
              queue.push(node.right)
            }
          }
        }
        return root
      }

      const inorder = (node: Node | null, out: number[]): void => {
        if (!node) return
        inorder(node.left, out)
        out.push(node.val)
        inorder(node.right, out)
      }

      const sourceValues: number[] = []
      inorder(build(source as Array<number | null>), sourceValues)
      const resultValues: number[] = []
      inorder(build(output as Array<number | null>), resultValues)

      // Strictly ascending in-order is exactly the BST property (values are distinct here).
      for (let i = 1; i < resultValues.length; i++) {
        if (resultValues[i] <= resultValues[i - 1]) return false
      }

      const expectedValues = [...sourceValues]
      const at = expectedValues.indexOf(key as number)
      if (at !== -1) expectedValues.splice(at, 1)
      expectedValues.sort((a, b) => a - b)

      return JSON.stringify(resultValues) === JSON.stringify(expectedValues)
    },
  }),

  /**
   * The output is a rearrangement of the input string in which equal letters sit at
   * least `minGap` positions apart, or "" when no such arrangement exists.
   *
   * Written for dsa-reorganize-string and dsa-rearrange-string-k-distance (2026-08-19).
   * Both statements promise that any valid arrangement is accepted, and both were graded
   * by exact string match: "aabb" has two valid answers and only "abab" scored, while
   * "aaadbbcc" with k=2 has 384 valid answers and only one of them counted. The frozen
   * keys are not even internally consistent about which one to pin (four of the five
   * k-distance keys are the alphabetically smallest answer; "abacabcd" is not), so there
   * was no canonical rule to state instead. Grading the property is the honest fix.
   *
   * An empty answer is checked against real feasibility rather than taken on trust: the
   * greedy "place the most-frequent letter that is currently legal" order succeeds
   * whenever any arrangement does, so if it finds one, "" was wrong.
   */
  spacedRearrangement: (sKey = "s", kKey?: string, defaultGap = 2): Property => ({
    name: "spaced-rearrangement",
    description: "Output rearranges the input with equal letters kept far enough apart",
    check: (ctx) => {
      const { input, output } = ctx
      const source: string = input[sKey] ?? ""
      if (typeof output !== "string") return false
      const rawGap = kKey ? input[kKey] : defaultGap
      const gap = Math.max(1, Number(rawGap ?? defaultGap))

      const counts = (text: string): Record<string, number> => {
        const map: Record<string, number> = {}
        for (const ch of text) map[ch] = (map[ch] ?? 0) + 1
        return map
      }
      // Key order follows first appearance, so "abab" and "baba" serialise differently
      // even though they hold the same letters. Compare a sorted signature instead.
      const signature = (text: string): string =>
        Object.entries(counts(text))
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([ch, n]) => `${ch}:${n}`)
          .join(",")
      const satisfiesGap = (text: string): boolean => {
        const lastSeen: Record<string, number> = {}
        for (let i = 0; i < text.length; i++) {
          const ch = text[i]
          if (lastSeen[ch] !== undefined && i - lastSeen[ch] < gap) return false
          lastSeen[ch] = i
        }
        return true
      }

      if (output.length > 0) {
        // Same letters, same multiplicities, and legally spaced.
        if (signature(output) !== signature(source)) return false
        return satisfiesGap(output)
      }

      // Claimed impossible: only correct when the greedy construction also fails.
      const remaining = counts(source)
      const placed: string[] = []
      for (let i = 0; i < source.length; i++) {
        const legal = Object.keys(remaining)
          .filter((ch) => remaining[ch] > 0)
          .filter((ch) => {
            const idx = placed.lastIndexOf(ch)
            return idx === -1 || i - idx >= gap
          })
          .sort((a, b) => remaining[b] - remaining[a])
        if (legal.length === 0) return true // genuinely stuck, so "" is right
        const pick = legal[0]
        remaining[pick] -= 1
        placed.push(pick)
      }
      return false // greedy built a valid arrangement, so "" was wrong
    },
  }),

  /**
   * Valid palindrome check
   */
  isPalindrome: (): Property => ({
    name: "palindrome-check",
    description: "Correctly identifies palindrome",
    check: (ctx) => {
      const { input, output } = ctx
      const str = (input.s || input.str || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      const isPalin = str === str.split("").reverse().join("")
      return output === isPalin
    },
  }),

  /**
   * Valid anagram grouping (order of groups and within groups doesn't matter)
   */
  validAnagramGroups: (): Property => ({
    name: "valid-anagram-groups",
    description: "Groups are valid anagram sets",
    check: (ctx) => {
      const { input, output } = ctx
      if (!Array.isArray(output)) return false

      const strs = input.strs || input.words || []

      // Each string should appear exactly once across all groups
      const outputFlat = output.flat()
      if (outputFlat.length !== strs.length) return false

      // Check each group contains only anagrams
      for (const group of output) {
        if (!Array.isArray(group)) return false
        const sorted = group.map((s: string) => s.split("").sort().join(""))
        if (new Set(sorted).size !== 1) return false
      }

      // Check all strings are accounted for
      const inputSet = new Set(strs)
      const outputSet = new Set(outputFlat)
      if (inputSet.size !== outputSet.size) return false
      for (const s of inputSet) {
        if (!outputSet.has(s)) return false
      }

      return true
    },
  }),

  /**
   * Output length matches expected
   */
  lengthMatches: (expectedLength: number): Property => ({
    name: "length-matches",
    description: `Output length is ${expectedLength}`,
    check: (ctx) => {
      const { output } = ctx
      if (Array.isArray(output)) return output.length === expectedLength
      if (typeof output === "string") return output.length === expectedLength
      return false
    },
  }),

  /**
   * Output is within numeric range
   */
  inRange: (min: number, max: number): Property => ({
    name: "in-range",
    description: `Output is between ${min} and ${max}`,
    check: (ctx) => {
      const { output } = ctx
      return typeof output === "number" && output >= min && output <= max
    },
  }),

  /**
   * Subarray sum equals target
   */
  subarraySumEquals: (targetKey = "target"): Property => ({
    name: "subarray-sum",
    description: "Subarray elements sum to target",
    check: (ctx) => {
      const { input, output } = ctx
      const nums = input.nums || input.arr
      const target = input[targetKey]

      if (!Array.isArray(output) || output.length !== 2) return false
      const [start, end] = output

      let sum = 0
      for (let i = start; i <= end; i++) {
        sum += nums[i]
      }
      return sum === target
    },
  }),
}

/**
 * Output normalizers
 */
export const Normalizers = {
  sortArray: (val: any): any => {
    if (!Array.isArray(val)) return val
    return [...val].sort((a, b) => {
      if (typeof a === "number" && typeof b === "number") return a - b
      return String(a).localeCompare(String(b))
    })
  },

  sortNested: (val: any): any => {
    if (!Array.isArray(val)) return val
    return Normalizers.sortArray(val.map(Normalizers.sortNested))
  },

  toSet: (val: any): Set<any> => {
    if (!Array.isArray(val)) return new Set([val])
    return new Set(val.map((v) => JSON.stringify(v)))
  },

  normalizeWhitespace: (val: any): any => {
    if (typeof val === "string") {
      return val.trim().replace(/\s+/g, " ")
    }
    return val
  },

  // Parse various output formats to a standard form
  parseOutput: (raw: any): any => {
    if (raw === null || raw === undefined) return raw

    // Already parsed
    if (typeof raw !== "string") return raw

    const trimmed = raw.trim()

    // Try JSON parse
    try {
      return JSON.parse(trimmed)
    } catch {}

    // Try Python tuple -> array: (1, 2) -> [1, 2]
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      try {
        return JSON.parse("[" + trimmed.slice(1, -1) + "]")
      } catch {}
    }

    // Try Python set -> array: {1, 2} -> [1, 2]
    if (trimmed.startsWith("{") && trimmed.endsWith("}") && !trimmed.includes(":")) {
      try {
        return JSON.parse("[" + trimmed.slice(1, -1) + "]")
      } catch {}
    }

    // Boolean strings
    if (trimmed.toLowerCase() === "true") return true
    if (trimmed.toLowerCase() === "false") return false

    // Number strings
    const num = Number(trimmed)
    if (!isNaN(num) && trimmed !== "") return num

    // Return as-is
    return raw
  },
}
