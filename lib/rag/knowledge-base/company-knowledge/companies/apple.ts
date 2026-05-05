import type { CompanyInterviewKnowledge } from "../../types"

export const appleKnowledge: CompanyInterviewKnowledge = {
  companyId: "apple",
  companyName: "Apple",
  interviewStyle: {
    description:
      "Apple interviews focus on excellence and attention to detail. Expect deep technical questions and emphasis on quality.",
    pace: "Thorough and detail-oriented",
    expectations: [
      "High-quality, polished solutions",
      "Attention to detail",
      "Deep technical knowledge",
      "Consider user experience",
      "Excellence in everything",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 80,
      tips: ["Clean, efficient solutions", "Handle edge cases", "Consider memory"],
    },
    {
      pattern: "trees",
      frequency: 75,
      tips: ["Binary tree mastery", "Know all traversals", "Space optimization"],
    },
    {
      pattern: "graphs",
      frequency: 70,
      tips: ["Standard traversals", "Know common algorithms", "Consider efficiency"],
    },
    {
      pattern: "dp-1d",
      frequency: 65,
      tips: ["Clear state definition", "Explain transitions", "Optimize space"],
    },
    {
      pattern: "string",
      frequency: 60,
      tips: ["Parsing and validation", "Unicode awareness", "Edge cases"],
    },
  ],
  interviewProcess: [
    "Phone screen with recruiter",
    "Technical phone screen",
    "On-site: 5-6 interviews",
    "Heavy emphasis on team fit",
    "May include design review",
  ],
  cultureTips: [
    "Quality over quantity",
    "Attention to detail matters",
    "User experience focus",
    "Secrecy is valued",
  ],
  commonQuestionTypes: [
    "Array and string problems",
    "Tree manipulation",
    "Graph algorithms",
    "System design for Apple products",
    "Low-level systems knowledge",
  ],
  dosDonts: {
    dos: [
      "Show attention to detail",
      "Consider edge cases thoroughly",
      "Write clean, readable code",
      "Think about user experience",
      "Demonstrate passion",
    ],
    donts: [
      "Submit incomplete solutions",
      "Ignore code quality",
      "Be sloppy with details",
      "Forget about edge cases",
      "Show low standards",
    ],
  },
}
