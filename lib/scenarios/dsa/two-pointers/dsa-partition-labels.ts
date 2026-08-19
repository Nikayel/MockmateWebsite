import type { DSAScenario } from "../../types"

export const dsaPartitionLabelsScenario: DSAScenario = {
  id: "dsa-partition-labels",
  title: "Partition Labels",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Split a string into the most pieces possible with no letter spanning two pieces",
  tags: ["string", "hash-table", "two-pointers", "greedy"],
  estimatedTime: 25,
  problemStatement: `You're given a string s. Slice it into the largest possible number of pieces such that no letter shows up in more than one piece. Reading the pieces back in order must reproduce s exactly.

Return the sizes of the pieces, as a list of integers in piece order.`,
  examples: [
    {
      input: 's = "cdcdefgefghih"',
      output: "[4,6,3]",
      explanation:
        'The pieces are "cdcd", "efgefg", "hih". No letter belongs to more than one piece.',
    },
    {
      input: 's = "nvbbvvbn"',
      output: "[8]",
      explanation: "Every letter's occurrences overlap here, so the whole string is one piece.",
    },
  ],
  constraints: [
    "s holds between 1 and 500 characters",
    "every character of s is a lowercase English letter",
  ],
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
