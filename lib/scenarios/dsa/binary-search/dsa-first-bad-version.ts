import type { DSAScenario } from "../../types"

export const dsaFirstBadVersionScenario: DSAScenario = {
  id: "dsa-first-bad-version",
  title: "First Bad Version",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "easy",
  companies: ["Google", "Amazon", "Meta", "Microsoft"],
  description: "Find the first bad version using binary search with minimal API calls",
  tags: ["binary-search", "interactive"],
  estimatedTime: 15,
  problemStatement: `You are a product manager and currently leading a team to develop a new product. Unfortunately, the latest version of your product fails the quality check. Since each version is developed based on the previous version, all the versions after a bad version are also bad.

Suppose you have n versions [1, 2, ..., n] and you want to find out the first bad one, which causes all the following ones to be bad.

You are given an API bool isBadVersion(version) which returns whether version is bad. Implement a function to find the first bad version. You should minimize the number of calls to the API.`,
  examples: [
    {
      input: "n = 5, bad = 4",
      output: "4",
      explanation:
        "isBadVersion(3) -> false, isBadVersion(5) -> true, isBadVersion(4) -> true. So 4 is the first bad version.",
    },
    {
      input: "n = 1, bad = 1",
      output: "1",
    },
  ],
  constraints: ["1 <= bad <= n <= 2^31 - 1"],
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
