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
      type: 'int' | 'float' | 'string' | 'boolean' | 'array' | 'matrix' | 'object'
      minLength?: number
      maxLength?: number
      min?: number
      max?: number
      elementType?: 'int' | 'float' | 'string' | 'boolean'
      elementMin?: number
      elementMax?: number
    }>
    constraints?: Array<{
      type: 'sum-exists' | 'sorted' | 'unique' | 'custom'
      params?: string[]
    }>
  }
  outputComparison?: 'exact' | 'set' | 'any-valid' | 'property-based'
}

export type ValidationMode =
  | 'exact'           // Must match exactly (default for simple cases)
  | 'property'        // Must satisfy defined properties
  | 'reference'       // Compare against reference solution output
  | 'any-valid'       // Any output satisfying constraints is valid

export type OutputNormalization =
  | 'none'            // No normalization
  | 'sort-array'      // Sort arrays before comparison
  | 'sort-nested'     // Sort arrays and nested arrays
  | 'set'             // Treat as set (order doesn't matter, no duplicates)
  | 'multiset'        // Order doesn't matter, duplicates allowed
  | 'normalize-whitespace'  // Trim and normalize whitespace

export interface ValidatorContext {
  input: Record<string, any>
  output: any
  expected?: any  // Optional - not needed for property-based
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
  twoSumValid: (numsKey = 'nums', targetKey = 'target'): Property => ({
    name: 'valid-two-sum',
    description: 'Output indices point to values that sum to target',
    check: (ctx) => {
      const { input, output } = ctx
      const nums = input[numsKey]
      const target = input[targetKey]

      if (!Array.isArray(output) || output.length !== 2) return false
      const [i, j] = output

      // Indices must be valid, different, and values must sum to target
      return (
        Number.isInteger(i) && Number.isInteger(j) &&
        i >= 0 && i < nums.length &&
        j >= 0 && j < nums.length &&
        i !== j &&
        nums[i] + nums[j] === target
      )
    }
  }),

  /**
   * Array contains exactly the expected elements (order doesn't matter)
   */
  arrayAsSet: (expectedKey: string): Property => ({
    name: 'array-as-set',
    description: 'Output contains exactly the expected elements (any order)',
    check: (ctx) => {
      const { output, expected } = ctx
      if (!Array.isArray(output) || !Array.isArray(expected)) return false
      if (output.length !== expected.length) return false

      const sortedOutput = [...output].sort()
      const sortedExpected = [...expected].sort()
      return JSON.stringify(sortedOutput) === JSON.stringify(sortedExpected)
    }
  }),

  /**
   * Linked list cycle detection: output is boolean or node reference
   */
  hasCycle: (): Property => ({
    name: 'cycle-detection',
    description: 'Correctly identifies if cycle exists',
    check: (ctx) => {
      const { output, expected } = ctx
      // Accept boolean or truthy/falsy
      return Boolean(output) === Boolean(expected)
    }
  }),

  /**
   * Valid BST traversal
   */
  validBSTTraversal: (order: 'inorder' | 'preorder' | 'postorder'): Property => ({
    name: `valid-${order}-traversal`,
    description: `Output is valid ${order} BST traversal`,
    check: (ctx) => {
      const { output, expected } = ctx
      if (!Array.isArray(output)) return false
      // For traversals, exact match is usually required
      return JSON.stringify(output) === JSON.stringify(expected)
    }
  }),

  /**
   * Valid palindrome check
   */
  isPalindrome: (): Property => ({
    name: 'palindrome-check',
    description: 'Correctly identifies palindrome',
    check: (ctx) => {
      const { input, output } = ctx
      const str = (input.s || input.str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const isPalin = str === str.split('').reverse().join('')
      return output === isPalin
    }
  }),

  /**
   * Valid anagram grouping (order of groups and within groups doesn't matter)
   */
  validAnagramGroups: (): Property => ({
    name: 'valid-anagram-groups',
    description: 'Groups are valid anagram sets',
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
        const sorted = group.map((s: string) => s.split('').sort().join(''))
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
    }
  }),

  /**
   * Output length matches expected
   */
  lengthMatches: (expectedLength: number): Property => ({
    name: 'length-matches',
    description: `Output length is ${expectedLength}`,
    check: (ctx) => {
      const { output } = ctx
      if (Array.isArray(output)) return output.length === expectedLength
      if (typeof output === 'string') return output.length === expectedLength
      return false
    }
  }),

  /**
   * Output is within numeric range
   */
  inRange: (min: number, max: number): Property => ({
    name: 'in-range',
    description: `Output is between ${min} and ${max}`,
    check: (ctx) => {
      const { output } = ctx
      return typeof output === 'number' && output >= min && output <= max
    }
  }),

  /**
   * Subarray sum equals target
   */
  subarraySumEquals: (targetKey = 'target'): Property => ({
    name: 'subarray-sum',
    description: 'Subarray elements sum to target',
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
    }
  }),
}

/**
 * Output normalizers
 */
export const Normalizers = {
  sortArray: (val: any): any => {
    if (!Array.isArray(val)) return val
    return [...val].sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b
      return String(a).localeCompare(String(b))
    })
  },

  sortNested: (val: any): any => {
    if (!Array.isArray(val)) return val
    return Normalizers.sortArray(val.map(Normalizers.sortNested))
  },

  toSet: (val: any): Set<any> => {
    if (!Array.isArray(val)) return new Set([val])
    return new Set(val.map(v => JSON.stringify(v)))
  },

  normalizeWhitespace: (val: any): any => {
    if (typeof val === 'string') {
      return val.trim().replace(/\s+/g, ' ')
    }
    return val
  },

  // Parse various output formats to a standard form
  parseOutput: (raw: any): any => {
    if (raw === null || raw === undefined) return raw

    // Already parsed
    if (typeof raw !== 'string') return raw

    const trimmed = raw.trim()

    // Try JSON parse
    try {
      return JSON.parse(trimmed)
    } catch {}

    // Try Python tuple -> array: (1, 2) -> [1, 2]
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      try {
        return JSON.parse('[' + trimmed.slice(1, -1) + ']')
      } catch {}
    }

    // Try Python set -> array: {1, 2} -> [1, 2]
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && !trimmed.includes(':')) {
      try {
        return JSON.parse('[' + trimmed.slice(1, -1) + ']')
      } catch {}
    }

    // Boolean strings
    if (trimmed.toLowerCase() === 'true') return true
    if (trimmed.toLowerCase() === 'false') return false

    // Number strings
    const num = Number(trimmed)
    if (!isNaN(num) && trimmed !== '') return num

    // Return as-is
    return raw
  }
}
