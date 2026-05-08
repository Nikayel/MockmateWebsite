import { buildComplexityContext } from "@/lib/rag/context-builder"
import { getCompanyInterviewKnowledge } from "@/lib/rag/knowledge-base/company-knowledge"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import {
  formatDynamicContextForPrompt,
  getDynamicChatContext,
  shouldRetrieveDynamicContext,
} from "@/lib/rag/dynamic-chat-context"
import type { CompanyId } from "@/lib/data/company-questions/types"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { logger } from "@/lib/logger"

interface SessionRAGCache {
  staticContext: string
  sessionId: string
  scenarioId: string
  createdAt: number
}

const sessionRAGCache = new Map<string, SessionRAGCache>()
const SESSION_RAG_CACHE_TTL_MS = 30 * 60 * 1000
const MAX_SESSION_CACHE_SIZE = 500

function pruneSessionRAGCache(): void {
  if (sessionRAGCache.size <= MAX_SESSION_CACHE_SIZE) return

  const now = Date.now()
  for (const [key, entry] of sessionRAGCache.entries()) {
    if (now - entry.createdAt > SESSION_RAG_CACHE_TTL_MS) {
      sessionRAGCache.delete(key)
    }
  }

  if (sessionRAGCache.size > MAX_SESSION_CACHE_SIZE) {
    const entries = Array.from(sessionRAGCache.entries()).sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    )

    const toRemove = sessionRAGCache.size - MAX_SESSION_CACHE_SIZE + 50
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      sessionRAGCache.delete(entries[i][0])
    }
  }
}

function buildStaticRAGContext(options: {
  scenarioPattern?: string
  scenarioCompany?: string
  scenarioId?: string
}): string {
  const staticParts: string[] = []

  if (options.scenarioPattern) {
    const patternKnowledge = getPatternKnowledge(options.scenarioPattern as DSAPattern)
    if (patternKnowledge) {
      staticParts.push(`
## Pattern Knowledge: ${patternKnowledge.displayName}

### When to Use
${patternKnowledge.whenToUse
  .slice(0, 3)
  .map((w) => `- ${w}`)
  .join("\n")}

### Key Insights
${patternKnowledge.keyInsights
  .slice(0, 3)
  .map((i) => `- ${i}`)
  .join("\n")}

### Common Mistakes to Avoid
${patternKnowledge.commonMistakes
  .slice(0, 2)
  .map((m) => `- ${m}`)
  .join("\n")}

### Expected Complexity
- Time: ${patternKnowledge.timeComplexity.typical}
- Space: ${patternKnowledge.spaceComplexity.typical}
`)
    }
  }

  if (options.scenarioCompany && options.scenarioCompany !== "Generic") {
    const companyKnowledge = getCompanyInterviewKnowledge(options.scenarioCompany as CompanyId)
    if (companyKnowledge) {
      staticParts.push(`
## ${companyKnowledge.companyName} Interview Tips

### Interview Style
${companyKnowledge.interviewStyle.description}
Pace: ${companyKnowledge.interviewStyle.pace}
Expectations: ${companyKnowledge.interviewStyle.expectations
        .slice(0, 3)
        .map((e) => `- ${e}`)
        .join("\n")}

### Focus Areas
${companyKnowledge.topPatterns
  .slice(0, 4)
  .map((p) => `- ${p.pattern}`)
  .join("\n")}

### What They Value
${companyKnowledge.cultureTips
  .slice(0, 2)
  .map((t) => `- ${t}`)
  .join("\n")}
`)
    }
  }

  if (options.scenarioId || options.scenarioPattern) {
    const complexityContext = buildComplexityContext(
      options.scenarioId || "",
      options.scenarioPattern as DSAPattern
    )
    if (complexityContext) {
      staticParts.push(complexityContext)
    }
  }

  return staticParts.join("\n")
}

export async function buildRAGContext(options: {
  scenarioTitle?: string
  scenarioPattern?: string
  scenarioCompany?: string
  scenarioType?: string
  scenarioId?: string
  problemText?: string
  userCode?: string
  userId?: string
  sessionId?: string
  userMessage?: string
  testResults?: { passed: number; total: number; failingTests?: string[] }
}): Promise<string> {
  const ragContextParts: string[] = []

  try {
    if (options.userMessage && shouldRetrieveDynamicContext(options.userMessage)) {
      const dynamicContext = await getDynamicChatContext({
        userMessage: options.userMessage,
        currentCode: options.userCode,
        pattern: options.scenarioPattern as DSAPattern,
        problemTitle: options.scenarioTitle,
        testResults: options.testResults,
      })

      if (dynamicContext.retrievedContext || dynamicContext.debuggingHints) {
        ragContextParts.push(`
## Dynamic Context (based on user's current question)
${formatDynamicContextForPrompt(dynamicContext)}
`)
      }
    }

    const sessionCacheKey = options.sessionId || `${options.userId}-${options.scenarioId}`
    let staticContext: string

    const cachedSession = sessionRAGCache.get(sessionCacheKey)
    if (
      cachedSession &&
      cachedSession.scenarioId === (options.scenarioId || "") &&
      Date.now() - cachedSession.createdAt < SESSION_RAG_CACHE_TTL_MS
    ) {
      staticContext = cachedSession.staticContext
    } else {
      staticContext = buildStaticRAGContext({
        scenarioPattern: options.scenarioPattern,
        scenarioCompany: options.scenarioCompany,
        scenarioId: options.scenarioId,
      })

      sessionRAGCache.set(sessionCacheKey, {
        staticContext,
        sessionId: sessionCacheKey,
        scenarioId: options.scenarioId || "",
        createdAt: Date.now(),
      })
      pruneSessionRAGCache()
    }

    if (staticContext) {
      ragContextParts.push(staticContext)
    }
  } catch (error) {
    logger.error("[Chat API] RAG context build error", { error })
  }

  if (ragContextParts.length === 0) {
    return ""
  }

  return `
=== RAG-ENHANCED CONTEXT ===
${ragContextParts.join("\n")}
=== END RAG CONTEXT ===
`
}
