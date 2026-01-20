/**
 * Company Interview Knowledge Base
 *
 * Detailed interview information for each company
 */

import type { CompanyId } from "@/lib/data/company-questions/types"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { CompanyInterviewKnowledge } from "./types"

/**
 * Comprehensive company interview knowledge
 */
export const COMPANY_INTERVIEW_KNOWLEDGE: CompanyInterviewKnowledge[] = [
  {
    companyId: "google",
    companyName: "Google",
    interviewStyle: {
      description:
        "Google interviews focus heavily on algorithmic problem-solving and system design. Expect challenging problems that test your ability to think through edge cases and optimize solutions.",
      pace: "Moderate pace with emphasis on communication",
      expectations: [
        "Optimal or near-optimal solutions expected",
        "Strong emphasis on code quality and cleanliness",
        "Must explain thought process clearly",
        "Handle follow-up questions and optimizations",
        "Demonstrate knowledge of time/space trade-offs",
      ],
    },
    topPatterns: [
      {
        pattern: "graphs",
        frequency: 85,
        tips: ["Know BFS/DFS inside out", "Practice cycle detection", "Topological sort is common"],
      },
      {
        pattern: "dp-2d",
        frequency: 80,
        tips: [
          "Start with recursion, then memoize",
          "Explain state transitions clearly",
          "Consider space optimization",
        ],
      },
      {
        pattern: "trees",
        frequency: 75,
        tips: [
          "Binary tree traversals are fundamental",
          "Know how to serialize/deserialize",
          "LCA problems are common",
        ],
      },
      {
        pattern: "arrays-hashing",
        frequency: 70,
        tips: [
          "Foundation for many problems",
          "Always consider hash map approach",
          "Know when to use set vs map",
        ],
      },
      {
        pattern: "sliding-window",
        frequency: 65,
        tips: [
          "Practice variable-size windows",
          "Common in string problems",
          "Know when to expand vs shrink",
        ],
      },
    ],
    interviewProcess: [
      "Initial recruiter call (30 min)",
      "Phone screen with coding (45-60 min)",
      "On-site: 4-5 rounds of technical interviews",
      "Mix of coding, system design (for senior), and behavioral",
      "Team matching process after passing",
    ],
    cultureTips: [
      "Googleyness: collaborative, humble, adaptable",
      "Data-driven decision making is valued",
      "Show intellectual curiosity",
      "Demonstrate ability to work with ambiguity",
    ],
    commonQuestionTypes: [
      "Graph traversal and shortest paths",
      "Dynamic programming optimization",
      "Tree manipulation and traversal",
      "String processing with constraints",
      "System design for Google-scale products",
    ],
    dosDonts: {
      dos: [
        "Think out loud and explain your approach",
        "Ask clarifying questions before coding",
        "Consider and mention edge cases",
        "Discuss multiple approaches before implementing",
        "Test your code with examples",
      ],
      donts: [
        "Jump into coding without a plan",
        "Give up when stuck - ask for hints",
        "Ignore the interviewer's hints",
        "Write messy or unclear code",
        "Forget to analyze time/space complexity",
      ],
    },
  },
  {
    companyId: "meta",
    companyName: "Meta (Facebook)",
    interviewStyle: {
      description:
        "Meta interviews are fast-paced and practical. They want to see you solve problems efficiently and write production-quality code quickly.",
      pace: "Fast-paced, typically 2 problems in 45 minutes",
      expectations: [
        "Speed and efficiency are crucial",
        "Working code is the priority",
        "Expect 2 medium problems or 1 hard",
        "Clean, bug-free code expected",
        "Strong problem-solving intuition needed",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 90,
        tips: [
          "Must be very fast at these",
          "Know all common patterns cold",
          "Two Sum variations are everywhere",
        ],
      },
      {
        pattern: "graphs",
        frequency: 80,
        tips: [
          "Clone graph, number of islands",
          "BFS for shortest path",
          "Union-Find for connectivity",
        ],
      },
      {
        pattern: "trees",
        frequency: 75,
        tips: [
          "Binary tree problems common",
          "Know iterative traversals",
          "Serialization problems",
        ],
      },
      {
        pattern: "string",
        frequency: 70,
        tips: [
          "Substring and parsing problems",
          "Know sliding window well",
          "Character frequency counting",
        ],
      },
      {
        pattern: "binary-search",
        frequency: 65,
        tips: ["Search in rotated array", "Finding boundaries", "Search on answer space"],
      },
    ],
    interviewProcess: [
      "Initial recruiter call",
      "Phone screen: 45 min, 1-2 coding problems",
      "On-site: 3-4 rounds (coding, system design for E5+)",
      "Behavioral interview included",
      "Fast turnaround on decisions",
    ],
    cultureTips: [
      "Move fast and break things mentality",
      "Impact-driven culture",
      "Show you can handle ambiguity",
      "Collaboration is highly valued",
    ],
    commonQuestionTypes: [
      "Array manipulation and optimization",
      "Graph problems (especially social network related)",
      "Binary tree operations",
      "String processing",
      "System design for social features",
    ],
    dosDonts: {
      dos: [
        "Practice under time pressure",
        "Have a systematic approach to problems",
        "Write clean code quickly",
        "Handle edge cases efficiently",
        "Communicate your thought process",
      ],
      donts: [
        "Spend too long on one problem",
        "Sacrifice code quality for speed",
        "Get stuck without asking questions",
        "Forget to verify your solution",
        "Overcomplicate simple problems",
      ],
    },
  },
  {
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
  },
  {
    companyId: "microsoft",
    companyName: "Microsoft",
    interviewStyle: {
      description:
        "Microsoft interviews are conversational and focus on practical problem-solving. Emphasis on understanding, not just solution.",
      pace: "Relaxed pace with deep discussion",
      expectations: [
        "Clear problem understanding",
        "Good communication skills",
        "Thoughtful approach to solutions",
        "Consider real-world applications",
        "Show growth mindset",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 85,
        tips: ["Foundation problems", "Know multiple approaches", "Consider edge cases"],
      },
      {
        pattern: "trees",
        frequency: 80,
        tips: ["Binary tree traversals", "BST operations", "Serialization"],
      },
      {
        pattern: "graphs",
        frequency: 70,
        tips: ["BFS/DFS applications", "Connected components", "Path finding"],
      },
      {
        pattern: "dp-1d",
        frequency: 65,
        tips: ["Focus on understanding", "Explain recurrence clearly", "Consider optimization"],
      },
      {
        pattern: "linked-list",
        frequency: 60,
        tips: ["Reversal techniques", "Cycle detection", "Merge operations"],
      },
    ],
    interviewProcess: [
      "Phone screen (1 hour)",
      "On-site: 4-5 interviews",
      "Mix of coding and design",
      "As Appropriate (AA) interview with hiring manager",
      "Collaborative culture emphasized",
    ],
    cultureTips: [
      "Growth mindset is core value",
      "Show collaboration skills",
      "Be open to learning",
      "Demonstrate empathy",
    ],
    commonQuestionTypes: [
      "Tree and graph problems",
      "Array manipulation",
      "String processing",
      "Linked list operations",
      "System design for Microsoft products",
    ],
    dosDonts: {
      dos: [
        "Ask thoughtful questions",
        "Discuss trade-offs openly",
        "Show willingness to learn",
        "Be collaborative",
        "Consider user experience",
      ],
      donts: [
        "Be arrogant about knowledge",
        "Refuse to accept feedback",
        "Ignore interviewer suggestions",
        "Rush to solution without discussion",
        "Forget to test your code",
      ],
    },
  },
  {
    companyId: "apple",
    companyName: "Apple",
    interviewStyle: {
      description:
        "Apple interviews focus on excellence and attention to detail. Expect deep technical questions and emphasis on quality.",
      pace: "Thorough and detail-oriented",
      expectations: [
        "High-quality, polished solutions",
        "Attention to detail",
        "Deep technical knowledge",
        "Consider user experience",
        "Excellence in everything",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 80,
        tips: ["Clean, efficient solutions", "Handle edge cases", "Consider memory"],
      },
      {
        pattern: "trees",
        frequency: 75,
        tips: ["Binary tree mastery", "Know all traversals", "Space optimization"],
      },
      {
        pattern: "graphs",
        frequency: 70,
        tips: ["Standard traversals", "Know common algorithms", "Consider efficiency"],
      },
      {
        pattern: "dp-1d",
        frequency: 65,
        tips: ["Clear state definition", "Explain transitions", "Optimize space"],
      },
      {
        pattern: "string",
        frequency: 60,
        tips: ["Parsing and validation", "Unicode awareness", "Edge cases"],
      },
    ],
    interviewProcess: [
      "Phone screen with recruiter",
      "Technical phone screen",
      "On-site: 5-6 interviews",
      "Heavy emphasis on team fit",
      "May include design review",
    ],
    cultureTips: [
      "Quality over quantity",
      "Attention to detail matters",
      "User experience focus",
      "Secrecy is valued",
    ],
    commonQuestionTypes: [
      "Array and string problems",
      "Tree manipulation",
      "Graph algorithms",
      "System design for Apple products",
      "Low-level systems knowledge",
    ],
    dosDonts: {
      dos: [
        "Show attention to detail",
        "Consider edge cases thoroughly",
        "Write clean, readable code",
        "Think about user experience",
        "Demonstrate passion",
      ],
      donts: [
        "Submit incomplete solutions",
        "Ignore code quality",
        "Be sloppy with details",
        "Forget about edge cases",
        "Show low standards",
      ],
    },
  },
  {
    companyId: "stripe",
    companyName: "Stripe",
    interviewStyle: {
      description:
        "Stripe interviews are practical and focus on real-world engineering. Expect debugging, code review, and practical system design.",
      pace: "Moderate with practical focus",
      expectations: [
        "Practical engineering skills",
        "Code review and debugging ability",
        "System design for payments",
        "API design knowledge",
        "Attention to edge cases",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 85,
        tips: ["Practical applications", "Data processing", "Edge case handling"],
      },
      {
        pattern: "string",
        frequency: 80,
        tips: ["Parsing and validation", "Format conversion", "API response handling"],
      },
      {
        pattern: "graphs",
        frequency: 65,
        tips: ["Dependency resolution", "Transaction graphs", "Cycle detection"],
      },
      {
        pattern: "dp-1d",
        frequency: 60,
        tips: ["Optimization problems", "Resource allocation", "Practical applications"],
      },
      {
        pattern: "intervals",
        frequency: 55,
        tips: ["Time-based problems", "Scheduling", "Rate limiting"],
      },
    ],
    interviewProcess: [
      "Recruiter call",
      "Phone screen with practical coding",
      "On-site: 4-5 rounds",
      "Includes debugging/code review",
      "API design interview",
    ],
    cultureTips: [
      "Rigor and reliability valued",
      "User-focused engineering",
      "Move fast with quality",
      "Transparency and openness",
    ],
    commonQuestionTypes: [
      "Practical coding problems",
      "Bug finding and debugging",
      "API design",
      "System design for payments",
      "Data structure choice",
    ],
    dosDonts: {
      dos: [
        "Think about edge cases",
        "Consider failure modes",
        "Design for reliability",
        "Write maintainable code",
        "Think about API consumers",
      ],
      donts: [
        "Ignore error handling",
        "Forget about edge cases",
        "Design without considering scale",
        "Skip input validation",
        "Ignore security concerns",
      ],
    },
  },
  {
    companyId: "netflix",
    companyName: "Netflix",
    interviewStyle: {
      description:
        "Netflix interviews focus on senior-level autonomy and technical depth. They value independent decision-makers who can drive complex technical projects without hand-holding.",
      pace: "Thorough with emphasis on depth",
      expectations: [
        "Deep technical expertise expected",
        "System design is heavily weighted",
        "Strong opinions, loosely held",
        "Demonstrate ownership and impact",
        "Expect discussion of scale (200M+ users)",
      ],
    },
    topPatterns: [
      {
        pattern: "graphs",
        frequency: 85,
        tips: [
          "Recommendation systems use graphs",
          "Know collaborative filtering basics",
          "Content delivery networks",
        ],
      },
      {
        pattern: "dp-2d",
        frequency: 80,
        tips: ["Video compression algorithms", "Caching optimization", "Resource allocation"],
      },
      {
        pattern: "arrays-hashing",
        frequency: 75,
        tips: ["Data processing at scale", "Efficient lookups", "Streaming data"],
      },
      {
        pattern: "trees",
        frequency: 70,
        tips: ["Decision trees for recommendations", "Hierarchical data", "Search optimization"],
      },
      {
        pattern: "heap-priority-queue",
        frequency: 65,
        tips: ["Top-K problems", "Trending content", "Priority scheduling"],
      },
    ],
    interviewProcess: [
      "Recruiter screen",
      "Phone screen with senior engineer",
      "On-site: 4-5 interviews",
      "Heavy system design focus",
      "Culture fit is critical (Freedom & Responsibility)",
    ],
    cultureTips: [
      "Freedom and Responsibility culture",
      "No vacation tracking - high trust",
      "Keeper test: would manager fight to keep you?",
      "Context over control",
      "Highly compensated, high expectations",
    ],
    commonQuestionTypes: [
      "Streaming data processing",
      "Recommendation algorithms",
      "Content delivery optimization",
      "System design for video streaming",
      "Distributed caching",
    ],
    dosDonts: {
      dos: [
        "Show independent decision-making",
        "Demonstrate impact at scale",
        "Have strong technical opinions",
        "Think about global distribution",
        "Consider user experience",
      ],
      donts: [
        "Need hand-holding",
        "Avoid taking ownership",
        "Give generic answers",
        "Ignore scale considerations",
        "Be risk-averse",
      ],
    },
  },
  {
    companyId: "uber",
    companyName: "Uber",
    interviewStyle: {
      description:
        "Uber interviews focus on real-time systems and optimization problems. Expect questions about matching, routing, and handling high-volume concurrent operations.",
      pace: "Fast-paced with practical focus",
      expectations: [
        "Strong algorithmic foundation",
        "Experience with real-time systems",
        "Understanding of distributed systems",
        "Optimization mindset",
        "Handle ambiguity well",
      ],
    },
    topPatterns: [
      {
        pattern: "graphs",
        frequency: 90,
        tips: ["Routing and navigation", "Shortest path critical", "Real-time graph updates"],
      },
      {
        pattern: "heap-priority-queue",
        frequency: 85,
        tips: ["Driver matching", "Surge pricing", "ETA calculations"],
      },
      {
        pattern: "arrays-hashing",
        frequency: 80,
        tips: ["Geohashing for location", "Efficient lookups", "Rate limiting"],
      },
      {
        pattern: "sliding-window",
        frequency: 70,
        tips: ["Surge detection", "Moving averages", "Time-based windows"],
      },
      {
        pattern: "greedy",
        frequency: 65,
        tips: ["Matching optimization", "Resource allocation", "Scheduling"],
      },
    ],
    interviewProcess: [
      "Recruiter call",
      "Technical phone screen (45 min)",
      "On-site: 4-5 rounds",
      "Includes system design",
      "Behavioral with values focus",
    ],
    cultureTips: [
      "Move fast, act like an owner",
      "Data-driven decision making",
      "Global mindset",
      "Safety is paramount",
    ],
    commonQuestionTypes: [
      "Real-time matching systems",
      "Route optimization",
      "Surge pricing algorithms",
      "Geolocation problems",
      "Distributed system design",
    ],
    dosDonts: {
      dos: [
        "Think about real-time constraints",
        "Consider geographic distribution",
        "Design for failure",
        "Optimize for latency",
        "Show product thinking",
      ],
      donts: [
        "Ignore concurrency issues",
        "Forget about mobile constraints",
        "Design without considering scale",
        "Overlook safety concerns",
        "Ignore edge cases in matching",
      ],
    },
  },
  {
    companyId: "airbnb",
    companyName: "Airbnb",
    interviewStyle: {
      description:
        "Airbnb interviews emphasize product sense and engineering craft. They look for engineers who can build delightful user experiences with solid technical foundations.",
      pace: "Moderate with emphasis on craft",
      expectations: [
        "Strong product intuition",
        "Clean, maintainable code",
        "User experience focus",
        "Cross-functional collaboration",
        "Full-stack thinking",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 85,
        tips: ["Search and filtering", "Availability calendars", "Booking systems"],
      },
      {
        pattern: "graphs",
        frequency: 80,
        tips: ["Social connections", "Location relationships", "Trust networks"],
      },
      {
        pattern: "intervals",
        frequency: 75,
        tips: ["Booking availability", "Calendar operations", "Date range queries"],
      },
      {
        pattern: "dp-1d",
        frequency: 70,
        tips: ["Pricing optimization", "Search ranking", "Resource allocation"],
      },
      {
        pattern: "string",
        frequency: 65,
        tips: ["Search parsing", "Input validation", "Internationalization"],
      },
    ],
    interviewProcess: [
      "Recruiter screen",
      "Phone screen (coding)",
      "On-site: 5 interviews",
      "Cross-functional + architecture",
      "Core values assessment",
    ],
    cultureTips: [
      "Belong Anywhere - core mission",
      "Design thinking valued",
      "Host and guest perspective",
      "Community-focused",
    ],
    commonQuestionTypes: [
      "Search and ranking",
      "Calendar/booking systems",
      "Review and rating systems",
      "Payment processing",
      "Trust and safety",
    ],
    dosDonts: {
      dos: [
        "Consider both hosts and guests",
        "Think about trust and safety",
        "Design delightful experiences",
        "Show craft in code",
        "Consider global users",
      ],
      donts: [
        "Ignore user experience",
        "Write hacky solutions",
        "Forget about edge cases",
        "Overlook internationalization",
        "Ignore safety concerns",
      ],
    },
  },
  {
    companyId: "linkedin",
    companyName: "LinkedIn",
    interviewStyle: {
      description:
        "LinkedIn interviews focus on graph problems and data-intensive applications. Strong emphasis on system design for professional networks and data processing.",
      pace: "Moderate with deep technical discussion",
      expectations: [
        "Graph algorithms expertise",
        "Data processing at scale",
        "System design skills",
        "Understanding of social networks",
        "Clear communication",
      ],
    },
    topPatterns: [
      {
        pattern: "graphs",
        frequency: 95,
        tips: ["Connection recommendations", "Degrees of separation", "Network analysis"],
      },
      {
        pattern: "arrays-hashing",
        frequency: 85,
        tips: ["Profile matching", "Search optimization", "Skill matching"],
      },
      {
        pattern: "dp-1d",
        frequency: 70,
        tips: ["Feed ranking", "Job matching", "Engagement optimization"],
      },
      {
        pattern: "trees",
        frequency: 65,
        tips: ["Organizational hierarchies", "Skill taxonomies", "Search trees"],
      },
      {
        pattern: "heap-priority-queue",
        frequency: 60,
        tips: ["Feed generation", "Top-K connections", "Notification priority"],
      },
    ],
    interviewProcess: [
      "Recruiter call",
      "Technical phone screen",
      "On-site: 4 rounds",
      "System design + coding",
      "Values interview (REACH)",
    ],
    cultureTips: [
      "REACH values: Results, Engagement, Authenticity, Courage, Humanity",
      "Member-first thinking",
      "Create economic opportunity",
      "Long-term relationship focus",
    ],
    commonQuestionTypes: [
      "Graph traversal and analysis",
      "Recommendation systems",
      "Search and matching",
      "News feed generation",
      "Data processing pipelines",
    ],
    dosDonts: {
      dos: [
        "Understand graph algorithms deeply",
        "Think about professional context",
        "Consider data at scale",
        "Design for engagement",
        "Show member empathy",
      ],
      donts: [
        "Ignore graph relationships",
        "Forget about privacy",
        "Overlook spam/abuse",
        "Design without scale in mind",
        "Ignore data quality",
      ],
    },
  },
  {
    companyId: "lyft",
    companyName: "Lyft",
    interviewStyle: {
      description:
        "Lyft interviews are similar to Uber but with stronger emphasis on collaboration and user safety. Focus on real-time systems and optimization.",
      pace: "Moderate with collaborative approach",
      expectations: [
        "Strong algorithmic skills",
        "Real-time systems experience",
        "Safety-first mindset",
        "Collaborative approach",
        "Product thinking",
      ],
    },
    topPatterns: [
      {
        pattern: "graphs",
        frequency: 90,
        tips: ["Route optimization", "Map algorithms", "Real-time updates"],
      },
      {
        pattern: "heap-priority-queue",
        frequency: 85,
        tips: ["Driver matching", "ETAs", "Dynamic pricing"],
      },
      {
        pattern: "arrays-hashing",
        frequency: 80,
        tips: ["Geolocation", "Caching", "Rate limiting"],
      },
      {
        pattern: "sliding-window",
        frequency: 70,
        tips: ["Demand prediction", "Surge detection", "Time windows"],
      },
      { pattern: "greedy", frequency: 65, tips: ["Matching", "Scheduling", "Resource allocation"] },
    ],
    interviewProcess: [
      "Phone screen",
      "Technical interview",
      "On-site: 4-5 rounds",
      "System design",
      "Values interview",
    ],
    cultureTips: [
      "Safety is non-negotiable",
      "Collaborative culture",
      "Community impact",
      "Sustainable transportation",
    ],
    commonQuestionTypes: [
      "Matching algorithms",
      "Route optimization",
      "Real-time systems",
      "Geolocation problems",
      "Safety systems",
    ],
    dosDonts: {
      dos: [
        "Prioritize safety",
        "Think collaboratively",
        "Consider rider and driver",
        "Optimize for experience",
        "Design for reliability",
      ],
      donts: [
        "Ignore safety concerns",
        "Over-engineer solutions",
        "Forget about edge cases",
        "Ignore user experience",
        "Design in isolation",
      ],
    },
  },
  {
    companyId: "veeva",
    companyName: "Veeva Systems",
    interviewStyle: {
      description:
        "Veeva interviews focus on enterprise software and life sciences domain. Strong emphasis on data integrity, compliance, and scalable cloud solutions. Java and Spring Boot are primary for backend roles, but Python and JavaScript are accepted for certain positions (data engineering, frontend, automation). Expect a mix of LeetCode-style coding (2 Easy, 1 Medium, 1 Hard typical distribution) and behavioral questions.",
      pace: "Methodical with domain focus, 17-32 days average process",
      expectations: [
        "Clean, maintainable code (Java preferred, Python/JavaScript for specific roles)",
        "Understanding of enterprise systems and Spring Boot",
        "Data integrity and compliance focus",
        "AWS cloud services knowledge (Lambda, ECS, Fargate, RDS)",
        "Life sciences domain interest appreciated",
        "SQL proficiency for data queries",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 85,
        tips: [
          "Data validation and lookup optimization",
          "Product of array except self is common",
          "Subarray sum problems frequent",
        ],
      },
      {
        pattern: "string",
        frequency: 80,
        tips: [
          "Valid parentheses/well-formed brackets very common",
          "Longest substring without repeating characters",
          "Document parsing and validation rules",
        ],
      },
      {
        pattern: "trees",
        frequency: 70,
        tips: [
          "Binary tree comparison (check if identical)",
          "Hierarchical document structure",
          "Organization trees and approval hierarchies",
        ],
      },
      {
        pattern: "graphs",
        frequency: 65,
        tips: [
          "Workflow systems and approval chains",
          "Dependency tracking",
          "BFS/DFS fundamentals",
        ],
      },
      {
        pattern: "binary-search",
        frequency: 60,
        tips: ["Search in sorted data", "Efficient lookups", "Common in coding assessments"],
      },
    ],
    interviewProcess: [
      "HR/Recruiter screen (30 min) - behavioral vibe check",
      "Online Assessment: 3-4 LeetCode problems in 60 min (Java preferred)",
      "Hiring Manager technical screen (45-60 min) - debugging + discussion",
      "Team Day: 4-5 hour final round with multiple interviewers",
      "Mix of 2 technical rounds + 2 behavioral rounds",
    ],
    cultureTips: [
      "Do the Right Thing - core value, emphasize in answers",
      "Customer Success - show user-centric thinking",
      "Employee Success - collaborative team player",
      "Speed - move efficiently but maintain quality",
      "Work-life balance genuinely valued",
      "Long-term thinking over quick wins",
    ],
    commonQuestionTypes: [
      "Valid parentheses and bracket matching",
      "Binary tree operations and comparison",
      "Substring problems (longest without repeating chars)",
      "SQL queries (second highest salary with ties)",
      "Data modeling and validation",
      "API design for enterprise systems",
      "Cloud architecture (AWS focused)",
    ],
    dosDonts: {
      dos: [
        "Focus on data integrity and audit trails",
        "Show understanding of compliance requirements (FDA, life sciences)",
        "Write clean, well-documented Java code",
        "Demonstrate AWS cloud knowledge",
        "Express genuine interest in life sciences/pharma domain",
        "Prepare STAR format stories aligned with core values",
      ],
      donts: [
        "Ignore edge cases in data handling",
        "Skip input validation or error handling",
        "Overlook audit and compliance requirements",
        "Design without considering enterprise scale",
        "Be unfamiliar with Spring Boot basics",
        "Neglect to research Veeva products (CRM, Vault, OpenData)",
      ],
    },
  },
  {
    companyId: "doordash",
    companyName: "DoorDash",
    interviewStyle: {
      description:
        "DoorDash interviews focus on logistics optimization and real-time delivery systems. Strong emphasis on three-sided marketplace dynamics.",
      pace: "Fast-paced with practical problems",
      expectations: [
        "Strong algorithmic skills",
        "Real-time systems experience",
        "Optimization mindset",
        "Product thinking",
        "Understand marketplace dynamics",
      ],
    },
    topPatterns: [
      {
        pattern: "graphs",
        frequency: 90,
        tips: ["Delivery routing", "Restaurant clustering", "Driver assignment"],
      },
      {
        pattern: "heap-priority-queue",
        frequency: 85,
        tips: ["Order prioritization", "Driver matching", "ETA prediction"],
      },
      { pattern: "arrays-hashing", frequency: 80, tips: ["Menu search", "Geolocation", "Caching"] },
      {
        pattern: "greedy",
        frequency: 75,
        tips: ["Batching orders", "Route optimization", "Resource allocation"],
      },
      {
        pattern: "sliding-window",
        frequency: 65,
        tips: ["Demand forecasting", "Surge detection", "Time windows"],
      },
    ],
    interviewProcess: [
      "Recruiter call",
      "Technical phone screen",
      "On-site: 4-5 rounds",
      "System design critical",
      "Values interview",
    ],
    cultureTips: [
      "Be an owner",
      "Operate at the lowest level of detail",
      "Customer obsessed",
      "Bias for action",
    ],
    commonQuestionTypes: [
      "Delivery optimization",
      "Matching algorithms",
      "Real-time tracking",
      "Demand prediction",
      "Marketplace balancing",
    ],
    dosDonts: {
      dos: [
        "Think about all three sides (customer, dasher, merchant)",
        "Optimize for real-time",
        "Consider geographic constraints",
        "Design for scale",
        "Show ownership",
      ],
      donts: [
        "Ignore marketplace dynamics",
        "Forget about dasher experience",
        "Overlook restaurant constraints",
        "Design without scale in mind",
        "Be passive about problems",
      ],
    },
  },
  {
    companyId: "robinhood",
    companyName: "Robinhood",
    interviewStyle: {
      description:
        "Robinhood interviews focus on financial systems, real-time data processing, and high-reliability systems. Strong emphasis on security and compliance.",
      pace: "Moderate with emphasis on correctness",
      expectations: [
        "Strong algorithmic foundation",
        "Understanding of financial systems",
        "Real-time processing experience",
        "Security awareness",
        "High reliability mindset",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 90,
        tips: ["Order book management", "Price lookups", "Portfolio calculations"],
      },
      {
        pattern: "heap-priority-queue",
        frequency: 80,
        tips: ["Order matching", "Price feeds", "Alert systems"],
      },
      {
        pattern: "sliding-window",
        frequency: 75,
        tips: ["Stock price analysis", "Trading windows", "Rate limiting"],
      },
      {
        pattern: "dp-1d",
        frequency: 70,
        tips: ["Profit calculations", "Risk analysis", "Portfolio optimization"],
      },
      {
        pattern: "graphs",
        frequency: 60,
        tips: ["Market relationships", "User connections", "Transaction flows"],
      },
    ],
    interviewProcess: [
      "Recruiter screen",
      "Technical phone interview",
      "On-site: 4-5 rounds",
      "System design + coding",
      "Values alignment",
    ],
    cultureTips: [
      "Democratize finance for all",
      "Safety first mentality",
      "Move fast but safely",
      "Customer trust is paramount",
    ],
    commonQuestionTypes: [
      "Real-time data processing",
      "Order matching systems",
      "Price feed handling",
      "Portfolio calculations",
      "High-availability systems",
    ],
    dosDonts: {
      dos: [
        "Prioritize correctness",
        "Think about edge cases",
        "Consider security implications",
        "Design for high availability",
        "Understand financial concepts",
      ],
      donts: [
        "Ignore precision errors",
        "Forget about race conditions",
        "Overlook security",
        "Design without compliance in mind",
        "Be cavalier about money",
      ],
    },
  },
  {
    companyId: "instacart",
    companyName: "Instacart",
    interviewStyle: {
      description:
        "Instacart interviews focus on logistics, grocery retail, and real-time inventory systems. Strong emphasis on optimization and customer experience.",
      pace: "Moderate with focus on practical problems",
      expectations: [
        "Strong algorithmic skills",
        "Understanding of logistics challenges",
        "Customer-centric thinking",
        "Scalability awareness",
        "Real-time systems knowledge",
      ],
    },
    topPatterns: [
      {
        pattern: "graphs",
        frequency: 85,
        tips: ["Shopping route optimization", "Store mapping", "Delivery routing"],
      },
      {
        pattern: "greedy",
        frequency: 80,
        tips: ["Item substitution", "Batch optimization", "Shopper assignment"],
      },
      {
        pattern: "arrays-hashing",
        frequency: 80,
        tips: ["Inventory lookups", "Product matching", "Search optimization"],
      },
      {
        pattern: "heap-priority-queue",
        frequency: 70,
        tips: ["Order prioritization", "Delivery scheduling", "Time slot management"],
      },
      {
        pattern: "sliding-window",
        frequency: 60,
        tips: ["Demand forecasting", "Availability windows", "Time-based queries"],
      },
    ],
    interviewProcess: [
      "Recruiter screen",
      "Technical phone interview",
      "On-site: 4 rounds",
      "System design + coding",
      "Values discussion",
    ],
    cultureTips: [
      "Customer obsession",
      "Shopper experience matters",
      "Retail domain knowledge valued",
      "Speed and reliability focus",
    ],
    commonQuestionTypes: [
      "Route optimization",
      "Inventory management",
      "Real-time availability",
      "Substitution algorithms",
      "Batch processing",
    ],
    dosDonts: {
      dos: [
        "Think about all stakeholders (customer, shopper, retailer)",
        "Consider inventory constraints",
        "Optimize for real-world scenarios",
        "Design for scale",
        "Focus on reliability",
      ],
      donts: [
        "Ignore shopper experience",
        "Forget about inventory accuracy",
        "Overlook substitution logic",
        "Design without considering real-time updates",
        "Neglect customer preferences",
      ],
    },
  },
  {
    companyId: "square",
    companyName: "Square (Block)",
    interviewStyle: {
      description:
        "Square interviews focus on payments, fintech, and merchant solutions. Strong emphasis on reliability, security, and economic empowerment.",
      pace: "Methodical with focus on correctness",
      expectations: [
        "Strong fundamentals",
        "Understanding of payments",
        "Security awareness",
        "Reliability mindset",
        "Clean, maintainable code",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 90,
        tips: ["Transaction processing", "Merchant lookups", "Payment validation"],
      },
      {
        pattern: "trees",
        frequency: 80,
        tips: ["Hierarchical data", "Account structures", "Menu organization"],
      },
      {
        pattern: "dp-1d",
        frequency: 70,
        tips: ["Financial calculations", "Fee optimization", "Settlement logic"],
      },
      {
        pattern: "graphs",
        frequency: 65,
        tips: ["Transaction flows", "Fraud detection", "Money movement"],
      },
      {
        pattern: "string",
        frequency: 60,
        tips: ["Receipt parsing", "Data validation", "API handling"],
      },
    ],
    interviewProcess: [
      "Recruiter call",
      "Technical phone screen",
      "On-site: 4 rounds",
      "Coding + system design",
      "Values interview",
    ],
    cultureTips: [
      "Economic empowerment mission",
      "Merchant success focus",
      "Design for reliability",
      "Security is non-negotiable",
    ],
    commonQuestionTypes: [
      "Payment processing",
      "Transaction handling",
      "Inventory management",
      "Financial calculations",
      "API design",
    ],
    dosDonts: {
      dos: [
        "Think about failure scenarios",
        "Prioritize correctness over speed",
        "Consider security implications",
        "Design for auditability",
        "Think about merchant experience",
      ],
      donts: [
        "Ignore edge cases in money handling",
        "Forget about idempotency",
        "Overlook compliance requirements",
        "Design without considering failures",
        "Be imprecise with financial data",
      ],
    },
  },
  {
    companyId: "figma",
    companyName: "Figma",
    interviewStyle: {
      description:
        "Figma interviews focus on real-time collaboration, design tools, and creative applications. Strong emphasis on user experience and technical excellence.",
      pace: "Thoughtful with emphasis on design thinking",
      expectations: [
        "Strong algorithmic skills",
        "Understanding of real-time systems",
        "Design sensibility",
        "Collaboration focus",
        "User experience awareness",
      ],
    },
    topPatterns: [
      {
        pattern: "trees",
        frequency: 90,
        tips: ["Document structure", "Layer hierarchy", "Component trees"],
      },
      {
        pattern: "graphs",
        frequency: 85,
        tips: ["Constraint systems", "Object relationships", "Dependency graphs"],
      },
      {
        pattern: "arrays-hashing",
        frequency: 80,
        tips: ["Object lookups", "State management", "Caching"],
      },
      {
        pattern: "bfs",
        frequency: 70,
        tips: ["Layer traversal", "Selection expansion", "Nearest neighbor"],
      },
      {
        pattern: "string",
        frequency: 60,
        tips: ["Text rendering", "Font handling", "Search functionality"],
      },
    ],
    interviewProcess: [
      "Recruiter screen",
      "Technical phone interview",
      "On-site: 4-5 rounds",
      "Coding + practical design",
      "Culture fit discussion",
    ],
    cultureTips: [
      "Design excellence matters",
      "Collaborative by default",
      "User experience first",
      "Technical craft valued",
    ],
    commonQuestionTypes: [
      "Real-time collaboration (CRDTs)",
      "Canvas rendering",
      "Undo/redo systems",
      "Constraint solving",
      "Tree manipulation",
    ],
    dosDonts: {
      dos: [
        "Think about user experience",
        "Consider real-time implications",
        "Design for collaboration",
        "Focus on performance",
        "Show design sensibility",
      ],
      donts: [
        "Ignore edge cases in collaboration",
        "Forget about conflict resolution",
        "Overlook performance for large documents",
        "Design without considering UX",
        "Be dismissive of design discussions",
      ],
    },
  },
  // New companies - Gaming, Social, and Enterprise (Popular for Interns)
  {
    companyId: "roblox",
    companyName: "Roblox",
    interviewStyle: {
      description:
        "Roblox interviews focus on practical game development problems and clean code. Questions are often placed in 3D simulation and multiplayer game context. They prioritize readable, maintainable code over clever solutions.",
      pace: "Moderate pace with emphasis on code quality",
      expectations: [
        "Clean, readable code is paramount",
        "Test cases and compilation required",
        "Game simulation context for problems",
        "Recursion and state management focus",
        "C++, Luau, or systems-level languages preferred",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 90,
        tips: ["Event queue management", "Player data lookups", "State caching"],
      },
      {
        pattern: "string",
        frequency: 85,
        tips: ["Serialization problems", "Game state encoding", "Protocol handling"],
      },
      {
        pattern: "dp-1d",
        frequency: 75,
        tips: ["Resource optimization", "Path finding variants", "Game progression"],
      },
      {
        pattern: "graphs",
        frequency: 70,
        tips: ["Player matching", "World connectivity", "Social network features"],
      },
    ],
    interviewProcess: [
      "Recruiter call + CodeSignal assessment",
      "Technical coding round (LeetCode medium, recursion focus)",
      "Practical coding (game simulation problems)",
      "Culture fit + technical discussion",
    ],
    cultureTips: [
      "Show passion for games and virtual worlds",
      "Understand UGC (user-generated content) platforms",
      "Clean coding practices are essential",
      "Interest in metaverse and social gaming",
      "Community-first mindset",
    ],
    commonQuestionTypes: [
      "Player skill-based matching/pairing",
      "Object pooling (bullets, NPCs)",
      "Event queue simulation",
      "Serialize/deserialize game state",
      "State management problems",
    ],
    dosDonts: {
      dos: [
        "Write clean, readable code",
        "Compile and test your code",
        "Explain your game-related context",
        "Show understanding of real-time systems",
        "Demonstrate recursion mastery",
      ],
      donts: [
        "Write clever but unreadable code",
        "Skip test cases",
        "Ignore edge cases in simulation",
        "Forget about state management",
        "Overlook performance in real-time context",
      ],
    },
  },
  {
    companyId: "tiktok",
    companyName: "TikTok (ByteDance)",
    interviewStyle: {
      description:
        "TikTok/ByteDance interviews are considered among the hardest in the industry, often harder than FAANG. Expect 6 questions in 2 hours during OA, and heavy dynamic programming focus. Speed and optimal solutions are critical.",
      pace: "Very fast-paced, 2 problems per technical round",
      expectations: [
        "Questions harder than FAANG",
        "Optimal solutions required",
        "Heavy DP and graph focus",
        "Speed is critical (6 questions in 2 hours OA)",
        "Strong time/space complexity optimization",
      ],
    },
    topPatterns: [
      {
        pattern: "dp-1d",
        frequency: 90,
        tips: ["Gas station variants", "Optimization problems", "State compression"],
      },
      {
        pattern: "dp-2d",
        frequency: 85,
        tips: ["Matrix problems", "String matching DP", "Game theory"],
      },
      {
        pattern: "graphs",
        frequency: 80,
        tips: ["Complex traversals", "Shortest path variants", "Network flow"],
      },
      {
        pattern: "trees",
        frequency: 75,
        tips: ["Construct from traversals", "Tree DP", "Binary tree operations"],
      },
    ],
    interviewProcess: [
      "HackerRank OA - 6 questions in 2 hours",
      "Technical round 1 - 2 LeetCode problems",
      "Technical round 2 - System/implementation",
      "Behavioral + culture fit",
    ],
    cultureTips: [
      "Always Day 1 - startup mentality",
      "Be Candid and Clear - direct communication",
      "Seek Truth and Be Pragmatic",
      "Aim for the Highest - excellence focus",
      "Global scale thinking",
    ],
    commonQuestionTypes: [
      "Daily Temperatures (stack)",
      "Construct Binary Tree from traversals",
      "Gas Station variants (DP)",
      "Promise.all implementation",
      "Recommendation system design",
    ],
    dosDonts: {
      dos: [
        "Practice speed - time management is key",
        "Master dynamic programming",
        "Understand pattern recognition",
        "Optimize for time/space complexity",
        "Show global scale thinking",
      ],
      donts: [
        "Expect hints - they don't provide them",
        "Give suboptimal solutions",
        "Underestimate difficulty",
        "Ignore optimization follow-ups",
        "Be unprepared for hard problems",
      ],
    },
  },
  {
    companyId: "nvidia",
    companyName: "NVIDIA",
    interviewStyle: {
      description:
        "NVIDIA interviews combine CS fundamentals (OS, DBMS, COA) with coding. OA includes 25 MCQs plus coding. C/C++ is often required, and GPU/CUDA knowledge is valued. Strong emphasis on memory and parallel computing.",
      pace: "Moderate pace with theory emphasis",
      expectations: [
        "Strong CS fundamentals (OS, DBMS, COA)",
        "C/C++ proficiency often required",
        "GPU architecture understanding valued",
        "Memory and cache optimization awareness",
        "Threading and concurrency knowledge",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 85,
        tips: ["Memory access patterns", "Cache optimization", "Parallel array ops"],
      },
      {
        pattern: "trees",
        frequency: 80,
        tips: ["Binary tree depth", "Traversal optimizations", "Memory layout"],
      },
      {
        pattern: "bit-manipulation",
        frequency: 60,
        tips: ["Power of two checks", "Binary operations", "Bit masking"],
      },
      {
        pattern: "two-pointers",
        frequency: 70,
        tips: ["Dutch National Flag", "Partition algorithms", "Sort optimization"],
      },
    ],
    interviewProcess: [
      "OA: 25 MCQs (CS fundamentals) + 1 coding",
      "Technical round with LeetCode medium",
      "Hiring manager + technical discussion",
    ],
    cultureTips: [
      "Show passion for GPU computing and AI",
      "Demonstrate CS fundamentals mastery",
      "Understand parallel computing concepts",
      "Show interest in hardware-software integration",
      "Performance optimization mindset",
    ],
    commonQuestionTypes: [
      "Sort Colors (Dutch National Flag)",
      "Two Sum and variants",
      "Binary tree depth/operations",
      "Regex for binary patterns",
      "Trie implementation",
      "Semaphore/threading problems",
    ],
    dosDonts: {
      dos: [
        "Review CS fundamentals (OS, DBMS, COA)",
        "Practice C/C++ coding",
        "Learn GPU architecture basics",
        "Understand memory access patterns",
        "Know threading/concurrency",
      ],
      donts: [
        "Ignore MCQ preparation",
        "Skip CS theory review",
        "Be unfamiliar with C/C++",
        "Overlook parallel computing",
        "Forget about cache optimization",
      ],
    },
  },
  {
    companyId: "salesforce",
    companyName: "Salesforce",
    interviewStyle: {
      description:
        "Salesforce interviews focus on practical OOP skills and data manipulation over complex algorithms. Questions are typically easy to medium difficulty. Strong emphasis on HashMaps, Trees, and Graphs. Futureforce program for interns.",
      pace: "Moderate pace with OOP emphasis",
      expectations: [
        "Strong OOP fundamentals",
        "Practical data manipulation",
        "Easy to medium LeetCode difficulty",
        "Project discussion important",
        "Collaboration and values focus",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 90,
        tips: ["HashMap solutions", "Data lookup optimization", "Practical data problems"],
      },
      {
        pattern: "trees",
        frequency: 80,
        tips: ["BST operations", "Traversal variations", "Hierarchy problems"],
      },
      {
        pattern: "graphs",
        frequency: 75,
        tips: ["Number of Islands", "BFS/DFS applications", "Connected components"],
      },
      {
        pattern: "string",
        frequency: 70,
        tips: ["Dictionary problems", "Validation", "Parsing"],
      },
    ],
    interviewProcess: [
      "HackerRank OA - 2 questions in 1 hour",
      "Technical round - DSA + OOP",
      "Technical round 2 - System discussion",
      "Hiring manager + values",
    ],
    cultureTips: [
      "Trust is Salesforce's #1 value",
      "Customer Success is paramount",
      "Show commitment to Equality",
      "Demonstrate innovative thinking",
      "Ohana (family) culture mindset",
    ],
    commonQuestionTypes: [
      "Number of Islands",
      "Longest Common Subsequence",
      "Valid Words from Dictionary",
      "Snake and Ladder (BFS)",
      "Binary Search variations",
    ],
    dosDonts: {
      dos: [
        "Master OOP concepts",
        "Practice HashMap problems",
        "Prepare strong project stories",
        "Show customer-centric thinking",
        "Demonstrate collaborative mindset",
      ],
      donts: [
        "Ignore OOP fundamentals",
        "Over-complicate solutions",
        "Skip project discussion prep",
        "Underestimate values interview",
        "Be unfamiliar with CRM concepts",
      ],
    },
  },
  {
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
  },
  {
    companyId: "pinterest",
    companyName: "Pinterest",
    interviewStyle: {
      description:
        "Pinterest interviews focus on visual discovery and recommendation systems. Phone screen may include LeetCode hard problems. Strong emphasis on edge cases and complexity analysis. Interviewers are generally helpful.",
      pace: "Moderate pace with edge case focus",
      expectations: [
        "Edge case discussion expected",
        "Time/space complexity analysis required",
        "May include LeetCode hard",
        "Visual discovery domain focus",
        "User-centric thinking valued",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 90,
        tips: ["Search optimization", "Filtering", "Caching"],
      },
      {
        pattern: "graphs",
        frequency: 85,
        tips: ["Recommendation graphs", "Social connections", "Image relationships"],
      },
      {
        pattern: "trees",
        frequency: 80,
        tips: ["Category hierarchies", "Search trees", "Decision trees"],
      },
      {
        pattern: "binary-search",
        frequency: 70,
        tips: ["Efficient lookups", "Boundary finding", "Search optimization"],
      },
    ],
    interviewProcess: [
      "Technical phone screen",
      "Coding round - arrays and algorithms",
      "Coding round 2",
      "System design (L4/L5+)",
    ],
    cultureTips: [
      "Put Pinners First - users are priority",
      "Be Authentic - be yourself",
      "Create Belonging - inclusive environment",
      "Act as an Owner - take responsibility",
      "Visual inspiration focus",
    ],
    commonQuestionTypes: [
      "Array manipulation problems",
      "Image search system design",
      "Recommendation feed design",
      "Graph traversal problems",
    ],
    dosDonts: {
      dos: [
        "Discuss edge cases thoroughly",
        "Analyze time/space complexity",
        "Show user-centric thinking",
        "Understand visual discovery",
        "Be prepared for hard problems",
      ],
      donts: [
        "Skip edge case discussion",
        "Ignore complexity analysis",
        "Forget about visual content",
        "Be dismissive of Pinterest's mission",
        "Underestimate phone screen difficulty",
      ],
    },
  },
  {
    companyId: "reddit",
    companyName: "Reddit",
    interviewStyle: {
      description:
        "Reddit interviews focus on LeetCode medium problems with system design for scalable community platforms. Present brute-force first, then optimize. Strong emphasis on community and social platform thinking.",
      pace: "Moderate pace with optimization focus",
      expectations: [
        "LeetCode medium focus",
        "Brute-force to optimal progression",
        "System design for high traffic",
        "Community-focused thinking",
        "Runtime/space complexity discussion",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 90,
        tips: ["Content indexing", "User data lookup", "Vote counting"],
      },
      {
        pattern: "graphs",
        frequency: 80,
        tips: ["Subreddit relationships", "User connections", "Content discovery"],
      },
      {
        pattern: "trees",
        frequency: 75,
        tips: ["Comment threads", "Category hierarchies", "Search structures"],
      },
      {
        pattern: "sliding-window",
        frequency: 60,
        tips: ["Trending content", "Time-based queries", "Activity windows"],
      },
    ],
    interviewProcess: [
      "Recruiter screen",
      "Technical phone - coding + problem solving",
      "System design with senior engineers",
      "Behavioral - teamwork and communication",
    ],
    cultureTips: [
      "Community First - empower communities",
      "Be Direct - honest communication",
      "Simplify - reduce complexity",
      "Show passion for online communities",
      "Understand content moderation challenges",
    ],
    commonQuestionTypes: [
      "LRU Cache",
      "Feed system design",
      "Voting system design",
      "Graph traversal",
    ],
    dosDonts: {
      dos: [
        "Present brute-force first, then optimize",
        "Discuss runtime/space complexity",
        "Show community platform understanding",
        "Design for high traffic scale",
        "Be direct and collaborative",
      ],
      donts: [
        "Jump to optimal without progression",
        "Skip complexity analysis",
        "Ignore content moderation aspects",
        "Design without considering scale",
        "Be unfamiliar with Reddit's structure",
      ],
    },
  },
  {
    companyId: "atlassian",
    companyName: "Atlassian",
    interviewStyle: {
      description:
        "Atlassian interviews are practical with easy-medium difficulty. Unique aspect: you code on your own laptop locally. Values interview is important. Focus on HashMaps and creating classes.",
      pace: "Moderate pace with practical focus",
      expectations: [
        "Easy-medium LeetCode difficulty",
        "Code on your own laptop locally",
        "Values interview is critical",
        "HashMaps and class design focus",
        "Clean code principles valued",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 90,
        tips: ["HashMap-based solutions", "Data counting", "Lookup optimization"],
      },
      {
        pattern: "string",
        frequency: 80,
        tips: ["String manipulation", "Parsing", "Pattern matching"],
      },
      {
        pattern: "intervals",
        frequency: 60,
        tips: ["Meeting overlap", "Calendar problems", "Time scheduling"],
      },
      {
        pattern: "trees",
        frequency: 75,
        tips: ["Hierarchy structures", "Project trees", "Organization charts"],
      },
    ],
    interviewProcess: [
      "HackerRank OA - 2 questions (easy/medium)",
      "Technical screen (code on your laptop)",
      "Values interview",
    ],
    cultureTips: [
      "Open Company, No Bullshit - transparency",
      "Build with Heart and Balance",
      "Don't F*** the Customer",
      "Play as a Team - collaboration",
      "Be the Change You Seek",
    ],
    commonQuestionTypes: [
      "Meeting Time Overlap",
      "Longest Common Subsequence",
      "Custom Data Structures",
      "Array/String Manipulation",
    ],
    dosDonts: {
      dos: [
        "Practice HashMaps extensively",
        "Create clean classes in code",
        "Review Atlassian values beforehand",
        "Be comfortable coding locally",
        "Show team collaboration mindset",
      ],
      donts: [
        "Ignore values interview prep",
        "Write messy code without structure",
        "Be unfamiliar with Jira/Confluence",
        "Skip class design patterns",
        "Forget transparency in communication",
      ],
    },
  },
  {
    companyId: "oracle",
    companyName: "Oracle",
    interviewStyle: {
      description:
        "Oracle interviews heavily emphasize Java and OOP. SQL questions are common (Nth highest salary). Strong CS fundamentals (OS, DBMS) tested. Enterprise software mindset expected.",
      pace: "Moderate pace with theory emphasis",
      expectations: [
        "Java knowledge essential",
        "OOP concepts (SOLID, design patterns)",
        "SQL proficiency required",
        "CS fundamentals (OS, DBMS) tested",
        "Enterprise software understanding",
      ],
    },
    topPatterns: [
      {
        pattern: "linked-list",
        frequency: 75,
        tips: ["Cycle detection", "List operations", "Add numbers via lists"],
      },
      {
        pattern: "arrays-hashing",
        frequency: 85,
        tips: ["Missing number", "First duplicate", "Data validation"],
      },
      {
        pattern: "dp-1d",
        frequency: 55,
        tips: ["Coin change", "Classic DP problems", "Optimization"],
      },
      {
        pattern: "graphs",
        frequency: 60,
        tips: ["Dijkstra variants", "Shortest path", "Graph connectivity"],
      },
    ],
    interviewProcess: [
      "Technical screen - experience + theory",
      "Technical coding - DSA + fundamentals",
      "Technical round 2 with LeetCode problem",
    ],
    cultureTips: [
      "Database expertise is valued",
      "Java and JVM mastery important",
      "Enterprise reliability focus",
      "Show understanding of cloud (OCI)",
      "Collaborative teamwork",
    ],
    commonQuestionTypes: [
      "Missing Number in Array",
      "Linked List Cycle Detection",
      "First Duplicate (O(n)/O(1))",
      "Coin Change (DP)",
      "Nth Highest Salary (SQL)",
    ],
    dosDonts: {
      dos: [
        "Master Java and OOP",
        "Practice SQL queries",
        "Review Exception hierarchy",
        "Know SOLID principles",
        "Understand OS/DBMS fundamentals",
      ],
      donts: [
        "Be weak in Java fundamentals",
        "Skip SQL preparation",
        "Ignore CS theory",
        "Forget design patterns",
        "Overlook enterprise context",
      ],
    },
  },
  {
    companyId: "spotify",
    companyName: "Spotify",
    interviewStyle: {
      description:
        "Spotify interviews can reach LeetCode Hard difficulty. System design focuses on music recommendation. Unique case study round tests incident handling. Spotify values (Innovative, Collaborative, Passionate) heavily weighted.",
      pace: "Moderate with depth emphasis",
      expectations: [
        "Coding can be LeetCode Hard",
        "Music recommendation system design",
        "Case study round (unique)",
        "Spotify values assessment",
        "Streaming data problems common",
      ],
    },
    topPatterns: [
      {
        pattern: "heap",
        frequency: 75,
        tips: ["Median from data stream", "Top-K problems", "Priority scheduling"],
      },
      {
        pattern: "graphs",
        frequency: 85,
        tips: ["Artist/song relationships", "Recommendation graphs", "Playlist networks"],
      },
      {
        pattern: "sliding-window",
        frequency: 70,
        tips: ["Sliding window median", "Moving average", "Stream processing"],
      },
      {
        pattern: "trees",
        frequency: 80,
        tips: ["Music categorization", "Search trees", "Playlist hierarchies"],
      },
    ],
    interviewProcess: [
      "OA - LeetCode easy/medium + logic puzzle",
      "Technical screen - coding + project discussion",
      "Coding round (graphs/trees)",
      "System design (music recommendation)",
      "Culture fit + case study",
    ],
    cultureTips: [
      "Innovative - push boundaries",
      "Collaborative - team success matters",
      "Passionate - love what you do",
      "Playful - have fun with work",
      "Sincere - be genuine",
    ],
    commonQuestionTypes: [
      "Find Median from Data Stream",
      "Sliding Window Median",
      "Music Recommendation System Design",
      "Moving Average from Data Stream",
    ],
    dosDonts: {
      dos: [
        "Practice streaming data problems",
        "Know Spotify values deeply",
        "Prepare for case study scenarios",
        "Use STAR method for behavioral",
        "Show passion for music/audio",
      ],
      donts: [
        "Underestimate coding difficulty",
        "Skip case study preparation",
        "Ignore values assessment",
        "Be unfamiliar with recommendation systems",
        "Forget system design for audio",
      ],
    },
  },
  {
    companyId: "twitch",
    companyName: "Twitch",
    interviewStyle: {
      description:
        "Twitch interviews follow Amazon's Leadership Principles as an Amazon subsidiary. CodeSignal OA with 2 questions. 3 technical rounds with LeetCode medium. DP can be hard. Show passion for gaming and streaming.",
      pace: "Moderate with LP emphasis",
      expectations: [
        "Amazon Leadership Principles apply",
        "CodeSignal OA (90 min, 2 questions)",
        "3 technical rounds (LeetCode medium)",
        "DP questions can be hard",
        "Gaming/streaming passion valued",
      ],
    },
    topPatterns: [
      {
        pattern: "graphs",
        frequency: 80,
        tips: ["Live connections", "Stream routing", "Viewer networks"],
      },
      {
        pattern: "dp-1d",
        frequency: 70,
        tips: ["Can reach hard difficulty", "Optimization problems", "Stream scheduling"],
      },
      {
        pattern: "arrays-hashing",
        frequency: 90,
        tips: ["Chat message processing", "User lookups", "Event tracking"],
      },
      {
        pattern: "bfs",
        frequency: 65,
        tips: ["Number of Islands", "Network traversal", "Viewer proximity"],
      },
    ],
    interviewProcess: [
      "CodeSignal OA - 2 questions (90 min)",
      "Technical round 1 - LeetCode medium",
      "Technical round 2",
      "Technical round 3",
      "Behavioral (Leadership Principles)",
    ],
    cultureTips: [
      "Customer Obsession (Amazon LP)",
      "Bias for Action (Amazon LP)",
      "Ownership (Amazon LP)",
      "Empower creators and communities",
      "Gaming and streaming passion",
    ],
    commonQuestionTypes: [
      "LRU Cache",
      "Live Streaming System Design",
      "Real-time Chat System Design",
      "Number of Islands",
    ],
    dosDonts: {
      dos: [
        "Know Amazon Leadership Principles",
        "Show gaming/streaming passion",
        "Practice DP thoroughly (can be hard)",
        "Understand real-time systems",
        "Demonstrate creator economy understanding",
      ],
      donts: [
        "Ignore Leadership Principles",
        "Be unfamiliar with gaming culture",
        "Underestimate DP difficulty",
        "Forget real-time constraints",
        "Skip community focus in answers",
      ],
    },
  },
  {
    companyId: "ziprecruiter",
    companyName: "ZipRecruiter",
    interviewStyle: {
      description:
        "ZipRecruiter interviews are rated 2.9/5 difficulty on Glassdoor with 41.5% positive experiences. The OA uses CodeSignal with 4 problems in 60-120 minutes (LC Easy-Easy-Medium-Medium pattern). Unlike companies pursuing extreme algorithmic difficulty, ZipRecruiter focuses on 'detail traps' and 'logical complexity' - problems that test border processing, state management, and simulation rather than advanced algorithms. Passing score believed to be 520+. Average time to hire is 25 days.",
      pace: "Moderate pace, 4 rounds total (1 screening + 3 loop)",
      expectations: [
        "LeetCode Easy to Medium (rarely advanced algorithms)",
        "OA: 4 questions in 60-120 min, CodeSignal format",
        "Focus on simulation, state management, complex logic",
        "Border processing (empty arrays, edge cases) heavily tested",
        "Live coding rounds focus on HOW you solve, not just IF",
        "ML roles: arrays/hashmaps + recommendation system design",
      ],
    },
    topPatterns: [
      {
        pattern: "arrays-hashing",
        frequency: 90,
        tips: [
          "Array intersection problems reported",
          "Difference between sums at even/odd indices",
          "Find longest common prefix between arrays",
          "Processing student score records and averages",
        ],
      },
      {
        pattern: "string",
        frequency: 85,
        tips: [
          "Count all 3 splits of a string",
          "Cyclic shifting to ordered sequence",
          "String manipulation with DFS algorithms",
          "Prefix trie knowledge helpful for some tasks",
        ],
      },
      {
        pattern: "intervals",
        frequency: 75,
        tips: [
          "Lamp illumination coverage problems",
          "Count control points covered by ranges",
          "Beacon coverage in rectangular regions",
          "Interval intersection problems",
        ],
      },
      {
        pattern: "matrix",
        frequency: 70,
        tips: [
          "Frame sum and distinct sum in matrix submatrices",
          "Sum/deduplicate sub-frames operations",
          "Return max occurring names from 2D array",
          "Matrix rotation and addition operations",
        ],
      },
      {
        pattern: "stack",
        frequency: 50,
        tips: [
          "Min Stack implementation in live coding",
          "Stack vs queue differences asked",
          "Valid parentheses style problems",
        ],
      },
    ],
    interviewProcess: [
      "Initial Recruiter Call (30 min) - intro, fit assessment, background",
      "CodeSignal OA: 4 problems, 60-120 min (Easy-Easy-Medium-Medium)",
      "Technical Phone Screen (45 min) - collaborative real-time coding",
      "Onsite (4 rounds): problem solving, ML coding (if applicable), ML system design, behavioral",
    ],
    cultureTips: [
      "Job marketplace AI matching is core product",
      "Show passion for helping people find opportunities",
      "Collaboration and innovation valued",
      "Articulate thinking process clearly during interviews",
      "Distributed systems experience is a plus",
      "Use STAR method for behavioral questions",
    ],
    commonQuestionTypes: [
      "Frame Sum and Distinct Sum in Matrix (Medium)",
      "Difference Between Sums at Even/Odd Indices (Easy)",
      "Student with Highest Average Score (Medium)",
      "Count Control Points Illuminated by Lamps (Medium)",
      "Beacon coverage in rectangular region (geometry)",
      "Longest common prefix between two arrays",
      "2D array max occurring elements with tie handling",
      "URL shortening service design",
      "Recommendation system design (ML roles)",
      "SQL + algorithms for data roles",
    ],
    dosDonts: {
      dos: [
        "Practice CodeSignal format - aim for 520+ score",
        "Focus on edge cases and border processing",
        "Master state management and simulation problems",
        "Explain your thought process clearly",
        "Prepare distributed systems concepts",
        "Know stack/queue differences cold",
        "Practice array intersection and interval problems",
      ],
      donts: [
        "Expect LeetCode Hard - focus on detail traps instead",
        "Ignore empty array/string edge cases",
        "Skip matrix manipulation practice",
        "Underestimate logical complexity of 'easy' problems",
        "Forget ML design prep if applying for ML roles",
        "Be unfamiliar with CodeSignal platform",
      ],
    },
  },
]

/**
 * Get interview knowledge for a specific company
 */
export function getCompanyInterviewKnowledge(
  companyId: CompanyId
): CompanyInterviewKnowledge | undefined {
  return COMPANY_INTERVIEW_KNOWLEDGE.find((c) => c.companyId === companyId)
}

/**
 * Get all company interview knowledge
 */
export function getAllCompanyKnowledge(): CompanyInterviewKnowledge[] {
  return COMPANY_INTERVIEW_KNOWLEDGE
}

/**
 * Get top patterns across all companies
 */
export function getMostCommonPatterns(): {
  pattern: DSAPattern
  averageFrequency: number
  companies: CompanyId[]
}[] {
  const patternStats = new Map<DSAPattern, { totalFrequency: number; companies: CompanyId[] }>()

  for (const company of COMPANY_INTERVIEW_KNOWLEDGE) {
    for (const pattern of company.topPatterns) {
      const existing = patternStats.get(pattern.pattern) || { totalFrequency: 0, companies: [] }
      existing.totalFrequency += pattern.frequency
      existing.companies.push(company.companyId)
      patternStats.set(pattern.pattern, existing)
    }
  }

  return Array.from(patternStats.entries())
    .map(([pattern, stats]) => ({
      pattern,
      averageFrequency: stats.totalFrequency / stats.companies.length,
      companies: stats.companies,
    }))
    .sort((a, b) => b.averageFrequency - a.averageFrequency)
}

/**
 * Convert company knowledge to RAG document format
 */
export function companyKnowledgeToDocument(knowledge: CompanyInterviewKnowledge): string {
  return `
# ${knowledge.companyName} Interview Guide

## Interview Style
${knowledge.interviewStyle.description}

**Pace:** ${knowledge.interviewStyle.pace}

**Expectations:**
${knowledge.interviewStyle.expectations.map((e) => `- ${e}`).join("\n")}

## Top Patterns
${knowledge.topPatterns
  .map(
    (p) => `
### ${p.pattern} (${p.frequency}% frequency)
${p.tips.map((t) => `- ${t}`).join("\n")}
`
  )
  .join("\n")}

## Interview Process
${knowledge.interviewProcess.map((step, i) => `${i + 1}. ${step}`).join("\n")}

## Culture Tips
${knowledge.cultureTips.map((t) => `- ${t}`).join("\n")}

## Common Question Types
${knowledge.commonQuestionTypes.map((t) => `- ${t}`).join("\n")}

## Do's
${knowledge.dosDonts.dos.map((d) => `- ${d}`).join("\n")}

## Don'ts
${knowledge.dosDonts.donts.map((d) => `- ${d}`).join("\n")}
`.trim()
}
