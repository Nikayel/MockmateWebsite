import type { DSAScenario } from "../../types"

export const reverseLinkedListScenario: DSAScenario = {
  id: "dsa-reverse-linked-list",
  title: "Reverse Linked List",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "easy",
  companies: ["Amazon", "Microsoft", "Meta", "Apple", "Google", "Snap"],
  description: "Reverse a singly linked list",
  tags: ["linked-list", "recursion"],
  estimatedTime: 15,
  problemStatement: `Given the head of a singly linked list, reverse the list, and return the reversed list.

Example visualization:

  Input:   1 → 2 → 3 → 4 → 5 → null

  Output:  5 → 4 → 3 → 2 → 1 → null

  Process (using 3 pointers):
  prev   curr  next
  null ← [1] → 2 → 3 → 4 → 5
         prev  curr next
  null ← 1 ← [2] → 3 → 4 → 5
                  ...and so on`,
  examples: [
    {
      input: "head = [1,2,3,4,5]",
      output: "[5,4,3,2,1]",
    },
    {
      input: "head = [1,2]",
      output: "[2,1]",
    },
    {
      input: "head = []",
      output: "[]",
    },
  ],
  constraints: [
    "The number of nodes in the list is the range [0, 5000]",
    "-5000 <= Node.val <= 5000",
  ],
  hints: [
    "Use three pointers: prev, current, and next",
    "Iterate through the list, reversing the links",
    "Return the new head (which was the last node)",
  ],
  starterCode: {
    javascript: `function reverseList(head) {
// Write your solution here

}`,
    typescript: `function reverseList(head: ListNode | null): ListNode | null {
// Write your solution here

}`,
    python: `def reverseList(head):
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { values: [1, 2, 3, 4, 5] },
      expected: [5, 4, 3, 2, 1],
      description: "Reverse list: [1,2,3,4,5] -> [5,4,3,2,1]",
    },
    {
      input: { values: [1, 2] },
      expected: [2, 1],
      description: "Two nodes: [1,2] -> [2,1]",
    },
    {
      input: { values: [] },
      expected: [],
      description: "Empty list",
    },
    {
      input: { values: [1] },
      expected: [1],
      description: "Single node",
    },
    {
      input: { values: [1, 2, 3] },
      expected: [3, 2, 1],
      description: "Three nodes: [1,2,3] -> [3,2,1]",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the list is empty or has only one node?",
    "Can you do this iteratively and recursively? What are the trade-offs?",
    "What's the space complexity of your recursive approach vs iterative?",
    "What if you needed to reverse only a portion of the list?",
  ],

  midCodingProbes: [
    {
      trigger: "setting up three pointers",
      question: "Walk me through what each of prev, curr, and next represents at the start.",
    },
    {
      trigger: "moving pointers",
      question: "What happens to the original head node after the reversal completes?",
    },
    {
      trigger: "recursive approach",
      question: "What's your base case, and why?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Losing reference to next node before reassigning",
      codeSignals: ["curr.next = prev", "without saving next"],
      intervention:
        "Before you reassign curr.next, make sure you've saved the reference to the next node - otherwise you'll lose the rest of the list.",
    },
  ],
}
