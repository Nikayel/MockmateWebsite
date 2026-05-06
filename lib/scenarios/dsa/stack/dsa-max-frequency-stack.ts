import type { DSAScenario } from "../../types"

export const dsaMaxFrequencyStackScenario: DSAScenario = {
  id: "dsa-max-frequency-stack",
  title: "Maximum Frequency Stack",
  type: "dsa",
  pattern: "stack",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg"],
  description: "Design a stack that pops the most frequent element",
  tags: ["stack", "hash-table", "design"],
  estimatedTime: 35,
  problemStatement: `Design a stack-like data structure to push elements to the stack and pop the most frequent element from the stack.

Implement the FreqStack class:
- FreqStack() constructs an empty frequency stack.
- void push(int val) pushes an integer val onto the top of the stack.
- int pop() removes and returns the most frequent element in the stack. If there is a tie, the element closest to the top is removed and returned.`,
  examples: [
    {
      input:
        '["FreqStack", "push", "push", "push", "push", "push", "push", "pop", "pop", "pop", "pop"]\n[[], [5], [7], [5], [7], [4], [5], [], [], [], []]',
      output: "[null, null, null, null, null, null, null, 5, 7, 5, 4]",
      explanation:
        "After pushes, frequencies are 5:3, 7:2, 4:1. Pop returns 5 (most frequent), then 7, 5, 4.",
    },
  ],
  constraints: ["0 <= val <= 10^9", "At most 2 * 10^4 calls will be made to push and pop."],
  hints: [
    "Track frequency of each element in a hashmap",
    "For each frequency level, maintain a stack of elements",
    "Track maxFrequency to know which stack to pop from",
    "On pop: pop from stack at maxFreq, decrement freq, update maxFreq if needed",
  ],
  starterCode: {
    javascript: `class FreqStack {\n  constructor() {\n    // Initialize freq map and frequency stacks\n  }\n\n  push(val) {\n    // Increment freq, push to appropriate stack\n  }\n\n  pop() {\n    // Pop from max frequency stack\n  }\n}`,
    typescript: `class FreqStack {\n  constructor() {\n    // Initialize freq map and frequency stacks\n  }\n\n  push(val: number): void {\n    // Increment freq, push to appropriate stack\n  }\n\n  pop(): number {\n    // Pop from max frequency stack\n  }\n}`,
    python: `class FreqStack:\n    def __init__(self):\n        # Initialize freq map and frequency stacks\n        pass\n\n    def push(self, val: int) -> None:\n        # Increment freq, push to appropriate stack\n        pass\n\n    def pop(self) -> int:\n        # Pop from max frequency stack\n        pass`,
    java: `class FreqStack {\n    public FreqStack() {\n        // Initialize freq map and frequency stacks\n    }\n\n    public void push(int val) {\n        // Increment freq, push to appropriate stack\n    }\n\n    public int pop() {\n        // Pop from max frequency stack\n        return 0;\n    }\n}`,
  },
  optimalComplexity: { time: "O(1) per operation", space: "O(n)" },
  testCases: [
    {
      input: { ops: ["FreqStack", "push", "push", "push", "pop"], args: [[], [5], [7], [5], []] },
      expected: [null, null, null, null, 5],
      description: "Pop most frequent",
    },
  ],
}
