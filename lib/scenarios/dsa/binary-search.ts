/**
 * Binary Search DSA Scenarios
 * Pattern: binary-search
 */

import type { DSAScenario } from '../types'

export const binarySearchScenarios: DSAScenario[] = [
  {
    id: 'dsa-binary-search',
    title: 'Binary Search',
    type: 'dsa',
    pattern: 'binary-search',
    difficulty: 'easy',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft'],
    description: 'Implement binary search on a sorted array',
    tags: ['array', 'binary-search'],
    estimatedTime: 15,
    problemStatement: `Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.

You must write an algorithm with O(log n) runtime complexity.`,
    examples: [
      {
        input: 'nums = [-1,0,3,5,9,12], target = 9',
        output: '4',
        explanation: '9 exists in nums and its index is 4',
      },
      {
        input: 'nums = [-1,0,3,5,9,12], target = 2',
        output: '-1',
        explanation: '2 does not exist in nums so return -1',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^4',
      '-10^4 < nums[i], target < 10^4',
      'All the integers in nums are unique',
      'nums is sorted in ascending order',
    ],
    hints: [
      'Use two pointers: left and right',
      'Calculate mid and compare with target',
      'Adjust left or right based on comparison',
    ],
    starterCode: {
      javascript: `function search(nums, target) {
  // Write your solution here

}`,
      typescript: `function search(nums: number[], target: number): number {
  // Write your solution here

}`,
      python: `def search(nums, target):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(log n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 },
        expected: 4,
        description: 'Target found at index 4',
      },
      {
        input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 },
        expected: -1,
        description: 'Target not found',
      },
      {
        input: { nums: [5], target: 5 },
        expected: 0,
        description: 'Single element, found',
      },
      {
        input: { nums: [5], target: -5 },
        expected: -1,
        description: 'Single element, not found',
      },
      {
        input: { nums: [1, 3, 5, 7, 9, 11, 13, 15], target: 1 },
        expected: 0,
        description: 'Target at beginning',
      },
      {
        input: { nums: [1, 3, 5, 7, 9, 11, 13, 15], target: 15 },
        expected: 7,
        description: 'Target at end',
      },
    ],
  },
  {
    id: 'dsa-search-rotated-sorted-array',
    title: 'Search in Rotated Sorted Array',
    type: 'dsa',
    pattern: 'binary-search',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Microsoft', 'Google'],
    description: 'Search for a target value in a rotated sorted array',
    tags: ['array', 'binary-search'],
    estimatedTime: 20,
    problemStatement: `There is an integer array nums sorted in ascending order (with distinct values).

Prior to being passed to your function, nums is possibly rotated at an unknown pivot index k (1 <= k < nums.length) such that the resulting array is [nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]] (0-indexed). For example, [0,1,2,4,5,6,7] might be rotated at pivot index 3 and become [4,5,6,7,0,1,2].

Given the array nums after the possible rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.

You must write an algorithm with O(log n) runtime complexity.`,
    examples: [
      {
        input: 'nums = [4,5,6,7,0,1,2], target = 0',
        output: '4',
      },
      {
        input: 'nums = [4,5,6,7,0,1,2], target = 3',
        output: '-1',
      },
      {
        input: 'nums = [1], target = 0',
        output: '-1',
      },
    ],
    constraints: [
      '1 <= nums.length <= 5000',
      '-10^4 <= nums[i] <= 10^4',
      'All values of nums are unique',
      'nums is an ascending array that is possibly rotated',
      '-10^4 <= target <= 10^4',
    ],
    hints: [
      'Use modified binary search',
      'Determine which half is sorted, then decide which half to search',
      'Check if target is in the sorted half range',
    ],
    starterCode: {
      javascript: `function search(nums, target) {
  // Write your solution here

}`,
      typescript: `function search(nums: number[], target: number): number {
  // Write your solution here

}`,
      python: `def search(nums, target):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int search(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}`,
      cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        // Write your solution here
        return -1;
    }
};`,
      csharp: `public class Solution {
    public int Search(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}`,
      go: `func search(nums []int, target int) int {
    // Write your solution here
    return -1
}`,
      rust: `impl Solution {
    pub fn search(nums: Vec<i32>, target: i32) -> i32 {
        // Write your solution here
        -1
    }
}`,
    },
    optimalComplexity: {
      time: 'O(log n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { nums: [4,5,6,7,0,1,2], target: 0 },
        expected: 4,
        description: 'Target in rotated section',
      },
      {
        input: { nums: [4,5,6,7,0,1,2], target: 3 },
        expected: -1,
        description: 'Target not in array',
      },
      {
        input: { nums: [1], target: 0 },
        expected: -1,
        description: 'Single element, not found',
      },
      {
        input: { nums: [1], target: 1 },
        expected: 0,
        description: 'Single element, found',
      },
      {
        input: { nums: [5,1,3], target: 5 },
        expected: 0,
        description: 'Small rotated array',
      },
    ],
  },
]

export default binarySearchScenarios
