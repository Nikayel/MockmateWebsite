import type { DSAScenario } from "../../types"

export const sortListScenario: DSAScenario = {
  id: "dsa-sort-list",
  title: "Sort List",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Sort a linked list in O(n log n) time and O(1) space",
  tags: ["linked-list", "sorting", "merge-sort", "divide-and-conquer"],
  estimatedTime: 30,
  problemStatement: `You're given the head of a linked list whose values arrive in no particular order. Rearrange the list so the values climb from smallest to largest, then return its new head.

Duplicates are possible, and every occurrence must survive the reordering.`,
  examples: [
    { input: "head = [9,5,2,7]", output: "[2,5,7,9]" },
    { input: "head = [-3,8,1,6,-2]", output: "[-3,-2,1,6,8]" },
    { input: "head = []", output: "[]" },
  ],
  constraints: [
    "The list may hold from 0 to 5 * 10^4 nodes.",
    "Each value fits inside -10^5 <= Node.val <= 10^5",
  ],
  hints: [
    "Use merge sort for O(n log n) time",
    "Find middle using slow/fast pointers",
    "Recursively sort two halves",
    "Merge two sorted lists",
  ],
  starterCode: {
    javascript: `function sortList(head) {\n  // Write your solution here\n\n}`,
    typescript: `function sortList(head: ListNode | null): ListNode | null {\n  // Write your solution here\n\n}`,
    python: `def sortList(head):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n log n)", space: "O(log n) for recursion" },
  testCases: [
    { input: { values: [4, 2, 1, 3] }, expected: [1, 2, 3, 4], description: "Standard sort" },
    {
      input: { values: [-1, 5, 3, 4, 0] },
      expected: [-1, 0, 3, 4, 5],
      description: "With negatives",
    },
    { input: { values: [] }, expected: [], description: "Empty list" },
    { input: { values: [1] }, expected: [1], description: "Single node" },
    // Every list above has distinct values, so a solution that sorted a SET of the values
    // passed. Sorting must keep duplicates, and this case is what says so.
    {
      input: { values: [3, 1, 3, 2] },
      expected: [1, 2, 3, 3],
      description: "Duplicate values must survive the sort",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why is merge sort preferred over quick sort for linked lists?",
    "What's the space complexity of recursive merge sort on linked lists?",
    "Can you achieve O(1) space with bottom-up merge sort?",
    "How do you split the list in half without knowing its length?",
  ],

  midCodingProbes: [
    {
      trigger: "finding middle to split",
      question:
        "When you split at the middle, what must you do to actually separate the two halves?",
    },
    {
      trigger: "merging two sorted lists",
      question: "This merge step - haven't we seen this problem before?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Converting to array, sorting, rebuilding list",
      codeSignals: ["array", "sort()", "rebuild"],
      intervention:
        "That works but uses O(n) space. Can you sort the list in place using merge sort?",
    },
  ],
}
