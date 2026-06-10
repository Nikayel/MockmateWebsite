import type {
  WorkspaceExecutionResult,
  WorkspaceTestResult,
  WorkspaceFileEdit,
  WorkspaceScenario,
  DsaExecutionResult,
  DsaTestResult,
} from "./types"
import { validateResultEnhanced } from "@/lib/validators"
import { overlayWorkspaceFiles } from "./files"

// Strip comments helper
export function stripComments(code: string, language: string): string {
  if (language === "python") {
    let clean = code.replace(/"""[\s\S]*?"""/g, "")
    clean = clean.replace(/'''[\s\S]*?'''/g, "")
    clean = clean
      .split("\n")
      .map((line) => {
        if (/^\s*#/.test(line)) return ""
        const hashIdx = line.indexOf("#")
        if (hashIdx !== -1) {
          const preHash = line.substring(0, hashIdx)
          const singleQuoteCount = (preHash.match(/'/g) || []).length
          const doubleQuoteCount = (preHash.match(/"/g) || []).length
          if (singleQuoteCount % 2 === 0 && doubleQuoteCount % 2 === 0) {
            return preHash.trimEnd()
          }
        }
        return line
      })
      .join("\n")
    return clean
  } else {
    let clean = code.replace(/\/\*[\s\S]*?\*\//g, "")
    clean = clean
      .split("\n")
      .map((line) => {
        if (/^\s*\/\//.test(line)) return ""
        const slashIdx = line.indexOf("//")
        if (slashIdx !== -1) {
          const preSlash = line.substring(0, slashIdx)
          const singleQuoteCount = (preSlash.match(/'/g) || []).length
          const doubleQuoteCount = (preSlash.match(/"/g) || []).length
          const backtickCount = (preSlash.match(/`/g) || []).length
          if (singleQuoteCount % 2 === 0 && doubleQuoteCount % 2 === 0 && backtickCount % 2 === 0) {
            return preSlash.trimEnd()
          }
        }
        return line
      })
      .join("\n")
    return clean
  }
}

// Helper to transpile TS client-side (calls transpile API endpoint)
async function transpileIfNeeded(code: string, language: string): Promise<string> {
  if (language !== "typescript") {
    return code
  }

  try {
    const response = await fetch("/api/transpile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || "Transpilation failed")
    }

    const data = await response.json()
    return data.code
  } catch (error) {
    throw new Error(
      `TypeScript Transpilation Error: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

// Function to execute wrapped code string in Web Worker with a 5s timeout
export function runInWorker(
  workerData: { code?: string; files?: { path: string; content: string }[]; entrypoint?: string },
  timeoutMs = 5000
): Promise<{ success: boolean; result?: any; logs: any[]; error?: string }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ success: false, logs: [], error: "Execution environment is not browser" })
      return
    }

    let worker: Worker
    try {
      worker = new Worker("/workers/js-sandbox-worker.js")
    } catch (err) {
      resolve({ success: false, logs: [], error: `Failed to spawn Web Worker: ${err}` })
      return
    }

    const timer = setTimeout(() => {
      worker.terminate()
      resolve({
        success: false,
        logs: [],
        error: "Code execution timed out. Try checking for infinite loops.",
      })
    }, timeoutMs)

    worker.onmessage = (e) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(e.data)
    }

    worker.onerror = (err) => {
      clearTimeout(timer)
      worker.terminate()
      resolve({
        success: false,
        logs: [],
        error: err.message || "Unknown worker error",
      })
    }

    worker.postMessage(workerData)
  })
}

function buildJsWrapper(code: string, testCase: any, cleanCode: string): string {
  const inputKeys = Object.keys(testCase.input)
  const inputValues = Object.values(testCase.input)
  const inputJson = JSON.stringify(inputValues)
  const inputKeysJson = JSON.stringify(inputKeys)

  // Check if class-based problem
  const isClassBased =
    inputKeys.includes("operations") &&
    inputKeys.includes("values") &&
    Array.isArray(testCase.input.operations)

  let className: string | null = null
  if (isClassBased && testCase.input.operations && testCase.input.operations.length > 0) {
    const operationClassName = testCase.input.operations[0]
    const specificClassMatch = cleanCode.match(new RegExp(`class\\s+${operationClassName}\\s*[{(]`))
    if (specificClassMatch) {
      className = operationClassName
    }
  }

  if (!className && isClassBased) {
    const allClasses = cleanCode.matchAll(/class\s+(\w+)/g)
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
      if (!helperClassNames.has(foundClassName)) {
        className = foundClassName
        break
      }
    }
    if (!className) {
      const classMatch = cleanCode.match(/class\s+(\w+)/)
      className = classMatch ? classMatch[1] : null
    }
  }

  const jsFuncMatch = cleanCode.match(
    /(?:function\s+(\w+)|const\s+(\w+)\s*=|let\s+(\w+)\s*=|var\s+(\w+)\s*=)/
  )
  const jsFuncName = jsFuncMatch
    ? jsFuncMatch[1] || jsFuncMatch[2] || jsFuncMatch[3] || jsFuncMatch[4]
    : null

  return `
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
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop();
  }
  return result;
}

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

function _listToArray(head) {
  const result = [];
  let current = head;
  const seen = new Set();
  while (current && !seen.has(current)) {
    seen.add(current);
    result.push(current.val);
    current = current.next;
  }
  return result;
}

${code}

const _input = ${inputJson};
const _inputKeys = ${inputKeysJson};

${
  isClassBased && className
    ? `
  const _operations = _input[_inputKeys.indexOf('operations')];
  const _values = _input[_inputKeys.indexOf('values')];
  const _results = [];
  let _instance = null;

  for (let i = 0; i < _operations.length; i++) {
    const op = _operations[i];
    const args = _values[i] || [];
    if (op === '${className}' || i === 0) {
      _instance = new ${className}(...args);
      _results.push(null);
    } else {
      const result = _instance[op](...args);
      _results.push(result === undefined ? null : result);
    }
  }
  return _results;
`
    : `
  let _func;
  ${jsFuncName ? `if (typeof ${jsFuncName} === 'function') _func = ${jsFuncName};` : ""}
  if (!_func && typeof solution === 'function') _func = solution;
  if (!_func && typeof twoSum === 'function') _func = twoSum;
  if (!_func && typeof main === 'function') _func = main;
  if (!_func && typeof isSameTree === 'function') _func = isSameTree;
  if (!_func && typeof invertTree === 'function') _func = invertTree;
  if (!_func && typeof processAdjacentPairs === 'function') _func = processAdjacentPairs;
  if (!_func && typeof getUserEmailFormatted === 'function') _func = getUserEmailFormatted;

  if (!_func) {
    const funcNames = Object.keys(this).filter(k => typeof this[k] === 'function' && k !== 'eval' && k !== '_buildTree' && k !== '_treeToArray' && k !== '_buildList' && k !== '_listToArray');
    if (funcNames.length > 0) _func = this[funcNames[0]];
  }

  if (typeof _func !== 'function') {
    throw new Error('No callable function found');
  }

  const _treeKeywords = new Set(['root', 'tree', 'node', 'p', 'q', 't1', 't2', 'left', 'right', 'subroot']);
  const _listKeywords = new Set(['head', 'list', 'l1', 'l2']);

  const _processedInput = _input.map((arg, i) => {
    const key = (_inputKeys[i] || '').toLowerCase();
    if (Array.isArray(arg)) {
      if (_treeKeywords.has(key)) return arg.length > 0 ? _buildTree(arg) : null;
      if (_listKeywords.has(key)) return arg.length > 0 ? _buildList(arg) : null;
    }
    return arg;
  });

  let _result = _func(..._processedInput);

  const _hadTreeInput = _processedInput.some((arg, i) => {
    const key = (_inputKeys[i] || '').toLowerCase();
    return Array.isArray(_input[i]) && _treeKeywords.has(key);
  });

  if (_result instanceof TreeNode) {
    _result = _treeToArray(_result);
  } else if (_result instanceof ListNode) {
    _result = _listToArray(_result);
  } else if (_result === null && _hadTreeInput) {
    _result = [];
  }

  return _result;
`
}
`
}

export async function executeJsClientSide(
  code: string,
  language: string,
  testCases: any[],
  scenarioId: string
): Promise<DsaExecutionResult> {
  const results: DsaTestResult[] = []
  let allPassed = true
  let allConsoleLogs: any[] = []

  try {
    const jsCode = await transpileIfNeeded(code, language)
    const cleanCode = stripComments(jsCode, "javascript")

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      const wrappedCode = buildJsWrapper(jsCode, testCase, cleanCode)

      const runResult = await runInWorker({ code: wrappedCode })

      if (runResult.logs && runResult.logs.length > 0) {
        allConsoleLogs = [...allConsoleLogs, ...runResult.logs]
      }

      if (!runResult.success || runResult.error) {
        allPassed = false
        results.push({
          description: testCase.description || `Test case ${i + 1}`,
          input: testCase.input,
          expected: testCase.expected,
          actual: null,
          passed: false,
          error: runResult.error || "Execution failed",
        })
        continue
      }

      const parsedActual = runResult.result
      const validation = validateResultEnhanced(parsedActual, testCase, scenarioId, "javascript")

      if (!validation.passed) {
        allPassed = false
      }

      results.push({
        description: testCase.description || `Test case ${i + 1}`,
        input: testCase.input,
        expected: testCase.expected,
        actual: parsedActual,
        passed: validation.passed,
        error: validation.reason || null,
      })
    }

    const passedCount = results.filter((r) => r.passed).length
    const totalCount = results.length
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

    return {
      success: allPassed,
      results,
      consoleLogs: allConsoleLogs,
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        passRate,
        serviceErrors: 0,
        effectiveTotal: totalCount,
      },
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      results: [],
      consoleLogs: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 },
      error: err instanceof Error ? err.message : "Failed to execute JavaScript client-side",
    }
  }
}

export async function executeWorkspaceScenarioJsClientSide(
  scenario: WorkspaceScenario,
  edits: WorkspaceFileEdit[]
): Promise<WorkspaceExecutionResult> {
  let allConsoleLogs: any[] = []
  try {
    const files = overlayWorkspaceFiles(scenario, edits)
    const runner = files.find((file) => file.path === scenario.workspace.testRunnerPath)
    if (!runner) {
      throw new Error(`Workspace runner not found: ${scenario.workspace.testRunnerPath}`)
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const isTS = file.path.endsWith(".ts") || file.path.endsWith(".tsx")
        const cleanPath = file.path.replace(/\.tsx?$/, ".js")

        let content = file.content
        if (isTS) {
          content = await transpileIfNeeded(content, "typescript")
        }

        return {
          path: cleanPath,
          content,
        }
      })
    )

    const cleanRunnerPath = runner.path.replace(/\.tsx?$/, ".js")

    const runResult = await runInWorker({
      entrypoint: cleanRunnerPath,
      files: processedFiles,
    })

    if (runResult.logs && runResult.logs.length > 0) {
      allConsoleLogs = runResult.logs
    }

    if (!runResult.success || runResult.error) {
      return {
        success: false,
        results: [
          {
            suite: "workspace",
            name: "Workspace test runner",
            passed: false,
            error: runResult.error || "Execution failed",
          },
        ],
        consoleLogs: allConsoleLogs.map((log) => ({
          ...log,
          message: log.message.startsWith("__WORKSPACE_TEST_RESULTS__:") ? "" : log.message,
        })),
        summary: {
          total: 1,
          passed: 0,
          failed: 1,
          passRate: 0,
          serviceErrors: 0,
          effectiveTotal: 1,
        },
        error: null,
      }
    }

    const results: WorkspaceTestResult[] = []
    const cleanLogs: any[] = []

    for (const log of allConsoleLogs) {
      const message = log.message || ""
      if (message.startsWith("__WORKSPACE_TEST_RESULTS__:")) {
        try {
          const parsed = JSON.parse(message.slice("__WORKSPACE_TEST_RESULTS__:".length))
          if (Array.isArray(parsed)) {
            results.push(...parsed)
          }
        } catch {
          // ignore parse errors
        }
      } else {
        cleanLogs.push(log)
      }
    }

    const finalResults =
      results.length > 0
        ? results
        : [
            {
              suite: "workspace",
              name: "Workspace test runner",
              passed: false,
              error: "Test runner did not report any test results.",
            },
          ]

    const passedCount = finalResults.filter((r) => r.passed).length
    const totalCount = finalResults.length
    const failedCount = totalCount - passedCount
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

    return {
      success: failedCount === 0,
      results: finalResults,
      consoleLogs: cleanLogs,
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: failedCount,
        passRate,
        serviceErrors: 0,
        effectiveTotal: totalCount,
      },
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      results: [],
      consoleLogs: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 },
      error:
        err instanceof Error ? err.message : "Failed to execute workspace scenario client-side",
    }
  }
}
