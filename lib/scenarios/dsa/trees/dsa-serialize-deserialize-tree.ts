import type { DSAScenario } from "../../types"

export const serializeDeserializeTreeScenario: DSAScenario = {
  id: "dsa-serialize-deserialize-tree",
  title: "Serialize and Deserialize Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Roblox", "Snap", "TikTok", "Palantir"],
  roles: ["junior", "senior", "swe", "fdse"],
  description: "Flatten a binary tree to a string and rebuild it exactly.",
  tags: ["tree", "design", "dfs", "bfs"],
  estimatedTime: 35,
  problemStatement: `Your task is to move a binary tree through a string and bring it back intact. Serializing flattens the tree into a sequence of characters that could sit in a file or travel over a network; deserializing reads that sequence and rebuilds the structure it described.

Implement both halves of the Codec: serialize accepts root and emits a single string, and deserialize accepts that string as data and reconstructs a tree identical to the original. The wire format is entirely your call. The one contract that matters is the round trip: deserialize(serialize(root)) must hand back exactly the tree you started from.`,
  examples: [
    {
      input: "root = [8,3,9,null,null,6,2]",
      output: "[8,3,9,null,null,6,2]",
    },
    {
      input: "root = []",
      output: "[]",
    },
  ],
  constraints: [
    "A tree here holds anywhere from 0 to 10^4 nodes.",
    "Stored values run from -1000 to 1000.",
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
