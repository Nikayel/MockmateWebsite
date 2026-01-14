/**
 * Gaming & Entertainment Company Interview Data
 * Popular companies in gaming, streaming, and entertainment
 * Based on aggregated data from LeetCode, Glassdoor, Blind, and interview reports (2024-2025)
 */

import { CompanyQuestionData } from "./types"

export const robloxData: CompanyQuestionData = {
  id: "roblox",
  name: "Roblox",
  logo: "/company-logos/roblox.svg",
  careers_url: "https://careers.roblox.com",

  difficultyDistribution: {
    easy: 20,
    medium: 60,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "greedy", frequency: 80, priority: 9, typicalDifficulty: "easy" },
    { pattern: "dp-1d", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "sorting", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "backtracking", frequency: 50, priority: 6, typicalDifficulty: "medium" },
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
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "dsa-maximum-units-on-truck",
      title: "Maximum Units on a Truck (Greedy)",
      frequency: "very_common",
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "dsa-roman-to-integer",
      title: "Roman to Integer (String Parsing)",
      frequency: "common",
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "dsa-maximum-subarray",
      title: "Maximum Subarray (Kadane's)",
      frequency: "common",
      variants: ["Maximum Units/Sum variations"],
    },
    {
      scenarioId: "dsa-merge-intervals",
      title: "Merge Intervals",
      frequency: "common",
      variants: ["Player Skill Pairing", "Event Queue Merging"],
    },
    {
      scenarioId: "dsa-generate-parentheses",
      title: "Generate Parentheses (Recursion)",
      frequency: "common",
    },
    {
      scenarioId: "dsa-number-of-islands",
      title: "Number of Islands (Game Grid)",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 30,
        description: "Recruiter call + CodeSignal assessment",
        focusAreas: ["background", "coding"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical coding (LeetCode medium, recursion focus)",
        focusAreas: ["algorithms", "data-structures", "clean-code"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Practical coding (game simulation problems)",
        focusAreas: ["implementation", "state-management"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Culture fit + technical discussion",
        focusAreas: ["culture", "past-projects"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "Problems are often placed in 3D simulation/multiplayer game context",
      "Clean code is heavily valued - test cases, compilation, documentation",
      "Practice recursion and state management problems",
      "C++, Luau, or systems-level language experience preferred",
      "Understand event queues and state updates for game simulation",
      "Player matching and skill-based pairing are common themes",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 8,
    codeQualityEmphasis: 9,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      "Game simulation context for problems",
      "Clean, readable code over clever solutions",
      "Object pooling and state management themes",
      "Must compile and run test cases",
      "Strong emphasis on code quality",
    ],
  },

  compensation: {
    entryLevel: "$130k - $160k TC",
    midLevel: "$180k - $280k TC",
    seniorLevel: "$280k - $420k TC",
  },

  coreValues: {
    principles: [
      "Respect the Community - players and developers are core",
      "Take the Long View - sustainable growth over quick wins",
      "Get Stuff Done - ship quality products",
      "Self-Organize - autonomous teams",
      "Be Direct - honest communication",
    ],
    behavioralExpectations: [
      "Show passion for games and virtual worlds",
      "Demonstrate understanding of UGC platforms",
      "Exhibit clean coding practices",
      "Display collaborative team mindset",
      "Show interest in metaverse and social gaming",
    ],
    valueKeywords: [
      "gaming",
      "metaverse",
      "UGC",
      "community",
      "clean code",
      "simulation",
      "multiplayer",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Game engine and 3D simulation expertise",
      "User-generated content platform focus",
      "Clean, maintainable code paramount",
      "Real-time multiplayer systems",
      "Safety and moderation systems",
    ],
    techStack: ["C++", "Luau", "TypeScript", "Go", "React", "PostgreSQL", "Redis"],
    codeReviewStyle: "thorough reviews with focus on code quality and maintainability",
    deploymentPhilosophy: "continuous deployment with feature flags",
    documentationExpectations: "comprehensive documentation for APIs and systems",
  },
}

export const spotifyData: CompanyQuestionData = {
  id: "spotify",
  name: "Spotify",
  logo: "/company-logos/spotify.svg",
  careers_url: "https://spotify.com/careers",

  difficultyDistribution: {
    easy: 15,
    medium: 55,
    hard: 30,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 85, priority: 9, typicalDifficulty: "hard" },
    { pattern: "trees", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 75, priority: 8, typicalDifficulty: "hard" },
    { pattern: "sliding-window", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 65, priority: 7, typicalDifficulty: "hard" },
    { pattern: "binary-search", frequency: 60, priority: 7, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "dsa-find-median-data-stream",
      title: "Find Median from Data Stream (LC295)",
      frequency: "very_common",
      lastReported: "2025 Q1",
    },
    {
      scenarioId: "dsa-sliding-window-maximum",
      title: "Sliding Window Maximum",
      frequency: "common",
    },
    {
      scenarioId: "dsa-valid-anagram",
      title: "Valid Anagram (isAnagram)",
      frequency: "common",
    },
    {
      scenarioId: "dsa-valid-palindrome",
      title: "Valid Palindrome",
      frequency: "common",
    },
    {
      scenarioId: "dsa-two-sum",
      title: "Two Sum (sumTo100 variant)",
      frequency: "common",
    },
    {
      scenarioId: "dsa-kth-largest-element",
      title: "Kth Largest Element",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "OA - LeetCode easy/medium + logic puzzle",
        focusAreas: ["algorithms", "logic"],
      },
      {
        type: "coding",
        duration: 75,
        description: "Technical screen - coding + project discussion",
        focusAreas: ["algorithms", "past-projects"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Coding round (graphs/trees)",
        focusAreas: ["graphs", "trees"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design (music recommendation)",
        focusAreas: ["architecture", "recommendation"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Culture fit + case study",
        focusAreas: ["values", "case-study"],
      },
    ],
    timeline: "2-5 weeks",
    tips: [
      "Main loop coding can be LeetCode Hard (LC295 reported)",
      "System design focuses on music/recommendation systems",
      "Behavioral tests Spotify values (Innovative, Collaborative)",
      "Case study may involve real-time service outage scenarios",
      "STAR method for behavioral questions",
      "Practice streaming data and median problems",
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
      "Coding can reach LeetCode Hard",
      "Music recommendation system design",
      "Case study round is unique",
      "Spotify values heavily weighted",
      "Streaming data problems common",
    ],
  },

  compensation: {
    entryLevel: "$140k - $170k TC",
    midLevel: "$190k - $300k TC",
    seniorLevel: "$300k - $450k TC",
  },

  coreValues: {
    principles: [
      "Innovative - push boundaries",
      "Collaborative - team success",
      "Passionate - love what you do",
      "Playful - have fun",
      "Sincere - be genuine",
    ],
    behavioralExpectations: [
      "Show passion for music and audio",
      "Demonstrate innovative thinking",
      "Exhibit collaborative work style",
      "Display playful and creative approach",
      "Show sincere communication",
    ],
    valueKeywords: ["music", "audio", "streaming", "recommendation", "podcasts", "creative"],
  },

  engineeringCulture: {
    philosophy: [
      "Audio and music streaming leader",
      "Personalization and recommendation",
      "Squad-based autonomous teams",
      "Data-driven product decisions",
      "Global content delivery",
    ],
    techStack: ["Java", "Python", "JavaScript", "React", "GCP", "BigQuery", "Kubernetes"],
    codeReviewStyle: "collaborative reviews with squad ownership",
    deploymentPhilosophy: "continuous deployment with squad autonomy",
    documentationExpectations: "documentation for platform and APIs",
  },
}

export const twitchData: CompanyQuestionData = {
  id: "twitch",
  name: "Twitch",
  logo: "/company-logos/twitch.svg",
  careers_url: "https://twitch.tv/jobs",

  difficultyDistribution: {
    easy: 15,
    medium: 55,
    hard: 30,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "graphs", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 70, priority: 8, typicalDifficulty: "hard" },
    { pattern: "bfs", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "sliding-window", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 55, priority: 6, typicalDifficulty: "medium" },
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
      scenarioId: "dsa-rotting-oranges",
      title: "Rotting Oranges (BFS)",
      frequency: "common",
    },
    {
      scenarioId: "dsa-binary-tree-level-order",
      title: "Binary Tree Level Order Traversal",
      frequency: "common",
    },
    {
      scenarioId: "dsa-coin-change",
      title: "Coin Change (DP)",
      frequency: "common",
    },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 90,
        description: "CodeSignal OA - 2 questions",
        focusAreas: ["algorithms", "coding"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical round 1 - LeetCode medium",
        focusAreas: ["algorithms", "problem-solving"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical round 2",
        focusAreas: ["algorithms", "optimization"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical round 3",
        focusAreas: ["algorithms", "design"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Behavioral (Leadership Principles)",
        focusAreas: ["LP", "culture"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "CodeSignal OA is 90 minutes with 2 questions",
      "3 technical rounds with LeetCode medium problems",
      "Amazon Leadership Principles apply (Amazon subsidiary)",
      "DP questions can be hard difficulty",
      "Show passion for gaming and live streaming",
      "Real-time systems knowledge valued",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 8,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: false,
    allowsPseudocode: false,
    providesHints: true,
    uniqueTraits: [
      "Amazon subsidiary - LP principles apply",
      "Gaming and streaming domain focus",
      "Real-time systems important",
      "CodeSignal for OA",
      "Multiple technical rounds",
    ],
  },

  compensation: {
    entryLevel: "$130k - $160k TC",
    midLevel: "$180k - $280k TC",
    seniorLevel: "$280k - $420k TC",
  },

  coreValues: {
    principles: [
      "Customer Obsession (Amazon LP)",
      "Bias for Action (Amazon LP)",
      "Ownership (Amazon LP)",
      "Empower creators and communities",
      "Build for streamers and viewers",
    ],
    behavioralExpectations: [
      "Show Amazon Leadership Principles",
      "Demonstrate passion for gaming",
      "Exhibit understanding of creator economy",
      "Display real-time systems knowledge",
      "Show community-focused thinking",
    ],
    valueKeywords: ["gaming", "streaming", "live", "creators", "community", "real-time"],
  },

  engineeringCulture: {
    philosophy: [
      "Live streaming platform leader",
      "Gaming and esports community",
      "Real-time video delivery",
      "Creator economy focus",
      "Amazon subsidiary with LP culture",
    ],
    techStack: ["Go", "Java", "TypeScript", "React", "AWS", "Redis", "PostgreSQL"],
    codeReviewStyle: "thorough reviews with operational excellence focus",
    deploymentPhilosophy: "continuous deployment with Amazon standards",
    documentationExpectations: "documentation for APIs and systems",
  },
}

/**
 * Combined gaming & entertainment companies
 */
export const gamingEntertainmentCompanies: CompanyQuestionData[] = [
  robloxData,
  spotifyData,
  twitchData,
]
