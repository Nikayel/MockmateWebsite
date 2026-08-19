import type { DSAScenario } from "../../types"

export const dsaCapacityShipPackagesScenario: DSAScenario = {
  id: "dsa-capacity-ship-packages",
  title: "Capacity To Ship Packages Within D Days",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Find minimum ship capacity to ship all packages within D days",
  tags: ["binary-search", "array"],
  estimatedTime: 25,
  problemStatement: `A line of packages is waiting at a dock, and package i weighs weights[i]. You have days days to ship all of them. Each day you load packages from the front of the line, keeping their original order, and the total weight loaded on any single day can't exceed the ship's capacity.

Work out the smallest capacity that still gets every package shipped within days days, and return it.`,
  examples: [
    {
      input: "weights = [2,4,6,8,10,12], days = 3",
      output: "18",
      explanation: "Day 1: 2+4+6. Day 2: 8+10. Day 3: 12. No capacity under 18 finishes in 3 days",
    },
    { input: "weights = [5,1,6,2,7,3], days = 3", output: "10" },
    { input: "weights = [2,1,1,2], days = 3", output: "2" },
  ],
  constraints: [
    "days is at least 1 and never more than weights.length, which itself tops out at 5 * 10^4",
    "Each individual package weighs between 1 and 500",
  ],
  hints: [
    "Binary search on ship capacity",
    "Min capacity = max(weights), max capacity = sum(weights)",
    "For each capacity, simulate shipping and count days needed",
  ],
  starterCode: {
    javascript: `function shipWithinDays(weights, days) {\n  // Write your solution here\n\n}`,
    typescript: `function shipWithinDays(weights: number[], days: number): number {\n  // Write your solution here\n\n}`,
    python: `def shipWithinDays(weights, days):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n * log(sum))", space: "O(1)" },
  testCases: [
    {
      input: { weights: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], days: 5 },
      expected: 15,
      description: "Standard case",
    },
    {
      input: { weights: [3, 2, 2, 4, 1, 4], days: 3 },
      expected: 6,
      description: "Uneven weights",
    },
    { input: { weights: [1, 2, 3, 1, 1], days: 4 }, expected: 3, description: "Light packages" },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why must the minimum capacity be max(weights)?",
    "How is this similar to Koko Eating Bananas?",
    "Why can't packages be reordered?",
    "What pattern does this problem follow?",
  ],

  midCodingProbes: [
    {
      trigger: "defining search space",
      question: "What's the smallest possible ship capacity? What's the largest?",
    },
    {
      trigger: "simulating days",
      question: "For a given capacity, how do you calculate the number of days needed?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Starting minimum capacity at 1",
      codeSignals: ["left = 1", "start at 1"],
      intervention:
        "If the heaviest package weighs 10, can a ship with capacity 5 ever ship it? What should your minimum capacity be?",
    },
  ],
}
