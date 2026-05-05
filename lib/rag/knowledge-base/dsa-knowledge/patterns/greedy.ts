import type { DSAPatternKnowledge } from "../../types"

export const greedyKnowledge: DSAPatternKnowledge = {
  pattern: "greedy",
  displayName: "Greedy Algorithms",
  description:
    "Make locally optimal choices at each step. Works when local optimum leads to global optimum. Faster than DP when applicable.",
  whenToUse: [
    "Interval scheduling problems",
    "Activity selection",
    "Huffman coding",
    "Minimum spanning tree",
    'When "take the best available" works',
  ],
  keyInsights: [
    "Prove greedy choice property: local optimal leads to global",
    "Often requires sorting first",
    "Not all optimization problems are greedy",
    "If greedy fails, try DP",
  ],
  commonMistakes: [
    "Assuming greedy works without proof",
    "Incorrect sorting criteria",
    "Not considering all cases",
    "Missing edge cases after greedy selection",
  ],
  timeComplexity: {
    typical: "O(n log n) due to sorting",
    best: "O(n) if no sorting needed",
    worst: "O(n log n)",
  },
  spaceComplexity: {
    typical: "O(1) to O(n)",
    notes: "Depends on whether input is modified",
  },
  relatedPatterns: ["dp-1d", "heap", "intervals"],
  prerequisites: ["arrays-hashing"],
  codeTemplate: `def greedy_solution(intervals):
  # Sort by end time (or start time, depending on problem)
  intervals.sort(key=lambda x: x[1])

  result = []
  last_end = float('-inf')

  for start, end in intervals:
      if start >= last_end:
          result.append((start, end))
          last_end = end

  return result`,
  examples: ["Non-overlapping Intervals", "Jump Game", "Gas Station", "Task Scheduler"],
  interviewTips: [
    "Explain why greedy works for this problem",
    "Consider counterexamples where greedy might fail",
    "If unsure, mention DP as alternative",
  ],
}
