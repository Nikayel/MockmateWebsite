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
    description:
      "Decide whether a word can be traced through a letter grid one adjacent cell at a time",
    tags: ["array", "backtracking", "matrix"],
    estimatedTime: 25,
    problemStatement: `You're given board, a character grid with m rows and n columns, plus a string word. Decide whether word can be spelled by walking a path through the grid: start on any cell, and at each step move only to a cell sharing an edge with the current one, so up, down, left, or right, never diagonally. Every step must land on the next letter of word.

A path may visit any cell at most once. Return true when such a path exists, false otherwise.`,
    examples: [
      {
        input: 'board = [["P","L","A","N"],["K","R","O","E"],["B","M","S","T"]], word = "PLANET"',
        output: "true",
      },
      {
        input: 'board = [["P","L","A","N"],["K","R","O","E"],["B","M","S","T"]], word = "TEN"',
        output: "true",
      },
      {
        input: 'board = [["P","L","A","N"],["K","R","O","E"],["B","M","S","T"]], word = "NEN"',
        output: "false",
      },
    ],
    constraints: [
      "m is the row count of board",
      "n is the column count of board",
      "both m and n fall between 1 and 6",
      "word holds between 1 and 15 characters",
      "every cell of board and every character of word is an English letter, either case",
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
    description: "List every distinct way to build a target sum from reusable values",
    tags: ["array", "backtracking"],
    estimatedTime: 25,
    problemStatement: `You're given candidates, an array of distinct positive integers, and an integer target. Assemble every combination of values drawn from candidates whose total is exactly target. A combination may repeat a single candidate as many times as needed.

Two combinations count as the same one when they use each value an identical number of times, regardless of ordering, so [2,2,3] and [3,2,2] are one combination, not two. Return the full list of distinct combinations in whatever order suits you; every test input yields fewer than 150 of them.`,
    examples: [
      {
        input: "candidates = [2,4,5], target = 9",
        output: "[[2,2,5],[4,5]]",
        explanation: "2+2+5 and 4+5 are the only ways to reach 9.",
      },
      {
        input: "candidates = [3,4,6], target = 12",
        output: "[[3,3,3,3],[3,3,6],[4,4,4],[6,6]]",
      },
    ],
    constraints: [
      "candidates holds between 1 and 30 values",
      "each value in candidates sits in the range 2 to 40",
      "no value inside candidates repeats",
      "target sits between 1 and 40",
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
    description: "Produce every ordering of a set of distinct numbers",
    tags: ["array", "backtracking"],
    estimatedTime: 20,
    problemStatement: `You're given nums, an array of integers where no value repeats. Build every arrangement of its elements: each arrangement uses all the numbers exactly once, and none may appear twice in your output.

Return the complete set of arrangements; the sequence they come back in is up to you.`,
    examples: [
      { input: "nums = [4,5,6]", output: "[[4,5,6],[4,6,5],[5,4,6],[5,6,4],[6,4,5],[6,5,4]]" },
      { input: "nums = [7,2]", output: "[[7,2],[2,7]]" },
      { input: "nums = [9]", output: "[[9]]" },
    ],
    constraints: [
      "nums holds at least 1 and at most 6 numbers",
      "every entry falls between -10 and 10",
      "no two entries of nums are equal",
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
    description: "Enumerate every subset an array of unique values can form",
    tags: ["array", "backtracking", "bit-manipulation"],
    estimatedTime: 20,
    problemStatement: `You're given an integer array nums whose values never repeat. Gather every subset you can pick out of it, from the empty selection all the way up to the entire array.

No subset may show up twice in your result, and both the subsets and the overall list can come back in whatever order you prefer.`,
    examples: [
      { input: "nums = [4,7,9]", output: "[[],[4],[7],[4,7],[9],[4,9],[7,9],[4,7,9]]" },
      { input: "nums = [5]", output: "[[],[5]]" },
    ],
    constraints: [
      "nums contains between 1 and 10 elements",
      "each element lies in the span -10 to 10",
      "no element of nums appears more than once",
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
    description: "Find every safe way to seat n queens on an n by n board",
    tags: ["array", "backtracking"],
    estimatedTime: 35,
    problemStatement: `You're given one integer n, which sets both the size of a chessboard and the number of queens to put on it. Arrange all n queens on the n x n board so that none of them threatens another, meaning no pair ever shares a row, a column, or a diagonal. Find every distinct arrangement that pulls this off.

Report each arrangement as n strings of n characters, one string per board row, writing 'Q' where a queen stands and '.' for an open square. Return the complete list of arrangements; their order doesn't matter.`,
    examples: [
      {
        input: "n = 6",
        output:
          '[[".Q....","...Q..",".....Q","Q.....","..Q...","....Q."],["..Q...",".....Q",".Q....","....Q.","Q.....","...Q.."],["...Q..","Q.....","....Q.",".Q....",".....Q","..Q..."],["....Q.","..Q...","Q.....",".....Q","...Q..",".Q...."]]',
        explanation: "A 6 x 6 board admits exactly four arrangements.",
      },
      { input: "n = 1", output: '[["Q"]]' },
    ],
    constraints: ["n stays within 1 and 9"],
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
    description: "Expand a string of keypad digits into every letter string it could spell",
    tags: ["string", "backtracking", "hash-table"],
    estimatedTime: 20,
    problemStatement: `You're given digits, a string in which every character is a digit from 2 through 9. On a classic phone keypad each of those digits carries letters: 2 has abc, 3 has def, 4 has ghi, 5 has jkl, 6 has mno, 7 has pqrs, 8 has tuv, and 9 has wxyz.

Produce every string obtainable by swapping each digit of digits, kept in order, for one of that digit's letters. When digits is empty, produce an empty list. Your results may come back in whatever order you like.`,
    examples: [
      {
        input: 'digits = "89"',
        output: '["tw","tx","ty","tz","uw","ux","uy","uz","vw","vx","vy","vz"]',
      },
      { input: 'digits = ""', output: "[]" },
      { input: 'digits = "5"', output: '["j","k","l"]' },
    ],
    constraints: [
      "digits may hold anywhere from 0 to 4 characters",
      "every character of digits falls in the span '2' through '9'",
    ],
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
    description: "List every way to slice a string into palindromic pieces",
    tags: ["string", "backtracking", "dynamic-programming"],
    estimatedTime: 30,
    problemStatement: `You're given a string s of lowercase letters. Cut s into a run of non-empty pieces, leaving the letters in their original order, so that each piece is a palindrome, reading identically left to right and right to left.

Usually several cutting patterns qualify. Return every one of them, with each pattern listing its pieces from the front of s to the back.`,
    examples: [
      { input: 's = "noon"', output: '[["n","o","o","n"],["n","oo","n"],["noon"]]' },
      { input: 's = "z"', output: '[["z"]]' },
    ],
    constraints: [
      "s runs from 1 to 16 characters long",
      "every character of s is a lowercase English letter",
    ],
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
        expected: [["a", "b", "a"], ["aba"]],
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
    description: "Build every balanced arrangement of n parenthesis pairs",
    tags: ["string", "backtracking", "dynamic-programming"],
    estimatedTime: 20,
    problemStatement: `You're given an integer n, the number of parenthesis pairs at your disposal. A string counts as well formed when scanning it left to right never shows more ')' than '(' at any point and the two totals finish equal.

Produce every distinct well-formed string that uses exactly n opening and n closing parentheses.`,
    examples: [
      {
        input: "n = 2",
        output: '["(())","()()"]',
      },
      {
        input: "n = 1",
        output: '["()"]',
      },
    ],
    constraints: ["n ranges from 1 up to 8"],
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
