import type { CompanyInterviewKnowledge } from "../../types"

export const ziprecruiterKnowledge: CompanyInterviewKnowledge = {
  companyId: "ziprecruiter",
  companyName: "ZipRecruiter",
  interviewStyle: {
    description:
      "ZipRecruiter interviews are rated 2.9/5 difficulty on Glassdoor with 41.5% positive experiences. The OA uses CodeSignal with 4 problems in 60-70 minutes. IMPORTANT: Unlike companies pursuing extreme algorithmic difficulty (DP, Graph Theory), ZipRecruiter focuses heavily on CLASS DESIGN and OBJECT-ORIENTED problems - designing systems like in-memory databases, caches, and logging systems in an OOP way. Problems test 'detail traps', state management, interface consistency, and encapsulation rather than advanced algorithms. Code 'cleanliness' and 'stability' are more important than 'cleverness'. Passing score believed to be 520-700+. Average time to hire is 25 days.",
    pace: "Moderate pace, 4 rounds total (1 screening + 3 loop)",
    expectations: [
      "LeetCode Easy to Medium (rarely advanced algorithms like DP/Graphs)",
      "OA: 4 questions in 60-70 min, CodeSignal format (Easy-Easy-Medium-Medium)",
      "HEAVY FOCUS on class design and OOP-style implementation",
      "Design systems (in-memory database, cache, logging) with proper encapsulation",
      "State management and TTL (Time-To-Live) logic commonly tested",
      "Interface consistency and clean method signatures expected",
      "Border processing (empty arrays, edge cases) heavily tested",
      "Code cleanliness valued over clever algorithmic solutions",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 90,
      tips: [
        "In-memory database with key-field-value storage",
        "Implement get/set/delete with proper state management",
        "Array intersection and prefix matching problems",
        "Processing student score records and averages",
      ],
    },
    {
      pattern: "string",
      frequency: 85,
      tips: [
        "scan() and scan_by_prefix() operations on stored data",
        "Lexicographic ordering of results",
        "Count all 3 splits of a string",
        "Prefix trie knowledge helpful for some tasks",
      ],
    },
    {
      pattern: "intervals",
      frequency: 75,
      tips: [
        "TTL (Time-To-Live) expiration logic: expire when timestamp >= start + ttl",
        "Lamp illumination coverage problems",
        "Count control points covered by ranges",
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
    "CodeSignal OA: 4 problems, 60-70 min (Easy-Easy-Medium-Medium) - CLASS DESIGN FOCUS",
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
    "In-Memory Database Design (4-level progressive problem - SIGNATURE QUESTION)",
    "  - Level 1: Implement set(key, field, value), get(key, field), delete(key, field)",
    "  - Level 2: Add scan(key) and scan_by_prefix(key, prefix) with lexicographic ordering",
    "  - Level 3: Add TTL logic - data expires when current_timestamp >= start + ttl",
    "  - Level 4: Add backup(timestamp) and restore(timestamp, timestamp_to_restore)",
    "Cache/LRU system design with clean class interfaces",
    "Logging system with state management",
    "Frame Sum and Distinct Sum in Matrix (Medium)",
    "Student with Highest Average Score (Medium)",
    "Count Control Points Illuminated by Lamps (Medium)",
    "URL shortening service design",
    "Recommendation system design (ML roles)",
  ],
  dosDonts: {
    dos: [
      "Practice CLASS DESIGN problems - design in-memory databases, caches, logging systems",
      "Focus on interface consistency and encapsulation of state",
      "Master TTL (Time-To-Live) logic - common pitfall is forgetting cleanup during delete",
      "Practice CodeSignal format - aim for 520-700+ score",
      "Focus on edge cases and border processing (empty arrays, null inputs)",
      "Write clean, stable code over clever solutions",
      "Explain your thought process clearly",
      "Practice backup/restore with TTL recalculation (restore must adjust TTL to new timestamp)",
    ],
    donts: [
      "Expect LeetCode Hard algorithms - focus on OOP design and detail traps instead",
      "Ignore TTL edge cases - expired field resurrection is a common bug",
      "Skip class design practice - this is ZipRecruiter's signature question style",
      "Copy TTL directly during restore - must recalculate based on new timestamp",
      "Ignore empty array/string edge cases",
      "Underestimate logical complexity of 'easy-looking' OOP problems",
      "Be unfamiliar with CodeSignal platform",
    ],
  },
}
