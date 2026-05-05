import type { CompanyInterviewKnowledge } from "../../types"

export const tiktokKnowledge: CompanyInterviewKnowledge = {
  companyId: "tiktok",
  companyName: "TikTok (ByteDance)",
  interviewStyle: {
    description:
      "TikTok/ByteDance interviews are considered among the hardest in the industry, often harder than FAANG. Expect 6 questions in 2 hours during OA, and heavy dynamic programming focus. Speed and optimal solutions are critical.",
    pace: "Very fast-paced, 2 problems per technical round",
    expectations: [
      "Questions harder than FAANG",
      "Optimal solutions required",
      "Heavy DP and graph focus",
      "Speed is critical (6 questions in 2 hours OA)",
      "Strong time/space complexity optimization",
    ],
  },
  topPatterns: [
    {
      pattern: "dp-1d",
      frequency: 90,
      tips: ["Gas station variants", "Optimization problems", "State compression"],
    },
    {
      pattern: "dp-2d",
      frequency: 85,
      tips: ["Matrix problems", "String matching DP", "Game theory"],
    },
    {
      pattern: "graphs",
      frequency: 80,
      tips: ["Complex traversals", "Shortest path variants", "Network flow"],
    },
    {
      pattern: "trees",
      frequency: 75,
      tips: ["Construct from traversals", "Tree DP", "Binary tree operations"],
    },
  ],
  interviewProcess: [
    "HackerRank OA - 6 questions in 2 hours",
    "Technical round 1 - 2 LeetCode problems",
    "Technical round 2 - System/implementation",
    "Behavioral + culture fit",
  ],
  cultureTips: [
    "Always Day 1 - startup mentality",
    "Be Candid and Clear - direct communication",
    "Seek Truth and Be Pragmatic",
    "Aim for the Highest - excellence focus",
    "Global scale thinking",
  ],
  commonQuestionTypes: [
    "Daily Temperatures (stack)",
    "Construct Binary Tree from traversals",
    "Gas Station variants (DP)",
    "Promise.all implementation",
    "Recommendation system design",
  ],
  dosDonts: {
    dos: [
      "Practice speed - time management is key",
      "Master dynamic programming",
      "Understand pattern recognition",
      "Optimize for time/space complexity",
      "Show global scale thinking",
    ],
    donts: [
      "Expect hints - they don't provide them",
      "Give suboptimal solutions",
      "Underestimate difficulty",
      "Ignore optimization follow-ups",
      "Be unprepared for hard problems",
    ],
  },
}
