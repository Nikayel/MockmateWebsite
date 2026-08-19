import type { DSAScenario } from "../../types"

export const dsaSerializeDeserializeBstScenario: DSAScenario = {
  id: "dsa-serialize-deserialize-bst",
  title: "Serialize and Deserialize BST",
  type: "dsa",
  pattern: "binary-search-tree",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Design algorithm to serialize and deserialize a BST",
  tags: ["tree", "bst", "design", "string"],
  estimatedTime: 30,
  problemStatement: `You're building a Codec for binary search trees: serialize(root) flattens a BST into a single string, and deserialize(data) reads such a string and reconstructs a tree with identical structure and values. A full round trip through both methods must reproduce the original tree exactly.

The wire format is entirely yours to choose. Aim for a lean encoding rather than a padded one; part of the exercise is deciding how little information the string really has to carry.`,
  examples: [
    {
      input: "root = [6,4,9]",
      output: "[6,4,9]",
    },
    {
      input: "root = []",
      output: "[]",
    },
  ],
  constraints: [
    "The tree can hold anywhere from 0 to 10^4 nodes",
    "Values lie in 0 <= Node.val <= 10^4",
    "Whatever tree you receive is a valid binary search tree",
  ],
  hints: [
    "Preorder traversal uniquely defines a BST (no need for null markers)",
    "Use BST property during deserialization",
    "Pass bounds (min, max) to validate placement during rebuild",
  ],
  starterCode: {
    javascript: `class Codec {
  serialize(root) {
    // Serialize BST to string
  }

  deserialize(data) {
    // Deserialize string to BST
  }
}`,
    typescript: `class Codec {
  serialize(root: TreeNode | null): string {
    // Serialize BST to string
  }

  deserialize(data: string): TreeNode | null {
    // Deserialize string to BST
  }
}`,
    python: `class Codec:
    def serialize(self, root):
        # Serialize BST to string
        pass

    def deserialize(self, data):
        # Deserialize string to BST
        pass`,
    java: `public class Codec {
    public String serialize(TreeNode root) {
        // Serialize BST to string
        return "";
    }

    public TreeNode deserialize(String data) {
        // Deserialize string to BST
        return null;
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { root: [2, 1, 3] },
      expected: [2, 1, 3],
      description: "Simple BST",
    },
    {
      input: { root: [] },
      expected: [],
      description: "Empty tree",
    },
    {
      input: { root: [5, 3, 7, 2, 4, 6, 8] },
      expected: [5, 3, 7, 2, 4, 6, 8],
      description: "Complete BST",
    },
    {
      input: { root: [1, null, 2, null, 3] },
      expected: [1, null, 2, null, 3],
      description: "Right-skewed BST",
    },
  ],
}
