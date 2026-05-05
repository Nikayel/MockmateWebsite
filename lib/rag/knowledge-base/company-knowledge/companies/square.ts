import type { CompanyInterviewKnowledge } from "../../types"

export const squareKnowledge: CompanyInterviewKnowledge = {
  companyId: "square",
  companyName: "Square (Block)",
  interviewStyle: {
    description:
      "Square interviews focus on payments, fintech, and merchant solutions. Strong emphasis on reliability, security, and economic empowerment.",
    pace: "Methodical with focus on correctness",
    expectations: [
      "Strong fundamentals",
      "Understanding of payments",
      "Security awareness",
      "Reliability mindset",
      "Clean, maintainable code",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 90,
      tips: ["Transaction processing", "Merchant lookups", "Payment validation"],
    },
    {
      pattern: "trees",
      frequency: 80,
      tips: ["Hierarchical data", "Account structures", "Menu organization"],
    },
    {
      pattern: "dp-1d",
      frequency: 70,
      tips: ["Financial calculations", "Fee optimization", "Settlement logic"],
    },
    {
      pattern: "graphs",
      frequency: 65,
      tips: ["Transaction flows", "Fraud detection", "Money movement"],
    },
    {
      pattern: "string",
      frequency: 60,
      tips: ["Receipt parsing", "Data validation", "API handling"],
    },
  ],
  interviewProcess: [
    "Recruiter call",
    "Technical phone screen",
    "On-site: 4 rounds",
    "Coding + system design",
    "Values interview",
  ],
  cultureTips: [
    "Economic empowerment mission",
    "Merchant success focus",
    "Design for reliability",
    "Security is non-negotiable",
  ],
  commonQuestionTypes: [
    "Payment processing",
    "Transaction handling",
    "Inventory management",
    "Financial calculations",
    "API design",
  ],
  dosDonts: {
    dos: [
      "Think about failure scenarios",
      "Prioritize correctness over speed",
      "Consider security implications",
      "Design for auditability",
      "Think about merchant experience",
    ],
    donts: [
      "Ignore edge cases in money handling",
      "Forget about idempotency",
      "Overlook compliance requirements",
      "Design without considering failures",
      "Be imprecise with financial data",
    ],
  },
}
