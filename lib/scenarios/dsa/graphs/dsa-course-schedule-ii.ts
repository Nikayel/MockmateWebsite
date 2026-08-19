import type { DSAScenario } from "../../types"

export const courseScheduleIiScenario: DSAScenario = {
  id: "dsa-course-schedule-ii",
  title: "Course Schedule II",
  type: "dsa",
  pattern: "topological-sort",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Find an order to take all courses that satisfies every prerequisite",
  tags: ["graph", "dfs", "bfs", "topological-sort"],
  estimatedTime: 30,
  problemStatement: `You're mapping out a schedule across numCourses courses, labeled 0 through numCourses - 1. Enrollment rules arrive as the array prerequisites: each prerequisites[i] = [ai, bi] says course bi has to be finished before course ai can begin.

Build an ordering of all the courses that honors every rule, and return it as an array. Whenever several orderings work, any one of them is accepted. Should the rules make completing everything impossible, return an empty array instead.`,
  examples: [
    {
      input: "numCourses = 3, prerequisites = [[1,0],[2,1]]",
      output: "[0,1,2]",
      explanation: "Course 0 unlocks course 1, which unlocks course 2; exactly one schedule works.",
    },
    {
      input: "numCourses = 4, prerequisites = [[2,0],[3,0],[1,2],[1,3]]",
      output: "[0,2,3,1] or [0,3,2,1]",
      explanation:
        "Course 0 opens up courses 2 and 3, which can come in either order before course 1.",
    },
    {
      input: "numCourses = 2, prerequisites = []",
      output: "[0,1] or [1,0]",
    },
  ],
  constraints: [
    "numCourses is at least 1 and at most 2000.",
    "The pair count runs from 0 up to numCourses * (numCourses - 1).",
    "Each prerequisites[i] holds exactly 2 labels.",
    "Labels ai and bi start at 0 and stay below numCourses.",
    "A course never requires itself (ai != bi).",
    "No pair [ai, bi] shows up twice.",
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
      // The [2, 1] edge is load-bearing: without it this diamond admits several valid
      // orders ([0,2,1,3] among them) while the validator compares exactly, so correct
      // DFS-based solutions were failing. Every input here has exactly ONE valid order.
      input: {
        numCourses: 4,
        prerequisites: [
          [1, 0],
          [2, 0],
          [3, 1],
          [3, 2],
          [2, 1],
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
    // Every acyclic case above answers with 0,1,2,...  so a solution that checked for a
    // cycle and then returned list(range(numCourses)) without ordering anything passed
    // them all. These two force orders that differ from the course numbering.
    {
      input: { numCourses: 2, prerequisites: [[0, 1]] },
      expected: [1, 0],
      description: "Course 1 must come first",
    },
    {
      input: {
        numCourses: 3,
        prerequisites: [
          [0, 1],
          [1, 2],
        ],
      },
      expected: [2, 1, 0],
      description: "Chain in reverse of the course numbering",
    },
  ],
}
