import type { CompanyInterviewKnowledge } from "../../types"

export const instacartKnowledge: CompanyInterviewKnowledge = {
  companyId: "instacart",
  companyName: "Instacart",
  interviewStyle: {
    description:
      "Instacart interviews focus on logistics, grocery retail, and real-time inventory systems. Strong emphasis on optimization and customer experience.",
    pace: "Moderate with focus on practical problems",
    expectations: [
      "Strong algorithmic skills",
      "Understanding of logistics challenges",
      "Customer-centric thinking",
      "Scalability awareness",
      "Real-time systems knowledge",
    ],
  },
  topPatterns: [
    {
      pattern: "graphs",
      frequency: 85,
      tips: ["Shopping route optimization", "Store mapping", "Delivery routing"],
    },
    {
      pattern: "greedy",
      frequency: 80,
      tips: ["Item substitution", "Batch optimization", "Shopper assignment"],
    },
    {
      pattern: "arrays-hashing",
      frequency: 80,
      tips: ["Inventory lookups", "Product matching", "Search optimization"],
    },
    {
      pattern: "heap-priority-queue",
      frequency: 70,
      tips: ["Order prioritization", "Delivery scheduling", "Time slot management"],
    },
    {
      pattern: "sliding-window",
      frequency: 60,
      tips: ["Demand forecasting", "Availability windows", "Time-based queries"],
    },
  ],
  interviewProcess: [
    "Recruiter screen",
    "Technical phone interview",
    "On-site: 4 rounds",
    "System design + coding",
    "Values discussion",
  ],
  cultureTips: [
    "Customer obsession",
    "Shopper experience matters",
    "Retail domain knowledge valued",
    "Speed and reliability focus",
  ],
  commonQuestionTypes: [
    "Route optimization",
    "Inventory management",
    "Real-time availability",
    "Substitution algorithms",
    "Batch processing",
  ],
  dosDonts: {
    dos: [
      "Think about all stakeholders (customer, shopper, retailer)",
      "Consider inventory constraints",
      "Optimize for real-world scenarios",
      "Design for scale",
      "Focus on reliability",
    ],
    donts: [
      "Ignore shopper experience",
      "Forget about inventory accuracy",
      "Overlook substitution logic",
      "Design without considering real-time updates",
      "Neglect customer preferences",
    ],
  },
}
