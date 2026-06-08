/**
 * RAG Health Admin API
 *
 * Provides RAG system health, metrics, and quick eval results
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin/middleware"
import { checkRAGHealth, getRAGMetrics } from "@/lib/rag/monitoring"
import {
  isKnowledgeBaseSeeded,
  getKnowledgeBaseStatus,
  seedKnowledgeBase,
  type KnowledgeCategory,
} from "@/lib/rag/knowledge-base/seeder"
import { vectorizeAllProblems, getVectorizationStatus } from "@/lib/rag/problem-vectorization"
import { getHybridProvider } from "@/lib/rag/embeddings/hybrid-provider"
import { getVectorDBProvider, isPineconeEnabled } from "@/lib/rag/vectordb"
import { advancedRetrieve } from "@/lib/rag"
import { QUICK_RAG_EVAL_CASES } from "@/lib/rag/evaluation/fixtures"
import {
  buildFailedRetrievalEvalResult,
  buildRetrievalEvalResult,
  summarizeRetrievalEval,
} from "@/lib/rag/evaluation/metrics"

const QUICK_EVAL_K_VALUES = [1, 3, 5, 10]

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess(request)
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action") || "health"

    switch (action) {
      case "health": {
        // Get system health with detailed knowledge base status
        const [health, metrics, kbSeeded, kbStatus, scenarioStatus] = await Promise.all([
          checkRAGHealth(),
          getRAGMetrics(24),
          isKnowledgeBaseSeeded(),
          getKnowledgeBaseStatus(),
          getVectorizationStatus(),
        ])

        const provider = getHybridProvider()
        const providerMetrics = provider.getMetrics()

        return NextResponse.json({
          success: true,
          data: {
            health,
            metrics,
            config: {
              embeddingProvider: provider.getActiveProvider(),
              vectorDB: getVectorDBProvider(),
              pineconeEnabled: isPineconeEnabled(),
              knowledgeBaseSeeded: kbSeeded,
              dimensions: provider.getDimensions(),
            },
            providerMetrics,
            knowledgeBaseStatus: kbStatus,
            scenarioStatus,
          },
        })
      }

      case "quick-eval": {
        // Run quick evaluation
        const results = []

        for (const testCase of QUICK_RAG_EVAL_CASES) {
          try {
            const retrieved = await advancedRetrieve({
              query: testCase.query,
              limit: Math.max(...QUICK_EVAL_K_VALUES),
              types: testCase.types,
              strategy: "hybrid",
              enableQueryExpansion: true,
              enableReranking: true,
              feature: "other",
            })

            results.push(
              buildRetrievalEvalResult(
                testCase,
                retrieved.map((result) => ({
                  id: result.id,
                  score: result.finalScore,
                })),
                QUICK_EVAL_K_VALUES
              )
            )
          } catch (error) {
            results.push(
              buildFailedRetrievalEvalResult(
                testCase,
                error instanceof Error ? error.message : "Unknown error",
                QUICK_EVAL_K_VALUES
              )
            )
          }
        }

        const summary = summarizeRetrievalEval(results, QUICK_EVAL_K_VALUES)

        return NextResponse.json({
          success: true,
          data: {
            results,
            summary,
            timestamp: new Date().toISOString(),
          },
        })
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[Admin RAG Health] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 }
    )
  }
}

// POST for actions like seeding, clearing cache, etc.
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess(request)
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case "seed-knowledge-base": {
        const categories = body.categories as KnowledgeCategory[] | undefined
        const progress = await seedKnowledgeBase({
          force: body.force || false,
          categories,
        })
        return NextResponse.json({
          success: true,
          data: { progress },
        })
      }

      case "get-status": {
        const status = await getKnowledgeBaseStatus()
        return NextResponse.json({
          success: true,
          data: { status },
        })
      }

      case "vectorize-scenarios": {
        // Vectorize all scenarios (DSA, System Design, BugFix)
        const result = await vectorizeAllProblems()
        return NextResponse.json({
          success: true,
          data: { result },
        })
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[Admin RAG Health] POST Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 }
    )
  }
}
