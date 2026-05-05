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
  problemStatement: `You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.

Example visualization:

  list1:  1 → 2 → 4
  list2:  1 → 3 → 4

  Merge process:
  dummy → 1 → 1 → 2 → 3 → 4 → 4
          ↑       ↑       ↑
        from    from    from
        list2   list1   both

  Result: 1 → 1 → 2 → 3 → 4 → 4`,
  examples: [
    {
      input: "list1 = [1,2,4], list2 = [1,3,4]",
      output: "[1,1,2,3,4,4]",
    },
    {
      input: "list1 = [], list2 = []",
      output: "[]",
    },
    {
      input: "list1 = [], list2 = [0]",
      output: "[0]",
    },
  ],
  constraints: [
    "The number of nodes in both lists is in the range [0, 50].",
    "-100 <= Node.val <= 100",
    "Both list1 and list2 are sorted in non-decreasing order.",
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
