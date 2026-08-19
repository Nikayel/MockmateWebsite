import type { DSAScenario } from "../../types"

export const openTheLockScenario: DSAScenario = {
  id: "dsa-open-the-lock",
  title: "Open the Lock",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Find the fewest wheel turns that reach a lock's target code while dodging deadends",
  tags: ["string", "hash-table", "bfs"],
  estimatedTime: 25,
  problemStatement: `You're holding a combination padlock with 4 rotating wheels, each showing one digit from 0 to 9. Wheels turn in either direction and wrap around: one click forward from 9 shows 0, and one click back from 0 shows 9. A single move rotates exactly one wheel by one click, and the display starts out reading "0000".

The list deadends names poisoned combinations. The instant the wheels show any one of them, the mechanism seizes and nothing can turn again. Return the fewest moves that take the display from "0000" to target without ever landing on a deadend, or -1 if no sequence of turns can do it.`,
  examples: [
    { input: 'deadends = ["0012","0021","0011"], target = "0022"', output: "6" },
    { input: 'deadends = ["7777"], target = "9000"', output: "1" },
    {
      input: 'deadends = ["0000"], target = "6543"',
      output: "-1",
      explanation: "The lock seizes on its starting display before any turn is made",
    },
  ],
  constraints: [
    "deadends.length falls between 1 and 500",
    "each code in deadends is exactly 4 digits",
    "target is likewise a 4 digit string",
    "target itself never appears in deadends",
  ],
  hints: [
    "BFS from '0000' to target",
    "Each state has 8 neighbors (4 wheels x 2 directions)",
    "Use set for deadends and visited",
    "Handle edge case: '0000' in deadends",
  ],
  starterCode: {
    javascript: `function openLock(deadends, target) {\n  // Write your solution here\n}`,
    typescript: `function openLock(deadends: string[], target: string): number {\n  // Write your solution here\n}`,
    python: `def openLock(deadends: list[str], target: str) -> int:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public int openLock(String[] deadends, String target) {\n        // Write your solution here\n        return -1;\n    }\n}`,
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
