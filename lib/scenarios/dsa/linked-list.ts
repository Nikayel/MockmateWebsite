/**
 * Linked List DSA Scenarios
 * Pattern: linked-list
 */

import type { DSAScenario } from '../types'

export const linkedListScenarios: DSAScenario[] = [
  {
    id: 'dsa-reverse-linked-list',
    title: 'Reverse Linked List',
    type: 'dsa',
    pattern: 'linked-list',
    difficulty: 'easy',
    companies: ['Amazon', 'Microsoft', 'Meta', 'Apple', 'Google'],
    description: 'Reverse a singly linked list',
    tags: ['linked-list', 'recursion'],
    estimatedTime: 15,
    problemStatement: `Given the head of a singly linked list, reverse the list, and return the reversed list.`,
    examples: [
      {
        input: 'head = [1,2,3,4,5]',
        output: '[5,4,3,2,1]',
      },
      {
        input: 'head = [1,2]',
        output: '[2,1]',
      },
      {
        input: 'head = []',
        output: '[]',
      },
    ],
    constraints: [
      'The number of nodes in the list is the range [0, 5000]',
      '-5000 <= Node.val <= 5000',
    ],
    hints: [
      'Use three pointers: prev, current, and next',
      'Iterate through the list, reversing the links',
      'Return the new head (which was the last node)',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { values: [1, 2, 3, 4, 5] },
        expected: [5, 4, 3, 2, 1],
        description: 'Reverse list: [1,2,3,4,5] -> [5,4,3,2,1]',
      },
      {
        input: { values: [1, 2] },
        expected: [2, 1],
        description: 'Two nodes: [1,2] -> [2,1]',
      },
      {
        input: { values: [] },
        expected: [],
        description: 'Empty list',
      },
      {
        input: { values: [1] },
        expected: [1],
        description: 'Single node',
      },
      {
        input: { values: [1, 2, 3] },
        expected: [3, 2, 1],
        description: 'Three nodes: [1,2,3] -> [3,2,1]',
      },
    ],
  },
  {
    id: 'dsa-linked-list-cycle',
    title: 'Linked List Cycle',
    type: 'dsa',
    pattern: 'linked-list',
    difficulty: 'easy',
    companies: ['Amazon', 'Microsoft', 'Meta', 'Google'],
    description: 'Detect if a linked list has a cycle',
    tags: ['linked-list', 'two-pointers', 'hash-table'],
    estimatedTime: 15,
    problemStatement: `Given head, the head of a linked list, determine if the linked list has a cycle in it.

There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer.

Return true if there is a cycle in the linked list. Otherwise, return false.`,
    examples: [
      {
        input: 'head = [3,2,0,-4], pos = 1',
        output: 'true',
        explanation: 'There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed).',
      },
      {
        input: 'head = [1,2], pos = 0',
        output: 'true',
      },
      {
        input: 'head = [1], pos = -1',
        output: 'false',
      },
    ],
    constraints: [
      'The number of nodes in the list is in the range [0, 10^4]',
      '-10^5 <= Node.val <= 10^5',
      'pos is -1 or a valid index in the linked-list',
    ],
    hints: [
      'Use Floyd\'s Cycle Detection Algorithm (slow and fast pointers)',
      'If there\'s a cycle, the fast pointer will eventually meet the slow pointer',
      'If fast reaches null, there\'s no cycle',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { values: [3, 2, 0, -4], pos: 1 },
        expected: true,
        description: 'Cycle at position 1',
      },
      {
        input: { values: [1, 2], pos: 0 },
        expected: true,
        description: 'Cycle at position 0',
      },
      {
        input: { values: [1], pos: -1 },
        expected: false,
        description: 'No cycle, single node',
      },
      {
        input: { values: [1, 2, 3, 4], pos: -1 },
        expected: false,
        description: 'No cycle, multiple nodes',
      },
      {
        input: { values: [], pos: -1 },
        expected: false,
        description: 'Empty list',
      },
    ],
  },
  {
    id: 'dsa-lru-cache',
    title: 'LRU Cache',
    type: 'dsa',
    pattern: 'linked-list',
    difficulty: 'medium',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft'],
    description: 'Design a data structure that follows Least Recently Used (LRU) cache constraints',
    tags: ['hash-table', 'linked-list', 'design'],
    estimatedTime: 30,
    problemStatement: `Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.

Implement the LRUCache class:
- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.
- int get(int key) Return the value of the key if the key exists, otherwise return -1.
- void put(int key, int value) Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.

The functions get and put must each run in O(1) average time complexity.`,
    examples: [
      {
        input: 'LRUCache(2); put(1,1); put(2,2); get(1); put(3,3); get(2)',
        output: '1, -1',
        explanation: 'Cache is {1=1, 2=2}. get(1) returns 1. put(3,3) evicts key 2. get(2) returns -1 (not found).',
      },
    ],
    constraints: [
      '1 <= capacity <= 3000',
      '0 <= key <= 10^4',
      '0 <= value <= 10^5',
      'At most 2 * 10^5 calls will be made to get and put',
    ],
    hints: [
      'Use a HashMap for O(1) access',
      'Use a Doubly Linked List to maintain order of use',
      'Most recently used items should be at the front',
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
      time: 'O(1)',
      space: 'O(capacity)',
    },
    testCases: [
      {
        input: { operations: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get'], values: [[2], [1,1], [2,2], [1], [3,3], [2], [4,4], [1], [3], [4]] },
        expected: [null, null, null, 1, null, -1, null, -1, 3, 4],
        description: 'Basic LRU operations with capacity 2',
      },
    ],
  },
  {
    id: 'dsa-merge-two-sorted-lists',
    title: 'Merge Two Sorted Lists',
    type: 'dsa',
    pattern: 'linked-list',
    difficulty: 'easy',
    companies: ["Amazon", "Google", "Meta"],
    description: 'Merge two sorted linked lists into one sorted list.',
    tags: ["linked-list", "recursion", "two-pointers"],
    estimatedTime: 20,
    problemStatement: `You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.`,
    examples: [
    {
      input: 'list1 = [1,2,4], list2 = [1,3,4]',
      output: '[1,1,2,3,4,4]'
    },
    {
      input: 'list1 = [], list2 = []',
      output: '[]'
    },
    {
      input: 'list1 = [], list2 = [0]',
      output: '[0]'
    }
  ],
    constraints: [
    'The number of nodes in both lists is in the range [0, 50].',
    '-100 <= Node.val <= 100',
    'Both list1 and list2 are sorted in non-decreasing order.'
  ],
    hints: [
    'Use a dummy node to simplify edge cases',
    'Compare values and link smaller node',
    "Don't forget to link remaining nodes"
  ],
    starterCode: {
      javascript: `function merge_two_sorted_lists() {
  // Your code here
}`,
      python: `def merge_two_sorted_lists():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(n + m)',
      space: 'O(1)'
    },
    testCases: []
  },
  {
    id: 'dsa-copy-list-random-pointer',
    title: 'Copy List with Random Pointer',
    type: 'dsa',
    pattern: 'linked-list',
    difficulty: 'medium',
    companies: ["Amazon", "Google", "Meta"],
    description: 'Deep copy a linked list with random pointers.',
    tags: ["linked-list", "hash-table"],
    estimatedTime: 25,
    problemStatement: `A linked list of length n is given such that each node contains an additional random pointer, which could point to any node in the list, or null. Construct a deep copy of the list.`,
    examples: [
    {
      input: '[[7,null],[13,0],[11,4],[10,2],[1,0]]',
      output: '[[7,null],[13,0],[11,4],[10,2],[1,0]]'
    }
  ],
    constraints: [
    '0 <= n <= 1000',
    '-10^4 <= Node.val <= 10^4',
    'Node.random is null or is pointing to some node in the linked list.'
  ],
    hints: [
    'Use HashMap to map old nodes to new nodes',
    'First pass: create all nodes',
    'Second pass: connect next and random pointers'
  ],
    starterCode: {
      javascript: `function copy_list_random_pointer() {
  // Your code here
}`,
      python: `def copy_list_random_pointer():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)'
    },
    testCases: []
  },
  {
    id: 'dsa-reorder-list',
    title: 'Reorder List',
    type: 'dsa',
    pattern: 'linked-list',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    description: 'Reorder list to L0→Ln→L1→Ln-1→L2→Ln-2→...',
    tags: ['linked-list', 'two-pointers', 'stack'],
    estimatedTime: 25,
    problemStatement: `You are given the head of a singly linked-list. Reorder it to: L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → ... You may not modify values in the list's nodes. Only nodes themselves may be changed.`,
    examples: [
      { input: 'head = [1,2,3,4]', output: '[1,4,2,3]' },
      { input: 'head = [1,2,3,4,5]', output: '[1,5,2,4,3]' },
    ],
    constraints: ['The number of nodes is in the range [1, 5 * 10^4]', '1 <= Node.val <= 1000'],
    hints: ['Find the middle of the list', 'Reverse the second half', 'Merge two halves alternately'],
    starterCode: {
      javascript: `function reorderList(head) {\n  // Write your solution here\n\n}`,
      typescript: `function reorderList(head: ListNode | null): void {\n  // Write your solution here\n\n}`,
      python: `def reorderList(head):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(n)', space: 'O(1)' },
    testCases: [
      { input: { head: [1,2,3,4] }, expected: [1,4,2,3], description: 'Even length' },
      { input: { head: [1,2,3,4,5] }, expected: [1,5,2,4,3], description: 'Odd length' },
    ],
  },
  {
    id: 'dsa-remove-nth-from-end',
    title: 'Remove Nth Node From End of List',
    type: 'dsa',
    pattern: 'linked-list',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Apple'],
    description: 'Remove the nth node from the end of the list',
    tags: ['linked-list', 'two-pointers'],
    estimatedTime: 20,
    problemStatement: `Given the head of a linked list, remove the nth node from the end of the list and return its head.`,
    examples: [
      { input: 'head = [1,2,3,4,5], n = 2', output: '[1,2,3,5]' },
      { input: 'head = [1], n = 1', output: '[]' },
      { input: 'head = [1,2], n = 1', output: '[1]' },
    ],
    constraints: ['1 <= sz <= 30', '0 <= Node.val <= 100', '1 <= n <= sz'],
    hints: ['Use two pointers: fast and slow', 'Move fast n steps ahead', 'Then move both until fast reaches end'],
    starterCode: {
      javascript: `function removeNthFromEnd(head, n) {\n  // Write your solution here\n\n}`,
      typescript: `function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {\n  // Write your solution here\n\n}`,
      python: `def removeNthFromEnd(head, n):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(n)', space: 'O(1)' },
    testCases: [
      { input: { head: [1,2,3,4,5], n: 2 }, expected: [1,2,3,5], description: 'Remove 2nd from end' },
      { input: { head: [1], n: 1 }, expected: [], description: 'Single node' },
    ],
  },
  {
    id: 'dsa-add-two-numbers',
    title: 'Add Two Numbers',
    type: 'dsa',
    pattern: 'linked-list',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Apple'],
    description: 'Add two numbers represented as reversed linked lists',
    tags: ['linked-list', 'math', 'recursion'],
    estimatedTime: 25,
    problemStatement: `You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each node contains a single digit. Add the two numbers and return the sum as a linked list.`,
    examples: [
      { input: 'l1 = [2,4,3], l2 = [5,6,4]', output: '[7,0,8]', explanation: '342 + 465 = 807' },
      { input: 'l1 = [0], l2 = [0]', output: '[0]' },
      { input: 'l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]', output: '[8,9,9,9,0,0,0,1]' },
    ],
    constraints: ['The number of nodes is in the range [1, 100]', '0 <= Node.val <= 9', 'The numbers do not contain leading zeros'],
    hints: ['Iterate through both lists simultaneously', 'Track carry for each addition', 'Handle different list lengths'],
    starterCode: {
      javascript: `function addTwoNumbers(l1, l2) {\n  // Write your solution here\n\n}`,
      typescript: `function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n  // Write your solution here\n\n}`,
      python: `def addTwoNumbers(l1, l2):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: 'O(max(n, m))', space: 'O(max(n, m))' },
    testCases: [
      { input: { l1: [2,4,3], l2: [5,6,4] }, expected: [7,0,8], description: '342 + 465 = 807' },
      { input: { l1: [0], l2: [0] }, expected: [0], description: '0 + 0' },
    ],
  },
]

export default linkedListScenarios
