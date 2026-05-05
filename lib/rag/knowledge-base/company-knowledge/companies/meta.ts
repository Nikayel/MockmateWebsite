import type { CompanyInterviewKnowledge } from "../../types"

export const metaKnowledge: CompanyInterviewKnowledge = {
  companyId: "meta",
  companyName: "Meta (Facebook)",
  interviewStyle: {
    description:
      "Meta interviews are fast-paced and practical. They want to see you solve problems efficiently and write production-quality code quickly.",
    pace: "Fast-paced, typically 2 problems in 45 minutes",
    expectations: [
      "Speed and efficiency are crucial",
      "Working code is the priority",
      "Expect 2 medium problems or 1 hard",
      "Clean, bug-free code expected",
      "Strong problem-solving intuition needed",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 90,
      tips: [
        "Must be very fast at these",
        "Know all common patterns cold",
        "Two Sum variations are everywhere",
      ],
    },
    {
      pattern: "graphs",
      frequency: 80,
      tips: [
        "Clone graph, number of islands",
        "BFS for shortest path",
        "Union-Find for connectivity",
      ],
    },
    {
      pattern: "trees",
      frequency: 75,
      tips: ["Binary tree problems common", "Know iterative traversals", "Serialization problems"],
    },
    {
      pattern: "string",
      frequency: 70,
      tips: [
        "Substring and parsing problems",
        "Know sliding window well",
        "Character frequency counting",
      ],
    },
    {
      pattern: "binary-search",
      frequency: 65,
      tips: ["Search in rotated array", "Finding boundaries", "Search on answer space"],
    },
  ],
  interviewProcess: [
    "Initial recruiter call",
    "Phone screen: 45 min, 1-2 coding problems",
    "On-site: 3-4 rounds (coding, system design for E5+)",
    "Behavioral interview included",
    "Fast turnaround on decisions",
  ],
  cultureTips: [
    "Move fast and break things mentality",
    "Impact-driven culture",
    "Show you can handle ambiguity",
    "Collaboration is highly valued",
  ],
  commonQuestionTypes: [
    "Array manipulation and optimization",
    "Graph problems (especially social network related)",
    "Binary tree operations",
    "String processing",
    "System design for social features",
  ],
  dosDonts: {
    dos: [
      "Practice under time pressure",
      "Have a systematic approach to problems",
      "Write clean code quickly",
      "Handle edge cases efficiently",
      "Communicate your thought process",
    ],
    donts: [
      "Spend too long on one problem",
      "Sacrifice code quality for speed",
      "Get stuck without asking questions",
      "Forget to verify your solution",
      "Overcomplicate simple problems",
    ],
  },
}
