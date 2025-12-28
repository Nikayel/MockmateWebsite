/**
 * DSA Pattern Knowledge Base
 *
 * Comprehensive knowledge about DSA patterns for RAG retrieval
 */

import type { DSAPattern } from '@/lib/types/dsa-patterns'
import type { DSAPatternKnowledge } from './types'

/**
 * Complete DSA pattern knowledge database
 */
export const DSA_PATTERN_KNOWLEDGE: DSAPatternKnowledge[] = [
  {
    pattern: 'arrays-hashing',
    displayName: 'Arrays & Hashing',
    description: 'Fundamental pattern using arrays and hash maps for O(1) lookups. Hash maps provide constant-time access to elements, making them ideal for counting, grouping, and finding duplicates.',
    whenToUse: [
      'Need O(1) lookup or insertion',
      'Counting occurrences of elements',
      'Finding duplicates or unique elements',
      'Grouping elements by some property',
      'Two Sum-style problems requiring complement lookup',
    ],
    keyInsights: [
      'Trade space for time - hash maps use extra memory but provide O(1) operations',
      'Consider edge cases: empty arrays, single elements, negative numbers',
      'Hash collisions can affect performance in edge cases',
      'Arrays are stored contiguously in memory, good for cache performance',
    ],
    commonMistakes: [
      'Forgetting to handle empty arrays',
      'Not considering duplicate elements',
      'Using wrong data types for hash keys',
      'Modifying array while iterating',
    ],
    timeComplexity: {
      typical: 'O(n)',
      best: 'O(1) for direct access',
      worst: 'O(n) for searching unsorted',
    },
    spaceComplexity: {
      typical: 'O(n)',
      notes: 'Hash maps require additional space proportional to unique elements',
    },
    relatedPatterns: ['two-pointers', 'sliding-window'],
    prerequisites: [],
    codeTemplate: `def solve(nums):
    seen = {}  # or set() for existence checks
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
    examples: [
      'Two Sum: Find two numbers that add up to target',
      'Contains Duplicate: Check if array has duplicates',
      'Group Anagrams: Group strings by their sorted characters',
    ],
    interviewTips: [
      'Always clarify if the array is sorted',
      'Ask about duplicates and how to handle them',
      'Consider both time and space trade-offs out loud',
    ],
  },
  {
    pattern: 'two-pointers',
    displayName: 'Two Pointers',
    description: 'Use two pointers to traverse array/string from different positions. Efficient for sorted arrays, palindrome checking, and partition problems. Reduces O(n²) brute force to O(n).',
    whenToUse: [
      'Array/string is sorted or you need to find pairs',
      'Palindrome checking',
      'Removing duplicates in-place',
      'Partitioning arrays (Dutch National Flag)',
      'Container problems (water, area)',
    ],
    keyInsights: [
      'Start pointers from opposite ends for sorted array problems',
      'Start from same end for fast/slow pointer problems',
      'Movement logic depends on the condition being checked',
      'Often achieves O(1) space when problem seems to need O(n)',
    ],
    commonMistakes: [
      'Off-by-one errors in pointer movement',
      'Infinite loops when pointers don\'t move correctly',
      'Forgetting to handle equal elements',
      'Not considering when pointers cross',
    ],
    timeComplexity: {
      typical: 'O(n)',
      best: 'O(1) if answer found immediately',
      worst: 'O(n) - each element visited at most once per pointer',
    },
    spaceComplexity: {
      typical: 'O(1)',
      notes: 'Usually operates in-place, making it space-efficient',
    },
    relatedPatterns: ['sliding-window', 'binary-search', 'arrays-hashing'],
    prerequisites: ['arrays-hashing'],
    codeTemplate: `def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        current_sum = nums[left] + nums[right]
        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            left += 1
        else:
            right -= 1
    return []`,
    examples: [
      'Two Sum II: Find pair in sorted array',
      'Valid Palindrome: Check if string is palindrome',
      '3Sum: Find triplets that sum to zero',
      'Container With Most Water: Maximize water area',
    ],
    interviewTips: [
      'Immediately consider if array is sorted or can be sorted',
      'Trace through your solution with a small example',
      'Explain why pointers move in each direction',
    ],
  },
  {
    pattern: 'sliding-window',
    displayName: 'Sliding Window',
    description: 'Maintain a window of elements that slides through the array. Perfect for substring/subarray problems with contiguous elements. Converts O(n²) brute force to O(n).',
    whenToUse: [
      'Finding longest/shortest subarray with some property',
      'Substring problems with character constraints',
      'Maximum/minimum of all subarrays of size k',
      'Contiguous sequence with target sum',
      'String permutation/anagram problems',
    ],
    keyInsights: [
      'Fixed-size window: straightforward iteration',
      'Variable-size window: expand right, shrink left as needed',
      'Use hash map to track window contents efficiently',
      'Update answer when window meets the criteria',
    ],
    commonMistakes: [
      'Not handling window shrinking correctly',
      'Forgetting to update state when elements leave window',
      'Incorrect window size tracking',
      'Not considering edge cases (empty string, all same characters)',
    ],
    timeComplexity: {
      typical: 'O(n)',
      best: 'O(n) - must visit all elements',
      worst: 'O(n) - each element enters and leaves window once',
    },
    spaceComplexity: {
      typical: 'O(k) where k is alphabet/unique elements',
      notes: 'Hash map stores at most window content',
    },
    relatedPatterns: ['two-pointers', 'arrays-hashing', 'string'],
    prerequisites: ['arrays-hashing', 'two-pointers'],
    codeTemplate: `def sliding_window(s):
    window = {}  # Track window state
    left = 0
    result = 0

    for right in range(len(s)):
        # Expand window - add s[right]
        window[s[right]] = window.get(s[right], 0) + 1

        # Shrink window while invalid
        while not is_valid(window):
            window[s[left]] -= 1
            if window[s[left]] == 0:
                del window[s[left]]
            left += 1

        # Update result
        result = max(result, right - left + 1)

    return result`,
    examples: [
      'Longest Substring Without Repeating Characters',
      'Minimum Window Substring',
      'Permutation in String',
      'Maximum Sum Subarray of Size K',
    ],
    interviewTips: [
      'Identify if the problem has a contiguous constraint',
      'Clarify if window is fixed or variable size',
      'Draw the window expansion/contraction process',
    ],
  },
  {
    pattern: 'binary-search',
    displayName: 'Binary Search',
    description: 'Divide and conquer on sorted arrays. Eliminates half the search space each iteration, achieving O(log n) time. Applicable to any monotonic search space.',
    whenToUse: [
      'Searching in sorted array',
      'Finding first/last occurrence',
      'Search space has monotonic property',
      'Minimizing/maximizing with a check function',
      'Finding boundary in rotated sorted array',
    ],
    keyInsights: [
      'Search space must have monotonic property',
      'Choose mid calculation to avoid overflow: left + (right - left) // 2',
      'Boundary conditions: left <= right vs left < right',
      'Can search on answer space, not just array indices',
    ],
    commonMistakes: [
      'Integer overflow when calculating mid',
      'Infinite loop from incorrect boundary updates',
      'Off-by-one in left/right pointer updates',
      'Not handling duplicates correctly',
    ],
    timeComplexity: {
      typical: 'O(log n)',
      best: 'O(1) if target is at mid',
      worst: 'O(log n)',
    },
    spaceComplexity: {
      typical: 'O(1) iterative, O(log n) recursive',
      notes: 'Iterative version is preferred for space efficiency',
    },
    relatedPatterns: ['two-pointers', 'arrays-hashing'],
    prerequisites: ['arrays-hashing'],
    codeTemplate: `def binary_search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1  # or left for insertion point`,
    examples: [
      'Binary Search: Find target in sorted array',
      'Search in Rotated Sorted Array',
      'Find Minimum in Rotated Sorted Array',
      'Koko Eating Bananas: Binary search on answer',
    ],
    interviewTips: [
      'Always confirm the array is sorted first',
      'Be explicit about your loop invariant',
      'Handle edge cases: empty array, single element',
    ],
  },
  {
    pattern: 'stack',
    displayName: 'Stack',
    description: 'LIFO data structure for problems requiring backtracking or matching. Perfect for parentheses, monotonic sequences, and expression evaluation.',
    whenToUse: [
      'Matching parentheses or brackets',
      'Evaluating expressions',
      'Finding next greater/smaller element',
      'Backtracking scenarios',
      'Maintaining history (undo operations)',
    ],
    keyInsights: [
      'Think "undo" or "go back" - stack is natural choice',
      'Monotonic stack for next greater/smaller problems',
      'Stack can store indices for more information',
      'Combine with hash map for O(1) min/max operations',
    ],
    commonMistakes: [
      'Popping from empty stack',
      'Not handling remaining elements in stack',
      'Incorrect order of operations for expressions',
      'Stack overflow in deep recursion scenarios',
    ],
    timeComplexity: {
      typical: 'O(n)',
      best: 'O(1) for push/pop operations',
      worst: 'O(n) for processing all elements',
    },
    spaceComplexity: {
      typical: 'O(n)',
      notes: 'Worst case stores all elements',
    },
    relatedPatterns: ['arrays-hashing', 'string', 'monotonic-stack'],
    prerequisites: ['arrays-hashing'],
    codeTemplate: `def next_greater_element(nums):
    result = [-1] * len(nums)
    stack = []  # Store indices

    for i, num in enumerate(nums):
        while stack and nums[stack[-1]] < num:
            result[stack.pop()] = num
        stack.append(i)

    return result`,
    examples: [
      'Valid Parentheses: Check bracket matching',
      'Next Greater Element: Find next larger number',
      'Daily Temperatures: Days until warmer',
      'Evaluate Reverse Polish Notation',
    ],
    interviewTips: [
      'Consider what to store: values or indices',
      'Think about what happens to remaining stack elements',
      'Monotonic stack = maintaining increasing/decreasing order',
    ],
  },
  {
    pattern: 'trees',
    displayName: 'Binary Trees',
    description: 'Hierarchical data structure with recursive nature. Most tree problems use DFS (recursion) or BFS (level-order). Master both traversal patterns.',
    whenToUse: [
      'Any hierarchical data problem',
      'Path sum problems',
      'Tree traversal (inorder, preorder, postorder)',
      'Finding ancestors or descendants',
      'Validating tree properties (BST, balanced)',
    ],
    keyInsights: [
      'Most tree problems are naturally recursive',
      'Think about: what does each node need to return?',
      'DFS for depth-related problems, BFS for level-related',
      'Base case is usually null node',
    ],
    commonMistakes: [
      'Forgetting to handle null nodes',
      'Incorrect recursion base case',
      'Modifying tree during traversal incorrectly',
      'Confusing inorder/preorder/postorder',
    ],
    timeComplexity: {
      typical: 'O(n) - visit each node once',
      best: 'O(1) for leaf operations',
      worst: 'O(n) for unbalanced trees',
    },
    spaceComplexity: {
      typical: 'O(h) where h is height',
      notes: 'O(log n) for balanced, O(n) for skewed trees',
    },
    relatedPatterns: ['graphs', 'dp-1d', 'bfs'],
    prerequisites: ['arrays-hashing', 'stack'],
    codeTemplate: `def dfs(node):
    if not node:
        return base_case

    left = dfs(node.left)
    right = dfs(node.right)

    # Combine results
    return combine(node.val, left, right)`,
    examples: [
      'Maximum Depth of Binary Tree',
      'Invert Binary Tree',
      'Validate Binary Search Tree',
      'Lowest Common Ancestor',
    ],
    interviewTips: [
      'Ask about tree properties: BST? Balanced? Complete?',
      'Consider both recursive and iterative solutions',
      'Draw the tree and trace through your algorithm',
    ],
  },
  {
    pattern: 'graphs',
    displayName: 'Graph Traversal',
    description: 'DFS and BFS for graph problems. Handle cycles with visited set. Common for connectivity, shortest paths, and topological ordering.',
    whenToUse: [
      'Finding connected components',
      'Detecting cycles',
      'Shortest path (unweighted: BFS)',
      'Topological sorting',
      'Island counting problems',
    ],
    keyInsights: [
      'Always track visited nodes to handle cycles',
      'Build adjacency list for efficient traversal',
      'BFS gives shortest path in unweighted graphs',
      'DFS is often simpler for connectivity problems',
    ],
    commonMistakes: [
      'Forgetting visited set (infinite loops)',
      'Not handling disconnected components',
      'Incorrect cycle detection logic',
      'Wrong graph representation for the problem',
    ],
    timeComplexity: {
      typical: 'O(V + E)',
      best: 'O(1) for cached/memoized results',
      worst: 'O(V + E) for full traversal',
    },
    spaceComplexity: {
      typical: 'O(V)',
      notes: 'For visited set and recursion stack',
    },
    relatedPatterns: ['trees', 'bfs', 'topological-sort'],
    prerequisites: ['trees', 'stack'],
    codeTemplate: `def dfs(graph, start):
    visited = set()

    def explore(node):
        if node in visited:
            return
        visited.add(node)
        for neighbor in graph[node]:
            explore(neighbor)

    explore(start)
    return visited`,
    examples: [
      'Number of Islands',
      'Clone Graph',
      'Course Schedule (Topological Sort)',
      'Pacific Atlantic Water Flow',
    ],
    interviewTips: [
      'Ask about graph properties: directed? weighted? cycles?',
      'Clarify input format and build adjacency list',
      'Consider edge cases: empty graph, single node',
    ],
  },
  {
    pattern: 'dp-1d',
    displayName: 'Dynamic Programming (1D)',
    description: 'Break problem into overlapping subproblems. Store solutions to avoid recomputation. Start with recurrence relation, then optimize.',
    whenToUse: [
      'Counting ways to reach a goal',
      'Optimization problems (min/max)',
      'Problems with optimal substructure',
      'Fibonacci-like sequences',
      'String problems with substring dependencies',
    ],
    keyInsights: [
      'Define state clearly: what does dp[i] represent?',
      'Find recurrence relation: how does dp[i] relate to previous states?',
      'Identify base cases carefully',
      'Often can optimize from O(n) space to O(1)',
    ],
    commonMistakes: [
      'Wrong state definition',
      'Missing base cases',
      'Incorrect iteration order',
      'Off-by-one errors in array indices',
    ],
    timeComplexity: {
      typical: 'O(n)',
      best: 'O(1) with memoization for repeated queries',
      worst: 'O(n²) for some variations',
    },
    spaceComplexity: {
      typical: 'O(n), optimizable to O(1)',
      notes: 'Space can often be reduced by only keeping needed states',
    },
    relatedPatterns: ['dp-2d', 'arrays-hashing'],
    prerequisites: ['arrays-hashing'],
    codeTemplate: `def dp_solution(n):
    # Base cases
    dp = [0] * (n + 1)
    dp[0] = base_case_0
    dp[1] = base_case_1

    # Fill DP table
    for i in range(2, n + 1):
        dp[i] = recurrence(dp[i-1], dp[i-2], ...)

    return dp[n]`,
    examples: [
      'Climbing Stairs',
      'House Robber',
      'Coin Change',
      'Longest Increasing Subsequence',
    ],
    interviewTips: [
      'Start with brute force recursion, then memoize',
      'Clearly explain your state definition',
      'Walk through small examples to verify recurrence',
    ],
  },
  {
    pattern: 'dp-2d',
    displayName: 'Dynamic Programming (2D)',
    description: 'DP with two dimensions, typically for string/grid problems. State depends on two variables. Common for edit distance, LCS, and grid paths.',
    whenToUse: [
      'Comparing two strings',
      'Grid-based problems',
      'Knapsack-style problems',
      'Longest common subsequence',
      'Edit distance calculations',
    ],
    keyInsights: [
      'State usually represents (i, j) position or (length1, length2)',
      'Draw the DP table to visualize relationships',
      'Often can be optimized to 1D by processing row by row',
      'Consider diagonal, row, or column dependencies',
    ],
    commonMistakes: [
      'Incorrect table dimensions',
      'Wrong initialization of first row/column',
      'Confusing rows and columns',
      'Forgetting to handle empty string/array cases',
    ],
    timeComplexity: {
      typical: 'O(m × n)',
      best: 'O(m × n)',
      worst: 'O(m × n)',
    },
    spaceComplexity: {
      typical: 'O(m × n), often optimizable to O(min(m, n))',
      notes: 'Can often use rolling array technique',
    },
    relatedPatterns: ['dp-1d', 'string'],
    prerequisites: ['dp-1d'],
    codeTemplate: `def dp_2d(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # Base cases
    for i in range(m + 1):
        dp[i][0] = base_case_col
    for j in range(n + 1):
        dp[0][j] = base_case_row

    # Fill table
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            dp[i][j] = recurrence(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])

    return dp[m][n]`,
    examples: [
      'Longest Common Subsequence',
      'Edit Distance',
      'Unique Paths',
      'Interleaving String',
    ],
    interviewTips: [
      'Draw the DP table and fill in by hand first',
      'Explain what each cell represents',
      'Discuss space optimization if relevant',
    ],
  },
  {
    pattern: 'greedy',
    displayName: 'Greedy Algorithms',
    description: 'Make locally optimal choices at each step. Works when local optimum leads to global optimum. Faster than DP when applicable.',
    whenToUse: [
      'Interval scheduling problems',
      'Activity selection',
      'Huffman coding',
      'Minimum spanning tree',
      'When "take the best available" works',
    ],
    keyInsights: [
      'Prove greedy choice property: local optimal leads to global',
      'Often requires sorting first',
      'Not all optimization problems are greedy',
      'If greedy fails, try DP',
    ],
    commonMistakes: [
      'Assuming greedy works without proof',
      'Incorrect sorting criteria',
      'Not considering all cases',
      'Missing edge cases after greedy selection',
    ],
    timeComplexity: {
      typical: 'O(n log n) due to sorting',
      best: 'O(n) if no sorting needed',
      worst: 'O(n log n)',
    },
    spaceComplexity: {
      typical: 'O(1) to O(n)',
      notes: 'Depends on whether input is modified',
    },
    relatedPatterns: ['dp-1d', 'heap', 'intervals'],
    prerequisites: ['arrays-hashing'],
    codeTemplate: `def greedy_solution(intervals):
    # Sort by end time (or start time, depending on problem)
    intervals.sort(key=lambda x: x[1])

    result = []
    last_end = float('-inf')

    for start, end in intervals:
        if start >= last_end:
            result.append((start, end))
            last_end = end

    return result`,
    examples: [
      'Non-overlapping Intervals',
      'Jump Game',
      'Gas Station',
      'Task Scheduler',
    ],
    interviewTips: [
      'Explain why greedy works for this problem',
      'Consider counterexamples where greedy might fail',
      'If unsure, mention DP as alternative',
    ],
  },
  {
    pattern: 'heap',
    displayName: 'Heap / Priority Queue',
    description: 'Efficiently find min/max elements. Useful for scheduling, finding k-th element, and merging sorted lists.',
    whenToUse: [
      'Need repeated min/max operations',
      'K-th largest/smallest element',
      'Merging k sorted lists',
      'Scheduling by priority',
      'Median finding (two heaps)',
    ],
    keyInsights: [
      'Min-heap: smallest element at root',
      'Use negative values for max-heap in languages with only min-heap',
      'Heap of size k for finding k-th element',
      'Two heaps can track running median',
    ],
    commonMistakes: [
      'Forgetting heap is not sorted',
      'Wrong heap type (min vs max)',
      'Not handling heap of custom objects correctly',
      'Excessive heap operations when simpler solution exists',
    ],
    timeComplexity: {
      typical: 'O(n log k) for k-element problems',
      best: 'O(1) for peek',
      worst: 'O(log n) for push/pop',
    },
    spaceComplexity: {
      typical: 'O(k) for k-element heap',
      notes: 'Full heap is O(n)',
    },
    relatedPatterns: ['greedy', 'arrays-hashing'],
    prerequisites: ['arrays-hashing'],
    codeTemplate: `import heapq

def find_kth_largest(nums, k):
    # Min-heap of size k
    heap = []
    for num in nums:
        heapq.heappush(heap, num)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]`,
    examples: [
      'Kth Largest Element in an Array',
      'Top K Frequent Elements',
      'Merge k Sorted Lists',
      'Find Median from Data Stream',
    ],
    interviewTips: [
      'Mention heap vs sorting trade-offs',
      'Consider if QuickSelect is better for k-th element',
      'Clarify if online (streaming) or offline',
    ],
  },
  {
    pattern: 'backtracking',
    displayName: 'Backtracking',
    description: 'Explore all possibilities by building solutions incrementally and abandoning (backtracking) when constraints are violated.',
    whenToUse: [
      'Generating all permutations/combinations',
      'Sudoku solver',
      'N-Queens problem',
      'Word search in grid',
      'When you need to "try all possibilities"',
    ],
    keyInsights: [
      'Build solution incrementally',
      'Prune early when constraints are violated',
      'Undo choice after exploring (backtrack)',
      'Base case: valid complete solution',
    ],
    commonMistakes: [
      'Forgetting to undo choices',
      'Not pruning effectively',
      'Incorrect base case',
      'Generating duplicates',
    ],
    timeComplexity: {
      typical: 'O(n!) for permutations, O(2^n) for subsets',
      best: 'With good pruning, much better in practice',
      worst: 'Exponential',
    },
    spaceComplexity: {
      typical: 'O(n) for recursion depth',
      notes: 'Plus O(k) for storing current path',
    },
    relatedPatterns: ['dp-1d', 'graphs'],
    prerequisites: ['arrays-hashing', 'trees'],
    codeTemplate: `def backtrack(path, choices):
    if is_solution(path):
        result.append(path[:])
        return

    for choice in choices:
        if is_valid(choice):
            path.append(choice)       # Make choice
            backtrack(path, remaining_choices)
            path.pop()                # Undo choice`,
    examples: [
      'Permutations',
      'Subsets',
      'N-Queens',
      'Word Search',
    ],
    interviewTips: [
      'Draw the decision tree',
      'Explain pruning conditions clearly',
      'Discuss time complexity honestly',
    ],
  },
  {
    pattern: 'trie',
    displayName: 'Trie (Prefix Tree)',
    description: 'Tree-based data structure for efficient string operations. Perfect for prefix matching, autocomplete, and word dictionaries.',
    whenToUse: [
      'Autocomplete/prefix search',
      'Spell checking',
      'Word dictionary operations',
      'Finding words with common prefixes',
      'IP routing (longest prefix match)',
    ],
    keyInsights: [
      'Each node represents a character',
      'Path from root to node = prefix',
      'End-of-word flag marks complete words',
      'Trade space for time: O(m) search where m = word length',
    ],
    commonMistakes: [
      'Forgetting end-of-word markers',
      'Incorrect handling of empty strings',
      'Memory-intensive for sparse tries',
      'Not considering character set size',
    ],
    timeComplexity: {
      typical: 'O(m) where m is word length',
      best: 'O(1) for single character',
      worst: 'O(m)',
    },
    spaceComplexity: {
      typical: 'O(alphabet_size × total_characters)',
      notes: 'Can be optimized with compression',
    },
    relatedPatterns: ['trees', 'string'],
    prerequisites: ['trees'],
    codeTemplate: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True`,
    examples: [
      'Implement Trie',
      'Word Search II',
      'Design Add and Search Words',
      'Longest Word in Dictionary',
    ],
    interviewTips: [
      'Consider hash map vs array for children',
      'Discuss memory optimization options',
      'Compare with hash set for simple cases',
    ],
  },
  {
    pattern: 'bit-manipulation',
    displayName: 'Bit Manipulation',
    description: 'Operations on binary representations. Useful for optimization, XOR tricks, and when dealing with sets of flags.',
    whenToUse: [
      'Single number in pairs problem',
      'Power of two checks',
      'Counting set bits',
      'Subset generation',
      'Low-level optimization',
    ],
    keyInsights: [
      'XOR: a ^ a = 0, a ^ 0 = a',
      'AND with (n-1) clears lowest set bit',
      'Left shift = multiply by 2',
      'Right shift = divide by 2',
    ],
    commonMistakes: [
      'Integer overflow/underflow',
      'Wrong operator precedence',
      'Signed vs unsigned issues',
      'Forgetting edge cases (0, negative numbers)',
    ],
    timeComplexity: {
      typical: 'O(1) to O(log n)',
      best: 'O(1) for single operations',
      worst: 'O(n) for bit-by-bit processing',
    },
    spaceComplexity: {
      typical: 'O(1)',
      notes: 'Usually just working with integers',
    },
    relatedPatterns: ['arrays-hashing'],
    prerequisites: [],
    codeTemplate: `# Common operations
n & (n - 1)      # Clear lowest set bit
n & (-n)         # Get lowest set bit
n | (1 << k)     # Set k-th bit
n & ~(1 << k)    # Clear k-th bit
(n >> k) & 1     # Get k-th bit`,
    examples: [
      'Single Number',
      'Number of 1 Bits',
      'Counting Bits',
      'Reverse Bits',
    ],
    interviewTips: [
      'Explain the bit operation you\'re using',
      'Write out binary examples',
      'Be careful with signed integers',
    ],
  },
  {
    pattern: 'intervals',
    displayName: 'Intervals',
    description: 'Problems involving ranges of numbers. Often require sorting and merging/finding overlaps.',
    whenToUse: [
      'Merging overlapping intervals',
      'Finding interval intersections',
      'Scheduling/calendar problems',
      'Minimum meeting rooms',
      'Insert interval',
    ],
    keyInsights: [
      'Sort by start time (usually)',
      'Compare end of current with start of next',
      'Use min-heap for meeting rooms',
      'Draw timeline to visualize',
    ],
    commonMistakes: [
      'Incorrect overlap condition',
      'Not handling edge cases (touching intervals)',
      'Wrong sorting criteria',
      'Modifying input while iterating',
    ],
    timeComplexity: {
      typical: 'O(n log n) due to sorting',
      best: 'O(n) if already sorted',
      worst: 'O(n log n)',
    },
    spaceComplexity: {
      typical: 'O(n) for result',
      notes: 'O(1) if in-place modification allowed',
    },
    relatedPatterns: ['greedy', 'heap', 'arrays-hashing'],
    prerequisites: ['arrays-hashing'],
    codeTemplate: `def merge_intervals(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]

    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])

    return merged`,
    examples: [
      'Merge Intervals',
      'Insert Interval',
      'Non-overlapping Intervals',
      'Meeting Rooms II',
    ],
    interviewTips: [
      'Clarify: are intervals inclusive/exclusive?',
      'Draw timeline for complex cases',
      'Consider what to do with touching intervals',
    ],
  },
  {
    pattern: 'linked-list',
    displayName: 'Linked List',
    description: 'Sequential data structure with node pointers. Unique operations like in-place reversal and cycle detection.',
    whenToUse: [
      'Frequent insertions/deletions',
      'Unknown size (dynamic)',
      'Implementing queue/stack',
      'LRU cache',
      'Polynomial representation',
    ],
    keyInsights: [
      'Dummy head simplifies edge cases',
      'Two pointers for cycle detection (Floyd\'s)',
      'Reverse by changing pointer directions',
      'Draw diagrams to track pointers',
    ],
    commonMistakes: [
      'Losing reference to next node',
      'Null pointer exceptions',
      'Not updating all necessary pointers',
      'Off-by-one in length calculations',
    ],
    timeComplexity: {
      typical: 'O(n) for traversal',
      best: 'O(1) for head operations',
      worst: 'O(n) for search/access by index',
    },
    spaceComplexity: {
      typical: 'O(1) for in-place operations',
      notes: 'O(n) for recursive approaches',
    },
    relatedPatterns: ['two-pointers', 'arrays-hashing'],
    prerequisites: [],
    codeTemplate: `def reverse_list(head):
    prev = None
    curr = head

    while curr:
        next_temp = curr.next
        curr.next = prev
        prev = curr
        curr = next_temp

    return prev`,
    examples: [
      'Reverse Linked List',
      'Merge Two Sorted Lists',
      'Linked List Cycle',
      'Remove Nth Node From End',
    ],
    interviewTips: [
      'Always use dummy head for cleaner code',
      'Draw pointer changes step by step',
      'Consider iterative vs recursive trade-offs',
    ],
  },
  {
    pattern: 'string',
    displayName: 'String Manipulation',
    description: 'Text processing problems. Often combined with other patterns like sliding window or DP.',
    whenToUse: [
      'Parsing and validation',
      'Pattern matching',
      'String transformation',
      'Anagram and palindrome problems',
      'Substring searches',
    ],
    keyInsights: [
      'Strings are immutable in many languages - use StringBuilder/list',
      'Character frequency counting with hash map',
      'Two-pointer for palindrome checks',
      'Consider ASCII/Unicode differences',
    ],
    commonMistakes: [
      'String concatenation in loops (O(n²))',
      'Case sensitivity issues',
      'Whitespace handling',
      'Unicode/special character issues',
    ],
    timeComplexity: {
      typical: 'O(n) for single pass',
      best: 'O(1) for length, char access',
      worst: 'O(n²) for naive substring search',
    },
    spaceComplexity: {
      typical: 'O(n) for new strings',
      notes: 'O(1) for in-place on mutable strings',
    },
    relatedPatterns: ['sliding-window', 'two-pointers', 'dp-2d'],
    prerequisites: ['arrays-hashing'],
    codeTemplate: `def is_anagram(s, t):
    if len(s) != len(t):
        return False

    count = {}
    for c in s:
        count[c] = count.get(c, 0) + 1

    for c in t:
        if c not in count or count[c] == 0:
            return False
        count[c] -= 1

    return True`,
    examples: [
      'Valid Anagram',
      'Longest Palindromic Substring',
      'String to Integer (atoi)',
      'Longest Common Prefix',
    ],
    interviewTips: [
      'Clarify: case sensitive? whitespace handling?',
      'Use character arrays for efficiency',
      'Consider using built-in functions appropriately',
    ],
  },
  {
    pattern: 'matrix',
    displayName: 'Matrix / 2D Grid',
    description: 'Operations on 2D arrays. Common patterns include traversal, rotation, and BFS/DFS on grids.',
    whenToUse: [
      'Grid traversal and search',
      'Image processing',
      'Game board problems',
      'Path finding in 2D',
      'Matrix rotation/transformation',
    ],
    keyInsights: [
      'Use direction arrays for cleaner code: [(0,1), (1,0), (0,-1), (-1,0)]',
      'Row = y, Column = x (be consistent)',
      'In-place operations often possible with clever indexing',
      'Spiral traversal: layer by layer',
    ],
    commonMistakes: [
      'Row/column confusion',
      'Out of bounds access',
      'Modifying matrix while iterating',
      'Wrong dimensions for transposed matrix',
    ],
    timeComplexity: {
      typical: 'O(m × n)',
      best: 'O(1) for element access',
      worst: 'O(m × n) for full traversal',
    },
    spaceComplexity: {
      typical: 'O(1) to O(m × n)',
      notes: 'Depends on whether in-place modification allowed',
    },
    relatedPatterns: ['graphs', 'dp-2d', 'bfs'],
    prerequisites: ['arrays-hashing'],
    codeTemplate: `def traverse_matrix(matrix):
    if not matrix:
        return

    rows, cols = len(matrix), len(matrix[0])
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]

    for r in range(rows):
        for c in range(cols):
            for dr, dc in directions:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols:
                    # Process neighbor
                    pass`,
    examples: [
      'Rotate Image',
      'Spiral Matrix',
      'Set Matrix Zeroes',
      'Number of Islands (grid DFS)',
    ],
    interviewTips: [
      'Draw the matrix and trace through',
      'Use consistent row/col naming',
      'Consider space optimization (in-place)',
    ],
  },
  {
    pattern: 'arrays-hashing',
    displayName: 'Prefix Sum',
    description: 'Precompute cumulative sums for O(1) range queries. Useful for subarray sum problems.',
    whenToUse: [
      'Range sum queries',
      'Subarray sum problems',
      'Finding subarrays with target sum',
      '2D range sum queries',
      'Equilibrium point finding',
    ],
    keyInsights: [
      'prefix[i] = sum of elements 0 to i-1',
      'Range sum [i, j] = prefix[j+1] - prefix[i]',
      'Can be combined with hash map for target sum',
      '2D prefix sum for rectangle queries',
    ],
    commonMistakes: [
      'Off-by-one in prefix array indexing',
      'Forgetting prefix[0] = 0',
      'Integer overflow for large sums',
      'Wrong formula for range query',
    ],
    timeComplexity: {
      typical: 'O(n) preprocessing, O(1) query',
      best: 'O(1) per query after preprocessing',
      worst: 'O(n) for building prefix array',
    },
    spaceComplexity: {
      typical: 'O(n)',
      notes: 'O(n²) for 2D prefix sum',
    },
    relatedPatterns: ['arrays-hashing', 'sliding-window'],
    prerequisites: ['arrays-hashing'],
    codeTemplate: `def subarray_sum(nums, target):
    prefix_sum = {0: 1}
    current_sum = 0
    count = 0

    for num in nums:
        current_sum += num
        if current_sum - target in prefix_sum:
            count += prefix_sum[current_sum - target]
        prefix_sum[current_sum] = prefix_sum.get(current_sum, 0) + 1

    return count`,
    examples: [
      'Subarray Sum Equals K',
      'Range Sum Query',
      'Product of Array Except Self',
      'Contiguous Array',
    ],
    interviewTips: [
      'Explain the prefix sum concept clearly',
      'Draw out the prefix array',
      'Combine with hash map for O(n) solutions',
    ],
  },
]

/**
 * Get knowledge for a specific pattern
 */
export function getPatternKnowledge(pattern: DSAPattern): DSAPatternKnowledge | undefined {
  return DSA_PATTERN_KNOWLEDGE.find(k => k.pattern === pattern)
}

/**
 * Get all patterns with their knowledge
 */
export function getAllPatternKnowledge(): DSAPatternKnowledge[] {
  return DSA_PATTERN_KNOWLEDGE
}

/**
 * Get patterns by difficulty level
 */
export function getPatternsByDifficulty(level: 'beginner' | 'intermediate' | 'advanced'): DSAPatternKnowledge[] {
  const beginnerPatterns = ['arrays-hashing', 'two-pointers', 'sliding-window', 'binary-search', 'stack', 'string', 'linked-list']
  const intermediatePatterns = ['trees', 'graphs', 'dp-1d', 'greedy', 'heap', 'interval', 'matrix', 'prefix-sum']
  const advancedPatterns = ['dp-2d', 'backtracking', 'trie', 'bit-manipulation']

  switch (level) {
    case 'beginner':
      return DSA_PATTERN_KNOWLEDGE.filter(k => beginnerPatterns.includes(k.pattern))
    case 'intermediate':
      return DSA_PATTERN_KNOWLEDGE.filter(k => intermediatePatterns.includes(k.pattern))
    case 'advanced':
      return DSA_PATTERN_KNOWLEDGE.filter(k => advancedPatterns.includes(k.pattern))
  }
}

/**
 * Get related patterns for a given pattern
 */
export function getRelatedPatterns(pattern: DSAPattern): DSAPatternKnowledge[] {
  const knowledge = getPatternKnowledge(pattern)
  if (!knowledge) return []

  return knowledge.relatedPatterns
    .map(p => getPatternKnowledge(p))
    .filter((k): k is DSAPatternKnowledge => k !== undefined)
}

/**
 * Convert pattern knowledge to RAG document format
 */
export function patternKnowledgeToDocument(knowledge: DSAPatternKnowledge): string {
  return `
# ${knowledge.displayName}

## Description
${knowledge.description}

## When to Use
${knowledge.whenToUse.map(w => `- ${w}`).join('\n')}

## Key Insights
${knowledge.keyInsights.map(i => `- ${i}`).join('\n')}

## Common Mistakes
${knowledge.commonMistakes.map(m => `- ${m}`).join('\n')}

## Time Complexity
- Typical: ${knowledge.timeComplexity.typical}
- Best: ${knowledge.timeComplexity.best}
- Worst: ${knowledge.timeComplexity.worst}

## Space Complexity
- Typical: ${knowledge.spaceComplexity.typical}
- Notes: ${knowledge.spaceComplexity.notes}

## Code Template
\`\`\`python
${knowledge.codeTemplate || 'No template available'}
\`\`\`

## Example Problems
${knowledge.examples?.map(e => `- ${e}`).join('\n') || 'No examples'}

## Interview Tips
${knowledge.interviewTips.map(t => `- ${t}`).join('\n')}
`.trim()
}
