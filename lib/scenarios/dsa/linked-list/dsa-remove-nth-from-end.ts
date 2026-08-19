import type { DSAScenario } from "../../types"

export const removeNthFromEndScenario: DSAScenario = {
  id: "dsa-remove-nth-from-end",
  title: "Remove Nth Node From End of List",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Apple"],
  description: "Delete a linked list's nth-from-last node",
  tags: ["linked-list", "two-pointers"],
  estimatedTime: 20,
  problemStatement: `You're given the head of a linked list together with an integer n. Count positions starting from the tail, delete the node that lands at position n, and return the head of the list that remains.

Example, with n = 3:

\`\`\`
Input    7 → 3 → 9 → 1 → 6
                 ↑
         third from the end

Output   7 → 3 → 1 → 6
\`\`\``,
  examples: [
    { input: "head = [7,3,9,1,6], n = 3", output: "[7,3,1,6]" },
    { input: "head = [4], n = 1", output: "[]" },
    { input: "head = [5,8], n = 1", output: "[5]" },
  ],
  constraints: [
    "The list's length sz obeys 1 <= sz <= 30",
    "Node values range from 0 to 100",
    "n is at least 1 and never exceeds sz",
  ],
  hints: [
    "Use two pointers: fast and slow",
    "Move fast n steps ahead",
    "Then move both until fast reaches end",
  ],
  starterCode: {
    javascript: `function removeNthFromEnd(head, n) {\n  // Write your solution here\n\n}`,
    typescript: `function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {\n  // Write your solution here\n\n}`,
    python: `def removeNthFromEnd(head, n):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    {
      input: { head: [1, 2, 3, 4, 5], n: 2 },
      expected: [1, 2, 3, 5],
      description: "Remove 2nd from end",
    },
    { input: { head: [1], n: 1 }, expected: [], description: "Single node" },
    // Edge cases
    {
      input: { head: [1, 2], n: 2 },
      expected: [2],
      description: "Edge: Remove first node (head)",
    },
    { input: { head: [1, 2], n: 1 }, expected: [1], description: "Edge: Remove last node" },
    {
      input: { head: [1, 2, 3], n: 3 },
      expected: [2, 3],
      description: "Edge: n equals list length",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if n equals the length of the list (removing the head)?",
    "Can you do this in one pass instead of two?",
    "What if n is larger than the list length?",
    "Why use a dummy node here?",
  ],

  midCodingProbes: [
    {
      trigger: "moving fast pointer n steps",
      question: "After fast moves n steps, what's the gap between fast and slow?",
    },
    {
      trigger: "reaching the node to remove",
      question: "You need to remove slow.next - why not slow itself?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Two-pass solution counting length first",
      codeSignals: ["count length", "two passes", "length - n"],
      intervention:
        "That works, but can you think of a way to do this in a single pass using two pointers?",
    },
  ],
}
