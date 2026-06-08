import type { VectorContentType } from "../types"

export interface RetrievalEvalCase {
  query: string
  relevantIds: string[]
  types: VectorContentType[]
  category: "dsa" | "company" | "hint" | "general"
  description?: string
}

export const QUICK_RAG_EVAL_CASES: RetrievalEvalCase[] = [
  {
    query: "two sum array hash map",
    relevantIds: ["problem-dsa-two-sum", "problem-dsa-two-sum-ii-sorted"],
    types: ["problem"],
    category: "dsa",
    description: "Arrays/hashing exact problem retrieval",
  },
  {
    query: "sliding window longest substring repeating characters",
    relevantIds: [
      "problem-dsa-longest-substring-without-repeating",
      "problem-dsa-minimum-window-substring",
    ],
    types: ["problem"],
    category: "dsa",
    description: "Sliding window pattern retrieval",
  },
  {
    query: "binary search rotated sorted array",
    relevantIds: [
      "problem-dsa-binary-search",
      "problem-dsa-search-rotated-sorted-array",
      "problem-dsa-koko-eating-bananas",
    ],
    types: ["problem"],
    category: "dsa",
    description: "Binary search family retrieval",
  },
  {
    query: "google interview preparation tips",
    relevantIds: ["company-google"],
    types: ["company"],
    category: "company",
  },
  {
    query: "amazon leadership principles interview preparation",
    relevantIds: ["company-amazon"],
    types: ["company"],
    category: "company",
  },
]

export const FULL_RAG_EVAL_CASES: RetrievalEvalCase[] = [
  ...QUICK_RAG_EVAL_CASES,
  {
    query: "valid palindrome two pointers string",
    relevantIds: ["problem-dsa-valid-palindrome", "problem-dsa-two-sum-ii-sorted"],
    types: ["problem"],
    category: "dsa",
  },
  {
    query: "koko eating bananas minimum speed binary search answer",
    relevantIds: ["problem-dsa-koko-eating-bananas"],
    types: ["problem"],
    category: "dsa",
  },
  {
    query: "contains duplicate hash set array",
    relevantIds: ["problem-dsa-contains-duplicate", "problem-dsa-two-sum"],
    types: ["problem"],
    category: "dsa",
  },
]
