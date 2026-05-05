import type { DSAPatternKnowledge } from "../../types"

export const intervalsKnowledge: DSAPatternKnowledge = {
  pattern: "intervals",
  displayName: "Intervals",
  description:
    "Problems involving ranges of numbers. Often require sorting and merging/finding overlaps.",
  whenToUse: [
    "Merging overlapping intervals",
    "Finding interval intersections",
    "Scheduling/calendar problems",
    "Minimum meeting rooms",
    "Insert interval",
  ],
  keyInsights: [
    "Sort by start time (usually)",
    "Compare end of current with start of next",
    "Use min-heap for meeting rooms",
    "Draw timeline to visualize",
  ],
  commonMistakes: [
    "Incorrect overlap condition",
    "Not handling edge cases (touching intervals)",
    "Wrong sorting criteria",
    "Modifying input while iterating",
  ],
  timeComplexity: {
    typical: "O(n log n) due to sorting",
    best: "O(n) if already sorted",
    worst: "O(n log n)",
  },
  spaceComplexity: {
    typical: "O(n) for result",
    notes: "O(1) if in-place modification allowed",
  },
  relatedPatterns: ["greedy", "heap", "arrays-hashing"],
  prerequisites: ["arrays-hashing"],
  codeTemplate: `def merge_intervals(intervals):
  intervals.sort(key=lambda x: x[0])
  merged = [intervals[0]]

  for start, end in intervals[1:]:
      if start <= merged[-1][1]:
          merged[-1][1] = max(merged[-1][1], end)
      else:
          merged.append([start, end])

  return merged`,
  examples: ["Merge Intervals", "Insert Interval", "Non-overlapping Intervals", "Meeting Rooms II"],
  interviewTips: [
    "Clarify: are intervals inclusive/exclusive?",
    "Draw timeline for complex cases",
    "Consider what to do with touching intervals",
  ],
}
