import type { DSAScenario } from "../../types"

export const networkDelayTimeScenario: DSAScenario = {
  id: "dsa-network-delay-time",
  title: "Network Delay Time",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Find minimum time for signal to reach all nodes using Dijkstra",
  tags: ["graph", "dijkstra", "heap", "shortest-path"],
  estimatedTime: 30,
  problemStatement: `You are given a network of n nodes with travel times. Return the minimum time for all nodes to receive a signal from node k, or -1 if impossible.`,
  examples: [
    { input: "times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2", output: "2" },
    { input: "times = [[1,2,1]], n = 2, k = 2", output: "-1" },
  ],
  constraints: ["1 <= k <= n <= 100", "1 <= times.length <= 6000"],
  hints: ["Use Dijkstra's algorithm with min-heap", "Return max of all minimum distances"],
  starterCode: {
    javascript: `function networkDelayTime(times, n, k) {\n  // Write your solution here\n\n}`,
    typescript: `function networkDelayTime(times: number[][], n: number, k: number): number {\n  // Write your solution here\n\n}`,
    python: `def networkDelayTime(times, n, k):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(E log V)", space: "O(V + E)" },
  testCases: [
    {
      input: {
        times: [
          [2, 1, 1],
          [2, 3, 1],
          [3, 4, 1],
        ],
        n: 4,
        k: 2,
      },
      expected: 2,
      description: "All reachable",
    },
    { input: { times: [[1, 2, 1]], n: 2, k: 2 }, expected: -1, description: "Unreachable" },
    // Every edge above weighs 1 and no node has two routes into it, so a BFS that counted
    // hops and ignored the weights passed, as did a DFS that kept the first route it found
    // without relaxing. Here the two-hop route into node 3 is cheaper than the direct one.
    {
      input: {
        times: [
          [1, 2, 1],
          [1, 3, 4],
          [2, 3, 1],
        ],
        n: 3,
        k: 1,
      },
      expected: 2,
      description: "Cheaper two-hop route must beat the direct edge",
    },
  ],
}
