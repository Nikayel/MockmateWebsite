import type { CompanyInterviewKnowledge } from "../../types"

export const nvidiaKnowledge: CompanyInterviewKnowledge = {
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
}
