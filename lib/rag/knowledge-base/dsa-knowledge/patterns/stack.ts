import type { DSAPatternKnowledge } from "../../types"

export const stackKnowledge: DSAPatternKnowledge = {
  pattern: "stack",
  displayName: "Stack",
  description:
    "LIFO data structure for problems requiring backtracking or matching. Perfect for parentheses, monotonic sequences, and expression evaluation.",
  whenToUse: [
    "Matching parentheses or brackets",
    "Evaluating expressions",
    "Finding next greater/smaller element",
    "Backtracking scenarios",
    "Maintaining history (undo operations)",
  ],
  keyInsights: [
    'Think "undo" or "go back" - stack is natural choice',
    "Monotonic stack for next greater/smaller problems",
    "Stack can store indices for more information",
    "Combine with hash map for O(1) min/max operations",
  ],
  commonMistakes: [
    "Popping from empty stack",
    "Not handling remaining elements in stack",
    "Incorrect order of operations for expressions",
    "Stack overflow in deep recursion scenarios",
  ],
  timeComplexity: {
    typical: "O(n)",
    best: "O(1) for push/pop operations",
    worst: "O(n) for processing all elements",
  },
  spaceComplexity: {
    typical: "O(n)",
    notes: "Worst case stores all elements",
  },
  relatedPatterns: ["arrays-hashing", "string", "monotonic-stack"],
  prerequisites: ["arrays-hashing"],
  codeTemplate: `def next_greater_element(nums):
  result = [-1] * len(nums)
  stack = []  # Store indices

  for i, num in enumerate(nums):
      while stack and nums[stack[-1]] < num:
          result[stack.pop()] = num
      stack.append(i)

  return result`,
  examples: [
    "Valid Parentheses: Check bracket matching",
    "Next Greater Element: Find next larger number",
    "Daily Temperatures: Days until warmer",
    "Evaluate Reverse Polish Notation",
  ],
  interviewTips: [
    "Consider what to store: values or indices",
    "Think about what happens to remaining stack elements",
    "Monotonic stack = maintaining increasing/decreasing order",
  ],
}
