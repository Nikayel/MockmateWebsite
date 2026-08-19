import type { DSAScenario } from "../../types"

export const swimInRisingWaterScenario: DSAScenario = {
  id: "dsa-swim-in-rising-water",
  title: "Swim in Rising Water",
  type: "dsa",
  pattern: "graphs",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta"],
  description:
    "Find the earliest time rising water lets you swim between opposite corners of a grid",
  tags: ["graph", "binary-search", "heap", "union-find"],
  estimatedTime: 35,
  problemStatement: `Rain is flooding an n x n basin whose terrain is recorded in the integer matrix grid, where grid[i][j] is the elevation of that square of ground. The water level climbs everywhere at the same speed: after t units of time, every square is submerged to depth t.

You start on the top left square at time 0 and want to occupy the bottom right square. You may swim between two squares that share an edge whenever the water covers them both, which happens once both of their elevations are at most t. Swimming itself costs no time. Return the earliest time t at which you can be sitting on the bottom right square.`,
  examples: [
    {
      input: "grid = [[0,3],[2,1]]",
      output: "2",
      explanation:
        "At t = 2 you can drop onto the square of elevation 2, then cross to the finish at elevation 1. Leaving through the 3 would take until t = 3.",
    },
  ],
  constraints: [
    "grid is n x n in size, with 1 <= n <= 50",
    "every elevation sits in the range 0 <= grid[i][j] < n^2",
  ],
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
    // In the 2x2 case the answer equals both the grid maximum and the larger corner, so
    // `max(grid)`, `max(start, end)`, and a greedy walk that never backtracks all passed.
    // Here the answer (7) is below the grid maximum (8) and above both corners, and the
    // route that greedy takes first is walled off behind the 8.
    {
      input: {
        grid: [
          [0, 3, 4],
          [1, 5, 7],
          [2, 8, 6],
        ],
      },
      expected: 7,
      description: "Best route is neither the greedy descent nor the grid maximum",
    },
  ],
}
