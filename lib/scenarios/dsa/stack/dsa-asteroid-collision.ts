import type { DSAScenario } from "../../types"

export const dsaAsteroidCollisionScenario: DSAScenario = {
  id: "dsa-asteroid-collision",
  title: "Asteroid Collision",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Work out which asteroids survive after every collision",
  tags: ["stack", "array", "simulation"],
  estimatedTime: 25,
  problemStatement: `You're given an integer array asteroids describing rocks strung out along a single line. Each entry's absolute value is that asteroid's size, and its sign is its heading: positive drifts right, negative drifts left. All of them travel at the same speed.

Whenever a right-moving asteroid meets a left-moving one, the smaller of the two shatters; if they match in size, both shatter. Asteroids heading the same way never touch.

Return the asteroids still intact once every possible collision has played out.`,
  examples: [
    {
      input: "asteroids = [4,9,-6]",
      output: "[4,9]",
      explanation:
        "The 9 and -6 collide and the 9 survives. The 4 and 9 move together and never meet.",
    },
    {
      input: "asteroids = [6,-6]",
      output: "[]",
      explanation: "The 6 and -6 are the same size, so both shatter.",
    },
    {
      input: "asteroids = [12,3,-8]",
      output: "[12]",
      explanation: "The 3 and -8 collide leaving -8. The 12 and -8 then collide leaving 12.",
    },
  ],
  constraints: [
    "asteroids.length falls between 2 and 10^4",
    "each entry sits in the range [-1000, 1000]",
    "no asteroids[i] is ever 0",
  ],
  hints: [
    "Use a stack to track surviving asteroids",
    "Only collision: positive moving right meets negative moving left",
    "Handle the collision loop until no more collisions possible",
  ],
  starterCode: {
    javascript: `function asteroidCollision(asteroids) {
  // Write your solution here

}`,
    typescript: `function asteroidCollision(asteroids: number[]): number[] {
  // Write your solution here

}`,
    python: `def asteroid_collision(asteroids):
    # Write your solution here
    pass`,
    java: `class Solution {
    public int[] asteroidCollision(int[] asteroids) {
        // Write your solution here
        return new int[0];
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { asteroids: [5, 10, -5] },
      expected: [5, 10],
      description: "Larger asteroid survives",
    },
    { input: { asteroids: [8, -8] }, expected: [], description: "Equal size explosion" },
    { input: { asteroids: [10, 2, -5] }, expected: [10], description: "Chain collision" },
  ],
}
