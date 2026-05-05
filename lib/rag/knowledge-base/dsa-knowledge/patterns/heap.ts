import type { DSAPatternKnowledge } from "../../types"

export const heapKnowledge: DSAPatternKnowledge = {
  pattern: "heap",
  displayName: "Heap / Priority Queue",
  description:
    "Efficiently find min/max elements. Useful for scheduling, finding k-th element, and merging sorted lists.",
  whenToUse: [
    "Need repeated min/max operations",
    "K-th largest/smallest element",
    "Merging k sorted lists",
    "Scheduling by priority",
    "Median finding (two heaps)",
  ],
  keyInsights: [
    "Min-heap: smallest element at root",
    "Use negative values for max-heap in languages with only min-heap",
    "Heap of size k for finding k-th element",
    "Two heaps can track running median",
  ],
  commonMistakes: [
    "Forgetting heap is not sorted",
    "Wrong heap type (min vs max)",
    "Not handling heap of custom objects correctly",
    "Excessive heap operations when simpler solution exists",
  ],
  timeComplexity: {
    typical: "O(n log k) for k-element problems",
    best: "O(1) for peek",
    worst: "O(log n) for push/pop",
  },
  spaceComplexity: {
    typical: "O(k) for k-element heap",
    notes: "Full heap is O(n)",
  },
  relatedPatterns: ["greedy", "arrays-hashing"],
  prerequisites: ["arrays-hashing"],
  codeTemplate: `import heapq

def find_kth_largest(nums, k):
  # Min-heap of size k
  heap = []
  for num in nums:
      heapq.heappush(heap, num)
      if len(heap) > k:
          heapq.heappop(heap)
  return heap[0]`,
  examples: [
    "Kth Largest Element in an Array",
    "Top K Frequent Elements",
    "Merge k Sorted Lists",
    "Find Median from Data Stream",
  ],
  interviewTips: [
    "Mention heap vs sorting trade-offs",
    "Consider if QuickSelect is better for k-th element",
    "Clarify if online (streaming) or offline",
  ],
}
