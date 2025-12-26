/**
 * Bit Manipulation DSA Scenarios
 * Pattern: bit-manipulation
 *
 * Bit manipulation problems using XOR, AND, OR, and bit shifts.
 * Essential for low-level programming roles and commonly asked at Google, Apple, Microsoft.
 */

import type { DSAScenario } from '../types'

export const bitManipulationScenarios: DSAScenario[] = [
  {
    id: 'dsa-single-number',
    title: 'Single Number',
    type: 'dsa',
    pattern: 'bit-manipulation',
    difficulty: 'easy',
    companies: ['Google', 'Amazon', 'Apple', 'Microsoft', 'Meta'],
    description: 'Find the element that appears only once in an array where every other element appears twice',
    tags: ['bit-manipulation', 'array', 'xor'],
    estimatedTime: 10,
    problemStatement: `Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.

You must implement a solution with a linear runtime complexity and use only constant extra space.`,
    examples: [
      {
        input: 'nums = [2,2,1]',
        output: '1',
      },
      {
        input: 'nums = [4,1,2,1,2]',
        output: '4',
      },
      {
        input: 'nums = [1]',
        output: '1',
      },
    ],
    constraints: [
      '1 <= nums.length <= 3 * 10^4',
      '-3 * 10^4 <= nums[i] <= 3 * 10^4',
      'Each element in the array appears twice except for one element which appears only once.',
    ],
    hints: [
      'XOR of a number with itself is 0: a ^ a = 0',
      'XOR of a number with 0 is the number itself: a ^ 0 = a',
      'XOR is associative and commutative, so order doesn\'t matter',
      'XOR all numbers together - pairs cancel out, leaving the single number',
    ],
    starterCode: {
      javascript: `function singleNumber(nums) {
  // Use XOR to find the single number
}`,
      typescript: `function singleNumber(nums: number[]): number {
  // Use XOR to find the single number
}`,
      python: `def singleNumber(nums: List[int]) -> int:
    # Use XOR to find the single number
    pass`,
      java: `class Solution {
    public int singleNumber(int[] nums) {
        // Use XOR to find the single number
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { nums: [2, 2, 1] },
        expected: 1,
        description: 'Single at end',
      },
      {
        input: { nums: [4, 1, 2, 1, 2] },
        expected: 4,
        description: 'Single at beginning',
      },
      {
        input: { nums: [1] },
        expected: 1,
        description: 'Only one element',
      },
      {
        input: { nums: [-1, -1, -2] },
        expected: -2,
        description: 'Negative numbers',
      },
      {
        input: { nums: [0, 1, 0] },
        expected: 1,
        description: 'With zeros',
      },
    ],
  },
  {
    id: 'dsa-number-of-1-bits',
    title: 'Number of 1 Bits',
    type: 'dsa',
    pattern: 'bit-manipulation',
    difficulty: 'easy',
    companies: ['Apple', 'Microsoft', 'Google', 'Amazon'],
    description: 'Count the number of set bits (1s) in a binary representation',
    tags: ['bit-manipulation', 'divide-and-conquer'],
    estimatedTime: 10,
    problemStatement: `Write a function that takes the binary representation of an unsigned integer and returns the number of '1' bits it has (also known as the Hamming weight).`,
    examples: [
      {
        input: 'n = 00000000000000000000000000001011',
        output: '3',
        explanation: 'The input binary string has three \'1\' bits.',
      },
      {
        input: 'n = 00000000000000000000000010000000',
        output: '1',
        explanation: 'The input binary string has one \'1\' bit.',
      },
      {
        input: 'n = 11111111111111111111111111111101',
        output: '31',
        explanation: 'The input binary string has thirty one \'1\' bits.',
      },
    ],
    constraints: [
      'The input must be a binary string of length 32',
    ],
    hints: [
      'Method 1: Check each bit by shifting right and AND with 1',
      'Method 2: Use n & (n-1) trick to clear the rightmost 1 bit',
      'n & (n-1) removes the least significant 1 bit each time',
    ],
    starterCode: {
      javascript: `function hammingWeight(n) {
  // Count the number of 1 bits
}`,
      typescript: `function hammingWeight(n: number): number {
  // Count the number of 1 bits
}`,
      python: `def hammingWeight(n: int) -> int:
    # Count the number of 1 bits
    pass`,
      java: `public class Solution {
    public int hammingWeight(int n) {
        // Count the number of 1 bits
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: 'O(1) - at most 32 iterations',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { n: 11 },
        expected: 3,
        description: 'Binary: 1011',
      },
      {
        input: { n: 128 },
        expected: 1,
        description: 'Power of 2',
      },
      {
        input: { n: 4294967293 },
        expected: 31,
        description: 'Large number with many 1s',
      },
      {
        input: { n: 0 },
        expected: 0,
        description: 'Zero',
      },
      {
        input: { n: 1 },
        expected: 1,
        description: 'One',
      },
    ],
  },
  {
    id: 'dsa-counting-bits',
    title: 'Counting Bits',
    type: 'dsa',
    pattern: 'bit-manipulation',
    difficulty: 'easy',
    companies: ['Amazon', 'Google', 'Microsoft'],
    description: 'Return an array where ans[i] is the number of 1s in the binary representation of i',
    tags: ['bit-manipulation', 'dynamic-programming'],
    estimatedTime: 15,
    problemStatement: `Given an integer n, return an array ans of length n + 1 such that for each i (0 <= i <= n), ans[i] is the number of 1's in the binary representation of i.`,
    examples: [
      {
        input: 'n = 2',
        output: '[0,1,1]',
        explanation: '0 --> 0, 1 --> 1, 2 --> 10',
      },
      {
        input: 'n = 5',
        output: '[0,1,1,2,1,2]',
        explanation: '0 --> 0, 1 --> 1, 2 --> 10, 3 --> 11, 4 --> 100, 5 --> 101',
      },
    ],
    constraints: [
      '0 <= n <= 10^5',
    ],
    hints: [
      'Use DP: ans[i] = ans[i >> 1] + (i & 1)',
      'i >> 1 is i divided by 2, and (i & 1) checks if last bit is 1',
      'Alternative: ans[i] = ans[i & (i-1)] + 1 using the clear rightmost bit trick',
    ],
    starterCode: {
      javascript: `function countBits(n) {
  // Use DP to count bits for each number
}`,
      typescript: `function countBits(n: number): number[] {
  // Use DP to count bits for each number
}`,
      python: `def countBits(n: int) -> List[int]:
    # Use DP to count bits for each number
    pass`,
      java: `class Solution {
    public int[] countBits(int n) {
        // Use DP to count bits for each number
        return new int[n + 1];
    }
}`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n) for the output array',
    },
    testCases: [
      {
        input: { n: 2 },
        expected: [0, 1, 1],
        description: 'Small n',
      },
      {
        input: { n: 5 },
        expected: [0, 1, 1, 2, 1, 2],
        description: 'Standard case',
      },
      {
        input: { n: 0 },
        expected: [0],
        description: 'Zero',
      },
      {
        input: { n: 7 },
        expected: [0, 1, 1, 2, 1, 2, 2, 3],
        description: 'Up to 7',
      },
    ],
  },
  {
    id: 'dsa-reverse-bits',
    title: 'Reverse Bits',
    type: 'dsa',
    pattern: 'bit-manipulation',
    difficulty: 'easy',
    companies: ['Apple', 'Microsoft', 'Google'],
    description: 'Reverse bits of a given 32-bit unsigned integer',
    tags: ['bit-manipulation', 'divide-and-conquer'],
    estimatedTime: 15,
    problemStatement: `Reverse bits of a given 32 bits unsigned integer.

Note:
- Note that in some languages, such as Java, there is no unsigned integer type. In this case, both input and output will be given as a signed integer type.
- The input will be given as a binary string of length 32.`,
    examples: [
      {
        input: 'n = 00000010100101000001111010011100',
        output: '964176192 (00111001011110000010100101000000)',
        explanation: 'The input binary string represents the unsigned integer 43261596, so return 964176192 whose binary representation is 00111001011110000010100101000000.',
      },
      {
        input: 'n = 11111111111111111111111111111101',
        output: '3221225471 (10111111111111111111111111111111)',
      },
    ],
    constraints: [
      'The input must be a binary string of length 32',
    ],
    hints: [
      'Process bit by bit from right to left',
      'Get rightmost bit with n & 1',
      'Build result by shifting left and adding the bit',
      'Shift n right to process next bit',
    ],
    starterCode: {
      javascript: `function reverseBits(n) {
  // Reverse the bits of the 32-bit integer
}`,
      typescript: `function reverseBits(n: number): number {
  // Reverse the bits of the 32-bit integer
}`,
      python: `def reverseBits(n: int) -> int:
    # Reverse the bits of the 32-bit integer
    pass`,
      java: `public class Solution {
    public int reverseBits(int n) {
        // Reverse the bits of the 32-bit integer
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: 'O(1) - exactly 32 iterations',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { n: 43261596 },
        expected: 964176192,
        description: 'Standard case',
      },
      {
        input: { n: 4294967293 },
        expected: 3221225471,
        description: 'Large number',
      },
      {
        input: { n: 0 },
        expected: 0,
        description: 'Zero stays zero',
      },
      {
        input: { n: 1 },
        expected: 2147483648,
        description: 'Single bit at end moves to start',
      },
    ],
  },
  {
    id: 'dsa-missing-number',
    title: 'Missing Number',
    type: 'dsa',
    pattern: 'bit-manipulation',
    difficulty: 'easy',
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    description: 'Find the missing number in an array containing n distinct numbers from 0 to n',
    tags: ['bit-manipulation', 'array', 'math', 'xor'],
    estimatedTime: 10,
    problemStatement: `Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.`,
    examples: [
      {
        input: 'nums = [3,0,1]',
        output: '2',
        explanation: 'n = 3 since there are 3 numbers, so all numbers are in the range [0,3]. 2 is the missing number.',
      },
      {
        input: 'nums = [0,1]',
        output: '2',
        explanation: 'n = 2 since there are 2 numbers, so all numbers are in the range [0,2]. 2 is the missing number.',
      },
      {
        input: 'nums = [9,6,4,2,3,5,7,0,1]',
        output: '8',
      },
    ],
    constraints: [
      'n == nums.length',
      '1 <= n <= 10^4',
      '0 <= nums[i] <= n',
      'All the numbers of nums are unique.',
    ],
    hints: [
      'XOR solution: XOR all indices and all numbers, result is missing number',
      'Math solution: Sum of 0 to n minus sum of array',
      'XOR works because: a ^ a = 0, so pairs cancel leaving the missing one',
    ],
    starterCode: {
      javascript: `function missingNumber(nums) {
  // Find the missing number using XOR or math
}`,
      typescript: `function missingNumber(nums: number[]): number {
  // Find the missing number using XOR or math
}`,
      python: `def missingNumber(nums: List[int]) -> int:
    # Find the missing number using XOR or math
    pass`,
      java: `class Solution {
    public int missingNumber(int[] nums) {
        // Find the missing number using XOR or math
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { nums: [3, 0, 1] },
        expected: 2,
        description: 'Missing in middle',
      },
      {
        input: { nums: [0, 1] },
        expected: 2,
        description: 'Missing at end',
      },
      {
        input: { nums: [9, 6, 4, 2, 3, 5, 7, 0, 1] },
        expected: 8,
        description: 'Larger array',
      },
      {
        input: { nums: [1] },
        expected: 0,
        description: 'Missing zero',
      },
      {
        input: { nums: [0] },
        expected: 1,
        description: 'Missing one',
      },
    ],
  },
  {
    id: 'dsa-sum-of-two-integers',
    title: 'Sum of Two Integers',
    type: 'dsa',
    pattern: 'bit-manipulation',
    difficulty: 'medium',
    companies: ['Apple', 'Meta', 'Microsoft', 'Amazon'],
    description: 'Calculate the sum of two integers without using + or - operators',
    tags: ['bit-manipulation', 'math'],
    estimatedTime: 20,
    problemStatement: `Given two integers a and b, return the sum of the two integers without using the operators + and -.`,
    examples: [
      {
        input: 'a = 1, b = 2',
        output: '3',
      },
      {
        input: 'a = 2, b = 3',
        output: '5',
      },
    ],
    constraints: [
      '-1000 <= a, b <= 1000',
    ],
    hints: [
      'XOR gives sum without carry: a ^ b',
      'AND with left shift gives carry: (a & b) << 1',
      'Repeat until carry is 0',
      'Be careful with negative numbers in some languages',
    ],
    starterCode: {
      javascript: `function getSum(a, b) {
  // Add two numbers using only bit operations
}`,
      typescript: `function getSum(a: number, b: number): number {
  // Add two numbers using only bit operations
}`,
      python: `def getSum(a: int, b: int) -> int:
    # Add two numbers using only bit operations
    pass`,
      java: `class Solution {
    public int getSum(int a, int b) {
        // Add two numbers using only bit operations
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: 'O(1) - at most 32 iterations',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { a: 1, b: 2 },
        expected: 3,
        description: 'Simple positive',
      },
      {
        input: { a: 2, b: 3 },
        expected: 5,
        description: 'Another positive',
      },
      {
        input: { a: -1, b: 1 },
        expected: 0,
        description: 'Negative and positive',
      },
      {
        input: { a: 0, b: 0 },
        expected: 0,
        description: 'Both zero',
      },
      {
        input: { a: -2, b: -3 },
        expected: -5,
        description: 'Both negative',
      },
    ],
  },
]
