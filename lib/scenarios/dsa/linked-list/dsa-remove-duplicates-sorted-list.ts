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
  problemStatement: `You're given head, the front of a linked list whose values are already sorted. Some values may occupy more than one node. Prune the list so every distinct value is represented by exactly one node, then return the head of what's left. The result must still be sorted.`,
  examples: [
    { input: "head = [2,2,5]", output: "[2,5]" },
    { input: "head = [3,3,4,7,7]", output: "[3,4,7]" },
  ],
  constraints: [
    "The node count sits between 0 and 300.",
    "Values are bounded by -100 <= Node.val <= 100",
    "The input arrives sorted in ascending order.",
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
