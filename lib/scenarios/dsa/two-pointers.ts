/**
 * Two Pointers DSA Scenarios
 * Pattern: two-pointers
 */

import type { DSAScenario } from "../types"

export const twoPointersScenarios: DSAScenario[] = [
  {
    id: "dsa-3sum",
    title: "3Sum",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "medium",
    companies: ["Meta", "Amazon", "Microsoft", "Apple"],
    description: "Find all unique triplets that sum to zero",
    tags: ["array", "two-pointers", "sorting"],
    estimatedTime: 30,
    problemStatement: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets.`,
    examples: [
      {
        input: "nums = [-1,0,1,2,-1,-4]",
        output: "[[-1,-1,2],[-1,0,1]]",
      },
      {
        input: "nums = [0,1,1]",
        output: "[]",
      },
      {
        input: "nums = [0,0,0]",
        output: "[[0,0,0]]",
      },
    ],
    constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
    hints: [
      "Sort the array first",
      "Fix one number and use two pointers for the remaining two",
      "Skip duplicates to avoid duplicate triplets",
    ],
    starterCode: {
      javascript: `function threeSum(nums) {
  // Write your solution here

}`,
      typescript: `function threeSum(nums: number[]): number[][] {
  // Write your solution here

}`,
      python: `def threeSum(nums):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n²)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [-1, 0, 1, 2, -1, -4] },
        expected: [
          [-1, -1, 2],
          [-1, 0, 1],
        ],
        description: "Multiple triplets (order does not matter)",
        compareAsSet: true,
      },
      {
        input: { nums: [0, 1, 1] },
        expected: [],
        description: "No valid triplets",
      },
      {
        input: { nums: [0, 0, 0] },
        expected: [[0, 0, 0]],
        description: "All zeros",
      },
      {
        input: { nums: [-2, 0, 1, 1, 2] },
        expected: [
          [-2, 0, 2],
          [-2, 1, 1],
        ],
        description: "Multiple solutions with duplicates (order does not matter)",
        compareAsSet: true,
      },
      {
        input: { nums: [1, 2, -2, -1] },
        expected: [],
        description: "No triplets sum to zero",
      },
    ],
  },
  {
    id: "dsa-trapping-rain-water-two-pointers",
    title: "Trapping Rain Water (Two Pointers)",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "hard",
    companies: ["Google", "Meta", "Amazon", "Microsoft"],
    description: "Calculate how much water can be trapped after raining given an elevation map",
    tags: ["array", "two-pointers", "dynamic-programming", "stack"],
    estimatedTime: 30,
    problemStatement: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation: "The elevation map traps 6 units of rain water.",
      },
      {
        input: "height = [4,2,0,3,2,5]",
        output: "9",
      },
    ],
    constraints: ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"],
    hints: [
      "For each position, water level is determined by min(max_left, max_right) - height[i]",
      "Use two pointers from both ends",
      "Track the maximum heights seen so far from left and right",
    ],
    starterCode: {
      javascript: `function trap(height) {
  // Write your solution here

}`,
      typescript: `function trap(height: number[]): number {
  // Write your solution here

}`,
      python: `def trap(height):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int trap(int[] height) {
        // Write your solution here
        return 0;
    }
}`,
      cpp: `class Solution {
public:
    int trap(vector<int>& height) {
        // Write your solution here
        return 0;
    }
};`,
      csharp: `public class Solution {
    public int Trap(int[] height) {
        // Write your solution here
        return 0;
    }
}`,
      go: `func trap(height []int) int {
    // Write your solution here
    return 0
}`,
      rust: `impl Solution {
    pub fn trap(height: Vec<i32>) -> i32 {
        // Write your solution here
        0
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
        expected: 6,
        description: "Example 1: Complex elevation",
      },
      {
        input: { height: [4, 2, 0, 3, 2, 5] },
        expected: 9,
        description: "Example 2: Another pattern",
      },
      {
        input: { height: [4, 2, 3] },
        expected: 1,
        description: "Small array with single trap",
      },
      {
        input: { height: [5, 4, 3, 2, 1] },
        expected: 0,
        description: "Descending - no water trapped",
      },
      // Edge cases
      {
        input: { height: [0, 0, 0] },
        expected: 0,
        description: "Edge: All zeros",
      },
      {
        input: { height: [5] },
        expected: 0,
        description: "Edge: Single bar",
      },
      {
        input: { height: [1, 2, 3, 4, 5] },
        expected: 0,
        description: "Edge: Strictly increasing (no trap)",
      },
      {
        input: { height: [3, 3, 3] },
        expected: 0,
        description: "Edge: All same height (no trap)",
      },
    ],
  },
  {
    id: "dsa-container-with-most-water",
    title: "Container With Most Water",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description:
      "Find two lines that together with the x-axis form a container that holds the most water.",
    tags: ["array", "two-pointers", "greedy"],
    estimatedTime: 20,
    problemStatement: `Given n non-negative integers a1, a2, ..., an, where each represents a point at coordinate (i, ai). n vertical lines are drawn such that the two endpoints of the line i is at (i, ai) and (i, 0). Find two lines, which, together with the x-axis forms a container, such that the container contains the most water.

Notice that you may not slant the container.`,
    examples: [
      {
        input: "height = [1,8,6,2,5,4,8,3,7]",
        output: "49",
        explanation:
          "The maximum area is between index 1 and 8 (height 8 and 7), area = min(8,7) * (8-1) = 7 * 7 = 49",
      },
      {
        input: "height = [1,1]",
        output: "1",
        explanation: "Area = min(1,1) * (1-0) = 1",
      },
    ],
    constraints: ["n == height.length", "2 <= n <= 10^5", "0 <= height[i] <= 10^4"],
    hints: [
      "Use two pointers starting from both ends",
      "Move the pointer with smaller height inward",
      "Track maximum area seen so far",
    ],
    starterCode: {
      javascript: `function maxArea(height) {
  // Your code here
}`,
      python: `def maxArea(height):
    # Your code here
    pass`,
      typescript: `function maxArea(height: number[]): number {
  // Your code here
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { height: [1, 8, 6, 2, 5, 4, 8, 3, 7] },
        expected: 49,
        description: "Standard case with varying heights",
      },
      {
        input: { height: [1, 1] },
        expected: 1,
        description: "Minimum length array",
      },
      {
        input: { height: [4, 3, 2, 1, 4] },
        expected: 16,
        description: "First and last elements form max area",
      },
      {
        input: { height: [1, 2, 1] },
        expected: 2,
        description: "Small ascending then descending",
      },
      // Edge cases
      {
        input: { height: [5, 5, 5, 5] },
        expected: 15,
        description: "Edge: All same height (5 * 3 = 15)",
      },
      {
        input: { height: [1, 100, 1] },
        expected: 2,
        description: "Edge: Tall middle, short ends",
      },
    ],
  },
  {
    id: "dsa-longest-palindromic-substring",
    title: "Longest Palindromic Substring",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Find the longest palindromic substring in a string.",
    tags: ["string", "dynamic-programming", "two-pointers"],
    estimatedTime: 25,
    problemStatement: `Given a string s, return the longest palindromic substring in s.

A palindromic string reads the same backward as forward.`,
    examples: [
      {
        input: 's = "babad"',
        output: '"bab"',
        explanation: '"aba" is also a valid answer',
      },
      {
        input: 's = "cbbd"',
        output: '"bb"',
      },
    ],
    constraints: ["1 <= s.length <= 1000", "s consist of only digits and English letters"],
    hints: [
      "Expand around center for each possible center",
      "Consider both odd and even length palindromes",
      "Track the longest palindrome found",
    ],
    starterCode: {
      javascript: `function longestPalindrome(s) {
  // Your code here
}`,
      python: `def longestPalindrome(s):
    # Your code here
    pass`,
    },
    optimalComplexity: {
      time: "O(n²)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { s: "babad" },
        expected: "bab",
        description: "Multiple valid answers (bab or aba)",
        orderMatters: false,
      },
      {
        input: { s: "cbbd" },
        expected: "bb",
        description: "Even length palindrome",
      },
      {
        input: { s: "a" },
        expected: "a",
        description: "Single character",
      },
      {
        input: { s: "ac" },
        expected: "a",
        description: "Multiple valid answers (a or c)",
        orderMatters: false,
      },
    ],
  },
  {
    id: "dsa-remove-duplicates-sorted-array",
    title: "Remove Duplicates from Sorted Array",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Remove duplicates in-place from sorted array",
    tags: ["array", "two-pointers"],
    estimatedTime: 15,
    problemStatement: `Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same. Then return the number of unique elements in nums.

Consider the number of unique elements of nums to be k. To get accepted, you need to:
- Change the array nums such that the first k elements contain the unique elements in the order they were present originally.
- Return k.`,
    examples: [
      {
        input: "nums = [1,1,2]",
        output: "2, nums = [1,2,_]",
        explanation: "Function returns k = 2, with first two elements being 1 and 2.",
      },
      {
        input: "nums = [0,0,1,1,1,2,2,3,3,4]",
        output: "5, nums = [0,1,2,3,4,_,_,_,_,_]",
        explanation: "Function returns k = 5.",
      },
    ],
    constraints: [
      "1 <= nums.length <= 3 * 10^4",
      "-100 <= nums[i] <= 100",
      "nums is sorted in non-decreasing order",
    ],
    hints: [
      "Use two pointers: slow for unique position, fast to scan",
      "When fast finds new element, copy to slow position",
      "Return slow + 1 as the count of unique elements",
    ],
    starterCode: {
      javascript: `function removeDuplicates(nums) {
  // Write your solution here

}`,
      typescript: `function removeDuplicates(nums: number[]): number {
  // Write your solution here

}`,
      python: `def remove_duplicates(nums):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int removeDuplicates(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      { input: { nums: [1, 1, 2] }, expected: 2, description: "Simple case" },
      {
        input: { nums: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] },
        expected: 5,
        description: "Multiple duplicates",
      },
    ],
  },
  {
    id: "dsa-move-zeroes",
    title: "Move Zeroes",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "easy",
    companies: ["Meta", "Amazon", "Apple", "Microsoft"],
    description: "Move all zeroes to end while maintaining order",
    tags: ["array", "two-pointers"],
    estimatedTime: 15,
    problemStatement: `Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements.

Note that you must do this in-place without making a copy of the array.`,
    examples: [
      {
        input: "nums = [0,1,0,3,12]",
        output: "[1,3,12,0,0]",
      },
      {
        input: "nums = [0]",
        output: "[0]",
      },
    ],
    constraints: ["1 <= nums.length <= 10^4", "-2^31 <= nums[i] <= 2^31 - 1"],
    hints: [
      "Use two pointers: one for next non-zero position, one to scan",
      "Swap non-zero elements to the front",
      "All zeroes naturally end up at the end",
    ],
    starterCode: {
      javascript: `function moveZeroes(nums) {
  // Write your solution here

}`,
      typescript: `function moveZeroes(nums: number[]): void {
  // Write your solution here

}`,
      python: `def move_zeroes(nums):
    # Write your solution here
    pass`,
      java: `class Solution {
    public void moveZeroes(int[] nums) {
        // Write your solution here
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [0, 1, 0, 3, 12] },
        expected: [1, 3, 12, 0, 0],
        description: "Standard case",
      },
      { input: { nums: [0] }, expected: [0], description: "Single zero" },
    ],
  },
  {
    id: "dsa-valid-palindrome",
    title: "Valid Palindrome",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "easy",
    companies: ["Meta", "Amazon", "Microsoft", "Apple"],
    description: "Check if string is palindrome ignoring non-alphanumeric",
    tags: ["string", "two-pointers"],
    estimatedTime: 15,
    problemStatement: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string s, return true if it is a palindrome, or false otherwise.`,
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: "true",
        explanation: '"amanaplanacanalpanama" is a palindrome.',
      },
      {
        input: 's = "race a car"',
        output: "false",
        explanation: '"raceacar" is not a palindrome.',
      },
      {
        input: 's = " "',
        output: "true",
        explanation:
          "After removing non-alphanumeric characters, it's empty, which is a palindrome.",
      },
    ],
    constraints: ["1 <= s.length <= 2 * 10^5", "s consists only of printable ASCII characters"],
    hints: [
      "Use two pointers from start and end",
      "Skip non-alphanumeric characters",
      "Compare lowercase versions of characters",
    ],
    starterCode: {
      javascript: `function isPalindrome(s) {
  // Write your solution here

}`,
      typescript: `function isPalindrome(s: string): boolean {
  // Write your solution here

}`,
      python: `def is_palindrome(s):
    # Write your solution here
    pass`,
      java: `class Solution {
    public boolean isPalindrome(String s) {
        // Write your solution here
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { s: "A man, a plan, a canal: Panama" },
        expected: true,
        description: "Classic palindrome",
      },
      { input: { s: "race a car" }, expected: false, description: "Not a palindrome" },
      { input: { s: " " }, expected: true, description: "Empty after cleanup" },
    ],
  },
  {
    id: "dsa-sort-colors",
    title: "Sort Colors",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "medium",
    companies: ["Amazon", "Microsoft", "Meta", "Apple", "NVIDIA"],
    description: "Sort array with only 0, 1, 2 in one pass (Dutch National Flag)",
    tags: ["array", "two-pointers", "sorting"],
    estimatedTime: 20,
    problemStatement: `Given an array nums with n objects colored red, white, or blue, sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue.

We will use the integers 0, 1, and 2 to represent the color red, white, and blue, respectively.

You must solve this problem without using the library's sort function.

Follow up: Could you come up with a one-pass algorithm using only constant extra space?`,
    examples: [
      {
        input: "nums = [2,0,2,1,1,0]",
        output: "[0,0,1,1,2,2]",
      },
      {
        input: "nums = [2,0,1]",
        output: "[0,1,2]",
      },
    ],
    constraints: ["n == nums.length", "1 <= n <= 300", "nums[i] is either 0, 1, or 2"],
    hints: [
      "Use three pointers: low, mid, high",
      "All 0s should be before low, all 2s after high",
      "Dutch National Flag algorithm by Dijkstra",
    ],
    starterCode: {
      javascript: `function sortColors(nums) {
  // Write your solution here

}`,
      typescript: `function sortColors(nums: number[]): void {
  // Write your solution here

}`,
      python: `def sort_colors(nums):
    # Write your solution here
    pass`,
      java: `class Solution {
    public void sortColors(int[] nums) {
        // Write your solution here
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [2, 0, 2, 1, 1, 0] },
        expected: [0, 0, 1, 1, 2, 2],
        description: "Standard case",
      },
      { input: { nums: [2, 0, 1] }, expected: [0, 1, 2], description: "Three elements" },
    ],
  },
  {
    id: "dsa-reverse-string",
    title: "Reverse String",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "easy",
    companies: ["Amazon", "Microsoft", "Apple"],
    description: "Reverse a string array in-place",
    tags: ["string", "two-pointers", "array"],
    estimatedTime: 10,
    problemStatement: `Write a function that reverses a string. The input string is given as an array of characters s.

You must do this by modifying the input array in-place with O(1) extra memory.`,
    examples: [
      {
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]',
      },
      {
        input: 's = ["H","a","n","n","a","h"]',
        output: '["h","a","n","n","a","H"]',
      },
    ],
    constraints: ["1 <= s.length <= 10^5", "s[i] is a printable ascii character"],
    hints: [
      "Use two pointers at start and end",
      "Swap and move pointers toward center",
      "Stop when pointers meet or cross",
    ],
    starterCode: {
      javascript: `function reverseString(s) {
  // Write your solution here

}`,
      typescript: `function reverseString(s: string[]): void {
  // Write your solution here

}`,
      python: `def reverse_string(s):
    # Write your solution here
    pass`,
      java: `class Solution {
    public void reverseString(char[] s) {
        // Write your solution here
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { s: ["h", "e", "l", "l", "o"] },
        expected: ["o", "l", "l", "e", "h"],
        description: "Standard case",
      },
      {
        input: { s: ["H", "a", "n", "n", "a", "h"] },
        expected: ["h", "a", "n", "n", "a", "H"],
        description: "Palindrome input",
      },
    ],
  },
  {
    id: "dsa-partition-labels",
    title: "Partition Labels",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Partition string into parts where each letter appears in one part only",
    tags: ["string", "two-pointers", "greedy", "hash-table"],
    estimatedTime: 25,
    problemStatement: `You are given a string s. We want to partition the string into as many parts as possible so that each letter appears in at most one part.

Note that the partition is done so that after concatenating all the parts in order, the resultant string should be s.

Return a list of integers representing the size of these parts.`,
    examples: [
      {
        input: 's = "ababcbacadefegdehijhklij"',
        output: "[9,7,8]",
        explanation:
          'The partition is "ababcbaca", "defegde", "hijhklij". Each letter appears in at most one part.',
      },
      {
        input: 's = "eccbbbbdec"',
        output: "[10]",
        explanation: "All letters are interconnected, so single partition.",
      },
    ],
    constraints: ["1 <= s.length <= 500", "s consists of lowercase English letters"],
    hints: [
      "First, find the last occurrence of each character",
      "Track the end of current partition as max of last occurrences",
      "When current index equals partition end, we have a complete partition",
    ],
    starterCode: {
      javascript: `function partitionLabels(s) {
  // Write your solution here

}`,
      typescript: `function partitionLabels(s: string): number[] {
  // Write your solution here

}`,
      python: `def partition_labels(s):
    # Write your solution here
    pass`,
      java: `class Solution {
    public List<Integer> partitionLabels(String s) {
        // Write your solution here
        return new ArrayList<>();
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { s: "ababcbacadefegdehijhklij" },
        expected: [9, 7, 8],
        description: "Three partitions",
      },
      { input: { s: "eccbbbbdec" }, expected: [10], description: "Single partition" },
    ],
  },
  {
    id: "dsa-two-sum-ii-sorted",
    title: "Two Sum II - Input Array Is Sorted",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Find two numbers in sorted array that add up to target",
    tags: ["array", "two-pointers", "binary-search"],
    estimatedTime: 15,
    problemStatement: `Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number. Let these two numbers be numbers[index1] and numbers[index2] where 1 <= index1 < index2 <= numbers.length.

Return the indices of the two numbers, index1 and index2, added by one as an integer array [index1, index2] of length 2.

The tests are generated such that there is exactly one solution. You may not use the same element twice.

Your solution must use only constant extra space.`,
    examples: [
      {
        input: "numbers = [2,7,11,15], target = 9",
        output: "[1,2]",
        explanation: "The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2.",
      },
      { input: "numbers = [2,3,4], target = 6", output: "[1,3]" },
      { input: "numbers = [-1,0], target = -1", output: "[1,2]" },
    ],
    constraints: [
      "2 <= numbers.length <= 3 * 10^4",
      "-1000 <= numbers[i] <= 1000",
      "numbers is sorted in non-decreasing order",
      "-1000 <= target <= 1000",
      "The tests are generated such that there is exactly one solution",
    ],
    hints: [
      "Use two pointers: one at start, one at end",
      "If sum > target, move right pointer left",
      "If sum < target, move left pointer right",
    ],
    starterCode: {
      javascript: `function twoSum(numbers, target) {\n  // Write your solution here\n\n}`,
      typescript: `function twoSum(numbers: number[], target: number): number[] {\n  // Write your solution here\n\n}`,
      python: `def twoSum(numbers, target):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      {
        input: { numbers: [2, 7, 11, 15], target: 9 },
        expected: [1, 2],
        description: "Basic case",
      },
      { input: { numbers: [2, 3, 4], target: 6 }, expected: [1, 3], description: "Sum at ends" },
      {
        input: { numbers: [-1, 0], target: -1 },
        expected: [1, 2],
        description: "Negative numbers",
      },
    ],
  },
  {
    id: "dsa-4sum",
    title: "4Sum",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Apple"],
    description: "Find all unique quadruplets that sum to target",
    tags: ["array", "two-pointers", "sorting"],
    estimatedTime: 35,
    problemStatement: `Given an array nums of n integers, return an array of all the unique quadruplets [nums[a], nums[b], nums[c], nums[d]] such that:

- 0 <= a, b, c, d < n
- a, b, c, d are distinct
- nums[a] + nums[b] + nums[c] + nums[d] == target

You may return the answer in any order.`,
    examples: [
      {
        input: "nums = [1,0,-1,0,-2,2], target = 0",
        output: "[[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]",
      },
      { input: "nums = [2,2,2,2,2], target = 8", output: "[[2,2,2,2]]" },
    ],
    constraints: ["1 <= nums.length <= 200", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
    hints: [
      "Sort the array first",
      "Use two nested loops for first two numbers",
      "Use two-pointer technique for remaining two numbers",
      "Skip duplicates at each level to avoid duplicate quadruplets",
    ],
    starterCode: {
      javascript: `function fourSum(nums, target) {\n  // Write your solution here\n\n}`,
      typescript: `function fourSum(nums: number[], target: number): number[][] {\n  // Write your solution here\n\n}`,
      python: `def fourSum(nums, target):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n³)", space: "O(1)" },
    testCases: [
      {
        input: { nums: [1, 0, -1, 0, -2, 2], target: 0 },
        expected: [
          [-2, -1, 1, 2],
          [-2, 0, 0, 2],
          [-1, 0, 0, 1],
        ],
        description: "Multiple quadruplets",
        compareAsSet: true,
      },
      {
        input: { nums: [2, 2, 2, 2, 2], target: 8 },
        expected: [[2, 2, 2, 2]],
        description: "All same elements",
      },
    ],
  },
  {
    id: "dsa-squares-sorted-array",
    title: "Squares of a Sorted Array",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "easy",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Return squares of sorted array in sorted order",
    tags: ["array", "two-pointers", "sorting"],
    estimatedTime: 15,
    problemStatement: `Given an integer array nums sorted in non-decreasing order, return an array of the squares of each number sorted in non-decreasing order.`,
    examples: [
      {
        input: "nums = [-4,-1,0,3,10]",
        output: "[0,1,9,16,100]",
        explanation: "After squaring: [16,1,0,9,100]. After sorting: [0,1,9,16,100].",
      },
      { input: "nums = [-7,-3,2,3,11]", output: "[4,9,9,49,121]" },
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "-10^4 <= nums[i] <= 10^4",
      "nums is sorted in non-decreasing order",
    ],
    hints: [
      "Negative numbers become positive when squared",
      "Use two pointers at both ends",
      "Compare absolute values and fill result from the end",
    ],
    starterCode: {
      javascript: `function sortedSquares(nums) {\n  // Write your solution here\n\n}`,
      typescript: `function sortedSquares(nums: number[]): number[] {\n  // Write your solution here\n\n}`,
      python: `def sortedSquares(nums):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    testCases: [
      {
        input: { nums: [-4, -1, 0, 3, 10] },
        expected: [0, 1, 9, 16, 100],
        description: "Mixed positive and negative",
      },
      {
        input: { nums: [-7, -3, 2, 3, 11] },
        expected: [4, 9, 9, 49, 121],
        description: "More negatives",
      },
      {
        input: { nums: [1, 2, 3, 4, 5] },
        expected: [1, 4, 9, 16, 25],
        description: "All positive",
      },
    ],
  },
  {
    id: "dsa-boats-save-people",
    title: "Boats to Save People",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Find minimum boats to carry all people with weight limit",
    tags: ["array", "two-pointers", "greedy", "sorting"],
    estimatedTime: 20,
    problemStatement: `You are given an array people where people[i] is the weight of the ith person, and an infinite number of boats where each boat can carry a maximum weight of limit. Each boat carries at most two people at the same time, provided the sum of the weight of those people is at most limit.

Return the minimum number of boats to carry every given person.`,
    examples: [
      { input: "people = [1,2], limit = 3", output: "1", explanation: "1 boat (1, 2)" },
      {
        input: "people = [3,2,2,1], limit = 3",
        output: "3",
        explanation: "3 boats: (1, 2), (2), (3)",
      },
      { input: "people = [3,5,3,4], limit = 5", output: "4" },
    ],
    constraints: ["1 <= people.length <= 5 * 10^4", "1 <= people[i] <= limit <= 3 * 10^4"],
    hints: [
      "Sort people by weight",
      "Use two pointers: lightest and heaviest person",
      "If both can fit, pair them; otherwise heaviest goes alone",
    ],
    starterCode: {
      javascript: `function numRescueBoats(people, limit) {\n  // Write your solution here\n\n}`,
      typescript: `function numRescueBoats(people: number[], limit: number): number {\n  // Write your solution here\n\n}`,
      python: `def numRescueBoats(people, limit):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n log n)", space: "O(1)" },
    testCases: [
      { input: { people: [1, 2], limit: 3 }, expected: 1, description: "Both fit in one boat" },
      {
        input: { people: [3, 2, 2, 1], limit: 3 },
        expected: 3,
        description: "Some pairing possible",
      },
      {
        input: { people: [3, 5, 3, 4], limit: 5 },
        expected: 4,
        description: "No pairing possible",
      },
    ],
  },
]

export default twoPointersScenarios
