import type { CompanyInterviewKnowledge } from "../../types"

export const netflixKnowledge: CompanyInterviewKnowledge = {
  companyId: "netflix",
  companyName: "Netflix",
  interviewStyle: {
    description:
      "Netflix interviews focus on senior-level autonomy and technical depth. They value independent decision-makers who can drive complex technical projects without hand-holding.",
    pace: "Thorough with emphasis on depth",
    expectations: [
      "Deep technical expertise expected",
      "System design is heavily weighted",
      "Strong opinions, loosely held",
      "Demonstrate ownership and impact",
      "Expect discussion of scale (200M+ users)",
    ],
  },
  topPatterns: [
    {
      pattern: "graphs",
      frequency: 85,
      tips: [
        "Recommendation systems use graphs",
        "Know collaborative filtering basics",
        "Content delivery networks",
      ],
    },
    {
      pattern: "dp-2d",
      frequency: 80,
      tips: ["Video compression algorithms", "Caching optimization", "Resource allocation"],
    },
    {
      pattern: "arrays-hashing",
      frequency: 75,
      tips: ["Data processing at scale", "Efficient lookups", "Streaming data"],
    },
    {
      pattern: "trees",
      frequency: 70,
      tips: ["Decision trees for recommendations", "Hierarchical data", "Search optimization"],
    },
    {
      pattern: "heap-priority-queue",
      frequency: 65,
      tips: ["Top-K problems", "Trending content", "Priority scheduling"],
    },
  ],
  interviewProcess: [
    "Recruiter screen",
    "Phone screen with senior engineer",
    "On-site: 4-5 interviews",
    "Heavy system design focus",
    "Culture fit is critical (Freedom & Responsibility)",
  ],
  cultureTips: [
    "Freedom and Responsibility culture",
    "No vacation tracking - high trust",
    "Keeper test: would manager fight to keep you?",
    "Context over control",
    "Highly compensated, high expectations",
  ],
  commonQuestionTypes: [
    "Streaming data processing",
    "Recommendation algorithms",
    "Content delivery optimization",
    "System design for video streaming",
    "Distributed caching",
  ],
  dosDonts: {
    dos: [
      "Show independent decision-making",
      "Demonstrate impact at scale",
      "Have strong technical opinions",
      "Think about global distribution",
      "Consider user experience",
    ],
    donts: [
      "Need hand-holding",
      "Avoid taking ownership",
      "Give generic answers",
      "Ignore scale considerations",
      "Be risk-averse",
    ],
  },
}
