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
  {
    id: 'dsa-find-first-last-position',
    title: 'Find First and Last Position of Element in Sorted Array',
    type: 'dsa',
    pattern: 'binary-search',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    description: 'Find the starting and ending position of a target value in a sorted array',
    tags: ['array', 'binary-search'],
    estimatedTime: 25,
    problemStatement: `Given an array of integers nums sorted in non-decreasing order, find the starting and ending position of a given target value. If target is not found in the array, return [-1, -1]. You must write an algorithm with O(log n) runtime complexity.`,
    examples: [
      { input: 'nums = [5,7,7,8,8,10], target = 8', output: '[3,4]' },
      { input: 'nums = [5,7,7,8,8,10], target = 6', output: '[-1,-1]' },
      { input: 'nums = [], target = 0', output: '[-1,-1]' },
    ],
    constraints: ['0 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9', 'nums is a non-decreasing array', '-10^9 <= target <= 10^9'],
    hints: ['Use two separate binary searches', 'First search for leftmost occurrence', 'Then search for rightmost occurrence'],
    starterCode: {
      javascript: `function searchRange(nums, target) {\n  // Write your solution here\n\n}`,
      typescript: `function searchRange(nums: number[], target: number): number[] {\n  // Write your solution here\n\n}`,
      python: `def searchRange(nums, target):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(log n)', space: 'O(1)' },
    testCases: [
      { input: { nums: [5,7,7,8,8,10], target: 8 }, expected: [3,4], description: 'Target found multiple times' },
      { input: { nums: [5,7,7,8,8,10], target: 6 }, expected: [-1,-1], description: 'Target not found' },
    ],
  },
  {
    id: 'dsa-find-minimum-rotated-sorted-array',
    title: 'Find Minimum in Rotated Sorted Array',
    type: 'dsa',
    pattern: 'binary-search',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    description: 'Find the minimum element in a rotated sorted array',
    tags: ['array', 'binary-search'],
    estimatedTime: 20,
    problemStatement: `Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the sorted rotated array nums of unique elements, return the minimum element of this array. You must write an algorithm that runs in O(log n) time.`,
    examples: [
      { input: 'nums = [3,4,5,1,2]', output: '1', explanation: 'The original array was [1,2,3,4,5] rotated 3 times.' },
      { input: 'nums = [4,5,6,7,0,1,2]', output: '0' },
      { input: 'nums = [11,13,15,17]', output: '11', explanation: 'Not rotated.' },
    ],
    constraints: ['n == nums.length', '1 <= n <= 5000', '-5000 <= nums[i] <= 5000', 'All the integers of nums are unique'],
    hints: ['Use binary search to find the pivot point', 'Compare mid element with rightmost element', 'If mid > right, minimum is in right half'],
    starterCode: {
      javascript: `function findMin(nums) {\n  // Write your solution here\n\n}`,
      typescript: `function findMin(nums: number[]): number {\n  // Write your solution here\n\n}`,
      python: `def findMin(nums):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(log n)', space: 'O(1)' },
    testCases: [
      { input: { nums: [3,4,5,1,2] }, expected: 1, description: 'Rotated array' },
      { input: { nums: [11,13,15,17] }, expected: 11, description: 'Not rotated' },
    ],
  },
  {
    id: 'dsa-search-2d-matrix',
    title: 'Search a 2D Matrix',
    type: 'dsa',
    pattern: 'binary-search',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    description: 'Search for a value in an m x n matrix with sorted rows',
    tags: ['array', 'binary-search', 'matrix'],
    estimatedTime: 20,
    problemStatement: `You are given an m x n integer matrix with the following properties: Each row is sorted in non-decreasing order. The first integer of each row is greater than the last integer of the previous row. Given an integer target, return true if target is in matrix or false otherwise. You must write a solution in O(log(m * n)) time complexity.`,
    examples: [
      { input: 'matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3', output: 'true' },
      { input: 'matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13', output: 'false' },
    ],
    constraints: ['m == matrix.length', 'n == matrix[i].length', '1 <= m, n <= 100', '-10^4 <= matrix[i][j], target <= 10^4'],
    hints: ['Treat matrix as a 1D sorted array', 'Use binary search on virtual indices', 'Convert 1D index to 2D: row = idx / n, col = idx % n'],
    starterCode: {
      javascript: `function searchMatrix(matrix, target) {\n  // Write your solution here\n\n}`,
      typescript: `function searchMatrix(matrix: number[][], target: number): boolean {\n  // Write your solution here\n\n}`,
      python: `def searchMatrix(matrix, target):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(log(m * n))', space: 'O(1)' },
    testCases: [
      { input: { matrix: [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target: 3 }, expected: true, description: 'Target found' },
      { input: { matrix: [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target: 13 }, expected: false, description: 'Target not found' },
    ],
  },
  {
    id: 'dsa-koko-eating-bananas',
    title: 'Koko Eating Bananas',
    type: 'dsa',
    pattern: 'binary-search',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google'],
    description: 'Find the minimum eating speed to finish all bananas within h hours',
    tags: ['array', 'binary-search'],
    estimatedTime: 25,
    problemStatement: `Koko loves to eat bananas. There are n piles of bananas, the ith pile has piles[i] bananas. The guards have gone and will come back in h hours. Koko can decide her bananas-per-hour eating speed of k. Each hour, she chooses a pile and eats k bananas from it. If the pile has less than k bananas, she eats all of them and won't eat any more bananas during that hour. Return the minimum integer k such that she can eat all the bananas within h hours.`,
    examples: [
      { input: 'piles = [3,6,7,11], h = 8', output: '4' },
      { input: 'piles = [30,11,23,4,20], h = 5', output: '30' },
      { input: 'piles = [30,11,23,4,20], h = 6', output: '23' },
    ],
    constraints: ['1 <= piles.length <= 10^4', 'piles.length <= h <= 10^9', '1 <= piles[i] <= 10^9'],
    hints: ['Binary search on the eating speed k', 'For each speed, calculate hours needed', 'Find minimum speed where hours <= h'],
    starterCode: {
      javascript: `function minEatingSpeed(piles, h) {\n  // Write your solution here\n\n}`,
      typescript: `function minEatingSpeed(piles: number[], h: number): number {\n  // Write your solution here\n\n}`,
      python: `def minEatingSpeed(piles, h):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(n * log(max(piles)))', space: 'O(1)' },
    testCases: [
      { input: { piles: [3,6,7,11], h: 8 }, expected: 4, description: 'Basic case' },
      { input: { piles: [30,11,23,4,20], h: 5 }, expected: 30, description: 'Tight constraint' },
    ],
  },
  {
    id: 'dsa-median-two-sorted-arrays',
    title: 'Median of Two Sorted Arrays',
    type: 'dsa',
    pattern: 'binary-search',
    difficulty: 'hard',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Apple'],
    description: 'Find the median of two sorted arrays in O(log(m+n)) time',
    tags: ['array', 'binary-search', 'divide-and-conquer'],
    estimatedTime: 40,
    problemStatement: `Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).`,
    examples: [
      { input: 'nums1 = [1,3], nums2 = [2]', output: '2.00000', explanation: 'merged array = [1,2,3] and median is 2.' },
      { input: 'nums1 = [1,2], nums2 = [3,4]', output: '2.50000', explanation: 'merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.' },
    ],
    constraints: ['nums1.length == m', 'nums2.length == n', '0 <= m <= 1000', '0 <= n <= 1000', '1 <= m + n <= 2000', '-10^6 <= nums1[i], nums2[i] <= 10^6'],
    hints: ['Binary search on the smaller array', 'Find partition that balances left and right halves', 'Median is max(left partition) or avg of max(left) and min(right)'],
    starterCode: {
      javascript: `function findMedianSortedArrays(nums1, nums2) {\n  // Write your solution here\n\n}`,
      typescript: `function findMedianSortedArrays(nums1: number[], nums2: number[]): number {\n  // Write your solution here\n\n}`,
      python: `def findMedianSortedArrays(nums1, nums2):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(log(min(m, n)))', space: 'O(1)' },
    testCases: [
      { input: { nums1: [1,3], nums2: [2] }, expected: 2.0, description: 'Odd total length' },
      { input: { nums1: [1,2], nums2: [3,4] }, expected: 2.5, description: 'Even total length' },
    ],
  },
]

export default binarySearchScenarios
