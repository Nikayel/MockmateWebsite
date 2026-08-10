import type { DSAScenario } from "../../types"

export const palindromeLinkedListScenario: DSAScenario = {
  id: "dsa-palindrome-linked-list",
  title: "Palindrome Linked List",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "easy",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Check if a linked list is a palindrome",
  tags: ["linked-list", "two-pointers", "stack"],
  estimatedTime: 20,
  problemStatement: `Given the head of a singly linked list, return true if it is a palindrome or false otherwise.

Example visualization:

  Input: 1 → 2 → 2 → 1

  Step 1: Find middle (slow/fast pointers)
          1 → 2 | 2 → 1

  Step 2: Reverse second half
          1 → 2   1 → 2

  Step 3: Compare both halves
          1 = 1 ✓   2 = 2 ✓

  Output: true (is palindrome)`,
  examples: [
    { input: "head = [1,2,2,1]", output: "true" },
    { input: "head = [1,2]", output: "false" },
  ],
  constraints: ["The number of nodes in the list is in the range [1, 10^5].", "0 <= Node.val <= 9"],
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
