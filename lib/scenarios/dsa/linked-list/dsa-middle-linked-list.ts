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
  problemStatement: `Given the head of a singly linked list, return the middle node of the linked list.

If there are two middle nodes, return the second middle node.

Example visualization:

  Odd length:    1 → 2 → [3] → 4 → 5
                         ↑
                       middle

  Even length:   1 → 2 → 3 → [4] → 5 → 6
                             ↑
                       second middle

  Technique: slow (1 step) + fast (2 steps)
  When fast reaches end, slow is at middle`,
  examples: [
    { input: "head = [1,2,3,4,5]", output: "[3,4,5]", explanation: "The middle node is 3." },
    {
      input: "head = [1,2,3,4,5,6]",
      output: "[4,5,6]",
      explanation: "Two middle nodes 3 and 4, return 4.",
    },
  ],
  constraints: [
    "The number of nodes in the list is in the range [1, 100].",
    "1 <= Node.val <= 100",
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
