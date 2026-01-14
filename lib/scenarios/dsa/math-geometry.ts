/**
 * Math & Geometry DSA Scenarios
 * Pattern: math-geometry
 */

import type { DSAScenario } from "../types"

export const mathGeometryScenarios: DSAScenario[] = [
  {
    id: "dsa-rotate-image",
    title: "Rotate Image",
    type: "dsa",
    pattern: "math-geometry",
    difficulty: "medium",
    companies: ["Amazon", "Apple", "Microsoft", "Meta"],
    description: "Rotate an N x N 2D matrix by 90 degrees clockwise in-place",
    tags: ["array", "matrix", "math"],
    estimatedTime: 20,
    problemStatement: `You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise).

You have to rotate the image in-place, which means you have to modify the input 2D matrix directly. DO NOT allocate another 2D matrix and do the rotation.`,
    examples: [
      {
        input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
        output: "[[7,4,1],[8,5,2],[9,6,3]]",
      },
      {
        input: "matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]",
        output: "[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]",
      },
    ],
    constraints: [
      "n == matrix.length == matrix[i].length",
      "1 <= n <= 20",
      "-1000 <= matrix[i][j] <= 1000",
    ],
    hints: [
      "Transpose the matrix first (swap rows and columns)",
      "Then reverse each row",
      "Alternative: Rotate in layers from outside to inside",
    ],
    starterCode: {
      javascript: `function rotate(matrix) {
  // Write your solution here (modify matrix in-place)

}`,
      typescript: `function rotate(matrix: number[][]): void {
  // Write your solution here (modify matrix in-place)

}`,
      python: `def rotate(matrix):
    # Write your solution here (modify matrix in-place)
    pass`,
      java: `class Solution {
    public void rotate(int[][] matrix) {
        // Write your solution here
    }
}`,
      cpp: `class Solution {
public:
    void rotate(vector<vector<int>>& matrix) {
        // Write your solution here
    }
};`,
      csharp: `public class Solution {
    public void Rotate(int[][] matrix) {
        // Write your solution here
    }
}`,
      go: `func rotate(matrix [][]int) {
    // Write your solution here
}`,
      rust: `impl Solution {
    pub fn rotate(matrix: &mut Vec<Vec<i32>>) {
        // Write your solution here
    }
}`,
    },
    optimalComplexity: {
      time: "O(n^2)",
      space: "O(1)",
    },
    testCases: [
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        expected: [
          [7, 4, 1],
          [8, 5, 2],
          [9, 6, 3],
        ],
        description: "3x3 matrix rotation",
      },
      {
        input: { matrix: [[1]] },
        expected: [[1]],
        description: "1x1 matrix",
      },
      {
        input: {
          matrix: [
            [1, 2],
            [3, 4],
          ],
        },
        expected: [
          [3, 1],
          [4, 2],
        ],
        description: "2x2 matrix",
      },
    ],
  },
  {
    id: "dsa-string-to-integer-atoi",
    title: "String to Integer (atoi)",
    type: "dsa",
    pattern: "math-geometry",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Microsoft"],
    description:
      "Implement the myAtoi(string s) function which converts a string to a 32-bit signed integer.",
    tags: ["string", "implementation"],
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
        output: "42",
      },
      {
        input: 's = "   -42"',
        output: "-42",
        explanation: 'Leading whitespace is ignored, then "-" is read so result is negative',
      },
      {
        input: 's = "4193 with words"',
        output: "4193",
        explanation: "Reading stops at first non-digit character",
      },
    ],
    constraints: [
      "0 <= s.length <= 200",
      "s consists of English letters (lower-case and upper-case), digits (0-9), ' ', '+', '-', and '.'.",
    ],
    hints: [
      "Handle edge cases: leading whitespace, sign, overflow",
      "Stop reading at first non-digit character",
      "Clamp to 32-bit integer range",
    ],
    starterCode: {
      javascript: `function myAtoi(s) {
  // Your code here
}`,
      python: `def myAtoi(s):
    # Your code here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { s: "42" },
        expected: 42,
        description: "Simple positive number",
      },
      {
        input: { s: "   -42" },
        expected: -42,
        description: "Leading whitespace with negative",
      },
      {
        input: { s: "4193 with words" },
        expected: 4193,
        description: "Stop at non-digit",
      },
      {
        input: { s: "words and 987" },
        expected: 0,
        description: "Leading non-digits",
      },
    ],
  },
  {
    id: "dsa-spiral-matrix",
    title: "Spiral Matrix",
    type: "dsa",
    pattern: "math-geometry",
    difficulty: "medium",
    companies: ["Amazon", "Apple", "Microsoft", "Meta", "Google"],
    description: "Return all elements of a matrix in spiral order",
    tags: ["array", "matrix", "simulation"],
    estimatedTime: 25,
    problemStatement: `Given an m x n matrix, return all elements of the matrix in spiral order.`,
    examples: [
      { input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]", output: "[1,2,3,6,9,8,7,4,5]" },
      {
        input: "matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]",
        output: "[1,2,3,4,8,12,11,10,9,5,6,7]",
      },
    ],
    constraints: [
      "m == matrix.length",
      "n == matrix[i].length",
      "1 <= m, n <= 10",
      "-100 <= matrix[i][j] <= 100",
    ],
    hints: [
      "Track boundaries: top, bottom, left, right",
      "Traverse right, down, left, up in order",
      "Shrink boundaries after each direction",
    ],
    starterCode: {
      javascript: `function spiralOrder(matrix) {\n  // Write your solution here\n\n}`,
      typescript: `function spiralOrder(matrix: number[][]): number[] {\n  // Write your solution here\n\n}`,
      python: `def spiralOrder(matrix):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(m * n)", space: "O(1)" },
    testCases: [
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        expected: [1, 2, 3, 6, 9, 8, 7, 4, 5],
        description: "3x3 matrix",
      },
      {
        input: {
          matrix: [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
          ],
        },
        expected: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7],
        description: "3x4 matrix",
      },
    ],
  },
  {
    id: "dsa-set-matrix-zeroes",
    title: "Set Matrix Zeroes",
    type: "dsa",
    pattern: "math-geometry",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Microsoft", "Google"],
    description: "Set entire row and column to 0 if an element is 0",
    tags: ["array", "matrix", "hash-table"],
    estimatedTime: 25,
    problemStatement: `Given an m x n integer matrix, if an element is 0, set its entire row and column to 0's. You must do it in place.`,
    examples: [
      { input: "matrix = [[1,1,1],[1,0,1],[1,1,1]]", output: "[[1,0,1],[0,0,0],[1,0,1]]" },
      {
        input: "matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]",
        output: "[[0,0,0,0],[0,4,5,0],[0,3,1,0]]",
      },
    ],
    constraints: [
      "m == matrix.length",
      "n == matrix[0].length",
      "1 <= m, n <= 200",
      "-2^31 <= matrix[i][j] <= 2^31 - 1",
    ],
    hints: [
      "Use first row and column as markers",
      "Store if first row/column originally had zeros",
      "Iterate and mark, then iterate and set zeros",
    ],
    starterCode: {
      javascript: `function setZeroes(matrix) {\n  // Write your solution here (modify in place)\n\n}`,
      typescript: `function setZeroes(matrix: number[][]): void {\n  // Write your solution here (modify in place)\n\n}`,
      python: `def setZeroes(matrix):\n    # Write your solution here (modify in place)\n    pass`,
    },
    optimalComplexity: { time: "O(m * n)", space: "O(1)" },
    testCases: [
      {
        input: {
          matrix: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1],
          ],
        },
        expected: [
          [1, 0, 1],
          [0, 0, 0],
          [1, 0, 1],
        ],
        description: "Single zero",
      },
      {
        input: {
          matrix: [
            [0, 1, 2, 0],
            [3, 4, 5, 2],
            [1, 3, 1, 5],
          ],
        },
        expected: [
          [0, 0, 0, 0],
          [0, 4, 5, 0],
          [0, 3, 1, 0],
        ],
        description: "Corner zeros",
      },
    ],
  },
  {
    id: "dsa-pow-x-n",
    title: "Pow(x, n)",
    type: "dsa",
    pattern: "math-geometry",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Implement pow(x, n), which calculates x raised to the power n",
    tags: ["math", "recursion", "binary-exponentiation"],
    estimatedTime: 20,
    problemStatement: `Implement pow(x, n), which calculates x raised to the power n (i.e., x^n).`,
    examples: [
      { input: "x = 2.00000, n = 10", output: "1024.00000" },
      { input: "x = 2.10000, n = 3", output: "9.26100" },
      { input: "x = 2.00000, n = -2", output: "0.25000", explanation: "2^-2 = 1/2^2 = 1/4 = 0.25" },
    ],
    constraints: [
      "-100.0 < x < 100.0",
      "-2^31 <= n <= 2^31 - 1",
      "n is an integer",
      "-10^4 <= x^n <= 10^4",
    ],
    hints: [
      "Use binary exponentiation for O(log n) time",
      "Handle negative exponents: x^-n = 1/x^n",
      "Be careful with integer overflow for n = -2^31",
    ],
    starterCode: {
      javascript: `function myPow(x, n) {\n  // Write your solution here\n\n}`,
      typescript: `function myPow(x: number, n: number): number {\n  // Write your solution here\n\n}`,
      python: `def myPow(x, n):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(log n)", space: "O(log n)" },
    testCases: [
      { input: { x: 2.0, n: 10 }, expected: 1024.0, description: "Positive exponent" },
      { input: { x: 2.0, n: -2 }, expected: 0.25, description: "Negative exponent" },
    ],
  },
  {
    id: "dsa-plus-one",
    title: "Plus One",
    type: "dsa",
    pattern: "math-geometry",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Apple"],
    description: "Increment a large integer represented as an array of digits",
    tags: ["array", "math"],
    estimatedTime: 15,
    problemStatement: `You are given a large integer represented as an integer array digits, where each digits[i] is the ith digit of the integer. The digits are ordered from most significant to least significant. Increment the large integer by one and return the resulting array of digits.`,
    examples: [
      {
        input: "digits = [1,2,3]",
        output: "[1,2,4]",
        explanation: "The array represents the integer 123.",
      },
      { input: "digits = [4,3,2,1]", output: "[4,3,2,2]" },
      { input: "digits = [9]", output: "[1,0]" },
    ],
    constraints: [
      "1 <= digits.length <= 100",
      "0 <= digits[i] <= 9",
      "digits does not contain any leading 0's",
    ],
    hints: [
      "Start from the rightmost digit",
      "Handle carry propagation",
      "If all 9s, need to add a new leading 1",
    ],
    starterCode: {
      javascript: `function plusOne(digits) {\n  // Write your solution here\n\n}`,
      typescript: `function plusOne(digits: number[]): number[] {\n  // Write your solution here\n\n}`,
      python: `def plusOne(digits):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { digits: [1, 2, 3] }, expected: [1, 2, 4], description: "No carry" },
      { input: { digits: [9, 9, 9] }, expected: [1, 0, 0, 0], description: "All 9s" },
    ],
  },
  {
    id: "dsa-happy-number",
    title: "Happy Number",
    type: "dsa",
    pattern: "math-geometry",
    difficulty: "easy",
    companies: ["Amazon", "Apple", "Google"],
    description: "Determine if a number is happy (sum of squares of digits eventually equals 1)",
    tags: ["math", "hash-table", "two-pointers"],
    estimatedTime: 15,
    problemStatement: `A happy number is a number defined by the process: Starting with any positive integer, replace the number by the sum of the squares of its digits. Repeat the process until the number equals 1 (it will stay at 1), or it loops endlessly in a cycle. Return true if n is a happy number, false otherwise.`,
    examples: [
      {
        input: "n = 19",
        output: "true",
        explanation: "1^2 + 9^2 = 82 -> 8^2 + 2^2 = 68 -> 6^2 + 8^2 = 100 -> 1^2 + 0^2 + 0^2 = 1",
      },
      { input: "n = 2", output: "false" },
    ],
    constraints: ["1 <= n <= 2^31 - 1"],
    hints: [
      "Use a set to detect cycles",
      "Alternative: Floyd's cycle detection with slow/fast pointers",
      "Calculate sum of squares of digits repeatedly",
    ],
    starterCode: {
      javascript: `function isHappy(n) {\n  // Write your solution here\n\n}`,
      typescript: `function isHappy(n: number): boolean {\n  // Write your solution here\n\n}`,
      python: `def isHappy(n):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(log n)", space: "O(1)" },
    testCases: [
      { input: { n: 19 }, expected: true, description: "Happy number" },
      { input: { n: 2 }, expected: false, description: "Not happy" },
    ],
  },
  {
    id: "dsa-roman-to-integer",
    title: "Roman to Integer",
    type: "dsa",
    pattern: "math-geometry",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Microsoft", "Roblox", "NVIDIA"],
    description: "Convert a Roman numeral string to an integer",
    tags: ["string", "math", "hash-table"],
    estimatedTime: 15,
    problemStatement: `Roman numerals are represented by seven different symbols: I, V, X, L, C, D and M.

Symbol       Value
I             1
V             5
X             10
L             50
C             100
D             500
M             1000

For example, 2 is written as II, 12 as XII, and 27 as XXVII.

Roman numerals are usually written largest to smallest from left to right. However, there are subtraction cases:
- I can be placed before V (5) and X (10) to make 4 and 9.
- X can be placed before L (50) and C (100) to make 40 and 90.
- C can be placed before D (500) and M (1000) to make 400 and 900.

Given a roman numeral, convert it to an integer.`,
    examples: [
      { input: 's = "III"', output: "3", explanation: "III = 3" },
      { input: 's = "LVIII"', output: "58", explanation: "L = 50, V= 5, III = 3" },
      {
        input: 's = "MCMXCIV"',
        output: "1994",
        explanation: "M = 1000, CM = 900, XC = 90 and IV = 4",
      },
    ],
    constraints: [
      "1 <= s.length <= 15",
      "s contains only the characters (I, V, X, L, C, D, M)",
      "It is guaranteed that s is a valid roman numeral in the range [1, 3999]",
    ],
    hints: [
      "Use a hash map to store symbol values",
      "If current value < next value, subtract; otherwise add",
      "Process from left to right or right to left",
    ],
    starterCode: {
      javascript: `function romanToInt(s) {
  // Write your solution here

}`,
      typescript: `function romanToInt(s: string): number {
  // Write your solution here

}`,
      python: `def romanToInt(s):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int romanToInt(String s) {
        // Write your solution here
        return 0;
    }
}`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { s: "III" }, expected: 3, description: "Simple addition" },
      { input: { s: "IV" }, expected: 4, description: "Subtraction case" },
      { input: { s: "IX" }, expected: 9, description: "Subtraction case" },
      { input: { s: "LVIII" }, expected: 58, description: "Mixed numerals" },
      {
        input: { s: "MCMXCIV" },
        expected: 1994,
        description: "Complex with multiple subtractions",
      },
    ],
  },
]

export default mathGeometryScenarios
