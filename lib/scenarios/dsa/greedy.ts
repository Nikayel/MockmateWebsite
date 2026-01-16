/**
 * Greedy DSA Scenarios
 * Pattern: greedy
 *
 * Greedy algorithms make locally optimal choices at each step.
 * Common at Amazon, Google, and Meta for optimization problems.
 */

import type { DSAScenario } from "../types"

export const greedyScenarios: DSAScenario[] = [
  {
    id: "dsa-jump-game",
    title: "Jump Game",
    type: "dsa",
    pattern: "greedy",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    description: "Determine if you can reach the last index of an array by jumping",
    tags: ["greedy", "array", "dynamic-programming"],
    estimatedTime: 20,
    problemStatement: `You are given an integer array nums. You are initially positioned at the array's first index, and each element in the array represents your maximum jump length at that position.

Return true if you can reach the last index, or false otherwise.`,
    examples: [
      {
        input: "nums = [2,3,1,1,4]",
        output: "true",
        explanation: "Jump 1 step from index 0 to 1, then 3 steps to the last index.",
      },
      {
        input: "nums = [3,2,1,0,4]",
        output: "false",
        explanation:
          "You will always arrive at index 3 no matter what. Its maximum jump length is 0, which makes it impossible to reach the last index.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^4", "0 <= nums[i] <= 10^5"],
    hints: [
      "Think about the maximum position you can reach at each step",
      "Track the farthest index reachable - if current index exceeds it, return false",
      "Greedy: update max reach as max(maxReach, i + nums[i])",
    ],
    starterCode: {
      javascript: `function canJump(nums) {
  // Use greedy approach to track max reachable position
}`,
      typescript: `function canJump(nums: number[]): boolean {
  // Use greedy approach to track max reachable position
}`,
      python: `def canJump(nums: list[int]) -> bool:
    # Use greedy approach to track max reachable position
    pass`,
      java: `class Solution {
    public boolean canJump(int[] nums) {
        // Use greedy approach to track max reachable position
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [2, 3, 1, 1, 4] },
        expected: true,
        description: "Can reach end via multiple paths",
      },
      {
        input: { nums: [3, 2, 1, 0, 4] },
        expected: false,
        description: "Stuck at index 3 with 0 jump",
      },
      {
        input: { nums: [0] },
        expected: true,
        description: "Single element - already at end",
      },
      {
        input: { nums: [2, 0, 0] },
        expected: true,
        description: "Can jump directly to end",
      },
      {
        input: { nums: [1, 0, 1, 0] },
        expected: false,
        description: "Cannot pass zero",
      },
    ],
  },
  {
    id: "dsa-jump-game-ii",
    title: "Jump Game II",
    type: "dsa",
    pattern: "greedy",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Apple"],
    description: "Find minimum number of jumps to reach the last index",
    tags: ["greedy", "array", "dynamic-programming", "bfs"],
    estimatedTime: 25,
    problemStatement: `You are given a 0-indexed array of integers nums of length n. You are initially positioned at nums[0].

Each element nums[i] represents the maximum length of a forward jump from index i. In other words, if you are at nums[i], you can jump to any nums[i + j] where:
- 0 <= j <= nums[i] and
- i + j < n

Return the minimum number of jumps to reach nums[n - 1]. The test cases are generated such that you can reach nums[n - 1].`,
    examples: [
      {
        input: "nums = [2,3,1,1,4]",
        output: "2",
        explanation:
          "The minimum number of jumps to reach the last index is 2. Jump 1 step from index 0 to 1, then 3 steps to the last index.",
      },
      {
        input: "nums = [2,3,0,1,4]",
        output: "2",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "0 <= nums[i] <= 1000",
      "It's guaranteed that you can reach nums[n - 1].",
    ],
    hints: [
      'Use BFS-like level traversal - each "level" is one jump',
      "Track current jump boundary and farthest reachable position",
      "When you reach current boundary, increment jumps and update boundary",
    ],
    starterCode: {
      javascript: `function jump(nums) {
  // Find minimum jumps using greedy BFS approach
}`,
      typescript: `function jump(nums: number[]): number {
  // Find minimum jumps using greedy BFS approach
}`,
      python: `def jump(nums: list[int]) -> int:
    # Find minimum jumps using greedy BFS approach
    pass`,
      java: `class Solution {
    public int jump(int[] nums) {
        // Find minimum jumps using greedy BFS approach
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [2, 3, 1, 1, 4] },
        expected: 2,
        description: "Standard case",
      },
      {
        input: { nums: [2, 3, 0, 1, 4] },
        expected: 2,
        description: "Can skip over zero",
      },
      {
        input: { nums: [1] },
        expected: 0,
        description: "Already at destination",
      },
      {
        input: { nums: [1, 2, 3] },
        expected: 2,
        description: "Must take each jump",
      },
      {
        input: { nums: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 0] },
        expected: 2,
        description: "Large first jump available",
      },
    ],
  },
  {
    id: "dsa-gas-station",
    title: "Gas Station",
    type: "dsa",
    pattern: "greedy",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Find the starting gas station to complete a circular tour",
    tags: ["greedy", "array"],
    estimatedTime: 25,
    problemStatement: `There are n gas stations along a circular route, where the amount of gas at the ith station is gas[i].

You have a car with an unlimited gas tank and it costs cost[i] of gas to travel from the ith station to its next (i + 1)th station. You begin the journey with an empty tank at one of the gas stations.

Given two integer arrays gas and cost, return the starting gas station's index if you can travel around the circuit once in the clockwise direction, otherwise return -1. If there exists a solution, it is guaranteed to be unique.`,
    examples: [
      {
        input: "gas = [1,2,3,4,5], cost = [3,4,5,1,2]",
        output: "3",
        explanation:
          "Start at station 3 (index 3) and fill up with 4 unit of gas. Tank = 4. Travel to station 4 (cost 1). Tank = 3. Fill up (5 gas). Tank = 8. Travel to station 0 (cost 2). Tank = 6. And so on...",
      },
      {
        input: "gas = [2,3,4], cost = [3,4,3]",
        output: "-1",
        explanation:
          "You can't start at any station as you don't have enough gas to reach the next station.",
      },
    ],
    constraints: [
      "n == gas.length == cost.length",
      "1 <= n <= 10^5",
      "0 <= gas[i], cost[i] <= 10^4",
    ],
    hints: [
      "If total gas >= total cost, a solution exists",
      "If we run out of gas at station i, we can't start from any station between start and i",
      "Reset start to i+1 when tank goes negative",
    ],
    starterCode: {
      javascript: `function canCompleteCircuit(gas, cost) {
  // Find starting station using greedy approach
}`,
      typescript: `function canCompleteCircuit(gas: number[], cost: number[]): number {
  // Find starting station using greedy approach
}`,
      python: `def canCompleteCircuit(gas: list[int], cost: list[int]) -> int:
    # Find starting station using greedy approach
    pass`,
      java: `class Solution {
    public int canCompleteCircuit(int[] gas, int[] cost) {
        // Find starting station using greedy approach
        return -1;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { gas: [1, 2, 3, 4, 5], cost: [3, 4, 5, 1, 2] },
        expected: 3,
        description: "Valid starting point exists",
      },
      {
        input: { gas: [2, 3, 4], cost: [3, 4, 3] },
        expected: -1,
        description: "No valid starting point",
      },
      {
        input: { gas: [5, 1, 2, 3, 4], cost: [4, 4, 1, 5, 1] },
        expected: 4,
        description: "Start near end of array",
      },
      {
        input: { gas: [3], cost: [3] },
        expected: 0,
        description: "Single station with exact gas",
      },
    ],
  },
  {
    id: "dsa-task-scheduler-greedy",
    title: "Task Scheduler",
    type: "dsa",
    pattern: "greedy",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Find minimum intervals needed to execute all tasks with cooldown",
    tags: ["greedy", "array", "hash-table", "heap", "counting"],
    estimatedTime: 30,
    problemStatement: `Given a characters array tasks, representing the tasks a CPU needs to do, where each letter represents a different task. Tasks could be done in any order. Each task is done in one unit of time. For each unit of time, the CPU could complete either one task or just be idle.

However, there is a non-negative integer n that represents the cooldown period between two same tasks (the same letter in the array), that is that there must be at least n units of time between any two same tasks.

Return the least number of units of times that the CPU will take to finish all the given tasks.`,
    examples: [
      {
        input: 'tasks = ["A","A","A","B","B","B"], n = 2',
        output: "8",
        explanation:
          "A -> B -> idle -> A -> B -> idle -> A -> B. There is at least 2 units of time between any two same tasks.",
      },
      {
        input: 'tasks = ["A","A","A","B","B","B"], n = 0',
        output: "6",
        explanation: "On this case any permutation of size 6 would work since n = 0.",
      },
      {
        input: 'tasks = ["A","A","A","A","A","A","B","C","D","E","F","G"], n = 2',
        output: "16",
      },
    ],
    constraints: [
      "1 <= tasks.length <= 10^4",
      "tasks[i] is upper-case English letter.",
      "The integer n is in the range [0, 100].",
    ],
    hints: [
      "Focus on the most frequent task - it determines the minimum time",
      "Formula: (maxFreq - 1) * (n + 1) + numTasksWithMaxFreq",
      "Result is max of formula and total tasks (when no idle time needed)",
    ],
    starterCode: {
      javascript: `function leastInterval(tasks, n) {
  // Calculate minimum intervals using greedy/math approach
}`,
      typescript: `function leastInterval(tasks: string[], n: number): number {
  // Calculate minimum intervals using greedy/math approach
}`,
      python: `def leastInterval(tasks: list[str], n: int) -> int:
    # Calculate minimum intervals using greedy/math approach
    pass`,
      java: `class Solution {
    public int leastInterval(char[] tasks, int n) {
        // Calculate minimum intervals using greedy/math approach
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1) - only 26 letters",
    },
    testCases: [
      {
        input: { tasks: ["A", "A", "A", "B", "B", "B"], n: 2 },
        expected: 8,
        description: "Standard case with idle time",
      },
      {
        input: { tasks: ["A", "A", "A", "B", "B", "B"], n: 0 },
        expected: 6,
        description: "No cooldown needed",
      },
      {
        input: { tasks: ["A", "A", "A", "A", "A", "A", "B", "C", "D", "E", "F", "G"], n: 2 },
        expected: 16,
        description: "Many different tasks fill gaps",
      },
      {
        input: { tasks: ["A"], n: 2 },
        expected: 1,
        description: "Single task",
      },
    ],
  },
  {
    id: "dsa-partition-labels-greedy",
    title: "Partition Labels",
    type: "dsa",
    pattern: "greedy",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description:
      "Partition a string into maximum parts where each letter appears in at most one part",
    tags: ["greedy", "string", "hash-table", "two-pointers"],
    estimatedTime: 20,
    problemStatement: `You are given a string s. We want to partition the string into as many parts as possible so that each letter appears in at most one part.

Note that the partition is done so that after concatenating all the parts in order, the resultant string should be s.

Return a list of integers representing the size of these parts.`,
    examples: [
      {
        input: 's = "ababcbacadefegdehijhklij"',
        output: "[9,7,8]",
        explanation:
          'The partition is "ababcbaca", "defegde", "hijhklij". This is a partition so that each letter appears in at most one part.',
      },
      {
        input: 's = "eccbbbbdec"',
        output: "[10]",
        explanation: "All characters share the same partition.",
      },
    ],
    constraints: ["1 <= s.length <= 500", "s consists of lowercase English letters."],
    hints: [
      "First pass: record last occurrence of each character",
      "Second pass: extend partition end to include all occurrences of current characters",
      "When current index equals partition end, we've found a valid partition",
    ],
    starterCode: {
      javascript: `function partitionLabels(s) {
  // Use greedy two-pass approach
}`,
      typescript: `function partitionLabels(s: string): number[] {
  // Use greedy two-pass approach
}`,
      python: `def partitionLabels(s: str) -> list[int]:
    # Use greedy two-pass approach
    pass`,
      java: `class Solution {
    public List<Integer> partitionLabels(String s) {
        // Use greedy two-pass approach
        return new ArrayList<>();
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1) - only 26 letters",
    },
    testCases: [
      {
        input: { s: "ababcbacadefegdehijhklij" },
        expected: [9, 7, 8],
        description: "Multiple partitions",
      },
      {
        input: { s: "eccbbbbdec" },
        expected: [10],
        description: "Single partition",
      },
      {
        input: { s: "abc" },
        expected: [1, 1, 1],
        description: "Each character is its own partition",
      },
      {
        input: { s: "a" },
        expected: [1],
        description: "Single character",
      },
    ],
  },
  {
    id: "dsa-hand-of-straights",
    title: "Hand of Straights",
    type: "dsa",
    pattern: "greedy",
    difficulty: "medium",
    companies: ["Google", "Amazon"],
    description: "Determine if cards can be rearranged into groups of consecutive cards",
    tags: ["greedy", "array", "hash-table", "sorting"],
    estimatedTime: 25,
    problemStatement: `Alice has some number of cards and she wants to rearrange the cards into groups so that each group is of size groupSize, and consists of groupSize consecutive cards.

Given an integer array hand where hand[i] is the value written on the ith card and an integer groupSize, return true if she can rearrange the cards, or false otherwise.`,
    examples: [
      {
        input: "hand = [1,2,3,6,2,3,4,7,8], groupSize = 3",
        output: "true",
        explanation: "Alice's hand can be rearranged as [1,2,3],[2,3,4],[6,7,8]",
      },
      {
        input: "hand = [1,2,3,4,5], groupSize = 4",
        output: "false",
        explanation: "Alice's hand cannot be rearranged into groups of 4.",
      },
    ],
    constraints: [
      "1 <= hand.length <= 10^4",
      "0 <= hand[i] <= 10^9",
      "1 <= groupSize <= hand.length",
    ],
    hints: [
      "If hand.length % groupSize != 0, return false immediately",
      "Sort the array or use a min-heap to always start with smallest available card",
      "For each starting card, try to form a consecutive group of groupSize",
      "Use a hash map to track remaining count of each card",
    ],
    starterCode: {
      javascript: `function isNStraightHand(hand, groupSize) {
  // Use greedy approach with sorting
}`,
      typescript: `function isNStraightHand(hand: number[], groupSize: number): boolean {
  // Use greedy approach with sorting
}`,
      python: `def isNStraightHand(hand: list[int], groupSize: int) -> bool:
    # Use greedy approach with sorting
    pass`,
      java: `class Solution {
    public boolean isNStraightHand(int[] hand, int groupSize) {
        // Use greedy approach with sorting
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n log n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { hand: [1, 2, 3, 6, 2, 3, 4, 7, 8], groupSize: 3 },
        expected: true,
        description: "Can form 3 groups of 3",
      },
      {
        input: { hand: [1, 2, 3, 4, 5], groupSize: 4 },
        expected: false,
        description: "Cannot divide into groups of 4",
      },
      {
        input: { hand: [1, 2, 3], groupSize: 1 },
        expected: true,
        description: "Group size 1 always works",
      },
      {
        input: { hand: [1, 2, 3, 4, 5, 6], groupSize: 2 },
        expected: false,
        description: "Consecutive pairs not possible",
      },
    ],
  },
  {
    id: "dsa-valid-parenthesis-string",
    title: "Valid Parenthesis String",
    type: "dsa",
    pattern: "greedy",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google"],
    description: "Check if a string with wildcards can be a valid parentheses string",
    tags: ["greedy", "string", "dynamic-programming", "stack"],
    estimatedTime: 25,
    problemStatement: `Given a string s containing only three types of characters: '(', ')' and '*', return true if s is valid.

The following rules define a valid string:
- Any left parenthesis '(' must have a corresponding right parenthesis ')'.
- Any right parenthesis ')' must have a corresponding left parenthesis '('.
- Left parenthesis '(' must go before the corresponding right parenthesis ')'.
- '*' could be treated as a single right parenthesis ')' or a single left parenthesis '(' or an empty string "".`,
    examples: [
      {
        input: 's = "()"',
        output: "true",
      },
      {
        input: 's = "(*)"',
        output: "true",
      },
      {
        input: 's = "(*))"',
        output: "true",
        explanation: "The * can be treated as (",
      },
    ],
    constraints: ["1 <= s.length <= 100", "s[i] is '(', ')' or '*'."],
    hints: [
      "Track the range of possible open parentheses count [low, high]",
      "low: minimum open count (treat * as ) or empty)",
      "high: maximum open count (treat * as ( )",
      "If high < 0 at any point, too many ), return false",
      "low = max(0, low) since we can't have negative open count",
    ],
    starterCode: {
      javascript: `function checkValidString(s) {
  // Use greedy range tracking
}`,
      typescript: `function checkValidString(s: string): boolean {
  // Use greedy range tracking
}`,
      python: `def checkValidString(s: str) -> bool:
    # Use greedy range tracking
    pass`,
      java: `class Solution {
    public boolean checkValidString(String s) {
        // Use greedy range tracking
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { s: "()" },
        expected: true,
        description: "Simple valid parentheses",
      },
      {
        input: { s: "(*)" },
        expected: true,
        description: "Star as empty or )",
      },
      {
        input: { s: "(*))" },
        expected: true,
        description: "Star as (",
      },
      {
        input: { s: "((((*)" },
        expected: false,
        description: "Too many open",
      },
      {
        input: { s: "***" },
        expected: true,
        description: "All stars - can be empty",
      },
    ],
  },
  {
    id: "dsa-merge-triplets",
    title: "Merge Triplets to Form Target Triplet",
    type: "dsa",
    pattern: "greedy",
    difficulty: "medium",
    companies: ["Google", "Amazon"],
    description: "Check if target triplet can be formed by taking max of triplet components",
    tags: ["greedy", "array"],
    estimatedTime: 20,
    problemStatement: `A triplet is an array of three integers. You are given a 2D integer array triplets, where triplets[i] = [ai, bi, ci] describes the ith triplet. You are also given an integer array target = [x, y, z] that describes the triplet you want to obtain.

To obtain target, you may apply the following operation on triplets any number of times (possibly zero):
- Choose two indices (0-indexed) i and j (i != j) and update triplets[j] to become [max(ai, aj), max(bi, bj), max(ci, cj)].

Return true if it is possible to obtain the target triplet [x, y, z] as an element of triplets, or false otherwise.`,
    examples: [
      {
        input: "triplets = [[2,5,3],[1,8,4],[1,7,5]], target = [2,7,5]",
        output: "true",
        explanation: "Merge triplets [2,5,3] and [1,7,5] to get [2,7,5].",
      },
      {
        input: "triplets = [[3,4,5],[4,5,6]], target = [3,2,5]",
        output: "false",
        explanation: "It is impossible to obtain [3,2,5] since 2 is not in any triplet.",
      },
    ],
    constraints: [
      "1 <= triplets.length <= 10^5",
      "triplets[i].length == target.length == 3",
      "1 <= ai, bi, ci, x, y, z <= 1000",
    ],
    hints: [
      "A triplet can only be used if all its values are <= corresponding target values",
      "Filter valid triplets first, then check if we can achieve each target component",
      "We just need to find if all target components are achievable from valid triplets",
    ],
    starterCode: {
      javascript: `function mergeTriplets(triplets, target) {
  // Use greedy filtering approach
}`,
      typescript: `function mergeTriplets(triplets: number[][], target: number[]): boolean {
  // Use greedy filtering approach
}`,
      python: `def mergeTriplets(triplets: list[list[int]], target: list[int]) -> bool:
    # Use greedy filtering approach
    pass`,
      java: `class Solution {
    public boolean mergeTriplets(int[][] triplets, int[] target) {
        // Use greedy filtering approach
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: {
          triplets: [
            [2, 5, 3],
            [1, 8, 4],
            [1, 7, 5],
          ],
          target: [2, 7, 5],
        },
        expected: true,
        description: "Can form target",
      },
      {
        input: {
          triplets: [
            [3, 4, 5],
            [4, 5, 6],
          ],
          target: [3, 2, 5],
        },
        expected: false,
        description: "Target component not achievable",
      },
      {
        input: {
          triplets: [
            [2, 5, 3],
            [2, 3, 4],
            [1, 2, 5],
            [5, 2, 3],
          ],
          target: [5, 5, 5],
        },
        expected: true,
        description: "Multiple triplets needed",
      },
    ],
  },
  {
    id: "dsa-maximum-units-on-truck",
    title: "Maximum Units on a Truck",
    type: "dsa",
    pattern: "greedy",
    difficulty: "easy",
    companies: ["Amazon", "Roblox", "Google", "Microsoft"],
    description: "Find maximum number of units that can be put on a truck with limited capacity",
    tags: ["greedy", "array", "sorting"],
    estimatedTime: 15,
    problemStatement: `You are assigned to put some amount of boxes onto one truck. You are given a 2D array boxTypes, where boxTypes[i] = [numberOfBoxesi, numberOfUnitsPerBoxi]:
- numberOfBoxesi is the number of boxes of type i.
- numberOfUnitsPerBoxi is the number of units in each box of type i.

You are also given an integer truckSize, which is the maximum number of boxes that can be put on the truck. You can choose any boxes to put on the truck as long as the number of boxes does not exceed truckSize.

Return the maximum total number of units that can be put on the truck.`,
    examples: [
      {
        input: "boxTypes = [[1,3],[2,2],[3,1]], truckSize = 4",
        output: "8",
        explanation:
          "Take 1 box of type 0 (3 units) + 2 boxes of type 1 (2*2=4 units) + 1 box of type 2 (1 unit) = 8 units total",
      },
      {
        input: "boxTypes = [[5,10],[2,5],[4,7],[3,9]], truckSize = 10",
        output: "91",
        explanation: "Sort by units per box descending, then greedily take boxes",
      },
    ],
    constraints: [
      "1 <= boxTypes.length <= 1000",
      "1 <= numberOfBoxesi, numberOfUnitsPerBoxi <= 1000",
      "1 <= truckSize <= 10^6",
    ],
    hints: [
      "Sort boxes by units per box in descending order (greedy)",
      "Take boxes with most units first until truck is full",
      "Track remaining capacity as you add boxes",
    ],
    starterCode: {
      javascript: `function maximumUnits(boxTypes, truckSize) {
  // Sort by units per box descending, then greedily fill truck

}`,
      typescript: `function maximumUnits(boxTypes: number[][], truckSize: number): number {
  // Sort by units per box descending, then greedily fill truck

}`,
      python: `def maximumUnits(boxTypes, truckSize):
    # Sort by units per box descending, then greedily fill truck
    pass`,
      java: `class Solution {
    public int maximumUnits(int[][] boxTypes, int truckSize) {
        // Sort by units per box descending, then greedily fill truck
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n log n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: {
          boxTypes: [
            [1, 3],
            [2, 2],
            [3, 1],
          ],
          truckSize: 4,
        },
        expected: 8,
        description: "Basic greedy selection",
      },
      {
        input: {
          boxTypes: [
            [5, 10],
            [2, 5],
            [4, 7],
            [3, 9],
          ],
          truckSize: 10,
        },
        expected: 91,
        description: "Multiple box types",
      },
      {
        input: {
          boxTypes: [[2, 1]],
          truckSize: 5,
        },
        expected: 2,
        description: "Single box type, more capacity than boxes",
      },
      {
        input: {
          boxTypes: [
            [1, 1],
            [1, 1],
            [1, 1],
          ],
          truckSize: 2,
        },
        expected: 2,
        description: "All same units per box",
      },
    ],
  },
]
