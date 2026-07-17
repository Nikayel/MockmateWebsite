/**
 * Lines this module prepends before the learner's code. A traceback from Pyodide
 * reports positions in the WRAPPER, so the console subtracts this to name a line the
 * learner can actually find in their editor.
 *
 * It lives here, next to the template it counts, because the previous constant lived in
 * `lib/piston.ts` and described PISTON's wrapper (93 lines). Piston's fallback is no
 * longer wired, so every line number the console printed was off by 23: errors in the
 * first 23 lines of a solution lost their line marker entirely, and anything past that
 * was confidently attributed to the wrong line. `dsa-wrapper.test.ts` pins this to the
 * template so an edit to the preamble cannot silently desync it again.
 */
export const PYTHON_WRAPPER_LINE_OFFSET = 70

/**
 * Embed a value in Python source as a literal it can actually evaluate.
 *
 * `JSON.stringify` is NOT safe here: JSON's `true`/`false`/`null` are not Python
 * names, so interpolating it raw emitted `_input = [3,9,20,null,null,15,7]` and every
 * test case with a boolean or a null died on `NameError: name 'null' is not defined`
 * before the learner's code ran. That silently broke every tree/linked-list DSA
 * scenario (null marks an absent child) and the Learn-Python booleans lessons.
 *
 * Base64 over the UTF-8 bytes sidesteps quoting entirely — no escaping rules to get
 * subtly wrong for a string containing a quote, a newline, or an emoji — and matches
 * how `pack-oracle-runner` already ferries stdout the other way. `json` is imported at
 * the top of the wrapper; `base64` is imported alongside it.
 */
function toPythonLiteral(value: unknown): string {
  const json = JSON.stringify(value) ?? "null"
  const bytes = new TextEncoder().encode(json)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `json.loads(base64.b64decode("${btoa(binary)}").decode("utf-8"))`
}

function toSnakeCase(value: string): string {
  return value
    .replace(/^dsa-/, "")
    .replace(/^bugfix-/, "")
    .replace(/-/g, "_")
}

function getPythonFunctionCandidates(cleanCode: string): string[] {
  const helperNames = new Set([
    "build_tree",
    "tree_to_array",
    "build_list",
    "list_to_array",
    "__init__",
  ])
  const candidates = [...cleanCode.matchAll(/^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm)].map(
    (match) => match[1]
  )

  return Array.from(new Set(candidates)).filter((name) => !helperNames.has(name))
}

export function buildPythonWrapper(
  code: string,
  testCase: unknown,
  cleanCode: string,
  scenarioId: string
): string {
  const record = testCase && typeof testCase === "object" ? (testCase as { input?: unknown }) : {}
  const input = record.input && typeof record.input === "object" ? record.input : {}
  const inputRecord = input as Record<string, unknown>
  const inputKeys = Object.keys(inputRecord)
  const inputValues = Object.values(inputRecord)
  const functionCandidates = getPythonFunctionCandidates(cleanCode)
  const scenarioFunctionName = toSnakeCase(scenarioId)
  const candidates = Array.from(
    new Set([
      "solution",
      scenarioFunctionName,
      "two_sum",
      "is_anagram",
      "group_anagrams",
      "longest_consecutive",
      "first_missing_positive",
      "majority_element",
      "next_permutation",
      "product_except_self",
      "rotate",
      "subarray_sum",
      "top_k_frequent",
      "find_duplicates",
      "main",
      ...functionCandidates.reverse(),
    ])
  )

  return `
import base64
import json

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_tree(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    index = 1
    while queue and index < len(values):
        node = queue.pop(0)
        if index < len(values) and values[index] is not None:
            node.left = TreeNode(values[index])
            queue.append(node.left)
        index += 1
        if index < len(values) and values[index] is not None:
            node.right = TreeNode(values[index])
            queue.append(node.right)
        index += 1
    return root

def tree_to_array(root):
    if root is None:
        return []
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node is None:
            result.append(None)
        else:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
    while result and result[-1] is None:
        result.pop()
    return result

def build_list(values):
    if not values:
        return None
    head = ListNode(values[0])
    current = head
    for value in values[1:]:
        current.next = ListNode(value)
        current = current.next
    return head

def list_to_array(head):
    result = []
    seen = set()
    current = head
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        result.append(current.val)
        current = current.next
    return result

${code}

_input = ${toPythonLiteral(inputValues)}
_input_keys = ${toPythonLiteral(inputKeys)}
_candidates = ${toPythonLiteral(candidates)}
_tree_keywords = {"root", "tree", "node", "p", "q", "t1", "t2", "left", "right", "subroot"}
_list_keywords = {"head", "list", "l1", "l2"}

def _process_arg(value, key):
    lowered = key.lower()
    if isinstance(value, list):
        if lowered in _tree_keywords:
            return build_tree(value)
        if lowered in _list_keywords:
            return build_list(value)
    return value

_processed_input = [_process_arg(value, _input_keys[index] if index < len(_input_keys) else "") for index, value in enumerate(_input)]
_result = None

if "Solution" in globals():
    _solution_instance = Solution()
    _solution_methods = [name for name in _candidates if hasattr(_solution_instance, name)]
    if _solution_methods:
        _result = getattr(_solution_instance, _solution_methods[0])(*_processed_input)
    else:
        _public_methods = [
            name for name in dir(_solution_instance)
            if not name.startswith("_") and callable(getattr(_solution_instance, name))
        ]
        if _public_methods:
            _result = getattr(_solution_instance, _public_methods[0])(*_processed_input)
        else:
            raise Exception("No callable Solution method found")
else:
    _functions = [name for name in _candidates if name in globals() and callable(globals()[name])]
    if not _functions:
        raise Exception("No callable function found")
    _result = globals()[_functions[0]](*_processed_input)

_had_tree_input = any(
    isinstance(_input[index], list) and (_input_keys[index] if index < len(_input_keys) else "").lower() in _tree_keywords
    for index in range(len(_input))
)

if isinstance(_result, TreeNode):
    _result = tree_to_array(_result)
elif isinstance(_result, ListNode):
    _result = list_to_array(_result)
elif _result is None and _had_tree_input:
    _result = []

_result
`
}
