/**
 * Social & Consumer Company Interview Data
 * Popular social media and consumer-focused tech companies
 * Based on aggregated data from LeetCode, Glassdoor, Blind, and interview reports (2024-2025)
 */

import { CompanyQuestionData } from "./types"

export const tiktokData: CompanyQuestionData = {
  id: "tiktok",
  name: "TikTok (ByteDance)",
  logo: "/company-logos/tiktok.svg",
  careers_url: "https://careers.tiktok.com",

  difficultyDistribution: {
    easy: 10,
    medium: 50,
    hard: 40,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 95, priority: 10, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 90, priority: 10, typicalDifficulty: "hard" },
    { pattern: "dp-2d", frequency: 85, priority: 9, typicalDifficulty: "hard" },
    { pattern: "graphs", frequency: 80, priority: 9, typicalDifficulty: "hard" },
    { pattern: "binary-search", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 70, priority: 7, typicalDifficulty: "medium" },
    { pattern: "stack", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "sliding-window", frequency: 60, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "dsa-daily-temperatures",
      title: "Daily Temperatures",
      frequency: "very_common",
      lastReported: "2025 Q1",
    },
    {
      scenarioId: "dsa-construct-binary-tree-preorder-inorder",
      title: "Construct Binary Tree from Preorder and Inorder",
      frequency: "very_common",
      lastReported: "2025 Q1",
    },
    {
      scenarioId: "dsa-number-of-islands",
      title: "Number of Islands (BFS/DFS)",
      frequency: "very_common",
      lastReported: "2025 Q1",
    },
    {
      scenarioId: "dsa-longest-increasing-subsequence",
      title: "Longest Increasing Subsequence (DP)",
      frequency: "very_common",
    },
    { scenarioId: "dsa-lru-cache", title: "LRU Cache", frequency: "common" },
    {
      scenarioId: "dsa-coin-change",
      title: "Coin Change (DP)",
      frequency: "common",
    },
    {
      scenarioId: "dsa-rotting-oranges",
      title: "Rotting Oranges (BFS)",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 120,
        description: "HackerRank OA - 6 questions in 2 hours",
        focusAreas: ["algorithms", "speed"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical round 1 - 2 LeetCode problems",
        focusAreas: ["algorithms", "optimization"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical round 2 - System/implementation",
        focusAreas: ["design", "implementation"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Behavioral + culture fit",
        focusAreas: ["culture", "teamwork"],
      },
    ],
    timeline: "3-4 weeks (avg 25 days)",
    tips: [
      "Questions are considered harder than FAANG by many candidates",
      "OA has 6 questions in 2 hours - speed is critical",
      "Expect medium to hard LeetCode problems",
      "Dynamic programming is heavily tested",
      "Focus on understanding patterns, not memorizing solutions",
      "Strong emphasis on time/space complexity optimization",
    ],
  },

  interviewStyle: {
    pace: "fast",
    communicationEmphasis: 7,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: true,
    allowsPseudocode: false,
    providesHints: false,
    uniqueTraits: [
      "One of the hardest interview processes in the industry",
      "6-question OA in 2 hours tests speed",
      "Heavy DP and graph focus",
      "Expect optimal solutions",
      "Global company with fast-paced culture",
    ],
  },

  compensation: {
    entryLevel: "$140k - $180k TC",
    midLevel: "$200k - $350k TC",
    seniorLevel: "$350k - $550k TC",
  },

  coreValues: {
    principles: [
      "Always Day 1 - maintain startup mentality",
      "Be Candid and Clear - direct communication",
      "Seek Truth and Be Pragmatic - data-driven decisions",
      "Be Grounded and Humble - continuous learning",
      "Aim for the Highest - excellence in everything",
    ],
    behavioralExpectations: [
      "Demonstrate ability to work at global scale",
      "Show fast-paced work style and adaptability",
      "Exhibit strong algorithmic problem-solving",
      "Display data-driven decision making",
      "Show passion for content and social media",
    ],
    valueKeywords: [
      "fast-paced",
      "global",
      "algorithms",
      "scale",
      "content",
      "recommendation",
      "machine learning",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Global scale with billions of users",
      "Machine learning and recommendation systems",
      "Fast iteration and experimentation",
      "High performance and low latency",
      "Data-driven product decisions",
    ],
    techStack: ["Python", "Go", "Java", "C++", "React", "TensorFlow", "Kubernetes"],
    codeReviewStyle: "rigorous reviews with emphasis on performance",
    deploymentPhilosophy: "continuous deployment with A/B testing",
    documentationExpectations: "design docs for significant changes",
  },
}

export const snapData: CompanyQuestionData = {
  id: "snap",
  name: "Snap Inc.",
  logo: "/company-logos/snap.svg",
  careers_url: "https://snap.com/careers",

  difficultyDistribution: {
    easy: 15,
    medium: 55,
    hard: 30,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 85, priority: 9, typicalDifficulty: "hard" },
    { pattern: "trees", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "backtracking", frequency: 75, priority: 8, typicalDifficulty: "hard" },
    { pattern: "dp-1d", frequency: 70, priority: 8, typicalDifficulty: "hard" },
    { pattern: "binary-search", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "linked-list", frequency: 55, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "dsa-lru-cache",
      title: "LRU Cache (strict complexity requirements)",
      frequency: "very_common",
      lastReported: "2025 Q1",
    },
    {
      scenarioId: "dsa-k-closest-points-origin",
      title: "K Closest Points to Origin",
      frequency: "very_common",
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "dsa-serialize-deserialize-tree",
      title: "Serialize/Deserialize Binary Tree",
      frequency: "common",
    },
    {
      scenarioId: "dsa-reverse-linked-list",
      title: "Reverse Linked List",
      frequency: "common",
    },
    {
      scenarioId: "dsa-combination-sum",
      title: "Combination Sum (Backtracking)",
      frequency: "common",
    },
    {
      scenarioId: "dsa-number-of-islands",
      title: "Number of Islands (Graph Traversal)",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "Technical screen (15 min behavioral + 45 min coding)",
        focusAreas: ["coding", "values"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Coding loop round 1",
        focusAreas: ["algorithms", "problem-solving"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Coding loop round 2",
        focusAreas: ["algorithms", "optimization"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Coding loop round 3 (Decider round)",
        focusAreas: ["algorithms", "values"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "Snap has 'Deciders' like Amazon's Bar Raisers",
      "Values (Kind, Smart, Creative) evaluated in every round",
      "Questions overlap with Blind 75 list",
      "Show product knowledge and passion for Snapchat",
      "Bar can be unexpectedly high and varies by team",
      "Graph traversal and backtracking are common",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 8,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: true,
    allowsPseudocode: false,
    providesHints: true,
    uniqueTraits: [
      "Deciders have veto power like Amazon Bar Raisers",
      "Values (Kind, Smart, Creative) assessed in all rounds",
      "Product knowledge and passion expected",
      "Bar varies significantly by team",
      "Medium to hard difficulty questions",
    ],
  },

  compensation: {
    entryLevel: "$150k - $180k TC",
    midLevel: "$200k - $320k TC",
    seniorLevel: "$320k - $480k TC",
  },

  coreValues: {
    principles: [
      "Kind - treat everyone with kindness and empathy",
      "Smart - think critically and innovatively",
      "Creative - embrace creativity in everything",
    ],
    behavioralExpectations: [
      "Show kindness and empathy in interactions",
      "Demonstrate smart problem-solving",
      "Display creative thinking",
      "Show passion for Snapchat products",
      "Exhibit collaborative team behavior",
    ],
    valueKeywords: ["kind", "smart", "creative", "camera", "AR", "messaging", "ephemeral"],
  },

  engineeringCulture: {
    philosophy: [
      "Camera company first",
      "AR and lens innovation",
      "Privacy and ephemeral content",
      "Mobile-first engineering",
      "Creative expression focus",
    ],
    techStack: ["C++", "Python", "Swift", "Kotlin", "React", "Machine Learning"],
    codeReviewStyle: "thorough reviews with product awareness",
    deploymentPhilosophy: "continuous deployment for mobile apps",
    documentationExpectations: "documentation for systems and APIs",
  },
}

export const pinterestData: CompanyQuestionData = {
  id: "pinterest",
  name: "Pinterest",
  logo: "/company-logos/pinterest.svg",
  careers_url: "https://pinterest.com/careers",

  difficultyDistribution: {
    easy: 20,
    medium: 55,
    hard: 25,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 85, priority: 9, typicalDifficulty: "hard" },
    { pattern: "trees", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 65, priority: 7, typicalDifficulty: "hard" },
    { pattern: "bfs", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 55, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "dsa-number-of-islands",
      title: "Number of Islands (Graph DFS)",
      frequency: "very_common",
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "dsa-jump-game",
      title: "Jump Game",
      frequency: "common",
      lastReported: "2024 Q3",
    },
    {
      scenarioId: "dsa-jump-game-ii",
      title: "Jump Game II",
      frequency: "common",
      lastReported: "2024 Q3",
    },
    {
      scenarioId: "dsa-group-anagrams",
      title: "Group Anagrams",
      frequency: "common",
    },
    {
      scenarioId: "dsa-product-array-except-self",
      title: "Product of Array Except Self",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Technical phone screen",
        focusAreas: ["coding", "problem-solving"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Coding round - arrays and algorithms",
        focusAreas: ["algorithms", "efficiency"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Coding round 2",
        focusAreas: ["algorithms", "edge-cases"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design (L4/L5+)",
        focusAreas: ["architecture", "scalability"],
      },
    ],
    timeline: "2-3 weeks (avg 21-24 days)",
    tips: [
      "Phone screen may include LeetCode hard problems",
      "Discuss edge cases and time/space complexity",
      "L4/L5 includes 3 coding + 1 system design",
      "Focus on visual discovery and recommendation systems",
      "Show interest in inspiration and visual content",
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
      "Visual discovery platform focus",
      "Image and recommendation systems",
      "Edge case discussion expected",
      "Time/space complexity analysis required",
      "Helpful interviewers reported",
    ],
  },

  compensation: {
    entryLevel: "$140k - $170k TC",
    midLevel: "$190k - $290k TC",
    seniorLevel: "$290k - $450k TC",
  },

  coreValues: {
    principles: [
      "Put Pinners First - users are the priority",
      "Be Authentic - be yourself",
      "Create Belonging - inclusive environment",
      "Act as an Owner - take responsibility",
      "Be Brave - take smart risks",
    ],
    behavioralExpectations: [
      "Show user-centric thinking",
      "Demonstrate creative problem-solving",
      "Exhibit ownership mentality",
      "Display inclusive behavior",
      "Show passion for visual discovery",
    ],
    valueKeywords: [
      "visual discovery",
      "inspiration",
      "pinners",
      "belonging",
      "creativity",
      "inclusive",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Visual discovery and inspiration focus",
      "Machine learning for recommendations",
      "Image understanding and search",
      "User experience paramount",
      "Data-driven decisions",
    ],
    techStack: ["Python", "Java", "JavaScript", "React", "Kubernetes", "TensorFlow"],
    codeReviewStyle: "collaborative reviews with user impact focus",
    deploymentPhilosophy: "continuous deployment with experiments",
    documentationExpectations: "documentation for systems and APIs",
  },
}

export const redditData: CompanyQuestionData = {
  id: "reddit",
  name: "Reddit",
  logo: "/company-logos/reddit.svg",
  careers_url: "https://reddit.com/careers",

  difficultyDistribution: {
    easy: 20,
    medium: 60,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "sliding-window", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 55, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "dsa-lru-cache",
      title: "LRU Cache",
      frequency: "very_common",
    },
    {
      scenarioId: "dsa-number-of-islands",
      title: "Number of Islands",
      frequency: "common",
    },
    {
      scenarioId: "dsa-group-anagrams",
      title: "Group Anagrams",
      frequency: "common",
    },
    {
      scenarioId: "dsa-longest-substring-without-repeating",
      title: "Longest Substring Without Repeating Characters",
      frequency: "common",
    },
    {
      scenarioId: "dsa-top-k-frequent-elements",
      title: "Top K Frequent Elements",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 30,
        description: "Recruiter screen",
        focusAreas: ["background", "motivation"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical phone - coding + problem solving",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design with senior engineers",
        focusAreas: ["architecture", "scalability"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Behavioral - teamwork and communication",
        focusAreas: ["culture", "past-experience"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "Focus on LeetCode medium problems",
      "Present brute-force first, then optimize",
      "Be ready for runtime/space complexity questions",
      "System design tests scalable systems",
      "Show interest in community and social platforms",
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
      "Community-focused platform",
      "Feed ranking and recommendation",
      "Voting and engagement systems",
      "Content moderation challenges",
      "High-traffic distributed systems",
    ],
  },

  compensation: {
    entryLevel: "$130k - $160k TC",
    midLevel: "$180k - $280k TC",
    seniorLevel: "$280k - $420k TC",
  },

  coreValues: {
    principles: [
      "Community First - empower communities",
      "Evolve - continuous improvement",
      "Maintain Perspective - diverse viewpoints",
      "Be Direct - honest communication",
      "Simplify - reduce complexity",
    ],
    behavioralExpectations: [
      "Show passion for online communities",
      "Demonstrate collaborative mindset",
      "Exhibit direct communication style",
      "Display user-focused thinking",
      "Show adaptability and growth",
    ],
    valueKeywords: ["community", "subreddits", "upvote", "engagement", "content", "moderation"],
  },

  engineeringCulture: {
    philosophy: [
      "Community-driven platform",
      "High-traffic distributed systems",
      "Content ranking and discovery",
      "Moderation and safety systems",
      "Real-time engagement",
    ],
    techStack: ["Python", "Go", "JavaScript", "React", "PostgreSQL", "Redis", "Kubernetes"],
    codeReviewStyle: "collaborative reviews with scalability focus",
    deploymentPhilosophy: "continuous deployment with feature flags",
    documentationExpectations: "documentation for APIs and systems",
  },
}

export const ziprecruiterData: CompanyQuestionData = {
  id: "ziprecruiter",
  name: "ZipRecruiter",
  logo: "/company-logos/ziprecruiter.svg",
  careers_url: "https://www.ziprecruiter.com/careers",

  difficultyDistribution: {
    easy: 30,
    medium: 55,
    hard: 15,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "sliding-window", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "stack", frequency: 50, priority: 6, typicalDifficulty: "medium" },
    { pattern: "sorting", frequency: 50, priority: 6, typicalDifficulty: "easy" },
    { pattern: "bfs", frequency: 45, priority: 5, typicalDifficulty: "medium" },
    { pattern: "dfs", frequency: 45, priority: 5, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "dsa-two-sum",
      title: "Two Sum",
      frequency: "very_common",
      lastReported: "2025 Q1",
    },
    {
      scenarioId: "dsa-valid-parentheses",
      title: "Valid Parentheses",
      frequency: "very_common",
      lastReported: "2025 Q1",
    },
    {
      scenarioId: "dsa-merge-sorted-array",
      title: "Merge Sorted Array",
      frequency: "common",
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "dsa-min-stack",
      title: "Min Stack",
      frequency: "common",
      lastReported: "2025 Q1",
      variants: ["Implement Min Stack with O(1) operations"],
    },
    {
      scenarioId: "dsa-even-odd-index-sum-difference",
      title: "Difference Between Sums at Even and Odd Indices",
      frequency: "common",
      lastReported: "2025 Q1",
      variants: ["Filter elements by range constraint"],
    },
    {
      scenarioId: "dsa-student-highest-average",
      title: "Student with Highest Average Score",
      frequency: "common",
      lastReported: "2025 Q1",
      variants: ["Handle tie-breaker alphabetically"],
    },
    {
      scenarioId: "dsa-rotate-array",
      title: "Rotate Array / Cyclic Rotation",
      frequency: "common",
      lastReported: "2024 Q4",
      variants: ["Determine if string is cyclic rotation of another"],
    },
    {
      scenarioId: "dsa-rotate-image",
      title: "Rotate Image (Matrix 90°)",
      frequency: "common",
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "dsa-spiral-matrix",
      title: "Spiral Matrix Traversal",
      frequency: "occasional",
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "dsa-number-of-islands",
      title: "Number of Islands (BFS/DFS)",
      frequency: "occasional",
      lastReported: "2024 Q3",
    },
    {
      scenarioId: "dsa-top-k-frequent-elements",
      title: "Top K Frequent Elements",
      frequency: "occasional",
      variants: ["Max occurring element in 2D array"],
    },
    {
      scenarioId: "dsa-merge-two-sorted-lists",
      title: "Merge Two Sorted Lists",
      frequency: "common",
      lastReported: "2025 Q1",
    },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 30,
        description: "Initial recruiter call - company intro and background discussion",
        focusAreas: ["background", "motivation", "role-fit"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Online Assessment (CodeSignal/HackerRank) - 4 coding problems",
        focusAreas: ["algorithms", "data-structures", "speed"],
      },
      {
        type: "coding",
        duration: 45,
        description: "Technical Phone Screen - live coding with interviewer",
        focusAreas: ["problem-solving", "communication", "code-quality"],
      },
      {
        type: "coding",
        duration: 180,
        description: "Virtual Onsite - 3-4 rounds including coding, system design (senior), and behavioral",
        focusAreas: ["algorithms", "system-design", "ML-design", "behavioral"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "OA has 4 problems: 2 Easy + 2 Medium in 60 minutes - speed matters",
      "Focus on simulation, state management, and complex logic problems",
      "Questions often have business context (job matching, resume processing)",
      "Edge cases and border handling are heavily tested",
      "Practice on CodeSignal and HackerRank platforms",
      "Live coding rounds focus on HOW you solve, not just getting the answer",
      "SQL knowledge is valuable for some roles",
      "React/frontend experience is a plus for full-stack positions",
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
      "LeetCode Easy to Medium difficulty (rarely Hard)",
      "Detail traps and logical complexity over algorithm difficulty",
      "Business context in problems (job marketplace domain)",
      "OA uses CodeSignal or HackerRank",
      "Interviewers are generally helpful and provide hints",
      "Interview difficulty rated 2.9/5 by candidates",
    ],
  },

  compensation: {
    entryLevel: "$100k - $130k TC",
    midLevel: "$140k - $200k TC",
    seniorLevel: "$200k - $300k TC",
  },

  coreValues: {
    principles: [
      "Put Job Seekers First - empower people to find their next great opportunity",
      "AI-Driven Innovation - use technology to simplify the hiring process",
      "Build for Scale - serve millions of job seekers and employers",
      "Move Fast, Stay Agile - iterate quickly on product improvements",
      "Collaboration - work together across teams to solve complex problems",
    ],
    behavioralExpectations: [
      "Show passion for helping people find jobs and grow careers",
      "Demonstrate ability to work with large-scale data and systems",
      "Exhibit strong problem-solving with attention to edge cases",
      "Display collaborative mindset and openness to feedback",
      "Show interest in AI/ML and recommendation systems",
    ],
    valueKeywords: [
      "job marketplace",
      "AI matching",
      "job seekers",
      "employers",
      "scale",
      "recommendation",
      "career",
      "hiring",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "AI-driven smart matching technology at the core",
      "Full-stack development with modern frameworks",
      "Distributed systems serving millions of users",
      "Data-driven product decisions",
      "Mobile-first with #1 rated job search app",
    ],
    techStack: [
      "ReactJS",
      "JavaScript/TypeScript",
      "Python",
      "Java",
      "MySQL",
      "Redis",
      "Kubernetes",
      "AWS",
    ],
    codeReviewStyle: "collaborative reviews with focus on readability and maintainability",
    deploymentPhilosophy: "continuous deployment with feature flags and A/B testing",
    documentationExpectations: "documentation for APIs and major system components",
  },
}

/**
 * Combined social & consumer companies
 */
export const socialConsumerCompanies: CompanyQuestionData[] = [
  tiktokData,
  snapData,
  pinterestData,
  redditData,
  ziprecruiterData,
]
