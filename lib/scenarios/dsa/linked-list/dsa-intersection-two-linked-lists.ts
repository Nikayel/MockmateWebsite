import type { DSAScenario } from "../../types"

export const intersectionTwoLinkedListsScenario: DSAScenario = {
  id: "dsa-intersection-two-linked-lists",
  title: "Intersection of Two Linked Lists",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "easy",
  companies: ["Amazon", "Meta", "Microsoft", "Google", "Apple"],
  description: "Find the node where two linked lists intersect",
  tags: ["linked-list", "two-pointers", "hash-table"],
  estimatedTime: 20,
  problemStatement: `Given the heads of two singly linked-lists headA and headB, return the node at which the two lists intersect. If the two linked lists have no intersection at all, return null.

The linked lists must retain their original structure after the function returns.

Note that the linked lists may intersect at different positions, and the intersection is defined based on reference, not value.`,
  examples: [
    {
      input: "listA = [4,1,8,4,5], listB = [5,6,1,8,4,5], intersectVal = 8",
      output: "Reference to node with value 8",
      explanation: "The intersected node's value is 8.",
    },
    {
      input: "listA = [1,9,1,2,4], listB = [3,2,4], intersectVal = 2",
      output: "Reference to node with value 2",
    },
    {
      input: "listA = [2,6,4], listB = [1,5], intersectVal = 0",
      output: "null",
      explanation: "The two lists do not intersect.",
    },
  ],
  constraints: [
    "The number of nodes of listA is in the m.",
    "The number of nodes of listB is in the n.",
    "1 <= m, n <= 3 * 10^4",
    "1 <= Node.val <= 10^5",
  ],
  hints: [
    "Two pointer approach: traverse both lists",
    "When one reaches end, redirect to the other list's head",
    "If they intersect, they'll meet at intersection after at most m+n steps",
    "If no intersection, both will be null at the same time",
  ],
  starterCode: {
    javascript: `function getIntersectionNode(headA, headB) {
// Write your solution here

}`,
    typescript: `function getIntersectionNode(headA: ListNode | null, headB: ListNode | null): ListNode | null {
// Write your solution here

}`,
    python: `def getIntersectionNode(headA, headB):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(m + n)", space: "O(1)" },
  testCases: [
    {
      input: { listA: [4, 1, 8, 4, 5], listB: [5, 6, 1, 8, 4, 5], intersectAt: 8 },
      expected: 8,
      description: "Intersection exists",
    },
    {
      input: { listA: [1, 9, 1, 2, 4], listB: [3, 2, 4], intersectAt: 2 },
      expected: 2,
      description: "Different lengths",
    },
    {
      input: { listA: [2, 6, 4], listB: [1, 5], intersectAt: null },
      expected: null,
      description: "No intersection",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the lists have different lengths before the intersection?",
    "Why does the two-pointer approach work mathematically?",
    "Could you solve this with a hash set? What's the trade-off?",
    "What if both lists are the same list (intersect at head)?",
  ],

  midCodingProbes: [
    {
      trigger: "switching pointers to other list",
      question: "When pointer A reaches the end, why redirect it to headB?",
    },
    {
      trigger: "checking equality",
      question: "If there's no intersection, when do both pointers become null simultaneously?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Comparing node values instead of references",
      codeSignals: ["node.val ==", "value comparison"],
      intervention:
        "The intersection is about the same node reference, not the same value. Two different nodes could have the same value.",
    },
  ],
}
