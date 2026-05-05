import type { DSAScenario } from "../../types"

export const wordBreakScenario: DSAScenario = {
  id: "dsa-word-break",
  title: "Word Break",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Determine if string can be segmented into dictionary words.",
  tags: ["dynamic-programming", "hash-table", "string"],
  estimatedTime: 25,
  problemStatement: `Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.`,
  examples: [
    {
      input: "s = leetcode, wordDict = [leet,code]",
      output: "true",
      explanation: "leetcode can be segmented as leet code",
    },
    {
      input: "s = applepenapple, wordDict = [apple,pen]",
      output: "true",
    },
    {
      input: "s = catsandog, wordDict = [cats,dog,sand,and,cat]",
      output: "false",
    },
  ],
  constraints: [
    "1 <= s.length <= 300",
    "1 <= wordDict.length <= 1000",
    "All strings consist of lowercase English letters.",
  ],
  hints: [
    "1D DP: dp[i] = true if s[0..i] can be segmented",
    "For each position, check all possible words ending there",
    "Use HashSet for O(1) word lookup",
  ],
  starterCode: {
    javascript: `function wordBreak(s, wordDict) {
// Write your solution here

}`,
    python: `def wordBreak(s: str, wordDict: list[str]) -> bool:
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(n^2)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { s: "leetcode", wordDict: ["leet", "code"] },
      expected: true,
      description: "leetcode = leet + code",
    },
    {
      input: { s: "applepenapple", wordDict: ["apple", "pen"] },
      expected: true,
      description: "apple + pen + apple",
    },
    {
      input: { s: "catsandog", wordDict: ["cats", "dog", "sand", "and", "cat"] },
      expected: false,
      description: "Cannot segment catsandog",
    },
    {
      input: { s: "a", wordDict: ["a"] },
      expected: true,
      description: "Single character match",
    },
    {
      input: { s: "aaaaaaa", wordDict: ["a", "aa", "aaa"] },
      expected: true,
      description: "Multiple ways to segment",
    },
  ],
}
