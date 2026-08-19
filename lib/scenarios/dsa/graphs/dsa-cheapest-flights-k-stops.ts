import type { DSAScenario } from "../../types"

export const cheapestFlightsKStopsScenario: DSAScenario = {
  id: "dsa-cheapest-flights-k-stops",
  title: "Cheapest Flights Within K Stops",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Airbnb", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Find cheapest flight with at most k stops",
  tags: ["graph", "bfs", "dynamic-programming", "shortest-path"],
  estimatedTime: 30,
  problemStatement: `You're comparing airfares across a network of n cities, numbered 0 to n - 1. Every listing in flights is a one-way route: flights[i] = [from, to, price] means a plane departs city from, lands in city to, and charges price for the seat. A route in one direction implies nothing about the reverse direction.

Starting from src, you want to arrive at dst while making no more than k stops, where a stop is an intermediate city you pass through on the way, so the trip uses at most k + 1 flights. Return the cheapest total fare that respects the stop limit, or -1 when dst cannot be reached within it.`,
  examples: [
    {
      input:
        "n = 5, flights = [[0,1,80],[1,4,90],[0,2,50],[2,3,60],[3,4,50]], src = 0, dst = 4, k = 1",
      output: "170",
    },
    {
      input: "n = 3, flights = [[0,1,120],[1,2,130],[0,2,650]], src = 0, dst = 2, k = 0",
      output: "650",
    },
  ],
  constraints: [
    "The city count n sits between 1 and 100.",
    "flights.length ranges from 0 up to n*(n-1)/2.",
  ],
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
    // Both original cases had a reachable destination, so a solution with no -1 handling
    // (returning 0 or garbage when no route exists) passed 2/2. These pin the -1 contract.
    {
      input: { n: 3, flights: [[0, 1, 100]], src: 0, dst: 2, k: 1 },
      expected: -1,
      description: "Destination unreachable: no route at any price",
    },
    {
      input: {
        n: 4,
        flights: [
          [0, 1, 100],
          [1, 2, 100],
          [2, 3, 100],
        ],
        src: 0,
        dst: 3,
        k: 0,
      },
      expected: -1,
      description: "Route exists but needs more stops than k allows",
    },
  ],
}
