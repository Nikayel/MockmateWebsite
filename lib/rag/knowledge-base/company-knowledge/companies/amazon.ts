import type { CompanyInterviewKnowledge } from "../../types"

export const amazonKnowledge: CompanyInterviewKnowledge = {
  companyId: "amazon",
  companyName: "Amazon",
  interviewStyle: {
    description:
      "Amazon combines technical and behavioral questions heavily. Leadership Principles are as important as coding skills. Expect STAR format behavioral questions.",
    pace: "Moderate pace with significant behavioral component",
    expectations: [
      "Strong coding fundamentals",
      "Leadership Principles in every answer",
      "Customer obsession in system design",
      "Practical, working solutions",
      "Clear communication and ownership",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 85,
      tips: [
        "Foundation for most problems",
        "Know when to use which data structure",
        "Practice in-place operations",
      ],
    },
    {
      pattern: "trees",
      frequency: 80,
      tips: [
        "Binary tree and BST operations",
        "Know recursive and iterative approaches",
        "LCA is very common",
      ],
    },
    {
      pattern: "graphs",
      frequency: 75,
      tips: [
        "BFS/DFS mastery required",
        "Think about e-commerce applications",
        "Know topological sort",
      ],
    },
    {
      pattern: "dp-1d",
      frequency: 70,
      tips: [
        "Focus on understanding, not memorization",
        "Always explain state clearly",
        "Consider optimization",
      ],
    },
    {
      pattern: "greedy",
      frequency: 65,
      tips: ["Scheduling problems common", "Interval problems", "Know when greedy works"],
    },
  ],
  interviewProcess: [
    "Online assessment (OA) with 2-3 problems",
    "Phone screen with technical + behavioral",
    "On-site loop: 4-5 interviews",
    "Each round includes Leadership Principle questions",
    "Bar raiser interview included",
  ],
  cultureTips: [
    "Memorize the 16 Leadership Principles",
    "Have STAR stories for each principle",
    "Show customer obsession",
    "Demonstrate ownership and bias for action",
    "Be data-driven in your answers",
  ],
  commonQuestionTypes: [
    "Array and string manipulation",
    "Tree problems (especially BST)",
    "Graph traversal",
    "Dynamic programming",
    "System design for e-commerce",
  ],
  dosDonts: {
    dos: [
      "Connect everything to Leadership Principles",
      "Use STAR format for behavioral",
      "Show customer focus in design",
      "Demonstrate ownership",
      "Be concrete with examples",
    ],
    donts: [
      "Ignore the behavioral component",
      "Give vague or hypothetical answers",
      "Blame others in stories",
      "Forget to mention metrics/impact",
      "Rush through behavioral questions",
    ],
  },
}
