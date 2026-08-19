import type { DSAScenario } from "../../types"

export const reverseNodesKGroupScenario: DSAScenario = {
  id: "dsa-reverse-nodes-k-group",
  title: "Reverse Nodes in k-Group",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "hard",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple"],
  description: "Reverse a linked list in blocks of k nodes",
  tags: ["linked-list", "recursion"],
  estimatedTime: 35,
  problemStatement: `You're given the head of a linked list and a positive integer k, where k never exceeds the list's length. Working from the front, take the nodes k at a time and flip the order inside every complete group of k. When the final group comes up short of k nodes, leave that tail exactly as it was.

Values stay in their nodes; produce the new arrangement by relinking the nodes themselves. Return the head of the result.`,
  examples: [
    { input: "head = [4,9,2,7,6], k = 2", output: "[9,4,7,2,6]" },
    { input: "head = [4,9,2,7,6], k = 3", output: "[2,9,4,7,6]" },
  ],
  constraints: [
    "n stands for the total number of nodes.",
    "k and n satisfy 1 <= k <= n <= 5000",
    "Values fall in the range 0 to 1000",
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
