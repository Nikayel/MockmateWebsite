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
  problemStatement: `Koko loves to eat bananas. There are n piles of bananas, the ith pile has piles[i] bananas. The guards have gone and will come back in h hours. Koko can decide her bananas-per-hour eating speed of k. Each hour, she chooses a pile and eats k bananas from it. If the pile has less than k bananas, she eats all of them and won't eat any more bananas during that hour. Return the minimum integer k such that she can eat all the bananas within h hours.`,
  examples: [
    { input: "piles = [3,6,7,11], h = 8", output: "4" },
    { input: "piles = [30,11,23,4,20], h = 5", output: "30" },
    { input: "piles = [30,11,23,4,20], h = 6", output: "23" },
  ],
  constraints: ["1 <= piles.length <= 10^4", "piles.length <= h <= 10^9", "1 <= piles[i] <= 10^9"],
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
