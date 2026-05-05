import type { DSAScenario } from "../../types"

export const cheapestFlightsKStopsScenario: DSAScenario = {
  id: "dsa-cheapest-flights-k-stops",
  title: "Cheapest Flights Within K Stops",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Airbnb"],
  description: "Find cheapest flight with at most k stops",
  tags: ["graph", "bfs", "dynamic-programming", "shortest-path"],
  estimatedTime: 30,
  problemStatement: `Find the cheapest price from src to dst with at most k stops. Return -1 if no such route exists.`,
  examples: [
    {
      input:
        "n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1",
      output: "700",
    },
    {
      input: "n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 0",
      output: "500",
    },
  ],
  constraints: ["1 <= n <= 100", "0 <= flights.length <= n*(n-1)/2"],
  hints: ["BFS with (node, cost, stops)", "Bellman-Ford with k+1 iterations"],
  starterCode: {
    javascript: `function findCheapestPrice(n, flights, src, dst, k) {\n  // Write your solution here\n\n}`,
    typescript: `function findCheapestPrice(n: number, flights: number[][], src: number, dst: number, k: number): number {\n  // Write your solution here\n\n}`,
    python: `def findCheapestPrice(n, flights, src, dst, k):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(E * K)", space: "O(V)" },
  testCases: [
    {
      input: {
        n: 4,
        flights: [
          [0, 1, 100],
          [1, 2, 100],
          [2, 0, 100],
          [1, 3, 600],
          [2, 3, 200],
        ],
        src: 0,
        dst: 3,
        k: 1,
      },
      expected: 700,
      description: "Limited stops",
    },
    {
      input: {
        n: 3,
        flights: [
          [0, 1, 100],
          [1, 2, 100],
          [0, 2, 500],
        ],
        src: 0,
        dst: 2,
        k: 0,
      },
      expected: 500,
      description: "Direct only",
    },
  ],
}
