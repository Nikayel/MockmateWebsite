/**
 * Piston API Integration for Secure Code Execution
 *
 * Piston runs code in isolated Docker containers - no access to:
 * - Environment variables (API keys safe!)
 * - Filesystem
 * - Network (outbound requests blocked)
 * - Other processes
 */

const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston'

// Language mappings for Piston
const LANGUAGE_CONFIG: Record<string, { language: string; version: string }> = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
}

export interface PistonExecuteResult {
  success: boolean
  output: string | null
  error: string | null
  executionTime?: number
}

export interface PistonResponse {
  run: {
    stdout: string
    stderr: string
    code: number
    signal: string | null
    output: string
  }
  compile?: {
    stdout: string
    stderr: string
    code: number
  }
}

/**
 * Execute code securely using Piston API
 */
export async function executeWithPiston(
  code: string,
  language: string,
  testInput: any
): Promise<PistonExecuteResult> {
  const langConfig = LANGUAGE_CONFIG[language]

  if (!langConfig) {
    return {
      success: false,
      output: null,
      error: `Unsupported language: ${language}`,
    }
  }

  // Wrap code to handle input/output
  const wrappedCode = wrapCodeForExecution(code, language, testInput)

  try {
    const startTime = Date.now()

    const response = await fetch(`${PISTON_API_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ content: wrappedCode }],
        stdin: '',
        run_timeout: 5000, // 5 second timeout
        compile_timeout: 5000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        output: null,
        error: `Piston API error: ${response.status} - ${errorText}`,
      }
    }

    const result: PistonResponse = await response.json()
    const executionTime = Date.now() - startTime

    // Check for compilation errors (TypeScript)
    if (result.compile && result.compile.code !== 0) {
      return {
        success: false,
        output: null,
        error: `Compilation error: ${result.compile.stderr || result.compile.stdout}`,
        executionTime,
      }
    }

    // Check for runtime errors
    if (result.run.code !== 0 || result.run.stderr) {
      return {
        success: false,
        output: null,
        error: result.run.stderr || `Process exited with code ${result.run.code}`,
        executionTime,
      }
    }

    return {
      success: true,
      output: result.run.stdout.trim(),
      error: null,
      executionTime,
    }
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Failed to execute code',
    }
  }
}

/**
 * Wrap user code to execute with test inputs and capture output
 */
function wrapCodeForExecution(code: string, language: string, testInput: any): string {
  const inputValues = Object.values(testInput)
  const inputJson = JSON.stringify(inputValues)

  if (language === 'python') {
    // Extract function name from Python code
    const funcMatch = code.match(/def\s+(\w+)\s*\(/)
    const funcName = funcMatch ? funcMatch[1] : 'solution'

    return `
import json

${code}

# Execute with test input
try:
    _input = json.loads('${inputJson.replace(/'/g, "\\'")}')
    _result = ${funcName}(*_input)
    print(json.dumps(_result))
except Exception as e:
    import sys
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`
  }

  // JavaScript/TypeScript
  // Try to find the function name or use common patterns
  const funcMatch = code.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|let\s+(\w+)\s*=|var\s+(\w+)\s*=)/)
  const funcName = funcMatch ? (funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4]) : null

  return `
${code}

// Execute with test input
try {
  const _input = ${inputJson};
  let _func;

  // Try to find the function
  ${funcName ? `if (typeof ${funcName} === 'function') _func = ${funcName};` : ''}
  if (!_func && typeof solution === 'function') _func = solution;
  if (!_func && typeof twoSum === 'function') _func = twoSum;
  if (!_func && typeof main === 'function') _func = main;

  // For bugfix scenarios - look for common function names
  if (!_func && typeof processAdjacentPairs === 'function') _func = processAdjacentPairs;
  if (!_func && typeof getUserEmailFormatted === 'function') _func = getUserEmailFormatted;

  // Last resort: find any function in global scope
  if (!_func) {
    const funcNames = Object.keys(this).filter(k => typeof this[k] === 'function' && k !== 'eval');
    if (funcNames.length > 0) _func = this[funcNames[0]];
  }

  if (typeof _func !== 'function') {
    console.error('ERROR: No callable function found');
    process.exit(1);
  }

  const _result = _func(..._input);
  console.log(JSON.stringify(_result));
} catch (e) {
  console.error('ERROR: ' + e.message);
  process.exit(1);
}
`
}

/**
 * Parse the output from Piston execution
 */
export function parseExecutionOutput(output: string): any {
  try {
    return JSON.parse(output)
  } catch {
    // If not valid JSON, return as-is
    return output
  }
}
