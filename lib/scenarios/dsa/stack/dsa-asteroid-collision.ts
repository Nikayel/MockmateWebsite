import type { DSAScenario } from "../../types"

export const dsaAsteroidCollisionScenario: DSAScenario = {
  id: "dsa-asteroid-collision",
  title: "Asteroid Collision",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Simulate asteroid collisions using a stack",
  tags: ["stack", "array", "simulation"],
  estimatedTime: 25,
  problemStatement: `We are given an array asteroids of integers representing asteroids in a row.

For each asteroid, the absolute value represents its size, and the sign represents its direction (positive meaning right, negative meaning left). Each asteroid moves at the same speed.

Find out the state of the asteroids after all collisions. If two asteroids meet, the smaller one will explode. If both are the same size, both will explode. Two asteroids moving in the same direction will never meet.`,
  examples: [
    {
      input: "asteroids = [5,10,-5]",
      output: "[5,10]",
      explanation: "The 10 and -5 collide resulting in 10. The 5 and 10 never collide.",
    },
    {
      input: "asteroids = [8,-8]",
      output: "[]",
      explanation: "The 8 and -8 collide exploding each other.",
    },
    {
      input: "asteroids = [10,2,-5]",
      output: "[10]",
      explanation: "The 2 and -5 collide resulting in -5. The 10 and -5 collide resulting in 10.",
    },
  ],
  constraints: [
    "2 <= asteroids.length <= 10^4",
    "-1000 <= asteroids[i] <= 1000",
    "asteroids[i] != 0",
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
