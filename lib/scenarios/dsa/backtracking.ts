/**
 * Backtracking DSA Scenarios
 * Pattern: backtracking
 */

import type { DSAScenario } from '../types'

export const backtrackingScenarios: DSAScenario[] = [
  {
    id: 'dsa-word-search',
    title: 'Word Search',
    type: 'dsa',
    pattern: 'backtracking',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Microsoft', 'Apple'],
    description: 'Search for a word in a 2D board using backtracking',
    tags: ['array', 'backtracking', 'matrix'],
    estimatedTime: 25,
    problemStatement: `Given an m x n grid of characters board and a string word, return true if word exists in the grid.

The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.`,
    examples: [
      {
        input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"',
        output: 'true',
      },
      {
        input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"',
        output: 'true',
      },
      {
        input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"',
        output: 'false',
      },
    ],
    constraints: [
      'm == board.length',
      'n = board[i].length',
      '1 <= m, n <= 6',
      '1 <= word.length <= 15',
      'board and word consists of only lowercase and uppercase English letters',
    ],
    hints: [
      'Use backtracking to explore all paths',
      'Mark visited cells temporarily to avoid reuse',
      'Restore state after each recursive call',
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
      time: 'O(m * n * 4^L)',
      space: 'O(L)',
    },
    testCases: [
      {
        input: { board: [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word: "ABCCED" },
        expected: true,
        description: 'Word exists in board',
      },
      {
        input: { board: [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word: "SEE" },
        expected: true,
        description: 'Short word exists',
      },
      {
        input: { board: [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word: "ABCB" },
        expected: false,
        description: 'Word does not exist (would require reusing cell)',
      },
    ],
  },
  {
    id: 'dsa-combination-sum',
    title: 'Combination Sum',
    type: 'dsa',
    pattern: 'backtracking',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Apple', 'Google'],
    description: 'Find all unique combinations that sum to a target',
    tags: ['array', 'backtracking'],
    estimatedTime: 25,
    problemStatement: `Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target. You may return the combinations in any order.

The same number may be chosen from candidates an unlimited number of times. Two combinations are unique if the frequency of at least one of the chosen numbers is different.

The test cases are generated such that the number of unique combinations that sum up to target is less than 150 combinations for the given input.`,
    examples: [
      {
        input: 'candidates = [2,3,6,7], target = 7',
        output: '[[2,2,3],[7]]',
        explanation: '2+2+3=7 and 7=7 are the only combinations.',
      },
      {
        input: 'candidates = [2,3,5], target = 8',
        output: '[[2,2,2,2],[2,3,3],[3,5]]',
      },
    ],
    constraints: [
      '1 <= candidates.length <= 30',
      '2 <= candidates[i] <= 40',
      'All elements of candidates are distinct',
      '1 <= target <= 40',
    ],
    hints: [
      'Use backtracking to explore all combinations',
      'For each candidate, decide to include it 0 or more times',
      'Prune branches where sum exceeds target',
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
      time: 'O(N^(T/M))',
      space: 'O(T/M)',
    },
    testCases: [
      {
        input: { candidates: [2,3,6,7], target: 7 },
        expected: [[2,2,3],[7]],
        description: 'Basic combination sum',
      },
      {
        input: { candidates: [2,3,5], target: 8 },
        expected: [[2,2,2,2],[2,3,3],[3,5]],
        description: 'Multiple combinations',
      },
      {
        input: { candidates: [2], target: 1 },
        expected: [],
        description: 'No valid combinations',
      },
    ],
  },
]

export default backtrackingScenarios
