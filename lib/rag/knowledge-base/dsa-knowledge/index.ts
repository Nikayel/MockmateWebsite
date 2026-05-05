import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { DSAPatternKnowledge } from "../types"
import { arraysHashingKnowledge } from "./patterns/arrays-hashing"
import { twoPointersKnowledge } from "./patterns/two-pointers"
import { slidingWindowKnowledge } from "./patterns/sliding-window"
import { binarySearchKnowledge } from "./patterns/binary-search"
import { stackKnowledge } from "./patterns/stack"
import { treesKnowledge } from "./patterns/trees"
import { graphsKnowledge } from "./patterns/graphs"
import { dp1dKnowledge } from "./patterns/dp-1d"
import { dp2dKnowledge } from "./patterns/dp-2d"
import { greedyKnowledge } from "./patterns/greedy"
import { heapKnowledge } from "./patterns/heap"
import { backtrackingKnowledge } from "./patterns/backtracking"
import { trieKnowledge } from "./patterns/trie"
import { bitManipulationKnowledge } from "./patterns/bit-manipulation"
import { intervalsKnowledge } from "./patterns/intervals"
import { linkedListKnowledge } from "./patterns/linked-list"
import { stringKnowledge } from "./patterns/string"
import { matrixKnowledge } from "./patterns/matrix"
import { arraysHashingPrefixSumKnowledge } from "./patterns/arrays-hashing-prefix-sum"
import { unionFindKnowledge } from "./patterns/union-find"

export const DSA_PATTERN_KNOWLEDGE: DSAPatternKnowledge[] = [
  arraysHashingKnowledge,
  twoPointersKnowledge,
  slidingWindowKnowledge,
  binarySearchKnowledge,
  stackKnowledge,
  treesKnowledge,
  graphsKnowledge,
  dp1dKnowledge,
  dp2dKnowledge,
  greedyKnowledge,
  heapKnowledge,
  backtrackingKnowledge,
  trieKnowledge,
  bitManipulationKnowledge,
  intervalsKnowledge,
  linkedListKnowledge,
  stringKnowledge,
  matrixKnowledge,
  arraysHashingPrefixSumKnowledge,
  unionFindKnowledge,
]

/**
 * Get knowledge for a specific pattern
 */
export function getPatternKnowledge(pattern: DSAPattern): DSAPatternKnowledge | undefined {
  return DSA_PATTERN_KNOWLEDGE.find((k) => k.pattern === pattern)
}

/**
 * Get all patterns with their knowledge
 */
export function getAllPatternKnowledge(): DSAPatternKnowledge[] {
  return DSA_PATTERN_KNOWLEDGE
}

/**
 * Get patterns by difficulty level
 */
export function getPatternsByDifficulty(
  level: "beginner" | "intermediate" | "advanced"
): DSAPatternKnowledge[] {
  const beginnerPatterns = [
    "arrays-hashing",
    "two-pointers",
    "sliding-window",
    "binary-search",
    "stack",
    "string",
    "linked-list",
  ]
  const intermediatePatterns = [
    "trees",
    "graphs",
    "dp-1d",
    "greedy",
    "heap",
    "interval",
    "matrix",
    "prefix-sum",
  ]
  const advancedPatterns = ["dp-2d", "backtracking", "trie", "bit-manipulation"]

  switch (level) {
    case "beginner":
      return DSA_PATTERN_KNOWLEDGE.filter((k) => beginnerPatterns.includes(k.pattern))
    case "intermediate":
      return DSA_PATTERN_KNOWLEDGE.filter((k) => intermediatePatterns.includes(k.pattern))
    case "advanced":
      return DSA_PATTERN_KNOWLEDGE.filter((k) => advancedPatterns.includes(k.pattern))
  }
}

/**
 * Get related patterns for a given pattern
 */
export function getRelatedPatterns(pattern: DSAPattern): DSAPatternKnowledge[] {
  const knowledge = getPatternKnowledge(pattern)
  if (!knowledge) return []

  return knowledge.relatedPatterns
    .map((p) => getPatternKnowledge(p))
    .filter((k): k is DSAPatternKnowledge => k !== undefined)
}

/**
 * Convert pattern knowledge to RAG document format
 */
export function patternKnowledgeToDocument(knowledge: DSAPatternKnowledge): string {
  return `
# ${knowledge.displayName}

## Description
${knowledge.description}

## When to Use
${knowledge.whenToUse.map((w) => `- ${w}`).join("\n")}

## Key Insights
${knowledge.keyInsights.map((i) => `- ${i}`).join("\n")}

## Common Mistakes
${knowledge.commonMistakes.map((m) => `- ${m}`).join("\n")}

## Time Complexity
- Typical: ${knowledge.timeComplexity.typical}
- Best: ${knowledge.timeComplexity.best}
- Worst: ${knowledge.timeComplexity.worst}

## Space Complexity
- Typical: ${knowledge.spaceComplexity.typical}
- Notes: ${knowledge.spaceComplexity.notes}

## Code Template
\`\`\`python
${knowledge.codeTemplate || "No template available"}
\`\`\`

## Example Problems
${knowledge.examples?.map((e) => `- ${e}`).join("\n") || "No examples"}

## Interview Tips
${knowledge.interviewTips.map((t) => `- ${t}`).join("\n")}
`.trim()
}
