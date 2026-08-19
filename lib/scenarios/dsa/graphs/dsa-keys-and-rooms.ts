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
  problemStatement: `You're standing inside room 0 of a building with n rooms numbered 0 to n - 1. Every other room is locked, and the keys are scattered around the building: rooms[i] lists the labels of the keys lying in room i, where a key labeled j opens room j.

Nothing restricts your movement except the locks themselves. You can revisit rooms as often as you like, and every key stays with you once picked up. Return true if you can eventually walk into every room, and false if at least one room stays sealed no matter what you do.`,
  examples: [
    {
      input: "rooms = [[4],[2],[],[1],[3]]",
      output: "true",
      explanation: "Room 0 holds the key to room 4, which holds the key to room 3, then 1, then 2",
    },
    {
      input: "rooms = [[3,1],[0,3],[2],[1]]",
      output: "false",
      explanation: "The only key to room 2 sits inside room 2 itself",
    },
  ],
  constraints: [
    "rooms.length equals n.",
    "Room count n sits between 2 and 1000.",
    "One room can carry anywhere from 0 to 1000 keys.",
    "The total key count across rooms falls between 1 and 3000.",
  ],
  hints: [
    "DFS/BFS from room 0",
    "Keys are edges to other rooms",
    "Track visited rooms",
    "Check if visited count equals n",
  ],
  starterCode: {
    javascript: `function canVisitAllRooms(rooms) {\n  // Write your solution here\n}`,
    typescript: `function canVisitAllRooms(rooms: number[][]): boolean {\n  // Write your solution here\n}`,
    python: `def canVisitAllRooms(rooms: list[list[int]]) -> bool:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public boolean canVisitAllRooms(List<List<Integer>> rooms) {\n        // Write your solution here\n        return false;\n    }\n}`,
  },
  optimalComplexity: { time: "O(n + k)", space: "O(n)" },
  testCases: [
    { input: { rooms: [[1], [2], [3], []] }, expected: true, description: "Linear key chain" },
    {
      input: { rooms: [[1, 3], [3, 0, 1], [2], [0]] },
      expected: false,
      description: "Room 2 unreachable",
    },
    // Both cases above are decided by walking the rooms in index order, so a solution that
    // scanned 0, 1, 2, ... and assumed each room was already unlocked passed. Here room 1
    // is only reachable via room 2, so index order visits it before holding its key.
    {
      input: { rooms: [[2, 3], [], [1], []] },
      expected: true,
      description: "Keys arrive out of index order",
    },
  ],
}
