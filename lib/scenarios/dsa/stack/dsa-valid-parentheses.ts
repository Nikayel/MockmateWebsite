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
  description: "Check whether a string of brackets closes everything it opens",
  tags: ["stack", "string"],
  estimatedTime: 15,
  problemStatement: `You're given a string s built entirely from the six bracket characters '(', ')', '{', '}', '[' and ']'. Decide whether the brackets in s pair up legally, and return true or false accordingly.

Legal pairing means three things hold at once: every opening bracket gets closed by a bracket of the same kind, brackets close in the reverse of the order they were opened (the most recent unclosed opener always closes first), and no closing bracket ever appears without its opener.`,
  examples: [
    {
      input: 's = "[]"',
      output: "true",
    },
    {
      input: 's = "{}()[]"',
      output: "true",
    },
    {
      input: 's = "{)"',
      output: "false",
    },
  ],
  constraints: [
    "s holds at most 10^4 characters and may be empty",
    "every character of s is one of the bracket marks '()[]{}'",
  ],
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
  fuzzyStatement: "You get a string full of brackets. Tell me whether it's valid.",

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
