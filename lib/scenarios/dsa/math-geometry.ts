/**
 * Math & Geometry DSA Scenarios
 * Pattern: math-geometry
 */

import type { DSAScenario } from '../types'

export const mathGeometryScenarios: DSAScenario[] = [
  {
    id: 'dsa-rotate-image',
    title: 'Rotate Image',
    type: 'dsa',
    pattern: 'math-geometry',
    difficulty: 'medium',
    companies: ['Amazon', 'Apple', 'Microsoft', 'Meta'],
    description: 'Rotate an N x N 2D matrix by 90 degrees clockwise in-place',
    tags: ['array', 'matrix', 'math'],
    estimatedTime: 20,
    problemStatement: `You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise).

You have to rotate the image in-place, which means you have to modify the input 2D matrix directly. DO NOT allocate another 2D matrix and do the rotation.`,
    examples: [
      {
        input: 'matrix = [[1,2,3],[4,5,6],[7,8,9]]',
        output: '[[7,4,1],[8,5,2],[9,6,3]]',
      },
      {
        input: 'matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]',
        output: '[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]',
      },
    ],
    constraints: [
      'n == matrix.length == matrix[i].length',
      '1 <= n <= 20',
      '-1000 <= matrix[i][j] <= 1000',
    ],
    hints: [
      'Transpose the matrix first (swap rows and columns)',
      'Then reverse each row',
      'Alternative: Rotate in layers from outside to inside',
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
      time: 'O(n^2)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { matrix: [[1,2,3],[4,5,6],[7,8,9]] },
        expected: [[7,4,1],[8,5,2],[9,6,3]],
        description: '3x3 matrix rotation',
      },
      {
        input: { matrix: [[1]] },
        expected: [[1]],
        description: '1x1 matrix',
      },
      {
        input: { matrix: [[1,2],[3,4]] },
        expected: [[3,1],[4,2]],
        description: '2x2 matrix',
      },
    ],
  },
  {
    id: 'dsa-string-to-integer-atoi',
    title: 'String to Integer (atoi)',
    type: 'dsa',
    pattern: 'math-geometry',
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
  },
]

export default mathGeometryScenarios
