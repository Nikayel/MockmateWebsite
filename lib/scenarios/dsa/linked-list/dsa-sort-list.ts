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
  problemStatement: `Given the head of a linked list, return the list after sorting it in ascending order.`,
  examples: [
    { input: "head = [4,2,1,3]", output: "[1,2,3,4]" },
    { input: "head = [-1,5,3,4,0]", output: "[-1,0,3,4,5]" },
    { input: "head = []", output: "[]" },
  ],
  constraints: [
    "The number of nodes in the list is in the range [0, 5 * 10^4].",
    "-10^5 <= Node.val <= 10^5",
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
