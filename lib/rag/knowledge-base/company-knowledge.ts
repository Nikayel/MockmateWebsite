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
