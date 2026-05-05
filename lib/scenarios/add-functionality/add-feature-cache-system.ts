import type { AddFunctionalityScenario } from "../types"

export const cacheSystemScenario: AddFunctionalityScenario = {
  id: "add-feature-cache-system",
  title: "Add TTL Expiration to Cache",
  type: "add-functionality",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Add time-to-live (TTL) expiration feature to an existing cache system",
  tags: ["cache", "data-structures", "time-based"],
  estimatedTime: 30,
  problemStatement: `You're working on a caching system. The existing cache supports get/set operations but doesn't support TTL expiration.

**Your task:**
1. Read the existing cache implementation
2. Add TTL support: entries should expire after a specified duration
3. Modify the get method to check expiration
4. Ensure expired entries don't count toward cache size
5. All existing tests must still pass

**Context:** This cache is used by multiple microservices. TTL is critical for avoiding stale data.`,
  featureRequirements: [
    "set(key, value, ttlMs) - store with optional TTL in milliseconds",
    "get(key) - returns null if expired or not found",
    "has(key) - returns false if expired",
    "delete(key) - removes entry",
    "size() - returns count of non-expired entries",
    "cleanup() - removes all expired entries",
  ],
  existingCode: {
    javascript: `// cache.js - Simple cache implementation
// TODO: Add TTL (time-to-live) expiration support

class Cache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.store = new Map();
  }

  /**
   * Store a value in the cache
   * @param {string} key - The cache key
   * @param {any} value - The value to store
   * @param {number} ttlMs - Time to live in milliseconds (optional)
   */
  set(key, value, ttlMs = null) {
    // TODO: Implement TTL support
    // Store the value along with expiration time if ttlMs is provided
    if (this.store.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    this.store.set(key, value);
  }

  /**
   * Get a value from the cache
   * @param {string} key - The cache key
   * @returns {any} The cached value or null if not found/expired
   */
  get(key) {
    // TODO: Check if entry is expired before returning
    return this.store.get(key) || null;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - The cache key
   * @returns {boolean}
   */
  has(key) {
    // TODO: Return false if expired
    return this.store.has(key);
  }

  /**
   * Delete a key from the cache
   * @param {string} key - The cache key
   * @returns {boolean} True if key was deleted
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Get count of non-expired entries
   * @returns {number}
   */
  size() {
    // TODO: Only count non-expired entries
    return this.store.size;
  }

  /**
   * Remove all expired entries
   * @returns {number} Number of entries removed
   */
  cleanup() {
    // TODO: Implement cleanup of expired entries
    return 0;
  }
}

// Test helper function - DO NOT MODIFY
function testCache(operations) {
  const cache = new Cache(10);
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'set':
        cache.set(op.key, op.value, op.ttl);
        results.push({ type: 'set', key: op.key });
        break;
      case 'get':
        results.push({ type: 'get', key: op.key, value: cache.get(op.key) });
        break;
      case 'has':
        results.push({ type: 'has', key: op.key, exists: cache.has(op.key) });
        break;
      case 'size':
        results.push({ type: 'size', count: cache.size() });
        break;
      case 'wait':
        // Simulate time passing (in test mode, we manipulate time)
        if (typeof op.ms === 'number') {
          // Advance mock time
          global.__mockTime = (global.__mockTime || Date.now()) + op.ms;
        }
        break;
      case 'cleanup':
        results.push({ type: 'cleanup', removed: cache.cleanup() });
        break;
    }
  }

  return results;
}`,
    python: `# cache.py - Simple cache implementation
# TODO: Add TTL (time-to-live) expiration support

import time

class Cache:
    def __init__(self, max_size=100):
        self.max_size = max_size
        self.store = {}

    def set(self, key, value, ttl_ms=None):
        """
        Store a value in the cache
        Args:
            key: The cache key
            value: The value to store
            ttl_ms: Time to live in milliseconds (optional)
        """
        # TODO: Implement TTL support
        # Store the value along with expiration time if ttl_ms is provided
        if len(self.store) >= self.max_size:
            # Remove first entry (oldest)
            first_key = next(iter(self.store))
            del self.store[first_key]
        self.store[key] = value

    def get(self, key):
        """
        Get a value from the cache
        Returns: The cached value or None if not found/expired
        """
        # TODO: Check if entry is expired before returning
        return self.store.get(key)

    def has(self, key):
        """Check if key exists and is not expired"""
        # TODO: Return False if expired
        return key in self.store

    def delete(self, key):
        """Delete a key from the cache"""
        if key in self.store:
            del self.store[key]
            return True
        return False

    def size(self):
        """Get count of non-expired entries"""
        # TODO: Only count non-expired entries
        return len(self.store)

    def cleanup(self):
        """Remove all expired entries"""
        # TODO: Implement cleanup of expired entries
        return 0


# Test helper function - DO NOT MODIFY
def test_cache(operations):
    cache = Cache(10)
    results = []

    for op in operations:
        if op['type'] == 'set':
            cache.set(op['key'], op['value'], op.get('ttl'))
            results.append({'type': 'set', 'key': op['key']})
        elif op['type'] == 'get':
            results.append({'type': 'get', 'key': op['key'], 'value': cache.get(op['key'])})
        elif op['type'] == 'has':
            results.append({'type': 'has', 'key': op['key'], 'exists': cache.has(op['key'])})
        elif op['type'] == 'size':
            results.append({'type': 'size', 'count': cache.size()})
        elif op['type'] == 'cleanup':
            results.append({'type': 'cleanup', 'removed': cache.cleanup()})

    return results`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "utils/time.js",
        content: `// Time utilities for cache
// Use these for time-based operations

function getCurrentTime() {
  // In tests, this may return mock time
  return global.__mockTime || Date.now();
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return getCurrentTime() >= expiresAt;
}

module.exports = { getCurrentTime, isExpired };`,
        description: "Time utilities - use getCurrentTime() instead of Date.now() for testability",
      },
    ],
    python: [
      {
        fileName: "utils/time_utils.py",
        content: `# Time utilities for cache
# Use these for time-based operations

_mock_time = None

def get_current_time():
    """Returns current time in milliseconds"""
    global _mock_time
    if _mock_time is not None:
        return _mock_time
    return int(time.time() * 1000)

def is_expired(expires_at):
    """Check if a timestamp has expired"""
    if expires_at is None:
        return False
    return get_current_time() >= expires_at`,
        description: "Time utilities - use get_current_time() for testability",
      },
    ],
  },
  hints: [
    "Store expiration timestamp along with value (e.g., { value, expiresAt })",
    "Calculate expiresAt as getCurrentTime() + ttlMs when setting",
    "In get(), check if entry exists AND is not expired",
    "Use the isExpired() utility from time.js",
    "For cleanup(), iterate through entries and delete expired ones",
  ],
  testCases: [
    {
      input: {
        operations: [
          { type: "set", key: "a", value: 1 },
          { type: "get", key: "a" },
        ],
      },
      expected: [
        { type: "set", key: "a" },
        { type: "get", key: "a", value: 1 },
      ],
      description: "Basic set and get without TTL",
    },
    {
      input: {
        operations: [
          { type: "set", key: "b", value: 2 },
          { type: "has", key: "b" },
          { type: "has", key: "c" },
        ],
      },
      expected: [
        { type: "set", key: "b" },
        { type: "has", key: "b", exists: true },
        { type: "has", key: "c", exists: false },
      ],
      description: "has() returns correct boolean",
    },
    {
      input: {
        operations: [
          { type: "set", key: "x", value: 10 },
          { type: "set", key: "y", value: 20 },
          { type: "size" },
        ],
      },
      expected: [
        { type: "set", key: "x" },
        { type: "set", key: "y" },
        { type: "size", count: 2 },
      ],
      description: "size() returns correct count",
    },
  ],
  acceptanceCriteria: [
    "All existing functionality still works",
    "TTL expiration works correctly",
    "Expired entries are not returned by get()",
    "size() only counts non-expired entries",
    "cleanup() removes expired entries",
  ],
}
