/**
 * Enterprise & Developer Tools Company Interview Data
 * Enterprise software, developer tools, and hardware companies
 * Based on aggregated data from LeetCode, Glassdoor, Blind, and interview reports (2024-2025)
 */

import { CompanyQuestionData } from "./types"

export const nvidiaData: CompanyQuestionData = {
  id: "nvidia",
  name: "NVIDIA",
  logo: "/company-logos/nvidia.svg",
  careers_url: "https://nvidia.com/careers",

  difficultyDistribution: {
    easy: 25,
    medium: 55,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 85, priority: 10, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "sorting", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "bit-manipulation", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 50, priority: 6, typicalDifficulty: "hard" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "dsa-two-sum",
      title: "Two Sum",
      frequency: "very_common",
      lastReported: "2025 Q1",
    },
    {
      scenarioId: "dsa-sort-colors",
      title: "Sort Colors (Dutch Flag)",
      frequency: "very_common",
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "dsa-maximum-depth-binary-tree",
      title: "Maximum Depth of Binary Tree",
      frequency: "common",
    },
    {
      scenarioId: "dsa-subtree-of-another-tree",
      title: "Subtree of Another Tree",
      frequency: "common",
    },
    {
      scenarioId: "dsa-number-of-islands",
      title: "Number of Islands (Grid)",
      frequency: "common",
    },
    {
      scenarioId: "dsa-subarray-sum-equals-k",
      title: "Subarray Sum Equals K",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 3,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "OA: 25 MCQs + 1 coding (CS fundamentals)",
        focusAreas: ["OS", "DBMS", "COA", "coding"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical round with LeetCode medium",
        focusAreas: ["algorithms", "C++", "systems"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Hiring manager + technical discussion",
        focusAreas: ["projects", "GPU-knowledge", "culture"],
      },
    ],
    timeline: "1-3 weeks",
    tips: [
      "OA has 25 MCQs on CS fundamentals (COA, DBMS, OS)",
      "C/C++ is often required for coding portions",
      "GPU architecture and CUDA knowledge is a plus",
      "Understand memory access patterns and cache optimization",
      "Threading and concurrency questions are common",
      "Parallel computing concepts highly valued",
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
      "Heavy emphasis on CS fundamentals (OS, DBMS, COA)",
      "C/C++ language requirement for many roles",
      "GPU architecture and CUDA knowledge valued",
      "Threading and concurrency questions",
      "Hardware-software interface understanding",
    ],
  },

  compensation: {
    entryLevel: "$130k - $170k TC",
    midLevel: "$180k - $300k TC",
    seniorLevel: "$300k - $500k TC",
  },

  coreValues: {
    principles: [
      "Innovation - push the boundaries of computing",
      "Speed - rapid iteration and execution",
      "Quality - highest standards in everything",
      "Customer First - solve real problems",
      "One Team - collaborate across the company",
    ],
    behavioralExpectations: [
      "Show passion for GPU computing and AI",
      "Demonstrate strong CS fundamentals",
      "Exhibit understanding of parallel computing",
      "Display curiosity about hardware-software integration",
      "Show ability to optimize for performance",
    ],
    valueKeywords: [
      "GPU",
      "CUDA",
      "parallel computing",
      "AI",
      "performance",
      "innovation",
      "deep learning",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "GPU and accelerated computing pioneers",
      "Deep learning and AI leadership",
      "Hardware-software co-design",
      "Performance optimization paramount",
      "Innovation-driven culture",
    ],
    techStack: ["C++", "CUDA", "Python", "TensorFlow", "PyTorch", "OpenGL", "Vulkan"],
    codeReviewStyle: "thorough reviews with performance focus",
    deploymentPhilosophy: "rigorous testing for driver and SDK releases",
    documentationExpectations: "comprehensive technical documentation",
  },
}

export const salesforceData: CompanyQuestionData = {
  id: "salesforce",
  name: "Salesforce",
  logo: "/company-logos/salesforce.svg",
  careers_url: "https://salesforce.com/careers",

  difficultyDistribution: {
    easy: 30,
    medium: 55,
    hard: 15,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 55, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "dsa-number-of-islands",
      title: "Number of Islands",
      frequency: "very_common",
      lastReported: "2025 Q1",
    },
    {
      scenarioId: "dsa-longest-common-subsequence",
      title: "Longest Common Subsequence",
      frequency: "common",
    },
    {
      scenarioId: "dsa-snakes-and-ladders",
      title: "Snakes and Ladders (BFS)",
      frequency: "common",
    },
    {
      scenarioId: "dsa-group-anagrams",
      title: "Group Anagrams",
      frequency: "common",
    },
    {
      scenarioId: "dsa-binary-tree-level-order",
      title: "Binary Tree Level Order Traversal",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "HackerRank OA - 2 questions in 1 hour",
        focusAreas: ["algorithms", "problem-solving"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical round - DSA + OOP",
        focusAreas: ["algorithms", "OOP", "design"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical round 2 - System discussion",
        focusAreas: ["design", "past-projects"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Hiring manager + values",
        focusAreas: ["culture", "collaboration"],
      },
    ],
    timeline: "4-6 weeks (avg 46 days)",
    tips: [
      "HackerRank OA with 2 questions in 1 hour",
      "Focus on HashMaps, Trees, and Graphs",
      "OOP concepts are heavily tested",
      "Prepare 1-2 strong project stories",
      "Practice top 10 medium LeetCode problems",
      "Futureforce program for interns/new grads",
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
      "OOP concepts heavily tested",
      "Practical data manipulation over complex DP",
      "Strong focus on collaboration and values",
      "Futureforce program for early career",
      "Enterprise software experience valued",
    ],
  },

  compensation: {
    entryLevel: "$120k - $150k TC",
    midLevel: "$170k - $260k TC",
    seniorLevel: "$260k - $400k TC",
  },

  coreValues: {
    principles: [
      "Trust - our #1 value",
      "Customer Success - their success is our success",
      "Innovation - drive continuous innovation",
      "Equality - equal pay, equal opportunity",
      "Sustainability - protecting the environment",
    ],
    behavioralExpectations: [
      "Demonstrate customer-centric thinking",
      "Show collaborative work style",
      "Exhibit trust and integrity",
      "Display passion for innovation",
      "Show commitment to equality and diversity",
    ],
    valueKeywords: [
      "trust",
      "customer success",
      "CRM",
      "cloud",
      "enterprise",
      "equality",
      "innovation",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Customer success drives everything",
      "Cloud-first architecture",
      "Trailhead learning culture",
      "Ohana (family) culture",
      "Work-life balance valued",
    ],
    techStack: ["Java", "Apex", "JavaScript", "Lightning Web Components", "Heroku", "AWS"],
    codeReviewStyle: "collaborative reviews with mentorship",
    deploymentPhilosophy: "three releases per year for core platform",
    documentationExpectations: "comprehensive documentation for platform",
  },
}

export const atlassianData: CompanyQuestionData = {
  id: "atlassian",
  name: "Atlassian",
  logo: "/company-logos/atlassian.svg",
  careers_url: "https://atlassian.com/careers",

  difficultyDistribution: {
    easy: 30,
    medium: 55,
    hard: 15,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "intervals", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "sorting", frequency: 50, priority: 6, typicalDifficulty: "easy" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "dsa-merge-intervals",
      title: "Merge Intervals (Meeting Scheduling)",
      frequency: "very_common",
      lastReported: "2025 Q1",
    },
    {
      scenarioId: "dsa-lru-cache",
      title: "LRU Cache (Rate Limiter variant)",
      frequency: "very_common",
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "dsa-longest-common-subsequence",
      title: "Longest Common Subsequence",
      frequency: "common",
    },
    {
      scenarioId: "dsa-non-overlapping-intervals",
      title: "Non-overlapping Intervals",
      frequency: "common",
    },
    {
      scenarioId: "dsa-group-anagrams",
      title: "Group Anagrams",
      frequency: "common",
    },
    {
      scenarioId: "dsa-top-k-frequent-elements",
      title: "Top K Frequent Elements",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 3,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "HackerRank OA - 2 questions (easy/medium)",
        focusAreas: ["algorithms", "problem-solving"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical screen (code on your laptop)",
        focusAreas: ["algorithms", "classes", "hashmaps"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Values interview",
        focusAreas: ["values", "culture-fit"],
      },
    ],
    timeline: "3-4 weeks (avg 27 days)",
    tips: [
      "OA is easy-medium difficulty HackerRank",
      "Technical screen: you code locally on YOUR laptop",
      "Practice hashmaps and creating classes",
      "Review Atlassian values before values interview",
      "Clean coding principles are important",
      "Review Atlassian-tagged LeetCode questions",
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
      "Code on your own laptop locally",
      "Values interview is important",
      "Focus on practical coding skills",
      "Clean code principles valued",
      "Collaborative tools company mindset",
    ],
  },

  compensation: {
    entryLevel: "$120k - $150k TC",
    midLevel: "$170k - $260k TC",
    seniorLevel: "$260k - $400k TC",
  },

  coreValues: {
    principles: [
      "Open Company, No Bullshit - transparency matters",
      "Build with Heart and Balance - care about users",
      "Don't F*** the Customer - put customers first",
      "Play as a Team - collaboration over competition",
      "Be the Change You Seek - drive improvement",
    ],
    behavioralExpectations: [
      "Show transparency and honesty",
      "Demonstrate customer-first thinking",
      "Exhibit team collaboration",
      "Display passion for improving tools",
      "Show work-life balance awareness",
    ],
    valueKeywords: ["teamwork", "collaboration", "Jira", "Confluence", "transparency", "customer"],
  },

  engineeringCulture: {
    philosophy: [
      "Team collaboration tools focus",
      "Agile and software development tools",
      "Cloud-first transformation",
      "Developer experience emphasis",
      "Distributed team collaboration",
    ],
    techStack: ["Java", "TypeScript", "React", "Node.js", "AWS", "PostgreSQL", "Kubernetes"],
    codeReviewStyle: "collaborative reviews with quality focus",
    deploymentPhilosophy: "continuous deployment with cloud-first approach",
    documentationExpectations: "comprehensive docs for platform tools",
  },
}

export const oracleData: CompanyQuestionData = {
  id: "oracle",
  name: "Oracle",
  logo: "/company-logos/oracle.svg",
  careers_url: "https://oracle.com/careers",

  difficultyDistribution: {
    easy: 35,
    medium: 50,
    hard: 15,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 85, priority: 10, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "linked-list", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "sorting", frequency: 50, priority: 6, typicalDifficulty: "easy" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "dsa-first-missing-positive",
      title: "First Missing Positive",
      frequency: "very_common",
    },
    {
      scenarioId: "dsa-linked-list-cycle",
      title: "Linked List Cycle Detection",
      frequency: "very_common",
    },
    {
      scenarioId: "dsa-find-all-duplicates",
      title: "Find All Duplicates in Array",
      frequency: "common",
    },
    {
      scenarioId: "dsa-add-two-numbers",
      title: "Add Two Numbers (Linked List)",
      frequency: "common",
    },
    {
      scenarioId: "dsa-coin-change",
      title: "Coin Change (DP)",
      frequency: "common",
    },
    {
      scenarioId: "dsa-reverse-linked-list",
      title: "Reverse Linked List",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 3,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "Technical screen - previous experience + theory",
        focusAreas: ["background", "fundamentals"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical coding - DSA + fundamentals",
        focusAreas: ["algorithms", "Java", "OOP"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical round 2 with LeetCode problem",
        focusAreas: ["algorithms", "problem-solving"],
      },
    ],
    timeline: "3-4 weeks (avg 27 days)",
    tips: [
      "Java knowledge is essential for most roles",
      "OOP concepts heavily tested (SOLID, design patterns)",
      "SQL questions are common (Nth highest salary)",
      "Understand Exception hierarchy in Java",
      "CS fundamentals: OS, DBMS important",
      "Dijkstra's and graph algorithms may appear",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 7,
    codeQualityEmphasis: 7,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      "Java and OOP heavily emphasized",
      "SQL and database knowledge important",
      "CS fundamentals (OS, DBMS) tested",
      "Exception handling and threading",
      "Enterprise software focus",
    ],
  },

  compensation: {
    entryLevel: "$100k - $130k TC",
    midLevel: "$150k - $220k TC",
    seniorLevel: "$220k - $350k TC",
  },

  coreValues: {
    principles: [
      "Customer Success - deliver value to customers",
      "Innovation - drive technological advancement",
      "Integrity - ethical business practices",
      "Quality - high standards in everything",
      "Teamwork - collaborate across the company",
    ],
    behavioralExpectations: [
      "Show strong Java and OOP knowledge",
      "Demonstrate database expertise",
      "Exhibit understanding of enterprise systems",
      "Display problem-solving skills",
      "Show collaborative teamwork",
    ],
    valueKeywords: ["database", "Java", "enterprise", "cloud", "SQL", "OOP"],
  },

  engineeringCulture: {
    philosophy: [
      "Database and enterprise software leader",
      "Cloud infrastructure (OCI) growth",
      "Java and JVM expertise",
      "Enterprise-grade reliability",
      "Global scale systems",
    ],
    techStack: ["Java", "PL/SQL", "JavaScript", "Python", "OCI", "MySQL", "Kubernetes"],
    codeReviewStyle: "formal reviews with enterprise standards",
    deploymentPhilosophy: "staged releases with thorough testing",
    documentationExpectations: "comprehensive enterprise documentation",
  },
}

/**
 * Combined enterprise & developer tools companies
 */
export const enterpriseDevtoolsCompanies: CompanyQuestionData[] = [
  nvidiaData,
  salesforceData,
  atlassianData,
  oracleData,
]
