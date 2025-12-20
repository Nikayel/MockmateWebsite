/**
 * Arrays & Hashing DSA Scenarios
 * Pattern: arrays-hashing
 *
 * These scenarios test fundamental array manipulation and
 * hash table usage skills.
 */

import type { DSAScenario } from '../types'

export const arraysHashingScenarios: DSAScenario[] = [
  {
    id: 'dsa-two-sum',
    title: 'Two Sum',
    type: 'dsa',
    pattern: 'arrays-hashing', // NeetCode category
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
    id: 'dsa-contains-duplicate',
    title: 'Contains Duplicate',
    type: 'dsa',
    pattern: 'arrays-hashing',
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
    pattern: 'arrays-hashing',
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
    id: 'dsa-group-anagrams',
    title: 'Group Anagrams',
    type: 'dsa',
    pattern: 'arrays-hashing',
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
      },
      {
        input: { strs: ["a", "b", "c"] },
        expected: [["a"], ["b"], ["c"]],
        description: 'No anagrams',
      },
    ],
  },
  {
    id: 'dsa-longest-consecutive-sequence',
    title: 'Longest Consecutive Sequence',
    type: 'dsa',
    pattern: 'arrays-hashing',
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
    id: 'dsa-first-missing-positive',
    title: 'First Missing Positive',
    type: 'dsa',
    pattern: 'arrays-hashing',
    difficulty: 'hard',
    companies: ['Amazon', 'Google', 'Meta'],
    description: 'Find smallest missing positive integer in O(n) time and O(1) space.',
    tags: ['array', 'hash-table'],
    estimatedTime: 30,
    problemStatement: `Given an unsorted integer array nums, return the smallest missing positive integer. Must run in O(n) time and use O(1) auxiliary space.`,
    examples: [
      {
        input: 'nums = [1,2,0]',
        output: '3',
      },
      {
        input: 'nums = [3,4,-1,1]',
        output: '2',
      },
      {
        input: 'nums = [7,8,9,11,12]',
        output: '1',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-2^31 <= nums[i] <= 2^31 - 1',
    ],
    hints: [
      'Use array itself as hash table',
      'Place each number n at index n-1 if possible',
      'First index i where nums[i] != i+1 is the answer',
    ],
    starterCode: {
      javascript: `function firstMissingPositive(nums) {
  // Write your solution here

}`,
      typescript: `function firstMissingPositive(nums: number[]): number {
  // Write your solution here

}`,
      python: `def firstMissingPositive(nums):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { nums: [1, 2, 0] },
        expected: 3,
        description: 'Missing 3 after consecutive 1,2',
      },
      {
        input: { nums: [3, 4, -1, 1] },
        expected: 2,
        description: 'Missing 2 with negatives',
      },
      {
        input: { nums: [7, 8, 9, 11, 12] },
        expected: 1,
        description: 'Missing 1 (no small positives)',
      },
      {
        input: { nums: [1] },
        expected: 2,
        description: 'Single element array',
      },
      {
        input: { nums: [1, 2, 3, 4, 5] },
        expected: 6,
        description: 'All consecutive, missing next',
      },
    ],
  },
]

// Re-export for convenience
export default arraysHashingScenarios
