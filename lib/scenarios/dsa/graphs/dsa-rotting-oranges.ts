import type { DSAScenario } from "../../types"

export const rottingOrangesScenario: DSAScenario = {
  id: "dsa-rotting-oranges",
  title: "Rotting Oranges",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Microsoft", "Google", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Measure how many minutes rot takes to spread through every fresh orange on a tray",
  tags: ["array", "matrix", "bfs"],
  estimatedTime: 25,
  problemStatement: `You're watching over a tray of oranges arranged as an m x n grid named grid. A cell reads 2 when its orange has already rotted, 1 when the orange is still fresh, and 0 when the slot holds nothing.

The rot spreads on a clock: during each minute, every fresh orange sitting directly above, below, left, or right of a rotten one turns rotten as well. Figure out how many whole minutes pass before no fresh orange remains anywhere on the tray, and return that count. If some fresh orange is placed where the rot can never touch it, return -1 instead.

Watch one tray decay, minute by minute:

\`\`\`
 t=0          t=1          t=2          t=3          t=4
┌───┬───┬───┐┌───┬───┬───┐┌───┬───┬───┐┌───┬───┬───┐┌───┬───┬───┐
│ 1 │ 1 │ 2 ││ 1 │ 2 │ 2 ││ 2 │ 2 │ 2 ││ 2 │ 2 │ 2 ││ 2 │ 2 │ 2 │
├───┼───┼───┤├───┼───┼───┤├───┼───┼───┤├───┼───┼───┤├───┼───┼───┤
│ 0 │ 1 │ 0 ││ 0 │ 1 │ 0 ││ 0 │ 2 │ 0 ││ 0 │ 2 │ 0 ││ 0 │ 2 │ 0 │
├───┼───┼───┤├───┼───┼───┤├───┼───┼───┤├───┼───┼───┤├───┼───┼───┤
│ 1 │ 1 │ 1 ││ 1 │ 1 │ 1 ││ 1 │ 1 │ 1 ││ 1 │ 2 │ 1 ││ 2 │ 2 │ 2 │
└───┴───┴───┘└───┴───┴───┘└───┴───┴───┘└───┴───┴───┘└───┴───┴───┘
\`\`\`

Rot claims the final two oranges at t = 4, so this tray answers 4.`,
  examples: [
    { input: "grid = [[1,1,2],[0,1,0],[1,1,1]]", output: "4" },
    {
      input: "grid = [[2,1,0],[1,1,0],[0,0,1]]",
      output: "-1",
      explanation: "The orange in the bottom right corner sits alone and can never rot.",
    },
    {
      input: "grid = [[2,0,2]]",
      output: "0",
      explanation: "Nothing on the tray is fresh, so zero minutes pass.",
    },
  ],
  constraints: [
    "grid spans m rows and n columns, with 1 <= m, n <= 10",
    "each cell of grid contains 0, 1, or 2",
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
}
