/**
 * Intervals DSA Scenarios
 * Pattern: intervals
 */

import type { DSAScenario } from '../types'

export const intervalsScenarios: DSAScenario[] = [
  {
    id: 'dsa-merge-intervals',
    title: 'Merge Intervals',
    type: 'dsa',
    pattern: 'intervals',
    difficulty: 'medium',
    companies: ['Meta', 'Google', 'Amazon', 'Microsoft'],
    description: 'Merge all overlapping intervals',
    tags: ['array', 'sorting', 'intervals'],
    estimatedTime: 25,
    problemStatement: `Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,
    examples: [
      {
        input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]',
        output: '[[1,6],[8,10],[15,18]]',
        explanation: 'Since intervals [1,3] and [2,6] overlap, merge them into [1,6].',
      },
      {
        input: 'intervals = [[1,4],[4,5]]',
        output: '[[1,5]]',
        explanation: 'Intervals [1,4] and [4,5] are considered overlapping.',
      },
    ],
    constraints: [
      '1 <= intervals.length <= 10^4',
      'intervals[i].length == 2',
      '0 <= starti <= endi <= 10^4',
    ],
    hints: [
      'First, sort the intervals by their start time',
      'Iterate through sorted intervals and merge when they overlap',
      'Check if current interval overlaps with the last merged interval',
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
      time: 'O(n log n)',
      space: 'O(n)',
    },
    testCases: [
      {
        input: { intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] },
        expected: [[1, 6], [8, 10], [15, 18]],
        description: 'Basic merge: [[1,3],[2,6]] -> [[1,6]]',
      },
      {
        input: { intervals: [[1, 4], [4, 5]] },
        expected: [[1, 5]],
        description: 'Adjacent intervals: [[1,4],[4,5]]',
      },
      {
        input: { intervals: [[1, 4], [0, 4]] },
        expected: [[0, 4]],
        description: 'Overlapping intervals',
      },
      {
        input: { intervals: [[1, 4], [2, 3]] },
        expected: [[1, 4]],
        description: 'Fully contained interval',
      },
      {
        input: { intervals: [[1, 4]] },
        expected: [[1, 4]],
        description: 'Single interval',
      },
    ],
  },
]

export default intervalsScenarios
