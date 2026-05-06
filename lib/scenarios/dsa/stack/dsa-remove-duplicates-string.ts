import type { DSAScenario } from "../../types"

export const dsaRemoveDuplicatesStringScenario: DSAScenario = {
  id: "dsa-remove-duplicates-string",
  title: "Remove All Adjacent Duplicates In String II",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Bloomberg"],
  description: "Remove k adjacent duplicate letters using a stack",
  tags: ["stack", "string"],
  estimatedTime: 25,
  problemStatement: `You are given a string s and an integer k, a k duplicate removal consists of choosing k adjacent and equal letters from s and removing them, causing the left and the right side of the deleted substring to concatenate together.

We repeatedly make k duplicate removals on s until we no longer can.

Return the final string after all such duplicate removals have been made. It is guaranteed that the answer is unique.`,
  examples: [
    {
      input: 's = "abcd", k = 2',
      output: '"abcd"',
      explanation: "No adjacent duplicates.",
    },
    {
      input: 's = "deeedbbcccbdaa", k = 3',
      output: '"aa"',
      explanation: '"eee" -> "ddbcccbdaa" -> "ddbbbdaa" -> "dddaa" -> "aa"',
    },
    {
      input: 's = "pbbcggttciiippooaais", k = 2',
      output: '"ps"',
    },
  ],
  constraints: [
    "1 <= s.length <= 10^5",
    "2 <= k <= 10^4",
    "s only contains lowercase English letters",
  ],
  hints: [
    "Use a stack that stores [character, count] pairs",
    "When count reaches k, pop from stack",
    "Build result from stack at the end",
  ],
  starterCode: {
    javascript: `function removeDuplicates(s, k) {
  // Write your solution here

}`,
    typescript: `function removeDuplicates(s: string, k: number): string {
  // Write your solution here

}`,
    python: `def remove_duplicates(s, k):
    # Write your solution here
    pass`,
    java: `class Solution {
    public String removeDuplicates(String s, int k) {
        // Write your solution here
        return "";
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    { input: { s: "abcd", k: 2 }, expected: "abcd", description: "No duplicates" },
    { input: { s: "deeedbbcccbdaa", k: 3 }, expected: "aa", description: "Multiple removals" },
  ],
}
