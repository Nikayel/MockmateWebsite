import type { CompanyInterviewKnowledge } from "../../types"

export const linkedinKnowledge: CompanyInterviewKnowledge = {
  companyId: "linkedin",
  companyName: "LinkedIn",
  interviewStyle: {
    description:
      "LinkedIn interviews focus on graph problems and data-intensive applications. Strong emphasis on system design for professional networks and data processing.",
    pace: "Moderate with deep technical discussion",
    expectations: [
      "Graph algorithms expertise",
      "Data processing at scale",
      "System design skills",
      "Understanding of social networks",
      "Clear communication",
    ],
  },
  topPatterns: [
    {
      pattern: "graphs",
      frequency: 95,
      tips: ["Connection recommendations", "Degrees of separation", "Network analysis"],
    },
    {
      pattern: "arrays-hashing",
      frequency: 85,
      tips: ["Profile matching", "Search optimization", "Skill matching"],
    },
    {
      pattern: "dp-1d",
      frequency: 70,
      tips: ["Feed ranking", "Job matching", "Engagement optimization"],
    },
    {
      pattern: "trees",
      frequency: 65,
      tips: ["Organizational hierarchies", "Skill taxonomies", "Search trees"],
    },
    {
      pattern: "heap-priority-queue",
      frequency: 60,
      tips: ["Feed generation", "Top-K connections", "Notification priority"],
    },
  ],
  interviewProcess: [
    "Recruiter call",
    "Technical phone screen",
    "On-site: 4 rounds",
    "System design + coding",
    "Values interview (REACH)",
  ],
  cultureTips: [
    "REACH values: Results, Engagement, Authenticity, Courage, Humanity",
    "Member-first thinking",
    "Create economic opportunity",
    "Long-term relationship focus",
  ],
  commonQuestionTypes: [
    "Graph traversal and analysis",
    "Recommendation systems",
    "Search and matching",
    "News feed generation",
    "Data processing pipelines",
  ],
  dosDonts: {
    dos: [
      "Understand graph algorithms deeply",
      "Think about professional context",
      "Consider data at scale",
      "Design for engagement",
      "Show member empathy",
    ],
    donts: [
      "Ignore graph relationships",
      "Forget about privacy",
      "Overlook spam/abuse",
      "Design without scale in mind",
      "Ignore data quality",
    ],
  },
}
