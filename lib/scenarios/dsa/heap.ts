/**
 * Heap / Priority Queue DSA Scenarios
 * Pattern: heap-priority-queue
 */

import type { DSAScenario } from "../types"

export const heapScenarios: DSAScenario[] = [
  {
    id: "dsa-kth-largest-element",
    title: "Kth Largest Element in an Array",
    type: "dsa",
    pattern: "heap-priority-queue",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Apple"],
    description: "Pull the kth biggest value out of an unordered array",
    tags: ["array", "sorting", "heap", "quickselect"],
    estimatedTime: 20,
    problemStatement: `You're given nums, an array of integers, plus a number k. Report the value that would occupy the kth seat if the whole array were lined up from biggest to smallest.

Duplicates keep their own seats in that lineup: the ranking counts positions, not distinct values. Try to produce the answer without arranging the entire array in order first.`,
    examples: [
      {
        input: "nums = [9,1,8,2,7], k = 2",
        output: "8",
        explanation: "Ranked from the top the values run 9, 8, 7, 2, 1, and seat 2 holds 8.",
      },
      {
        input: "nums = [6,6,4,4,9,2,2,5], k = 3",
        output: "6",
        explanation: "Descending, the array reads 9, 6, 6, 5, 4, 4, 2, 2. Seat 3 holds a 6.",
      },
    ],
    constraints: [
      "k is valid: 1 <= k <= nums.length, and the array never exceeds 10^5 entries.",
      "Every value lands between -10^4 and 10^4 inclusive.",
    ],
    hints: [
      "Use a min heap of size k",
      "Alternative: QuickSelect algorithm for O(n) average time",
      "Keep only k largest elements in the heap",
    ],
    starterCode: {
      javascript: `function findKthLargest(nums, k) {
  // Write your solution here

}`,
      typescript: `function findKthLargest(nums: number[], k: number): number {
  // Write your solution here

}`,
      python: `def findKthLargest(nums, k):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int findKthLargest(int[] nums, int k) {
        // Write your solution here
        return 0;
    }
}`,
      cpp: `class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        // Write your solution here
        return 0;
    }
};`,
      csharp: `public class Solution {
    public int FindKthLargest(int[] nums, int k) {
        // Write your solution here
        return 0;
    }
}`,
      go: `func findKthLargest(nums []int, k int) int {
    // Write your solution here
    return 0
}`,
      rust: `impl Solution {
    pub fn find_kth_largest(nums: Vec<i32>, k: i32) -> i32 {
        // Write your solution here
        0
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [3, 2, 1, 5, 6, 4], k: 2 },
        expected: 5,
        description: "Basic case: k=2",
      },
      {
        input: { nums: [3, 2, 3, 1, 2, 4, 5, 5, 6], k: 4 },
        expected: 4,
        description: "Array with duplicates",
      },
      {
        input: { nums: [1], k: 1 },
        expected: 1,
        description: "Single element",
      },
      {
        input: { nums: [7, 6, 5, 4, 3, 2, 1], k: 5 },
        expected: 3,
        description: "Descending array",
      },
    ],
  },
  {
    id: "dsa-merge-k-sorted-lists",
    title: "Merge K Sorted Lists",
    type: "dsa",
    pattern: "heap-priority-queue",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Combine k individually sorted linked lists into one ordered list.",
    tags: ["linked-list", "heap", "divide-and-conquer"],
    estimatedTime: 30,
    problemStatement: `You're given lists, an array holding the heads of k separate linked lists. Every one of those lists is already arranged smallest to largest on its own.

Weave all of them together into a single linked list whose values run smallest to largest overall, and return its head. Every node from every input list must appear in the result.`,
    examples: [
      {
        input: "lists = [[2,3,9],[1,6,8],[4,5,6]]",
        output: "[1,2,3,4,5,6,6,8,9]",
      },
      {
        input: "lists = []",
        output: "[]",
      },
      {
        input: "lists = [[]]",
        output: "[]",
      },
    ],
    constraints: [
      "k matches the length of lists.",
      "There can be as few as 0 lists and as many as 10^4.",
      "An individual list holds from 0 up to 500 nodes.",
      "Node values span -10^4 through 10^4.",
      "Each input list already runs smallest to largest.",
      "Across all lists combined, the node count stays within 10^4.",
    ],
    hints: [
      "Use min heap to track smallest elements from each list",
      "Pop smallest, add to result, push next from that list",
      "Alternative: divide and conquer merge pairs",
    ],
    starterCode: {
      javascript: `function mergeKLists(lists) {
  // Write your solution here
  // lists is an array of linked list heads

}`,
      typescript: `function mergeKLists(lists: Array<ListNode | null>): ListNode | null {
  // Write your solution here

}`,
      python: `def mergeKLists(lists):
    # Write your solution here
    # lists is a list of linked list heads
    pass`,
    },
    optimalComplexity: {
      time: "O(N log k)",
      space: "O(k)",
    },
    testCases: [
      {
        input: {
          lists: [
            [1, 4, 5],
            [1, 3, 4],
            [2, 6],
          ],
        },
        expected: [1, 1, 2, 3, 4, 4, 5, 6],
        description: "Merge three sorted lists",
      },
      {
        input: { lists: [] },
        expected: [],
        description: "Empty input",
      },
      {
        input: { lists: [[]] },
        expected: [],
        description: "Single empty list",
      },
      {
        input: { lists: [[1], [2], [3]] },
        expected: [1, 2, 3],
        description: "Single element lists",
      },
      {
        input: { lists: [[1, 2, 3]] },
        expected: [1, 2, 3],
        description: "Single list",
      },
    ],
  },
  {
    id: "dsa-find-median-data-stream",
    title: "Find Median from Data Stream",
    type: "dsa",
    pattern: "heap-priority-queue",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "Spotify"],
    description: "Design a data structure that supports finding median in O(1).",
    tags: ["design", "heap", "two-heaps"],
    estimatedTime: 35,
    problemStatement: `Numbers arrive one at a time, and you must be ready to report the median at any moment. Build a class named MedianFinder exposing this interface:

- MedianFinder() constructs an empty container.
- void addNum(int num) folds the integer num into whatever has arrived so far.
- double findMedian() reports the current median.

For an odd count of stored values, the median is the single middle entry once everything stands in ascending order. For an even count there are two middle entries, and the median becomes their average.`,
    examples: [
      {
        input:
          '["MedianFinder", "addNum", "addNum", "findMedian", "addNum", "findMedian"]\n[[], [5], [9], [], [2], []]',
        output: "[null, null, null, 7.0, null, 5.0]",
        explanation:
          "With 5 and 9 stored, the middles average to 7.0. Once 2 arrives, the median is 5.",
      },
    ],
    constraints: [
      "Every incoming value satisfies -10^5 <= num <= 10^5.",
      "findMedian is never invoked before at least one value has arrived.",
      "Combined, addNum and findMedian are called no more than 5 * 10^4 times.",
    ],
    hints: [
      "Use two heaps: max heap for smaller half, min heap for larger half",
      "Keep heaps balanced: sizes differ by at most 1",
      "Median is top of larger heap or average of both tops",
    ],
    starterCode: {
      javascript: `class MedianFinder {
  constructor() {
    // Initialize your data structure here

  }

  addNum(num) {
    // Add a number to the data structure

  }

  findMedian() {
    // Return the median of all elements

  }
}`,
      typescript: `class MedianFinder {
  constructor() {
    // Initialize your data structure here

  }

  addNum(num: number): void {
    // Add a number to the data structure

  }

  findMedian(): number {
    // Return the median of all elements

  }
}`,
      python: `class MedianFinder:
    def __init__(self):
        # Initialize your data structure here
        pass

    def addNum(self, num: int) -> None:
        # Add a number to the data structure
        pass

    def findMedian(self) -> float:
        # Return the median of all elements
        pass`,
    },
    optimalComplexity: {
      time: "O(log n) add, O(1) find",
      space: "O(n)",
    },
    // Class-invocation shape, matching dsa-lru-cache: the constructor is operations[0] and
    // every entry in `values` is an ARGUMENT ARRAY. These cases previously listed bare scalars
    // (`values: [1, 2, null]`), which `new MedianFinder(...args)` spreads, throwing before any
    // candidate code ran; and they omitted the constructor, so the wrapper's `i === 0` branch
    // consumed the first addNum as the constructor call. A correct solution could not pass.
    testCases: [
      {
        input: {
          operations: ["MedianFinder", "addNum", "addNum", "findMedian"],
          values: [[], [1], [2], []],
        },
        expected: [null, null, null, 1.5],
        description: "Two elements - even count",
      },
      {
        input: {
          operations: ["MedianFinder", "addNum", "addNum", "addNum", "findMedian"],
          values: [[], [1], [2], [3], []],
        },
        expected: [null, null, null, null, 2.0],
        description: "Three elements - odd count",
      },
      {
        input: {
          operations: ["MedianFinder", "addNum", "findMedian"],
          values: [[], [5], []],
        },
        expected: [null, null, 5.0],
        description: "Single element",
      },
      {
        input: {
          operations: ["MedianFinder", "addNum", "addNum", "addNum", "addNum", "findMedian"],
          values: [[], [2], [3], [4], [5], []],
        },
        expected: [null, null, null, null, null, 3.5],
        description: "Four elements - average of middle two",
      },
    ],
  },
  // Note: Duplicate 'dsa-top-k-frequent' removed - use 'dsa-top-k-frequent-elements' in arrays-hashing
  {
    id: "dsa-task-scheduler",
    title: "Task Scheduler",
    type: "dsa",
    pattern: "heap-priority-queue",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Fit repeating jobs around a same-type cooldown in the fewest time units",
    tags: ["array", "sorting", "heap", "greedy"],
    estimatedTime: 30,
    problemStatement: `You're scheduling a processor. Its job queue arrives as tasks, where each entry is a capital letter naming a job type. Running any single job costs exactly one time unit, and the machine can also burn a unit doing nothing.

A recovery rule applies, controlled by n: once a job of some type runs, at least n time units must pass before another job of that same type may run. Jobs of different types are unaffected and can go back to back.

Return the smallest number of time units, idle gaps included, needed to finish everything in tasks.`,
    examples: [
      {
        input: 'tasks = ["X","X","X","X","Y","Y"], n = 2',
        output: "10",
        explanation: "X -> Y -> idle -> X -> Y -> idle -> X -> idle -> idle -> X",
      },
      {
        input: 'tasks = ["P","P","Q","Q"], n = 0',
        output: "4",
        explanation: "With no recovery gap, any order finishes without idling",
      },
      { input: 'tasks = ["M","M","M","M","M","N","O","P","Q","R"], n = 3', output: "17" },
    ],
    constraints: [
      "The queue holds between 1 and 10^4 jobs.",
      "Every entry in tasks is a capital English letter.",
      "The recovery gap n stays within 0 <= n <= 100.",
    ],
    hints: [
      "Count frequency of each task",
      "Use max heap to always schedule most frequent task",
      "Track cooling time for each task",
    ],
    starterCode: {
      javascript: `function leastInterval(tasks, n) {\n  // Write your solution here\n\n}`,
      typescript: `function leastInterval(tasks: string[], n: number): number {\n  // Write your solution here\n\n}`,
      python: `def leastInterval(tasks, n):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      {
        input: { tasks: ["A", "A", "A", "B", "B", "B"], n: 2 },
        expected: 8,
        description: "With cooling",
      },
      {
        input: { tasks: ["A", "A", "A", "B", "B", "B"], n: 0 },
        expected: 6,
        description: "No cooling",
      },
      {
        input: { tasks: ["A"], n: 5 },
        expected: 1,
        description: "Single task",
      },
      {
        input: { tasks: ["A", "A", "A", "A"], n: 3 },
        expected: 13,
        description: "High cooling with repeats",
      },
    ],
  },
  {
    id: "dsa-k-closest-points-origin",
    title: "K Closest Points to Origin",
    type: "dsa",
    pattern: "heap-priority-queue",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Apple", "Snap"],
    description: "Pick the k points sitting nearest the origin on a plane",
    tags: ["array", "sorting", "heap", "quickselect"],
    estimatedTime: 20,
    problemStatement: `You're given points, a collection of coordinates on a flat plane with points[i] = [xi, yi], plus an integer k. Measure how far each point sits from the origin (0, 0) using ordinary straight-line (Euclidean) distance, then pick out the k entries lying nearest.

Hand those k points back in whatever arrangement you like; no particular ordering is expected.`,
    examples: [
      {
        input: "points = [[4,1],[-1,2]], k = 1",
        output: "[[-1,2]]",
        explanation: "Distance of (4,1) = sqrt(17), (-1,2) = sqrt(5). Nearest is (-1,2).",
      },
      { input: "points = [[2,2],[-3,4],[5,-6]], k = 2", output: "[[2,2],[-3,4]]" },
    ],
    constraints: [
      "The count k is valid: 1 <= k <= points.length <= 10^4.",
      "Coordinates sit strictly inside -10^4 < xi, yi < 10^4.",
    ],
    hints: [
      "Use max heap of size k",
      "Store negative distance to simulate max heap",
      "Alternative: QuickSelect for O(n) average",
    ],
    starterCode: {
      javascript: `function kClosest(points, k) {\n  // Write your solution here\n\n}`,
      typescript: `function kClosest(points: number[][], k: number): number[][] {\n  // Write your solution here\n\n}`,
      python: `def kClosest(points, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n log k)", space: "O(k)" },
    testCases: [
      {
        input: {
          points: [
            [1, 3],
            [-2, 2],
          ],
          k: 1,
        },
        expected: [[-2, 2]],
        description: "Single closest",
      },
      {
        input: {
          points: [
            [3, 3],
            [5, -1],
            [-2, 4],
          ],
          k: 2,
        },
        expected: [
          [3, 3],
          [-2, 4],
        ],
        description: "Two closest (order may vary)",
        compareAsSet: true,
      },
    ],
  },
  {
    id: "dsa-reorganize-string",
    title: "Reorganize String",
    type: "dsa",
    pattern: "heap-priority-queue",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google"],
    description: "Reorder a string so identical letters never touch",
    tags: ["string", "hash-table", "heap", "greedy"],
    estimatedTime: 25,
    problemStatement: `You're given a string s. Shuffle its letters into a new order in which no letter ever lands immediately beside a copy of itself. Any ordering that obeys the rule is acceptable, so return whichever one you produce. If every possible ordering puts two identical letters side by side somewhere, return the empty string "" instead.`,
    examples: [
      { input: 's = "ddc"', output: '"dcd"' },
      { input: 's = "zzzq"', output: '""', explanation: "Three z's cannot avoid touching." },
    ],
    constraints: [
      "The length of s runs from 1 to 500.",
      "Only lowercase English letters appear in s.",
    ],
    hints: [
      "Count character frequencies",
      "Use max heap to always pick most frequent char",
      "Alternate between most frequent characters",
    ],
    starterCode: {
      javascript: `function reorganizeString(s) {\n  // Write your solution here\n\n}`,
      typescript: `function reorganizeString(s: string): string {\n  // Write your solution here\n\n}`,
      python: `def reorganizeString(s):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n log k)", space: "O(k)" },
    testCases: [
      { input: { s: "aab" }, expected: "aba", description: "Valid rearrangement" },
      { input: { s: "aaab" }, expected: "", description: "Impossible - one char dominates" },
      {
        input: { s: "aabb" },
        expected: "abab",
        description: "Two chars equal frequency",
        orderMatters: false,
      },
      { input: { s: "a" }, expected: "a", description: "Single character" },
      {
        input: { s: "ab" },
        expected: "ab",
        description: "Two different chars",
        orderMatters: false,
      },
    ],
  },
  {
    id: "dsa-rearrange-string-k-distance",
    title: "Rearrange String k Distance Apart",
    type: "dsa",
    pattern: "heap-priority-queue",
    difficulty: "hard",
    companies: ["Google", "Amazon", "Meta", "Microsoft"],
    description: "Space repeated letters at least k slots away from each other",
    tags: ["string", "hash-table", "heap", "greedy", "queue"],
    estimatedTime: 35,
    problemStatement: `You're given a string s along with an integer k. Reshuffle the characters so that any two occurrences of the same letter end up at least k positions apart in the final string.

Sometimes the letters cannot be spread that thin. When no valid arrangement exists, return the empty string "".`,
    examples: [
      {
        input: 's = "wwxxyyzz", k = 4',
        output: '"wxyzwxyz"',
        explanation: "Matching letters land exactly 4 slots apart.",
      },
      {
        input: 's = "ggghi", k = 4',
        output: '""',
        explanation: "Three g's would need a string of length 9; only 5 characters exist.",
      },
      {
        input: 's = "ppqqrrs", k = 2',
        output: '"pqrpqrs"',
        explanation: "No letter reappears until at least 2 positions have passed.",
      },
    ],
    constraints: [
      "s holds between 1 and 3 * 10^5 characters.",
      "Nothing but lowercase English letters appears in s.",
      "k stays within 0 <= k <= s.length.",
    ],
    hints: [
      "Use a max heap to always pick the most frequent available character",
      "Use a wait queue to track characters that can't be used yet",
      "After placing a character, it must wait k turns before being available",
      "If heap is empty but string not complete, impossible",
    ],
    starterCode: {
      javascript: `function rearrangeString(s, k) {
  // Write your solution here

}`,
      typescript: `function rearrangeString(s: string, k: number): string {
  // Write your solution here

}`,
      python: `def rearrangeString(s, k):
    # Write your solution here
    pass`,
      java: `class Solution {
    public String rearrangeString(String s, int k) {
        // Write your solution here
        return "";
    }
}`,
    },
    optimalComplexity: { time: "O(n log 26) = O(n)", space: "O(26) = O(1)" },
    testCases: [
      { input: { s: "aabbcc", k: 3 }, expected: "abcabc", description: "Valid rearrangement" },
      { input: { s: "aaabc", k: 3 }, expected: "", description: "Impossible" },
      { input: { s: "aaadbbcc", k: 2 }, expected: "abacabcd", description: "k=2 spacing" },
      { input: { s: "aa", k: 0 }, expected: "aa", description: "k=0 means no restriction" },
      { input: { s: "aabb", k: 2 }, expected: "abab", description: "Alternating" },
    ],
  },
  // ==================== NEW HIGH-VALUE ADDITIONS ====================
  {
    id: "dsa-last-stone-weight",
    title: "Last Stone Weight",
    type: "dsa",
    pattern: "heap-priority-queue",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta"],
    description: "Play the stone-smashing game down to the final survivor",
    tags: ["array", "heap"],
    estimatedTime: 15,
    problemStatement: `You're given stones, an array of integers where stones[i] records how heavy the ith stone is. The game runs in rounds: each round you grab the two heaviest stones and slam them into each other. Call their weights x and y, with x <= y. Matching weights (x == y) shatter both stones to dust. Unequal weights destroy the lighter stone and grind the heavier one down to y - x.

The rounds continue until the pile is down to a single stone or nothing at all. Return that survivor's weight, or 0 when the pile ends up empty.`,
    examples: [
      {
        input: "stones = [6,2,6,5,4]",
        output: "1",
        explanation: "The two 6s cancel out, 5 and 4 grind to 1, then 2 and 1 leave 1",
      },
      { input: "stones = [4]", output: "4" },
    ],
    constraints: ["At least 1 stone is present, at most 30.", "Each weight is between 1 and 1000."],
    hints: [
      "Use max heap",
      "Pop two largest, push difference if non-zero",
      "Repeat until 0 or 1 stones left",
    ],
    starterCode: {
      javascript: `function lastStoneWeight(stones) {\n  // Write your solution here\n\n}`,
      typescript: `function lastStoneWeight(stones: number[]): number {\n  // Write your solution here\n\n}`,
      python: `def lastStoneWeight(stones):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n log n)", space: "O(n)" },
    testCases: [
      { input: { stones: [2, 7, 4, 1, 8, 1] }, expected: 1, description: "Standard case" },
      { input: { stones: [1] }, expected: 1, description: "Single stone" },
      { input: { stones: [2, 2] }, expected: 0, description: "Equal stones destroy" },
    ],
  },
  {
    id: "dsa-top-k-frequent-words",
    title: "Top K Frequent Words",
    type: "dsa",
    pattern: "heap-priority-queue",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Bloomberg"],
    description: "Rank the k most common words, settling ties alphabetically",
    tags: ["hash-table", "string", "heap", "sorting"],
    estimatedTime: 25,
    problemStatement: `You're given words, an array of strings, together with an integer k. Work out which k strings occur most often across the array and hand those back.

Arrange your answer so occurrence counts run from highest down to lowest. Whenever two words appear the same number of times, the one that comes first alphabetically claims the earlier spot.`,
    examples: [
      {
        input: 'words = ["gum","dew","gum","dew","bay","fog"], k = 3',
        output: '["dew","gum","bay"]',
      },
      {
        input: 'words = ["kit","rug","kit","fan","kit","rug","kit","fan","rug","zip"], k = 4',
        output: '["kit","rug","fan","zip"]',
      },
    ],
    constraints: [
      "The array carries between 1 and 500 words.",
      "Each word runs 1 to 10 characters.",
      "Words use lowercase English letters only.",
      "k never exceeds the count of distinct words and is at least 1.",
    ],
    hints: [
      "Count frequencies with hash map",
      "Use min heap of size k with custom comparator",
      "Or sort all unique words by (frequency desc, word asc)",
    ],
    starterCode: {
      javascript: `function topKFrequent(words, k) {\n  // Write your solution here\n\n}`,
      typescript: `function topKFrequent(words: string[], k: number): string[] {\n  // Write your solution here\n\n}`,
      python: `def topKFrequent(words, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n log k)", space: "O(n)" },
    testCases: [
      {
        input: { words: ["i", "love", "leetcode", "i", "love", "coding"], k: 2 },
        expected: ["i", "love"],
        description: "Basic case",
      },
      {
        input: {
          words: ["the", "day", "is", "sunny", "the", "the", "the", "sunny", "is", "is"],
          k: 4,
        },
        expected: ["the", "is", "sunny", "day"],
        description: "Tie-breaking",
      },
    ],
  },
]

export default heapScenarios
