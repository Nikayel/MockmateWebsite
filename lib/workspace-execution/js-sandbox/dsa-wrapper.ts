/**
 * Lines this module prepends before the learner's code. A stack trace from the sandbox
 * reports positions in the WRAPPER, so the console subtracts this to name a line the
 * learner can actually find in their editor.
 *
 * It lives here, next to the template it counts, because the previous constant lived in
 * `lib/piston.ts` and described PISTON's wrapper (110 lines). Piston's fallback is no
 * longer wired, so every line number the console printed was off by 30.
 * `dsa-wrapper.test.ts` pins this to the template so an edit to the preamble cannot
 * silently desync it again.
 */
export const JAVASCRIPT_WRAPPER_LINE_OFFSET = 80

function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)
}

function getFunctionCandidates(cleanCode: string): string[] {
  const candidates: string[] = []

  // 1. Classic function declarations: function name(...)
  const funcDeclMatches = cleanCode.matchAll(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g)
  for (const match of funcDeclMatches) {
    candidates.push(match[1])
  }

  // 2. Arrow functions: const name = (...) =>
  const arrowFuncMatches = cleanCode.matchAll(
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g
  )
  for (const match of arrowFuncMatches) {
    candidates.push(match[1])
  }

  // 3. Function expressions: const name = function(...)
  const funcExprMatches = cleanCode.matchAll(
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\(/g
  )
  for (const match of funcExprMatches) {
    candidates.push(match[1])
  }

  const helperClassNames = new Set([
    "Node",
    "ListNode",
    "TreeNode",
    "TrieNode",
    "GraphNode",
    "NestedInteger",
    "eval",
    "_buildTree",
    "_treeToArray",
    "_buildList",
    "_listToArray",
  ])

  return Array.from(new Set(candidates)).filter((name) => !helperClassNames.has(name))
}

/**
 * Key names a scenario may use for the method-call list and the per-call argument list.
 *
 * Class detection used to require the literal pair `operations` + `values`. Scenarios that
 * named them anything else fell through to the free-function path, found no free function in
 * a class-only starter, and returned nothing: a CORRECT solution scored 0/N and the candidate
 * was told their code was wrong. dsa-online-stock-span, dsa-max-frequency-stack,
 * dsa-time-based-key-value-store, dsa-implement-trie and dsa-add-search-word were all
 * unsolvable for this reason, with nothing broken on the platform.
 *
 * Aliases rather than rewritten scenario data because these names are the interview-facing
 * vocabulary each problem already uses, and rewriting them risks changing expected outputs.
 */
const CLASS_OPERATION_KEYS = ["operations", "ops"] as const
const CLASS_ARGUMENT_KEYS = ["values", "args"] as const

/**
 * Keys whose value is a tree the CONSTRUCTOR consumes, for problems shaped as "build the
 * structure from this input, then call these methods on it" (dsa-bst-iterator). Mirrors the
 * `_treeKeywords` set used on the free-function path.
 */
const CLASS_CONSTRUCTOR_TREE_KEYS = ["root", "tree"] as const

interface ClassInvocationKeys {
  operationsKey: string
  /** Null when operations take no arguments and the constructor is fed from a named key. */
  argumentsKey: string | null
  /** Set when the constructor's argument is a tree under its own key rather than values[0]. */
  constructorTreeKey: string | null
}

/**
 * Which input keys carry the method-call list and its arguments, or null when this test case
 * is not a class-invocation shape at all.
 */
export function resolveClassInvocationKeys(
  input: Record<string, unknown>
): ClassInvocationKeys | null {
  const operationsKey = CLASS_OPERATION_KEYS.find(
    (key) => key in input && Array.isArray(input[key])
  )
  if (!operationsKey) return null

  const argumentsKey =
    CLASS_ARGUMENT_KEYS.find((key) => key in input && Array.isArray(input[key])) ?? null
  if (argumentsKey) {
    return { operationsKey, argumentsKey, constructorTreeKey: null }
  }

  // No argument list. This is only a class invocation if something else supplies the
  // constructor's input, which for these problems is a tree under its own key.
  const constructorTreeKey =
    CLASS_CONSTRUCTOR_TREE_KEYS.find((key) => key in input && Array.isArray(input[key])) ?? null
  if (!constructorTreeKey) return null

  return { operationsKey, argumentsKey: null, constructorTreeKey }
}

export function buildJsWrapper(
  code: string,
  testCase: any,
  cleanCode: string,
  scenarioId: string
): string {
  const inputKeys = Object.keys(testCase.input)
  const inputValues = Object.values(testCase.input)
  const inputJson = JSON.stringify(inputValues)
  const inputKeysJson = JSON.stringify(inputKeys)

  // Check if class-based problem
  const classKeys = resolveClassInvocationKeys(testCase.input)
  const isClassBased = classKeys !== null
  const operations = classKeys ? (testCase.input[classKeys.operationsKey] as unknown[]) : null

  let className: string | null = null
  if (isClassBased && operations && operations.length > 0) {
    const operationClassName = typeof operations[0] === "string" ? operations[0] : null
    const specificClassMatch =
      operationClassName && cleanCode.match(new RegExp(`class\\s+${operationClassName}\\b`))
    if (operationClassName && specificClassMatch) {
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

  // Classes the candidate declared, so the round-trip probe below can look for a
  // serialize/deserialize pair on each. Helper node types are excluded: constructing them is
  // pointless and TreeNode/ListNode are already declared by this wrapper.
  const roundTripClassNames = [...cleanCode.matchAll(/class\s+(\w+)/g)]
    .map((match) => match[1])
    .filter((name) => !["Node", "ListNode", "TreeNode", "TrieNode", "GraphNode"].includes(name))
    .filter((name) => isValidIdentifier(name))

  const candidates = getFunctionCandidates(cleanCode)
  // Check candidates in reverse order (typically main entry point is defined at/near bottom, helpers at top)
  const candidateChecks = candidates
    .reverse()
    .map((name) => `else if (typeof ${name} === 'function') _func = ${name};`)
    .join("\n  ")

  // Derive target camelCase name from scenario ID
  const cleanId = scenarioId.replace(/^dsa-/, "")
  const camelCasedId = cleanId.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
  const scenarioIdentifier = isValidIdentifier(camelCasedId) ? camelCasedId : null

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
  const _operations = _input[_inputKeys.indexOf('${classKeys?.operationsKey}')];
  const _results = [];
  let _instance = null;
${
  classKeys?.constructorTreeKey
    ? `
  // The constructor consumes a named tree and every operation is a bare method call, so the
  // instance is built up front and no entry in _operations is the constructor.
  const _constructorTree = _input[_inputKeys.indexOf('${classKeys.constructorTreeKey}')];
  _instance = new ${className}(_constructorTree && _constructorTree.length > 0 ? _buildTree(_constructorTree) : null);

  for (let i = 0; i < _operations.length; i++) {
    const result = _instance[_operations[i]]();
    _results.push(result === undefined ? null : result);
  }
`
    : `
  const _values = _input[_inputKeys.indexOf('${classKeys?.argumentsKey}')];

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
`
}
  return _results;
`
    : `
  let _func;
  let _instance;

  // Support LeetCode class Solution style wrappers
  if (typeof Solution === 'function') {
    try {
      _instance = new Solution();
      if (typeof _instance.solution === 'function') {
        _func = _instance.solution.bind(_instance);
      }
      ${scenarioIdentifier ? `else if (typeof _instance.${scenarioIdentifier} === 'function') _func = _instance.${scenarioIdentifier}.bind(_instance);` : ""}
      else if (typeof _instance.twoSum === 'function') _func = _instance.twoSum.bind(_instance);
      else if (typeof _instance.isAnagram === 'function') _func = _instance.isAnagram.bind(_instance);
      else if (typeof _instance.groupAnagrams === 'function') _func = _instance.groupAnagrams.bind(_instance);
      else if (typeof _instance.longestConsecutive === 'function') _func = _instance.longestConsecutive.bind(_instance);
      else if (typeof _instance.firstMissingPositive === 'function') _func = _instance.firstMissingPositive.bind(_instance);
      else if (typeof _instance.majorityElement === 'function') _func = _instance.majorityElement.bind(_instance);
      else if (typeof _instance.nextPermutation === 'function') _func = _instance.nextPermutation.bind(_instance);
      else if (typeof _instance.productExceptSelf === 'function') _func = _instance.productExceptSelf.bind(_instance);
      else if (typeof _instance.rotate === 'function') _func = _instance.rotate.bind(_instance);
      else if (typeof _instance.subarraySum === 'function') _func = _instance.subarraySum.bind(_instance);
      else if (typeof _instance.topKFrequent === 'function') _func = _instance.topKFrequent.bind(_instance);
      else if (typeof _instance.findDuplicates === 'function') _func = _instance.findDuplicates.bind(_instance);
      else if (typeof _instance.main === 'function') _func = _instance.main.bind(_instance);
      else if (typeof _instance.isSameTree === 'function') _func = _instance.isSameTree.bind(_instance);
      else if (typeof _instance.invertTree === 'function') _func = _instance.invertTree.bind(_instance);
      else if (typeof _instance.processAdjacentPairs === 'function') _func = _instance.processAdjacentPairs.bind(_instance);
      else if (typeof _instance.getUserEmailFormatted === 'function') _func = _instance.getUserEmailFormatted.bind(_instance);
      else {
        const methods = Object.getOwnPropertyNames(Solution.prototype).filter(
          m => m !== 'constructor' && typeof _instance[m] === 'function'
        );
        if (methods.length > 0) {
          _func = _instance[methods[0]].bind(_instance);
        }
      }
    } catch (e) {
      // Ignore construction error and fallback to global functions
    }
  }

  // Fallback to global functions/arrow functions/candidates
  if (!_func) {
    if (typeof solution === 'function') _func = solution;
    ${scenarioIdentifier ? `else if (typeof ${scenarioIdentifier} === 'function') _func = ${scenarioIdentifier};` : ""}
    else if (typeof twoSum === 'function') _func = twoSum;
    else if (typeof isAnagram === 'function') _func = isAnagram;
    else if (typeof groupAnagrams === 'function') _func = groupAnagrams;
    else if (typeof longestConsecutive === 'function') _func = longestConsecutive;
    else if (typeof firstMissingPositive === 'function') _func = firstMissingPositive;
    else if (typeof majorityElement === 'function') _func = majorityElement;
    else if (typeof nextPermutation === 'function') _func = nextPermutation;
    else if (typeof productExceptSelf === 'function') _func = productExceptSelf;
    else if (typeof rotate === 'function') _func = rotate;
    else if (typeof subarraySum === 'function') _func = subarraySum;
    else if (typeof topKFrequent === 'function') _func = topKFrequent;
    else if (typeof findDuplicates === 'function') _func = findDuplicates;
    else if (typeof main === 'function') _func = main;
    else if (typeof isSameTree === 'function') _func = isSameTree;
    else if (typeof invertTree === 'function') _func = invertTree;
    else if (typeof processAdjacentPairs === 'function') _func = processAdjacentPairs;
    else if (typeof getUserEmailFormatted === 'function') _func = getUserEmailFormatted;
    ${candidateChecks ? `\n    ${candidateChecks}` : ""}
  }

  if (!_func) {
    const funcNames = Object.keys(this).filter(k => typeof this[k] === 'function' && k !== 'eval' && k !== '_buildTree' && k !== '_treeToArray' && k !== '_buildList' && k !== '_listToArray');
    if (funcNames.length > 0) _func = this[funcNames[0]];
  }

  if (typeof _func !== 'function') {
    throw new Error('No callable function found');
  }

  const _treeKeywords = new Set(['root', 'tree', 'node', 'p', 'q', 't1', 't2', 'left', 'right', 'subroot']);
  const _listKeywords = new Set(['head', 'list', 'l1', 'l2']);

  // Provide the isBadVersion API that dsa-first-bad-version's problem statement and starter
  // both promise. It existed nowhere in the repo, so the documented binary search scored 1/5
  // while a bare "return bad" scored 5/5: the answer was arriving as an undocumented second
  // positional argument, and the scenario graded INVERTED, rewarding a non-answer with full
  // marks and writing that into mastery. Same shape as the tree building above: an input key
  // the harness turns into something the candidate's code can use.
  const _badIndex = _inputKeys.indexOf('bad');
  if (_badIndex !== -1) {
    const _firstBad = _input[_badIndex];
    globalThis.isBadVersion = function (version) { return version >= _firstBad; };
  }

  const _processedInput = _input.map((arg, i) => {
    const key = (_inputKeys[i] || '').toLowerCase();
    if (Array.isArray(arg)) {
      if (_treeKeywords.has(key)) return arg.length > 0 ? _buildTree(arg) : null;
      if (_listKeywords.has(key)) return arg.length > 0 ? _buildList(arg) : null;
    }
    return arg;
  });

  // Round-trip problems: the candidate writes a matched pair and the test asserts that
  // decoding an encoding returns the original. Scanning for the pair on ANY class in scope
  // covers the Codec pattern (class Codec with serialize + deserialize) that
  // dsa-serialize-deserialize-tree and dsa-serialize-deserialize-bst ship. Previously only
  // free encode/decode functions and a Solution instance were recognised, so a correct Codec
  // fell through to the free-function lookup, found nothing, and scored 0.
  function _roundTripFromInstance(_obj) {
    if (!_obj) return null;
    const _pairs = [['serialize', 'deserialize'], ['encode', 'decode']];
    for (const _pair of _pairs) {
      if (typeof _obj[_pair[0]] === 'function' && typeof _obj[_pair[1]] === 'function') {
        return { write: _obj[_pair[0]].bind(_obj), read: _obj[_pair[1]].bind(_obj) };
      }
    }
    return null;
  }

  let _roundTrip = null;
  // Free-function pairs. A typeof check on an undeclared name is safe and does not throw.
  if (typeof serialize === 'function' && typeof deserialize === 'function') {
    _roundTrip = { write: serialize, read: deserialize };
  } else if (typeof encode === 'function' && typeof decode === 'function') {
    _roundTrip = { write: encode, read: decode };
  } else {
    _roundTrip = _roundTripFromInstance(_instance);
${roundTripClassNames
  .map(
    (name) => `    if (!_roundTrip && typeof ${name} === 'function') {
      try { _roundTrip = _roundTripFromInstance(new ${name}()); } catch (e) { /* needs ctor args */ }
    }`
  )
  .join("\n")}
  }

  // Arguments the candidate's function actually receives. An input consumed as a harness
  // affordance is dropped: passing bad positionally is what let a bare "return bad" score 5/5 on
  // dsa-first-bad-version while the real binary search scored 1/5.
  const _callArgs = _processedInput.filter((_, i) => _inputKeys[i] !== 'bad' || _badIndex === -1);

  let _result;
  if (_roundTrip) {
    _result = _roundTrip.read(_roundTrip.write(..._callArgs));
  } else {
    _result = _func(..._callArgs);
  }

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
