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
  problemStatement: `You're given the head of a linked list with a twist: besides next, every one of its n nodes carries a second pointer called random, which may aim at any node in the list or at null.

Build a full deep copy of this structure. That means exactly n freshly allocated nodes, each holding the same value as its counterpart, with both next and random wired up so the copy's shape mirrors the original perfectly. No pointer inside the copy may lead back to a node from the original list. Return the head of the copy.`,
  examples: [
    {
      input: "head = [[12,null],[6,0],[9,4],[25,2],[3,1]]",
      output: "[[12,null],[6,0],[9,4],[25,2],[3,1]]",
      explanation:
        "Every entry is a [val, random_index] pair: the node's value plus the index of the node its random pointer targets (null when it targets nothing)",
    },
    {
      input: "head = [[4,0],[8,0]]",
      output: "[[4,0],[8,0]]",
    },
    {
      input: "head = [[7,null],[7,0],[7,null]]",
      output: "[[7,null],[7,0],[7,null]]",
    },
  ],
  constraints: [
    "The list length n can be anywhere from 0 to 1000",
    "Node values fit within -10^4 <= Node.val <= 10^4",
    "Every random pointer is either null or aimed at a node that belongs to the list.",
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
