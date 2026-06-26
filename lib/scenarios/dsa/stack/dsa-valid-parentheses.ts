import type { DSAScenario } from "../../types"

export const dsaValidParenthesesScenario: DSAScenario = {
  id: "dsa-valid-parentheses",
  title: "Valid Parentheses",
  type: "dsa",
  pattern: "stack",
  difficulty: "easy",
  companies: [
    "Amazon",
    "Google",
    "Meta",
    "Microsoft",
    "Roblox",
    "TikTok",
    "ZipRecruiter",
    "Palantir",
  ],
  roles: ["intern", "new-grad", "swe", "fdse"],
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
  fuzzyStatement: "Given a string of brackets, determine if it's valid.",

  clarifyingQuestions: [
    {
      topic: "bracket_types",
      question: "What types of brackets are we dealing with?",
      answer: "Only parentheses (), square brackets [], and curly braces {}.",
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
      codeSignals: ["count open and close", "counter++", "counter--", "only counting"],
      intervention:
        "Counting might not be enough. What about '([)]'? The counts match but is it valid?",
    },
    {
      description: "Using string replacement in a loop",
      codeSignals: ["replace('()', '')", "replace('[]', '')", "while loop replace"],
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
      question: "Nice - what's your mapping strategy? Keys are opening or closing brackets?",
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
}
