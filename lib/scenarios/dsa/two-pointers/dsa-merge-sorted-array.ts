import type { DSAScenario } from "../../types"

export const dsaMergeSortedArrayScenario: DSAScenario = {
  id: "dsa-merge-sorted-array",
  title: "Merge Sorted Array",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "easy",
  companies: ["Meta", "Microsoft", "Amazon", "ZipRecruiter"],
  description: "Merge two sorted arrays into one sorted array in-place",
  tags: ["array", "two-pointers", "sorting"],
  estimatedTime: 15,
  problemStatement: `You are given two integer arrays nums1 and nums2, sorted in non-decreasing order, and two integers m and n, representing the number of elements in nums1 and nums2 respectively.

Merge nums1 and nums2 into a single array sorted in non-decreasing order.

The final sorted array should not be returned by the function, but instead be stored inside the array nums1. To accommodate this, nums1 has a length of m + n, where the first m elements denote the elements that should be merged, and the last n elements are set to 0 and should be ignored. nums2 has a length of n.`,
  examples: [
    {
      input: "nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3",
      output: "[1,2,2,3,5,6]",
      explanation:
        "The arrays we are merging are [1,2,3] and [2,5,6]. The result is [1,2,2,3,5,6].",
    },
    {
      input: "nums1 = [1], m = 1, nums2 = [], n = 0",
      output: "[1]",
      explanation: "The arrays we are merging are [1] and []. The result is [1].",
    },
    {
      input: "nums1 = [0], m = 0, nums2 = [1], n = 1",
      output: "[1]",
      explanation: "The arrays we are merging are [] and [1]. The result is [1].",
    },
  ],
  constraints: [
    "nums1.length == m + n",
    "nums2.length == n",
    "0 <= m, n <= 200",
    "1 <= m + n <= 200",
    "-10^9 <= nums1[i], nums2[j] <= 10^9",
  ],
  hints: [
    "Start from the end of both arrays to avoid overwriting elements",
    "Use three pointers: one for nums1's end, one for nums2's end, and one for the merged position",
    "Compare elements and place the larger one at the merged position",
  ],
  starterCode: {
    javascript: `function merge(nums1, m, nums2, n) {
  // Write your solution here (modify nums1 in-place)

}`,
    typescript: `function merge(nums1: number[], m: number, nums2: number[], n: number): void {
  // Write your solution here (modify nums1 in-place)

}`,
    python: `def merge(nums1, m, nums2, n):
    # Write your solution here (modify nums1 in-place)
    pass`,
    java: `class Solution {
    public void merge(int[] nums1, int m, int[] nums2, int n) {
        // Write your solution here (modify nums1 in-place)
    }
}`,
    cpp: `class Solution {
public:
    void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {
        // Write your solution here (modify nums1 in-place)
    }
};`,
    csharp: `public class Solution {
    public void Merge(int[] nums1, int m, int[] nums2, int n) {
        // Write your solution here (modify nums1 in-place)
    }
}`,
    go: `func merge(nums1 []int, m int, nums2 []int, n int) {
    // Write your solution here (modify nums1 in-place)
}`,
    rust: `impl Solution {
    pub fn merge(nums1: &mut Vec<i32>, m: i32, nums2: &mut Vec<i32>, n: i32) {
        // Write your solution here (modify nums1 in-place)
    }
}`,
  },
  optimalComplexity: {
    time: "O(m + n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [2, 5, 6], n: 3 },
      expected: [1, 2, 2, 3, 5, 6],
      description: "Standard case with overlapping values",
    },
    {
      input: { nums1: [1], m: 1, nums2: [], n: 0 },
      expected: [1],
      description: "Empty nums2",
    },
    {
      input: { nums1: [0], m: 0, nums2: [1], n: 1 },
      expected: [1],
      description: "Empty nums1 (only zeros)",
    },
    {
      input: { nums1: [4, 5, 6, 0, 0, 0], m: 3, nums2: [1, 2, 3], n: 3 },
      expected: [1, 2, 3, 4, 5, 6],
      description: "nums2 all smaller than nums1",
    },
    {
      input: { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [4, 5, 6], n: 3 },
      expected: [1, 2, 3, 4, 5, 6],
      description: "nums2 all larger than nums1",
    },
  ],
  fuzzyStatement: "Merge two sorted arrays into one sorted array.",
  clarifyingQuestions: [
    {
      topic: "in_place",
      question: "Should I modify the first array in-place or return a new array?",
      answer: "Modify nums1 in-place. It has extra space at the end to accommodate all elements.",
      required: true,
    },
    {
      topic: "space",
      question: "Can I use extra space?",
      answer: "The optimal solution uses O(1) extra space by working backwards.",
      required: false,
    },
  ],
  commonWrongApproaches: [
    {
      description: "Starting from the beginning and shifting elements",
      codeSignals: ["insert", "shift", "splice", "for i in range(m)"],
      intervention:
        "Starting from the beginning requires shifting elements which is O(n²). Can you think of a way to avoid this by starting from the end?",
    },
    {
      description: "Creating a new array instead of modifying in-place",
      codeSignals: ["new Array", "result = []", "merged = []", "new int["],
      intervention:
        "The problem asks you to modify nums1 in-place. Can you do this without creating a new array?",
    },
  ],
  whatIfQuestions: [
    "What if m is 0 (nums1 has no elements to merge)?",
    "What if n is 0 (nums2 is empty)?",
    "What if all elements in nums2 are smaller than all elements in nums1?",
    "What if there are duplicate elements across both arrays?",
  ],
  midCodingProbes: [
    {
      trigger: "started with three pointers",
      question: "Which pointer are you using for the write position, and why start from the end?",
    },
    {
      trigger: "comparing elements",
      question: "Walk me through what happens when nums1=[4,5,6,0,0,0] and nums2=[1,2,3].",
    },
    {
      trigger: "handling edge case",
      question:
        "What happens when one of the arrays is exhausted but the other still has elements?",
    },
  ],
  optimizationPush: {
    suboptimalComplexity: "O((m+n)²)",
    nudge:
      "Shifting elements is costly. Can you achieve O(m+n) by filling from the back instead of the front?",
  },
  correctPatternNotes: [
    "Using three pointers (p1, p2, p for write position) is correct",
    "Starting from the end (m+n-1) and working backwards is optimal",
    "Handling remaining elements from nums2 at the end is necessary",
  ],
}
