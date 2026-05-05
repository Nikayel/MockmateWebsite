import type { CompanyInterviewKnowledge } from "../../types"

export const figmaKnowledge: CompanyInterviewKnowledge = {
  companyId: "figma",
  companyName: "Figma",
  interviewStyle: {
    description:
      "Figma interviews focus on real-time collaboration, design tools, and creative applications. Strong emphasis on user experience and technical excellence.",
    pace: "Thoughtful with emphasis on design thinking",
    expectations: [
      "Strong algorithmic skills",
      "Understanding of real-time systems",
      "Design sensibility",
      "Collaboration focus",
      "User experience awareness",
    ],
  },
  topPatterns: [
    {
      pattern: "trees",
      frequency: 90,
      tips: ["Document structure", "Layer hierarchy", "Component trees"],
    },
    {
      pattern: "graphs",
      frequency: 85,
      tips: ["Constraint systems", "Object relationships", "Dependency graphs"],
    },
    {
      pattern: "arrays-hashing",
      frequency: 80,
      tips: ["Object lookups", "State management", "Caching"],
    },
    {
      pattern: "bfs",
      frequency: 70,
      tips: ["Layer traversal", "Selection expansion", "Nearest neighbor"],
    },
    {
      pattern: "string",
      frequency: 60,
      tips: ["Text rendering", "Font handling", "Search functionality"],
    },
  ],
  interviewProcess: [
    "Recruiter screen",
    "Technical phone interview",
    "On-site: 4-5 rounds",
    "Coding + practical design",
    "Culture fit discussion",
  ],
  cultureTips: [
    "Design excellence matters",
    "Collaborative by default",
    "User experience first",
    "Technical craft valued",
  ],
  commonQuestionTypes: [
    "Real-time collaboration (CRDTs)",
    "Canvas rendering",
    "Undo/redo systems",
    "Constraint solving",
    "Tree manipulation",
  ],
  dosDonts: {
    dos: [
      "Think about user experience",
      "Consider real-time implications",
      "Design for collaboration",
      "Focus on performance",
      "Show design sensibility",
    ],
    donts: [
      "Ignore edge cases in collaboration",
      "Forget about conflict resolution",
      "Overlook performance for large documents",
      "Design without considering UX",
      "Be dismissive of design discussions",
    ],
  },
}
