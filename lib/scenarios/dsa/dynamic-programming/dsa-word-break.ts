import type { DSAScenario } from "../../types"

export const wordBreakScenario: DSAScenario = {
  id: "dsa-word-break",
  title: "Word Break",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Decide whether a string breaks cleanly into dictionary words.",
  tags: ["dynamic-programming", "hash-table", "string"],
  estimatedTime: 25,
  problemStatement: `You're given a string s and a list of words wordDict. Decide whether s can be sliced into a left-to-right sequence of chunks, with nothing left over, so that every chunk appears in wordDict.

A dictionary word may be reused as many times as needed, and not every word in wordDict has to show up. Return true when at least one complete slicing works, and false when none does.`,
  examples: [
    {
      input: "s = sunflower, wordDict = [sun,flower]",
      output: "true",
      explanation: "sunflower slices apart as sun flower",
    },
    {
      input: "s = raincoatrain, wordDict = [rain,coat]",
      output: "true",
    },
    {
      input: "s = handshakes, wordDict = [hands,shake,hand,ash,hake]",
      output: "false",
    },
  ],
  constraints: [
    "s runs 1 to 300 characters long.",
    "wordDict holds between 1 and 1000 words.",
    "Every string involved uses lowercase English letters only.",
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
    // Every segmentable string above could also be built by always taking the longest word
    // that fits, so that greedy pass never had to backtrack. Here "car" is the longest
    // match at position 0 and it strands the "s"; only "ca" + "rs" works.
    {
      input: { s: "cars", wordDict: ["car", "ca", "rs"] },
      expected: true,
      description: "Longest-first matching strands the tail; a shorter first word works",
    },
  ],
}
