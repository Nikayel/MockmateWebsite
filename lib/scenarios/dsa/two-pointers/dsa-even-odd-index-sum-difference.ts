import type { DSAScenario } from "../../types"

export const dsaEvenOddIndexSumDifferenceScenario: DSAScenario = {
  id: "dsa-even-odd-index-sum-difference",
  title: "Difference Between Sums at Even and Odd Indices",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "easy",
  companies: ["ZipRecruiter"],
  description: "Calculate the difference between sums of elements at even and odd indices",
  tags: ["array", "math"],
  estimatedTime: 10,
  problemStatement: `Given an integer array nums, calculate the sum of elements at even indices and the sum of elements at odd indices. Return the difference (even sum - odd sum).

Only consider elements within the range [-100, 100]. Elements outside this range should be ignored.`,
  examples: [
    {
      input: "nums = [1, 2, 3, 4, 5]",
      output: "3",
      explanation:
        "Even indices (0, 2, 4): 1 + 3 + 5 = 9. Odd indices (1, 3): 2 + 4 = 6. Difference: 9 - 6 = 3.",
    },
    {
      input: "nums = [10, 20, 30, 40]",
      output: "-20",
      explanation:
        "Even indices: 10 + 30 = 40. Odd indices: 20 + 40 = 60. Difference: 40 - 60 = -20.",
    },
    {
      input: "nums = [5, 200, 10, -5]",
      output: "20",
      explanation:
        "200 is outside [-100, 100] so ignored. Even: 5 + 10 = 15. Odd: -5 = -5. Difference: 15 - (-5) = 20.",
    },
  ],
  constraints: [
    "1 <= nums.length <= 10^5",
    "-10^9 <= nums[i] <= 10^9",
    "Only consider elements where -100 <= nums[i] <= 100",
  ],
  hints: [
    "Iterate through the array once",
    "Check if index is even or odd using modulo",
    "Filter elements by the range constraint",
  ],
  starterCode: {
    javascript: `function evenOddDifference(nums) {
  // Write your solution here

}`,
    typescript: `function evenOddDifference(nums: number[]): number {
  // Write your solution here

}`,
    python: `def even_odd_difference(nums):
    # Write your solution here
    pass`,
    java: `class Solution {
    public int evenOddDifference(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
    cpp: `class Solution {
public:
    int evenOddDifference(vector<int>& nums) {
        // Write your solution here
        return 0;
    }
};`,
    csharp: `public class Solution {
    public int EvenOddDifference(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
    go: `func evenOddDifference(nums []int) int {
    // Write your solution here
    return 0
}`,
    rust: `impl Solution {
    pub fn even_odd_difference(nums: Vec<i32>) -> i32 {
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
      input: { nums: [1, 2, 3, 4, 5] },
      expected: 3,
      description: "Standard case",
    },
    {
      input: { nums: [10, 20, 30, 40] },
      expected: -20,
      description: "Negative result",
    },
    {
      input: { nums: [5, 200, 10, -5] },
      expected: 20,
      description: "Filter out-of-range element",
    },
    {
      input: { nums: [100, -100, 100, -100] },
      expected: 400,
      description: "Boundary values",
    },
    {
      input: { nums: [0] },
      expected: 0,
      description: "Single element",
    },
  ],
  fuzzyStatement: "Given an array, find the difference between sums at even and odd positions.",
  clarifyingQuestions: [
    {
      topic: "index_definition",
      question: "Are indices 0-based or 1-based? Is index 0 considered even or odd?",
      answer: "Indices are 0-based. Index 0 is even, index 1 is odd, etc.",
      required: true,
    },
    {
      topic: "range_filter",
      question: "Should I include all elements or only certain values?",
      answer:
        "Only include elements within the range [-100, 100]. Skip elements outside this range.",
      required: true,
    },
    {
      topic: "result_sign",
      question: "Which sum comes first in the difference calculation?",
      answer: "Return (even sum - odd sum). The result can be negative.",
      required: true,
    },
  ],
  commonWrongApproaches: [
    {
      description: "Forgetting to filter by range",
      codeSignals: ["no range check", "no if condition for 100"],
      intervention:
        "Remember the constraint about the range [-100, 100]. Are you filtering out elements outside this range?",
    },
    {
      description: "Using 1-based indexing",
      codeSignals: ["index + 1", "starting from 1"],
      intervention:
        "Careful with your indexing - the problem uses 0-based indices where 0 is even.",
    },
  ],
  whatIfQuestions: [
    "What if the array is empty?",
    "What if all elements are outside the valid range?",
    "What happens with negative numbers at odd indices?",
    "What if all elements are at boundary values (100 or -100)?",
  ],
  midCodingProbes: [
    {
      trigger: "iterating through array",
      question: "How are you determining if an index is even or odd?",
    },
    {
      trigger: "filtering values",
      question: "What happens to the element 200 in the array [5, 200, 10]?",
    },
  ],
}
