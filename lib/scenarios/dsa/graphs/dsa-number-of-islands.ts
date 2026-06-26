import type { DSAScenario } from "../../types"

export const numberOfIslandsScenario: DSAScenario = {
  id: "dsa-number-of-islands",
  title: "Number of Islands",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: [
    "Amazon",
    "Meta",
    "Google",
    "Microsoft",
    "Salesforce",
    "Twitch",
    "ZipRecruiter",
    "Palantir",
  ],
  roles: ["intern", "new-grad", "junior", "senior", "swe", "fdse"],
  description: "Count the number of islands in a 2D grid",
  tags: ["array", "depth-first-search", "breadth-first-search", "union-find", "matrix"],
  estimatedTime: 25,
  problemStatement: `Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.

Example visualization:

  ┌───┬───┬───┬───┬───┐
  │ 1 │ 1 │ 0 │ 0 │ 0 │   Island 1: top-left
  ├───┼───┼───┼───┼───┤          (connected 1s)
  │ 1 │ 1 │ 0 │ 0 │ 0 │
  ├───┼───┼───┼───┼───┤
  │ 0 │ 0 │ 1 │ 0 │ 0 │   Island 2: center
  ├───┼───┼───┼───┼───┤
  │ 0 │ 0 │ 0 │ 1 │ 1 │   Island 3: bottom-right
  └───┴───┴───┴───┴───┘

  Answer: 3 islands`,
  examples: [
    {
      input:
        'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
      output: "1",
    },
    {
      input:
        'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
      output: "3",
    },
  ],
  constraints: [
    "m == grid.length",
    "n == grid[i].length",
    "1 <= m, n <= 300",
    "grid[i][j] is '0' or '1'",
  ],
  hints: [
    "Use DFS or BFS to explore each island",
    "Mark visited cells to avoid counting them twice",
    "Count how many times you initiate a DFS/BFS",
  ],
  starterCode: {
    javascript: `function numIslands(grid) {
// Write your solution here

}`,
    typescript: `function numIslands(grid: string[][]): number {
// Write your solution here

}`,
    python: `def numIslands(grid):
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(m * n)",
    space: "O(m * n)",
  },
  testCases: [
    {
      input: {
        grid: [
          ["1", "1", "1", "1", "0"],
          ["1", "1", "0", "1", "0"],
          ["1", "1", "0", "0", "0"],
          ["0", "0", "0", "0", "0"],
        ],
      },
      expected: 1,
      description: "Single large island",
    },
    {
      input: {
        grid: [
          ["1", "1", "0", "0", "0"],
          ["1", "1", "0", "0", "0"],
          ["0", "0", "1", "0", "0"],
          ["0", "0", "0", "1", "1"],
        ],
      },
      expected: 3,
      description: "Three separate islands",
    },
    {
      input: {
        grid: [
          ["1", "0", "1"],
          ["0", "1", "0"],
          ["1", "0", "1"],
        ],
      },
      expected: 5,
      description: "Five single-cell islands",
    },
    {
      input: {
        grid: [
          ["0", "0", "0"],
          ["0", "0", "0"],
          ["0", "0", "0"],
        ],
      },
      expected: 0,
      description: "No islands (all water)",
    },
    {
      input: {
        grid: [["1"]],
      },
      expected: 1,
      description: "Single cell island",
    },
  ],

  // ==========================================
  // Real Interview Mode (Fuzzy Mode) Fields
  // ==========================================
  fuzzyStatement: "Given a 2D grid map, count the number of islands.",

  clarifyingQuestions: [
    {
      topic: "island_definition",
      question: "What constitutes an island?",
      answer:
        "An island is a group of '1's (land) connected horizontally or vertically, surrounded by '0's (water).",
      required: true,
    },
    {
      topic: "diagonal_connections",
      question: "Are diagonal connections considered?",
      answer:
        "No, only horizontal and vertical adjacency counts. Diagonal cells are not connected.",
      required: true,
    },
    {
      topic: "grid_values",
      question: "What are the grid values?",
      answer: "The grid contains only '1' (land) and '0' (water) as characters.",
      required: false,
    },
    {
      topic: "boundary_handling",
      question: "What about the grid boundaries?",
      answer: "You can assume all four edges of the grid are surrounded by water.",
      required: false,
    },
    {
      topic: "input_modification",
      question: "Can I modify the input grid?",
      answer: "Yes, you can modify the grid in place if it helps your solution.",
      required: false,
    },
    {
      topic: "empty_input",
      question: "What if the grid is empty?",
      answer: "Return 0 for an empty grid.",
      required: false,
    },
  ],

  // ==========================================
  // Proactive AI Interviewer Fields
  // ==========================================
  commonWrongApproaches: [
    {
      description: "Not marking visited cells - counting same island multiple times",
      codeSignals: ["no visited set", "no marking", "counting same cell twice", "infinite loop"],
      intervention:
        "How are you tracking which cells you've already visited? Without that, you might count the same island multiple times.",
    },
    {
      description: "Including diagonal neighbors",
      codeSignals: ["8 directions", "diagonal", "[[-1,-1], [-1,1], [1,-1], [1,1]]"],
      intervention:
        "I see you're checking 8 neighbors. The problem usually considers only 4-directional connectivity. Want to clarify?",
    },
    {
      description: "Using BFS without proper queue management",
      codeSignals: ["shift() in loop", "pop instead of shift", "queue issues"],
      intervention:
        "Watch your queue operations. In BFS, you typically dequeue from the front. What order are you processing nodes?",
    },
  ],

  whatIfQuestions: [
    "What if the entire grid is water (all zeros)?",
    "What if the entire grid is one big island?",
    "What's your time and space complexity?",
    "Could you solve this iteratively instead of recursively (or vice versa)?",
    "What if the grid is very large - say 300x300? Any stack overflow concerns?",
  ],

  midCodingProbes: [
    {
      trigger: "starting DFS/BFS traversal",
      question:
        "Walk me through what happens when you find a '1'. What cells do you visit and in what order?",
    },
    {
      trigger: "marking cells as visited",
      question:
        "I see you're marking visited cells. Why change '1' to '0' instead of using a separate visited set?",
    },
    {
      trigger: "iterating through grid",
      question:
        "When you find a '1' and explore its island, why do you increment the count before exploring?",
    },
  ],

  optimizationPush: {
    suboptimalComplexity: "O(m*n) with O(m*n) extra space",
    nudge:
      "Your solution uses extra space for the visited set. Can you do it with O(1) extra space by modifying the input?",
  },
}
