import type { CompanyInterviewKnowledge } from "../../types"

export const veevaKnowledge: CompanyInterviewKnowledge = {
  companyId: "veeva",
  companyName: "Veeva Systems",
  interviewStyle: {
    description:
      "Veeva interviews focus on enterprise software and life sciences domain. Strong emphasis on data integrity, compliance, and scalable cloud solutions. Java and Spring Boot are primary for backend roles, but Python and JavaScript are accepted for certain positions (data engineering, frontend, automation). Expect a mix of LeetCode-style coding (2 Easy, 1 Medium, 1 Hard typical distribution) and behavioral questions.",
    pace: "Methodical with domain focus, 17-32 days average process",
    expectations: [
      "Clean, maintainable code (Java preferred, Python/JavaScript for specific roles)",
      "Understanding of enterprise systems and Spring Boot",
      "Data integrity and compliance focus",
      "AWS cloud services knowledge (Lambda, ECS, Fargate, RDS)",
      "Life sciences domain interest appreciated",
      "SQL proficiency for data queries",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 85,
      tips: [
        "Data validation and lookup optimization",
        "Product of array except self is common",
        "Subarray sum problems frequent",
      ],
    },
    {
      pattern: "string",
      frequency: 80,
      tips: [
        "Valid parentheses/well-formed brackets very common",
        "Longest substring without repeating characters",
        "Document parsing and validation rules",
      ],
    },
    {
      pattern: "trees",
      frequency: 70,
      tips: [
        "Binary tree comparison (check if identical)",
        "Hierarchical document structure",
        "Organization trees and approval hierarchies",
      ],
    },
    {
      pattern: "graphs",
      frequency: 65,
      tips: ["Workflow systems and approval chains", "Dependency tracking", "BFS/DFS fundamentals"],
    },
    {
      pattern: "binary-search",
      frequency: 60,
      tips: ["Search in sorted data", "Efficient lookups", "Common in coding assessments"],
    },
  ],
  interviewProcess: [
    "HR/Recruiter screen (30 min) - behavioral vibe check",
    "Online Assessment: 3-4 LeetCode problems in 60 min (Java preferred)",
    "Hiring Manager technical screen (45-60 min) - debugging + discussion",
    "Team Day: 4-5 hour final round with multiple interviewers",
    "Mix of 2 technical rounds + 2 behavioral rounds",
  ],
  cultureTips: [
    "Do the Right Thing - core value, emphasize in answers",
    "Customer Success - show user-centric thinking",
    "Employee Success - collaborative team player",
    "Speed - move efficiently but maintain quality",
    "Work-life balance genuinely valued",
    "Long-term thinking over quick wins",
  ],
  commonQuestionTypes: [
    "Valid parentheses and bracket matching",
    "Binary tree operations and comparison",
    "Substring problems (longest without repeating chars)",
    "SQL queries (second highest salary with ties)",
    "Data modeling and validation",
    "API design for enterprise systems",
    "Cloud architecture (AWS focused)",
  ],
  dosDonts: {
    dos: [
      "Focus on data integrity and audit trails",
      "Show understanding of compliance requirements (FDA, life sciences)",
      "Write clean, well-documented Java code",
      "Demonstrate AWS cloud knowledge",
      "Express genuine interest in life sciences/pharma domain",
      "Prepare STAR format stories aligned with core values",
    ],
    donts: [
      "Ignore edge cases in data handling",
      "Skip input validation or error handling",
      "Overlook audit and compliance requirements",
      "Design without considering enterprise scale",
      "Be unfamiliar with Spring Boot basics",
      "Neglect to research Veeva products (CRM, Vault, OpenData)",
    ],
  },
}
