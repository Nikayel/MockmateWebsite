/**
 * Growth-Stage & Finance Company Interview Data
 * Based on aggregated data from LeetCode, Glassdoor, Blind, and interview reports
 */

import { CompanyQuestionData } from "./types"

export const shopifyData: CompanyQuestionData = {
  id: "shopify",
  name: "Shopify",
  logo: "/company-logos/shopify.svg",
  careers_url: "https://shopify.com/careers",

  difficultyDistribution: {
    easy: 25,
    medium: 55,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 50, priority: 6, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 50, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "design-ecommerce",
      title: "Design E-commerce Platform",
      frequency: "very_common",
    },
    {
      scenarioId: "inventory-management",
      title: "Inventory Management System",
      frequency: "common",
    },
    { scenarioId: "checkout-flow", title: "Design Checkout Flow", frequency: "common" },
    { scenarioId: "product-search", title: "Product Search", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 4,
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
        description: "Life story + Coding",
        focusAreas: ["background", "algorithms"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical deep-dive",
        focusAreas: ["algorithms", "design"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Hiring manager",
        focusAreas: ["culture", "entrepreneurship"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      'Shopify loves the "Life Story" interview - prepare your narrative',
      "E-commerce domain knowledge is a plus",
      "They value entrepreneurial mindset",
      "Ruby on Rails knowledge is valued but not required",
      "Remote-first culture - good work-life balance",
    ],
  },

  interviewStyle: {
    pace: "relaxed",
    communicationEmphasis: 8,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      'Famous "Life Story" interview',
      "E-commerce domain focus",
      "Remote-first culture",
      "Values entrepreneurial mindset",
    ],
  },

  compensation: {
    entryLevel: "$120k - $150k TC (CAD)",
    midLevel: "$160k - $250k TC (CAD)",
    seniorLevel: "$250k - $400k+ TC (CAD)",
  },

  coreValues: {
    principles: [
      "Act like an owner - take responsibility for outcomes",
      "Default to open - share information freely",
      "Be a constant learner - embrace feedback and growth",
      "Build for the long term - sustainable over flashy",
      "Thrive on change - embrace evolution",
    ],
    behavioralExpectations: [
      "Demonstrate entrepreneurial mindset and ownership",
      "Show you can learn quickly and adapt to change",
      "Exhibit openness and transparency in communication",
      "Display genuine interest in e-commerce and merchant success",
      "Show you can work effectively in remote-first environment",
    ],
    valueKeywords: [
      "ownership",
      "entrepreneurial",
      "open",
      "long-term",
      "merchant success",
      "remote-first",
      "adaptable",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Remote-first culture - work from anywhere",
      "Ruby on Rails heritage but modern stack",
      "E-commerce domain expertise is valued",
      "Merchant success is the primary metric",
      "Life Story interview is unique to Shopify",
    ],
    techStack: ["Ruby on Rails", "React", "GraphQL", "Go", "Kubernetes", "MySQL", "Redis"],
    codeReviewStyle: "collaborative reviews with constructive feedback",
    deploymentPhilosophy: "continuous deployment with feature flags",
    documentationExpectations: "reasonable documentation for features and APIs",
  },
}

export const coinbaseData: CompanyQuestionData = {
  id: "coinbase",
  name: "Coinbase",
  logo: "/company-logos/coinbase.svg",
  careers_url: "https://coinbase.com/careers",

  difficultyDistribution: {
    easy: 15,
    medium: 55,
    hard: 30,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 75, priority: 8, typicalDifficulty: "hard" },
    { pattern: "trees", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 55, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "design-crypto-exchange",
      title: "Design Crypto Exchange",
      frequency: "very_common",
    },
    { scenarioId: "transaction-ledger", title: "Transaction Ledger", frequency: "common" },
    { scenarioId: "order-matching", title: "Order Matching Engine", frequency: "common" },
    { scenarioId: "rate-limiter", title: "Rate Limiter", frequency: "common" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 45,
        description: "Recruiter call",
        focusAreas: ["background", "crypto-interest"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Technical screen",
        focusAreas: ["coding", "problem-solving"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Coding deep-dive",
        focusAreas: ["algorithms", "optimization"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System design",
        focusAreas: ["financial-systems", "security"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Values interview",
        focusAreas: ["crypto-passion", "culture"],
      },
    ],
    timeline: "3-5 weeks",
    tips: [
      "Show genuine interest in crypto/blockchain",
      "Security and consistency are emphasized",
      "Financial systems knowledge is valuable",
      "Be ready to discuss cryptocurrency concepts",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 7,
    codeQualityEmphasis: 9,
    optimalSolutionRequired: false,
    allowsPseudocode: false,
    providesHints: true,
    uniqueTraits: [
      "Crypto/blockchain interest is expected",
      "Financial systems focus",
      "Security is paramount",
      "Values crypto mission alignment",
    ],
  },

  compensation: {
    entryLevel: "$140k - $170k TC",
    midLevel: "$200k - $350k TC",
    seniorLevel: "$350k - $550k+ TC",
  },

  coreValues: {
    principles: [
      "Clear communication - be precise and transparent",
      "Efficient execution - ship with quality and speed",
      "Act like an owner - take responsibility",
      "Champion the mission - crypto for everyone",
      "Positive energy - bring enthusiasm to work",
    ],
    behavioralExpectations: [
      "Show genuine passion for cryptocurrency and blockchain",
      "Demonstrate clear and precise communication skills",
      "Exhibit strong ownership mentality and accountability",
      "Display understanding of financial systems and security",
      "Show you can work in a regulated environment",
    ],
    valueKeywords: [
      "crypto",
      "mission",
      "ownership",
      "clear communication",
      "security",
      "compliance",
      "financial systems",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Security is paramount - crypto security is existential",
      "Financial systems require extreme reliability",
      "Compliance and regulatory awareness matters",
      "Scale to handle massive trading volumes",
      "Defense in depth for all systems",
    ],
    techStack: ["Go", "Ruby", "Python", "React", "PostgreSQL", "AWS", "Kubernetes"],
    codeReviewStyle: "thorough reviews with security focus",
    deploymentPhilosophy: "careful staged rollouts with extensive testing",
    documentationExpectations: "comprehensive documentation for security and compliance",
  },
}

export const databricksData: CompanyQuestionData = {
  id: "databricks",
  name: "Databricks",
  logo: "/company-logos/databricks.svg",
  careers_url: "https://databricks.com/careers",

  difficultyDistribution: {
    easy: 10,
    medium: 50,
    hard: 40,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 80, priority: 9, typicalDifficulty: "hard" },
    { pattern: "dp-2d", frequency: 70, priority: 8, typicalDifficulty: "hard" },
    { pattern: "bfs", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "sorting", frequency: 55, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "design-spark",
      title: "Design Distributed Data Processing",
      frequency: "very_common",
    },
    { scenarioId: "data-pipeline", title: "Design Data Pipeline", frequency: "common" },
    { scenarioId: "distributed-sort", title: "Distributed Sort", frequency: "common" },
    { scenarioId: "stream-processing", title: "Stream Processing", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "Technical screen",
        focusAreas: ["coding", "data-systems"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Algorithms round",
        focusAreas: ["algorithms", "optimization"],
      },
      {
        type: "coding",
        duration: 60,
        description: "System coding",
        focusAreas: ["systems", "data-structures"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "Distributed systems",
        focusAreas: ["big-data", "scale"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Hiring manager",
        focusAreas: ["culture", "impact"],
      },
    ],
    timeline: "3-6 weeks",
    tips: [
      "Strong focus on distributed systems",
      "Know Apache Spark concepts",
      "Data processing and pipeline design common",
      "Harder interview - prepare for difficult DP",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 8,
    codeQualityEmphasis: 9,
    optimalSolutionRequired: true,
    allowsPseudocode: false,
    providesHints: false,
    uniqueTraits: [
      "Data/ML systems focus",
      "Harder than average problems",
      "Distributed systems knowledge expected",
      "Spark/data processing expertise valued",
    ],
  },

  compensation: {
    entryLevel: "$150k - $180k TC",
    midLevel: "$220k - $380k TC",
    seniorLevel: "$380k - $600k+ TC",
  },

  coreValues: {
    principles: [
      "Customer Obsession - customers are the reason we exist",
      "Ownership - act on behalf of the company",
      "Relentless Innovation - push the boundaries",
      "Data Driven - let data inform decisions",
      "Transparency - open and honest communication",
    ],
    behavioralExpectations: [
      "Demonstrate deep technical expertise in data systems",
      "Show passion for data and analytics platforms",
      "Exhibit strong problem-solving with distributed systems",
      "Display ability to work on complex, hard problems",
      "Show customer-focused mindset in technical decisions",
    ],
    valueKeywords: [
      "data",
      "innovation",
      "customer obsession",
      "ownership",
      "distributed systems",
      "analytics",
      "scale",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Founded by Apache Spark creators - data is in the DNA",
      "Lakehouse architecture is the vision",
      "ML and AI are first-class citizens",
      "Distributed systems expertise expected",
      "Open source contribution is encouraged",
    ],
    techStack: ["Scala", "Java", "Python", "Apache Spark", "Delta Lake", "MLflow", "Kubernetes"],
    codeReviewStyle: "thorough reviews with performance focus",
    deploymentPhilosophy: "staged rollouts with comprehensive testing",
    documentationExpectations: "strong documentation culture, especially for APIs",
  },
}

export const snowflakeData: CompanyQuestionData = {
  id: "snowflake",
  name: "Snowflake",
  logo: "/company-logos/snowflake.svg",
  careers_url: "https://snowflake.com/careers",

  difficultyDistribution: {
    easy: 10,
    medium: 50,
    hard: 40,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 80, priority: 9, typicalDifficulty: "hard" },
    { pattern: "trees", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "bfs", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "heap", frequency: 55, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    {
      scenarioId: "design-data-warehouse",
      title: "Design Data Warehouse",
      frequency: "very_common",
    },
    { scenarioId: "query-optimizer", title: "Query Optimizer", frequency: "common" },
    { scenarioId: "distributed-storage", title: "Distributed Storage", frequency: "common" },
    { scenarioId: "compression", title: "Data Compression", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "Technical screen",
        focusAreas: ["coding", "databases"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Algorithms",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Systems coding",
        focusAreas: ["systems", "optimization"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "Data systems design",
        focusAreas: ["databases", "scale"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Culture fit",
        focusAreas: ["values", "collaboration"],
      },
    ],
    timeline: "3-6 weeks",
    tips: [
      "Database and SQL knowledge is essential",
      "Understand data warehouse concepts",
      "Cloud architecture knowledge is a plus",
      "Harder interview - be well prepared",
    ],
  },

  interviewStyle: {
    pace: "moderate",
    communicationEmphasis: 7,
    codeQualityEmphasis: 9,
    optimalSolutionRequired: true,
    allowsPseudocode: false,
    providesHints: false,
    uniqueTraits: [
      "Database/data warehouse focus",
      "Cloud computing knowledge valued",
      "Challenging technical bar",
      "SQL knowledge expected",
    ],
  },

  compensation: {
    entryLevel: "$150k - $180k TC",
    midLevel: "$220k - $380k TC",
    seniorLevel: "$380k - $600k+ TC",
  },

  coreValues: {
    principles: [
      "Put Customers First - their success is our success",
      "Own It - take responsibility end to end",
      "Execution Matters - ship high-quality products",
      "Think Big - solve ambitious problems",
      "Be Excellent - maintain high standards",
    ],
    behavioralExpectations: [
      "Demonstrate expertise in databases and data systems",
      "Show understanding of cloud architecture",
      "Exhibit strong analytical and problem-solving skills",
      "Display customer-focused mindset",
      "Show you can handle complex technical challenges",
    ],
    valueKeywords: [
      "cloud",
      "data warehouse",
      "customer first",
      "execution",
      "excellence",
      "ownership",
      "ambitious",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Cloud-native data warehouse pioneer",
      "SQL knowledge is essential",
      "Performance optimization is critical",
      "Security and compliance are paramount",
      "Separation of storage and compute is core innovation",
    ],
    techStack: ["Java", "C++", "Python", "SQL", "React", "AWS/Azure/GCP"],
    codeReviewStyle: "thorough reviews with performance considerations",
    deploymentPhilosophy: "careful staged rollouts across cloud providers",
    documentationExpectations: "comprehensive documentation for all features",
  },
}

export const palantirData: CompanyQuestionData = {
  id: "palantir",
  name: "Palantir",
  logo: "/company-logos/palantir.svg",
  careers_url: "https://palantir.com/careers",

  difficultyDistribution: {
    easy: 5,
    medium: 45,
    hard: 50,
  },

  topPatterns: [
    { pattern: "bfs", frequency: 90, priority: 10, typicalDifficulty: "hard" },
    { pattern: "dfs", frequency: 90, priority: 10, typicalDifficulty: "hard" },
    { pattern: "dp-1d", frequency: 85, priority: 9, typicalDifficulty: "hard" },
    { pattern: "dp-2d", frequency: 80, priority: 9, typicalDifficulty: "hard" },
    { pattern: "trees", frequency: 75, priority: 8, typicalDifficulty: "hard" },
    { pattern: "arrays-hashing", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "backtracking", frequency: 60, priority: 7, typicalDifficulty: "hard" },
  ],

  mustKnowQuestions: [
    { scenarioId: "graph-decomposition", title: "Graph Decomposition", frequency: "very_common" },
    { scenarioId: "path-finding", title: "Complex Path Finding", frequency: "very_common" },
    { scenarioId: "data-integration", title: "Data Integration", frequency: "common" },
    { scenarioId: "anomaly-detection", title: "Anomaly Detection", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "Karat screen",
        focusAreas: ["coding", "algorithms"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Onsite coding 1",
        focusAreas: ["algorithms", "graphs"],
      },
      {
        type: "coding",
        duration: 60,
        description: "Onsite coding 2",
        focusAreas: ["dp", "optimization"],
      },
      {
        type: "system_design",
        duration: 60,
        description: "System decomposition",
        focusAreas: ["architecture", "data-modeling"],
      },
      {
        type: "behavioral",
        duration: 60,
        description: "Values interview",
        focusAreas: ["mission", "ethics"],
      },
    ],
    timeline: "4-8 weeks",
    tips: [
      "Extremely difficult interview - heavy on graphs and DP",
      "Practice hard LeetCode problems extensively",
      "They value mission alignment (government/defense work)",
      "Be prepared for ethical questions about the work",
      "Security clearance may be required",
    ],
  },

  interviewStyle: {
    pace: "fast",
    communicationEmphasis: 8,
    codeQualityEmphasis: 9,
    optimalSolutionRequired: true,
    allowsPseudocode: false,
    providesHints: false,
    uniqueTraits: [
      "Very hard technical bar",
      "Graph and DP heavy",
      "Mission/ethics focus",
      "Security clearance often required",
    ],
  },

  compensation: {
    entryLevel: "$140k - $170k TC",
    midLevel: "$200k - $350k TC",
    seniorLevel: "$350k - $550k+ TC",
  },

  coreValues: {
    principles: [
      "Mission Alignment - believe in making the world safer",
      "Builders - hands-on problem solvers who ship",
      "Commitment - willing to go the extra mile",
      "Growth - continuous learning and improvement",
      "Impact Focus - work on problems that matter",
    ],
    behavioralExpectations: [
      "Show genuine alignment with company mission (government/defense)",
      "Demonstrate exceptional problem-solving abilities",
      "Exhibit willingness to work on challenging, hard problems",
      "Display strong graph and algorithm skills",
      "Show comfort with ambiguity and complex domains",
    ],
    valueKeywords: [
      "mission",
      "defense",
      "government",
      "impact",
      "builders",
      "security",
      "complex problems",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Mission-driven work - government and enterprise customers",
      "Forward Deployed Engineers work directly with customers",
      "Graph problems and data integration are core",
      "Security clearance often required",
      "Very high technical bar - hardest interviews in tech",
    ],
    techStack: ["Java", "TypeScript", "Python", "Spark", "Elasticsearch", "Graph databases"],
    codeReviewStyle: "thorough reviews with correctness focus",
    deploymentPhilosophy: "careful deployments with customer-specific considerations",
    documentationExpectations: "comprehensive internal documentation",
  },
}

export const goldmanSachsData: CompanyQuestionData = {
  id: "goldman-sachs",
  name: "Goldman Sachs",
  logo: "/company-logos/goldman-sachs.svg",
  careers_url: "https://goldmansachs.com/careers",

  difficultyDistribution: {
    easy: 25,
    medium: 55,
    hard: 20,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 80, priority: 9, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "math-geometry", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 60, priority: 6, typicalDifficulty: "medium" },
    { pattern: "sorting", frequency: 55, priority: 6, typicalDifficulty: "easy" },
  ],

  mustKnowQuestions: [
    { scenarioId: "stock-price", title: "Best Time to Buy/Sell Stock", frequency: "very_common" },
    { scenarioId: "transaction-calculator", title: "Transaction Calculator", frequency: "common" },
    { scenarioId: "roman-to-integer", title: "Roman to Integer", frequency: "common" },
    { scenarioId: "string-compression", title: "String Compression", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      {
        type: "phone_screen",
        duration: 30,
        description: "HireVue video",
        focusAreas: ["behavioral", "motivation"],
      },
      {
        type: "coding",
        duration: 60,
        description: "HackerRank OA",
        focusAreas: ["coding", "math"],
      },
      {
        type: "coding",
        duration: 45,
        description: "Technical interview",
        focusAreas: ["algorithms", "finance"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Super Day interviews",
        focusAreas: ["culture", "finance-knowledge"],
      },
    ],
    timeline: "4-8 weeks",
    tips: [
      "HireVue video interview is common first step",
      "Financial knowledge is a plus",
      "Practice on HackerRank for OA",
      "Super Day includes multiple back-to-back interviews",
      "Business/finance understanding valued",
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
      "HireVue video interview",
      "Finance domain questions",
      "Super Day format",
      "Business acumen valued",
    ],
  },

  compensation: {
    entryLevel: "$100k - $140k TC",
    midLevel: "$150k - $250k TC",
    seniorLevel: "$250k - $400k+ TC",
  },

  coreValues: {
    principles: [
      "Client Service - client relationships are paramount",
      "Partnership - collaborative culture across divisions",
      "Integrity - do the right thing even when difficult",
      "Excellence - strive for the highest quality",
      "Diversity - different perspectives drive better outcomes",
    ],
    behavioralExpectations: [
      "Demonstrate understanding of financial markets",
      "Show strong analytical and quantitative skills",
      "Exhibit professionalism and business acumen",
      "Display collaborative and team-oriented mindset",
      "Show interest in finance and capital markets",
    ],
    valueKeywords: [
      "client service",
      "partnership",
      "integrity",
      "excellence",
      "finance",
      "markets",
      "quantitative",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Engineering supports trading and banking operations",
      "Risk management is critical",
      "Legacy systems coexist with modern platforms",
      "Financial domain knowledge is valuable",
      "Business understanding matters as much as technical skills",
    ],
    techStack: ["Java", "Python", "C++", "SecDB", "Slang", "React"],
    codeReviewStyle: "thorough reviews with risk considerations",
    deploymentPhilosophy: "careful staged deployments with extensive testing",
    documentationExpectations: "strong documentation for risk and compliance",
  },
}

export const janeStreetData: CompanyQuestionData = {
  id: "jane-street",
  name: "Jane Street",
  logo: "/company-logos/jane-street.svg",
  careers_url: "https://janestreet.com/join-jane-street",

  difficultyDistribution: {
    easy: 0,
    medium: 30,
    hard: 70,
  },

  topPatterns: [
    { pattern: "dp-1d", frequency: 95, priority: 10, typicalDifficulty: "hard" },
    { pattern: "dp-2d", frequency: 90, priority: 10, typicalDifficulty: "hard" },
    { pattern: "math-geometry", frequency: 90, priority: 10, typicalDifficulty: "hard" },
    { pattern: "bfs", frequency: 80, priority: 9, typicalDifficulty: "hard" },
    { pattern: "arrays-hashing", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 70, priority: 8, typicalDifficulty: "hard" },
    { pattern: "backtracking", frequency: 65, priority: 7, typicalDifficulty: "hard" },
  ],

  mustKnowQuestions: [
    { scenarioId: "probability-puzzle", title: "Probability Puzzles", frequency: "very_common" },
    { scenarioId: "market-making", title: "Market Making Simulation", frequency: "very_common" },
    { scenarioId: "game-theory", title: "Game Theory Problems", frequency: "common" },
    { scenarioId: "sequence-puzzle", title: "Sequence Puzzles", frequency: "common" },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      {
        type: "phone_screen",
        duration: 60,
        description: "Math/CS screen",
        focusAreas: ["math", "puzzles"],
      },
      {
        type: "coding",
        duration: 90,
        description: "Technical interview",
        focusAreas: ["algorithms", "math"],
      },
      {
        type: "coding",
        duration: 90,
        description: "Mock trading",
        focusAreas: ["trading", "probability"],
      },
      {
        type: "behavioral",
        duration: 60,
        description: "Fit interview",
        focusAreas: ["culture", "collaboration"],
      },
      {
        type: "team_match",
        duration: 60,
        description: "Team matching",
        focusAreas: ["team-fit", "interest"],
      },
    ],
    timeline: "4-8 weeks",
    tips: [
      "EXTREMELY quantitative - heavy math and probability",
      "Practice mental math and estimation",
      "Mock trading rounds test quick thinking under pressure",
      "Puzzles and brain teasers are common",
      "OCaml/functional programming for dev roles",
    ],
  },

  interviewStyle: {
    pace: "fast",
    communicationEmphasis: 9,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: true,
    allowsPseudocode: false,
    providesHints: false,
    uniqueTraits: [
      "Heavily quantitative",
      "Mock trading rounds",
      "Brain teasers and puzzles",
      "OCaml for dev roles",
      "Among the hardest interviews",
    ],
  },

  compensation: {
    entryLevel: "$200k - $300k TC",
    midLevel: "$350k - $600k TC",
    seniorLevel: "$600k - $1M+ TC",
  },

  coreValues: {
    principles: [
      "Intellectual Curiosity - love of learning and puzzles",
      "Collaboration - work together, not in silos",
      "Rigor - precision and attention to detail",
      "Long-term Thinking - sustainable growth over quick wins",
      "Quantitative Excellence - math and probability are core",
    ],
    behavioralExpectations: [
      "Demonstrate exceptional quantitative and mathematical ability",
      "Show love of puzzles, games, and probability",
      "Exhibit strong communication of complex ideas",
      "Display collaborative and ego-free attitude",
      "Show you can think quickly under pressure",
    ],
    valueKeywords: [
      "quantitative",
      "probability",
      "puzzles",
      "collaboration",
      "rigor",
      "intellectual curiosity",
      "long-term",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "OCaml/functional programming for developers",
      "Quantitative trading at the core",
      "Mental math and estimation skills valued",
      "Mock trading rounds test real-time decision making",
      "Collaborative flat culture - no titles, open office",
    ],
    techStack: ["OCaml", "Python", "C++", "Linux", "Low-latency systems"],
    codeReviewStyle: "pair programming and collaborative development",
    deploymentPhilosophy: "careful deployments for trading systems",
    documentationExpectations: "code should be self-documenting with clear interfaces",
  },
}

export const bloombergData: CompanyQuestionData = {
  id: "bloomberg",
  name: "Bloomberg",
  logo: "/company-logos/bloomberg.svg",
  careers_url: "https://bloomberg.com/careers",

  difficultyDistribution: {
    easy: 30,
    medium: 55,
    hard: 15,
  },

  topPatterns: [
    { pattern: "arrays-hashing", frequency: 90, priority: 10, typicalDifficulty: "medium" },
    { pattern: "string", frequency: 85, priority: 9, typicalDifficulty: "medium" },
    { pattern: "trees", frequency: 75, priority: 8, typicalDifficulty: "medium" },
    { pattern: "linked-list", frequency: 70, priority: 8, typicalDifficulty: "medium" },
    { pattern: "stack", frequency: 65, priority: 7, typicalDifficulty: "medium" },
    { pattern: "binary-search", frequency: 60, priority: 7, typicalDifficulty: "medium" },
    { pattern: "two-pointers", frequency: 55, priority: 6, typicalDifficulty: "medium" },
    { pattern: "dp-1d", frequency: 50, priority: 6, typicalDifficulty: "medium" },
  ],

  mustKnowQuestions: [
    { scenarioId: "valid-parentheses", title: "Valid Parentheses", frequency: "very_common" },
    { scenarioId: "lru-cache", title: "LRU Cache", frequency: "very_common" },
    { scenarioId: "move-zeroes", title: "Move Zeroes", frequency: "common" },
    { scenarioId: "first-unique-char", title: "First Unique Character", frequency: "common" },
    { scenarioId: "word-pattern", title: "Word Pattern", frequency: "occasional" },
    // Stack - Bloomberg is famous for stack/queue problems
    { scenarioId: "dsa-max-frequency-stack", title: "Maximum Frequency Stack", frequency: "common", lastReported: "2025 Q1" },
    { scenarioId: "dsa-next-greater-element-ii", title: "Next Greater Element II", frequency: "common" },
    { scenarioId: "dsa-online-stock-span", title: "Online Stock Span", frequency: "common" },
    // Trees
    { scenarioId: "dsa-validate-bst", title: "Validate Binary Search Tree", frequency: "common" },
    { scenarioId: "dsa-vertical-order-traversal", title: "Vertical Order Traversal", frequency: "occasional" },
  ],

  interviewProcess: {
    totalRounds: 3,
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
        description: "Onsite coding (2 interviewers)",
        focusAreas: ["algorithms", "data-structures"],
      },
      {
        type: "behavioral",
        duration: 45,
        description: "Hiring manager",
        focusAreas: ["culture", "motivation"],
      },
    ],
    timeline: "2-4 weeks",
    tips: [
      "Bloomberg interviews are shorter than most FAANG",
      "Two interviewers in coding round - be ready for different styles",
      "Focus on clean, working code over optimal",
      "Financial data/terminal knowledge is a plus",
      "Good work-life balance culture",
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
      "Two interviewers per coding round",
      "Shorter interview process",
      "Good work-life balance",
      "Financial domain focus",
    ],
  },

  compensation: {
    entryLevel: "$120k - $150k TC",
    midLevel: "$170k - $280k TC",
    seniorLevel: "$280k - $400k+ TC",
  },

  coreValues: {
    principles: [
      "Client Focused - serve financial professionals worldwide",
      "Innovation - pioneer new approaches to financial data",
      "Excellence - highest quality in everything we do",
      "Integrity - trustworthy and reliable",
      "Community - give back and support employees",
    ],
    behavioralExpectations: [
      "Demonstrate interest in financial data and markets",
      "Show strong communication and collaboration skills",
      "Exhibit attention to quality and correctness",
      "Display ability to work on complex, interconnected systems",
      "Show you can balance speed with reliability",
    ],
    valueKeywords: [
      "financial data",
      "terminal",
      "client focused",
      "innovation",
      "excellence",
      "reliability",
      "quality",
    ],
  },

  engineeringCulture: {
    philosophy: [
      "Bloomberg Terminal is the flagship product",
      "Massive scale - millions of financial professionals",
      "C++ heritage with modern additions",
      "Two interviewers per coding round is unique",
      "Good work-life balance culture",
    ],
    techStack: ["C++", "Python", "JavaScript", "PostgreSQL", "Redis", "Kafka"],
    codeReviewStyle: "thorough reviews with pair feedback",
    deploymentPhilosophy: "staged rollouts with extensive testing",
    documentationExpectations: "good documentation expected for APIs and features",
  },
}

export const growthFinanceCompanies: CompanyQuestionData[] = [
  shopifyData,
  coinbaseData,
  databricksData,
  snowflakeData,
  palantirData,
  goldmanSachsData,
  janeStreetData,
  bloombergData,
]
