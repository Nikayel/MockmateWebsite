/**
 * Property-based validation system for coding challenges
 *
 * This system replaces fragile hardcoded expected values with:
 * 1. Property-based validation - check if answer is CORRECT, not if it MATCHES
 * 2. Flexible output parsing - handle tuples, sets, different formats
 * 3. Auto-detection of problem patterns
 * 4. Reference solution execution - run canonical solution, compare outputs
 *
 * Primary exports (currently used):
 *   import { validateResultEnhanced, Normalizers } from '@/lib/validators'
 *   import { extractSignature, validateWithAST } from '@/lib/validators'
 *
 * For scenarios with explicit validators:
 *   import { PropertyBuilders, type ValidatorConfig } from '@/lib/validators'
 */

// ============================================
// ACTIVELY USED EXPORTS
// ============================================

// Used by app/api/execute/route.ts
export { validateResultEnhanced } from "./runner"
export { Normalizers } from "./types"

// Used by app/api/execute/ast/route.ts
export {
  extractSignature,
  generateInputsFromSignature,
  validateWithAST,
  type FunctionSignature,
} from "./ast-parser"

// ============================================
// AVAILABLE FOR FUTURE USE
// These are exported for scenarios that want explicit validator config
// ============================================

export {
  // Types for scenario definitions
  type ValidationMode,
  type ValidatorConfig,
  type ReferenceSolution,
  type ValidatedTestCase,

  // Property builders for common DSA patterns
  PropertyBuilders,
} from "./types"

export {
  // Reference solution based validation
  validateWithReference,
  generateTestInputs,
  ReferenceSolutions,
  type InputSpec,
  type ParamSpec,
  type OutputComparisonMode,
} from "./ast-validator"

// ============================================
// INTERNAL EXPORTS (used by other validator files)
// ============================================

export { validateOutput, convertLegacyTestCase, type ValidationResult } from "./runner"

export {
  type OutputNormalization,
  type ValidatorContext,
  type ValidatorFn,
  type Property,
} from "./types"

export { type ParamInfo, type TypeInfo } from "./ast-parser"

export { type ParamType } from "./ast-validator"
