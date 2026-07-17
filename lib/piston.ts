/**
 * @deprecated Server-side **Piston** execution is DEPRECATED in favor of the client-side runners
 * in `lib/workspace-execution` (`executeScenarioInBrowser` → Pyodide for Python, a JS/TS browser
 * sandbox). The interview flow already runs client-side-first; this module is retained ONLY because
 * Labs `BuildStation` (`components/labs/stations/BuildStation.tsx`) and the AST validators
 * (`lib/validators/ast-validator.ts`, `ast-parser.ts`) still call it. Do NOT add new callers — wire
 * `executeScenarioInBrowser` instead. Slated for removal once those consumers migrate; kept for
 * reference. (Pure utilities re-used by live code — `isExecutionServiceError`,
 * `PYTHON_WRAPPER_LINE_OFFSET`, the `ConsoleLog` type — are NOT deprecated.)
 *
 * Piston API Integration for Secure Code Execution
 *
 * Piston runs code in isolated Docker containers - no access to:
 * - Environment variables (API keys safe!)
 * - Filesystem
 * - Network (outbound requests blocked)
 * - Other processes
 */

const PISTON_API_URL = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston"

/**
 * @deprecated Describes THIS module's Python wrapper (`buildPythonWrapper` below), which
 * only the unwired Piston fallback runs. Code the learner sees executed comes from
 * `lib/workspace-execution/python-sandbox`, whose preamble is a different length — import
 * `PYTHON_WRAPPER_LINE_OFFSET` from there instead. `CodeConsole` imported this one and
 * reported every Python error line 23 lines off.
 */
export const PYTHON_WRAPPER_LINE_OFFSET = 93

/**
 * @deprecated Same trap as {@link PYTHON_WRAPPER_LINE_OFFSET}: this counts Piston's JS
 * wrapper, not the browser sandbox's. Import `JAVASCRIPT_WRAPPER_LINE_OFFSET` from
 * `lib/workspace-execution` instead.
 */
export const JAVASCRIPT_WRAPPER_LINE_OFFSET = 110

/**
 * Dedent code by removing consistent leading whitespace from all lines.
 * This prevents IndentationError when user code has extra leading indentation.
 * Also normalizes tabs to spaces for Python compatibility.
 */
function dedentCode(code: string): string {
  // Normalize tabs to 4 spaces (Python standard)
  code = code.replace(/\t/g, "    ")

  const lines = code.split("\n")

  // Find minimum indentation (ignoring empty lines)
  let minIndent = Infinity
  for (const line of lines) {
    if (line.trim().length === 0) continue // Skip empty lines
    const match = line.match(/^(\s*)/)
    if (match) {
      minIndent = Math.min(minIndent, match[1].length)
    }
  }

  // If no indentation found or all lines empty, return as-is
  if (minIndent === Infinity || minIndent === 0) {
    return code
  }

  // Remove the common leading whitespace from all lines
  return lines
    .map((line) => {
      if (line.trim().length === 0) return "" // Keep empty lines empty
      return line.slice(minIndent)
    })
    .join("\n")
}

// Language mappings for Piston
const LANGUAGE_CONFIG: Record<string, { language: string; version: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  typescript: { language: "typescript", version: "5.0.3" },
  python: { language: "python", version: "3.10.0" },
}

export interface ConsoleLog {
  type: "log" | "error" | "warn" | "info"
  message: string
  timestamp: number
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

export interface PistonFile {
  name?: string
  content: string
}

// Retry configuration for handling Piston rate limits
const MAX_RETRIES = 3
const BASE_DELAY_MS = 500 // 500ms, 1s, 2s exponential backoff

const EXECUTION_SERVICE_ERROR_PATTERNS = [
  "Code execution failed (401)",
  "Code execution failed (5",
  "temporarily unavailable",
  "whitelist",
  "Piston",
  "code execution service",
  "Unable to connect to code execution",
  "Code execution failed after multiple attempts",
]

/**
 * Returns true if the error is due to the execution service being unavailable
 * (e.g. Piston 401/5xx, whitelist, timeout), not due to the user's code.
 */
export function isExecutionServiceError(errorMessage: string | null | undefined): boolean {
  if (!errorMessage || typeof errorMessage !== "string") return false
  const lower = errorMessage.toLowerCase()
  return EXECUTION_SERVICE_ERROR_PATTERNS.some((p) => lower.includes(p.toLowerCase()))
}

/**
 * Execute code securely using Piston API
 * Includes retry logic with exponential backoff for rate limit errors (429)
 */
export async function executeWithPiston(
  code: string,
  language: string,
  testInput: any
): Promise<PistonExecuteResult> {
  // Wrap code to handle input/output
  const wrappedCode = wrapCodeForExecution(code, language, testInput)
  return executePistonFiles([{ content: wrappedCode }], language)
}

export async function executeFilesWithPiston(
  files: PistonFile[],
  language: string
): Promise<PistonExecuteResult> {
  return executePistonFiles(files, language)
}

async function executePistonFiles(
  files: PistonFile[],
  language: string
): Promise<PistonExecuteResult> {
  const langConfig = LANGUAGE_CONFIG[language]

  if (!langConfig) {
    return {
      success: false,
      output: null,
      error: `Unsupported language: ${language}`,
    }
  }

  const startTime = Date.now()

  // Retry loop for rate limit errors
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second total timeout

      const response = await fetch(`${PISTON_API_URL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: langConfig.language,
          version: langConfig.version,
          files,
          stdin: "",
          run_timeout: 5000, // 5 second timeout for code execution
          compile_timeout: 5000,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Handle rate limiting with retry
      if (response.status === 429) {
        if (attempt < MAX_RETRIES - 1) {
          // Exponential backoff with jitter: 500ms, 1s, 2s + random 0-200ms
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue // Retry
        }
        // Final attempt failed
        return {
          success: false,
          output: null,
          error: "Code execution service is busy. Please try again in a few seconds.",
        }
      }

      // Handle server errors with retry
      if (response.status >= 500) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue // Retry
        }
        return {
          success: false,
          output: null,
          error: "Code execution service is temporarily unavailable. Please try again.",
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          output: null,
          error: `Code execution failed (${response.status}): ${errorText}`,
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
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            output: null,
            error:
              "Code execution timed out. Try simplifying your solution or check for infinite loops.",
          }
        }
        // Network errors - retry on transient failures
        if (
          error.message.includes("fetch") ||
          error.message.includes("network") ||
          error.message.includes("ECONNREFUSED")
        ) {
          if (attempt < MAX_RETRIES - 1) {
            const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue // Retry
          }
          return {
            success: false,
            output: null,
            error:
              "Unable to connect to code execution service. Please check your connection and try again.",
          }
        }
        return {
          success: false,
          output: null,
          error: error.message,
        }
      }
      return {
        success: false,
        output: null,
        error: "An unexpected error occurred while running your code.",
      }
    }
  }

  // Should not reach here, but just in case
  return {
    success: false,
    output: null,
    error: "Code execution failed after multiple attempts.",
  }
}

/**
 * Wrap user code to execute with test inputs and capture output
 * Also captures console.log/warn/error calls for display in the console panel
 */
function wrapCodeForExecution(code: string, language: string, testInput: any): string {
  // Dedent user code to prevent IndentationError from inconsistent whitespace
  code = dedentCode(code)

  const inputKeys = Object.keys(testInput)
  const inputValues = Object.values(testInput)
  const inputJson = JSON.stringify(inputValues)
  const inputKeysJson = JSON.stringify(inputKeys)

  if (language === "python") {
    // Extract function name from Python code
    const funcMatch = code.match(/def\s+(\w+)\s*\(/)
    const funcName = funcMatch ? funcMatch[1] : "solution"

    // Check if this is a class-based problem (has operations and values arrays)
    const isClassBased =
      inputKeys.includes("operations") &&
      inputKeys.includes("values") &&
      Array.isArray(testInput.operations)

    // For class-based problems, extract the class name instead of function name
    // Strategy: Use the class name from operations array (most reliable)
    // This prevents matching helper classes like Node, ListNode, TreeNode, etc.
    let className: string | null = null

    if (isClassBased && testInput.operations && testInput.operations.length > 0) {
      // The first operation is typically the class name (e.g., "LRUCache", "MinStack", "Trie")
      const operationClassName = testInput.operations[0]
      // Find the class definition that matches this name
      const specificClassMatch = code.match(new RegExp(`class\\s+${operationClassName}\\s*[:(]`))
      if (specificClassMatch) {
        className = operationClassName
      }
    }

    // Fallback: if we didn't find a match, find all classes and exclude common helper classes
    if (!className) {
      const allClasses = code.matchAll(/class\s+(\w+)/g)
      const helperClassNames = new Set([
        "Node",
        "ListNode",
        "TreeNode",
        "TrieNode",
        "GraphNode",
        "NestedInteger",
      ])

      for (const match of allClasses) {
        const foundClassName = match[1]
        // Skip common helper classes
        if (!helperClassNames.has(foundClassName)) {
          className = foundClassName
          break
        }
      }

      // Last resort: use the first class found (old behavior)
      if (!className) {
        const classMatch = code.match(/class\s+(\w+)/)
        className = classMatch ? classMatch[1] : null
      }
    }

    // Python wrapper with print capture and common imports/classes for DSA problems
    return `
import json
import sys
import time
from typing import Optional, List, Dict, Set, Tuple, Any
from collections import deque, defaultdict, Counter
import heapq
import math

# Common DSA classes used in problems
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Helper to build tree from array (for test input)
def _build_tree(arr):
    if not arr or len(arr) == 0:
        return None
    if arr[0] is None:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root

# Helper to convert tree to array (for output)
def _tree_to_array(root):
    if not root:
        return []
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    # Remove trailing Nones
    while result and result[-1] is None:
        result.pop()
    return result

# Helper to build linked list from array (for test input)
def _build_list(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    current = head
    for val in arr[1:]:
        current.next = ListNode(val)
        current = current.next
    return head

# Helper to convert linked list to array (for output)
def _list_to_array(head):
    result = []
    current = head
    seen = set()  # Detect cycles
    while current and id(current) not in seen:
        seen.add(id(current))
        result.append(current.val)
        current = current.next
    return result

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
    _input_keys = json.loads('${inputKeysJson.replace(/'/g, "\\'")}')

${
  isClassBased && className
    ? `
    # Class-based problem execution (e.g., LRUCache, MinStack)
    _operations = _input[_input_keys.index('operations')]
    _values = _input[_input_keys.index('values')]
    _results = []
    _instance = None

    for i, op in enumerate(_operations):
        args = _values[i] if i < len(_values) else []
        if op == '${className}' or i == 0:
            # Constructor call
            _instance = ${className}(*args)
            _results.append(None)
        else:
            # Method call
            method = getattr(_instance, op)
            result = method(*args)
            _results.append(result)

    _result = _results
`
    : `
    # Keywords that indicate TreeNode conversion needed
    _tree_keywords = {'root', 'tree', 'node', 'p', 'q', 't1', 't2', 'left', 'right', 'subroot'}
    # Keywords that indicate ListNode conversion needed (includes 'values' used in test cases)
    _list_keywords = {'head', 'list', 'l1', 'l2'}

    # Convert array inputs to TreeNode/ListNode based on parameter name
    _processed_input = []
    for i, arg in enumerate(_input):
        key = _input_keys[i].lower() if i < len(_input_keys) else ''

        if isinstance(arg, list):
            if key in _tree_keywords:
                # Convert to TreeNode when key explicitly indicates a tree
                # Handle empty list explicitly
                if not arg or len(arg) == 0:
                    _processed_input.append(None)
                else:
                    _processed_input.append(_build_tree(arg))
            elif key in _list_keywords:
                # Convert to ListNode when key indicates a linked list
                if not arg or len(arg) == 0:
                    _processed_input.append(None)
                else:
                    _processed_input.append(_build_list(arg))
            else:
                # Default: keep as array (e.g., nums, arr, data)
                _processed_input.append(arg)
        else:
            _processed_input.append(arg)

    _result = ${funcName}(*_processed_input)

    # Check if any input was a tree (to handle None -> [] conversion for tree problems)
    _had_tree_input = False
    for i, arg in enumerate(_input):
        key = _input_keys[i].lower() if i < len(_input_keys) else ''
        if isinstance(arg, list) and key in _tree_keywords:
            _had_tree_input = True
            break

    # Convert TreeNode result back to array for comparison
    if isinstance(_result, TreeNode):
        _result = _tree_to_array(_result)
    # Convert ListNode result back to array for comparison
    elif isinstance(_result, ListNode):
        _result = _list_to_array(_result)
    # If result is None and input was a tree, convert to [] for empty tree
    elif _result is None and _had_tree_input:
        _result = []
`
}

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
  // Check if this is a class-based problem (has operations and values arrays)
  const jsIsClassBased =
    inputKeys.includes("operations") &&
    inputKeys.includes("values") &&
    Array.isArray(testInput.operations)

  // For class-based problems, extract the class name
  // Strategy: Use the class name from operations array (most reliable)
  // This prevents matching helper classes like Node, ListNode, TreeNode, etc.
  let jsClassName: string | null = null

  if (jsIsClassBased && testInput.operations && testInput.operations.length > 0) {
    // The first operation is typically the class name (e.g., "LRUCache", "MinStack", "Trie")
    const operationClassName = testInput.operations[0]
    // Find the class definition that matches this name
    const specificClassMatch = code.match(new RegExp(`class\\s+${operationClassName}\\s*[{(]`))
    if (specificClassMatch) {
      jsClassName = operationClassName
    }
  }

  // Fallback: if we didn't find a match, find all classes and exclude common helper classes
  if (!jsClassName) {
    const allClasses = code.matchAll(/class\s+(\w+)/g)
    const helperClassNames = new Set([
      "Node",
      "ListNode",
      "TreeNode",
      "TrieNode",
      "GraphNode",
      "NestedInteger",
    ])

    for (const match of allClasses) {
      const foundClassName = match[1]
      // Skip common helper classes
      if (!helperClassNames.has(foundClassName)) {
        jsClassName = foundClassName
        break
      }
    }

    // Last resort: use the first class found (old behavior)
    if (!jsClassName) {
      const jsClassMatch = code.match(/class\s+(\w+)/)
      jsClassName = jsClassMatch ? jsClassMatch[1] : null
    }
  }

  // Try to find the function name or use common patterns
  const jsFuncMatch = code.match(
    /(?:function\s+(\w+)|const\s+(\w+)\s*=|let\s+(\w+)\s*=|var\s+(\w+)\s*=)/
  )
  const jsFuncName = jsFuncMatch
    ? jsFuncMatch[1] || jsFuncMatch[2] || jsFuncMatch[3] || jsFuncMatch[4]
    : null

  // JavaScript wrapper with console capture and common DSA classes
  return `
// Common DSA classes used in problems
class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

// Helper to build tree from array
function _buildTree(arr) {
  if (!arr || arr.length === 0 || arr[0] === null) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift();
    if (i < arr.length && arr[i] !== null) {
      node.left = new TreeNode(arr[i]);
      queue.push(node.left);
    }
    i++;
    if (i < arr.length && arr[i] !== null) {
      node.right = new TreeNode(arr[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// Helper to convert tree to array
function _treeToArray(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node) {
      result.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    } else {
      result.push(null);
    }
  }
  // Remove trailing nulls
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop();
  }
  return result;
}

// Helper to build linked list from array
function _buildList(arr) {
  if (!arr || arr.length === 0) return null;
  const head = new ListNode(arr[0]);
  let current = head;
  for (let i = 1; i < arr.length; i++) {
    current.next = new ListNode(arr[i]);
    current = current.next;
  }
  return head;
}

// Helper to convert linked list to array
function _listToArray(head) {
  const result = [];
  let current = head;
  const seen = new Set(); // Detect cycles
  while (current && !seen.has(current)) {
    seen.add(current);
    result.push(current.val);
    current = current.next;
  }
  return result;
}

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
  const _inputKeys = ${inputKeysJson};

${
  jsIsClassBased && jsClassName
    ? `
  // Class-based problem execution (e.g., LRUCache, MinStack)
  const _operations = _input[_inputKeys.indexOf('operations')];
  const _values = _input[_inputKeys.indexOf('values')];
  const _results = [];
  let _instance = null;

  for (let i = 0; i < _operations.length; i++) {
    const op = _operations[i];
    const args = _values[i] || [];
    if (op === '${jsClassName}' || i === 0) {
      // Constructor call
      _instance = new ${jsClassName}(...args);
      _results.push(null);
    } else {
      // Method call
      const result = _instance[op](...args);
      _results.push(result === undefined ? null : result);
    }
  }

  let _result = _results;
`
    : `
  let _func;

  // Try to find the function
  ${jsFuncName ? `if (typeof ${jsFuncName} === 'function') _func = ${jsFuncName};` : ""}
  if (!_func && typeof solution === 'function') _func = solution;
  if (!_func && typeof twoSum === 'function') _func = twoSum;
  if (!_func && typeof main === 'function') _func = main;
  if (!_func && typeof isSameTree === 'function') _func = isSameTree;
  if (!_func && typeof invertTree === 'function') _func = invertTree;

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

  // Keywords that indicate TreeNode/ListNode conversion needed
  const _treeKeywords = new Set(['root', 'tree', 'node', 'p', 'q', 't1', 't2', 'left', 'right', 'subroot']);
  // Includes 'values' which is used in linked list test cases
  const _listKeywords = new Set(['head', 'list', 'l1', 'l2']);

  // Process input - convert arrays to TreeNode/ListNode based on parameter name
  const _processedInput = _input.map((arg, i) => {
    const key = (_inputKeys[i] || '').toLowerCase();

    if (Array.isArray(arg)) {
      if (_treeKeywords.has(key)) {
        // Convert to TreeNode when key explicitly indicates a tree
        return arg.length > 0 ? _buildTree(arg) : null;
      } else if (_listKeywords.has(key)) {
        // Convert to ListNode when key indicates a linked list
        return arg.length > 0 ? _buildList(arg) : null;
      }
      // Default: keep as array (e.g., nums, arr, data)
    }
    return arg;
  });

  let _result = _func(..._processedInput);

  // Check if any input was a tree (to handle null -> [] conversion for tree problems)
  const _hadTreeInput = _processedInput.some((arg, i) => {
    const key = (_inputKeys[i] || '').toLowerCase();
    return Array.isArray(_input[i]) && _treeKeywords.has(key);
  });

  // Convert TreeNode result back to array
  if (_result instanceof TreeNode) {
    _result = _treeToArray(_result);
  }
  // Convert ListNode result back to array
  else if (_result instanceof ListNode) {
    _result = _listToArray(_result);
  }
  // If result is null and input was a tree, convert to [] for empty tree
  else if (_result === null && _hadTreeInput) {
    _result = [];
  }
`
}

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
  const lines = output.trim().split("\n")
  let consoleLogs: ConsoleLog[] = []
  let result: any = null

  for (const line of lines) {
    if (line.startsWith("__LOGS__:")) {
      try {
        consoleLogs = JSON.parse(line.substring("__LOGS__:".length))
      } catch {
        // Ignore parse errors for logs
      }
    } else if (line.startsWith("__RESULT__:")) {
      try {
        result = JSON.parse(line.substring("__RESULT__:".length))
      } catch {
        result = line.substring("__RESULT__:".length)
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
