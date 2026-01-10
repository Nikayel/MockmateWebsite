/**
 * Property-based validation system for coding challenges
 *
 * This system replaces fragile hardcoded expected values with:
 * 1. Property-based validation - check if answer is CORRECT, not if it MATCHES
 * 2. Flexible output parsing - handle tuples, sets, different formats
 * 3. Auto-detection of problem patterns
 * 4. Reference solution execution - run canonical solution, compare outputs
 *
 * Usage:
 *   import { validateResultEnhanced } from '@/lib/validators'
 *   const result = validateResultEnhanced(userOutput, testCase, scenarioId, language)
 *
 *   // Or use reference-based validation:
 *   import { validateWithReference, ReferenceSolutions } from '@/lib/validators'
 *   const result = await validateWithReference(userCode, ReferenceSolutions['two-sum'], 'python')
 */

export {
  // Types
  type ValidationMode,
  type OutputNormalization,
  type ValidatorContext,
  type ValidatorFn,
  type Property,
  type ValidatorConfig,
  type ValidatedTestCase,

  // Property builders for common patterns
  PropertyBuilders,

  // Output normalizers
  Normalizers,
} from './types'

export {
  // Main validation functions
  validateOutput,
  validateResultEnhanced,
  convertLegacyTestCase,

  // Result type
  type ValidationResult,
} from './runner'

export {
  // Reference-based validation (AST-inspired approach)
  validateWithReference,
  generateTestInputs,
  ReferenceSolutions,

  // Types
  type ReferenceSolution,
  type InputSpec,
  type ParamSpec,
  type ParamType,
  type OutputComparisonMode,
} from './ast-validator'
