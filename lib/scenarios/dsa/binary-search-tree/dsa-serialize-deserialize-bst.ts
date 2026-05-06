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
  problemStatement: `Serialization is converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment.

Design an algorithm to serialize and deserialize a binary search tree. There is no restriction on how your serialization/deserialization algorithm should work. You need to ensure that a binary search tree can be serialized to a string, and this string can be deserialized to the original tree structure.

The encoded string should be as compact as possible.`,
  examples: [
    {
      input: "root = [2,1,3]",
      output: "[2,1,3]",
    },
    {
      input: "root = []",
      output: "[]",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in range [0, 10^4]",
    "0 <= Node.val <= 10^4",
    "The input tree is guaranteed to be a binary search tree",
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
