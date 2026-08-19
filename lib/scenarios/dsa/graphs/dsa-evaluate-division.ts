import type { DSAScenario } from "../../types"

export const evaluateDivisionScenario: DSAScenario = {
  id: "dsa-evaluate-division",
  title: "Evaluate Division",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg", "Palantir"],
  roles: ["junior", "senior", "swe", "fdse"],
  description: "Compute division results from known variable ratios",
  tags: ["graph", "dfs", "union-find", "hash-table"],
  estimatedTime: 30,
  problemStatement: `You're handed a log of division results between named variables: for every index i, equations[i] = [A, B] together with values[i] states that A / B = values[i]. Variables are strings, and the facts you receive never contradict one another or force a division by zero.

Then queries arrives, where each queries[j] = [C, D] asks what C / D evaluates to. Work each answer out from the recorded facts, and report -1.0 for any query whose value cannot be determined, including when C or D never showed up in the equations at all. Return the answers as an array of doubles, in the order the queries were asked.`,
  examples: [
    {
      input:
        'equations = [["p","q"],["q","r"]], values = [4.0,2.0], queries = [["p","r"],["q","p"],["p","z"],["q","q"],["m","m"]]',
      output: "[8.00000,0.25000,-1.00000,1.00000,-1.00000]",
    },
    {
      input: 'equations = [["u","v"]], values = [0.2], queries = [["u","v"],["v","u"]]',
      output: "[0.20000,5.00000]",
    },
  ],
  constraints: [
    "equations.length falls between 1 and 20.",
    "You receive anywhere from 1 to 20 queries.",
    "Every variable is a lowercase string.",
  ],
  hints: [
    "Build weighted graph: a->b with weight k, b->a with weight 1/k",
    "For query [c, d]: find path from c to d, multiply weights",
    "DFS/BFS to find path",
    "Union-Find with weights is also possible",
  ],
  starterCode: {
    javascript: `function calcEquation(equations, values, queries) {\n  // Build graph and DFS for queries\n}`,
    typescript: `function calcEquation(equations: string[][], values: number[], queries: string[][]): number[] {\n  // Build graph and DFS for queries\n}`,
    python: `def calcEquation(equations: list[list[str]], values: list[float], queries: list[list[str]]) -> list[float]:\n    # Build graph and DFS for queries\n    pass`,
    java: `class Solution {\n    public double[] calcEquation(List<List<String>> equations, double[] values, List<List<String>> queries) {\n        // Build graph and DFS for queries\n        return new double[0];\n    }\n}`,
  },
  optimalComplexity: { time: "O(Q * (V + E))", space: "O(V + E)" },
  // The single original case only ever asked about variables in one connected component, so
  // a solution that returned 1.0 whenever its search ran out (instead of -1.0) passed. The
  // second case adds a disjoint component plus a self-query, the two contract corners.
  testCases: [
    {
      input: {
        equations: [
          ["a", "b"],
          ["b", "c"],
        ],
        values: [2.0, 3.0],
        queries: [
          ["a", "c"],
          ["b", "a"],
          ["a", "e"],
        ],
      },
      expected: [6.0, 0.5, -1.0],
      description: "Chain division",
    },
    {
      input: {
        equations: [
          ["a", "b"],
          ["x", "y"],
        ],
        values: [2.0, 4.0],
        queries: [
          ["a", "x"],
          ["a", "a"],
          ["z", "z"],
        ],
      },
      expected: [-1.0, 1.0, -1.0],
      description: "Disjoint components, self-query of a known and of an unknown variable",
    },
  ],
}
