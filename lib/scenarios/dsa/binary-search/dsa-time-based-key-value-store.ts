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
  problemStatement: `Build a key-value store where every write carries a time stamp, so one key can accumulate many values over its history, and reads ask what a key's value was as of a given moment.

Concretely, implement the TimeMap class:
- TimeMap() sets up an empty store.
- void set(String key, String value, int timestamp) records value for key at time timestamp.
- String get(String key, int timestamp) considers every set made to key with a stamp at or before timestamp and returns the value from the latest of them. When nothing was stored for key that early, it returns "".`,
  examples: [
    {
      input:
        '["TimeMap","set","get","get","set","get","get"]\n[[],["plan","draft",2],["plan",2],["plan",6],["plan","final",7],["plan",7],["plan",9]]',
      output: '[null,null,"draft","draft",null,"final","final"]',
    },
  ],
  constraints: [
    "key and value each run from 1 to 100 characters.",
    "Lowercase English letters and digits are the only characters in key and value.",
    "timestamp lies between 1 and 10^7.",
    "Successive calls to set always arrive with strictly increasing timestamps.",
    "set and get are invoked at most 2 * 10^5 times combined.",
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
