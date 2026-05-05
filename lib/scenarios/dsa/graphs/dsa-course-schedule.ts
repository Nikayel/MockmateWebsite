import type { DSAScenario } from "../../types"

export const courseScheduleScenario: DSAScenario = {
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
}
