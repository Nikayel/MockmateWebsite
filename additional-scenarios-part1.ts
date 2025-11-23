/**
 * ADDITIONAL DSA PROBLEMS - Part 1: Arrays & Strings (30 problems)
 */

// ========== ARRAYS ==========

{
  id: 'dsa-container-with-most-water',
  title: 'Container With Most Water',
  type: 'dsa',
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
  id: 'dsa-3sum',
  title: '3Sum',
  type: 'dsa',
  difficulty: 'medium',
  companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
  description: 'Find all unique triplets in the array which gives the sum of zero.',
  tags: ['array', 'two-pointers', 'sorting'],
  estimatedTime: 30,
  problemStatement: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets.`,
  examples: [
    {
      input: 'nums = [-1,0,1,2,-1,-4]',
      output: '[[-1,-1,2],[-1,0,1]]',
      explanation: 'The distinct triplets that sum to 0 are [-1,0,1] and [-1,-1,2]'
    },
    {
      input: 'nums = [0,1,1]',
      output: '[]',
      explanation: 'No triplet sums to 0'
    }
  ],
  constraints: [
    '3 <= nums.length <= 3000',
    '-10^5 <= nums[i] <= 10^5'
  ],
  hints: [
    'Sort the array first',
    'Fix one element and use two-pointer approach for the rest',
    'Skip duplicates to avoid duplicate triplets'
  ],
  starterCode: {
    javascript: `function threeSum(nums) {
  // Your code here
}`,
    python: `def threeSum(nums):
    # Your code here
    pass`
  },
  optimalComplexity: {
    time: 'O(n²)',
    space: 'O(1) excluding output'
  },
  testCases: [
    {
      input: { nums: [-1,0,1,2,-1,-4] },
      expected: [[-1,-1,2],[-1,0,1]],
      description: 'Multiple valid triplets',
      orderMatters: false
    },
    {
      input: { nums: [0,1,1] },
      expected: [],
      description: 'No valid triplets'
    },
    {
      input: { nums: [0,0,0] },
      expected: [[0,0,0]],
      description: 'All zeros'
    }
  ]
},

{
  id: 'dsa-product-except-self',
  title: 'Product of Array Except Self',
  type: 'dsa',
  difficulty: 'medium',
  companies: ['Amazon', 'Meta', 'Microsoft', 'Apple'],
  description: 'Return an array where each element is the product of all other elements except itself.',
  tags: ['array', 'prefix-product'],
  estimatedTime: 20,
  problemStatement: `Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].

The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in O(n) time and without using the division operation.`,
  examples: [
    {
      input: 'nums = [1,2,3,4]',
      output: '[24,12,8,6]',
      explanation: 'answer[0] = 2*3*4 = 24, answer[1] = 1*3*4 = 12, etc.'
    },
    {
      input: 'nums = [-1,1,0,-3,3]',
      output: '[0,0,9,0,0]'
    }
  ],
  constraints: [
    '2 <= nums.length <= 10^5',
    '-30 <= nums[i] <= 30',
    'Product of any prefix or suffix fits in 32-bit integer'
  ],
  hints: [
    'Think about prefix and suffix products',
    'Can you do it in O(1) extra space (excluding output)?',
    'Build answer array with left products, then multiply with right products'
  ],
  starterCode: {
    javascript: `function productExceptSelf(nums) {
  // Your code here
}`,
    python: `def productExceptSelf(nums):
    # Your code here
    pass`
  },
  optimalComplexity: {
    time: 'O(n)',
    space: 'O(1) excluding output array'
  },
  testCases: [
    {
      input: { nums: [1,2,3,4] },
      expected: [24,12,8,6],
      description: 'Standard case'
    },
    {
      input: { nums: [-1,1,0,-3,3] },
      expected: [0,0,9,0,0],
      description: 'Contains zero'
    },
    {
      input: { nums: [2,3] },
      expected: [3,2],
      description: 'Minimum length'
    }
  ]
},

{
  id: 'dsa-maximum-subarray',
  title: 'Maximum Subarray (Kadane\'s Algorithm)',
  type: 'dsa',
  difficulty: 'medium',
  companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Netflix'],
  description: 'Find the contiguous subarray with the maximum sum.',
  tags: ['array', 'dynamic-programming', 'divide-and-conquer'],
  estimatedTime: 20,
  problemStatement: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.`,
  examples: [
    {
      input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
      output: '6',
      explanation: 'The subarray [4,-1,2,1] has the largest sum 6'
    },
    {
      input: 'nums = [1]',
      output: '1'
    },
    {
      input: 'nums = [5,4,-1,7,8]',
      output: '23',
      explanation: 'The entire array has the maximum sum'
    }
  ],
  constraints: [
    '1 <= nums.length <= 10^5',
    '-10^4 <= nums[i] <= 10^4'
  ],
  hints: [
    'Use Kadane\'s algorithm',
    'Keep track of current sum and maximum sum',
    'If current sum becomes negative, restart from next element'
  ],
  starterCode: {
    javascript: `function maxSubArray(nums) {
  // Your code here
}`,
    python: `def maxSubArray(nums):
    # Your code here
    pass`
  },
  optimalComplexity: {
    time: 'O(n)',
    space: 'O(1)'
  },
  testCases: [
    {
      input: { nums: [-2,1,-3,4,-1,2,1,-5,4] },
      expected: 6,
      description: 'Mixed positive and negative'
    },
    {
      input: { nums: [1] },
      expected: 1,
      description: 'Single element'
    },
    {
      input: { nums: [5,4,-1,7,8] },
      expected: 23,
      description: 'Entire array is max'
    },
    {
      input: { nums: [-1,-2,-3] },
      expected: -1,
      description: 'All negative numbers'
    }
  ]
},

{
  id: 'dsa-merge-intervals',
  title: 'Merge Intervals',
  type: 'dsa',
  difficulty: 'medium',
  companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
  description: 'Merge all overlapping intervals.',
  tags: ['array', 'sorting', 'intervals'],
  estimatedTime: 25,
  problemStatement: `Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,
  examples: [
    {
      input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]',
      output: '[[1,6],[8,10],[15,18]]',
      explanation: 'Intervals [1,3] and [2,6] overlap, so merge them into [1,6]'
    },
    {
      input: 'intervals = [[1,4],[4,5]]',
      output: '[[1,5]]',
      explanation: 'Intervals [1,4] and [4,5] are considered overlapping'
    }
  ],
  constraints: [
    '1 <= intervals.length <= 10^4',
    'intervals[i].length == 2',
    '0 <= starti <= endi <= 10^4'
  ],
  hints: [
    'Sort intervals by start time',
    'Iterate through sorted intervals',
    'Merge if current interval overlaps with previous'
  ],
  starterCode: {
    javascript: `function merge(intervals) {
  // Your code here
}`,
    python: `def merge(intervals):
    # Your code here
    pass`
  },
  optimalComplexity: {
    time: 'O(n log n)',
    space: 'O(n)'
  },
  testCases: [
    {
      input: { intervals: [[1,3],[2,6],[8,10],[15,18]] },
      expected: [[1,6],[8,10],[15,18]],
      description: 'Multiple merges needed'
    },
    {
      input: { intervals: [[1,4],[4,5]] },
      expected: [[1,5]],
      description: 'Touching intervals'
    },
    {
      input: { intervals: [[1,4],[2,3]] },
      expected: [[1,4]],
      description: 'One interval contains another'
    }
  ]
},

// ========== STRINGS ==========

{
  id: 'dsa-longest-palindromic-substring',
  title: 'Longest Palindromic Substring',
  type: 'dsa',
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
  id: 'dsa-group-anagrams',
  title: 'Group Anagrams',
  type: 'dsa',
  difficulty: 'medium',
  companies: ['Amazon', 'Meta', 'Google'],
  description: 'Group strings that are anagrams of each other.',
  tags: ['string', 'hash-table', 'sorting'],
  estimatedTime: 20,
  problemStatement: `Given an array of strings strs, group the anagrams together. You can return the answer in any order.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
  examples: [
    {
      input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
      output: '[["bat"],["nat","tan"],["ate","eat","tea"]]'
    },
    {
      input: 'strs = [""]',
      output: '[[""]]'
    },
    {
      input: 'strs = ["a"]',
      output: '[["a"]]'
    }
  ],
  constraints: [
    '1 <= strs.length <= 10^4',
    '0 <= strs[i].length <= 100',
    'strs[i] consists of lowercase English letters'
  ],
  hints: [
    'Use a hash map with sorted string as key',
    'All anagrams will have the same sorted string',
    'Group strings with same sorted key together'
  ],
  starterCode: {
    javascript: `function groupAnagrams(strs) {
  // Your code here
}`,
    python: `def groupAnagrams(strs):
    # Your code here
    pass`
  },
  optimalComplexity: {
    time: 'O(n * k log k) where k is max string length',
    space: 'O(n * k)'
  },
  testCases: [
    {
      input: { strs: ["eat","tea","tan","ate","nat","bat"] },
      expected: [["bat"],["nat","tan"],["ate","eat","tea"]],
      description: 'Multiple anagram groups',
      orderMatters: false
    },
    {
      input: { strs: [""] },
      expected: [[""]],
      description: 'Empty string'
    },
    {
      input: { strs: ["a"] },
      expected: [["a"]],
      description: 'Single character'
    }
  ]
},

{
  id: 'dsa-valid-parentheses',
  title: 'Valid Parentheses',
  type: 'dsa',
  difficulty: 'easy',
  companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
  description: 'Determine if the input string has valid parentheses pairing.',
  tags: ['string', 'stack'],
  estimatedTime: 15,
  problemStatement: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
  examples: [
    {
      input: 's = "()"',
      output: 'true'
    },
    {
      input: 's = "()[]{}"',
      output: 'true'
    },
    {
      input: 's = "(]"',
      output: 'false'
    }
  ],
  constraints: [
    '1 <= s.length <= 10^4',
    's consists of parentheses only \'()[]{}\'.'
  ],
  hints: [
    'Use a stack to track opening brackets',
    'When you see a closing bracket, check if it matches the top of stack',
    'At the end, stack should be empty'
  ],
  starterCode: {
    javascript: `function isValid(s) {
  // Your code here
}`,
    python: `def isValid(s):
    # Your code here
    pass`
  },
  optimalComplexity: {
    time: 'O(n)',
    space: 'O(n)'
  },
  testCases: [
    {
      input: { s: "()" },
      expected: true,
      description: 'Simple valid case'
    },
    {
      input: { s: "()[]{}" },
      expected: true,
      description: 'Multiple types'
    },
    {
      input: { s: "(]" },
      expected: false,
      description: 'Wrong bracket type'
    },
    {
      input: { s: "([)]" },
      expected: false,
      description: 'Wrong order'
    },
    {
      input: { s: "{[]}" },
      expected: true,
      description: 'Nested brackets'
    }
  ]
},

{
  id: 'dsa-longest-substring-without-repeating',
  title: 'Longest Substring Without Repeating Characters',
  type: 'dsa',
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
  id: 'dsa-string-to-integer-atoi',
  title: 'String to Integer (atoi)',
  type: 'dsa',
  difficulty: 'medium',
  companies: ['Amazon', 'Meta', 'Microsoft'],
  description: 'Implement the myAtoi(string s) function which converts a string to a 32-bit signed integer.',
  tags: ['string', 'implementation'],
  estimatedTime: 30,
  problemStatement: `Implement the myAtoi(string s) function, which converts a string to a 32-bit signed integer (similar to C/C++'s atoi function).

The algorithm for myAtoi(string s) is as follows:

1. Read in and ignore any leading whitespace.
2. Check if the next character (if not already at the end of the string) is '-' or '+'. Read this character in if it is either. This determines if the final result is negative or positive respectively. Assume the result is positive if neither is present.
3. Read in next the characters until the next non-digit character or the end of the input is reached. The rest of the string is ignored.
4. Convert these digits into an integer (i.e. "123" -> 123, "0032" -> 32). If no digits were read, then the integer is 0. Change the sign as necessary (from step 2).
5. If the integer is out of the 32-bit signed integer range [-2^31, 2^31 - 1], then clamp the integer so that it remains in the range. Specifically, integers less than -2^31 should be clamped to -2^31, and integers greater than 2^31 - 1 should be clamped to 2^31 - 1.
6. Return the integer as the final result.`,
  examples: [
    {
      input: 's = "42"',
      output: '42'
    },
    {
      input: 's = "   -42"',
      output: '-42',
      explanation: 'Leading whitespace is ignored, then "-" is read so result is negative'
    },
    {
      input: 's = "4193 with words"',
      output: '4193',
      explanation: 'Reading stops at first non-digit character'
    }
  ],
  constraints: [
    '0 <= s.length <= 200',
    's consists of English letters (lower-case and upper-case), digits (0-9), \' \', \'+\', \'-\', and \'.\'.'
  ],
  hints: [
    'Handle edge cases: leading whitespace, sign, overflow',
    'Stop reading at first non-digit character',
    'Clamp to 32-bit integer range'
  ],
  starterCode: {
    javascript: `function myAtoi(s) {
  // Your code here
}`,
    python: `def myAtoi(s):
    # Your code here
    pass`
  },
  optimalComplexity: {
    time: 'O(n)',
    space: 'O(1)'
  },
  testCases: [
    {
      input: { s: "42" },
      expected: 42,
      description: 'Simple positive number'
    },
    {
      input: { s: "   -42" },
      expected: -42,
      description: 'Leading whitespace with negative'
    },
    {
      input: { s: "4193 with words" },
      expected: 4193,
      description: 'Stop at non-digit'
    },
    {
      input: { s: "words and 987" },
      expected: 0,
      description: 'Leading non-digits'
    }
  ]
}

// ... More problems will be added in subsequent parts
