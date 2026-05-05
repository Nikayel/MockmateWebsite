import type { ProblemComplexityKnowledge } from "../../types"

export const validateBstComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-validate-bst",
  leetcodeNumber: 98,
  slug: "validate-binary-search-tree",
  problemTitle: "Validate Binary Search Tree",
  sourceUrl: "https://leetcode.com/problems/validate-binary-search-tree/",
  difficulty: "Medium",
  tags: ["Tree", "Depth-First Search", "Binary Search Tree", "Binary Tree"],
  approaches: [
    {
      name: "Recursive with Range",
      timeComplexity: "O(n)",
      spaceComplexity: "O(h)",
      tradeOff: "Elegant, passes valid range down",
      whenToUse: "Preferred approach",
      codePattern: "Check node in (min, max) range, update for children",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
    {
      name: "Inorder Traversal",
      timeComplexity: "O(n)",
      spaceComplexity: "O(h)",
      tradeOff: "BST inorder is sorted - just verify",
      whenToUse: "Alternative approach using BST property",
      codePattern: "Inorder traversal, check strictly increasing",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Only checking immediate children (not subtree property)",
    "Not handling equal values (BST typically requires strict inequality)",
    "Integer overflow with min/max bounds",
  ],
  keyOperations: [
    { operation: "Tree traversal", complexity: "O(n)" },
    { operation: "Range check", complexity: "O(1)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
