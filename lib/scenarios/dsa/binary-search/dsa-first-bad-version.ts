import type { DSAScenario } from "../../types"

export const dsaFirstBadVersionScenario: DSAScenario = {
  id: "dsa-first-bad-version",
  title: "First Bad Version",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "easy",
  companies: ["Google", "Amazon", "Meta", "Microsoft"],
  description: "Find the first bad version with as few API calls as possible",
  tags: ["interactive", "binary-search"],
  estimatedTime: 15,
  problemStatement: `Your team cuts releases one after another, numbered 1 through n, and each release builds directly on the one before it. A regression slipped in at some point: one version failed the quality gate, and every version after it inherits the defect. Everything before it is clean.

There's an API you can call, bool isBadVersion(version), which reports whether a given version is defective. Find the number of the first bad version, and keep your API calls to a minimum.`,
  examples: [
    {
      input: "n = 9, bad = 6",
      output: "6",
      explanation:
        "isBadVersion(5) -> false, isBadVersion(7) -> true, isBadVersion(6) -> true. Version 6 is where the breakage starts.",
    },
    {
      input: "n = 1, bad = 1",
      output: "1",
    },
  ],
  constraints: ["bad is at least 1, n can climb to 2^31 - 1, and bad never exceeds n"],
  hints: [
    "Classic binary search application",
    "Search for leftmost true in a boolean array",
    "If mid is bad, first bad is at mid or before",
    "If mid is good, first bad is after mid",
  ],
  starterCode: {
    javascript: `function firstBadVersion(n) {
  // isBadVersion(version) is a predefined API
  // Write your solution here

}`,
    typescript: `function firstBadVersion(n: number): number {
  // isBadVersion(version: number): boolean is a predefined API
  // Write your solution here

}`,
    python: `def firstBadVersion(n):
    # isBadVersion(version) is a predefined API
    # Write your solution here
    pass`,
  },
  optimalComplexity: { time: "O(log n)", space: "O(1)" },
  testCases: [
    { input: { n: 5, bad: 4 }, expected: 4, description: "First bad at 4" },
    { input: { n: 1, bad: 1 }, expected: 1, description: "Only one version, it's bad" },
    { input: { n: 100, bad: 50 }, expected: 50, description: "Bad in middle" },
    { input: { n: 10, bad: 1 }, expected: 1, description: "First version is bad" },
    { input: { n: 10, bad: 10 }, expected: 10, description: "Last version is first bad" },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the first version is bad?",
    "What if the last version is the only bad one?",
    "Why minimize API calls? How does binary search help?",
    "This is like finding the first 'true' in a boolean array - can you see that?",
  ],

  midCodingProbes: [
    {
      trigger: "deciding direction",
      question: "If version mid is bad, can the first bad version be after mid?",
    },
    {
      trigger: "termination condition",
      question: "When does your loop terminate? What will left point to?",
    },
  ],
}
