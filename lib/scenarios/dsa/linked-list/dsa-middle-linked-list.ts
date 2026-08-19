import type { DSAScenario } from "../../types"

export const middleLinkedListScenario: DSAScenario = {
  id: "dsa-middle-linked-list",
  title: "Middle of the Linked List",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "easy",
  companies: ["Amazon", "Meta", "Google"],
  description: "Find the middle node of a linked list",
  tags: ["linked-list", "two-pointers"],
  estimatedTime: 10,
  problemStatement: `You're given head, the starting node of a singly linked list. Return the node that sits at the midpoint of the list.

When the node count is even, two nodes share the midpoint; the answer is the later of the two.

Example:

\`\`\`
Odd count     4 → 8 → 15 → 16 → 23
                      ↑
                    middle

Even count    4 → 8 → 15 → 16 → 23 → 42
                           ↑
                     second middle
\`\`\``,
  examples: [
    {
      input: "head = [4,8,15,16,23]",
      output: "[15,16,23]",
      explanation: "The middle node carries 15.",
    },
    {
      input: "head = [4,8,15,16,23,42]",
      output: "[16,23,42]",
      explanation: "Nodes 15 and 16 both sit at the midpoint; the later one, 16, is returned.",
    },
  ],
  constraints: [
    "The list holds no fewer than 1 and no more than 100 nodes.",
    "Each node's value falls between 1 and 100",
  ],
  hints: [
    "Use slow and fast pointers",
    "Slow moves 1 step, fast moves 2 steps",
    "When fast reaches end, slow is at middle",
  ],
  starterCode: {
    javascript: `function middleNode(head) {\n  // Write your solution here\n\n}`,
    typescript: `function middleNode(head: ListNode | null): ListNode | null {\n  // Write your solution here\n\n}`,
    python: `def middleNode(head):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { values: [1, 2, 3, 4, 5] }, expected: [3, 4, 5], description: "Odd length" },
    {
      input: { values: [1, 2, 3, 4, 5, 6] },
      expected: [4, 5, 6],
      description: "Even length - second middle",
    },
    { input: { values: [1] }, expected: [1], description: "Single node" },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "For even-length lists, which middle node do you return?",
    "Could you find the middle without the two-pointer technique?",
    "What's the relationship between slow pointer position and list length?",
  ],

  midCodingProbes: [
    {
      trigger: "setting up slow and fast",
      question: "What should fast's initial position be? Same as slow or one ahead?",
    },
    {
      trigger: "loop condition",
      question: "When do you stop - when fast is null or when fast.next is null?",
    },
  ],
}
