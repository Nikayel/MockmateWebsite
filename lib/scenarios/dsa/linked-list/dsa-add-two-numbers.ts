import type { DSAScenario } from "../../types"

export const addTwoNumbersScenario: DSAScenario = {
  id: "dsa-add-two-numbers",
  title: "Add Two Numbers",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple"],
  description: "Add two numbers represented as reversed linked lists",
  tags: ["linked-list", "math", "recursion"],
  estimatedTime: 25,
  problemStatement: `You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each node contains a single digit. Add the two numbers and return the sum as a linked list.

Example visualization:

  l1: 2 → 4 → 3  (represents 342)
  l2: 5 → 6 → 4  (represents 465)
                 ─────────────────
  Sum: 342 + 465 = 807

  Process (right to left with carry):
  2+5=7 → 4+6=10(carry 1) → 3+4+1=8

  Output: 7 → 0 → 8  (represents 807)`,
  examples: [
    { input: "l1 = [2,4,3], l2 = [5,6,4]", output: "[7,0,8]", explanation: "342 + 465 = 807" },
    { input: "l1 = [0], l2 = [0]", output: "[0]" },
    { input: "l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]", output: "[8,9,9,9,0,0,0,1]" },
  ],
  constraints: [
    "The number of nodes is in the range [1, 100]",
    "0 <= Node.val <= 9",
    "The numbers do not contain leading zeros",
  ],
  hints: [
    "Iterate through both lists simultaneously",
    "Track carry for each addition",
    "Handle different list lengths",
  ],
  starterCode: {
    javascript: `function addTwoNumbers(l1, l2) {\n  // Write your solution here\n\n}`,
    typescript: `function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n  // Write your solution here\n\n}`,
    python: `def addTwoNumbers(l1, l2):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(max(n, m))", space: "O(max(n, m))" },
  testCases: [
    {
      input: { l1: [2, 4, 3], l2: [5, 6, 4] },
      expected: [7, 0, 8],
      description: "342 + 465 = 807",
    },
    { input: { l1: [0], l2: [0] }, expected: [0], description: "0 + 0" },
    // Edge cases
    {
      input: { l1: [9, 9], l2: [1] },
      expected: [0, 0, 1],
      description: "Edge: Carry creates new digit (99 + 1 = 100)",
    },
    {
      input: { l1: [1, 2, 3], l2: [4, 5] },
      expected: [5, 7, 3],
      description: "Edge: Different length lists (321 + 54 = 375)",
    },
    {
      input: { l1: [5], l2: [5] },
      expected: [0, 1],
      description: "Edge: Simple carry (5 + 5 = 10)",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the two numbers have different lengths?",
    "What if there's a carry at the very end (e.g., 99 + 1)?",
    "Why are the digits stored in reverse order? How does that help?",
    "What if the digits were stored in forward order instead?",
  ],

  midCodingProbes: [
    {
      trigger: "handling carry",
      question: "What values can the carry be? Just 0 or 1?",
    },
    {
      trigger: "loop termination",
      question: "When do you stop the loop? What if there's a remaining carry?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Converting lists to numbers, adding, then back to list",
      codeSignals: ["parseInt", "Number()", "toString", "convert to number"],
      intervention:
        "Be careful - the numbers can be very large (100 digits). Converting to integers might cause overflow. Can you add digit by digit instead?",
    },
  ],
}
