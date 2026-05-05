import type { DSAPatternKnowledge } from "../../types"

export const slidingWindowKnowledge: DSAPatternKnowledge = {
  pattern: "sliding-window",
  displayName: "Sliding Window",
  description:
    "Maintain a window of elements that slides through the array. Perfect for substring/subarray problems with contiguous elements. Converts O(n²) brute force to O(n).",
  whenToUse: [
    "Finding longest/shortest subarray with some property",
    "Substring problems with character constraints",
    "Maximum/minimum of all subarrays of size k",
    "Contiguous sequence with target sum",
    "String permutation/anagram problems",
  ],
  keyInsights: [
    "Fixed-size window: straightforward iteration",
    "Variable-size window: expand right, shrink left as needed",
    "Use hash map to track window contents efficiently",
    "Update answer when window meets the criteria",
  ],
  commonMistakes: [
    "Not handling window shrinking correctly",
    "Forgetting to update state when elements leave window",
    "Incorrect window size tracking",
    "Not considering edge cases (empty string, all same characters)",
  ],
  timeComplexity: {
    typical: "O(n)",
    best: "O(n) - must visit all elements",
    worst: "O(n) - each element enters and leaves window once",
  },
  spaceComplexity: {
    typical: "O(k) where k is alphabet/unique elements",
    notes: "Hash map stores at most window content",
  },
  relatedPatterns: ["two-pointers", "arrays-hashing", "string"],
  prerequisites: ["arrays-hashing", "two-pointers"],
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
    "Longest Substring Without Repeating Characters",
    "Minimum Window Substring",
    "Permutation in String",
    "Maximum Sum Subarray of Size K",
  ],
  interviewTips: [
    "Identify if the problem has a contiguous constraint",
    "Clarify if window is fixed or variable size",
    "Draw the window expansion/contraction process",
  ],
}
