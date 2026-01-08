/**
 * Emerging Tech & Delivery Company Interview Data
 * Based on aggregated data from LeetCode, Glassdoor, Blind, and interview reports
 */

import { CompanyQuestionData } from "./types"

export const veevaData: CompanyQuestionData = {
  id: "veeva",
  name: "Veeva Systems",
  logo: "/company-logos/veeva.svg",
  careers_url: "https://careers.veeva.com",

  difficultyDistribution: {
    easy: 30,
    medium: 50,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 85, priority: 10, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 50, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    { scenarioId: "dsa-two-sum", title: "Two Sum", frequency: "very_common" },
    { scenarioId: "dsa-valid-parentheses", title: "Valid Parentheses", frequency: "very_common" },
    { scenarioId: "dsa-merge-intervals", title: "Merge Intervals", frequency: "common" },
    { scenarioId: "dsa-lru-cache", title: "LRU Cache", frequency: "common" },
    {
      scenarioId: "design-document-management",
      title: "Document Management System",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "HR + Technical screen",
        focusAreas: ["background", "coding"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical coding round",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design round",
        focusAreas: ["architecture", "scalability"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Hiring manager + Values",
        focusAreas: ["culture", "leadership"],
      },
    ],
    timeline: "2-3 weeks",
    tips: [
      "Life sciences domain knowledge is a plus",
      "Emphasize data integrity and compliance experience",
      "Cloud platform experience (especially Salesforce) valued",
      "Strong SQL skills are important",
      "Work-life balance focused culture",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 7,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      "Life sciences/pharma domain focus",
      "Strong emphasis on data integrity",
      "Salesforce platform knowledge valued",
      "Enterprise software experience preferred",
    ],
  },

  compensation: {
    entryLevel: "$120k - $150k TC",
    midLevel: "$160k - $220k TC",
    seniorLevel: "$220k - $320k TC",
  },
}

export const doordashData: CompanyQuestionData = {
  id: "doordash",
  name: "DoorDash",
  logo: "/company-logos/doordash.svg",
  careers_url: "https://careers.doordash.com",

  difficultyDistribution: {
    easy: 15,
    medium: 55,
    hard: 30,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 80, priority: 9, typicalDifficulty: "hard" },
    { pattern: "heap", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 70, priority: 8, typicalDifficulty: "hard" },
    { pattern: "binary-search", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "intervals", frequency: 60, priority: 7, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "design-food-delivery",
      title: "Design Food Delivery System",
      frequency: "very_common",
    },
    { scenarioId: "dsa-task-scheduler", title: "Task Scheduler", frequency: "very_common" },
    { scenarioId: "dsa-meeting-rooms", title: "Meeting Rooms II", frequency: "common" },
    { scenarioId: "dsa-shortest-path", title: "Shortest Path in Grid", frequency: "common" },
    { scenarioId: "design-eta-prediction", title: "ETA Prediction System", frequency: "common" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Recruiter + Technical screen",
        focusAreas: ["background", "coding"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Data structures & algorithms",
        focusAreas: ["algorithms", "optimization"],
      },
      {
        type: "coding",
        duration: 60,
        description: "System design coding",
        focusAreas: ["design", "implementation"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "Large-scale system design",
        focusAreas: ["architecture", "real-time"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Culture fit + Leadership",
        focusAreas: ["values", "leadership"],
      },
    ],
    timeline: "3-4 weeks",
    tips: [
      "Focus on real-time systems and geolocation",
      "Understand marketplace dynamics (supply/demand)",
      "Graph algorithms are frequently tested",
      "Be prepared for optimization problems",
      "Show passion for logistics and efficiency",
    ],
  },

  interviewStyle: {
    pace: "fast",
    communicationEmphasis: 8,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: true,
    allowsPseudocode: false,
    providesHints: true,
    uniqueTraits: [
      "Logistics/delivery domain focus",
      "Real-time systems emphasis",
      "Graph and optimization heavy",
      "Fast-paced startup culture",
    ],
  },

  compensation: {
    entryLevel: "$150k - $180k TC",
    midLevel: "$200k - $300k TC",
    seniorLevel: "$320k - $450k TC",
  },
}

export const instacartData: CompanyQuestionData = {
  id: "instacart",
  name: "Instacart",
  logo: "/company-logos/instacart.svg",
  careers_url: "https://instacart.careers",

  difficultyDistribution: {
    easy: 20,
    medium: 55,
    hard: 25,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 75, priority: 8, typicalDifficulty: "hard" },
    { pattern: "greedy", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 60, priority: 7, typicalDifficulty: "hard" },
    { pattern: "sliding-window", frequency: 55, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "design-grocery-delivery",
      title: "Design Grocery Delivery System",
      frequency: "very_common",
    },
    { scenarioId: "dsa-task-scheduler", title: "Task Scheduler", frequency: "common" },
    { scenarioId: "dsa-merge-intervals", title: "Merge Intervals", frequency: "common" },
    { scenarioId: "design-inventory-system", title: "Inventory Management", frequency: "common" },
    { scenarioId: "dsa-top-k-frequent", title: "Top K Frequent Elements", frequency: "common" },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Technical phone screen",
        focusAreas: ["coding", "background"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Algorithms round",
        focusAreas: ["algorithms", "problem-solving"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design",
        focusAreas: ["architecture", "scalability"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Values and culture fit",
        focusAreas: ["values", "collaboration"],
      },
    ],
    timeline: "2-3 weeks",
    tips: [
      "Grocery/retail domain knowledge helps",
      "Focus on optimization and routing problems",
      "Understand supply chain and inventory management",
      "Real-time availability and pricing systems",
      "Show passion for solving logistics challenges",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 8,
    codeQualityEmphasis: 7,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      "Grocery/retail domain focus",
      "Routing and optimization emphasis",
      "Real-time inventory systems",
      "Customer-centric culture",
    ],
  },

  compensation: {
    entryLevel: "$140k - $170k TC",
    midLevel: "$180k - $280k TC",
    seniorLevel: "$300k - $420k TC",
  },
}

export const robinhoodData: CompanyQuestionData = {
  id: "robinhood",
  name: "Robinhood",
  logo: "/company-logos/robinhood.svg",
  careers_url: "https://robinhood.com/careers",

  difficultyDistribution: {
    easy: 15,
    medium: 50,
    hard: 35,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 85, priority: 9, typicalDifficulty: "hard" },
    { pattern: "dp-2d", frequency: 75, priority: 8, typicalDifficulty: "hard" },
    { pattern: "binary-search", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "sliding-window", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 60, priority: 7, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "design-stock-exchange",
      title: "Design Stock Exchange",
      frequency: "very_common",
    },
    {
      scenarioId: "dsa-best-time-buy-sell",
      title: "Best Time to Buy and Sell Stock",
      frequency: "very_common",
    },
    {
      scenarioId: "dsa-median-data-stream",
      title: "Find Median from Data Stream",
      frequency: "common",
    },
    {
      scenarioId: "design-trading-platform",
      title: "Design Trading Platform",
      frequency: "common",
    },
    {
      scenarioId: "dsa-stock-price-fluctuation",
      title: "Stock Price Fluctuation",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Technical screen",
        focusAreas: ["coding", "finance-basics"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Algorithms deep-dive",
        focusAreas: ["algorithms", "optimization"],
      },
      {
        type: "coding",
        duration: 60,
        description: "System coding",
        focusAreas: ["implementation", "edge-cases"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "Financial systems design",
        focusAreas: ["architecture", "real-time"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Mission and values",
        focusAreas: ["mission", "culture"],
      },
    ],
    timeline: "3-4 weeks",
    tips: [
      "Financial markets knowledge is valuable",
      "Focus on real-time data processing",
      "Understand order matching and execution",
      "Security and compliance are critical",
      "Show passion for democratizing finance",
    ],
  },

  interviewStyle: {
    pace: "fast",
    communicationEmphasis: 7,
    codeQualityEmphasis: 9,
    optimalSolutionRequired: true,
    allowsPseudocode: false,
    providesHints: false,
    uniqueTraits: [
      "Fintech/trading domain focus",
      "Real-time data processing emphasis",
      "High code quality bar",
      "Mission-driven culture",
    ],
  },

  compensation: {
    entryLevel: "$150k - $180k TC",
    midLevel: "$200k - $320k TC",
    seniorLevel: "$350k - $500k TC",
  },
}

export const squareData: CompanyQuestionData = {
  id: "square",
  name: "Square (Block)",
  logo: "/company-logos/square.svg",
  careers_url: "https://block.xyz/careers",

  difficultyDistribution: {
    easy: 20,
    medium: 55,
    hard: 25,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 75, priority: 8, typicalDifficulty: "hard" },
    { pattern: "string", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "linked-list", frequency: 55, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "design-payment-system",
      title: "Design Payment Processing",
      frequency: "very_common",
    },
    {
      scenarioId: "dsa-serialize-deserialize",
      title: "Serialize and Deserialize Tree",
      frequency: "common",
    },
    { scenarioId: "dsa-lru-cache", title: "LRU Cache", frequency: "common" },
    { scenarioId: "design-pos-system", title: "Design POS System", frequency: "common" },
    { scenarioId: "dsa-valid-parentheses", title: "Valid Parentheses", frequency: "common" },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Technical phone screen",
        focusAreas: ["coding", "background"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Algorithm round",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design",
        focusAreas: ["architecture", "payments"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Culture and values",
        focusAreas: ["values", "leadership"],
      },
    ],
    timeline: "2-3 weeks",
    tips: [
      "Payments/fintech domain knowledge helps",
      "Focus on reliability and fault tolerance",
      "Understand transaction processing",
      "Security and compliance awareness",
      "Show interest in economic empowerment",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 8,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      "Payments/fintech domain focus",
      "Reliability and fault tolerance emphasis",
      "Multiple products (Square, Cash App, Bitcoin)",
      "Economic empowerment mission",
    ],
  },

  compensation: {
    entryLevel: "$140k - $170k TC",
    midLevel: "$190k - $300k TC",
    seniorLevel: "$320k - $480k TC",
  },
}

export const figmaData: CompanyQuestionData = {
  id: "figma",
  name: "Figma",
  logo: "/company-logos/figma.svg",
  careers_url: "https://figma.com/careers",

  difficultyDistribution: {
    easy: 20,
    medium: 55,
    hard: 25,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 80, priority: 9, typicalDifficulty: "hard" },
    { pattern: "bfs", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 65, priority: 7, typicalDifficulty: "hard" },
    { pattern: "string", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 55, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "design-collaborative-editor",
      title: "Design Collaborative Editor",
      frequency: "very_common",
    },
    { scenarioId: "dsa-clone-graph", title: "Clone Graph", frequency: "common" },
    { scenarioId: "design-real-time-sync", title: "Real-time Sync System", frequency: "common" },
    {
      scenarioId: "dsa-serialize-deserialize",
      title: "Serialize/Deserialize Tree",
      frequency: "common",
    },
    { scenarioId: "design-undo-redo", title: "Design Undo/Redo System", frequency: "common" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Technical screen",
        focusAreas: ["coding", "background"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Algorithm round",
        focusAreas: ["algorithms", "problem-solving"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Practical coding",
        focusAreas: ["implementation", "design"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design",
        focusAreas: ["real-time", "collaboration"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Culture fit",
        focusAreas: ["design-thinking", "collaboration"],
      },
    ],
    timeline: "3-4 weeks",
    tips: [
      "Understand real-time collaboration challenges",
      "CRDTs and operational transformation knowledge helps",
      "Focus on user experience and design sensibility",
      "Graph problems are common (design tools = graphs)",
      "Show passion for design and creative tools",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 9,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      "Design tools domain focus",
      "Real-time collaboration emphasis",
      "Strong design sensibility valued",
      "Graph-heavy problems",
    ],
  },

  compensation: {
    entryLevel: "$150k - $180k TC",
    midLevel: "$200k - $320k TC",
    seniorLevel: "$350k - $500k TC",
  },
}

/**
 * Combined emerging tech companies
 */
export const emergingTechCompanies: CompanyQuestionData[] = [
  veevaData,
  doordashData,
  instacartData,
  robinhoodData,
  squareData,
  figmaData,
]
