/**
 * AST-Based Validation System
 *
 * Instead of hardcoded expected values, we:
 * 1. Store a REFERENCE SOLUTION for each problem
 * 2. Execute both reference and user code with the same inputs
 * 3. Compare outputs - if they match, user is correct
 *
 * This handles ANY valid solution style automatically!
 */

import { executeWithPiston } from '@/lib/piston'

/**
 * Reference solution configuration
 */
export interface ReferenceSolution {
  // The canonical correct solution
  code: {
    python: string
    javascript: string
    typescript?: string
  }
  // Function name to call
  functionName: string
  // Input parameter specification for generating test cases
  inputSpec: InputSpec
  // How to compare outputs
  outputComparison?: OutputComparisonMode
}

/**
 * Input specification for generating test cases
 */
export interface InputSpec {
  params: ParamSpec[]
  // Constraints between parameters (e.g., "target must be sum of two elements in nums")
  constraints?: InputConstraint[]
}

export interface ParamSpec {
  name: string
  type: ParamType
  // For arrays/strings
  minLength?: number
  maxLength?: number
  // For numbers
  min?: number
  max?: number
  // For arrays
  elementType?: ParamType
  elementMin?: number
  elementMax?: number
  // For specific value sets
  oneOf?: any[]
  // Allow duplicates in arrays?
  allowDuplicates?: boolean
}

export type ParamType =
  | 'int'
  | 'float'
  | 'string'
  | 'boolean'
  | 'array'
  | 'matrix'  // 2D array
  | 'object'
  | 'linkedlist'
  | 'tree'

export interface InputConstraint {
  type: 'sum-exists' | 'sorted' | 'unique' | 'custom'
  params?: string[]  // Which params this constraint applies to
  customFn?: (inputs: Record<string, any>) => boolean
}

export type OutputComparisonMode =
  | 'exact'           // Must match exactly
  | 'set'             // Order doesn't matter
  | 'any-valid'       // Multiple valid answers exist
  | 'property-based'  // Check properties, not values

/**
 * Generate random test inputs based on specification
 */
export function generateTestInputs(spec: InputSpec, count: number = 5): Record<string, any>[] {
  const inputs: Record<string, any>[] = []

  for (let i = 0; i < count; i++) {
    const input: Record<string, any> = {}

    for (const param of spec.params) {
      input[param.name] = generateValue(param)
    }

    // Apply constraints
    if (spec.constraints) {
      for (const constraint of spec.constraints) {
        applyConstraint(input, constraint, spec.params)
      }
    }

    inputs.push(input)
  }

  return inputs
}

function generateValue(param: ParamSpec): any {
  switch (param.type) {
    case 'int':
      return randomInt(param.min ?? -1000, param.max ?? 1000)

    case 'float':
      return randomFloat(param.min ?? -1000, param.max ?? 1000)

    case 'string':
      return randomString(param.minLength ?? 1, param.maxLength ?? 20)

    case 'boolean':
      return Math.random() > 0.5

    case 'array':
      const len = randomInt(param.minLength ?? 1, param.maxLength ?? 10)
      const arr: any[] = []
      for (let i = 0; i < len; i++) {
        arr.push(generateValue({
          name: 'element',
          type: param.elementType ?? 'int',
          min: param.elementMin,
          max: param.elementMax,
        }))
      }
      if (!param.allowDuplicates) {
        return [...new Set(arr)]
      }
      return arr

    case 'matrix':
      const rows = randomInt(param.minLength ?? 1, param.maxLength ?? 5)
      const cols = randomInt(param.minLength ?? 1, param.maxLength ?? 5)
      const matrix: any[][] = []
      for (let i = 0; i < rows; i++) {
        const row: any[] = []
        for (let j = 0; j < cols; j++) {
          row.push(randomInt(param.elementMin ?? -100, param.elementMax ?? 100))
        }
        matrix.push(row)
      }
      return matrix

    default:
      return null
  }
}

function applyConstraint(input: Record<string, any>, constraint: InputConstraint, params: ParamSpec[]): void {
  switch (constraint.type) {
    case 'sum-exists':
      // Ensure target is a sum of two elements in the array
      const arrayParam = params.find(p => p.type === 'array')
      const targetParam = params.find(p => p.name === 'target')
      if (arrayParam && targetParam && input[arrayParam.name]?.length >= 2) {
        const arr = input[arrayParam.name]
        const i = randomInt(0, arr.length - 1)
        let j = randomInt(0, arr.length - 1)
        while (j === i) j = randomInt(0, arr.length - 1)
        input.target = arr[i] + arr[j]
      }
      break

    case 'sorted':
      const sortParam = constraint.params?.[0]
      if (sortParam && Array.isArray(input[sortParam])) {
        input[sortParam] = input[sortParam].sort((a: number, b: number) => a - b)
      }
      break

    case 'unique':
      const uniqueParam = constraint.params?.[0]
      if (uniqueParam && Array.isArray(input[uniqueParam])) {
        input[uniqueParam] = [...new Set(input[uniqueParam])]
      }
      break

    case 'custom':
      if (constraint.customFn) {
        // Re-generate until constraint is satisfied (with limit)
        let attempts = 0
        while (!constraint.customFn(input) && attempts < 100) {
          for (const param of params) {
            input[param.name] = generateValue(param)
          }
          attempts++
        }
      }
      break
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomString(minLen: number, maxLen: number): string {
  const len = randomInt(minLen, maxLen)
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars[randomInt(0, chars.length - 1)]
  }
  return result
}

/**
 * Wrap user code to call the function with given input
 */
function wrapCode(code: string, functionName: string, input: Record<string, any>, language: string): string {
  const inputJson = JSON.stringify(input)

  switch (language) {
    case 'python':
      return `
import json
${code}

__input__ = json.loads('${inputJson.replace(/'/g, "\\'")}')
__result__ = ${functionName}(**__input__)
print(json.dumps(__result__))
`

    case 'javascript':
    case 'typescript':
      return `
${code}

const __input__ = ${inputJson};
const __result__ = ${functionName}(${Object.keys(input).map(k => `__input__.${k}`).join(', ')});
console.log(JSON.stringify(__result__));
`

    default:
      throw new Error(`Unsupported language: ${language}`)
  }
}

/**
 * Run code and get output
 */
async function runCode(code: string, language: string): Promise<{ success: boolean; output: any; error?: string }> {
  try {
    const result = await executeWithPiston(code, language, {})

    if (!result.success || result.error) {
      return { success: false, output: null, error: result.error }
    }

    // Parse JSON output
    const outputStr = (result.output || '').trim()
    try {
      return { success: true, output: JSON.parse(outputStr) }
    } catch {
      return { success: true, output: outputStr }
    }
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Compare outputs based on comparison mode
 */
function compareOutputs(
  userOutput: any,
  referenceOutput: any,
  mode: OutputComparisonMode = 'exact'
): boolean {
  if (mode === 'set') {
    // Order doesn't matter
    if (!Array.isArray(userOutput) || !Array.isArray(referenceOutput)) {
      return JSON.stringify(userOutput) === JSON.stringify(referenceOutput)
    }
    const sortedUser = [...userOutput].sort()
    const sortedRef = [...referenceOutput].sort()
    return JSON.stringify(sortedUser) === JSON.stringify(sortedRef)
  }

  // Default: exact comparison
  return JSON.stringify(userOutput) === JSON.stringify(referenceOutput)
}

/**
 * Main validation function: Run both reference and user code, compare outputs
 */
export async function validateWithReference(
  userCode: string,
  reference: ReferenceSolution,
  language: 'python' | 'javascript' | 'typescript',
  testInputs?: Record<string, any>[]
): Promise<{
  passed: boolean
  results: Array<{
    input: Record<string, any>
    userOutput: any
    referenceOutput: any
    passed: boolean
    error?: string
  }>
}> {
  // Generate test inputs if not provided
  const inputs = testInputs || generateTestInputs(reference.inputSpec, 5)

  const referenceCode = reference.code[language] || reference.code.python
  const results: Array<{
    input: Record<string, any>
    userOutput: any
    referenceOutput: any
    passed: boolean
    error?: string
  }> = []

  let allPassed = true

  for (const input of inputs) {
    // Run reference solution
    const wrappedRef = wrapCode(referenceCode, reference.functionName, input, language)
    const refResult = await runCode(wrappedRef, language)

    if (!refResult.success) {
      results.push({
        input,
        userOutput: null,
        referenceOutput: null,
        passed: false,
        error: `Reference solution error: ${refResult.error}`
      })
      allPassed = false
      continue
    }

    // Run user solution
    const wrappedUser = wrapCode(userCode, reference.functionName, input, language)
    const userResult = await runCode(wrappedUser, language)

    if (!userResult.success) {
      results.push({
        input,
        userOutput: null,
        referenceOutput: refResult.output,
        passed: false,
        error: `User code error: ${userResult.error}`
      })
      allPassed = false
      continue
    }

    // Compare outputs
    const passed = compareOutputs(
      userResult.output,
      refResult.output,
      reference.outputComparison
    )

    if (!passed) {
      allPassed = false
    }

    results.push({
      input,
      userOutput: userResult.output,
      referenceOutput: refResult.output,
      passed
    })
  }

  return { passed: allPassed, results }
}

/**
 * Example reference solutions for common problems
 */
export const ReferenceSolutions: Record<string, ReferenceSolution> = {
  'two-sum': {
    functionName: 'twoSum',
    code: {
      python: `
def twoSum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []
`,
      javascript: `
function twoSum(nums, target) {
  const seen = {};
  for (let i = 0; i < nums.length; i++) {
    if (target - nums[i] in seen) {
      return [seen[target - nums[i]], i];
    }
    seen[nums[i]] = i;
  }
  return [];
}
`
    },
    inputSpec: {
      params: [
        { name: 'nums', type: 'array', elementType: 'int', minLength: 2, maxLength: 20, elementMin: -100, elementMax: 100 },
        { name: 'target', type: 'int' }
      ],
      constraints: [
        { type: 'sum-exists' }
      ]
    },
    outputComparison: 'set'  // [0,1] == [1,0]
  },

  'valid-palindrome': {
    functionName: 'isPalindrome',
    code: {
      python: `
def isPalindrome(s):
    s = ''.join(c.lower() for c in s if c.isalnum())
    return s == s[::-1]
`,
      javascript: `
function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}
`
    },
    inputSpec: {
      params: [
        { name: 's', type: 'string', minLength: 0, maxLength: 50 }
      ]
    },
    outputComparison: 'exact'
  },

  'group-anagrams': {
    functionName: 'groupAnagrams',
    code: {
      python: `
from collections import defaultdict
def groupAnagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = ''.join(sorted(s))
        groups[key].append(s)
    return list(groups.values())
`,
      javascript: `
function groupAnagrams(strs) {
  const groups = {};
  for (const s of strs) {
    const key = s.split('').sort().join('');
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return Object.values(groups);
}
`
    },
    inputSpec: {
      params: [
        { name: 'strs', type: 'array', elementType: 'string', minLength: 1, maxLength: 10 }
      ]
    },
    outputComparison: 'any-valid'  // Order of groups doesn't matter
  }
}
