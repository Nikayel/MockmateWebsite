import type { CompanyInterviewKnowledge } from "../../types"

export const doordashKnowledge: CompanyInterviewKnowledge = {
  companyId: "doordash",
  companyName: "DoorDash",
  interviewStyle: {
    description:
      "DoorDash interviews focus on logistics optimization and real-time delivery systems. Strong emphasis on three-sided marketplace dynamics.",
    pace: "Fast-paced with practical problems",
    expectations: [
      "Strong algorithmic skills",
      "Real-time systems experience",
      "Optimization mindset",
      "Product thinking",
      "Understand marketplace dynamics",
    ],
  },
  topPatterns: [
    {
      pattern: "graphs",
      frequency: 90,
      tips: ["Delivery routing", "Restaurant clustering", "Driver assignment"],
    },
    {
      pattern: "heap-priority-queue",
      frequency: 85,
      tips: ["Order prioritization", "Driver matching", "ETA prediction"],
    },
    { pattern: "arrays-hashing", frequency: 80, tips: ["Menu search", "Geolocation", "Caching"] },
    {
      pattern: "greedy",
      frequency: 75,
      tips: ["Batching orders", "Route optimization", "Resource allocation"],
    },
    {
      pattern: "sliding-window",
      frequency: 65,
      tips: ["Demand forecasting", "Surge detection", "Time windows"],
    },
  ],
  interviewProcess: [
    "Recruiter call",
    "Technical phone screen",
    "On-site: 4-5 rounds",
    "System design critical",
    "Values interview",
  ],
  cultureTips: [
    "Be an owner",
    "Operate at the lowest level of detail",
    "Customer obsessed",
    "Bias for action",
  ],
  commonQuestionTypes: [
    "Delivery optimization",
    "Matching algorithms",
    "Real-time tracking",
    "Demand prediction",
    "Marketplace balancing",
  ],
  dosDonts: {
    dos: [
      "Think about all three sides (customer, dasher, merchant)",
      "Optimize for real-time",
      "Consider geographic constraints",
      "Design for scale",
      "Show ownership",
    ],
    donts: [
      "Ignore marketplace dynamics",
      "Forget about dasher experience",
      "Overlook restaurant constraints",
      "Design without scale in mind",
      "Be passive about problems",
    ],
  },
}
