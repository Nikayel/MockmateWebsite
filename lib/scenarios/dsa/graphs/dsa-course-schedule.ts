import type { DSAScenario } from "../../types"

export const courseScheduleScenario: DSAScenario = {
  id: "dsa-course-schedule",
  title: "Course Schedule",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Determine if you can finish all courses given prerequisites",
  // Order matters: the scenario list card shows the first two tags, so the neutral
  // descriptors lead and the algorithm names stay behind them for search only.
  tags: ["graph", "prerequisites", "topological-sort", "dfs", "bfs"],
  estimatedTime: 25,
  // The statement renders through MarkdownRenderer, so it is written as markdown: no ASCII
  // diagrams (single line breaks collapse and garble them), and no approach naming — the
  // strategy lives in `hints`, which the UI keeps behind click-to-reveal.
  problemStatement: `There are a total of \`numCourses\` courses you have to take, labeled from \`0\` to \`numCourses - 1\`. You are given an array \`prerequisites\` where \`prerequisites[i] = [a, b]\` indicates that you must take course \`b\` first if you want to take course \`a\`.

For example, the pair \`[0, 1]\` indicates that to take course 0 you have to first take course 1.

Return \`true\` if you can finish all courses. Otherwise, return \`false\`.`,
  examples: [
    {
      input: "numCourses = 2, prerequisites = [[1,0]]",
      output: "true",
      explanation: "Take course 0, then course 1.",
    },
    {
      input: "numCourses = 2, prerequisites = [[1,0],[0,1]]",
      output: "false",
      explanation:
        "To take course 1 you must first take course 0, and to take course 0 you must first take course 1. So it is impossible.",
    },
  ],
  constraints: [
    "1 <= numCourses <= 2000",
    "0 <= prerequisites.length <= 5000",
    "prerequisites[i].length == 2",
    "0 <= ai, bi < numCourses",
    "All pairs prerequisites[i] are unique",
  ],
  // Progressive reveal: each hint gives away strictly more than the one before it, so the
  // first unlock nudges modeling while the last spells out the DFS mechanics.
  hints: [
    "Model the courses as a directed graph: each prerequisite pair [a, b] is an edge from b to a. The question then becomes a property of that graph.",
    "You can finish all courses exactly when the graph has no cycle, so this is cycle detection in a directed graph.",
    "Topological sort answers it constructively (Kahn's algorithm): repeatedly take any course whose remaining prerequisite count is zero. If you finish fewer than numCourses courses, a cycle blocked you.",
    "For the DFS approach, give each node three states: unvisited, in the current recursion path, and done. Reaching a node that is already in the current path means a cycle.",
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
    // The four cases above all happen to be decided by course 0 alone, which let a
    // solution that returned after checking only the first course pass 4/4 in a real
    // session. Everything below exists to kill specific wrong-but-plausible solutions.
    {
      input: {
        numCourses: 4,
        prerequisites: [
          [2, 3],
          [3, 2],
        ],
      },
      expected: false,
      description: "Cycle that does not involve course 0",
    },
    {
      input: { numCourses: 3, prerequisites: [] },
      expected: true,
      description: "No prerequisites at all",
    },
    {
      input: {
        numCourses: 6,
        prerequisites: [
          [1, 0],
          [3, 2],
          [5, 4],
        ],
      },
      expected: true,
      description: "Disconnected components, all finishable",
    },
    {
      input: {
        numCourses: 5,
        prerequisites: [
          [1, 0],
          [2, 0],
          [3, 1],
          [3, 2],
          [4, 3],
        ],
      },
      expected: true,
      description: "Diamond dependency into a deep chain",
    },
  ],
}
