import type { DSAScenario } from "../../types"

export const linkedListCycleScenario: DSAScenario = {
  id: "dsa-linked-list-cycle",
  title: "Linked List Cycle",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "easy",
  companies: ["Amazon", "Microsoft", "Meta", "Google", "Oracle"],
  description: "Detect whether a linked list loops back on itself",
  tags: ["linked-list", "two-pointers", "hash-table"],
  estimatedTime: 15,
  problemStatement: `You're given head, the first node of a linked list. In a well-formed list, walking node to node along next eventually falls off the end at null. In a malformed one, some next pointer bends back to an earlier node and the walk goes on forever. That closed loop is what we call a cycle.

Report which kind of list you have: return true when the list contains a cycle, and false when it does not.

Example:

\`\`\`
Has a cycle (the last node points back to index 1)
7 → 5 → 9 → -2
    ↑        ↓
    └────────┘

Cycle-free
4 → 8 → 6 → null
\`\`\``,
  examples: [
    {
      input: "head = [7,5,9,-2], pos = 1",
      output: "true",
      explanation:
        "The last node's next pointer leads back to the node at index 1 (0-indexed), so the walk never terminates.",
    },
    {
      input: "head = [4,6], pos = 0",
      output: "true",
    },
    {
      input: "head = [2], pos = -1",
      output: "false",
    },
  ],
  constraints: [
    "Anywhere from 0 to 10^4 nodes may be present",
    "Each value lies in -10^5 <= Node.val <= 10^5",
    "pos equals -1 when there is no cycle, or else names a valid index into the list",
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
