import type { PatternComplexityRules } from "../types"

export const PATTERN_COMPLEXITY_RULES: PatternComplexityRules[] = [
  {
    pattern: "arrays-hashing",
    typicalTimeComplexity: "O(n)",
    typicalSpaceComplexity: "O(n)",
    keyInsight: "Hash maps provide O(1) average lookup, trading space for time",
    source: "CLRS - Hash Tables",
    variations: [
      { name: "Counting elements", time: "O(n)", space: "O(k)", note: "k = unique elements" },
      {
        name: "Two Sum pattern",
        time: "O(n)",
        space: "O(n)",
        note: "Hash map for complement lookup",
      },
    ],
  },
  {
    pattern: "two-pointers",
    typicalTimeComplexity: "O(n)",
    typicalSpaceComplexity: "O(1)",
    keyInsight: "Two pointers traverse array once, often after sorting",
    source: "Standard algorithm technique",
    variations: [
      { name: "Sorted array search", time: "O(n)", space: "O(1)", note: "Converging pointers" },
      { name: "With sorting", time: "O(n log n)", space: "O(1)", note: "Sorting dominates" },
    ],
  },
  {
    pattern: "sliding-window",
    typicalTimeComplexity: "O(n)",
    typicalSpaceComplexity: "O(1) to O(k)",
    keyInsight: "Each element enters and exits window at most once - amortized O(1) per element",
    source: "Amortized analysis",
    variations: [
      { name: "Fixed size window", time: "O(n)", space: "O(k)", note: "k = window size" },
      {
        name: "Variable window",
        time: "O(n)",
        space: "O(charset)",
        note: "Expand right, shrink left",
      },
    ],
  },
  {
    pattern: "stack",
    typicalTimeComplexity: "O(n)",
    typicalSpaceComplexity: "O(n)",
    keyInsight: "Each element pushed and popped at most once",
    source: "Standard data structure",
    variations: [
      {
        name: "Monotonic stack",
        time: "O(n)",
        space: "O(n)",
        note: "Next greater/smaller element",
      },
      { name: "Balanced parentheses", time: "O(n)", space: "O(n)", note: "Match opening/closing" },
    ],
  },
  {
    pattern: "binary-search",
    typicalTimeComplexity: "O(log n)",
    typicalSpaceComplexity: "O(1) iterative, O(log n) recursive",
    keyInsight: "Search space halves each iteration: log₂(n) iterations",
    source: "CLRS - Divide and Conquer",
    variations: [
      { name: "Standard search", time: "O(log n)", space: "O(1)", note: "Sorted array" },
      {
        name: "Search on answer",
        time: "O(log k * f(n))",
        space: "varies",
        note: "Binary search + verification",
      },
    ],
  },
  {
    pattern: "linked-list",
    typicalTimeComplexity: "O(n)",
    typicalSpaceComplexity: "O(1)",
    keyInsight: "Single traversal with pointer manipulation",
    source: "Standard data structure",
    variations: [
      { name: "Reverse list", time: "O(n)", space: "O(1)", note: "Three pointers" },
      { name: "Cycle detection", time: "O(n)", space: "O(1)", note: "Floyd's algorithm" },
    ],
  },
  {
    pattern: "trees",
    typicalTimeComplexity: "O(n)",
    typicalSpaceComplexity: "O(h) where h is height",
    keyInsight: "Visit each node once, recursion depth = height",
    source: "CLRS - Binary Search Trees",
    variations: [
      { name: "Balanced tree", time: "O(n)", space: "O(log n)", note: "Height = log n" },
      { name: "Skewed tree", time: "O(n)", space: "O(n)", note: "Height = n (worst case)" },
    ],
  },
  {
    pattern: "heap",
    typicalTimeComplexity: "O(log n) per operation, O(n) to build",
    typicalSpaceComplexity: "O(n)",
    keyInsight: "Complete binary tree, heapify is O(log n)",
    source: "CLRS - Heapsort",
    variations: [
      {
        name: "Top k elements",
        time: "O(n log k)",
        space: "O(k)",
        note: "Maintain heap of size k",
      },
      { name: "Heap sort", time: "O(n log n)", space: "O(1)", note: "In-place sorting" },
    ],
  },
  {
    pattern: "graphs",
    typicalTimeComplexity: "O(V + E)",
    typicalSpaceComplexity: "O(V + E)",
    keyInsight: "Visit each vertex and edge once",
    source: "CLRS - Graph Algorithms",
    variations: [
      { name: "DFS/BFS", time: "O(V + E)", space: "O(V)", note: "Standard traversal" },
      { name: "Topological sort", time: "O(V + E)", space: "O(V)", note: "DAG ordering" },
    ],
  },
  {
    pattern: "dp-1d",
    typicalTimeComplexity: "O(states * transitions)",
    typicalSpaceComplexity: "O(states)",
    keyInsight: "Solve subproblems once, store results",
    source: "CLRS - Dynamic Programming",
    variations: [
      { name: "1D DP", time: "O(n)", space: "O(n) or O(1)", note: "Linear problems" },
      { name: "2D DP", time: "O(n*m)", space: "O(n*m) or O(n)", note: "Two-dimensional problems" },
    ],
  },
  {
    pattern: "backtracking",
    typicalTimeComplexity: "O(k^n) or O(n!)",
    typicalSpaceComplexity: "O(n)",
    keyInsight: "Exponential in nature - explores decision tree",
    source: "Standard algorithm technique",
    variations: [
      {
        name: "Subsets",
        time: "O(n * 2^n)",
        space: "O(n)",
        note: "2^n subsets, O(n) to copy each",
      },
      { name: "Permutations", time: "O(n * n!)", space: "O(n)", note: "n! permutations" },
    ],
  },
  {
    pattern: "greedy",
    typicalTimeComplexity: "O(n) or O(n log n)",
    typicalSpaceComplexity: "O(1)",
    keyInsight: "Local optimal choice leads to global optimal",
    source: "CLRS - Greedy Algorithms",
    variations: [
      { name: "Activity selection", time: "O(n log n)", space: "O(1)", note: "Sort then greedy" },
      { name: "Interval scheduling", time: "O(n log n)", space: "O(1)", note: "Sort by end time" },
    ],
  },
  {
    pattern: "intervals",
    typicalTimeComplexity: "O(n log n)",
    typicalSpaceComplexity: "O(n)",
    keyInsight: "Sort intervals first, then process",
    source: "Standard algorithm technique",
    variations: [
      { name: "Merge intervals", time: "O(n log n)", space: "O(n)", note: "Sort + merge" },
      { name: "Meeting rooms", time: "O(n log n)", space: "O(n)", note: "Sort + heap/sweep line" },
    ],
  },
  {
    pattern: "trie",
    typicalTimeComplexity: "O(m) per operation where m is word length",
    typicalSpaceComplexity: "O(total characters)",
    keyInsight: "Prefix-based lookup in O(word length)",
    source: "Standard data structure",
    variations: [
      { name: "Insert/Search", time: "O(m)", space: "O(1)", note: "m = word length" },
      { name: "Build trie", time: "O(n * m)", space: "O(n * m)", note: "n words, avg length m" },
    ],
  },
  {
    pattern: "bit-manipulation",
    typicalTimeComplexity: "O(n) or O(1)",
    typicalSpaceComplexity: "O(1)",
    keyInsight: "Bit operations are O(1), often replace hash sets",
    source: "Computer architecture fundamentals",
    variations: [
      { name: "Single number (XOR)", time: "O(n)", space: "O(1)", note: "XOR cancels pairs" },
      { name: "Count bits", time: "O(log n)", space: "O(1)", note: "Brian Kernighan's algorithm" },
    ],
  },
]
