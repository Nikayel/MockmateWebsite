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
  problemStatement: `Given the root of a binary search tree and a target value, return the value in the BST that is closest to the target.

If there are multiple answers, print the smallest.`,
  examples: [
    {
      input: "root = [4,2,5,1,3], target = 3.714286",
      output: "4",
      explanation: "The closest value to 3.714286 is 4.",
    },
    {
      input: "root = [1], target = 4.428571",
      output: "1",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in range [1, 10^4]",
    "0 <= Node.val <= 10^9",
    "-10^9 <= target <= 10^9",
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
