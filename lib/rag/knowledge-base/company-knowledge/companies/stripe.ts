import type { CompanyInterviewKnowledge } from "../../types"

export const stripeKnowledge: CompanyInterviewKnowledge = {
  companyId: "stripe",
  companyName: "Stripe",
  interviewStyle: {
    description:
      "Stripe interviews are practical and focus on real-world engineering. Expect debugging, code review, and practical system design.",
    pace: "Moderate with practical focus",
    expectations: [
      "Practical engineering skills",
      "Code review and debugging ability",
      "System design for payments",
      "API design knowledge",
      "Attention to edge cases",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 85,
      tips: ["Practical applications", "Data processing", "Edge case handling"],
    },
    {
      pattern: "string",
      frequency: 80,
      tips: ["Parsing and validation", "Format conversion", "API response handling"],
    },
    {
      pattern: "graphs",
      frequency: 65,
      tips: ["Dependency resolution", "Transaction graphs", "Cycle detection"],
    },
    {
      pattern: "dp-1d",
      frequency: 60,
      tips: ["Optimization problems", "Resource allocation", "Practical applications"],
    },
    {
      pattern: "intervals",
      frequency: 55,
      tips: ["Time-based problems", "Scheduling", "Rate limiting"],
    },
  ],
  interviewProcess: [
    "Recruiter call",
    "Phone screen with practical coding",
    "On-site: 4-5 rounds",
    "Includes debugging/code review",
    "API design interview",
  ],
  cultureTips: [
    "Rigor and reliability valued",
    "User-focused engineering",
    "Move fast with quality",
    "Transparency and openness",
  ],
  commonQuestionTypes: [
    "Practical coding problems",
    "Bug finding and debugging",
    "API design",
    "System design for payments",
    "Data structure choice",
  ],
  dosDonts: {
    dos: [
      "Think about edge cases",
      "Consider failure modes",
      "Design for reliability",
      "Write maintainable code",
      "Think about API consumers",
    ],
    donts: [
      "Ignore error handling",
      "Forget about edge cases",
      "Design without considering scale",
      "Skip input validation",
      "Ignore security concerns",
    ],
  },
}
