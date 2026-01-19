/**
 * Intervals DSA Scenarios
 * Pattern: intervals
 */

import type { DSAScenario } from "../types"

export const intervalsScenarios: DSAScenario[] = [
  {
    id: "dsa-merge-intervals",
    title: "Merge Intervals",
    type: "dsa",
    pattern: "intervals",
    difficulty: "medium",
    companies: ["Meta", "Google", "Amazon", "Microsoft"],
    description: "Merge all overlapping intervals",
    tags: ["array", "sorting", "intervals"],
    estimatedTime: 25,
    problemStatement: `Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,
    examples: [
      {
        input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        output: "[[1,6],[8,10],[15,18]]",
        explanation: "Since intervals [1,3] and [2,6] overlap, merge them into [1,6].",
      },
      {
        input: "intervals = [[1,4],[4,5]]",
        output: "[[1,5]]",
        explanation: "Intervals [1,4] and [4,5] are considered overlapping.",
      },
    ],
    constraints: [
      "1 <= intervals.length <= 10^4",
      "intervals[i].length == 2",
      "0 <= starti <= endi <= 10^4",
    ],
    hints: [
      "First, sort the intervals by their start time",
      "Iterate through sorted intervals and merge when they overlap",
      "Check if current interval overlaps with the last merged interval",
    ],
    starterCode: {
      javascript: `function merge(intervals) {
  // Write your solution here

}`,
      typescript: `function merge(intervals: number[][]): number[][] {
  // Write your solution here

}`,
      python: `def merge(intervals):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n log n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: {
          intervals: [
            [1, 3],
            [2, 6],
            [8, 10],
            [15, 18],
          ],
        },
        expected: [
          [1, 6],
          [8, 10],
          [15, 18],
        ],
        description: "Basic merge: [[1,3],[2,6]] -> [[1,6]]",
      },
      {
        input: {
          intervals: [
            [1, 4],
            [4, 5],
          ],
        },
        expected: [[1, 5]],
        description: "Adjacent intervals: [[1,4],[4,5]]",
      },
      {
        input: {
          intervals: [
            [1, 4],
            [0, 4],
          ],
        },
        expected: [[0, 4]],
        description: "Overlapping intervals",
      },
      {
        input: {
          intervals: [
            [1, 4],
            [2, 3],
          ],
        },
        expected: [[1, 4]],
        description: "Fully contained interval",
      },
      {
        input: { intervals: [[1, 4]] },
        expected: [[1, 4]],
        description: "Single interval",
      },
    ],

    // ==========================================
    // Real Interview Mode (Fuzzy Mode) Fields
    // ==========================================
    fuzzyStatement:
      "Given a list of intervals, merge all the overlapping ones.",

    clarifyingQuestions: [
      {
        topic: "overlap_definition",
        question: "What does 'overlapping' mean exactly?",
        answer:
          "Two intervals overlap if they share any point. For example, [1,4] and [4,5] overlap at point 4.",
        required: true,
      },
      {
        topic: "input_sorted",
        question: "Are the intervals sorted?",
        answer:
          "No, the intervals are not necessarily sorted. You may need to sort them.",
        required: true,
      },
      {
        topic: "interval_format",
        question: "What format is each interval?",
        answer:
          "Each interval is [start, end] where start <= end. Both are integers.",
        required: false,
      },
      {
        topic: "output_sorted",
        question: "Should the result be sorted?",
        answer: "Yes, return merged intervals sorted by start time.",
        required: false,
      },
      {
        topic: "nested_intervals",
        question: "Can intervals be nested? Like [1,10] and [2,3]?",
        answer:
          "Yes, one interval can fully contain another. They should merge into the larger one.",
        required: false,
      },
      {
        topic: "single_interval",
        question: "What if there's only one interval?",
        answer: "Return it as-is.",
        required: false,
      },
    ],

    // ==========================================
    // Proactive AI Interviewer Fields
    // ==========================================
    commonWrongApproaches: [
      {
        description: "Not sorting first - comparing non-adjacent intervals incorrectly",
        codeSignals: [
          "no sort",
          "comparing without sorting",
          "nested loops without sort",
        ],
        intervention:
          "How are you handling intervals that aren't adjacent in the array but should merge? For example, [[3,4],[1,2],[2,3]]?",
      },
      {
        description: "Checking overlap incorrectly - missing edge cases",
        codeSignals: [
          "start < end",
          "wrong overlap condition",
          "missing equality check",
        ],
        intervention:
          "Let's trace through [1,4] and [4,5]. Do they overlap? Make sure your condition handles the boundary case.",
      },
      {
        description: "Modifying array while iterating",
        codeSignals: [
          "splice inside loop",
          "removing while iterating",
          "index issues",
        ],
        intervention:
          "I see you're modifying the array while iterating. That can cause issues. Consider building a new result array instead.",
      },
    ],

    whatIfQuestions: [
      "What if all intervals overlap into one? Like [[1,4],[2,5],[3,6]]?",
      "What if no intervals overlap at all?",
      "What's the time complexity? Why do we need to sort?",
      "What if intervals are given in reverse order like [[5,6],[3,4],[1,2]]?",
    ],

    midCodingProbes: [
      {
        trigger: "sorting intervals",
        question:
          "Good, you're sorting. What are you sorting by - start time, end time, or both?",
      },
      {
        trigger: "comparing current with last merged",
        question:
          "When you find an overlap, how do you decide the end time of the merged interval?",
      },
      {
        trigger: "building result array",
        question:
          "Walk me through what happens when you process [[1,3],[2,6],[8,10]]. What's in your result after each step?",
      },
    ],

    optimizationPush: {
      suboptimalComplexity: "O(n²)",
      nudge:
        "Your solution compares each interval with every other. Can you do it in O(n log n) by sorting first and then a single pass?",
    },
  },

  {
    id: "dsa-insert-interval",
    title: "Insert Interval",
    type: "dsa",
    pattern: "intervals",
    difficulty: "medium",
    companies: ["Google", "Amazon", "Meta", "Microsoft"],
    description: "Insert a new interval into a sorted list of non-overlapping intervals",
    tags: ["array", "intervals"],
    estimatedTime: 25,
    problemStatement: `You are given an array of non-overlapping intervals intervals where intervals[i] = [starti, endi] represent the start and the end of the ith interval and intervals is sorted in ascending order by starti. You are also given an interval newInterval = [start, end] that represents the start and end of another interval.

Insert newInterval into intervals such that intervals is still sorted in ascending order by starti and intervals still does not have any overlapping intervals (merge overlapping intervals if necessary).

Return intervals after the insertion.`,
    examples: [
      {
        input: "intervals = [[1,3],[6,9]], newInterval = [2,5]",
        output: "[[1,5],[6,9]]",
      },
      {
        input: "intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]",
        output: "[[1,2],[3,10],[12,16]]",
        explanation: "The new interval [4,8] overlaps with [3,5],[6,7],[8,10].",
      },
    ],
    constraints: [
      "0 <= intervals.length <= 10^4",
      "intervals[i].length == 2",
      "0 <= starti <= endi <= 10^5",
      "intervals is sorted by starti in ascending order.",
      "newInterval.length == 2",
      "0 <= start <= end <= 10^5",
    ],
    hints: [
      "Three phases: intervals before, overlapping with, and after newInterval",
      "Add all intervals that end before newInterval starts",
      "Merge all overlapping intervals with newInterval",
      "Add all intervals that start after newInterval ends",
    ],
    starterCode: {
      javascript: `function insert(intervals, newInterval) {
  // Insert and merge the new interval
}`,
      typescript: `function insert(intervals: number[][], newInterval: number[]): number[][] {
  // Insert and merge the new interval
}`,
      python: `def insert(intervals: list[list[int]], newInterval: list[int]) -> list[list[int]]:
    # Insert and merge the new interval
    pass`,
      java: `class Solution {
    public int[][] insert(int[][] intervals, int[] newInterval) {
        // Insert and merge the new interval
        return new int[][]{};
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: {
          intervals: [
            [1, 3],
            [6, 9],
          ],
          newInterval: [2, 5],
        },
        expected: [
          [1, 5],
          [6, 9],
        ],
        description: "Merge with one interval",
      },
      {
        input: {
          intervals: [
            [1, 2],
            [3, 5],
            [6, 7],
            [8, 10],
            [12, 16],
          ],
          newInterval: [4, 8],
        },
        expected: [
          [1, 2],
          [3, 10],
          [12, 16],
        ],
        description: "Merge with multiple intervals",
      },
      {
        input: { intervals: [], newInterval: [5, 7] },
        expected: [[5, 7]],
        description: "Empty intervals",
      },
      {
        input: { intervals: [[1, 5]], newInterval: [2, 3] },
        expected: [[1, 5]],
        description: "New interval fully contained",
      },
    ],
  },

  {
    id: "dsa-non-overlapping-intervals-intervals",
    title: "Non-overlapping Intervals",
    type: "dsa",
    pattern: "intervals",
    difficulty: "medium",
    companies: ["Google", "Amazon", "Meta"],
    description: "Find minimum number of intervals to remove to make rest non-overlapping",
    tags: ["array", "greedy", "sorting", "intervals"],
    estimatedTime: 25,
    problemStatement: `Given an array of intervals intervals where intervals[i] = [starti, endi], return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.`,
    examples: [
      {
        input: "intervals = [[1,2],[2,3],[3,4],[1,3]]",
        output: "1",
        explanation: "[1,3] can be removed and the rest of the intervals are non-overlapping.",
      },
      {
        input: "intervals = [[1,2],[1,2],[1,2]]",
        output: "2",
        explanation: "You need to remove two [1,2] to make the rest non-overlapping.",
      },
      {
        input: "intervals = [[1,2],[2,3]]",
        output: "0",
        explanation: "No intervals need to be removed as they are already non-overlapping.",
      },
    ],
    constraints: [
      "1 <= intervals.length <= 10^5",
      "intervals[i].length == 2",
      "-5 * 10^4 <= starti < endi <= 5 * 10^4",
    ],
    hints: [
      "This is an interval scheduling maximization problem",
      "Sort by end time, greedily select non-overlapping intervals",
      "Count how many intervals we can keep, subtract from total",
      "Always prefer intervals that end earlier (leave room for more)",
    ],
    starterCode: {
      javascript: `function eraseOverlapIntervals(intervals) {
  // Find minimum removals using greedy approach
}`,
      typescript: `function eraseOverlapIntervals(intervals: number[][]): number {
  // Find minimum removals using greedy approach
}`,
      python: `def eraseOverlapIntervals(intervals: list[list[int]]) -> int:
    # Find minimum removals using greedy approach
    pass`,
      java: `class Solution {
    public int eraseOverlapIntervals(int[][] intervals) {
        // Find minimum removals using greedy approach
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n log n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: {
          intervals: [
            [1, 2],
            [2, 3],
            [3, 4],
            [1, 3],
          ],
        },
        expected: 1,
        description: "Remove one overlapping interval",
      },
      {
        input: {
          intervals: [
            [1, 2],
            [1, 2],
            [1, 2],
          ],
        },
        expected: 2,
        description: "All same intervals",
      },
      {
        input: {
          intervals: [
            [1, 2],
            [2, 3],
          ],
        },
        expected: 0,
        description: "Already non-overlapping",
      },
      {
        input: {
          intervals: [
            [1, 100],
            [11, 22],
            [1, 11],
            [2, 12],
          ],
        },
        expected: 2,
        description: "Complex overlapping",
      },
    ],
  },

  {
    id: "dsa-meeting-rooms-ii",
    title: "Meeting Rooms II",
    type: "dsa",
    pattern: "intervals",
    difficulty: "medium",
    companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
    description: "Find the minimum number of conference rooms required",
    tags: ["array", "heap", "sorting", "intervals", "two-pointers"],
    estimatedTime: 25,
    problemStatement: `Given an array of meeting time intervals intervals where intervals[i] = [starti, endi], return the minimum number of conference rooms required.`,
    examples: [
      {
        input: "intervals = [[0,30],[5,10],[15,20]]",
        output: "2",
        explanation:
          "Meetings [0,30] and [5,10] overlap, then [0,30] and [15,20] overlap. Need 2 rooms.",
      },
      {
        input: "intervals = [[7,10],[2,4]]",
        output: "1",
        explanation: "Meetings do not overlap, so 1 room is enough.",
      },
    ],
    constraints: ["1 <= intervals.length <= 10^4", "0 <= starti < endi <= 10^6"],
    hints: [
      "Sort intervals by start time",
      "Use a min-heap to track end times of ongoing meetings",
      "For each meeting, if earliest ending meeting ends before this starts, reuse that room",
      "Otherwise, allocate a new room",
      "Alternative: Sort start and end times separately, use two pointers",
    ],
    starterCode: {
      javascript: `function minMeetingRooms(intervals) {
  // Find minimum rooms using heap or two pointers
}`,
      typescript: `function minMeetingRooms(intervals: number[][]): number {
  // Find minimum rooms using heap or two pointers
}`,
      python: `def minMeetingRooms(intervals: list[list[int]]) -> int:
    # Find minimum rooms using heap or two pointers
    pass`,
      java: `class Solution {
    public int minMeetingRooms(int[][] intervals) {
        // Find minimum rooms using heap or two pointers
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n log n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: {
          intervals: [
            [0, 30],
            [5, 10],
            [15, 20],
          ],
        },
        expected: 2,
        description: "Multiple overlapping meetings",
      },
      {
        input: {
          intervals: [
            [7, 10],
            [2, 4],
          ],
        },
        expected: 1,
        description: "Non-overlapping meetings",
      },
      {
        input: {
          intervals: [
            [1, 5],
            [2, 6],
            [3, 7],
            [4, 8],
          ],
        },
        expected: 4,
        description: "All overlap - need 4 rooms",
      },
      {
        input: { intervals: [[1, 2]] },
        expected: 1,
        description: "Single meeting",
      },
    ],
  },
  // ==================== NEW HIGH-VALUE ADDITIONS ====================
  {
    id: "dsa-meeting-rooms",
    title: "Meeting Rooms",
    type: "dsa",
    pattern: "intervals",
    difficulty: "easy",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Check if a person can attend all meetings",
    tags: ["array", "sorting", "intervals"],
    estimatedTime: 15,
    problemStatement: `Given an array of meeting time intervals where intervals[i] = [starti, endi], determine if a person could attend all meetings.`,
    examples: [
      {
        input: "intervals = [[0,30],[5,10],[15,20]]",
        output: "false",
        explanation: "Meeting [0,30] overlaps with [5,10] and [15,20].",
      },
      {
        input: "intervals = [[7,10],[2,4]]",
        output: "true",
        explanation: "Meetings don't overlap.",
      },
    ],
    constraints: [
      "0 <= intervals.length <= 10^4",
      "intervals[i].length == 2",
      "0 <= starti < endi <= 10^6",
    ],
    hints: [
      "Sort by start time",
      "Check if any meeting starts before previous one ends",
      "If any overlap found, return false",
    ],
    starterCode: {
      javascript: `function canAttendMeetings(intervals) {\n  // Write your solution here\n\n}`,
      typescript: `function canAttendMeetings(intervals: number[][]): boolean {\n  // Write your solution here\n\n}`,
      python: `def canAttendMeetings(intervals):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n log n)", space: "O(1)" },
    testCases: [
      {
        input: {
          intervals: [
            [0, 30],
            [5, 10],
            [15, 20],
          ],
        },
        expected: false,
        description: "Overlapping meetings",
      },
      {
        input: {
          intervals: [
            [7, 10],
            [2, 4],
          ],
        },
        expected: true,
        description: "No overlap",
      },
      { input: { intervals: [] }, expected: true, description: "No meetings" },
    ],
  },
]

export default intervalsScenarios
