import type { DSAScenario } from "../../types"

export const swapNodesPairsScenario: DSAScenario = {
  id: "dsa-swap-nodes-pairs",
  title: "Swap Nodes in Pairs",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Exchange each neighboring pair of nodes in a linked list",
  tags: ["linked-list", "recursion"],
  estimatedTime: 20,
  problemStatement: `You're given a linked list via its head. Make every two neighboring nodes trade places: the first swaps with the second, the third with the fourth, and so on down the chain. Return the head of the rearranged list.

Carry out the swaps by relinking nodes. Rewriting the values held inside the nodes is off limits.`,
  examples: [
    { input: "head = [5,9,3,7]", output: "[9,5,7,3]" },
    { input: "head = []", output: "[]" },
    { input: "head = [6]", output: "[6]" },
  ],
  constraints: ["The list contains between 0 and 100 nodes.", "Node values sit between 0 and 100"],
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
