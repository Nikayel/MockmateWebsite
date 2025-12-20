/**
 * Two Pointers DSA Scenarios
 * Pattern: two-pointers
 */

import type { DSAScenario } from '../types'

export const twoPointersScenarios: DSAScenario[] = [
  {
    id: 'dsa-3sum',
    title: '3Sum',
    type: 'dsa',
    pattern: 'two-pointers',
    difficulty: 'medium',
    companies: ['Meta', 'Amazon', 'Microsoft', 'Apple'],
    description: 'Find all unique triplets that sum to zero',
    tags: ['array', 'two-pointers', 'sorting'],
    estimatedTime: 30,
    problemStatement: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets.`,
    examples: [
      {
        input: 'nums = [-1,0,1,2,-1,-4]',
        output: '[[-1,-1,2],[-1,0,1]]',
      },
      {
        input: 'nums = [0,1,1]',
        output: '[]',
      },
      {
        input: 'nums = [0,0,0]',
        output: '[[0,0,0]]',
      },
    ],
    constraints: [
      '3 <= nums.length <= 3000',
      '-10^5 <= nums[i] <= 10^5',
    ],
    hints: [
      'Sort the array first',
      'Fix one number and use two pointers for the remaining two',
      'Skip duplicates to avoid duplicate triplets',
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
      time: 'O(n²)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { nums: [-1, 0, 1, 2, -1, -4] },
        expected: [[-1, -1, 2], [-1, 0, 1]],
        description: 'Multiple triplets',
        orderMatters: false,
      },
      {
        input: { nums: [0, 1, 1] },
        expected: [],
        description: 'No valid triplets',
      },
      {
        input: { nums: [0, 0, 0] },
        expected: [[0, 0, 0]],
        description: 'All zeros',
      },
      {
        input: { nums: [-2, 0, 1, 1, 2] },
        expected: [[-2, 0, 2], [-2, 1, 1]],
        description: 'Multiple solutions with duplicates',
        orderMatters: false,
      },
      {
        input: { nums: [1, 2, -2, -1] },
        expected: [],
        description: 'No triplets sum to zero',
      },
    ],
  },
  {
    id: 'dsa-trapping-rain-water',
    title: 'Trapping Rain Water',
    type: 'dsa',
    pattern: 'two-pointers',
    difficulty: 'hard',
    companies: ['Google', 'Meta', 'Amazon', 'Microsoft'],
    description: 'Calculate how much water can be trapped after raining given an elevation map',
    tags: ['array', 'two-pointers', 'dynamic-programming', 'stack'],
    estimatedTime: 30,
    problemStatement: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
    examples: [
      {
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        output: '6',
        explanation: 'The elevation map traps 6 units of rain water.',
      },
      {
        input: 'height = [4,2,0,3,2,5]',
        output: '9',
      },
    ],
    constraints: [
      'n == height.length',
      '1 <= n <= 2 * 10^4',
      '0 <= height[i] <= 10^5',
    ],
    hints: [
      'For each position, water level is determined by min(max_left, max_right) - height[i]',
      'Use two pointers from both ends',
      'Track the maximum heights seen so far from left and right',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { height: [0,1,0,2,1,0,1,3,2,1,2,1] },
        expected: 6,
        description: 'Example 1: Complex elevation',
      },
      {
        input: { height: [4,2,0,3,2,5] },
        expected: 9,
        description: 'Example 2: Another pattern',
      },
      {
        input: { height: [4,2,3] },
        expected: 1,
        description: 'Small array with single trap',
      },
      {
        input: { height: [5,4,3,2,1] },
        expected: 0,
        description: 'Descending - no water trapped',
      },
    ],
  },
  {
    id: 'dsa-container-with-most-water',
    title: 'Container With Most Water',
    type: 'dsa',
    pattern: 'two-pointers',
    difficulty: 'medium',
    companies: ['Amazon', 'Google', 'Meta'],
    description: 'Find two lines that together with the x-axis form a container that holds the most water.',
    tags: ['array', 'two-pointers', 'greedy'],
    estimatedTime: 20,
    problemStatement: `Given n non-negative integers a1, a2, ..., an, where each represents a point at coordinate (i, ai). n vertical lines are drawn such that the two endpoints of the line i is at (i, ai) and (i, 0). Find two lines, which, together with the x-axis forms a container, such that the container contains the most water.

Notice that you may not slant the container.`,
    examples: [
      {
        input: 'height = [1,8,6,2,5,4,8,3,7]',
        output: '49',
        explanation: 'The maximum area is between index 1 and 8 (height 8 and 7), area = min(8,7) * (8-1) = 7 * 7 = 49'
      },
      {
        input: 'height = [1,1]',
        output: '1',
        explanation: 'Area = min(1,1) * (1-0) = 1'
      }
    ],
    constraints: [
      'n == height.length',
      '2 <= n <= 10^5',
      '0 <= height[i] <= 10^4'
    ],
    hints: [
      'Use two pointers starting from both ends',
      'Move the pointer with smaller height inward',
      'Track maximum area seen so far'
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
}`
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(1)'
    },
    testCases: [
      {
        input: { height: [1,8,6,2,5,4,8,3,7] },
        expected: 49,
        description: 'Standard case with varying heights'
      },
      {
        input: { height: [1,1] },
        expected: 1,
        description: 'Minimum length array'
      },
      {
        input: { height: [4,3,2,1,4] },
        expected: 16,
        description: 'First and last elements form max area'
      },
      {
        input: { height: [1,2,1] },
        expected: 2,
        description: 'Small ascending then descending'
      }
    ]
  },
  {
    id: 'dsa-longest-palindromic-substring',
    title: 'Longest Palindromic Substring',
    type: 'dsa',
    pattern: 'two-pointers',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    description: 'Find the longest palindromic substring in a string.',
    tags: ['string', 'dynamic-programming', 'two-pointers'],
    estimatedTime: 25,
    problemStatement: `Given a string s, return the longest palindromic substring in s.

A palindromic string reads the same backward as forward.`,
    examples: [
      {
        input: 's = "babad"',
        output: '"bab"',
        explanation: '"aba" is also a valid answer'
      },
      {
        input: 's = "cbbd"',
        output: '"bb"'
      }
    ],
    constraints: [
      '1 <= s.length <= 1000',
      's consist of only digits and English letters'
    ],
    hints: [
      'Expand around center for each possible center',
      'Consider both odd and even length palindromes',
      'Track the longest palindrome found'
    ],
    starterCode: {
      javascript: `function longestPalindrome(s) {
  // Your code here
}`,
      python: `def longestPalindrome(s):
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(n²)',
      space: 'O(1)'
    },
    testCases: [
      {
        input: { s: "babad" },
        expected: "bab",
        description: 'Multiple palindromes of same length'
      },
      {
        input: { s: "cbbd" },
        expected: "bb",
        description: 'Even length palindrome'
      },
      {
        input: { s: "a" },
        expected: "a",
        description: 'Single character'
      },
      {
        input: { s: "ac" },
        expected: "a",
        description: 'No palindrome longer than 1'
      }
    ]
  },
  {
    id: 'dsa-remove-duplicates-sorted-array',
    title: 'Remove Duplicates from Sorted Array',
    type: 'dsa',
    pattern: 'two-pointers',
    difficulty: 'easy',
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    description: 'Remove duplicates in-place from sorted array',
    tags: ['array', 'two-pointers'],
    estimatedTime: 15,
    problemStatement: `Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same. Then return the number of unique elements in nums.

Consider the number of unique elements of nums to be k. To get accepted, you need to:
- Change the array nums such that the first k elements contain the unique elements in the order they were present originally.
- Return k.`,
    examples: [
      {
        input: 'nums = [1,1,2]',
        output: '2, nums = [1,2,_]',
        explanation: 'Function returns k = 2, with first two elements being 1 and 2.',
      },
      {
        input: 'nums = [0,0,1,1,1,2,2,3,3,4]',
        output: '5, nums = [0,1,2,3,4,_,_,_,_,_]',
        explanation: 'Function returns k = 5.',
      },
    ],
    constraints: [
      '1 <= nums.length <= 3 * 10^4',
      '-100 <= nums[i] <= 100',
      'nums is sorted in non-decreasing order',
    ],
    hints: [
      'Use two pointers: slow for unique position, fast to scan',
      'When fast finds new element, copy to slow position',
      'Return slow + 1 as the count of unique elements',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      { input: { nums: [1,1,2] }, expected: 2, description: 'Simple case' },
      { input: { nums: [0,0,1,1,1,2,2,3,3,4] }, expected: 5, description: 'Multiple duplicates' },
    ],
  },
  {
    id: 'dsa-move-zeroes',
    title: 'Move Zeroes',
    type: 'dsa',
    pattern: 'two-pointers',
    difficulty: 'easy',
    companies: ['Meta', 'Amazon', 'Apple', 'Microsoft'],
    description: 'Move all zeroes to end while maintaining order',
    tags: ['array', 'two-pointers'],
    estimatedTime: 15,
    problemStatement: `Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements.

Note that you must do this in-place without making a copy of the array.`,
    examples: [
      {
        input: 'nums = [0,1,0,3,12]',
        output: '[1,3,12,0,0]',
      },
      {
        input: 'nums = [0]',
        output: '[0]',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^4',
      '-2^31 <= nums[i] <= 2^31 - 1',
    ],
    hints: [
      'Use two pointers: one for next non-zero position, one to scan',
      'Swap non-zero elements to the front',
      'All zeroes naturally end up at the end',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      { input: { nums: [0,1,0,3,12] }, expected: [1,3,12,0,0], description: 'Standard case' },
      { input: { nums: [0] }, expected: [0], description: 'Single zero' },
    ],
  },
  {
    id: 'dsa-valid-palindrome',
    title: 'Valid Palindrome',
    type: 'dsa',
    pattern: 'two-pointers',
    difficulty: 'easy',
    companies: ['Meta', 'Amazon', 'Microsoft', 'Apple'],
    description: 'Check if string is palindrome ignoring non-alphanumeric',
    tags: ['string', 'two-pointers'],
    estimatedTime: 15,
    problemStatement: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string s, return true if it is a palindrome, or false otherwise.`,
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: 'true',
        explanation: '"amanaplanacanalpanama" is a palindrome.',
      },
      {
        input: 's = "race a car"',
        output: 'false',
        explanation: '"raceacar" is not a palindrome.',
      },
      {
        input: 's = " "',
        output: 'true',
        explanation: 'After removing non-alphanumeric characters, it\'s empty, which is a palindrome.',
      },
    ],
    constraints: [
      '1 <= s.length <= 2 * 10^5',
      's consists only of printable ASCII characters',
    ],
    hints: [
      'Use two pointers from start and end',
      'Skip non-alphanumeric characters',
      'Compare lowercase versions of characters',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      { input: { s: "A man, a plan, a canal: Panama" }, expected: true, description: 'Classic palindrome' },
      { input: { s: "race a car" }, expected: false, description: 'Not a palindrome' },
      { input: { s: " " }, expected: true, description: 'Empty after cleanup' },
    ],
  },
  {
    id: 'dsa-sort-colors',
    title: 'Sort Colors',
    type: 'dsa',
    pattern: 'two-pointers',
    difficulty: 'medium',
    companies: ['Amazon', 'Microsoft', 'Meta', 'Apple'],
    description: 'Sort array with only 0, 1, 2 in one pass (Dutch National Flag)',
    tags: ['array', 'two-pointers', 'sorting'],
    estimatedTime: 20,
    problemStatement: `Given an array nums with n objects colored red, white, or blue, sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue.

We will use the integers 0, 1, and 2 to represent the color red, white, and blue, respectively.

You must solve this problem without using the library's sort function.

Follow up: Could you come up with a one-pass algorithm using only constant extra space?`,
    examples: [
      {
        input: 'nums = [2,0,2,1,1,0]',
        output: '[0,0,1,1,2,2]',
      },
      {
        input: 'nums = [2,0,1]',
        output: '[0,1,2]',
      },
    ],
    constraints: [
      'n == nums.length',
      '1 <= n <= 300',
      'nums[i] is either 0, 1, or 2',
    ],
    hints: [
      'Use three pointers: low, mid, high',
      'All 0s should be before low, all 2s after high',
      'Dutch National Flag algorithm by Dijkstra',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      { input: { nums: [2,0,2,1,1,0] }, expected: [0,0,1,1,2,2], description: 'Standard case' },
      { input: { nums: [2,0,1] }, expected: [0,1,2], description: 'Three elements' },
    ],
  },
  {
    id: 'dsa-reverse-string',
    title: 'Reverse String',
    type: 'dsa',
    pattern: 'two-pointers',
    difficulty: 'easy',
    companies: ['Amazon', 'Microsoft', 'Apple'],
    description: 'Reverse a string array in-place',
    tags: ['string', 'two-pointers', 'array'],
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
    constraints: [
      '1 <= s.length <= 10^5',
      's[i] is a printable ascii character',
    ],
    hints: [
      'Use two pointers at start and end',
      'Swap and move pointers toward center',
      'Stop when pointers meet or cross',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      { input: { s: ["h","e","l","l","o"] }, expected: ["o","l","l","e","h"], description: 'Standard case' },
      { input: { s: ["H","a","n","n","a","h"] }, expected: ["h","a","n","n","a","H"], description: 'Palindrome input' },
    ],
  },
  {
    id: 'dsa-partition-labels',
    title: 'Partition Labels',
    type: 'dsa',
    pattern: 'two-pointers',
    difficulty: 'medium',
    companies: ['Amazon', 'Google', 'Meta'],
    description: 'Partition string into parts where each letter appears in one part only',
    tags: ['string', 'two-pointers', 'greedy', 'hash-table'],
    estimatedTime: 25,
    problemStatement: `You are given a string s. We want to partition the string into as many parts as possible so that each letter appears in at most one part.

Note that the partition is done so that after concatenating all the parts in order, the resultant string should be s.

Return a list of integers representing the size of these parts.`,
    examples: [
      {
        input: 's = "ababcbacadefegdehijhklij"',
        output: '[9,7,8]',
        explanation: 'The partition is "ababcbaca", "defegde", "hijhklij". Each letter appears in at most one part.',
      },
      {
        input: 's = "eccbbbbdec"',
        output: '[10]',
        explanation: 'All letters are interconnected, so single partition.',
      },
    ],
    constraints: [
      '1 <= s.length <= 500',
      's consists of lowercase English letters',
    ],
    hints: [
      'First, find the last occurrence of each character',
      'Track the end of current partition as max of last occurrences',
      'When current index equals partition end, we have a complete partition',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      { input: { s: "ababcbacadefegdehijhklij" }, expected: [9,7,8], description: 'Three partitions' },
      { input: { s: "eccbbbbdec" }, expected: [10], description: 'Single partition' },
    ],
  },
]

export default twoPointersScenarios
