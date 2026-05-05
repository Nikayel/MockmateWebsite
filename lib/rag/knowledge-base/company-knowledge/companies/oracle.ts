import type { CompanyInterviewKnowledge } from "../../types"

export const oracleKnowledge: CompanyInterviewKnowledge = {
  companyId: "oracle",
  companyName: "Oracle",
  interviewStyle: {
    description:
      "Oracle interviews heavily emphasize Java and OOP. SQL questions are common (Nth highest salary). Strong CS fundamentals (OS, DBMS) tested. Enterprise software mindset expected.",
    pace: "Moderate pace with theory emphasis",
    expectations: [
      "Java knowledge essential",
      "OOP concepts (SOLID, design patterns)",
      "SQL proficiency required",
      "CS fundamentals (OS, DBMS) tested",
      "Enterprise software understanding",
    ],
  },
  topPatterns: [
    {
      pattern: "linked-list",
      frequency: 75,
      tips: ["Cycle detection", "List operations", "Add numbers via lists"],
    },
    {
      pattern: "arrays-hashing",
      frequency: 85,
      tips: ["Missing number", "First duplicate", "Data validation"],
    },
    {
      pattern: "dp-1d",
      frequency: 55,
      tips: ["Coin change", "Classic DP problems", "Optimization"],
    },
    {
      pattern: "graphs",
      frequency: 60,
      tips: ["Dijkstra variants", "Shortest path", "Graph connectivity"],
    },
  ],
  interviewProcess: [
    "Technical screen - experience + theory",
    "Technical coding - DSA + fundamentals",
    "Technical round 2 with LeetCode problem",
  ],
  cultureTips: [
    "Database expertise is valued",
    "Java and JVM mastery important",
    "Enterprise reliability focus",
    "Show understanding of cloud (OCI)",
    "Collaborative teamwork",
  ],
  commonQuestionTypes: [
    "Missing Number in Array",
    "Linked List Cycle Detection",
    "First Duplicate (O(n)/O(1))",
    "Coin Change (DP)",
    "Nth Highest Salary (SQL)",
  ],
  dosDonts: {
    dos: [
      "Master Java and OOP",
      "Practice SQL queries",
      "Review Exception hierarchy",
      "Know SOLID principles",
      "Understand OS/DBMS fundamentals",
    ],
    donts: [
      "Be weak in Java fundamentals",
      "Skip SQL preparation",
      "Ignore CS theory",
      "Forget design patterns",
      "Overlook enterprise context",
    ],
  },
}
