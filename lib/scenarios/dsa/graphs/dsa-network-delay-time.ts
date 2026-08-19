import type { DSAScenario } from "../../types"

export const networkDelayTimeScenario: DSAScenario = {
  id: "dsa-network-delay-time",
  title: "Network Delay Time",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Find the minimum time for a signal to reach every node in the network",
  tags: ["graph", "shortest-path", "dijkstra", "heap"],
  estimatedTime: 30,
  problemStatement: `You've mapped a network of n nodes, numbered 1 through n. The array times records its one-way links: times[i] = [ui, vi, wi] means a signal leaving node ui reaches node vi exactly wi time units later.

At time 0, node k fires off a signal, and it spreads along every link it can use. Return the earliest moment by which all n nodes have heard it. If even one node can never receive the signal, return -1.`,
  examples: [
    { input: "times = [[3,1,2],[3,4,4],[1,2,3]], n = 4, k = 3", output: "5" },
    { input: "times = [[2,3,5]], n = 3, k = 3", output: "-1" },
  ],
  constraints: [
    "k names a real node: 1 <= k <= n <= 100",
    "the link list is bounded by 1 <= times.length <= 6000",
  ],
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
