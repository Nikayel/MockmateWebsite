import type { DSAPatternKnowledge } from "../../types"

export const linkedListKnowledge: DSAPatternKnowledge = {
  pattern: "linked-list",
  displayName: "Linked List",
  description:
    "Sequential data structure with node pointers. Unique operations like in-place reversal and cycle detection.",
  whenToUse: [
    "Frequent insertions/deletions",
    "Unknown size (dynamic)",
    "Implementing queue/stack",
    "LRU cache",
    "Polynomial representation",
  ],
  keyInsights: [
    "Dummy head simplifies edge cases",
    "Two pointers for cycle detection (Floyd's)",
    "Reverse by changing pointer directions",
    "Draw diagrams to track pointers",
  ],
  commonMistakes: [
    "Losing reference to next node",
    "Null pointer exceptions",
    "Not updating all necessary pointers",
    "Off-by-one in length calculations",
  ],
  timeComplexity: {
    typical: "O(n) for traversal",
    best: "O(1) for head operations",
    worst: "O(n) for search/access by index",
  },
  spaceComplexity: {
    typical: "O(1) for in-place operations",
    notes: "O(n) for recursive approaches",
  },
  relatedPatterns: ["two-pointers", "arrays-hashing"],
  prerequisites: [],
  codeTemplate: `def reverse_list(head):
  prev = None
  curr = head

  while curr:
      next_temp = curr.next
      curr.next = prev
      prev = curr
      curr = next_temp

  return prev`,
  examples: [
    "Reverse Linked List",
    "Merge Two Sorted Lists",
    "Linked List Cycle",
    "Remove Nth Node From End",
  ],
  interviewTips: [
    "Always use dummy head for cleaner code",
    "Draw pointer changes step by step",
    "Consider iterative vs recursive trade-offs",
  ],
}
