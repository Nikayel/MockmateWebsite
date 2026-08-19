import type { DSAScenario } from "../../types"

export const findTownJudgeScenario: DSAScenario = {
  id: "dsa-find-town-judge",
  title: "Find the Town Judge",
  type: "dsa",
  pattern: "graphs",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Microsoft"],
  description: "Find person trusted by everyone but trusts no one",
  tags: ["graph", "array", "hash-table"],
  estimatedTime: 15,
  problemStatement: `You've moved to a town whose n residents are labeled 1 to n, and rumor has it that one of them quietly serves as the town judge. For the judge to be real, two things must both hold: the judge trusts no one at all, while every one of the other n - 1 residents trusts the judge. Whenever the judge exists, exactly one resident fits both conditions.

Your evidence is the array trust, where trust[i] = [a, b] records that person a trusts person b. Return the label of the judge, or -1 when nobody qualifies.`,
  examples: [
    { input: "n = 2, trust = [[2,1]]", output: "1" },
    { input: "n = 4, trust = [[1,2],[3,2],[4,2]]", output: "2" },
    {
      input: "n = 4, trust = [[1,2],[3,2],[4,2],[2,4]]",
      output: "-1",
      explanation: "Resident 2 is trusted by everyone else but also trusts resident 4",
    },
  ],
  constraints: [
    "n falls between 1 and 1000.",
    "trust may hold as few as 0 and as many as 10^4 pairs.",
    "Every trust entry lists exactly 2 people.",
    "No trust pair repeats.",
    "People never trust themselves (a != b).",
  ],
  hints: [
    "Count in-degree and out-degree for each person",
    "Judge has in-degree n-1 and out-degree 0",
    "Or use single count: +1 for incoming trust, -1 for outgoing",
    "Find person with count == n-1",
  ],
  starterCode: {
    javascript: `function findJudge(n, trust) {\n  // Write your solution here\n}`,
    typescript: `function findJudge(n: number, trust: number[][]): number {\n  // Write your solution here\n}`,
    python: `def findJudge(n: int, trust: list[list[int]]) -> int:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public int findJudge(int n, int[][] trust) {\n        // Write your solution here\n        return -1;\n    }\n}`,
  },
  optimalComplexity: { time: "O(n + t)", space: "O(n)" },
  testCases: [
    { input: { n: 2, trust: [[1, 2]] }, expected: 2, description: "Two people" },
    {
      input: {
        n: 3,
        trust: [
          [1, 3],
          [2, 3],
        ],
      },
      expected: 3,
      description: "Three people",
    },
    {
      input: {
        n: 3,
        trust: [
          [1, 3],
          [2, 3],
          [3, 1],
        ],
      },
      expected: -1,
      description: "No judge",
    },
  ],
}
