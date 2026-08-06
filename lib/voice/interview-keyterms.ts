/**
 * Keyterm prompting vocabulary for interview transcription.
 *
 * Deepgram picks words by likelihood, so rare technical terms lose to common
 * English that sounds similar: "Dijkstra" becomes "dexter", "memoize" becomes
 * "memorize", "deque" becomes "deck". Passing a term as `keyterm` raises its
 * prior for that connection and fixes exactly this class of error.
 *
 * This does NOT fix phrases that collide with ordinary English the model is
 * already confident about, such as "O of n" being heard as "on" - keyterm
 * cannot outrank a word the model believes it heard correctly. Those are
 * repaired after the fact in transcript-repair.ts.
 *
 * Keyterm prompting requires Nova-3 or newer. Deepgram recommends 20-50 terms
 * and caps the total at 500 tokens across all keyterms, so this list stays
 * focused on terms that are both common in interviews and reliably mis-heard.
 *
 * See https://developers.deepgram.com/docs/keyterm
 */

/** Data structures and algorithms vocabulary. */
const DSA_KEYTERMS = [
  "Dijkstra",
  "memoize",
  "memoization",
  "deque",
  "trie",
  "heapify",
  "quicksort",
  "mergesort",
  "backtracking",
  "adjacency list",
  "topological sort",
  "binary search",
  "linked list",
  "hash map",
  "sliding window",
  "two pointer",
  "dynamic programming",
  "breadth first search",
  "depth first search",
  "in place",
  "big O notation",
]

/** System design and backend vocabulary. */
const SYSTEM_DESIGN_KEYTERMS = [
  "idempotent",
  "idempotency",
  "sharding",
  "replication",
  "denormalize",
  "eventual consistency",
  "cache invalidation",
  "backpressure",
  "load balancer",
  "rate limiting",
  "Postgres",
  "Redis",
  "Kafka",
  "Kubernetes",
  "nginx",
  "gRPC",
  "GraphQL",
  "webhook",
  "OAuth",
  "B-tree",
  "LRU cache",
  "race condition",
  "mutex",
  "deadlock",
]

/**
 * The default keyterm list sent on every interview connection.
 *
 * Frozen because it is shared across every voice session; a caller that needs
 * scenario-specific terms should concatenate rather than mutate.
 */
export const INTERVIEW_KEYTERMS: readonly string[] = Object.freeze([
  ...DSA_KEYTERMS,
  ...SYSTEM_DESIGN_KEYTERMS,
])
