/**
 * Backtracking DSA Scenarios
 * Pattern: backtracking
 */

import type { DSAScenario } from "../types"

export const backtrackingScenarios: DSAScenario[] = [
  {
    id: "dsa-word-search",
    title: "Word Search",
    type: "dsa",
    pattern: "backtracking",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Microsoft", "Apple"],
    description: "Search for a word in a 2D board using backtracking",
    tags: ["array", "backtracking", "matrix"],
    estimatedTime: 25,
    problemStatement: `Given an m x n grid of characters board and a string word, return true if word exists in the grid.

The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.`,
    examples: [
      {
        input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"',
        output: "true",
      },
      {
        input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"',
        output: "true",
      },
      {
        input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"',
        output: "false",
      },
    ],
    constraints: [
      "m == board.length",
      "n = board[i].length",
      "1 <= m, n <= 6",
      "1 <= word.length <= 15",
      "board and word consists of only lowercase and uppercase English letters",
    ],
    hints: [
      "Use backtracking to explore all paths",
      "Mark visited cells temporarily to avoid reuse",
      "Restore state after each recursive call",
    ],
    starterCode: {
      javascript: `function exist(board, word) {
  // Write your solution here

}`,
      typescript: `function exist(board: string[][], word: string): boolean {
  // Write your solution here

}`,
      python: `def exist(board, word):
    # Write your solution here
    pass`,
      java: `class Solution {
    public boolean exist(char[][] board, String word) {
        // Write your solution here
        return false;
    }
}`,
      cpp: `class Solution {
public:
    bool exist(vector<vector<char>>& board, string word) {
        // Write your solution here
        return false;
    }
};`,
      csharp: `public class Solution {
    public bool Exist(char[][] board, string word) {
        // Write your solution here
        return false;
    }
}`,
      go: `func exist(board [][]byte, word string) bool {
    // Write your solution here
    return false
}`,
      rust: `impl Solution {
    pub fn exist(board: Vec<Vec<char>>, word: String) -> bool {
        // Write your solution here
        false
    }
}`,
    },
    optimalComplexity: {
      time: "O(m * n * 4^L)",
      space: "O(L)",
    },
    testCases: [
      {
        input: {
          board: [
            ["A", "B", "C", "E"],
            ["S", "F", "C", "S"],
            ["A", "D", "E", "E"],
          ],
          word: "ABCCED",
        },
        expected: true,
        description: "Word exists in board",
      },
      {
        input: {
          board: [
            ["A", "B", "C", "E"],
            ["S", "F", "C", "S"],
            ["A", "D", "E", "E"],
          ],
          word: "SEE",
        },
        expected: true,
        description: "Short word exists",
      },
      {
        input: {
          board: [
            ["A", "B", "C", "E"],
            ["S", "F", "C", "S"],
            ["A", "D", "E", "E"],
          ],
          word: "ABCB",
        },
        expected: false,
        description: "Word does not exist (would require reusing cell)",
      },
    ],
  },
  {
    id: "dsa-combination-sum",
    title: "Combination Sum",
    type: "dsa",
    pattern: "backtracking",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Apple", "Google"],
    description: "Find all unique combinations that sum to a target",
    tags: ["array", "backtracking"],
    estimatedTime: 25,
    problemStatement: `Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target. You may return the combinations in any order.

The same number may be chosen from candidates an unlimited number of times. Two combinations are unique if the frequency of at least one of the chosen numbers is different.

The test cases are generated such that the number of unique combinations that sum up to target is less than 150 combinations for the given input.`,
    examples: [
      {
        input: "candidates = [2,3,6,7], target = 7",
        output: "[[2,2,3],[7]]",
        explanation: "2+2+3=7 and 7=7 are the only combinations.",
      },
      {
        input: "candidates = [2,3,5], target = 8",
        output: "[[2,2,2,2],[2,3,3],[3,5]]",
      },
    ],
    constraints: [
      "1 <= candidates.length <= 30",
      "2 <= candidates[i] <= 40",
      "All elements of candidates are distinct",
      "1 <= target <= 40",
    ],
    hints: [
      "Use backtracking to explore all combinations",
      "For each candidate, decide to include it 0 or more times",
      "Prune branches where sum exceeds target",
    ],
    starterCode: {
      javascript: `function combinationSum(candidates, target) {
  // Write your solution here

}`,
      typescript: `function combinationSum(candidates: number[], target: number): number[][] {
  // Write your solution here

}`,
      python: `def combinationSum(candidates, target):
    # Write your solution here
    pass`,
      java: `class Solution {
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        // Write your solution here
        return new ArrayList<>();
    }
}`,
      cpp: `class Solution {
public:
    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        // Write your solution here
        return {};
    }
};`,
      csharp: `public class Solution {
    public IList<IList<int>> CombinationSum(int[] candidates, int target) {
        // Write your solution here
        return new List<IList<int>>();
    }
}`,
      go: `func combinationSum(candidates []int, target int) [][]int {
    // Write your solution here
    return [][]int{}
}`,
      rust: `impl Solution {
    pub fn combination_sum(candidates: Vec<i32>, target: i32) -> Vec<Vec<i32>> {
        // Write your solution here
        vec![]
    }
}`,
    },
    optimalComplexity: {
      time: "O(N^(T/M))",
      space: "O(T/M)",
    },
    testCases: [
      {
        input: { candidates: [2, 3, 6, 7], target: 7 },
        expected: [[2, 2, 3], [7]],
        description: "Basic combination sum",
        compareAsSet: true,
      },
      {
        input: { candidates: [2, 3, 5], target: 8 },
        expected: [
          [2, 2, 2, 2],
          [2, 3, 3],
          [3, 5],
        ],
        description: "Multiple combinations",
        compareAsSet: true,
      },
      {
        input: { candidates: [2], target: 1 },
        expected: [],
        description: "No valid combinations",
      },
    ],
  },
  {
    id: "dsa-permutations",
    title: "Permutations",
    type: "dsa",
    pattern: "backtracking",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Generate all permutations of a collection of distinct integers",
    tags: ["array", "backtracking"],
    estimatedTime: 20,
    problemStatement: `Given an array nums of distinct integers, return all the possible permutations. You can return the answer in any order.`,
    examples: [
      { input: "nums = [1,2,3]", output: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]" },
      { input: "nums = [0,1]", output: "[[0,1],[1,0]]" },
      { input: "nums = [1]", output: "[[1]]" },
    ],
    constraints: [
      "1 <= nums.length <= 6",
      "-10 <= nums[i] <= 10",
      "All the integers of nums are unique",
    ],
    hints: [
      "Use backtracking to build permutations",
      "Track which elements are used in current permutation",
      "When permutation is complete, add it to result",
    ],
    starterCode: {
      javascript: `function permute(nums) {\n  // Write your solution here\n\n}`,
      typescript: `function permute(nums: number[]): number[][] {\n  // Write your solution here\n\n}`,
      python: `def permute(nums):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n! * n)", space: "O(n)" },
    testCases: [
      {
        input: { nums: [1, 2, 3] },
        expected: [
          [1, 2, 3],
          [1, 3, 2],
          [2, 1, 3],
          [2, 3, 1],
          [3, 1, 2],
          [3, 2, 1],
        ],
        description: "Three elements",
        compareAsSet: true,
      },
      {
        input: { nums: [0, 1] },
        expected: [
          [0, 1],
          [1, 0],
        ],
        description: "Two elements",
        compareAsSet: true,
      },
    ],
  },
  {
    id: "dsa-subsets",
    title: "Subsets",
    type: "dsa",
    pattern: "backtracking",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Apple"],
    description: "Generate all possible subsets (the power set)",
    tags: ["array", "backtracking", "bit-manipulation"],
    estimatedTime: 20,
    problemStatement: `Given an integer array nums of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets.`,
    examples: [
      { input: "nums = [1,2,3]", output: "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]" },
      { input: "nums = [0]", output: "[[],[0]]" },
    ],
    constraints: [
      "1 <= nums.length <= 10",
      "-10 <= nums[i] <= 10",
      "All the numbers of nums are unique",
    ],
    hints: [
      "For each element, decide to include it or not",
      "Use backtracking to explore all combinations",
      "Alternative: Use bit manipulation (2^n subsets)",
    ],
    starterCode: {
      javascript: `function subsets(nums) {\n  // Write your solution here\n\n}`,
      typescript: `function subsets(nums: number[]): number[][] {\n  // Write your solution here\n\n}`,
      python: `def subsets(nums):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n * 2^n)", space: "O(n)" },
    testCases: [
      {
        input: { nums: [1, 2, 3] },
        expected: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]],
        description: "Three elements",
        compareAsSet: true,
      },
      {
        input: { nums: [0] },
        expected: [[], [0]],
        description: "Single element",
        compareAsSet: true,
      },
      {
        input: { nums: [1, 2] },
        expected: [[], [1], [2], [1, 2]],
        description: "Two elements",
        compareAsSet: true,
      },
      {
        input: { nums: [-1, 0, 1] },
        expected: [[], [-1], [0], [-1, 0], [1], [-1, 1], [0, 1], [-1, 0, 1]],
        description: "With negative numbers",
        compareAsSet: true,
      },
    ],
  },
  {
    id: "dsa-n-queens",
    title: "N-Queens",
    type: "dsa",
    pattern: "backtracking",
    difficulty: "hard",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Place n queens on an n×n chessboard such that no two queens attack each other",
    tags: ["array", "backtracking"],
    estimatedTime: 35,
    problemStatement: `The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other. Given an integer n, return all distinct solutions to the n-queens puzzle.`,
    examples: [
      {
        input: "n = 4",
        output: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]',
        explanation: "There exist two distinct solutions to the 4-queens puzzle.",
      },
      { input: "n = 1", output: '[["Q"]]' },
    ],
    constraints: ["1 <= n <= 9"],
    hints: [
      "Place queens row by row",
      "For each row, try all columns and check if position is safe",
      "Track columns, diagonals, and anti-diagonals that are under attack",
    ],
    starterCode: {
      javascript: `function solveNQueens(n) {\n  // Write your solution here\n\n}`,
      typescript: `function solveNQueens(n: number): string[][] {\n  // Write your solution here\n\n}`,
      python: `def solveNQueens(n):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n!)", space: "O(n)" },
    testCases: [
      {
        input: { n: 4 },
        expected: [
          [".Q..", "...Q", "Q...", "..Q."],
          ["..Q.", "Q...", "...Q", ".Q.."],
        ],
        description: "4 queens",
        compareAsSet: true,
      },
      {
        input: { n: 1 },
        expected: [["Q"]],
        description: "Single queen",
      },
      {
        input: { n: 2 },
        expected: [],
        description: "No solution for n=2",
      },
      {
        input: { n: 3 },
        expected: [],
        description: "No solution for n=3",
      },
    ],
  },
  {
    id: "dsa-letter-combinations-phone",
    title: "Letter Combinations of a Phone Number",
    type: "dsa",
    pattern: "backtracking",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Apple"],
    description: "Return all possible letter combinations that a phone number could represent",
    tags: ["string", "backtracking", "hash-table"],
    estimatedTime: 20,
    problemStatement: `Given a string containing digits from 2-9 inclusive, return all possible letter combinations that the number could represent. Mapping: 2-abc, 3-def, 4-ghi, 5-jkl, 6-mno, 7-pqrs, 8-tuv, 9-wxyz`,
    examples: [
      { input: 'digits = "23"', output: '["ad","ae","af","bd","be","bf","cd","ce","cf"]' },
      { input: 'digits = ""', output: "[]" },
      { input: 'digits = "2"', output: '["a","b","c"]' },
    ],
    constraints: ["0 <= digits.length <= 4", "digits[i] is a digit in the range ['2', '9']"],
    hints: [
      "Use a mapping from digit to letters",
      "Use backtracking to generate all combinations",
      "For each digit, try all its possible letters",
    ],
    starterCode: {
      javascript: `function letterCombinations(digits) {\n  // Write your solution here\n\n}`,
      typescript: `function letterCombinations(digits: string): string[] {\n  // Write your solution here\n\n}`,
      python: `def letterCombinations(digits):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(4^n * n)", space: "O(n)" },
    testCases: [
      {
        input: { digits: "23" },
        expected: ["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"],
        description: "Two digits",
        compareAsSet: true,
      },
    ],
  },
  {
    id: "dsa-palindrome-partitioning",
    title: "Palindrome Partitioning",
    type: "dsa",
    pattern: "backtracking",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google"],
    description: "Partition a string such that every substring is a palindrome",
    tags: ["string", "backtracking", "dynamic-programming"],
    estimatedTime: 30,
    problemStatement: `Given a string s, partition s such that every substring of the partition is a palindrome. Return all possible palindrome partitioning of s.`,
    examples: [
      { input: 's = "aab"', output: '[["a","a","b"],["aa","b"]]' },
      { input: 's = "a"', output: '[["a"]]' },
    ],
    constraints: ["1 <= s.length <= 16", "s contains only lowercase English letters"],
    hints: [
      "Use backtracking to try all partitions",
      "For each position, try all palindrome substrings starting there",
      "Precompute palindrome table for O(1) palindrome checks",
    ],
    starterCode: {
      javascript: `function partition(s) {\n  // Write your solution here\n\n}`,
      typescript: `function partition(s: string): string[][] {\n  // Write your solution here\n\n}`,
      python: `def partition(s):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n * 2^n)", space: "O(n)" },
    testCases: [
      {
        input: { s: "aab" },
        expected: [
          ["a", "a", "b"],
          ["aa", "b"],
        ],
        description: "Multiple partitions",
        compareAsSet: true,
      },
      {
        input: { s: "a" },
        expected: [["a"]],
        description: "Single character",
      },
      {
        input: { s: "aba" },
        expected: [
          ["a", "b", "a"],
          ["aba"],
        ],
        description: "Palindrome string",
        compareAsSet: true,
      },
      {
        input: { s: "abc" },
        expected: [["a", "b", "c"]],
        description: "No multi-char palindromes",
      },
    ],
  },
  {
    id: "dsa-generate-parentheses",
    title: "Generate Parentheses",
    type: "dsa",
    pattern: "backtracking",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple"],
    description: "Generate all combinations of well-formed parentheses",
    tags: ["string", "backtracking", "dynamic-programming"],
    estimatedTime: 20,
    problemStatement: `Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.`,
    examples: [
      {
        input: "n = 3",
        output: '["((()))","(()())","(())()","()(())","()()()"]',
      },
      {
        input: "n = 1",
        output: '["()"]',
      },
    ],
    constraints: ["1 <= n <= 8"],
    hints: [
      "Use backtracking with two counters: open and close",
      'Can add "(" if open < n',
      'Can add ")" if close < open',
      "When open == close == n, we have a valid combination",
    ],
    starterCode: {
      javascript: `function generateParenthesis(n) {
  // Write your solution here

}`,
      typescript: `function generateParenthesis(n: number): string[] {
  // Write your solution here

}`,
      python: `def generateParenthesis(n):
    # Write your solution here
    pass`,
      java: `class Solution {
    public List<String> generateParenthesis(int n) {
        // Write your solution here
        return new ArrayList<>();
    }
}`,
    },
    optimalComplexity: { time: "O(4^n / sqrt(n))", space: "O(n)" },
    testCases: [
      {
        input: { n: 3 },
        expected: ["((()))", "(()())", "(())()", "()(())", "()()()"],
        description: "n=3 pairs",
        compareAsSet: true,
      },
      { input: { n: 1 }, expected: ["()"], description: "Single pair" },
      { input: { n: 2 }, expected: ["(())", "()()"], description: "Two pairs", compareAsSet: true },
    ],
  },
]

export default backtrackingScenarios
