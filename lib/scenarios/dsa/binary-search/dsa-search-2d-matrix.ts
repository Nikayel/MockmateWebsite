import type { DSAScenario } from "../../types"

export const dsaSearch2dMatrixScenario: DSAScenario = {
  id: "dsa-search-2d-matrix",
  title: "Search a 2D Matrix",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "NVIDIA"],
  description: "Search for a value in an m x n matrix with sorted rows",
  tags: ["array", "binary-search", "matrix"],
  estimatedTime: 20,
  problemStatement: `You are given an m x n integer matrix with the following properties: Each row is sorted in non-decreasing order. The first integer of each row is greater than the last integer of the previous row. Given an integer target, return true if target is in matrix or false otherwise. You must write a solution in O(log(m * n)) time complexity.`,
  examples: [
    { input: "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3", output: "true" },
    { input: "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13", output: "false" },
  ],
  constraints: [
    "m == matrix.length",
    "n == matrix[i].length",
    "1 <= m, n <= 100",
    "-10^4 <= matrix[i][j], target <= 10^4",
  ],
  hints: [
    "Treat matrix as a 1D sorted array",
    "Use binary search on virtual indices",
    "Convert 1D index to 2D: row = idx / n, col = idx % n",
  ],
  starterCode: {
    javascript: `function searchMatrix(matrix, target) {\n  // Write your solution here\n\n}`,
    typescript: `function searchMatrix(matrix: number[][], target: number): boolean {\n  // Write your solution here\n\n}`,
    python: `def searchMatrix(matrix, target):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(log(m * n))", space: "O(1)" },
  testCases: [
    {
      input: {
        matrix: [
          [1, 3, 5, 7],
          [10, 11, 16, 20],
          [23, 30, 34, 60],
        ],
        target: 3,
      },
      expected: true,
      description: "Target found",
    },
    {
      input: {
        matrix: [
          [1, 3, 5, 7],
          [10, 11, 16, 20],
          [23, 30, 34, 60],
        ],
        target: 13,
      },
      expected: false,
      description: "Target not found",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why treat the matrix as a 1D array?",
    "How do you convert a 1D index back to 2D coordinates?",
    "What's the difference between this problem and Search Matrix II?",
    "Could you use two binary searches instead of one?",
  ],

  midCodingProbes: [
    {
      trigger: "converting indices",
      question: "Given 1D index i, what's the formula for row and column?",
    },
    {
      trigger: "setting up search space",
      question: "What's your left and right boundary for the 1D representation?",
    },
  ],
}
