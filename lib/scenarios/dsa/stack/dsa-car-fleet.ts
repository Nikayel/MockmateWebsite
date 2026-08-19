import type { DSAScenario } from "../../types"

export const dsaCarFleetScenario: DSAScenario = {
  id: "dsa-car-fleet",
  title: "Car Fleet",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Count the car fleets that form on the road to the target",
  tags: ["stack", "array", "sorting", "monotonic-stack"],
  estimatedTime: 25,
  problemStatement: `You're tracking n cars that all drive toward the same destination along a one-lane road, with the finish line target miles out. Two integer arrays of length n describe them: position[i] tells you where the ith car currently sits, and speed[i] gives its speed in miles per hour.

Overtaking is impossible on this road. When a faster car closes the gap to a slower car ahead, it tucks in bumper to bumper and adopts the slower car's speed from that moment on. Any non-empty group of cars traveling together at one position and one speed forms a single car fleet, and a car driving alone counts as a fleet too. A car that catches a fleet exactly at the destination joins it and counts as part of that same fleet.

Determine how many distinct fleets end up rolling across the destination.`,
  examples: [
    {
      input: "target = 15, position = [12,9,1,6,4], speed = [3,5,2,2,4]",
      output: "4",
      explanation:
        "The cars starting at 12 and 9 each reach the target alone. The car at 4 catches the slower car at 6, so those two arrive as one fleet. The car at 1 never catches anyone.",
    },
    { input: "target = 8, position = [2], speed = [4]", output: "1" },
    { input: "target = 50, position = [0,3,7], speed = [6,4,2]", output: "1" },
  ],
  constraints: [
    "position and speed share the same length n",
    "n stays between 1 and 10^5",
    "target is positive: 0 < target <= 10^6",
    "every car starts short of the goal: 0 <= position[i] < target",
    "every speed[i] is positive, with 0 < speed[i] <= 10^6",
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
