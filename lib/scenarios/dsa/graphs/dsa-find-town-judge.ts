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
  problemStatement: `In a town of n people labeled 1 to n, there is a rumor that one person is the town judge. If the town judge exists:
1. The town judge trusts nobody.
2. Everybody (except the judge) trusts the town judge.
3. There is exactly one person that satisfies properties 1 and 2.

Given trust where trust[i] = [a, b] means a trusts b, return the town judge's label, or -1 if not found.`,
  examples: [
    { input: "n = 2, trust = [[1,2]]", output: "2" },
    { input: "n = 3, trust = [[1,3],[2,3]]", output: "3" },
    {
      input: "n = 3, trust = [[1,3],[2,3],[3,1]]",
      output: "-1",
      explanation: "3 trusts someone",
    },
  ],
  constraints: [
    "1 <= n <= 1000",
    "0 <= trust.length <= 10^4",
    "trust[i].length == 2",
    "All pairs are unique",
    "a != b",
  ],
  hints: [
    "Count in-degree and out-degree for each person",
    "Judge has in-degree n-1 and out-degree 0",
    "Or use single count: +1 for incoming trust, -1 for outgoing",
    "Find person with count == n-1",
  ],
  starterCode: {
    javascript: `function findJudge(n, trust) {\n  // Count trust relationships\n}`,
    typescript: `function findJudge(n: number, trust: number[][]): number {\n  // Count trust relationships\n}`,
    python: `def findJudge(n: int, trust: list[list[int]]) -> int:\n    # Count trust relationships\n    pass`,
    java: `class Solution {\n    public int findJudge(int n, int[][] trust) {\n        // Count trust relationships\n        return -1;\n    }\n}`,
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
