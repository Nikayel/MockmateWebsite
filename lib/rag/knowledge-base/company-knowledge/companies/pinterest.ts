import type { CompanyInterviewKnowledge } from "../../types"

export const pinterestKnowledge: CompanyInterviewKnowledge = {
  companyId: "pinterest",
  companyName: "Pinterest",
  interviewStyle: {
    description:
      "Pinterest interviews focus on visual discovery and recommendation systems. Phone screen may include LeetCode hard problems. Strong emphasis on edge cases and complexity analysis. Interviewers are generally helpful.",
    pace: "Moderate pace with edge case focus",
    expectations: [
      "Edge case discussion expected",
      "Time/space complexity analysis required",
      "May include LeetCode hard",
      "Visual discovery domain focus",
      "User-centric thinking valued",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 90,
      tips: ["Search optimization", "Filtering", "Caching"],
    },
    {
      pattern: "graphs",
      frequency: 85,
      tips: ["Recommendation graphs", "Social connections", "Image relationships"],
    },
    {
      pattern: "trees",
      frequency: 80,
      tips: ["Category hierarchies", "Search trees", "Decision trees"],
    },
    {
      pattern: "binary-search",
      frequency: 70,
      tips: ["Efficient lookups", "Boundary finding", "Search optimization"],
    },
  ],
  interviewProcess: [
    "Technical phone screen",
    "Coding round - arrays and algorithms",
    "Coding round 2",
    "System design (L4/L5+)",
  ],
  cultureTips: [
    "Put Pinners First - users are priority",
    "Be Authentic - be yourself",
    "Create Belonging - inclusive environment",
    "Act as an Owner - take responsibility",
    "Visual inspiration focus",
  ],
  commonQuestionTypes: [
    "Array manipulation problems",
    "Image search system design",
    "Recommendation feed design",
    "Graph traversal problems",
  ],
  dosDonts: {
    dos: [
      "Discuss edge cases thoroughly",
      "Analyze time/space complexity",
      "Show user-centric thinking",
      "Understand visual discovery",
      "Be prepared for hard problems",
    ],
    donts: [
      "Skip edge case discussion",
      "Ignore complexity analysis",
      "Forget about visual content",
      "Be dismissive of Pinterest's mission",
      "Underestimate phone screen difficulty",
    ],
  },
}
