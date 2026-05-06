import type { DSAScenario } from "../../types"

export const dsaBoatsSavePeopleScenario: DSAScenario = {
  id: "dsa-boats-save-people",
  title: "Boats to Save People",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Find minimum boats to carry all people with weight limit",
  tags: ["array", "two-pointers", "greedy", "sorting"],
  estimatedTime: 20,
  problemStatement: `You are given an array people where people[i] is the weight of the ith person, and an infinite number of boats where each boat can carry a maximum weight of limit. Each boat carries at most two people at the same time, provided the sum of the weight of those people is at most limit.

Return the minimum number of boats to carry every given person.`,
  examples: [
    { input: "people = [1,2], limit = 3", output: "1", explanation: "1 boat (1, 2)" },
    {
      input: "people = [3,2,2,1], limit = 3",
      output: "3",
      explanation: "3 boats: (1, 2), (2), (3)",
    },
    { input: "people = [3,5,3,4], limit = 5", output: "4" },
  ],
  constraints: ["1 <= people.length <= 5 * 10^4", "1 <= people[i] <= limit <= 3 * 10^4"],
  hints: [
    "Sort people by weight",
    "Use two pointers: lightest and heaviest person",
    "If both can fit, pair them; otherwise heaviest goes alone",
  ],
  starterCode: {
    javascript: `function numRescueBoats(people, limit) {\n  // Write your solution here\n\n}`,
    typescript: `function numRescueBoats(people: number[], limit: number): number {\n  // Write your solution here\n\n}`,
    python: `def numRescueBoats(people, limit):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n log n)", space: "O(1)" },
  testCases: [
    { input: { people: [1, 2], limit: 3 }, expected: 1, description: "Both fit in one boat" },
    {
      input: { people: [3, 2, 2, 1], limit: 3 },
      expected: 3,
      description: "Some pairing possible",
    },
    {
      input: { people: [3, 5, 3, 4], limit: 5 },
      expected: 4,
      description: "No pairing possible",
    },
  ],
}
