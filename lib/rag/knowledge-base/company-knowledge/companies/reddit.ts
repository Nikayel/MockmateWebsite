import type { CompanyInterviewKnowledge } from "../../types"

export const redditKnowledge: CompanyInterviewKnowledge = {
  companyId: "reddit",
  companyName: "Reddit",
  interviewStyle: {
    description:
      "Reddit interviews focus on LeetCode medium problems with system design for scalable community platforms. Present brute-force first, then optimize. Strong emphasis on community and social platform thinking.",
    pace: "Moderate pace with optimization focus",
    expectations: [
      "LeetCode medium focus",
      "Brute-force to optimal progression",
      "System design for high traffic",
      "Community-focused thinking",
      "Runtime/space complexity discussion",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 90,
      tips: ["Content indexing", "User data lookup", "Vote counting"],
    },
    {
      pattern: "graphs",
      frequency: 80,
      tips: ["Subreddit relationships", "User connections", "Content discovery"],
    },
    {
      pattern: "trees",
      frequency: 75,
      tips: ["Comment threads", "Category hierarchies", "Search structures"],
    },
    {
      pattern: "sliding-window",
      frequency: 60,
      tips: ["Trending content", "Time-based queries", "Activity windows"],
    },
  ],
  interviewProcess: [
    "Recruiter screen",
    "Technical phone - coding + problem solving",
    "System design with senior engineers",
    "Behavioral - teamwork and communication",
  ],
  cultureTips: [
    "Community First - empower communities",
    "Be Direct - honest communication",
    "Simplify - reduce complexity",
    "Show passion for online communities",
    "Understand content moderation challenges",
  ],
  commonQuestionTypes: [
    "LRU Cache",
    "Feed system design",
    "Voting system design",
    "Graph traversal",
  ],
  dosDonts: {
    dos: [
      "Present brute-force first, then optimize",
      "Discuss runtime/space complexity",
      "Show community platform understanding",
      "Design for high traffic scale",
      "Be direct and collaborative",
    ],
    donts: [
      "Jump to optimal without progression",
      "Skip complexity analysis",
      "Ignore content moderation aspects",
      "Design without considering scale",
      "Be unfamiliar with Reddit's structure",
    ],
  },
}
