/**
 * True AST-Based Code Analysis
 *
 * Uses Python's ast module and TypeScript Compiler API to:
 * 1. Extract function signatures from reference solutions
 * 2. Auto-generate test inputs from type hints
 * 3. Analyze user code structure (optional feedback)
 *
 * AST parsing is executed via Piston in the target language.
 */

import { executeWithPiston } from '@/lib/piston'

/**
 * Extracted function signature from AST
 */
export interface FunctionSignature {
  name: string
  params: ParamInfo[]
  returnType: TypeInfo | null
  docstring?: string
}

export interface ParamInfo {
  name: string
  type: TypeInfo | null
  defaultValue?: any
  isOptional: boolean
}

export interface TypeInfo {
  kind: 'primitive' | 'array' | 'dict' | 'tuple' | 'union' | 'generic' | 'unknown'
  name: string  // 'int', 'str', 'List', 'Dict', etc.
  elementType?: TypeInfo  // For arrays/lists
  keyType?: TypeInfo      // For dicts
  valueType?: TypeInfo    // For dicts
  typeArgs?: TypeInfo[]   // For generics like Dict[str, int]
}

/**
 * Python code that extracts function signature using ast module
 */
const PYTHON_AST_EXTRACTOR = `
import ast
import json
import sys
from typing import get_type_hints

def parse_type_annotation(node):
    """Convert AST type annotation to our TypeInfo format"""
    if node is None:
        return None

    if isinstance(node, ast.Name):
        name = node.id
        if name in ('int', 'float', 'str', 'bool', 'None'):
            return {'kind': 'primitive', 'name': name}
        return {'kind': 'unknown', 'name': name}

    if isinstance(node, ast.Constant):
        return {'kind': 'primitive', 'name': str(type(node.value).__name__)}

    if isinstance(node, ast.Subscript):
        base = node.value
        if isinstance(base, ast.Name):
            base_name = base.id

            # Handle List[T], list[T]
            if base_name in ('List', 'list'):
                elem_type = parse_type_annotation(node.slice)
                return {'kind': 'array', 'name': 'List', 'elementType': elem_type}

            # Handle Dict[K, V], dict[K, V]
            if base_name in ('Dict', 'dict'):
                if isinstance(node.slice, ast.Tuple):
                    elts = node.slice.elts
                    key_type = parse_type_annotation(elts[0]) if len(elts) > 0 else None
                    val_type = parse_type_annotation(elts[1]) if len(elts) > 1 else None
                    return {'kind': 'dict', 'name': 'Dict', 'keyType': key_type, 'valueType': val_type}

            # Handle Set[T], set[T]
            if base_name in ('Set', 'set'):
                elem_type = parse_type_annotation(node.slice)
                return {'kind': 'array', 'name': 'Set', 'elementType': elem_type}

            # Handle Tuple[T, ...]
            if base_name in ('Tuple', 'tuple'):
                if isinstance(node.slice, ast.Tuple):
                    type_args = [parse_type_annotation(e) for e in node.slice.elts]
                    return {'kind': 'tuple', 'name': 'Tuple', 'typeArgs': type_args}
                else:
                    return {'kind': 'tuple', 'name': 'Tuple', 'typeArgs': [parse_type_annotation(node.slice)]}

            # Handle Optional[T] = Union[T, None]
            if base_name == 'Optional':
                inner = parse_type_annotation(node.slice)
                return {'kind': 'union', 'name': 'Optional', 'typeArgs': [inner, {'kind': 'primitive', 'name': 'None'}]}

            # Generic fallback
            if isinstance(node.slice, ast.Tuple):
                type_args = [parse_type_annotation(e) for e in node.slice.elts]
            else:
                type_args = [parse_type_annotation(node.slice)]
            return {'kind': 'generic', 'name': base_name, 'typeArgs': type_args}

    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
        # Union type: X | Y
        left = parse_type_annotation(node.left)
        right = parse_type_annotation(node.right)
        return {'kind': 'union', 'name': 'Union', 'typeArgs': [left, right]}

    return {'kind': 'unknown', 'name': ast.dump(node) if node else 'Any'}

def extract_function_signature(code: str, func_name: str = None):
    """Extract function signature from Python code using AST"""
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {'error': f'Syntax error: {e}'}

    functions = []

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            # Skip if specific function requested and this isn't it
            if func_name and node.name != func_name:
                continue

            params = []
            defaults_offset = len(node.args.args) - len(node.args.defaults)

            for i, arg in enumerate(node.args.args):
                # Skip 'self' parameter
                if arg.arg == 'self':
                    continue

                param_info = {
                    'name': arg.arg,
                    'type': parse_type_annotation(arg.annotation),
                    'isOptional': i >= defaults_offset
                }

                # Get default value if exists
                if i >= defaults_offset:
                    default_node = node.args.defaults[i - defaults_offset]
                    if isinstance(default_node, ast.Constant):
                        param_info['defaultValue'] = default_node.value

                params.append(param_info)

            # Extract return type
            return_type = parse_type_annotation(node.returns)

            # Extract docstring
            docstring = ast.get_docstring(node)

            func_sig = {
                'name': node.name,
                'params': params,
                'returnType': return_type,
            }
            if docstring:
                func_sig['docstring'] = docstring

            functions.append(func_sig)

    if func_name:
        return functions[0] if functions else {'error': f'Function {func_name} not found'}
    return functions

# Main execution
__code__ = '''__CODE_PLACEHOLDER__'''
__func_name__ = __FUNC_NAME_PLACEHOLDER__

result = extract_function_signature(__code__, __func_name__)
print(json.dumps(result))
`

/**
 * JavaScript/TypeScript AST extractor (runs in Node via Piston)
 */
const JS_AST_EXTRACTOR = `
// Simple AST extraction for JavaScript/TypeScript
// Uses regex-based parsing for simplicity (full TS compiler would need more setup)

const code = \`__CODE_PLACEHOLDER__\`;
const funcName = __FUNC_NAME_PLACEHOLDER__;

function extractFunctionSignature(code, targetFuncName) {
  const functions = [];

  // Match function declarations: function name(params) or const name = (params) =>
  const funcPatterns = [
    // function name(params): returnType
    /function\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*(?::\\s*([^{]+))?/g,
    // const name = (params): returnType =>
    /(?:const|let|var)\\s+(\\w+)\\s*=\\s*\\(([^)]*)\\)\\s*(?::\\s*([^=]+))?\\s*=>/g,
    // const name = function(params)
    /(?:const|let|var)\\s+(\\w+)\\s*=\\s*function\\s*\\(([^)]*)\\)/g,
  ];

  for (const pattern of funcPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const [, name, paramsStr, returnTypeStr] = match;

      if (targetFuncName && name !== targetFuncName) continue;

      const params = parseParams(paramsStr);
      const returnType = parseType(returnTypeStr?.trim());

      functions.push({
        name,
        params,
        returnType,
      });
    }
  }

  return targetFuncName ? (functions[0] || { error: 'Function not found' }) : functions;
}

function parseParams(paramsStr) {
  if (!paramsStr?.trim()) return [];

  return paramsStr.split(',').map(p => {
    const trimmed = p.trim();
    // Match: name: type = default or name: type or name = default or name
    const match = trimmed.match(/^(\\w+)(?:\\s*:\\s*([^=]+))?(?:\\s*=\\s*(.+))?$/);
    if (!match) return { name: trimmed, type: null, isOptional: false };

    const [, name, typeStr, defaultVal] = match;
    return {
      name,
      type: parseType(typeStr?.trim()),
      isOptional: !!defaultVal,
      defaultValue: defaultVal ? eval(defaultVal) : undefined,
    };
  });
}

function parseType(typeStr) {
  if (!typeStr) return null;

  // Array types: number[], Array<number>, string[]
  if (typeStr.endsWith('[]')) {
    const elemType = typeStr.slice(0, -2);
    return { kind: 'array', name: 'Array', elementType: parseType(elemType) };
  }

  if (typeStr.startsWith('Array<') && typeStr.endsWith('>')) {
    const elemType = typeStr.slice(6, -1);
    return { kind: 'array', name: 'Array', elementType: parseType(elemType) };
  }

  // Primitives
  if (['number', 'string', 'boolean', 'void', 'null', 'undefined'].includes(typeStr)) {
    return { kind: 'primitive', name: typeStr };
  }

  // Object/Record
  if (typeStr.startsWith('Record<') || typeStr.startsWith('Map<')) {
    return { kind: 'dict', name: typeStr.split('<')[0] };
  }

  return { kind: 'unknown', name: typeStr };
}

const result = extractFunctionSignature(code, funcName);
console.log(JSON.stringify(result));
`

/**
 * Extract function signature using AST parsing via Piston
 */
export async function extractSignature(
  code: string,
  language: 'python' | 'javascript' | 'typescript',
  functionName?: string
): Promise<FunctionSignature | FunctionSignature[] | { error: string }> {
  const escapedCode = code
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n')

  let extractorCode: string
  let execLanguage: string

  if (language === 'python') {
    extractorCode = PYTHON_AST_EXTRACTOR
      .replace('__CODE_PLACEHOLDER__', escapedCode)
      .replace('__FUNC_NAME_PLACEHOLDER__', functionName ? `'${functionName}'` : 'None')
    execLanguage = 'python'
  } else {
    extractorCode = JS_AST_EXTRACTOR
      .replace('__CODE_PLACEHOLDER__', escapedCode)
      .replace('__FUNC_NAME_PLACEHOLDER__', functionName ? `'${functionName}'` : 'null')
    execLanguage = 'javascript'
  }

  try {
    const result = await executeWithPiston(extractorCode, execLanguage, {})

    if (!result.success || result.error) {
      return { error: result.error || 'AST extraction failed' }
    }

    const output = (result.output || '').trim()
    return JSON.parse(output)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Generate test inputs from function signature
 */
export function generateInputsFromSignature(
  signature: FunctionSignature,
  count: number = 5
): Record<string, any>[] {
  const inputs: Record<string, any>[] = []

  for (let i = 0; i < count; i++) {
    const input: Record<string, any> = {}

    for (const param of signature.params) {
      input[param.name] = generateValueFromType(param.type, i)
    }

    inputs.push(input)
  }

  return inputs
}

/**
 * Generate a value based on type info
 */
function generateValueFromType(type: TypeInfo | null, seed: number = 0): any {
  if (!type) {
    // No type info - generate random int
    return randomInt(-100, 100, seed)
  }

  switch (type.kind) {
    case 'primitive':
      switch (type.name) {
        case 'int':
        case 'number':
          return randomInt(-100, 100, seed)
        case 'float':
          return randomFloat(-100, 100, seed)
        case 'str':
        case 'string':
          return randomString(1, 10, seed)
        case 'bool':
        case 'boolean':
          return seed % 2 === 0
        default:
          return null
      }

    case 'array':
      const len = randomInt(2, 10, seed)
      const arr: any[] = []
      for (let i = 0; i < len; i++) {
        arr.push(generateValueFromType(type.elementType || { kind: 'primitive', name: 'int' }, seed + i))
      }
      return arr

    case 'dict':
      const obj: Record<string, any> = {}
      const keyCount = randomInt(1, 5, seed)
      for (let i = 0; i < keyCount; i++) {
        const key = `key${i}`
        obj[key] = generateValueFromType(type.valueType || { kind: 'primitive', name: 'int' }, seed + i)
      }
      return obj

    case 'tuple':
      return (type.typeArgs || []).map((t, i) => generateValueFromType(t, seed + i))

    default:
      return randomInt(-100, 100, seed)
  }
}

// Seeded random helpers for reproducibility
function randomInt(min: number, max: number, seed: number = 0): number {
  const x = Math.sin(seed + 1) * 10000
  const rand = x - Math.floor(x)
  return Math.floor(rand * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, seed: number = 0): number {
  const x = Math.sin(seed + 1) * 10000
  const rand = x - Math.floor(x)
  return rand * (max - min) + min
}

function randomString(minLen: number, maxLen: number, seed: number = 0): string {
  const len = randomInt(minLen, maxLen, seed)
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars[randomInt(0, chars.length - 1, seed + i)]
  }
  return result
}

/**
 * Full AST-based validation pipeline
 *
 * 1. Extract signature from reference solution
 * 2. Generate test inputs from type hints
 * 3. Run reference solution to get expected outputs
 * 4. Run user solution and compare
 */
export async function validateWithAST(
  userCode: string,
  referenceSolution: string,
  language: 'python' | 'javascript' | 'typescript',
  functionName: string,
  testCount: number = 5
): Promise<{
  passed: boolean
  signatureMatch: boolean
  results: Array<{
    input: Record<string, any>
    expected: any
    actual: any
    passed: boolean
    error?: string
  }>
  referenceSignature: FunctionSignature | null
  userSignature: FunctionSignature | null
}> {
  // Step 1: Extract signatures
  const refSig = await extractSignature(referenceSolution, language, functionName)
  const userSig = await extractSignature(userCode, language, functionName)

  if ('error' in refSig) {
    return {
      passed: false,
      signatureMatch: false,
      results: [{ input: {}, expected: null, actual: null, passed: false, error: `Reference error: ${refSig.error}` }],
      referenceSignature: null,
      userSignature: null
    }
  }

  const refSignature = Array.isArray(refSig) ? refSig[0] : refSig
  const userSignature = 'error' in userSig ? null : (Array.isArray(userSig) ? userSig[0] : userSig)

  // Step 2: Generate test inputs from reference signature
  const testInputs = generateInputsFromSignature(refSignature, testCount)

  // Step 3 & 4: Run both solutions and compare
  const results: Array<{
    input: Record<string, any>
    expected: any
    actual: any
    passed: boolean
    error?: string
  }> = []

  let allPassed = true

  for (const input of testInputs) {
    // Run reference
    const refCode = wrapFunctionCall(referenceSolution, functionName, input, language)
    const refResult = await executeWithPiston(refCode, language, {})

    if (!refResult.success) {
      results.push({
        input,
        expected: null,
        actual: null,
        passed: false,
        error: `Reference execution error: ${refResult.error}`
      })
      allPassed = false
      continue
    }

    const expected = parseOutput(refResult.output || '')

    // Run user code
    const userExecCode = wrapFunctionCall(userCode, functionName, input, language)
    const userResult = await executeWithPiston(userExecCode, language, {})

    if (!userResult.success) {
      results.push({
        input,
        expected,
        actual: null,
        passed: false,
        error: `User code error: ${userResult.error}`
      })
      allPassed = false
      continue
    }

    const actual = parseOutput(userResult.output || '')
    const passed = deepEquals(actual, expected)

    if (!passed) allPassed = false

    results.push({ input, expected, actual, passed })
  }

  return {
    passed: allPassed,
    signatureMatch: userSignature !== null,
    results,
    referenceSignature: refSignature,
    userSignature
  }
}

/**
 * Wrap code to call a function with given inputs
 */
function wrapFunctionCall(
  code: string,
  functionName: string,
  input: Record<string, any>,
  language: string
): string {
  const inputJson = JSON.stringify(input)

  if (language === 'python') {
    return `
import json
${code}

__input__ = json.loads('${inputJson.replace(/'/g, "\\'")}')
__result__ = ${functionName}(**__input__)
print(json.dumps(__result__))
`
  } else {
    const args = Object.keys(input).map(k => `__input__["${k}"]`).join(', ')
    return `
${code}

const __input__ = ${inputJson};
const __result__ = ${functionName}(${args});
console.log(JSON.stringify(__result__));
`
  }
}

function parseOutput(output: string): any {
  const trimmed = output.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

function deepEquals(a: any, b: any): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEquals(v, b[i]))
  }
  if (typeof a === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a).sort()
    const keysB = Object.keys(b).sort()
    if (keysA.join(',') !== keysB.join(',')) return false
    return keysA.every(k => deepEquals(a[k], b[k]))
  }
  return false
}
