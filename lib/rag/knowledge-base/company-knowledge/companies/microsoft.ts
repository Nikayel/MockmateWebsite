import type { CompanyInterviewKnowledge } from "../../types"

export const microsoftKnowledge: CompanyInterviewKnowledge = {
  companyId: "microsoft",
  companyName: "Microsoft",
  interviewStyle: {
    description:
      "Microsoft interviews are conversational and focus on practical problem-solving. Emphasis on understanding, not just solution.",
    pace: "Relaxed pace with deep discussion",
    expectations: [
      "Clear problem understanding",
      "Good communication skills",
      "Thoughtful approach to solutions",
      "Consider real-world applications",
      "Show growth mindset",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 85,
      tips: ["Foundation problems", "Know multiple approaches", "Consider edge cases"],
    },
    {
      pattern: "trees",
      frequency: 80,
      tips: ["Binary tree traversals", "BST operations", "Serialization"],
    },
    {
      pattern: "graphs",
      frequency: 70,
      tips: ["BFS/DFS applications", "Connected components", "Path finding"],
    },
    {
      pattern: "dp-1d",
      frequency: 65,
      tips: ["Focus on understanding", "Explain recurrence clearly", "Consider optimization"],
    },
    {
      pattern: "linked-list",
      frequency: 60,
      tips: ["Reversal techniques", "Cycle detection", "Merge operations"],
    },
  ],
  interviewProcess: [
    "Phone screen (1 hour)",
    "On-site: 4-5 interviews",
    "Mix of coding and design",
    "As Appropriate (AA) interview with hiring manager",
    "Collaborative culture emphasized",
  ],
  cultureTips: [
    "Growth mindset is core value",
    "Show collaboration skills",
    "Be open to learning",
    "Demonstrate empathy",
  ],
  commonQuestionTypes: [
    "Tree and graph problems",
    "Array manipulation",
    "String processing",
    "Linked list operations",
    "System design for Microsoft products",
  ],
  dosDonts: {
    dos: [
      "Ask thoughtful questions",
      "Discuss trade-offs openly",
      "Show willingness to learn",
      "Be collaborative",
      "Consider user experience",
    ],
    donts: [
      "Be arrogant about knowledge",
      "Refuse to accept feedback",
      "Ignore interviewer suggestions",
      "Rush to solution without discussion",
      "Forget to test your code",
    ],
  },
}
