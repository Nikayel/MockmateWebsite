import type { DSAScenario } from "../../types"

export const linkedListCycleScenario: DSAScenario = {
  id: "dsa-linked-list-cycle",
  title: "Linked List Cycle",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "easy",
  companies: ["Amazon", "Microsoft", "Meta", "Google", "Oracle"],
  description: "Detect if a linked list has a cycle",
  tags: ["linked-list", "two-pointers", "hash-table"],
  estimatedTime: 15,
  problemStatement: `Given head, the head of a linked list, determine if the linked list has a cycle in it.

There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer.

Return true if there is a cycle in the linked list. Otherwise, return false.

Example:

\`\`\`
With a cycle (the tail links back to index 1)
3 → 2 → 0 → -4
    ↑        ↓
    └────────┘

No cycle
1 → 2 → 3 → 4 → null
\`\`\``,
  examples: [
    {
      input: "head = [3,2,0,-4], pos = 1",
      output: "true",
      explanation:
        "There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed).",
    },
    {
      input: "head = [1,2], pos = 0",
      output: "true",
    },
    {
      input: "head = [1], pos = -1",
      output: "false",
    },
  ],
  constraints: [
    "The number of nodes in the list is in the range [0, 10^4]",
    "-10^5 <= Node.val <= 10^5",
    "pos is -1 or a valid index in the linked-list",
  ],
  hints: [
    "Use Floyd's Cycle Detection Algorithm (slow and fast pointers)",
    "If there's a cycle, the fast pointer will eventually meet the slow pointer",
    "If fast reaches null, there's no cycle",
  ],
  starterCode: {
    javascript: `function hasCycle(head) {
// Write your solution here

}`,
    typescript: `function hasCycle(head: ListNode | null): boolean {
// Write your solution here

}`,
    python: `def hasCycle(head):
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { values: [3, 2, 0, -4], pos: 1 },
      expected: true,
      description: "Cycle at position 1",
    },
    {
      input: { values: [1, 2], pos: 0 },
      expected: true,
      description: "Cycle at position 0",
    },
    {
      input: { values: [1], pos: -1 },
      expected: false,
      description: "No cycle, single node",
    },
    // Every list above has distinct values, so tracking VISITED VALUES instead of visited
    // nodes was indistinguishable from real cycle detection. A repeated value is not a
    // cycle, and this case is the one that says so.
    {
      input: { values: [1, 2, 1], pos: -1 },
      expected: false,
      description: "Repeated value without a cycle",
    },
    {
      input: { values: [1, 2, 3, 4], pos: -1 },
      expected: false,
      description: "No cycle, multiple nodes",
    },
    {
      input: { values: [], pos: -1 },
      expected: false,
      description: "Empty list",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why does Floyd's algorithm work? Can you explain the math?",
    "What if the cycle includes all nodes vs just a few?",
    "Could you detect a cycle using O(n) space? Why is O(1) better here?",
    "What if you needed to find WHERE the cycle starts, not just IF it exists?",
  ],

  midCodingProbes: [
    {
      trigger: "initializing slow and fast pointers",
      question: "Why does fast move 2 steps while slow moves 1?",
    },
    {
      trigger: "while loop condition",
      question: "What conditions must you check to avoid null pointer errors?",
    },
    {
      trigger: "comparing slow and fast",
      question: "If they meet, does that always mean there's a cycle? Why?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Using a Set to store visited nodes",
      codeSignals: ["new Set", "visited", "seen", "O(n) space"],
      intervention:
        "That works but uses O(n) space. Can you think of a way to detect the cycle with O(1) space?",
    },
  ],
}
