import type { DSAScenario } from "../../types"

export const dsaDailyTemperaturesScenario: DSAScenario = {
  id: "dsa-daily-temperatures",
  title: "Daily Temperatures",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "TikTok"],
  description: "Find days until warmer temperature using monotonic stack",
  tags: ["stack", "monotonic-stack", "array"],
  estimatedTime: 25,
  problemStatement: `Given an array of integers temperatures represents the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature. If there is no future day for which this is possible, keep answer[i] == 0 instead.`,
  examples: [
    {
      input: "temperatures = [73,74,75,71,69,72,76,73]",
      output: "[1,1,4,2,1,1,0,0]",
      explanation: "For day 0 (73°), the next warmer is day 1 (74°), so answer[0] = 1.",
    },
    {
      input: "temperatures = [30,40,50,60]",
      output: "[1,1,1,0]",
    },
    {
      input: "temperatures = [30,60,90]",
      output: "[1,1,0]",
    },
  ],
  constraints: ["1 <= temperatures.length <= 10^5", "30 <= temperatures[i] <= 100"],
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
