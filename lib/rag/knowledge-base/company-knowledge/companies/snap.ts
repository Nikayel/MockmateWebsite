import type { CompanyInterviewKnowledge } from "../../types"

export const snapKnowledge: CompanyInterviewKnowledge = {
  companyId: "snap",
  companyName: "Snap Inc.",
  interviewStyle: {
    description:
      "Snap interviews feature 'Deciders' similar to Amazon's Bar Raisers. Values (Kind, Smart, Creative) are evaluated in every round. Questions overlap with Blind 75 list. The bar can be unexpectedly high.",
    pace: "Moderate with values emphasis",
    expectations: [
      "Kind, Smart, Creative values in every round",
      "Deciders have veto power",
      "Medium to hard LeetCode problems",
      "Product knowledge expected",
      "Passion for Snapchat products",
    ],
  },
  topPatterns: [
    {
      pattern: "graphs",
      frequency: 85,
      tips: ["K closest points/restaurants", "Matrix traversal", "Path finding"],
    },
    {
      pattern: "backtracking",
      frequency: 75,
      tips: ["Pair matching", "Constraint satisfaction", "Combination generation"],
    },
    {
      pattern: "trees",
      frequency: 80,
      tips: ["Serialize/deserialize", "Binary tree operations", "Tree construction"],
    },
    {
      pattern: "dp-1d",
      frequency: 70,
      tips: ["Optimization problems", "Subarray problems", "String DP"],
    },
  ],
  interviewProcess: [
    "Technical screen (15 min behavioral + 45 min coding)",
    "Coding loop round 1",
    "Coding loop round 2",
    "Coding loop round 3 (Decider round)",
  ],
  cultureTips: [
    "Kind - show empathy and kindness",
    "Smart - demonstrate critical thinking",
    "Creative - show innovative approaches",
    "Know Snapchat products deeply",
    "Camera-first company mindset",
  ],
  commonQuestionTypes: [
    "LRU Cache (strict complexity)",
    "K Closest Points/Restaurants",
    "Maximum Sum Submatrix",
    "Serialize/Deserialize Tree",
    "Backtracking problems",
  ],
  dosDonts: {
    dos: [
      "Show all three values (Kind, Smart, Creative)",
      "Know Snapchat products",
      "Practice Blind 75 problems",
      "Meet strict complexity requirements",
      "Demonstrate product passion",
    ],
    donts: [
      "Ignore values assessment",
      "Be unfamiliar with Snapchat",
      "Give suboptimal solutions",
      "Be unkind or dismissive",
      "Underestimate the bar",
    ],
  },
}
