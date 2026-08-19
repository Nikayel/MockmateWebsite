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
  problemStatement: `You're given an array people, where people[i] is how much the ith person weighs, and an integer limit. Boats come in unlimited supply, and every boat shares one capacity, limit. A single boat can ferry at most two riders at once, and only while their combined weight stays within limit.

Return the fewest boats needed to carry everyone across.`,
  examples: [
    { input: "people = [2,3], limit = 5", output: "1", explanation: "1 boat (2, 3)" },
    {
      input: "people = [6,2,3,5], limit = 7",
      output: "3",
      explanation: "3 boats: (2, 5), (3), (6)",
    },
    { input: "people = [6,8,7,5], limit = 8", output: "4" },
  ],
  constraints: [
    "people holds between 1 and 5 * 10^4 entries",
    "every weight satisfies 1 <= people[i] <= limit, and limit is at most 3 * 10^4",
  ],
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
