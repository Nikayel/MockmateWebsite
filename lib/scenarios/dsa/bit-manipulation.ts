/**
 * Bit Manipulation DSA Scenarios
 * Pattern: bit-manipulation
 *
 * Bit manipulation problems using XOR, AND, OR, and bit shifts.
 * Essential for low-level programming roles and commonly asked at Google, Apple, Microsoft.
 */

import type { DSAScenario } from "../types"

export const bitManipulationScenarios: DSAScenario[] = [
  {
    id: "dsa-single-number",
    title: "Single Number",
    type: "dsa",
    pattern: "bit-manipulation",
    difficulty: "easy",
    companies: ["Google", "Amazon", "Apple", "Microsoft", "Meta"],
    description:
      "Pick out the lone unpaired value in an array where everything else comes in pairs",
    tags: ["bit-manipulation", "array", "xor"],
    estimatedTime: 10,
    problemStatement: `You're given an integer array nums that always holds at least one entry. Exactly one value inside it occurs a single time; each of the other values occurs twice. Hunt down the value that lacks a partner and return it.

Two hard requirements shape this exercise: total running time proportional to the length of nums, and a fixed amount of working memory no matter how large the input grows.`,
    examples: [
      {
        input: "nums = [6,6,8]",
        output: "8",
      },
      {
        input: "nums = [9,5,7,5,7]",
        output: "9",
      },
      {
        input: "nums = [3]",
        output: "3",
      },
    ],
    constraints: [
      "nums holds between 1 and 3 * 10^4 entries",
      "every entry lies within -3 * 10^4 and 3 * 10^4",
      "One entry of nums has no duplicate; all remaining entries come in matched pairs.",
    ],
    hints: [
      "XOR of a number with itself is 0: a ^ a = 0",
      "XOR of a number with 0 is the number itself: a ^ 0 = a",
      "XOR is associative and commutative, so order doesn't matter",
      "XOR all numbers together - pairs cancel out, leaving the single number",
    ],
    starterCode: {
      javascript: `function singleNumber(nums) {
  // Use XOR to find the single number
}`,
      typescript: `function singleNumber(nums: number[]): number {
  // Use XOR to find the single number
}`,
      python: `def singleNumber(nums: list[int]) -> int:
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
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [2, 2, 1] },
        expected: 1,
        description: "Single at end",
      },
      {
        input: { nums: [4, 1, 2, 1, 2] },
        expected: 4,
        description: "Single at beginning",
      },
      {
        input: { nums: [1] },
        expected: 1,
        description: "Only one element",
      },
      {
        input: { nums: [-1, -1, -2] },
        expected: -2,
        description: "Negative numbers",
      },
      {
        input: { nums: [0, 1, 0] },
        expected: 1,
        description: "With zeros",
      },
    ],
  },
  {
    id: "dsa-number-of-1-bits",
    title: "Number of 1 Bits",
    type: "dsa",
    pattern: "bit-manipulation",
    difficulty: "easy",
    companies: ["Apple", "Microsoft", "Google", "Amazon"],
    description: "Report how many ones a 32-bit binary pattern contains",
    tags: ["bit-manipulation", "divide-and-conquer"],
    estimatedTime: 10,
    problemStatement: `You're handed the 32-bit binary form of an unsigned integer n. Count how many of its positions hold a '1' and return that count, the quantity often called the Hamming weight of n.`,
    examples: [
      {
        input: "n = 00000000000000000000000000101101",
        output: "4",
        explanation: "Four positions hold a '1': the bits worth 32, 8, 4, and 1.",
      },
      {
        input: "n = 00000000000000000000010000000000",
        output: "1",
        explanation: "Only the bit worth 1024 is set.",
      },
      {
        input: "n = 11111111111111111111111111100111",
        output: "30",
        explanation: "Every position is set except the two worth 8 and 16.",
      },
    ],
    constraints: ["n arrives as a binary string exactly 32 characters long"],
    hints: [
      "Method 1: Check each bit by shifting right and AND with 1",
      "Method 2: Use n & (n-1) trick to clear the rightmost 1 bit",
      "n & (n-1) removes the least significant 1 bit each time",
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
      time: "O(1) - at most 32 iterations",
      space: "O(1)",
    },
    testCases: [
      {
        input: { n: 11 },
        expected: 3,
        description: "Binary: 1011",
      },
      {
        input: { n: 128 },
        expected: 1,
        description: "Power of 2",
      },
      {
        input: { n: 4294967293 },
        expected: 31,
        description: "Large number with many 1s",
      },
      {
        input: { n: 0 },
        expected: 0,
        description: "Zero",
      },
      {
        input: { n: 1 },
        expected: 1,
        description: "One",
      },
    ],
  },
  {
    id: "dsa-counting-bits",
    title: "Counting Bits",
    type: "dsa",
    pattern: "bit-manipulation",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Microsoft"],
    description: "Tally the set bits of every integer from 0 through n into one array",
    tags: ["bit-manipulation", "dynamic-programming"],
    estimatedTime: 15,
    problemStatement: `You're given a single integer n. For every integer i from 0 through n, work out how many bits in the binary form of i are set to 1. Collect the tallies into an array ans of length n + 1, where ans[i] carries the count for i, and return that whole array.`,
    examples: [
      {
        input: "n = 3",
        output: "[0,1,1,2]",
        explanation:
          "The binary forms of 0, 1, 2, 3 are 0, 1, 10, 11, which contain 0, 1, 1 and 2 ones respectively.",
      },
      {
        input: "n = 6",
        output: "[0,1,1,2,1,2,2]",
        explanation:
          "The binary forms of 0 through 6 are 0, 1, 10, 11, 100, 101, 110, carrying 0, 1, 1, 2, 1, 2, 2 ones respectively.",
      },
    ],
    constraints: ["n is at least 0 and at most 10^5"],
    hints: [
      "Use DP: ans[i] = ans[i >> 1] + (i & 1)",
      "i >> 1 is i divided by 2, and (i & 1) checks if last bit is 1",
      "Alternative: ans[i] = ans[i & (i-1)] + 1 using the clear rightmost bit trick",
    ],
    starterCode: {
      javascript: `function countBits(n) {
  // Use DP to count bits for each number
}`,
      typescript: `function countBits(n: number): number[] {
  // Use DP to count bits for each number
}`,
      python: `def countBits(n: int) -> list[int]:
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
      time: "O(n)",
      space: "O(n) for the output array",
    },
    testCases: [
      {
        input: { n: 2 },
        expected: [0, 1, 1],
        description: "Small n",
      },
      {
        input: { n: 5 },
        expected: [0, 1, 1, 2, 1, 2],
        description: "Standard case",
      },
      {
        input: { n: 0 },
        expected: [0],
        description: "Zero",
      },
      {
        input: { n: 7 },
        expected: [0, 1, 1, 2, 1, 2, 2, 3],
        description: "Up to 7",
      },
    ],
  },
  {
    id: "dsa-reverse-bits",
    title: "Reverse Bits",
    type: "dsa",
    pattern: "bit-manipulation",
    difficulty: "easy",
    companies: ["Apple", "Microsoft", "Google"],
    description: "Mirror the 32-bit pattern of an unsigned integer end to end",
    tags: ["bit-manipulation", "divide-and-conquer"],
    estimatedTime: 15,
    problemStatement: `Your input n is an unsigned 32-bit integer, delivered as a binary string of exactly 32 characters. Mirror the whole bit pattern end to end: the lowest-order bit trades places with the highest-order bit, the second-lowest with the second-highest, and so on through all 32 positions. Return the unsigned integer that the mirrored pattern encodes.

One housekeeping note: some languages, Java among them, have no unsigned type, so there the same 32 bits ride in a signed integer for both input and output. Only the bit pattern itself matters.`,
    examples: [
      {
        input: "n = 00000000000000000000000011010010",
        output: "1258291200 (01001011000000000000000000000000)",
        explanation:
          "The incoming string encodes the unsigned value 210. Read back to front, the bits spell 01001011 followed by 24 zeros, which encodes 1258291200.",
      },
      {
        input: "n = 11111111111111111111111111110111",
        output: "4026531839 (11101111111111111111111111111111)",
      },
    ],
    constraints: ["the input arrives as a binary string spanning exactly 32 characters"],
    hints: [
      "Process bit by bit from right to left",
      "Get rightmost bit with n & 1",
      "Build result by shifting left and adding the bit",
      "Shift n right to process next bit",
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
      time: "O(1) - exactly 32 iterations",
      space: "O(1)",
    },
    testCases: [
      {
        input: { n: 43261596 },
        expected: 964176192,
        description: "Standard case",
      },
      {
        input: { n: 4294967293 },
        expected: 3221225471,
        description: "Large number",
      },
      {
        input: { n: 0 },
        expected: 0,
        description: "Zero stays zero",
      },
      {
        input: { n: 1 },
        expected: 2147483648,
        description: "Single bit at end moves to start",
      },
    ],
  },
  {
    id: "dsa-missing-number",
    title: "Missing Number",
    type: "dsa",
    pattern: "bit-manipulation",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Spot the one value from the range 0..n that a shuffled array skips",
    tags: ["bit-manipulation", "array", "math", "xor"],
    estimatedTime: 10,
    problemStatement: `You've been handed an integer array nums holding n distinct values, every one of them drawn from the range 0 to n inclusive. That range offers n + 1 candidates while the array only has room for n of them, so exactly one candidate never made it in. Track down the absent value and return it.`,
    examples: [
      {
        input: "nums = [4,1,3,0]",
        output: "2",
        explanation:
          "Four entries mean the candidates run 0 through 4, and every candidate shows up except 2.",
      },
      {
        input: "nums = [1,0,2]",
        output: "3",
        explanation:
          "With three entries the candidates run 0 through 3, and the top value 3 is the one that never appears.",
      },
      {
        input: "nums = [7,2,5,0,8,3,6,1]",
        output: "4",
      },
    ],
    constraints: [
      "n equals the length of nums",
      "n falls between 1 and 10^4",
      "every entry of nums lies between 0 and n",
      "nums never repeats a value",
    ],
    hints: [
      "XOR solution: XOR all indices and all numbers, result is missing number",
      "Math solution: Sum of 0 to n minus sum of array",
      "XOR works because: a ^ a = 0, so pairs cancel leaving the missing one",
    ],
    starterCode: {
      javascript: `function missingNumber(nums) {
  // Find the missing number using XOR or math
}`,
      typescript: `function missingNumber(nums: number[]): number {
  // Find the missing number using XOR or math
}`,
      python: `def missingNumber(nums: list[int]) -> int:
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
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [3, 0, 1] },
        expected: 2,
        description: "Missing in middle",
      },
      {
        input: { nums: [0, 1] },
        expected: 2,
        description: "Missing at end",
      },
      {
        input: { nums: [9, 6, 4, 2, 3, 5, 7, 0, 1] },
        expected: 8,
        description: "Larger array",
      },
      {
        input: { nums: [1] },
        expected: 0,
        description: "Missing zero",
      },
      {
        input: { nums: [0] },
        expected: 1,
        description: "Missing one",
      },
    ],
  },
  {
    id: "dsa-sum-of-two-integers",
    title: "Sum of Two Integers",
    type: "dsa",
    pattern: "bit-manipulation",
    difficulty: "medium",
    companies: ["Apple", "Meta", "Microsoft", "Amazon"],
    description: "Add two integers while the + and - operators stay off the table",
    tags: ["bit-manipulation", "math"],
    estimatedTime: 20,
    problemStatement: `You're given two integers a and b and asked for their sum, under the single restriction that defines this problem: the + and - operators are forbidden everywhere in your solution. No adding, no subtracting, not even buried inside a larger expression; every other tool your language offers remains fair game.

Return the value that a plus b would produce, computed without ever writing + or -.`,
    examples: [
      {
        input: "a = 6, b = 7",
        output: "13",
      },
      {
        input: "a = 3, b = 9",
        output: "12",
      },
    ],
    constraints: ["a and b each fall between -1000 and 1000"],
    hints: [
      "XOR gives sum without carry: a ^ b",
      "AND with left shift gives carry: (a & b) << 1",
      "Repeat until carry is 0",
      "Be careful with negative numbers in some languages",
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
      time: "O(1) - at most 32 iterations",
      space: "O(1)",
    },
    testCases: [
      {
        input: { a: 1, b: 2 },
        expected: 3,
        description: "Simple positive",
      },
      {
        input: { a: 2, b: 3 },
        expected: 5,
        description: "Another positive",
      },
      {
        input: { a: -1, b: 1 },
        expected: 0,
        description: "Negative and positive",
      },
      {
        input: { a: 0, b: 0 },
        expected: 0,
        description: "Both zero",
      },
      {
        input: { a: -2, b: -3 },
        expected: -5,
        description: "Both negative",
      },
    ],
  },
]
