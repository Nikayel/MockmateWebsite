import type { DSAScenario } from "../../types"

export const palindromeLinkedListScenario: DSAScenario = {
  id: "dsa-palindrome-linked-list",
  title: "Palindrome Linked List",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "easy",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Check if a linked list is a palindrome",
  tags: ["linked-list", "stack", "two-pointers"],
  estimatedTime: 20,
  problemStatement: `You're given head, the opening node of a singly linked list. Decide whether the list's values form the same sequence whether you walk them front to back or back to front. Return true when they do and false when they don't.

Example:

\`\`\`
6 → 9 → 9 → 6     the same sequence from either end, so true
4 → 7             becomes 7 → 4 from the far end, so false
\`\`\``,
  examples: [
    { input: "head = [6,9,9,6]", output: "true" },
    { input: "head = [4,7]", output: "false" },
  ],
  constraints: ["Anywhere from 1 to 10^5 nodes may be present.", "Node values are digits, 0 to 9"],
  hints: [
    "Find middle using slow/fast pointers",
    "Reverse second half of list",
    "Compare first half with reversed second half",
    "Can restore list by reversing again",
  ],
  starterCode: {
    javascript: `function isPalindrome(head) {\n  // Write your solution here\n\n}`,
    typescript: `function isPalindrome(head: ListNode | null): boolean {\n  // Write your solution here\n\n}`,
    python: `def isPalindrome(head):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { values: [1, 2, 2, 1] }, expected: true, description: "Even palindrome" },
    { input: { values: [1, 2] }, expected: false, description: "Not palindrome" },
    { input: { values: [1, 2, 1] }, expected: true, description: "Odd palindrome" },
    { input: { values: [1] }, expected: true, description: "Single node" },
    // In every case above the first and last values decide the answer on their own, so
    // comparing only those two passed. Here the ends match while the middle does not.
    {
      input: { values: [1, 2, 3, 1] },
      expected: false,
      description: "Ends match but the middle does not",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What's the space complexity of using a stack vs reversing in place?",
    "How do you handle odd vs even length lists?",
    "Should you restore the list to its original form after checking?",
    "What if the list has only 1 or 2 nodes?",
  ],

  midCodingProbes: [
    {
      trigger: "finding middle node",
      question: "Where should slow pointer end up for a list of length 4? Length 5?",
    },
    {
      trigger: "reversing second half",
      question: "After reversal, what does the original list look like?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Converting to array and checking",
      codeSignals: ["array", "values.push", "O(n) space"],
      intervention:
        "That works but uses O(n) space. Can you check palindrome in O(1) space by modifying the list?",
    },
  ],
}
