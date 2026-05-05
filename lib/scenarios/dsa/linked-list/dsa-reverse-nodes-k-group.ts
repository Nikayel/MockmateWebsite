import type { DSAScenario } from "../../types"

export const reverseNodesKGroupScenario: DSAScenario = {
  id: "dsa-reverse-nodes-k-group",
  title: "Reverse Nodes in k-Group",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "hard",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple"],
  description: "Reverse linked list nodes k at a time",
  tags: ["linked-list", "recursion"],
  estimatedTime: 35,
  problemStatement: `Given the head of a linked list, reverse the nodes of the list k at a time, and return the modified list.

k is a positive integer and is less than or equal to the length of the linked list. If the number of nodes is not a multiple of k then left-out nodes, in the end, should remain as it is.

You may not alter the values in the list's nodes, only nodes themselves may be changed.`,
  examples: [
    { input: "head = [1,2,3,4,5], k = 2", output: "[2,1,4,3,5]" },
    { input: "head = [1,2,3,4,5], k = 3", output: "[3,2,1,4,5]" },
  ],
  constraints: [
    "The number of nodes in the list is n.",
    "1 <= k <= n <= 5000",
    "0 <= Node.val <= 1000",
  ],
  hints: [
    "Count k nodes first to check if group exists",
    "Reverse k nodes at a time",
    "Connect reversed groups properly",
    "Use recursion or iterative with careful pointer management",
  ],
  starterCode: {
    javascript: `function reverseKGroup(head, k) {\n  // Write your solution here\n\n}`,
    typescript: `function reverseKGroup(head: ListNode | null, k: number): ListNode | null {\n  // Write your solution here\n\n}`,
    python: `def reverseKGroup(head, k):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { values: [1, 2, 3, 4, 5], k: 2 }, expected: [2, 1, 4, 3, 5], description: "k=2" },
    {
      input: { values: [1, 2, 3, 4, 5], k: 3 },
      expected: [3, 2, 1, 4, 5],
      description: "k=3, remaining 2",
    },
    { input: { values: [1, 2, 3], k: 1 }, expected: [1, 2, 3], description: "k=1, no change" },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What happens to the remaining nodes if they're less than k?",
    "How do you connect reversed groups to each other?",
    "What if k equals the list length?",
    "Can you do this iteratively and recursively?",
  ],

  midCodingProbes: [
    {
      trigger: "counting k nodes",
      question: "Why do you need to count k nodes before reversing?",
    },
    {
      trigger: "connecting groups",
      question: "After reversing a group, what was the first node becomes what?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Not preserving remaining nodes less than k",
      codeSignals: ["reverse all", "ignoring remainder"],
      intervention:
        "The problem says if remaining nodes are less than k, leave them as is. How do you handle that?",
    },
  ],
}
