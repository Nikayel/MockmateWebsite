export function buildJsWrapper(code: string, testCase: any, cleanCode: string): string {
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
