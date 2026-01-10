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

  coreValues: {
    principles: [
      "Do the Right Thing - ethics and compliance matter",
      "Customer Success - help life sciences succeed",
      "Employee Success - invest in people",
      "Speed - move quickly without sacrificing quality",
    ],
    behavioralExpectations: [
      "Demonstrate understanding of life sciences industry",
      "Show commitment to data integrity and compliance",
      "Exhibit customer-focused problem solving",
      "Display strong SQL and database skills",
      "Show you can work in regulated environments",
    ],
    valueKeywords: [
      "life sciences",
      "pharma",
      "compliance",
      "data integrity",
      "customer success",
      "enterprise",
      "Salesforce",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Life sciences and pharma domain expertise valued",
      "Data integrity and compliance are paramount",
      "Salesforce platform knowledge is a plus",
      "Enterprise software experience preferred",
      "Work-life balance focused culture",
    ],
    techStack: ["Java", "Python", "JavaScript/React", "Salesforce", "AWS", "PostgreSQL"],
    codeReviewStyle: "thorough reviews with compliance focus",
    deploymentPhilosophy: "careful staged deployments with validation",
    documentationExpectations: "comprehensive documentation for regulatory compliance",
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

  coreValues: {
    principles: [
      "Be Customer Obsessed - put customers first",
      "Be an Owner - act like the company is yours",
      "Make Room at the Table - diverse perspectives matter",
      "Default to Transparency - share information openly",
      "Operate with Grit - persevere through challenges",
      "One Team, One Fight - work together",
    ],
    behavioralExpectations: [
      "Demonstrate customer-first thinking in decisions",
      "Show ownership mentality and accountability",
      "Exhibit resilience and ability to overcome obstacles",
      "Display collaborative and inclusive behavior",
      "Show passion for logistics and efficiency",
    ],
    valueKeywords: [
      "customer obsessed",
      "ownership",
      "transparency",
      "grit",
      "logistics",
      "delivery",
      "marketplace",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Real-time delivery systems at scale",
      "Marketplace dynamics - supply and demand",
      "Graph and optimization algorithms are core",
      "Fast-paced startup culture",
      "Data-driven decision making",
    ],
    techStack: ["Kotlin", "Python", "Go", "React Native", "Kubernetes", "PostgreSQL", "Redis"],
    codeReviewStyle: "fast reviews focused on shipping",
    deploymentPhilosophy: "continuous deployment with feature flags",
    documentationExpectations: "documentation for critical systems and APIs",
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

  coreValues: {
    principles: [
      "Customers First - shoppers and retailers are our priority",
      "Move Fast - iterate quickly and learn",
      "Act Like an Owner - take responsibility",
      "Do More With Less - be resourceful",
      "Give a Damn - care about quality and impact",
    ],
    behavioralExpectations: [
      "Demonstrate customer-centric thinking",
      "Show resourcefulness and creative problem-solving",
      "Exhibit ownership and accountability",
      "Display passion for retail/grocery domain",
      "Show you can work in fast-paced environment",
    ],
    valueKeywords: [
      "customers first",
      "grocery",
      "retail",
      "ownership",
      "fast",
      "logistics",
      "routing",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Grocery and retail domain focus",
      "Routing and optimization problems",
      "Real-time inventory and pricing systems",
      "Customer-centric approach to engineering",
      "Moderate pace compared to pure startups",
    ],
    techStack: ["Python", "Go", "React", "PostgreSQL", "Kubernetes", "AWS"],
    codeReviewStyle: "collaborative reviews with focus on quality",
    deploymentPhilosophy: "continuous deployment with testing",
    documentationExpectations: "documentation for services and APIs",
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

  coreValues: {
    principles: [
      "Safety First - protect customers and their money",
      "Participation is Power - democratize finance",
      "Customers Come First - make investing accessible",
      "Radical Customer Focus - obsess over user experience",
      "First Principles Thinking - question assumptions",
    ],
    behavioralExpectations: [
      "Demonstrate passion for democratizing finance",
      "Show understanding of financial markets and trading",
      "Exhibit strong focus on security and reliability",
      "Display customer-centric problem solving",
      "Show you can work under regulatory constraints",
    ],
    valueKeywords: [
      "democratize",
      "finance",
      "trading",
      "security",
      "customer focus",
      "first principles",
      "accessibility",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Fintech and trading domain focus",
      "Real-time data processing at scale",
      "Security and compliance are critical",
      "High code quality bar",
      "Mission-driven culture",
    ],
    techStack: ["Python", "Go", "Elixir", "React Native", "PostgreSQL", "Kafka", "AWS"],
    codeReviewStyle: "thorough reviews with security focus",
    deploymentPhilosophy: "careful staged deployments for financial systems",
    documentationExpectations: "comprehensive documentation for compliance",
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

  coreValues: {
    principles: [
      "Inclusion - economic empowerment for all",
      "Purpose - build products that matter",
      "Discipline - do more with less",
      "Collaboration - work together effectively",
      "Excellence - strive for the highest quality",
    ],
    behavioralExpectations: [
      "Demonstrate passion for economic empowerment",
      "Show understanding of payments and fintech",
      "Exhibit reliability and fault tolerance mindset",
      "Display customer-focused problem solving",
      "Show you can work across multiple products/domains",
    ],
    valueKeywords: [
      "economic empowerment",
      "payments",
      "fintech",
      "inclusion",
      "reliability",
      "purpose",
      "discipline",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Payments and fintech expertise",
      "Multiple products - Square, Cash App, Bitcoin",
      "Reliability and fault tolerance paramount",
      "Economic empowerment mission",
      "Mobile-first for many products",
    ],
    techStack: ["Java", "Kotlin", "Ruby", "Go", "React", "MySQL", "Kubernetes"],
    codeReviewStyle: "thorough reviews focused on reliability",
    deploymentPhilosophy: "staged rollouts with extensive testing",
    documentationExpectations: "comprehensive documentation for payment flows",
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

  coreValues: {
    principles: [
      "Play as a Team - collaboration over competition",
      "Run with It - ownership and initiative",
      "Make it Happen - resourcefulness and execution",
      "Build for Everyone - accessibility and inclusion",
      "Grow - continuous learning and improvement",
    ],
    behavioralExpectations: [
      "Demonstrate collaborative and team-oriented mindset",
      "Show passion for design and creative tools",
      "Exhibit understanding of real-time collaboration challenges",
      "Display strong problem-solving with complex systems",
      "Show you value accessibility and inclusive design",
    ],
    valueKeywords: [
      "design",
      "collaboration",
      "real-time",
      "accessibility",
      "growth",
      "team",
      "creative tools",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Design tools domain focus",
      "Real-time collaboration is the core challenge",
      "CRDTs and operational transformation knowledge valued",
      "Graph problems are common (design = graph)",
      "Strong design sensibility expected",
    ],
    techStack: ["TypeScript", "C++", "WebGL", "React", "PostgreSQL", "Redis"],
    codeReviewStyle: "collaborative reviews with design considerations",
    deploymentPhilosophy: "continuous deployment with careful testing",
    documentationExpectations: "documentation for complex systems and APIs",
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
