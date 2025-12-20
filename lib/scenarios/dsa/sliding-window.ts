/**
 * Sliding Window DSA Scenarios
 * Pattern: sliding-window
 */

import type { DSAScenario } from '../types'

export const slidingWindowScenarios: DSAScenario[] = [
  {
    id: 'dsa-best-time-to-buy-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    type: 'dsa',
    pattern: 'sliding-window',
    difficulty: 'easy',
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Apple'],
    description: 'Find the maximum profit from buying and selling a stock',
    tags: ['array', 'dynamic-programming', 'greedy'],
    estimatedTime: 20,
    problemStatement: `You are given an array prices where prices[i] is the price of a given stock on the ith day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.`,
    examples: [
      {
        input: 'prices = [7,1,5,3,6,4]',
        output: '5',
        explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.',
      },
      {
        input: 'prices = [7,6,4,3,1]',
        output: '0',
        explanation: 'In this case, no transactions are done and the max profit = 0.',
      },
    ],
    constraints: [
      '1 <= prices.length <= 10^5',
      '0 <= prices[i] <= 10^4',
    ],
    hints: [
      'Track the minimum price seen so far',
      'For each price, calculate the profit if we sold today',
      'Keep track of the maximum profit',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { prices: [7, 1, 5, 3, 6, 4] },
        expected: 5,
        description: 'Buy at 1, sell at 6: profit = 5',
      },
      {
        input: { prices: [7, 6, 4, 3, 1] },
        expected: 0,
        description: 'No profitable transaction possible',
      },
      {
        input: { prices: [1, 2] },
        expected: 1,
        description: 'Minimal profitable case',
      },
      {
        input: { prices: [2, 4, 1] },
        expected: 2,
        description: 'Buy at 2, sell at 4: profit = 2',
      },
    ],
  },

  {
    id: 'dsa-longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    type: 'dsa',
    pattern: 'sliding-window',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Apple'],
    description: 'Find the length of the longest substring without repeating characters.',
    tags: ['string', 'sliding-window', 'hash-table'],
    estimatedTime: 25,
    problemStatement: `Given a string s, find the length of the longest substring without repeating characters.`,
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3'
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b", with the length of 1'
      },
      {
        input: 's = "pwwkew"',
        output: '3',
        explanation: 'The answer is "wke", with the length of 3'
      }
    ],
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces'
    ],
    hints: [
      'Use sliding window with two pointers',
      'Use a set or map to track characters in current window',
      'When duplicate found, shrink window from left'
    ],
    starterCode: {
      javascript: `function lengthOfLongestSubstring(s) {
  // Your code here
}`,
      python: `def lengthOfLongestSubstring(s):
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(min(n, m)) where m is charset size'
    },
    testCases: [
      {
        input: { s: "abcabcbb" },
        expected: 3,
        description: 'Repeating pattern'
      },
      {
        input: { s: "bbbbb" },
        expected: 1,
        description: 'All same character'
      },
      {
        input: { s: "pwwkew" },
        expected: 3,
        description: 'Multiple substrings of same length'
      },
      {
        input: { s: "" },
        expected: 0,
        description: 'Empty string'
      }
    ]
  },

  {
    id: 'dsa-sliding-window-maximum',
    title: 'Sliding Window Maximum',
    type: 'dsa',
    pattern: 'sliding-window',
    difficulty: 'hard',
    companies: ["Amazon", "Google", "Meta"],
    description: 'Find maximum in each sliding window of size k.',
    tags: ["array", "deque", "sliding-window"],
    estimatedTime: 30,
    problemStatement: `Given an array nums and a sliding window of size k which moves from left to right. You can only see the k numbers in the window. Return the max value in each window.`,
    examples: [
    {
      input: 'nums = [1,3,-1,-3,5,3,6,7], k = 3',
      output: '[3,3,5,5,6,7]'
    }
  ],
    constraints: [
    '1 <= nums.length <= 10^5',
    '1 <= k <= nums.length',
    '-10^4 <= nums[i] <= 10^4'
  ],
    hints: [
    'Use deque to maintain window in decreasing order',
    'Remove elements outside window from front',
    'Remove smaller elements from back before adding new'
  ],
    starterCode: {
      javascript: `function sliding_window_maximum() {
  // Your code here
}`,
      python: `def sliding_window_maximum():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(k)'
    },
    testCases: []
  },

  {
    id: 'dsa-minimum-window-substring',
    title: 'Minimum Window Substring',
    type: 'dsa',
    pattern: 'sliding-window',
    difficulty: 'hard',
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: 'Find minimum window in s containing all chars from t.',
    tags: ["string", "sliding-window", "hash-table"],
    estimatedTime: 35,
    problemStatement: `Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If no such substring exists, return empty string.`,
    examples: [
    {
      input: 's = ADOBECODEBANC, t = ABC',
      output: 'BANC'
    },
    {
      input: 's = a, t = a',
      output: 'a'
    }
  ],
    constraints: [
    '1 <= s.length, t.length <= 10^5',
    's and t consist of uppercase and lowercase English letters.'
  ],
    hints: [
    'Use sliding window with two pointers',
    'Expand right to include chars, contract left to minimize',
    'Use HashMap to track character frequencies'
  ],
    starterCode: {
      javascript: `function minimum_window_substring() {
  // Your code here
}`,
      python: `def minimum_window_substring():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(|s| + |t|)',
      space: 'O(|s| + |t|)'
    },
    testCases: []
  },
]

export default slidingWindowScenarios
