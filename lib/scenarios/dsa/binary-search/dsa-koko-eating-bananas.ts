import type { DSAScenario } from "../../types"

export const dsaKokoEatingBananasScenario: DSAScenario = {
  id: "dsa-koko-eating-bananas",
  title: "Koko Eating Bananas",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google"],
  description: "Find the minimum eating speed to finish all bananas within h hours",
  tags: ["array", "binary-search"],
  estimatedTime: 25,
  problemStatement: `Koko is facing n piles of bananas, with piles[i] bananas in pile i, and the guards will be away for h hours. She wants to settle on an eating speed of k bananas per hour and stick with it. Every hour she picks a single pile and eats k bananas from it; if fewer than k are left in that pile, she finishes the pile and waits out the rest of the hour anyway.

Return the smallest whole-number speed k that lets her clear every pile before the guards return, within h hours.`,
  examples: [
    { input: "piles = [4,5,9,10], h = 6", output: "5" },
    { input: "piles = [25,9,17,3,14], h = 5", output: "25" },
    { input: "piles = [25,9,17,3,14], h = 6", output: "17" },
  ],
  constraints: [
    "piles holds between 1 and 10^4 piles",
    "h is at least piles.length and at most 10^9",
    "A single pile contains between 1 and 10^9 bananas",
  ],
  hints: [
    "Binary search on the eating speed k",
    "For each speed, calculate hours needed",
    "Find minimum speed where hours <= h",
  ],
  starterCode: {
    javascript: `function minEatingSpeed(piles, h) {\n  // Write your solution here\n\n}`,
    typescript: `function minEatingSpeed(piles: number[], h: number): number {\n  // Write your solution here\n\n}`,
    python: `def minEatingSpeed(piles, h):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n * log(max(piles)))", space: "O(1)" },
  testCases: [
    { input: { piles: [3, 6, 7, 11], h: 8 }, expected: 4, description: "Basic case" },
    {
      input: { piles: [30, 11, 23, 4, 20], h: 5 },
      expected: 30,
      description: "Tight constraint",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why binary search on the eating speed instead of the piles?",
    "What's the minimum possible speed? Maximum?",
    "Why use ceiling division when calculating hours per pile?",
    "This is called 'binary search on answer' - what does that mean?",
  ],

  midCodingProbes: [
    {
      trigger: "setting search bounds",
      question: "What's the minimum speed that makes sense? What's the maximum?",
    },
    {
      trigger: "calculating hours needed",
      question: "For a pile of 11 bananas at speed 4, how many hours does it take?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Using floor division instead of ceiling",
      codeSignals: ["Math.floor", "//", "integer division"],
      intervention:
        "If Koko has 7 bananas and eats at speed 3, how many hours? It's not 2 - she needs to spend the full hour even for partial piles.",
    },
  ],
}
