/**
 * DSA Pattern Categories - Like LeetCode/NeetCode
 *
 * These patterns help categorize problems and guide the AI interviewer
 * to ask relevant follow-up questions based on the pattern.
 */

// =============================================================================
// PATTERN DEFINITIONS (NeetCode Roadmap Style)
// =============================================================================

export const DSA_PATTERNS = {
  // Arrays & Hashing
  ARRAYS_HASHING: "arrays-hashing",

  // Two Pointers
  TWO_POINTERS: "two-pointers",

  // Sliding Window
  SLIDING_WINDOW: "sliding-window",

  // Stack
  STACK: "stack",

  // Binary Search
  BINARY_SEARCH: "binary-search",

  // Linked List
  LINKED_LIST: "linked-list",

  // Trees
  TREES: "trees",
  BINARY_TREE: "binary-tree",
  BST: "binary-search-tree",

  // Tries
  TRIE: "trie",

  // Heap / Priority Queue
  HEAP: "heap",
  PRIORITY_QUEUE: "priority-queue",
  HEAP_PRIORITY_QUEUE: "heap-priority-queue",

  // Backtracking
  BACKTRACKING: "backtracking",

  // Graphs
  GRAPHS: "graphs",
  BFS: "bfs",
  DFS: "dfs",
  TOPOLOGICAL_SORT: "topological-sort",
  UNION_FIND: "union-find",
  DIJKSTRA: "dijkstra",

  // Dynamic Programming
  DP_1D: "dp-1d",
  DP_2D: "dp-2d",
  DP_KNAPSACK: "dp-knapsack",
  DP_LCS: "dp-lcs",
  DP_TREE: "dp-tree",

  // Greedy
  GREEDY: "greedy",

  // Intervals
  INTERVALS: "intervals",

  // Math & Geometry
  MATH: "math",
  GEOMETRY: "geometry",
  MATH_GEOMETRY: "math-geometry",

  // Bit Manipulation
  BIT_MANIPULATION: "bit-manipulation",

  // Sorting
  SORTING: "sorting",
  MERGE_SORT: "merge-sort",
  QUICK_SORT: "quick-sort",

  // String
  STRING: "string",
  STRING_MATCHING: "string-matching",

  // Matrix
  MATRIX: "matrix",

  // Monotonic Stack/Queue
  MONOTONIC_STACK: "monotonic-stack",
  MONOTONIC_QUEUE: "monotonic-queue",

  // Case Labs / systems work — NOT a DSA pattern. A dedicated bucket so
  // multi-milestone codebase labs (decomposition, systems, debugging) record
  // mastery without inflating a real DSA pattern's stats (e.g. arrays-hashing).
  // Intentionally absent from PATTERN_ROADMAP so it never surfaces as a DSA
  // skill node; only used at the labs mastery boundary.
  CASE_LAB: "case-lab",
} as const

export type DSAPattern = (typeof DSA_PATTERNS)[keyof typeof DSA_PATTERNS]

// =============================================================================
// PATTERN METADATA (for UI and AI context)
// =============================================================================

export interface PatternMetadata {
  id: DSAPattern
  name: string
  description: string
  keyTechniques: string[]
  commonQuestions: string[]
  timeComplexityHints: string[]
  spaceComplexityHints: string[]
  interviewerFollowUps: string[] // Questions the AI should ask
}

export const PATTERN_METADATA: Record<DSAPattern, PatternMetadata> = {
  "heap-priority-queue": {
    id: "heap-priority-queue",
    name: "Heap / Priority Queue",
    description: "Combined heap and priority queue problems",
    keyTechniques: ["Min Heap", "Max Heap", "Priority Queue", "Top-K"],
    commonQuestions: ["Kth Largest Element", "Merge K Sorted Lists", "Top K Frequent"],
    timeComplexityHints: ["O(log n) per operation", "O(n log k) for top-k"],
    spaceComplexityHints: ["O(k) for size-limited heap"],
    interviewerFollowUps: [
      "Why use a heap instead of sorting?",
      "Min or max heap here?",
      "What is the time complexity of heapify?",
    ],
  },

  "math-geometry": {
    id: "math-geometry",
    name: "Math & Geometry",
    description: "Combined math and geometry problems",
    keyTechniques: ["Modular Arithmetic", "GCD/LCM", "Distance Calculations", "Line Intersection"],
    commonQuestions: ["Pow(x, n)", "Sqrt(x)", "K Closest Points to Origin"],
    timeComplexityHints: ["Varies by algorithm"],
    spaceComplexityHints: ["O(1) typically"],
    interviewerFollowUps: [
      "How do you handle overflow?",
      "What about floating point precision?",
      "What edge cases exist?",
    ],
  },

  "arrays-hashing": {
    id: "arrays-hashing",
    name: "Arrays & Hashing",
    description: "Problems involving array manipulation and hash-based lookups",
    keyTechniques: ["Hash Map", "Hash Set", "Frequency Count", "Index Mapping"],
    commonQuestions: ["Two Sum", "Contains Duplicate", "Valid Anagram", "Group Anagrams"],
    timeComplexityHints: ["O(n) with hash map", "O(n²) brute force"],
    spaceComplexityHints: ["O(n) for hash map", "O(1) if modifying in-place"],
    interviewerFollowUps: [
      "Why use a hash map here instead of nested loops?",
      "What's the time-space tradeoff you're making?",
      "How would you handle collisions in a hash table?",
      "What if the array is sorted? Would your approach change?",
    ],
  },

  "two-pointers": {
    id: "two-pointers",
    name: "Two Pointers",
    description: "Problems solved by maintaining two pointers that traverse the data",
    keyTechniques: ["Left/Right Pointers", "Fast/Slow Pointers", "Opposite Direction"],
    commonQuestions: ["Valid Palindrome", "Two Sum II", "Container With Most Water", "3Sum"],
    timeComplexityHints: ["O(n) single pass", "O(n²) if nested with sorting"],
    spaceComplexityHints: ["O(1) typically", "O(n) if storing results"],
    interviewerFollowUps: [
      "Why does the two-pointer approach work here?",
      "What invariant are you maintaining as you move the pointers?",
      "Could you prove this doesn't skip valid solutions?",
      "What if the input wasn't sorted?",
    ],
  },

  "sliding-window": {
    id: "sliding-window",
    name: "Sliding Window",
    description: "Problems involving contiguous subarrays or substrings",
    keyTechniques: ["Fixed Window", "Dynamic Window", "Window State Tracking"],
    commonQuestions: [
      "Maximum Subarray",
      "Longest Substring Without Repeating",
      "Minimum Window Substring",
    ],
    timeComplexityHints: ["O(n) amortized", "Each element enters/exits window once"],
    spaceComplexityHints: ["O(k) for window state", "O(1) for fixed calculations"],
    interviewerFollowUps: [
      "How do you decide when to shrink vs expand the window?",
      "What state do you need to track for the current window?",
      "Why is this O(n) and not O(n²)?",
      "What's your window invariant?",
    ],
  },

  stack: {
    id: "stack",
    name: "Stack",
    description: "Problems using LIFO (Last In First Out) data structure",
    keyTechniques: ["Monotonic Stack", "Expression Parsing", "Bracket Matching"],
    commonQuestions: ["Valid Parentheses", "Min Stack", "Evaluate RPN", "Daily Temperatures"],
    timeComplexityHints: ["O(n) single pass", "Each element pushed/popped once"],
    spaceComplexityHints: ["O(n) worst case for stack"],
    interviewerFollowUps: [
      "Why is a stack the right data structure here?",
      "What's the invariant you maintain on the stack?",
      "What if you needed O(1) access to the minimum?",
      "Could you solve this without a stack?",
    ],
  },

  "binary-search": {
    id: "binary-search",
    name: "Binary Search",
    description: "Divide and conquer on sorted data",
    keyTechniques: ["Standard Binary Search", "Search for Boundary", "Search in Rotated Array"],
    commonQuestions: [
      "Binary Search",
      "Search in Rotated Array",
      "Find Minimum in Rotated Array",
      "Koko Eating Bananas",
    ],
    timeComplexityHints: ["O(log n)", "Halving search space each iteration"],
    spaceComplexityHints: ["O(1) iterative", "O(log n) recursive"],
    interviewerFollowUps: [
      "How do you handle the boundary conditions?",
      "Should it be low <= high or low < high? Why?",
      "What if there are duplicates?",
      "Can you apply binary search to non-obvious problems?",
    ],
  },

  "linked-list": {
    id: "linked-list",
    name: "Linked List",
    description: "Problems involving singly or doubly linked lists",
    keyTechniques: ["Slow/Fast Pointers", "Dummy Head", "In-place Reversal", "Cycle Detection"],
    commonQuestions: ["Reverse Linked List", "Merge Two Lists", "Linked List Cycle", "LRU Cache"],
    timeComplexityHints: ["O(n) traversal", "O(1) insertion/deletion at known position"],
    spaceComplexityHints: ["O(1) for in-place", "O(n) for copying"],
    interviewerFollowUps: [
      "How do you handle edge cases like empty list or single node?",
      "Can you do this in-place without extra memory?",
      "Why use a dummy head node?",
      "How does cycle detection work mathematically?",
    ],
  },

  trees: {
    id: "trees",
    name: "Trees",
    description: "General tree traversal and manipulation problems",
    keyTechniques: ["DFS", "BFS", "Level Order", "Path Tracking"],
    commonQuestions: [
      "Invert Binary Tree",
      "Maximum Depth",
      "Same Tree",
      "Subtree of Another Tree",
    ],
    timeComplexityHints: ["O(n) to visit all nodes"],
    spaceComplexityHints: ["O(h) for recursion stack", "O(w) for BFS queue"],
    interviewerFollowUps: [
      "Would you use DFS or BFS here? Why?",
      "What's the height vs width tradeoff for space?",
      "How do you handle the base case?",
      "Can you solve this iteratively?",
    ],
  },

  "binary-tree": {
    id: "binary-tree",
    name: "Binary Tree",
    description: "Problems specific to binary tree structure",
    keyTechniques: ["Preorder", "Inorder", "Postorder", "Morris Traversal"],
    commonQuestions: ["Diameter of Binary Tree", "Balanced Binary Tree", "Binary Tree Level Order"],
    timeComplexityHints: ["O(n) traversal"],
    spaceComplexityHints: ["O(h) recursive", "O(1) Morris traversal"],
    interviewerFollowUps: [
      "What traversal order would you use and why?",
      "What information do you need to pass up vs down the tree?",
      "How would you handle this iteratively?",
    ],
  },

  "binary-search-tree": {
    id: "binary-search-tree",
    name: "Binary Search Tree",
    description: "Problems leveraging BST properties",
    keyTechniques: ["BST Property", "Inorder Traversal", "Valid Range"],
    commonQuestions: ["Validate BST", "Kth Smallest Element", "Lowest Common Ancestor BST"],
    timeComplexityHints: ["O(h) for search/insert", "O(log n) if balanced"],
    spaceComplexityHints: ["O(h) recursive"],
    interviewerFollowUps: [
      "How does the BST property help here?",
      "What if the tree is unbalanced?",
      "Why is inorder traversal special for BSTs?",
    ],
  },

  trie: {
    id: "trie",
    name: "Trie (Prefix Tree)",
    description: "Problems involving prefix-based string operations",
    keyTechniques: ["Prefix Search", "Word Insertion", "Autocomplete"],
    commonQuestions: ["Implement Trie", "Word Search II", "Design Search Autocomplete"],
    timeComplexityHints: ["O(m) for operations where m = word length"],
    spaceComplexityHints: ["O(total characters * alphabet size)"],
    interviewerFollowUps: [
      "Why use a trie instead of a hash set?",
      "How would you implement delete in a trie?",
      "What are the space tradeoffs?",
    ],
  },

  heap: {
    id: "heap",
    name: "Heap",
    description: "Problems requiring priority-based access",
    keyTechniques: ["Min Heap", "Max Heap", "Heap as Priority Queue"],
    commonQuestions: ["Kth Largest Element", "Top K Frequent Elements", "Merge K Sorted Lists"],
    timeComplexityHints: ["O(log n) insert/delete", "O(n log k) for top-k"],
    spaceComplexityHints: ["O(k) for size-limited heap"],
    interviewerFollowUps: [
      "Why use a heap instead of sorting?",
      "Should you use a min or max heap?",
      "What's the time complexity of heapify?",
    ],
  },

  "priority-queue": {
    id: "priority-queue",
    name: "Priority Queue",
    description: "Problems using priority-based scheduling",
    keyTechniques: ["Task Scheduling", "Event Processing", "Dijkstra's Algorithm"],
    commonQuestions: ["Task Scheduler", "Reorganize String"],
    timeComplexityHints: ["O(log n) per operation"],
    spaceComplexityHints: ["O(n) for queue contents"],
    interviewerFollowUps: [
      "What ordering does your priority queue use?",
      "How do you handle ties in priority?",
    ],
  },

  backtracking: {
    id: "backtracking",
    name: "Backtracking",
    description: "Problems requiring exhaustive search with pruning",
    keyTechniques: ["State Space Tree", "Pruning", "Constraint Satisfaction"],
    commonQuestions: ["Subsets", "Permutations", "Combination Sum", "N-Queens"],
    timeComplexityHints: ["O(2^n) for subsets", "O(n!) for permutations"],
    spaceComplexityHints: ["O(n) recursion depth"],
    interviewerFollowUps: [
      "How do you avoid duplicate combinations?",
      "What pruning conditions can we add?",
      "How do you restore state when backtracking?",
    ],
  },

  graphs: {
    id: "graphs",
    name: "Graphs",
    description: "General graph traversal and algorithms",
    keyTechniques: ["Adjacency List", "DFS", "BFS", "Cycle Detection"],
    commonQuestions: ["Number of Islands", "Clone Graph", "Course Schedule"],
    timeComplexityHints: ["O(V + E) for traversal"],
    spaceComplexityHints: ["O(V) for visited set", "O(V + E) for adjacency list"],
    interviewerFollowUps: [
      "How do you represent the graph?",
      "How do you detect cycles?",
      "DFS or BFS - what's the tradeoff?",
    ],
  },

  bfs: {
    id: "bfs",
    name: "BFS (Breadth-First Search)",
    description: "Level-by-level graph/tree traversal",
    keyTechniques: ["Queue-based", "Level Order", "Shortest Path (unweighted)"],
    commonQuestions: ["Word Ladder", "Rotting Oranges", "Shortest Path in Binary Matrix"],
    timeComplexityHints: ["O(V + E)"],
    spaceComplexityHints: ["O(V) for queue"],
    interviewerFollowUps: [
      "Why is BFS guaranteed to find shortest path in unweighted graphs?",
      "How do you track the level/distance?",
    ],
  },

  dfs: {
    id: "dfs",
    name: "DFS (Depth-First Search)",
    description: "Recursive or stack-based deep traversal",
    keyTechniques: ["Recursion", "Stack", "Path Finding"],
    commonQuestions: ["Number of Islands", "Path Sum", "All Paths From Source to Target"],
    timeComplexityHints: ["O(V + E)"],
    spaceComplexityHints: ["O(V) for recursion stack"],
    interviewerFollowUps: [
      "How do you mark visited nodes?",
      "Iterative vs recursive - which do you prefer?",
      "How do you restore state for path problems?",
    ],
  },

  "topological-sort": {
    id: "topological-sort",
    name: "Topological Sort",
    description: "Ordering nodes in directed acyclic graphs",
    keyTechniques: ["Kahn's Algorithm (BFS)", "DFS-based", "Cycle Detection"],
    commonQuestions: ["Course Schedule", "Course Schedule II", "Alien Dictionary"],
    timeComplexityHints: ["O(V + E)"],
    spaceComplexityHints: ["O(V) for indegree array"],
    interviewerFollowUps: [
      "How do you detect if topological sort is possible?",
      "BFS vs DFS approach - which is clearer?",
    ],
  },

  "union-find": {
    id: "union-find",
    name: "Union Find (Disjoint Set)",
    description: "Problems involving connected components",
    keyTechniques: ["Path Compression", "Union by Rank"],
    commonQuestions: ["Number of Connected Components", "Redundant Connection", "Accounts Merge"],
    timeComplexityHints: ["O(α(n)) amortized per operation"],
    spaceComplexityHints: ["O(n) for parent array"],
    interviewerFollowUps: [
      "Why use Union-Find vs DFS?",
      "What optimizations make it efficient?",
      "How do you track component count?",
    ],
  },

  dijkstra: {
    id: "dijkstra",
    name: "Dijkstra's Algorithm",
    description: "Shortest path in weighted graphs",
    keyTechniques: ["Priority Queue", "Relaxation", "Greedy"],
    commonQuestions: ["Network Delay Time", "Cheapest Flights Within K Stops"],
    timeComplexityHints: ["O((V + E) log V) with min-heap"],
    spaceComplexityHints: ["O(V) for distances"],
    interviewerFollowUps: [
      "Why doesn't Dijkstra work with negative weights?",
      "How do you reconstruct the path?",
    ],
  },

  "dp-1d": {
    id: "dp-1d",
    name: "Dynamic Programming (1D)",
    description: "DP problems with single-dimension state",
    keyTechniques: ["State Definition", "Transition", "Bottom-up vs Top-down"],
    commonQuestions: ["Climbing Stairs", "House Robber", "Coin Change"],
    timeComplexityHints: ["O(n) typically", "O(n * target) for coin problems"],
    spaceComplexityHints: ["O(n) or O(1) if space optimized"],
    interviewerFollowUps: [
      "What does dp[i] represent?",
      "Can you optimize the space complexity?",
      "What's the recurrence relation?",
    ],
  },

  "dp-2d": {
    id: "dp-2d",
    name: "Dynamic Programming (2D)",
    description: "DP problems with two-dimension state",
    keyTechniques: ["Grid DP", "Subsequence DP", "Interval DP"],
    commonQuestions: ["Unique Paths", "Longest Common Subsequence", "Edit Distance"],
    timeComplexityHints: ["O(m * n)"],
    spaceComplexityHints: ["O(m * n) or O(min(m, n)) optimized"],
    interviewerFollowUps: [
      "What do the two dimensions represent?",
      "How do you fill the DP table?",
      "Can you reduce to O(n) space?",
    ],
  },

  "dp-knapsack": {
    id: "dp-knapsack",
    name: "Knapsack DP",
    description: "Selection problems with constraints",
    keyTechniques: ["0/1 Knapsack", "Unbounded Knapsack", "Subset Sum"],
    commonQuestions: ["Partition Equal Subset Sum", "Target Sum", "Coin Change"],
    timeComplexityHints: ["O(n * capacity)"],
    spaceComplexityHints: ["O(capacity) optimized"],
    interviewerFollowUps: ["Is this 0/1 or unbounded knapsack?", "Why iterate backwards for 0/1?"],
  },

  "dp-lcs": {
    id: "dp-lcs",
    name: "LCS/LIS DP",
    description: "Subsequence problems",
    keyTechniques: ["Longest Common Subsequence", "Longest Increasing Subsequence"],
    commonQuestions: ["LCS", "LIS", "Edit Distance"],
    timeComplexityHints: ["O(n²) standard", "O(n log n) for LIS"],
    spaceComplexityHints: ["O(n) optimized"],
    interviewerFollowUps: [
      "How do you reconstruct the actual subsequence?",
      "Can you do LIS in O(n log n)?",
    ],
  },

  "dp-tree": {
    id: "dp-tree",
    name: "Tree DP",
    description: "DP on tree structures",
    keyTechniques: ["Post-order DP", "Rerooting"],
    commonQuestions: ["House Robber III", "Binary Tree Maximum Path Sum"],
    timeComplexityHints: ["O(n)"],
    spaceComplexityHints: ["O(h) for recursion"],
    interviewerFollowUps: [
      "What state do you pass up from children?",
      'How do you handle the "take or skip" decision?',
    ],
  },

  greedy: {
    id: "greedy",
    name: "Greedy",
    description: "Problems solved by local optimal choices",
    keyTechniques: ["Activity Selection", "Huffman", "Interval Scheduling"],
    commonQuestions: ["Jump Game", "Gas Station", "Assign Cookies"],
    timeComplexityHints: ["O(n) or O(n log n) with sorting"],
    spaceComplexityHints: ["O(1) typically"],
    interviewerFollowUps: [
      "Why does greedy work here?",
      "Can you prove the greedy choice property?",
      "What if greedy doesn't work - what would you use instead?",
    ],
  },

  intervals: {
    id: "intervals",
    name: "Intervals",
    description: "Problems involving interval operations",
    keyTechniques: ["Sorting by Start/End", "Merge Intervals", "Sweep Line"],
    commonQuestions: ["Merge Intervals", "Insert Interval", "Non-overlapping Intervals"],
    timeComplexityHints: ["O(n log n) with sorting"],
    spaceComplexityHints: ["O(n) for result"],
    interviewerFollowUps: [
      "Should you sort by start or end time?",
      "How do you detect overlap?",
      "What's your merge condition?",
    ],
  },

  math: {
    id: "math",
    name: "Math",
    description: "Mathematical problems",
    keyTechniques: ["Modular Arithmetic", "Prime Numbers", "GCD/LCM"],
    commonQuestions: ["Pow(x, n)", "Sqrt(x)", "Happy Number"],
    timeComplexityHints: ["Varies by algorithm"],
    spaceComplexityHints: ["O(1) typically"],
    interviewerFollowUps: ["How do you handle overflow?", "What edge cases should we consider?"],
  },

  geometry: {
    id: "geometry",
    name: "Geometry",
    description: "Geometric problems",
    keyTechniques: ["Line Intersection", "Convex Hull", "Distance Calculations"],
    commonQuestions: ["Valid Square", "K Closest Points to Origin"],
    timeComplexityHints: ["Varies by algorithm"],
    spaceComplexityHints: ["Varies"],
    interviewerFollowUps: ["How do you handle floating point precision?", "What edge cases exist?"],
  },

  "bit-manipulation": {
    id: "bit-manipulation",
    name: "Bit Manipulation",
    description: "Problems using bitwise operations",
    keyTechniques: ["XOR", "AND/OR masks", "Bit counting"],
    commonQuestions: ["Single Number", "Counting Bits", "Reverse Bits"],
    timeComplexityHints: ["O(n) or O(1)"],
    spaceComplexityHints: ["O(1)"],
    interviewerFollowUps: [
      "Why does XOR work here?",
      "How do you isolate the rightmost bit?",
      "What's the bit trick you're using?",
    ],
  },

  sorting: {
    id: "sorting",
    name: "Sorting",
    description: "Problems involving sorting algorithms",
    keyTechniques: ["Quick Sort", "Merge Sort", "Bucket Sort"],
    commonQuestions: ["Sort Colors", "Largest Number", "Sort List"],
    timeComplexityHints: ["O(n log n)"],
    spaceComplexityHints: ["O(1) to O(n)"],
    interviewerFollowUps: [
      "Which sorting algorithm would you use?",
      "What if we need stable sort?",
    ],
  },

  "merge-sort": {
    id: "merge-sort",
    name: "Merge Sort",
    description: "Divide and conquer sorting",
    keyTechniques: ["Divide", "Conquer", "Merge"],
    commonQuestions: ["Sort List", "Merge K Sorted Lists"],
    timeComplexityHints: ["O(n log n)"],
    spaceComplexityHints: ["O(n)"],
    interviewerFollowUps: [
      "Why is merge sort stable?",
      "When would you use merge sort over quick sort?",
    ],
  },

  "quick-sort": {
    id: "quick-sort",
    name: "Quick Sort / Quick Select",
    description: "Partition-based algorithms",
    keyTechniques: ["Partition", "Pivot Selection", "Quick Select"],
    commonQuestions: ["Kth Largest Element", "Sort Colors"],
    timeComplexityHints: ["O(n log n) avg", "O(n) for quick select avg"],
    spaceComplexityHints: ["O(log n) for recursion"],
    interviewerFollowUps: ["How do you choose the pivot?", "What's the worst case?"],
  },

  string: {
    id: "string",
    name: "String",
    description: "General string manipulation",
    keyTechniques: ["Two Pointers", "StringBuilder", "Parsing"],
    commonQuestions: ["Reverse String", "Valid Palindrome", "String to Integer"],
    timeComplexityHints: ["O(n)"],
    spaceComplexityHints: ["O(n) for new string", "O(1) in-place"],
    interviewerFollowUps: ["How do you handle edge cases?", "What about unicode characters?"],
  },

  "string-matching": {
    id: "string-matching",
    name: "String Matching",
    description: "Pattern matching in strings",
    keyTechniques: ["KMP", "Rabin-Karp", "Z-Algorithm"],
    commonQuestions: ["Implement strStr()", "Repeated Substring Pattern"],
    timeComplexityHints: ["O(n + m) for KMP"],
    spaceComplexityHints: ["O(m) for pattern preprocessing"],
    interviewerFollowUps: [
      "Why is KMP more efficient than naive approach?",
      "What is the failure function?",
    ],
  },

  matrix: {
    id: "matrix",
    name: "Matrix",
    description: "Matrix traversal and manipulation",
    keyTechniques: ["Spiral", "Rotation", "Layer-by-layer"],
    commonQuestions: ["Rotate Image", "Spiral Matrix", "Set Matrix Zeroes"],
    timeComplexityHints: ["O(m * n)"],
    spaceComplexityHints: ["O(1) in-place", "O(m * n) for copy"],
    interviewerFollowUps: [
      "Can you do this in-place?",
      "How do you handle the boundary conditions?",
    ],
  },

  "monotonic-stack": {
    id: "monotonic-stack",
    name: "Monotonic Stack",
    description: "Stack maintaining monotonic order",
    keyTechniques: ["Next Greater Element", "Previous Smaller Element"],
    commonQuestions: ["Daily Temperatures", "Largest Rectangle in Histogram"],
    timeComplexityHints: ["O(n)"],
    spaceComplexityHints: ["O(n)"],
    interviewerFollowUps: ["What invariant does the stack maintain?", "Why is this O(n)?"],
  },

  "monotonic-queue": {
    id: "monotonic-queue",
    name: "Monotonic Queue",
    description: "Deque maintaining monotonic order",
    keyTechniques: ["Sliding Window Max/Min"],
    commonQuestions: ["Sliding Window Maximum"],
    timeComplexityHints: ["O(n)"],
    spaceComplexityHints: ["O(k)"],
    interviewerFollowUps: ["Why use a deque instead of a heap?", "What do you store in the deque?"],
  },

  // Non-DSA bucket for Case Lab / systems work (see DSA_PATTERNS.CASE_LAB).
  // Present so Record<DSAPattern, ...> lookups stay total; not a practiceable
  // DSA pattern and not in PATTERN_ROADMAP, so it never renders as a skill node.
  "case-lab": {
    id: "case-lab",
    name: "Case Lab (Systems)",
    description:
      "Multi-milestone, company-framed engineering case labs (decomposition, systems, debugging) — not a DSA pattern.",
    keyTechniques: ["Decomposition", "Systems Thinking", "Reading Real Code", "Tradeoff Design"],
    commonQuestions: ["911 Dispatch Optimization", "Billing Webhook Idempotency"],
    timeComplexityHints: ["N/A"],
    spaceComplexityHints: ["N/A"],
    interviewerFollowUps: [
      "What is the single bottleneck the software is here to fix?",
      "Which failure mode hurts a real user if you get it wrong?",
    ],
  },
}

// =============================================================================
// COMPANY-SPECIFIC INTERVIEW STYLES
// =============================================================================

export interface CompanyInterviewStyle {
  company: string
  style: string
  focusAreas: string[]
  interviewFormat: string
  typicalQuestions: string[]
  evaluationEmphasis: string[]
  interviewerPersonality: string
  commonFollowUps: string[]
}

export const COMPANY_INTERVIEW_STYLES: Record<string, CompanyInterviewStyle> = {
  Google: {
    company: "Google",
    style: "Collaborative and exploratory",
    focusAreas: ["Scalability", "Code quality", "Problem-solving process"],
    interviewFormat: "45 min coding, strong emphasis on communication",
    typicalQuestions: ["System design at scale", "Optimization problems", "Graph algorithms"],
    evaluationEmphasis: ["Googleyness", "How you think", "Can you improve the solution?"],
    interviewerPersonality:
      'Friendly but thorough. Asks "what if we had billions of users?" Follow up with optimization questions.',
    commonFollowUps: [
      "How would this scale to billions of requests?",
      "Can you make this more efficient?",
      "What if memory is constrained?",
      "How would you test this?",
    ],
  },

  Meta: {
    company: "Meta",
    style: "Fast-paced and practical",
    focusAreas: ["Speed", "Bug-free code", "Real-world applicability"],
    interviewFormat: "45 min, 2 problems expected, ninja focus on execution",
    typicalQuestions: ["Array/String manipulation", "Tree problems", "Graph traversal"],
    evaluationEmphasis: ["Move fast", "Ship working code", "Handle edge cases"],
    interviewerPersonality:
      "Direct and efficient. Expects you to code quickly. Values working solutions over perfect ones.",
    commonFollowUps: [
      "Good, let's move to the next problem.",
      "Can you code that up quickly?",
      "What edge cases are you handling?",
      "Does this handle null input?",
    ],
  },

  Amazon: {
    company: "Amazon",
    style: "Leadership Principles focused",
    focusAreas: ["Customer obsession", "Ownership", "Dive deep"],
    interviewFormat: "STAR method behavioral + technical. LP stories important.",
    typicalQuestions: ["Design problems", "OOP design", "System design"],
    evaluationEmphasis: ["Leadership Principles", "Ownership", "Bias for action"],
    interviewerPersonality:
      'Professional and LP-focused. May ask "Tell me about a time..." before coding.',
    commonFollowUps: [
      "How would you handle errors here?",
      "What metrics would you track?",
      "How would the customer experience this?",
      "What are the tradeoffs?",
    ],
  },

  Microsoft: {
    company: "Microsoft",
    style: "Traditional and thorough",
    focusAreas: ["Fundamentals", "Clean code", "Design patterns"],
    interviewFormat: "4-5 rounds, mix of coding and design",
    typicalQuestions: ["Classic DSA", "OOP design", "System design"],
    evaluationEmphasis: ["Solid fundamentals", "Growth mindset", "Collaboration"],
    interviewerPersonality:
      "Professional and supportive. Values clear communication and clean code.",
    commonFollowUps: [
      "Can you walk me through your approach?",
      "What design pattern would you use?",
      "How would you structure this as classes?",
      "What would you refactor?",
    ],
  },

  Apple: {
    company: "Apple",
    style: "Detail-oriented and perfectionist",
    focusAreas: ["Attention to detail", "User experience", "Performance"],
    interviewFormat: "Multiple rounds, heavy on domain expertise",
    typicalQuestions: ["Performance optimization", "Memory management", "Clean architecture"],
    evaluationEmphasis: ["Excellence", "Attention to detail", "Passion for product"],
    interviewerPersonality:
      "Thoughtful and detail-focused. Cares about code quality and edge cases.",
    commonFollowUps: [
      "What about memory efficiency?",
      "How would this affect battery life?",
      "Is there a cleaner way to write this?",
      "What happens in this edge case?",
    ],
  },

  Netflix: {
    company: "Netflix",
    style: "High bar, freedom & responsibility",
    focusAreas: ["Senior-level thinking", "Independence", "Impact"],
    interviewFormat: "Culture fit heavy, technical depth expected",
    typicalQuestions: ["Distributed systems", "Scale problems", "Real production scenarios"],
    evaluationEmphasis: ["Stunning colleagues", "Judgment", "Candor"],
    interviewerPersonality: "Direct and expects senior-level answers. Values independent thinking.",
    commonFollowUps: [
      "How would you handle this in production?",
      "What would you do if this failed at scale?",
      "How would you debug this in production?",
    ],
  },

  Stripe: {
    company: "Stripe",
    style: "Practical and product-focused",
    focusAreas: ["API design", "Error handling", "Developer experience"],
    interviewFormat: "Practical coding, API design, debugging",
    typicalQuestions: ["API design", "Payment flows", "Error handling"],
    evaluationEmphasis: ["Attention to detail", "Developer empathy", "Production readiness"],
    interviewerPersonality: "Practical and detail-oriented. Cares about real-world applicability.",
    commonFollowUps: [
      "How would a developer use this API?",
      "What error messages would you return?",
      "How would you document this?",
    ],
  },

  Startup: {
    company: "Startup",
    style: "Practical and scrappy",
    focusAreas: ["Ship fast", "Wear many hats", "Impact"],
    interviewFormat: "Practical problems, real codebase interaction",
    typicalQuestions: ["Real-world bugs", "Feature implementation", "System design lite"],
    evaluationEmphasis: ["Get things done", "Learn fast", "Ownership"],
    interviewerPersonality: "Casual but focused on impact. Values pragmatic solutions.",
    commonFollowUps: [
      "How quickly could you ship this?",
      "What would you build first?",
      "How would you validate this works?",
    ],
  },

  Generic: {
    company: "", // Empty - don't mention any specific company
    style: "Standard technical interview",
    focusAreas: ["Problem-solving", "Code quality", "Communication"],
    interviewFormat: "Standard 45-60 min coding interview",
    typicalQuestions: ["Classic DSA problems", "System design basics"],
    evaluationEmphasis: ["Problem-solving ability", "Code quality", "Communication"],
    interviewerPersonality: "Professional and helpful. Standard technical interview approach.",
    commonFollowUps: [
      "What's the time complexity?",
      "Can you optimize this?",
      "What edge cases should we consider?",
    ],
  },
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getPatternMetadata(pattern: DSAPattern): PatternMetadata {
  return PATTERN_METADATA[pattern]
}

export function getCompanyStyle(company: string): CompanyInterviewStyle {
  return COMPANY_INTERVIEW_STYLES[company] || COMPANY_INTERVIEW_STYLES["Generic"]
}

export function getInterviewerFollowUps(pattern: DSAPattern, company: string): string[] {
  const patternFollowUps = PATTERN_METADATA[pattern]?.interviewerFollowUps || []
  const companyFollowUps = COMPANY_INTERVIEW_STYLES[company]?.commonFollowUps || []
  return [...patternFollowUps, ...companyFollowUps]
}

export function buildInterviewerContext(pattern: DSAPattern, company: string): string {
  const patternMeta = getPatternMetadata(pattern)
  const companyStyle = getCompanyStyle(company)

  return `
PROBLEM PATTERN: ${patternMeta.name}
Key Techniques: ${patternMeta.keyTechniques.join(", ")}
Expected Complexity: Time ${patternMeta.timeComplexityHints[0]}, Space ${patternMeta.spaceComplexityHints[0]}

COMPANY STYLE: ${companyStyle.company}
Interview Style: ${companyStyle.style}
Focus Areas: ${companyStyle.focusAreas.join(", ")}
Evaluation Emphasis: ${companyStyle.evaluationEmphasis.join(", ")}
Personality: ${companyStyle.interviewerPersonality}

SUGGESTED FOLLOW-UPS:
${patternMeta.interviewerFollowUps
  .slice(0, 2)
  .map((q) => `- ${q}`)
  .join("\n")}
${companyStyle.commonFollowUps
  .slice(0, 2)
  .map((q) => `- ${q}`)
  .join("\n")}
`.trim()
}

// =============================================================================
// PATTERN PREREQUISITES (Learning Roadmap)
// =============================================================================

export interface PatternNode {
  id: string
  name: string
  patterns: DSAPattern[]
  prerequisites: string[] // IDs of prerequisite pattern groups
  tier: number // 1 = Foundation, 2 = Core, 3 = Advanced, 4 = Expert
  description: string
}

export const PATTERN_ROADMAP: PatternNode[] = [
  // Tier 1 - Foundation (No prerequisites)
  {
    id: "arrays-hashing",
    name: "Arrays & Hashing",
    patterns: ["arrays-hashing"],
    prerequisites: [],
    tier: 1,
    description:
      "Start here! Hash maps, frequency counting, and array manipulation are the foundation of most algorithms.",
  },

  // Tier 2 - Core Patterns (Build on Arrays)
  {
    id: "two-pointers",
    name: "Two Pointers",
    patterns: ["two-pointers"],
    prerequisites: ["arrays-hashing"],
    tier: 2,
    description:
      "Learn to traverse arrays efficiently with two pointers moving in different directions.",
  },
  {
    id: "stack",
    name: "Stack",
    patterns: ["stack", "monotonic-stack"],
    prerequisites: ["arrays-hashing"],
    tier: 2,
    description:
      "LIFO data structure essential for parsing, matching, and tracking previous elements.",
  },
  {
    id: "binary-search",
    name: "Binary Search",
    patterns: ["binary-search"],
    prerequisites: ["arrays-hashing"],
    tier: 2,
    description: "Divide and conquer on sorted data. Essential for O(log n) solutions.",
  },
  {
    id: "sliding-window",
    name: "Sliding Window",
    patterns: ["sliding-window"],
    prerequisites: ["two-pointers"],
    tier: 2,
    description: "Optimize subarray problems using a window that expands and contracts.",
  },
  {
    id: "linked-list",
    name: "Linked List",
    patterns: ["linked-list"],
    prerequisites: ["two-pointers"],
    tier: 2,
    description: "Pointer manipulation, fast/slow pointers, and in-place reversal techniques.",
  },

  // Tier 3 - Advanced Data Structures
  {
    id: "trees",
    name: "Trees",
    patterns: ["trees", "binary-tree", "binary-search-tree"],
    prerequisites: ["stack", "linked-list"],
    tier: 3,
    description: "Tree traversal (DFS/BFS), BST properties, and recursive problem solving.",
  },
  {
    id: "heap",
    name: "Heap / Priority Queue",
    patterns: ["heap", "priority-queue", "heap-priority-queue"],
    prerequisites: ["arrays-hashing", "binary-search"],
    tier: 3,
    description: "Efficiently find min/max elements. Essential for top-K problems and scheduling.",
  },
  {
    id: "trie",
    name: "Tries",
    patterns: ["trie"],
    prerequisites: ["trees"],
    tier: 3,
    description: "Prefix trees for efficient string operations and autocomplete features.",
  },
  {
    id: "backtracking",
    name: "Backtracking",
    patterns: ["backtracking"],
    prerequisites: ["trees"],
    tier: 3,
    description:
      "Exhaustive search with pruning for permutations, combinations, and constraint satisfaction.",
  },

  // Tier 3 - Graphs
  {
    id: "graphs",
    name: "Graphs",
    patterns: ["graphs", "bfs", "dfs", "topological-sort", "union-find", "dijkstra"],
    prerequisites: ["trees", "heap"],
    tier: 3,
    description: "Graph traversal, shortest paths, cycle detection, and connected components.",
  },

  // Tier 4 - Advanced Techniques
  {
    id: "dp-1d",
    name: "DP (1D)",
    patterns: ["dp-1d"],
    prerequisites: ["backtracking"],
    tier: 4,
    description: "Optimize recursive solutions by storing subproblem results. Start with 1D state.",
  },
  {
    id: "dp-2d",
    name: "DP (2D)",
    patterns: ["dp-2d", "dp-knapsack", "dp-lcs"],
    prerequisites: ["dp-1d"],
    tier: 4,
    description: "Two-dimensional state for grid problems, subsequences, and knapsack variants.",
  },
  {
    id: "dp-tree",
    name: "Tree DP",
    patterns: ["dp-tree"],
    prerequisites: ["dp-1d", "trees"],
    tier: 4,
    description: "Dynamic programming on tree structures using post-order traversal.",
  },
  {
    id: "greedy",
    name: "Greedy",
    patterns: ["greedy"],
    prerequisites: ["dp-1d"],
    tier: 4,
    description: "Local optimal choices that lead to global optimum. Know when DP is overkill.",
  },
  {
    id: "intervals",
    name: "Intervals",
    patterns: ["intervals"],
    prerequisites: ["greedy", "heap"],
    tier: 4,
    description: "Merging, inserting, and scheduling interval problems.",
  },

  // Tier 4 - Specialized Topics
  {
    id: "bit-manipulation",
    name: "Bit Manipulation",
    patterns: ["bit-manipulation"],
    prerequisites: ["arrays-hashing"],
    tier: 4,
    description: "XOR tricks, bit masks, and low-level optimizations.",
  },
  {
    id: "math-geometry",
    name: "Math & Geometry",
    patterns: ["math", "geometry", "math-geometry"],
    prerequisites: ["arrays-hashing"],
    tier: 4,
    description: "Number theory, GCD/LCM, and geometric calculations.",
  },
  {
    id: "matrix",
    name: "Matrix",
    patterns: ["matrix"],
    prerequisites: ["dp-2d"],
    tier: 4,
    description: "Matrix traversal, rotation, and layer-by-layer processing.",
  },
]

export function getPatternNode(nodeId: string): PatternNode | undefined {
  return PATTERN_ROADMAP.find((node) => node.id === nodeId)
}

export function getPatternPrerequisites(nodeId: string): PatternNode[] {
  const node = getPatternNode(nodeId)
  if (!node) return []
  return node.prerequisites
    .map((id) => getPatternNode(id))
    .filter((n): n is PatternNode => n !== undefined)
}

export function isPatternUnlocked(nodeId: string, completedPatterns: string[]): boolean {
  const node = getPatternNode(nodeId)
  if (!node) return false
  if (node.prerequisites.length === 0) return true
  return node.prerequisites.every((prereq) => completedPatterns.includes(prereq))
}

export function getPatternsByTier(tier: number): PatternNode[] {
  return PATTERN_ROADMAP.filter((node) => node.tier === tier)
}
