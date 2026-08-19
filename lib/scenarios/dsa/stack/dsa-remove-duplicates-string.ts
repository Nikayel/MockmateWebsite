import type { DSAScenario } from "../../types"

export const dsaRemoveDuplicatesStringScenario: DSAScenario = {
  id: "dsa-remove-duplicates-string",
  title: "Remove All Adjacent Duplicates In String II",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Bloomberg"],
  description: "Repeatedly delete runs of k equal adjacent letters",
  tags: ["stack", "string"],
  estimatedTime: 25,
  problemStatement: `You're given a string s and an integer k. A removal step picks k equal letters sitting consecutively in s and deletes exactly those k, letting the text on the left and right of the hole fuse together.

Repeat removal steps until no k consecutive equal letters remain anywhere. Return the string that survives; whichever order you apply the steps in, the survivor comes out the same.`,
  examples: [
    {
      input: 's = "wxyz", k = 3',
      output: '"wxyz"',
      explanation: "No letter appears 3 times in a row, so nothing can be removed.",
    },
    {
      input: 's = "azzzaabbbaac", k = 3',
      output: '"aac"',
      explanation:
        '"zzz" goes first, leaving "aaabbbaac"; deleting "aaa" leaves "bbbaac"; deleting "bbb" leaves "aac", which has no run of three.',
    },
    {
      input: 's = "grrottooba", k = 2',
      output: '"goba"',
    },
  ],
  constraints: [
    "s spans 1 to 10^5 characters",
    "k sits between 2 and 10^4",
    "nothing but lowercase English letters appears in s",
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
