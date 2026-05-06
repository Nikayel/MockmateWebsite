import type { DSAScenario } from "../../types"

export const dsa3sumScenario: DSAScenario = {
  id: "dsa-3sum",
  title: "3Sum",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Meta", "Amazon", "Microsoft", "Apple"],
  description: "Find all unique triplets that sum to zero",
  tags: ["array", "two-pointers", "sorting"],
  estimatedTime: 30,
  problemStatement: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets.`,
  examples: [
    {
      input: "nums = [-1,0,1,2,-1,-4]",
      output: "[[-1,-1,2],[-1,0,1]]",
    },
    {
      input: "nums = [0,1,1]",
      output: "[]",
    },
    {
      input: "nums = [0,0,0]",
      output: "[[0,0,0]]",
    },
  ],
  constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
  hints: [
    "Sort the array first",
    "Fix one number and use two pointers for the remaining two",
    "Skip duplicates to avoid duplicate triplets",
  ],
  starterCode: {
    javascript: `function threeSum(nums) {
  // Write your solution here

}`,
    typescript: `function threeSum(nums: number[]): number[][] {
  // Write your solution here

}`,
    python: `def threeSum(nums):
    # Write your solution here
    pass`,
  },
  optimalComplexity: {
    time: "O(n²)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { nums: [-1, 0, 1, 2, -1, -4] },
      expected: [
        [-1, -1, 2],
        [-1, 0, 1],
      ],
      description: "Multiple triplets (order does not matter)",
      compareAsSet: true,
    },
    {
      input: { nums: [0, 1, 1] },
      expected: [],
      description: "No valid triplets",
    },
    {
      input: { nums: [0, 0, 0] },
      expected: [[0, 0, 0]],
      description: "All zeros",
    },
    {
      input: { nums: [-2, 0, 1, 1, 2] },
      expected: [
        [-2, 0, 2],
        [-2, 1, 1],
      ],
      description: "Multiple solutions with duplicates (order does not matter)",
      compareAsSet: true,
    },
    {
      input: { nums: [1, 2, -2, -1] },
      expected: [],
      description: "No triplets sum to zero",
    },
  ],

  // ==========================================
  // Real Interview Mode (Fuzzy Mode) Fields
  // ==========================================
  fuzzyStatement: "Given an array of numbers, find all unique triplets that sum to zero.",

  clarifyingQuestions: [
    {
      topic: "output_format",
      question: "Should I return the values or the indices?",
      answer: "Return the actual values, not the indices.",
      required: true,
    },
    {
      topic: "duplicate_handling",
      question: "What if there are duplicate triplets?",
      answer:
        "The solution set must not contain duplicate triplets. Each unique combination should appear only once.",
      required: true,
    },
    {
      topic: "element_reuse",
      question: "Can I use the same element multiple times?",
      answer:
        "No, you cannot use the same array index twice in a triplet, but different indices with the same value are allowed.",
      required: true,
    },
    {
      topic: "no_solution_case",
      question: "What if no triplets exist?",
      answer: "Return an empty array.",
      required: false,
    },
    {
      topic: "input_sorted",
      question: "Is the array sorted?",
      answer: "No, but you can sort it if that helps your approach.",
      required: false,
    },
    {
      topic: "output_order",
      question: "Does the order of triplets in the result matter?",
      answer: "No, triplets can be in any order.",
      required: false,
    },
  ],

  // ==========================================
  // Proactive AI Interviewer Fields
  // ==========================================
  commonWrongApproaches: [
    {
      description: "Three nested loops brute force O(n³)",
      codeSignals: ["three nested loops", "O(n^3)", "O(n³)", "for i for j for k"],
      intervention:
        "That's O(n³). Can you reduce it? Think about how sorting might help and whether you can apply a technique you've used for two-sum.",
    },
    {
      description: "Not handling duplicates - returning duplicate triplets",
      codeSignals: ["no duplicate check", "missing skip duplicates", "result has duplicates"],
      intervention:
        "Your approach looks right, but think about this: if nums has [-1,-1,2], how do you ensure you don't return [[-1,-1,2],[-1,-1,2]]?",
    },
    {
      description: "Using a Set for deduplication inefficiently",
      codeSignals: ["Set of tuples", "stringify triplet", "JSON.stringify"],
      intervention:
        "Using a Set works but adds overhead. Can you skip duplicates during iteration instead of filtering after?",
    },
  ],

  whatIfQuestions: [
    "What if the array has fewer than 3 elements?",
    "What if all elements are the same, like [0,0,0,0]?",
    "What if there are many duplicates - how does your solution handle [-1,-1,-1,2,2,2]?",
    "What's the time complexity? Can you do better than O(n³)?",
  ],

  midCodingProbes: [
    {
      trigger: "started sorting the array",
      question: "Good start with sorting. How does sorting help you avoid duplicates?",
    },
    {
      trigger: "using two pointers",
      question: "When do you move the left pointer vs the right pointer? Walk me through.",
    },
    {
      trigger: "skipping duplicates",
      question:
        "I see you're skipping duplicates. Why do you need to skip both for the outer loop AND for the inner pointers?",
    },
  ],

  // Correct pattern notes help the AI interviewer recognize correct implementations
  // AI can PROBE for understanding ("walk me through why") but should ACCEPT once explained correctly
  correctPatternNotes: [
    "CORRECT: nums[left] == nums[left-1] after incrementing left (comparing with where we came FROM)",
    "CORRECT: nums[right] == nums[right+1] after decrementing right (right+1 is where we came FROM, not ahead)",
    "You can ASK 'walk me through the duplicate skipping logic' but if they explain correctly, ACCEPT and move on",
    "Don't keep questioning the direction (right+1) - when decrementing, +1 IS the previous position",
    "The inner while loops for duplicate skipping don't add to complexity - they're O(n) total across all iterations",
  ],

  optimizationPush: {
    suboptimalComplexity: "O(n³)",
    nudge:
      "Can you get this down to O(n²)? Hint: sort first, then for each element, can you use a technique from Two Sum II?",
  },
}
