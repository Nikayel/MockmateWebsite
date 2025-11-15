/**
 * Interview scenarios for MockMate
 * Shared between website and extension
 */

export type ScenarioType = 'dsa' | 'bugfix' | 'optimization' | 'security' | 'system-design';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type Company = 'Google' | 'Meta' | 'Amazon' | 'Netflix' | 'Apple' | 'Microsoft' | 'Startup' | 'Generic';

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
      javascript: `async function getUserWithPosts(userId) {
  const user = fetchUser(userId);
  const posts = await fetchUserPosts(user.id);
  return { user, posts };
}`,
      typescript: `async function getUserWithPosts(userId: string) {
  const user = fetchUser(userId);
  const posts = await fetchUserPosts(user.id);
  return { user, posts };
}`,
      python: `async def getUserWithPosts(userId):
    user = fetchUser(userId)  # This should be awaited
    posts = await fetchUserPosts(user.id)
    return {"user": user, "posts": posts}`,
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
        input: '"user123"',
        expectedOutput: 'Returns object with user data and posts array',
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
      javascript: `function createButtons() {
  const buttons = [];
  for (var i = 0; i < 3; i++) {
    buttons.push(function() {
      console.log(i);
    });
  }
  return buttons;
}`,
      typescript: `function createButtons(): Function[] {
  const buttons: Function[] = [];
  for (var i = 0; i < 3; i++) {
    buttons.push(function() {
      console.log(i);
    });
  }
  return buttons;
}`,
      python: `def createButtons():
    buttons = []
    for i in range(3):
        buttons.append(lambda: print(i))
    return buttons`,
    },
    expectedBehavior: 'Each button should log its correct index (0, 1, 2)',
    bugDescription: 'Closure captures the variable i, not its value at each iteration',
    hints: [
      'The issue is with variable scope in the loop',
      'Consider using let instead of var in JavaScript',
      'You could also use an IIFE or pass i as a parameter',
    ],
    testCases: [
      {
        input: 'Call each returned function',
        expectedOutput: 'Logs 0, 1, 2 respectively',
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
      javascript: `function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth });
    }
    window.addEventListener('resize', handleResize);
  }, []);

  return size;
}`,
      typescript: `function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth });
    }
    window.addEventListener('resize', handleResize);
  }, []);

  return size;
}`,
    },
    expectedBehavior: 'Should add AND remove event listener to prevent memory leaks',
    bugDescription: 'Event listener is added but never removed on component unmount',
    hints: [
      'useEffect can return a cleanup function',
      'Cleanup function runs when component unmounts',
      'Use removeEventListener in the cleanup',
    ],
    testCases: [
      {
        input: 'Mount and unmount component multiple times',
        expectedOutput: 'No duplicate event listeners, no memory leak',
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
      javascript: `function addNumbers(a, b) {
  return a + b;
}
// addNumbers("5", 3) returns "53" instead of 8`,
      typescript: `function addNumbers(a: any, b: any) {
  return a + b;
}
// addNumbers("5", 3) returns "53" instead of 8`,
      python: `def addNumbers(a, b):
    return a + b
# addNumbers("5", 3) raises TypeError`,
    },
    expectedBehavior: 'Should always return numeric sum, converting strings to numbers',
    bugDescription: 'String concatenation happens instead of numeric addition',
    hints: [
      'JavaScript + operator behaves differently with strings vs numbers',
      'Convert inputs to numbers explicitly',
      'Use Number(), parseInt(), or the + unary operator',
    ],
    testCases: [
      {
        input: '(5, 3)',
        expectedOutput: '8',
      },
      {
        input: '("5", 3)',
        expectedOutput: '8',
      },
      {
        input: '("5", "3")',
        expectedOutput: '8',
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
        expectedOutput: 'Only shows results for "abc", ignores earlier results',
      },
    ],
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
        expectedOutput: 'Original user.preferences.theme stays "light"',
      },
    ],
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
        expectedOutput: '0.3 (or 0.30)',
      },
      {
        input: '[10.15, 5.99, 2.50]',
        expectedOutput: '18.64',
      },
    ],
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
        expectedOutput: 'Prints 5, 4, 3, 2, 1, 0 and stops',
      },
    ],
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
        expectedOutput: 'UI updates to show new todo',
      },
    ],
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
        expectedOutput: 'Returns user data',
      },
      {
        input: 'Invalid userId (404 response)',
        expectedOutput: 'Throws/returns error without crashing',
      },
    ],
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
        expectedOutput: 'Only data for the current userId is displayed',
      },
      {
        input: 'Load user with slow API response',
        expectedOutput: 'Loading state until both API calls complete',
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
        expectedOutput: 'Memory usage stays relatively constant',
      },
      {
        input: 'Navigate away from page',
        expectedOutput: 'All intervals and event listeners are cleaned up',
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
        expectedOutput: '404 status with consistent error format',
      },
      {
        input: 'Create user with duplicate email',
        expectedOutput: '409 Conflict with appropriate error message',
      },
      {
        input: 'Database connection failure',
        expectedOutput: '500 error without exposing internal details',
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

