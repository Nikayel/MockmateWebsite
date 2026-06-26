import type { DSAScenario } from "../../types"

export const keysAndRoomsScenario: DSAScenario = {
  id: "dsa-keys-and-rooms",
  title: "Keys and Rooms",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Check if all rooms can be visited starting from room 0",
  tags: ["graph", "dfs", "bfs"],
  estimatedTime: 20,
  problemStatement: `There are n rooms labeled 0 to n-1 and all rooms are locked except for room 0. Your goal is to visit all rooms. When you visit a room, you may find keys to other rooms.

Given rooms where rooms[i] is the set of keys in room i, return true if you can visit all rooms.`,
  examples: [
    { input: "rooms = [[1],[2],[3],[]]", output: "true", explanation: "Visit 0 -> 1 -> 2 -> 3" },
    {
      input: "rooms = [[1,3],[3,0,1],[2],[0]]",
      output: "false",
      explanation: "Can't enter room 2",
    },
  ],
  constraints: [
    "n == rooms.length",
    "2 <= n <= 1000",
    "0 <= rooms[i].length <= 1000",
    "1 <= sum(rooms[i].length) <= 3000",
  ],
  hints: [
    "DFS/BFS from room 0",
    "Keys are edges to other rooms",
    "Track visited rooms",
    "Check if visited count equals n",
  ],
  starterCode: {
    javascript: `function canVisitAllRooms(rooms) {\n  // DFS/BFS from room 0\n}`,
    typescript: `function canVisitAllRooms(rooms: number[][]): boolean {\n  // DFS/BFS from room 0\n}`,
    python: `def canVisitAllRooms(rooms: list[list[int]]) -> bool:\n    # DFS/BFS from room 0\n    pass`,
    java: `class Solution {\n    public boolean canVisitAllRooms(List<List<Integer>> rooms) {\n        // DFS/BFS from room 0\n        return false;\n    }\n}`,
  },
  optimalComplexity: { time: "O(n + k)", space: "O(n)" },
  testCases: [
    { input: { rooms: [[1], [2], [3], []] }, expected: true, description: "Linear key chain" },
    {
      input: { rooms: [[1, 3], [3, 0, 1], [2], [0]] },
      expected: false,
      description: "Room 2 unreachable",
    },
  ],
}
