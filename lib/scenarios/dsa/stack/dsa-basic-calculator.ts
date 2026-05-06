import type { DSAScenario } from "../../types"

export const dsaBasicCalculatorScenario: DSAScenario = {
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
}
