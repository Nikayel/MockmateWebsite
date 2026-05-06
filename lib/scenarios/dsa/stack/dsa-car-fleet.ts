import type { DSAScenario } from "../../types"

export const dsaCarFleetScenario: DSAScenario = {
  id: "dsa-car-fleet",
  title: "Car Fleet",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Calculate number of car fleets that arrive at destination",
  tags: ["stack", "array", "sorting", "monotonic-stack"],
  estimatedTime: 25,
  problemStatement: `There are n cars going to the same destination along a one-lane road. The destination is target miles away.

You are given two integer arrays position and speed, both of length n, where position[i] is the position of the ith car and speed[i] is the speed of the ith car (in miles per hour).

A car can never pass another car ahead of it, but it can catch up to it and drive bumper to bumper at the same speed. The faster car will slow down to match the slower car's speed. A car fleet is some non-empty set of cars driving at the same position and same speed.

Return the number of car fleets that will arrive at the destination.`,
  examples: [
    {
      input: "target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]",
      output: "3",
      explanation:
        "Car at 10 forms fleet 1. Cars at 8,5,3 catch up to car at 10 forming fleet 2. Car at 0 is fleet 3.",
    },
    { input: "target = 10, position = [3], speed = [3]", output: "1" },
    { input: "target = 100, position = [0,2,4], speed = [4,2,1]", output: "1" },
  ],
  constraints: [
    "n == position.length == speed.length",
    "1 <= n <= 10^5",
    "0 < target <= 10^6",
    "0 <= position[i] < target",
    "0 < speed[i] <= 10^6",
  ],
  hints: [
    "Sort cars by position in decreasing order (closest to target first)",
    "Calculate time to reach target for each car",
    "If car behind reaches earlier, it merges with car ahead",
    "Use monotonic stack: count how many distinct 'slowest times' we see",
  ],
  starterCode: {
    javascript: `function carFleet(target, position, speed) {\n  // Write your solution here\n\n}`,
    typescript: `function carFleet(target: number, position: number[], speed: number[]): number {\n  // Write your solution here\n\n}`,
    python: `def carFleet(target, position, speed):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n log n)", space: "O(n)" },
  testCases: [
    {
      input: { target: 12, position: [10, 8, 0, 5, 3], speed: [2, 4, 1, 1, 3] },
      expected: 3,
      description: "Multiple fleets",
    },
    { input: { target: 10, position: [3], speed: [3] }, expected: 1, description: "Single car" },
    {
      input: { target: 100, position: [0, 2, 4], speed: [4, 2, 1] },
      expected: 1,
      description: "All merge",
    },
  ],
}
