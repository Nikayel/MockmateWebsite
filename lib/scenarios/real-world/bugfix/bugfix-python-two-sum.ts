import type { BugFixScenario } from "../../types"

export const bugfixPythonTwoSumScenario: BugFixScenario = {
  id: "bugfix-python-two-sum",
  title: "Python Two Sum Lookup Bug",
  type: "bugfix",
  difficulty: "easy",
  companies: ["Generic", "Amazon", "Microsoft", "Meta"],
  description: "Fix a small hash-map bug in a Python two-sum helper used by a pricing service",
  tags: ["python", "arrays", "hash-map", "debugging", "two-sum"],
  estimatedTime: 12,
  problemStatement: `A pricing service has a tiny helper that finds two line items whose prices add up to a target adjustment amount. The helper is used by a reconciliation job, and a recent refactor made it return no match for normal inputs.

**Your task:**
1. Read the short codebase context and tests
2. Find the broken lookup/update line in the helper
3. Fix the bug without changing the function signature
4. Explain why the original map logic failed

**Context:** This is intentionally small. Treat it like a quick production debugging task where the code is almost right, but one line stores or checks the wrong value.`,
  buggyCode: {
    python: `# two_sum.py
# BUG: The lookup map is updated with the wrong key.

def two_sum(nums, target):
    seen = {}

    for i, num in enumerate(nums):
        complement = target - num

        if complement in seen:
            return [seen[complement], i]

        seen[target] = i

    return []`,
  },
  codebaseFiles: {
    python: [
      {
        fileName: "docs/problem_context.py",
        content: `# docs/problem_context.py
# The reconciliation job receives a list of integer line item prices.
# It needs the indices of the first pair whose values add up to target.
#
# Example:
# nums = [2, 7, 11, 15], target = 9
# expected = [0, 1]
#
# The helper should return [] only when no pair exists.`,
        description: "Problem context from the pricing reconciliation job",
      },
      {
        fileName: "tests/test_two_sum.py",
        content: `# tests/test_two_sum.py
# These are the important cases the production helper must satisfy.
#
# assert two_sum([2, 7, 11, 15], 9) == [0, 1]
# assert two_sum([3, 2, 4], 6) == [1, 2]
# assert two_sum([3, 3], 6) == [0, 1]
# assert two_sum([1, 2, 3], 7) == []
#
# The duplicate-values case is the one that often exposes incorrect map updates.`,
        description: "Readable test cases for the two-sum helper",
      },
    ],
  },
  expectedBehavior:
    "two_sum should return the indices of two different numbers that add up to target, or [] when no pair exists.",
  expectedTouchedFiles: ["solution"],
  bugDescription:
    "The function stores target as the hash-map key instead of storing the current number. Future complement lookups cannot find the values already seen.",
  hints: [
    "The map should answer: where did I see this number before?",
    "Check what key is inserted into seen after each iteration.",
    "The complement lookup is fine; the update line is the suspicious one.",
  ],
  testCases: [
    {
      input: { nums: [2, 7, 11, 15], target: 9 },
      expected: [0, 1],
      description: "Basic pair at the start of the array",
    },
    {
      input: { nums: [3, 2, 4], target: 6 },
      expected: [1, 2],
      description: "Pair appears after the first element",
    },
    {
      input: { nums: [3, 3], target: 6 },
      expected: [0, 1],
      description: "Duplicate values should use two different indices",
    },
    {
      input: { nums: [1, 2, 3], target: 7 },
      expected: [],
      description: "No matching pair should return an empty list",
    },
  ],
}
