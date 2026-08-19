import type { DSAScenario } from "../../types"

export const dsaClosestBstValueScenario: DSAScenario = {
  id: "dsa-closest-bst-value",
  title: "Closest Binary Search Tree Value",
  type: "dsa",
  pattern: "binary-search-tree",
  difficulty: "easy",
  companies: ["Google", "Amazon", "Meta", "Microsoft"],
  description: "Find the value in BST closest to a given target",
  tags: ["tree", "bst", "binary-search"],
  estimatedTime: 15,
  problemStatement: `You're handed the root of a binary search tree and a floating-point number target. Find the stored value sitting nearest to target, measured by absolute difference, and return it.

When target lands exactly halfway between two stored values, both are equally near. Break that tie by returning the smaller value.`,
  examples: [
    {
      input: "root = [8,5,12,3,6], target = 7.204918",
      output: "8",
      explanation: "Among 3, 5, 6, 8, and 12, the value 8 sits nearest to 7.204918.",
    },
    {
      input: "root = [6], target = 2.153846",
      output: "6",
    },
  ],
  constraints: [
    "The tree carries between 1 and 10^4 nodes",
    "Stored values obey 0 <= Node.val <= 10^9",
    "The target satisfies -10^9 <= target <= 10^9",
  ],
  hints: [
    "Use BST property to navigate: go left if target < node, right if target > node",
    "Track closest value seen so far",
    "Update closest when current node is closer to target",
  ],
  starterCode: {
    javascript: `function closestValue(root, target) {
  // Write your solution here

}`,
    typescript: `function closestValue(root: TreeNode | null, target: number): number {
  // Write your solution here

}`,
    python: `def closestValue(root, target):
    # Write your solution here
    pass`,
  },
  optimalComplexity: { time: "O(h)", space: "O(1)" },
  testCases: [
    {
      input: { root: [4, 2, 5, 1, 3], target: 3.714286 },
      expected: 4,
      description: "Closest is 4",
    },
    { input: { root: [1], target: 4.428571 }, expected: 1, description: "Single node" },
    {
      input: { root: [4, 2, 5, 1, 3], target: 3.5 },
      expected: 3,
      description: "Exact middle, return smaller",
    },
    { input: { root: [4, 2, 5, 1, 3], target: 2.0 }, expected: 2, description: "Exact match" },
  ],
}
