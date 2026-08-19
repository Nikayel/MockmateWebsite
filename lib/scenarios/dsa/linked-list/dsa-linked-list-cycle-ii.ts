import type { DSAScenario } from "../../types"

export const linkedListCycleIiScenario: DSAScenario = {
  id: "dsa-linked-list-cycle-ii",
  title: "Linked List Cycle II",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "medium",
  companies: ["Amazon", "Microsoft", "Meta", "Google", "Apple"],
  description: "Locate the entry node of a linked list's loop",
  tags: ["linked-list", "hash-table", "two-pointers"],
  estimatedTime: 25,
  problemStatement: `You're given head, the first node of a linked list that might contain a loop. A loop exists when some node can be visited twice just by walking forward along next pointers. Your task is to identify the exact node where that loop is entered and return it. When no loop exists, return null.

The list must come through untouched: inspect it, but change nothing.

As a stretch goal, try to manage it with O(1) memory.`,
  examples: [
    {
      input: "head = [5,9,4,-7], pos = 1",
      output: "Node at index 1 (value 9)",
      explanation:
        "The tail's next pointer leads back to the second node, so the loop is entered there.",
    },
    {
      input: "head = [6,3], pos = 0",
      output: "Node at index 0 (value 6)",
      explanation: "The tail loops straight back to the head.",
    },
    {
      input: "head = [8], pos = -1",
      output: "null",
      explanation: "This list has no loop.",
    },
  ],
  constraints: [
    "The list contains between 0 and 10^4 nodes",
    "Values span -10^5 <= Node.val <= 10^5",
    "pos is -1 when no loop exists; otherwise it is a valid index into the list",
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
    // All values above are distinct, so tracking VISITED VALUES rather than visited nodes
    // looked correct. Here the repeated 1 would be reported as a cycle starting at index 0.
    {
      input: { values: [1, 2, 1], pos: -1 },
      expected: null,
      description: "Repeated value without a cycle",
    },
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
