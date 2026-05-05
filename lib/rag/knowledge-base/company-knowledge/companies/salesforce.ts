import type { CompanyInterviewKnowledge } from "../../types"

export const salesforceKnowledge: CompanyInterviewKnowledge = {
  companyId: "salesforce",
  companyName: "Salesforce",
  interviewStyle: {
    description:
      "Salesforce interviews focus on practical OOP skills and data manipulation over complex algorithms. Questions are typically easy to medium difficulty. Strong emphasis on HashMaps, Trees, and Graphs. Futureforce program for interns.",
    pace: "Moderate pace with OOP emphasis",
    expectations: [
      "Strong OOP fundamentals",
      "Practical data manipulation",
      "Easy to medium LeetCode difficulty",
      "Project discussion important",
      "Collaboration and values focus",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 90,
      tips: ["HashMap solutions", "Data lookup optimization", "Practical data problems"],
    },
    {
      pattern: "trees",
      frequency: 80,
      tips: ["BST operations", "Traversal variations", "Hierarchy problems"],
    },
    {
      pattern: "graphs",
      frequency: 75,
      tips: ["Number of Islands", "BFS/DFS applications", "Connected components"],
    },
    {
      pattern: "string",
      frequency: 70,
      tips: ["Dictionary problems", "Validation", "Parsing"],
    },
  ],
  interviewProcess: [
    "HackerRank OA - 2 questions in 1 hour",
    "Technical round - DSA + OOP",
    "Technical round 2 - System discussion",
    "Hiring manager + values",
  ],
  cultureTips: [
    "Trust is Salesforce's #1 value",
    "Customer Success is paramount",
    "Show commitment to Equality",
    "Demonstrate innovative thinking",
    "Ohana (family) culture mindset",
  ],
  commonQuestionTypes: [
    "Number of Islands",
    "Longest Common Subsequence",
    "Valid Words from Dictionary",
    "Snake and Ladder (BFS)",
    "Binary Search variations",
  ],
  dosDonts: {
    dos: [
      "Master OOP concepts",
      "Practice HashMap problems",
      "Prepare strong project stories",
      "Show customer-centric thinking",
      "Demonstrate collaborative mindset",
    ],
    donts: [
      "Ignore OOP fundamentals",
      "Over-complicate solutions",
      "Skip project discussion prep",
      "Underestimate values interview",
      "Be unfamiliar with CRM concepts",
    ],
  },
}
