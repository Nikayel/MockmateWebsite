/**
 * Top Tech Company Interview Data (Tier 2)
 * Based on aggregated data from LeetCode, Glassdoor, Blind, and interview reports
 */

import { CompanyQuestionData } from "./types"

export const stripeData: CompanyQuestionData = {
  id: "stripe",
  name: "Stripe",
  logo: "/company-logos/stripe.svg",
  careers_url: "https://stripe.com/jobs",

  difficultyDistribution: {
    easy: 15,
    medium: 55,
    hard: 30,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "string-matching", frequency: 80, priority: 9, typicalDifficulty: "hard" },
    { pattern: "bfs", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 55, priority: 6, typicalDifficulty: "hard" },
    { pattern: "binary-search", frequency: 50, priority: 6, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 50, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "rate-limiter",
      title: "Rate Limiter",
      frequency: "very_common",
      lastReported: "2024 Q4",
    },
    {
      scenarioId: "design-payment-system",
      title: "Design Payment System",
      frequency: "very_common",
    },
    { scenarioId: "parse-transactions", title: "Parse Transaction Logs", frequency: "common" },
    { scenarioId: "idempotency-key", title: "Idempotency Key Generator", frequency: "common" },
    { scenarioId: "fraud-detection", title: "Fraud Detection", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "Technical phone screen",
        focusAreas: ["coding", "problem-solving"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Practical coding (bug fix/feature)",
        focusAreas: ["debugging", "code-quality"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Algorithms round",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design",
        focusAreas: ["payments", "distributed-systems"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Manager/team fit",
        focusAreas: ["culture", "collaboration"],
      },
    ],
    timeline: "3-5 weeks",
    tips: [
      "Stripe does not run traditional LeetCode-style interviews, so grinding LeetCode alone can be counterproductive",
      "Stripe interviews include practical coding (debugging real code from their codebase)",
      "Focus on debugging skills, code reading, and practical problem-solving",
      "Know payment systems and financial concepts",
      "Code quality and readability are heavily weighted",
      "Be prepared to discuss API design",
      "They value attention to edge cases and error handling",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 8,
    codeQualityEmphasis: 10,
    optimalSolutionRequired: false,
    allowsPseudocode: false,
    providesHints: true,
    uniqueTraits: [
      "Not a typical LeetCode interview: the focus is practical coding",
      "Practical debugging/bug-fix rounds with real Stripe code",
      "Financial domain knowledge is a plus",
      "API design questions are common",
      "Extreme focus on code quality and edge cases",
    ],
  },

  compensation: {
    entryLevel: "$150k - $180k TC",
    midLevel: "$220k - $350k TC",
    seniorLevel: "$350k - $500k+ TC",
  },

  coreValues: {
    principles: [
      "Users first - prioritize the needs of developers and merchants",
      "Move with urgency - ship fast, iterate faster",
      "Think rigorously - be meticulous about details",
      "Trust and amplify - empower teammates",
      "Global optimization - make decisions for the whole company",
      "The Stripe Press - invest in long-term thinking",
    ],
    behavioralExpectations: [
      "Demonstrate attention to detail and precision in your work",
      "Show you can work autonomously with high ownership",
      "Exhibit strong communication skills, especially in writing",
      "Display intellectual curiosity and love of learning",
      "Show you care about code quality and developer experience",
    ],
    valueKeywords: [
      "users first",
      "rigor",
      "urgency",
      "autonomy",
      "precision",
      "developer experience",
      "long-term thinking",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "API design is product design - APIs should be delightful",
      "Documentation is a first-class product",
      "Practical debugging skills matter more than algorithms trivia",
      "Code should be readable and maintainable by others",
      "Edge cases and error handling are critical",
    ],
    techStack: ["Ruby", "Java", "Go", "TypeScript", "React", "GraphQL", "AWS"],
    codeReviewStyle: "thorough reviews with focus on correctness and edge cases",
    deploymentPhilosophy: "continuous deployment with strong testing",
    documentationExpectations: "exceptional documentation is expected and celebrated",
  },
}

export const uberData: CompanyQuestionData = {
  id: "uber",
  name: "Uber",
  logo: "/company-logos/uber.svg",
  careers_url: "https://uber.com/careers",

  difficultyDistribution: {
    easy: 15,
    medium: 60,
    hard: 25,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 60, priority: 7, typicalDifficulty: "hard" },
    { pattern: "sliding-window", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 50, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    { scenarioId: "design-uber", title: "Design Uber/Ride-sharing", frequency: "very_common" },
    {
      scenarioId: "find-nearest-drivers",
      title: "Find K Nearest Drivers",
      frequency: "very_common",
    },
    { scenarioId: "meeting-rooms-ii", title: "Meeting Rooms II", frequency: "common" },
    { scenarioId: "task-scheduler", title: "Task Scheduler", frequency: "common" },
    { scenarioId: "shortest-path", title: "Shortest Path in Grid", frequency: "common" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Recruiter + technical screen",
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
        focusAreas: ["algorithms", "optimization"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design",
        focusAreas: ["geo-distributed", "real-time"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Hiring manager",
        focusAreas: ["leadership", "culture"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "Uber loves graph and geo-location problems",
      "System design often involves ride-sharing scenarios",
      "Know real-time systems and location-based services",
      "Be ready for optimization and efficiency questions",
    ],
  },

  interviewStyle: {
    pace: "fast",
    communicationEmphasis: 7,
    codeQualityEmphasis: 7,
    optimalSolutionRequired: true,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      "Geo/location-based problems are common",
      "System design often involves ride-sharing",
      "Graph algorithms are frequently tested",
      "Real-time systems knowledge is valued",
    ],
  },

  compensation: {
    entryLevel: "$140k - $170k TC",
    midLevel: "$200k - $320k TC",
    seniorLevel: "$320k - $480k+ TC",
  },

  coreValues: {
    principles: [
      "We build globally, we live locally",
      "We are customer obsessed",
      "We celebrate differences",
      "We do the right thing - period",
      "We act like owners",
      "We persevere",
      "We value ideas over hierarchy",
      "We make big bold bets",
    ],
    behavioralExpectations: [
      "Show ownership mentality and accountability",
      "Demonstrate ability to work with global, diverse teams",
      "Exhibit customer-first thinking in decisions",
      "Display resilience and ability to overcome challenges",
      "Show you can challenge ideas respectfully regardless of seniority",
    ],
    valueKeywords: [
      "ownership",
      "global",
      "customer obsessed",
      "bold bets",
      "perseverance",
      "diversity",
      "ideas over hierarchy",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Real-time systems at massive scale",
      "Mobile-first engineering mindset",
      "Data-driven decision making",
      "Geo-spatial problems are core competency",
      "Reliability is paramount - millions depend on us",
    ],
    techStack: ["Go", "Java", "Python", "Node.js", "React Native", "Kafka", "MySQL", "Redis"],
    codeReviewStyle: "code reviews focused on scalability and reliability",
    deploymentPhilosophy: "continuous deployment with feature flags",
    documentationExpectations: "documentation required for system design and APIs",
  },
}

export const lyftData: CompanyQuestionData = {
  id: "lyft",
  name: "Lyft",
  logo: "/company-logos/lyft.svg",
  careers_url: "https://lyft.com/careers",

  difficultyDistribution: {
    easy: 20,
    medium: 60,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 50, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "k-closest-points",
      title: "K Closest Points to Origin",
      frequency: "very_common",
    },
    { scenarioId: "find-nearest-drivers", title: "Find Nearby Drivers", frequency: "common" },
    { scenarioId: "meeting-rooms-ii", title: "Meeting Rooms II", frequency: "common" },
    { scenarioId: "task-scheduler", title: "Task Scheduler", frequency: "occasional" },
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
        duration: 45,
        description: "Onsite coding",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "system_design",
        duration: 45,
        description: "System design",
        focusAreas: ["architecture", "scalability"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Values interview",
        focusAreas: ["culture", "values"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "Similar to Uber - geo and graph problems common",
      "Lyft emphasizes company values in interviews",
      "Be ready for location-based algorithm questions",
      "Generally a friendlier interview process",
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
      "Similar problem types to Uber",
      "Strong emphasis on company values",
      "Generally collaborative interview style",
    ],
  },

  compensation: {
    entryLevel: "$130k - $160k TC",
    midLevel: "$180k - $280k TC",
    seniorLevel: "$280k - $400k+ TC",
  },

  coreValues: {
    principles: [
      "Be Yourself - authenticity matters",
      "Uplift Others - invest in the community",
      "Make it Happen - be resourceful and drive impact",
      "Create Fearlessly - innovate with courage",
    ],
    behavioralExpectations: [
      "Show genuine care for the community and social impact",
      "Demonstrate collaborative and supportive behavior",
      "Exhibit creative problem-solving abilities",
      "Display authenticity and willingness to be vulnerable",
      "Show you can work effectively in a mission-driven environment",
    ],
    valueKeywords: [
      "community",
      "authenticity",
      "uplift",
      "impact",
      "fearless",
      "supportive",
      "mission-driven",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Similar tech challenges to Uber - geo/routing problems",
      "Mobile-first approach for riders and drivers",
      "Data science and ML for matching and pricing",
      "Strong focus on reliability and user experience",
      "Collaborative and supportive team culture",
    ],
    techStack: ["Python", "Go", "Java", "React Native", "Kubernetes", "AWS"],
    codeReviewStyle: "collaborative reviews with emphasis on learning",
    deploymentPhilosophy: "continuous deployment with canary releases",
    documentationExpectations: "reasonable documentation for APIs and services",
  },
}

export const airbnbData: CompanyQuestionData = {
  id: "airbnb",
  name: "Airbnb",
  logo: "/company-logos/airbnb.svg",
  careers_url: "https://careers.airbnb.com",

  difficultyDistribution: {
    easy: 15,
    medium: 55,
    hard: 30,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 65, priority: 7, typicalDifficulty: "hard" },
    { pattern: "binary-search", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "backtracking", frequency: 50, priority: 6, typicalDifficulty: "hard" },
  ],

  mustKnowQuestions: [
    { scenarioId: "alien-dictionary", title: "Alien Dictionary", frequency: "very_common" },
    { scenarioId: "design-airbnb", title: "Design Airbnb", frequency: "very_common" },
    { scenarioId: "calendar-booking", title: "Meeting Scheduler / Calendar", frequency: "common" },
    { scenarioId: "pour-water", title: "Pour Water", frequency: "common" },
    { scenarioId: "text-justification", title: "Text Justification", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "Technical phone screen",
        focusAreas: ["coding", "problem-solving"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Coding round 1",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Coding round 2",
        focusAreas: ["algorithms", "string"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design",
        focusAreas: ["architecture", "trade-offs"],
      },
      {
        type: "behavioral",
        duration: 60,
        description: "Cross-functional / Core values",
        focusAreas: ["culture", "belonging"],
      },
    ],
    timeline: "3-5 weeks",
    tips: [
      "Airbnb has unique questions - practice their tagged problems",
      'Strong focus on culture and "belonging"',
      "Be ready for graph and string manipulation problems",
      "System design often involves booking/calendar systems",
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
      "Unique Airbnb-specific problems",
      'Strong emphasis on "belonging" and culture',
      "Cross-functional interviews are common",
      "Booking/calendar problems are frequent",
    ],
  },

  compensation: {
    entryLevel: "$150k - $180k TC",
    midLevel: "$220k - $350k TC",
    seniorLevel: "$350k - $500k+ TC",
  },

  coreValues: {
    principles: [
      "Champion the Mission - create a world where anyone can belong anywhere",
      "Be a Host - care for others with intention",
      "Embrace the Adventure - be curious and open",
      "Be a Cereal Entrepreneur - be creative and resourceful",
      "Simplify - focus on what matters",
    ],
    behavioralExpectations: [
      "Demonstrate genuine care for hosts, guests, and community",
      "Show entrepreneurial thinking and creative problem-solving",
      "Exhibit strong sense of belonging and inclusion",
      "Display curiosity and openness to new experiences",
      "Show you can simplify complex problems",
    ],
    valueKeywords: [
      "belonging",
      "host",
      "community",
      "adventure",
      "entrepreneurial",
      "simplify",
      "care",
      "mission",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Design-driven development - aesthetics and UX matter",
      "Unique, creative problems - calendar, booking, search",
      "Cross-functional collaboration with design and product",
      "Data-driven experimentation culture",
      "Strong focus on trust and safety systems",
    ],
    techStack: ["Java", "Ruby", "JavaScript/React", "Kubernetes", "AWS", "GraphQL", "Airflow"],
    codeReviewStyle: "thorough reviews with design considerations",
    deploymentPhilosophy: "continuous deployment with feature flags and experiments",
    documentationExpectations: "design docs and technical specs required",
  },
}

export const linkedinData: CompanyQuestionData = {
  id: "linkedin",
  name: "LinkedIn",
  logo: "/company-logos/linkedin.svg",
  careers_url: "https://careers.linkedin.com",

  difficultyDistribution: {
    easy: 20,
    medium: 60,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "linked-list", frequency: 50, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "nested-list-iterator",
      title: "Flatten Nested List Iterator",
      frequency: "very_common",
    },
    {
      scenarioId: "design-search-autocomplete",
      title: "Design Search Autocomplete",
      frequency: "very_common",
    },
    { scenarioId: "lru-cache", title: "LRU Cache", frequency: "common" },
    {
      scenarioId: "serialize-deserialize-tree",
      title: "Serialize Binary Tree",
      frequency: "common",
    },
    {
      scenarioId: "shortest-word-distance",
      title: "Shortest Word Distance",
      frequency: "occasional",
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
        duration: 45,
        description: "Coding round",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "system_design",
        duration: 45,
        description: "System design",
        focusAreas: ["social-network", "feeds"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Hiring manager",
        focusAreas: ["culture", "growth"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "LinkedIn is owned by Microsoft - similar culture",
      "Social network and feed design questions are common",
      "Nested data structure problems appear frequently",
      "Generally a positive interview experience",
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
      "Owned by Microsoft - similar values",
      "Social network domain questions",
      "Nested data structures are popular",
      "Good work-life balance emphasis",
    ],
  },

  compensation: {
    entryLevel: "$130k - $160k TC",
    midLevel: "$180k - $300k TC",
    seniorLevel: "$300k - $450k+ TC",
  },

  coreValues: {
    principles: [
      "Members First - put members at the center of everything",
      "Relationships Matter - build trust through authentic connections",
      "Be Open, Honest and Constructive",
      "Demand Excellence - strive for quality in everything",
      "Take Intelligent Risks - be bold but thoughtful",
      "Act Like an Owner - take responsibility",
    ],
    behavioralExpectations: [
      "Show how you put users/members first in decisions",
      "Demonstrate collaborative and relationship-building skills",
      "Exhibit honesty and constructive feedback ability",
      "Display drive for excellence and quality",
      "Show ownership mentality and accountability",
    ],
    valueKeywords: [
      "members first",
      "relationships",
      "open",
      "honest",
      "excellence",
      "ownership",
      "trust",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Microsoft-influenced culture - growth mindset",
      "Social network scale - billions of members",
      "Feed and recommendation systems are core",
      "Strong focus on professional content and engagement",
      "Good work-life balance emphasis",
    ],
    techStack: ["Java", "Scala", "Python", "JavaScript/Ember", "Kafka", "Samza", "Espresso"],
    codeReviewStyle: "thorough reviews with mentorship culture",
    deploymentPhilosophy: "staged rollouts with careful monitoring",
    documentationExpectations: "comprehensive documentation expected",
  },
}

export const twitterData: CompanyQuestionData = {
  id: "twitter",
  name: "Twitter/X",
  logo: "/company-logos/twitter.svg",
  careers_url: "https://careers.twitter.com",

  difficultyDistribution: {
    easy: 15,
    medium: 60,
    hard: 25,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "sliding-window", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 55, priority: 6, typicalDifficulty: "hard" },
    { pattern: "binary-search", frequency: 50, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    { scenarioId: "design-twitter", title: "Design Twitter", frequency: "very_common" },
    {
      scenarioId: "design-trending-topics",
      title: "Design Trending Topics",
      frequency: "very_common",
    },
    { scenarioId: "top-k-frequent", title: "Top K Frequent Elements", frequency: "common" },
    { scenarioId: "lru-cache", title: "LRU Cache", frequency: "common" },
    { scenarioId: "word-frequency", title: "Word Frequency in Stream", frequency: "occasional" },
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
        duration: 45,
        description: "Coding round",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design",
        focusAreas: ["feeds", "real-time"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Team fit",
        focusAreas: ["culture", "collaboration"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "Feed and timeline problems are very common",
      "Real-time systems knowledge is valuable",
      "String processing and streaming data questions",
      "Interview process has changed under X - research current state",
    ],
  },

  interviewStyle: {
    pace: "fast",
    communicationEmphasis: 7,
    codeQualityEmphasis: 7,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      "Feed/timeline design is signature",
      "Real-time streaming questions",
      "Company is undergoing changes - research current state",
    ],
  },

  compensation: {
    entryLevel: "$140k - $170k TC",
    midLevel: "$200k - $320k TC",
    seniorLevel: "$320k - $480k+ TC",
  },

  coreValues: {
    principles: [
      "Pursue the Mission - free speech and open discourse",
      "Move Fast - rapid iteration and shipping",
      "Be Direct - honest and straightforward communication",
      "Build in Public - transparency in what we do",
      "Think Long Term - sustainable impact over quick wins",
    ],
    behavioralExpectations: [
      "Demonstrate passion for the platform and its mission",
      "Show ability to work in fast-paced, changing environment",
      "Exhibit directness and honest communication style",
      "Display resilience and adaptability to change",
      "Show technical excellence and problem-solving ability",
    ],
    valueKeywords: [
      "mission",
      "free speech",
      "move fast",
      "direct",
      "resilient",
      "adaptable",
      "transparent",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Real-time systems at massive scale",
      "Feed and timeline optimization is core",
      "Streaming data and event processing",
      "Culture has evolved significantly under X leadership",
      "High expectations for individual contribution",
    ],
    techStack: ["Scala", "Java", "Python", "React", "GraphQL", "Kafka", "Manhattan DB"],
    codeReviewStyle: "varies by team - generally async reviews",
    deploymentPhilosophy: "continuous deployment with feature flags",
    documentationExpectations: "evolving - research current expectations",
  },
}

export const topTechCompanies: CompanyQuestionData[] = [
  stripeData,
  uberData,
  lyftData,
  airbnbData,
  linkedinData,
  twitterData,
]
