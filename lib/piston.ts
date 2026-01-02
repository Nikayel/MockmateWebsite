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

export interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

export interface PistonExecuteResult {
  success: boolean
  output: string | null
  error: string | null
  consoleLogs?: ConsoleLog[]
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
 * Also captures console.log/warn/error calls for display in the console panel
 */
function wrapCodeForExecution(code: string, language: string, testInput: any): string {
  const inputValues = Object.values(testInput)
  const inputJson = JSON.stringify(inputValues)

  if (language === 'python') {
    // Extract function name from Python code
    const funcMatch = code.match(/def\s+(\w+)\s*\(/)
    const funcName = funcMatch ? funcMatch[1] : 'solution'

    // Python wrapper with print capture
    return `
import json
import sys
import time

# Capture print statements
_console_logs = []
_original_print = print

def _capture_print(*args, **kwargs):
    msg = ' '.join(str(a) for a in args)
    _console_logs.append({"type": "log", "message": msg, "timestamp": int(time.time() * 1000)})
    _original_print(*args, **kwargs)

# Override print
print = _capture_print

${code}

# Execute with test input
try:
    _input = json.loads('${inputJson.replace(/'/g, "\\'")}')
    _result = ${funcName}(*_input)
    # Output format: LOGS|||RESULT
    print = _original_print  # Restore for final output
    print("__LOGS__:" + json.dumps(_console_logs))
    print("__RESULT__:" + json.dumps(_result))
except Exception as e:
    import traceback
    tb = traceback.format_exc()
    print = _original_print
    print("__LOGS__:" + json.dumps(_console_logs))
    print(f"ERROR: {str(e)}\\n{tb}", file=sys.stderr)
    sys.exit(1)
`
  }

  // JavaScript/TypeScript
  // Try to find the function name or use common patterns
  const funcMatch = code.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|let\s+(\w+)\s*=|var\s+(\w+)\s*=)/)
  const funcName = funcMatch ? (funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4]) : null

  // JavaScript wrapper with console capture
  return `
// Capture console methods
const _consoleLogs = [];
const _originalLog = console.log;
const _originalWarn = console.warn;
const _originalError = console.error;
const _originalInfo = console.info;

console.log = (...args) => {
  _consoleLogs.push({ type: 'log', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: Date.now() });
  _originalLog.apply(console, args);
};
console.warn = (...args) => {
  _consoleLogs.push({ type: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: Date.now() });
  _originalWarn.apply(console, args);
};
console.error = (...args) => {
  _consoleLogs.push({ type: 'error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: Date.now() });
  _originalError.apply(console, args);
};
console.info = (...args) => {
  _consoleLogs.push({ type: 'info', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: Date.now() });
  _originalInfo.apply(console, args);
};

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
  if (!_func && typeof isSameTree === 'function') _func = isSameTree;

  // For bugfix scenarios - look for common function names
  if (!_func && typeof processAdjacentPairs === 'function') _func = processAdjacentPairs;
  if (!_func && typeof getUserEmailFormatted === 'function') _func = getUserEmailFormatted;

  // Last resort: find any function in global scope
  if (!_func) {
    const funcNames = Object.keys(this).filter(k => typeof this[k] === 'function' && k !== 'eval');
    if (funcNames.length > 0) _func = this[funcNames[0]];
  }

  if (typeof _func !== 'function') {
    console.log = _originalLog;
    console.log('__LOGS__:' + JSON.stringify(_consoleLogs));
    console.error('ERROR: No callable function found');
    process.exit(1);
  }

  const _result = _func(..._input);

  // Restore and output
  console.log = _originalLog;
  console.log('__LOGS__:' + JSON.stringify(_consoleLogs));
  console.log('__RESULT__:' + JSON.stringify(_result));
} catch (e) {
  console.log = _originalLog;
  console.log('__LOGS__:' + JSON.stringify(_consoleLogs));
  console.error('ERROR: ' + e.message + (e.stack ? '\\n' + e.stack : ''));
  process.exit(1);
}
`
}

/**
 * Parse the output from Piston execution
 * Handles the new format with __LOGS__ and __RESULT__ prefixes
 */
export function parseExecutionOutput(output: string): { result: any; consoleLogs: ConsoleLog[] } {
  const lines = output.trim().split('\n')
  let consoleLogs: ConsoleLog[] = []
  let result: any = null

  for (const line of lines) {
    if (line.startsWith('__LOGS__:')) {
      try {
        consoleLogs = JSON.parse(line.substring('__LOGS__:'.length))
      } catch {
        // Ignore parse errors for logs
      }
    } else if (line.startsWith('__RESULT__:')) {
      try {
        result = JSON.parse(line.substring('__RESULT__:'.length))
      } catch {
        result = line.substring('__RESULT__:'.length)
      }
    }
  }

  // Fallback for old format (just JSON result)
  if (result === null && lines.length > 0) {
    const lastLine = lines[lines.length - 1]
    try {
      result = JSON.parse(lastLine)
    } catch {
      result = lastLine
    }
  }

  return { result, consoleLogs }
}
