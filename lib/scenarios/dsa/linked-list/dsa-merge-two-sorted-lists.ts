import type { DSAScenario } from "../../types"

export const mergeTwoSortedListsScenario: DSAScenario = {
  id: "dsa-merge-two-sorted-lists",
  title: "Merge Two Sorted Lists",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "ZipRecruiter"],
  description: "Merge two sorted linked lists into one sorted list.",
  tags: ["linked-list", "recursion", "two-pointers"],
  estimatedTime: 20,
  problemStatement: `You're given list1 and list2, the heads of two linked lists whose values already appear in non-decreasing order. Combine them into a single linked list that is still sorted, and build it by relinking the nodes you were handed rather than allocating fresh ones. Return the head of the combined list.

Example:

\`\`\`
list1:  2 → 5 → 9
list2:  3 → 5 → 8

Result: 2 → 3 → 5 → 5 → 8 → 9
\`\`\``,
  examples: [
    {
      input: "list1 = [2,5,9], list2 = [3,5,8]",
      output: "[2,3,5,5,8,9]",
    },
    {
      input: "list1 = [], list2 = []",
      output: "[]",
    },
    {
      input: "list1 = [], list2 = [4]",
      output: "[4]",
    },
  ],
  constraints: [
    "Each list carries between 0 and 50 nodes.",
    "Node values stay within -100 <= Node.val <= 100",
    "list1 and list2 each arrive sorted in non-decreasing order.",
  ],
  hints: [
    "Use a dummy node to simplify edge cases",
    "Compare values and link smaller node",
    "Don't forget to link remaining nodes",
  ],
  starterCode: {
    javascript: `function mergeTwoLists(list1, list2) {
// Write your solution here

}`,
    typescript: `function mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null {
// Write your solution here

}`,
    python: `def mergeTwoLists(list1, list2):
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(n + m)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { list1: [1, 2, 4], list2: [1, 3, 4] },
      expected: [1, 1, 2, 3, 4, 4],
      description: "Merge two lists with interleaving values",
    },
    {
      input: { list1: [], list2: [] },
      expected: [],
      description: "Both lists empty",
    },
    {
      input: { list1: [], list2: [0] },
      expected: [0],
      description: "One empty list",
    },
    {
      input: { list1: [1, 2, 3], list2: [4, 5, 6] },
      expected: [1, 2, 3, 4, 5, 6],
      description: "No interleaving needed",
    },
    {
      input: { list1: [5], list2: [1, 2, 4] },
      expected: [1, 2, 4, 5],
      description: "Single element in first list",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if one list is empty?",
    "What if the lists have very different lengths?",
    "Could you do this recursively? What would the base case be?",
    "What's the space complexity of iterative vs recursive approach?",
  ],

  midCodingProbes: [
    {
      trigger: "using dummy node",
      question: "Why use a dummy node? What edge case does it simplify?",
    },
    {
      trigger: "comparing values",
      question: "After one list is exhausted, what do you do with the remaining nodes?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Not handling remaining nodes after one list ends",
      codeSignals: ["only handles equal length"],
      intervention:
        "What happens when you reach the end of one list but the other still has nodes?",
    },
  ],
}
