import type { DSAScenario } from "../../types"

export const dsaMinStackScenario: DSAScenario = {
  id: "dsa-min-stack",
  title: "Min Stack",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Microsoft", "Apple", "Meta", "ZipRecruiter", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description:
    "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time",
  tags: ["stack", "design"],
  estimatedTime: 20,
  problemStatement: `Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.

Implement the MinStack class:
- MinStack() initializes the stack object.
- void push(int val) pushes the element val onto the stack.
- void pop() removes the element on the top of the stack.
- int top() gets the top element of the stack.
- int getMin() retrieves the minimum element in the stack.

You must implement a solution with O(1) time complexity for each function.`,
  examples: [
    {
      input: "MinStack(); push(-2); push(0); push(-3); getMin(); pop(); top(); getMin()",
      output: "-3, 0, -2",
      explanation: "getMin() returns -3. After pop, top is 0 and min is -2.",
    },
  ],
  constraints: [
    "-2^31 <= val <= 2^31 - 1",
    "Methods pop, top and getMin will always be called on non-empty stacks",
    "At most 3 * 10^4 calls will be made to push, pop, top, and getMin",
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
