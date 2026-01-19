/**
 * Sliding Window DSA Scenarios
 * Pattern: sliding-window
 */

import type { DSAScenario } from "../types"

export const slidingWindowScenarios: DSAScenario[] = [
  {
    id: "dsa-best-time-to-buy-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple", "Snap", "TikTok", "Roblox"],
    description: "Find the maximum profit from buying and selling a stock",
    tags: ["array", "dynamic-programming", "greedy"],
    estimatedTime: 20,
    problemStatement: `You are given an array prices where prices[i] is the price of a given stock on the ith day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.`,
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "5",
        explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.",
      },
      {
        input: "prices = [7,6,4,3,1]",
        output: "0",
        explanation: "In this case, no transactions are done and the max profit = 0.",
      },
    ],
    constraints: ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
    hints: [
      "Track the minimum price seen so far",
      "For each price, calculate the profit if we sold today",
      "Keep track of the maximum profit",
    ],
    starterCode: {
      javascript: `function maxProfit(prices) {
  // Write your solution here

}`,
      typescript: `function maxProfit(prices: number[]): number {
  // Write your solution here

}`,
      python: `def max_profit(prices):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int maxProfit(int[] prices) {
        // Write your solution here
        return 0;
    }
}`,
      cpp: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // Write your solution here
        return 0;
    }
};`,
      csharp: `public class Solution {
    public int MaxProfit(int[] prices) {
        // Write your solution here
        return 0;
    }
}`,
      go: `func maxProfit(prices []int) int {
    // Write your solution here
    return 0
}`,
      rust: `impl Solution {
    pub fn max_profit(prices: Vec<i32>) -> i32 {
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
        input: { prices: [7, 1, 5, 3, 6, 4] },
        expected: 5,
        description: "Buy at 1, sell at 6: profit = 5",
      },
      {
        input: { prices: [7, 6, 4, 3, 1] },
        expected: 0,
        description: "No profitable transaction possible",
      },
      {
        input: { prices: [1, 2] },
        expected: 1,
        description: "Minimal profitable case",
      },
      {
        input: { prices: [2, 4, 1] },
        expected: 2,
        description: "Buy at 2, sell at 4: profit = 2",
      },
    ],
  },

  {
    id: "dsa-longest-substring-without-repeating",
    title: "Longest Substring Without Repeating Characters",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple", "TikTok", "Reddit", "Spotify"],
    description: "Find the length of the longest substring without repeating characters.",
    tags: ["string", "sliding-window", "hash-table"],
    estimatedTime: 25,
    problemStatement: `Given a string s, find the length of the longest substring without repeating characters.`,
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: 'The answer is "abc", with the length of 3',
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: 'The answer is "b", with the length of 1',
      },
      {
        input: 's = "pwwkew"',
        output: "3",
        explanation: 'The answer is "wke", with the length of 3',
      },
    ],
    constraints: [
      "0 <= s.length <= 5 * 10^4",
      "s consists of English letters, digits, symbols and spaces",
    ],
    hints: [
      "Use sliding window with two pointers",
      "Use a set or map to track characters in current window",
      "When duplicate found, shrink window from left",
    ],
    starterCode: {
      javascript: `function lengthOfLongestSubstring(s) {
  // Your code here
}`,
      python: `def lengthOfLongestSubstring(s):
    # Your code here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(min(n, m)) where m is charset size",
    },
    testCases: [
      {
        input: { s: "abcabcbb" },
        expected: 3,
        description: "Repeating pattern",
      },
      {
        input: { s: "bbbbb" },
        expected: 1,
        description: "All same character",
      },
      {
        input: { s: "pwwkew" },
        expected: 3,
        description: "Multiple substrings of same length",
      },
      {
        input: { s: "" },
        expected: 0,
        description: "Empty string",
      },
    ],

    // ==========================================
    // Real Interview Mode (Fuzzy Mode) Fields
    // ==========================================
    fuzzyStatement: "Given a string, find the longest substring without repeating characters.",

    clarifyingQuestions: [
      {
        question: "Should I return the length or the actual substring?",
        topic: "output_format",
        answer: "Return the length of the longest substring.",
        required: true,
      },
      {
        question:
          "What does 'repeating' mean - consecutive duplicates or any duplicates within the substring?",
        topic: "repeating_definition",
        answer:
          "Any duplicate within the substring. For example, 'aba' has repeating 'a's so it's invalid, but 'abc' is valid.",
        required: true,
      },
      {
        question: "What characters can the string contain?",
        topic: "character_set",
        answer: "English letters, digits, symbols, and spaces.",
        required: false,
      },
      {
        question: "What if the string is empty?",
        topic: "empty_input",
        answer: "Return 0 for an empty string.",
        required: false,
      },
      {
        question: "Is the comparison case-sensitive?",
        topic: "case_sensitivity",
        answer: "Yes, 'a' and 'A' are different characters.",
        required: false,
      },
    ],

    commonWrongApproaches: [
      {
        description: "Brute force checking all substrings O(n³)",
        codeSignals: ["three nested loops", "O(n^3)", "for all substrings", "substring.includes"],
        intervention:
          "That approach checks every substring which is O(n³). Can you think of a way to do this in a single pass?",
      },
      {
        description: "Not shrinking window correctly when duplicate found",
        codeSignals: ["left = 0", "reset window", "start over"],
        intervention:
          "When you find a duplicate, do you need to reset the entire window? Can you jump directly past the duplicate?",
      },
      {
        description: "Using indexOf instead of hash map",
        codeSignals: ["indexOf", "lastIndexOf", "findIndex"],
        intervention:
          "indexOf is O(n) per lookup. Is there a data structure that gives O(1) lookup for character positions?",
      },
    ],

    whatIfQuestions: [
      "What if all characters are the same, like 'aaaaa'?",
      "What if all characters are unique?",
      "What happens when you see a character that's outside your current window?",
    ],

    midCodingProbes: [
      {
        trigger: "using a set or map",
        question: "What are you storing - just characters, or their positions too?",
      },
      {
        trigger: "handling duplicate found",
        question:
          "Let's trace through 'abcabc'. When you hit the second 'a', what happens to your window?",
      },
    ],

    optimizationPush: {
      suboptimalComplexity: "O(n²)",
      nudge:
        "Your solution visits some characters multiple times. Can you achieve O(n) using a hash map to track where you last saw each character?",
    },
  },

  {
    id: "dsa-sliding-window-maximum",
    title: "Sliding Window Maximum",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "TikTok"],
    description: "Find maximum in each sliding window of size k.",
    tags: ["array", "deque", "sliding-window"],
    estimatedTime: 30,
    problemStatement: `You are given an array of integers nums, and there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position.

Return the max sliding window - an array of the maximum values in each window.`,
    examples: [
      {
        input: "nums = [1,3,-1,-3,5,3,6,7], k = 3",
        output: "[3,3,5,5,6,7]",
        explanation:
          "Window positions and max: [1,3,-1]→3, [3,-1,-3]→3, [-1,-3,5]→5, [-3,5,3]→5, [5,3,6]→6, [3,6,7]→7",
      },
      {
        input: "nums = [1], k = 1",
        output: "[1]",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4", "1 <= k <= nums.length"],
    hints: [
      "Use deque to maintain window in decreasing order",
      "Remove elements outside window from front",
      "Remove smaller elements from back before adding new",
    ],
    starterCode: {
      javascript: `function maxSlidingWindow(nums, k) {
  // Write your solution here

}`,
      typescript: `function maxSlidingWindow(nums: number[], k: number): number[] {
  // Write your solution here

}`,
      python: `def maxSlidingWindow(nums, k):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(k)",
    },
    testCases: [
      {
        input: { nums: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 },
        expected: [3, 3, 5, 5, 6, 7],
        description: "Standard sliding window",
      },
      {
        input: { nums: [1], k: 1 },
        expected: [1],
        description: "Single element",
      },
      {
        input: { nums: [1, -1], k: 1 },
        expected: [1, -1],
        description: "Window size 1",
      },
      {
        input: { nums: [9, 11], k: 2 },
        expected: [11],
        description: "Window size equals array length",
      },
      {
        input: { nums: [4, -2], k: 2 },
        expected: [4],
        description: "Negative numbers",
      },
    ],
  },

  {
    id: "dsa-minimum-window-substring",
    title: "Minimum Window Substring",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "TikTok"],
    description: "Find minimum window in s containing all chars from t.",
    tags: ["string", "sliding-window", "hash-table"],
    estimatedTime: 35,
    problemStatement: `Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string "".

The testcases will be generated such that the answer is unique.`,
    examples: [
      {
        input: 's = "ADOBECODEBANC", t = "ABC"',
        output: '"BANC"',
        explanation: 'The minimum window substring "BANC" includes A, B, and C from string t.',
      },
      {
        input: 's = "a", t = "a"',
        output: '"a"',
      },
      {
        input: 's = "a", t = "aa"',
        output: '""',
        explanation: "s does not contain two a's, so return empty string.",
      },
    ],
    constraints: [
      "m == s.length",
      "n == t.length",
      "1 <= m, n <= 10^5",
      "s and t consist of uppercase and lowercase English letters.",
    ],
    hints: [
      "Use sliding window with two pointers",
      "Expand right to include chars, contract left to minimize",
      "Use HashMap to track character frequencies",
    ],
    starterCode: {
      javascript: `function minWindow(s, t) {
  // Write your solution here

}`,
      typescript: `function minWindow(s: string, t: string): string {
  // Write your solution here

}`,
      python: `def minWindow(s, t):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(|s| + |t|)",
      space: "O(|s| + |t|)",
    },
    testCases: [
      {
        input: { s: "ADOBECODEBANC", t: "ABC" },
        expected: "BANC",
        description: "Standard case",
      },
      {
        input: { s: "a", t: "a" },
        expected: "a",
        description: "Single character match",
      },
      {
        input: { s: "a", t: "aa" },
        expected: "",
        description: "No valid window",
      },
      {
        input: { s: "ab", t: "b" },
        expected: "b",
        description: "Match at end",
      },
      {
        input: { s: "bba", t: "ab" },
        expected: "ba",
        description: "Minimum at end",
      },
    ],
  },
  {
    id: "dsa-longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "TikTok"],
    description: "Find longest substring with same letter after k replacements",
    tags: ["string", "sliding-window", "hash-table"],
    estimatedTime: 25,
    problemStatement: `You are given a string s and an integer k. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most k times. Return the length of the longest substring containing the same letter you can get after performing the above operations.`,
    examples: [
      {
        input: 's = "ABAB", k = 2',
        output: "4",
        explanation: "Replace the two A's with two B's or vice versa.",
      },
      {
        input: 's = "AABABBA", k = 1',
        output: "4",
        explanation: 'Replace one A in the middle to get "AABBBBA" or similar.',
      },
    ],
    constraints: [
      "1 <= s.length <= 10^5",
      "s consists of only uppercase English letters",
      "0 <= k <= s.length",
    ],
    hints: [
      "Use sliding window with character frequency count",
      "Window is valid if length - maxFreq <= k",
      "Track the max frequency character in current window",
    ],
    starterCode: {
      javascript: `function characterReplacement(s, k) {\n  // Write your solution here\n\n}`,
      typescript: `function characterReplacement(s: string, k: number): number {\n  // Write your solution here\n\n}`,
      python: `def characterReplacement(s, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { s: "ABAB", k: 2 }, expected: 4, description: "Replace all different chars" },
      { input: { s: "AABABBA", k: 1 }, expected: 4, description: "Single replacement" },
    ],
  },
  {
    id: "dsa-permutation-in-string",
    title: "Permutation in String",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Microsoft"],
    description: "Check if s2 contains a permutation of s1",
    tags: ["string", "sliding-window", "hash-table"],
    estimatedTime: 25,
    problemStatement: `Given two strings s1 and s2, return true if s2 contains a permutation of s1, or false otherwise. In other words, return true if one of s1's permutations is a substring of s2.`,
    examples: [
      {
        input: 's1 = "ab", s2 = "eidbaooo"',
        output: "true",
        explanation: 's2 contains one permutation of s1 ("ba").',
      },
      { input: 's1 = "ab", s2 = "eidboaoo"', output: "false" },
    ],
    constraints: [
      "1 <= s1.length, s2.length <= 10^4",
      "s1 and s2 consist of lowercase English letters",
    ],
    hints: [
      "Use sliding window of size s1.length",
      "Compare character frequencies in window with s1",
      "Slide window and update frequencies incrementally",
    ],
    starterCode: {
      javascript: `function checkInclusion(s1, s2) {\n  // Write your solution here\n\n}`,
      typescript: `function checkInclusion(s1: string, s2: string): boolean {\n  // Write your solution here\n\n}`,
      python: `def checkInclusion(s1, s2):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { s1: "ab", s2: "eidbaooo" }, expected: true, description: "Permutation exists" },
      { input: { s1: "ab", s2: "eidboaoo" }, expected: false, description: "No permutation" },
    ],
  },
  {
    id: "dsa-max-consecutive-ones-iii",
    title: "Max Consecutive Ones III",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Find longest subarray of 1s after flipping at most k 0s",
    tags: ["array", "sliding-window"],
    estimatedTime: 20,
    problemStatement: `Given a binary array nums and an integer k, return the maximum number of consecutive 1's in the array if you can flip at most k 0's.`,
    examples: [
      {
        input: "nums = [1,1,1,0,0,0,1,1,1,1,0], k = 2",
        output: "6",
        explanation: "Flip the bolded zeros: [1,1,1,0,0,1,1,1,1,1,1]",
      },
      { input: "nums = [0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1], k = 3", output: "10" },
    ],
    constraints: ["1 <= nums.length <= 10^5", "nums[i] is either 0 or 1", "0 <= k <= nums.length"],
    hints: [
      "Sliding window: expand right, shrink left when zeros > k",
      "Count zeros in current window",
      "Track maximum window size",
    ],
    starterCode: {
      javascript: `function longestOnes(nums, k) {\n  // Write your solution here\n\n}`,
      typescript: `function longestOnes(nums: number[], k: number): number {\n  // Write your solution here\n\n}`,
      python: `def longestOnes(nums, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      {
        input: { nums: [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], k: 2 },
        expected: 6,
        description: "Flip 2 zeros",
      },
      {
        input: { nums: [0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1], k: 3 },
        expected: 10,
        description: "Flip 3 zeros",
      },
    ],
  },
]

export default slidingWindowScenarios
