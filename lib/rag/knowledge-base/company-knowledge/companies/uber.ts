import type { CompanyInterviewKnowledge } from "../../types"

export const uberKnowledge: CompanyInterviewKnowledge = {
  companyId: "uber",
  companyName: "Uber",
  interviewStyle: {
    description:
      "Uber interviews focus on real-time systems and optimization problems. Expect questions about matching, routing, and handling high-volume concurrent operations.",
    pace: "Fast-paced with practical focus",
    expectations: [
      "Strong algorithmic foundation",
      "Experience with real-time systems",
      "Understanding of distributed systems",
      "Optimization mindset",
      "Handle ambiguity well",
    ],
  },
  topPatterns: [
    {
      pattern: "graphs",
      frequency: 90,
      tips: ["Routing and navigation", "Shortest path critical", "Real-time graph updates"],
    },
    {
      pattern: "heap-priority-queue",
      frequency: 85,
      tips: ["Driver matching", "Surge pricing", "ETA calculations"],
    },
    {
      pattern: "arrays-hashing",
      frequency: 80,
      tips: ["Geohashing for location", "Efficient lookups", "Rate limiting"],
    },
    {
      pattern: "sliding-window",
      frequency: 70,
      tips: ["Surge detection", "Moving averages", "Time-based windows"],
    },
    {
      pattern: "greedy",
      frequency: 65,
      tips: ["Matching optimization", "Resource allocation", "Scheduling"],
    },
  ],
  interviewProcess: [
    "Recruiter call",
    "Technical phone screen (45 min)",
    "On-site: 4-5 rounds",
    "Includes system design",
    "Behavioral with values focus",
  ],
  cultureTips: [
    "Move fast, act like an owner",
    "Data-driven decision making",
    "Global mindset",
    "Safety is paramount",
  ],
  commonQuestionTypes: [
    "Real-time matching systems",
    "Route optimization",
    "Surge pricing algorithms",
    "Geolocation problems",
    "Distributed system design",
  ],
  dosDonts: {
    dos: [
      "Think about real-time constraints",
      "Consider geographic distribution",
      "Design for failure",
      "Optimize for latency",
      "Show product thinking",
    ],
    donts: [
      "Ignore concurrency issues",
      "Forget about mobile constraints",
      "Design without considering scale",
      "Overlook safety concerns",
      "Ignore edge cases in matching",
    ],
  },
}
