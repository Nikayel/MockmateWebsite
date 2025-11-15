/**
 * Interview scenarios for MockMate
 * Shared between website and extension
 */

export type ScenarioType = 'dsa' | 'bugfix' | 'optimization' | 'security' | 'system-design';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type Company = 'Google' | 'Meta' | 'Amazon' | 'Netflix' | 'Apple' | 'Microsoft' | 'Startup' | 'Generic' | 'Airbnb' | 'Shopify' | 'Walmart';

export interface BaseScenario {
  id: string;
  title: string;
  type: ScenarioType;
  difficulty: DifficultyLevel;
  companies: Company[];
  description: string;
  tags: string[];
  estimatedTime: number; // in minutes
}

export interface DSAScenario extends BaseScenario {
  type: 'dsa';
  problemStatement: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  hints: string[];
  starterCode: {
    [language: string]: string;
  };
  optimalComplexity: {
    time: string;
    space: string;
  };
  testCases: {
    input: any;
    expected: any;
    description: string;
  }[];
}

export interface BugFixScenario extends BaseScenario {
  type: 'bugfix';
  problemStatement: string;
  buggyCode: {
    [language: string]: string;
  };
  // Multi-file codebase for realistic scenarios
  codebaseFiles: {
    [language: string]: {
      fileName: string;
      content: string;
      description: string;
    }[];
  };
  expectedBehavior: string;
  bugDescription: string;
  hints: string[];
  testCases: {
    input: any;
    expected: any;
    description: string;
  }[];
}

export type Scenario = DSAScenario | BugFixScenario;

export const scenarios: Scenario[] = [
  {
    id: 'dsa-two-sum',
    title: 'Two Sum',
    type: 'dsa',
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
  {
    id: 'dsa-valid-parentheses',
    title: 'Valid Parentheses',
    type: 'dsa',
    difficulty: 'easy',
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    description: 'Determine if a string containing parentheses is valid',
    tags: ['stack', 'string'],
    estimatedTime: 15,
    problemStatement: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: 'true',
      },
      {
        input: 's = "()[]{}"',
        output: 'true',
      },
      {
        input: 's = "(]"',
        output: 'false',
      },
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only \'()[]{}\'.',
    ],
    hints: [
      'Use a stack to keep track of opening brackets',
      'When you see a closing bracket, check if it matches the top of the stack',
      'The string is valid if the stack is empty at the end',
    ],
    starterCode: {
      javascript: `function isValid(s) {
  // Write your solution here

}`,
      typescript: `function isValid(s: string): boolean {
  // Write your solution here

}`,
      python: `def is_valid(s):
    # Write your solution here
    pass`,
      java: `class Solution {
    public boolean isValid(String s) {
        // Write your solution here
        return false;
    }
}`,
      cpp: `class Solution {
public:
    bool isValid(string s) {
        // Write your solution here

    }
};`,
      csharp: `public class Solution {
    public bool IsValid(string s) {
        // Write your solution here
        return false;
    }
}`,
      go: `func isValid(s string) bool {
    // Write your solution here
    return false
}`,
      rust: `impl Solution {
    pub fn is_valid(s: String) -> bool {
        // Write your solution here
        false
    }
}`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)',
    },
    testCases: [
      {
        input: { s: "()" },
        expected: true,
        description: 'Basic case: ()',
      },
      {
        input: { s: "()[]{}" },
        expected: true,
        description: 'Multiple types: ()[]{}',
      },
      {
        input: { s: "(]" },
        expected: false,
        description: 'Mismatched: (]',
      },
      {
        input: { s: "([)]" },
        expected: false,
        description: 'Wrong order: ([)]',
      },
      {
        input: { s: "{[]}" },
        expected: true,
        description: 'Nested: {[]}',
      },
    ],
  },
  // ==================== More DSA Problems ====================
  {
    id: 'dsa-best-time-to-buy-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    type: 'dsa',
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
    id: 'dsa-contains-duplicate',
    title: 'Contains Duplicate',
    type: 'dsa',
    difficulty: 'easy',
    companies: ['Amazon', 'Google', 'Apple'],
    description: 'Determine if an array contains any duplicates',
    tags: ['array', 'hash-table', 'sorting'],
    estimatedTime: 10,
    problemStatement: `Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.`,
    examples: [
      {
        input: 'nums = [1,2,3,1]',
        output: 'true',
      },
      {
        input: 'nums = [1,2,3,4]',
        output: 'false',
      },
      {
        input: 'nums = [1,1,1,3,3,4,3,2,4,2]',
        output: 'true',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^9 <= nums[i] <= 10^9',
    ],
    hints: [
      'Use a Set to track seen numbers',
      'As you iterate, check if the number is already in the set',
    ],
    starterCode: {
      javascript: `function containsDuplicate(nums) {
  // Write your solution here

}`,
      typescript: `function containsDuplicate(nums: number[]): boolean {
  // Write your solution here

}`,
      python: `def containsDuplicate(nums):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)',
    },
    testCases: [
      {
        input: { nums: [1, 2, 3, 1] },
        expected: true,
        description: 'Basic case with duplicate: [1,2,3,1]',
      },
      {
        input: { nums: [1, 2, 3, 4] },
        expected: false,
        description: 'No duplicates: [1,2,3,4]',
      },
      {
        input: { nums: [1, 1, 1, 3, 3, 4, 3, 2, 4, 2] },
        expected: true,
        description: 'Multiple duplicates',
      },
      {
        input: { nums: [1] },
        expected: false,
        description: 'Single element',
      },
      {
        input: { nums: [1, 1] },
        expected: true,
        description: 'Two identical elements',
      },
    ],
  },
  {
    id: 'dsa-product-array-except-self',
    title: 'Product of Array Except Self',
    type: 'dsa',
    difficulty: 'medium',
    companies: ['Meta', 'Amazon', 'Apple', 'Microsoft'],
    description: 'Calculate product of all elements except current element',
    tags: ['array', 'prefix-sum'],
    estimatedTime: 25,
    problemStatement: `Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].

The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in O(n) time and without using the division operation.`,
    examples: [
      {
        input: 'nums = [1,2,3,4]',
        output: '[24,12,8,6]',
      },
      {
        input: 'nums = [-1,1,0,-3,3]',
        output: '[0,0,9,0,0]',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^5',
      '-30 <= nums[i] <= 30',
      'The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer',
    ],
    hints: [
      'Use two passes: one for prefix products, one for suffix products',
      'You can optimize space by storing prefix products in the result array',
      'Then multiply by suffix products in a second pass',
    ],
    starterCode: {
      javascript: `function productExceptSelf(nums) {
  // Write your solution here

}`,
      typescript: `function productExceptSelf(nums: number[]): number[] {
  // Write your solution here

}`,
      python: `def productExceptSelf(nums):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { nums: [1, 2, 3, 4] },
        expected: [24, 12, 8, 6],
        description: 'Basic case: [1,2,3,4]',
      },
      {
        input: { nums: [-1, 1, 0, -3, 3] },
        expected: [0, 0, 9, 0, 0],
        description: 'With zeros and negatives',
      },
      {
        input: { nums: [2, 3] },
        expected: [3, 2],
        description: 'Two elements: [2,3]',
      },
      {
        input: { nums: [1, 2, 3] },
        expected: [6, 3, 2],
        description: 'Three elements: [1,2,3]',
      },
      {
        input: { nums: [-1, -2, -3, -4] },
        expected: [-24, -12, -8, -6],
        description: 'All negative numbers',
      },
    ],
  },
  {
    id: 'dsa-maximum-subarray',
    title: 'Maximum Subarray (Kadane\'s Algorithm)',
    type: 'dsa',
    difficulty: 'medium',
    companies: ['Amazon', 'Microsoft', 'Meta', 'Apple'],
    description: 'Find the contiguous subarray with the largest sum',
    tags: ['array', 'dynamic-programming', 'divide-and-conquer'],
    estimatedTime: 20,
    problemStatement: `Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

A subarray is a contiguous part of an array.`,
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: 'The subarray [4,-1,2,1] has the largest sum 6.',
      },
      {
        input: 'nums = [1]',
        output: '1',
      },
      {
        input: 'nums = [5,4,-1,7,8]',
        output: '23',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
    ],
    hints: [
      'Use Kadane\'s Algorithm',
      'Keep track of the current sum and maximum sum',
      'Reset current sum to 0 if it becomes negative',
    ],
    starterCode: {
      javascript: `function maxSubArray(nums) {
  // Write your solution here

}`,
      typescript: `function maxSubArray(nums: number[]): number {
  // Write your solution here

}`,
      python: `def maxSubArray(nums):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
        expected: 6,
        description: 'Classic case: [4,-1,2,1] subarray sum = 6',
      },
      {
        input: { nums: [1] },
        expected: 1,
        description: 'Single element',
      },
      {
        input: { nums: [5, 4, -1, 7, 8] },
        expected: 23,
        description: 'All positive sum',
      },
      {
        input: { nums: [-1, -2, -3, -4] },
        expected: -1,
        description: 'All negative: return largest negative',
      },
      {
        input: { nums: [1, 2, -1, -2, 2, 1, -2, 1] },
        expected: 3,
        description: 'Mixed positive and negative',
      },
    ],
  },
  {
    id: 'dsa-merge-intervals',
    title: 'Merge Intervals',
    type: 'dsa',
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
  {
    id: 'dsa-group-anagrams',
    title: 'Group Anagrams',
    type: 'dsa',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    description: 'Group strings that are anagrams of each other',
    tags: ['array', 'hash-table', 'string', 'sorting'],
    estimatedTime: 20,
    problemStatement: `Given an array of strings strs, group the anagrams together. You can return the answer in any order.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    examples: [
      {
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
      },
      {
        input: 'strs = [""]',
        output: '[[""]]',
      },
      {
        input: 'strs = ["a"]',
        output: '[["a"]]',
      },
    ],
    constraints: [
      '1 <= strs.length <= 10^4',
      '0 <= strs[i].length <= 100',
      'strs[i] consists of lowercase English letters',
    ],
    hints: [
      'Use a hash map where the key is a sorted version of the string',
      'All anagrams will have the same sorted string',
      'Group strings with the same key together',
    ],
    starterCode: {
      javascript: `function groupAnagrams(strs) {
  // Write your solution here

}`,
      typescript: `function groupAnagrams(strs: string[]): string[][] {
  // Write your solution here

}`,
      python: `def groupAnagrams(strs):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n * k log k)',
      space: 'O(n * k)',
    },
    testCases: [
      {
        input: { strs: ["eat", "tea", "tan", "ate", "nat", "bat"] },
        expected: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]],
        description: 'Multiple anagram groups',
        orderMatters: false,
      },
      {
        input: { strs: [""] },
        expected: [[""]],
        description: 'Empty string',
      },
      {
        input: { strs: ["a"] },
        expected: [["a"]],
        description: 'Single character',
      },
      {
        input: { strs: ["ab", "ba", "abc", "bca", "cab"] },
        expected: [["ab", "ba"], ["abc", "bca", "cab"]],
        description: 'Multiple groups of different sizes',
        orderMatters: false,
      },
      {
        input: { strs: ["a", "b", "c"] },
        expected: [["a"], ["b"], ["c"]],
        description: 'No anagrams',
        orderMatters: false,
      },
    ],
  },
  {
    id: 'dsa-longest-consecutive-sequence',
    title: 'Longest Consecutive Sequence',
    type: 'dsa',
    difficulty: 'medium',
    companies: ['Google', 'Meta', 'Amazon'],
    description: 'Find the length of the longest consecutive elements sequence',
    tags: ['array', 'hash-table', 'union-find'],
    estimatedTime: 25,
    problemStatement: `Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.

You must write an algorithm that runs in O(n) time.`,
    examples: [
      {
        input: 'nums = [100,4,200,1,3,2]',
        output: '4',
        explanation: 'The longest consecutive elements sequence is [1, 2, 3, 4]. Therefore its length is 4.',
      },
      {
        input: 'nums = [0,3,7,2,5,8,4,6,0,1]',
        output: '9',
      },
    ],
    constraints: [
      '0 <= nums.length <= 10^5',
      '-10^9 <= nums[i] <= 10^9',
    ],
    hints: [
      'Use a Set for O(1) lookups',
      'For each number, check if it\'s the start of a sequence (num-1 not in set)',
      'If it\'s a start, count the consecutive numbers',
    ],
    starterCode: {
      javascript: `function longestConsecutive(nums) {
  // Write your solution here

}`,
      typescript: `function longestConsecutive(nums: number[]): number {
  // Write your solution here

}`,
      python: `def longestConsecutive(nums):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)',
    },
    testCases: [
      {
        input: { nums: [100, 4, 200, 1, 3, 2] },
        expected: 4,
        description: 'Unsorted with sequence [1,2,3,4]',
      },
      {
        input: { nums: [0, 3, 7, 2, 5, 8, 4, 6, 0, 1] },
        expected: 9,
        description: 'Long sequence with duplicates',
      },
      {
        input: { nums: [1, 2, 0, 1] },
        expected: 3,
        description: 'Sequence [0,1,2] with duplicate',
      },
      {
        input: { nums: [] },
        expected: 0,
        description: 'Empty array',
      },
      {
        input: { nums: [9, 1, 4, 7, 3, 2, 8, 5, 6] },
        expected: 9,
        description: 'Full consecutive sequence [1-9]',
      },
    ],
  },
  {
    id: 'dsa-reverse-linked-list',
    title: 'Reverse Linked List',
    type: 'dsa',
    difficulty: 'easy',
    companies: ['Amazon', 'Microsoft', 'Meta', 'Apple', 'Google'],
    description: 'Reverse a singly linked list',
    tags: ['linked-list', 'recursion'],
    estimatedTime: 15,
    problemStatement: `Given the head of a singly linked list, reverse the list, and return the reversed list.`,
    examples: [
      {
        input: 'head = [1,2,3,4,5]',
        output: '[5,4,3,2,1]',
      },
      {
        input: 'head = [1,2]',
        output: '[2,1]',
      },
      {
        input: 'head = []',
        output: '[]',
      },
    ],
    constraints: [
      'The number of nodes in the list is the range [0, 5000]',
      '-5000 <= Node.val <= 5000',
    ],
    hints: [
      'Use three pointers: prev, current, and next',
      'Iterate through the list, reversing the links',
      'Return the new head (which was the last node)',
    ],
    starterCode: {
      javascript: `function reverseList(head) {
  // Write your solution here

}`,
      typescript: `function reverseList(head: ListNode | null): ListNode | null {
  // Write your solution here

}`,
      python: `def reverseList(head):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { values: [1, 2, 3, 4, 5] },
        expected: [5, 4, 3, 2, 1],
        description: 'Reverse list: [1,2,3,4,5] -> [5,4,3,2,1]',
      },
      {
        input: { values: [1, 2] },
        expected: [2, 1],
        description: 'Two nodes: [1,2] -> [2,1]',
      },
      {
        input: { values: [] },
        expected: [],
        description: 'Empty list',
      },
      {
        input: { values: [1] },
        expected: [1],
        description: 'Single node',
      },
      {
        input: { values: [1, 2, 3] },
        expected: [3, 2, 1],
        description: 'Three nodes: [1,2,3] -> [3,2,1]',
      },
    ],
  },
  {
    id: 'dsa-linked-list-cycle',
    title: 'Linked List Cycle',
    type: 'dsa',
    difficulty: 'easy',
    companies: ['Amazon', 'Microsoft', 'Meta', 'Google'],
    description: 'Detect if a linked list has a cycle',
    tags: ['linked-list', 'two-pointers', 'hash-table'],
    estimatedTime: 15,
    problemStatement: `Given head, the head of a linked list, determine if the linked list has a cycle in it.

There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer.

Return true if there is a cycle in the linked list. Otherwise, return false.`,
    examples: [
      {
        input: 'head = [3,2,0,-4], pos = 1',
        output: 'true',
        explanation: 'There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed).',
      },
      {
        input: 'head = [1,2], pos = 0',
        output: 'true',
      },
      {
        input: 'head = [1], pos = -1',
        output: 'false',
      },
    ],
    constraints: [
      'The number of nodes in the list is in the range [0, 10^4]',
      '-10^5 <= Node.val <= 10^5',
      'pos is -1 or a valid index in the linked-list',
    ],
    hints: [
      'Use Floyd\'s Cycle Detection Algorithm (slow and fast pointers)',
      'If there\'s a cycle, the fast pointer will eventually meet the slow pointer',
      'If fast reaches null, there\'s no cycle',
    ],
    starterCode: {
      javascript: `function hasCycle(head) {
  // Write your solution here

}`,
      typescript: `function hasCycle(head: ListNode | null): boolean {
  // Write your solution here

}`,
      python: `def hasCycle(head):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { values: [3, 2, 0, -4], pos: 1 },
        expected: true,
        description: 'Cycle at position 1',
      },
      {
        input: { values: [1, 2], pos: 0 },
        expected: true,
        description: 'Cycle at position 0',
      },
      {
        input: { values: [1], pos: -1 },
        expected: false,
        description: 'No cycle, single node',
      },
      {
        input: { values: [1, 2, 3, 4], pos: -1 },
        expected: false,
        description: 'No cycle, multiple nodes',
      },
      {
        input: { values: [], pos: -1 },
        expected: false,
        description: 'Empty list',
      },
    ],
  },
  {
    id: 'dsa-binary-search',
    title: 'Binary Search',
    type: 'dsa',
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
    id: 'dsa-valid-binary-search-tree',
    title: 'Validate Binary Search Tree',
    type: 'dsa',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Microsoft', 'Google'],
    description: 'Determine if a binary tree is a valid BST',
    tags: ['tree', 'binary-search-tree', 'depth-first-search'],
    estimatedTime: 20,
    problemStatement: `Given the root of a binary tree, determine if it is a valid binary search tree (BST).

A valid BST is defined as follows:
- The left subtree of a node contains only nodes with keys less than the node's key.
- The right subtree of a node contains only nodes with keys greater than the node's key.
- Both the left and right subtrees must also be binary search trees.`,
    examples: [
      {
        input: 'root = [2,1,3]',
        output: 'true',
      },
      {
        input: 'root = [5,1,4,null,null,3,6]',
        output: 'false',
        explanation: 'The root node\'s value is 5 but its right child\'s value is 4.',
      },
    ],
    constraints: [
      'The number of nodes in the tree is in the range [1, 10^4]',
      '-2^31 <= Node.val <= 2^31 - 1',
    ],
    hints: [
      'Use recursion with min and max bounds',
      'For each node, check if it\'s within its valid range',
      'Update bounds when recursing to left and right',
    ],
    starterCode: {
      javascript: `function isValidBST(root) {
  // Write your solution here

}`,
      typescript: `function isValidBST(root: TreeNode | null): boolean {
  // Write your solution here

}`,
      python: `def isValidBST(root):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(h)',
    },
    testCases: [
      {
        input: { tree: [2, 1, 3] },
        expected: true,
        description: 'Valid BST: [2,1,3]',
      },
      {
        input: { tree: [5, 1, 4, null, null, 3, 6] },
        expected: false,
        description: 'Invalid: right child 4 < root 5',
      },
      {
        input: { tree: [1] },
        expected: true,
        description: 'Single node',
      },
      {
        input: { tree: [2, 2, 2] },
        expected: false,
        description: 'Duplicate values',
      },
      {
        input: { tree: [5, 1, 6, null, null, 4, 7] },
        expected: false,
        description: 'Invalid: left child of 6 is 4 (< 5)',
      },
    ],
  },
  {
    id: 'dsa-lowest-common-ancestor',
    title: 'Lowest Common Ancestor of BST',
    type: 'dsa',
    difficulty: 'medium',
    companies: ['Meta', 'Amazon', 'Microsoft', 'Google'],
    description: 'Find the lowest common ancestor in a binary search tree',
    tags: ['tree', 'binary-search-tree', 'depth-first-search'],
    estimatedTime: 20,
    problemStatement: `Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.

According to the definition of LCA: "The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself)."`,
    examples: [
      {
        input: 'root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8',
        output: '6',
        explanation: 'The LCA of nodes 2 and 8 is 6.',
      },
      {
        input: 'root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4',
        output: '2',
        explanation: 'The LCA of nodes 2 and 4 is 2.',
      },
    ],
    constraints: [
      'The number of nodes in the tree is in the range [2, 10^5]',
      '-10^9 <= Node.val <= 10^9',
      'All Node.val are unique',
      'p != q',
      'p and q will exist in the BST',
    ],
    hints: [
      'Use the BST property: left < node < right',
      'If both nodes are smaller, go left',
      'If both nodes are larger, go right',
      'Otherwise, current node is the LCA',
    ],
    starterCode: {
      javascript: `function lowestCommonAncestor(root, p, q) {
  // Write your solution here

}`,
      typescript: `function lowestCommonAncestor(root: TreeNode | null, p: TreeNode | null, q: TreeNode | null): TreeNode | null {
  // Write your solution here

}`,
      python: `def lowestCommonAncestor(root, p, q):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(h)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { tree: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 2, q: 8 },
        expected: 6,
        description: 'LCA of 2 and 8 is 6',
      },
      {
        input: { tree: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 2, q: 4 },
        expected: 2,
        description: 'LCA of 2 and 4 is 2 (ancestor of itself)',
      },
      {
        input: { tree: [2, 1, 3], p: 1, q: 3 },
        expected: 2,
        description: 'Simple tree: LCA is root',
      },
      {
        input: { tree: [6, 2, 8, 0, 4, 7, 9], p: 0, q: 4 },
        expected: 2,
        description: 'Both nodes in left subtree',
      },
      {
        input: { tree: [6, 2, 8, 0, 4, 7, 9], p: 7, q: 9 },
        expected: 8,
        description: 'Both nodes in right subtree',
      },
    ],
  },
  {
    id: 'dsa-3sum',
    title: '3Sum',
    type: 'dsa',
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
    id: 'dsa-climbing-stairs',
    title: 'Climbing Stairs',
    type: 'dsa',
    difficulty: 'easy',
    companies: ['Amazon', 'Google', 'Meta', 'Apple'],
    description: 'Calculate number of ways to climb stairs',
    tags: ['dynamic-programming', 'math', 'memoization'],
    estimatedTime: 15,
    problemStatement: `You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
    examples: [
      {
        input: 'n = 2',
        output: '2',
        explanation: 'There are two ways to climb to the top: 1. 1 step + 1 step, 2. 2 steps',
      },
      {
        input: 'n = 3',
        output: '3',
        explanation: 'There are three ways: 1. 1+1+1, 2. 1+2, 3. 2+1',
      },
    ],
    constraints: [
      '1 <= n <= 45',
    ],
    hints: [
      'This is a Fibonacci sequence problem',
      'dp[i] = dp[i-1] + dp[i-2]',
      'You can optimize space to O(1) by only keeping track of the last two values',
    ],
    starterCode: {
      javascript: `function climbStairs(n) {
  // Write your solution here

}`,
      typescript: `function climbStairs(n: number): number {
  // Write your solution here

}`,
      python: `def climbStairs(n):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { n: 2 },
        expected: 2,
        description: '2 steps: [1+1, 2]',
      },
      {
        input: { n: 3 },
        expected: 3,
        description: '3 steps: [1+1+1, 1+2, 2+1]',
      },
      {
        input: { n: 1 },
        expected: 1,
        description: 'Single step',
      },
      {
        input: { n: 5 },
        expected: 8,
        description: '5 steps: Fibonacci(5) = 8',
      },
      {
        input: { n: 10 },
        expected: 89,
        description: '10 steps: Fibonacci(10) = 89',
      },
    ],
  },
  {
    id: 'dsa-coin-change',
    title: 'Coin Change',
    type: 'dsa',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Apple'],
    description: 'Find minimum number of coins needed to make amount',
    tags: ['dynamic-programming', 'breadth-first-search'],
    estimatedTime: 25,
    problemStatement: `You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.

You may assume that you have an infinite number of each kind of coin.`,
    examples: [
      {
        input: 'coins = [1,2,5], amount = 11',
        output: '3',
        explanation: '11 = 5 + 5 + 1',
      },
      {
        input: 'coins = [2], amount = 3',
        output: '-1',
      },
      {
        input: 'coins = [1], amount = 0',
        output: '0',
      },
    ],
    constraints: [
      '1 <= coins.length <= 12',
      '1 <= coins[i] <= 2^31 - 1',
      '0 <= amount <= 10^4',
    ],
    hints: [
      'Use dynamic programming with dp[i] = minimum coins for amount i',
      'For each amount, try all coin denominations',
      'dp[i] = min(dp[i], dp[i-coin] + 1)',
    ],
    starterCode: {
      javascript: `function coinChange(coins, amount) {
  // Write your solution here

}`,
      typescript: `function coinChange(coins: number[], amount: number): number {
  // Write your solution here

}`,
      python: `def coinChange(coins, amount):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(amount * coins.length)',
      space: 'O(amount)',
    },
    testCases: [
      {
        input: { coins: [1, 2, 5], amount: 11 },
        expected: 3,
        description: '11 = 5 + 5 + 1',
      },
      {
        input: { coins: [2], amount: 3 },
        expected: -1,
        description: 'Cannot make amount 3 with only coin 2',
      },
      {
        input: { coins: [1], amount: 0 },
        expected: 0,
        description: 'Amount 0 requires 0 coins',
      },
      {
        input: { coins: [1, 2, 5], amount: 100 },
        expected: 20,
        description: '100 = 20 coins of 5',
      },
      {
        input: { coins: [1, 3, 4, 5], amount: 7 },
        expected: 2,
        description: '7 = 3 + 4',
      },
    ],
  },
  {
    id: 'dsa-number-of-islands',
    title: 'Number of Islands',
    type: 'dsa',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    description: 'Count the number of islands in a 2D grid',
    tags: ['array', 'depth-first-search', 'breadth-first-search', 'union-find', 'matrix'],
    estimatedTime: 25,
    problemStatement: `Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
    examples: [
      {
        input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
        output: '1',
      },
      {
        input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
        output: '3',
      },
    ],
    constraints: [
      'm == grid.length',
      'n == grid[i].length',
      '1 <= m, n <= 300',
      'grid[i][j] is \'0\' or \'1\'',
    ],
    hints: [
      'Use DFS or BFS to explore each island',
      'Mark visited cells to avoid counting them twice',
      'Count how many times you initiate a DFS/BFS',
    ],
    starterCode: {
      javascript: `function numIslands(grid) {
  // Write your solution here

}`,
      typescript: `function numIslands(grid: string[][]): number {
  // Write your solution here

}`,
      python: `def numIslands(grid):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(m * n)',
      space: 'O(m * n)',
    },
    testCases: [
      {
        input: {
          grid: [
            ["1", "1", "1", "1", "0"],
            ["1", "1", "0", "1", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "0", "0", "0"]
          ]
        },
        expected: 1,
        description: 'Single large island',
      },
      {
        input: {
          grid: [
            ["1", "1", "0", "0", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "1", "0", "0"],
            ["0", "0", "0", "1", "1"]
          ]
        },
        expected: 3,
        description: 'Three separate islands',
      },
      {
        input: {
          grid: [
            ["1", "0", "1"],
            ["0", "1", "0"],
            ["1", "0", "1"]
          ]
        },
        expected: 5,
        description: 'Five single-cell islands',
      },
      {
        input: {
          grid: [
            ["0", "0", "0"],
            ["0", "0", "0"],
            ["0", "0", "0"]
          ]
        },
        expected: 0,
        description: 'No islands (all water)',
      },
      {
        input: {
          grid: [
            ["1"]
          ]
        },
        expected: 1,
        description: 'Single cell island',
      },
    ],
  },
  // ==================== Bug Fix Scenarios ====================
  {
    id: 'bugfix-off-by-one-array',
    title: 'Fix Off-By-One Error in Data Processor',
    type: 'bugfix',
    difficulty: 'easy',
    companies: ['Generic', 'Amazon', 'Microsoft'],
    description: 'Fix an off-by-one error in a data processing pipeline causing array index out of bounds',
    tags: ['arrays', 'loops', 'debugging', 'data-processing'],
    estimatedTime: 15,
    problemStatement: `A data processing system is crashing when trying to compare adjacent data points for trend analysis. The system processes sensor readings and needs to identify sudden changes between consecutive measurements. Debug the issue across the data processor and validator modules.`,
    buggyCode: {
      javascript: `// dataProcessor.js - Main file with the bug
function processAdjacentPairs(readings) {
  const changes = [];
  // BUG: Off-by-one error in loop condition
  for (let i = 0; i <= readings.length; i++) {
    const current = readings[i];
    const next = readings[i + 1];
    const change = calculateChange(current, next);
    changes.push(change);
  }
  return changes;
}`,
      typescript: `// dataProcessor.ts - Main file with the bug
function processAdjacentPairs(readings: number[]): number[] {
  const changes: number[] = [];
  // BUG: Off-by-one error in loop condition
  for (let i = 0; i <= readings.length; i++) {
    const current = readings[i];
    const next = readings[i + 1];
    const change = calculateChange(current, next);
    changes.push(change);
  }
  return changes;
}`,
      python: `# data_processor.py - Main file with the bug
def process_adjacent_pairs(readings):
    changes = []
    # BUG: Off-by-one error in loop condition
    for i in range(len(readings) + 1):
        current = readings[i]
        next_reading = readings[i + 1]
        change = calculate_change(current, next_reading)
        changes.append(change)
    return changes`,
      java: `// DataProcessor.java - Main file with the bug
import java.util.ArrayList;
import java.util.List;

public class DataProcessor {
    // BUG: Off-by-one error in loop condition
    public static List<Double> processAdjacentPairs(double[] readings) {
        List<Double> changes = new ArrayList<>();
        for (int i = 0; i <= readings.length; i++) {
            double current = readings[i];
            double next = readings[i + 1];
            double change = Calculator.calculateChange(current, next);
            changes.add(change);
        }
        return changes;
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'utils/calculator.js',
          content: `// Utility functions for change calculation
export function calculateChange(current, next) {
  if (current === undefined || next === undefined) {
    throw new Error('Invalid readings: undefined values');
  }
  return ((next - current) / current) * 100;
}

export function isSignificantChange(change, threshold = 10) {
  return Math.abs(change) > threshold;
}`,
          description: 'Utility functions that expect valid data',
        },
        {
          fileName: 'validators/dataValidator.js',
          content: `// Data validation module
export function validateReadings(readings) {
  if (!Array.isArray(readings)) {
    throw new Error('Readings must be an array');
  }
  if (readings.length < 2) {
    throw new Error('Need at least 2 readings for comparison');
  }
  if (readings.some(r => typeof r !== 'number')) {
    throw new Error('All readings must be numbers');
  }
  return true;
}`,
          description: 'Validates input data before processing',
        },
        {
          fileName: 'index.js',
          content: `// Main entry point
import { validateReadings } from './validators/dataValidator.js';
import { processAdjacentPairs } from './dataProcessor.js';
import { isSignificantChange } from './utils/calculator.js';

export function analyzeTrends(sensorData) {
  validateReadings(sensorData);
  const changes = processAdjacentPairs(sensorData);
  const significantChanges = changes.filter(c => isSignificantChange(c));
  return {
    allChanges: changes,
    significantChanges,
    trendStrength: significantChanges.length / changes.length
  };
}`,
          description: 'Main module that coordinates the processing',
        },
      ],
      python: [
        {
          fileName: 'utils/calculator.py',
          content: `# Utility functions for change calculation
def calculate_change(current, next_reading):
    """Calculate percentage change between two readings"""
    if current is None or next_reading is None:
        raise ValueError('Invalid readings: None values')
    if current == 0:
        return float('inf') if next_reading != 0 else 0
    return ((next_reading - current) / current) * 100

def is_significant_change(change, threshold=10):
    """Check if change exceeds threshold"""
    return abs(change) > threshold`,
          description: 'Utility functions that expect valid data',
        },
        {
          fileName: 'validators/data_validator.py',
          content: `# Data validation module
def validate_readings(readings):
    """Validate sensor readings before processing"""
    if not isinstance(readings, list):
        raise TypeError('Readings must be a list')
    if len(readings) < 2:
        raise ValueError('Need at least 2 readings for comparison')
    if not all(isinstance(r, (int, float)) for r in readings):
        raise TypeError('All readings must be numbers')
    return True`,
          description: 'Validates input data before processing',
        },
        {
          fileName: 'main.py',
          content: `# Main entry point
from validators.data_validator import validate_readings
from data_processor import process_adjacent_pairs
from utils.calculator import is_significant_change

def analyze_trends(sensor_data):
    """Analyze trends in sensor data"""
    validate_readings(sensor_data)
    changes = process_adjacent_pairs(sensor_data)
    significant_changes = [c for c in changes if is_significant_change(c)]
    return {
        'all_changes': changes,
        'significant_changes': significant_changes,
        'trend_strength': len(significant_changes) / len(changes) if changes else 0
    }`,
          description: 'Main module that coordinates the processing',
        },
      ],
      java: [
        {
          fileName: 'utils/Calculator.java',
          content: `// Utility functions for change calculation
package utils;

public class Calculator {
    public static double calculateChange(double current, double next) {
        if (Double.isNaN(current) || Double.isNaN(next)) {
            throw new IllegalArgumentException("Invalid readings: NaN values");
        }
        if (current == 0) {
            return next == 0 ? 0 : Double.POSITIVE_INFINITY;
        }
        return ((next - current) / current) * 100;
    }

    public static boolean isSignificantChange(double change, double threshold) {
        return Math.abs(change) > threshold;
    }

    public static boolean isSignificantChange(double change) {
        return isSignificantChange(change, 10.0);
    }
}`,
          description: 'Utility functions that expect valid data',
        },
        {
          fileName: 'validators/DataValidator.java',
          content: `// Data validation module
package validators;

public class DataValidator {
    public static boolean validateReadings(double[] readings) {
        if (readings == null) {
            throw new IllegalArgumentException("Readings must not be null");
        }
        if (readings.length < 2) {
            throw new IllegalArgumentException("Need at least 2 readings for comparison");
        }
        for (double reading : readings) {
            if (Double.isNaN(reading)) {
                throw new IllegalArgumentException("All readings must be valid numbers");
            }
        }
        return true;
    }
}`,
          description: 'Validates input data before processing',
        },
        {
          fileName: 'TrendAnalyzer.java',
          content: `// Main entry point
import validators.DataValidator;
import utils.Calculator;
import java.util.List;
import java.util.stream.Collectors;

public class TrendAnalyzer {
    public static class TrendResult {
        public List<Double> allChanges;
        public List<Double> significantChanges;
        public double trendStrength;

        public TrendResult(List<Double> allChanges, List<Double> significantChanges, double trendStrength) {
            this.allChanges = allChanges;
            this.significantChanges = significantChanges;
            this.trendStrength = trendStrength;
        }
    }

    public static TrendResult analyzeTrends(double[] sensorData) {
        DataValidator.validateReadings(sensorData);
        List<Double> changes = DataProcessor.processAdjacentPairs(sensorData);
        List<Double> significantChanges = changes.stream()
            .filter(Calculator::isSignificantChange)
            .collect(Collectors.toList());
        double trendStrength = changes.isEmpty() ? 0.0 : (double) significantChanges.size() / changes.size();
        return new TrendResult(changes, significantChanges, trendStrength);
    }
}`,
          description: 'Main module that coordinates the processing',
        },
      ],
    },
    expectedBehavior: 'Should process all adjacent pairs without index errors and return correct change calculations',
    bugDescription: 'Off-by-one error in loop condition causes array index out of bounds when accessing readings[i] and readings[i+1]',
    hints: [
      'The loop condition allows i to go beyond valid array indices',
      'Think about what happens when i equals readings.length',
      'For n elements, there are only n-1 adjacent pairs',
      'The loop should stop before readings.length, not at or after it',
    ],
    testCases: [
      {
        input: { readings: [100, 110, 105, 120] },
        expected: [10, -4.55, 14.29],
        description: 'Normal sensor readings with 3 adjacent pairs',
      },
      {
        input: { readings: [50, 50] },
        expected: [0],
        description: 'Minimal case: 2 readings, 1 pair',
      },
      {
        input: { readings: [10, 20, 30, 40, 50] },
        expected: [100, 50, 33.33, 25],
        description: 'Multiple readings showing increasing trend',
      },
    ],
  },
  {
    id: 'bugfix-null-check',
    title: 'Fix Null Reference Error in User Service',
    type: 'bugfix',
    difficulty: 'easy',
    companies: ['Generic', 'Startup', 'Amazon'],
    description: 'Add proper null/undefined checks in a user management service to prevent runtime crashes',
    tags: ['null-safety', 'error-handling', 'defensive-programming', 'api'],
    estimatedTime: 15,
    problemStatement: `A user management API is crashing with null reference errors when trying to format user data for email notifications. The service needs to handle cases where user data might be incomplete or null. Debug and fix the null safety issues across the user service modules.`,
    buggyCode: {
      javascript: `// userService.js - Main file with null reference bugs
function getUserEmailFormatted(user) {
  // BUG: No null check on user
  // BUG: No check if email exists
  return user.email.toLowerCase().trim();
}

function getUserDisplayName(user) {
  // BUG: Assumes user and name always exist
  return user.firstName + ' ' + user.lastName;
}`,
      typescript: `// userService.ts - Main file with null reference bugs
function getUserEmailFormatted(user: any): string {
  // BUG: No null check on user
  // BUG: No check if email exists
  return user.email.toLowerCase().trim();
}

function getUserDisplayName(user: any): string {
  // BUG: Assumes user and name always exist
  return user.firstName + ' ' + user.lastName;
}`,
      python: `# user_service.py - Main file with null reference bugs
def get_user_email_formatted(user):
    # BUG: No null check on user
    # BUG: No check if email exists
    return user['email'].lower().strip()

def get_user_display_name(user):
    # BUG: Assumes user and name always exist
    return f"{user['firstName']} {user['lastName']}"`,
      java: `// UserService.java - Main file with null reference bugs
public class UserService {
    // BUG: No null check on user
    // BUG: No check if email exists
    public static String getUserEmailFormatted(User user) {
        return user.getEmail().toLowerCase().trim();
    }

    // BUG: Assumes user and name always exist
    public static String getUserDisplayName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'models/User.js',
          content: `// User model definition
export class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.email = data.email || null;
    this.firstName = data.firstName || null;
    this.lastName = data.lastName || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }
}

// NOTE: Users from external APIs might have missing fields
// or might be null/undefined entirely`,
          description: 'User model that can have null/undefined fields',
        },
        {
          fileName: 'services/emailService.js',
          content: `// Email service that uses user data
import { getUserEmailFormatted, getUserDisplayName } from './userService.js';

export function sendWelcomeEmail(user) {
  // This will crash if user data is incomplete
  const email = getUserEmailFormatted(user);
  const name = getUserDisplayName(user);

  console.log(\`Sending welcome email to \${email} for \${name}\`);
  // Email sending logic...
  return { success: true, recipient: email };
}

export function sendBulkEmails(users) {
  // Bulk processing - should handle invalid users gracefully
  const results = users.map(user => {
    try {
      return sendWelcomeEmail(user);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  return results;
}`,
          description: 'Email service that depends on user service functions',
        },
        {
          fileName: 'api/userController.js',
          content: `// API controller
import { User } from '../models/User.js';
import { sendWelcomeEmail } from '../services/emailService.js';

export async function registerUser(req, res) {
  const userData = req.body;
  const user = new User(userData);

  try {
    // User data from API might be incomplete
    const emailResult = sendWelcomeEmail(user);
    res.json({ success: true, ...emailResult });
  } catch (error) {
    // Currently crashes with null reference errors
    res.status(500).json({ error: 'Failed to process user registration' });
  }
}`,
          description: 'API controller that registers users and sends emails',
        },
      ],
      python: [
        {
          fileName: 'models/user.py',
          content: `# User model definition
class User:
    def __init__(self, data=None):
        data = data or {}
        self.id = data.get('id')
        self.email = data.get('email')
        self.first_name = data.get('firstName')
        self.last_name = data.get('lastName')
        self.is_active = data.get('isActive', True)

# NOTE: Users from external APIs might have missing fields
# or might be None entirely`,
          description: 'User model that can have None fields',
        },
        {
          fileName: 'services/email_service.py',
          content: `# Email service that uses user data
from user_service import get_user_email_formatted, get_user_display_name

def send_welcome_email(user):
    """Send welcome email to user"""
    # This will crash if user data is incomplete
    email = get_user_email_formatted(user)
    name = get_user_display_name(user)

    print(f'Sending welcome email to {email} for {name}')
    # Email sending logic...
    return {'success': True, 'recipient': email}

def send_bulk_emails(users):
    """Send emails to multiple users"""
    results = []
    for user in users:
        try:
            result = send_welcome_email(user)
            results.append(result)
        except Exception as e:
            results.append({'success': False, 'error': str(e)})
    return results`,
          description: 'Email service that depends on user service functions',
        },
        {
          fileName: 'api/user_controller.py',
          content: `# API controller
from models.user import User
from services.email_service import send_welcome_email

def register_user(request_data):
    """Register a new user"""
    user_data = request_data.get('body', {})
    user = User(user_data)

    try:
        # User data from API might be incomplete
        email_result = send_welcome_email(user)
        return {'success': True, **email_result}
    except Exception as error:
        # Currently crashes with None/AttributeError
        return {'error': 'Failed to process user registration'}, 500`,
          description: 'API controller that registers users and sends emails',
        },
      ],
      java: [
        {
          fileName: 'models/User.java',
          content: `// User model definition
package models;

public class User {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private boolean isActive;

    public User() {
        this.isActive = true;
    }

    public User(String id, String email, String firstName, String lastName) {
        this.id = id;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.isActive = true;
    }

    // Getters
    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public boolean isActive() { return isActive; }

    // Setters
    public void setId(String id) { this.id = id; }
    public void setEmail(String email) { this.email = email; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public void setActive(boolean active) { this.isActive = active; }
}

// NOTE: Users from external APIs might have missing fields
// or might be null entirely`,
          description: 'User model that can have null fields',
        },
        {
          fileName: 'services/EmailService.java',
          content: `// Email service that uses user data
package services;

import models.User;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

public class EmailService {
    // This will crash if user data is incomplete
    public static Map<String, Object> sendWelcomeEmail(User user) {
        String email = UserService.getUserEmailFormatted(user);
        String name = UserService.getUserDisplayName(user);

        System.out.println("Sending welcome email to " + email + " for " + name);
        // Email sending logic...
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("recipient", email);
        return result;
    }

    // Bulk processing - should handle invalid users gracefully
    public static List<Map<String, Object>> sendBulkEmails(List<User> users) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (User user : users) {
            try {
                results.add(sendWelcomeEmail(user));
            } catch (Exception e) {
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("success", false);
                errorResult.put("error", e.getMessage());
                results.add(errorResult);
            }
        }
        return results;
    }
}`,
          description: 'Email service that depends on user service functions',
        },
        {
          fileName: 'api/UserController.java',
          content: `// API controller
package api;

import models.User;
import services.EmailService;
import java.util.Map;
import java.util.HashMap;

public class UserController {
    public static Map<String, Object> registerUser(Map<String, Object> requestData) {
        Map<String, Object> userData = (Map<String, Object>) requestData.get("body");
        User user = new User();
        if (userData != null) {
            user.setId((String) userData.get("id"));
            user.setEmail((String) userData.get("email"));
            user.setFirstName((String) userData.get("firstName"));
            user.setLastName((String) userData.get("lastName"));
        }

        try {
            // User data from API might be incomplete
            Map<String, Object> emailResult = EmailService.sendWelcomeEmail(user);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.putAll(emailResult);
            return response;
        } catch (Exception error) {
            // Currently crashes with NullPointerException
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to process user registration");
            return errorResponse;
        }
    }
}`,
          description: 'API controller that registers users and sends emails',
        },
      ],
    },
    expectedBehavior: 'Should safely handle null/undefined user objects and missing fields without crashing, returning appropriate defaults or error messages',
    bugDescription: 'Missing null/undefined checks cause crashes when user object is null or when required fields are missing',
    hints: [
      'Check if user exists before accessing any properties',
      'Check if each required field exists before using it',
      'Consider using optional chaining (?.) in JavaScript/TypeScript',
      'Provide sensible default values when data is missing',
      'Think about what the function should return when data is invalid',
    ],
    testCases: [
      {
        input: { user: { email: 'USER@EXAMPLE.COM', firstName: 'John', lastName: 'Doe' } },
        expected: { email: 'user@example.com', name: 'John Doe' },
        description: 'Valid complete user object',
      },
      {
        input: { user: null },
        expected: { email: null, name: null },
        description: 'Null user object - should not crash',
      },
      {
        input: { user: { email: 'test@test.com' } },
        expected: { email: 'test@test.com', name: null },
        description: 'User with email but no name - should not crash',
      },
      {
        input: { user: { firstName: 'Jane' } },
        expected: { email: null, name: 'Jane' },
        description: 'User with name but no email - should not crash',
      },
    ],
  },
  {
    id: 'bugfix-async-await',
    title: 'Fix Async/Await Promise Handling',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Meta', 'Amazon'],
    description: 'Fix improper async/await usage causing race conditions',
    tags: ['async', 'promises', 'concurrency'],
    estimatedTime: 15,
    problemStatement: `This function should fetch user data and then fetch their posts, but the posts are undefined. Fix the async issue.`,
    buggyCode: {
      javascript: `// userService.js - Main file with async/await bug
async function getUserWithPosts(userId) {
  const user = fetchUser(userId);  // BUG: Missing await
  const posts = await fetchUserPosts(user.id);
  return { user, posts };
}`,
      typescript: `// userService.ts - Main file with async/await bug
async function getUserWithPosts(userId: string) {
  const user = fetchUser(userId);  // BUG: Missing await
  const posts = await fetchUserPosts(user.id);
  return { user, posts };
}`,
      python: `# user_service.py - Main file with async/await bug
async def get_user_with_posts(user_id):
    user = fetch_user(user_id)  # BUG: Missing await
    posts = await fetch_user_posts(user['id'])
    return {"user": user, "posts": posts}`,
      java: `// UserService.java - Main file with async/await bug
import java.util.concurrent.CompletableFuture;
import java.util.Map;
import java.util.List;

public class UserService {
    public static CompletableFuture<Map<String, Object>> getUserWithPosts(String userId) {
        CompletableFuture<User> user = fetchUser(userId);  // BUG: Not waiting for completion
        CompletableFuture<List<Post>> posts = user.get().getId()  // Will throw exception
            .thenCompose(id -> fetchUserPosts(id));

        return posts.thenApply(p -> Map.of("user", user, "posts", p));
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'api/userAPI.js',
          content: `// User API functions
export async function fetchUser(userId) {
  const response = await fetch(\`https://api.example.com/users/\${userId}\`);
  if (!response.ok) {
    throw new Error(\`Failed to fetch user: \${response.statusText}\`);
  }
  return response.json();
}

export async function fetchUserPosts(userId) {
  const response = await fetch(\`https://api.example.com/users/\${userId}/posts\`);
  if (!response.ok) {
    throw new Error(\`Failed to fetch posts: \${response.statusText}\`);
  }
  return response.json();
}

export async function fetchUserComments(userId) {
  const response = await fetch(\`https://api.example.com/users/\${userId}/comments\`);
  return response.json();
}`,
          description: 'API functions for fetching user data - all async',
        },
        {
          fileName: 'components/UserDashboard.js',
          content: `// User Dashboard component that uses getUserWithPosts
import { getUserWithPosts } from './userService.js';

export async function renderUserDashboard(userId) {
  const container = document.getElementById('dashboard');

  try {
    container.innerHTML = '<div class="loading">Loading...</div>';

    const data = await getUserWithPosts(userId);

    // This will fail if user is a Promise object
    const userHTML = \`
      <div class="user-info">
        <h2>\${data.user.name}</h2>
        <p>\${data.user.email}</p>
      </div>
    \`;

    const postsHTML = \`
      <div class="posts">
        <h3>Posts (\${data.posts.length})</h3>
        \${data.posts.map(post => \`
          <div class="post">
            <h4>\${post.title}</h4>
            <p>\${post.body}</p>
          </div>
        \`).join('')}
      </div>
    \`;

    container.innerHTML = userHTML + postsHTML;
  } catch (error) {
    container.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
    console.error('Dashboard error:', error);
  }
}`,
          description: 'Dashboard component that depends on getUserWithPosts',
        },
        {
          fileName: 'tests/userService.test.js',
          content: `// Test file for userService
import { getUserWithPosts } from './userService.js';

async function testGetUserWithPosts() {
  console.log('Testing getUserWithPosts...');

  try {
    const result = await getUserWithPosts('user123');

    // Check if user is actually a user object, not a Promise
    if (result.user instanceof Promise) {
      console.error('❌ FAIL: user is a Promise, not an object!');
      console.error('   This means the fetchUser call was not awaited');
      return false;
    }

    // Check if user has expected properties
    if (!result.user.id || !result.user.name) {
      console.error('❌ FAIL: user object missing expected properties');
      return false;
    }

    // Check posts
    if (!Array.isArray(result.posts)) {
      console.error('❌ FAIL: posts is not an array');
      return false;
    }

    console.log('✅ PASS: getUserWithPosts works correctly');
    return true;
  } catch (error) {
    console.error('❌ FAIL: Error occurred:', error.message);
    return false;
  }
}

// Run test
testGetUserWithPosts();`,
          description: 'Test file showing how the bug manifests',
        },
      ],
      typescript: [
        {
          fileName: 'api/userAPI.ts',
          content: `// User API functions
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
}

export async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(\`https://api.example.com/users/\${userId}\`);
  if (!response.ok) {
    throw new Error(\`Failed to fetch user: \${response.statusText}\`);
  }
  return response.json();
}

export async function fetchUserPosts(userId: string): Promise<Post[]> {
  const response = await fetch(\`https://api.example.com/users/\${userId}/posts\`);
  if (!response.ok) {
    throw new Error(\`Failed to fetch posts: \${response.statusText}\`);
  }
  return response.json();
}`,
          description: 'API functions with TypeScript interfaces',
        },
        {
          fileName: 'components/UserDashboard.tsx',
          content: `// User Dashboard component
import { getUserWithPosts } from './userService';

interface DashboardProps {
  userId: string;
}

export async function renderUserDashboard({ userId }: DashboardProps) {
  const container = document.getElementById('dashboard');
  if (!container) return;

  try {
    container.innerHTML = '<div class="loading">Loading...</div>';

    const data = await getUserWithPosts(userId);

    // TypeScript won't catch the Promise bug at compile time
    // because user is typed as User, but at runtime it's Promise<User>
    const userHTML = \`
      <div class="user-info">
        <h2>\${data.user.name}</h2>
        <p>\${data.user.email}</p>
      </div>
    \`;

    container.innerHTML = userHTML;
  } catch (error) {
    console.error('Dashboard error:', error);
  }
}`,
          description: 'TypeScript component using the buggy service',
        },
      ],
      python: [
        {
          fileName: 'api/user_api.py',
          content: `# User API functions
import aiohttp
import asyncio

async def fetch_user(user_id: str) -> dict:
    """Fetch user data from API"""
    async with aiohttp.ClientSession() as session:
        async with session.get(f'https://api.example.com/users/{user_id}') as response:
            if response.status != 200:
                raise Exception(f'Failed to fetch user: {response.status}')
            return await response.json()

async def fetch_user_posts(user_id: str) -> list:
    """Fetch user's posts from API"""
    async with aiohttp.ClientSession() as session:
        async with session.get(f'https://api.example.com/users/{user_id}/posts') as response:
            if response.status != 200:
                raise Exception(f'Failed to fetch posts: {response.status}')
            return await response.json()`,
          description: 'Async API functions for fetching user data',
        },
        {
          fileName: 'components/user_dashboard.py',
          content: `# User Dashboard component
from user_service import get_user_with_posts

async def render_user_dashboard(user_id: str):
    """Render user dashboard with posts"""
    try:
        data = await get_user_with_posts(user_id)

        # This will fail if user is a coroutine object instead of dict
        print(f"User: {data['user']['name']}")
        print(f"Email: {data['user']['email']}")
        print(f"Posts: {len(data['posts'])}")

        for post in data['posts']:
            print(f"  - {post['title']}")

    except TypeError as e:
        print(f"TypeError: {e}")
        print("This likely means user is a coroutine, not a dict")
    except Exception as e:
        print(f"Error: {e}")`,
          description: 'Dashboard that uses the buggy service',
        },
      ],
      java: [
        {
          fileName: 'api/UserAPI.java',
          content: `// User API functions
package api;

import java.util.concurrent.CompletableFuture;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import com.google.gson.Gson;
import java.util.List;

public class UserAPI {
    private static final HttpClient client = HttpClient.newHttpClient();
    private static final Gson gson = new Gson();

    public static CompletableFuture<User> fetchUser(String userId) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId))
            .build();

        return client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(response -> {
                if (response.statusCode() != 200) {
                    throw new RuntimeException("Failed to fetch user: " + response.statusCode());
                }
                return gson.fromJson(response.body(), User.class);
            });
    }

    public static CompletableFuture<List<Post>> fetchUserPosts(String userId) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId + "/posts"))
            .build();

        return client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(response -> {
                if (response.statusCode() != 200) {
                    throw new RuntimeException("Failed to fetch posts: " + response.statusCode());
                }
                return gson.fromJson(response.body(), new TypeToken<List<Post>>(){}.getType());
            });
    }
}

class User {
    String id;
    String name;
    String email;
    String avatar;

    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}

class Post {
    String id;
    String userId;
    String title;
    String body;
    String createdAt;
}`,
          description: 'API functions returning CompletableFuture - all async',
        },
        {
          fileName: 'components/UserDashboard.java',
          content: `// User Dashboard component that uses getUserWithPosts
package components;

import api.UserAPI;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class UserDashboard {
    public static void renderUserDashboard(String userId) {
        System.out.println("Loading...");

        try {
            CompletableFuture<Map<String, Object>> dataFuture = UserService.getUserWithPosts(userId);

            dataFuture.thenAccept(data -> {
                // This will fail if user is still a CompletableFuture
                User user = (User) data.get("user");
                List<Post> posts = (List<Post>) data.get("posts");

                System.out.println("User: " + user.getName());
                System.out.println("Email: " + user.getEmail());
                System.out.println("Posts: " + posts.size());

                for (Post post : posts) {
                    System.out.println("  - " + post.title);
                }
            }).exceptionally(error -> {
                System.err.println("Dashboard error: " + error.getMessage());
                error.printStackTrace();
                return null;
            }).join();
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}`,
          description: 'Dashboard component that depends on getUserWithPosts',
        },
        {
          fileName: 'tests/UserServiceTest.java',
          content: `// Test file for UserService
package tests;

import java.util.concurrent.CompletableFuture;
import java.util.Map;

public class UserServiceTest {
    public static void testGetUserWithPosts() {
        System.out.println("Testing getUserWithPosts...");

        try {
            CompletableFuture<Map<String, Object>> resultFuture =
                UserService.getUserWithPosts("user123");

            Map<String, Object> result = resultFuture.join();

            // Check if user is actually a User object, not a CompletableFuture
            Object userObj = result.get("user");
            if (userObj instanceof CompletableFuture) {
                System.err.println("❌ FAIL: user is a CompletableFuture, not a User object!");
                System.err.println("   This means the fetchUser call was not properly awaited");
                return;
            }

            User user = (User) userObj;
            // Check if user has expected properties
            if (user.getId() == null || user.getName() == null) {
                System.err.println("❌ FAIL: user object missing expected properties");
                return;
            }

            // Check posts
            Object postsObj = result.get("posts");
            if (!(postsObj instanceof List)) {
                System.err.println("❌ FAIL: posts is not a List");
                return;
            }

            System.out.println("✅ PASS: getUserWithPosts works correctly");
        } catch (Exception error) {
            System.err.println("❌ FAIL: Error occurred: " + error.getMessage());
            error.printStackTrace();
        }
    }

    public static void main(String[] args) {
        testGetUserWithPosts();
    }
}`,
          description: 'Test file showing how the bug manifests',
        },
      ],
    },
    expectedBehavior: 'Should properly await both API calls and return complete data',
    bugDescription: 'Missing await on first async call causes user to be a Promise',
    hints: [
      'Check if all async functions are being awaited',
      'Remember that async functions return Promises',
      'The user variable might not be what you expect',
    ],
    testCases: [
      {
        input: { userId: 'user123' },
        expected: { user: { id: 'user123', name: 'John Doe' }, posts: [] },
        description: 'Should return user object and posts array',
      },
    ],
  },
  {
    id: 'bugfix-closure-loop',
    title: 'Fix Closure in Loop Bug',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Google', 'Meta'],
    description: 'Fix closure bug in loop causing incorrect values',
    tags: ['closures', 'scope', 'loops'],
    estimatedTime: 15,
    problemStatement: `This code should create buttons that log 0, 1, 2 when clicked, but they all log 3. Fix the closure issue.`,
    buggyCode: {
      javascript: `// buttonFactory.js - Creates event handlers with closure bug
function createButtons() {
  const buttons = [];
  // BUG: Using 'var' creates function-scoped variable
  for (var i = 0; i < 3; i++) {
    buttons.push(function() {
      console.log(i);  // Captures reference to i, not value
    });
  }
  return buttons;
}`,
      typescript: `// buttonFactory.ts - Creates event handlers with closure bug
function createButtons(): Function[] {
  const buttons: Function[] = [];
  // BUG: Using 'var' creates function-scoped variable
  for (var i = 0; i < 3; i++) {
    buttons.push(function() {
      console.log(i);  // Captures reference to i, not value
    });
  }
  return buttons;
}`,
      python: `# button_factory.py - Creates event handlers with closure bug
def create_buttons():
    buttons = []
    # BUG: Lambda captures variable i by reference
    for i in range(3):
        buttons.append(lambda: print(i))
    return buttons`,
      java: `// ButtonFactory.java - Creates event handlers with closure bug
import java.util.ArrayList;
import java.util.List;

public class ButtonFactory {
    public static List<Runnable> createButtons() {
        List<Runnable> buttons = new ArrayList<>();
        // BUG: Using shared mutable container instead of effectively final variable
        int[] sharedCounter = new int[1];  // Mutable array shared by all lambdas
        for (int i = 0; i < 3; i++) {
            sharedCounter[0] = i;  // Update shared counter
            // BUG: All lambdas capture reference to same array
            buttons.add(() -> System.out.println(sharedCounter[0]));
        }
        // After loop, sharedCounter[0] is 2, so all lambdas print 2
        return buttons;
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'ui/ButtonManager.js',
          content: `// ButtonManager - Manages dynamic button creation
import { createButtons } from './buttonFactory.js';

export class ButtonManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.handlers = [];
  }

  renderButtons() {
    this.handlers = createButtons();

    this.container.innerHTML = '';

    this.handlers.forEach((handler, index) => {
      const button = document.createElement('button');
      button.textContent = \`Button \${index}\`;
      button.className = 'btn';
      button.addEventListener('click', handler);
      this.container.appendChild(button);
    });

    console.log('Expected: Buttons should log 0, 1, 2 when clicked');
    console.log('Actual: All buttons log 3 due to closure bug');
  }

  testHandlers() {
    console.log('Testing button handlers:');
    this.handlers.forEach((handler, index) => {
      console.log(\`Handler \${index} logs:\`);
      handler();
    });
  }
}`,
          description: 'UI manager that uses createButtons function',
        },
        {
          fileName: 'utils/eventHandlerFactory.js',
          content: `// Utility functions for creating event handlers
// These show the CORRECT patterns to avoid closure bugs

// Pattern 1: Using let (block scope)
export function createHandlersWithLet() {
  const handlers = [];
  for (let i = 0; i < 3; i++) {  // 'let' creates block-scoped variable
    handlers.push(function() {
      console.log(i);
    });
  }
  return handlers;
}

// Pattern 2: Using IIFE (Immediately Invoked Function Expression)
export function createHandlersWithIIFE() {
  const handlers = [];
  for (var i = 0; i < 3; i++) {
    handlers.push((function(index) {
      return function() {
        console.log(index);
      };
    })(i));
  }
  return handlers;
}

// Pattern 3: Using forEach
export function createHandlersWithForEach() {
  return [0, 1, 2].map(i => {
    return function() {
      console.log(i);
    };
  });
}

// Pattern 4: Using bind
export function createHandlersWithBind() {
  const handlers = [];
  for (var i = 0; i < 3; i++) {
    handlers.push(console.log.bind(console, i));
  }
  return handlers;
}`,
          description: 'Reference implementations showing correct patterns',
        },
        {
          fileName: 'tests/closureTest.js',
          content: `// Test file to demonstrate closure bug
import { createButtons } from './buttonFactory.js';
import { createHandlersWithLet } from './utils/eventHandlerFactory.js';

function testClosureBug() {
  console.log('=== Testing Closure Bug ===\\n');

  console.log('Buggy version (using var):');
  const buggyHandlers = createButtons();
  buggyHandlers.forEach((handler, index) => {
    console.log(\`  Handler \${index} logs:\`, end='');
    handler();  // All will log 3
  });

  console.log('\\nExpected behavior:');
  console.log('  Handler 0 should log: 0');
  console.log('  Handler 1 should log: 1');
  console.log('  Handler 2 should log: 2');

  console.log('\\nFixed version (using let):');
  const fixedHandlers = createHandlersWithLet();
  fixedHandlers.forEach((handler, index) => {
    console.log(\`  Handler \${index} logs:\`, end='');
    handler();  // Will correctly log 0, 1, 2
  });
}

testClosureBug();`,
          description: 'Test showing the bug and expected behavior',
        },
      ],
      typescript: [
        {
          fileName: 'ui/ButtonManager.ts',
          content: `// ButtonManager - Manages dynamic button creation
import { createButtons } from './buttonFactory';

type EventHandler = () => void;

export class ButtonManager {
  private container: HTMLElement | null;
  private handlers: EventHandler[] = [];

  constructor(containerId: string) {
    this.container = document.getElementById(containerId);
  }

  renderButtons(): void {
    if (!this.container) return;

    this.handlers = createButtons();
    this.container.innerHTML = '';

    this.handlers.forEach((handler, index) => {
      const button = document.createElement('button');
      button.textContent = \`Button \${index}\`;
      button.className = 'btn';
      button.addEventListener('click', handler);
      this.container!.appendChild(button);
    });
  }

  testHandlers(): void {
    console.log('Testing button handlers:');
    this.handlers.forEach((handler, index) => {
      console.log(\`Handler \${index}:\`);
      handler();
    });
  }
}`,
          description: 'TypeScript button manager using the buggy factory',
        },
      ],
      python: [
        {
          fileName: 'ui/button_manager.py',
          content: `# ButtonManager - Manages dynamic button creation
from button_factory import create_buttons

class ButtonManager:
    def __init__(self):
        self.handlers = []

    def create_buttons(self):
        """Create button handlers"""
        self.handlers = create_buttons()
        print('Expected: Buttons should print 0, 1, 2 when called')
        print('Actual: All buttons print 2 due to closure bug')

    def test_handlers(self):
        """Test all handlers"""
        print('Testing button handlers:')
        for index, handler in enumerate(self.handlers):
            print(f'Handler {index} prints:', end=' ')
            handler()`,
          description: 'UI manager that uses create_buttons function',
        },
        {
          fileName: 'utils/event_handler_factory.py',
          content: `# Utility functions showing correct patterns

# Pattern 1: Using default arguments (CORRECT)
def create_handlers_with_default():
    """Create handlers using default argument to capture value"""
    handlers = []
    for i in range(3):
        handlers.append(lambda index=i: print(index))
    return handlers

# Pattern 2: Using functools.partial (CORRECT)
from functools import partial

def create_handlers_with_partial():
    """Create handlers using partial application"""
    handlers = []
    for i in range(3):
        handlers.append(partial(print, i))
    return handlers

# Pattern 3: Using list comprehension (CORRECT)
def create_handlers_with_comprehension():
    """Create handlers using list comprehension"""
    return [lambda index=i: print(index) for i in range(3)]`,
          description: 'Reference implementations showing correct patterns',
        },
        {
          fileName: 'tests/closure_test.py',
          content: `# Test file to demonstrate closure bug
from button_factory import create_buttons
from utils.event_handler_factory import create_handlers_with_default

def test_closure_bug():
    print('=== Testing Closure Bug ===\\n')

    print('Buggy version (lambda capturing variable):')
    buggy_handlers = create_buttons()
    for index, handler in enumerate(buggy_handlers):
        print(f'  Handler {index} prints:', end=' ')
        handler()  # All will print 2

    print('\\nExpected behavior:')
    print('  Handler 0 should print: 0')
    print('  Handler 1 should print: 1')
    print('  Handler 2 should print: 2')

    print('\\nFixed version (using default arguments):')
    fixed_handlers = create_handlers_with_default()
    for index, handler in enumerate(fixed_handlers):
        print(f'  Handler {index} prints:', end=' ')
        handler()  # Will correctly print 0, 1, 2

if __name__ == '__main__':
    test_closure_bug()`,
          description: 'Test showing the bug and expected behavior',
        },
      ],
      java: [
        {
          fileName: 'ui/ButtonManager.java',
          content: `// ButtonManager - Manages dynamic button creation
package ui;

import java.util.List;

public class ButtonManager {
    private List<Runnable> handlers;

    public void createButtons() {
        this.handlers = ButtonFactory.createButtons();
        System.out.println("Expected: Buttons should print 0, 1, 2 when called");
        System.out.println("Actual: All buttons print 2 due to closure bug");
    }

    public void testHandlers() {
        System.out.println("Testing button handlers:");
        for (int index = 0; index < handlers.size(); index++) {
            System.out.print("Handler " + index + " prints: ");
            handlers.get(index).run();
        }
    }

    public List<Runnable> getHandlers() {
        return handlers;
    }
}`,
          description: 'UI manager that uses createButtons function',
        },
        {
          fileName: 'utils/EventHandlerFactory.java',
          content: `// Utility functions showing correct patterns
package utils;

import java.util.ArrayList;
import java.util.List;

public class EventHandlerFactory {
    // Pattern 1: Using effectively final variable (CORRECT)
    public static List<Runnable> createHandlersWithFinal() {
        List<Runnable> handlers = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            final int index = i;  // Effectively final - each iteration gets its own copy
            handlers.add(() -> System.out.println(index));
        }
        return handlers;
    }

    // Pattern 2: Using method to capture value (CORRECT)
    public static List<Runnable> createHandlersWithMethod() {
        List<Runnable> handlers = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            handlers.add(createHandler(i));
        }
        return handlers;
    }

    private static Runnable createHandler(int value) {
        return () -> System.out.println(value);
    }

    // Pattern 3: Using separate array for each lambda (CORRECT)
    public static List<Runnable> createHandlersWithSeparateArrays() {
        List<Runnable> handlers = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            int[] counter = new int[]{i};  // Each lambda gets its own array
            handlers.add(() -> System.out.println(counter[0]));
        }
        return handlers;
    }
}`,
          description: 'Reference implementations showing correct patterns',
        },
        {
          fileName: 'tests/ClosureTest.java',
          content: `// Test file to demonstrate closure bug
package tests;

import java.util.List;
import utils.EventHandlerFactory;

public class ClosureTest {
    public static void testClosureBug() {
        System.out.println("=== Testing Closure Bug ===\\n");

        System.out.println("Buggy version (shared mutable array):");
        List<Runnable> buggyHandlers = ButtonFactory.createButtons();
        for (int index = 0; index < buggyHandlers.size(); index++) {
            System.out.print("  Handler " + index + " prints: ");
            buggyHandlers.get(index).run();  // All will print 2
        }

        System.out.println("\\nExpected behavior:");
        System.out.println("  Handler 0 should print: 0");
        System.out.println("  Handler 1 should print: 1");
        System.out.println("  Handler 2 should print: 2");

        System.out.println("\\nFixed version (using effectively final):");
        List<Runnable> fixedHandlers = EventHandlerFactory.createHandlersWithFinal();
        for (int index = 0; index < fixedHandlers.size(); index++) {
            System.out.print("  Handler " + index + " prints: ");
            fixedHandlers.get(index).run();  // Will correctly print 0, 1, 2
        }
    }

    public static void main(String[] args) {
        testClosureBug();
    }
}`,
          description: 'Test showing the bug and expected behavior',
        },
      ],
    },
    expectedBehavior: 'Each button should log its correct index (0, 1, 2)',
    bugDescription: 'Closure captures the variable i, not its value at each iteration',
    hints: [
      'The issue is with variable scope in the loop',
      'Consider using let instead of var in JavaScript',
      'You could also use an IIFE or pass i as a parameter',
      'In Python, use default arguments in lambda: lambda i=i: print(i)',
    ],
    testCases: [
      {
        input: { action: 'Call each returned function' },
        expected: [0, 1, 2],
        description: 'Should log 0, 1, 2 respectively',
      },
    ],
  },
  {
    id: 'bugfix-memory-leak',
    title: 'Fix Memory Leak in Event Listeners',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Meta', 'Google'],
    description: 'Fix memory leak caused by unremoved event listeners',
    tags: ['memory-leak', 'event-listeners', 'cleanup'],
    estimatedTime: 15,
    problemStatement: `This React component adds event listeners but never removes them, causing a memory leak. Fix it.`,
    buggyCode: {
      javascript: `// useWindowSize.js - Hook with memory leak
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth });
    }
    // BUG: Event listener added but never removed
    window.addEventListener('resize', handleResize);
    // Missing cleanup function
  }, []);

  return size;
}`,
      typescript: `// useWindowSize.ts - Hook with memory leak
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth });
    }
    // BUG: Event listener added but never removed
    window.addEventListener('resize', handleResize);
    // Missing cleanup function
  }, []);

  return size;
}`,
      java: `// WindowSizeTracker.java - Class with memory leak
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import javax.swing.JFrame;

public class WindowSizeTracker {
    private int width;
    private JFrame frame;

    public WindowSizeTracker(JFrame frame) {
        this.frame = frame;
        this.width = frame.getWidth();
        attachListener();
    }

    private void attachListener() {
        ComponentAdapter resizeListener = new ComponentAdapter() {
            @Override
            public void componentResized(ComponentEvent e) {
                width = frame.getWidth();
                System.out.println("Window resized: " + width);
            }
        };
        // BUG: Listener added but no cleanup/removal method provided
        frame.addComponentListener(resizeListener);
        // Missing cleanup/dispose method
    }

    public int getWidth() {
        return width;
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'components/ResponsiveLayout.jsx',
          content: `// ResponsiveLayout - Component that uses the buggy hook
import React from 'react';
import { useWindowSize } from '../hooks/useWindowSize';

export function ResponsiveLayout() {
  const { width } = useWindowSize();

  return (
    <div className="layout">
      <div className="header">
        <h1>Responsive App</h1>
        <span className="window-size">Window: {width}px</span>
      </div>

      <div className="content">
        {width < 768 ? (
          <MobileView />
        ) : width < 1024 ? (
          <TabletView />
        ) : (
          <DesktopView />
        )}
      </div>
    </div>
  );
}

function MobileView() {
  return <div>Mobile View</div>;
}

function TabletView() {
  return <div>Tablet View</div>;
}

function DesktopView() {
  return <div>Desktop View</div>;
}`,
          description: 'Component using the buggy useWindowSize hook',
        },
        {
          fileName: 'components/ConditionalWidget.jsx',
          content: `// ConditionalWidget - Mounts/unmounts frequently
import React, { useState } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';

export function ConditionalWidget() {
  const [showWidget, setShowWidget] = useState(true);

  return (
    <div>
      <button onClick={() => setShowWidget(!showWidget)}>
        Toggle Widget
      </button>

      {/* This component mounts and unmounts frequently */}
      {/* Each mount adds a new listener without removing the old one */}
      {showWidget && <WindowSizeDisplay />}
    </div>
  );
}

function WindowSizeDisplay() {
  const { width } = useWindowSize();

  return (
    <div className="widget">
      Current width: {width}px
    </div>
  );
}`,
          description: 'Component that mounts/unmounts, demonstrating the leak',
        },
        {
          fileName: 'utils/memoryTest.js',
          content: `// Memory leak testing utility
export function testForMemoryLeak() {
  let listenerCount = 0;

  // Override addEventListener to count listeners
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  window.addEventListener = function(...args) {
    listenerCount++;
    console.log(\`Listener added. Total: \${listenerCount}\`);
    return originalAddEventListener.apply(this, args);
  };

  window.removeEventListener = function(...args) {
    listenerCount--;
    console.log(\`Listener removed. Total: \${listenerCount}\`);
    return originalRemoveEventListener.apply(this, args);
  };

  return {
    getListenerCount: () => listenerCount,
    reset: () => {
      window.addEventListener = originalAddEventListener;
      window.removeEventListener = originalRemoveEventListener;
    }
  };
}

// Test scenario
export function runMemoryLeakTest(ComponentToTest, iterations = 10) {
  const test = testForMemoryLeak();

  console.log('Testing for memory leaks...');
  console.log(\`Mounting and unmounting component \${iterations} times\`);

  for (let i = 0; i < iterations; i++) {
    // Simulate mount
    const component = ComponentToTest();
    // Simulate unmount
    component?.cleanup?.();
  }

  const finalCount = test.getListenerCount();
  test.reset();

  if (finalCount > 0) {
    console.error(\`❌ MEMORY LEAK DETECTED: \${finalCount} listeners not removed\`);
  } else {
    console.log('✅ No memory leak detected');
  }

  return finalCount === 0;
}`,
          description: 'Utility to detect memory leaks in components',
        },
        {
          fileName: 'hooks/useWindowSize.fixed.js',
          content: `// Fixed version with proper cleanup
import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    window.addEventListener('resize', handleResize);

    // FIXED: Return cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty dependency array - only run once

  return size;
}`,
          description: 'Fixed version showing proper cleanup',
        },
      ],
      typescript: [
        {
          fileName: 'components/ResponsiveLayout.tsx',
          content: `// ResponsiveLayout - Component using the buggy hook
import React from 'react';
import { useWindowSize } from '../hooks/useWindowSize';

interface Size {
  width: number;
  height?: number;
}

export function ResponsiveLayout(): JSX.Element {
  const { width }: Size = useWindowSize();

  const getViewType = (): string => {
    if (width < 768) return 'Mobile';
    if (width < 1024) return 'Tablet';
    return 'Desktop';
  };

  return (
    <div className="layout">
      <div className="header">
        <h1>Responsive App</h1>
        <span className="window-size">
          {width}px - {getViewType()} View
        </span>
      </div>
    </div>
  );
}`,
          description: 'TypeScript component using the hook',
        },
        {
          fileName: 'hooks/useWindowSize.fixed.ts',
          content: `// Fixed version with proper cleanup and TypeScript
import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    function handleResize(): void {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return (): void => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return size;
}`,
          description: 'Fixed TypeScript version with proper types',
        },
      ],
      java: [
        {
          fileName: 'components/ResponsivePanel.java',
          content: `// ResponsivePanel - Component that uses the buggy tracker
package components;

import javax.swing.*;
import java.awt.*;

public class ResponsivePanel extends JPanel {
    private WindowSizeTracker sizeTracker;
    private JLabel sizeLabel;
    private JFrame parentFrame;

    public ResponsivePanel(JFrame frame) {
        this.parentFrame = frame;
        this.sizeTracker = new WindowSizeTracker(frame);

        setLayout(new BorderLayout());
        sizeLabel = new JLabel("Window: " + sizeTracker.getWidth() + "px");
        add(sizeLabel, BorderLayout.NORTH);

        // Component that might be added/removed frequently
        // Each time it's recreated, a new listener is added without removing the old one
    }

    public void updateDisplay() {
        sizeLabel.setText("Window: " + sizeTracker.getWidth() + "px");
    }

    // BUG: No cleanup method to remove listeners when panel is disposed
    // This causes memory leak when panel is removed and recreated
}`,
          description: 'Component using the buggy WindowSizeTracker',
        },
        {
          fileName: 'components/ToggleableWidget.java',
          content: `// ToggleableWidget - Component that gets added/removed frequently
package components;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

public class ToggleableWidget extends JFrame {
    private JButton toggleButton;
    private ResponsivePanel panel;
    private boolean showingPanel = false;

    public ToggleableWidget() {
        setTitle("Memory Leak Demo");
        setSize(600, 400);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        toggleButton = new JButton("Toggle Widget");
        toggleButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                togglePanel();
            }
        });

        add(toggleButton, BorderLayout.SOUTH);
    }

    private void togglePanel() {
        if (showingPanel && panel != null) {
            // BUG: Removing panel but its listeners remain attached
            remove(panel);
            panel = null;
            showingPanel = false;
        } else {
            // Each time we create a new panel, it adds a new listener
            // Previous listeners are never removed, causing memory leak
            panel = new ResponsivePanel(this);
            add(panel, BorderLayout.CENTER);
            showingPanel = true;
        }
        revalidate();
        repaint();
        System.out.println("Panel toggled. Memory leak growing if listeners not cleaned up.");
    }
}`,
          description: 'Widget that toggles panel, demonstrating the leak',
        },
        {
          fileName: 'utils/MemoryLeakDetector.java',
          content: `// Memory leak detection utility
package utils;

import javax.swing.*;
import java.awt.event.ComponentListener;
import java.lang.reflect.Field;

public class MemoryLeakDetector {
    public static int countComponentListeners(JFrame frame) {
        ComponentListener[] listeners = frame.getComponentListeners();
        return listeners.length;
    }

    public static void testForMemoryLeak(JFrame frame, int iterations) {
        System.out.println("Testing for memory leaks...");
        System.out.println("Creating and destroying components " + iterations + " times");

        int initialListeners = countComponentListeners(frame);
        System.out.println("Initial listener count: " + initialListeners);

        // Simulate creating and destroying components multiple times
        for (int i = 0; i < iterations; i++) {
            ResponsivePanel panel = new ResponsivePanel(frame);
            // Simulate component being removed
            panel = null;
        }

        // Force garbage collection
        System.gc();
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        int finalListeners = countComponentListeners(frame);
        System.out.println("Final listener count: " + finalListeners);

        int leakedListeners = finalListeners - initialListeners;
        if (leakedListeners > 0) {
            System.err.println("❌ MEMORY LEAK DETECTED: " + leakedListeners + " listeners not removed");
        } else {
            System.out.println("✅ No memory leak detected");
        }
    }
}`,
          description: 'Utility to detect memory leaks',
        },
        {
          fileName: 'WindowSizeTracker.fixed.java',
          content: `// Fixed version with proper cleanup
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import javax.swing.JFrame;

public class WindowSizeTrackerFixed {
    private int width;
    private JFrame frame;
    private ComponentAdapter resizeListener;

    public WindowSizeTrackerFixed(JFrame frame) {
        this.frame = frame;
        this.width = frame.getWidth();
        attachListener();
    }

    private void attachListener() {
        resizeListener = new ComponentAdapter() {
            @Override
            public void componentResized(ComponentEvent e) {
                width = frame.getWidth();
                System.out.println("Window resized: " + width);
            }
        };
        frame.addComponentListener(resizeListener);
    }

    public int getWidth() {
        return width;
    }

    // FIXED: Added cleanup method to remove listener
    public void dispose() {
        if (frame != null && resizeListener != null) {
            frame.removeComponentListener(resizeListener);
            resizeListener = null;
        }
    }

    // FIXED: Cleanup in finalize as backup (though dispose() should be called explicitly)
    @Override
    protected void finalize() throws Throwable {
        try {
            dispose();
        } finally {
            super.finalize();
        }
    }
}`,
          description: 'Fixed version with proper cleanup',
        },
      ],
    },
    expectedBehavior: 'Should add AND remove event listener to prevent memory leaks',
    bugDescription: 'Event listener is added but never removed on component unmount',
    hints: [
      'useEffect can return a cleanup function',
      'Cleanup function runs when component unmounts',
      'Use removeEventListener in the cleanup',
      'The cleanup function should mirror the setup',
    ],
    testCases: [
      {
        input: { action: 'Mount and unmount component 10 times' },
        expected: { listenerCount: 0 },
        description: 'No duplicate event listeners, no memory leak',
      },
    ],
  },
  {
    id: 'bugfix-type-coercion',
    title: 'Fix Type Coercion Bug',
    type: 'bugfix',
    difficulty: 'easy',
    companies: ['Generic'],
    description: 'Fix bug caused by implicit type coercion',
    tags: ['types', 'coercion', 'comparison'],
    estimatedTime: 10,
    problemStatement: `This function should sum two numbers, but sometimes returns unexpected results. Fix the type issue.`,
    buggyCode: {
      javascript: `// calculator.js - Math utilities with type coercion bug
function addNumbers(a, b) {
  // BUG: No type conversion - string concatenation occurs
  return a + b;
}
// addNumbers("5", 3) returns "53" instead of 8`,
      typescript: `// calculator.ts - Math utilities with type coercion bug
function addNumbers(a: any, b: any) {
  // BUG: Using 'any' allows strings, no conversion
  return a + b;
}
// addNumbers("5", 3) returns "53" instead of 8`,
      python: `# calculator.py - Math utilities with type issue
def add_numbers(a, b):
    # BUG: No type checking or conversion
    return a + b
# add_numbers("5", 3) would raise TypeError in Python`,
      java: `// Calculator.java - Math utilities with type coercion bug
public class Calculator {
    // BUG: Concatenates instead of adding when inputs are strings
    public static String addNumbers(String a, String b) {
        // BUG: No conversion to numbers - string concatenation occurs
        return a + b;
    }
    // addNumbers("5", "3") returns "53" instead of 8
    // Should parse strings to numbers before adding
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'services/PriceCalculator.js',
          content: `// PriceCalculator - Uses addNumbers for calculations
import { addNumbers } from './calculator.js';

export class PriceCalculator {
  constructor() {
    this.items = [];
  }

  addItem(name, price) {
    // Prices might come from form inputs as strings
    this.items.push({ name, price });
  }

  calculateTotal() {
    let total = 0;
    for (const item of this.items) {
      // BUG: If item.price is a string, concatenation occurs
      total = addNumbers(total, item.price);
    }
    return total;
  }

  calculateWithTax(subtotal, taxRate) {
    // taxRate might be "0.08" from an input field
    const tax = addNumbers(subtotal, taxRate);
    return tax;
  }
}`,
          description: 'Price calculator affected by type coercion bug',
        },
        {
          fileName: 'utils/formHelpers.js',
          content: `// Form helper utilities
export function getFormValues(formId) {
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  const values = {};

  for (const [key, value] of formData.entries()) {
    // WARNING: All form values are strings!
    values[key] = value;
  }

  return values;
}

// Example usage that causes the bug:
export function handleCheckoutForm() {
  const values = getFormValues('checkout-form');

  // values.quantity is "2" (string)
  // values.price is "10.50" (string)
  // When passed to addNumbers, results in "210.50" instead of 12.50

  return {
    quantity: values.quantity,
    price: values.price,
    itemTotal: addNumbers(values.quantity, values.price)
  };
}`,
          description: 'Form helpers that return string values',
        },
        {
          fileName: 'tests/calculatorTest.js',
          content: `// Test file showing type coercion issues
import { addNumbers } from './calculator.js';

function testAddNumbers() {
  console.log('=== Testing addNumbers ===\\n');

  // Test 1: Numbers (works correctly)
  console.log('Test 1: addNumbers(5, 3)');
  console.log('Expected: 8');
  console.log('Actual:', addNumbers(5, 3));
  console.log('✅ Pass\\n');

  // Test 2: String + Number (BUG)
  console.log('Test 2: addNumbers("5", 3)');
  console.log('Expected: 8');
  console.log('Actual:', addNumbers("5", 3));
  console.log('❌ Fail - Got "53" (concatenation)\\n');

  // Test 3: Two strings (BUG)
  console.log('Test 3: addNumbers("5", "3")');
  console.log('Expected: 8');
  console.log('Actual:', addNumbers("5", "3"));
  console.log('❌ Fail - Got "53" (concatenation)\\n');

  // Test 4: Decimal strings (BUG)
  console.log('Test 4: addNumbers("10.5", "2.3")');
  console.log('Expected: 12.8');
  console.log('Actual:', addNumbers("10.5", "2.3"));
  console.log('❌ Fail - Got "10.52.3"\\n');
}

testAddNumbers();`,
          description: 'Test demonstrating the type coercion bug',
        },
      ],
      typescript: [
        {
          fileName: 'services/PriceCalculator.ts',
          content: `// PriceCalculator with proper types (but still buggy)
import { addNumbers } from './calculator';

interface Item {
  name: string;
  price: number | string;  // Problem: allows strings
}

export class PriceCalculator {
  private items: Item[] = [];

  addItem(name: string, price: number | string): void {
    this.items.push({ name, price });
  }

  calculateTotal(): number | string {
    let total: any = 0;
    for (const item of this.items) {
      total = addNumbers(total, item.price);
    }
    return total;
  }
}`,
          description: 'TypeScript calculator with loose typing',
        },
      ],
      python: [
        {
          fileName: 'services/price_calculator.py',
          content: `# PriceCalculator - Uses add_numbers for calculations
from calculator import add_numbers

class PriceCalculator:
    def __init__(self):
        self.items = []

    def add_item(self, name, price):
        """Add item to cart"""
        # Prices might come from web forms as strings
        self.items.append({"name": name, "price": price})

    def calculate_total(self):
        """Calculate total price"""
        total = 0
        for item in self.items:
            # If item['price'] is a string, this will fail
            try:
                total = add_numbers(total, item['price'])
            except TypeError as e:
                print(f"Error: Cannot add {type(total)} and {type(item['price'])}")
                raise
        return total`,
          description: 'Price calculator affected by type issues',
        },
      ],
      java: [
        {
          fileName: 'services/PriceCalculator.java',
          content: `// PriceCalculator - Uses addNumbers for calculations
package services;

import java.util.ArrayList;
import java.util.List;

public class PriceCalculator {
    private List<Item> items;

    public PriceCalculator() {
        this.items = new ArrayList<>();
    }

    public void addItem(String name, String price) {
        // Prices might come from web forms/JSON as strings
        items.add(new Item(name, price));
    }

    public String calculateTotal() {
        String total = "0";
        for (Item item : items) {
            // BUG: If item.price is a string, concatenation occurs
            total = Calculator.addNumbers(total, item.price);
        }
        return total;
    }

    public String calculateWithTax(String subtotal, String taxRate) {
        // taxRate might be "0.08" from user input
        return Calculator.addNumbers(subtotal, taxRate);
    }

    static class Item {
        String name;
        String price;

        Item(String name, String price) {
            this.name = name;
            this.price = price;
        }
    }
}`,
          description: 'Price calculator affected by type coercion bug',
        },
        {
          fileName: 'utils/FormHelpers.java',
          content: `// Form helper utilities
package utils;

import java.util.HashMap;
import java.util.Map;

public class FormHelpers {
    public static Map<String, String> getFormValues(Map<String, String> formData) {
        // WARNING: All form values are strings!
        // Even numeric inputs come as strings
        return new HashMap<>(formData);
    }

    // Example usage that causes the bug:
    public static Map<String, Object> handleCheckoutForm(Map<String, String> formData) {
        Map<String, String> values = getFormValues(formData);

        // values.get("quantity") is "2" (string)
        // values.get("price") is "10.50" (string)
        // When passed to addNumbers, results in "210.50" instead of 12.50

        Map<String, Object> result = new HashMap<>();
        result.put("quantity", values.get("quantity"));
        result.put("price", values.get("price"));
        result.put("itemTotal", Calculator.addNumbers(
            values.get("quantity"),
            values.get("price")
        ));

        return result;
    }
}`,
          description: 'Form helpers that return string values',
        },
        {
          fileName: 'tests/CalculatorTest.java',
          content: `// Test file showing type coercion issues
package tests;

public class CalculatorTest {
    public static void testAddNumbers() {
        System.out.println("=== Testing addNumbers ===\\n");

        // Test 1: Two number strings (BUG)
        System.out.println("Test 1: addNumbers(\\"5\\", \\"3\\")");
        System.out.println("Expected: 8");
        String result1 = Calculator.addNumbers("5", "3");
        System.out.println("Actual: " + result1);
        System.out.println("❌ Fail - Got \\"53\\" (concatenation)\\n");

        // Test 2: Decimal strings (BUG)
        System.out.println("Test 2: addNumbers(\\"10.5\\", \\"2.3\\")");
        System.out.println("Expected: 12.8");
        String result2 = Calculator.addNumbers("10.5", "2.3");
        System.out.println("Actual: " + result2);
        System.out.println("❌ Fail - Got \\"10.52.3\\"\\n");

        // Test 3: Zero and number (BUG)
        System.out.println("Test 3: addNumbers(\\"0\\", \\"100\\")");
        System.out.println("Expected: 100");
        String result3 = Calculator.addNumbers("0", "100");
        System.out.println("Actual: " + result3);
        System.out.println("❌ Fail - Got \\"0100\\"\\n");

        System.out.println("SOLUTION: Convert strings to numbers before adding:");
        System.out.println("double num1 = Double.parseDouble(a);");
        System.out.println("double num2 = Double.parseDouble(b);");
        System.out.println("return String.valueOf(num1 + num2);");
    }

    public static void main(String[] args) {
        testAddNumbers();
    }
}`,
          description: 'Test demonstrating the type coercion bug',
        },
      ],
    },
    expectedBehavior: 'Should always return numeric sum, converting strings to numbers',
    bugDescription: 'String concatenation happens instead of numeric addition',
    hints: [
      'JavaScript + operator behaves differently with strings vs numbers',
      'Convert inputs to numbers explicitly',
      'Use Number(), parseInt(), parseFloat(), or the + unary operator',
      'Consider using TypeScript with strict types',
    ],
    testCases: [
      {
        input: { a: 5, b: 3 },
        expected: 8,
        description: 'Numbers: 5 + 3 = 8',
      },
      {
        input: { a: '5', b: 3 },
        expected: 8,
        description: 'String + Number: "5" + 3 = 8',
      },
      {
        input: { a: '5', b: '3' },
        expected: 8,
        description: 'Two strings: "5" + "3" = 8',
      },
      {
        input: { a: '10.5', b: '2.3' },
        expected: 12.8,
        description: 'Decimal strings: "10.5" + "2.3" = 12.8',
      },
    ],
  },
  {
    id: 'bugfix-race-condition',
    title: 'Fix Race Condition in Async Code',
    type: 'bugfix',
    difficulty: 'hard',
    companies: ['Meta', 'Google', 'Amazon'],
    description: 'Fix race condition where outdated async results overwrite newer ones',
    tags: ['async', 'race-condition', 'concurrency'],
    estimatedTime: 20,
    problemStatement: `This search function has a race condition where old results can overwrite newer ones if requests complete out of order. Fix it.`,
    buggyCode: {
      javascript: `async function handleSearch(query) {
  const results = await searchAPI(query);
  displayResults(results);
}
// When user types quickly, older searches can overwrite newer ones`,
      typescript: `let currentQuery = '';

async function handleSearch(query: string) {
  const results = await searchAPI(query);
  displayResults(results);
}`,
      java: `// SearchHandler.java - Search handler with race condition
import java.util.concurrent.CompletableFuture;

public class SearchHandler {
    public static void handleSearch(String query) {
        CompletableFuture<SearchResult> resultsFuture = searchAPI(query);
        // BUG: No tracking of which request is latest
        resultsFuture.thenAccept(results -> {
            displayResults(results);
        });
    }
    // When user types quickly, older searches can overwrite newer ones
}`,
    },
    expectedBehavior: 'Should only display results for the most recent query',
    bugDescription: 'No mechanism to ignore outdated async results',
    hints: [
      'Track the most recent query and ignore older results',
      'Use a request ID or timestamp to identify the latest request',
      'Consider using AbortController to cancel outdated requests',
    ],
    testCases: [
      {
        input: 'Quick succession: "a", "ab", "abc"',
        expected: 'Only shows results for "abc", ignores earlier results',
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: 'components/SearchBar.jsx',
          content: `import React, { useState } from 'react';
import { searchAPI } from '../api/searchAPI';

export function SearchBar({ onResults }) {
  const [query, setQuery] = useState('');

  async function handleSearch(query) {
    // BUG: No tracking of which request is latest
    const results = await searchAPI(query);
    onResults(results);
  }

  const handleChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    handleSearch(newQuery); // Fires on every keystroke
  };

  return (
    <input
      type="text"
      value={query}
      onChange={handleChange}
      placeholder="Search..."
    />
  );
}`,
          description: 'SearchBar component that triggers searches on every keystroke',
        },
        {
          fileName: 'api/searchAPI.js',
          content: `// Simulates API call with random delays
export async function searchAPI(query) {
  // Simulate network delay (100-500ms)
  const delay = Math.random() * 400 + 100;

  await new Promise(resolve => setTimeout(resolve, delay));

  // Simulate search results
  return {
    query,
    results: [
      { id: 1, title: \`Result for "\${query}" - 1\` },
      { id: 2, title: \`Result for "\${query}" - 2\` },
      { id: 3, title: \`Result for "\${query}" - 3\` },
    ],
    timestamp: Date.now()
  };
}`,
          description: 'API function with simulated variable delay causing race conditions',
        },
        {
          fileName: 'components/SearchResults.jsx',
          content: `import React from 'react';

export function SearchResults({ results }) {
  if (!results) {
    return <div>No results yet</div>;
  }

  return (
    <div className="search-results">
      <h3>Results for: {results.query}</h3>
      <ul>
        {results.results.map(result => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
      <small>Timestamp: {results.timestamp}</small>
    </div>
  );
}`,
          description: 'Component that displays search results - shows wrong results when race condition occurs',
        },
        {
          fileName: 'tests/searchRaceCondition.test.js',
          content: `import { render, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '../components/SearchBar';
import { SearchResults } from '../components/SearchResults';
import { searchAPI } from '../api/searchAPI';

jest.mock('../api/searchAPI');

describe('Search Race Condition Bug', () => {
  test('demonstrates race condition - older results overwrite newer', async () => {
    let onResults;
    const { getByPlaceholderText, getByText } = render(
      <div>
        <SearchBar onResults={(r) => { onResults = r; }} />
        <SearchResults results={onResults} />
      </div>
    );

    // Mock searchAPI to control timing
    searchAPI.mockImplementation((query) => {
      const delays = { 'a': 300, 'ab': 200, 'abc': 100 }; // Reverse order!
      return new Promise(resolve =>
        setTimeout(() => resolve({
          query,
          results: [{ id: 1, title: \`Result for "\${query}"\` }],
          timestamp: Date.now()
        }), delays[query])
      );
    });

    const input = getByPlaceholderText('Search...');

    // Type quickly: a, ab, abc
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });

    // Wait for all requests to complete
    await waitFor(() => {}, { timeout: 500 });

    // BUG: Shows results for "a" instead of "abc"!
    // Because "a" took longest (300ms) and completed last
    expect(getByText(/Result for "a"/)).toBeInTheDocument();
    // This assertion FAILS - we don't see "abc" results
    // expect(getByText(/Result for "abc"/)).toBeInTheDocument();
  });
});`,
          description: 'Test demonstrating the race condition bug when typing quickly',
        },
      ],
      typescript: [
        {
          fileName: 'components/SearchBar.tsx',
          content: `import React, { useState } from 'react';
import { searchAPI, SearchResult } from '../api/searchAPI';

interface SearchBarProps {
  onResults: (results: SearchResult) => void;
}

export function SearchBar({ onResults }: SearchBarProps) {
  const [query, setQuery] = useState('');

  async function handleSearch(query: string): Promise<void> {
    // BUG: No tracking of which request is latest
    const results = await searchAPI(query);
    onResults(results);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    handleSearch(newQuery); // Fires on every keystroke
  };

  return (
    <input
      type="text"
      value={query}
      onChange={handleChange}
      placeholder="Search..."
    />
  );
}`,
          description: 'SearchBar component that triggers searches on every keystroke',
        },
        {
          fileName: 'api/searchAPI.ts',
          content: `export interface SearchResult {
  query: string;
  results: Array<{ id: number; title: string }>;
  timestamp: number;
}

// Simulates API call with random delays
export async function searchAPI(query: string): Promise<SearchResult> {
  // Simulate network delay (100-500ms)
  const delay = Math.random() * 400 + 100;

  await new Promise(resolve => setTimeout(resolve, delay));

  // Simulate search results
  return {
    query,
    results: [
      { id: 1, title: \`Result for "\${query}" - 1\` },
      { id: 2, title: \`Result for "\${query}" - 2\` },
      { id: 3, title: \`Result for "\${query}" - 3\` },
    ],
    timestamp: Date.now()
  };
}`,
          description: 'API function with simulated variable delay causing race conditions',
        },
        {
          fileName: 'components/SearchResults.tsx',
          content: `import React from 'react';
import { SearchResult } from '../api/searchAPI';

interface SearchResultsProps {
  results: SearchResult | null;
}

export function SearchResults({ results }: SearchResultsProps) {
  if (!results) {
    return <div>No results yet</div>;
  }

  return (
    <div className="search-results">
      <h3>Results for: {results.query}</h3>
      <ul>
        {results.results.map(result => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
      <small>Timestamp: {results.timestamp}</small>
    </div>
  );
}`,
          description: 'Component that displays search results - shows wrong results when race condition occurs',
        },
      ],
      java: [
        {
          fileName: 'components/SearchBar.java',
          content: `// SearchBar component with race condition
package components;

import java.util.concurrent.CompletableFuture;
import api.SearchAPI;
import api.SearchResult;

public class SearchBar {
    private String query = "";
    private SearchResultListener listener;

    public SearchBar(SearchResultListener listener) {
        this.listener = listener;
    }

    public void handleSearch(String query) {
        // BUG: No tracking of which request is latest
        CompletableFuture<SearchResult> resultsFuture = SearchAPI.search(query);
        resultsFuture.thenAccept(results -> {
            listener.onResults(results);
        });
    }

    public void handleChange(String newQuery) {
        this.query = newQuery;
        handleSearch(newQuery); // Fires on every keystroke
    }

    public interface SearchResultListener {
        void onResults(SearchResult results);
    }
}`,
          description: 'SearchBar component that triggers searches on every keystroke',
        },
        {
          fileName: 'api/SearchAPI.java',
          content: `// Simulates API call with random delays
package api;

import java.util.concurrent.CompletableFuture;
import java.util.List;
import java.util.Arrays;
import java.util.Random;

public class SearchAPI {
    private static final Random random = new Random();

    public static CompletableFuture<SearchResult> search(String query) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Simulate network delay (100-500ms)
                int delay = random.nextInt(400) + 100;
                Thread.sleep(delay);

                // Simulate search results
                return new SearchResult(
                    query,
                    Arrays.asList(
                        new SearchItem(1, "Result for \\"" + query + "\\" - 1"),
                        new SearchItem(2, "Result for \\"" + query + "\\" - 2"),
                        new SearchItem(3, "Result for \\"" + query + "\\" - 3")
                    ),
                    System.currentTimeMillis()
                );
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });
    }
}

class SearchResult {
    String query;
    List<SearchItem> results;
    long timestamp;

    SearchResult(String query, List<SearchItem> results, long timestamp) {
        this.query = query;
        this.results = results;
        this.timestamp = timestamp;
    }
}

class SearchItem {
    int id;
    String title;

    SearchItem(int id, String title) {
        this.id = id;
        this.title = title;
    }
}`,
          description: 'API function with simulated variable delay causing race conditions',
        },
        {
          fileName: 'tests/SearchRaceConditionTest.java',
          content: `// Test demonstrating the race condition bug
package tests;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class SearchRaceConditionTest {
    public static void testRaceCondition() throws Exception {
        System.out.println("=== Testing Search Race Condition ===\\n");

        SearchResultTracker tracker = new SearchResultTracker();

        // Mock searchAPI to control timing
        // "a" takes 300ms, "ab" takes 200ms, "abc" takes 100ms
        // So "abc" completes first, but "a" completes last and overwrites

        System.out.println("Simulating quick typing: 'a', 'ab', 'abc'");
        System.out.println("Delays: 'a'=300ms, 'ab'=200ms, 'abc'=100ms");
        System.out.println();

        // Type quickly
        CompletableFuture<SearchResult> future1 = simulateSearch("a", 300);
        CompletableFuture<SearchResult> future2 = simulateSearch("ab", 200);
        CompletableFuture<SearchResult> future3 = simulateSearch("abc", 100);

        future1.thenAccept(r -> {
            System.out.println("Response for 'a' arrived at " + r.timestamp);
            tracker.setResults(r);
        });
        future2.thenAccept(r -> {
            System.out.println("Response for 'ab' arrived at " + r.timestamp);
            tracker.setResults(r);
        });
        future3.thenAccept(r -> {
            System.out.println("Response for 'abc' arrived at " + r.timestamp);
            tracker.setResults(r);
        });

        // Wait for all to complete
        Thread.sleep(500);

        System.out.println("\\nFinal displayed results: " + tracker.getCurrentQuery());
        System.out.println("❌ BUG: Shows results for 'a' instead of 'abc'!");
        System.out.println("Because 'a' took longest and completed last\\n");
    }

    private static CompletableFuture<SearchResult> simulateSearch(String query, int delay) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delay);
                return new SearchResult(query, null, System.currentTimeMillis());
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        });
    }

    static class SearchResultTracker {
        private SearchResult currentResults;

        void setResults(SearchResult results) {
            this.currentResults = results;
        }

        String getCurrentQuery() {
            return currentResults != null ? currentResults.query : "none";
        }
    }

    public static void main(String[] args) throws Exception {
        testRaceCondition();
    }
}`,
          description: 'Test demonstrating the race condition bug when typing quickly',
        },
      ],
    },
  },
  {
    id: 'bugfix-deepcopy',
    title: 'Fix Shallow Copy Bug',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Amazon', 'Microsoft'],
    description: 'Fix bug where shallow copy causes unintended mutations',
    tags: ['objects', 'copying', 'mutation'],
    estimatedTime: 15,
    problemStatement: `This function should create a copy of user settings without modifying the original, but changes to the copy affect the original. Fix it.`,
    buggyCode: {
      javascript: `function updateUserSettings(user, newTheme) {
  const updatedUser = { ...user };
  updatedUser.preferences.theme = newTheme;
  return updatedUser;
}
// Original user.preferences.theme also changes!`,
      typescript: `function updateUserSettings(user: any, newTheme: string) {
  const updatedUser = { ...user };
  updatedUser.preferences.theme = newTheme;
  return updatedUser;
}`,
      python: `def updateUserSettings(user, newTheme):
    updatedUser = user.copy()
    updatedUser['preferences']['theme'] = newTheme
    return updatedUser`,
      java: `// UserSettingsManager.java - Shallow copy bug
public class UserSettingsManager {
    public static User updateUserSettings(User user, String newTheme) {
        User updatedUser = user.clone(); // BUG: shallow clone
        updatedUser.getPreferences().setTheme(newTheme);
        return updatedUser;
    }
    // Original user.preferences.theme also changes!
}`,
    },
    expectedBehavior: 'Should deep copy nested objects to prevent mutations',
    bugDescription: 'Spread operator only creates shallow copy, nested objects are still referenced',
    hints: [
      'Spread operator / .copy() only copies top-level properties',
      'Nested objects are still referenced, not copied',
      'Use deep copy techniques like structuredClone or recursive copying',
    ],
    testCases: [
      {
        input: '{name: "John", preferences: {theme: "light"}}, "dark"',
        expected: 'Original user.preferences.theme stays "light"',
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: 'components/UserSettings.jsx',
          content: `import React, { useState } from 'react';
import { SettingsManager } from '../services/SettingsManager';

const settingsManager = new SettingsManager();

export function UserSettings() {
  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'light',
      notifications: {
        email: true,
        push: false,
        sms: true
      },
      language: 'en'
    }
  });

  const updateTheme = (newTheme) => {
    // BUG: This mutates the original user object!
    const updated = settingsManager.updateUserSettings(user, newTheme);
    setUser(updated);

    // Original user object is also modified
    console.log('Original user theme:', user.preferences.theme);
    // Expected: 'light', Actual: 'dark' (mutation bug!)
  };

  return (
    <div>
      <h2>User Settings</h2>
      <p>Name: {user.name}</p>
      <p>Current Theme: {user.preferences.theme}</p>
      <button onClick={() => updateTheme('dark')}>
        Switch to Dark Theme
      </button>
      <button onClick={() => updateTheme('light')}>
        Switch to Light Theme
      </button>
    </div>
  );
}`,
          description: 'Component that updates user settings and experiences mutation bug',
        },
        {
          fileName: 'services/SettingsManager.js',
          content: `export class SettingsManager {
  // BUG: Shallow copy doesn't prevent nested object mutation
  updateUserSettings(user, newTheme) {
    const updatedUser = { ...user }; // Shallow copy
    updatedUser.preferences.theme = newTheme; // Mutates original!
    return updatedUser;
  }

  // This has the same bug
  toggleNotification(user, notificationType) {
    const updatedUser = { ...user };
    updatedUser.preferences.notifications[notificationType] =
      !updatedUser.preferences.notifications[notificationType];
    return updatedUser; // Original user is also modified
  }

  // Even this seemingly safe operation has the bug
  updateLanguage(user, newLanguage) {
    const updatedUser = { ...user };
    updatedUser.preferences.language = newLanguage;
    // This works because 'preferences' is replaced, but it's inconsistent
    return updatedUser;
  }
}`,
          description: 'Settings manager class with shallow copy bug affecting nested objects',
        },
        {
          fileName: 'tests/settingsMutation.test.js',
          content: `import { SettingsManager } from '../services/SettingsManager';

describe('SettingsManager Mutation Bug', () => {
  const settingsManager = new SettingsManager();

  test('demonstrates shallow copy mutation bug', () => {
    const originalUser = {
      name: 'John',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: false
        }
      }
    };

    // Update theme to dark
    const updatedUser = settingsManager.updateUserSettings(originalUser, 'dark');

    // BUG: Original object is mutated!
    expect(originalUser.preferences.theme).toBe('light'); // FAILS!
    expect(originalUser.preferences.theme).toBe('dark'); // Actually true :(

    expect(updatedUser.preferences.theme).toBe('dark'); // Passes

    // They share the same preferences object
    expect(originalUser.preferences).toBe(updatedUser.preferences); // Same reference!
  });

  test('demonstrates nested mutation bug', () => {
    const originalUser = {
      name: 'Jane',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: false,
          sms: true
        }
      }
    };

    // Toggle email notifications
    const updatedUser = settingsManager.toggleNotification(originalUser, 'email');

    // BUG: Original notifications object is mutated!
    expect(originalUser.preferences.notifications.email).toBe(true); // FAILS!
    expect(originalUser.preferences.notifications.email).toBe(false); // Actual value

    // Both objects share the same notifications reference
    expect(originalUser.preferences.notifications)
      .toBe(updatedUser.preferences.notifications);
  });
});`,
          description: 'Test file demonstrating the shallow copy mutation bug',
        },
        {
          fileName: 'examples/deepCopyExamples.js',
          content: `// Examples showing the difference between shallow and deep copy

// Example 1: Shallow copy problem
function shallowCopyProblem() {
  const original = {
    name: 'User',
    settings: { theme: 'light' }
  };

  const copy = { ...original };
  copy.settings.theme = 'dark';

  console.log('Original theme:', original.settings.theme); // 'dark' - MUTATED!
  console.log('Copy theme:', copy.settings.theme); // 'dark'
  console.log('Same reference?', original.settings === copy.settings); // true
}

// Example 2: Solutions for deep copy

// Solution 1: structuredClone (modern browsers/Node 17+)
function deepCopyWithStructuredClone(obj) {
  return structuredClone(obj);
}

// Solution 2: JSON parse/stringify (simple but has limitations)
function deepCopyWithJSON(obj) {
  return JSON.parse(JSON.stringify(obj));
  // Limitations: loses functions, undefined, Dates become strings, etc.
}

// Solution 3: Recursive deep copy
function deepCopyRecursive(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepCopyRecursive(item));

  const copy = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepCopyRecursive(obj[key]);
    }
  }
  return copy;
}

// Solution 4: Using spread operator correctly for nested objects
function properNestedCopy(user, newTheme) {
  return {
    ...user,
    preferences: {
      ...user.preferences,
      theme: newTheme
    }
  };
}`,
          description: 'Examples showing shallow vs deep copy and various solutions',
        },
      ],
      typescript: [
        {
          fileName: 'components/UserSettings.tsx',
          content: `import React, { useState } from 'react';
import { SettingsManager, User } from '../services/SettingsManager';

const settingsManager = new SettingsManager();

export function UserSettings() {
  const [user, setUser] = useState<User>({
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'light',
      notifications: {
        email: true,
        push: false,
        sms: true
      },
      language: 'en'
    }
  });

  const updateTheme = (newTheme: 'light' | 'dark') => {
    // BUG: This mutates the original user object!
    const updated = settingsManager.updateUserSettings(user, newTheme);
    setUser(updated);

    // Original user object is also modified
    console.log('Original user theme:', user.preferences.theme);
    // Expected: 'light', Actual: 'dark' (mutation bug!)
  };

  return (
    <div>
      <h2>User Settings</h2>
      <p>Name: {user.name}</p>
      <p>Current Theme: {user.preferences.theme}</p>
      <button onClick={() => updateTheme('dark')}>
        Switch to Dark Theme
      </button>
      <button onClick={() => updateTheme('light')}>
        Switch to Light Theme
      </button>
    </div>
  );
}`,
          description: 'Component that updates user settings and experiences mutation bug',
        },
        {
          fileName: 'services/SettingsManager.ts',
          content: `export interface User {
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    language: string;
  };
}

export class SettingsManager {
  // BUG: Shallow copy doesn't prevent nested object mutation
  updateUserSettings(user: User, newTheme: 'light' | 'dark'): User {
    const updatedUser = { ...user }; // Shallow copy
    updatedUser.preferences.theme = newTheme; // Mutates original!
    return updatedUser;
  }

  toggleNotification(user: User, notificationType: keyof User['preferences']['notifications']): User {
    const updatedUser = { ...user };
    updatedUser.preferences.notifications[notificationType] =
      !updatedUser.preferences.notifications[notificationType];
    return updatedUser; // Original user is also modified
  }
}`,
          description: 'Settings manager class with shallow copy bug affecting nested objects',
        },
        {
          fileName: 'tests/settingsMutation.test.ts',
          content: `import { SettingsManager, User } from '../services/SettingsManager';

describe('SettingsManager Mutation Bug', () => {
  const settingsManager = new SettingsManager();

  test('demonstrates shallow copy mutation bug', () => {
    const originalUser: User = {
      name: 'John',
      email: 'john@test.com',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: false,
          sms: true
        },
        language: 'en'
      }
    };

    // Update theme to dark
    const updatedUser = settingsManager.updateUserSettings(originalUser, 'dark');

    // BUG: Original object is mutated!
    expect(originalUser.preferences.theme).toBe('light'); // FAILS!
    expect(originalUser.preferences.theme).toBe('dark'); // Actually true :(

    // They share the same preferences object
    expect(originalUser.preferences).toBe(updatedUser.preferences); // Same reference!
  });
});`,
          description: 'Test file demonstrating the shallow copy mutation bug',
        },
      ],
      python: [
        {
          fileName: 'services/settings_manager.py',
          content: `from copy import copy, deepcopy

class SettingsManager:
    """Manages user settings with shallow copy bug"""

    def update_user_settings(self, user, new_theme):
        """BUG: dict.copy() only creates shallow copy"""
        updated_user = user.copy()  # Shallow copy
        updated_user['preferences']['theme'] = new_theme  # Mutates original!
        return updated_user

    def toggle_notification(self, user, notification_type):
        """Same shallow copy bug"""
        updated_user = user.copy()
        updated_user['preferences']['notifications'][notification_type] = \\
            not updated_user['preferences']['notifications'][notification_type]
        return updated_user  # Original user is also modified

    def update_user_settings_fixed(self, user, new_theme):
        """Fixed version using deepcopy"""
        updated_user = deepcopy(user)
        updated_user['preferences']['theme'] = new_theme
        return updated_user`,
          description: 'Python settings manager showing shallow copy bug with dict.copy()',
        },
        {
          fileName: 'tests/test_settings_mutation.py',
          content: `import unittest
from services.settings_manager import SettingsManager

class TestSettingsMutation(unittest.TestCase):
    def setUp(self):
        self.manager = SettingsManager()
        self.original_user = {
            'name': 'John',
            'email': 'john@test.com',
            'preferences': {
                'theme': 'light',
                'notifications': {
                    'email': True,
                    'push': False,
                    'sms': True
                },
                'language': 'en'
            }
        }

    def test_shallow_copy_mutation_bug(self):
        """Demonstrates that dict.copy() causes mutation"""
        # Update theme to dark
        updated_user = self.manager.update_user_settings(
            self.original_user, 'dark'
        )

        # BUG: Original object is mutated!
        # This assertion FAILS
        # self.assertEqual(self.original_user['preferences']['theme'], 'light')

        # This is what actually happens
        self.assertEqual(self.original_user['preferences']['theme'], 'dark')

        # They share the same preferences dictionary
        self.assertIs(
            self.original_user['preferences'],
            updated_user['preferences']
        )

    def test_deepcopy_fix(self):
        """Shows that deepcopy prevents mutation"""
        updated_user = self.manager.update_user_settings_fixed(
            self.original_user, 'dark'
        )

        # Original is NOT mutated with deepcopy
        self.assertEqual(self.original_user['preferences']['theme'], 'light')
        self.assertEqual(updated_user['preferences']['theme'], 'dark')

        # They have different preference objects
        self.assertIsNot(
            self.original_user['preferences'],
            updated_user['preferences']
        )`,
          description: 'Test demonstrating shallow vs deep copy in Python',
        },
      ],
      java: [
        {
          fileName: 'models/User.java',
          content: `// User model with shallow clone implementation
package models;

public class User implements Cloneable {
    private String name;
    private String email;
    private Preferences preferences;

    public User(String name, String email, Preferences preferences) {
        this.name = name;
        this.email = email;
        this.preferences = preferences;
    }

    // BUG: Default clone() only does shallow copy
    @Override
    public User clone() {
        try {
            return (User) super.clone(); // Shallow copy!
        } catch (CloneNotSupportedException e) {
            throw new RuntimeException(e);
        }
    }

    public String getName() { return name; }
    public String getEmail() { return email; }
    public Preferences getPreferences() { return preferences; }
    public void setPreferences(Preferences preferences) { this.preferences = preferences; }
}

class Preferences {
    private String theme;
    private Notifications notifications;
    private String language;

    public Preferences(String theme, Notifications notifications, String language) {
        this.theme = theme;
        this.notifications = notifications;
        this.language = language;
    }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public Notifications getNotifications() { return notifications; }
    public String getLanguage() { return language; }
}

class Notifications {
    private boolean email;
    private boolean push;
    private boolean sms;

    public Notifications(boolean email, boolean push, boolean sms) {
        this.email = email;
        this.push = push;
        this.sms = sms;
    }

    public boolean isEmail() { return email; }
    public void setEmail(boolean email) { this.email = email; }
    public boolean isPush() { return push; }
    public boolean isSms() { return sms; }
}`,
          description: 'User model with shallow clone causing mutation bugs',
        },
        {
          fileName: 'services/SettingsManager.java',
          content: `// Settings manager with shallow copy bug
package services;

import models.User;

public class SettingsManager {
    // BUG: Shallow clone doesn't prevent nested object mutation
    public User updateUserSettings(User user, String newTheme) {
        User updatedUser = user.clone(); // Shallow copy
        updatedUser.getPreferences().setTheme(newTheme); // Mutates original!
        return updatedUser;
    }

    // This has the same bug
    public User toggleNotification(User user, String notificationType) {
        User updatedUser = user.clone();
        switch (notificationType) {
            case "email":
                updatedUser.getPreferences().getNotifications()
                    .setEmail(!updatedUser.getPreferences().getNotifications().isEmail());
                break;
            // ... other cases
        }
        return updatedUser; // Original user is also modified
    }
}`,
          description: 'Settings manager class with shallow copy bug affecting nested objects',
        },
        {
          fileName: 'tests/SettingsMutationTest.java',
          content: `// Test demonstrating shallow vs deep copy in Java
package tests;

import models.User;
import models.Preferences;
import models.Notifications;
import services.SettingsManager;

public class SettingsMutationTest {
    public static void testShallowCopyMutation() {
        System.out.println("=== Testing Shallow Copy Mutation Bug ===\\n");

        SettingsManager manager = new SettingsManager();

        // Create original user
        Notifications notifications = new Notifications(true, false, true);
        Preferences preferences = new Preferences("light", notifications, "en");
        User originalUser = new User("John", "john@test.com", preferences);

        System.out.println("Original theme: " + originalUser.getPreferences().getTheme());

        // Update theme to dark
        User updatedUser = manager.updateUserSettings(originalUser, "dark");

        System.out.println("\\nAfter update:");
        System.out.println("Original theme: " + originalUser.getPreferences().getTheme());
        System.out.println("Updated theme: " + updatedUser.getPreferences().getTheme());

        // BUG: Original object is mutated!
        if (originalUser.getPreferences().getTheme().equals("dark")) {
            System.out.println("\\n❌ BUG: Original was mutated! Expected 'light', got 'dark'");
        }

        // They share the same preferences object
        if (originalUser.getPreferences() == updatedUser.getPreferences()) {
            System.out.println("❌ Same preferences reference - shallow copy!");
        }

        System.out.println("\\nFIX: Override clone() to create deep copy of nested objects");
    }

    public static void main(String[] args) {
        testShallowCopyMutation();
    }
}`,
          description: 'Test demonstrating the shallow copy mutation bug',
        },
      ],
    },
  },
  {
    id: 'bugfix-floating-point',
    title: 'Fix Floating Point Precision Bug',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Generic'],
    description: 'Fix precision issues with floating point arithmetic',
    tags: ['math', 'precision', 'floating-point'],
    estimatedTime: 15,
    problemStatement: `This function calculates totals for financial transactions, but produces incorrect results due to floating point precision. Fix it.`,
    buggyCode: {
      javascript: `function calculateTotal(prices) {
  return prices.reduce((sum, price) => sum + price, 0);
}
// calculateTotal([0.1, 0.2]) returns 0.30000000000000004`,
      typescript: `function calculateTotal(prices: number[]): number {
  return prices.reduce((sum, price) => sum + price, 0);
}`,
      python: `def calculateTotal(prices):
    return sum(prices)
# calculateTotal([0.1, 0.2]) returns 0.30000000000000004`,
      java: `// InvoiceCalculator.java - Floating point precision bug
public class InvoiceCalculator {
    public static double calculateTotal(double[] prices) {
        double sum = 0.0;
        for (double price : prices) {
            sum += price; // BUG: Direct floating point addition
        }
        return sum;
    }
    // calculateTotal(new double[]{0.1, 0.2}) returns 0.30000000000000004
}`,
    },
    expectedBehavior: 'Should return precise decimal values suitable for financial calculations',
    bugDescription: 'Floating point arithmetic causes precision errors',
    hints: [
      'Convert to cents (integers) for calculations',
      'Use toFixed() or round to specific decimal places',
      'Consider using a decimal library for financial calculations',
    ],
    testCases: [
      {
        input: '[0.1, 0.2]',
        expected: '0.3 (or 0.30)',
      },
      {
        input: '[10.15, 5.99, 2.50]',
        expected: '18.64',
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: 'services/InvoiceCalculator.js',
          content: `export class InvoiceCalculator {
  // BUG: Direct floating point arithmetic causes precision errors
  calculateTotal(lineItems) {
    return lineItems.reduce((sum, item) => sum + item.price, 0);
    // 0.1 + 0.2 = 0.30000000000000004
  }

  calculateTax(subtotal, taxRate) {
    return subtotal * taxRate;
    // Can produce results like 10.004999999999999 instead of 10.01
  }

  calculateDiscount(price, discountPercent) {
    const discount = price * (discountPercent / 100);
    return price - discount;
    // Precision errors compound
  }

  generateInvoice(items, taxRate = 0.08) {
    const subtotal = this.calculateTotal(items);
    const tax = this.calculateTax(subtotal, taxRate);
    const total = subtotal + tax;

    return {
      subtotal, // BUG: May have precision errors
      tax,      // BUG: May have precision errors
      total,    // BUG: Compounded errors
      items
    };
  }
}

// Example usage showing the bug
const calculator = new InvoiceCalculator();
const items = [
  { name: 'Item 1', price: 0.1 },
  { name: 'Item 2', price: 0.2 }
];

const result = calculator.calculateTotal(items);
console.log(result); // 0.30000000000000004 instead of 0.3`,
          description: 'Invoice calculator with floating point precision bugs',
        },
        {
          fileName: 'services/PaymentProcessor.js',
          content: `import { InvoiceCalculator } from './InvoiceCalculator';

export class PaymentProcessor {
  constructor() {
    this.calculator = new InvoiceCalculator();
  }

  processPayment(items, paymentAmount) {
    const invoice = this.calculator.generateInvoice(items);

    // BUG: Comparing floating point numbers directly
    if (paymentAmount === invoice.total) {
      return { status: 'success', message: 'Payment exact' };
    } else if (paymentAmount < invoice.total) {
      const shortage = invoice.total - paymentAmount;
      return {
        status: 'insufficient',
        message: \`Short by $\${shortage}\` // BUG: May show weird decimals
      };
    } else {
      const change = paymentAmount - invoice.total;
      return {
        status: 'success',
        change: change // BUG: Precision errors in change calculation
      };
    }
  }

  splitBill(totalAmount, numPeople) {
    // BUG: Division can create repeating decimals
    const perPerson = totalAmount / numPeople;
    const total = perPerson * numPeople;

    // This might not equal the original totalAmount!
    if (total !== totalAmount) {
      console.warn('Rounding error detected!');
    }

    return perPerson;
  }

  // Example that fails spectacularly
  demonstrateBug() {
    const items = [
      { name: 'Coffee', price: 2.50 },
      { name: 'Muffin', price: 3.15 },
      { name: 'Juice', price: 1.99 }
    ];

    const invoice = this.calculator.generateInvoice(items);
    console.log('Total:', invoice.total); // Might be 8.211200000000001

    // Customer pays exact amount shown on screen: 8.21
    const payment = this.processPayment(items, 8.21);
    console.log(payment); // Might say "insufficient" due to precision!
  }
}`,
          description: 'Payment processor that compounds floating point errors',
        },
        {
          fileName: 'tests/floatingPointBug.test.js',
          content: `import { InvoiceCalculator } from '../services/InvoiceCalculator';
import { PaymentProcessor } from '../services/PaymentProcessor';

describe('Floating Point Precision Bugs', () => {
  describe('InvoiceCalculator', () => {
    const calculator = new InvoiceCalculator();

    test('demonstrates basic floating point error', () => {
      const items = [
        { name: 'Item 1', price: 0.1 },
        { name: 'Item 2', price: 0.2 }
      ];

      const total = calculator.calculateTotal(items);

      // This test FAILS due to floating point precision
      expect(total).toBe(0.3); // FAILS!

      // Actual value
      expect(total).toBe(0.30000000000000004); // Passes but wrong!
    });

    test('demonstrates compounding errors', () => {
      const items = [
        { name: 'A', price: 10.15 },
        { name: 'B', price: 5.99 },
        { name: 'C', price: 2.50 }
      ];

      const invoice = calculator.generateInvoice(items, 0.08);

      // Expected: 18.64 + tax (1.49) = 20.13
      // Actual: Precision errors make this unpredictable
      console.log('Subtotal:', invoice.subtotal); // Might be wrong
      console.log('Tax:', invoice.tax); // Definitely wrong
      console.log('Total:', invoice.total); // Compounded errors

      // This assertion is flaky
      expect(invoice.total).toBe(20.13); // FAILS sometimes!
    });
  });

  describe('PaymentProcessor', () => {
    const processor = new PaymentProcessor();

    test('demonstrates payment comparison bug', () => {
      const items = [{ name: 'Item', price: 0.1 }];

      // Customer tries to pay exact amount
      const result = processor.processPayment(items, 0.108);

      // Expected: 'success' (0.1 * 1.08 = 0.108)
      // Actual: 'insufficient' due to precision errors
      expect(result.status).toBe('success'); // FAILS!
      expect(result.status).toBe('insufficient'); // Actually true
    });

    test('demonstrates bill splitting bug', () => {
      const total = 10.00;
      const perPerson = processor.splitBill(total, 3);

      // 10 / 3 = 3.3333...
      expect(perPerson).toBe(3.33); // FAILS!
      expect(perPerson).toBe(3.3333333333333335); // Actual

      // When you multiply back
      const reconstructedTotal = perPerson * 3;
      expect(reconstructedTotal).toBe(total); // FAILS! Off by tiny amount
    });
  });
});`,
          description: 'Tests demonstrating various floating point precision errors',
        },
        {
          fileName: 'utils/moneyUtils.js',
          content: `// Utility functions showing proper ways to handle money

/**
 * Convert dollars to cents to work with integers
 * This avoids floating point errors entirely
 */
export function dollarsToCents(dollars) {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents) {
  return cents / 100;
}

/**
 * Add money amounts safely
 */
export function addMoney(...amounts) {
  const cents = amounts.map(dollarsToCents);
  const totalCents = cents.reduce((sum, c) => sum + c, 0);
  return centsToDollars(totalCents);
}

/**
 * Round to 2 decimal places properly
 */
export function roundToMoney(amount) {
  return Math.round(amount * 100) / 100;
}

/**
 * Compare money amounts safely
 */
export function moneyEquals(a, b) {
  return Math.abs(a - b) < 0.001; // Epsilon comparison
}

// Example: Fixed invoice calculator
export class FixedInvoiceCalculator {
  calculateTotal(lineItems) {
    const centsArray = lineItems.map(item => dollarsToCents(item.price));
    const totalCents = centsArray.reduce((sum, cents) => sum + cents, 0);
    return centsToDollars(totalCents);
  }

  calculateTax(subtotal, taxRate) {
    const subtotalCents = dollarsToCents(subtotal);
    const taxCents = Math.round(subtotalCents * taxRate);
    return centsToDollars(taxCents);
  }
}

// Demonstration
const buggy = 0.1 + 0.2; // 0.30000000000000004
const fixed = addMoney(0.1, 0.2); // 0.3

console.log('Buggy:', buggy);
console.log('Fixed:', fixed);
console.log('Are they equal?', buggy === 0.3); // false
console.log('Fixed equals 0.3?', fixed === 0.3); // true`,
          description: 'Utility functions showing proper techniques for handling money calculations',
        },
      ],
      typescript: [
        {
          fileName: 'services/InvoiceCalculator.ts',
          content: `export interface LineItem {
  name: string;
  price: number;
}

export interface Invoice {
  subtotal: number;
  tax: number;
  total: number;
  items: LineItem[];
}

export class InvoiceCalculator {
  // BUG: Direct floating point arithmetic causes precision errors
  calculateTotal(lineItems: LineItem[]): number {
    return lineItems.reduce((sum, item) => sum + item.price, 0);
    // 0.1 + 0.2 = 0.30000000000000004
  }

  calculateTax(subtotal: number, taxRate: number): number {
    return subtotal * taxRate;
  }

  generateInvoice(items: LineItem[], taxRate: number = 0.08): Invoice {
    const subtotal = this.calculateTotal(items);
    const tax = this.calculateTax(subtotal, taxRate);
    const total = subtotal + tax;

    return {
      subtotal, // BUG: May have precision errors
      tax,      // BUG: May have precision errors
      total,    // BUG: Compounded errors
      items
    };
  }
}`,
          description: 'Invoice calculator with floating point precision bugs',
        },
        {
          fileName: 'utils/moneyUtils.ts',
          content: `// Utility functions showing proper ways to handle money

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function addMoney(...amounts: number[]): number {
  const cents = amounts.map(dollarsToCents);
  const totalCents = cents.reduce((sum, c) => sum + c, 0);
  return centsToDollars(totalCents);
}

export function roundToMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function moneyEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001; // Epsilon comparison
}`,
          description: 'Utility functions showing proper techniques for handling money calculations',
        },
      ],
      python: [
        {
          fileName: 'services/invoice_calculator.py',
          content: `from decimal import Decimal, ROUND_HALF_UP

class InvoiceCalculator:
    """Invoice calculator showing floating point bugs"""

    def calculate_total_buggy(self, line_items):
        """BUG: Float arithmetic has precision errors"""
        total = sum(item['price'] for item in line_items)
        return total
        # 0.1 + 0.2 = 0.30000000000000004

    def calculate_total_fixed(self, line_items):
        """Fixed: Using Decimal for precise calculations"""
        total = sum(Decimal(str(item['price'])) for item in line_items)
        return float(total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    def calculate_tax_buggy(self, subtotal, tax_rate):
        """BUG: Float multiplication causes precision errors"""
        return subtotal * tax_rate

    def calculate_tax_fixed(self, subtotal, tax_rate):
        """Fixed: Using Decimal"""
        subtotal_dec = Decimal(str(subtotal))
        tax_rate_dec = Decimal(str(tax_rate))
        tax = subtotal_dec * tax_rate_dec
        return float(tax.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    def generate_invoice_buggy(self, items, tax_rate=0.08):
        """BUG: Compounding precision errors"""
        subtotal = self.calculate_total_buggy(items)
        tax = self.calculate_tax_buggy(subtotal, tax_rate)
        total = subtotal + tax

        return {
            'subtotal': subtotal,  # May have errors
            'tax': tax,           # May have errors
            'total': total,       # Compounded errors
            'items': items
        }`,
          description: 'Python invoice calculator showing float vs Decimal',
        },
        {
          fileName: 'tests/test_floating_point.py',
          content: `import unittest
from decimal import Decimal
from services.invoice_calculator import InvoiceCalculator

class TestFloatingPointBugs(unittest.TestCase):
    def setUp(self):
        self.calculator = InvoiceCalculator()

    def test_basic_float_bug(self):
        """Demonstrates basic floating point error"""
        items = [
            {'name': 'Item 1', 'price': 0.1},
            {'name': 'Item 2', 'price': 0.2}
        ]

        total = self.calculator.calculate_total_buggy(items)

        # This assertion FAILS
        # self.assertEqual(total, 0.3)

        # This is what actually happens
        self.assertEqual(total, 0.30000000000000004)

    def test_decimal_fix(self):
        """Shows Decimal provides correct results"""
        items = [
            {'name': 'Item 1', 'price': 0.1},
            {'name': 'Item 2', 'price': 0.2}
        ]

        total = self.calculator.calculate_total_fixed(items)

        # With Decimal, this works correctly
        self.assertEqual(total, 0.3)

    def test_invoice_precision(self):
        """Demonstrates compounding errors in invoice"""
        items = [
            {'name': 'A', 'price': 10.15},
            {'name': 'B', 'price': 5.99},
            {'name': 'C', 'price': 2.50}
        ]

        invoice = self.calculator.generate_invoice_buggy(items, 0.08)

        # Expected: 18.64 + 1.49 = 20.13
        # Actual: Precision errors
        print(f"Subtotal: {invoice['subtotal']}")
        print(f"Tax: {invoice['tax']}")
        print(f"Total: {invoice['total']}")

        # This might fail due to precision
        # self.assertAlmostEqual(invoice['total'], 20.13, places=2)`,
          description: 'Tests demonstrating floating point bugs in Python',
        },
      ],
      java: [
        {
          fileName: 'services/InvoiceCalculator.java',
          content: `// Invoice calculator with floating point precision bugs
package services;

import java.util.List;

public class InvoiceCalculator {
    public static class LineItem {
        public String name;
        public double price;

        public LineItem(String name, double price) {
            this.name = name;
            this.price = price;
        }
    }

    public static class Invoice {
        public double subtotal;
        public double tax;
        public double total;
        public List<LineItem> items;

        public Invoice(double subtotal, double tax, double total, List<LineItem> items) {
            this.subtotal = subtotal;
            this.tax = tax;
            this.total = total;
            this.items = items;
        }
    }

    // BUG: Direct floating point arithmetic causes precision errors
    public double calculateTotal(List<LineItem> lineItems) {
        double sum = 0.0;
        for (LineItem item : lineItems) {
            sum += item.price; // BUG: Direct addition
        }
        return sum;
        // 0.1 + 0.2 = 0.30000000000000004
    }

    public double calculateTax(double subtotal, double taxRate) {
        return subtotal * taxRate; // BUG: Precision errors
    }

    public double calculateDiscount(double price, double discountPercent) {
        double discount = price * (discountPercent / 100);
        return price - discount; // BUG: Precision errors compound
    }

    public Invoice generateInvoice(List<LineItem> items, double taxRate) {
        double subtotal = calculateTotal(items);
        double tax = calculateTax(subtotal, taxRate);
        double total = subtotal + tax;

        return new Invoice(
            subtotal, // BUG: May have precision errors
            tax,      // BUG: May have precision errors
            total,    // BUG: Compounded errors
            items
        );
    }

    public Invoice generateInvoice(List<LineItem> items) {
        return generateInvoice(items, 0.08);
    }

    // Example usage showing the bug
    public static void main(String[] args) {
        InvoiceCalculator calculator = new InvoiceCalculator();
        List<LineItem> items = List.of(
            new LineItem("Item 1", 0.1),
            new LineItem("Item 2", 0.2)
        );

        double result = calculator.calculateTotal(items);
        System.out.println(result); // 0.30000000000000004 instead of 0.3
    }
}`,
          description: 'Invoice calculator with floating point precision bugs',
        },
        {
          fileName: 'services/PaymentProcessor.java',
          content: `// Payment processor that compounds floating point errors
package services;

import services.InvoiceCalculator;
import services.InvoiceCalculator.LineItem;
import services.InvoiceCalculator.Invoice;
import java.util.List;

public class PaymentProcessor {
    private InvoiceCalculator calculator;

    public static class PaymentResult {
        public String status;
        public String message;
        public Double change;

        public PaymentResult(String status, String message) {
            this.status = status;
            this.message = message;
            this.change = null;
        }

        public PaymentResult(String status, String message, Double change) {
            this.status = status;
            this.message = message;
            this.change = change;
        }
    }

    public PaymentProcessor() {
        this.calculator = new InvoiceCalculator();
    }

    public PaymentResult processPayment(List<LineItem> items, double paymentAmount) {
        Invoice invoice = calculator.generateInvoice(items);

        // BUG: Comparing floating point numbers directly
        if (paymentAmount == invoice.total) {
            return new PaymentResult("success", "Payment exact");
        } else if (paymentAmount < invoice.total) {
            double shortage = invoice.total - paymentAmount;
            return new PaymentResult(
                "insufficient",
                String.format("Short by $%.2f", shortage) // BUG: May show weird decimals
            );
        } else {
            double change = paymentAmount - invoice.total;
            return new PaymentResult(
                "success",
                "Payment received",
                change // BUG: Precision errors in change calculation
            );
        }
    }

    public double splitBill(double totalAmount, int numPeople) {
        // BUG: Division can create repeating decimals
        double perPerson = totalAmount / numPeople;
        double total = perPerson * numPeople;

        // This might not equal the original totalAmount!
        if (total != totalAmount) {
            System.out.println("WARNING: Rounding error detected!");
        }

        return perPerson;
    }

    // Example that fails spectacularly
    public void demonstrateBug() {
        List<LineItem> items = List.of(
            new LineItem("Coffee", 2.50),
            new LineItem("Muffin", 3.15),
            new LineItem("Juice", 1.99)
        );

        Invoice invoice = calculator.generateInvoice(items);
        System.out.println("Total: " + invoice.total); // Might be 8.211200000000001

        // Customer pays exact amount shown on screen: 8.21
        PaymentResult payment = processPayment(items, 8.21);
        System.out.println(payment.status); // Might say "insufficient" due to precision!
    }
}`,
          description: 'Payment processor that compounds floating point errors',
        },
        {
          fileName: 'utils/MoneyUtils.java',
          content: `// Utility functions showing proper ways to handle money
package utils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import services.InvoiceCalculator.LineItem;
import java.util.List;

public class MoneyUtils {

    /**
     * Convert dollars to cents to work with integers
     * This avoids floating point errors entirely
     */
    public static long dollarsToCents(double dollars) {
        return Math.round(dollars * 100);
    }

    public static double centsToDollars(long cents) {
        return cents / 100.0;
    }

    /**
     * Add money amounts safely using BigDecimal
     */
    public static double addMoney(double... amounts) {
        BigDecimal total = BigDecimal.ZERO;
        for (double amount : amounts) {
            total = total.add(BigDecimal.valueOf(amount));
        }
        return total.setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    /**
     * Round to 2 decimal places properly
     */
    public static double roundToMoney(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }

    /**
     * Compare money amounts safely
     */
    public static boolean moneyEquals(double a, double b) {
        return Math.abs(a - b) < 0.001; // Epsilon comparison
    }

    // Example: Fixed invoice calculator
    public static class FixedInvoiceCalculator {
        public double calculateTotal(List<LineItem> lineItems) {
            long totalCents = 0;
            for (LineItem item : lineItems) {
                totalCents += dollarsToCents(item.price);
            }
            return centsToDollars(totalCents);
        }

        public double calculateTax(double subtotal, double taxRate) {
            long subtotalCents = dollarsToCents(subtotal);
            long taxCents = Math.round(subtotalCents * taxRate);
            return centsToDollars(taxCents);
        }
    }

    // Demonstration
    public static void main(String[] args) {
        double buggy = 0.1 + 0.2; // 0.30000000000000004
        double fixed = addMoney(0.1, 0.2); // 0.3

        System.out.println("Buggy: " + buggy);
        System.out.println("Fixed: " + fixed);
        System.out.println("Are they equal? " + (buggy == 0.3)); // false
        System.out.println("Fixed equals 0.3? " + (fixed == 0.3)); // true
    }
}`,
          description: 'Utility functions showing proper techniques for handling money calculations',
        },
      ],
    },
  },
  {
    id: 'bugfix-infinite-loop',
    title: 'Fix Infinite Loop Bug',
    type: 'bugfix',
    difficulty: 'easy',
    companies: ['Generic'],
    description: 'Fix infinite loop caused by incorrect loop condition',
    tags: ['loops', 'control-flow', 'debugging'],
    estimatedTime: 10,
    problemStatement: `This function should count down from n to 0, but it never stops. Fix the infinite loop.`,
    buggyCode: {
      javascript: `function countdown(n) {
  let count = n;
  while (count >= 0) {
    console.log(count);
    count++;
  }
}`,
      typescript: `function countdown(n: number): void {
  let count = n;
  while (count >= 0) {
    console.log(count);
    count++;
  }
}`,
      python: `def countdown(n):
    count = n
    while count >= 0:
        print(count)
        count += 1`,
      java: `// CountdownTimer.java - Infinite loop bug
public class CountdownTimer {
    public static void countdown(int n) {
        int count = n;
        while (count >= 0) {
            System.out.println(count);
            count++; // BUG: Should be count-- to decrement!
        }
        // This function never returns - program hangs!
    }
}`,
    },
    expectedBehavior: 'Should count down from n to 0 and then stop',
    bugDescription: 'Loop increments instead of decrements, causing infinite loop',
    hints: [
      'Check the loop update statement',
      'Should the count be increasing or decreasing?',
      'Trace through the loop manually to see what happens',
    ],
    testCases: [
      {
        input: '5',
        expected: 'Prints 5, 4, 3, 2, 1, 0 and stops',
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: 'components/TimerComponent.jsx',
          content: `import React, { useState, useEffect } from 'react';

export function TimerComponent({ startTime }) {
  const [timeLeft, setTimeLeft] = useState(startTime);
  const [isRunning, setIsRunning] = useState(false);

  // BUG: Infinite loop in countdown logic
  function countdown(n) {
    let count = n;
    while (count >= 0) {
      console.log(count);
      count++; // BUG: Should be count-- to decrement!
    }
    // This function never returns - browser hangs!
  }

  const startTimer = () => {
    setIsRunning(true);
    // WARNING: This will freeze the browser!
    countdown(timeLeft);
    setTimeLeft(0);
  };

  return (
    <div className="timer">
      <h2>Countdown Timer</h2>
      <div className="time-display">{timeLeft} seconds</div>
      <button onClick={startTimer} disabled={isRunning}>
        Start Countdown
      </button>
      {isRunning && <p>Counting down...</p>}
    </div>
  );
}`,
          description: 'Timer component with infinite loop bug that freezes the browser',
        },
        {
          fileName: 'animations/AnimationController.js',
          content: `export class AnimationController {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
  }

  // BUG: Infinite loop in particle update
  updateParticles() {
    let i = 0;
    while (i < this.particles.length) {
      const particle = this.particles[i];

      // Update particle position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // BUG: Forgot to increment i!
      // i++; // This line is missing

      // Remove particles that are off screen
      if (particle.y > this.canvas.height) {
        this.particles.splice(i, 1);
        // BUG: After splice, we should NOT increment i
        // but we forgot to increment i at all!
      }
    }
    // This function hangs because i never changes
  }

  // Another infinite loop bug
  fadeOutAnimation(element, duration) {
    let opacity = 1.0;
    const step = 0.05;

    // BUG: Condition will never be false
    while (opacity > 0) {
      element.style.opacity = opacity;
      opacity += step; // BUG: Should be -= not +=
      // opacity keeps increasing, never reaches 0
    }
  }

  // Correct version for comparison
  updateParticlesFixed() {
    let i = 0;
    while (i < this.particles.length) {
      const particle = this.particles[i];

      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.y > this.canvas.height) {
        this.particles.splice(i, 1);
        // Don't increment i when we remove an element
      } else {
        i++; // Increment when we keep the element
      }
    }
  }
}`,
          description: 'Animation controller with multiple infinite loop bugs',
        },
        {
          fileName: 'tests/infiniteLoop.test.js',
          content: `import { TimerComponent } from '../components/TimerComponent';
import { AnimationController } from '../animations/AnimationController';

describe('Infinite Loop Bugs', () => {
  describe('TimerComponent countdown bug', () => {
    test('countdown never terminates', () => {
      // WARNING: This test will hang if you run it!
      // Normally we'd use a timeout to detect infinite loops

      const countdown = (n) => {
        let count = n;
        while (count >= 0) {
          console.log(count);
          count++; // BUG: increments instead of decrements
        }
      };

      // This will hang:
      // countdown(5);

      // To test this safely, we need a timeout:
      jest.setTimeout(1000); // 1 second timeout

      expect(() => {
        const timeout = setTimeout(() => {
          throw new Error('Function timed out - likely infinite loop');
        }, 500);

        countdown(5);
        clearTimeout(timeout);
      }).toThrow('Function timed out');
    });

    test('demonstrates correct countdown', () => {
      const countdownFixed = (n) => {
        let count = n;
        const results = [];
        while (count >= 0) {
          results.push(count);
          count--; // FIXED: Now it decrements
        }
        return results;
      };

      const result = countdownFixed(5);
      expect(result).toEqual([5, 4, 3, 2, 1, 0]);
    });
  });

  describe('AnimationController bugs', () => {
    test('updateParticles hangs due to missing increment', () => {
      const canvas = document.createElement('canvas');
      const controller = new AnimationController(canvas);

      controller.particles = [
        { x: 10, y: 10, vx: 1, vy: 1 },
        { x: 20, y: 20, vx: 1, vy: 1 }
      ];

      // This would hang:
      // controller.updateParticles();

      // Fixed version works:
      controller.updateParticlesFixed();
      expect(controller.particles.length).toBeLessThanOrEqual(2);
    });

    test('fadeOut increments instead of decrements', () => {
      const element = document.createElement('div');
      element.style.opacity = '1.0';
      const controller = new AnimationController(document.createElement('canvas'));

      // This would hang forever:
      // controller.fadeOutAnimation(element, 1000);

      // The bug: opacity starts at 1.0, adds 0.05 each iteration
      // So it becomes 1.05, 1.10, 1.15... never reaches 0
      expect(1.0 + 0.05).toBeGreaterThan(0); // Always true!
    });
  });
});`,
          description: 'Tests that would hang due to infinite loops (with safety timeouts)',
        },
        {
          fileName: 'utils/loopDebugger.js',
          content: `// Utilities to detect and debug infinite loops

/**
 * Wraps a while loop with iteration limit to prevent infinite loops
 */
export function safeWhile(condition, body, maxIterations = 10000) {
  let iterations = 0;

  while (condition() && iterations < maxIterations) {
    body();
    iterations++;

    if (iterations >= maxIterations) {
      throw new Error(
        \`Possible infinite loop detected: exceeded \${maxIterations} iterations\`
      );
    }
  }

  return iterations;
}

/**
 * Wraps a function with a timeout to prevent hanging
 */
export function withTimeout(fn, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(\`Function timed out after \${timeoutMs}ms - possible infinite loop\`));
    }, timeoutMs);

    try {
      const result = fn();
      clearTimeout(timer);
      resolve(result);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

/**
 * Example: Safe countdown implementation
 */
export function safeCountdown(n) {
  const results = [];
  let count = n;
  let iterations = 0;
  const MAX_ITERATIONS = 1000;

  while (count >= 0) {
    if (iterations++ > MAX_ITERATIONS) {
      throw new Error('Infinite loop detected in countdown');
    }

    results.push(count);
    count--; // Correct decrement
  }

  return results;
}

/**
 * Detects common infinite loop patterns
 */
export function detectInfiniteLoopPattern(code) {
  const warnings = [];

  // Pattern 1: while loop with wrong increment direction
  if (/while.*>=.*\\{[^}]*\\+\\+/.test(code)) {
    warnings.push('Potential infinite loop: incrementing when condition checks >=');
  }

  // Pattern 2: while loop with wrong decrement direction
  if (/while.*<=.*\\{[^}]*--/.test(code)) {
    warnings.push('Potential infinite loop: decrementing when condition checks <=');
  }

  // Pattern 3: while loop with no increment/decrement
  if (/while.*\\{(?!.*(?:\\+\\+|--|\\+=|-=))[^}]*\\}/.test(code)) {
    warnings.push('Potential infinite loop: loop variable not modified');
  }

  return warnings;
}

// Example usage
const buggyCode = \`
function countdown(n) {
  let count = n;
  while (count >= 0) {
    console.log(count);
    count++; // BUG!
  }
}
\`;

console.log('Loop warnings:', detectInfiniteLoopPattern(buggyCode));`,
          description: 'Debugging utilities to detect and prevent infinite loops',
        },
      ],
      typescript: [
        {
          fileName: 'components/TimerComponent.tsx',
          content: `import React, { useState } from 'react';

interface TimerProps {
  startTime: number;
}

export function TimerComponent({ startTime }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(startTime);
  const [isRunning, setIsRunning] = useState(false);

  // BUG: Infinite loop in countdown logic
  function countdown(n: number): void {
    let count = n;
    while (count >= 0) {
      console.log(count);
      count++; // BUG: Should be count-- to decrement!
    }
    // This function never returns - browser hangs!
  }

  const startTimer = () => {
    setIsRunning(true);
    // WARNING: This will freeze the browser!
    countdown(timeLeft);
    setTimeLeft(0);
  };

  return (
    <div className="timer">
      <h2>Countdown Timer</h2>
      <div className="time-display">{timeLeft} seconds</div>
      <button onClick={startTimer} disabled={isRunning}>
        Start Countdown
      </button>
      {isRunning && <p>Counting down...</p>}
    </div>
  );
}`,
          description: 'Timer component with infinite loop bug that freezes the browser',
        },
        {
          fileName: 'utils/loopDebugger.ts',
          content: `// Utilities to detect and debug infinite loops

export function safeWhile(
  condition: () => boolean,
  body: () => void,
  maxIterations: number = 10000
): number {
  let iterations = 0;

  while (condition() && iterations < maxIterations) {
    body();
    iterations++;

    if (iterations >= maxIterations) {
      throw new Error(
        \`Possible infinite loop detected: exceeded \${maxIterations} iterations\`
      );
    }
  }

  return iterations;
}

export function withTimeout<T>(
  fn: () => T,
  timeoutMs: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(\`Function timed out after \${timeoutMs}ms - possible infinite loop\`));
    }, timeoutMs);

    try {
      const result = fn();
      clearTimeout(timer);
      resolve(result);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

export function safeCountdown(n: number): number[] {
  const results: number[] = [];
  let count = n;
  let iterations = 0;
  const MAX_ITERATIONS = 1000;

  while (count >= 0) {
    if (iterations++ > MAX_ITERATIONS) {
      throw new Error('Infinite loop detected in countdown');
    }

    results.push(count);
    count--;
  }

  return results;
}`,
          description: 'Debugging utilities to detect and prevent infinite loops',
        },
      ],
      python: [
        {
          fileName: 'utils/timer.py',
          content: `import time
from typing import List

class TimerController:
    """Timer with infinite loop bug"""

    def countdown_buggy(self, n: int) -> None:
        """BUG: Infinite loop - increments instead of decrements"""
        count = n
        while count >= 0:
            print(count)
            count += 1  # BUG: Should be count -= 1
            # This will run forever!

    def countdown_fixed(self, n: int) -> List[int]:
        """Fixed version that correctly counts down"""
        count = n
        results = []
        while count >= 0:
            results.append(count)
            count -= 1  # FIXED: Now it decrements
        return results

    def fade_animation_buggy(self, duration: float) -> None:
        """BUG: Opacity increases instead of decreases"""
        opacity = 1.0
        step = 0.05

        while opacity > 0:
            print(f"Opacity: {opacity}")
            opacity += step  # BUG: Should be -= not +=
            time.sleep(0.01)
            # opacity keeps growing, never reaches 0!

    def fade_animation_fixed(self, duration: float) -> None:
        """Fixed version"""
        opacity = 1.0
        step = 0.05

        while opacity > 0:
            print(f"Opacity: {opacity}")
            opacity -= step  # FIXED: Now it decreases
            time.sleep(0.01)`,
          description: 'Python timer showing infinite loop bug',
        },
        {
          fileName: 'tests/test_infinite_loop.py',
          content: `import unittest
import signal
from utils.timer import TimerController

class TimeoutError(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutError("Function timed out - likely infinite loop")

class TestInfiniteLoops(unittest.TestCase):
    def setUp(self):
        self.timer = TimerController()

    def test_countdown_buggy_would_hang(self):
        """This test demonstrates the bug (safely with timeout)"""
        # Set a 2-second timeout
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(2)

        try:
            # This would hang forever
            self.timer.countdown_buggy(5)
            self.fail("Should have timed out")
        except TimeoutError:
            # Expected - the function hung
            pass
        finally:
            signal.alarm(0)  # Cancel the alarm

    def test_countdown_fixed_works(self):
        """Fixed version works correctly"""
        result = self.timer.countdown_fixed(5)
        self.assertEqual(result, [5, 4, 3, 2, 1, 0])

    def test_demonstrates_bug_logic(self):
        """Shows why the bug creates an infinite loop"""
        count = 5

        # Buggy logic: count++ when condition is count >= 0
        # 5 >= 0? Yes -> increment to 6
        # 6 >= 0? Yes -> increment to 7
        # 7 >= 0? Yes -> increment to 8
        # ... this never stops!

        iterations = 0
        while count >= 0 and iterations < 10:
            count += 1  # Bug: incrementing
            iterations += 1

        # After 10 iterations, count is much larger, not 0
        self.assertEqual(count, 15)  # Started at 5, added 10
        self.assertGreater(count, 0)  # Still above 0, would continue forever`,
          description: 'Tests demonstrating infinite loop bugs in Python',
        },
      ],
      java: [
        {
          fileName: 'ui/CountdownTimer.java',
          content: `// Countdown timer with infinite loop bug
package ui;

public class CountdownTimer {
    private int timeLeft;
    private boolean isRunning;

    public CountdownTimer(int startTime) {
        this.timeLeft = startTime;
        this.isRunning = false;
    }

    // BUG: Infinite loop in countdown logic
    public void countdown(int n) {
        int count = n;
        while (count >= 0) {
            System.out.println(count);
            count++; // BUG: Should be count-- to decrement!
        }
        // This function never returns - program hangs!
    }

    public void startTimer() {
        isRunning = true;
        // WARNING: This will hang the program!
        countdown(timeLeft);
        timeLeft = 0;
        isRunning = false;
    }

    public int getTimeLeft() {
        return timeLeft;
    }

    public boolean isRunning() {
        return isRunning;
    }

    public static void main(String[] args) {
        CountdownTimer timer = new CountdownTimer(5);
        System.out.println("Starting countdown from " + timer.getTimeLeft());
        // This will hang forever
        timer.startTimer();
        System.out.println("Done!"); // Never reached
    }
}`,
          description: 'Timer component with infinite loop bug that hangs the program',
        },
        {
          fileName: 'animation/ParticleSystem.java',
          content: `// Particle animation system with infinite loop bugs
package animation;

import java.util.ArrayList;
import java.util.List;

public class ParticleSystem {
    private List<Particle> particles;

    public static class Particle {
        public double x, y;
        public double vx, vy;

        public Particle(double x, double y, double vx, double vy) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
        }
    }

    public ParticleSystem() {
        this.particles = new ArrayList<>();
    }

    // BUG: Infinite loop in particle update
    public void updateParticles(double canvasHeight) {
        int i = 0;
        while (i < particles.size()) {
            Particle particle = particles.get(i);

            // Update particle position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // BUG: Forgot to increment i!
            // i++; // This line is missing

            // Remove particles that are off screen
            if (particle.y > canvasHeight) {
                particles.remove(i);
                // BUG: After remove, we should NOT increment i
                // but we forgot to increment i at all!
            }
        }
        // This method hangs because i never changes
    }

    // Another infinite loop bug
    public void fadeOutAnimation(double duration) {
        double opacity = 1.0;
        double step = 0.05;

        // BUG: Condition will never be false
        while (opacity > 0) {
            System.out.println("Opacity: " + opacity);
            opacity += step; // BUG: Should be -= not +=
            // opacity keeps increasing, never reaches 0
            try {
                Thread.sleep(10);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    // Correct version for comparison
    public void updateParticlesFixed(double canvasHeight) {
        int i = 0;
        while (i < particles.size()) {
            Particle particle = particles.get(i);

            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.y > canvasHeight) {
                particles.remove(i);
                // Don't increment i when we remove an element
            } else {
                i++; // Increment when we keep the element
            }
        }
    }

    public void addParticle(Particle particle) {
        particles.add(particle);
    }

    public List<Particle> getParticles() {
        return particles;
    }
}`,
          description: 'Animation controller with multiple infinite loop bugs',
        },
        {
          fileName: 'utils/LoopDebugger.java',
          content: `// Utilities to detect and debug infinite loops
package utils;

import java.util.ArrayList;
import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.concurrent.*;

public class LoopDebugger {

    /**
     * Wraps a while loop with iteration limit to prevent infinite loops
     */
    public static int safeWhile(BooleanSupplier condition, Runnable body, int maxIterations) {
        int iterations = 0;

        while (condition.getAsBoolean() && iterations < maxIterations) {
            body.run();
            iterations++;

            if (iterations >= maxIterations) {
                throw new RuntimeException(
                    "Possible infinite loop detected: exceeded " + maxIterations + " iterations"
                );
            }
        }

        return iterations;
    }

    public static int safeWhile(BooleanSupplier condition, Runnable body) {
        return safeWhile(condition, body, 10000);
    }

    /**
     * Wraps a function with a timeout to prevent hanging
     */
    public static <T> T withTimeout(Callable<T> fn, long timeoutMs) throws TimeoutException {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<T> future = executor.submit(fn);

        try {
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new TimeoutException(
                "Function timed out after " + timeoutMs + "ms - possible infinite loop"
            );
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException(e);
        } finally {
            executor.shutdownNow();
        }
    }

    /**
     * Example: Safe countdown implementation
     */
    public static List<Integer> safeCountdown(int n) {
        List<Integer> results = new ArrayList<>();
        int count = n;
        int iterations = 0;
        final int MAX_ITERATIONS = 1000;

        while (count >= 0) {
            if (iterations++ > MAX_ITERATIONS) {
                throw new RuntimeException("Infinite loop detected in countdown");
            }

            results.add(count);
            count--; // Correct decrement
        }

        return results;
    }

    /**
     * Detects common infinite loop patterns in code
     */
    public static List<String> detectInfiniteLoopPattern(String code) {
        List<String> warnings = new ArrayList<>();

        // Pattern 1: while loop with wrong increment direction
        if (code.matches(".*while.*>=.*\\{[^}]*\\+\\+.*")) {
            warnings.add("Potential infinite loop: incrementing when condition checks >=");
        }

        // Pattern 2: while loop with wrong decrement direction
        if (code.matches(".*while.*<=.*\\{[^}]*--.*")) {
            warnings.add("Potential infinite loop: decrementing when condition checks <=");
        }

        return warnings;
    }

    // Example usage
    public static void main(String[] args) {
        String buggyCode = """
            public void countdown(int n) {
                int count = n;
                while (count >= 0) {
                    System.out.println(count);
                    count++; // BUG!
                }
            }
            """;

        System.out.println("Loop warnings: " + detectInfiniteLoopPattern(buggyCode));

        // Test safe countdown
        List<Integer> result = safeCountdown(5);
        System.out.println("Safe countdown result: " + result);
    }
}`,
          description: 'Debugging utilities to detect and prevent infinite loops',
        },
      ],
    },
  },
  {
    id: 'bugfix-state-mutation',
    title: 'Fix State Mutation in React',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Meta', 'Amazon'],
    description: 'Fix direct state mutation causing component not to re-render',
    tags: ['react', 'state', 'mutation', 'immutability'],
    estimatedTime: 15,
    problemStatement: `This React component tries to add items to a todo list, but the UI doesn't update. Fix the state mutation issue.`,
    buggyCode: {
      javascript: `function TodoList() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    todos.push({ text, completed: false });
    setTodos(todos);
  };

  return (/*...*/);
}`,
      typescript: `function TodoList() {
  const [todos, setTodos] = useState<Array<{text: string, completed: boolean}>>([]);

  const addTodo = (text: string) => {
    todos.push({ text, completed: false });
    setTodos(todos);
  };

  return (/*...*/);
}`,
      python: `# Python example with observable pattern
class TodoList:
    def __init__(self):
        self.todos = []
        self.observers = []

    def add_todo(self, text):
        # BUG: Direct mutation doesn't notify observers
        self.todos.append({'text': text, 'completed': False})
        self.notify_observers(self.todos)  # Same reference!

    def notify_observers(self, todos):
        # Observers check reference equality, won't update
        for observer in self.observers:
            observer.update(todos)`,
      java: `// TodoListManager.java - State mutation bug with observers
import java.util.*;

public class TodoListManager {
    private List<Todo> todos = new ArrayList<>();
    private List<TodoObserver> observers = new ArrayList<>();

    public void addTodo(String text) {
        // BUG: Direct mutation doesn't trigger observer updates
        todos.add(new Todo(text, false));
        notifyObservers(todos); // Same reference!
    }

    private void notifyObservers(List<Todo> todos) {
        // Observers check reference equality, won't detect change
        for (TodoObserver observer : observers) {
            observer.onTodosChanged(todos);
        }
    }
}`,
    },
    expectedBehavior: 'Should create new array instead of mutating, triggering re-render',
    bugDescription: 'Direct array mutation prevents React from detecting state changes',
    hints: [
      'React uses shallow comparison to detect state changes',
      'Mutating the array and passing the same reference doesn\'t trigger re-render',
      'Create a new array using spread operator or concat',
    ],
    testCases: [
      {
        input: 'Add todo "Buy milk"',
        expected: 'UI updates to show new todo',
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: 'components/TodoList.jsx',
          content: `import React, { useState } from 'react';
import { TodoItem } from './TodoItem';

export function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Build a project', completed: false }
  ]);
  const [inputText, setInputText] = useState('');

  // BUG: Direct array mutation doesn't trigger re-render
  const addTodo = (text) => {
    const newTodo = {
      id: Date.now(),
      text,
      completed: false
    };

    // BUG: This mutates the array in place
    todos.push(newTodo);
    setTodos(todos); // Same reference, React doesn't detect change!

    setInputText('');
  };

  // This has the same bug
  const toggleTodo = (id) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed; // BUG: Direct mutation
      setTodos(todos); // Same reference, no re-render!
    }
  };

  // This also has the bug
  const deleteTodo = (id) => {
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos.splice(index, 1); // BUG: Mutates array
      setTodos(todos); // Same reference, no re-render!
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      addTodo(inputText.trim());
    }
  };

  return (
    <div className="todo-list">
      <h1>My Todo List</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Add a new todo..."
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        ))}
      </ul>

      <div className="stats">
        <p>Total: {todos.length}</p>
        <p>Completed: {todos.filter(t => t.completed).length}</p>
      </div>
    </div>
  );
}`,
          description: 'TodoList component with state mutation bugs - UI does not update',
        },
        {
          fileName: 'components/TodoItem.jsx',
          content: `import React from 'react';

export function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={todo.completed ? 'completed' : ''}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </li>
  );
}`,
          description: 'TodoItem child component that displays individual todos',
        },
        {
          fileName: 'tests/TodoList.test.jsx',
          content: `import { render, screen, fireEvent } from '@testing-library/react';
import { TodoList } from '../components/TodoList';

describe('TodoList State Mutation Bug', () => {
  test('demonstrates bug - new todos do not appear in UI', () => {
    render(<TodoList />);

    // Initial state: 2 todos
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    // Add a new todo
    const input = screen.getByPlaceholderText('Add a new todo...');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Buy milk' } });
    fireEvent.click(addButton);

    // BUG: UI does not update!
    // This assertion FAILS because the component doesn't re-render
    expect(screen.getAllByRole('listitem')).toHaveLength(3); // FAILS!

    // We still see only 2 items because React didn't detect the change
    expect(screen.getAllByRole('listitem')).toHaveLength(2); // Actual behavior

    // The todo was added to the array (in memory) but UI doesn't show it
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });

  test('demonstrates toggle bug - checkboxes do not update', () => {
    render(<TodoList />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];

    // Initially unchecked
    expect(firstCheckbox).not.toBeChecked();

    // Click to toggle
    fireEvent.click(firstCheckbox);

    // BUG: Checkbox does not update in UI
    expect(firstCheckbox).toBeChecked(); // FAILS!
    expect(firstCheckbox).not.toBeChecked(); // Still unchecked in UI
  });

  test('demonstrates delete bug - items do not disappear', () => {
    render(<TodoList />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    // Click delete on first item
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    // BUG: Item does not disappear from UI
    expect(screen.getAllByRole('listitem')).toHaveLength(1); // FAILS!
    expect(screen.getAllByRole('listitem')).toHaveLength(2); // Still 2 items
  });

  test('explains why the bug happens', () => {
    // The bug occurs because:
    const originalArray = [{ id: 1, text: 'Item 1' }];

    // Mutating the array
    originalArray.push({ id: 2, text: 'Item 2' });

    // The reference is still the same
    const sameArray = originalArray;
    expect(originalArray === sameArray).toBe(true);

    // React uses Object.is() for comparison (similar to ===)
    // Since the reference didn't change, React thinks nothing changed
    // So it doesn't re-render

    // Correct approach: create new array
    const newArray = [...originalArray, { id: 3, text: 'Item 3' }];
    expect(originalArray === newArray).toBe(false); // Different reference!
  });
});`,
          description: 'Tests using React Testing Library showing mutation bugs',
        },
        {
          fileName: 'examples/stateMutationExamples.jsx',
          content: `import React, { useState } from 'react';

// Example 1: WRONG - Direct mutation
export function TodoListBuggy() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    todos.push({ text, completed: false }); // WRONG: Mutates array
    setTodos(todos); // Same reference, no re-render
  };

  // UI won't update!
  return (/*...*/);
}

// Example 2: CORRECT - Create new array
export function TodoListFixed() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    // Method 1: Spread operator
    setTodos([...todos, { text, completed: false }]); // ✓ New array

    // Method 2: concat
    // setTodos(todos.concat({ text, completed: false })); // ✓ New array

    // Method 3: Array.from with modification
    // setTodos(Array.from(todos).concat({ text, completed: false })); // ✓
  };

  // UI updates correctly!
  return (/*...*/);
}

// Example 3: Toggle with mutation (WRONG)
export function toggleTodoBuggy(todos, setTodos, id) {
  const todo = todos.find(t => t.id === id);
  todo.completed = !todo.completed; // WRONG: Mutates object
  setTodos(todos); // No re-render
}

// Example 4: Toggle immutably (CORRECT)
export function toggleTodoFixed(todos, setTodos, id) {
  setTodos(todos.map(todo =>
    todo.id === id
      ? { ...todo, completed: !todo.completed } // New object
      : todo
  ));
}

// Example 5: Delete with mutation (WRONG)
export function deleteTodoBuggy(todos, setTodos, id) {
  const index = todos.findIndex(t => t.id === id);
  todos.splice(index, 1); // WRONG: Mutates array
  setTodos(todos); // No re-render
}

// Example 6: Delete immutably (CORRECT)
export function deleteTodoFixed(todos, setTodos, id) {
  setTodos(todos.filter(todo => todo.id !== id)); // New array
}

// Example 7: Why this matters - React's comparison
function ReactComparison() {
  // React uses Object.is() which is similar to ===

  const arr1 = [1, 2, 3];
  const arr2 = arr1;
  arr2.push(4);

  console.log(arr1 === arr2); // true - same reference!
  // React sees this as "no change" and doesn't re-render

  const arr3 = [1, 2, 3];
  const arr4 = [...arr3, 4];

  console.log(arr3 === arr4); // false - different references!
  // React sees this as "changed" and re-renders
}`,
          description: 'Examples showing wrong vs correct state updates in React',
        },
      ],
      typescript: [
        {
          fileName: 'components/TodoList.tsx',
          content: `import React, { useState } from 'react';
import { TodoItem } from './TodoItem';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Build a project', completed: false }
  ]);
  const [inputText, setInputText] = useState('');

  // BUG: Direct array mutation doesn't trigger re-render
  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: Date.now(),
      text,
      completed: false
    };

    // BUG: This mutates the array in place
    todos.push(newTodo);
    setTodos(todos); // Same reference, React doesn't detect change!

    setInputText('');
  };

  const toggleTodo = (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed; // BUG: Direct mutation
      setTodos(todos); // Same reference, no re-render!
    }
  };

  const deleteTodo = (id: number) => {
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos.splice(index, 1); // BUG: Mutates array
      setTodos(todos); // Same reference, no re-render!
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      addTodo(inputText.trim());
    }
  };

  return (
    <div className="todo-list">
      <h1>My Todo List</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Add a new todo..."
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        ))}
      </ul>

      <div className="stats">
        <p>Total: {todos.length}</p>
        <p>Completed: {todos.filter(t => t.completed).length}</p>
      </div>
    </div>
  );
}`,
          description: 'TodoList component with state mutation bugs - UI does not update',
        },
        {
          fileName: 'components/TodoItem.tsx',
          content: `import React from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <li className={todo.completed ? 'completed' : ''}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </li>
  );
}`,
          description: 'TodoItem child component that displays individual todos',
        },
        {
          fileName: 'tests/TodoList.test.tsx',
          content: `import { render, screen, fireEvent } from '@testing-library/react';
import { TodoList } from '../components/TodoList';

describe('TodoList State Mutation Bug', () => {
  test('demonstrates bug - new todos do not appear in UI', () => {
    render(<TodoList />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    const input = screen.getByPlaceholderText('Add a new todo...');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Buy milk' } });
    fireEvent.click(addButton);

    // BUG: UI does not update!
    expect(screen.getAllByRole('listitem')).toHaveLength(3); // FAILS!
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });

  test('explains why the bug happens', () => {
    const originalArray = [{ id: 1, text: 'Item 1' }];
    originalArray.push({ id: 2, text: 'Item 2' });

    const sameArray = originalArray;
    expect(originalArray === sameArray).toBe(true);

    // React doesn't detect the change because reference is the same
    const newArray = [...originalArray, { id: 3, text: 'Item 3' }];
    expect(originalArray === newArray).toBe(false); // Different reference!
  });
});`,
          description: 'Tests using React Testing Library showing mutation bugs',
        },
      ],
      python: [
        {
          fileName: 'models/todo_list.py',
          content: `from typing import List, Dict, Callable

class TodoList:
    """TodoList with observer pattern showing state mutation bug"""

    def __init__(self):
        self.todos: List[Dict] = [
            {'id': 1, 'text': 'Learn Python', 'completed': False},
            {'id': 2, 'text': 'Build a project', 'completed': False}
        ]
        self.observers: List[Callable] = []
        self._last_notified_reference = None

    def add_observer(self, observer: Callable):
        self.observers.append(observer)

    def add_todo(self, text: str) -> None:
        """BUG: Direct mutation doesn't trigger observer updates"""
        import time
        new_todo = {
            'id': int(time.time() * 1000),
            'text': text,
            'completed': False
        }

        # BUG: This mutates the list in place
        self.todos.append(new_todo)
        self.notify_observers(self.todos)  # Same reference!

    def toggle_todo(self, todo_id: int) -> None:
        """BUG: Direct mutation of todo object"""
        todo = next((t for t in self.todos if t['id'] == todo_id), None)
        if todo:
            todo['completed'] = not todo['completed']  # BUG: Direct mutation
            self.notify_observers(self.todos)  # Same reference!

    def delete_todo(self, todo_id: int) -> None:
        """BUG: Direct mutation using remove"""
        todo = next((t for t in self.todos if t['id'] == todo_id), None)
        if todo:
            self.todos.remove(todo)  # BUG: Mutates list
            self.notify_observers(self.todos)  # Same reference!

    def notify_observers(self, todos: List[Dict]) -> None:
        """Observers check reference equality, won't detect change"""
        # Check if reference changed
        if self._last_notified_reference is todos:
            # Same reference - observers might not update
            print("WARNING: Same reference - observers may not update!")

        self._last_notified_reference = todos

        for observer in self.observers:
            observer(todos)`,
          description: 'TodoList with observer pattern showing state mutation bugs',
        },
        {
          fileName: 'ui/todo_display.py',
          content: `from models.todo_list import TodoList

class TodoDisplay:
    """UI component that observes TodoList"""

    def __init__(self, todo_list: TodoList):
        self.todo_list = todo_list
        self.last_todos_reference = None
        self.render_count = 0

        # Subscribe to changes
        todo_list.add_observer(self.on_todos_changed)

    def on_todos_changed(self, todos):
        """BUG: Won't detect changes if reference is the same"""
        # Check if reference changed
        if self.last_todos_reference is todos:
            print(f"Display NOT updated - same reference (todos: {len(todos)})")
            return  # No re-render because reference didn't change!

        print(f"Display updated - new reference (todos: {len(todos)})")
        self.last_todos_reference = todos
        self.render_count += 1

    def demonstrate_bug(self):
        """Shows the state mutation bug in action"""
        print(f"\\nInitial render count: {self.render_count}")
        print(f"Initial todos: {len(self.todo_list.todos)}")

        # Try to add a todo
        self.todo_list.add_todo("Buy milk")
        print(f"After adding todo - render count: {self.render_count}")
        print(f"Actual todos in list: {len(self.todo_list.todos)}")

        # The list was updated, but display wasn't re-rendered!
        # This demonstrates the React state mutation bug in Python

    def demonstrate_fix(self):
        """Shows the correct way to notify changes"""
        print("\\n--- Using Fixed Version ---")

        # Create a new list reference
        self.todo_list.todos = [*self.todo_list.todos]
        self.todo_list.notify_observers(self.todo_list.todos)

        print(f"After fix - render count: {self.render_count}")`,
          description: 'UI component that observes todo list and demonstrates update bug',
        },
        {
          fileName: 'tests/test_state_mutation.py',
          content: `import unittest
from models.todo_list import TodoList
from ui.todo_display import TodoDisplay

class TestStateMutationBug(unittest.TestCase):
    def setUp(self):
        self.todo_list = TodoList()

    def test_mutation_same_reference(self):
        """Demonstrates that mutation keeps the same reference"""
        original_ref = self.todo_list.todos

        # Mutate the list
        self.todo_list.todos.append({'id': 3, 'text': 'Test', 'completed': False})

        # Reference is the same!
        self.assertIs(self.todo_list.todos, original_ref)
        self.assertEqual(len(self.todo_list.todos), 3)

    def test_new_list_different_reference(self):
        """Shows that creating new list changes reference"""
        original_ref = self.todo_list.todos

        # Create new list
        self.todo_list.todos = [*self.todo_list.todos, {'id': 3, 'text': 'Test', 'completed': False}]

        # Reference is different!
        self.assertIsNot(self.todo_list.todos, original_ref)
        self.assertEqual(len(self.todo_list.todos), 3)

    def test_display_not_updated_on_mutation(self):
        """Demonstrates the bug - display doesn't update"""
        display = TodoDisplay(self.todo_list)

        initial_renders = display.render_count

        # Add todo (which mutates in place)
        self.todo_list.add_todo("Buy milk")

        # Display was NOT updated because reference didn't change
        self.assertEqual(display.render_count, initial_renders)

        # But the todo was actually added to the list!
        self.assertEqual(len(self.todo_list.todos), 3)

if __name__ == '__main__':
    unittest.main()`,
          description: 'Tests demonstrating state mutation bugs in Python',
        },
      ],
      java: [
        {
          fileName: 'models/TodoListManager.java',
          content: `// TodoList manager with observer pattern showing state mutation bug
package models;

import java.util.*;

public class TodoListManager {
    public static class Todo {
        public long id;
        public String text;
        public boolean completed;

        public Todo(long id, String text, boolean completed) {
            this.id = id;
            this.text = text;
            this.completed = completed;
        }
    }

    public interface TodoObserver {
        void onTodosChanged(List<Todo> todos);
    }

    private List<Todo> todos;
    private List<TodoObserver> observers;
    private List<Todo> lastNotifiedReference;

    public TodoListManager() {
        this.todos = new ArrayList<>();
        this.observers = new ArrayList<>();

        // Initial todos
        todos.add(new Todo(1, "Learn Java", false));
        todos.add(new Todo(2, "Build a project", false));
    }

    public void addObserver(TodoObserver observer) {
        observers.add(observer);
    }

    // BUG: Direct mutation doesn't trigger observer updates
    public void addTodo(String text) {
        Todo newTodo = new Todo(System.currentTimeMillis(), text, false);

        // BUG: This mutates the list in place
        todos.add(newTodo);
        notifyObservers(todos);  // Same reference!
    }

    // BUG: Direct mutation of todo object
    public void toggleTodo(long todoId) {
        Todo todo = todos.stream()
            .filter(t -> t.id == todoId)
            .findFirst()
            .orElse(null);

        if (todo != null) {
            todo.completed = !todo.completed;  // BUG: Direct mutation
            notifyObservers(todos);  // Same reference, no update!
        }
    }

    // BUG: Direct mutation using remove
    public void deleteTodo(long todoId) {
        todos.removeIf(t -> t.id == todoId);  // BUG: Mutates list
        notifyObservers(todos);  // Same reference!
    }

    private void notifyObservers(List<Todo> todos) {
        // Check if reference changed
        if (lastNotifiedReference == todos) {
            System.out.println("WARNING: Same reference - observers may not update!");
        }

        lastNotifiedReference = todos;

        for (TodoObserver observer : observers) {
            observer.onTodosChanged(todos);
        }
    }

    public List<Todo> getTodos() {
        return todos;
    }
}`,
          description: 'TodoList manager with observer pattern showing state mutation bugs',
        },
        {
          fileName: 'ui/TodoDisplay.java',
          content: `// UI component that observes TodoList
package ui;

import models.TodoListManager;
import models.TodoListManager.Todo;
import models.TodoListManager.TodoObserver;
import java.util.List;

public class TodoDisplay implements TodoObserver {
    private TodoListManager todoList;
    private List<Todo> lastTodosReference;
    private int renderCount;

    public TodoDisplay(TodoListManager todoList) {
        this.todoList = todoList;
        this.lastTodosReference = null;
        this.renderCount = 0;

        // Subscribe to changes
        todoList.addObserver(this);
    }

    @Override
    public void onTodosChanged(List<Todo> todos) {
        // BUG: Won't detect changes if reference is the same
        // Check if reference changed using identity comparison
        if (lastTodosReference == todos) {
            System.out.println("Display NOT updated - same reference (todos: " + todos.size() + ")");
            return;  // No re-render because reference didn't change!
        }

        System.out.println("Display updated - new reference (todos: " + todos.size() + ")");
        lastTodosReference = todos;
        renderCount++;
    }

    public void demonstrateBug() {
        System.out.println("\\nInitial render count: " + renderCount);
        System.out.println("Initial todos: " + todoList.getTodos().size());

        // Try to add a todo
        todoList.addTodo("Buy milk");
        System.out.println("After adding todo - render count: " + renderCount);
        System.out.println("Actual todos in list: " + todoList.getTodos().size());

        // The list was updated, but display wasn't re-rendered!
        // This demonstrates the React state mutation bug in Java
    }

    public void demonstrateFix() {
        System.out.println("\\n--- Using Fixed Version ---");

        // Create a new list reference
        List<Todo> newList = new ArrayList<>(todoList.getTodos());
        // This would trigger update because it's a new reference
        onTodosChanged(newList);

        System.out.println("After fix - render count: " + renderCount);
    }

    public int getRenderCount() {
        return renderCount;
    }
}`,
          description: 'UI component that observes todo list and demonstrates update bug',
        },
        {
          fileName: 'tests/StateMutationTest.java',
          content: `// Tests demonstrating state mutation bugs
package tests;

import models.TodoListManager;
import models.TodoListManager.Todo;
import ui.TodoDisplay;
import java.util.*;

public class StateMutationTest {

    public static void testMutationSameReference() {
        System.out.println("\\n=== Test: Mutation Same Reference ===");

        TodoListManager todoList = new TodoListManager();
        List<Todo> originalRef = todoList.getTodos();

        // Mutate the list
        todoList.getTodos().add(new Todo(3, "Test", false));

        // Reference is the same!
        boolean sameReference = (todoList.getTodos() == originalRef);
        System.out.println("Same reference after mutation: " + sameReference);
        System.out.println("Todo count: " + todoList.getTodos().size());

        assert sameReference : "Reference should be the same after mutation";
        assert todoList.getTodos().size() == 3 : "Should have 3 todos";
    }

    public static void testNewListDifferentReference() {
        System.out.println("\\n=== Test: New List Different Reference ===");

        TodoListManager todoList = new TodoListManager();
        List<Todo> originalRef = todoList.getTodos();

        // Create new list (this would be the fix)
        List<Todo> newList = new ArrayList<>(todoList.getTodos());
        newList.add(new Todo(3, "Test", false));

        // Reference is different!
        boolean differentReference = (newList != originalRef);
        System.out.println("Different reference with new list: " + differentReference);
        System.out.println("New list todo count: " + newList.size());

        assert differentReference : "Reference should be different";
        assert newList.size() == 3 : "Should have 3 todos";
    }

    public static void testDisplayNotUpdatedOnMutation() {
        System.out.println("\\n=== Test: Display Not Updated on Mutation ===");

        TodoListManager todoList = new TodoListManager();
        TodoDisplay display = new TodoDisplay(todoList);

        int initialRenders = display.getRenderCount();

        // Add todo (which mutates in place)
        todoList.addTodo("Buy milk");

        // Display was NOT updated because reference didn't change
        System.out.println("Initial renders: " + initialRenders);
        System.out.println("Current renders: " + display.getRenderCount());
        System.out.println("Actual todo count: " + todoList.getTodos().size());

        assert display.getRenderCount() == initialRenders :
            "Render count should not increase due to mutation";

        // But the todo was actually added to the list!
        assert todoList.getTodos().size() == 3 : "Should have 3 todos";
    }

    public static void main(String[] args) {
        testMutationSameReference();
        testNewListDifferentReference();
        testDisplayNotUpdatedOnMutation();

        System.out.println("\\n=== All tests completed ===");
    }
}`,
          description: 'Tests demonstrating state mutation bugs in Java',
        },
      ],
    },
  },
  {
    id: 'bugfix-promise-error-handling',
    title: 'Fix Unhandled Promise Rejection',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Google', 'Amazon'],
    description: 'Add proper error handling to prevent unhandled promise rejections',
    tags: ['promises', 'error-handling', 'async'],
    estimatedTime: 15,
    problemStatement: `This function makes an API call but doesn't handle errors, causing unhandled promise rejections. Fix it.`,
    buggyCode: {
      javascript: `async function loadUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
}`,
      typescript: `async function loadUserData(userId: string) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
}`,
      python: `async def loadUserData(userId):
    response = await fetch(f'/api/users/{userId}')
    data = await response.json()
    return data`,
      java: `// UserDataLoader.java - Missing error handling
import java.net.http.*;
import com.google.gson.*;

public class UserDataLoader {
    private static final HttpClient client = HttpClient.newHttpClient();
    private static final Gson gson = new Gson();

    public static User loadUserData(String userId) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("/api/users/" + userId))
            .build();

        // BUG: No error handling for failed requests
        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        // BUG: Doesn't check status code before parsing
        return gson.fromJson(response.body(), User.class);
    }
}`,
    },
    expectedBehavior: 'Should handle network errors and invalid responses gracefully',
    bugDescription: 'Missing try-catch and response validation',
    hints: [
      'Wrap async code in try-catch',
      'Check response.ok before parsing JSON',
      'Provide meaningful error messages',
    ],
    testCases: [
      {
        input: 'Valid userId',
        expected: 'Returns user data',
      },
      {
        input: 'Invalid userId (404 response)',
        expected: 'Throws/returns error without crashing',
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: 'components/UserProfile.jsx',
          content: `import React, { useState, useEffect } from 'react';
import { loadUserData } from '../api/apiClient';

export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BUG: No error handling for promise rejection
    const fetchUser = async () => {
      setLoading(true);
      const data = await loadUserData(userId); // Can throw!
      setUser(data);
      setLoading(false);
    };

    fetchUser(); // Unhandled promise rejection if this fails!
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  // BUG: If loadUserData fails, user stays null and app crashes here
  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Bio: {user.bio}</p>
    </div>
  );
}`,
          description: 'UserProfile component with no error handling for async data loading',
        },
        {
          fileName: 'api/apiClient.js',
          content: `// BUG: No error handling in API calls
export async function loadUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);

  // BUG: Doesn't check if response is ok (200-299)
  // Will fail on 404, 500, etc. when trying to parse JSON
  const data = await response.json();

  return data;
}

export async function updateUserProfile(userId, updates) {
  const response = await fetch(\`/api/users/\${userId}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  // BUG: Same issue - no response validation
  return await response.json();
}

export async function deleteUser(userId) {
  const response = await fetch(\`/api/users/\${userId}\`, {
    method: 'DELETE'
  });

  // BUG: No error handling
  return await response.json();
}

// Example of what happens when these fail:
// loadUserData('invalid-id')
//   -> fetch returns 404
//   -> response.json() tries to parse error HTML as JSON
//   -> Throws "Unexpected token < in JSON"
//   -> Unhandled promise rejection!`,
          description: 'API client with no error handling or response validation',
        },
        {
          fileName: 'components/ErrorBoundary.jsx',
          content: `import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// NOTE: ErrorBoundary only catches errors in render/lifecycle methods
// It does NOT catch:
// - Errors in event handlers
// - Async errors (setTimeout, promises)
// - Errors in the error boundary itself
//
// So our unhandled promise rejections will NOT be caught!`,
          description: 'ErrorBoundary component - but it cannot catch async errors',
        },
        {
          fileName: 'tests/promiseErrorHandling.test.jsx',
          content: `import { render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from '../components/UserProfile';
import { loadUserData } from '../api/apiClient';

// Mock the API
jest.mock('../api/apiClient');

describe('Promise Error Handling Bugs', () => {
  test('demonstrates unhandled rejection on 404', async () => {
    // Mock API to simulate 404 error
    loadUserData.mockRejectedValue(new Error('User not found'));

    // Set up listener for unhandled rejections
    const unhandledRejections = [];
    const handler = (event) => {
      unhandledRejections.push(event.reason);
    };
    window.addEventListener('unhandledrejection', handler);

    // Render component
    render(<UserProfile userId="invalid-id" />);

    // Wait a bit for the promise to reject
    await waitFor(() => {}, { timeout: 100 });

    // BUG: Unhandled promise rejection occurred!
    expect(unhandledRejections.length).toBeGreaterThan(0);
    expect(unhandledRejections[0].message).toBe('User not found');

    window.removeEventListener('unhandledrejection', handler);
  });

  test('demonstrates component crash on null data', async () => {
    // Mock successful API call
    loadUserData.mockResolvedValue({
      name: 'John Doe',
      email: 'john@example.com',
      bio: 'Developer'
    });

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Now simulate a failed API call
    loadUserData.mockRejectedValue(new Error('Network error'));

    // Re-render with different userId
    const { rerender } = render(<UserProfile userId="456" />);

    // BUG: Component crashes because user is null
    // This test would throw an error without proper error handling
  });

  test('shows proper error handling approach', async () => {
    // Example of correct error handling:
    const fetchWithErrorHandling = async (userId) => {
      try {
        const data = await loadUserData(userId);
        return { success: true, data };
      } catch (error) {
        console.error('Failed to load user:', error);
        return { success: false, error: error.message };
      }
    };

    loadUserData.mockRejectedValue(new Error('User not found'));

    const result = await fetchWithErrorHandling('invalid');

    expect(result.success).toBe(false);
    expect(result.error).toBe('User not found');
    // No unhandled rejection!
  });

  test('demonstrates response validation bug', async () => {
    // Simulate what the buggy code does with a 404 response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.reject(new Error('Unexpected token < in JSON'))
      })
    );

    try {
      // This is what happens inside loadUserData
      const response = await fetch('/api/users/123');
      const data = await response.json(); // Throws!
      // Never gets here
    } catch (error) {
      expect(error.message).toBe('Unexpected token < in JSON');
    }
  });
});`,
          description: 'Tests demonstrating unhandled promise rejections and their consequences',
        },
      ],
      typescript: [
        {
          fileName: 'components/UserProfile.tsx',
          content: `import React, { useState, useEffect } from 'react';
import { loadUserData, User } from '../api/apiClient';

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BUG: No error handling for promise rejection
    const fetchUser = async () => {
      setLoading(true);
      const data = await loadUserData(userId); // Can throw!
      setUser(data);
      setLoading(false);
    };

    fetchUser(); // Unhandled promise rejection if this fails!
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  // BUG: If loadUserData fails, user stays null and app crashes here
  return (
    <div className="user-profile">
      <h1>{user!.name}</h1>
      <p>Email: {user!.email}</p>
      <p>Bio: {user!.bio}</p>
    </div>
  );
}`,
          description: 'UserProfile component with no error handling for async data loading',
        },
        {
          fileName: 'api/apiClient.ts',
          content: `export interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
}

// BUG: No error handling in API calls
export async function loadUserData(userId: string): Promise<User> {
  const response = await fetch(\`/api/users/\${userId}\`);

  // BUG: Doesn't check if response is ok (200-299)
  // Will fail on 404, 500, etc. when trying to parse JSON
  const data = await response.json();

  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<User> {
  const response = await fetch(\`/api/users/\${userId}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  // BUG: Same issue - no response validation
  return await response.json();
}

// Fixed version with proper error handling:
export async function loadUserDataFixed(userId: string): Promise<User> {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load user data:', error);
    throw new Error(\`Failed to load user: \${error instanceof Error ? error.message : 'Unknown error'}\`);
  }
}`,
          description: 'API client with no error handling or response validation',
        },
        {
          fileName: 'tests/promiseErrorHandling.test.ts',
          content: `import { loadUserData, User } from '../api/apiClient';

describe('Promise Error Handling Bugs', () => {
  test('demonstrates unhandled rejection', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as Response)
    );

    // This will cause an unhandled promise rejection
    try {
      await loadUserData('123');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('shows proper error handling', async () => {
    const fetchWithErrorHandling = async (userId: string): Promise<{ success: boolean; data?: User; error?: string }> => {
      try {
        const data = await loadUserData(userId);
        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    };

    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network error'))
    );

    const result = await fetchWithErrorHandling('123');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});`,
          description: 'Tests demonstrating unhandled promise rejections',
        },
      ],
      python: [
        {
          fileName: 'api/api_client.py',
          content: `import aiohttp
import asyncio
from typing import Dict, Any

class APIClient:
    """API client with missing error handling"""

    def __init__(self, base_url: str):
        self.base_url = base_url

    async def load_user_data(self, user_id: str) -> Dict[str, Any]:
        """BUG: No error handling for failed requests"""
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/users/{user_id}") as response:
                # BUG: Doesn't check response status
                # Will fail on 404, 500, etc.
                data = await response.json()
                return data

    async def load_user_data_fixed(self, user_id: str) -> Dict[str, Any]:
        """Fixed version with proper error handling"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/users/{user_id}") as response:
                    # Check status code
                    if response.status != 200:
                        raise ValueError(f"HTTP error! status: {response.status}")

                    data = await response.json()
                    return data
        except aiohttp.ClientError as e:
            raise Exception(f"Failed to load user: {str(e)}")
        except Exception as e:
            raise Exception(f"Unexpected error: {str(e)}")`,
          description: 'Python async API client showing missing error handling',
        },
        {
          fileName: 'tests/test_promise_errors.py',
          content: `import pytest
import asyncio
from unittest.mock import Mock, patch
from api.api_client import APIClient

class TestPromiseErrorHandling:
    @pytest.mark.asyncio
    async def test_unhandled_error(self):
        """Demonstrates unhandled error in async function"""
        client = APIClient("http://api.example.com")

        # Mock a failed response
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = Mock()
            mock_response.status = 404
            mock_response.json = Mock(side_effect=ValueError("Invalid JSON"))
            mock_get.return_value.__aenter__.return_value = mock_response

            # BUG: This raises an unhandled exception
            with pytest.raises(ValueError):
                await client.load_user_data("invalid-id")

    @pytest.mark.asyncio
    async def test_proper_error_handling(self):
        """Shows proper error handling approach"""
        client = APIClient("http://api.example.com")

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = Mock()
            mock_response.status = 404
            mock_get.return_value.__aenter__.return_value = mock_response

            # Fixed version handles errors properly
            with pytest.raises(Exception) as exc_info:
                await client.load_user_data_fixed("invalid-id")

            assert "HTTP error" in str(exc_info.value)`,
          description: 'Python tests showing async error handling',
        },
      ],
      java: [
        {
          fileName: 'api/ApiClient.java',
          content: `// API client with missing error handling
package api;

import java.net.http.*;
import java.net.URI;
import java.io.IOException;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import models.User;

public class ApiClient {
    private static final HttpClient client = HttpClient.newHttpClient();
    private static final Gson gson = new Gson();

    // BUG: No error handling in API calls
    public User loadUserData(String userId) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId))
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        // BUG: Doesn't check if response is ok (200-299)
        // Will fail on 404, 500, etc. when trying to parse JSON
        User data = gson.fromJson(response.body(), User.class);

        return data;
    }

    public User updateUserProfile(String userId, User updates)
            throws IOException, InterruptedException {
        String jsonBody = gson.toJson(updates);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId))
            .PUT(HttpRequest.BodyPublishers.ofString(jsonBody))
            .header("Content-Type", "application/json")
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        // BUG: No validation of response status
        return gson.fromJson(response.body(), User.class);
    }

    public void deleteUser(String userId) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId))
            .DELETE()
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        // BUG: Doesn't throw error on failure
        // Caller has no way to know if delete succeeded
    }

    // Example of what happens with the buggy code
    public static void demonstrateBug() {
        ApiClient client = new ApiClient();

        try {
            // This will throw JsonSyntaxException when server returns 404 HTML page
            User user = client.loadUserData("invalid-id");
            System.out.println("Got user: " + user.name);
        } catch (IOException | InterruptedException e) {
            System.out.println("Network error: " + e.getMessage());
        } catch (JsonSyntaxException e) {
            // BUG: Gets here when trying to parse HTML error page as JSON
            System.out.println("JSON parsing failed - probably got error HTML: " + e.getMessage());
        }
    }
}`,
          description: 'API client with no error handling for HTTP status codes',
        },
        {
          fileName: 'ui/UserProfileView.java',
          content: `// User profile view with poor error handling
package ui;

import api.ApiClient;
import models.User;
import java.util.concurrent.CompletableFuture;

public class UserProfileView {
    private ApiClient apiClient;
    private User currentUser;
    private boolean loading;
    private String errorMessage;

    public UserProfileView() {
        this.apiClient = new ApiClient();
        this.loading = false;
    }

    // BUG: No error handling for promise rejection
    public void loadUser(String userId) {
        loading = true;

        CompletableFuture.supplyAsync(() -> {
            try {
                return apiClient.loadUserData(userId); // Can throw!
            } catch (Exception e) {
                // BUG: Exception is swallowed, not propagated
                System.err.println("Error loading user: " + e.getMessage());
                return null;
            }
        }).thenAccept(user -> {
            currentUser = user;
            loading = false;
            // BUG: If user is null, we don't set an error state
            // UI will try to render null user and crash
        });
        // BUG: Exception in async chain is not handled!
    }

    public void updateProfile(String userId, User updates) {
        CompletableFuture.runAsync(() -> {
            try {
                apiClient.updateUserProfile(userId, updates);
                // BUG: Doesn't check if update succeeded
                // BUG: Doesn't refresh user data after update
            } catch (Exception e) {
                // BUG: Error is logged but not shown to user
                System.err.println("Update failed: " + e.getMessage());
            }
        });
        // No error handling for the CompletableFuture itself!
    }

    // Attempting to render when currentUser might be null
    public String render() {
        if (loading) {
            return "<div>Loading...</div>";
        }

        // BUG: If loadUserData fails, currentUser stays null and this crashes
        return String.format("""
            <div class="user-profile">
                <h1>%s</h1>
                <p>Email: %s</p>
                <p>Bio: %s</p>
            </div>
            """, currentUser.name, currentUser.email, currentUser.bio);
        // NullPointerException when currentUser is null!
    }

    // Fixed version shows proper error handling
    public void loadUserFixed(String userId) {
        loading = true;
        errorMessage = null;

        CompletableFuture.supplyAsync(() -> {
            try {
                return apiClient.loadUserData(userId);
            } catch (Exception e) {
                throw new RuntimeException("Failed to load user: " + e.getMessage(), e);
            }
        }).thenAccept(user -> {
            currentUser = user;
            loading = false;
        }).exceptionally(ex -> {
            // Properly handle errors
            errorMessage = ex.getMessage();
            loading = false;
            currentUser = null;
            return null;
        });
    }

    public String renderFixed() {
        if (loading) {
            return "<div>Loading...</div>";
        }

        if (errorMessage != null) {
            return "<div class='error'>" + errorMessage + "</div>";
        }

        if (currentUser == null) {
            return "<div>No user data</div>";
        }

        return String.format("""
            <div class="user-profile">
                <h1>%s</h1>
                <p>Email: %s</p>
                <p>Bio: %s</p>
            </div>
            """, currentUser.name, currentUser.email, currentUser.bio);
    }
}`,
          description: 'User profile view with poor async error handling',
        },
        {
          fileName: 'tests/ApiClientTest.java',
          content: `// Tests demonstrating error handling issues
package tests;

import api.ApiClient;
import models.User;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import com.google.gson.JsonSyntaxException;

public class ApiClientTest {

    @Test
    public void testBuggyLoadUserDataWithInvalidId() {
        ApiClient client = new ApiClient();

        // BUG: This throws JsonSyntaxException instead of a meaningful error
        // because the API returns HTML error page, not JSON
        assertThrows(JsonSyntaxException.class, () -> {
            client.loadUserData("invalid-id");
        });

        // The exception message is unhelpful:
        // "Expected BEGIN_OBJECT but was STRING at line 1 column 1"
        // Should instead say "User not found" or similar
    }

    @Test
    public void testBuggyUpdateWithServerError() {
        ApiClient client = new ApiClient();
        User updates = new User("1", "Updated Name", "updated@email.com", "New bio");

        // BUG: When server returns 500, this throws JsonSyntaxException
        // instead of properly indicating server error
        assertThrows(Exception.class, () -> {
            client.updateUserProfile("1", updates);
        });
    }

    @Test
    public void demonstrateProperErrorHandling() {
        // This shows what proper error handling should look like:

        class FixedApiClient {
            private final HttpClient client = HttpClient.newHttpClient();
            private final Gson gson = new Gson();

            public User loadUserData(String userId) throws IOException, InterruptedException {
                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.example.com/users/" + userId))
                    .build();

                HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString());

                // FIXED: Check status code first
                if (response.statusCode() == 404) {
                    throw new IllegalArgumentException("User not found: " + userId);
                } else if (response.statusCode() >= 400) {
                    throw new IOException("HTTP error " + response.statusCode() +
                        ": " + response.body());
                }

                // FIXED: Only parse JSON if we got a success status
                try {
                    return gson.fromJson(response.body(), User.class);
                } catch (JsonSyntaxException e) {
                    throw new IOException("Invalid JSON response", e);
                }
            }
        }

        // Now errors are clear and meaningful
        FixedApiClient fixedClient = new FixedApiClient();
        Exception ex = assertThrows(IllegalArgumentException.class, () -> {
            fixedClient.loadUserData("invalid-id");
        });
        assertTrue(ex.getMessage().contains("User not found"));
    }
}`,
          description: 'Tests showing error handling problems and solutions',
        },
      ],
    },
  },
  // ==================== COMPREHENSIVE MULTI-FILE BUG FIX SCENARIOS ====================
  {
    id: 'bugfix-react-state-race-condition',
    title: 'Fix Race Condition in React Component',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Meta', 'Netflix', 'Airbnb'],
    description: 'Debug a race condition in a React component with multiple async calls',
    tags: ['react', 'async', 'race-condition', 'hooks'],
    estimatedTime: 25,
    problemStatement: `A user dashboard component is experiencing race conditions when fetching user data and preferences. Sometimes old data overwrites newer data. Debug and fix the issue across multiple files.`,
    buggyCode: {
      javascript: `// UserDashboard.jsx - Main component with race condition
import React, { useState, useEffect } from 'react';
import { fetchUserData } from './api/userApi';
import { UserProfile } from './components/UserProfile';
import { UserPreferences } from './components/UserPreferences';

export function UserDashboard({ userId }) {
  const [userData, setUserData] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // BUG: Race condition - these async calls can complete in any order
    fetchUserData(userId).then(data => {
      setUserData(data);
    });

    fetchUserPreferences(userId).then(prefs => {
      setPreferences(prefs);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <UserProfile user={userData} />
      <UserPreferences preferences={preferences} />
    </div>
  );
}`,
      python: `# user_dashboard.py - Race condition in async data fetching
import asyncio
from api.user_api import fetch_user_data, fetch_user_preferences

class UserDashboard:
    def __init__(self, user_id):
        self.user_id = user_id
        self.user_data = None
        self.preferences = None
        self.loading = True

    async def load_data(self):
        """BUG: Race condition - tasks can complete in any order"""
        self.loading = True

        # BUG: These run concurrently but update state independently
        # If user_id changes during loading, we might show old data
        asyncio.create_task(self._load_user_data(self.user_id))
        asyncio.create_task(self._load_preferences(self.user_id))

    async def _load_user_data(self, user_id):
        data = await fetch_user_data(user_id)
        self.user_data = data  # BUG: Might be for old user_id

    async def _load_preferences(self, user_id):
        prefs = await fetch_user_preferences(user_id)
        self.preferences = prefs  # BUG: Might be for old user_id
        self.loading = False`,
      java: `// UserDashboard.java - Race condition in async data loading
import java.util.concurrent.CompletableFuture;
import api.UserApi;
import models.User;
import models.UserPreferences;

public class UserDashboard {
    private String userId;
    private User userData;
    private UserPreferences preferences;
    private boolean loading;

    public UserDashboard(String userId) {
        this.userId = userId;
        this.loading = true;
    }

    // BUG: Race condition - async calls can complete in any order
    public void loadData() {
        loading = true;

        // BUG: These run independently, can complete in wrong order
        CompletableFuture.supplyAsync(() -> {
            try {
                return UserApi.fetchUserData(userId);
            } catch (Exception e) {
                return null;
            }
        }).thenAccept(data -> {
            this.userData = data; // BUG: Might be for old userId
        });

        CompletableFuture.supplyAsync(() -> {
            try {
                return UserApi.fetchUserPreferences(userId);
            } catch (Exception e) {
                return null;
            }
        }).thenAccept(prefs -> {
            this.preferences = prefs; // BUG: Might be for old userId
            this.loading = false;
        });
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'api/userApi.js',
          content: `// API functions for user data
export async function fetchUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  // Simulated delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
  return response.json();
}

export async function fetchUserPreferences(userId) {
  const response = await fetch(\`/api/users/\${userId}/preferences\`);
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
  return response.json();
}`,
          description: 'API functions with variable latency causing race conditions',
        },
        {
          fileName: 'components/UserProfile.jsx',
          content: `// User profile display component
import React from 'react';

export function UserProfile({ user }) {
  if (!user) return null;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
      <p>Joined: {user.joinedDate}</p>
    </div>
  );
}`,
          description: 'Component that displays user profile data',
        },
        {
          fileName: 'components/UserPreferences.jsx',
          content: `// User preferences display component
import React from 'react';

export function UserPreferences({ preferences }) {
  if (!preferences) return null;

  return (
    <div className="user-preferences">
      <h3>Preferences</h3>
      <ul>
        <li>Theme: {preferences.theme}</li>
        <li>Notifications: {preferences.notifications ? 'On' : 'Off'}</li>
        <li>Language: {preferences.language}</li>
      </ul>
    </div>
  );
}`,
          description: 'Component that displays user preferences',
        },
      ],
      python: [
        {
          fileName: 'api/user_api.py',
          content: `# API functions for user data
import asyncio
import random

async def fetch_user_data(user_id):
    """Fetch user data with variable latency"""
    # Simulated delay
    await asyncio.sleep(random.random())
    return {
        'id': user_id,
        'name': f'User {user_id}',
        'email': f'user{user_id}@example.com',
        'joinedDate': '2024-01-01'
    }

async def fetch_user_preferences(user_id):
    """Fetch user preferences with variable latency"""
    await asyncio.sleep(random.random() * 0.5)
    return {
        'theme': 'dark',
        'notifications': True,
        'language': 'en'
    }`,
          description: 'API functions with variable latency causing race conditions',
        },
        {
          fileName: 'ui/user_dashboard_view.py',
          content: `# User dashboard view component
class UserDashboardView:
    def __init__(self, user_data, preferences):
        self.user_data = user_data
        self.preferences = preferences

    def render(self):
        """Render the dashboard"""
        if not self.user_data:
            return "No user data"

        html = f"""
        <div class="user-profile">
            <h2>{self.user_data.get('name', 'N/A')}</h2>
            <p>Email: {self.user_data.get('email', 'N/A')}</p>
            <p>Joined: {self.user_data.get('joinedDate', 'N/A')}</p>
        </div>
        """

        if self.preferences:
            html += f"""
            <div class="user-preferences">
                <h3>Preferences</h3>
                <ul>
                    <li>Theme: {self.preferences.get('theme', 'N/A')}</li>
                    <li>Notifications: {'On' if self.preferences.get('notifications') else 'Off'}</li>
                    <li>Language: {self.preferences.get('language', 'N/A')}</li>
                </ul>
            </div>
            """

        return html`,
          description: 'View component for rendering user dashboard',
        },
        {
          fileName: 'tests/test_race_condition.py',
          content: `# Tests demonstrating race condition
import asyncio
import pytest
from api.user_api import fetch_user_data, fetch_user_preferences

@pytest.mark.asyncio
async def test_race_condition_scenario():
    """Demonstrates the race condition bug"""
    user_id = "user1"

    # BUG: These can complete in any order
    task1 = asyncio.create_task(fetch_user_data(user_id))
    task2 = asyncio.create_task(fetch_user_preferences(user_id))

    # If we change user_id here, previous tasks might still update state
    user_id = "user2"

    # The tasks from user1 might complete after we've moved to user2
    result1 = await task1  # Returns data for user1
    result2 = await task2  # Returns data for user1

    # But we're now expecting data for user2!
    # This is the race condition

@pytest.mark.asyncio
async def test_fixed_version():
    """Shows proper handling with cancellation"""
    user_id = "user1"

    # Create tasks
    task1 = asyncio.create_task(fetch_user_data(user_id))
    task2 = asyncio.create_task(fetch_user_preferences(user_id))

    # Simulate user changing
    user_id = "user2"

    # FIXED: Cancel old tasks
    task1.cancel()
    task2.cancel()

    # Start new tasks
    new_task1 = asyncio.create_task(fetch_user_data(user_id))
    new_task2 = asyncio.create_task(fetch_user_preferences(user_id))

    # Now we only get data for user2
    result1 = await new_task1
    result2 = await new_task2

    assert result1['id'] == user_id
    assert result2 is not None`,
          description: 'Tests showing race condition and fix',
        },
      ],
      java: [
        {
          fileName: 'api/UserApi.java',
          content: `// API functions for user data
package api;

import models.User;
import models.UserPreferences;
import java.util.concurrent.CompletableFuture;
import java.util.Random;

public class UserApi {
    private static final Random random = new Random();

    public static CompletableFuture<User> fetchUserData(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Simulated variable delay
                Thread.sleep((long)(random.nextDouble() * 1000));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            return new User(
                userId,
                "User " + userId,
                "user" + userId + "@example.com",
                "2024-01-01"
            );
        });
    }

    public static CompletableFuture<UserPreferences> fetchUserPreferences(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Simulated variable delay
                Thread.sleep((long)(random.nextDouble() * 500));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            return new UserPreferences("dark", true, "en");
        });
    }
}`,
          description: 'API functions with variable latency causing race conditions',
        },
        {
          fileName: 'ui/UserDashboardView.java',
          content: `// User dashboard view component
package ui;

import models.User;
import models.UserPreferences;

public class UserDashboardView {
    private User userData;
    private UserPreferences preferences;

    public UserDashboardView(User userData, UserPreferences preferences) {
        this.userData = userData;
        this.preferences = preferences;
    }

    public String render() {
        if (userData == null) {
            return "No user data";
        }

        StringBuilder html = new StringBuilder();
        html.append(String.format("""
            <div class="user-profile">
                <h2>%s</h2>
                <p>Email: %s</p>
                <p>Joined: %s</p>
            </div>
            """, userData.name, userData.email, userData.joinedDate));

        if (preferences != null) {
            html.append(String.format("""
                <div class="user-preferences">
                    <h3>Preferences</h3>
                    <ul>
                        <li>Theme: %s</li>
                        <li>Notifications: %s</li>
                        <li>Language: %s</li>
                    </ul>
                </div>
                """, preferences.theme,
                preferences.notifications ? "On" : "Off",
                preferences.language));
        }

        return html.toString();
    }
}`,
          description: 'View component for rendering user dashboard',
        },
        {
          fileName: 'tests/RaceConditionTest.java',
          content: `// Tests demonstrating race condition
package tests;

import api.UserApi;
import models.User;
import models.UserPreferences;
import org.junit.jupiter.api.Test;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

public class RaceConditionTest {

    @Test
    public void testRaceConditionScenario() throws Exception {
        // Demonstrates the race condition bug
        AtomicReference<String> currentUserId = new AtomicReference<>("user1");

        // BUG: These can complete in any order
        CompletableFuture<User> userFuture =
            UserApi.fetchUserData(currentUserId.get());
        CompletableFuture<UserPreferences> prefFuture =
            UserApi.fetchUserPreferences(currentUserId.get());

        // Simulate user changing while requests are in flight
        Thread.sleep(100);
        currentUserId.set("user2");

        // The futures from user1 might complete after we've moved to user2
        User user = userFuture.get(); // Returns data for user1
        UserPreferences prefs = prefFuture.get(); // Returns data for user1

        // But we're now expecting data for user2!
        // This is the race condition
        assertNotEquals(currentUserId.get(), user.id);
    }

    @Test
    public void testFixedVersion() throws Exception {
        // Shows proper handling with cancellation
        AtomicReference<String> currentUserId = new AtomicReference<>("user1");

        // Create futures
        CompletableFuture<User> userFuture =
            UserApi.fetchUserData(currentUserId.get());
        CompletableFuture<UserPreferences> prefFuture =
            UserApi.fetchUserPreferences(currentUserId.get());

        // Simulate user changing
        Thread.sleep(100);
        currentUserId.set("user2");

        // FIXED: Cancel old futures
        userFuture.cancel(true);
        prefFuture.cancel(true);

        // Start new futures
        CompletableFuture<User> newUserFuture =
            UserApi.fetchUserData(currentUserId.get());
        CompletableFuture<UserPreferences> newPrefFuture =
            UserApi.fetchUserPreferences(currentUserId.get());

        // Now we only get data for user2
        User user = newUserFuture.get();
        UserPreferences prefs = newPrefFuture.get();

        assertEquals(currentUserId.get(), user.id);
        assertNotNull(prefs);
    }
}`,
          description: 'Tests showing race condition and fix',
        },
      ],
    },
    expectedBehavior: 'Data should load correctly regardless of API response timing, and switching users should cancel previous requests',
    bugDescription: 'Race condition in async data fetching - old data can overwrite new data when userId changes quickly',
    hints: [
      'Use Promise.all() to wait for all async operations',
      'Implement cleanup in useEffect to handle component unmounting or userId changes',
      'Consider using AbortController to cancel in-flight requests',
      'Store userId in a ref to compare against when data arrives',
    ],
    testCases: [
      {
        input: 'Rapidly switch between different userIds',
        expected: 'Only data for the current userId is displayed',
      },
      {
        input: 'Load user with slow API response',
        expected: 'Loading state until both API calls complete',
      },
    ],
  },
  {
    id: 'bugfix-ecommerce-cart-memory-leak',
    title: 'Fix Memory Leak in Shopping Cart',
    type: 'bugfix',
    difficulty: 'hard',
    companies: ['Amazon', 'Shopify', 'Walmart'],
    description: 'Find and fix memory leaks in an e-commerce shopping cart system',
    tags: ['memory-leak', 'event-listeners', 'javascript', 'performance'],
    estimatedTime: 30,
    problemStatement: `An e-commerce shopping cart system has memory leaks causing the browser to slow down over time. Users report that after adding/removing items multiple times, the page becomes sluggish. Debug the cart system across multiple files.`,
    buggyCode: {
      javascript: `// ShoppingCart.js - Main cart manager with memory leaks
class ShoppingCart {
  constructor() {
    this.items = [];
    this.listeners = [];
    this.itemElements = new Map();

    // BUG: Event listener never removed
    window.addEventListener('storage', this.syncWithLocalStorage.bind(this));

    // BUG: Interval never cleared
    this.priceUpdateInterval = setInterval(() => {
      this.updatePrices();
    }, 5000);
  }

  addItem(item) {
    this.items.push(item);
    this.renderItem(item);
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  removeItem(itemId) {
    this.items = this.items.filter(item => item.id !== itemId);
    // BUG: Element not removed from Map, causing memory leak
    const element = this.itemElements.get(itemId);
    if (element) {
      element.remove();
    }
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  renderItem(item) {
    const element = document.createElement('div');
    element.className = 'cart-item';
    element.innerHTML = \`
      <span>\${item.name}</span>
      <span>$\${item.price}</span>
      <button data-id="\${item.id}">Remove</button>
    \`;

    // BUG: Event listener added but never cleaned up
    const removeBtn = element.querySelector('button');
    removeBtn.addEventListener('click', () => {
      this.removeItem(item.id);
    });

    this.itemElements.set(item.id, element);
    document.getElementById('cart-items').appendChild(element);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    // BUG: No unsubscribe function returned
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.items));
  }

  syncWithLocalStorage(event) {
    if (event.key === 'cart') {
      this.items = JSON.parse(event.newValue || '[]');
      this.renderAllItems();
    }
  }

  saveToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(this.items));
  }

  updatePrices() {
    // Fetch latest prices from API
    fetch('/api/prices')
      .then(res => res.json())
      .then(prices => {
        this.items.forEach(item => {
          if (prices[item.id]) {
            item.price = prices[item.id];
          }
        });
        this.renderAllItems();
      });
  }

  renderAllItems() {
    document.getElementById('cart-items').innerHTML = '';
    // BUG: Old elements not properly cleaned from Map
    this.items.forEach(item => this.renderItem(item));
  }
}`,
      python: `# shopping_cart.py - Cart manager with memory leaks
import threading
import json

class ShoppingCart:
    def __init__(self):
        self.items = []
        self.listeners = []
        self.item_elements = {}

        # BUG: Timer never stopped
        self.price_update_timer = threading.Timer(5.0, self._update_prices_loop)
        self.price_update_timer.start()

    def add_item(self, item):
        self.items.append(item)
        self._notify_listeners()

    def remove_item(self, item_id):
        self.items = [item for item in self.items if item['id'] != item_id]
        # BUG: Element not removed from dict, causing memory leak
        self._notify_listeners()

    def subscribe(self, callback):
        self.listeners.append(callback)
        # BUG: No unsubscribe mechanism

    def _notify_listeners(self):
        for listener in self.listeners:
            listener(self.items)

    def _update_prices_loop(self):
        """BUG: Runs forever, never cleaned up"""
        self._update_prices()
        self.price_update_timer = threading.Timer(5.0, self._update_prices_loop)
        self.price_update_timer.start()

    def _update_prices(self):
        # Update prices (simplified)
        pass`,
      java: `// ShoppingCart.java - Cart manager with memory leaks
import java.util.*;
import java.util.concurrent.*;

public class ShoppingCart {
    private List<CartItem> items;
    private List<CartListener> listeners;
    private Map<String, Object> itemElements;
    private ScheduledExecutorService scheduler;
    private ScheduledFuture<?> priceUpdateTask;

    public ShoppingCart() {
        this.items = new ArrayList<>();
        this.listeners = new ArrayList<>();
        this.itemElements = new HashMap<>();

        // BUG: Scheduler never shut down
        this.scheduler = Executors.newScheduledThreadPool(1);
        this.priceUpdateTask = scheduler.scheduleAtFixedRate(
            () -> updatePrices(),
            5, 5, TimeUnit.SECONDS
        );
    }

    public void addItem(CartItem item) {
        items.add(item);
        notifyListeners();
    }

    public void removeItem(String itemId) {
        items.removeIf(item -> item.getId().equals(itemId));
        // BUG: Element not removed from Map, causing memory leak
        notifyListeners();
    }

    public void subscribe(CartListener callback) {
        listeners.add(callback);
        // BUG: No unsubscribe mechanism
    }

    private void notifyListeners() {
        for (CartListener listener : listeners) {
            listener.onCartChanged(new ArrayList<>(items));
        }
    }

    private void updatePrices() {
        // BUG: This runs forever, scheduler never shut down
        // Fetch latest prices (simplified)
    }

    // Missing: cleanup method to stop scheduler and clear listeners
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'CartUI.js',
          content: `// Cart UI component
export class CartUI {
  constructor(cart) {
    this.cart = cart;
    this.updateCartCount();

    // Subscribe to cart changes
    cart.subscribe((items) => {
      this.updateCartCount();
      this.updateTotalPrice(items);
    });
  }

  updateCartCount() {
    const badge = document.getElementById('cart-count');
    if (badge) {
      badge.textContent = this.cart.items.length;
    }
  }

  updateTotalPrice(items) {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const totalElement = document.getElementById('cart-total');
    if (totalElement) {
      totalElement.textContent = \`$\${total.toFixed(2)}\`;
    }
  }
}`,
          description: 'UI component that subscribes to cart changes',
        },
        {
          fileName: 'ProductPage.js',
          content: `// Product page that creates cart instances
export class ProductPage {
  constructor() {
    this.currentCart = null;
  }

  init() {
    // BUG: Creates new cart instance without cleaning up old one
    this.currentCart = new ShoppingCart();
    new CartUI(this.currentCart);

    this.attachEventListeners();
  }

  attachEventListeners() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const product = this.getProductFromElement(e.target);
        this.currentCart.addItem(product);
      });
    });
  }

  getProductFromElement(element) {
    const card = element.closest('.product-card');
    return {
      id: card.dataset.productId,
      name: card.querySelector('.product-name').textContent,
      price: parseFloat(card.querySelector('.product-price').textContent),
    };
  }

  destroy() {
    // BUG: No cleanup of cart or event listeners
  }
}`,
          description: 'Product page that instantiates shopping cart',
        },
      ],
      python: [
        {
          fileName: 'cart_ui.py',
          content: `# Cart UI component
class CartUI:
    def __init__(self, cart):
        self.cart = cart
        self.update_cart_count()

        # BUG: Subscribe to cart changes but never unsubscribe
        cart.subscribe(lambda items: self.on_cart_changed(items))

    def update_cart_count(self):
        count = len(self.cart.items)
        print(f"Cart count: {count}")

    def on_cart_changed(self, items):
        """Called when cart changes"""
        self.update_cart_count()
        self.update_total_price(items)

    def update_total_price(self, items):
        total = sum(item.get('price', 0) for item in items)
        print(f"Total: \${total:.2f}")`,
          description: 'UI component that subscribes to cart changes without cleanup',
        },
        {
          fileName: 'product_page.py',
          content: `# Product page that creates cart instances
from shopping_cart import ShoppingCart
from cart_ui import CartUI

class ProductPage:
    def __init__(self):
        self.current_cart = None

    def init(self):
        # BUG: Creates new cart instance without cleaning up old one
        self.current_cart = ShoppingCart()
        self.cart_ui = CartUI(self.current_cart)

        # Old cart and timer still running in background!

    def navigate_away(self):
        # BUG: No cleanup - timer keeps running
        # listeners keep accumulating
        pass`,
          description: 'Page that creates cart instances without proper cleanup',
        },
        {
          fileName: 'tests/test_memory_leak.py',
          content: `# Tests to detect memory leaks
import unittest
import gc
import sys
from shopping_cart import ShoppingCart
from cart_ui import CartUI

class TestMemoryLeaks(unittest.TestCase):
    def test_cart_listener_leak(self):
        """Demonstrates listener accumulation"""
        cart = ShoppingCart()
        initial_listeners = len(cart.listeners)

        # Create multiple UIs
        for i in range(10):
            ui = CartUI(cart)
            # BUG: UI is garbage collected but listener remains

        gc.collect()

        # Listeners keep growing!
        self.assertEqual(len(cart.listeners), initial_listeners + 10)
        # This demonstrates the leak - listeners never cleaned up

    def test_timer_leak(self):
        """Shows timer continues running"""
        cart = ShoppingCart()
        # Timer starts in constructor

        # Simulate cart going out of scope
        cart = None
        gc.collect()

        # BUG: Timer still running in background!
        # No way to stop it

if __name__ == '__main__':
    unittest.main()`,
          description: 'Tests that demonstrate memory leaks',
        },
      ],
      java: [
        {
          fileName: 'ui/CartUI.java',
          content: `// Cart UI component
package ui;

import models.ShoppingCart;
import models.CartItem;
import models.CartListener;
import java.util.List;

public class CartUI {
    private ShoppingCart cart;

    public CartUI(ShoppingCart cart) {
        this.cart = cart;
        updateCartCount();

        // BUG: Subscribe to cart changes but never unsubscribe
        cart.subscribe(new CartListener() {
            @Override
            public void onCartChanged(List<CartItem> items) {
                CartUI.this.onCartChanged(items);
            }
        });
    }

    private void updateCartCount() {
        System.out.println("Cart count: " + cart.getItems().size());
    }

    private void onCartChanged(List<CartItem> items) {
        updateCartCount();
        updateTotalPrice(items);
    }

    private void updateTotalPrice(List<CartItem> items) {
        double total = items.stream()
            .mapToDouble(item -> item.getPrice())
            .sum();
        System.out.printf("Total: $%.2f%n", total);
    }

    // Missing: cleanup/dispose method to unsubscribe
}`,
          description: 'UI component that subscribes to cart changes without cleanup',
        },
        {
          fileName: 'pages/ProductPage.java',
          content: `// Product page that creates cart instances
package pages;

import models.ShoppingCart;
import ui.CartUI;

public class ProductPage {
    private ShoppingCart currentCart;
    private CartUI cartUI;

    public void init() {
        // BUG: Creates new cart instance without cleaning up old one
        if (currentCart != null) {
            // Old cart's scheduler keeps running!
            // Old listeners accumulate!
        }

        currentCart = new ShoppingCart();
        cartUI = new CartUI(currentCart);

        // Old cart and scheduler still running in background!
    }

    public void navigateAway() {
        // BUG: No cleanup
        // Scheduler keeps running
        // Listeners keep accumulating
        // Memory leak!
    }

    // Missing: cleanup method to stop scheduler and clear listeners
}`,
          description: 'Page that creates cart instances without proper cleanup',
        },
        {
          fileName: 'tests/MemoryLeakTest.java',
          content: `// Tests to detect memory leaks
package tests;

import models.ShoppingCart;
import models.CartItem;
import ui.CartUI;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class MemoryLeakTest {

    @Test
    public void testCartListenerLeak() {
        // Demonstrates listener accumulation
        ShoppingCart cart = new ShoppingCart();
        int initialListeners = cart.getListenerCount();

        // Create multiple UIs
        for (int i = 0; i < 10; i++) {
            CartUI ui = new CartUI(cart);
            // BUG: UI can be garbage collected but listener remains
        }

        System.gc(); // Suggest garbage collection

        // Listeners keep growing!
        assertEquals(initialListeners + 10, cart.getListenerCount());
        // This demonstrates the leak - listeners never cleaned up
    }

    @Test
    public void testSchedulerLeak() {
        // Shows scheduler continues running
        ShoppingCart cart = new ShoppingCart();
        // Scheduler starts in constructor

        // Get thread count before
        int threadsBefore = Thread.activeCount();

        // Simulate cart going out of scope
        cart = null;
        System.gc();

        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // BUG: Scheduler thread still running!
        // Thread count hasn't decreased
        int threadsAfter = Thread.activeCount();
        assertTrue(threadsAfter >= threadsBefore,
            "Scheduler thread still running after cart disposed");
    }
}`,
          description: 'Tests that demonstrate memory leaks',
        },
      ],
    },
    expectedBehavior: 'Cart should properly clean up event listeners, intervals, and DOM references when items are removed or cart is destroyed',
    bugDescription: 'Multiple memory leaks: unreleased event listeners, uncanceled intervals, orphaned DOM references in Map, and missing unsubscribe functionality',
    hints: [
      'Add a destroy() method to ShoppingCart that cleans up intervals and event listeners',
      'Return an unsubscribe function from the subscribe() method',
      'Clear itemElements Map entries when removing items',
      'Use AbortController or event listener removal in ProductPage',
      'Consider using WeakMap for element references',
    ],
    testCases: [
      {
        input: 'Add and remove 100 items repeatedly',
        expected: 'Memory usage stays relatively constant',
      },
      {
        input: 'Navigate away from page',
        expected: 'All intervals and event listeners are cleaned up',
      },
    ],
  },
  {
    id: 'bugfix-api-service-error-handling',
    title: 'Fix Error Handling in Microservice API',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Google', 'Amazon', 'Microsoft'],
    description: 'Debug error handling issues in a Node.js microservice API',
    tags: ['node.js', 'api', 'error-handling', 'async'],
    estimatedTime: 25,
    problemStatement: `A microservice API has poor error handling causing crashes and inconsistent error responses. Fix the error handling across the service layer, controller, and middleware.`,
    buggyCode: {
      javascript: `// userController.js - Controller with poor error handling
const UserService = require('./services/UserService');

class UserController {
  async getUser(req, res) {
    const { userId } = req.params;

    // BUG: No try-catch, unhandled promise rejection
    const user = await UserService.getUserById(userId);

    if (!user) {
      // BUG: Inconsistent error response format
      res.status(404).send('User not found');
      return;
    }

    res.json(user);
  }

  async createUser(req, res) {
    const userData = req.body;

    // BUG: Validation errors not caught
    const newUser = await UserService.createUser(userData);

    // BUG: Success but no status code set
    res.json(newUser);
  }

  async updateUser(req, res) {
    const { userId } = req.params;
    const updates = req.body;

    try {
      const updatedUser = await UserService.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      // BUG: Generic error handling, loses error details
      res.status(500).json({ error: 'Something went wrong' });
    }
  }

  async deleteUser(req, res) {
    const { userId } = req.params;

    await UserService.deleteUser(userId);

    // BUG: No status code, no error handling
    res.send();
  }
}

module.exports = new UserController();`,
      python: `# user_controller.py - Controller with poor error handling
from services.user_service import UserService

class UserController:
    def __init__(self):
        self.service = UserService()

    async def get_user(self, request):
        user_id = request.params.get('userId')

        # BUG: No try-except, unhandled exception
        user = await self.service.get_user_by_id(user_id)

        if not user:
            # BUG: Inconsistent error response format
            return {'error': 'User not found'}, 404

        return user, 200

    async def create_user(self, request):
        user_data = request.json

        # BUG: Validation errors not caught
        new_user = await self.service.create_user(user_data)

        # BUG: Success but no status code set
        return new_user

    async def delete_user(self, request):
        user_id = request.params.get('userId')

        await self.service.delete_user(user_id)

        # BUG: No status code, no error handling
        return {}`,
      java: `// UserController.java - Controller with poor error handling
package controllers;

import services.UserService;
import models.User;
import javax.ws.rs.*;
import javax.ws.rs.core.Response;

@Path("/users")
public class UserController {
    private UserService userService = new UserService();

    @GET
    @Path("/{userId}")
    public Response getUser(@PathParam("userId") String userId) throws Exception {
        // BUG: No try-catch, throws exception to caller
        User user = userService.getUserById(userId);

        if (user == null) {
            // BUG: Inconsistent error response format
            return Response.status(404).entity("User not found").build();
        }

        return Response.ok(user).build();
    }

    @POST
    public Response createUser(User userData) throws Exception {
        // BUG: Validation errors not caught
        User newUser = userService.createUser(userData);

        // BUG: Success but should return 201 Created
        return Response.ok(newUser).build();
    }

    @PUT
    @Path("/{userId}")
    public Response updateUser(@PathParam("userId") String userId, User updates) {
        try {
            User updatedUser = userService.updateUser(userId, updates);
            return Response.ok(updatedUser).build();
        } catch (Exception error) {
            // BUG: Generic error handling, loses error details
            return Response.status(500)
                .entity("{\"error\": \"Something went wrong\"}")
                .build();
        }
    }

    @DELETE
    @Path("/{userId}")
    public Response deleteUser(@PathParam("userId") String userId) throws Exception {
        userService.deleteUser(userId);

        // BUG: No status code (should be 204 No Content)
        return Response.ok().build();
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'services/UserService.js',
          content: `// UserService.js - Service layer with various error conditions
const db = require('../database');

class UserService {
  async getUserById(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // BUG: Database errors not wrapped properly
    const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    return user.rows[0];
  }

  async createUser(userData) {
    // BUG: No validation
    if (!userData.email) {
      throw new Error('Email required');
    }

    // BUG: Duplicate email error not handled specially
    const result = await db.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [userData.name, userData.email]
    );

    return result.rows[0];
  }

  async updateUser(userId, updates) {
    const user = await this.getUserById(userId);

    if (!user) {
      // BUG: Throws generic Error instead of specific NotFoundError
      throw new Error('User not found');
    }

    const result = await db.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [updates.name, updates.email, userId]
    );

    return result.rows[0];
  }

  async deleteUser(userId) {
    // BUG: No check if user exists
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
  }
}

module.exports = new UserService();`,
          description: 'Service layer with database operations and validation',
        },
        {
          fileName: 'middleware/errorHandler.js',
          content: `// errorHandler.js - Incomplete error handling middleware
function errorHandler(err, req, res, next) {
  console.error(err);

  // BUG: All errors get 500 status
  res.status(500).json({
    error: err.message
  });

  // BUG: Sensitive error details exposed in production
  // BUG: No error type differentiation
  // BUG: No logging to error tracking service
}

module.exports = errorHandler;`,
          description: 'Express error handling middleware',
        },
        {
          fileName: 'routes/userRoutes.js',
          content: `// userRoutes.js - Route definitions
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

router.get('/users/:userId', UserController.getUser);
router.post('/users', UserController.createUser);
router.put('/users/:userId', UserController.updateUser);
router.delete('/users/:userId', UserController.deleteUser);

module.exports = router;`,
          description: 'Express route definitions',
        },
      ],
      python: [
        {
          fileName: 'services/user_service.py',
          content: `# user_service.py - Service layer with various error conditions
from database import db

class UserService:
    async def get_user_by_id(self, user_id):
        if not user_id:
            raise ValueError('User ID is required')

        # BUG: Database errors not wrapped properly
        user = await db.query('SELECT * FROM users WHERE id = $1', [user_id])
        return user[0] if user else None

    async def create_user(self, user_data):
        # BUG: No validation
        if not user_data.get('email'):
            raise ValueError('Email required')

        # BUG: Duplicate email error not handled specially
        result = await db.query(
            'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
            [user_data.get('name'), user_data.get('email')]
        )
        return result[0]

    async def update_user(self, user_id, updates):
        # BUG: No check if user exists
        result = await db.query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
            [updates.get('name'), updates.get('email'), user_id]
        )
        return result[0] if result else None

    async def delete_user(self, user_id):
        # BUG: No check if user exists, no return value
        await db.query('DELETE FROM users WHERE id = $1', [user_id])`,
          description: 'Service layer with poor error handling',
        },
        {
          fileName: 'middleware/error_handler.py',
          content: `# error_handler.py - Error handling middleware
def error_handler(app):
    @app.errorhandler(Exception)
    def handle_error(error):
        # BUG: All errors return 500
        # BUG: Exposes full error message (security risk)
        return {
            'error': str(error),
            'type': type(error).__name__
        }, 500

    # BUG: No differentiation between error types
    # BUG: No logging
    # BUG: Stack traces exposed in production`,
          description: 'Error handling middleware with security issues',
        },
        {
          fileName: 'tests/test_error_handling.py',
          content: `# test_error_handling.py - Tests for error handling
import pytest
from user_controller import UserController

class TestErrorHandling:
    def test_missing_user_returns_404(self):
        """BUG: This test fails - no proper error handling"""
        controller = UserController()

        # Should return 404, but might crash instead
        # response = await controller.get_user({'params': {'userId': 'invalid'}})
        # assert response[1] == 404

    def test_duplicate_email_handling(self):
        """BUG: Doesn't differentiate duplicate key errors"""
        # Should return 409 Conflict
        # Actually returns generic 500

    def test_validation_errors(self):
        """BUG: No consistent validation error format"""
        # Should return 400 Bad Request with details
        # Actually might crash or return inconsistent format`,
          description: 'Tests showing error handling issues',
        },
      ],
      java: [
        {
          fileName: 'services/UserService.java',
          content: `// UserService.java - Service layer with various error conditions
package services;

import models.User;
import database.Database;
import java.sql.*;
import java.util.List;

public class UserService {
    private Database db = new Database();

    public User getUserById(String userId) throws Exception {
        if (userId == null || userId.isEmpty()) {
            throw new IllegalArgumentException("User ID is required");
        }

        // BUG: Database errors not wrapped properly
        List<User> users = db.query("SELECT * FROM users WHERE id = ?", userId);
        return users.isEmpty() ? null : users.get(0);
    }

    public User createUser(User userData) throws Exception {
        // BUG: No validation
        if (userData.getEmail() == null) {
            throw new IllegalArgumentException("Email required");
        }

        // BUG: Duplicate email error not handled specially
        // SQLException with specific error code should be caught
        List<User> result = db.query(
            "INSERT INTO users (name, email) VALUES (?, ?) RETURNING *",
            userData.getName(), userData.getEmail()
        );
        return result.get(0);
    }

    public User updateUser(String userId, User updates) throws Exception {
        // BUG: No check if user exists
        List<User> result = db.query(
            "UPDATE users SET name = ?, email = ? WHERE id = ? RETURNING *",
            updates.getName(), updates.getEmail(), userId
        );
        return result.isEmpty() ? null : result.get(0);
    }

    public void deleteUser(String userId) throws Exception {
        // BUG: No check if user exists, no indication if anything was deleted
        db.execute("DELETE FROM users WHERE id = ?", userId);
    }
}`,
          description: 'Service layer with poor error handling',
        },
        {
          fileName: 'middleware/ErrorHandler.java',
          content: `// ErrorHandler.java - Error handling middleware
package middleware;

import javax.ws.rs.core.Response;
import javax.ws.rs.ext.ExceptionMapper;
import javax.ws.rs.ext.Provider;
import java.sql.SQLException;

@Provider
public class ErrorHandler implements ExceptionMapper<Exception> {

    @Override
    public Response toResponse(Exception exception) {
        // BUG: All errors return 500
        // BUG: Exposes full error message (security risk)
        String errorMessage = exception.getMessage();
        String stackTrace = getStackTrace(exception);

        // BUG: Stack traces exposed in production
        return Response.status(500)
            .entity(String.format(
                "{\"error\": \"%s\", \"type\": \"%s\", \"stack\": \"%s\"}",
                errorMessage,
                exception.getClass().getName(),
                stackTrace
            ))
            .build();

        // BUG: No differentiation between error types
        // BUG: No logging
        // SQLException, IllegalArgumentException, etc. all return same status
    }

    private String getStackTrace(Exception e) {
        StringBuilder sb = new StringBuilder();
        for (StackTraceElement element : e.getStackTrace()) {
            sb.append(element.toString()).append("\\n");
        }
        return sb.toString();
    }
}`,
          description: 'Error handling middleware with security issues',
        },
        {
          fileName: 'tests/ErrorHandlingTest.java',
          content: `// ErrorHandlingTest.java - Tests for error handling
package tests;

import controllers.UserController;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import javax.ws.rs.core.Response;

public class ErrorHandlingTest {

    @Test
    public void testMissingUserReturns404() {
        // BUG: This test fails - no proper error handling
        UserController controller = new UserController();

        try {
            Response response = controller.getUser("invalid-id");
            // Should return 404, but might throw exception instead
            assertEquals(404, response.getStatus());
        } catch (Exception e) {
            fail("Should not throw exception, should return 404");
        }
    }

    @Test
    public void testDuplicateEmailHandling() {
        // BUG: Doesn't differentiate duplicate key errors
        // Should return 409 Conflict
        // Actually returns generic 500
    }

    @Test
    public void testValidationErrors() {
        // BUG: No consistent validation error format
        // Should return 400 Bad Request with details
        // Actually might throw exception or return inconsistent format
    }

    @Test
    public void testErrorResponseFormat() {
        // BUG: Errors expose stack traces
        // Security risk - internal details leaked
    }
}`,
          description: 'Tests showing error handling issues',
        },
      ],
    },
    expectedBehavior: 'All errors should be properly caught, logged, and returned with appropriate status codes and consistent error response format',
    bugDescription: 'Multiple error handling issues: unhandled promise rejections, inconsistent error responses, missing status codes, poor error differentiation, and security issues',
    hints: [
      'Wrap all async controller methods in try-catch or use async error handling middleware',
      'Create custom error classes (NotFoundError, ValidationError, etc.)',
      'Implement consistent error response format across all endpoints',
      'Add proper HTTP status codes for different error types',
      'Improve errorHandler middleware to differentiate error types',
      'Don\'t expose sensitive error details in production',
    ],
    testCases: [
      {
        input: 'Request non-existent user',
        expected: '404 status with consistent error format',
      },
      {
        input: 'Create user with duplicate email',
        expected: '409 Conflict with appropriate error message',
      },
      {
        input: 'Database connection failure',
        expected: '500 error without exposing internal details',
      },
    ],
  },
];

export function filterScenarios(filters: {
  type?: ScenarioType[];
  difficulty?: DifficultyLevel[];
  companies?: Company[];
  searchQuery?: string;
}): Scenario[] {
  return scenarios.filter((scenario) => {
    if (filters.type && filters.type.length > 0 && !filters.type.includes(scenario.type)) {
      return false;
    }
    if (filters.difficulty && filters.difficulty.length > 0 && !filters.difficulty.includes(scenario.difficulty)) {
      return false;
    }
    if (filters.companies && filters.companies.length > 0) {
      const hasMatchingCompany = filters.companies.some((company) =>
        scenario.companies.includes(company)
      );
      if (!hasMatchingCompany) return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTitle = scenario.title.toLowerCase().includes(query);
      const matchesDescription = scenario.description.toLowerCase().includes(query);
      const matchesTags = scenario.tags.some((tag) => tag.toLowerCase().includes(query));
      if (!matchesTitle && !matchesDescription && !matchesTags) return false;
    }
    return true;
  });
}

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}

