/**
 * Linked List DSA Scenarios
 * Pattern: linked-list
 */

import type { DSAScenario } from "../types"

export const linkedListScenarios: DSAScenario[] = [
  {
    id: "dsa-reverse-linked-list",
    title: "Reverse Linked List",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "easy",
    companies: ["Amazon", "Microsoft", "Meta", "Apple", "Google", "Snap"],
    description: "Reverse a singly linked list",
    tags: ["linked-list", "recursion"],
    estimatedTime: 15,
    problemStatement: `Given the head of a singly linked list, reverse the list, and return the reversed list.

Example visualization:

    Input:   1 → 2 → 3 → 4 → 5 → null

    Output:  5 → 4 → 3 → 2 → 1 → null

    Process (using 3 pointers):
    prev   curr  next
    null ← [1] → 2 → 3 → 4 → 5
           prev  curr next
    null ← 1 ← [2] → 3 → 4 → 5
                    ...and so on`,
    examples: [
      {
        input: "head = [1,2,3,4,5]",
        output: "[5,4,3,2,1]",
      },
      {
        input: "head = [1,2]",
        output: "[2,1]",
      },
      {
        input: "head = []",
        output: "[]",
      },
    ],
    constraints: [
      "The number of nodes in the list is the range [0, 5000]",
      "-5000 <= Node.val <= 5000",
    ],
    hints: [
      "Use three pointers: prev, current, and next",
      "Iterate through the list, reversing the links",
      "Return the new head (which was the last node)",
    ],
    starterCode: {
      javascript: `function reverseList(head) {
  // Write your solution here

}`,
      typescript: `function reverseList(head: ListNode | null): ListNode | null {
  // Write your solution here

}`,
      python: `def reverseList(head):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { values: [1, 2, 3, 4, 5] },
        expected: [5, 4, 3, 2, 1],
        description: "Reverse list: [1,2,3,4,5] -> [5,4,3,2,1]",
      },
      {
        input: { values: [1, 2] },
        expected: [2, 1],
        description: "Two nodes: [1,2] -> [2,1]",
      },
      {
        input: { values: [] },
        expected: [],
        description: "Empty list",
      },
      {
        input: { values: [1] },
        expected: [1],
        description: "Single node",
      },
      {
        input: { values: [1, 2, 3] },
        expected: [3, 2, 1],
        description: "Three nodes: [1,2,3] -> [3,2,1]",
      },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "What if the list is empty or has only one node?",
      "Can you do this iteratively and recursively? What are the trade-offs?",
      "What's the space complexity of your recursive approach vs iterative?",
      "What if you needed to reverse only a portion of the list?",
    ],

    midCodingProbes: [
      {
        trigger: "setting up three pointers",
        question: "Walk me through what each of prev, curr, and next represents at the start.",
      },
      {
        trigger: "moving pointers",
        question: "What happens to the original head node after the reversal completes?",
      },
      {
        trigger: "recursive approach",
        question: "What's your base case, and why?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Losing reference to next node before reassigning",
        codeSignals: ["curr.next = prev", "without saving next"],
        intervention:
          "Before you reassign curr.next, make sure you've saved the reference to the next node - otherwise you'll lose the rest of the list.",
      },
    ],
  },
  {
    id: "dsa-linked-list-cycle",
    title: "Linked List Cycle",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "easy",
    companies: ["Amazon", "Microsoft", "Meta", "Google", "Oracle"],
    description: "Detect if a linked list has a cycle",
    tags: ["linked-list", "two-pointers", "hash-table"],
    estimatedTime: 15,
    problemStatement: `Given head, the head of a linked list, determine if the linked list has a cycle in it.

There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer.

Return true if there is a cycle in the linked list. Otherwise, return false.

Example visualization:

    With cycle (pos=1):
    3 → 2 → 0 → -4
        ↑       ↓
        └───────┘

    No cycle:
    1 → 2 → 3 → 4 → null

    Floyd's Algorithm: slow (1 step), fast (2 steps)
    If they meet → cycle exists`,
    examples: [
      {
        input: "head = [3,2,0,-4], pos = 1",
        output: "true",
        explanation:
          "There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed).",
      },
      {
        input: "head = [1,2], pos = 0",
        output: "true",
      },
      {
        input: "head = [1], pos = -1",
        output: "false",
      },
    ],
    constraints: [
      "The number of nodes in the list is in the range [0, 10^4]",
      "-10^5 <= Node.val <= 10^5",
      "pos is -1 or a valid index in the linked-list",
    ],
    hints: [
      "Use Floyd's Cycle Detection Algorithm (slow and fast pointers)",
      "If there's a cycle, the fast pointer will eventually meet the slow pointer",
      "If fast reaches null, there's no cycle",
    ],
    starterCode: {
      javascript: `function hasCycle(head) {
  // Write your solution here

}`,
      typescript: `function hasCycle(head: ListNode | null): boolean {
  // Write your solution here

}`,
      python: `def hasCycle(head):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { values: [3, 2, 0, -4], pos: 1 },
        expected: true,
        description: "Cycle at position 1",
      },
      {
        input: { values: [1, 2], pos: 0 },
        expected: true,
        description: "Cycle at position 0",
      },
      {
        input: { values: [1], pos: -1 },
        expected: false,
        description: "No cycle, single node",
      },
      {
        input: { values: [1, 2, 3, 4], pos: -1 },
        expected: false,
        description: "No cycle, multiple nodes",
      },
      {
        input: { values: [], pos: -1 },
        expected: false,
        description: "Empty list",
      },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "Why does Floyd's algorithm work? Can you explain the math?",
      "What if the cycle includes all nodes vs just a few?",
      "Could you detect a cycle using O(n) space? Why is O(1) better here?",
      "What if you needed to find WHERE the cycle starts, not just IF it exists?",
    ],

    midCodingProbes: [
      {
        trigger: "initializing slow and fast pointers",
        question: "Why does fast move 2 steps while slow moves 1?",
      },
      {
        trigger: "while loop condition",
        question: "What conditions must you check to avoid null pointer errors?",
      },
      {
        trigger: "comparing slow and fast",
        question: "If they meet, does that always mean there's a cycle? Why?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Using a Set to store visited nodes",
        codeSignals: ["new Set", "visited", "seen", "O(n) space"],
        intervention:
          "That works but uses O(n) space. Can you think of a way to detect the cycle with O(1) space?",
      },
    ],
  },
  {
    id: "dsa-lru-cache",
    title: "LRU Cache",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "medium",
    companies: [
      "Google",
      "Amazon",
      "Meta",
      "Microsoft",
      "Roblox",
      "TikTok",
      "Snap",
      "Reddit",
      "Twitch",
    ],
    description: "Design a data structure that follows Least Recently Used (LRU) cache constraints",
    tags: ["hash-table", "linked-list", "design"],
    estimatedTime: 30,
    problemStatement: `Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.

Implement the LRUCache class:
- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.
- int get(int key) Return the value of the key if the key exists, otherwise return -1.
- void put(int key, int value) Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.

The functions get and put must each run in O(1) average time complexity.

Example visualization (capacity=2):

    ┌─────────────────────────────────────┐
    │  HashMap: O(1) lookup               │
    │  {1→NodeA, 2→NodeB}                 │
    └─────────────────────────────────────┘
              ↓           ↓
    ┌──────────────────────────────────────────┐
    │  Doubly Linked List (order of use):      │
    │  HEAD ↔ [1,1] ↔ [2,2] ↔ TAIL             │
    │         LRU     MRU                      │
    │  (evict ←)      (← new items go here)    │
    └──────────────────────────────────────────┘`,
    examples: [
      {
        input: "LRUCache(2); put(1,1); put(2,2); get(1); put(3,3); get(2)",
        output: "1, -1",
        explanation:
          "Cache is {1=1, 2=2}. get(1) returns 1. put(3,3) evicts key 2. get(2) returns -1 (not found).",
      },
    ],
    constraints: [
      "1 <= capacity <= 3000",
      "0 <= key <= 10^4",
      "0 <= value <= 10^5",
      "At most 2 * 10^5 calls will be made to get and put",
    ],
    hints: [
      "Use a HashMap for O(1) access",
      "Use a Doubly Linked List to maintain order of use",
      "Most recently used items should be at the front",
    ],
    starterCode: {
      javascript: `class LRUCache {
  constructor(capacity) {
    // Your implementation
  }

  get(key) {
    // Your implementation
  }

  put(key, value) {
    // Your implementation
  }
}`,
      typescript: `class LRUCache {
  constructor(capacity: number) {
    // Your implementation
  }

  get(key: number): number {
    // Your implementation
    return -1;
  }

  put(key: number, value: number): void {
    // Your implementation
  }
}`,
      python: `class LRUCache:
    def __init__(self, capacity: int):
        # Your implementation
        pass

    def get(self, key: int) -> int:
        # Your implementation
        return -1

    def put(self, key: int, value: int) -> None:
        # Your implementation
        pass`,
      java: `class LRUCache {
    public LRUCache(int capacity) {
        // Your implementation
    }

    public int get(int key) {
        // Your implementation
        return -1;
    }

    public void put(int key, int value) {
        // Your implementation
    }
}`,
      cpp: `class LRUCache {
public:
    LRUCache(int capacity) {
        // Your implementation
    }

    int get(int key) {
        // Your implementation
        return -1;
    }

    void put(int key, int value) {
        // Your implementation
    }
};`,
      csharp: `public class LRUCache {
    public LRUCache(int capacity) {
        // Your implementation
    }

    public int Get(int key) {
        // Your implementation
        return -1;
    }

    public void Put(int key, int value) {
        // Your implementation
    }
}`,
      go: `type LRUCache struct {
    // Your implementation
}

func Constructor(capacity int) LRUCache {
    // Your implementation
    return LRUCache{}
}

func (this *LRUCache) Get(key int) int {
    // Your implementation
    return -1
}

func (this *LRUCache) Put(key int, value int) {
    // Your implementation
}`,
      rust: `struct LRUCache {
    // Your implementation
}

impl LRUCache {
    fn new(capacity: i32) -> Self {
        // Your implementation
        LRUCache {}
    }

    fn get(&self, key: i32) -> i32 {
        // Your implementation
        -1
    }

    fn put(&mut self, key: i32, value: i32) {
        // Your implementation
    }
}`,
    },
    optimalComplexity: {
      time: "O(1)",
      space: "O(capacity)",
    },
    testCases: [
      {
        input: {
          operations: ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"],
          values: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
        },
        expected: [null, null, null, 1, null, -1, null, -1, 3, 4],
        description: "Basic LRU operations with capacity 2",
      },
      // Edge cases
      {
        input: { operations: ["LRUCache", "put", "get"], values: [[1], [1, 1], [1]] },
        expected: [null, null, 1],
        description: "Edge: Capacity 1",
      },
      {
        input: {
          operations: ["LRUCache", "put", "put", "get"],
          values: [[2], [1, 1], [1, 10], [1]],
        },
        expected: [null, null, null, 10],
        description: "Edge: Overwrite existing key",
      },
      {
        input: { operations: ["LRUCache", "get", "get"], values: [[2], [1], [2]] },
        expected: [null, -1, -1],
        description: "Edge: Get non-existent keys",
      },
      {
        input: {
          operations: ["LRUCache", "put", "put", "put", "get"],
          values: [[2], [1, 1], [2, 2], [3, 3], [1]],
        },
        expected: [null, null, null, null, -1],
        description: "Edge: LRU eviction (key 1 evicted)",
      },
      {
        input: {
          operations: ["LRUCache", "put", "put", "get", "put", "get"],
          values: [[2], [1, 1], [2, 2], [1], [3, 3], [2]],
        },
        expected: [null, null, null, 1, null, -1],
        description: "Edge: Get updates LRU order (key 2 evicted after get(1))",
      },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "Why do you need BOTH a hash map and a doubly linked list?",
      "What if capacity is 1? Does your solution handle that?",
      "How would you modify this for an LFU (Least Frequently Used) cache?",
      "What happens if put() is called with an existing key?",
    ],

    midCodingProbes: [
      {
        trigger: "creating hash map or dictionary",
        question: "What will you store as the value in your hash map?",
      },
      {
        trigger: "implementing get",
        question: "After get(), should the accessed node move in the list? Where?",
      },
      {
        trigger: "implementing put with eviction",
        question: "Which node do you evict, and how do you find it in O(1)?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Using only a hash map without linked list",
        codeSignals: ["only Map", "no linked list", "array for ordering"],
        intervention:
          "How will you track the access order and evict the least recently used item in O(1) without a linked list?",
      },
      {
        description: "Using singly linked list instead of doubly",
        codeSignals: ["singly linked", "no prev pointer"],
        intervention:
          "With a singly linked list, how would you remove a node in O(1)? You need to update the previous node's next pointer.",
      },
    ],
  },
  {
    id: "dsa-merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "ZipRecruiter"],
    description: "Merge two sorted linked lists into one sorted list.",
    tags: ["linked-list", "recursion", "two-pointers"],
    estimatedTime: 20,
    problemStatement: `You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.

Example visualization:

    list1:  1 → 2 → 4
    list2:  1 → 3 → 4

    Merge process:
    dummy → 1 → 1 → 2 → 3 → 4 → 4
            ↑       ↑       ↑
          from    from    from
          list2   list1   both

    Result: 1 → 1 → 2 → 3 → 4 → 4`,
    examples: [
      {
        input: "list1 = [1,2,4], list2 = [1,3,4]",
        output: "[1,1,2,3,4,4]",
      },
      {
        input: "list1 = [], list2 = []",
        output: "[]",
      },
      {
        input: "list1 = [], list2 = [0]",
        output: "[0]",
      },
    ],
    constraints: [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
      "Both list1 and list2 are sorted in non-decreasing order.",
    ],
    hints: [
      "Use a dummy node to simplify edge cases",
      "Compare values and link smaller node",
      "Don't forget to link remaining nodes",
    ],
    starterCode: {
      javascript: `function mergeTwoLists(list1, list2) {
  // Write your solution here

}`,
      typescript: `function mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null {
  // Write your solution here

}`,
      python: `def mergeTwoLists(list1, list2):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n + m)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { list1: [1, 2, 4], list2: [1, 3, 4] },
        expected: [1, 1, 2, 3, 4, 4],
        description: "Merge two lists with interleaving values",
      },
      {
        input: { list1: [], list2: [] },
        expected: [],
        description: "Both lists empty",
      },
      {
        input: { list1: [], list2: [0] },
        expected: [0],
        description: "One empty list",
      },
      {
        input: { list1: [1, 2, 3], list2: [4, 5, 6] },
        expected: [1, 2, 3, 4, 5, 6],
        description: "No interleaving needed",
      },
      {
        input: { list1: [5], list2: [1, 2, 4] },
        expected: [1, 2, 4, 5],
        description: "Single element in first list",
      },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "What if one list is empty?",
      "What if the lists have very different lengths?",
      "Could you do this recursively? What would the base case be?",
      "What's the space complexity of iterative vs recursive approach?",
    ],

    midCodingProbes: [
      {
        trigger: "using dummy node",
        question: "Why use a dummy node? What edge case does it simplify?",
      },
      {
        trigger: "comparing values",
        question: "After one list is exhausted, what do you do with the remaining nodes?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Not handling remaining nodes after one list ends",
        codeSignals: ["only handles equal length"],
        intervention:
          "What happens when you reach the end of one list but the other still has nodes?",
      },
    ],
  },
  {
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
  },
  {
    id: "dsa-reorder-list",
    title: "Reorder List",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Reorder list to L0→Ln→L1→Ln-1→L2→Ln-2→...",
    tags: ["linked-list", "two-pointers", "stack"],
    estimatedTime: 25,
    problemStatement: `You are given the head of a singly linked-list. Reorder it to: L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → ... You may not modify values in the list's nodes. Only nodes themselves may be changed.

Example visualization:

    Input:   1 → 2 → 3 → 4 → 5

    Step 1: Find middle → split into two halves
            1 → 2 → 3    and    4 → 5

    Step 2: Reverse second half
            1 → 2 → 3    and    5 → 4

    Step 3: Merge alternately
            1 → 5 → 2 → 4 → 3

    Output:  1 → 5 → 2 → 4 → 3`,
    examples: [
      { input: "head = [1,2,3,4]", output: "[1,4,2,3]" },
      { input: "head = [1,2,3,4,5]", output: "[1,5,2,4,3]" },
    ],
    constraints: ["The number of nodes is in the range [1, 5 * 10^4]", "1 <= Node.val <= 1000"],
    hints: [
      "Find the middle of the list",
      "Reverse the second half",
      "Merge two halves alternately",
    ],
    starterCode: {
      javascript: `function reorderList(head) {\n  // Write your solution here\n\n}`,
      typescript: `function reorderList(head: ListNode | null): void {\n  // Write your solution here\n\n}`,
      python: `def reorderList(head):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { head: [1, 2, 3, 4] }, expected: [1, 4, 2, 3], description: "Even length" },
      { input: { head: [1, 2, 3, 4, 5] }, expected: [1, 5, 2, 4, 3], description: "Odd length" },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "What if the list has only 1 or 2 nodes?",
      "How do you handle odd vs even length lists?",
      "Why do you need to reverse the second half?",
      "Could you solve this with O(n) space using a different approach?",
    ],

    midCodingProbes: [
      {
        trigger: "finding the middle",
        question: "For a list of 4 nodes, where should the middle be? What about 5 nodes?",
      },
      {
        trigger: "reversing second half",
        question: "After reversing, how are the two halves structured?",
      },
      {
        trigger: "merging halves",
        question: "Walk me through how you interleave the two halves.",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Using extra array to store values",
        codeSignals: ["store values", "array", "O(n) space"],
        intervention:
          "That works but uses O(n) space. The problem can be solved in O(1) space - think about modifying the list in place.",
      },
    ],
  },
  {
    id: "dsa-remove-nth-from-end",
    title: "Remove Nth Node From End of List",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Apple"],
    description: "Remove the nth node from the end of the list",
    tags: ["linked-list", "two-pointers"],
    estimatedTime: 20,
    problemStatement: `Given the head of a linked list, remove the nth node from the end of the list and return its head.

Example visualization (n=2):

    Input:   1 → 2 → 3 → [4] → 5
                         ↑
                    remove (2nd from end)

    Two-pointer approach:
    dummy → 1 → 2 → 3 → 4 → 5 → null
    slow         fast
    (fast moves n steps ahead first)

    Then move both until fast hits null:
    dummy → 1 → 2 → 3 → 4 → 5 → null
                slow        fast

    Remove slow.next → Output: 1 → 2 → 3 → 5`,
    examples: [
      { input: "head = [1,2,3,4,5], n = 2", output: "[1,2,3,5]" },
      { input: "head = [1], n = 1", output: "[]" },
      { input: "head = [1,2], n = 1", output: "[1]" },
    ],
    constraints: ["1 <= sz <= 30", "0 <= Node.val <= 100", "1 <= n <= sz"],
    hints: [
      "Use two pointers: fast and slow",
      "Move fast n steps ahead",
      "Then move both until fast reaches end",
    ],
    starterCode: {
      javascript: `function removeNthFromEnd(head, n) {\n  // Write your solution here\n\n}`,
      typescript: `function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {\n  // Write your solution here\n\n}`,
      python: `def removeNthFromEnd(head, n):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      {
        input: { head: [1, 2, 3, 4, 5], n: 2 },
        expected: [1, 2, 3, 5],
        description: "Remove 2nd from end",
      },
      { input: { head: [1], n: 1 }, expected: [], description: "Single node" },
      // Edge cases
      {
        input: { head: [1, 2], n: 2 },
        expected: [2],
        description: "Edge: Remove first node (head)",
      },
      { input: { head: [1, 2], n: 1 }, expected: [1], description: "Edge: Remove last node" },
      {
        input: { head: [1, 2, 3], n: 3 },
        expected: [2, 3],
        description: "Edge: n equals list length",
      },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "What if n equals the length of the list (removing the head)?",
      "Can you do this in one pass instead of two?",
      "What if n is larger than the list length?",
      "Why use a dummy node here?",
    ],

    midCodingProbes: [
      {
        trigger: "moving fast pointer n steps",
        question: "After fast moves n steps, what's the gap between fast and slow?",
      },
      {
        trigger: "reaching the node to remove",
        question: "You need to remove slow.next - why not slow itself?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Two-pass solution counting length first",
        codeSignals: ["count length", "two passes", "length - n"],
        intervention:
          "That works, but can you think of a way to do this in a single pass using two pointers?",
      },
    ],
  },
  {
    id: "dsa-add-two-numbers",
    title: "Add Two Numbers",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple"],
    description: "Add two numbers represented as reversed linked lists",
    tags: ["linked-list", "math", "recursion"],
    estimatedTime: 25,
    problemStatement: `You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each node contains a single digit. Add the two numbers and return the sum as a linked list.

Example visualization:

    l1: 2 → 4 → 3  (represents 342)
    l2: 5 → 6 → 4  (represents 465)
                   ─────────────────
    Sum: 342 + 465 = 807

    Process (right to left with carry):
    2+5=7 → 4+6=10(carry 1) → 3+4+1=8

    Output: 7 → 0 → 8  (represents 807)`,
    examples: [
      { input: "l1 = [2,4,3], l2 = [5,6,4]", output: "[7,0,8]", explanation: "342 + 465 = 807" },
      { input: "l1 = [0], l2 = [0]", output: "[0]" },
      { input: "l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]", output: "[8,9,9,9,0,0,0,1]" },
    ],
    constraints: [
      "The number of nodes is in the range [1, 100]",
      "0 <= Node.val <= 9",
      "The numbers do not contain leading zeros",
    ],
    hints: [
      "Iterate through both lists simultaneously",
      "Track carry for each addition",
      "Handle different list lengths",
    ],
    starterCode: {
      javascript: `function addTwoNumbers(l1, l2) {\n  // Write your solution here\n\n}`,
      typescript: `function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n  // Write your solution here\n\n}`,
      python: `def addTwoNumbers(l1, l2):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(max(n, m))", space: "O(max(n, m))" },
    testCases: [
      {
        input: { l1: [2, 4, 3], l2: [5, 6, 4] },
        expected: [7, 0, 8],
        description: "342 + 465 = 807",
      },
      { input: { l1: [0], l2: [0] }, expected: [0], description: "0 + 0" },
      // Edge cases
      {
        input: { l1: [9, 9], l2: [1] },
        expected: [0, 0, 1],
        description: "Edge: Carry creates new digit (99 + 1 = 100)",
      },
      {
        input: { l1: [1, 2, 3], l2: [4, 5] },
        expected: [5, 7, 3],
        description: "Edge: Different length lists (321 + 54 = 375)",
      },
      {
        input: { l1: [5], l2: [5] },
        expected: [0, 1],
        description: "Edge: Simple carry (5 + 5 = 10)",
      },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "What if the two numbers have different lengths?",
      "What if there's a carry at the very end (e.g., 99 + 1)?",
      "Why are the digits stored in reverse order? How does that help?",
      "What if the digits were stored in forward order instead?",
    ],

    midCodingProbes: [
      {
        trigger: "handling carry",
        question: "What values can the carry be? Just 0 or 1?",
      },
      {
        trigger: "loop termination",
        question: "When do you stop the loop? What if there's a remaining carry?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Converting lists to numbers, adding, then back to list",
        codeSignals: ["parseInt", "Number()", "toString", "convert to number"],
        intervention:
          "Be careful - the numbers can be very large (100 digits). Converting to integers might cause overflow. Can you add digit by digit instead?",
      },
    ],
  },
  {
    id: "dsa-linked-list-cycle-ii",
    title: "Linked List Cycle II",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "medium",
    companies: ["Amazon", "Microsoft", "Meta", "Google", "Apple"],
    description: "Find the node where the cycle begins in a linked list",
    tags: ["linked-list", "two-pointers", "hash-table"],
    estimatedTime: 25,
    problemStatement: `Given the head of a linked list, return the node where the cycle begins. If there is no cycle, return null.

There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer.

Do not modify the linked list.

Follow up: Can you solve it using O(1) memory?`,
    examples: [
      {
        input: "head = [3,2,0,-4], pos = 1",
        output: "Node at index 1 (value 2)",
        explanation: "There is a cycle, where tail connects to the second node.",
      },
      {
        input: "head = [1,2], pos = 0",
        output: "Node at index 0 (value 1)",
        explanation: "Tail connects to the first node.",
      },
      {
        input: "head = [1], pos = -1",
        output: "null",
        explanation: "There is no cycle.",
      },
    ],
    constraints: [
      "The number of the nodes in the list is in the range [0, 10^4]",
      "-10^5 <= Node.val <= 10^5",
      "pos is -1 or a valid index in the linked-list",
    ],
    hints: [
      "Use Floyd's Cycle Detection (fast/slow pointers) to detect cycle",
      "When they meet, move one pointer back to head",
      "Move both pointers one step at a time - they'll meet at cycle start",
      "Mathematical proof: distance from head to cycle start = distance from meeting point to cycle start",
    ],
    starterCode: {
      javascript: `function detectCycle(head) {
  // Write your solution here

}`,
      typescript: `function detectCycle(head: ListNode | null): ListNode | null {
  // Write your solution here

}`,
      python: `def detectCycle(head):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { values: [3, 2, 0, -4], pos: 1 }, expected: 1, description: "Cycle at index 1" },
      { input: { values: [1, 2], pos: 0 }, expected: 0, description: "Cycle at head" },
      { input: { values: [1], pos: -1 }, expected: null, description: "No cycle" },
      { input: { values: [1, 2, 3, 4, 5], pos: 2 }, expected: 2, description: "Cycle at middle" },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "How is this different from just detecting if a cycle exists?",
      "Can you explain why moving from head and meeting point converges at cycle start?",
      "What if the cycle starts at the head?",
      "What's the mathematical proof that this works?",
    ],

    midCodingProbes: [
      {
        trigger: "after detecting cycle meeting point",
        question: "Once slow and fast meet, what do you do next to find the cycle start?",
      },
      {
        trigger: "second phase with two pointers",
        question: "Why do both pointers move 1 step at a time in the second phase?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Using hash set to find first repeated node",
        codeSignals: ["Set", "visited", "seen.has"],
        intervention:
          "That uses O(n) space. Can you modify Floyd's algorithm to find the cycle start in O(1) space?",
      },
    ],
  },
  {
    id: "dsa-intersection-two-linked-lists",
    title: "Intersection of Two Linked Lists",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "easy",
    companies: ["Amazon", "Meta", "Microsoft", "Google", "Apple"],
    description: "Find the node where two linked lists intersect",
    tags: ["linked-list", "two-pointers", "hash-table"],
    estimatedTime: 20,
    problemStatement: `Given the heads of two singly linked-lists headA and headB, return the node at which the two lists intersect. If the two linked lists have no intersection at all, return null.

The linked lists must retain their original structure after the function returns.

Note that the linked lists may intersect at different positions, and the intersection is defined based on reference, not value.`,
    examples: [
      {
        input: "listA = [4,1,8,4,5], listB = [5,6,1,8,4,5], intersectVal = 8",
        output: "Reference to node with value 8",
        explanation: "The intersected node's value is 8.",
      },
      {
        input: "listA = [1,9,1,2,4], listB = [3,2,4], intersectVal = 2",
        output: "Reference to node with value 2",
      },
      {
        input: "listA = [2,6,4], listB = [1,5], intersectVal = 0",
        output: "null",
        explanation: "The two lists do not intersect.",
      },
    ],
    constraints: [
      "The number of nodes of listA is in the m.",
      "The number of nodes of listB is in the n.",
      "1 <= m, n <= 3 * 10^4",
      "1 <= Node.val <= 10^5",
    ],
    hints: [
      "Two pointer approach: traverse both lists",
      "When one reaches end, redirect to the other list's head",
      "If they intersect, they'll meet at intersection after at most m+n steps",
      "If no intersection, both will be null at the same time",
    ],
    starterCode: {
      javascript: `function getIntersectionNode(headA, headB) {
  // Write your solution here

}`,
      typescript: `function getIntersectionNode(headA: ListNode | null, headB: ListNode | null): ListNode | null {
  // Write your solution here

}`,
      python: `def getIntersectionNode(headA, headB):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(m + n)", space: "O(1)" },
    testCases: [
      {
        input: { listA: [4, 1, 8, 4, 5], listB: [5, 6, 1, 8, 4, 5], intersectAt: 8 },
        expected: 8,
        description: "Intersection exists",
      },
      {
        input: { listA: [1, 9, 1, 2, 4], listB: [3, 2, 4], intersectAt: 2 },
        expected: 2,
        description: "Different lengths",
      },
      {
        input: { listA: [2, 6, 4], listB: [1, 5], intersectAt: null },
        expected: null,
        description: "No intersection",
      },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "What if the lists have different lengths before the intersection?",
      "Why does the two-pointer approach work mathematically?",
      "Could you solve this with a hash set? What's the trade-off?",
      "What if both lists are the same list (intersect at head)?",
    ],

    midCodingProbes: [
      {
        trigger: "switching pointers to other list",
        question: "When pointer A reaches the end, why redirect it to headB?",
      },
      {
        trigger: "checking equality",
        question: "If there's no intersection, when do both pointers become null simultaneously?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Comparing node values instead of references",
        codeSignals: ["node.val ==", "value comparison"],
        intervention:
          "The intersection is about the same node reference, not the same value. Two different nodes could have the same value.",
      },
    ],
  },
  {
    id: "dsa-remove-duplicates-sorted-list",
    title: "Remove Duplicates from Sorted List",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "easy",
    companies: ["Amazon", "Microsoft", "Meta"],
    description: "Remove all duplicates from a sorted linked list",
    tags: ["linked-list"],
    estimatedTime: 15,
    problemStatement: `Given the head of a sorted linked list, delete all duplicates such that each element appears only once. Return the linked list sorted as well.`,
    examples: [
      { input: "head = [1,1,2]", output: "[1,2]" },
      { input: "head = [1,1,2,3,3]", output: "[1,2,3]" },
    ],
    constraints: [
      "The number of nodes in the list is in the range [0, 300].",
      "-100 <= Node.val <= 100",
      "The list is guaranteed to be sorted in ascending order.",
    ],
    hints: [
      "Since the list is sorted, duplicates will be adjacent",
      "Traverse the list and skip nodes with same value",
      "Update next pointer to skip duplicates",
    ],
    starterCode: {
      javascript: `function deleteDuplicates(head) {
  // Write your solution here

}`,
      typescript: `function deleteDuplicates(head: ListNode | null): ListNode | null {
  // Write your solution here

}`,
      python: `def deleteDuplicates(head):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { values: [1, 1, 2] }, expected: [1, 2], description: "Two duplicates" },
      {
        input: { values: [1, 1, 2, 3, 3] },
        expected: [1, 2, 3],
        description: "Multiple duplicates",
      },
      { input: { values: [] }, expected: [], description: "Empty list" },
      { input: { values: [1] }, expected: [1], description: "Single node" },
      { input: { values: [1, 1, 1] }, expected: [1], description: "All duplicates" },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "What if the list is empty or has one node?",
      "What if ALL nodes have the same value?",
      "How would this change if the list wasn't sorted?",
      "What if we needed to remove ALL occurrences including the first?",
    ],

    midCodingProbes: [
      {
        trigger: "comparing adjacent values",
        question: "When you find a duplicate, which node do you skip?",
      },
      {
        trigger: "updating next pointer",
        question: "What if there are three or more consecutive duplicates?",
      },
    ],
  },
  // ==================== NEW HIGH-VALUE ADDITIONS ====================
  {
    id: "dsa-palindrome-linked-list",
    title: "Palindrome Linked List",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "easy",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Check if a linked list is a palindrome",
    tags: ["linked-list", "two-pointers", "stack"],
    estimatedTime: 20,
    problemStatement: `Given the head of a singly linked list, return true if it is a palindrome or false otherwise.

Example visualization:

    Input: 1 → 2 → 2 → 1

    Step 1: Find middle (slow/fast pointers)
            1 → 2 | 2 → 1

    Step 2: Reverse second half
            1 → 2   1 → 2

    Step 3: Compare both halves
            1 = 1 ✓   2 = 2 ✓

    Output: true (is palindrome)`,
    examples: [
      { input: "head = [1,2,2,1]", output: "true" },
      { input: "head = [1,2]", output: "false" },
    ],
    constraints: [
      "The number of nodes in the list is in the range [1, 10^5].",
      "0 <= Node.val <= 9",
    ],
    hints: [
      "Find middle using slow/fast pointers",
      "Reverse second half of list",
      "Compare first half with reversed second half",
      "Can restore list by reversing again",
    ],
    starterCode: {
      javascript: `function isPalindrome(head) {\n  // Write your solution here\n\n}`,
      typescript: `function isPalindrome(head: ListNode | null): boolean {\n  // Write your solution here\n\n}`,
      python: `def isPalindrome(head):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { values: [1, 2, 2, 1] }, expected: true, description: "Even palindrome" },
      { input: { values: [1, 2] }, expected: false, description: "Not palindrome" },
      { input: { values: [1, 2, 1] }, expected: true, description: "Odd palindrome" },
      { input: { values: [1] }, expected: true, description: "Single node" },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "What's the space complexity of using a stack vs reversing in place?",
      "How do you handle odd vs even length lists?",
      "Should you restore the list to its original form after checking?",
      "What if the list has only 1 or 2 nodes?",
    ],

    midCodingProbes: [
      {
        trigger: "finding middle node",
        question: "Where should slow pointer end up for a list of length 4? Length 5?",
      },
      {
        trigger: "reversing second half",
        question: "After reversal, what does the original list look like?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Converting to array and checking",
        codeSignals: ["array", "values.push", "O(n) space"],
        intervention:
          "That works but uses O(n) space. Can you check palindrome in O(1) space by modifying the list?",
      },
    ],
  },
  {
    id: "dsa-middle-linked-list",
    title: "Middle of the Linked List",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "easy",
    companies: ["Amazon", "Meta", "Google"],
    description: "Find the middle node of a linked list",
    tags: ["linked-list", "two-pointers"],
    estimatedTime: 10,
    problemStatement: `Given the head of a singly linked list, return the middle node of the linked list.

If there are two middle nodes, return the second middle node.

Example visualization:

    Odd length:    1 → 2 → [3] → 4 → 5
                           ↑
                         middle

    Even length:   1 → 2 → 3 → [4] → 5 → 6
                               ↑
                         second middle

    Technique: slow (1 step) + fast (2 steps)
    When fast reaches end, slow is at middle`,
    examples: [
      { input: "head = [1,2,3,4,5]", output: "[3,4,5]", explanation: "The middle node is 3." },
      {
        input: "head = [1,2,3,4,5,6]",
        output: "[4,5,6]",
        explanation: "Two middle nodes 3 and 4, return 4.",
      },
    ],
    constraints: [
      "The number of nodes in the list is in the range [1, 100].",
      "1 <= Node.val <= 100",
    ],
    hints: [
      "Use slow and fast pointers",
      "Slow moves 1 step, fast moves 2 steps",
      "When fast reaches end, slow is at middle",
    ],
    starterCode: {
      javascript: `function middleNode(head) {\n  // Write your solution here\n\n}`,
      typescript: `function middleNode(head: ListNode | null): ListNode | null {\n  // Write your solution here\n\n}`,
      python: `def middleNode(head):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { values: [1, 2, 3, 4, 5] }, expected: [3, 4, 5], description: "Odd length" },
      {
        input: { values: [1, 2, 3, 4, 5, 6] },
        expected: [4, 5, 6],
        description: "Even length - second middle",
      },
      { input: { values: [1] }, expected: [1], description: "Single node" },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "For even-length lists, which middle node do you return?",
      "Could you find the middle without the two-pointer technique?",
      "What's the relationship between slow pointer position and list length?",
    ],

    midCodingProbes: [
      {
        trigger: "setting up slow and fast",
        question: "What should fast's initial position be? Same as slow or one ahead?",
      },
      {
        trigger: "loop condition",
        question: "When do you stop - when fast is null or when fast.next is null?",
      },
    ],
  },
  {
    id: "dsa-reverse-nodes-k-group",
    title: "Reverse Nodes in k-Group",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "hard",
    companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple"],
    description: "Reverse linked list nodes k at a time",
    tags: ["linked-list", "recursion"],
    estimatedTime: 35,
    problemStatement: `Given the head of a linked list, reverse the nodes of the list k at a time, and return the modified list.

k is a positive integer and is less than or equal to the length of the linked list. If the number of nodes is not a multiple of k then left-out nodes, in the end, should remain as it is.

You may not alter the values in the list's nodes, only nodes themselves may be changed.`,
    examples: [
      { input: "head = [1,2,3,4,5], k = 2", output: "[2,1,4,3,5]" },
      { input: "head = [1,2,3,4,5], k = 3", output: "[3,2,1,4,5]" },
    ],
    constraints: [
      "The number of nodes in the list is n.",
      "1 <= k <= n <= 5000",
      "0 <= Node.val <= 1000",
    ],
    hints: [
      "Count k nodes first to check if group exists",
      "Reverse k nodes at a time",
      "Connect reversed groups properly",
      "Use recursion or iterative with careful pointer management",
    ],
    starterCode: {
      javascript: `function reverseKGroup(head, k) {\n  // Write your solution here\n\n}`,
      typescript: `function reverseKGroup(head: ListNode | null, k: number): ListNode | null {\n  // Write your solution here\n\n}`,
      python: `def reverseKGroup(head, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { values: [1, 2, 3, 4, 5], k: 2 }, expected: [2, 1, 4, 3, 5], description: "k=2" },
      {
        input: { values: [1, 2, 3, 4, 5], k: 3 },
        expected: [3, 2, 1, 4, 5],
        description: "k=3, remaining 2",
      },
      { input: { values: [1, 2, 3], k: 1 }, expected: [1, 2, 3], description: "k=1, no change" },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "What happens to the remaining nodes if they're less than k?",
      "How do you connect reversed groups to each other?",
      "What if k equals the list length?",
      "Can you do this iteratively and recursively?",
    ],

    midCodingProbes: [
      {
        trigger: "counting k nodes",
        question: "Why do you need to count k nodes before reversing?",
      },
      {
        trigger: "connecting groups",
        question: "After reversing a group, what was the first node becomes what?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Not preserving remaining nodes less than k",
        codeSignals: ["reverse all", "ignoring remainder"],
        intervention:
          "The problem says if remaining nodes are less than k, leave them as is. How do you handle that?",
      },
    ],
  },
  {
    id: "dsa-sort-list",
    title: "Sort List",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Sort a linked list in O(n log n) time and O(1) space",
    tags: ["linked-list", "sorting", "merge-sort", "divide-and-conquer"],
    estimatedTime: 30,
    problemStatement: `Given the head of a linked list, return the list after sorting it in ascending order.`,
    examples: [
      { input: "head = [4,2,1,3]", output: "[1,2,3,4]" },
      { input: "head = [-1,5,3,4,0]", output: "[-1,0,3,4,5]" },
      { input: "head = []", output: "[]" },
    ],
    constraints: [
      "The number of nodes in the list is in the range [0, 5 * 10^4].",
      "-10^5 <= Node.val <= 10^5",
    ],
    hints: [
      "Use merge sort for O(n log n) time",
      "Find middle using slow/fast pointers",
      "Recursively sort two halves",
      "Merge two sorted lists",
    ],
    starterCode: {
      javascript: `function sortList(head) {\n  // Write your solution here\n\n}`,
      typescript: `function sortList(head: ListNode | null): ListNode | null {\n  // Write your solution here\n\n}`,
      python: `def sortList(head):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n log n)", space: "O(log n) for recursion" },
    testCases: [
      { input: { values: [4, 2, 1, 3] }, expected: [1, 2, 3, 4], description: "Standard sort" },
      {
        input: { values: [-1, 5, 3, 4, 0] },
        expected: [-1, 0, 3, 4, 5],
        description: "With negatives",
      },
      { input: { values: [] }, expected: [], description: "Empty list" },
      { input: { values: [1] }, expected: [1], description: "Single node" },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "Why is merge sort preferred over quick sort for linked lists?",
      "What's the space complexity of recursive merge sort on linked lists?",
      "Can you achieve O(1) space with bottom-up merge sort?",
      "How do you split the list in half without knowing its length?",
    ],

    midCodingProbes: [
      {
        trigger: "finding middle to split",
        question:
          "When you split at the middle, what must you do to actually separate the two halves?",
      },
      {
        trigger: "merging two sorted lists",
        question: "This merge step - haven't we seen this problem before?",
      },
    ],

    commonWrongApproaches: [
      {
        description: "Converting to array, sorting, rebuilding list",
        codeSignals: ["array", "sort()", "rebuild"],
        intervention:
          "That works but uses O(n) space. Can you sort the list in place using merge sort?",
      },
    ],
  },
  {
    id: "dsa-swap-nodes-pairs",
    title: "Swap Nodes in Pairs",
    type: "dsa",
    pattern: "linked-list",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Swap every two adjacent nodes in a linked list",
    tags: ["linked-list", "recursion"],
    estimatedTime: 20,
    problemStatement: `Given a linked list, swap every two adjacent nodes and return its head. You must solve the problem without modifying the values in the list's nodes (i.e., only nodes themselves may be changed.)`,
    examples: [
      { input: "head = [1,2,3,4]", output: "[2,1,4,3]" },
      { input: "head = []", output: "[]" },
      { input: "head = [1]", output: "[1]" },
    ],
    constraints: [
      "The number of nodes in the list is in the range [0, 100].",
      "0 <= Node.val <= 100",
    ],
    hints: [
      "Use dummy node to handle head swap",
      "Track prev, curr, next pointers",
      "Swap pairs and advance by 2",
      "Can also use recursion",
    ],
    starterCode: {
      javascript: `function swapPairs(head) {\n  // Write your solution here\n\n}`,
      typescript: `function swapPairs(head: ListNode | null): ListNode | null {\n  // Write your solution here\n\n}`,
      python: `def swapPairs(head):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { values: [1, 2, 3, 4] }, expected: [2, 1, 4, 3], description: "Even length" },
      { input: { values: [1, 2, 3] }, expected: [2, 1, 3], description: "Odd length" },
      { input: { values: [] }, expected: [], description: "Empty" },
      { input: { values: [1] }, expected: [1], description: "Single node" },
    ],

    // Proactive AI Interviewer Fields
    whatIfQuestions: [
      "What if there's an odd number of nodes?",
      "Is this similar to reverse nodes in k-group with k=2?",
      "What's different about the iterative vs recursive approach here?",
      "Why use a dummy node?",
    ],

    midCodingProbes: [
      {
        trigger: "swapping a pair",
        question: "When you swap nodes A and B, how many pointer reassignments do you need?",
      },
      {
        trigger: "advancing to next pair",
        question: "After swapping, where should your pointer be for the next iteration?",
      },
    ],
  },
]

export default linkedListScenarios
