/**
 * Sliding Window DSA Scenarios
 * Pattern: sliding-window
 */

import type { DSAScenario } from "../types"

export const slidingWindowScenarios: DSAScenario[] = [
  {
    id: "dsa-best-time-to-buy-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple", "Snap", "TikTok", "Roblox"],
    description: "Find the maximum profit from buying and selling a stock",
    tags: ["array", "dynamic-programming", "greedy"],
    estimatedTime: 20,
    problemStatement: `The array prices charts a single stock across consecutive days, with prices[i] being its price on day i. You get one trade at most: pick a day to buy one share, then sell that share on some later day. The sell can never land on or before the buy.

Return the largest profit such a trade can produce. If every possible pairing loses money, make no trade and return 0.`,
    examples: [
      {
        input: "prices = [9,2,8,4,10,3]",
        output: "8",
        explanation:
          "Buy on day 1 when the price dips to 2, sell on day 4 at 10, and clear 10-2 = 8.",
      },
      {
        input: "prices = [12,11,8,5,2]",
        output: "0",
        explanation:
          "The price only falls, so every buy-then-sell pairing loses; skip trading and take 0.",
      },
    ],
    constraints: [
      "prices covers between 1 and 10^5 days",
      "Each day's price falls between 0 and 10^4",
    ],
    hints: [
      "Track the minimum price seen so far",
      "For each price, calculate the profit if we sold today",
      "Keep track of the maximum profit",
    ],
    starterCode: {
      javascript: `function maxProfit(prices) {
  // Write your solution here

}`,
      typescript: `function maxProfit(prices: number[]): number {
  // Write your solution here

}`,
      python: `def max_profit(prices):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int maxProfit(int[] prices) {
        // Write your solution here
        return 0;
    }
}`,
      cpp: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // Write your solution here
        return 0;
    }
};`,
      csharp: `public class Solution {
    public int MaxProfit(int[] prices) {
        // Write your solution here
        return 0;
    }
}`,
      go: `func maxProfit(prices []int) int {
    // Write your solution here
    return 0
}`,
      rust: `impl Solution {
    pub fn max_profit(prices: Vec<i32>) -> i32 {
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
        input: { prices: [7, 1, 5, 3, 6, 4] },
        expected: 5,
        description: "Buy at 1, sell at 6: profit = 5",
      },
      {
        input: { prices: [7, 6, 4, 3, 1] },
        expected: 0,
        description: "No profitable transaction possible",
      },
      {
        input: { prices: [1, 2] },
        expected: 1,
        description: "Minimal profitable case",
      },
      {
        input: { prices: [2, 4, 1] },
        expected: 2,
        description: "Buy at 2, sell at 4: profit = 2",
      },
    ],
  },

  {
    id: "dsa-longest-substring-without-repeating",
    title: "Longest Substring Without Repeating Characters",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple", "TikTok", "Reddit", "Spotify"],
    description: "Measure the longest run of characters in a string where nothing repeats.",
    tags: ["string", "sliding-window", "hash-table"],
    estimatedTime: 25,
    problemStatement: `Take a string s and hunt for its longest substring in which no character shows up twice. Report that substring's length, not the substring itself.

A substring is a contiguous block of s, so its characters have to sit side by side in the original string.`,
    examples: [
      {
        input: 's = "wovewove"',
        output: "4",
        explanation: 'The best stretch is "wove", 4 characters long',
      },
      {
        input: 's = "gggg"',
        output: "1",
        explanation: 'Every character matches, so a lone "g" of length 1 is the best available',
      },
      {
        input: 's = "swwiftw"',
        output: "4",
        explanation:
          '"wift" wins with length 4. "swift" looks tempting, but its letters are not contiguous in s',
      },
    ],
    constraints: [
      "s runs from 0 to 5 * 10^4 characters",
      "Expect English letters, digits, symbols, and spaces in s",
    ],
    hints: [
      "Use sliding window with two pointers",
      "Use a set or map to track characters in current window",
      "When duplicate found, shrink window from left",
    ],
    starterCode: {
      javascript: `function lengthOfLongestSubstring(s) {
  // Your code here
}`,
      python: `def lengthOfLongestSubstring(s):
    # Your code here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(min(n, m)) where m is charset size",
    },
    testCases: [
      {
        input: { s: "abcabcbb" },
        expected: 3,
        description: "Repeating pattern",
      },
      {
        input: { s: "bbbbb" },
        expected: 1,
        description: "All same character",
      },
      {
        input: { s: "pwwkew" },
        expected: 3,
        description: "Multiple substrings of same length",
      },
      {
        input: { s: "" },
        expected: 0,
        description: "Empty string",
      },
    ],

    // ==========================================
    // Real Interview Mode (Fuzzy Mode) Fields
    // ==========================================
    fuzzyStatement:
      "You get a string. Find the longest chunk of it that never repeats a character.",

    clarifyingQuestions: [
      {
        question: "Should I return the length or the actual substring?",
        topic: "output_format",
        answer: "Return the length of the longest substring.",
        required: true,
      },
      {
        question:
          "What does 'repeating' mean - consecutive duplicates or any duplicates within the substring?",
        topic: "repeating_definition",
        answer:
          "Any duplicate within the substring. For example, 'aba' has repeating 'a's so it's invalid, but 'abc' is valid.",
        required: true,
      },
      {
        question: "What characters can the string contain?",
        topic: "character_set",
        answer: "English letters, digits, symbols, and spaces.",
        required: false,
      },
      {
        question: "What if the string is empty?",
        topic: "empty_input",
        answer: "Return 0 for an empty string.",
        required: false,
      },
      {
        question: "Is the comparison case-sensitive?",
        topic: "case_sensitivity",
        answer: "Yes, 'a' and 'A' are different characters.",
        required: false,
      },
    ],

    commonWrongApproaches: [
      {
        description: "Brute force checking all substrings O(n³)",
        codeSignals: ["three nested loops", "O(n^3)", "for all substrings", "substring.includes"],
        intervention:
          "That approach checks every substring which is O(n³). Can you think of a way to do this in a single pass?",
      },
      {
        description: "Not shrinking window correctly when duplicate found",
        codeSignals: ["left = 0", "reset window", "start over"],
        intervention:
          "When you find a duplicate, do you need to reset the entire window? Can you jump directly past the duplicate?",
      },
      {
        description: "Using indexOf instead of hash map",
        codeSignals: ["indexOf", "lastIndexOf", "findIndex"],
        intervention:
          "indexOf is O(n) per lookup. Is there a data structure that gives O(1) lookup for character positions?",
      },
    ],

    whatIfQuestions: [
      "What if all characters are the same, like 'aaaaa'?",
      "What if all characters are unique?",
      "What happens when you see a character that's outside your current window?",
    ],

    midCodingProbes: [
      {
        trigger: "using a set or map",
        question: "What are you storing - just characters, or their positions too?",
      },
      {
        trigger: "handling duplicate found",
        question:
          "Let's trace through 'abcabc'. When you hit the second 'a', what happens to your window?",
      },
    ],

    optimizationPush: {
      suboptimalComplexity: "O(n²)",
      nudge:
        "Your solution visits some characters multiple times. Can you achieve O(n) using a hash map to track where you last saw each character?",
    },
  },

  {
    id: "dsa-sliding-window-maximum",
    title: "Sliding Window Maximum",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "TikTok"],
    description: "Find maximum in each sliding window of size k.",
    tags: ["array", "deque", "sliding-window"],
    estimatedTime: 30,
    problemStatement: `A frame spanning exactly k consecutive entries starts at the left edge of the integer array nums. Step by step it shifts one position rightward until it sits flush against the array's right edge, and at every stop only the k values inside the frame are visible.

Record the largest visible value at each stop, and return those maximums in order as an array.`,
    examples: [
      {
        input: "nums = [2,5,-2,-4,8,1,9], k = 3",
        output: "[5,5,8,8,9]",
        explanation:
          "Frame stops and their largest values: [2,5,-2]→5, [5,-2,-4]→5, [-2,-4,8]→8, [-4,8,1]→8, [8,1,9]→9",
      },
      {
        input: "nums = [6], k = 1",
        output: "[6]",
      },
    ],
    constraints: [
      "nums holds between 1 and 10^5 values",
      "Entries range across -10^4 to 10^4",
      "k is at least 1 and never larger than nums.length",
    ],
    hints: [
      "Use deque to maintain window in decreasing order",
      "Remove elements outside window from front",
      "Remove smaller elements from back before adding new",
    ],
    starterCode: {
      javascript: `function maxSlidingWindow(nums, k) {
  // Write your solution here

}`,
      typescript: `function maxSlidingWindow(nums: number[], k: number): number[] {
  // Write your solution here

}`,
      python: `def maxSlidingWindow(nums, k):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(k)",
    },
    testCases: [
      {
        input: { nums: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 },
        expected: [3, 3, 5, 5, 6, 7],
        description: "Standard sliding window",
      },
      {
        input: { nums: [1], k: 1 },
        expected: [1],
        description: "Single element",
      },
      {
        input: { nums: [1, -1], k: 1 },
        expected: [1, -1],
        description: "Window size 1",
      },
      {
        input: { nums: [9, 11], k: 2 },
        expected: [11],
        description: "Window size equals array length",
      },
      {
        input: { nums: [4, -2], k: 2 },
        expected: [4],
        description: "Negative numbers",
      },
    ],
  },

  {
    id: "dsa-minimum-window-substring",
    title: "Minimum Window Substring",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "TikTok"],
    description: "Find minimum window in s containing all chars from t.",
    tags: ["string", "sliding-window", "hash-table"],
    estimatedTime: 35,
    problemStatement: `Two strings come in: s of length m and t of length n. Search s for the shortest substring that covers all of t, meaning each character of t appears inside that substring at least as many times as it appears in t. Duplicates in t raise the bar: if t carries two copies of a letter, a qualifying window needs two as well.

Return that shortest substring. When no window of s covers t, return the empty string "". You can count on the answer being unique for every test.`,
    examples: [
      {
        input: 's = "XAAYBZCXKZY", t = "XYZ"',
        output: '"XKZY"',
        explanation:
          'The tightest stretch of s covering X, Y, and Z is "XKZY"; the K just rides along.',
      },
      {
        input: 's = "q", t = "q"',
        output: '"q"',
      },
      {
        input: 's = "mn", t = "mm"',
        output: '""',
        explanation: "t demands two m's and s only has one, so no window qualifies.",
      },
    ],
    constraints: [
      "m is the length of s",
      "n is the length of t",
      "Both lengths sit between 1 and 10^5",
      "Only uppercase and lowercase English letters appear in s and t.",
    ],
    hints: [
      "Use sliding window with two pointers",
      "Expand right to include chars, contract left to minimize",
      "Use HashMap to track character frequencies",
    ],
    starterCode: {
      javascript: `function minWindow(s, t) {
  // Write your solution here

}`,
      typescript: `function minWindow(s: string, t: string): string {
  // Write your solution here

}`,
      python: `def minWindow(s, t):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(|s| + |t|)",
      space: "O(|s| + |t|)",
    },
    testCases: [
      {
        input: { s: "ADOBECODEBANC", t: "ABC" },
        expected: "BANC",
        description: "Standard case",
      },
      {
        input: { s: "a", t: "a" },
        expected: "a",
        description: "Single character match",
      },
      {
        input: { s: "a", t: "aa" },
        expected: "",
        description: "No valid window",
      },
      {
        input: { s: "ab", t: "b" },
        expected: "b",
        description: "Match at end",
      },
      {
        input: { s: "bba", t: "ab" },
        expected: "ba",
        description: "Minimum at end",
      },
    ],
  },
  {
    id: "dsa-longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "TikTok"],
    description: "Find longest substring with same letter after k replacements",
    tags: ["string", "sliding-window", "hash-table"],
    estimatedTime: 25,
    problemStatement: `A string s of uppercase letters comes with an edit budget k. Spending one unit lets you overwrite any single position of s with whatever uppercase letter you like, and you can spend at most k units in total.

After your edits, some substring will consist of one letter repeated. Return the longest length such a uniform substring can reach.`,
    examples: [
      {
        input: 's = "CDCDC", k = 2',
        output: "5",
        explanation: "Turn both D's into C's and the whole string becomes \"CCCCC\".",
      },
      {
        input: 's = "GGHGHHG", k = 1',
        output: "4",
        explanation:
          'Rewriting the first H as G yields the run "GGGG"; no window of length 5 can go uniform on one edit.',
      },
    ],
    constraints: [
      "s runs from 1 to 10^5 characters",
      "Nothing but uppercase English letters appears in s",
      "k can be as small as 0 and never exceeds s.length",
    ],
    hints: [
      "Use sliding window with character frequency count",
      "Window is valid if length - maxFreq <= k",
      "Track the max frequency character in current window",
    ],
    starterCode: {
      javascript: `function characterReplacement(s, k) {\n  // Write your solution here\n\n}`,
      typescript: `function characterReplacement(s: string, k: number): number {\n  // Write your solution here\n\n}`,
      python: `def characterReplacement(s, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { s: "ABAB", k: 2 }, expected: 4, description: "Replace all different chars" },
      { input: { s: "AABABBA", k: 1 }, expected: 4, description: "Single replacement" },
    ],
  },
  {
    id: "dsa-permutation-in-string",
    title: "Permutation in String",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Microsoft"],
    description: "Check if s2 contains a permutation of s1",
    tags: ["string", "sliding-window", "hash-table"],
    estimatedTime: 25,
    problemStatement: `Two lowercase strings s1 and s2 are in play. Decide whether some contiguous slice of s2 is a rearrangement of s1: the exact same letters with the exact same counts, just possibly shuffled. Return true when such a slice exists and false when none does.`,
    examples: [
      {
        input: 's1 = "tao", s2 = "chaotic"',
        output: "true",
        explanation: 'The slice "aot" inside s2 rearranges into s1.',
      },
      {
        input: 's1 = "tao", s2 = "cathode"',
        output: "false",
        explanation: "All three letters appear in s2, but never side by side.",
      },
      {
        input: 's1 = "veto", s2 = "vet"',
        output: "false",
        explanation: "s1 does not even fit inside s2, so no slice can work.",
      },
    ],
    constraints: [
      "s1 and s2 each run from 1 to 10^4 characters",
      "Only lowercase English letters appear in s1 and s2",
    ],
    hints: [
      "Use sliding window of size s1.length",
      "Compare character frequencies in window with s1",
      "Slide window and update frequencies incrementally",
    ],
    starterCode: {
      javascript: `function checkInclusion(s1, s2) {\n  // Write your solution here\n\n}`,
      typescript: `function checkInclusion(s1: string, s2: string): boolean {\n  // Write your solution here\n\n}`,
      python: `def checkInclusion(s1, s2):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { s1: "ab", s2: "eidbaooo" }, expected: true, description: "Permutation exists" },
      { input: { s1: "ab", s2: "eidboaoo" }, expected: false, description: "No permutation" },
    ],
  },
  {
    id: "dsa-max-consecutive-ones-iii",
    title: "Max Consecutive Ones III",
    type: "dsa",
    pattern: "sliding-window",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Find longest subarray of 1s after flipping at most k 0s",
    tags: ["array", "sliding-window"],
    estimatedTime: 20,
    problemStatement: `The array nums contains nothing but 0s and 1s, and you're allowed to turn up to k of its 0s into 1s. Choose those flips to build the longest possible unbroken run of 1s, then return that run's length.`,
    examples: [
      {
        input: "nums = [1,0,1,1,0,1,0,1,1], k = 2",
        output: "7",
        explanation:
          "Flip the zeros at positions 4 and 6: [1,0,1,1,1,1,1,1,1] has seven 1s in a row",
      },
      { input: "nums = [0,1,1,0,1,0,1,1,1,0,0,1,1,1,0,1,1], k = 3", output: "11" },
    ],
    constraints: [
      "nums holds between 1 and 10^5 entries",
      "Every entry is a 0 or a 1",
      "k ranges from 0 up to nums.length",
    ],
    hints: [
      "Sliding window: expand right, shrink left when zeros > k",
      "Count zeros in current window",
      "Track maximum window size",
    ],
    starterCode: {
      javascript: `function longestOnes(nums, k) {\n  // Write your solution here\n\n}`,
      typescript: `function longestOnes(nums: number[], k: number): number {\n  // Write your solution here\n\n}`,
      python: `def longestOnes(nums, k):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      {
        input: { nums: [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], k: 2 },
        expected: 6,
        description: "Flip 2 zeros",
      },
      {
        input: { nums: [0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1], k: 3 },
        expected: 10,
        description: "Flip 3 zeros",
      },
    ],
  },
]

export default slidingWindowScenarios
