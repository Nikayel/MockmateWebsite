import type { DSAScenario } from "../../types"

export const swapNodesPairsScenario: DSAScenario = {
  id: "dsa-swap-nodes-pairs",
  title: "Swap Nodes in Pairs",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Swap every two adjacent nodes in a linked list",
  tags: ["linked-list", "recursion"],
  estimatedTime: 20,
  problemStatement: `Given a linked list, swap every two adjacent nodes and return its head. You must solve the problem without modifying the values in the list's nodes (i.e., only nodes themselves may be changed.)`,
  examples: [
    { input: "head = [1,2,3,4]", output: "[2,1,4,3]" },
    { input: "head = []", output: "[]" },
    { input: "head = [1]", output: "[1]" },
  ],
  constraints: [
    "The number of nodes in the list is in the range [0, 100].",
    "0 <= Node.val <= 100",
  ],
  hints: [
    "Use dummy node to handle head swap",
    "Track prev, curr, next pointers",
    "Swap pairs and advance by 2",
    "Can also use recursion",
  ],
  starterCode: {
    javascript: `function swapPairs(head) {\n  // Write your solution here\n\n}`,
    typescript: `function swapPairs(head: ListNode | null): ListNode | null {\n  // Write your solution here\n\n}`,
    python: `def swapPairs(head):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { values: [1, 2, 3, 4] }, expected: [2, 1, 4, 3], description: "Even length" },
    { input: { values: [1, 2, 3] }, expected: [2, 1, 3], description: "Odd length" },
    { input: { values: [] }, expected: [], description: "Empty" },
    { input: { values: [1] }, expected: [1], description: "Single node" },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if there's an odd number of nodes?",
    "Is this similar to reverse nodes in k-group with k=2?",
    "What's different about the iterative vs recursive approach here?",
    "Why use a dummy node?",
  ],

  midCodingProbes: [
    {
      trigger: "swapping a pair",
      question: "When you swap nodes A and B, how many pointer reassignments do you need?",
    },
    {
      trigger: "advancing to next pair",
      question: "After swapping, where should your pointer be for the next iteration?",
    },
  ],
}
