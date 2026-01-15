/**
 * Validator runner - executes validation against user output
 */

import {
  ValidatorConfig,
  ValidatorContext,
  ValidatedTestCase,
  Normalizers,
  PropertyBuilders,
  OutputNormalization,
} from "./types"

export interface ValidationResult {
  passed: boolean
  reason?: string
  details?: {
    propertyName?: string
    propertyDescription?: string
    expected?: any
    actual?: any
    normalizedExpected?: any
    normalizedActual?: any
  }
}

/**
 * Apply normalization steps to a value
 */
function applyNormalization(value: any, steps: OutputNormalization[]): any {
  let result = Normalizers.parseOutput(value)

  for (const step of steps) {
    switch (step) {
      case "sort-array":
        result = Normalizers.sortArray(result)
        break
      case "sort-nested":
        result = Normalizers.sortNested(result)
        break
      case "set":
        result = Array.from(Normalizers.toSet(result))
        break
      case "multiset":
        result = Normalizers.sortArray(result)
        break
      case "normalize-whitespace":
        result = Normalizers.normalizeWhitespace(result)
        break
      case "none":
      default:
        break
    }
  }

  return result
}

/**
 * Deep equality check with numeric tolerance
 */
function deepEquals(a: any, b: any, tolerance = 0.0001): boolean {
  // Handle null/undefined
  if (a === null || a === undefined) return b === null || b === undefined
  if (b === null || b === undefined) return false

  // Handle numbers with tolerance
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return true
    const diff = Math.abs(a - b)
    const relativeTolerance = Math.max(tolerance, Math.abs(a) * tolerance)
    return diff < relativeTolerance
  }

  // Handle booleans
  if (typeof a === "boolean" && typeof b === "boolean") {
    return a === b
  }

  // Handle strings
  if (typeof a === "string" && typeof b === "string") {
    return a === b
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((val, idx) => deepEquals(val, b[idx], tolerance))
  }

  // Handle objects
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a).sort()
    const keysB = Object.keys(b).sort()
    if (keysA.length !== keysB.length) return false
    if (keysA.join(",") !== keysB.join(",")) return false
    return keysA.every((key) => deepEquals(a[key], b[key], tolerance))
  }

  // Fallback to strict equality
  return a === b
}

/**
 * Main validation function
 */
export async function validateOutput(
  testCase: ValidatedTestCase,
  actualOutput: any,
  context: Omit<ValidatorContext, "input" | "output" | "expected">
): Promise<ValidationResult> {
  const config = testCase.validation
  const parsedOutput = Normalizers.parseOutput(actualOutput)

  const ctx: ValidatorContext = {
    input: testCase.input,
    output: parsedOutput,
    expected: config.expected ?? testCase.expected,
    ...context,
  }

  // Apply custom validator first if provided
  if (config.customValidator) {
    try {
      const result = await config.customValidator(ctx)
      return {
        passed: result,
        reason: result ? undefined : "Custom validator returned false",
      }
    } catch (error) {
      return {
        passed: false,
        reason: `Custom validator error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  switch (config.mode) {
    case "property":
      return validateProperties(ctx, config)

    case "reference":
      // Reference validation would require executing reference solution
      // For now, fall through to exact mode
      return validateExact(ctx, config)

    case "any-valid":
      return validateAnyValid(ctx, config)

    case "exact":
    default:
      return validateExact(ctx, config)
  }
}

/**
 * Property-based validation
 */
function validateProperties(ctx: ValidatorContext, config: ValidatorConfig): ValidationResult {
  const properties = config.properties || []

  if (properties.length === 0) {
    return {
      passed: false,
      reason: "No properties defined for property-based validation",
    }
  }

  for (const prop of properties) {
    try {
      const result = prop.check(ctx)
      // Handle both sync and async (though we expect sync for now)
      const passed = result instanceof Promise ? false : result

      if (!passed) {
        return {
          passed: false,
          reason: `Property "${prop.name}" failed: ${prop.description}`,
          details: {
            propertyName: prop.name,
            propertyDescription: prop.description,
            actual: ctx.output,
          },
        }
      }
    } catch (error) {
      return {
        passed: false,
        reason: `Property "${prop.name}" threw error: ${error instanceof Error ? error.message : "Unknown"}`,
        details: {
          propertyName: prop.name,
          propertyDescription: prop.description,
        },
      }
    }
  }

  return { passed: true }
}

/**
 * Exact value validation with normalization
 */
function validateExact(ctx: ValidatorContext, config: ValidatorConfig): ValidationResult {
  const expected = config.expected ?? ctx.expected
  const normalizeSteps = config.normalize || []

  const normalizedActual = applyNormalization(ctx.output, normalizeSteps)
  const normalizedExpected = applyNormalization(expected, normalizeSteps)

  const tolerance = config.tolerance ?? 0.0001
  const passed = deepEquals(normalizedActual, normalizedExpected, tolerance)

  return {
    passed,
    reason: passed ? undefined : "Output does not match expected value",
    details: {
      expected,
      actual: ctx.output,
      normalizedExpected,
      normalizedActual,
    },
  }
}

/**
 * Any valid output validation - checks against multiple valid outputs
 */
function validateAnyValid(ctx: ValidatorContext, config: ValidatorConfig): ValidationResult {
  const validOutputs = config.multipleValidOutputs || []

  if (validOutputs.length === 0) {
    // Fall back to expected if no multiple outputs defined
    if (config.expected !== undefined) {
      return validateExact(ctx, { ...config, mode: "exact" })
    }
    return {
      passed: false,
      reason: "No valid outputs defined for any-valid mode",
    }
  }

  const normalizeSteps = config.normalize || []
  const normalizedActual = applyNormalization(ctx.output, normalizeSteps)
  const tolerance = config.tolerance ?? 0.0001

  for (const validOutput of validOutputs) {
    const normalizedValid = applyNormalization(validOutput, normalizeSteps)
    if (deepEquals(normalizedActual, normalizedValid, tolerance)) {
      return { passed: true }
    }
  }

  return {
    passed: false,
    reason: "Output does not match any valid output",
    details: {
      actual: ctx.output,
      normalizedActual,
    },
  }
}

/**
 * Legacy compatibility: Convert old test case format to new format
 */
export function convertLegacyTestCase(
  testCase: {
    input: any
    expected: any
    description: string
    compareAsSet?: boolean
    orderMatters?: boolean
    caseSensitive?: boolean
  },
  scenarioId: string
): ValidatedTestCase {
  const normalize: OutputNormalization[] = []

  if (testCase.compareAsSet || testCase.orderMatters === false) {
    normalize.push("sort-nested")
  }

  // Auto-detect problem type from scenarioId for property-based validation
  const propertyValidators = detectPropertyValidators(scenarioId, testCase)

  if (propertyValidators.length > 0) {
    return {
      input: testCase.input,
      description: testCase.description,
      validation: {
        mode: "property",
        properties: propertyValidators,
        expected: testCase.expected, // Keep for debugging
      },
      expected: testCase.expected, // Backwards compat
    }
  }

  return {
    input: testCase.input,
    description: testCase.description,
    validation: {
      mode: "exact",
      expected: testCase.expected,
      normalize,
    },
    expected: testCase.expected,
  }
}

/**
 * Auto-detect appropriate property validators based on scenario ID and input shape
 */
function detectPropertyValidators(
  scenarioId: string,
  testCase: { input: any; expected: any }
): Array<ReturnType<(typeof PropertyBuilders)[keyof typeof PropertyBuilders]>> {
  const validators: Array<ReturnType<(typeof PropertyBuilders)[keyof typeof PropertyBuilders]>> = []
  const { input, expected } = testCase

  // Two-sum pattern detection
  if (
    scenarioId.includes("two-sum") ||
    (input.nums && input.target !== undefined && Array.isArray(expected) && expected.length === 2)
  ) {
    validators.push(PropertyBuilders.twoSumValid("nums", "target"))
    return validators
  }

  // Group anagrams pattern
  if (
    scenarioId.includes("anagram") &&
    input.strs &&
    Array.isArray(expected) &&
    Array.isArray(expected[0])
  ) {
    validators.push(PropertyBuilders.validAnagramGroups())
    return validators
  }

  // Palindrome check
  if (scenarioId.includes("palindrome") && typeof expected === "boolean") {
    validators.push(PropertyBuilders.isPalindrome())
    return validators
  }

  // Cycle detection
  if (scenarioId.includes("cycle") && typeof expected === "boolean") {
    validators.push(PropertyBuilders.hasCycle())
    return validators
  }

  return validators
}

/**
 * Enhanced result validation that uses the new system
 */
export function validateResultEnhanced(
  actual: any,
  testCase: {
    input: any
    expected: any
    description: string
    compareAsSet?: boolean
    orderMatters?: boolean
  },
  scenarioId: string,
  language: string
): ValidationResult {
  const validatedTestCase = convertLegacyTestCase(testCase, scenarioId)

  // Use sync version for backwards compatibility
  const ctx: ValidatorContext = {
    input: testCase.input,
    output: Normalizers.parseOutput(actual),
    expected: testCase.expected,
    language,
    scenarioId,
  }

  const config = validatedTestCase.validation

  if (config.mode === "property" && config.properties) {
    return validateProperties(ctx, config)
  }

  return validateExact(ctx, config)
}
