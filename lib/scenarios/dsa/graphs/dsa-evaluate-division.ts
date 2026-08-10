import type { DSAScenario } from "../../types"

export const evaluateDivisionScenario: DSAScenario = {
  id: "dsa-evaluate-division",
  title: "Evaluate Division",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg", "Palantir"],
  roles: ["junior", "senior", "swe", "fdse"],
  description: "Evaluate division queries using graph DFS",
  tags: ["graph", "dfs", "union-find", "hash-table"],
  estimatedTime: 30,
  problemStatement: `Given equations like a/b = k and queries [c, d], return the result of c/d if calculable, or -1.0 if not.`,
  examples: [
    {
      input:
        'equations = [["a","b"],["b","c"]], values = [2.0,3.0], queries = [["a","c"],["b","a"],["a","e"],["a","a"],["x","x"]]',
      output: "[6.00000,0.50000,-1.00000,1.00000,-1.00000]",
    },
    {
      input: 'equations = [["a","b"]], values = [0.5], queries = [["a","b"],["b","a"]]',
      output: "[0.50000,2.00000]",
    },
  ],
  constraints: [
    "1 <= equations.length <= 20",
    "1 <= queries.length <= 20",
    "Variables are lowercase strings",
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
