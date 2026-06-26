import type { DSAScenario } from "../../types"

export const dsaEvaluateReversePolishScenario: DSAScenario = {
  id: "dsa-evaluate-reverse-polish",
  title: "Evaluate Reverse Polish Notation",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft", "LinkedIn", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
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
}
