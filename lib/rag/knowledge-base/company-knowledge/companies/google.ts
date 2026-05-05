import type { CompanyInterviewKnowledge } from "../../types"

export const googleKnowledge: CompanyInterviewKnowledge = {
  companyId: "google",
  companyName: "Google",
  interviewStyle: {
    description:
      "Google interviews focus heavily on algorithmic problem-solving and system design. Expect challenging problems that test your ability to think through edge cases and optimize solutions.",
    pace: "Moderate pace with emphasis on communication",
    expectations: [
      "Optimal or near-optimal solutions expected",
      "Strong emphasis on code quality and cleanliness",
      "Must explain thought process clearly",
      "Handle follow-up questions and optimizations",
      "Demonstrate knowledge of time/space trade-offs",
    ],
  },
  topPatterns: [
    {
      pattern: "graphs",
      frequency: 85,
      tips: ["Know BFS/DFS inside out", "Practice cycle detection", "Topological sort is common"],
    },
    {
      pattern: "dp-2d",
      frequency: 80,
      tips: [
        "Start with recursion, then memoize",
        "Explain state transitions clearly",
        "Consider space optimization",
      ],
    },
    {
      pattern: "trees",
      frequency: 75,
      tips: [
        "Binary tree traversals are fundamental",
        "Know how to serialize/deserialize",
        "LCA problems are common",
      ],
    },
    {
      pattern: "arrays-hashing",
      frequency: 70,
      tips: [
        "Foundation for many problems",
        "Always consider hash map approach",
        "Know when to use set vs map",
      ],
    },
    {
      pattern: "sliding-window",
      frequency: 65,
      tips: [
        "Practice variable-size windows",
        "Common in string problems",
        "Know when to expand vs shrink",
      ],
    },
  ],
  interviewProcess: [
    "Initial recruiter call (30 min)",
    "Phone screen with coding (45-60 min)",
    "On-site: 4-5 rounds of technical interviews",
    "Mix of coding, system design (for senior), and behavioral",
    "Team matching process after passing",
  ],
  cultureTips: [
    "Googleyness: collaborative, humble, adaptable",
    "Data-driven decision making is valued",
    "Show intellectual curiosity",
    "Demonstrate ability to work with ambiguity",
  ],
  commonQuestionTypes: [
    "Graph traversal and shortest paths",
    "Dynamic programming optimization",
    "Tree manipulation and traversal",
    "String processing with constraints",
    "System design for Google-scale products",
  ],
  dosDonts: {
    dos: [
      "Think out loud and explain your approach",
      "Ask clarifying questions before coding",
      "Consider and mention edge cases",
      "Discuss multiple approaches before implementing",
      "Test your code with examples",
    ],
    donts: [
      "Jump into coding without a plan",
      "Give up when stuck - ask for hints",
      "Ignore the interviewer's hints",
      "Write messy or unclear code",
      "Forget to analyze time/space complexity",
    ],
  },
}
