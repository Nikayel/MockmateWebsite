/**
 * Stack DSA Scenarios
 * Pattern: stack
 */

import type { DSAScenario } from "../types"

export const stackScenarios: DSAScenario[] = [
  {
    id: "dsa-valid-parentheses",
    title: "Valid Parentheses",
    type: "dsa",
    pattern: "stack",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Roblox", "TikTok", "ZipRecruiter"],
    description: "Determine if a string containing parentheses is valid",
    tags: ["stack", "string"],
    estimatedTime: 15,
    problemStatement: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: "true",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
      },
      {
        input: 's = "(]"',
        output: "false",
      },
    ],
    constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
    hints: [
      "Use a stack to keep track of opening brackets",
      "When you see a closing bracket, check if it matches the top of the stack",
      "The string is valid if the stack is empty at the end",
    ],
    starterCode: {
      javascript: `function isValid(s) {
  // Write your solution here

}`,
      typescript: `function isValid(s: string): boolean {
  // Write your solution here

}`,
      python: `def is_valid(s):
    # Write your solution here
    pass`,
      java: `class Solution {
    public boolean isValid(String s) {
        // Write your solution here
        return false;
    }
}`,
      cpp: `class Solution {
public:
    bool isValid(string s) {
        // Write your solution here

    }
};`,
      csharp: `public class Solution {
    public bool IsValid(string s) {
        // Write your solution here
        return false;
    }
}`,
      go: `func isValid(s string) bool {
    // Write your solution here
    return false
}`,
      rust: `impl Solution {
    pub fn is_valid(s: String) -> bool {
        // Write your solution here
        false
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { s: "()" },
        expected: true,
        description: "Basic case: ()",
      },
      {
        input: { s: "()[]{}" },
        expected: true,
        description: "Multiple types: ()[]{}",
      },
      {
        input: { s: "(]" },
        expected: false,
        description: "Mismatched: (]",
      },
      {
        input: { s: "([)]" },
        expected: false,
        description: "Wrong order: ([)]",
      },
      {
        input: { s: "{[]}" },
        expected: true,
        description: "Nested: {[]}",
      },
      // Edge cases
      {
        input: { s: "" },
        expected: true,
        description: "Edge: Empty string",
      },
      {
        input: { s: ")(" },
        expected: false,
        description: "Edge: Starts with closing bracket",
      },
      {
        input: { s: "(((" },
        expected: false,
        description: "Edge: Unclosed brackets",
      },
      {
        input: { s: "]" },
        expected: false,
        description: "Edge: Single closing bracket",
      },
      {
        input: { s: "(" },
        expected: false,
        description: "Edge: Single opening bracket",
      },
    ],

    // ==========================================
    // Real Interview Mode (Fuzzy Mode) Fields
    // ==========================================
    fuzzyStatement:
      "Given a string of brackets, determine if it's valid.",

    clarifyingQuestions: [
      {
        topic: "bracket_types",
        question: "What types of brackets are we dealing with?",
        answer:
          "Only parentheses (), square brackets [], and curly braces {}.",
        required: true,
      },
      {
        topic: "validity_definition",
        question: "What makes a string 'valid'?",
        answer:
          "Every opening bracket must have a matching closing bracket of the same type, and they must be properly nested.",
        required: true,
      },
      {
        topic: "other_characters",
        question: "Can the string contain other characters?",
        answer: "No, the string only contains bracket characters.",
        required: false,
      },
      {
        topic: "empty_input",
        question: "What about an empty string?",
        answer: "An empty string is considered valid.",
        required: false,
      },
      {
        topic: "input_constraints",
        question: "Is there a maximum length?",
        answer: "The string can have up to 10,000 characters.",
        required: false,
      },
    ],

    // ==========================================
    // Proactive AI Interviewer Fields
    // ==========================================
    commonWrongApproaches: [
      {
        description: "Just counting brackets without tracking type/order",
        codeSignals: [
          "count open and close",
          "counter++",
          "counter--",
          "only counting",
        ],
        intervention:
          "Counting might not be enough. What about '([)]'? The counts match but is it valid?",
      },
      {
        description: "Using string replacement in a loop",
        codeSignals: [
          "replace('()', '')",
          "replace('[]', '')",
          "while loop replace",
        ],
        intervention:
          "That could work but what's the time complexity? Each replace might scan the whole string. Can you do it in one pass?",
      },
      {
        description: "Checking only adjacent pairs",
        codeSignals: ["s[i] and s[i+1]", "adjacent characters", "pairs only"],
        intervention:
          "What about nested brackets like '{[]}'? Adjacent checking might miss valid patterns.",
      },
    ],

    whatIfQuestions: [
      "What if the string starts with a closing bracket like ']'?",
      "What happens if we have unmatched opening brackets at the end, like '((('?",
      "What's the space complexity of your solution?",
      "Could you solve this without a stack?",
    ],

    midCodingProbes: [
      {
        trigger: "creating a stack",
        question: "What are you pushing onto the stack - the bracket itself or something else?",
      },
      {
        trigger: "using a map/dictionary for bracket matching",
        question:
          "Nice - what's your mapping strategy? Keys are opening or closing brackets?",
      },
      {
        trigger: "checking if stack is empty at end",
        question: "Why do you need to check if the stack is empty at the end?",
      },
    ],

    optimizationPush: {
      suboptimalComplexity: "O(n²)",
      nudge:
        "Your solution works but might be doing repeated work. Can you solve it with a single pass through the string?",
    },
  },
  {
    id: "dsa-min-stack",
    title: "Min Stack",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Amazon", "Microsoft", "Apple", "Meta", "ZipRecruiter"],
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
  },
  {
    id: "dsa-daily-temperatures",
    title: "Daily Temperatures",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "TikTok"],
    description: "Find days until warmer temperature using monotonic stack",
    tags: ["stack", "monotonic-stack", "array"],
    estimatedTime: 25,
    problemStatement: `Given an array of integers temperatures represents the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature. If there is no future day for which this is possible, keep answer[i] == 0 instead.`,
    examples: [
      {
        input: "temperatures = [73,74,75,71,69,72,76,73]",
        output: "[1,1,4,2,1,1,0,0]",
        explanation: "For day 0 (73°), the next warmer is day 1 (74°), so answer[0] = 1.",
      },
      {
        input: "temperatures = [30,40,50,60]",
        output: "[1,1,1,0]",
      },
      {
        input: "temperatures = [30,60,90]",
        output: "[1,1,0]",
      },
    ],
    constraints: ["1 <= temperatures.length <= 10^5", "30 <= temperatures[i] <= 100"],
    hints: [
      "Use a monotonic decreasing stack to track indices",
      "When you find a warmer temperature, pop from stack and calculate days",
      "Stack stores indices, not temperatures",
    ],
    starterCode: {
      javascript: `function dailyTemperatures(temperatures) {
  // Write your solution here

}`,
      typescript: `function dailyTemperatures(temperatures: number[]): number[] {
  // Write your solution here

}`,
      python: `def daily_temperatures(temperatures):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        // Write your solution here
        return new int[0];
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { temperatures: [73, 74, 75, 71, 69, 72, 76, 73] },
        expected: [1, 1, 4, 2, 1, 1, 0, 0],
        description: "Standard case",
      },
      {
        input: { temperatures: [30, 40, 50, 60] },
        expected: [1, 1, 1, 0],
        description: "Increasing temperatures",
      },
      {
        input: { temperatures: [30, 60, 90] },
        expected: [1, 1, 0],
        description: "Simple increasing",
      },
      // Edge cases
      { input: { temperatures: [50] }, expected: [0], description: "Edge: Single element" },
      {
        input: { temperatures: [100, 90, 80, 70, 60] },
        expected: [0, 0, 0, 0, 0],
        description: "Edge: All decreasing (no warmer day)",
      },
      {
        input: { temperatures: [50, 50, 50, 50] },
        expected: [0, 0, 0, 0],
        description: "Edge: All identical temperatures",
      },
    ],
  },
  {
    id: "dsa-largest-rectangle-histogram",
    title: "Largest Rectangle in Histogram",
    type: "dsa",
    pattern: "stack",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    description: "Find the largest rectangular area in a histogram",
    tags: ["stack", "monotonic-stack", "array"],
    estimatedTime: 35,
    problemStatement: `Given an array of integers heights representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.`,
    examples: [
      {
        input: "heights = [2,1,5,6,2,3]",
        output: "10",
        explanation: "The largest rectangle has area = 10 (bars at index 2 and 3 with height 5).",
      },
      {
        input: "heights = [2,4]",
        output: "4",
      },
    ],
    constraints: ["1 <= heights.length <= 10^5", "0 <= heights[i] <= 10^4"],
    hints: [
      "Use a monotonic increasing stack",
      "When you encounter a smaller bar, calculate areas for bars that can't extend further",
      "Track the width using indices on the stack",
    ],
    starterCode: {
      javascript: `function largestRectangleArea(heights) {
  // Write your solution here

}`,
      typescript: `function largestRectangleArea(heights: number[]): number {
  // Write your solution here

}`,
      python: `def largest_rectangle_area(heights):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int largestRectangleArea(int[] heights) {
        // Write your solution here
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      { input: { heights: [2, 1, 5, 6, 2, 3] }, expected: 10, description: "Standard histogram" },
      { input: { heights: [2, 4] }, expected: 4, description: "Two bars" },
      { input: { heights: [1] }, expected: 1, description: "Single bar" },
      // Edge cases
      { input: { heights: [0, 0, 0] }, expected: 0, description: "Edge: All zeros" },
      { input: { heights: [5, 5, 5, 5] }, expected: 20, description: "Edge: All same height" },
      {
        input: { heights: [1, 2, 3, 4, 5] },
        expected: 9,
        description: "Edge: Strictly increasing",
      },
      {
        input: { heights: [5, 4, 3, 2, 1] },
        expected: 9,
        description: "Edge: Strictly decreasing",
      },
    ],
  },
  {
    id: "dsa-evaluate-reverse-polish",
    title: "Evaluate Reverse Polish Notation",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Microsoft", "LinkedIn"],
    description: "Evaluate arithmetic expression in Reverse Polish Notation",
    tags: ["stack", "math", "array"],
    estimatedTime: 20,
    problemStatement: `You are given an array of strings tokens that represents an arithmetic expression in a Reverse Polish Notation.

Evaluate the expression. Return an integer that represents the value of the expression.

Note that:
- The valid operators are '+', '-', '*', and '/'.
- Each operand may be an integer or another expression.
- The division between two integers always truncates toward zero.
- There will not be any division by zero.
- The input represents a valid arithmetic expression in reverse polish notation.`,
    examples: [
      {
        input: 'tokens = ["2","1","+","3","*"]',
        output: "9",
        explanation: "((2 + 1) * 3) = 9",
      },
      {
        input: 'tokens = ["4","13","5","/","+"]',
        output: "6",
        explanation: "(4 + (13 / 5)) = 6",
      },
      {
        input: 'tokens = ["10","6","9","3","+","-11","*","/","*","17","+","5","+"]',
        output: "22",
      },
    ],
    constraints: [
      "1 <= tokens.length <= 10^4",
      "tokens[i] is either an operator or an integer in range [-200, 200]",
    ],
    hints: [
      "Use a stack to store operands",
      "When you see an operator, pop two operands, apply operation, push result",
      "Be careful with integer division truncation toward zero",
    ],
    starterCode: {
      javascript: `function evalRPN(tokens) {
  // Write your solution here

}`,
      typescript: `function evalRPN(tokens: string[]): number {
  // Write your solution here

}`,
      python: `def eval_rpn(tokens):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int evalRPN(String[] tokens) {
        // Write your solution here
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { tokens: ["2", "1", "+", "3", "*"] },
        expected: 9,
        description: "Basic expression",
      },
      {
        input: { tokens: ["4", "13", "5", "/", "+"] },
        expected: 6,
        description: "Division expression",
      },
    ],
  },
  {
    id: "dsa-decode-string",
    title: "Decode String",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Google", "Amazon", "Apple", "Microsoft"],
    description: "Decode an encoded string with nested patterns",
    tags: ["stack", "string", "recursion"],
    estimatedTime: 25,
    problemStatement: `Given an encoded string, return its decoded string.

The encoding rule is: k[encoded_string], where the encoded_string inside the square brackets is being repeated exactly k times. Note that k is guaranteed to be a positive integer.

You may assume that the input string is always valid; there are no extra white spaces, square brackets are well-formed, etc. Furthermore, you may assume that the original data does not contain any digits and that digits are only for those repeat numbers, k.`,
    examples: [
      {
        input: 's = "3[a]2[bc]"',
        output: '"aaabcbc"',
      },
      {
        input: 's = "3[a2[c]]"',
        output: '"accaccacc"',
        explanation: 'Inner 2[c] = "cc", then 3[acc] = "accaccacc"',
      },
      {
        input: 's = "2[abc]3[cd]ef"',
        output: '"abcabccdcdcdef"',
      },
    ],
    constraints: [
      "1 <= s.length <= 30",
      "s consists of lowercase English letters, digits, and square brackets",
      "s is guaranteed to be a valid input",
      "All the integers in s are in the range [1, 300]",
    ],
    hints: [
      "Use two stacks: one for counts, one for strings",
      'When you see "[", push current string and count to stacks',
      'When you see "]", pop and repeat the current string',
    ],
    starterCode: {
      javascript: `function decodeString(s) {
  // Write your solution here

}`,
      typescript: `function decodeString(s: string): string {
  // Write your solution here

}`,
      python: `def decode_string(s):
    # Write your solution here
    pass`,
      java: `class Solution {
    public String decodeString(String s) {
        // Write your solution here
        return "";
    }
}`,
    },
    optimalComplexity: {
      time: "O(n * maxK)",
      space: "O(n)",
    },
    testCases: [
      { input: { s: "3[a]2[bc]" }, expected: "aaabcbc", description: "Simple pattern" },
      { input: { s: "3[a2[c]]" }, expected: "accaccacc", description: "Nested pattern" },
      {
        input: { s: "2[abc]3[cd]ef" },
        expected: "abcabccdcdcdef",
        description: "Multiple patterns with suffix",
      },
    ],
  },
  {
    id: "dsa-asteroid-collision",
    title: "Asteroid Collision",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Simulate asteroid collisions using a stack",
    tags: ["stack", "array", "simulation"],
    estimatedTime: 25,
    problemStatement: `We are given an array asteroids of integers representing asteroids in a row.

For each asteroid, the absolute value represents its size, and the sign represents its direction (positive meaning right, negative meaning left). Each asteroid moves at the same speed.

Find out the state of the asteroids after all collisions. If two asteroids meet, the smaller one will explode. If both are the same size, both will explode. Two asteroids moving in the same direction will never meet.`,
    examples: [
      {
        input: "asteroids = [5,10,-5]",
        output: "[5,10]",
        explanation: "The 10 and -5 collide resulting in 10. The 5 and 10 never collide.",
      },
      {
        input: "asteroids = [8,-8]",
        output: "[]",
        explanation: "The 8 and -8 collide exploding each other.",
      },
      {
        input: "asteroids = [10,2,-5]",
        output: "[10]",
        explanation: "The 2 and -5 collide resulting in -5. The 10 and -5 collide resulting in 10.",
      },
    ],
    constraints: [
      "2 <= asteroids.length <= 10^4",
      "-1000 <= asteroids[i] <= 1000",
      "asteroids[i] != 0",
    ],
    hints: [
      "Use a stack to track surviving asteroids",
      "Only collision: positive moving right meets negative moving left",
      "Handle the collision loop until no more collisions possible",
    ],
    starterCode: {
      javascript: `function asteroidCollision(asteroids) {
  // Write your solution here

}`,
      typescript: `function asteroidCollision(asteroids: number[]): number[] {
  // Write your solution here

}`,
      python: `def asteroid_collision(asteroids):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int[] asteroidCollision(int[] asteroids) {
        // Write your solution here
        return new int[0];
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { asteroids: [5, 10, -5] },
        expected: [5, 10],
        description: "Larger asteroid survives",
      },
      { input: { asteroids: [8, -8] }, expected: [], description: "Equal size explosion" },
      { input: { asteroids: [10, 2, -5] }, expected: [10], description: "Chain collision" },
    ],
  },
  {
    id: "dsa-simplify-path",
    title: "Simplify Path",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Meta", "Amazon", "Microsoft"],
    description: "Simplify Unix-style file path using a stack",
    tags: ["stack", "string"],
    estimatedTime: 20,
    problemStatement: `Given a string path, which is an absolute path (starting with a slash '/') to a file or directory in a Unix-style file system, convert it to the simplified canonical path.

In a Unix-style file system, a period '.' refers to the current directory, a double period '..' refers to the directory up a level, and any multiple consecutive slashes are treated as a single slash '/'. The canonical path should:
- Start with a single slash '/'
- Not end with a trailing '/'
- Only contain the directories on the path from the root directory to the target file or directory`,
    examples: [
      {
        input: 'path = "/home/"',
        output: '"/home"',
        explanation: "Remove trailing slash.",
      },
      {
        input: 'path = "/../"',
        output: '"/"',
        explanation: "Going up from root stays at root.",
      },
      {
        input: 'path = "/home//foo/"',
        output: '"/home/foo"',
        explanation: "Multiple slashes are replaced by single slash.",
      },
    ],
    constraints: [
      "1 <= path.length <= 3000",
      "path consists of English letters, digits, period, slash, or underscore",
      "path is a valid absolute Unix path",
    ],
    hints: [
      'Split by "/" and use a stack for directories',
      'Skip empty strings and "."',
      'Pop from stack for ".." if not empty',
    ],
    starterCode: {
      javascript: `function simplifyPath(path) {
  // Write your solution here

}`,
      typescript: `function simplifyPath(path: string): string {
  // Write your solution here

}`,
      python: `def simplify_path(path):
    # Write your solution here
    pass`,
      java: `class Solution {
    public String simplifyPath(String path) {
        // Write your solution here
        return "";
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      { input: { path: "/home/" }, expected: "/home", description: "Remove trailing slash" },
      { input: { path: "/../" }, expected: "/", description: "Stay at root" },
      { input: { path: "/home//foo/" }, expected: "/home/foo", description: "Multiple slashes" },
    ],
  },
  {
    id: "dsa-basic-calculator",
    title: "Basic Calculator",
    type: "dsa",
    pattern: "stack",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Implement a basic calculator with parentheses",
    tags: ["stack", "math", "string"],
    estimatedTime: 35,
    problemStatement: `Given a string s representing a valid expression, implement a basic calculator to evaluate it, and return the result of the evaluation.

Note: You are not allowed to use any built-in function which evaluates strings as mathematical expressions.

The expression string may contain:
- '+' and '-' operators
- '(' and ')' parentheses
- ' ' spaces
- Non-negative integers`,
    examples: [
      {
        input: 's = "1 + 1"',
        output: "2",
      },
      {
        input: 's = " 2-1 + 2 "',
        output: "3",
      },
      {
        input: 's = "(1+(4+5+2)-3)+(6+8)"',
        output: "23",
      },
    ],
    constraints: [
      "1 <= s.length <= 3 * 10^5",
      's consists of digits, "+", "-", "(", ")", and " "',
      "s represents a valid expression",
    ],
    hints: [
      "Use a stack to handle parentheses and signs",
      "Track current sign (+1 or -1) and apply when seeing numbers",
      "Push result and sign when entering parenthesis, pop when leaving",
    ],
    starterCode: {
      javascript: `function calculate(s) {
  // Write your solution here

}`,
      typescript: `function calculate(s: string): number {
  // Write your solution here

}`,
      python: `def calculate(s):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int calculate(String s) {
        // Write your solution here
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      { input: { s: "1 + 1" }, expected: 2, description: "Simple addition" },
      { input: { s: " 2-1 + 2 " }, expected: 3, description: "Subtraction and addition" },
      { input: { s: "(1+(4+5+2)-3)+(6+8)" }, expected: 23, description: "Nested parentheses" },
    ],
  },
  {
    id: "dsa-remove-duplicates-string",
    title: "Remove All Adjacent Duplicates In String II",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Bloomberg"],
    description: "Remove k adjacent duplicate letters using a stack",
    tags: ["stack", "string"],
    estimatedTime: 25,
    problemStatement: `You are given a string s and an integer k, a k duplicate removal consists of choosing k adjacent and equal letters from s and removing them, causing the left and the right side of the deleted substring to concatenate together.

We repeatedly make k duplicate removals on s until we no longer can.

Return the final string after all such duplicate removals have been made. It is guaranteed that the answer is unique.`,
    examples: [
      {
        input: 's = "abcd", k = 2',
        output: '"abcd"',
        explanation: "No adjacent duplicates.",
      },
      {
        input: 's = "deeedbbcccbdaa", k = 3',
        output: '"aa"',
        explanation: '"eee" -> "ddbcccbdaa" -> "ddbbbdaa" -> "dddaa" -> "aa"',
      },
      {
        input: 's = "pbbcggttciiippooaais", k = 2',
        output: '"ps"',
      },
    ],
    constraints: [
      "1 <= s.length <= 10^5",
      "2 <= k <= 10^4",
      "s only contains lowercase English letters",
    ],
    hints: [
      "Use a stack that stores [character, count] pairs",
      "When count reaches k, pop from stack",
      "Build result from stack at the end",
    ],
    starterCode: {
      javascript: `function removeDuplicates(s, k) {
  // Write your solution here

}`,
      typescript: `function removeDuplicates(s: string, k: number): string {
  // Write your solution here

}`,
      python: `def remove_duplicates(s, k):
    # Write your solution here
    pass`,
      java: `class Solution {
    public String removeDuplicates(String s, int k) {
        // Write your solution here
        return "";
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      { input: { s: "abcd", k: 2 }, expected: "abcd", description: "No duplicates" },
      { input: { s: "deeedbbcccbdaa", k: 3 }, expected: "aa", description: "Multiple removals" },
    ],
  },
  {
    id: "dsa-longest-valid-parentheses",
    title: "Longest Valid Parentheses",
    type: "dsa",
    pattern: "stack",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    description: "Find the length of the longest valid parentheses substring",
    tags: ["stack", "string", "dynamic-programming"],
    estimatedTime: 30,
    problemStatement: `Given a string containing just the characters '(' and ')', return the length of the longest valid (well-formed) parentheses substring.`,
    examples: [
      {
        input: 's = "(()"',
        output: "2",
        explanation: 'The longest valid parentheses substring is "()".',
      },
      {
        input: 's = ")()())"',
        output: "4",
        explanation: 'The longest valid parentheses substring is "()()".',
      },
      {
        input: 's = ""',
        output: "0",
      },
    ],
    constraints: ["0 <= s.length <= 3 * 10^4", "s[i] is '(' or ')'"],
    hints: [
      "Stack approach: push indices, not characters",
      "Initialize stack with -1 as base for length calculation",
      "On '(': push index. On ')': pop, then calculate length from new top",
      "DP approach: dp[i] = length of valid substring ending at i",
      "Two-pass O(1) space: count left/right passes",
    ],
    starterCode: {
      javascript: `function longestValidParentheses(s) {
  // Write your solution here

}`,
      typescript: `function longestValidParentheses(s: string): number {
  // Write your solution here

}`,
      python: `def longestValidParentheses(s):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int longestValidParentheses(String s) {
        // Write your solution here
        return 0;
    }
}`,
    },
    optimalComplexity: { time: "O(n)", space: "O(n) or O(1) with two-pass" },
    testCases: [
      { input: { s: "(()" }, expected: 2, description: "Simple case" },
      { input: { s: ")()())" }, expected: 4, description: "Valid in middle" },
      { input: { s: "" }, expected: 0, description: "Empty string" },
      { input: { s: "()()" }, expected: 4, description: "Full valid" },
      { input: { s: "(()(()" }, expected: 2, description: "Nested incomplete" },
      { input: { s: "(()()" }, expected: 4, description: "Prefix incomplete" },
    ],
  },
  // ==================== NEW HIGH-VALUE ADDITIONS ====================
  {
    id: "dsa-car-fleet",
    title: "Car Fleet",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Calculate number of car fleets that arrive at destination",
    tags: ["stack", "array", "sorting", "monotonic-stack"],
    estimatedTime: 25,
    problemStatement: `There are n cars going to the same destination along a one-lane road. The destination is target miles away.

You are given two integer arrays position and speed, both of length n, where position[i] is the position of the ith car and speed[i] is the speed of the ith car (in miles per hour).

A car can never pass another car ahead of it, but it can catch up to it and drive bumper to bumper at the same speed. The faster car will slow down to match the slower car's speed. A car fleet is some non-empty set of cars driving at the same position and same speed.

Return the number of car fleets that will arrive at the destination.`,
    examples: [
      {
        input: "target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]",
        output: "3",
        explanation:
          "Car at 10 forms fleet 1. Cars at 8,5,3 catch up to car at 10 forming fleet 2. Car at 0 is fleet 3.",
      },
      { input: "target = 10, position = [3], speed = [3]", output: "1" },
      { input: "target = 100, position = [0,2,4], speed = [4,2,1]", output: "1" },
    ],
    constraints: [
      "n == position.length == speed.length",
      "1 <= n <= 10^5",
      "0 < target <= 10^6",
      "0 <= position[i] < target",
      "0 < speed[i] <= 10^6",
    ],
    hints: [
      "Sort cars by position in decreasing order (closest to target first)",
      "Calculate time to reach target for each car",
      "If car behind reaches earlier, it merges with car ahead",
      "Use monotonic stack: count how many distinct 'slowest times' we see",
    ],
    starterCode: {
      javascript: `function carFleet(target, position, speed) {\n  // Write your solution here\n\n}`,
      typescript: `function carFleet(target: number, position: number[], speed: number[]): number {\n  // Write your solution here\n\n}`,
      python: `def carFleet(target, position, speed):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n log n)", space: "O(n)" },
    testCases: [
      {
        input: { target: 12, position: [10, 8, 0, 5, 3], speed: [2, 4, 1, 1, 3] },
        expected: 3,
        description: "Multiple fleets",
      },
      { input: { target: 10, position: [3], speed: [3] }, expected: 1, description: "Single car" },
      {
        input: { target: 100, position: [0, 2, 4], speed: [4, 2, 1] },
        expected: 1,
        description: "All merge",
      },
    ],
  },
  {
    id: "dsa-trapping-rain-water",
    title: "Trapping Rain Water",
    type: "dsa",
    pattern: "stack",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple", "Goldman Sachs", "Bloomberg"],
    description: "Calculate how much water can be trapped after rain",
    tags: ["stack", "two-pointers", "dynamic-programming", "monotonic-stack"],
    estimatedTime: 30,
    problemStatement: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation: "The elevation map traps 6 units of rain water.",
      },
      { input: "height = [4,2,0,3,2,5]", output: "9" },
    ],
    constraints: ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"],
    hints: [
      "For each position, water = min(maxLeft, maxRight) - height",
      "Two pointers: track leftMax, rightMax, fill from lower side",
      "Stack: maintain decreasing monotonic stack, calculate water when popping",
      "DP: precompute leftMax[] and rightMax[] arrays",
    ],
    starterCode: {
      javascript: `function trap(height) {\n  // Use two pointers or stack\n}`,
      typescript: `function trap(height: number[]): number {\n  // Use two pointers or stack\n}`,
      python: `def trap(height: list[int]) -> int:\n    # Use two pointers or stack\n    pass`,
      java: `class Solution {\n    public int trap(int[] height) {\n        // Use two pointers or stack\n        return 0;\n    }\n}`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1) with two pointers" },
    testCases: [
      {
        input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
        expected: 6,
        description: "Standard case",
      },
      { input: { height: [4, 2, 0, 3, 2, 5] }, expected: 9, description: "Valley in middle" },
      { input: { height: [1, 2, 3, 4, 5] }, expected: 0, description: "Ascending - no water" },
    ],
  },
  {
    id: "dsa-next-greater-element-i",
    title: "Next Greater Element I",
    type: "dsa",
    pattern: "stack",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Bloomberg"],
    description: "Find the next greater element for each element from a subset",
    tags: ["stack", "hash-table", "monotonic-stack"],
    estimatedTime: 15,
    problemStatement: `The next greater element of some element x in an array is the first greater element that is to the right of x in the same array.

You are given two distinct 0-indexed integer arrays nums1 and nums2, where nums1 is a subset of nums2.

For each 0 <= i < nums1.length, find the index j such that nums1[i] == nums2[j] and determine the next greater element of nums2[j] in nums2. If there is no next greater element, then the answer for this query is -1.

Return an array ans of length nums1.length such that ans[i] is the next greater element as described above.`,
    examples: [
      {
        input: "nums1 = [4,1,2], nums2 = [1,3,4,2]",
        output: "[-1,3,-1]",
        explanation: "For 4: no greater to right. For 1: 3 is next greater. For 2: no greater.",
      },
      { input: "nums1 = [2,4], nums2 = [1,2,3,4]", output: "[3,-1]" },
    ],
    constraints: [
      "1 <= nums1.length <= nums2.length <= 1000",
      "0 <= nums1[i], nums2[i] <= 10^4",
      "All integers in nums1 and nums2 are unique.",
    ],
    hints: [
      "Use monotonic decreasing stack on nums2",
      "Build a map from element to its next greater",
      "Look up each element of nums1 in the map",
    ],
    starterCode: {
      javascript: `function nextGreaterElement(nums1, nums2) {\n  // Use monotonic stack + hashmap\n}`,
      typescript: `function nextGreaterElement(nums1: number[], nums2: number[]): number[] {\n  // Use monotonic stack + hashmap\n}`,
      python: `def nextGreaterElement(nums1: list[int], nums2: list[int]) -> list[int]:\n    # Use monotonic stack + hashmap\n    pass`,
      java: `class Solution {\n    public int[] nextGreaterElement(int[] nums1, int[] nums2) {\n        // Use monotonic stack + hashmap\n        return new int[0];\n    }\n}`,
    },
    optimalComplexity: { time: "O(n + m)", space: "O(n)" },
    testCases: [
      {
        input: { nums1: [4, 1, 2], nums2: [1, 3, 4, 2] },
        expected: [-1, 3, -1],
        description: "Mixed results",
      },
      {
        input: { nums1: [2, 4], nums2: [1, 2, 3, 4] },
        expected: [3, -1],
        description: "Ascending array",
      },
    ],
  },
  {
    id: "dsa-next-greater-element-ii",
    title: "Next Greater Element II",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Bloomberg"],
    description: "Find next greater element in a circular array",
    tags: ["stack", "array", "monotonic-stack"],
    estimatedTime: 20,
    problemStatement: `Given a circular integer array nums (i.e., the next element of nums[nums.length - 1] is nums[0]), return the next greater number for every element in nums.

The next greater number of a number x is the first greater number to its traversing-order next in the array, which means you could search circularly to find its next greater number. If it doesn't exist, return -1 for this number.`,
    examples: [
      {
        input: "nums = [1,2,1]",
        output: "[2,-1,2]",
        explanation:
          "First 1's next greater is 2; 2 has none; Second 1's next greater is 2 (circular).",
      },
      { input: "nums = [1,2,3,4,3]", output: "[2,3,4,-1,4]" },
    ],
    constraints: ["1 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
    hints: [
      "Iterate through array twice (or use modulo) to handle circularity",
      "Use monotonic decreasing stack storing indices",
      "On second pass, only pop from stack (don't push)",
    ],
    starterCode: {
      javascript: `function nextGreaterElements(nums) {\n  // Circular monotonic stack\n}`,
      typescript: `function nextGreaterElements(nums: number[]): number[] {\n  // Circular monotonic stack\n}`,
      python: `def nextGreaterElements(nums: list[int]) -> list[int]:\n    # Circular monotonic stack\n    pass`,
      java: `class Solution {\n    public int[] nextGreaterElements(int[] nums) {\n        // Circular monotonic stack\n        return new int[0];\n    }\n}`,
    },
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    testCases: [
      { input: { nums: [1, 2, 1] }, expected: [2, -1, 2], description: "Circular wrap" },
      {
        input: { nums: [1, 2, 3, 4, 3] },
        expected: [2, 3, 4, -1, 4],
        description: "Peak in middle",
      },
    ],
  },
  {
    id: "dsa-online-stock-span",
    title: "Online Stock Span",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Bloomberg", "Goldman Sachs"],
    description: "Calculate stock price span using monotonic stack",
    tags: ["stack", "design", "monotonic-stack", "data-stream"],
    estimatedTime: 25,
    problemStatement: `Design an algorithm that collects daily price quotes for some stock and returns the span of that stock's price for the current day.

The span of the stock's price in one day is the maximum number of consecutive days (starting from that day and going backward) for which the stock price was less than or equal to the price of that day.

For example, if the prices of the stock in the last four days is [7,2,1,2] and the price of the stock today is 2, then the span of today is 4 because starting from today, the price of the stock was less than or equal 2 for 4 consecutive days.

Implement the StockSpanner class:
- StockSpanner() Initializes the object.
- int next(int price) Returns the span of the stock's price given that today's price is price.`,
    examples: [
      {
        input:
          '["StockSpanner", "next", "next", "next", "next", "next", "next", "next"]\n[[], [100], [80], [60], [70], [60], [75], [85]]',
        output: "[null, 1, 1, 1, 2, 1, 4, 6]",
      },
    ],
    constraints: ["1 <= price <= 10^5", "At most 10^4 calls will be made to next."],
    hints: [
      "Use monotonic decreasing stack of (price, span) pairs",
      "When new price >= stack top, pop and accumulate spans",
      "Push (price, accumulated_span) onto stack",
    ],
    starterCode: {
      javascript: `class StockSpanner {\n  constructor() {\n    // Initialize stack\n  }\n\n  next(price) {\n    // Calculate span using monotonic stack\n  }\n}`,
      typescript: `class StockSpanner {\n  constructor() {\n    // Initialize stack\n  }\n\n  next(price: number): number {\n    // Calculate span using monotonic stack\n  }\n}`,
      python: `class StockSpanner:\n    def __init__(self):\n        # Initialize stack\n        pass\n\n    def next(self, price: int) -> int:\n        # Calculate span using monotonic stack\n        pass`,
      java: `class StockSpanner {\n    public StockSpanner() {\n        // Initialize stack\n    }\n\n    public int next(int price) {\n        // Calculate span using monotonic stack\n        return 0;\n    }\n}`,
    },
    optimalComplexity: { time: "O(1) amortized per call", space: "O(n)" },
    testCases: [
      {
        input: {
          ops: ["StockSpanner", "next", "next", "next", "next"],
          args: [[], [100], [80], [60], [70]],
        },
        expected: [null, 1, 1, 1, 2],
        description: "Basic operations",
      },
    ],
  },
  {
    id: "dsa-132-pattern",
    title: "132 Pattern",
    type: "dsa",
    pattern: "stack",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Microsoft", "Apple"],
    description: "Find if there exists a 132 pattern in array",
    tags: ["stack", "array", "monotonic-stack"],
    estimatedTime: 25,
    problemStatement: `Given an array of n integers nums, a 132 pattern is a subsequence of three integers nums[i], nums[j] and nums[k] such that i < j < k and nums[i] < nums[k] < nums[j].

Return true if there is a 132 pattern in nums, otherwise, return false.`,
    examples: [
      { input: "nums = [1,2,3,4]", output: "false", explanation: "No 132 pattern exists." },
      {
        input: "nums = [3,1,4,2]",
        output: "true",
        explanation: "There is a 132 pattern: [1, 4, 2].",
      },
      {
        input: "nums = [-1,3,2,0]",
        output: "true",
        explanation: "There are three 132 patterns: [-1, 3, 2], [-1, 3, 0] and [-1, 2, 0].",
      },
    ],
    constraints: ["n == nums.length", "1 <= n <= 2 * 10^5", "-10^9 <= nums[i] <= 10^9"],
    hints: [
      "Iterate from right to left",
      "Use stack to track potential 'k' values (the '2' in 132)",
      "Track the largest popped value as potential 'k'",
      "If current value < k, we found a valid i (the '1')",
    ],
    starterCode: {
      javascript: `function find132pattern(nums) {\n  // Use stack, iterate right to left\n}`,
      typescript: `function find132pattern(nums: number[]): boolean {\n  // Use stack, iterate right to left\n}`,
      python: `def find132pattern(nums: list[int]) -> bool:\n    # Use stack, iterate right to left\n    pass`,
      java: `class Solution {\n    public boolean find132pattern(int[] nums) {\n        // Use stack, iterate right to left\n        return false;\n    }\n}`,
    },
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    testCases: [
      { input: { nums: [1, 2, 3, 4] }, expected: false, description: "Strictly increasing" },
      { input: { nums: [3, 1, 4, 2] }, expected: true, description: "Has 132 pattern" },
      { input: { nums: [-1, 3, 2, 0] }, expected: true, description: "Multiple patterns" },
    ],
  },
  {
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
  },
]

export default stackScenarios
