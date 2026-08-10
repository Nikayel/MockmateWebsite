import type { DSAScenario } from "../../types"

export const dsaTimeBasedKeyValueStoreScenario: DSAScenario = {
  id: "dsa-time-based-key-value-store",
  title: "Time Based Key-Value Store",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Lyft", "Palantir"],
  roles: ["junior", "senior", "swe", "fdse"],
  description: "Design a time-based key-value store with get by timestamp",
  tags: ["binary-search", "design", "hash-table"],
  estimatedTime: 30,
  problemStatement: `Design a time-based key-value data structure that can store multiple values for the same key at different time stamps and retrieve the key's value at a certain timestamp.

Implement the TimeMap class:
- TimeMap() Initializes the object.
- void set(String key, String value, int timestamp) Stores the key with the value at the given timestamp.
- String get(String key, int timestamp) Returns a value such that set was called previously with timestamp_prev <= timestamp. If there are multiple such values, return the value with the largest timestamp_prev. If there are no values, return "".`,
  examples: [
    {
      input:
        '["TimeMap","set","get","get","set","get","get"]\n[[],["foo","bar",1],["foo",1],["foo",3],["foo","bar2",4],["foo",4],["foo",5]]',
      output: '[null,null,"bar","bar",null,"bar2","bar2"]',
    },
  ],
  constraints: [
    "1 <= key.length, value.length <= 100",
    "key and value consist of lowercase English letters and digits.",
    "1 <= timestamp <= 10^7",
    "All timestamps are strictly increasing for set.",
    "At most 2 * 10^5 calls to set and get.",
  ],
  hints: [
    "Store {key: [(timestamp, value), ...]} where list is sorted by timestamp",
    "Binary search for largest timestamp <= query timestamp",
    "Since timestamps are increasing, list is already sorted",
  ],
  starterCode: {
    javascript: `class TimeMap {\n  constructor() {\n    // Initialize\n  }\n\n  set(key, value, timestamp) {\n    // Store\n  }\n\n  get(key, timestamp) {\n    // Retrieve\n  }\n}`,
    typescript: `class TimeMap {\n  constructor() {\n    // Initialize\n  }\n\n  set(key: string, value: string, timestamp: number): void {\n    // Store\n  }\n\n  get(key: string, timestamp: number): string {\n    // Retrieve\n  }\n}`,
    python: `class TimeMap:\n    def __init__(self):\n        pass\n\n    def set(self, key, value, timestamp):\n        pass\n\n    def get(self, key, timestamp):\n        pass`,
  },
  optimalComplexity: { time: "O(1) set, O(log n) get", space: "O(n)" },
  testCases: [
    {
      input: {
        operations: ["TimeMap", "set", "get", "get"],
        args: [[], ["foo", "bar", 1], ["foo", 1], ["foo", 3]],
      },
      expected: [null, null, "bar", "bar"],
      description: "Basic operations",
    },
    // The single case above stored one value per key and never queried a missing one, so
    // keeping only the latest value (ignoring timestamps) and returning null instead of ""
    // both passed. Here get at time 3 must skip the later value stored at time 4, and the
    // last get asks for a key that was never set.
    {
      input: {
        operations: ["TimeMap", "set", "set", "get", "get", "get"],
        args: [[], ["foo", "bar", 1], ["foo", "bar2", 4], ["foo", 3], ["foo", 5], ["baz", 1]],
      },
      expected: [null, null, null, "bar", "bar2", ""],
      description: "Query before a later write, and a key that was never set",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why is the timestamps list naturally sorted?",
    "What if there's no value at or before the requested timestamp?",
    "What kind of binary search do you need - find exact, or find floor?",
    "Could you use a TreeMap instead? What's the trade-off?",
  ],

  midCodingProbes: [
    {
      trigger: "storing values",
      question: "What data structure do you use to store multiple values for the same key?",
    },
    {
      trigger: "binary search variant",
      question:
        "You need the largest timestamp <= query. How do you modify binary search for this?",
    },
  ],
}
