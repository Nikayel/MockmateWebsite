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
    companies: ["Meta", "Google", "Amazon", "Microsoft", "Palantir"],
    roles: ["new-grad", "junior", "senior", "swe", "fdse"],
    description: "Collapse every cluster of overlapping ranges into a single span",
    tags: ["array", "sorting", "intervals"],
    estimatedTime: 25,
    problemStatement: `You're given an array intervals, where each entry intervals[i] = [starti, endi] marks the start and end of one range. Some of these ranges collide with one another. Combine every group of colliding ranges into a single continuous span, and return the list of spans left over, ordered by start. That list must hold only disjoint spans which together cover everything the input covered.

Two ranges collide even when they only touch: if one ends exactly where the next begins, both belong in the same merged span.`,
    examples: [
      {
        input: "intervals = [[2,5],[4,9],[6,7],[12,14]]",
        output: "[[2,9],[12,14]]",
        explanation: "[2,5], [4,9], and [6,7] chain into [2,9]; [12,14] stays separate.",
      },
      {
        input: "intervals = [[3,6],[6,8]]",
        output: "[[3,8]]",
        explanation: "[3,6] and [6,8] touch at 6, so they fuse into one span [3,8].",
      },
    ],
    constraints: [
      "The list holds between 1 and 10^4 ranges.",
      "Each range is a pair of exactly 2 values, a start and an end.",
      "0 <= starti <= endi <= 10^4 for every range.",
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
    fuzzyStatement: "Given a list of intervals, merge all the overlapping ones.",

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
        answer: "No, the intervals are not necessarily sorted. You may need to sort them.",
        required: true,
      },
      {
        topic: "interval_format",
        question: "What format is each interval?",
        answer: "Each interval is [start, end] where start <= end. Both are integers.",
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
        codeSignals: ["no sort", "comparing without sorting", "nested loops without sort"],
        intervention:
          "How are you handling intervals that aren't adjacent in the array but should merge? For example, [[3,4],[1,2],[2,3]]?",
      },
      {
        description: "Checking overlap incorrectly - missing edge cases",
        codeSignals: ["start < end", "wrong overlap condition", "missing equality check"],
        intervention:
          "Let's trace through [1,4] and [4,5]. Do they overlap? Make sure your condition handles the boundary case.",
      },
      {
        description: "Modifying array while iterating",
        codeSignals: ["splice inside loop", "removing while iterating", "index issues"],
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
        question: "Good, you're sorting. What are you sorting by - start time, end time, or both?",
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
    problemStatement: `You're given intervals, a list of ranges that already sits in ascending order by start and contains no collisions, with intervals[i] = [starti, endi]. One extra range arrives as newInterval = [start, end].

Work newInterval into the list so that both guarantees still hold afterward: ascending order by start, and no two ranges colliding. Wherever the newcomer runs into existing ranges, fold all of them together into a single span. Ranges that merely touch at an endpoint count as colliding. Return the updated list.`,
    examples: [
      {
        input: "intervals = [[2,4],[7,9]], newInterval = [3,6]",
        output: "[[2,6],[7,9]]",
      },
      {
        input: "intervals = [[1,2],[4,6],[7,8],[9,11],[14,17]], newInterval = [5,9]",
        output: "[[1,2],[4,11],[14,17]]",
        explanation:
          "newInterval [5,9] collides with [4,6], [7,8], and [9,11], so all four become [4,11].",
      },
    ],
    constraints: [
      "The list can hold anywhere from 0 up to 10^4 ranges.",
      "Each existing range is a pair of exactly 2 endpoints.",
      "Existing endpoints satisfy 0 <= starti <= endi <= 10^5.",
      "The list arrives ordered by its start values, smallest first.",
      "newInterval is likewise a pair of 2 endpoints.",
      "Its endpoints satisfy 0 <= start <= end <= 10^5.",
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
    description: "Count the fewest deletions that leave no two ranges in conflict",
    tags: ["array", "sorting", "greedy", "intervals"],
    estimatedTime: 25,
    problemStatement: `You're handed a batch of ranges as intervals, where intervals[i] = [starti, endi]. Some of them conflict with each other. Delete as few ranges as possible so that the survivors are mutually conflict-free, then report how many deletions that took.

For this problem, two ranges conflict only when their interiors genuinely cross. Sharing a boundary point alone is harmless: [1,2] and [2,3] can coexist untouched.`,
    examples: [
      {
        input: "intervals = [[5,8],[8,10],[10,12],[6,11]]",
        output: "1",
        explanation: "Dropping [6,11] leaves ranges that only meet at edges, which is allowed.",
      },
      {
        input: "intervals = [[4,7],[4,7],[4,7],[4,7]]",
        output: "3",
        explanation: "Only one copy of [4,7] can stay, so the other three must go.",
      },
      {
        input: "intervals = [[3,5],[5,9]]",
        output: "0",
        explanation: "These two merely touch at 5, so nothing has to be deleted.",
      },
    ],
    constraints: [
      "Expect anywhere from 1 to 10^5 ranges.",
      "A range always carries exactly 2 numbers.",
      "Every bound fits within -5 * 10^4 <= starti < endi <= 5 * 10^4.",
    ],
    hints: [
      "This is an interval scheduling maximization problem",
      "Sort by end time, greedily select non-overlapping intervals",
      "Count how many intervals we can keep, subtract from total",
      "Always prefer intervals that end earlier (leave room for more)",
    ],
    starterCode: {
      javascript: `function eraseOverlapIntervals(intervals) {
  // Write your solution here
}`,
      typescript: `function eraseOverlapIntervals(intervals: number[][]): number {
  // Write your solution here
}`,
      python: `def eraseOverlapIntervals(intervals: list[list[int]]) -> int:
    # Write your solution here
    pass`,
      java: `class Solution {
    public int eraseOverlapIntervals(int[][] intervals) {
        // Write your solution here
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
    description: "Figure out how many rooms must be reserved for a day of meetings",
    tags: ["array", "sorting", "heap", "intervals", "two-pointers"],
    estimatedTime: 25,
    problemStatement: `Your company's calendar for the day lives in intervals, with intervals[i] = [starti, endi] describing when each meeting runs. Two meetings whose times cross cannot share a room, so you must decide how much space to reserve. A meeting that ends at some time and another that starts at that exact time can share a room.

Return the smallest count of rooms that lets every meeting take place exactly as scheduled.`,
    examples: [
      {
        input: "intervals = [[1,12],[3,7],[8,11]]",
        output: "2",
        explanation:
          "[1,12] occupies one room the whole time while [3,7] and later [8,11] use a second.",
      },
      {
        input: "intervals = [[9,11],[13,15]]",
        output: "1",
        explanation: "One meeting wraps up before the other begins, so a single room does it.",
      },
    ],
    constraints: [
      "The schedule contains between 1 and 10^4 meetings.",
      "Times obey 0 <= starti < endi <= 10^6.",
    ],
    hints: [
      "Sort intervals by start time",
      "Use a min-heap to track end times of ongoing meetings",
      "For each meeting, if earliest ending meeting ends before this starts, reuse that room",
      "Otherwise, allocate a new room",
      "Alternative: Sort start and end times separately, use two pointers",
    ],
    starterCode: {
      javascript: `function minMeetingRooms(intervals) {
  // Write your solution here
}`,
      typescript: `function minMeetingRooms(intervals: number[][]): number {
  // Write your solution here
}`,
      python: `def minMeetingRooms(intervals: list[list[int]]) -> int:
    # Write your solution here
    pass`,
      java: `class Solution {
    public int minMeetingRooms(int[][] intervals) {
        // Write your solution here
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
    description: "Decide whether one calendar is free of double-bookings",
    tags: ["array", "sorting", "intervals"],
    estimatedTime: 15,
    problemStatement: `You're looking after one person's schedule, given as intervals with intervals[i] = [starti, endi] for each appointment. Nobody can sit in two appointments at the same time, though an appointment ending exactly when the next one starts is fine.

Report true if the whole agenda can be attended from start to finish, and false if any two entries clash.`,
    examples: [
      {
        input: "intervals = [[2,9],[4,6],[11,14]]",
        output: "false",
        explanation: "[4,6] falls entirely inside [2,9], so those two clash.",
      },
      {
        input: "intervals = [[6,8],[1,4]]",
        output: "true",
        explanation: "The earlier appointment ends before the later one starts.",
      },
    ],
    constraints: [
      "There may be no appointments at all: the count runs from 0 to 10^4.",
      "Each appointment is a pair of exactly 2 numbers.",
      "Times satisfy 0 <= starti < endi <= 10^6.",
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
