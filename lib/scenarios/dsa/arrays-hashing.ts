/**
 * Arrays & Hashing DSA Scenarios
 * Pattern: arrays-hashing
 *
 * These scenarios test fundamental array manipulation and
 * hash table usage skills.
 */

import type { DSAScenario } from "../types"

export const arraysHashingScenarios: DSAScenario[] = [
  {
    id: "dsa-two-sum",
    title: "Two Sum",
    type: "dsa",
    pattern: "arrays-hashing", // NeetCode category
    difficulty: "easy",
    companies: [
      "Google",
      "Amazon",
      "Meta",
      "Microsoft",
      "Apple",
      "Roblox",
      "NVIDIA",
      "TikTok",
      "Salesforce",
      "Oracle",
      "Atlassian",
      "ZipRecruiter",
    ],
    description: "Find two numbers in an array that add up to a target value",
    tags: ["array", "hash-table", "two-pointers"],
    estimatedTime: 15,
    problemStatement: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    hints: [
      "Try using a hash map to store values you've already seen",
      "For each number, check if (target - current number) exists in your hash map",
      "The optimal solution has O(n) time complexity",
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
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { nums: [2, 7, 11, 15], target: 9 },
        expected: [0, 1],
        description: "Basic case: [2,7,11,15], target 9",
      },
      {
        input: { nums: [3, 2, 4], target: 6 },
        expected: [1, 2],
        description: "Non-adjacent pair: [3,2,4], target 6",
      },
      {
        input: { nums: [3, 3], target: 6 },
        expected: [0, 1],
        description: "Duplicate numbers: [3,3], target 6",
      },
      {
        input: { nums: [-1, -2, -3, -4, -5], target: -8 },
        expected: [2, 4],
        description: "Negative numbers",
      },
      {
        input: { nums: [0, 4, 3, 0], target: 0 },
        expected: [0, 3],
        description: "Zeros: [0,4,3,0], target 0",
      },
    ],

    // ==========================================
    // Real Interview Mode (Fuzzy Mode) Fields
    // ==========================================
    fuzzyStatement:
      "Given an array of numbers, find two that add up to a target value.",

    clarifyingQuestions: [
      {
        topic: "output_format",
        question: "Should I return the indices or the actual values?",
        answer: "Return the indices of the two numbers.",
        required: true,
      },
      {
        topic: "multiple_solutions",
        question: "Can there be multiple valid pairs?",
        answer:
          "Assume exactly one solution exists. You don't need to handle multiple.",
        required: false,
      },
      {
        topic: "element_reuse",
        question: "Can I use the same element twice?",
        answer:
          "No, you cannot use the same element twice. Each index can only be used once.",
        required: true,
      },
      {
        topic: "no_solution_case",
        question: "What if no valid pair exists?",
        answer: "You can assume there's always exactly one valid answer.",
        required: false,
      },
      {
        topic: "input_sorted",
        question: "Is the array sorted?",
        answer: "No, the array is not necessarily sorted.",
        required: false,
      },
      {
        topic: "negative_numbers",
        question: "Can there be negative numbers?",
        answer: "Yes, numbers can be negative.",
        required: false,
      },
    ],

    // ==========================================
    // Proactive AI Interviewer Fields
    // ==========================================
    commonWrongApproaches: [
      {
        description: "Nested loops brute force O(n²)",
        codeSignals: [
          "two nested for loops",
          "for i in range AND for j in range",
          "O(n^2)",
          "O(n²)",
        ],
        intervention:
          "That's a valid O(n²) approach. Before you code it all out, can you think of a way to do this in a single pass using extra space?",
      },
      {
        description: "Sorting then two pointers (loses original indices)",
        codeSignals: ["sort(", ".sort(", "sorted(", "two pointers after sort"],
        intervention:
          "Careful - if you sort the array, how will you keep track of the original indices? Think about what information you might lose.",
      },
    ],

    whatIfQuestions: [
      "What if the array is empty or has only one element?",
      "What if the target is negative?",
      "What if there are duplicate values like [3,3] with target 6?",
      "What if the array has millions of elements - does your solution scale?",
    ],

    midCodingProbes: [
      {
        trigger: "started creating hash map/dictionary",
        question: "What are you storing as the key vs the value in your map?",
      },
      {
        trigger: "checking for complement",
        question:
          "Why do you check for the complement before adding to the map, rather than after?",
      },
      {
        trigger: "loop started",
        question:
          "Walk me through what happens on the first iteration with nums=[2,7,11,15] and target=9.",
      },
    ],

    optimizationPush: {
      suboptimalComplexity: "O(n²)",
      nudge:
        "That brute force works but visits each pair. Can you get O(n) time using O(n) extra space?",
    },
  },
  {
    id: "dsa-contains-duplicate",
    title: "Contains Duplicate",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Apple", "TikTok", "Reddit", "ZipRecruiter"],
    description: "Determine if an array contains any duplicates",
    tags: ["array", "hash-table", "sorting"],
    estimatedTime: 10,
    problemStatement: `Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.`,
    examples: [
      {
        input: "nums = [1,2,3,1]",
        output: "true",
      },
      {
        input: "nums = [1,2,3,4]",
        output: "false",
      },
      {
        input: "nums = [1,1,1,3,3,4,3,2,4,2]",
        output: "true",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
    hints: [
      "Use a Set to track seen numbers",
      "As you iterate, check if the number is already in the set",
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
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { nums: [1, 2, 3, 1] },
        expected: true,
        description: "Basic case with duplicate: [1,2,3,1]",
      },
      {
        input: { nums: [1, 2, 3, 4] },
        expected: false,
        description: "No duplicates: [1,2,3,4]",
      },
      {
        input: { nums: [1, 1, 1, 3, 3, 4, 3, 2, 4, 2] },
        expected: true,
        description: "Multiple duplicates",
      },
      {
        input: { nums: [1] },
        expected: false,
        description: "Single element",
      },
      {
        input: { nums: [1, 1] },
        expected: true,
        description: "Two identical elements",
      },
    ],
  },
  {
    id: "dsa-product-array-except-self",
    title: "Product of Array Except Self",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "medium",
    companies: ["Meta", "Amazon", "Apple", "Microsoft", "TikTok", "NVIDIA"],
    description: "Calculate product of all elements except current element",
    tags: ["array", "prefix-sum"],
    estimatedTime: 25,
    problemStatement: `Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].

The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in O(n) time and without using the division operation.`,
    examples: [
      {
        input: "nums = [1,2,3,4]",
        output: "[24,12,8,6]",
      },
      {
        input: "nums = [-1,1,0,-3,3]",
        output: "[0,0,9,0,0]",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30",
      "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer",
    ],
    hints: [
      "Use two passes: one for prefix products, one for suffix products",
      "You can optimize space by storing prefix products in the result array",
      "Then multiply by suffix products in a second pass",
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
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [1, 2, 3, 4] },
        expected: [24, 12, 8, 6],
        description: "Basic case: [1,2,3,4]",
      },
      {
        input: { nums: [-1, 1, 0, -3, 3] },
        expected: [0, 0, 9, 0, 0],
        description: "With zeros and negatives",
      },
      {
        input: { nums: [2, 3] },
        expected: [3, 2],
        description: "Two elements: [2,3]",
      },
      {
        input: { nums: [1, 2, 3] },
        expected: [6, 3, 2],
        description: "Three elements: [1,2,3]",
      },
      {
        input: { nums: [-1, -2, -3, -4] },
        expected: [-24, -12, -8, -6],
        description: "All negative numbers",
      },
      // Edge cases
      {
        input: { nums: [0, 0] },
        expected: [0, 0],
        description: "Edge: Multiple zeros",
      },
      {
        input: { nums: [5, 5, 5, 5] },
        expected: [125, 125, 125, 125],
        description: "Edge: All same values",
      },
    ],
  },
  {
    id: "dsa-group-anagrams",
    title: "Group Anagrams",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft", "Spotify", "Pinterest", "ZipRecruiter"],
    description: "Group strings that are anagrams of each other",
    tags: ["array", "hash-table", "string", "sorting"],
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
      "1 <= strs.length <= 10^4",
      "0 <= strs[i].length <= 100",
      "strs[i] consists of lowercase English letters",
    ],
    hints: [
      "Use a hash map where the key is a sorted version of the string",
      "All anagrams will have the same sorted string",
      "Group strings with the same key together",
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
      time: "O(n * k log k)",
      space: "O(n * k)",
    },
    testCases: [
      {
        input: { strs: ["eat", "tea", "tan", "ate", "nat", "bat"] },
        expected: [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]],
        description: "Multiple anagram groups (order-independent comparison)",
        // Note: Groups sorted by first element, inner arrays sorted alphabetically
        compareAsSet: true,
      },
      {
        input: { strs: [""] },
        expected: [[""]],
        description: "Empty string",
      },
      {
        input: { strs: ["a"] },
        expected: [["a"]],
        description: "Single character",
      },
      {
        input: { strs: ["ab", "ba", "abc", "bca", "cab"] },
        expected: [
          ["ab", "ba"],
          ["abc", "bca", "cab"],
        ],
        description: "Multiple groups (order-independent comparison)",
        compareAsSet: true,
      },
      {
        input: { strs: ["a", "b", "c"] },
        expected: [["a"], ["b"], ["c"]],
        description: "No anagrams (order-independent comparison)",
        compareAsSet: true,
      },
    ],
  },
  {
    id: "dsa-longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "medium",
    companies: ["Google", "Meta", "Amazon", "TikTok", "Snap"],
    description: "Find the length of the longest consecutive elements sequence",
    tags: ["array", "hash-table", "union-find"],
    estimatedTime: 25,
    problemStatement: `Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.

You must write an algorithm that runs in O(n) time.`,
    examples: [
      {
        input: "nums = [100,4,200,1,3,2]",
        output: "4",
        explanation:
          "The longest consecutive elements sequence is [1, 2, 3, 4]. Therefore its length is 4.",
      },
      {
        input: "nums = [0,3,7,2,5,8,4,6,0,1]",
        output: "9",
      },
    ],
    constraints: ["0 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
    hints: [
      "Use a Set for O(1) lookups",
      "For each number, check if it's the start of a sequence (num-1 not in set)",
      "If it's a start, count the consecutive numbers",
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
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { nums: [100, 4, 200, 1, 3, 2] },
        expected: 4,
        description: "Unsorted with sequence [1,2,3,4]",
      },
      {
        input: { nums: [0, 3, 7, 2, 5, 8, 4, 6, 0, 1] },
        expected: 9,
        description: "Long sequence with duplicates",
      },
      {
        input: { nums: [1, 2, 0, 1] },
        expected: 3,
        description: "Sequence [0,1,2] with duplicate",
      },
      {
        input: { nums: [] },
        expected: 0,
        description: "Empty array",
      },
      {
        input: { nums: [9, 1, 4, 7, 3, 2, 8, 5, 6] },
        expected: 9,
        description: "Full consecutive sequence [1-9]",
      },
    ],
  },
  {
    id: "dsa-first-missing-positive",
    title: "First Missing Positive",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta"],
    description: "Find smallest missing positive integer in O(n) time and O(1) space.",
    tags: ["array", "hash-table"],
    estimatedTime: 30,
    problemStatement: `Given an unsorted integer array nums, return the smallest missing positive integer. Must run in O(n) time and use O(1) auxiliary space.`,
    examples: [
      {
        input: "nums = [1,2,0]",
        output: "3",
      },
      {
        input: "nums = [3,4,-1,1]",
        output: "2",
      },
      {
        input: "nums = [7,8,9,11,12]",
        output: "1",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-2^31 <= nums[i] <= 2^31 - 1"],
    hints: [
      "Use array itself as hash table",
      "Place each number n at index n-1 if possible",
      "First index i where nums[i] != i+1 is the answer",
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
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [1, 2, 0] },
        expected: 3,
        description: "Missing 3 after consecutive 1,2",
      },
      {
        input: { nums: [3, 4, -1, 1] },
        expected: 2,
        description: "Missing 2 with negatives",
      },
      {
        input: { nums: [7, 8, 9, 11, 12] },
        expected: 1,
        description: "Missing 1 (no small positives)",
      },
      {
        input: { nums: [1] },
        expected: 2,
        description: "Single element array",
      },
      {
        input: { nums: [1, 2, 3, 4, 5] },
        expected: 6,
        description: "All consecutive, missing next",
      },
      // Edge cases
      {
        input: { nums: [2, 3, 4] },
        expected: 1,
        description: "Edge: Gap at beginning (missing 1)",
      },
      {
        input: { nums: [-5, -3, -1, 0] },
        expected: 1,
        description: "Edge: All negatives and zero",
      },
    ],
  },
  {
    id: "dsa-valid-anagram",
    title: "Valid Anagram",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "TikTok", "Spotify"],
    description: "Determine if two strings are anagrams of each other",
    tags: ["string", "hash-table", "sorting"],
    estimatedTime: 15,
    problemStatement: `Given two strings s and t, return true if t is an anagram of s, and false otherwise.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: "true" },
      { input: 's = "rat", t = "car"', output: "false" },
    ],
    constraints: [
      "1 <= s.length, t.length <= 5 * 10^4",
      "s and t consist of lowercase English letters",
    ],
    hints: [
      "Count character frequencies in both strings",
      "Compare the frequency maps",
      "Alternative: Sort both strings and compare",
    ],
    starterCode: {
      javascript: `function isAnagram(s, t) {\n  // Write your solution here\n\n}`,
      typescript: `function isAnagram(s: string, t: string): boolean {\n  // Write your solution here\n\n}`,
      python: `def isAnagram(s, t):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { s: "anagram", t: "nagaram" }, expected: true, description: "Valid anagram" },
      { input: { s: "rat", t: "car" }, expected: false, description: "Not anagram" },
      { input: { s: "a", t: "a" }, expected: true, description: "Single char" },
      { input: { s: "ab", t: "a" }, expected: false, description: "Different lengths" },
    ],
  },
  {
    id: "dsa-top-k-frequent-elements",
    title: "Top K Frequent Elements",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Apple", "Spotify", "TikTok", "Reddit"],
    description: "Find k most frequent elements in an array",
    tags: ["array", "hash-table", "heap", "bucket-sort"],
    estimatedTime: 25,
    problemStatement: `Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.`,
    examples: [
      { input: "nums = [1,1,1,2,2,3], k = 2", output: "[1,2]" },
      { input: "nums = [1], k = 1", output: "[1]" },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
      "k is in the range [1, the number of unique elements]",
      "The answer is guaranteed to be unique",
    ],
    hints: [
      "Count frequencies with a HashMap",
      "Use bucket sort: index = frequency, value = list of nums",
      "Alternative: min-heap of size k for O(n log k)",
    ],
    starterCode: {
      javascript: `function topKFrequent(nums, k) {\n  // Write your solution here\n\n}`,
      typescript: `function topKFrequent(nums: number[], k: number): number[] {\n  // Write your solution here\n\n}`,
      python: `def topKFrequent(nums, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    testCases: [
      {
        input: { nums: [1, 1, 1, 2, 2, 3], k: 2 },
        expected: [1, 2],
        description: "Top 2 frequent",
      },
      { input: { nums: [1], k: 1 }, expected: [1], description: "Single element" },
      {
        input: { nums: [1, 2], k: 2 },
        expected: [1, 2],
        description: "All unique, same frequency",
      },
    ],
  },
  {
    id: "dsa-encode-decode-strings",
    title: "Encode and Decode Strings",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "medium",
    companies: ["Google", "Meta", "Amazon", "Apple"],
    description: "Design an algorithm to encode and decode a list of strings",
    tags: ["string", "design", "array"],
    estimatedTime: 25,
    problemStatement: `Design an algorithm to encode a list of strings to a single string. The encoded string is then decoded back to the original list of strings.

Implement encode and decode functions.`,
    examples: [
      {
        input: 'strs = ["lint","code","love","you"]',
        output: '["lint","code","love","you"]',
        explanation: "Encode to a single string, then decode back to original list",
      },
      { input: 'strs = ["we","say",":","yes"]', output: '["we","say",":","yes"]' },
    ],
    constraints: [
      "0 <= strs.length <= 200",
      "0 <= strs[i].length <= 200",
      "strs[i] contains any possible characters out of 256 valid ASCII characters",
    ],
    hints: [
      "Use length prefix: store length + delimiter + string",
      'Example: "4#lint5#code" encodes ["lint", "code"]',
      "The delimiter must not conflict with the length number",
    ],
    starterCode: {
      javascript: `function encode(strs) {\n  // Encode list of strings to single string\n\n}\n\nfunction decode(s) {\n  // Decode single string back to list of strings\n\n}`,
      typescript: `function encode(strs: string[]): string {\n  // Encode list of strings to single string\n\n}\n\nfunction decode(s: string): string[] {\n  // Decode single string back to list of strings\n\n}`,
      python: `def encode(strs):\n    # Encode list of strings to single string\n    pass\n\ndef decode(s):\n    # Decode single string back to list of strings\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      {
        input: { strs: ["lint", "code", "love", "you"] },
        expected: ["lint", "code", "love", "you"],
        description: "Standard case",
      },
      {
        input: { strs: ["we", "say", ":", "yes"] },
        expected: ["we", "say", ":", "yes"],
        description: "With special chars",
      },
      { input: { strs: [""] }, expected: [""], description: "Empty string in list" },
      { input: { strs: [] }, expected: [], description: "Empty list" },
    ],
  },
  {
    id: "dsa-subarray-sum-equals-k",
    title: "Subarray Sum Equals K",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "medium",
    companies: ["Meta", "Google", "Amazon", "Microsoft", "Snap", "TikTok", "Reddit"],
    description: "Count subarrays with sum equal to k using prefix sum",
    tags: ["array", "hash-table", "prefix-sum"],
    estimatedTime: 25,
    problemStatement: `Given an array of integers nums and an integer k, return the total number of subarrays whose sum equals to k.

A subarray is a contiguous non-empty sequence of elements within an array.`,
    examples: [
      {
        input: "nums = [1,1,1], k = 2",
        output: "2",
        explanation: "Subarrays [1,1] at index 0-1 and 1-2",
      },
      { input: "nums = [1,2,3], k = 3", output: "2", explanation: "Subarrays [1,2] and [3]" },
    ],
    constraints: ["1 <= nums.length <= 2 * 10^4", "-1000 <= nums[i] <= 1000", "-10^7 <= k <= 10^7"],
    hints: [
      "Use prefix sum: if prefixSum[j] - prefixSum[i] = k, subarray (i,j] sums to k",
      "Store prefix sums in HashMap with their counts",
      "For each position, check if (currentSum - k) exists in map",
    ],
    starterCode: {
      javascript: `function subarraySum(nums, k) {\n  // Write your solution here\n\n}`,
      typescript: `function subarraySum(nums: number[], k: number): number {\n  // Write your solution here\n\n}`,
      python: `def subarraySum(nums, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    testCases: [
      { input: { nums: [1, 1, 1], k: 2 }, expected: 2, description: "Multiple subarrays" },
      { input: { nums: [1, 2, 3], k: 3 }, expected: 2, description: "Non-overlapping subarrays" },
      { input: { nums: [1, -1, 0], k: 0 }, expected: 3, description: "With negatives and zero" },
    ],
  },
  {
    id: "dsa-find-all-duplicates",
    title: "Find All Duplicates in an Array",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Find all duplicates in O(n) time and O(1) extra space",
    tags: ["array", "hash-table"],
    estimatedTime: 20,
    problemStatement: `Given an integer array nums of length n where all the integers of nums are in the range [1, n] and each integer appears once or twice, return an array of all the integers that appear twice.

You must write an algorithm that runs in O(n) time and uses only constant extra space.`,
    examples: [
      { input: "nums = [4,3,2,7,8,2,3,1]", output: "[2,3]" },
      { input: "nums = [1,1,2]", output: "[1]" },
      { input: "nums = [1]", output: "[]" },
    ],
    constraints: [
      "n == nums.length",
      "1 <= n <= 10^5",
      "1 <= nums[i] <= n",
      "Each element in nums appears once or twice",
    ],
    hints: [
      "Use the array itself as a hash table",
      "For each num, mark nums[abs(num)-1] as negative",
      "If already negative, it is a duplicate",
    ],
    starterCode: {
      javascript: `function findDuplicates(nums) {\n  // Write your solution here\n\n}`,
      typescript: `function findDuplicates(nums: number[]): number[] {\n  // Write your solution here\n\n}`,
      python: `def findDuplicates(nums):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      {
        input: { nums: [4, 3, 2, 7, 8, 2, 3, 1] },
        expected: [2, 3],
        description: "Multiple duplicates",
      },
      { input: { nums: [1, 1, 2] }, expected: [1], description: "Single duplicate" },
      { input: { nums: [1] }, expected: [], description: "No duplicates" },
    ],
  },
  {
    id: "dsa-next-permutation",
    title: "Next Permutation",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "medium",
    companies: ["Google", "Amazon", "Microsoft", "Meta", "Apple"],
    description: "Find the next lexicographically greater permutation of numbers",
    tags: ["array", "two-pointers"],
    estimatedTime: 25,
    problemStatement: `A permutation of an array of integers is an arrangement of its members into a sequence or linear order.

The next permutation of an array of integers is the next lexicographically greater permutation of its integer. If such arrangement is not possible, the array must be rearranged as the lowest possible order (i.e., sorted in ascending order).

For example:
- For arr = [1,2,3], the next permutation is [1,3,2].
- For arr = [3,2,1], the next permutation is [1,2,3] (no greater permutation exists).
- For arr = [1,1,5], the next permutation is [1,5,1].

The replacement must be in place and use only constant extra memory.`,
    examples: [
      { input: "nums = [1,2,3]", output: "[1,3,2]" },
      { input: "nums = [3,2,1]", output: "[1,2,3]" },
      { input: "nums = [1,1,5]", output: "[1,5,1]" },
    ],
    constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 100"],
    hints: [
      "Find the largest index i such that nums[i] < nums[i+1]",
      "If no such index exists, reverse the entire array",
      "Find the largest index j > i such that nums[i] < nums[j], swap them",
      "Reverse the suffix starting at i+1",
    ],
    starterCode: {
      javascript: `function nextPermutation(nums) {
  // Modify nums in-place to the next permutation

}`,
      typescript: `function nextPermutation(nums: number[]): void {
  // Modify nums in-place to the next permutation

}`,
      python: `def nextPermutation(nums):
    # Modify nums in-place to the next permutation
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { nums: [1, 2, 3] }, expected: [1, 3, 2], description: "Standard case" },
      { input: { nums: [3, 2, 1] }, expected: [1, 2, 3], description: "Descending - wrap around" },
      { input: { nums: [1, 1, 5] }, expected: [1, 5, 1], description: "With duplicates" },
      { input: { nums: [1] }, expected: [1], description: "Single element" },
      { input: { nums: [1, 3, 2] }, expected: [2, 1, 3], description: "Mid-array swap" },
      { input: { nums: [2, 3, 1] }, expected: [3, 1, 2], description: "Complex case" },
    ],
  },
  {
    id: "dsa-majority-element",
    title: "Majority Element",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    description: "Find the element that appears more than n/2 times using Boyer-Moore algorithm",
    tags: ["array", "hash-table", "divide-and-conquer", "sorting", "counting"],
    estimatedTime: 15,
    problemStatement: `Given an array nums of size n, return the majority element.

The majority element is the element that appears more than ⌊n / 2⌋ times. You may assume that the majority element always exists in the array.

Follow-up: Could you solve the problem in linear time and in O(1) space?`,
    examples: [
      { input: "nums = [3,2,3]", output: "3" },
      { input: "nums = [2,2,1,1,1,2,2]", output: "2" },
    ],
    constraints: ["n == nums.length", "1 <= n <= 5 * 10^4", "-10^9 <= nums[i] <= 10^9"],
    hints: [
      "Hash map solution: count frequencies, return element with count > n/2",
      "Sorting solution: majority element will always be at n/2 index",
      "Boyer-Moore Voting Algorithm: O(n) time, O(1) space",
      "Boyer-Moore: maintain candidate and count, increment/decrement based on match",
    ],
    starterCode: {
      javascript: `function majorityElement(nums) {
  // Write your solution here

}`,
      typescript: `function majorityElement(nums: number[]): number {
  // Write your solution here

}`,
      python: `def majorityElement(nums):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { nums: [3, 2, 3] }, expected: 3, description: "Simple majority" },
      { input: { nums: [2, 2, 1, 1, 1, 2, 2] }, expected: 2, description: "Longer array" },
      { input: { nums: [1] }, expected: 1, description: "Single element" },
      { input: { nums: [1, 1, 1, 1] }, expected: 1, description: "All same" },
      { input: { nums: [6, 5, 5] }, expected: 5, description: "Majority at end" },
    ],
  },
  {
    id: "dsa-rotate-array",
    title: "Rotate Array",
    type: "dsa",
    pattern: "arrays-hashing",
    difficulty: "medium",
    companies: ["Amazon", "Microsoft", "Meta", "Apple"],
    description: "Rotate an array to the right by k steps in-place",
    tags: ["array", "math", "two-pointers"],
    estimatedTime: 20,
    problemStatement: `Given an integer array nums, rotate the array to the right by k steps, where k is non-negative.

Follow up:
- Try to come up with as many solutions as you can. There are at least three different ways to solve this problem.
- Could you do it in-place with O(1) extra space?`,
    examples: [
      {
        input: "nums = [1,2,3,4,5,6,7], k = 3",
        output: "[5,6,7,1,2,3,4]",
        explanation:
          "rotate 1 step: [7,1,2,3,4,5,6], rotate 2 steps: [6,7,1,2,3,4,5], rotate 3 steps: [5,6,7,1,2,3,4]",
      },
      {
        input: "nums = [-1,-100,3,99], k = 2",
        output: "[3,99,-1,-100]",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-2^31 <= nums[i] <= 2^31 - 1", "0 <= k <= 10^5"],
    hints: [
      "Use modulo: k = k % nums.length to handle k > length",
      "Reverse approach: reverse all, reverse first k, reverse rest",
      "Cyclic replacement: place each element at its final position",
    ],
    starterCode: {
      javascript: `function rotate(nums, k) {
  // Modify nums in-place

}`,
      typescript: `function rotate(nums: number[], k: number): void {
  // Modify nums in-place

}`,
      python: `def rotate(nums, k):
    # Modify nums in-place
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      {
        input: { nums: [1, 2, 3, 4, 5, 6, 7], k: 3 },
        expected: [5, 6, 7, 1, 2, 3, 4],
        description: "Standard rotation",
      },
      {
        input: { nums: [-1, -100, 3, 99], k: 2 },
        expected: [3, 99, -1, -100],
        description: "Negative numbers",
      },
      { input: { nums: [1, 2], k: 3 }, expected: [2, 1], description: "k > length" },
      { input: { nums: [1], k: 0 }, expected: [1], description: "No rotation" },
      { input: { nums: [1, 2, 3], k: 3 }, expected: [1, 2, 3], description: "k equals length" },
    ],
  },
]

// Re-export for convenience
export default arraysHashingScenarios
