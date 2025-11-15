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
  starterCode?: {
    [language: string]: string;
  };
  optimalComplexity: {
    time: string;
    space: string;
  };
}

export interface BugFixScenario extends BaseScenario {
  type: 'bugfix';
  problemStatement: string;
  buggyCode: {
    [language: string]: string;
  };
  expectedBehavior: string;
  bugDescription: string;
  hints: string[];
  testCases: {
    input: string;
    expectedOutput: string;
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
      python: `def twoSum(nums, target):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)',
    },
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
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)',
    },
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
      python: `def maxProfit(prices):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(1)',
    },
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
    title: 'Fix Off-By-One Error in Array Iteration',
    type: 'bugfix',
    difficulty: 'easy',
    companies: ['Generic'],
    description: 'Fix an off-by-one error causing array index out of bounds',
    tags: ['arrays', 'loops', 'debugging'],
    estimatedTime: 10,
    problemStatement: `The following code is supposed to print all adjacent pairs in an array, but it's throwing an error. Find and fix the bug.`,
    buggyCode: {
      javascript: `function printAdjacentPairs(arr) {
  for (let i = 0; i <= arr.length; i++) {
    console.log(arr[i], arr[i + 1]);
  }
}`,
      typescript: `function printAdjacentPairs(arr: number[]): void {
  for (let i = 0; i <= arr.length; i++) {
    console.log(arr[i], arr[i + 1]);
  }
}`,
      python: `def printAdjacentPairs(arr):
    for i in range(len(arr) + 1):
        print(arr[i], arr[i + 1])`,
    },
    expectedBehavior: 'Should print all adjacent pairs without errors',
    bugDescription: 'Off-by-one error in loop condition causes array index out of bounds',
    hints: [
      'Check the loop condition carefully',
      'Think about what happens when i reaches arr.length',
      'Consider how many pairs exist in an array of length n',
    ],
    testCases: [
      {
        input: '[1, 2, 3, 4]',
        expectedOutput: 'Prints: (1,2), (2,3), (3,4) without errors',
      },
    ],
  },
  {
    id: 'bugfix-null-check',
    title: 'Fix Null/Undefined Reference Error',
    type: 'bugfix',
    difficulty: 'easy',
    companies: ['Generic'],
    description: 'Add proper null/undefined checks to prevent runtime errors',
    tags: ['null-safety', 'error-handling', 'defensive-programming'],
    estimatedTime: 10,
    problemStatement: `This function is supposed to get a user's email, but it crashes when the user object is null or doesn't have an email. Fix it.`,
    buggyCode: {
      javascript: `function getUserEmail(user) {
  return user.email.toLowerCase();
}`,
      typescript: `function getUserEmail(user: any): string {
  return user.email.toLowerCase();
}`,
      python: `def getUserEmail(user):
    return user.email.lower()`,
    },
    expectedBehavior: 'Should safely return email or a default value when user/email is null',
    bugDescription: 'Missing null/undefined checks cause runtime errors',
    hints: [
      'Check if user exists before accessing properties',
      'Check if email exists before calling methods on it',
      'Consider using optional chaining or default values',
    ],
    testCases: [
      {
        input: '{email: "USER@EXAMPLE.COM"}',
        expectedOutput: '"user@example.com"',
      },
      {
        input: 'null',
        expectedOutput: 'null or empty string (no crash)',
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

