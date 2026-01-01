/**
 * Graphs DSA Scenarios
 * Pattern: graphs
 */

import type { DSAScenario } from '../types'

export const graphsScenarios: DSAScenario[] = [
  {
    id: 'dsa-number-of-islands',
    title: 'Number of Islands',
    type: 'dsa',
    pattern: 'graphs',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    description: 'Count the number of islands in a 2D grid',
    tags: ['array', 'depth-first-search', 'breadth-first-search', 'union-find', 'matrix'],
    estimatedTime: 25,
    problemStatement: `Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
    examples: [
      {
        input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
        output: '1',
      },
      {
        input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
        output: '3',
      },
    ],
    constraints: [
      'm == grid.length',
      'n == grid[i].length',
      '1 <= m, n <= 300',
      'grid[i][j] is \'0\' or \'1\'',
    ],
    hints: [
      'Use DFS or BFS to explore each island',
      'Mark visited cells to avoid counting them twice',
      'Count how many times you initiate a DFS/BFS',
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
      time: 'O(m * n)',
      space: 'O(m * n)',
    },
    testCases: [
      {
        input: {
          grid: [
            ["1", "1", "1", "1", "0"],
            ["1", "1", "0", "1", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "0", "0", "0"]
          ]
        },
        expected: 1,
        description: 'Single large island',
      },
      {
        input: {
          grid: [
            ["1", "1", "0", "0", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "1", "0", "0"],
            ["0", "0", "0", "1", "1"]
          ]
        },
        expected: 3,
        description: 'Three separate islands',
      },
      {
        input: {
          grid: [
            ["1", "0", "1"],
            ["0", "1", "0"],
            ["1", "0", "1"]
          ]
        },
        expected: 5,
        description: 'Five single-cell islands',
      },
      {
        input: {
          grid: [
            ["0", "0", "0"],
            ["0", "0", "0"],
            ["0", "0", "0"]
          ]
        },
        expected: 0,
        description: 'No islands (all water)',
      },
      {
        input: {
          grid: [
            ["1"]
          ]
        },
        expected: 1,
        description: 'Single cell island',
      },
    ],
  },
  {
    id: 'dsa-course-schedule',
    title: 'Course Schedule',
    type: 'dsa',
    pattern: 'graphs',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    description: 'Determine if you can finish all courses given prerequisites',
    tags: ['graph', 'topological-sort', 'dfs', 'bfs'],
    estimatedTime: 25,
    problemStatement: `There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.

For example, the pair [0, 1], indicates that to take course 0 you have to first take course 1.

Return true if you can finish all courses. Otherwise, return false.`,
    examples: [
      {
        input: 'numCourses = 2, prerequisites = [[1,0]]',
        output: 'true',
        explanation: 'Take course 0, then course 1.',
      },
      {
        input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]',
        output: 'false',
        explanation: 'To take course 1 you need course 0, and vice versa. Cycle detected.',
      },
    ],
    constraints: [
      '1 <= numCourses <= 2000',
      '0 <= prerequisites.length <= 5000',
      'prerequisites[i].length == 2',
      '0 <= ai, bi < numCourses',
      'All pairs prerequisites[i] are unique',
    ],
    hints: [
      'This problem is equivalent to detecting a cycle in a directed graph',
      'Use topological sorting (Kahn\'s algorithm or DFS)',
      'Track visited nodes and nodes in current path',
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
      time: 'O(V + E)',
      space: 'O(V + E)',
    },
    testCases: [
      {
        input: { numCourses: 2, prerequisites: [[1,0]] },
        expected: true,
        description: 'Simple linear dependency',
      },
      {
        input: { numCourses: 2, prerequisites: [[1,0],[0,1]] },
        expected: false,
        description: 'Cycle detected',
      },
      {
        input: { numCourses: 4, prerequisites: [[1,0],[2,0],[3,1],[3,2]] },
        expected: true,
        description: 'Multiple dependencies, no cycle',
      },
      {
        input: { numCourses: 3, prerequisites: [[0,1],[1,2],[2,0]] },
        expected: false,
        description: 'Three-node cycle',
      },
    ],
  },
  {
    id: 'dsa-clone-graph',
    title: 'Clone Graph',
    type: 'dsa',
    pattern: 'graphs',
    difficulty: 'medium',
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: 'Deep clone an undirected graph.',
    tags: ["graph", "dfs", "bfs", "hash-table"],
    estimatedTime: 25,
    problemStatement: `Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph. Each node contains a value and a list of its neighbors.`,
    examples: [
    {
      input: 'adjList = [[2,4],[1,3],[2,4],[1,3]]',
      output: '[[2,4],[1,3],[2,4],[1,3]]'
    },
    {
      input: 'adjList = [[]]',
      output: '[[]]'
    }
  ],
    constraints: [
    'The number of nodes in the graph is in the range [0, 100].',
    '1 <= Node.val <= 100',
    'Node.val is unique for each node.'
  ],
    hints: [
    'Use HashMap to track old to new node mapping',
    'Use DFS or BFS to traverse graph',
    'Create new nodes and clone neighbors recursively'
  ],
    starterCode: {
      javascript: `function clone_graph() {
  // Your code here
}`,
      python: `def clone_graph():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(V + E)',
      space: 'O(V)'
    },
    testCases: []
  },
  {
    id: 'dsa-word-ladder',
    title: 'Word Ladder',
    type: 'dsa',
    pattern: 'graphs',
    difficulty: 'hard',
    companies: ["Amazon", "Google", "Meta"],
    description: 'Find shortest transformation sequence from begin word to end word.',
    tags: ["graph", "bfs", "hash-table"],
    estimatedTime: 35,
    problemStatement: `A transformation sequence from word beginWord to word endWord is a sequence of words where each adjacent pair differs by a single letter, and every word in the sequence is in the wordList. Return the number of words in the shortest transformation sequence, or 0 if no such sequence exists.`,
    examples: [
    {
      input: 'beginWord = hot, endWord = dog, wordList = [hot,dot,dog,lot,log,cog]',
      output: '5',
      explanation: 'hot -> dot -> dog'
    },
    {
      input: 'beginWord = hit, endWord = cog, wordList = [hot,dot,dog,lot,log,cog]',
      output: '0'
    }
  ],
    constraints: [
    '1 <= beginWord.length <= 10',
    'endWord.length == beginWord.length',
    '1 <= wordList.length <= 5000',
    'All strings consist of lowercase English letters.'
  ],
    hints: [
    'Model as graph: words are nodes, edges connect words differing by 1 letter',
    'Use BFS for shortest path',
    'Optimize by creating pattern map (h*t -> hot, hit)'
  ],
    starterCode: {
      javascript: `function word_ladder() {
  // Your code here
}`,
      python: `def word_ladder():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(M^2 * N)',
      space: 'O(M^2 * N)'
    },
    testCases: []
  },
  {
    id: 'dsa-pacific-atlantic-water-flow',
    title: 'Pacific Atlantic Water Flow',
    type: 'dsa',
    pattern: 'graphs',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google'],
    description: 'Find cells that can flow to both Pacific and Atlantic oceans',
    tags: ['array', 'dfs', 'bfs', 'matrix'],
    estimatedTime: 30,
    problemStatement: `There is an m x n rectangular island that borders both the Pacific Ocean and Atlantic Ocean. The Pacific Ocean touches the top and left edges. The Atlantic Ocean touches the bottom and right edges. You are given an m x n integer matrix heights where heights[r][c] is the height above sea level. Water can flow from a cell to adjacent cells (up, down, left, right) if the adjacent cell's height is <= the current cell's height. Return a list of all cells that can flow to both the Pacific and Atlantic oceans.`,
    examples: [
      { input: 'heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]', output: '[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]' },
    ],
    constraints: ['m == heights.length', 'n == heights[r].length', '1 <= m, n <= 200', '0 <= heights[r][c] <= 10^5'],
    hints: ['Start DFS/BFS from ocean borders instead of every cell', 'Find cells reachable from Pacific, then from Atlantic', 'Return intersection of both sets'],
    starterCode: {
      javascript: `function pacificAtlantic(heights) {\n  // Write your solution here\n\n}`,
      typescript: `function pacificAtlantic(heights: number[][]): number[][] {\n  // Write your solution here\n\n}`,
      python: `def pacificAtlantic(heights):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(m * n)', space: 'O(m * n)' },
    testCases: [
      { input: { heights: [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]] }, expected: [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]], description: 'Multiple valid cells' },
    ],
  },
  {
    id: 'dsa-rotting-oranges',
    title: 'Rotting Oranges',
    type: 'dsa',
    pattern: 'graphs',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Microsoft', 'Google'],
    description: 'Find minimum minutes for all oranges to rot using BFS',
    tags: ['array', 'bfs', 'matrix'],
    estimatedTime: 25,
    problemStatement: `You are given an m x n grid where 0 is an empty cell, 1 is a fresh orange, and 2 is a rotten orange. Every minute, any fresh orange adjacent (4-directionally) to a rotten orange becomes rotten. Return the minimum number of minutes that must elapse until no cell has a fresh orange. If impossible, return -1.`,
    examples: [
      { input: 'grid = [[2,1,1],[1,1,0],[0,1,1]]', output: '4' },
      { input: 'grid = [[2,1,1],[0,1,1],[1,0,1]]', output: '-1', explanation: 'The orange in the bottom left corner is never reached.' },
      { input: 'grid = [[0,2]]', output: '0', explanation: 'No fresh oranges to rot.' },
    ],
    constraints: ['m == grid.length', 'n == grid[i].length', '1 <= m, n <= 10', 'grid[i][j] is 0, 1, or 2'],
    hints: ['Use multi-source BFS starting from all rotten oranges', 'Count fresh oranges initially', 'Track time/levels in BFS'],
    starterCode: {
      javascript: `function orangesRotting(grid) {\n  // Write your solution here\n\n}`,
      typescript: `function orangesRotting(grid: number[][]): number {\n  // Write your solution here\n\n}`,
      python: `def orangesRotting(grid):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(m * n)', space: 'O(m * n)' },
    testCases: [
      { input: { grid: [[2,1,1],[1,1,0],[0,1,1]] }, expected: 4, description: 'All oranges rot' },
      { input: { grid: [[2,1,1],[0,1,1],[1,0,1]] }, expected: -1, description: 'Impossible case' },
    ],
  },
  {
    id: 'dsa-graph-valid-tree',
    title: 'Graph Valid Tree',
    type: 'dsa',
    pattern: 'graphs',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    description: 'Determine if an undirected graph is a valid tree',
    tags: ['graph', 'dfs', 'bfs', 'union-find'],
    estimatedTime: 25,
    problemStatement: `You have a graph of n nodes labeled from 0 to n - 1. You are given n and a list of edges where edges[i] = [ai, bi] indicates an undirected edge between nodes ai and bi. Return true if the edges form a valid tree, and false otherwise.`,
    examples: [
      { input: 'n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]', output: 'true' },
      { input: 'n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]', output: 'false', explanation: 'There is a cycle: 1-2-3-1' },
    ],
    constraints: ['1 <= n <= 2000', '0 <= edges.length <= 5000', 'edges[i].length == 2', '0 <= ai, bi < n', 'ai != bi', 'There are no self-loops or repeated edges'],
    hints: ['A valid tree has exactly n-1 edges and is connected', 'Check for cycles using DFS or Union-Find', 'Verify all nodes are reachable from any starting node'],
    starterCode: {
      javascript: `function validTree(n, edges) {\n  // Write your solution here\n\n}`,
      typescript: `function validTree(n: number, edges: number[][]): boolean {\n  // Write your solution here\n\n}`,
      python: `def validTree(n, edges):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(V + E)', space: 'O(V + E)' },
    testCases: [
      { input: { n: 5, edges: [[0,1],[0,2],[0,3],[1,4]] }, expected: true, description: 'Valid tree' },
      { input: { n: 5, edges: [[0,1],[1,2],[2,3],[1,3],[1,4]] }, expected: false, description: 'Has cycle' },
    ],
  },
]

export default graphsScenarios
