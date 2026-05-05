import type { ProblemComplexityKnowledge } from "../../types"

export const courseScheduleComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-course-schedule",
  leetcodeNumber: 207,
  slug: "course-schedule",
  problemTitle: "Course Schedule",
  sourceUrl: "https://leetcode.com/problems/course-schedule/",
  difficulty: "Medium",
  tags: ["Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"],
  approaches: [
    {
      name: "Topological Sort (Kahn's BFS)",
      timeComplexity: "O(V + E)",
      spaceComplexity: "O(V + E)",
      tradeOff: "Iterative, builds topological order",
      whenToUse: "When you need the ordering too",
      codePattern: "Track indegrees, process zero-indegree nodes",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "DFS Cycle Detection",
      timeComplexity: "O(V + E)",
      spaceComplexity: "O(V + E)",
      tradeOff: "Recursive, detects cycle directly",
      whenToUse: "When only checking for cycle",
      codePattern: "Track visiting/visited states, cycle if visiting twice",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Using only visited (need visiting state for cycle detection)",
    "Building graph wrong (prerequisite direction)",
    "Not handling disconnected components",
  ],
  keyOperations: [
    { operation: "Graph traversal", complexity: "O(V + E)" },
    { operation: "Cycle detection", complexity: "O(V + E)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
