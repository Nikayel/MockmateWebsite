import type { DSAPatternKnowledge } from "../../types"

export const bitManipulationKnowledge: DSAPatternKnowledge = {
  pattern: "bit-manipulation",
  displayName: "Bit Manipulation",
  description:
    "Operations on binary representations. Useful for optimization, XOR tricks, and when dealing with sets of flags.",
  whenToUse: [
    "Single number in pairs problem",
    "Power of two checks",
    "Counting set bits",
    "Subset generation",
    "Low-level optimization",
  ],
  keyInsights: [
    "XOR: a ^ a = 0, a ^ 0 = a",
    "AND with (n-1) clears lowest set bit",
    "Left shift = multiply by 2",
    "Right shift = divide by 2",
  ],
  commonMistakes: [
    "Integer overflow/underflow",
    "Wrong operator precedence",
    "Signed vs unsigned issues",
    "Forgetting edge cases (0, negative numbers)",
  ],
  timeComplexity: {
    typical: "O(1) to O(log n)",
    best: "O(1) for single operations",
    worst: "O(n) for bit-by-bit processing",
  },
  spaceComplexity: {
    typical: "O(1)",
    notes: "Usually just working with integers",
  },
  relatedPatterns: ["arrays-hashing"],
  prerequisites: [],
  codeTemplate: `# Common operations
n & (n - 1)      # Clear lowest set bit
n & (-n)         # Get lowest set bit
n | (1 << k)     # Set k-th bit
n & ~(1 << k)    # Clear k-th bit
(n >> k) & 1     # Get k-th bit`,
  examples: ["Single Number", "Number of 1 Bits", "Counting Bits", "Reverse Bits"],
  interviewTips: [
    "Explain the bit operation you're using",
    "Write out binary examples",
    "Be careful with signed integers",
  ],
}
