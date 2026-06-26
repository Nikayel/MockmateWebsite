import type { DSAScenario } from "../../types"

export const courseScheduleIiScenario: DSAScenario = {
  id: "dsa-course-schedule-ii",
  title: "Course Schedule II",
  type: "dsa",
  pattern: "topological-sort",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
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
}
