import type { DSAScenario } from "../../types"

export const dsaTwoSumScenario: DSAScenario = {
  id: "dsa-two-sum",
  title: "Two Sum",
  type: "dsa",
  pattern: "arrays-hashing", // NeetCode category
  difficulty: "easy",
  companies: [
    "Google",
    "Amazon",
    "Meta",
    "Microsoft",
    "Apple",
    "Roblox",
    "NVIDIA",
    "TikTok",
    "Salesforce",
    "Oracle",
    "Atlassian",
    "ZipRecruiter",
  ],
  description: "Find two numbers in an array that add up to a target value",
  tags: ["array", "hash-table", "two-pointers"],
  estimatedTime: 15,
  problemStatement: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
  examples: [
    {
      input: "nums = [2,7,11,15], target = 9",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
    },
    {
      input: "nums = [3,2,4], target = 6",
      output: "[1,2]",
    },
    {
      input: "nums = [3,3], target = 6",
      output: "[0,1]",
    },
  ],
  constraints: [
    "2 <= nums.length <= 10^4",
    "-10^9 <= nums[i] <= 10^9",
    "-10^9 <= target <= 10^9",
    "Only one valid answer exists.",
  ],
  hints: [
    "Try using a hash map to store values you've already seen",
    "For each number, check if (target - current number) exists in your hash map",
    "The optimal solution has O(n) time complexity",
  ],
  starterCode: {
    javascript: `function twoSum(nums, target) {
  // Write your solution here

}`,
    typescript: `function twoSum(nums: number[], target: number): number[] {
  // Write your solution here

}`,
    python: `def two_sum(nums, target):
    # Write your solution here
    pass`,
    java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}`,
    cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here

    }
};`,
    csharp: `public class Solution {
    public int[] TwoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}`,
    go: `func twoSum(nums []int, target int) []int {
    // Write your solution here
    return []int{}
}`,
    rust: `impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        // Write your solution here
        vec![]
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { nums: [2, 7, 11, 15], target: 9 },
      expected: [0, 1],
      description: "Basic case: [2,7,11,15], target 9",
    },
    {
      input: { nums: [3, 2, 4], target: 6 },
      expected: [1, 2],
      description: "Non-adjacent pair: [3,2,4], target 6",
    },
    {
      input: { nums: [3, 3], target: 6 },
      expected: [0, 1],
      description: "Duplicate numbers: [3,3], target 6",
    },
    {
      input: { nums: [-1, -2, -3, -4, -5], target: -8 },
      expected: [2, 4],
      description: "Negative numbers",
    },
    {
      input: { nums: [0, 4, 3, 0], target: 0 },
      expected: [0, 3],
      description: "Zeros: [0,4,3,0], target 0",
    },
  ],

  // ==========================================
  // Real Interview Mode (Fuzzy Mode) Fields
  // ==========================================
  fuzzyStatement: "Given an array of numbers, find two that add up to a target value.",

  clarifyingQuestions: [
    {
      topic: "output_format",
      question: "Should I return the indices or the actual values?",
      answer: "Return the indices of the two numbers.",
      required: true,
    },
    {
      topic: "multiple_solutions",
      question: "Can there be multiple valid pairs?",
      answer: "Assume exactly one solution exists. You don't need to handle multiple.",
      required: false,
    },
    {
      topic: "element_reuse",
      question: "Can I use the same element twice?",
      answer: "No, you cannot use the same element twice. Each index can only be used once.",
      required: true,
    },
    {
      topic: "no_solution_case",
      question: "What if no valid pair exists?",
      answer: "You can assume there's always exactly one valid answer.",
      required: false,
    },
    {
      topic: "input_sorted",
      question: "Is the array sorted?",
      answer: "No, the array is not necessarily sorted.",
      required: false,
    },
    {
      topic: "negative_numbers",
      question: "Can there be negative numbers?",
      answer: "Yes, numbers can be negative.",
      required: false,
    },
  ],

  // ==========================================
  // Proactive AI Interviewer Fields
  // ==========================================
  commonWrongApproaches: [
    {
      description: "Nested loops brute force O(n²)",
      codeSignals: ["two nested for loops", "for i in range AND for j in range", "O(n^2)", "O(n²)"],
      intervention:
        "That's a valid O(n²) approach. Before you code it all out, can you think of a way to do this in a single pass using extra space?",
    },
    {
      description: "Sorting then two pointers (loses original indices)",
      codeSignals: ["sort(", ".sort(", "sorted(", "two pointers after sort"],
      intervention:
        "Careful - if you sort the array, how will you keep track of the original indices? Think about what information you might lose.",
    },
  ],

  whatIfQuestions: [
    "What if the array is empty or has only one element?",
    "What if the target is negative?",
    "What if there are duplicate values like [3,3] with target 6?",
    "What if the array has millions of elements - does your solution scale?",
  ],

  midCodingProbes: [
    {
      trigger: "started creating hash map/dictionary",
      question: "What are you storing as the key vs the value in your map?",
    },
    {
      trigger: "checking for complement",
      question: "Why do you check for the complement before adding to the map, rather than after?",
    },
    {
      trigger: "loop started",
      question:
        "Walk me through what happens on the first iteration with nums=[2,7,11,15] and target=9.",
    },
  ],

  optimizationPush: {
    suboptimalComplexity: "O(n²)",
    nudge:
      "That brute force works but visits each pair. Can you get O(n) time using O(n) extra space?",
  },
}
