/**
 * Arrays & Hashing DSA Scenarios
 * Pattern: arrays-hashing
 *
 * These scenarios test fundamental array manipulation and
 * hash table usage skills.
 */

import type { DSAScenario } from '../types'

export const arraysHashingScenarios: DSAScenario[] = [
  {
    id: 'dsa-two-sum',
    title: 'Two Sum',
    type: 'dsa',
    pattern: 'arrays-hashing', // NeetCode category
    difficulty: 'easy',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple'],
    description: 'Find two numbers in an array that add up to a target value',
    tags: ['array', 'hash-table', 'two-pointers'],
    estimatedTime: 15,
    problemStatement: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0,1]',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    hints: [
      'Try using a hash map to store values you\'ve already seen',
      'For each number, check if (target - current number) exists in your hash map',
      'The optimal solution has O(n) time complexity',
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {
  // Write your solution here

}`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
  // Write your solution here

}`,
      python: `def two_sum(nums, target):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here

    }
};`,
      csharp: `public class Solution {
    public int[] TwoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}`,
      go: `func twoSum(nums []int, target int) []int {
    // Write your solution here
    return []int{}
}`,
      rust: `impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        // Write your solution here
        vec![]
    }
}`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)',
    },
    testCases: [
      {
        input: { nums: [2, 7, 11, 15], target: 9 },
        expected: [0, 1],
        description: 'Basic case: [2,7,11,15], target 9',
      },
      {
        input: { nums: [3, 2, 4], target: 6 },
        expected: [1, 2],
        description: 'Non-adjacent pair: [3,2,4], target 6',
      },
      {
        input: { nums: [3, 3], target: 6 },
        expected: [0, 1],
        description: 'Duplicate numbers: [3,3], target 6',
      },
      {
        input: { nums: [-1, -2, -3, -4, -5], target: -8 },
        expected: [2, 4],
        description: 'Negative numbers',
      },
      {
        input: { nums: [0, 4, 3, 0], target: 0 },
        expected: [0, 3],
        description: 'Zeros: [0,4,3,0], target 0',
      },
    ],
  },
]

// Re-export for convenience
export default arraysHashingScenarios
