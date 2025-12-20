/**
 * Heap / Priority Queue DSA Scenarios
 * Pattern: heap-priority-queue
 */

import type { DSAScenario } from '../types'

export const heapScenarios: DSAScenario[] = [
  {
    id: 'dsa-kth-largest-element',
    title: 'Kth Largest Element in an Array',
    type: 'dsa',
    pattern: 'heap-priority-queue',
    difficulty: 'medium',
    companies: ['Amazon', 'Meta', 'Google', 'Apple'],
    description: 'Find the kth largest element in an unsorted array',
    tags: ['array', 'heap', 'quickselect', 'sorting'],
    estimatedTime: 20,
    problemStatement: `Given an integer array nums and an integer k, return the kth largest element in the array.

Note that it is the kth largest element in the sorted order, not the kth distinct element.

Can you solve it without sorting?`,
    examples: [
      {
        input: 'nums = [3,2,1,5,6,4], k = 2',
        output: '5',
        explanation: 'The second largest element is 5.',
      },
      {
        input: 'nums = [3,2,3,1,2,4,5,5,6], k = 4',
        output: '4',
        explanation: 'The fourth largest element is 4.',
      },
    ],
    constraints: [
      '1 <= k <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
    ],
    hints: [
      'Use a min heap of size k',
      'Alternative: QuickSelect algorithm for O(n) average time',
      'Keep only k largest elements in the heap',
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
      time: 'O(n)',
      space: 'O(1)',
    },
    testCases: [
      {
        input: { nums: [3,2,1,5,6,4], k: 2 },
        expected: 5,
        description: 'Basic case: k=2',
      },
      {
        input: { nums: [3,2,3,1,2,4,5,5,6], k: 4 },
        expected: 4,
        description: 'Array with duplicates',
      },
      {
        input: { nums: [1], k: 1 },
        expected: 1,
        description: 'Single element',
      },
      {
        input: { nums: [7,6,5,4,3,2,1], k: 5 },
        expected: 3,
        description: 'Descending array',
      },
    ],
  },
  {
    id: 'dsa-merge-k-sorted-lists',
    title: 'Merge K Sorted Lists',
    type: 'dsa',
    pattern: 'heap-priority-queue',
    difficulty: 'hard',
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: 'Merge k sorted linked lists into one sorted list.',
    tags: ["heap", "linked-list", "divide-and-conquer"],
    estimatedTime: 30,
    problemStatement: `You are given an array of k linked-lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.`,
    examples: [
    {
      input: 'lists = [[1,4,5],[1,3,4],[2,6]]',
      output: '[1,1,2,3,4,4,5,6]'
    },
    {
      input: 'lists = []',
      output: '[]'
    }
  ],
    constraints: [
    'k == lists.length',
    '0 <= k <= 10^4',
    '0 <= lists[i].length <= 500',
    '-10^4 <= lists[i][j] <= 10^4'
  ],
    hints: [
    'Use min heap to track smallest elements from each list',
    'Pop smallest, add to result, push next from that list',
    'Alternative: divide and conquer merge pairs'
  ],
    starterCode: {
      javascript: `function merge_k_sorted_lists() {
  // Your code here
}`,
      python: `def merge_k_sorted_lists():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(N log k)',
      space: 'O(k)'
    },
    testCases: []
  },
  {
    id: 'dsa-find-median-data-stream',
    title: 'Find Median from Data Stream',
    type: 'dsa',
    pattern: 'heap-priority-queue',
    difficulty: 'hard',
    companies: ["Amazon", "Google", "Meta"],
    description: 'Design a data structure that supports finding median in O(1).',
    tags: ["heap", "design", "two-heaps"],
    estimatedTime: 35,
    problemStatement: `Design a data structure that supports addNum(int num) and findMedian() operations. addNum adds an integer to the data structure, and findMedian returns the median of all elements.`,
    examples: [
    {
      input: 'addNum(1), addNum(2), findMedian(), addNum(3), findMedian()',
      output: '1.5, 2.0'
    }
  ],
    constraints: [
    '-10^5 <= num <= 10^5',
    'At most 5 * 10^4 calls to addNum and findMedian'
  ],
    hints: [
    'Use two heaps: max heap for smaller half, min heap for larger half',
    'Keep heaps balanced: sizes differ by at most 1',
    'Median is top of larger heap or average of both tops'
  ],
    starterCode: {
      javascript: `function find_median_data_stream() {
  // Your code here
}`,
      python: `def find_median_data_stream():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(log n) add, O(1) find',
      space: 'O(n)'
    },
    testCases: []
  },
  {
    id: 'dsa-top-k-frequent',
    title: 'Top K Frequent Elements',
    type: 'dsa',
    pattern: 'heap-priority-queue',
    difficulty: 'medium',
    companies: ["Amazon", "Google", "Meta"],
    description: 'Find k most frequent elements in array.',
    tags: ["heap", "hash-table", "bucket-sort"],
    estimatedTime: 25,
    problemStatement: `Given an integer array nums and an integer k, return the k most frequent elements. The answer can be returned in any order.`,
    examples: [
    {
      input: 'nums = [1,1,1,2,2,3], k = 2',
      output: '[1,2]'
    },
    {
      input: 'nums = [1], k = 1',
      output: '[1]'
    }
  ],
    constraints: [
    '1 <= nums.length <= 10^5',
    '1 <= k <= number of unique elements',
    '-10^4 <= nums[i] <= 10^4'
  ],
    hints: [
    'Count frequencies with HashMap',
    'Use min heap of size k to track top k',
    'Or use bucket sort: O(n) time'
  ],
    starterCode: {
      javascript: `function top_k_frequent() {
  // Your code here
}`,
      python: `def top_k_frequent():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(n log k) heap, O(n) bucket',
      space: 'O(n)'
    },
    testCases: []
  },
]

export default heapScenarios
