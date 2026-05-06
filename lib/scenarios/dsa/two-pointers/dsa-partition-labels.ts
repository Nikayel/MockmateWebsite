import type { DSAScenario } from "../../types"

export const dsaPartitionLabelsScenario: DSAScenario = {
  id: "dsa-partition-labels",
  title: "Partition Labels",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Partition string into parts where each letter appears in one part only",
  tags: ["string", "two-pointers", "greedy", "hash-table"],
  estimatedTime: 25,
  problemStatement: `You are given a string s. We want to partition the string into as many parts as possible so that each letter appears in at most one part.

Note that the partition is done so that after concatenating all the parts in order, the resultant string should be s.

Return a list of integers representing the size of these parts.`,
  examples: [
    {
      input: 's = "ababcbacadefegdehijhklij"',
      output: "[9,7,8]",
      explanation:
        'The partition is "ababcbaca", "defegde", "hijhklij". Each letter appears in at most one part.',
    },
    {
      input: 's = "eccbbbbdec"',
      output: "[10]",
      explanation: "All letters are interconnected, so single partition.",
    },
  ],
  constraints: ["1 <= s.length <= 500", "s consists of lowercase English letters"],
  hints: [
    "First, find the last occurrence of each character",
    "Track the end of current partition as max of last occurrences",
    "When current index equals partition end, we have a complete partition",
  ],
  starterCode: {
    javascript: `function partitionLabels(s) {
  // Write your solution here

}`,
    typescript: `function partitionLabels(s: string): number[] {
  // Write your solution here

}`,
    python: `def partition_labels(s):
    # Write your solution here
    pass`,
    java: `class Solution {
    public List<Integer> partitionLabels(String s) {
        // Write your solution here
        return new ArrayList<>();
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { s: "ababcbacadefegdehijhklij" },
      expected: [9, 7, 8],
      description: "Three partitions",
    },
    { input: { s: "eccbbbbdec" }, expected: [10], description: "Single partition" },
  ],
}
