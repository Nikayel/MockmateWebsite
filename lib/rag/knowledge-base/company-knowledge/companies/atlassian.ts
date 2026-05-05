import type { CompanyInterviewKnowledge } from "../../types"

export const atlassianKnowledge: CompanyInterviewKnowledge = {
  companyId: "atlassian",
  companyName: "Atlassian",
  interviewStyle: {
    description:
      "Atlassian interviews are practical with easy-medium difficulty. Unique aspect: you code on your own laptop locally. Values interview is important. Focus on HashMaps and creating classes.",
    pace: "Moderate pace with practical focus",
    expectations: [
      "Easy-medium LeetCode difficulty",
      "Code on your own laptop locally",
      "Values interview is critical",
      "HashMaps and class design focus",
      "Clean code principles valued",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 90,
      tips: ["HashMap-based solutions", "Data counting", "Lookup optimization"],
    },
    {
      pattern: "string",
      frequency: 80,
      tips: ["String manipulation", "Parsing", "Pattern matching"],
    },
    {
      pattern: "intervals",
      frequency: 60,
      tips: ["Meeting overlap", "Calendar problems", "Time scheduling"],
    },
    {
      pattern: "trees",
      frequency: 75,
      tips: ["Hierarchy structures", "Project trees", "Organization charts"],
    },
  ],
  interviewProcess: [
    "HackerRank OA - 2 questions (easy/medium)",
    "Technical screen (code on your laptop)",
    "Values interview",
  ],
  cultureTips: [
    "Open Company, No Bullshit - transparency",
    "Build with Heart and Balance",
    "Don't F*** the Customer",
    "Play as a Team - collaboration",
    "Be the Change You Seek",
  ],
  commonQuestionTypes: [
    "Meeting Time Overlap",
    "Longest Common Subsequence",
    "Custom Data Structures",
    "Array/String Manipulation",
  ],
  dosDonts: {
    dos: [
      "Practice HashMaps extensively",
      "Create clean classes in code",
      "Review Atlassian values beforehand",
      "Be comfortable coding locally",
      "Show team collaboration mindset",
    ],
    donts: [
      "Ignore values interview prep",
      "Write messy code without structure",
      "Be unfamiliar with Jira/Confluence",
      "Skip class design patterns",
      "Forget transparency in communication",
    ],
  },
}
