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
  problemStatement: `A conveyor belt has packages that must be shipped within days days. The ith package has a weight of weights[i]. Each day, we load packages in order of their weights (not reordering). We may not load more weight than the ship capacity.

Return the least weight capacity of the ship that will result in all packages being shipped within days days.`,
  examples: [
    {
      input: "weights = [1,2,3,4,5,6,7,8,9,10], days = 5",
      output: "15",
      explanation: "Ship 1-2, 3-4, 5-6, 7-8, 9-10 each day",
    },
    { input: "weights = [3,2,2,4,1,4], days = 3", output: "6" },
    { input: "weights = [1,2,3,1,1], days = 4", output: "3" },
  ],
  constraints: ["1 <= days <= weights.length <= 5 * 10^4", "1 <= weights[i] <= 500"],
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
