import type { DSAScenario } from "../../types"

export const linkedListCycleIiScenario: DSAScenario = {
  id: "dsa-linked-list-cycle-ii",
  title: "Linked List Cycle II",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "medium",
  companies: ["Amazon", "Microsoft", "Meta", "Google", "Apple"],
  description: "Find the node where the cycle begins in a linked list",
  tags: ["linked-list", "two-pointers", "hash-table"],
  estimatedTime: 25,
  problemStatement: `Given the head of a linked list, return the node where the cycle begins. If there is no cycle, return null.

There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer.

Do not modify the linked list.

Follow up: Can you solve it using O(1) memory?`,
  examples: [
    {
      input: "head = [3,2,0,-4], pos = 1",
      output: "Node at index 1 (value 2)",
      explanation: "There is a cycle, where tail connects to the second node.",
    },
    {
      input: "head = [1,2], pos = 0",
      output: "Node at index 0 (value 1)",
      explanation: "Tail connects to the first node.",
    },
    {
      input: "head = [1], pos = -1",
      output: "null",
      explanation: "There is no cycle.",
    },
  ],
  constraints: [
    "The number of the nodes in the list is in the range [0, 10^4]",
    "-10^5 <= Node.val <= 10^5",
    "pos is -1 or a valid index in the linked-list",
  ],
  hints: [
    "Use Floyd's Cycle Detection (fast/slow pointers) to detect cycle",
    "When they meet, move one pointer back to head",
    "Move both pointers one step at a time - they'll meet at cycle start",
    "Mathematical proof: distance from head to cycle start = distance from meeting point to cycle start",
  ],
  starterCode: {
    javascript: `function detectCycle(head) {
// Write your solution here

}`,
    typescript: `function detectCycle(head: ListNode | null): ListNode | null {
// Write your solution here

}`,
    python: `def detectCycle(head):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { values: [3, 2, 0, -4], pos: 1 }, expected: 1, description: "Cycle at index 1" },
    { input: { values: [1, 2], pos: 0 }, expected: 0, description: "Cycle at head" },
    { input: { values: [1], pos: -1 }, expected: null, description: "No cycle" },
    { input: { values: [1, 2, 3, 4, 5], pos: 2 }, expected: 2, description: "Cycle at middle" },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "How is this different from just detecting if a cycle exists?",
    "Can you explain why moving from head and meeting point converges at cycle start?",
    "What if the cycle starts at the head?",
    "What's the mathematical proof that this works?",
  ],

  midCodingProbes: [
    {
      trigger: "after detecting cycle meeting point",
      question: "Once slow and fast meet, what do you do next to find the cycle start?",
    },
    {
      trigger: "second phase with two pointers",
      question: "Why do both pointers move 1 step at a time in the second phase?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Using hash set to find first repeated node",
      codeSignals: ["Set", "visited", "seen.has"],
      intervention:
        "That uses O(n) space. Can you modify Floyd's algorithm to find the cycle start in O(1) space?",
    },
  ],
}
