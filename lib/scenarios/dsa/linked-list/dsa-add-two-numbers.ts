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
  problemStatement: `You're given two non-empty linked lists, l1 and l2, that each encode a non-negative integer. The encoding stores one digit per node with the ones place at the head, so the digits run backwards. Compute the total of the two integers and hand it back as a linked list written in that same reversed-digit form.

Example:

\`\`\`
l1: 8 → 3 → 2   encodes 238
l2: 7 → 4 → 5   encodes 547

238 + 547 = 785

Result: 5 → 8 → 7   encodes 785
\`\`\``,
  examples: [
    { input: "l1 = [8,3,2], l2 = [7,4,5]", output: "[5,8,7]", explanation: "238 + 547 = 785" },
    { input: "l1 = [0], l2 = [0]", output: "[0]" },
    { input: "l1 = [9,9,9,9,9], l2 = [9,9]", output: "[8,9,0,0,0,1]" },
  ],
  constraints: [
    "Each list holds at least 1 and at most 100 nodes",
    "Every node stores a single digit, 0 through 9",
    "Neither encoded number carries leading zeros",
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
