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
  problemStatement: `Your input is an array of strings tokens: an arithmetic expression laid out in Reverse Polish Notation. Compute and return the integer the whole expression works out to.

Notation rules to honor: '+', '-', '*', and '/' are the only operators; every operand is either an integer or the value of a nested RPN expression; dividing one integer by another drops the fractional part, truncating toward zero; a division by zero never occurs; and tokens always encodes a well-formed RPN expression.`,
  examples: [
    {
      input: 'tokens = ["3","4","+","2","*"]',
      output: "14",
      explanation: "((3 + 4) * 2) = 14",
    },
    {
      input: 'tokens = ["5","17","6","/","+"]',
      output: "7",
      explanation: "(5 + (17 / 6)) = 7, because 17 / 6 truncates to 2",
    },
    {
      input: 'tokens = ["12","4","8","2","+","-10","*","/","*","20","+","6","+"]',
      output: "26",
    },
  ],
  constraints: [
    "tokens carries 1 to 10^4 entries",
    "every tokens[i] is one of the four operators or an integer between -200 and 200",
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
    // Both divisions above are between positives, where truncating toward zero and flooring
    // agree. They part company on a negative result: 7 / -3 truncates to -2, floors to -3.
    {
      input: { tokens: ["7", "-3", "/"] },
      expected: -2,
      description: "Negative division truncates toward zero",
    },
  ],
}
