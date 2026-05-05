import type { DSAScenario } from "../../types"

export const reorderListScenario: DSAScenario = {
  id: "dsa-reorder-list",
  title: "Reorder List",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Reorder list to L0→Ln→L1→Ln-1→L2→Ln-2→...",
  tags: ["linked-list", "two-pointers", "stack"],
  estimatedTime: 25,
  problemStatement: `You are given the head of a singly linked-list. Reorder it to: L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → ... You may not modify values in the list's nodes. Only nodes themselves may be changed.

Example visualization:

  Input:   1 → 2 → 3 → 4 → 5

  Step 1: Find middle → split into two halves
          1 → 2 → 3    and    4 → 5

  Step 2: Reverse second half
          1 → 2 → 3    and    5 → 4

  Step 3: Merge alternately
          1 → 5 → 2 → 4 → 3

  Output:  1 → 5 → 2 → 4 → 3`,
  examples: [
    { input: "head = [1,2,3,4]", output: "[1,4,2,3]" },
    { input: "head = [1,2,3,4,5]", output: "[1,5,2,4,3]" },
  ],
  constraints: ["The number of nodes is in the range [1, 5 * 10^4]", "1 <= Node.val <= 1000"],
  hints: ["Find the middle of the list", "Reverse the second half", "Merge two halves alternately"],
  starterCode: {
    javascript: `function reorderList(head) {\n  // Write your solution here\n\n}`,
    typescript: `function reorderList(head: ListNode | null): void {\n  // Write your solution here\n\n}`,
    python: `def reorderList(head):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { head: [1, 2, 3, 4] }, expected: [1, 4, 2, 3], description: "Even length" },
    { input: { head: [1, 2, 3, 4, 5] }, expected: [1, 5, 2, 4, 3], description: "Odd length" },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the list has only 1 or 2 nodes?",
    "How do you handle odd vs even length lists?",
    "Why do you need to reverse the second half?",
    "Could you solve this with O(n) space using a different approach?",
  ],

  midCodingProbes: [
    {
      trigger: "finding the middle",
      question: "For a list of 4 nodes, where should the middle be? What about 5 nodes?",
    },
    {
      trigger: "reversing second half",
      question: "After reversing, how are the two halves structured?",
    },
    {
      trigger: "merging halves",
      question: "Walk me through how you interleave the two halves.",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Using extra array to store values",
      codeSignals: ["store values", "array", "O(n) space"],
      intervention:
        "That works but uses O(n) space. The problem can be solved in O(1) space - think about modifying the list in place.",
    },
  ],
}
