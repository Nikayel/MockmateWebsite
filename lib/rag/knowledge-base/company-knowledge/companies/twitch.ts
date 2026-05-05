import type { CompanyInterviewKnowledge } from "../../types"

export const twitchKnowledge: CompanyInterviewKnowledge = {
  companyId: "twitch",
  companyName: "Twitch",
  interviewStyle: {
    description:
      "Twitch interviews follow Amazon's Leadership Principles as an Amazon subsidiary. CodeSignal OA with 2 questions. 3 technical rounds with LeetCode medium. DP can be hard. Show passion for gaming and streaming.",
    pace: "Moderate with LP emphasis",
    expectations: [
      "Amazon Leadership Principles apply",
      "CodeSignal OA (90 min, 2 questions)",
      "3 technical rounds (LeetCode medium)",
      "DP questions can be hard",
      "Gaming/streaming passion valued",
    ],
  },
  topPatterns: [
    {
      pattern: "graphs",
      frequency: 80,
      tips: ["Live connections", "Stream routing", "Viewer networks"],
    },
    {
      pattern: "dp-1d",
      frequency: 70,
      tips: ["Can reach hard difficulty", "Optimization problems", "Stream scheduling"],
    },
    {
      pattern: "arrays-hashing",
      frequency: 90,
      tips: ["Chat message processing", "User lookups", "Event tracking"],
    },
    {
      pattern: "bfs",
      frequency: 65,
      tips: ["Number of Islands", "Network traversal", "Viewer proximity"],
    },
  ],
  interviewProcess: [
    "CodeSignal OA - 2 questions (90 min)",
    "Technical round 1 - LeetCode medium",
    "Technical round 2",
    "Technical round 3",
    "Behavioral (Leadership Principles)",
  ],
  cultureTips: [
    "Customer Obsession (Amazon LP)",
    "Bias for Action (Amazon LP)",
    "Ownership (Amazon LP)",
    "Empower creators and communities",
    "Gaming and streaming passion",
  ],
  commonQuestionTypes: [
    "LRU Cache",
    "Live Streaming System Design",
    "Real-time Chat System Design",
    "Number of Islands",
  ],
  dosDonts: {
    dos: [
      "Know Amazon Leadership Principles",
      "Show gaming/streaming passion",
      "Practice DP thoroughly (can be hard)",
      "Understand real-time systems",
      "Demonstrate creator economy understanding",
    ],
    donts: [
      "Ignore Leadership Principles",
      "Be unfamiliar with gaming culture",
      "Underestimate DP difficulty",
      "Forget real-time constraints",
      "Skip community focus in answers",
    ],
  },
}
