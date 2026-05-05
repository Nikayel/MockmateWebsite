import type { DSAScenario } from "../../types"

export const copyListRandomPointerScenario: DSAScenario = {
  id: "dsa-copy-list-random-pointer",
  title: "Copy List with Random Pointer",
  type: "dsa",
  pattern: "linked-list",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Deep copy a linked list with random pointers.",
  tags: ["linked-list", "hash-table"],
  estimatedTime: 25,
  problemStatement: `A linked list of length n is given such that each node contains an additional random pointer, which could point to any node in the list, or null.

Construct a deep copy of the list. The deep copy should consist of exactly n brand new nodes, where each new node has its value set to the value of its corresponding original node. Both the next and random pointer of the new nodes should point to new nodes in the copied list such that the pointers in the original list and copied list represent the same list state.`,
  examples: [
    {
      input: "head = [[7,null],[13,0],[11,4],[10,2],[1,0]]",
      output: "[[7,null],[13,0],[11,4],[10,2],[1,0]]",
      explanation:
        "Each [val, random_index] pair represents a node with val and random pointing to node at random_index",
    },
    {
      input: "head = [[1,1],[2,1]]",
      output: "[[1,1],[2,1]]",
    },
    {
      input: "head = [[3,null],[3,0],[3,null]]",
      output: "[[3,null],[3,0],[3,null]]",
    },
  ],
  constraints: [
    "0 <= n <= 1000",
    "-10^4 <= Node.val <= 10^4",
    "Node.random is null or is pointing to some node in the linked list.",
  ],
  hints: [
    "Use HashMap to map old nodes to new nodes",
    "First pass: create all nodes",
    "Second pass: connect next and random pointers",
    "Alternative: Interleave new nodes with old, then separate",
  ],
  starterCode: {
    javascript: `function copyRandomList(head) {
// Write your solution here
// Each node has: val, next, random

}`,
    typescript: `function copyRandomList(head: Node | null): Node | null {
// Write your solution here

}`,
    python: `def copyRandomList(head):
  # Write your solution here
  # Each node has: val, next, random
  pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: {
        head: [
          [7, null],
          [13, 0],
          [11, 4],
          [10, 2],
          [1, 0],
        ],
      },
      expected: [
        [7, null],
        [13, 0],
        [11, 4],
        [10, 2],
        [1, 0],
      ],
      description: "List with various random pointers",
    },
    {
      input: {
        head: [
          [1, 1],
          [2, 1],
        ],
      },
      expected: [
        [1, 1],
        [2, 1],
      ],
      description: "Random pointing to same node",
    },
    {
      input: { head: [] },
      expected: [],
      description: "Empty list",
    },
    {
      input: { head: [[1, null]] },
      expected: [[1, null]],
      description: "Single node with null random",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What's the difference between shallow copy and deep copy here?",
    "What if multiple nodes have random pointing to the same node?",
    "Can you do this in O(1) space without a hash map?",
    "What if random points to the node itself?",
  ],

  midCodingProbes: [
    {
      trigger: "creating hash map for old to new",
      question: "In your first pass, are you creating the nodes or just storing references?",
    },
    {
      trigger: "connecting random pointers",
      question: "How do you find the corresponding new node for an old node's random pointer?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Trying to copy next and random in single pass",
      codeSignals: ["single pass", "one loop for everything"],
      intervention:
        "If you try to set the random pointer before all nodes are created, what happens if random points to a node you haven't created yet?",
    },
  ],
}
