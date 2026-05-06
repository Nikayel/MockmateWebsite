import type { DSAScenario } from "../../types"

export const dsaSearchRotatedSortedArrayScenario: DSAScenario = {
  id: "dsa-search-rotated-sorted-array",
  title: "Search in Rotated Sorted Array",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Microsoft", "Google", "NVIDIA", "TikTok"],
  description: "Search for a target value in a rotated sorted array",
  tags: ["array", "binary-search"],
  estimatedTime: 20,
  problemStatement: `There is an integer array nums sorted in ascending order (with distinct values).

Prior to being passed to your function, nums is possibly rotated at an unknown pivot index k (1 <= k < nums.length) such that the resulting array is [nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]] (0-indexed). For example, [0,1,2,4,5,6,7] might be rotated at pivot index 3 and become [4,5,6,7,0,1,2].

Given the array nums after the possible rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.

You must write an algorithm with O(log n) runtime complexity.`,
  examples: [
    {
      input: "nums = [4,5,6,7,0,1,2], target = 0",
      output: "4",
    },
    {
      input: "nums = [4,5,6,7,0,1,2], target = 3",
      output: "-1",
    },
    {
      input: "nums = [1], target = 0",
      output: "-1",
    },
  ],
  constraints: [
    "1 <= nums.length <= 5000",
    "-10^4 <= nums[i] <= 10^4",
    "All values of nums are unique",
    "nums is an ascending array that is possibly rotated",
    "-10^4 <= target <= 10^4",
  ],
  hints: [
    "Use modified binary search",
    "Determine which half is sorted, then decide which half to search",
    "Check if target is in the sorted half range",
  ],
  starterCode: {
    javascript: `function search(nums, target) {
  // Write your solution here

}`,
    typescript: `function search(nums: number[], target: number): number {
  // Write your solution here

}`,
    python: `def search(nums, target):
    # Write your solution here
    pass`,
    java: `class Solution {
    public int search(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}`,
    cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        // Write your solution here
        return -1;
    }
};`,
    csharp: `public class Solution {
    public int Search(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}`,
    go: `func search(nums []int, target int) int {
    // Write your solution here
    return -1
}`,
    rust: `impl Solution {
    pub fn search(nums: Vec<i32>, target: i32) -> i32 {
        // Write your solution here
        -1
    }
}`,
  },
  optimalComplexity: {
    time: "O(log n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 0 },
      expected: 4,
      description: "Target in rotated section",
    },
    {
      input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 3 },
      expected: -1,
      description: "Target not in array",
    },
    {
      input: { nums: [1], target: 0 },
      expected: -1,
      description: "Single element, not found",
    },
    {
      input: { nums: [1], target: 1 },
      expected: 0,
      description: "Single element, found",
    },
    {
      input: { nums: [5, 1, 3], target: 5 },
      expected: 0,
      description: "Small rotated array",
    },
    // Edge cases
    {
      input: { nums: [1, 2, 3, 4, 5], target: 3 },
      expected: 2,
      description: "Edge: Not rotated (sorted array)",
    },
    {
      input: { nums: [2, 3, 4, 5, 1], target: 1 },
      expected: 4,
      description: "Edge: Target is rotation point (smallest)",
    },
    {
      input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 7 },
      expected: 3,
      description: "Edge: Target at end of first sorted half",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "How do you determine which half is sorted?",
    "What if the array wasn't rotated at all?",
    "What if there are duplicates? How would that change things?",
    "Could you find the pivot point first, then do standard binary search?",
  ],

  midCodingProbes: [
    {
      trigger: "comparing with endpoints",
      question: "How do you know if the left half is sorted or the right half?",
    },
    {
      trigger: "deciding which half",
      question: "Once you know which half is sorted, how do you decide if target is there?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Not handling the sorted vs rotated half correctly",
      codeSignals: ["only checking mid", "missing half check"],
      intervention:
        "You need to identify which half is sorted first. Compare nums[left] with nums[mid] - what does that tell you?",
    },
  ],
}
