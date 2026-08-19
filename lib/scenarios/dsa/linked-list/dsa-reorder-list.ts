import type { DSAScenario } from "../../types"

export const reorderListScenario: DSAScenario = {
  id: "dsa-reorder-list",
  title: "Reorder List",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Relink a list to alternate nodes from its front and back",
  tags: ["linked-list", "stack", "two-pointers"],
  estimatedTime: 25,
  problemStatement: `You're given head, the first node of a singly linked list. Label its nodes L0, L1, and so on through Ln. Rebuild the chain so it runs L0 → Ln → L1 → Ln-1 → L2 → Ln-2 and keeps alternating between the front and the back until every node has its place.

Node values must not be rewritten; produce the new order by relinking the nodes themselves.

Example:

\`\`\`
Input    3 → 9 → 5 → 7 → 2

Output   3 → 2 → 9 → 7 → 5
\`\`\``,
  examples: [
    { input: "head = [6,3,8,5]", output: "[6,5,3,8]" },
    { input: "head = [3,9,5,7,2]", output: "[3,2,9,7,5]" },
  ],
  constraints: ["Expect between 1 and 5 * 10^4 nodes", "Each value lies between 1 and 1000"],
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
