import type { DSAScenario } from "../../types"

export const removeDuplicatesSortedListScenario: DSAScenario = {
  id: "dsa-remove-duplicates-sorted-list",
  title: "Remove Duplicates from Sorted List",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "easy",
  companies: ["Amazon", "Microsoft", "Meta"],
  description: "Remove all duplicates from a sorted linked list",
  tags: ["linked-list"],
  estimatedTime: 15,
  problemStatement: `Given the head of a sorted linked list, delete all duplicates such that each element appears only once. Return the linked list sorted as well.`,
  examples: [
    { input: "head = [1,1,2]", output: "[1,2]" },
    { input: "head = [1,1,2,3,3]", output: "[1,2,3]" },
  ],
  constraints: [
    "The number of nodes in the list is in the range [0, 300].",
    "-100 <= Node.val <= 100",
    "The list is guaranteed to be sorted in ascending order.",
  ],
  hints: [
    "Since the list is sorted, duplicates will be adjacent",
    "Traverse the list and skip nodes with same value",
    "Update next pointer to skip duplicates",
  ],
  starterCode: {
    javascript: `function deleteDuplicates(head) {
// Write your solution here

}`,
    typescript: `function deleteDuplicates(head: ListNode | null): ListNode | null {
// Write your solution here

}`,
    python: `def deleteDuplicates(head):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { values: [1, 1, 2] }, expected: [1, 2], description: "Two duplicates" },
    {
      input: { values: [1, 1, 2, 3, 3] },
      expected: [1, 2, 3],
      description: "Multiple duplicates",
    },
    { input: { values: [] }, expected: [], description: "Empty list" },
    { input: { values: [1] }, expected: [1], description: "Single node" },
    { input: { values: [1, 1, 1] }, expected: [1], description: "All duplicates" },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the list is empty or has one node?",
    "What if ALL nodes have the same value?",
    "How would this change if the list wasn't sorted?",
    "What if we needed to remove ALL occurrences including the first?",
  ],

  midCodingProbes: [
    {
      trigger: "comparing adjacent values",
      question: "When you find a duplicate, which node do you skip?",
    },
    {
      trigger: "updating next pointer",
      question: "What if there are three or more consecutive duplicates?",
    },
  ],
}
