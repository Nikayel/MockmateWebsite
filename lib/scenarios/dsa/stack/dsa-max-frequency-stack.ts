import type { DSAScenario } from "../../types"

export const dsaMaxFrequencyStackScenario: DSAScenario = {
  id: "dsa-max-frequency-stack",
  title: "Maximum Frequency Stack",
  type: "dsa",
  pattern: "stack",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg"],
  description: "Build a stack variant whose pop returns the most frequent value",
  tags: ["stack", "hash-table", "design"],
  estimatedTime: 35,
  problemStatement: `Build a container that behaves like a stack except in how it pops: pop always surrenders whichever value currently appears most often inside the structure.

Implement the FreqStack class:
- FreqStack() starts the structure empty.
- void push(int val) adds the integer val to it.
- int pop() removes and returns the most frequent value. If several values tie for the highest count, the tied value nearest the top (the one pushed latest among them) is the one removed and returned.`,
  examples: [
    {
      input:
        '["FreqStack", "push", "push", "push", "push", "push", "push", "pop", "pop", "pop", "pop"]\n[[], [3], [9], [3], [9], [6], [3], [], [], [], []]',
      output: "[null, null, null, null, null, null, null, 3, 9, 3, 6]",
      explanation:
        "After the six pushes the counts stand at 3 three times, 9 twice, 6 once. The pops hand back 3 (top count), then 9 (tied with 3 at two but nearer the top), then 3, then 6.",
    },
  ],
  constraints: [
    "val can be any integer from 0 through 10^9",
    "push and pop together receive at most 2 * 10^4 calls",
  ],
  hints: [
    "Track frequency of each element in a hashmap",
    "For each frequency level, maintain a stack of elements",
    "Track maxFrequency to know which stack to pop from",
    "On pop: pop from stack at maxFreq, decrement freq, update maxFreq if needed",
  ],
  starterCode: {
    javascript: `class FreqStack {\n  constructor() {\n    // Write your solution here\n  }\n\n  push(val) {\n    // Write your solution here\n  }\n\n  pop() {\n    // Write your solution here\n  }\n}`,
    typescript: `class FreqStack {\n  constructor() {\n    // Write your solution here\n  }\n\n  push(val: number): void {\n    // Write your solution here\n  }\n\n  pop(): number {\n    // Write your solution here\n  }\n}`,
    python: `class FreqStack:\n    def __init__(self):\n        # Write your solution here\n        pass\n\n    def push(self, val: int) -> None:\n        # Write your solution here\n        pass\n\n    def pop(self) -> int:\n        # Write your solution here\n        pass`,
    java: `class FreqStack {\n    public FreqStack() {\n        // Write your solution here\n    }\n\n    public void push(int val) {\n        // Write your solution here\n    }\n\n    public int pop() {\n        // Write your solution here\n        return 0;\n    }\n}`,
  },
  optimalComplexity: { time: "O(1) per operation", space: "O(n)" },
  testCases: [
    {
      input: { ops: ["FreqStack", "push", "push", "push", "pop"], args: [[], [5], [7], [5], []] },
      expected: [null, null, null, null, 5],
      description: "Pop most frequent",
    },
    // One push-push-push-pop was not enough to pin anything down: a plain LIFO stack, a
    // version that breaks frequency ties by taking the OLDEST value, and one that just
    // tracks overall counts all produced the same single answer. This sequence pops four
    // times, and the second pop is decided purely by the tie-break rule (5 and 7 are both
    // at frequency 2, and 7 was pushed more recently).
    {
      input: {
        ops: [
          "FreqStack",
          "push",
          "push",
          "push",
          "push",
          "push",
          "push",
          "pop",
          "pop",
          "pop",
          "pop",
        ],
        args: [[], [5], [7], [5], [7], [4], [5], [], [], [], []],
      },
      expected: [null, null, null, null, null, null, null, 5, 7, 5, 4],
      description: "Ties break toward the most recently pushed value",
    },
  ],
}
