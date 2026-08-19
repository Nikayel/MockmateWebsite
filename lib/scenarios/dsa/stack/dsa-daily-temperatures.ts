import type { DSAScenario } from "../../types"

export const dsaDailyTemperaturesScenario: DSAScenario = {
  id: "dsa-daily-temperatures",
  title: "Daily Temperatures",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "TikTok"],
  description: "For each day, count the wait until a warmer temperature",
  tags: ["stack", "monotonic-stack", "array"],
  estimatedTime: 25,
  problemStatement: `You're given an integer array temperatures, one reading per day. For each day, work out how many days forward you'd have to jump to land on a day with a strictly higher reading.

Fill an array answer of the same length, where answer[i] is that jump count for day i. A day that never sees a higher reading afterward keeps answer[i] at 0.`,
  examples: [
    {
      input: "temperatures = [68,72,70,65,71,74,66,66]",
      output: "[1,4,2,1,1,0,0,0]",
      explanation:
        "Day 0 reads 68 and the very next day hits 72, so answer[0] = 1. Day 1's 72 stands until the 74 four days later.",
    },
    {
      input: "temperatures = [55,61,67,73]",
      output: "[1,1,1,0]",
    },
    {
      input: "temperatures = [42,58,77]",
      output: "[1,1,0]",
    },
  ],
  constraints: [
    "temperatures holds between 1 and 10^5 readings",
    "every reading sits in the band 30 through 100",
  ],
  hints: [
    "Use a monotonic decreasing stack to track indices",
    "When you find a warmer temperature, pop from stack and calculate days",
    "Stack stores indices, not temperatures",
  ],
  starterCode: {
    javascript: `function dailyTemperatures(temperatures) {
  // Write your solution here

}`,
    typescript: `function dailyTemperatures(temperatures: number[]): number[] {
  // Write your solution here

}`,
    python: `def daily_temperatures(temperatures):
    # Write your solution here
    pass`,
    java: `class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        // Write your solution here
        return new int[0];
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { temperatures: [73, 74, 75, 71, 69, 72, 76, 73] },
      expected: [1, 1, 4, 2, 1, 1, 0, 0],
      description: "Standard case",
    },
    {
      input: { temperatures: [30, 40, 50, 60] },
      expected: [1, 1, 1, 0],
      description: "Increasing temperatures",
    },
    {
      input: { temperatures: [30, 60, 90] },
      expected: [1, 1, 0],
      description: "Simple increasing",
    },
    // Edge cases
    { input: { temperatures: [50] }, expected: [0], description: "Edge: Single element" },
    {
      input: { temperatures: [100, 90, 80, 70, 60] },
      expected: [0, 0, 0, 0, 0],
      description: "Edge: All decreasing (no warmer day)",
    },
    {
      input: { temperatures: [50, 50, 50, 50] },
      expected: [0, 0, 0, 0],
      description: "Edge: All identical temperatures",
    },
  ],
}
