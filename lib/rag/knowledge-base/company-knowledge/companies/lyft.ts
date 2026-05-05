import type { CompanyInterviewKnowledge } from "../../types"

export const lyftKnowledge: CompanyInterviewKnowledge = {
  companyId: "lyft",
  companyName: "Lyft",
  interviewStyle: {
    description:
      "Lyft interviews are similar to Uber but with stronger emphasis on collaboration and user safety. Focus on real-time systems and optimization.",
    pace: "Moderate with collaborative approach",
    expectations: [
      "Strong algorithmic skills",
      "Real-time systems experience",
      "Safety-first mindset",
      "Collaborative approach",
      "Product thinking",
    ],
  },
  topPatterns: [
    {
      pattern: "graphs",
      frequency: 90,
      tips: ["Route optimization", "Map algorithms", "Real-time updates"],
    },
    {
      pattern: "heap-priority-queue",
      frequency: 85,
      tips: ["Driver matching", "ETAs", "Dynamic pricing"],
    },
    {
      pattern: "arrays-hashing",
      frequency: 80,
      tips: ["Geolocation", "Caching", "Rate limiting"],
    },
    {
      pattern: "sliding-window",
      frequency: 70,
      tips: ["Demand prediction", "Surge detection", "Time windows"],
    },
    { pattern: "greedy", frequency: 65, tips: ["Matching", "Scheduling", "Resource allocation"] },
  ],
  interviewProcess: [
    "Phone screen",
    "Technical interview",
    "On-site: 4-5 rounds",
    "System design",
    "Values interview",
  ],
  cultureTips: [
    "Safety is non-negotiable",
    "Collaborative culture",
    "Community impact",
    "Sustainable transportation",
  ],
  commonQuestionTypes: [
    "Matching algorithms",
    "Route optimization",
    "Real-time systems",
    "Geolocation problems",
    "Safety systems",
  ],
  dosDonts: {
    dos: [
      "Prioritize safety",
      "Think collaboratively",
      "Consider rider and driver",
      "Optimize for experience",
      "Design for reliability",
    ],
    donts: [
      "Ignore safety concerns",
      "Over-engineer solutions",
      "Forget about edge cases",
      "Ignore user experience",
      "Design in isolation",
    ],
  },
}
