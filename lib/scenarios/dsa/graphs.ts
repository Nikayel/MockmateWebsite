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
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Count the number of islands in a 2D grid",
    tags: ["array", "depth-first-search", "breadth-first-search", "union-find", "matrix"],
    estimatedTime: 25,
    problemStatement: `Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
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

Return true if you can finish all courses. Otherwise, return false.`,
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

Test case format: For simplicity, each node's value is the same as the node's index (1-indexed). The input is given as an adjacency list where adjList[i] is a list of neighbors for node i+1.`,
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
    problemStatement: `You are given an m x n grid where 0 is an empty cell, 1 is a fresh orange, and 2 is a rotten orange. Every minute, any fresh orange adjacent (4-directionally) to a rotten orange becomes rotten. Return the minimum number of minutes that must elapse until no cell has a fresh orange. If impossible, return -1.`,
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

A region is captured by flipping all 'O's into 'X's in that surrounded region.`,
    examples: [
      {
        input: 'board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]',
        output: '[["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]',
        explanation: "The bottom 'O' is on the border, so it is not captured.",
      },
    ],
    constraints: ["m == board.length", "n == board[i].length", "1 <= m, n <= 200", "board[i][j] is 'X' or 'O'."],
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
      { input: { board: [["X", "X", "X", "X"], ["X", "O", "O", "X"], ["X", "X", "O", "X"], ["X", "O", "X", "X"]] }, expected: [["X", "X", "X", "X"], ["X", "X", "X", "X"], ["X", "X", "X", "X"], ["X", "O", "X", "X"]], description: "Standard case" },
      { input: { board: [["O", "O"], ["O", "O"]] }, expected: [["O", "O"], ["O", "O"]], description: "All border - none captured" },
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
      { input: "n = 5, edges = [[0,1],[1,2],[3,4]]", output: "2", explanation: "Component 1: {0,1,2}, Component 2: {3,4}" },
      { input: "n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]", output: "1" },
    ],
    constraints: ["1 <= n <= 2000", "1 <= edges.length <= 5000", "0 <= ai, bi < n"],
    hints: ["Union-Find: Initially n components, decrement when unioning", "DFS/BFS: Count traversal starts"],
    starterCode: {
      javascript: `function countComponents(n, edges) {\n  // Write your solution here\n\n}`,
      typescript: `function countComponents(n: number, edges: number[][]): number {\n  // Write your solution here\n\n}`,
      python: `def countComponents(n, edges):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(E * α(n))", space: "O(n)" },
    testCases: [
      { input: { n: 5, edges: [[0, 1], [1, 2], [3, 4]] }, expected: 2, description: "Two components" },
      { input: { n: 5, edges: [[0, 1], [1, 2], [2, 3], [3, 4]] }, expected: 1, description: "One component" },
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
    hints: ["Use Union-Find to detect when adding edge creates cycle", "Return last edge where both nodes have same root"],
    starterCode: {
      javascript: `function findRedundantConnection(edges) {\n  // Write your solution here\n\n}`,
      typescript: `function findRedundantConnection(edges: number[][]): number[] {\n  // Write your solution here\n\n}`,
      python: `def findRedundantConnection(edges):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n * α(n))", space: "O(n)" },
    testCases: [
      { input: { edges: [[1, 2], [1, 3], [2, 3]] }, expected: [2, 3], description: "Triangle" },
      { input: { edges: [[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]] }, expected: [1, 4], description: "Square with tail" },
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
      { input: { times: [[2, 1, 1], [2, 3, 1], [3, 4, 1]], n: 4, k: 2 }, expected: 2, description: "All reachable" },
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
      { input: "n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1", output: "700" },
      { input: "n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 0", output: "500" },
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
      { input: { n: 4, flights: [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], src: 0, dst: 3, k: 1 }, expected: 700, description: "Limited stops" },
      { input: { n: 3, flights: [[0, 1, 100], [1, 2, 100], [0, 2, 500]], src: 0, dst: 2, k: 0 }, expected: 500, description: "Direct only" },
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
    examples: [
      { input: "points = [[0,0],[2,2],[3,10],[5,2],[7,0]]", output: "20" },
    ],
    constraints: ["1 <= points.length <= 1000", "-10^6 <= xi, yi <= 10^6"],
    hints: ["MST problem - use Prim's or Kruskal's algorithm"],
    starterCode: {
      javascript: `function minCostConnectPoints(points) {\n  // Write your solution here\n\n}`,
      typescript: `function minCostConnectPoints(points: number[][]): number {\n  // Write your solution here\n\n}`,
      python: `def minCostConnectPoints(points):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n^2 log n)", space: "O(n^2)" },
    testCases: [
      { input: { points: [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]] }, expected: 20, description: "Five points" },
      { input: { points: [[0, 0], [1, 1]] }, expected: 2, description: "Two points" },
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
      { input: 'accounts = [["John","a@mail.com","b@mail.com"],["John","a@mail.com","c@mail.com"],["Mary","m@mail.com"]]', output: '[["John","a@mail.com","b@mail.com","c@mail.com"],["Mary","m@mail.com"]]' },
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
      { input: { accounts: [["John", "a@mail.com", "b@mail.com"], ["John", "a@mail.com", "c@mail.com"], ["Mary", "m@mail.com"]] }, expected: [["John", "a@mail.com", "b@mail.com", "c@mail.com"], ["Mary", "m@mail.com"]], description: "Merge Johns" },
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
    examples: [
      { input: "grid = [[0,2],[1,3]]", output: "3" },
    ],
    constraints: ["n == grid.length", "1 <= n <= 50", "0 <= grid[i][j] < n^2"],
    hints: ["Binary search + DFS/BFS", "Dijkstra with max elevation", "Union-Find by elevation"],
    starterCode: {
      javascript: `function swimInWater(grid) {\n  // Write your solution here\n\n}`,
      typescript: `function swimInWater(grid: number[][]): number {\n  // Write your solution here\n\n}`,
      python: `def swimInWater(grid):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n^2 log n)", space: "O(n^2)" },
    testCases: [
      { input: { grid: [[0, 2], [1, 3]] }, expected: 3, description: "2x2 grid" },
      { input: { grid: [[0]] }, expected: 0, description: "Single cell" },
    ],
  },
]

export default graphsScenarios
