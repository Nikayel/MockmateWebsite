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
  problemStatement: `You're given headA and headB, the starting nodes of two singly linked lists. Somewhere along the way the two lists might merge and share every node from that point to the tail. Find the earliest node they have in common and return it; when the lists never touch, return null.

Common here means the same physical node, not two separate nodes that happen to hold equal values. The point where they merge can sit at a different distance from each head. Both lists must be left in their original shape once your function finishes.`,
  examples: [
    {
      input: "listA = [3,7,12,9,2], listB = [10,4,6,12,9,2], intersectVal = 12",
      output: "Reference to node with value 12",
      explanation: "The lists merge at the node holding 12 and share the tail 12 → 9 → 2.",
    },
    {
      input: "listA = [8,5,6,11,7], listB = [2,11,7], intersectVal = 11",
      output: "Reference to node with value 11",
    },
    {
      input: "listA = [9,3,8], listB = [7,6], intersectVal = 0",
      output: "null",
      explanation: "These two lists never share a node.",
    },
  ],
  constraints: [
    "m denotes how many nodes listA holds.",
    "n denotes how many nodes listB holds.",
    "Both m and n fall between 1 and 3 * 10^4",
    "Every node's value sits between 1 and 10^5",
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
