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
    tags: ["array", "greedy", "dynamic-programming"],
    estimatedTime: 20,
    problemStatement: `You're given an integer array nums and you start standing on its first index. Each value is a jump cap: a single hop from position i can carry you forward at most nums[i] indices, and shorter hops are always allowed.

Decide whether some sequence of hops can land you on the last index. Return true when it can be done and false when it cannot.`,
    examples: [
      {
        input: "nums = [3,1,0,2,4]",
        output: "true",
        explanation: "Hop 3 steps from index 0 to index 3, then 1 step to the last index.",
      },
      {
        input: "nums = [2,1,0,0,5]",
        output: "false",
        explanation:
          "Every route funnels you into index 2, where the jump cap is 0, so the tail of the array is unreachable.",
      },
    ],
    constraints: ["nums holds between 1 and 10^4 values", "each nums[i] lies between 0 and 10^5"],
    hints: [
      "Think about the maximum position you can reach at each step",
      "Track the farthest index reachable - if current index exceeds it, return false",
      "Greedy: update max reach as max(maxReach, i + nums[i])",
    ],
    starterCode: {
      javascript: `function canJump(nums) {
  // Write your solution here
}`,
      typescript: `function canJump(nums: number[]): boolean {
  // Write your solution here
}`,
      python: `def canJump(nums: list[int]) -> bool:
    # Write your solution here
    pass`,
      java: `class Solution {
    public boolean canJump(int[] nums) {
        // Write your solution here
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
    tags: ["array", "greedy", "dynamic-programming", "bfs"],
    estimatedTime: 25,
    problemStatement: `You're standing on index 0 of a 0-indexed integer array nums with length n. From index i, one hop may take you to any index i + j as long as 0 <= j <= nums[i] and i + j < n, so each value caps how far a single hop from that spot can travel.

Every input in this problem can reach the end. Count the fewest hops that put you on the final index, nums[n - 1], and return that count.`,
    examples: [
      {
        input: "nums = [3,1,1,2,5]",
        output: "2",
        explanation:
          "Two hops are enough: index 0 to index 3, then index 3 to the last index. No single hop covers the whole array.",
      },
      {
        input: "nums = [4,2,0,0,1,3]",
        output: "2",
      },
    ],
    constraints: [
      "nums contains between 1 and 10^4 entries",
      "every nums[i] falls between 0 and 1000",
      "reaching nums[n - 1] is always possible for the given inputs",
    ],
    hints: [
      'Use BFS-like level traversal - each "level" is one jump',
      "Track current jump boundary and farthest reachable position",
      "When you reach current boundary, increment jumps and update boundary",
    ],
    starterCode: {
      javascript: `function jump(nums) {
  // Write your solution here
}`,
      typescript: `function jump(nums: number[]): number {
  // Write your solution here
}`,
      python: `def jump(nums: list[int]) -> int:
    # Write your solution here
    pass`,
      java: `class Solution {
    public int jump(int[] nums) {
        // Write your solution here
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
    tags: ["array", "greedy"],
    estimatedTime: 25,
    problemStatement: `A loop road is dotted with n fuel stops. Pulling into stop i lets you add gas[i] units of fuel to your car, and driving the leg from stop i to stop i + 1 burns cost[i] units. The tank has no size limit, but you begin with it empty, parked at a stop of your choosing.

Using the two integer arrays gas and cost, find a stop you could depart from and drive the whole loop exactly once, always moving to the next stop in order, without the fuel level ever dropping below zero. Return that stop's index, or -1 when no stop works. Whenever an answer exists, exactly one index satisfies it.`,
    examples: [
      {
        input: "gas = [2,3,9,1,2], cost = [3,5,2,2,4]",
        output: "2",
        explanation:
          "Departing stop 2 with its 9 units, you roll into the later stops holding 7, 6, 4, 3, and finally 1 unit back at stop 2, so the tank never runs out.",
      },
      {
        input: "gas = [3,1,2], cost = [4,2,2]",
        output: "-1",
        explanation:
          "The stops offer 6 units of fuel in total while the loop costs 8 to drive, so every choice of start strands you.",
      },
    ],
    constraints: [
      "gas and cost share the same length n",
      "1 <= n <= 10^5",
      "each gas[i] and each cost[i] sits between 0 and 10^4",
    ],
    hints: [
      "If total gas >= total cost, a solution exists",
      "If we run out of gas at station i, we can't start from any station between start and i",
      "Reset start to i+1 when tank goes negative",
    ],
    starterCode: {
      javascript: `function canCompleteCircuit(gas, cost) {
  // Write your solution here
}`,
      typescript: `function canCompleteCircuit(gas: number[], cost: number[]): number {
  // Write your solution here
}`,
      python: `def canCompleteCircuit(gas: list[int], cost: list[int]) -> int:
    # Write your solution here
    pass`,
      java: `class Solution {
    public int canCompleteCircuit(int[] gas, int[] cost) {
        // Write your solution here
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
    tags: ["array", "hash-table", "greedy", "heap", "counting"],
    estimatedTime: 30,
    problemStatement: `You're scheduling work for a CPU using a character array tasks, where every letter names a job type and each job burns exactly one unit of time. During any single unit the processor either runs one job or sits idle. The wrinkle is a cooldown, supplied as a non-negative integer n: once a job of some letter runs, at least n units of time must pass before another job carrying that same letter may start. Jobs with different letters need no gap at all.

Work out the smallest total number of time units, idle slots included, that finishes every job in tasks, and return it.`,
    examples: [
      {
        input: 'tasks = ["A","A","A","B"], n = 3',
        output: "9",
        explanation:
          "One shortest run: A -> B -> idle -> idle -> A -> idle -> idle -> idle -> A. Three units always sit between consecutive A runs.",
      },
      {
        input: 'tasks = ["A","A","B","B","C"], n = 0',
        output: "5",
        explanation:
          "With no cooldown the jobs run back to back, so the answer is just the job count.",
      },
      {
        input: 'tasks = ["Z","Z","Z","Z","Z","P","Q","R"], n = 3',
        output: "17",
      },
    ],
    constraints: [
      "tasks holds between 1 and 10^4 entries",
      "every entry of tasks is an uppercase English letter",
      "n is an integer no smaller than 0 and no larger than 100",
    ],
    hints: [
      "Focus on the most frequent task - it determines the minimum time",
      "Formula: (maxFreq - 1) * (n + 1) + numTasksWithMaxFreq",
      "Result is max of formula and total tasks (when no idle time needed)",
    ],
    starterCode: {
      javascript: `function leastInterval(tasks, n) {
  // Write your solution here
}`,
      typescript: `function leastInterval(tasks: string[], n: number): number {
  // Write your solution here
}`,
      python: `def leastInterval(tasks: list[str], n: int) -> int:
    # Write your solution here
    pass`,
      java: `class Solution {
    public int leastInterval(char[] tasks, int n) {
        // Write your solution here
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
      "Split a string into the most pieces possible without any letter spanning two pieces",
    tags: ["string", "hash-table", "greedy", "two-pointers"],
    estimatedTime: 20,
    problemStatement: `You've got a string s that needs slicing into chunks, and the slicing has one rule: no letter's appearances may land in two different chunks. Every copy of a letter must sit inside the same chunk. Subject to that rule, cut s into as many chunks as you possibly can.

The cuts only divide the string; reading the chunks left to right must reproduce s exactly. Return an array holding each chunk's length, in the order the chunks appear.`,
    examples: [
      {
        input: 's = "drodortwtxkekxe"',
        output: "[6,3,6]",
        explanation:
          'The slices are "drodor", "twt" and "xkekxe". Each letter lives entirely inside one slice; cutting any earlier would strand a repeat of d, r or o in the next slice.',
      },
      {
        input: 's = "svvttsv"',
        output: "[7]",
        explanation:
          "The opening letter returns near the end and the letter spans chain together, so no legal cut point exists and the whole string stays one slice.",
      },
    ],
    constraints: [
      "s contains between 1 and 500 characters",
      "every character of s is a lowercase English letter",
    ],
    hints: [
      "First pass: record last occurrence of each character",
      "Second pass: extend partition end to include all occurrences of current characters",
      "When current index equals partition end, we've found a valid partition",
    ],
    starterCode: {
      javascript: `function partitionLabels(s) {
  // Write your solution here
}`,
      typescript: `function partitionLabels(s: string): number[] {
  // Write your solution here
}`,
      python: `def partitionLabels(s: str) -> list[int]:
    # Write your solution here
    pass`,
      java: `class Solution {
    public List<Integer> partitionLabels(String s) {
        // Write your solution here
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
    description:
      "Decide whether a hand of cards deals out into fixed-size runs of consecutive values",
    tags: ["array", "hash-table", "greedy", "sorting"],
    estimatedTime: 25,
    problemStatement: `You're holding a pile of numbered cards described by the integer array hand, where hand[i] is the number printed on the ith card, and you want to deal the whole pile out for a run-based card game. A deal splits the cards into groups where every group contains exactly groupSize cards, and the numbers inside a group climb by exactly one from card to card, forming an unbroken run of consecutive values.

Every card must end up in some group; none may be left over and no group may come up short. Decide whether such a deal exists, returning true when it does and false when it does not.`,
    examples: [
      {
        input: "hand = [5,6,4,2,7,3,5,6,7], groupSize = 3",
        output: "true",
        explanation:
          "One valid deal is [2,3,4], [5,6,7] and [5,6,7], using every card exactly once.",
      },
      {
        input: "hand = [4,5,6,7,8,9,10], groupSize = 3",
        output: "false",
        explanation:
          "No matter how you deal them, the 7 cards cannot all land in complete groups of 3.",
      },
    ],
    constraints: [
      "hand holds between 1 and 10^4 cards",
      "each card value lies between 0 and 10^9",
      "groupSize is at least 1 and at most hand.length",
    ],
    hints: [
      "If hand.length % groupSize != 0, return false immediately",
      "Sort the array or use a min-heap to always start with smallest available card",
      "For each starting card, try to form a consecutive group of groupSize",
      "Use a hash map to track remaining count of each card",
    ],
    starterCode: {
      javascript: `function isNStraightHand(hand, groupSize) {
  // Write your solution here
}`,
      typescript: `function isNStraightHand(hand: number[], groupSize: number): boolean {
  // Write your solution here
}`,
      python: `def isNStraightHand(hand: list[int], groupSize: int) -> bool:
    # Write your solution here
    pass`,
      java: `class Solution {
    public boolean isNStraightHand(int[] hand, int groupSize) {
        // Write your solution here
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
        // Was expected: false with the note "Consecutive pairs not possible", which is
        // simply wrong: [1,2] [3,4] [5,6] deals cleanly. The frozen key failed every
        // correct solution. Corrected 2026-08-19 by the post-sweep adversarial audit.
        input: { hand: [1, 2, 3, 4, 5, 6], groupSize: 2 },
        expected: true,
        description: "Six consecutive cards deal into three pairs",
      },
      {
        input: { hand: [1, 2, 4, 5, 7, 8], groupSize: 3 },
        expected: false,
        description: "Runs of three are impossible: every triple is broken by a gap",
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
    tags: ["string", "stack", "greedy", "dynamic-programming"],
    estimatedTime: 25,
    problemStatement: `You're looking at a string s built entirely from three characters: '(', ')' and '*'. Your job is to judge whether s can be read as a balanced parenthesis sequence.

Balanced means the usual pairing: every opener '(' eventually finds its own closer ')' somewhere to its right, every closer pairs with an opener that came earlier, and no closer shows up before its partner. The twist is the wildcard: each '*' may independently stand in for a single '(', for a single ')', or for nothing at all.

Return true when at least one way of reading the wildcards makes s balanced, and false when no reading does.`,
    examples: [
      {
        input: 's = "(())"',
        output: "true",
      },
      {
        input: 's = "()*"',
        output: "true",
      },
      {
        input: 's = "*())"',
        output: "true",
        explanation: "Reading the leading * as an opening bracket balances the string.",
      },
    ],
    constraints: [
      "the length of s falls between 1 and 100",
      "every character of s is one of '(', ')' or '*'",
    ],
    hints: [
      "Track the range of possible open parentheses count [low, high]",
      "low: minimum open count (treat * as ) or empty)",
      "high: maximum open count (treat * as ( )",
      "If high < 0 at any point, too many ), return false",
      "low = max(0, low) since we can't have negative open count",
    ],
    starterCode: {
      javascript: `function checkValidString(s) {
  // Write your solution here
}`,
      typescript: `function checkValidString(s: string): boolean {
  // Write your solution here
}`,
      python: `def checkValidString(s: str) -> bool:
    # Write your solution here
    pass`,
      java: `class Solution {
    public boolean checkValidString(String s) {
        // Write your solution here
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
    tags: ["array", "greedy"],
    estimatedTime: 20,
    problemStatement: `You're working with a 2D integer array triplets, where each entry is a triplet, meaning an array of exactly three integers. Alongside it you get one more triplet, target = [x, y, z], that you'd like to see appear inside triplets.

One move is available, and you may perform it as many times as you like, including never: pick two different positions i and j within triplets, then overwrite triplets[j] coordinate by coordinate with the larger of the two values at each spot. In other words its new first value becomes the bigger of the two first values, its new second value the bigger of the two second values, and its new third value the bigger of the two third values, while triplets[i] stays as it was.

Report whether some sequence of moves can make [x, y, z] show up as an entry of triplets: true if it can, false if it cannot.`,
    examples: [
      {
        input: "triplets = [[4,2,6],[1,9,2],[3,5,6]], target = [4,5,6]",
        output: "true",
        explanation:
          "Applying the move to the first and third triplets produces [max(4,3), max(2,5), max(6,6)] = [4,5,6], exactly the target.",
      },
      {
        input: "triplets = [[2,6,3],[5,7,1]], target = [5,4,3]",
        output: "false",
        explanation:
          "The middle value 4 can never appear: both triplets carry a larger middle value, and the move never lowers a coordinate.",
      },
    ],
    constraints: [
      "triplets contains between 1 and 10^5 entries",
      "each entry of triplets, like target itself, has exactly 3 values",
      "every number appearing in triplets or target sits between 1 and 1000",
    ],
    hints: [
      "A triplet can only be used if all its values are <= corresponding target values",
      "Filter valid triplets first, then check if we can achieve each target component",
      "We just need to find if all target components are achievable from valid triplets",
    ],
    starterCode: {
      javascript: `function mergeTriplets(triplets, target) {
  // Write your solution here
}`,
      typescript: `function mergeTriplets(triplets: number[][], target: number[]): boolean {
  // Write your solution here
}`,
      python: `def mergeTriplets(triplets: list[list[int]], target: list[int]) -> bool:
    # Write your solution here
    pass`,
      java: `class Solution {
    public boolean mergeTriplets(int[][] triplets, int[] target) {
        // Write your solution here
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
    description: "Choose which boxes to load so a capacity-limited truck carries the most units",
    tags: ["array", "sorting", "greedy"],
    estimatedTime: 15,
    problemStatement: `You're in charge of loading one delivery truck from a warehouse of boxed goods. The inventory arrives as a 2D array boxTypes, where each entry boxTypes[i] holds two numbers: first, how many boxes of type i sit on the shelf, and second, how many units of product are packed inside every single box of that type.

The truck has room for at most truckSize boxes in total. Capacity is counted in boxes, never in units, and you may load any mix of the available boxes that stays within it. Return the largest total number of units the truck can drive away with.`,
    examples: [
      {
        input: "boxTypes = [[2,4],[3,2],[1,6]], truckSize = 4",
        output: "16",
        explanation:
          "Load the lone 6-unit box, both 4-unit boxes, and one 2-unit box: 6 + 8 + 2 = 16 units across 4 boxes.",
      },
      {
        input: "boxTypes = [[4,8],[6,3],[2,11],[5,5]], truckSize = 9",
        output: "69",
        explanation:
          "Both 11-unit boxes, all four 8-unit boxes, and three 5-unit boxes fill the 9 slots: 22 + 32 + 15 = 69 units.",
      },
    ],
    constraints: [
      "boxTypes describes between 1 and 1000 box types",
      "in every boxTypes[i], both the box count and the units per box range from 1 to 1000",
      "truckSize lies between 1 and 10^6",
    ],
    hints: [
      "Sort boxes by units per box in descending order (greedy)",
      "Take boxes with most units first until truck is full",
      "Track remaining capacity as you add boxes",
    ],
    starterCode: {
      javascript: `function maximumUnits(boxTypes, truckSize) {
  // Write your solution here

}`,
      typescript: `function maximumUnits(boxTypes: number[][], truckSize: number): number {
  // Write your solution here

}`,
      python: `def maximumUnits(boxTypes, truckSize):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int maximumUnits(int[][] boxTypes, int truckSize) {
        // Write your solution here
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
