/**
 * FAANG+ Company Interview Data
 * Based on aggregated data from LeetCode, Glassdoor, Blind, and interview reports
 */

import { CompanyQuestionData } from "./types"

export const googleData: CompanyQuestionData = {
  id: "google",
  name: "Google",
  logo: "/company-logos/google.svg",
  careers_url: "https://careers.google.com",

  difficultyDistribution: {
    easy: 10,
    medium: 60,
    hard: 30,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 95, priority: 10, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dfs", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 70, priority: 8, typicalDifficulty: "hard" },
    { pattern: "sliding-window", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 55, priority: 7, typicalDifficulty: "medium" },
    { pattern: "backtracking", frequency: 50, priority: 6, typicalDifficulty: "hard" },
  ],

  mustKnowQuestions: [
    { scenarioId: "two-sum", title: "Two Sum", frequency: "very_common", lastReported: "2024 Q4" },
    {
      scenarioId: "lru-cache",
      title: "LRU Cache",
      frequency: "very_common",
      lastReported: "2024 Q4",
    },
    { scenarioId: "number-of-islands", title: "Number of Islands", frequency: "very_common" },
    { scenarioId: "merge-intervals", title: "Merge Intervals", frequency: "common" },
    { scenarioId: "word-search", title: "Word Search", frequency: "common" },
    {
      scenarioId: "serialize-deserialize-tree",
      title: "Serialize and Deserialize Binary Tree",
      frequency: "common",
    },
    {
      scenarioId: "median-data-stream",
      title: "Find Median from Data Stream",
      frequency: "common",
    },
    { scenarioId: "word-ladder", title: "Word Ladder", frequency: "occasional" },
    // Trees & BST
    { scenarioId: "dsa-validate-bst", title: "Validate Binary Search Tree", frequency: "common", lastReported: "2025 Q1" },
    { scenarioId: "dsa-all-nodes-distance-k", title: "All Nodes Distance K in Binary Tree", frequency: "common", lastReported: "2025 Q1" },
    { scenarioId: "dsa-binary-tree-zigzag", title: "Binary Tree Zigzag Level Order Traversal", frequency: "common" },
    // Stack
    { scenarioId: "dsa-trapping-rain-water", title: "Trapping Rain Water", frequency: "very_common", lastReported: "2025 Q1" },
    // BFS/DFS
    { scenarioId: "dsa-open-the-lock", title: "Open the Lock", frequency: "occasional" },
    { scenarioId: "dsa-evaluate-division", title: "Evaluate Division", frequency: "common" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Technical phone screen with Googler",
        focusAreas: ["coding", "problem-solving"],
      },
      {
        type: "coding",
        duration: 45,
        description: "Onsite coding round 1",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "coding",
        duration: 45,
        description: "Onsite coding round 2",
        focusAreas: ["algorithms", "optimization"],
      },
      {
        type: "system_design",
        duration: 45,
        description: "System design (L4+)",
        focusAreas: ["scalability", "trade-offs"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Googleyness & Leadership",
        focusAreas: ["culture-fit", "leadership"],
      },
    ],
    timeline: "4-8 weeks",
    tips: [
      "Google values clean, readable code over clever one-liners",
      "Always discuss time/space complexity before coding",
      "Think out loud - communication is heavily weighted",
      "They often ask follow-up questions to optimize your solution",
      "Practice on Google Docs - no syntax highlighting!",
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
      "Interviewers often give hints if you're stuck",
      "Follow-up questions to optimize are common",
      "May ask you to code in Google Docs",
      "Strong emphasis on explaining your thought process",
    ],
  },

  compensation: {
    entryLevel: "$150k - $180k TC",
    midLevel: "$200k - $350k TC",
    seniorLevel: "$350k - $500k+ TC",
  },

  coreValues: {
    principles: [
      "Focus on the user and all else will follow",
      "Democracy on the web works",
      "You can make money without doing evil",
      "Great just isn't good enough - 10x thinking",
      "You can be serious without a suit",
      "Fast is better than slow",
    ],
    behavioralExpectations: [
      "Demonstrate Googliness: humble, collaborative, intellectually curious",
      "Show you can navigate ambiguity and make data-driven decisions",
      "Exhibit leadership without authority - influence through expertise",
      "Display comfort with technical depth and breadth",
      "Show passion for technology and solving complex problems",
    ],
    valueKeywords: [
      "googliness",
      "user-focused",
      "10x",
      "data-driven",
      "collaborative",
      "intellectually humble",
      "innovative",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Design docs are required for significant changes",
      "Code reviews are thorough and educational",
      "Testing is a first-class citizen - high coverage expected",
      "Prefer simple solutions over clever ones",
      "Readability and maintainability over brevity",
    ],
    techStack: [
      "C++",
      "Java",
      "Python",
      "Go",
      "JavaScript/TypeScript",
      "Borg/Kubernetes",
      "Spanner",
      "BigTable",
    ],
    codeReviewStyle: "thorough async reviews with readability focus",
    deploymentPhilosophy: "continuous deployment with canary releases",
    documentationExpectations: "design docs required for significant changes",
  },
}

export const metaData: CompanyQuestionData = {
  id: "meta",
  name: "Meta",
  logo: "/company-logos/meta.svg",
  careers_url: "https://metacareers.com",

  difficultyDistribution: {
    easy: 15,
    medium: 65,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 95, priority: 10, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "sliding-window", frequency: 70, priority: 7, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 80, priority: 8, typicalDifficulty: "medium" }, // Meta emphasizes Array and String problems per 2025 data
    { pattern: "linked-list", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "stack", frequency: 50, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "valid-palindrome",
      title: "Valid Palindrome II",
      frequency: "very_common",
      lastReported: "2024 Q4",
    },
    { scenarioId: "random-pick-with-weight", title: "Random Pick with Weight", frequency: "very_common" },
    {
      scenarioId: "buildings-ocean-view",
      title: "Buildings With an Ocean View",
      frequency: "very_common",
    },
    {
      scenarioId: "minimum-remove-parens",
      title: "Minimum Remove to Make Valid Parentheses",
      frequency: "common",
    },
    { scenarioId: "nested-list-weight-sum", title: "Nested List Weight Sum", frequency: "common" },
    {
      scenarioId: "binary-tree-vertical",
      title: "Binary Tree Vertical Order Traversal",
      frequency: "common",
    },
    { scenarioId: "k-closest-points", title: "K Closest Points to Origin", frequency: "common" },
    {
      scenarioId: "dot-product-sparse",
      title: "Dot Product of Two Sparse Vectors",
      frequency: "common",
    },
    // Trees - Meta asks a lot of tree traversal variants
    { scenarioId: "dsa-vertical-order-traversal", title: "Vertical Order Traversal of a Binary Tree", frequency: "very_common", lastReported: "2025 Q1" },
    { scenarioId: "dsa-binary-tree-zigzag", title: "Binary Tree Zigzag Level Order Traversal", frequency: "common" },
    { scenarioId: "dsa-validate-bst", title: "Validate Binary Search Tree", frequency: "common" },
    // BFS - Multi-source BFS is common at Meta
    { scenarioId: "dsa-walls-and-gates", title: "Walls and Gates", frequency: "common", lastReported: "2025 Q1" },
    { scenarioId: "dsa-shortest-path-binary-matrix", title: "Shortest Path in Binary Matrix", frequency: "common" },
    // High-frequency questions confirmed by 2025 market research
    { scenarioId: "dsa-lowest-common-ancestor", title: "Lowest Common Ancestor of a Binary Tree", frequency: "very_common", lastReported: "2025 Q1" },
    { scenarioId: "dsa-move-zeroes", title: "Move Zeroes", frequency: "common", lastReported: "2025 Q1" },
    { scenarioId: "dsa-range-sum-bst", title: "Range Sum of BST", frequency: "common", lastReported: "2025 Q1" },
    { scenarioId: "dsa-add-binary", title: "Add Binary", frequency: "common", lastReported: "2025 Q1" },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Initial technical screen",
        focusAreas: ["coding", "problem-solving"],
      },
      {
        type: "coding",
        duration: 45,
        description: "Coding round 1 (2 problems)",
        focusAreas: ["algorithms", "speed"],
      },
      {
        type: "coding",
        duration: 45,
        description: "Coding round 2 (2 problems)",
        focusAreas: ["algorithms", "optimization"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Behavioral round",
        focusAreas: ["culture-fit", "past-projects"],
      },
    ],
    timeline: "3-5 weeks",
    tips: [
      "Meta expects 2 problems per 45-min round - practice speed!",
      "They use CoderPad with syntax highlighting",
      "Focus on getting a working solution first, then optimize",
      "Be ready to trace through examples by hand",
      "They value practical problem-solving over theoretical knowledge",
    ],
  },

  interviewStyle: {
    pace: "fast",
    communicationEmphasis: 7,
    codeQualityEmphasis: 7,
    optimalSolutionRequired: false,
    allowsPseudocode: false,
    providesHints: true,
    uniqueTraits: [
      "Expect to solve 2 problems per round",
      "Speed matters - practice timed coding",
      "They use CoderPad (real IDE)",
      "Interviewers are often friendly and give hints",
    ],
  },

  compensation: {
    entryLevel: "$140k - $170k TC",
    midLevel: "$200k - $350k TC",
    seniorLevel: "$350k - $550k+ TC",
  },

  coreValues: {
    principles: [
      "Move Fast - velocity matters, ship and iterate",
      "Be Bold - take risks and don't fear failure",
      "Focus on Impact - prioritize work that matters",
      "Be Open - share information, give/receive feedback openly",
      "Build Social Value - create meaningful connections",
    ],
    behavioralExpectations: [
      "Demonstrate bias for action and shipping quickly",
      "Show you can work at scale and with large impact",
      "Exhibit openness to feedback and direct communication",
      "Display comfort with rapid change and ambiguity",
      "Show you can build and maintain relationships across teams",
    ],
    valueKeywords: ["move fast", "impact", "bold", "open", "social", "scale", "ship", "iterate"],
  },

  engineeringCulture: {
    philosophy: [
      "Ship early and iterate - don't over-engineer",
      "Code wins arguments - build prototypes to prove ideas",
      "Bootcamp for new engineers - learn the codebase hands-on",
      "Internal tools are first-class products",
      "Embrace the monorepo - one codebase for web",
    ],
    techStack: [
      "React",
      "React Native",
      "Hack/PHP",
      "Python",
      "C++",
      "PyTorch",
      "GraphQL",
      "Mercurial",
    ],
    codeReviewStyle: "fast async reviews with focus on shipping",
    deploymentPhilosophy: "continuous deployment multiple times per day",
    documentationExpectations: "lightweight - code is documentation",
  },
}

export const amazonData: CompanyQuestionData = {
  id: "amazon",
  name: "Amazon",
  logo: "/company-logos/amazon.svg",
  careers_url: "https://amazon.jobs",

  difficultyDistribution: {
    easy: 20,
    medium: 60,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "sliding-window", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "stack", frequency: 50, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    { scenarioId: "two-sum", title: "Two Sum", frequency: "very_common", lastReported: "2024 Q4" },
    { scenarioId: "lru-cache", title: "LRU Cache", frequency: "very_common" },
    { scenarioId: "number-of-islands", title: "Number of Islands", frequency: "very_common" },
    { scenarioId: "merge-k-sorted-lists", title: "Merge K Sorted Lists", frequency: "common" },
    { scenarioId: "top-k-frequent-words", title: "Top K Frequent Words", frequency: "common" },
    { scenarioId: "reorder-data-logs", title: "Reorder Data in Log Files", frequency: "common" },
    {
      scenarioId: "critical-connections",
      title: "Critical Connections in a Network",
      frequency: "occasional",
    },
    { scenarioId: "word-search-ii", title: "Word Search II", frequency: "occasional" },
    // Trees & BST - Amazon loves BST problems
    { scenarioId: "dsa-validate-bst", title: "Validate Binary Search Tree", frequency: "common", lastReported: "2025 Q1" },
    { scenarioId: "dsa-kth-smallest-bst", title: "Kth Smallest Element in a BST", frequency: "common" },
    { scenarioId: "dsa-bst-iterator", title: "Binary Search Tree Iterator", frequency: "occasional" },
    // Stack - Monotonic stack patterns
    { scenarioId: "dsa-trapping-rain-water", title: "Trapping Rain Water", frequency: "common" },
    { scenarioId: "dsa-next-greater-element-i", title: "Next Greater Element I", frequency: "occasional" },
    // Graphs
    { scenarioId: "dsa-keys-and-rooms", title: "Keys and Rooms", frequency: "occasional" },
    { scenarioId: "dsa-find-town-judge", title: "Find the Town Judge", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "OA + Phone screen",
        focusAreas: ["coding", "LP"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Loop 1: Coding + LP",
        focusAreas: ["algorithms", "leadership-principles"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Loop 2: Coding + LP",
        focusAreas: ["algorithms", "leadership-principles"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "Loop 3: System Design + LP",
        focusAreas: ["graphs", "leadership-principles"],
      },
      {
        type: "behavioral",
        duration: 60,
        description: "Bar Raiser",
        focusAreas: ["leadership-principles", "culture-fit"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "MEMORIZE the 16 Leadership Principles - every round includes LP questions!",
      "Use STAR format for behavioral questions",
      "Amazon OA is common - practice on HackerRank",
      "Bar Raiser round is critical - they can veto your hire",
      "Be ready with specific examples from your experience",
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
      "Every round includes Leadership Principles questions",
      "Bar Raiser has veto power",
      "Online Assessment (OA) is usually first",
      "Strong focus on behavioral/LP stories",
    ],
  },

  compensation: {
    entryLevel: "$130k - $160k TC",
    midLevel: "$180k - $300k TC",
    seniorLevel: "$300k - $500k+ TC",
  },

  coreValues: {
    principles: [
      "Customer Obsession - start with the customer and work backwards",
      "Ownership - think long term, act on behalf of the entire company",
      "Invent and Simplify - expect and require innovation",
      "Are Right, A Lot - have strong judgment and good instincts",
      "Learn and Be Curious - never stop learning",
      "Hire and Develop the Best - raise the performance bar",
      "Insist on the Highest Standards - continually raise the bar",
      "Think Big - create and communicate a bold direction",
      "Bias for Action - speed matters in business",
      "Frugality - accomplish more with less",
      "Earn Trust - listen attentively, speak candidly",
      "Dive Deep - stay connected to details, audit frequently",
      "Have Backbone; Disagree and Commit - respectfully challenge decisions",
      "Deliver Results - focus on key inputs and deliver with quality",
      "Strive to be Earth's Best Employer - lead with empathy",
      "Success and Scale Bring Broad Responsibility - create more than you consume",
    ],
    behavioralExpectations: [
      "Use STAR format (Situation, Task, Action, Result) for all behavioral answers",
      "Have 2-3 strong stories that demonstrate multiple LPs each",
      "Quantify results whenever possible - data matters at Amazon",
      "Show ownership mentality - you are not a victim of circumstances",
      "Demonstrate customer obsession in every story you tell",
    ],
    valueKeywords: [
      "customer obsession",
      "ownership",
      "bias for action",
      "dive deep",
      "earn trust",
      "deliver results",
      "frugality",
      "think big",
      "STAR",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Working backwards from the customer - write the PR/FAQ first",
      "Two-pizza teams - small, autonomous teams",
      "You build it, you run it - DevOps culture",
      "Single-threaded leadership - one owner per initiative",
      "Write your ideas in narrative form, not slides",
    ],
    techStack: ["Java", "Python", "AWS services", "DynamoDB", "S3", "Lambda", "EC2", "TypeScript"],
    codeReviewStyle: "code reviews required, focus on correctness and operational excellence",
    deploymentPhilosophy: "continuous deployment with Apollo/Pipelines",
    documentationExpectations: "6-page memos and PR/FAQs required for major decisions",
  },
}

export const appleData: CompanyQuestionData = {
  id: "apple",
  name: "Apple",
  logo: "/company-logos/apple.svg",
  careers_url: "https://apple.com/careers",

  difficultyDistribution: {
    easy: 25,
    medium: 55,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "linked-list", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "stack", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "sorting", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 50, priority: 6, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 45, priority: 5, typicalDifficulty: "hard" },
  ],

  mustKnowQuestions: [
    { scenarioId: "reverse-linked-list", title: "Reverse Linked List", frequency: "very_common" },
    { scenarioId: "valid-parentheses", title: "Valid Parentheses", frequency: "very_common" },
    { scenarioId: "merge-sorted-array", title: "Merge Sorted Array", frequency: "common" },
    { scenarioId: "lca-binary-tree", title: "Lowest Common Ancestor", frequency: "common" },
    { scenarioId: "string-to-integer", title: "String to Integer (atoi)", frequency: "common" },
    {
      scenarioId: "design-phone-directory",
      title: "Design Phone Directory",
      frequency: "occasional",
    },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Technical recruiter call",
        focusAreas: ["background", "motivation"],
      },
      {
        type: "phone_screen",
        duration: 60,
        description: "Technical phone screen",
        focusAreas: ["coding", "domain-knowledge"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Onsite coding round",
        focusAreas: ["algorithms", "code-quality"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "Domain-specific design",
        focusAreas: ["design", "domain-expertise"],
      },
      {
        type: "behavioral",
        duration: 60,
        description: "Hiring manager round",
        focusAreas: ["culture-fit", "team-fit"],
      },
    ],
    timeline: "4-8 weeks",
    tips: [
      "Apple is very secretive - don't expect to know the team until late",
      "Domain expertise matters more than at other companies",
      "Code quality and attention to detail is paramount",
      "Be prepared for questions about Apple products you use",
      "Process is slower than other FAANG companies",
    ],
  },

  interviewStyle: {
    pace: "relaxed",
    communicationEmphasis: 7,
    codeQualityEmphasis: 9,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      "Very secretive about team/project until offer",
      "Domain expertise is highly valued",
      "Code quality > speed",
      "May ask about Apple products you use",
    ],
  },

  compensation: {
    entryLevel: "$140k - $170k TC",
    midLevel: "$200k - $350k TC",
    seniorLevel: "$350k - $500k+ TC",
  },

  coreValues: {
    principles: [
      "Privacy is a fundamental human right",
      "Design is how it works, not just how it looks",
      "Focus and simplicity - say no to 1000 things",
      "Make the best products, not the most products",
      "Control the primary technologies in our products",
      "Environment - committed to carbon neutrality",
    ],
    behavioralExpectations: [
      "Show obsessive attention to detail and craftsmanship",
      "Demonstrate passion for Apple products and ecosystem",
      "Exhibit ability to maintain confidentiality and discretion",
      "Display deep expertise in your domain area",
      "Show you can collaborate across hardware and software",
    ],
    valueKeywords: [
      "privacy",
      "design",
      "attention to detail",
      "craftsmanship",
      "integration",
      "simplicity",
      "secrecy",
      "excellence",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Attention to detail is paramount - every pixel matters",
      "Hardware and software should be designed together",
      "Fewer products, more focus - do fewer things better",
      "Secrecy is part of the culture - compartmentalized teams",
      "User experience drives technical decisions",
    ],
    techStack: ["Swift", "Objective-C", "C++", "Python", "Metal", "Core ML", "SwiftUI", "UIKit"],
    codeReviewStyle: "thorough reviews with emphasis on code quality and design",
    deploymentPhilosophy: "scheduled releases tied to OS and product launches",
    documentationExpectations: "internal documentation required, external docs exceptional",
  },
}

export const netflixData: CompanyQuestionData = {
  id: "netflix",
  name: "Netflix",
  logo: "/company-logos/netflix.svg",
  careers_url: "https://jobs.netflix.com",

  difficultyDistribution: {
    easy: 10,
    medium: 50,
    hard: 40,
  },

  topPatterns: [
    { pattern: "graphs", frequency: 90, priority: 10, typicalDifficulty: "hard" },
    { pattern: "arrays-hashing", frequency: 80, priority: 8, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 70, priority: 7, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 70, priority: 7, typicalDifficulty: "hard" },
    { pattern: "dp-1d", frequency: 65, priority: 7, typicalDifficulty: "hard" },
    { pattern: "heap", frequency: 60, priority: 6, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "sliding-window", frequency: 50, priority: 5, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    { scenarioId: "design-netflix", title: "Design Netflix Streaming", frequency: "very_common" },
    { scenarioId: "rate-limiter", title: "Rate Limiter", frequency: "common" },
    { scenarioId: "lru-cache", title: "LRU Cache", frequency: "common" },
    { scenarioId: "topological-sort", title: "Course Schedule", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "Hiring manager screen",
        focusAreas: ["experience", "culture"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical coding round",
        focusAreas: ["algorithms", "code-quality"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design deep-dive",
        focusAreas: ["architecture", "scale"],
      },
      {
        type: "behavioral",
        duration: 60,
        description: "Culture fit - Netflix values",
        focusAreas: ["culture", "judgment"],
      },
      {
        type: "team_match",
        duration: 60,
        description: "Cross-functional interview",
        focusAreas: ["collaboration", "impact"],
      },
    ],
    timeline: "3-6 weeks",
    tips: [
      "Read and internalize the Netflix Culture Deck",
      "System design is weighted heavily - know distributed systems",
      "Netflix hires senior/experienced engineers primarily",
      "Be ready to discuss salary expectations early",
      "Demonstrate independent judgment and ownership",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 8,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: true,
    allowsPseudocode: false,
    providesHints: false,
    uniqueTraits: [
      "Senior-heavy hiring - fewer entry-level positions",
      "System design is critical",
      "Netflix Culture Deck is essential reading",
      "They discuss compensation early in process",
    ],
  },

  compensation: {
    entryLevel: "Rare - primarily hires experienced",
    midLevel: "$300k - $450k TC",
    seniorLevel: "$450k - $700k+ TC",
  },

  coreValues: {
    principles: [
      "Freedom and Responsibility - no vacation tracking, trust employees",
      "Context, not Control - share context, let people decide",
      "Highly Aligned, Loosely Coupled - agree on strategy, execute independently",
      "Pay Top of Market - best-in-class compensation",
      "Keeper Test - would you fight to keep this person?",
      "No Brilliant Jerks - talent is not enough, must be collaborative",
    ],
    behavioralExpectations: [
      "Demonstrate excellent judgment in ambiguous situations",
      "Show you can communicate candidly and give direct feedback",
      "Exhibit selflessness and team-first mentality",
      "Display strong opinions held loosely - disagree then commit",
      "Show high performance and self-motivation without hand-holding",
    ],
    valueKeywords: [
      "freedom",
      "responsibility",
      "context",
      "judgment",
      "candor",
      "high performance",
      "keeper test",
      "no ego",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Chaos Engineering - build systems that handle failure",
      "Full cycle developers - own from design to production",
      "Freedom to choose your tools and approach",
      "Focus on resilience and availability over perfect code",
      "Data-driven decisions with experimentation culture",
    ],
    techStack: ["Java", "Python", "Node.js", "AWS", "Cassandra", "Kafka", "Spring Boot", "React"],
    codeReviewStyle: "peer review focused on operational readiness",
    deploymentPhilosophy: "continuous deployment with canary and A/B testing",
    documentationExpectations: "runbooks and operational docs critical",
  },
}

export const microsoftData: CompanyQuestionData = {
  id: "microsoft",
  name: "Microsoft",
  logo: "/company-logos/microsoft.svg",
  careers_url: "https://careers.microsoft.com",

  difficultyDistribution: {
    easy: 25,
    medium: 55,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "linked-list", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "stack", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 50, priority: 6, typicalDifficulty: "medium" },
    { pattern: "sorting", frequency: 50, priority: 5, typicalDifficulty: "easy" },
  ],

  mustKnowQuestions: [
    { scenarioId: "two-sum", title: "Two Sum", frequency: "very_common" },
    { scenarioId: "reverse-linked-list", title: "Reverse Linked List", frequency: "very_common" },
    { scenarioId: "validate-bst", title: "Validate Binary Search Tree", frequency: "common" },
    {
      scenarioId: "serialize-deserialize-tree",
      title: "Serialize and Deserialize Binary Tree",
      frequency: "common",
    },
    { scenarioId: "meeting-rooms-ii", title: "Meeting Rooms II", frequency: "common" },
    { scenarioId: "spiral-matrix", title: "Spiral Matrix", frequency: "occasional" },
    // Trees - Microsoft loves tree problems
    { scenarioId: "dsa-binary-tree-zigzag", title: "Binary Tree Zigzag Level Order Traversal", frequency: "common" },
    { scenarioId: "dsa-recover-bst", title: "Recover Binary Search Tree", frequency: "occasional" },
    { scenarioId: "dsa-kth-smallest-bst", title: "Kth Smallest Element in a BST", frequency: "common" },
    // Stack
    { scenarioId: "dsa-132-pattern", title: "132 Pattern", frequency: "occasional" },
    // Graphs
    { scenarioId: "dsa-is-graph-bipartite", title: "Is Graph Bipartite?", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Initial technical screen",
        focusAreas: ["coding", "background"],
      },
      {
        type: "coding",
        duration: 45,
        description: "Coding round 1",
        focusAreas: ["algorithms", "problem-solving"],
      },
      {
        type: "coding",
        duration: 45,
        description: "Coding round 2",
        focusAreas: ["algorithms", "design"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: '"As Appropriate" interview',
        focusAreas: ["culture-fit", "growth-mindset"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "Microsoft values Growth Mindset - show you love learning",
      "They appreciate clean, readable code",
      "Be ready to discuss past projects in depth",
      '"As Appropriate" is the hiring manager or senior decision maker',
      "They use a variety of tools including whiteboard and IDE",
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
      "Growth Mindset is core to culture",
      "Generally friendly interview experience",
      '"As Appropriate" round is the final decision maker',
      "Work-life balance is valued",
    ],
  },

  compensation: {
    entryLevel: "$120k - $150k TC",
    midLevel: "$170k - $280k TC",
    seniorLevel: "$280k - $450k+ TC",
  },

  coreValues: {
    principles: [
      "Growth Mindset - learn from everything, everyone can improve",
      "Customer Obsession - understand and anticipate customer needs",
      "Diversity and Inclusion - best ideas come from diverse teams",
      "One Microsoft - work as one company across all products",
      "Making a difference - empower every person on the planet",
      "Integrity and Honesty - build trust through transparency",
    ],
    behavioralExpectations: [
      "Demonstrate growth mindset - show how you learn from failures",
      "Show customer-focused decision making in your examples",
      "Exhibit collaborative behavior across teams and disciplines",
      "Display passion for technology and continuous learning",
      "Show you can give and receive feedback constructively",
    ],
    valueKeywords: [
      "growth mindset",
      "customer obsession",
      "diversity",
      "inclusion",
      "one microsoft",
      "learn it all",
      "empower",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Growth Mindset in engineering - learn from failures, iterate",
      "Customer-driven development - build what customers need",
      "Hackathon culture - innovation from anyone",
      "Inner source - share code and collaborate across teams",
      "Accessibility is a requirement, not an afterthought",
    ],
    techStack: ["C#", ".NET", "TypeScript", "Azure", "Visual Studio", "VS Code", "Python", "React"],
    codeReviewStyle: "thorough reviews with mentorship culture",
    deploymentPhilosophy: "staged rollouts with Azure DevOps pipelines",
    documentationExpectations: "comprehensive internal and external documentation",
  },
}

export const faangCompanies: CompanyQuestionData[] = [
  googleData,
  metaData,
  amazonData,
  appleData,
  netflixData,
  microsoftData,
]
