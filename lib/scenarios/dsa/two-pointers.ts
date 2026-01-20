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

    // ==========================================
    // Real Interview Mode (Fuzzy Mode) Fields
    // ==========================================
    fuzzyStatement:
      "Given an array of numbers, find all unique triplets that sum to zero.",

    clarifyingQuestions: [
      {
        topic: "output_format",
        question: "Should I return the values or the indices?",
        answer: "Return the actual values, not the indices.",
        required: true,
      },
      {
        topic: "duplicate_handling",
        question: "What if there are duplicate triplets?",
        answer:
          "The solution set must not contain duplicate triplets. Each unique combination should appear only once.",
        required: true,
      },
      {
        topic: "element_reuse",
        question: "Can I use the same element multiple times?",
        answer:
          "No, you cannot use the same array index twice in a triplet, but different indices with the same value are allowed.",
        required: true,
      },
      {
        topic: "no_solution_case",
        question: "What if no triplets exist?",
        answer: "Return an empty array.",
        required: false,
      },
      {
        topic: "input_sorted",
        question: "Is the array sorted?",
        answer: "No, but you can sort it if that helps your approach.",
        required: false,
      },
      {
        topic: "output_order",
        question: "Does the order of triplets in the result matter?",
        answer: "No, triplets can be in any order.",
        required: false,
      },
    ],

    // ==========================================
    // Proactive AI Interviewer Fields
    // ==========================================
    commonWrongApproaches: [
      {
        description: "Three nested loops brute force O(n³)",
        codeSignals: [
          "three nested loops",
          "O(n^3)",
          "O(n³)",
          "for i for j for k",
        ],
        intervention:
          "That's O(n³). Can you reduce it? Think about how sorting might help and whether you can apply a technique you've used for two-sum.",
      },
      {
        description: "Not handling duplicates - returning duplicate triplets",
        codeSignals: [
          "no duplicate check",
          "missing skip duplicates",
          "result has duplicates",
        ],
        intervention:
          "Your approach looks right, but think about this: if nums has [-1,-1,2], how do you ensure you don't return [[-1,-1,2],[-1,-1,2]]?",
      },
      {
        description: "Using a Set for deduplication inefficiently",
        codeSignals: ["Set of tuples", "stringify triplet", "JSON.stringify"],
        intervention:
          "Using a Set works but adds overhead. Can you skip duplicates during iteration instead of filtering after?",
      },
    ],

    whatIfQuestions: [
      "What if the array has fewer than 3 elements?",
      "What if all elements are the same, like [0,0,0,0]?",
      "What if there are many duplicates - how does your solution handle [-1,-1,-1,2,2,2]?",
      "What's the time complexity? Can you do better than O(n³)?",
    ],

    midCodingProbes: [
      {
        trigger: "started sorting the array",
        question:
          "Good start with sorting. How does sorting help you avoid duplicates?",
      },
      {
        trigger: "using two pointers",
        question:
          "When do you move the left pointer vs the right pointer? Walk me through.",
      },
      {
        trigger: "skipping duplicates",
        question:
          "I see you're skipping duplicates. Why do you need to skip both for the outer loop AND for the inner pointers?",
      },
    ],

    // Correct pattern notes help the AI interviewer recognize correct implementations
    // AI can PROBE for understanding ("walk me through why") but should ACCEPT once explained correctly
    correctPatternNotes: [
      "CORRECT: nums[left] == nums[left-1] after incrementing left (comparing with where we came FROM)",
      "CORRECT: nums[right] == nums[right+1] after decrementing right (right+1 is where we came FROM, not ahead)",
      "You can ASK 'walk me through the duplicate skipping logic' but if they explain correctly, ACCEPT and move on",
      "Don't keep questioning the direction (right+1) - when decrementing, +1 IS the previous position",
      "The inner while loops for duplicate skipping don't add to complexity - they're O(n) total across all iterations",
    ],

    optimizationPush: {
      suboptimalComplexity: "O(n³)",
      nudge:
        "Can you get this down to O(n²)? Hint: sort first, then for each element, can you use a technique from Two Sum II?",
    },
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
    companies: ["Amazon", "Microsoft", "Apple", "ZipRecruiter"],
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
  {
    id: "dsa-merge-sorted-array",
    title: "Merge Sorted Array",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "easy",
    companies: ["Meta", "Microsoft", "Amazon", "ZipRecruiter"],
    description: "Merge two sorted arrays into one sorted array in-place",
    tags: ["array", "two-pointers", "sorting"],
    estimatedTime: 15,
    problemStatement: `You are given two integer arrays nums1 and nums2, sorted in non-decreasing order, and two integers m and n, representing the number of elements in nums1 and nums2 respectively.

Merge nums1 and nums2 into a single array sorted in non-decreasing order.

The final sorted array should not be returned by the function, but instead be stored inside the array nums1. To accommodate this, nums1 has a length of m + n, where the first m elements denote the elements that should be merged, and the last n elements are set to 0 and should be ignored. nums2 has a length of n.`,
    examples: [
      {
        input: "nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3",
        output: "[1,2,2,3,5,6]",
        explanation: "The arrays we are merging are [1,2,3] and [2,5,6]. The result is [1,2,2,3,5,6].",
      },
      {
        input: "nums1 = [1], m = 1, nums2 = [], n = 0",
        output: "[1]",
        explanation: "The arrays we are merging are [1] and []. The result is [1].",
      },
      {
        input: "nums1 = [0], m = 0, nums2 = [1], n = 1",
        output: "[1]",
        explanation: "The arrays we are merging are [] and [1]. The result is [1].",
      },
    ],
    constraints: [
      "nums1.length == m + n",
      "nums2.length == n",
      "0 <= m, n <= 200",
      "1 <= m + n <= 200",
      "-10^9 <= nums1[i], nums2[j] <= 10^9",
    ],
    hints: [
      "Start from the end of both arrays to avoid overwriting elements",
      "Use three pointers: one for nums1's end, one for nums2's end, and one for the merged position",
      "Compare elements and place the larger one at the merged position",
    ],
    starterCode: {
      javascript: `function merge(nums1, m, nums2, n) {
  // Write your solution here (modify nums1 in-place)

}`,
      typescript: `function merge(nums1: number[], m: number, nums2: number[], n: number): void {
  // Write your solution here (modify nums1 in-place)

}`,
      python: `def merge(nums1, m, nums2, n):
    # Write your solution here (modify nums1 in-place)
    pass`,
      java: `class Solution {
    public void merge(int[] nums1, int m, int[] nums2, int n) {
        // Write your solution here (modify nums1 in-place)
    }
}`,
      cpp: `class Solution {
public:
    void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {
        // Write your solution here (modify nums1 in-place)
    }
};`,
      csharp: `public class Solution {
    public void Merge(int[] nums1, int m, int[] nums2, int n) {
        // Write your solution here (modify nums1 in-place)
    }
}`,
      go: `func merge(nums1 []int, m int, nums2 []int, n int) {
    // Write your solution here (modify nums1 in-place)
}`,
      rust: `impl Solution {
    pub fn merge(nums1: &mut Vec<i32>, m: i32, nums2: &mut Vec<i32>, n: i32) {
        // Write your solution here (modify nums1 in-place)
    }
}`,
    },
    optimalComplexity: {
      time: "O(m + n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [2, 5, 6], n: 3 },
        expected: [1, 2, 2, 3, 5, 6],
        description: "Standard case with overlapping values",
      },
      {
        input: { nums1: [1], m: 1, nums2: [], n: 0 },
        expected: [1],
        description: "Empty nums2",
      },
      {
        input: { nums1: [0], m: 0, nums2: [1], n: 1 },
        expected: [1],
        description: "Empty nums1 (only zeros)",
      },
      {
        input: { nums1: [4, 5, 6, 0, 0, 0], m: 3, nums2: [1, 2, 3], n: 3 },
        expected: [1, 2, 3, 4, 5, 6],
        description: "nums2 all smaller than nums1",
      },
      {
        input: { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [4, 5, 6], n: 3 },
        expected: [1, 2, 3, 4, 5, 6],
        description: "nums2 all larger than nums1",
      },
    ],
    fuzzyStatement: "Merge two sorted arrays into one sorted array.",
    clarifyingQuestions: [
      {
        topic: "in_place",
        question: "Should I modify the first array in-place or return a new array?",
        answer: "Modify nums1 in-place. It has extra space at the end to accommodate all elements.",
        required: true,
      },
      {
        topic: "space",
        question: "Can I use extra space?",
        answer: "The optimal solution uses O(1) extra space by working backwards.",
        required: false,
      },
    ],
    commonWrongApproaches: [
      {
        description: "Starting from the beginning and shifting elements",
        codeSignals: ["insert", "shift", "splice", "for i in range(m)"],
        intervention:
          "Starting from the beginning requires shifting elements which is O(n²). Can you think of a way to avoid this by starting from the end?",
      },
      {
        description: "Creating a new array instead of modifying in-place",
        codeSignals: ["new Array", "result = []", "merged = []", "new int["],
        intervention:
          "The problem asks you to modify nums1 in-place. Can you do this without creating a new array?",
      },
    ],
    whatIfQuestions: [
      "What if m is 0 (nums1 has no elements to merge)?",
      "What if n is 0 (nums2 is empty)?",
      "What if all elements in nums2 are smaller than all elements in nums1?",
      "What if there are duplicate elements across both arrays?",
    ],
    midCodingProbes: [
      {
        trigger: "started with three pointers",
        question: "Which pointer are you using for the write position, and why start from the end?",
      },
      {
        trigger: "comparing elements",
        question: "Walk me through what happens when nums1=[4,5,6,0,0,0] and nums2=[1,2,3].",
      },
      {
        trigger: "handling edge case",
        question: "What happens when one of the arrays is exhausted but the other still has elements?",
      },
    ],
    optimizationPush: {
      suboptimalComplexity: "O((m+n)²)",
      nudge:
        "Shifting elements is costly. Can you achieve O(m+n) by filling from the back instead of the front?",
    },
    correctPatternNotes: [
      "Using three pointers (p1, p2, p for write position) is correct",
      "Starting from the end (m+n-1) and working backwards is optimal",
      "Handling remaining elements from nums2 at the end is necessary",
    ],
  },
  {
    id: "dsa-even-odd-index-sum-difference",
    title: "Difference Between Sums at Even and Odd Indices",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "easy",
    companies: ["ZipRecruiter"],
    description: "Calculate the difference between sums of elements at even and odd indices",
    tags: ["array", "math"],
    estimatedTime: 10,
    problemStatement: `Given an integer array nums, calculate the sum of elements at even indices and the sum of elements at odd indices. Return the difference (even sum - odd sum).

Only consider elements within the range [-100, 100]. Elements outside this range should be ignored.`,
    examples: [
      {
        input: "nums = [1, 2, 3, 4, 5]",
        output: "3",
        explanation: "Even indices (0, 2, 4): 1 + 3 + 5 = 9. Odd indices (1, 3): 2 + 4 = 6. Difference: 9 - 6 = 3.",
      },
      {
        input: "nums = [10, 20, 30, 40]",
        output: "-20",
        explanation: "Even indices: 10 + 30 = 40. Odd indices: 20 + 40 = 60. Difference: 40 - 60 = -20.",
      },
      {
        input: "nums = [5, 200, 10, -5]",
        output: "20",
        explanation: "200 is outside [-100, 100] so ignored. Even: 5 + 10 = 15. Odd: -5 = -5. Difference: 15 - (-5) = 20.",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9",
      "Only consider elements where -100 <= nums[i] <= 100",
    ],
    hints: [
      "Iterate through the array once",
      "Check if index is even or odd using modulo",
      "Filter elements by the range constraint",
    ],
    starterCode: {
      javascript: `function evenOddDifference(nums) {
  // Write your solution here

}`,
      typescript: `function evenOddDifference(nums: number[]): number {
  // Write your solution here

}`,
      python: `def even_odd_difference(nums):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int evenOddDifference(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
      cpp: `class Solution {
public:
    int evenOddDifference(vector<int>& nums) {
        // Write your solution here
        return 0;
    }
};`,
      csharp: `public class Solution {
    public int EvenOddDifference(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
      go: `func evenOddDifference(nums []int) int {
    // Write your solution here
    return 0
}`,
      rust: `impl Solution {
    pub fn even_odd_difference(nums: Vec<i32>) -> i32 {
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
        input: { nums: [1, 2, 3, 4, 5] },
        expected: 3,
        description: "Standard case",
      },
      {
        input: { nums: [10, 20, 30, 40] },
        expected: -20,
        description: "Negative result",
      },
      {
        input: { nums: [5, 200, 10, -5] },
        expected: 20,
        description: "Filter out-of-range element",
      },
      {
        input: { nums: [100, -100, 100, -100] },
        expected: 400,
        description: "Boundary values",
      },
      {
        input: { nums: [0] },
        expected: 0,
        description: "Single element",
      },
    ],
    fuzzyStatement: "Given an array, find the difference between sums at even and odd positions.",
    clarifyingQuestions: [
      {
        topic: "index_definition",
        question: "Are indices 0-based or 1-based? Is index 0 considered even or odd?",
        answer: "Indices are 0-based. Index 0 is even, index 1 is odd, etc.",
        required: true,
      },
      {
        topic: "range_filter",
        question: "Should I include all elements or only certain values?",
        answer: "Only include elements within the range [-100, 100]. Skip elements outside this range.",
        required: true,
      },
      {
        topic: "result_sign",
        question: "Which sum comes first in the difference calculation?",
        answer: "Return (even sum - odd sum). The result can be negative.",
        required: true,
      },
    ],
    commonWrongApproaches: [
      {
        description: "Forgetting to filter by range",
        codeSignals: ["no range check", "no if condition for 100"],
        intervention:
          "Remember the constraint about the range [-100, 100]. Are you filtering out elements outside this range?",
      },
      {
        description: "Using 1-based indexing",
        codeSignals: ["index + 1", "starting from 1"],
        intervention:
          "Careful with your indexing - the problem uses 0-based indices where 0 is even.",
      },
    ],
    whatIfQuestions: [
      "What if the array is empty?",
      "What if all elements are outside the valid range?",
      "What happens with negative numbers at odd indices?",
      "What if all elements are at boundary values (100 or -100)?",
    ],
    midCodingProbes: [
      {
        trigger: "iterating through array",
        question: "How are you determining if an index is even or odd?",
      },
      {
        trigger: "filtering values",
        question: "What happens to the element 200 in the array [5, 200, 10]?",
      },
    ],
  },
  {
    id: "dsa-student-highest-average",
    title: "Student with Highest Average Score",
    type: "dsa",
    pattern: "two-pointers",
    difficulty: "medium",
    companies: ["ZipRecruiter"],
    description: "Find the student with the highest average score from a list of records",
    tags: ["array", "hash-table", "sorting"],
    estimatedTime: 20,
    problemStatement: `You are given a list of student score records. Each record contains a student name and a score. A student may have multiple scores.

Calculate the average score for each student and return the name of the student with the highest average. If there's a tie, return the name that comes first alphabetically.`,
    examples: [
      {
        input: 'records = [["Alice", 90], ["Bob", 85], ["Alice", 95], ["Bob", 80]]',
        output: '"Alice"',
        explanation: "Alice's average: (90 + 95) / 2 = 92.5. Bob's average: (85 + 80) / 2 = 82.5. Alice wins.",
      },
      {
        input: 'records = [["Charlie", 100], ["David", 100]]',
        output: '"Charlie"',
        explanation: "Both have average 100. Charlie comes first alphabetically.",
      },
    ],
    constraints: [
      "1 <= records.length <= 10^4",
      "Each record is [name, score]",
      "1 <= name.length <= 20",
      "0 <= score <= 100",
    ],
    hints: [
      "Use a hash map to group scores by student name",
      "Calculate average for each student",
      "Track the maximum average and handle ties alphabetically",
    ],
    starterCode: {
      javascript: `function highestAverage(records) {
  // Write your solution here

}`,
      typescript: `function highestAverage(records: [string, number][]): string {
  // Write your solution here

}`,
      python: `def highest_average(records):
    # Write your solution here
    pass`,
      java: `class Solution {
    public String highestAverage(String[][] records) {
        // Write your solution here
        return "";
    }
}`,
      cpp: `class Solution {
public:
    string highestAverage(vector<vector<string>>& records) {
        // Write your solution here
        return "";
    }
};`,
      csharp: `public class Solution {
    public string HighestAverage(string[][] records) {
        // Write your solution here
        return "";
    }
}`,
      go: `func highestAverage(records [][]string) string {
    // Write your solution here
    return ""
}`,
      rust: `impl Solution {
    pub fn highest_average(records: Vec<Vec<String>>) -> String {
        // Write your solution here
        String::new()
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(k) where k is number of unique students",
    },
    testCases: [
      {
        input: { records: [["Alice", 90], ["Bob", 85], ["Alice", 95], ["Bob", 80]] },
        expected: "Alice",
        description: "Alice has higher average",
      },
      {
        input: { records: [["Charlie", 100], ["David", 100]] },
        expected: "Charlie",
        description: "Tie - alphabetically first",
      },
      {
        input: { records: [["Zoe", 50]] },
        expected: "Zoe",
        description: "Single student",
      },
      {
        input: { records: [["A", 80], ["B", 90], ["A", 100]] },
        expected: "A",
        description: "A's average 90 equals B's single score",
      },
    ],
    fuzzyStatement: "Given a list of student scores, find who has the highest average.",
    clarifyingQuestions: [
      {
        topic: "tie_breaker",
        question: "What if multiple students have the same highest average?",
        answer: "Return the name that comes first alphabetically.",
        required: true,
      },
      {
        topic: "single_score",
        question: "Can a student have only one score?",
        answer: "Yes, a student may have just one score. Their average is that single score.",
        required: false,
      },
      {
        topic: "return_format",
        question: "Should I return the student's name or their average?",
        answer: "Return only the student's name as a string.",
        required: true,
      },
    ],
    commonWrongApproaches: [
      {
        description: "Not handling tie-breaker alphabetically",
        codeSignals: ["max only", "no sort", "first found"],
        intervention:
          "What happens if two students have the same average? How do you decide which name to return?",
      },
      {
        description: "Integer division causing precision loss",
        codeSignals: ["sum // count", "int(sum/count)", "sum / count (integer)"],
        intervention:
          "Be careful with integer vs floating-point division. Averages like 92.5 need decimal precision.",
      },
    ],
    whatIfQuestions: [
      "What if a student appears only once in the records?",
      "What if two students have exactly the same average?",
      "What if all students have different averages?",
      "What if a student has scores of 0?",
    ],
    midCodingProbes: [
      {
        trigger: "building hash map",
        question: "What are you storing in your map - the total score, or a list of scores?",
      },
      {
        trigger: "calculating average",
        question: "How are you calculating the average - are you using integer or floating-point division?",
      },
      {
        trigger: "finding maximum",
        question: "How are you handling the tie-breaker when averages are equal?",
      },
    ],
    correctPatternNotes: [
      "Using a hash map with name as key and (sum, count) as value is efficient",
      "Using floating-point division for average calculation is necessary",
      "Sorting alphabetically or using string comparison for tie-breaking is correct",
    ],
  },
]

export default twoPointersScenarios
