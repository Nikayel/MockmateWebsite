import type { DSAScenario } from "../../types"

export const dsaBasicCalculatorScenario: DSAScenario = {
  id: "dsa-basic-calculator",
  title: "Basic Calculator",
  type: "dsa",
  pattern: "stack",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["junior", "senior", "swe", "fdse"],
  description: "Evaluate a parenthesized plus-and-minus expression by hand",
  tags: ["stack", "math", "string"],
  estimatedTime: 35,
  problemStatement: `You're handed a string s holding a well-formed arithmetic expression, and your job is to compute the integer it evaluates to.

The only things that can appear in s are the operators '+' and '-', the parentheses '(' and ')', space characters, and non-negative integers. Reaching for a built-in evaluator (anything that executes strings as math or code) is off the table; do the arithmetic yourself.`,
  examples: [
    {
      input: 's = "3 + 4"',
      output: "7",
    },
    {
      input: 's = " 9-4 + 1 "',
      output: "6",
    },
    {
      input: 's = "(5+(2+6+1)-4)+(3+9)"',
      output: "22",
    },
  ],
  constraints: [
    "s runs from 1 to 3 * 10^5 characters",
    'only digits, "+", "-", "(", ")", and the space " " appear in s',
    "the expression inside s is always well-formed",
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
    // Every group above was added, never subtracted, so simply deleting the parentheses and
    // summing the terms produced the same answer. A minus in front of a group is what makes
    // the brackets matter.
    { input: { s: "2-(1+2)" }, expected: -1, description: "A group that is subtracted" },
    // And every number was a single digit, so accumulating digits was never required.
    { input: { s: "12+3" }, expected: 15, description: "Multi-digit number" },
  ],
}
