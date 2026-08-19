import type { DSAScenario } from "../../types"

export const dsaMinStackScenario: DSAScenario = {
  id: "dsa-min-stack",
  title: "Min Stack",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Microsoft", "Apple", "Meta", "ZipRecruiter", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Build a stack that can always report its minimum in constant time",
  tags: ["stack", "design"],
  estimatedTime: 20,
  problemStatement: `Build a stack that can also report its smallest element, with every operation finishing in constant time.

Implement the MinStack class:
- MinStack() creates the stack empty.
- void push(int val) places val on top.
- void pop() discards the current top element.
- int top() reads the top element without removing it.
- int getMin() reports the smallest value the stack currently holds.

Each of these operations must run in O(1) time.`,
  examples: [
    {
      input: "MinStack(); push(-4); push(1); push(-6); getMin(); pop(); top(); getMin()",
      output: "-6, 1, -4",
      explanation:
        "getMin() sees -6 while it sits on the stack. Once pop removes it, the top is 1 and the minimum falls back to -4.",
    },
  ],
  constraints: [
    "val always fits between -2^31 and 2^31 - 1",
    "pop, top, and getMin are only ever invoked while the stack holds at least one element",
    "push, pop, top, and getMin together account for at most 3 * 10^4 calls",
  ],
  hints: [
    "Use two stacks: one for values, one for minimums",
    "When pushing, also track the current minimum",
    "When popping, update the minimum accordingly",
  ],
  starterCode: {
    javascript: `class MinStack {
  constructor() {
    // Your implementation
  }

  push(val) {
    // Your implementation
  }

  pop() {
    // Your implementation
  }

  top() {
    // Your implementation
  }

  getMin() {
    // Your implementation
  }
}`,
    typescript: `class MinStack {
  constructor() {
    // Your implementation
  }

  push(val: number): void {
    // Your implementation
  }

  pop(): void {
    // Your implementation
  }

  top(): number {
    // Your implementation
    return 0;
  }

  getMin(): number {
    // Your implementation
    return 0;
  }
}`,
    python: `class MinStack:
    def __init__(self):
        # Your implementation
        pass

    def push(self, val: int) -> None:
        # Your implementation
        pass

    def pop(self) -> None:
        # Your implementation
        pass

    def top(self) -> int:
        # Your implementation
        return 0

    def getMin(self) -> int:
        # Your implementation
        return 0`,
    java: `class MinStack {
    public MinStack() {
        // Your implementation
    }

    public void push(int val) {
        // Your implementation
    }

    public void pop() {
        // Your implementation
    }

    public int top() {
        // Your implementation
        return 0;
    }

    public int getMin() {
        // Your implementation
        return 0;
    }
}`,
    cpp: `class MinStack {
public:
    MinStack() {
        // Your implementation
    }

    void push(int val) {
        // Your implementation
    }

    void pop() {
        // Your implementation
    }

    int top() {
        // Your implementation
        return 0;
    }

    int getMin() {
        // Your implementation
        return 0;
    }
};`,
    csharp: `public class MinStack {
    public MinStack() {
        // Your implementation
    }

    public void Push(int val) {
        // Your implementation
    }

    public void Pop() {
        // Your implementation
    }

    public int Top() {
        // Your implementation
        return 0;
    }

    public int GetMin() {
        // Your implementation
        return 0;
    }
}`,
    go: `type MinStack struct {
    // Your implementation
}

func Constructor() MinStack {
    // Your implementation
    return MinStack{}
}

func (this *MinStack) Push(val int) {
    // Your implementation
}

func (this *MinStack) Pop() {
    // Your implementation
}

func (this *MinStack) Top() int {
    // Your implementation
    return 0
}

func (this *MinStack) GetMin() int {
    // Your implementation
    return 0
}`,
    rust: `struct MinStack {
    // Your implementation
}

impl MinStack {
    fn new() -> Self {
        // Your implementation
        MinStack {}
    }

    fn push(&mut self, val: i32) {
        // Your implementation
    }

    fn pop(&mut self) {
        // Your implementation
    }

    fn top(&self) -> i32 {
        // Your implementation
        0
    }

    fn get_min(&self) -> i32 {
        // Your implementation
        0
    }
}`,
  },
  optimalComplexity: {
    time: "O(1)",
    space: "O(n)",
  },
  testCases: [
    {
      input: {
        operations: ["MinStack", "push", "push", "push", "getMin", "pop", "top", "getMin"],
        values: [[], [-2], [0], [-3], [], [], [], []],
      },
      expected: [null, null, null, null, -3, null, 0, -2],
      description: "Basic min stack operations",
    },
    // Edge cases
    {
      input: { operations: ["MinStack", "push", "top", "getMin"], values: [[], [5], [], []] },
      expected: [null, null, 5, 5],
      description: "Edge: Single element",
    },
    {
      input: {
        operations: ["MinStack", "push", "push", "getMin", "getMin"],
        values: [[], [3], [3], [], []],
      },
      expected: [null, null, null, 3, 3],
      description: "Edge: Duplicate minimum values",
    },
    {
      input: {
        operations: ["MinStack", "push", "push", "push", "getMin", "pop", "getMin"],
        values: [[], [1], [2], [1], [], [], []],
      },
      expected: [null, null, null, null, 1, null, 1],
      description: "Edge: Min pushed twice, pop one",
    },
    {
      input: {
        operations: ["MinStack", "push", "push", "push", "top", "getMin"],
        values: [[], [-1000], [0], [1000], [], []],
      },
      expected: [null, null, null, null, 1000, -1000],
      description: "Edge: Large range of values",
    },
  ],
}
