import type { DSAScenario } from "../../types"

export const openTheLockScenario: DSAScenario = {
  id: "dsa-open-the-lock",
  title: "Open the Lock",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Find minimum turns to unlock combination lock using BFS",
  tags: ["bfs", "string", "hash-table"],
  estimatedTime: 25,
  problemStatement: `You have a lock with 4 circular wheels, each with digits 0-9. The lock starts at "0000". Each move turns one wheel one slot (9 wraps to 0, 0 wraps to 9). Some combinations are deadends that lock permanently. Return minimum turns to reach target, or -1 if impossible.`,
  examples: [
    { input: 'deadends = ["0201","0101","0102","1212","2002"], target = "0202"', output: "6" },
    { input: 'deadends = ["8888"], target = "0009"', output: "1" },
    {
      input: 'deadends = ["0000"], target = "8888"',
      output: "-1",
      explanation: "Cannot move from starting position",
    },
  ],
  constraints: [
    "1 <= deadends.length <= 500",
    "deadends[i].length == 4",
    "target.length == 4",
    "target will not be in deadends",
  ],
  hints: [
    "BFS from '0000' to target",
    "Each state has 8 neighbors (4 wheels x 2 directions)",
    "Use set for deadends and visited",
    "Handle edge case: '0000' in deadends",
  ],
  starterCode: {
    javascript: `function openLock(deadends, target) {\n  // BFS through state space\n}`,
    typescript: `function openLock(deadends: string[], target: string): number {\n  // BFS through state space\n}`,
    python: `def openLock(deadends: list[str], target: str) -> int:\n    # BFS through state space\n    pass`,
    java: `class Solution {\n    public int openLock(String[] deadends, String target) {\n        // BFS through state space\n        return -1;\n    }\n}`,
  },
  optimalComplexity: { time: "O(10^4 * 4)", space: "O(10^4)" },
  testCases: [
    {
      input: { deadends: ["0201", "0101", "0102", "1212", "2002"], target: "0202" },
      expected: 6,
      description: "Avoid deadends",
    },
    { input: { deadends: ["8888"], target: "0009" }, expected: 1, description: "One turn" },
    { input: { deadends: ["0000"], target: "8888" }, expected: -1, description: "Start is dead" },
  ],
}
