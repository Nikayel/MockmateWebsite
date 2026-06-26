import type { DSAScenario } from "../../types"

export const serializeDeserializeTreeScenario: DSAScenario = {
  id: "dsa-serialize-deserialize-tree",
  title: "Serialize and Deserialize Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Roblox", "Snap", "TikTok", "Palantir"],
  roles: ["junior", "senior", "swe", "fdse"],
  description: "Design an algorithm to serialize and deserialize a binary tree.",
  tags: ["tree", "dfs", "bfs", "design"],
  estimatedTime: 35,
  problemStatement: `Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment.

Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.`,
  examples: [
    {
      input: "root = [1,2,3,null,null,4,5]",
      output: "[1,2,3,null,null,4,5]",
    },
    {
      input: "root = []",
      output: "[]",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 10^4].",
    "-1000 <= Node.val <= 1000",
  ],
  hints: [
    "Use preorder traversal with null markers",
    "Serialize: visit node, left, right (record nulls)",
    "Deserialize: recursively build tree from serialized string",
  ],
  starterCode: {
    javascript: `class Codec {
serialize(root) {
  // Encode tree to string

}

deserialize(data) {
  // Decode string to tree

}
}`,
    typescript: `class Codec {
serialize(root: TreeNode | null): string {
  // Encode tree to string

}

deserialize(data: string): TreeNode | null {
  // Decode string to tree

}
}`,
    python: `class Codec:
  def serialize(self, root):
      # Encode tree to string
      pass

  def deserialize(self, data):
      # Decode string to tree
      pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { root: [1, 2, 3, null, null, 4, 5] },
      expected: [1, 2, 3, null, null, 4, 5],
      description: "Standard binary tree",
    },
    {
      input: { root: [] },
      expected: [],
      description: "Empty tree",
    },
    {
      input: { root: [1] },
      expected: [1],
      description: "Single node",
    },
    {
      input: { root: [1, 2] },
      expected: [1, 2],
      description: "Left child only",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why use preorder traversal for serialization?",
    "How do you represent null nodes in your serialized string?",
    "Could you use BFS instead? What would change?",
    "What delimiter would you use and why does it matter?",
  ],

  midCodingProbes: [
    {
      trigger: "serialization format",
      question: "How will you distinguish between values and null markers?",
    },
    {
      trigger: "deserialization",
      question: "How do you know when to stop building the left subtree and start the right?",
    },
  ],
}
