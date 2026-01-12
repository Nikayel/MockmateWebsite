/**
 * Pattern-based hint generation (fallback when LLM fails)
 * Uses DSA knowledge base to generate template hints
 */

import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import { generateHintId } from "./code-analyzer"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { GeneratedHint, HintLevel } from "./types"

/**
 * Generate fallback hints based on pattern knowledge
 * Used when LLM generation fails
 */
export function generatePatternHints(pattern: DSAPattern, level: HintLevel): GeneratedHint[] {
  const knowledge = getPatternKnowledge(pattern)
  if (!knowledge) return []

  const hints: GeneratedHint[] = []

  // Level 1: Conceptual hints
  if (level >= 1) {
    hints.push({
      id: generateHintId(),
      level: 1,
      category: "conceptual",
      title: "Pattern Recognition",
      content: `This is a ${knowledge.displayName} problem. ${knowledge.whenToUse[0]}`,
      isBlurred: true,
      source: "pattern-knowledge",
      relevanceScore: 0.9,
      metadata: {
        pattern,
        relatedConcepts: knowledge.relatedPatterns,
      },
    })
  }

  // Level 2: Approach hints
  if (level >= 2) {
    hints.push({
      id: generateHintId(),
      level: 2,
      category: "approach",
      title: "Key Insight",
      content: knowledge.keyInsights[0],
      isBlurred: true,
      source: "pattern-knowledge",
      relevanceScore: 0.85,
      metadata: { pattern },
    })

    // Data structure suggestion based on pattern
    const dataStructureSuggestion = getDataStructureSuggestion(pattern)
    if (dataStructureSuggestion) {
      hints.push({
        id: generateHintId(),
        level: 2,
        category: "implementation",
        title: "Data Structure Suggestion",
        content: dataStructureSuggestion,
        isBlurred: true,
        source: "pattern-knowledge",
        relevanceScore: 0.8,
        metadata: { pattern },
      })
    }
  }

  // Level 3: Detailed explanation
  if (level >= 3) {
    hints.push({
      id: generateHintId(),
      level: 3,
      category: "implementation",
      title: "Implementation Guide",
      content:
        knowledge.keyInsights.slice(0, 2).join(" ") +
        ` The typical time complexity is ${knowledge.timeComplexity.typical}.`,
      isBlurred: true,
      source: "pattern-knowledge",
      relevanceScore: 0.75,
      metadata: {
        pattern,
        codeSnippet: knowledge.codeTemplate?.split("\n").slice(0, 5).join("\n"),
      },
    })

    // Common mistakes hint
    if (knowledge.commonMistakes.length > 0) {
      hints.push({
        id: generateHintId(),
        level: 3,
        category: "debugging",
        title: "Common Pitfalls",
        content: `Watch out for: ${knowledge.commonMistakes.slice(0, 2).join(", ")}`,
        isBlurred: true,
        source: "pattern-knowledge",
        relevanceScore: 0.7,
        metadata: { pattern },
      })
    }
  }

  // Level 4: Near-solution hints
  if (level >= 4 && knowledge.codeTemplate) {
    hints.push({
      id: generateHintId(),
      level: 4,
      category: "implementation",
      title: "Solution Approach",
      content: `Here's the general approach:\n${knowledge.codeTemplate.split("\n").slice(0, 8).join("\n")}`,
      isBlurred: true,
      source: "pattern-knowledge",
      relevanceScore: 0.65,
      metadata: {
        pattern,
        codeSnippet: knowledge.codeTemplate,
      },
    })
  }

  return hints
}

/**
 * Get data structure suggestion based on pattern
 */
function getDataStructureSuggestion(pattern: DSAPattern): string | null {
  const suggestions: Record<string, string> = {
    "arrays-hashing": "Consider using a hash map for O(1) lookups",
    "two-pointers": "Use two pointers - one at each end or both at start",
    "sliding-window": "Maintain a window with left and right pointers",
    trees: "Consider using recursive DFS or iterative BFS with a queue",
    graphs: "Use an adjacency list representation and BFS/DFS",
    "dp-1d": "Use a 1D array to store computed subproblem results",
    "dp-2d": "Use a 2D table to store computed subproblem results",
    heap: "Use a min-heap or max-heap for efficient min/max operations",
    stack: "Use a stack to track elements in LIFO order",
    "binary-search": "Use binary search to reduce search space by half each iteration",
    bfs: "Use a queue for level-order traversal",
    dfs: "Use recursion or explicit stack for depth-first exploration",
    trie: "Use a trie for efficient prefix operations",
    backtracking: "Build solutions incrementally, abandoning partial candidates",
    "union-find": "Use union-find for connected component queries",
  }

  return suggestions[pattern] || null
}

/**
 * Generate a generic hint when no pattern is identified
 */
export function generateGenericHint(level: HintLevel): GeneratedHint {
  const genericHints: Record<HintLevel, { title: string; content: string }> = {
    1: {
      title: "Getting Started",
      content: "Start by understanding the input/output. What are the constraints?",
    },
    2: {
      title: "Think About Approach",
      content:
        "Consider what data structures might help. Would a hash map, array, or other structure be useful?",
    },
    3: {
      title: "Implementation Tips",
      content:
        "Break the problem into smaller steps. Handle edge cases like empty input, single element, or duplicates.",
    },
    4: {
      title: "Common Patterns",
      content:
        "Most interview problems use one of: two pointers, sliding window, hash map, BFS/DFS, or dynamic programming.",
    },
  }

  const hint = genericHints[level]
  return {
    id: generateHintId(),
    level,
    category: "conceptual",
    title: hint.title,
    content: hint.content,
    isBlurred: true,
    source: "pattern-knowledge",
    relevanceScore: 0.5,
  }
}
