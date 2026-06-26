import type { DSAScenario } from "../../types"

export const lruCacheScenario: DSAScenario = {
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
    "Palantir",
  ],
  roles: ["new-grad", "junior", "senior", "swe"],
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
}
