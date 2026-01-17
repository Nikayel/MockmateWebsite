/**
 * Graphs DSA Scenarios
 * Pattern: graphs
 */

import type { DSAScenario } from "../types"

export const graphsScenarios: DSAScenario[] = [
  {
    id: "dsa-number-of-islands",
    title: "Number of Islands",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft", "Salesforce", "Twitch"],
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
    fuzzyStatement:
      "Given a 2D grid map, count the number of islands.",

    clarifyingQuestions: [
      {
        question: "What constitutes an island?",
        answer:
          "An island is a group of '1's (land) connected horizontally or vertically, surrounded by '0's (water).",
        required: true,
      },
      {
        question: "Are diagonal connections considered?",
        answer:
          "No, only horizontal and vertical adjacency counts. Diagonal cells are not connected.",
        required: true,
      },
      {
        question: "What are the grid values?",
        answer: "The grid contains only '1' (land) and '0' (water) as characters.",
        required: false,
      },
      {
        question: "What about the grid boundaries?",
        answer:
          "You can assume all four edges of the grid are surrounded by water.",
        required: false,
      },
      {
        question: "Can I modify the input grid?",
        answer:
          "Yes, you can modify the grid in place if it helps your solution.",
        required: false,
      },
      {
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
        codeSignals: [
          "no visited set",
          "no marking",
          "counting same cell twice",
          "infinite loop",
        ],
        intervention:
          "How are you tracking which cells you've already visited? Without that, you might count the same island multiple times.",
      },
      {
        description: "Including diagonal neighbors",
        codeSignals: [
          "8 directions",
          "diagonal",
          "[[-1,-1], [-1,1], [1,-1], [1,1]]",
        ],
        intervention:
          "I see you're checking 8 neighbors. The problem usually considers only 4-directional connectivity. Want to clarify?",
      },
      {
        description: "Using BFS without proper queue management",
        codeSignals: [
          "shift() in loop",
          "pop instead of shift",
          "queue issues",
        ],
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
  },
  {
    id: "dsa-course-schedule",
    title: "Course Schedule",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Determine if you can finish all courses given prerequisites",
    tags: ["graph", "topological-sort", "dfs", "bfs"],
    estimatedTime: 25,
    problemStatement: `There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.

For example, the pair [0, 1], indicates that to take course 0 you have to first take course 1.

Return true if you can finish all courses. Otherwise, return false.

Example visualization:

    prerequisites = [[1,0], [2,1], [3,2]]

    Dependency Graph:
    0 → 1 → 2 → 3     ✓ Can finish (no cycle)

    prerequisites = [[1,0], [0,1]]

    Cycle detected:
    0 → 1
    ↑   ↓
    └───┘             ✗ Cannot finish (cycle!)

    Use: Topological Sort or DFS cycle detection`,
    examples: [
      {
        input: "numCourses = 2, prerequisites = [[1,0]]",
        output: "true",
        explanation: "Take course 0, then course 1.",
      },
      {
        input: "numCourses = 2, prerequisites = [[1,0],[0,1]]",
        output: "false",
        explanation: "To take course 1 you need course 0, and vice versa. Cycle detected.",
      },
    ],
    constraints: [
      "1 <= numCourses <= 2000",
      "0 <= prerequisites.length <= 5000",
      "prerequisites[i].length == 2",
      "0 <= ai, bi < numCourses",
      "All pairs prerequisites[i] are unique",
    ],
    hints: [
      "This problem is equivalent to detecting a cycle in a directed graph",
      "Use topological sorting (Kahn's algorithm or DFS)",
      "Track visited nodes and nodes in current path",
    ],
    starterCode: {
      javascript: `function canFinish(numCourses, prerequisites) {
  // Write your solution here

}`,
      typescript: `function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  // Write your solution here

}`,
      python: `def canFinish(numCourses, prerequisites):
    # Write your solution here
    pass`,
      java: `class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        // Write your solution here
        return true;
    }
}`,
      cpp: `class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        // Write your solution here
        return true;
    }
};`,
      csharp: `public class Solution {
    public bool CanFinish(int numCourses, int[][] prerequisites) {
        // Write your solution here
        return true;
    }
}`,
      go: `func canFinish(numCourses int, prerequisites [][]int) bool {
    // Write your solution here
    return true
}`,
      rust: `impl Solution {
    pub fn can_finish(num_courses: i32, prerequisites: Vec<Vec<i32>>) -> bool {
        // Write your solution here
        true
    }
}`,
    },
    optimalComplexity: {
      time: "O(V + E)",
      space: "O(V + E)",
    },
    testCases: [
      {
        input: { numCourses: 2, prerequisites: [[1, 0]] },
        expected: true,
        description: "Simple linear dependency",
      },
      {
        input: {
          numCourses: 2,
          prerequisites: [
            [1, 0],
            [0, 1],
          ],
        },
        expected: false,
        description: "Cycle detected",
      },
      {
        input: {
          numCourses: 4,
          prerequisites: [
            [1, 0],
            [2, 0],
            [3, 1],
            [3, 2],
          ],
        },
        expected: true,
        description: "Multiple dependencies, no cycle",
      },
      {
        input: {
          numCourses: 3,
          prerequisites: [
            [0, 1],
            [1, 2],
            [2, 0],
          ],
        },
        expected: false,
        description: "Three-node cycle",
      },
    ],
  },
  {
    id: "dsa-clone-graph",
    title: "Clone Graph",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Deep clone an undirected graph.",
    tags: ["graph", "dfs", "bfs", "hash-table"],
    estimatedTime: 25,
    problemStatement: `Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.

Each node in the graph contains a value (int) and a list (List[Node]) of its neighbors.

class Node {
    public int val;
    public List<Node> neighbors;
}

Test case format: For simplicity, each node's value is the same as the node's index (1-indexed). The input is given as an adjacency list where adjList[i] is a list of neighbors for node i+1.

Example visualization:

    Original Graph:          Cloned Graph:
        1 ─── 2                 1' ─── 2'
        │     │       →         │      │
        │     │                 │      │
        4 ─── 3                 4' ─── 3'

    adjList = [[2,4],[1,3],[2,4],[1,3]]

    Use HashMap: oldNode → newNode
    DFS/BFS to traverse and clone`,
    examples: [
      {
        input: "adjList = [[2,4],[1,3],[2,4],[1,3]]",
        output: "[[2,4],[1,3],[2,4],[1,3]]",
        explanation: "4 nodes: node 1 connects to 2,4; node 2 connects to 1,3; etc.",
      },
      {
        input: "adjList = [[]]",
        output: "[[]]",
        explanation: "Single node with no neighbors",
      },
      {
        input: "adjList = []",
        output: "[]",
        explanation: "Empty graph",
      },
    ],
    constraints: [
      "The number of nodes in the graph is in the range [0, 100].",
      "1 <= Node.val <= 100",
      "Node.val is unique for each node.",
      "There are no repeated edges and no self-loops.",
      "The graph is connected.",
    ],
    hints: [
      "Use HashMap to track old to new node mapping",
      "Use DFS or BFS to traverse graph",
      "Create new nodes and clone neighbors recursively",
    ],
    starterCode: {
      javascript: `function cloneGraph(node) {
  // Write your solution here
  // node has: val, neighbors[]

}`,
      typescript: `function cloneGraph(node: Node | null): Node | null {
  // Write your solution here

}`,
      python: `def cloneGraph(node):
    # Write your solution here
    # node has: val, neighbors[]
    pass`,
    },
    optimalComplexity: {
      time: "O(V + E)",
      space: "O(V)",
    },
    testCases: [
      {
        input: {
          adjList: [
            [2, 4],
            [1, 3],
            [2, 4],
            [1, 3],
          ],
        },
        expected: [
          [2, 4],
          [1, 3],
          [2, 4],
          [1, 3],
        ],
        description: "Four-node connected graph",
      },
      {
        input: { adjList: [[]] },
        expected: [[]],
        description: "Single node, no neighbors",
      },
      {
        input: { adjList: [] },
        expected: [],
        description: "Empty graph (null input)",
      },
      {
        input: { adjList: [[2], [1]] },
        expected: [[2], [1]],
        description: "Two connected nodes",
      },
    ],
  },
  {
    id: "dsa-word-ladder",
    title: "Word Ladder",
    type: "dsa",
    pattern: "graphs",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta"],
    description: "Find shortest transformation sequence from begin word to end word.",
    tags: ["graph", "bfs", "hash-table"],
    estimatedTime: 35,
    problemStatement: `A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words beginWord -> s1 -> s2 -> ... -> sk such that:

- Every adjacent pair of words differs by a single letter.
- Every si for 1 <= i <= k is in wordList. Note that beginWord does not need to be in wordList.
- sk == endWord

Given two words, beginWord and endWord, and a dictionary wordList, return the number of words in the shortest transformation sequence from beginWord to endWord, or 0 if no such sequence exists.`,
    examples: [
      {
        input:
          'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
        output: "5",
        explanation: "hit -> hot -> dot -> dog -> cog (length 5)",
      },
      {
        input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]',
        output: "0",
        explanation: 'endWord "cog" is not in wordList',
      },
    ],
    constraints: [
      "1 <= beginWord.length <= 10",
      "endWord.length == beginWord.length",
      "1 <= wordList.length <= 5000",
      "wordList[i].length == beginWord.length",
      "beginWord, endWord, and wordList[i] consist of lowercase English letters.",
      "beginWord != endWord",
      "All the words in wordList are unique.",
    ],
    hints: [
      "Model as graph: words are nodes, edges connect words differing by 1 letter",
      "Use BFS for shortest path",
      "Optimize by creating pattern map (h*t -> hot, hit)",
    ],
    starterCode: {
      javascript: `function ladderLength(beginWord, endWord, wordList) {
  // Write your solution here

}`,
      typescript: `function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {
  // Write your solution here

}`,
      python: `def ladderLength(beginWord, endWord, wordList):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(M^2 * N)",
      space: "O(M^2 * N)",
    },
    testCases: [
      {
        input: {
          beginWord: "hit",
          endWord: "cog",
          wordList: ["hot", "dot", "dog", "lot", "log", "cog"],
        },
        expected: 5,
        description: "Standard transformation sequence",
      },
      {
        input: { beginWord: "hit", endWord: "cog", wordList: ["hot", "dot", "dog", "lot", "log"] },
        expected: 0,
        description: "End word not in list",
      },
      {
        input: { beginWord: "hot", endWord: "dog", wordList: ["hot", "dog"] },
        expected: 0,
        description: "No valid path (differ by 2 letters)",
      },
      {
        input: { beginWord: "a", endWord: "c", wordList: ["a", "b", "c"] },
        expected: 2,
        description: "Single letter words",
      },
    ],
  },
  {
    id: "dsa-pacific-atlantic-water-flow",
    title: "Pacific Atlantic Water Flow",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google"],
    description: "Find cells that can flow to both Pacific and Atlantic oceans",
    tags: ["array", "dfs", "bfs", "matrix"],
    estimatedTime: 30,
    problemStatement: `There is an m x n rectangular island that borders both the Pacific Ocean and Atlantic Ocean. The Pacific Ocean touches the top and left edges. The Atlantic Ocean touches the bottom and right edges. You are given an m x n integer matrix heights where heights[r][c] is the height above sea level. Water can flow from a cell to adjacent cells (up, down, left, right) if the adjacent cell's height is <= the current cell's height. Return a list of all cells that can flow to both the Pacific and Atlantic oceans.`,
    examples: [
      {
        input: "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
        output: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]",
      },
    ],
    constraints: [
      "m == heights.length",
      "n == heights[r].length",
      "1 <= m, n <= 200",
      "0 <= heights[r][c] <= 10^5",
    ],
    hints: [
      "Start DFS/BFS from ocean borders instead of every cell",
      "Find cells reachable from Pacific, then from Atlantic",
      "Return intersection of both sets",
    ],
    starterCode: {
      javascript: `function pacificAtlantic(heights) {\n  // Write your solution here\n\n}`,
      typescript: `function pacificAtlantic(heights: number[][]): number[][] {\n  // Write your solution here\n\n}`,
      python: `def pacificAtlantic(heights):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(m * n)", space: "O(m * n)" },
    testCases: [
      {
        input: {
          heights: [
            [1, 2, 2, 3, 5],
            [3, 2, 3, 4, 4],
            [2, 4, 5, 3, 1],
            [6, 7, 1, 4, 5],
            [5, 1, 1, 2, 4],
          ],
        },
        expected: [
          [0, 4],
          [1, 3],
          [1, 4],
          [2, 2],
          [3, 0],
          [3, 1],
          [4, 0],
        ],
        description: "Multiple valid cells",
        compareAsSet: true,
      },
    ],
  },
  {
    id: "dsa-rotting-oranges",
    title: "Rotting Oranges",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Microsoft", "Google"],
    description: "Find minimum minutes for all oranges to rot using BFS",
    tags: ["array", "bfs", "matrix"],
    estimatedTime: 25,
    problemStatement: `You are given an m x n grid where 0 is an empty cell, 1 is a fresh orange, and 2 is a rotten orange. Every minute, any fresh orange adjacent (4-directionally) to a rotten orange becomes rotten. Return the minimum number of minutes that must elapse until no cell has a fresh orange. If impossible, return -1.

Example visualization:

    t=0          t=1          t=2          t=3          t=4
   ┌───┬───┬───┐ ┌───┬───┬───┐ ┌───┬───┬───┐ ┌───┬───┬───┐ ┌───┬───┬───┐
   │ 2 │ 1 │ 1 │ │ 2 │ 2 │ 1 │ │ 2 │ 2 │ 2 │ │ 2 │ 2 │ 2 │ │ 2 │ 2 │ 2 │
   ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤
   │ 1 │ 1 │ 0 │ │ 2 │ 1 │ 0 │ │ 2 │ 2 │ 0 │ │ 2 │ 2 │ 0 │ │ 2 │ 2 │ 0 │
   ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤
   │ 0 │ 1 │ 1 │ │ 0 │ 1 │ 1 │ │ 0 │ 2 │ 1 │ │ 0 │ 2 │ 2 │ │ 0 │ 2 │ 2 │
   └───┴───┴───┘ └───┴───┴───┘ └───┴───┴───┘ └───┴───┴───┘ └───┴───┴───┘

    0=empty, 1=fresh 🍊, 2=rotten 🟤
    Answer: 4 minutes`,
    examples: [
      { input: "grid = [[2,1,1],[1,1,0],[0,1,1]]", output: "4" },
      {
        input: "grid = [[2,1,1],[0,1,1],[1,0,1]]",
        output: "-1",
        explanation: "The orange in the bottom left corner is never reached.",
      },
      { input: "grid = [[0,2]]", output: "0", explanation: "No fresh oranges to rot." },
    ],
    constraints: [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 10",
      "grid[i][j] is 0, 1, or 2",
    ],
    hints: [
      "Use multi-source BFS starting from all rotten oranges",
      "Count fresh oranges initially",
      "Track time/levels in BFS",
    ],
    starterCode: {
      javascript: `function orangesRotting(grid) {\n  // Write your solution here\n\n}`,
      typescript: `function orangesRotting(grid: number[][]): number {\n  // Write your solution here\n\n}`,
      python: `def orangesRotting(grid):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(m * n)", space: "O(m * n)" },
    testCases: [
      {
        input: {
          grid: [
            [2, 1, 1],
            [1, 1, 0],
            [0, 1, 1],
          ],
        },
        expected: 4,
        description: "All oranges rot",
      },
      {
        input: {
          grid: [
            [2, 1, 1],
            [0, 1, 1],
            [1, 0, 1],
          ],
        },
        expected: -1,
        description: "Impossible case",
      },
    ],
  },
  {
    id: "dsa-graph-valid-tree",
    title: "Graph Valid Tree",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Determine if an undirected graph is a valid tree",
    tags: ["graph", "dfs", "bfs", "union-find"],
    estimatedTime: 25,
    problemStatement: `You have a graph of n nodes labeled from 0 to n - 1. You are given n and a list of edges where edges[i] = [ai, bi] indicates an undirected edge between nodes ai and bi. Return true if the edges form a valid tree, and false otherwise.`,
    examples: [
      { input: "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]", output: "true" },
      {
        input: "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]",
        output: "false",
        explanation: "There is a cycle: 1-2-3-1",
      },
    ],
    constraints: [
      "1 <= n <= 2000",
      "0 <= edges.length <= 5000",
      "edges[i].length == 2",
      "0 <= ai, bi < n",
      "ai != bi",
      "There are no self-loops or repeated edges",
    ],
    hints: [
      "A valid tree has exactly n-1 edges and is connected",
      "Check for cycles using DFS or Union-Find",
      "Verify all nodes are reachable from any starting node",
    ],
    starterCode: {
      javascript: `function validTree(n, edges) {\n  // Write your solution here\n\n}`,
      typescript: `function validTree(n: number, edges: number[][]): boolean {\n  // Write your solution here\n\n}`,
      python: `def validTree(n, edges):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(V + E)", space: "O(V + E)" },
    testCases: [
      {
        input: {
          n: 5,
          edges: [
            [0, 1],
            [0, 2],
            [0, 3],
            [1, 4],
          ],
        },
        expected: true,
        description: "Valid tree",
      },
      {
        input: {
          n: 5,
          edges: [
            [0, 1],
            [1, 2],
            [2, 3],
            [1, 3],
            [1, 4],
          ],
        },
        expected: false,
        description: "Has cycle",
      },
    ],
  },
  {
    id: "dsa-course-schedule-ii",
    title: "Course Schedule II",
    type: "dsa",
    pattern: "topological-sort",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    description: "Find the order to take courses using topological sort (Kahn's algorithm)",
    tags: ["graph", "dfs", "bfs", "topological-sort"],
    estimatedTime: 30,
    problemStatement: `There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.

Return the ordering of courses you should take to finish all courses. If there are many valid answers, return any of them. If it is impossible to finish all courses, return an empty array.`,
    examples: [
      {
        input: "numCourses = 2, prerequisites = [[1,0]]",
        output: "[0,1]",
        explanation: "Take course 0 first, then course 1.",
      },
      {
        input: "numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]",
        output: "[0,2,1,3] or [0,1,2,3]",
        explanation: "Multiple valid orderings exist.",
      },
      {
        input: "numCourses = 1, prerequisites = []",
        output: "[0]",
      },
    ],
    constraints: [
      "1 <= numCourses <= 2000",
      "0 <= prerequisites.length <= numCourses * (numCourses - 1)",
      "prerequisites[i].length == 2",
      "0 <= ai, bi < numCourses",
      "ai != bi",
      "All the pairs [ai, bi] are distinct.",
    ],
    hints: [
      "Build adjacency list and track in-degrees for each node",
      "Use Kahn's algorithm: start with nodes having 0 in-degree",
      "Process queue, decrement in-degrees, add new 0-degree nodes",
      "If result size < numCourses, there's a cycle",
    ],
    starterCode: {
      javascript: `function findOrder(numCourses, prerequisites) {
  // Write your solution here

}`,
      typescript: `function findOrder(numCourses: number, prerequisites: number[][]): number[] {
  // Write your solution here

}`,
      python: `def findOrder(numCourses, prerequisites):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(V + E)", space: "O(V + E)" },
    testCases: [
      {
        input: { numCourses: 2, prerequisites: [[1, 0]] },
        expected: [0, 1],
        description: "Simple dependency",
      },
      {
        input: {
          numCourses: 4,
          prerequisites: [
            [1, 0],
            [2, 0],
            [3, 1],
            [3, 2],
          ],
        },
        expected: [0, 1, 2, 3],
        description: "Multiple dependencies",
        compareAsSet: false,
      },
      { input: { numCourses: 1, prerequisites: [] }, expected: [0], description: "Single course" },
      {
        input: {
          numCourses: 2,
          prerequisites: [
            [0, 1],
            [1, 0],
          ],
        },
        expected: [],
        description: "Cycle - impossible",
      },
    ],
  },
  {
    id: "dsa-alien-dictionary",
    title: "Alien Dictionary",
    type: "dsa",
    pattern: "topological-sort",
    difficulty: "hard",
    companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
    description: "Derive the order of letters in an alien language using topological sort",
    tags: ["graph", "topological-sort", "string", "dfs", "bfs"],
    estimatedTime: 35,
    problemStatement: `There is a new alien language that uses the English alphabet. However, the order of the letters is unknown to you.

You are given a list of strings words from the alien language's dictionary, where the strings are sorted lexicographically by the rules of this new language.

Derive the order of letters in this language. If the order is invalid, return an empty string. If there are multiple valid orderings, return any of them.`,
    examples: [
      {
        input: 'words = ["wrt","wrf","er","ett","rftt"]',
        output: '"wertf"',
        explanation: "From the words, we can derive: w < e, r < t, t < f, e < r",
      },
      {
        input: 'words = ["z","x"]',
        output: '"zx"',
      },
      {
        input: 'words = ["z","x","z"]',
        output: '""',
        explanation: "The order is invalid, so return empty string.",
      },
    ],
    constraints: [
      "1 <= words.length <= 100",
      "1 <= words[i].length <= 100",
      "words[i] consists of only lowercase English letters.",
    ],
    hints: [
      "Compare adjacent words to build directed edges",
      "First differing character gives us ordering: char1 < char2",
      "Check for invalid case: shorter word comes after longer prefix",
      "Run topological sort (Kahn's or DFS) on the graph",
    ],
    starterCode: {
      javascript: `function alienOrder(words) {
  // Write your solution here

}`,
      typescript: `function alienOrder(words: string[]): string {
  // Write your solution here

}`,
      python: `def alienOrder(words):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(C) where C is total characters", space: "O(1) - max 26 letters" },
    testCases: [
      {
        input: { words: ["wrt", "wrf", "er", "ett", "rftt"] },
        expected: "wertf",
        description: "Standard case",
      },
      { input: { words: ["z", "x"] }, expected: "zx", description: "Two words" },
      { input: { words: ["z", "x", "z"] }, expected: "", description: "Invalid order" },
      { input: { words: ["abc", "ab"] }, expected: "", description: "Invalid: prefix comes after" },
    ],
  },
  {
    id: "dsa-all-paths-source-target",
    title: "All Paths From Source to Target",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Bloomberg"],
    description: "Find all paths from source (0) to target (n-1) in a DAG",
    tags: ["graph", "dfs", "backtracking"],
    estimatedTime: 25,
    problemStatement: `Given a directed acyclic graph (DAG) of n nodes labeled from 0 to n - 1, find all possible paths from node 0 to node n - 1 and return them in any order.

The graph is given as follows: graph[i] is a list of all nodes you can visit from node i (i.e., there is a directed edge from node i to node graph[i][j]).`,
    examples: [
      {
        input: "graph = [[1,2],[3],[3],[]]",
        output: "[[0,1,3],[0,2,3]]",
        explanation: "There are two paths: 0 -> 1 -> 3 and 0 -> 2 -> 3.",
      },
      {
        input: "graph = [[4,3,1],[3,2,4],[3],[4],[]]",
        output: "[[0,4],[0,3,4],[0,1,3,4],[0,1,2,3,4],[0,1,4]]",
      },
    ],
    constraints: [
      "n == graph.length",
      "2 <= n <= 15",
      "0 <= graph[i][j] < n",
      "graph[i][j] != i (no self-loops)",
      "All the elements of graph[i] are unique.",
      "The input graph is guaranteed to be a DAG.",
    ],
    hints: [
      "Use DFS/backtracking from source to explore all paths",
      "When you reach target (n-1), add current path to result",
      "Since it's a DAG, no need to track visited nodes",
      "Can also use BFS with path tracking",
    ],
    starterCode: {
      javascript: `function allPathsSourceTarget(graph) {
  // Write your solution here

}`,
      typescript: `function allPathsSourceTarget(graph: number[][]): number[][] {
  // Write your solution here

}`,
      python: `def allPathsSourceTarget(graph):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(2^n * n)", space: "O(n) for recursion" },
    testCases: [
      {
        input: { graph: [[1, 2], [3], [3], []] },
        expected: [
          [0, 1, 3],
          [0, 2, 3],
        ],
        description: "Two paths",
      },
      {
        input: { graph: [[4, 3, 1], [3, 2, 4], [3], [4], []] },
        expected: [
          [0, 4],
          [0, 3, 4],
          [0, 1, 3, 4],
          [0, 1, 2, 3, 4],
          [0, 1, 4],
        ],
        description: "Multiple paths",
        compareAsSet: true,
      },
      { input: { graph: [[1], []] }, expected: [[0, 1]], description: "Single path" },
    ],
  },
  // ==================== NEW HIGH-VALUE ADDITIONS ====================
  {
    id: "dsa-surrounded-regions",
    title: "Surrounded Regions",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Capture surrounded regions by flipping 'O' to 'X'",
    tags: ["array", "dfs", "bfs", "matrix", "union-find"],
    estimatedTime: 25,
    problemStatement: `Given an m x n matrix board containing 'X' and 'O', capture all regions that are 4-directionally surrounded by 'X'.

A region is captured by flipping all 'O's into 'X's in that surrounded region.

Example visualization:

    Input:                    Output:
    ┌───┬───┬───┬───┐         ┌───┬───┬───┬───┐
    │ X │ X │ X │ X │         │ X │ X │ X │ X │
    ├───┼───┼───┼───┤         ├───┼───┼───┼───┤
    │ X │ O │ O │ X │   →     │ X │ X │ X │ X │  (captured!)
    ├───┼───┼───┼───┤         ├───┼───┼───┼───┤
    │ X │ X │ O │ X │         │ X │ X │ X │ X │  (captured!)
    ├───┼───┼───┼───┤         ├───┼───┼───┼───┤
    │ X │ O │ X │ X │         │ X │ O │ X │ X │  (on border - safe)
    └───┴───┴───┴───┘         └───┴───┴───┴───┘

    Strategy: Mark border-connected O's as safe, flip the rest`,
    examples: [
      {
        input: 'board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]',
        output: '[["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]',
        explanation: "The bottom 'O' is on the border, so it is not captured.",
      },
    ],
    constraints: [
      "m == board.length",
      "n == board[i].length",
      "1 <= m, n <= 200",
      "board[i][j] is 'X' or 'O'.",
    ],
    hints: [
      "Start from border 'O's - they cannot be captured",
      "Use DFS/BFS to mark all 'O's connected to borders",
      "Remaining 'O's are surrounded - flip them to 'X'",
    ],
    starterCode: {
      javascript: `function solve(board) {\n  // Write your solution here (modify board in-place)\n\n}`,
      typescript: `function solve(board: string[][]): void {\n  // Write your solution here\n\n}`,
      python: `def solve(board):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(m * n)", space: "O(m * n)" },
    testCases: [
      {
        input: {
          board: [
            ["X", "X", "X", "X"],
            ["X", "O", "O", "X"],
            ["X", "X", "O", "X"],
            ["X", "O", "X", "X"],
          ],
        },
        expected: [
          ["X", "X", "X", "X"],
          ["X", "X", "X", "X"],
          ["X", "X", "X", "X"],
          ["X", "O", "X", "X"],
        ],
        description: "Standard case",
      },
      {
        input: {
          board: [
            ["O", "O"],
            ["O", "O"],
          ],
        },
        expected: [
          ["O", "O"],
          ["O", "O"],
        ],
        description: "All border - none captured",
      },
    ],
  },
  {
    id: "dsa-number-connected-components",
    title: "Number of Connected Components in an Undirected Graph",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "LinkedIn"],
    description: "Count connected components using Union-Find or DFS",
    tags: ["graph", "union-find", "dfs", "bfs"],
    estimatedTime: 20,
    problemStatement: `You have a graph of n nodes. You are given an integer n and an array edges where edges[i] = [ai, bi] indicates an undirected edge between ai and bi.

Return the number of connected components in the graph.`,
    examples: [
      {
        input: "n = 5, edges = [[0,1],[1,2],[3,4]]",
        output: "2",
        explanation: "Component 1: {0,1,2}, Component 2: {3,4}",
      },
      { input: "n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]", output: "1" },
    ],
    constraints: ["1 <= n <= 2000", "1 <= edges.length <= 5000", "0 <= ai, bi < n"],
    hints: [
      "Union-Find: Initially n components, decrement when unioning",
      "DFS/BFS: Count traversal starts",
    ],
    starterCode: {
      javascript: `function countComponents(n, edges) {\n  // Write your solution here\n\n}`,
      typescript: `function countComponents(n: number, edges: number[][]): number {\n  // Write your solution here\n\n}`,
      python: `def countComponents(n, edges):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(E * α(n))", space: "O(n)" },
    testCases: [
      {
        input: {
          n: 5,
          edges: [
            [0, 1],
            [1, 2],
            [3, 4],
          ],
        },
        expected: 2,
        description: "Two components",
      },
      {
        input: {
          n: 5,
          edges: [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
          ],
        },
        expected: 1,
        description: "One component",
      },
      { input: { n: 5, edges: [] }, expected: 5, description: "No edges" },
    ],
  },
  {
    id: "dsa-redundant-connection",
    title: "Redundant Connection",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Find the edge that creates a cycle using Union-Find",
    tags: ["graph", "union-find", "dfs"],
    estimatedTime: 25,
    problemStatement: `You are given a graph that started as a tree with n nodes, with one additional edge added. Return an edge that can be removed so that the resulting graph is a tree. If there are multiple answers, return the one that occurs last in the input.`,
    examples: [
      { input: "edges = [[1,2],[1,3],[2,3]]", output: "[2,3]" },
      { input: "edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]", output: "[1,4]" },
    ],
    constraints: ["n == edges.length", "3 <= n <= 1000", "1 <= ai < bi <= n"],
    hints: [
      "Use Union-Find to detect when adding edge creates cycle",
      "Return last edge where both nodes have same root",
    ],
    starterCode: {
      javascript: `function findRedundantConnection(edges) {\n  // Write your solution here\n\n}`,
      typescript: `function findRedundantConnection(edges: number[][]): number[] {\n  // Write your solution here\n\n}`,
      python: `def findRedundantConnection(edges):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n * α(n))", space: "O(n)" },
    testCases: [
      {
        input: {
          edges: [
            [1, 2],
            [1, 3],
            [2, 3],
          ],
        },
        expected: [2, 3],
        description: "Triangle",
      },
      {
        input: {
          edges: [
            [1, 2],
            [2, 3],
            [3, 4],
            [1, 4],
            [1, 5],
          ],
        },
        expected: [1, 4],
        description: "Square with tail",
      },
    ],
  },
  {
    id: "dsa-network-delay-time",
    title: "Network Delay Time",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Find minimum time for signal to reach all nodes using Dijkstra",
    tags: ["graph", "dijkstra", "heap", "shortest-path"],
    estimatedTime: 30,
    problemStatement: `You are given a network of n nodes with travel times. Return the minimum time for all nodes to receive a signal from node k, or -1 if impossible.`,
    examples: [
      { input: "times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2", output: "2" },
      { input: "times = [[1,2,1]], n = 2, k = 2", output: "-1" },
    ],
    constraints: ["1 <= k <= n <= 100", "1 <= times.length <= 6000"],
    hints: ["Use Dijkstra's algorithm with min-heap", "Return max of all minimum distances"],
    starterCode: {
      javascript: `function networkDelayTime(times, n, k) {\n  // Write your solution here\n\n}`,
      typescript: `function networkDelayTime(times: number[][], n: number, k: number): number {\n  // Write your solution here\n\n}`,
      python: `def networkDelayTime(times, n, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(E log V)", space: "O(V + E)" },
    testCases: [
      {
        input: {
          times: [
            [2, 1, 1],
            [2, 3, 1],
            [3, 4, 1],
          ],
          n: 4,
          k: 2,
        },
        expected: 2,
        description: "All reachable",
      },
      { input: { times: [[1, 2, 1]], n: 2, k: 2 }, expected: -1, description: "Unreachable" },
    ],
  },
  {
    id: "dsa-cheapest-flights-k-stops",
    title: "Cheapest Flights Within K Stops",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Airbnb"],
    description: "Find cheapest flight with at most k stops",
    tags: ["graph", "bfs", "dynamic-programming", "shortest-path"],
    estimatedTime: 30,
    problemStatement: `Find the cheapest price from src to dst with at most k stops. Return -1 if no such route exists.`,
    examples: [
      {
        input:
          "n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1",
        output: "700",
      },
      {
        input: "n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 0",
        output: "500",
      },
    ],
    constraints: ["1 <= n <= 100", "0 <= flights.length <= n*(n-1)/2"],
    hints: ["BFS with (node, cost, stops)", "Bellman-Ford with k+1 iterations"],
    starterCode: {
      javascript: `function findCheapestPrice(n, flights, src, dst, k) {\n  // Write your solution here\n\n}`,
      typescript: `function findCheapestPrice(n: number, flights: number[][], src: number, dst: number, k: number): number {\n  // Write your solution here\n\n}`,
      python: `def findCheapestPrice(n, flights, src, dst, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(E * K)", space: "O(V)" },
    testCases: [
      {
        input: {
          n: 4,
          flights: [
            [0, 1, 100],
            [1, 2, 100],
            [2, 0, 100],
            [1, 3, 600],
            [2, 3, 200],
          ],
          src: 0,
          dst: 3,
          k: 1,
        },
        expected: 700,
        description: "Limited stops",
      },
      {
        input: {
          n: 3,
          flights: [
            [0, 1, 100],
            [1, 2, 100],
            [0, 2, 500],
          ],
          src: 0,
          dst: 2,
          k: 0,
        },
        expected: 500,
        description: "Direct only",
      },
    ],
  },
  {
    id: "dsa-min-cost-connect-points",
    title: "Min Cost to Connect All Points",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Microsoft"],
    description: "Find minimum spanning tree cost using Prim's or Kruskal's",
    tags: ["graph", "union-find", "minimum-spanning-tree"],
    estimatedTime: 30,
    problemStatement: `Return the minimum cost to make all points connected using Manhattan distance.`,
    examples: [{ input: "points = [[0,0],[2,2],[3,10],[5,2],[7,0]]", output: "20" }],
    constraints: ["1 <= points.length <= 1000", "-10^6 <= xi, yi <= 10^6"],
    hints: ["MST problem - use Prim's or Kruskal's algorithm"],
    starterCode: {
      javascript: `function minCostConnectPoints(points) {\n  // Write your solution here\n\n}`,
      typescript: `function minCostConnectPoints(points: number[][]): number {\n  // Write your solution here\n\n}`,
      python: `def minCostConnectPoints(points):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n^2 log n)", space: "O(n^2)" },
    testCases: [
      {
        input: {
          points: [
            [0, 0],
            [2, 2],
            [3, 10],
            [5, 2],
            [7, 0],
          ],
        },
        expected: 20,
        description: "Five points",
      },
      {
        input: {
          points: [
            [0, 0],
            [1, 1],
          ],
        },
        expected: 2,
        description: "Two points",
      },
    ],
  },
  {
    id: "dsa-accounts-merge",
    title: "Accounts Merge",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Merge accounts with common emails using Union-Find",
    tags: ["graph", "union-find", "dfs", "string"],
    estimatedTime: 30,
    problemStatement: `Given accounts where accounts[i][0] is name and rest are emails, merge accounts belonging to same person (sharing emails). Return merged accounts with sorted emails.`,
    examples: [
      {
        input:
          'accounts = [["John","a@mail.com","b@mail.com"],["John","a@mail.com","c@mail.com"],["Mary","m@mail.com"]]',
        output: '[["John","a@mail.com","b@mail.com","c@mail.com"],["Mary","m@mail.com"]]',
      },
    ],
    constraints: ["1 <= accounts.length <= 1000", "2 <= accounts[i].length <= 10"],
    hints: ["Union-Find to group emails", "Map email to index, union within accounts"],
    starterCode: {
      javascript: `function accountsMerge(accounts) {\n  // Write your solution here\n\n}`,
      typescript: `function accountsMerge(accounts: string[][]): string[][] {\n  // Write your solution here\n\n}`,
      python: `def accountsMerge(accounts):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n*k*α(n*k))", space: "O(n*k)" },
    testCases: [
      {
        input: {
          accounts: [
            ["John", "a@mail.com", "b@mail.com"],
            ["John", "a@mail.com", "c@mail.com"],
            ["Mary", "m@mail.com"],
          ],
        },
        expected: [
          ["John", "a@mail.com", "b@mail.com", "c@mail.com"],
          ["Mary", "m@mail.com"],
        ],
        description: "Merge Johns",
      },
    ],
  },
  {
    id: "dsa-swim-in-rising-water",
    title: "Swim in Rising Water",
    type: "dsa",
    pattern: "graphs",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta"],
    description: "Find minimum time to swim from top-left to bottom-right",
    tags: ["graph", "binary-search", "heap", "union-find"],
    estimatedTime: 35,
    problemStatement: `At time t, water depth everywhere is t. You can swim between adjacent cells if both elevations <= t. Return minimum time to reach (n-1, n-1) from (0, 0).`,
    examples: [{ input: "grid = [[0,2],[1,3]]", output: "3" }],
    constraints: ["n == grid.length", "1 <= n <= 50", "0 <= grid[i][j] < n^2"],
    hints: ["Binary search + DFS/BFS", "Dijkstra with max elevation", "Union-Find by elevation"],
    starterCode: {
      javascript: `function swimInWater(grid) {\n  // Write your solution here\n\n}`,
      typescript: `function swimInWater(grid: number[][]): number {\n  // Write your solution here\n\n}`,
      python: `def swimInWater(grid):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n^2 log n)", space: "O(n^2)" },
    testCases: [
      {
        input: {
          grid: [
            [0, 2],
            [1, 3],
          ],
        },
        expected: 3,
        description: "2x2 grid",
      },
      { input: { grid: [[0]] }, expected: 0, description: "Single cell" },
    ],
  },

  // ==================== BFS/DFS HIGH-VALUE ADDITIONS ====================
  {
    id: "dsa-walls-and-gates",
    title: "Walls and Gates",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft", "DoorDash"],
    description: "Fill each empty room with distance to nearest gate using multi-source BFS",
    tags: ["bfs", "matrix", "multi-source-bfs"],
    estimatedTime: 25,
    problemStatement: `You are given an m x n grid rooms initialized with:
- -1: A wall or obstacle
- 0: A gate
- INF (2147483647): An empty room

Fill each empty room with the distance to its nearest gate. If impossible, leave as INF.

Example visualization:

    Input:                    Output:
    ┌────┬────┬────┬────┐     ┌────┬────┬────┬────┐
    │ INF│ -1 │  0 │ INF│     │  3 │ -1 │  0 │  1 │
    ├────┼────┼────┼────┤     ├────┼────┼────┼────┤
    │ INF│ INF│ INF│ -1 │  →  │  2 │  2 │  1 │ -1 │
    ├────┼────┼────┼────┤     ├────┼────┼────┼────┤
    │ INF│ -1 │ INF│ -1 │     │  1 │ -1 │  2 │ -1 │
    ├────┼────┼────┼────┤     ├────┼────┼────┼────┤
    │  0 │ -1 │ INF│ INF│     │  0 │ -1 │  3 │  4 │
    └────┴────┴────┴────┘     └────┴────┴────┴────┘

    Use multi-source BFS from all gates simultaneously`,
    examples: [
      {
        input:
          "rooms = [[2147483647,-1,0,2147483647],[2147483647,2147483647,2147483647,-1],[2147483647,-1,2147483647,-1],[0,-1,2147483647,2147483647]]",
        output: "[[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]",
      },
      { input: "rooms = [[-1]]", output: "[[-1]]" },
    ],
    constraints: [
      "m == rooms.length",
      "n == rooms[i].length",
      "1 <= m, n <= 250",
      "rooms[i][j] is -1, 0, or 2147483647",
    ],
    hints: [
      "Start BFS from all gates simultaneously (multi-source BFS)",
      "Add all gates to initial queue",
      "BFS guarantees shortest distance to nearest gate",
      "Only update cells with INF value",
    ],
    starterCode: {
      javascript: `function wallsAndGates(rooms) {\n  // Multi-source BFS from all gates\n}`,
      typescript: `function wallsAndGates(rooms: number[][]): void {\n  // Multi-source BFS from all gates\n}`,
      python: `def wallsAndGates(rooms: list[list[int]]) -> None:\n    # Multi-source BFS from all gates\n    pass`,
      java: `class Solution {\n    public void wallsAndGates(int[][] rooms) {\n        // Multi-source BFS from all gates\n    }\n}`,
    },
    optimalComplexity: { time: "O(m * n)", space: "O(m * n)" },
    testCases: [
      {
        input: {
          rooms: [
            [2147483647, -1, 0, 2147483647],
            [2147483647, 2147483647, 2147483647, -1],
            [2147483647, -1, 2147483647, -1],
            [0, -1, 2147483647, 2147483647],
          ],
        },
        expected: [
          [3, -1, 0, 1],
          [2, 2, 1, -1],
          [1, -1, 2, -1],
          [0, -1, 3, 4],
        ],
        description: "Standard grid",
      },
    ],
  },
  {
    id: "dsa-shortest-path-binary-matrix",
    title: "Shortest Path in Binary Matrix",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple"],
    description: "Find shortest path from top-left to bottom-right in binary grid",
    tags: ["bfs", "matrix", "shortest-path"],
    estimatedTime: 20,
    problemStatement: `Given an n x n binary matrix grid, return the length of the shortest clear path from top-left to bottom-right. A clear path connects 0s and can move in 8 directions. Return -1 if no such path exists.

Example visualization:

    ┌───┬───┬───┐     8 directions:
    │ 0 │ 0 │ 0 │       ↖ ↑ ↗
    ├───┼───┼───┤       ← ● →
    │ 1 │ 1 │ 0 │       ↙ ↓ ↘
    ├───┼───┼───┤
    │ 1 │ 1 │ 0 │
    └───┴───┴───┘

    Path: (0,0) → (0,1) → (0,2) → (1,2) → (2,2)
    Length: 4 cells`,
    examples: [
      { input: "grid = [[0,1],[1,0]]", output: "2" },
      { input: "grid = [[0,0,0],[1,1,0],[1,1,0]]", output: "4" },
      {
        input: "grid = [[1,0,0],[1,1,0],[1,1,0]]",
        output: "-1",
        explanation: "Starting cell is blocked",
      },
    ],
    constraints: [
      "n == grid.length",
      "n == grid[i].length",
      "1 <= n <= 100",
      "grid[i][j] is 0 or 1",
    ],
    hints: [
      "BFS from (0,0) - guarantees shortest path",
      "8 directions: horizontal, vertical, diagonal",
      "Track visited to avoid revisiting",
      "Check start and end cells first",
    ],
    starterCode: {
      javascript: `function shortestPathBinaryMatrix(grid) {\n  // BFS with 8 directions\n}`,
      typescript: `function shortestPathBinaryMatrix(grid: number[][]): number {\n  // BFS with 8 directions\n}`,
      python: `def shortestPathBinaryMatrix(grid: list[list[int]]) -> int:\n    # BFS with 8 directions\n    pass`,
      java: `class Solution {\n    public int shortestPathBinaryMatrix(int[][] grid) {\n        // BFS with 8 directions\n        return -1;\n    }\n}`,
    },
    optimalComplexity: { time: "O(n^2)", space: "O(n^2)" },
    testCases: [
      {
        input: {
          grid: [
            [0, 1],
            [1, 0],
          ],
        },
        expected: 2,
        description: "2x2 diagonal",
      },
      {
        input: {
          grid: [
            [0, 0, 0],
            [1, 1, 0],
            [1, 1, 0],
          ],
        },
        expected: 4,
        description: "Longer path",
      },
      {
        input: {
          grid: [
            [1, 0, 0],
            [1, 1, 0],
            [1, 1, 0],
          ],
        },
        expected: -1,
        description: "Blocked start",
      },
    ],
  },
  {
    id: "dsa-open-the-lock",
    title: "Open the Lock",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    description: "Find minimum turns to unlock combination lock using BFS",
    tags: ["bfs", "string", "hash-table"],
    estimatedTime: 25,
    problemStatement: `You have a lock with 4 circular wheels, each with digits 0-9. The lock starts at "0000". Each move turns one wheel one slot (9 wraps to 0, 0 wraps to 9). Some combinations are deadends that lock permanently. Return minimum turns to reach target, or -1 if impossible.`,
    examples: [
      { input: 'deadends = ["0201","0101","0102","1212","2002"], target = "0202"', output: "6" },
      { input: 'deadends = ["8888"], target = "0009"', output: "1" },
      {
        input: 'deadends = ["0000"], target = "8888"',
        output: "-1",
        explanation: "Cannot move from starting position",
      },
    ],
    constraints: [
      "1 <= deadends.length <= 500",
      "deadends[i].length == 4",
      "target.length == 4",
      "target will not be in deadends",
    ],
    hints: [
      "BFS from '0000' to target",
      "Each state has 8 neighbors (4 wheels x 2 directions)",
      "Use set for deadends and visited",
      "Handle edge case: '0000' in deadends",
    ],
    starterCode: {
      javascript: `function openLock(deadends, target) {\n  // BFS through state space\n}`,
      typescript: `function openLock(deadends: string[], target: string): number {\n  // BFS through state space\n}`,
      python: `def openLock(deadends: list[str], target: str) -> int:\n    # BFS through state space\n    pass`,
      java: `class Solution {\n    public int openLock(String[] deadends, String target) {\n        // BFS through state space\n        return -1;\n    }\n}`,
    },
    optimalComplexity: { time: "O(10^4 * 4)", space: "O(10^4)" },
    testCases: [
      {
        input: { deadends: ["0201", "0101", "0102", "1212", "2002"], target: "0202" },
        expected: 6,
        description: "Avoid deadends",
      },
      { input: { deadends: ["8888"], target: "0009" }, expected: 1, description: "One turn" },
      { input: { deadends: ["0000"], target: "8888" }, expected: -1, description: "Start is dead" },
    ],
  },
  {
    id: "dsa-evaluate-division",
    title: "Evaluate Division",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg"],
    description: "Evaluate division queries using graph DFS",
    tags: ["graph", "dfs", "union-find", "hash-table"],
    estimatedTime: 30,
    problemStatement: `Given equations like a/b = k and queries [c, d], return the result of c/d if calculable, or -1.0 if not.`,
    examples: [
      {
        input:
          'equations = [["a","b"],["b","c"]], values = [2.0,3.0], queries = [["a","c"],["b","a"],["a","e"],["a","a"],["x","x"]]',
        output: "[6.00000,0.50000,-1.00000,1.00000,-1.00000]",
      },
      {
        input: 'equations = [["a","b"]], values = [0.5], queries = [["a","b"],["b","a"]]',
        output: "[0.50000,2.00000]",
      },
    ],
    constraints: [
      "1 <= equations.length <= 20",
      "1 <= queries.length <= 20",
      "Variables are lowercase strings",
    ],
    hints: [
      "Build weighted graph: a->b with weight k, b->a with weight 1/k",
      "For query [c, d]: find path from c to d, multiply weights",
      "DFS/BFS to find path",
      "Union-Find with weights is also possible",
    ],
    starterCode: {
      javascript: `function calcEquation(equations, values, queries) {\n  // Build graph and DFS for queries\n}`,
      typescript: `function calcEquation(equations: string[][], values: number[], queries: string[][]): number[] {\n  // Build graph and DFS for queries\n}`,
      python: `def calcEquation(equations: list[list[str]], values: list[float], queries: list[list[str]]) -> list[float]:\n    # Build graph and DFS for queries\n    pass`,
      java: `class Solution {\n    public double[] calcEquation(List<List<String>> equations, double[] values, List<List<String>> queries) {\n        // Build graph and DFS for queries\n        return new double[0];\n    }\n}`,
    },
    optimalComplexity: { time: "O(Q * (V + E))", space: "O(V + E)" },
    testCases: [
      {
        input: {
          equations: [
            ["a", "b"],
            ["b", "c"],
          ],
          values: [2.0, 3.0],
          queries: [
            ["a", "c"],
            ["b", "a"],
            ["a", "e"],
          ],
        },
        expected: [6.0, 0.5, -1.0],
        description: "Chain division",
      },
    ],
  },
  {
    id: "dsa-is-graph-bipartite",
    title: "Is Graph Bipartite?",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft", "LinkedIn"],
    description: "Check if graph can be colored with two colors (bipartite)",
    tags: ["graph", "bfs", "dfs", "union-find"],
    estimatedTime: 20,
    problemStatement: `Given an undirected graph, return true if it is bipartite. A graph is bipartite if nodes can be divided into two independent sets such that every edge connects a node in set A to one in set B.`,
    examples: [
      {
        input: "graph = [[1,2,3],[0,2],[0,1,3],[0,2]]",
        output: "false",
        explanation: "No way to partition nodes into two sets.",
      },
      {
        input: "graph = [[1,3],[0,2],[1,3],[0,2]]",
        output: "true",
        explanation: "Sets {0,2} and {1,3}.",
      },
    ],
    constraints: [
      "graph.length == n",
      "1 <= n <= 100",
      "0 <= graph[u].length < n",
      "Graph is undirected (if j in graph[i], then i in graph[j])",
    ],
    hints: [
      "Try to 2-color the graph",
      "BFS/DFS: alternate colors for neighbors",
      "If neighbor has same color, not bipartite",
      "Handle disconnected components",
    ],
    starterCode: {
      javascript: `function isBipartite(graph) {\n  // BFS/DFS with 2-coloring\n}`,
      typescript: `function isBipartite(graph: number[][]): boolean {\n  // BFS/DFS with 2-coloring\n}`,
      python: `def isBipartite(graph: list[list[int]]) -> bool:\n    # BFS/DFS with 2-coloring\n    pass`,
      java: `class Solution {\n    public boolean isBipartite(int[][] graph) {\n        // BFS/DFS with 2-coloring\n        return false;\n    }\n}`,
    },
    optimalComplexity: { time: "O(V + E)", space: "O(V)" },
    testCases: [
      {
        input: {
          graph: [
            [1, 2, 3],
            [0, 2],
            [0, 1, 3],
            [0, 2],
          ],
        },
        expected: false,
        description: "Not bipartite",
      },
      {
        input: {
          graph: [
            [1, 3],
            [0, 2],
            [1, 3],
            [0, 2],
          ],
        },
        expected: true,
        description: "Bipartite square",
      },
    ],
  },
  {
    id: "dsa-find-path-exists",
    title: "Find if Path Exists in Graph",
    type: "dsa",
    pattern: "graphs",
    difficulty: "easy",
    companies: ["Amazon", "Google", "LinkedIn"],
    description: "Check if path exists between two nodes in undirected graph",
    tags: ["graph", "bfs", "dfs", "union-find"],
    estimatedTime: 15,
    problemStatement: `Given a bi-directional graph with n vertices and edges, determine if there is a valid path from source to destination.`,
    examples: [
      {
        input: "n = 3, edges = [[0,1],[1,2],[2,0]], source = 0, destination = 2",
        output: "true",
        explanation: "Path 0 -> 1 -> 2 or 0 -> 2",
      },
      {
        input: "n = 6, edges = [[0,1],[0,2],[3,5],[5,4],[4,3]], source = 0, destination = 5",
        output: "false",
        explanation: "No path from 0 to 5",
      },
    ],
    constraints: [
      "1 <= n <= 2 * 10^5",
      "0 <= edges.length <= 2 * 10^5",
      "0 <= source, destination <= n - 1",
    ],
    hints: [
      "Build adjacency list",
      "BFS or DFS from source",
      "Union-Find also works",
      "Track visited nodes",
    ],
    starterCode: {
      javascript: `function validPath(n, edges, source, destination) {\n  // BFS/DFS from source\n}`,
      typescript: `function validPath(n: number, edges: number[][], source: number, destination: number): boolean {\n  // BFS/DFS from source\n}`,
      python: `def validPath(n: int, edges: list[list[int]], source: int, destination: int) -> bool:\n    # BFS/DFS from source\n    pass`,
      java: `class Solution {\n    public boolean validPath(int n, int[][] edges, int source, int destination) {\n        // BFS/DFS from source\n        return false;\n    }\n}`,
    },
    optimalComplexity: { time: "O(V + E)", space: "O(V + E)" },
    testCases: [
      {
        input: {
          n: 3,
          edges: [
            [0, 1],
            [1, 2],
            [2, 0],
          ],
          source: 0,
          destination: 2,
        },
        expected: true,
        description: "Connected",
      },
      {
        input: {
          n: 6,
          edges: [
            [0, 1],
            [0, 2],
            [3, 5],
            [5, 4],
            [4, 3],
          ],
          source: 0,
          destination: 5,
        },
        expected: false,
        description: "Disconnected",
      },
    ],
  },
  {
    id: "dsa-keys-and-rooms",
    title: "Keys and Rooms",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Microsoft"],
    description: "Check if all rooms can be visited starting from room 0",
    tags: ["graph", "dfs", "bfs"],
    estimatedTime: 20,
    problemStatement: `There are n rooms labeled 0 to n-1 and all rooms are locked except for room 0. Your goal is to visit all rooms. When you visit a room, you may find keys to other rooms.

Given rooms where rooms[i] is the set of keys in room i, return true if you can visit all rooms.`,
    examples: [
      { input: "rooms = [[1],[2],[3],[]]", output: "true", explanation: "Visit 0 -> 1 -> 2 -> 3" },
      {
        input: "rooms = [[1,3],[3,0,1],[2],[0]]",
        output: "false",
        explanation: "Can't enter room 2",
      },
    ],
    constraints: [
      "n == rooms.length",
      "2 <= n <= 1000",
      "0 <= rooms[i].length <= 1000",
      "1 <= sum(rooms[i].length) <= 3000",
    ],
    hints: [
      "DFS/BFS from room 0",
      "Keys are edges to other rooms",
      "Track visited rooms",
      "Check if visited count equals n",
    ],
    starterCode: {
      javascript: `function canVisitAllRooms(rooms) {\n  // DFS/BFS from room 0\n}`,
      typescript: `function canVisitAllRooms(rooms: number[][]): boolean {\n  // DFS/BFS from room 0\n}`,
      python: `def canVisitAllRooms(rooms: list[list[int]]) -> bool:\n    # DFS/BFS from room 0\n    pass`,
      java: `class Solution {\n    public boolean canVisitAllRooms(List<List<Integer>> rooms) {\n        // DFS/BFS from room 0\n        return false;\n    }\n}`,
    },
    optimalComplexity: { time: "O(n + k)", space: "O(n)" },
    testCases: [
      { input: { rooms: [[1], [2], [3], []] }, expected: true, description: "Linear key chain" },
      {
        input: { rooms: [[1, 3], [3, 0, 1], [2], [0]] },
        expected: false,
        description: "Room 2 unreachable",
      },
    ],
  },
  {
    id: "dsa-snakes-and-ladders",
    title: "Snakes and Ladders",
    type: "dsa",
    pattern: "graphs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Find minimum moves to reach end of snakes and ladders board",
    tags: ["bfs", "matrix", "simulation"],
    estimatedTime: 30,
    problemStatement: `You are given an n x n board labeled from 1 to n^2 in Boustrophedon style (alternating left-to-right and right-to-left per row, starting from bottom-left). board[r][c] = -1 means no snake/ladder, otherwise it's the destination square.

Return minimum number of moves to reach square n^2 starting from 1, or -1 if impossible.`,
    examples: [
      {
        input:
          "board = [[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,35,-1,-1,13,-1],[-1,-1,-1,-1,-1,-1],[-1,15,-1,-1,-1,-1]]",
        output: "4",
        explanation: "1 -> 2 -> 15 -> 35 -> 36",
      },
      { input: "board = [[-1,-1],[-1,3]]", output: "1" },
    ],
    constraints: [
      "n == board.length == board[i].length",
      "2 <= n <= 20",
      "board[i][j] is -1 or in [1, n^2]",
    ],
    hints: [
      "BFS from square 1",
      "Convert square number to (row, col) considering Boustrophedon",
      "For each move, try all dice rolls 1-6",
      "Follow snake/ladder if present",
    ],
    starterCode: {
      javascript: `function snakesAndLadders(board) {\n  // BFS with board position conversion\n}`,
      typescript: `function snakesAndLadders(board: number[][]): number {\n  // BFS with board position conversion\n}`,
      python: `def snakesAndLadders(board: list[list[int]]) -> int:\n    # BFS with board position conversion\n    pass`,
      java: `class Solution {\n    public int snakesAndLadders(int[][] board) {\n        // BFS with board position conversion\n        return -1;\n    }\n}`,
    },
    optimalComplexity: { time: "O(n^2)", space: "O(n^2)" },
    testCases: [
      {
        input: {
          board: [
            [-1, -1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1, -1],
            [-1, 35, -1, -1, 13, -1],
            [-1, -1, -1, -1, -1, -1],
            [-1, 15, -1, -1, -1, -1],
          ],
        },
        expected: 4,
        description: "With ladders",
      },
    ],
  },
  {
    id: "dsa-find-town-judge",
    title: "Find the Town Judge",
    type: "dsa",
    pattern: "graphs",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Microsoft"],
    description: "Find person trusted by everyone but trusts no one",
    tags: ["graph", "array", "hash-table"],
    estimatedTime: 15,
    problemStatement: `In a town of n people labeled 1 to n, there is a rumor that one person is the town judge. If the town judge exists:
1. The town judge trusts nobody.
2. Everybody (except the judge) trusts the town judge.
3. There is exactly one person that satisfies properties 1 and 2.

Given trust where trust[i] = [a, b] means a trusts b, return the town judge's label, or -1 if not found.`,
    examples: [
      { input: "n = 2, trust = [[1,2]]", output: "2" },
      { input: "n = 3, trust = [[1,3],[2,3]]", output: "3" },
      {
        input: "n = 3, trust = [[1,3],[2,3],[3,1]]",
        output: "-1",
        explanation: "3 trusts someone",
      },
    ],
    constraints: [
      "1 <= n <= 1000",
      "0 <= trust.length <= 10^4",
      "trust[i].length == 2",
      "All pairs are unique",
      "a != b",
    ],
    hints: [
      "Count in-degree and out-degree for each person",
      "Judge has in-degree n-1 and out-degree 0",
      "Or use single count: +1 for incoming trust, -1 for outgoing",
      "Find person with count == n-1",
    ],
    starterCode: {
      javascript: `function findJudge(n, trust) {\n  // Count trust relationships\n}`,
      typescript: `function findJudge(n: number, trust: number[][]): number {\n  // Count trust relationships\n}`,
      python: `def findJudge(n: int, trust: list[list[int]]) -> int:\n    # Count trust relationships\n    pass`,
      java: `class Solution {\n    public int findJudge(int n, int[][] trust) {\n        // Count trust relationships\n        return -1;\n    }\n}`,
    },
    optimalComplexity: { time: "O(n + t)", space: "O(n)" },
    testCases: [
      { input: { n: 2, trust: [[1, 2]] }, expected: 2, description: "Two people" },
      {
        input: {
          n: 3,
          trust: [
            [1, 3],
            [2, 3],
          ],
        },
        expected: 3,
        description: "Three people",
      },
      {
        input: {
          n: 3,
          trust: [
            [1, 3],
            [2, 3],
            [3, 1],
          ],
        },
        expected: -1,
        description: "No judge",
      },
    ],
  },
]

export default graphsScenarios
