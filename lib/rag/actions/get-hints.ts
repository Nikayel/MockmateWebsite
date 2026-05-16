import { NextResponse } from "next/server"
import { getRelevantHints } from "@/lib/rag"
import { buildHintContext } from "@/lib/rag/context-builder"
import {
  getDebuggingKnowledge,
  type BugCategory,
} from "@/lib/rag/knowledge-base/debugging-knowledge"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import { logger } from "@/lib/logger"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { generateContextualHints } from "./contextual-hints"

export async function handleGetHints(params: {
  problemText: string
  problemTitle: string
  userCode?: string
  difficulty?: string
  problemType?: string
  problemPattern?: string
  bugCategory?: string
  userId?: string
  limit?: number
}) {
  const {
    problemText,
    problemTitle,
    userCode = "",
    difficulty,
    problemType,
    problemPattern,
    bugCategory,
    userId,
    limit = 3,
  } = params

  if (!problemText) {
    return NextResponse.json({ error: "problemText is required" }, { status: 400 })
  }

  const basicHints = generateContextualHints(
    problemText,
    problemTitle,
    userCode,
    difficulty || "medium",
    problemType || "dsa",
    bugCategory
  )

  const storedHints = await getRelevantHints(problemText, userCode, { limit })

  const ragEnhancedHints: { level: number; hint: string; source: string }[] = []
  let patternInsights: {
    pattern: string
    keyTechniques: string[]
    commonMistakes: string[]
  } | null = null
  let debuggingInsights: { bugType: string; commonCauses: string[]; redFlags: string[] } | null =
    null

  try {
    if (problemType === "bugfix" && bugCategory) {
      const debugKnowledge = getDebuggingKnowledge(bugCategory as BugCategory)
      if (debugKnowledge) {
        debuggingInsights = {
          bugType: debugKnowledge.displayName,
          commonCauses: debugKnowledge.commonCauses.slice(0, 3),
          redFlags: debugKnowledge.redFlags.slice(0, 3),
        }

        ragEnhancedHints.push({
          level: 1,
          hint: `This appears to be a ${debugKnowledge.displayName} bug. ${debugKnowledge.description}`,
          source: "debugging-knowledge",
        })

        if (debugKnowledge.debuggingApproach.length > 0) {
          ragEnhancedHints.push({
            level: 2,
            hint: `Debugging approach: ${debugKnowledge.debuggingApproach[0]}`,
            source: "debugging-knowledge",
          })
        }

        if (debugKnowledge.redFlags.length > 0) {
          ragEnhancedHints.push({
            level: 2,
            hint: `Watch for red flags: ${debugKnowledge.redFlags.slice(0, 2).join("; ")}`,
            source: "debugging-knowledge",
          })
        }

        if (debugKnowledge.fixStrategies.length > 0) {
          ragEnhancedHints.push({
            level: 3,
            hint: `Fix strategy: ${debugKnowledge.fixStrategies[0]}`,
            source: "debugging-knowledge",
          })
        }
      }
    }

    if (problemPattern) {
      const patternKnowledge = getPatternKnowledge(problemPattern as DSAPattern)
      if (patternKnowledge) {
        patternInsights = {
          pattern: patternKnowledge.displayName,
          keyTechniques: patternKnowledge.keyInsights,
          commonMistakes: patternKnowledge.commonMistakes.slice(0, 3),
        }

        ragEnhancedHints.push({
          level: 1,
          hint: `This is a ${patternKnowledge.displayName} problem. ${patternKnowledge.whenToUse[0]}`,
          source: "pattern-knowledge",
        })

        if (patternKnowledge.keyInsights.length > 0) {
          ragEnhancedHints.push({
            level: 2,
            hint: patternKnowledge.keyInsights[0],
            source: "pattern-knowledge",
          })
        }
      }
    }

    const hintContext = await buildHintContext({
      problemText,
      problemPattern: problemPattern as DSAPattern,
      userCode,
      userId,
    })

    if (hintContext.retrievedDocs.length > 0) {
      const topDocs = hintContext.retrievedDocs.slice(0, 2)
      for (const doc of topDocs) {
        if (doc.text && doc.text.length > 20) {
          ragEnhancedHints.push({
            level: 3,
            hint: doc.text.substring(0, 300) + (doc.text.length > 300 ? "..." : ""),
            source: "rag-retrieval",
          })
        }
      }
    }
  } catch (error) {
    logger.warn("[RAG API] Enhanced hints failed; falling back to basic hints", { error })
  }

  return NextResponse.json({
    contextualHints: basicHints,
    relatedHints: storedHints.map((h) => ({
      text: h.text,
      similarity: h.similarity,
      level:
        h.metadata?.tags?.find((t: string) => t.startsWith("level-"))?.replace("level-", "") || "1",
    })),
    ragEnhancedHints,
    patternInsights,
    debuggingInsights,
    metadata: {
      ragEnabled: true,
      problemType: problemType || "dsa",
      totalHints: basicHints.length + storedHints.length + ragEnhancedHints.length,
    },
  })
}
