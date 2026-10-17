import { buildRAGContext } from "@/lib/interview/chat-rag-context"
import { buildScenarioId } from "./context-builders"
import type { ChatRequestContext } from "./request-context"

export async function buildChatRetrievalContext(
  request: ChatRequestContext,
  userId: string | undefined
): Promise<string> {
  const {
    scenarioTitle,
    scenarioPattern,
    scenarioCompany,
    scenarioType,
    sessionContext,
    currentCode,
    sessionId,
    message,
    testResults,
    role,
  } = request
  const isBugFix = scenarioType === "bugfix"
  const isSystemDesign = scenarioType === "system-design"
  let systemPrompt = ""
  // Derive scenarioId from title for complexity lookup (e.g., "Two Sum" -> "dsa-two-sum")
  const scenarioId = sessionContext?.task.id ?? buildScenarioId(scenarioTitle)

  // This retrieval path indexes DSA patterns/complexity, not incident or design
  // contracts. Non-DSA rounds are grounded in their public task and workspace.
  const ragContext =
    isBugFix || isSystemDesign
      ? ""
      : await buildRAGContext({
          scenarioTitle,
          scenarioPattern,
          scenarioCompany: scenarioCompany ?? undefined,
          scenarioType,
          scenarioId,
          problemText: scenarioTitle, // Use title as problem text
          userCode: currentCode,
          userId,
          sessionId, // For session-level caching of static context
          userMessage: message, // Pass user message for dynamic context
          testResults: testResults
            ? {
                passed: testResults.filter((t) => t.passed).length,
                total: testResults.length,
                failingTests: testResults
                  .filter((t) => !t.passed)
                  .map((t) => t.description || "Unknown test"),
              }
            : undefined,
        })

  if (ragContext) {
    if (role === "interviewer") {
      // For interviewer, add RAG context to help ask better questions
      systemPrompt =
        systemPrompt +
        "\n\n" +
        ragContext +
        `

USE THIS KNOWLEDGE TO:
- Ask more targeted questions based on the pattern
- Challenge them on common pitfalls for this problem type
- Guide them towards optimal solutions when their current approach is genuinely suboptimal
- Recognize when they're on the right track

ANTI-HALLUCINATION RULES:
- ONLY reference techniques, patterns, and complexity info from the RAG context above
- If you're unsure about a specific fact (e.g., exact complexity), say "typically" or ask the candidate
- Do NOT invent specific company interview questions or statistics not in the context
- When discussing complexity, stick to what's documented in the pattern knowledge`
    } else {
      // For partner (AI assistant), add RAG with stricter grounding
      systemPrompt =
        systemPrompt +
        "\n\n" +
        ragContext +
        `

GROUNDING RULES (prevent hallucination):
- Base your hints and suggestions ONLY on the retrieved knowledge above
- If the RAG context doesn't cover something, acknowledge uncertainty
- Do NOT make up specific algorithms or data structures not mentioned
- Say "I'm not certain, but..." when going beyond the retrieved context
- Prefer asking clarifying questions over guessing solutions`
    }
  }

  return systemPrompt
}
