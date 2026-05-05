import type { CompanyInterviewKnowledge } from "../../types"

export const robinhoodKnowledge: CompanyInterviewKnowledge = {
  companyId: "robinhood",
  companyName: "Robinhood",
  interviewStyle: {
    description:
      "Robinhood interviews focus on financial systems, real-time data processing, and high-reliability systems. Strong emphasis on security and compliance.",
    pace: "Moderate with emphasis on correctness",
    expectations: [
      "Strong algorithmic foundation",
      "Understanding of financial systems",
      "Real-time processing experience",
      "Security awareness",
      "High reliability mindset",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 90,
      tips: ["Order book management", "Price lookups", "Portfolio calculations"],
    },
    {
      pattern: "heap-priority-queue",
      frequency: 80,
      tips: ["Order matching", "Price feeds", "Alert systems"],
    },
    {
      pattern: "sliding-window",
      frequency: 75,
      tips: ["Stock price analysis", "Trading windows", "Rate limiting"],
    },
    {
      pattern: "dp-1d",
      frequency: 70,
      tips: ["Profit calculations", "Risk analysis", "Portfolio optimization"],
    },
    {
      pattern: "graphs",
      frequency: 60,
      tips: ["Market relationships", "User connections", "Transaction flows"],
    },
  ],
  interviewProcess: [
    "Recruiter screen",
    "Technical phone interview",
    "On-site: 4-5 rounds",
    "System design + coding",
    "Values alignment",
  ],
  cultureTips: [
    "Democratize finance for all",
    "Safety first mentality",
    "Move fast but safely",
    "Customer trust is paramount",
  ],
  commonQuestionTypes: [
    "Real-time data processing",
    "Order matching systems",
    "Price feed handling",
    "Portfolio calculations",
    "High-availability systems",
  ],
  dosDonts: {
    dos: [
      "Prioritize correctness",
      "Think about edge cases",
      "Consider security implications",
      "Design for high availability",
      "Understand financial concepts",
    ],
    donts: [
      "Ignore precision errors",
      "Forget about race conditions",
      "Overlook security",
      "Design without compliance in mind",
      "Be cavalier about money",
    ],
  },
}
