import { NextRequest, NextResponse } from "next/server"
import { scenarios } from "@/lib/scenarios"
import { generateTextEmbedding, storeTextEmbedding, type TextEmbedding } from "@/lib/rag"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"
import { adminDb } from "@/lib/firebase-admin"

// Admin user IDs - add your admin user IDs here
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || []

type SeedScenarioTextSource = {
  title: string
  type?: string
  difficulty?: string
  problemStatement?: string
  examples?: Array<{ input?: unknown; output?: unknown }>
  constraints?: string[]
  tags?: string[]
  optimalComplexity?: {
    time?: string
    space?: string
  }
}

async function isAdmin(userId: string): Promise<boolean> {
  // SECURITY: Only trust hardcoded admin list from environment variables
  // Never read admin status from user-writable Firestore fields
  return ADMIN_USER_IDS.includes(userId)
}

/**
 * API endpoint to seed the vector DB with problem embeddings
 * This should be run once to initialize the RAG system
 * ADMIN ONLY - requires authentication and admin role
 *
 * POST /api/seed-vectors
 * Query params:
 * - limit: number of scenarios to process (default: all)
 * - force: overwrite existing embeddings (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { userId } = await verifyAuth(request)
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Require admin role
    const admin = await isAdmin(userId)
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "0") || scenarios.length
    const force = searchParams.get("force") === "true"

    const results = {
      processed: 0,
      problems: 0,
      hints: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // Process scenarios
    const scenariosToProcess = scenarios.slice(0, limit)

    for (const scenario of scenariosToProcess) {
      try {
        const problemEmbeddingId = `problem-${scenario.id}`
        if (!force) {
          const existing = await adminDb.collection("text_embeddings").doc(problemEmbeddingId).get()
          if (existing.exists) {
            results.skipped++
            continue
          }
        }

        // Build full problem text for embedding
        const problemText = buildProblemText(scenario)
        const vector = await generateTextEmbedding(problemText)

        // Store problem embedding
        const problemEmbedding: TextEmbedding = {
          id: problemEmbeddingId,
          text: problemText,
          type: "problem",
          vector,
          metadata: {
            problemId: scenario.id,
            problemTitle: scenario.title,
            difficulty: scenario.difficulty,
            tags: scenario.tags || [],
            timestamp: new Date().toISOString(),
          },
        }

        await storeTextEmbedding(problemEmbedding)
        results.problems++

        // Store hints if available
        if (scenario.hints && scenario.hints.length > 0) {
          for (let i = 0; i < scenario.hints.length; i++) {
            const hint = scenario.hints[i]
            try {
              const hintLevel = (i + 1) as 1 | 2 | 3 | 4
              const scenarioPattern = getScenarioPattern(scenario)
              const hintText = buildHintText(scenario, hint, hintLevel, scenarioPattern)
              const hintVector = await generateTextEmbedding(hintText)

              await storeTextEmbedding({
                id: `hint-${scenario.id}-${hintLevel}`,
                text: hint,
                type: "hint",
                vector: hintVector,
                metadata: {
                  problemId: scenario.id,
                  problemTitle: scenario.title,
                  hintLevel,
                  category: "approach",
                  pattern: scenarioPattern,
                  problemType: scenario.type,
                  tags: [
                    ...(scenario.tags || []),
                    `level-${hintLevel}`,
                    scenarioPattern,
                    scenario.type || "dsa",
                  ],
                  timestamp: new Date().toISOString(),
                },
              })
              results.hints++
            } catch (hintError) {
              results.errors.push(`Hint error for ${scenario.id}: ${hintError}`)
            }
          }
        }

        results.processed++

        // Log progress every 10 scenarios
        if (results.processed % 10 === 0) {
          logger.info("[Seed Vectors] Progress", {
            processed: results.processed,
            total: scenariosToProcess.length,
          })
        }
      } catch (error) {
        results.errors.push(`Error processing ${scenario.id}: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.processed} scenarios with ${results.problems} problem embeddings and ${results.hints} hint embeddings (${results.skipped} skipped)`,
      results,
    })
  } catch (error) {
    logger.error("Seed vectors error", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed vectors" },
      { status: 500 }
    )
  }
}

/**
 * Build full problem text for embedding
 */
function buildProblemText(scenario: SeedScenarioTextSource): string {
  const parts = [
    `Problem: ${scenario.title}`,
    `Type: ${scenario.type}`,
    `Difficulty: ${scenario.difficulty}`,
  ]

  if (scenario.problemStatement) {
    parts.push(`Description: ${scenario.problemStatement}`)
  }

  if (scenario.examples && scenario.examples.length > 0) {
    parts.push(
      `Examples: ${scenario.examples
        .slice(0, 2)
        .map((ex) => `Input: ${String(ex.input)}, Output: ${String(ex.output)}`)
        .join("; ")}`
    )
  }

  if (scenario.constraints && scenario.constraints.length > 0) {
    parts.push(`Constraints: ${scenario.constraints.slice(0, 3).join(", ")}`)
  }

  if (scenario.tags && scenario.tags.length > 0) {
    parts.push(`Topics: ${scenario.tags.join(", ")}`)
  }

  if (scenario.optimalComplexity) {
    parts.push(
      `Optimal complexity: Time ${scenario.optimalComplexity.time}, Space ${scenario.optimalComplexity.space}`
    )
  }

  return parts.join("\n")
}

function getScenarioPattern(scenario: unknown): string {
  if (!scenario || typeof scenario !== "object" || !("pattern" in scenario)) {
    return "general"
  }

  const pattern = (scenario as { pattern?: unknown }).pattern
  return typeof pattern === "string" ? pattern : "general"
}

function buildHintText(
  scenario: Pick<SeedScenarioTextSource, "title">,
  hint: string,
  hintLevel: 1 | 2 | 3 | 4,
  pattern: string
): string {
  return [
    `Problem: ${scenario.title}`,
    `Pattern: ${pattern}`,
    `Hint Level ${hintLevel}: ${hint}`,
    "Category: approach",
  ].join("\n")
}

/**
 * GET endpoint to check seeding status
 */
export async function GET() {
  return NextResponse.json({
    message: "Use POST to seed vectors. Query params: limit (number), force (boolean)",
    totalScenarios: scenarios.length,
    scenarioTypes: {
      dsa: scenarios.filter((s) => s.type === "dsa").length,
      bugfix: scenarios.filter((s) => s.type === "bugfix").length,
      "system-design": scenarios.filter((s) => s.type === "system-design").length,
    },
  })
}
