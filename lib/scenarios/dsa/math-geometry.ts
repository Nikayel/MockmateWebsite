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
    description: "Turn a square matrix 90 degrees clockwise without allocating a second grid",
    tags: ["array", "matrix", "math"],
    estimatedTime: 20,
    problemStatement: `You're working with a square image stored as an n x n matrix of pixel values, and the picture needs to turn 90 degrees clockwise. After the turn, what was the top row of matrix should read down its rightmost column.

Do the whole transformation in-place: overwrite the entries of matrix itself as you work. Building a second array to hold the rotated result is off the table.`,
    examples: [
      {
        input: "matrix = [[2,14,8],[5,7,11],[16,3,9]]",
        output: "[[16,5,2],[3,7,14],[9,11,8]]",
      },
      {
        input: "matrix = [[21,3,17,6],[10,25,8,19],[4,12,30,7],[18,9,5,22]]",
        output: "[[18,4,10,21],[9,12,25,3],[5,30,8,17],[22,7,19,6]]",
      },
    ],
    constraints: [
      "matrix is always square, with n == matrix.length == matrix[i].length",
      "The side length obeys 1 <= n <= 20",
      "Every cell holds a value in -1000 <= matrix[i][j] <= 1000",
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
      "Parse a string into a 32-bit signed integer, honoring whitespace, sign, and clamping rules.",
    tags: ["string", "implementation"],
    estimatedTime: 30,
    problemStatement: `You're building myAtoi(s), a parser that turns the string s into a 32-bit signed integer, mirroring how C's atoi behaves.

Scan s from the left. First, skip past any run of leading spaces. Next, if the character you land on is '+' or '-', consume it: a '-' marks the outcome negative, while a '+' or no sign at all leaves it positive. Then keep consuming digit characters, accumulating the number they spell, and stop the moment you meet anything that is not a digit or run out of string; whatever comes after is irrelevant. Leading zeros carry no weight, so "0057" spells 57, and if you never consumed a single digit the value is 0.

Finally, apply the sign and clamp: anything below -2^31 becomes -2^31, and anything above 2^31 - 1 becomes 2^31 - 1. Hand back that clamped value.`,
    examples: [
      {
        input: 's = "731"',
        output: "731",
      },
      {
        input: 's = "   -905"',
        output: "-905",
        explanation: "Spaces are skipped, then the minus sign makes the parsed 905 negative",
      },
      {
        input: 's = "2681 apples"',
        output: "2681",
        explanation: "Digits are consumed until the space; everything after is discarded",
      },
    ],
    constraints: [
      "The length can be anywhere in 0 <= s.length <= 200",
      "Only upper-case and lower-case English letters, digits (0-9), ' ', '+', '-', and '.' appear in s",
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
    description: "Flatten a rectangular matrix by walking it in a clockwise spiral",
    tags: ["array", "matrix", "simulation"],
    estimatedTime: 25,
    problemStatement: `You're looking at an m x n grid called matrix, and you need to flatten it into a single list by visiting cells in spiral order.

Start at the top-left corner and sweep across the first row. On hitting the edge, head down the final column, then backwards along the bottom row, then up the leftmost column, and keep circling inward ring by ring until every cell has been visited exactly once. Return the values in the order you collected them.`,
    examples: [
      { input: "matrix = [[12,4,25],[7,18,9],[31,6,15]]", output: "[12,4,25,9,15,6,31,7,18]" },
      {
        input: "matrix = [[3,14,8,21],[6,17,2,10],[19,5,13,26]]",
        output: "[3,14,8,21,10,26,13,5,19,6,17,2]",
      },
    ],
    constraints: [
      "The row count is m == matrix.length",
      "Each row carries n == matrix[i].length entries",
      "Dimensions stay small: 1 <= m, n <= 10",
      "Cell values sit in -100 <= matrix[i][j] <= 100",
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
    description: "Wipe the full row and column of every cell that starts out as 0, in place",
    tags: ["array", "matrix", "hash-table"],
    estimatedTime: 25,
    problemStatement: `You're handed an m x n integer grid named matrix, and some of its cells hold 0. For every such cell, the whole row and the whole column it sits in have to end up filled with 0's.

Only zeros present in the original grid trigger a wipe; the 0's you write while clearing rows and columns never cascade further. Carry out the rewrite in place, mutating matrix directly rather than assembling a fresh grid for the answer.`,
    examples: [
      { input: "matrix = [[4,7,2],[6,0,9],[3,8,5]]", output: "[[4,0,2],[0,0,0],[3,0,5]]" },
      {
        input: "matrix = [[7,3,0,6],[0,8,4,9],[5,2,6,1]]",
        output: "[[0,0,0,0],[0,0,0,0],[0,2,0,1]]",
      },
    ],
    constraints: [
      "The grid has m == matrix.length rows",
      "It has n == matrix[0].length columns",
      "Both dimensions satisfy 1 <= m, n <= 200",
      "A cell can be as small as -2^31 or as large as 2^31 - 1",
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
    description: "Raise a floating-point base x to an integer exponent n, negatives included",
    tags: ["math", "recursion", "binary-exponentiation"],
    estimatedTime: 20,
    problemStatement: `You're writing the power function from scratch. myPow(x, n) receives a floating-point base x and an integer exponent n, and it should evaluate x raised to the power n.

Keep in mind that n can be zero or negative as well as positive; a negative exponent means the reciprocal, one over x raised to the matching positive exponent.`,
    examples: [
      { input: "x = 3.00000, n = 5", output: "243.00000" },
      { input: "x = 1.50000, n = 4", output: "5.06250" },
      {
        input: "x = 4.00000, n = -2",
        output: "0.06250",
        explanation: "4^-2 = 1/4^2 = 1/16 = 0.0625",
      },
    ],
    constraints: [
      "The base is strictly inside -100.0 < x < 100.0",
      "The exponent sits in -2^31 <= n <= 2^31 - 1",
      "n is a whole number, never a fraction",
      "Every answer stays within -10^4 <= x^n <= 10^4",
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
    description: "Add one to a huge number stored as an array of decimal digits",
    tags: ["array", "math"],
    estimatedTime: 15,
    problemStatement: `You're managing a very large number that arrives as an array called digits: one decimal digit per slot, ordered with the most significant digit first.

Add exactly one to the value it represents and return the resulting digits in the same layout.`,
    examples: [
      {
        input: "digits = [2,7,5]",
        output: "[2,7,6]",
        explanation: "The array spells out 275, and adding one gives 276.",
      },
      { input: "digits = [8,0,6,4]", output: "[8,0,6,5]" },
      { input: "digits = [9,9]", output: "[1,0,0]" },
    ],
    constraints: [
      "The length stays within 1 <= digits.length <= 100",
      "Every slot is a single decimal digit: 0 <= digits[i] <= 9",
      "digits never starts with a leading 0",
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
    description: "Decide whether repeatedly summing squared digits drives n down to 1",
    tags: ["math", "hash-table", "two-pointers"],
    estimatedTime: 15,
    problemStatement: `You're given a positive integer n and must decide whether it is a happy number.

Here is the test for happiness: square each decimal digit of the current value and add those squares together to get the next value. Repeating this step either drives the sequence to 1, where it stays forever, or traps it in an endless loop of values that never includes 1.

Return true when n eventually reaches 1, and false when it never will.`,
    examples: [
      {
        input: "n = 23",
        output: "true",
        explanation: "2^2 + 3^2 = 13 -> 1^2 + 3^2 = 10 -> 1^2 + 0^2 = 1",
      },
      { input: "n = 4", output: "false" },
    ],
    constraints: ["The input satisfies 1 <= n <= 2^31 - 1"],
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
    description: "Read a Roman numeral string and compute the number it stands for",
    tags: ["string", "math", "hash-table"],
    estimatedTime: 15,
    problemStatement: `You're given a string s holding a Roman numeral, and your job is to work out the integer it encodes.

Roman notation builds every number from seven symbols:

Symbol       Value
I             1
V             5
X             10
L             50
C             100
D             500
M             1000

Most numerals run in descending order of value, and you simply add the symbols up: VI is 6, XXI is 21. Six pairings subtract instead. When I sits directly in front of V or X, the pair reads 4 or 9. When X sits in front of L or C, the pair reads 40 or 90. And when C sits in front of D or M, the pair reads 400 or 900.`,
    examples: [
      { input: 's = "XVI"', output: "16", explanation: "X = 10, V = 5, I = 1" },
      { input: 's = "MMXXVI"', output: "2026", explanation: "MM = 2000, XX = 20, VI = 6" },
      {
        input: 's = "CDXLIX"',
        output: "449",
        explanation: "CD = 400, XL = 40, IX = 9",
      },
    ],
    constraints: [
      "The length is bounded by 1 <= s.length <= 15",
      "No characters besides I, V, X, L, C, D, and M appear in s",
      "s is always a well-formed Roman numeral for a value in [1, 3999]",
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
