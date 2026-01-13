/**
 * LeetCode Problem Mapping
 *
 * Maps our internal scenario IDs to LeetCode problem numbers and slugs.
 * This enables automated scraping of complexity data from LeetCode editorials.
 *
 * IMPORTANT: All mappings must be verified against actual LeetCode problems.
 * The leetcodeNumber and slug must match the official LeetCode URL:
 * https://leetcode.com/problems/{slug}/
 */

export interface LeetCodeMapping {
  scenarioId: string
  leetcodeNumber: number
  slug: string // URL slug for LeetCode API/scraping
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  hasEditorial: boolean // Whether LeetCode has an official editorial
}

/**
 * Verified LeetCode mappings for our DSA scenarios
 *
 * Sources:
 * - LeetCode problem pages
 * - NeetCode 150 list
 * - Blind 75 list
 */
export const LEETCODE_MAPPINGS: LeetCodeMapping[] = [
  // ============================================
  // Arrays & Hashing
  // ============================================
  {
    scenarioId: "dsa-two-sum",
    leetcodeNumber: 1,
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-contains-duplicate",
    leetcodeNumber: 217,
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-valid-anagram",
    leetcodeNumber: 242,
    slug: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-group-anagrams",
    leetcodeNumber: 49,
    slug: "group-anagrams",
    title: "Group Anagrams",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-top-k-frequent",
    leetcodeNumber: 347,
    slug: "top-k-frequent-elements",
    title: "Top K Frequent Elements",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-product-except-self",
    leetcodeNumber: 238,
    slug: "product-of-array-except-self",
    title: "Product of Array Except Self",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-longest-consecutive",
    leetcodeNumber: 128,
    slug: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    difficulty: "Medium",
    hasEditorial: true,
  },

  // ============================================
  // Two Pointers
  // ============================================
  {
    scenarioId: "dsa-valid-palindrome",
    leetcodeNumber: 125,
    slug: "valid-palindrome",
    title: "Valid Palindrome",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-three-sum",
    leetcodeNumber: 15,
    slug: "3sum",
    title: "3Sum",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-container-water",
    leetcodeNumber: 11,
    slug: "container-with-most-water",
    title: "Container With Most Water",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-trapping-rain-water",
    leetcodeNumber: 42,
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    hasEditorial: true,
  },

  // ============================================
  // Sliding Window
  // ============================================
  {
    scenarioId: "dsa-best-time-buy-sell",
    leetcodeNumber: 121,
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-longest-substring",
    leetcodeNumber: 3,
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-longest-repeating-replacement",
    leetcodeNumber: 424,
    slug: "longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-min-window-substring",
    leetcodeNumber: 76,
    slug: "minimum-window-substring",
    title: "Minimum Window Substring",
    difficulty: "Hard",
    hasEditorial: true,
  },

  // ============================================
  // Stack
  // ============================================
  {
    scenarioId: "dsa-valid-parentheses",
    leetcodeNumber: 20,
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-min-stack",
    leetcodeNumber: 155,
    slug: "min-stack",
    title: "Min Stack",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-daily-temperatures",
    leetcodeNumber: 739,
    slug: "daily-temperatures",
    title: "Daily Temperatures",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-largest-rectangle-histogram",
    leetcodeNumber: 84,
    slug: "largest-rectangle-in-histogram",
    title: "Largest Rectangle in Histogram",
    difficulty: "Hard",
    hasEditorial: true,
  },

  // ============================================
  // Binary Search
  // ============================================
  {
    scenarioId: "dsa-binary-search",
    leetcodeNumber: 704,
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-search-rotated-array",
    leetcodeNumber: 33,
    slug: "search-in-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-find-min-rotated",
    leetcodeNumber: 153,
    slug: "find-minimum-in-rotated-sorted-array",
    title: "Find Minimum in Rotated Sorted Array",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-median-two-arrays",
    leetcodeNumber: 4,
    slug: "median-of-two-sorted-arrays",
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    hasEditorial: true,
  },

  // ============================================
  // Linked List
  // ============================================
  {
    scenarioId: "dsa-reverse-linked-list",
    leetcodeNumber: 206,
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-merge-two-lists",
    leetcodeNumber: 21,
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-linked-list-cycle",
    leetcodeNumber: 141,
    slug: "linked-list-cycle",
    title: "Linked List Cycle",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-reorder-list",
    leetcodeNumber: 143,
    slug: "reorder-list",
    title: "Reorder List",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-remove-nth-node",
    leetcodeNumber: 19,
    slug: "remove-nth-node-from-end-of-list",
    title: "Remove Nth Node From End of List",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-lru-cache",
    leetcodeNumber: 146,
    slug: "lru-cache",
    title: "LRU Cache",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-merge-k-lists",
    leetcodeNumber: 23,
    slug: "merge-k-sorted-lists",
    title: "Merge k Sorted Lists",
    difficulty: "Hard",
    hasEditorial: true,
  },

  // ============================================
  // Trees
  // ============================================
  {
    scenarioId: "dsa-invert-binary-tree",
    leetcodeNumber: 226,
    slug: "invert-binary-tree",
    title: "Invert Binary Tree",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-max-depth-tree",
    leetcodeNumber: 104,
    slug: "maximum-depth-of-binary-tree",
    title: "Maximum Depth of Binary Tree",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-same-tree",
    leetcodeNumber: 100,
    slug: "same-tree",
    title: "Same Tree",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-subtree-another-tree",
    leetcodeNumber: 572,
    slug: "subtree-of-another-tree",
    title: "Subtree of Another Tree",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-lowest-common-ancestor",
    leetcodeNumber: 235,
    slug: "lowest-common-ancestor-of-a-binary-search-tree",
    title: "Lowest Common Ancestor of a Binary Search Tree",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-level-order-traversal",
    leetcodeNumber: 102,
    slug: "binary-tree-level-order-traversal",
    title: "Binary Tree Level Order Traversal",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-validate-bst",
    leetcodeNumber: 98,
    slug: "validate-binary-search-tree",
    title: "Validate Binary Search Tree",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-kth-smallest-bst",
    leetcodeNumber: 230,
    slug: "kth-smallest-element-in-a-bst",
    title: "Kth Smallest Element in a BST",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-binary-tree-max-path",
    leetcodeNumber: 124,
    slug: "binary-tree-maximum-path-sum",
    title: "Binary Tree Maximum Path Sum",
    difficulty: "Hard",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-serialize-deserialize",
    leetcodeNumber: 297,
    slug: "serialize-and-deserialize-binary-tree",
    title: "Serialize and Deserialize Binary Tree",
    difficulty: "Hard",
    hasEditorial: true,
  },

  // ============================================
  // Heap / Priority Queue
  // ============================================
  {
    scenarioId: "dsa-kth-largest",
    leetcodeNumber: 215,
    slug: "kth-largest-element-in-an-array",
    title: "Kth Largest Element in an Array",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-task-scheduler",
    leetcodeNumber: 621,
    slug: "task-scheduler",
    title: "Task Scheduler",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-find-median-stream",
    leetcodeNumber: 295,
    slug: "find-median-from-data-stream",
    title: "Find Median from Data Stream",
    difficulty: "Hard",
    hasEditorial: true,
  },

  // ============================================
  // Graphs
  // ============================================
  {
    scenarioId: "dsa-number-of-islands",
    leetcodeNumber: 200,
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-clone-graph",
    leetcodeNumber: 133,
    slug: "clone-graph",
    title: "Clone Graph",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-pacific-atlantic",
    leetcodeNumber: 417,
    slug: "pacific-atlantic-water-flow",
    title: "Pacific Atlantic Water Flow",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-course-schedule",
    leetcodeNumber: 207,
    slug: "course-schedule",
    title: "Course Schedule",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-graph-valid-tree",
    leetcodeNumber: 261,
    slug: "graph-valid-tree",
    title: "Graph Valid Tree",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-word-ladder",
    leetcodeNumber: 127,
    slug: "word-ladder",
    title: "Word Ladder",
    difficulty: "Hard",
    hasEditorial: true,
  },

  // ============================================
  // Dynamic Programming
  // ============================================
  {
    scenarioId: "dsa-climbing-stairs",
    leetcodeNumber: 70,
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-house-robber",
    leetcodeNumber: 198,
    slug: "house-robber",
    title: "House Robber",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-house-robber-ii",
    leetcodeNumber: 213,
    slug: "house-robber-ii",
    title: "House Robber II",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-longest-palindromic",
    leetcodeNumber: 5,
    slug: "longest-palindromic-substring",
    title: "Longest Palindromic Substring",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-palindromic-substrings",
    leetcodeNumber: 647,
    slug: "palindromic-substrings",
    title: "Palindromic Substrings",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-decode-ways",
    leetcodeNumber: 91,
    slug: "decode-ways",
    title: "Decode Ways",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-coin-change",
    leetcodeNumber: 322,
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-max-product-subarray",
    leetcodeNumber: 152,
    slug: "maximum-product-subarray",
    title: "Maximum Product Subarray",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-word-break",
    leetcodeNumber: 139,
    slug: "word-break",
    title: "Word Break",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-longest-increasing-subseq",
    leetcodeNumber: 300,
    slug: "longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-unique-paths",
    leetcodeNumber: 62,
    slug: "unique-paths",
    title: "Unique Paths",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-longest-common-subseq",
    leetcodeNumber: 1143,
    slug: "longest-common-subsequence",
    title: "Longest Common Subsequence",
    difficulty: "Medium",
    hasEditorial: true,
  },

  // ============================================
  // Backtracking
  // ============================================
  {
    scenarioId: "dsa-subsets",
    leetcodeNumber: 78,
    slug: "subsets",
    title: "Subsets",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-combination-sum",
    leetcodeNumber: 39,
    slug: "combination-sum",
    title: "Combination Sum",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-permutations",
    leetcodeNumber: 46,
    slug: "permutations",
    title: "Permutations",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-word-search",
    leetcodeNumber: 79,
    slug: "word-search",
    title: "Word Search",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-n-queens",
    leetcodeNumber: 51,
    slug: "n-queens",
    title: "N-Queens",
    difficulty: "Hard",
    hasEditorial: true,
  },

  // ============================================
  // Greedy
  // ============================================
  {
    scenarioId: "dsa-max-subarray",
    leetcodeNumber: 53,
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-jump-game",
    leetcodeNumber: 55,
    slug: "jump-game",
    title: "Jump Game",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-jump-game-ii",
    leetcodeNumber: 45,
    slug: "jump-game-ii",
    title: "Jump Game II",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-gas-station",
    leetcodeNumber: 134,
    slug: "gas-station",
    title: "Gas Station",
    difficulty: "Medium",
    hasEditorial: true,
  },

  // ============================================
  // Intervals
  // ============================================
  {
    scenarioId: "dsa-insert-interval",
    leetcodeNumber: 57,
    slug: "insert-interval",
    title: "Insert Interval",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-merge-intervals",
    leetcodeNumber: 56,
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-non-overlapping",
    leetcodeNumber: 435,
    slug: "non-overlapping-intervals",
    title: "Non-overlapping Intervals",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-meeting-rooms-ii",
    leetcodeNumber: 253,
    slug: "meeting-rooms-ii",
    title: "Meeting Rooms II",
    difficulty: "Medium",
    hasEditorial: true,
  },

  // ============================================
  // Tries
  // ============================================
  {
    scenarioId: "dsa-implement-trie",
    leetcodeNumber: 208,
    slug: "implement-trie-prefix-tree",
    title: "Implement Trie (Prefix Tree)",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-word-search-ii",
    leetcodeNumber: 212,
    slug: "word-search-ii",
    title: "Word Search II",
    difficulty: "Hard",
    hasEditorial: true,
  },

  // ============================================
  // Bit Manipulation
  // ============================================
  {
    scenarioId: "dsa-single-number",
    leetcodeNumber: 136,
    slug: "single-number",
    title: "Single Number",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-number-of-1-bits",
    leetcodeNumber: 191,
    slug: "number-of-1-bits",
    title: "Number of 1 Bits",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-counting-bits",
    leetcodeNumber: 338,
    slug: "counting-bits",
    title: "Counting Bits",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-reverse-bits",
    leetcodeNumber: 190,
    slug: "reverse-bits",
    title: "Reverse Bits",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-missing-number",
    leetcodeNumber: 268,
    slug: "missing-number",
    title: "Missing Number",
    difficulty: "Easy",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-sum-two-integers",
    leetcodeNumber: 371,
    slug: "sum-of-two-integers",
    title: "Sum of Two Integers",
    difficulty: "Medium",
    hasEditorial: true,
  },

  // ============================================
  // Math & Geometry
  // ============================================
  {
    scenarioId: "dsa-rotate-image",
    leetcodeNumber: 48,
    slug: "rotate-image",
    title: "Rotate Image",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-spiral-matrix",
    leetcodeNumber: 54,
    slug: "spiral-matrix",
    title: "Spiral Matrix",
    difficulty: "Medium",
    hasEditorial: true,
  },
  {
    scenarioId: "dsa-set-matrix-zeroes",
    leetcodeNumber: 73,
    slug: "set-matrix-zeroes",
    title: "Set Matrix Zeroes",
    difficulty: "Medium",
    hasEditorial: true,
  },
]

/**
 * Helper to get LeetCode mapping by scenario ID
 */
export function getLeetCodeMapping(scenarioId: string): LeetCodeMapping | undefined {
  return LEETCODE_MAPPINGS.find((m) => m.scenarioId === scenarioId)
}

/**
 * Helper to get LeetCode mapping by problem number
 */
export function getLeetCodeMappingByNumber(leetcodeNumber: number): LeetCodeMapping | undefined {
  return LEETCODE_MAPPINGS.find((m) => m.leetcodeNumber === leetcodeNumber)
}

/**
 * Get all scenario IDs that have LeetCode mappings
 */
export function getMappedScenarioIds(): string[] {
  return LEETCODE_MAPPINGS.map((m) => m.scenarioId)
}

/**
 * Build LeetCode URL for a problem
 */
export function getLeetCodeUrl(mapping: LeetCodeMapping): string {
  return `https://leetcode.com/problems/${mapping.slug}/`
}

/**
 * Build LeetCode editorial URL
 */
export function getLeetCodeEditorialUrl(mapping: LeetCodeMapping): string {
  return `https://leetcode.com/problems/${mapping.slug}/editorial/`
}
