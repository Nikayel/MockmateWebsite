import { NextRequest, NextResponse } from "next/server"
import { scenarios } from "@/lib/scenarios"
import {
  generateTextEmbedding,
  storeTextEmbedding,
  embedAndStoreHint,
  type TextEmbedding,
} from "@/lib/embeddings"

/**
 * API endpoint to seed the vector DB with problem embeddings
 * This should be run once to initialize the RAG system
 *
 * POST /api/seed-vectors
 * Query params:
 * - limit: number of scenarios to process (default: all)
 * - force: overwrite existing embeddings (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "0") || scenarios.length
    const force = searchParams.get("force") === "true"

    const results = {
      processed: 0,
      problems: 0,
      hints: 0,
      errors: [] as string[],
    }

    // Process scenarios
    const scenariosToProcess = scenarios.slice(0, limit)

    for (const scenario of scenariosToProcess) {
      try {
        // Build full problem text for embedding
        const problemText = buildProblemText(scenario)
        const vector = generateTextEmbedding(problemText)

        // Store problem embedding
        const problemEmbedding: TextEmbedding = {
          text: problemText,
          type: "problem",
          vector,
          metadata: {
            problemId: scenario.id,
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
              await embedAndStoreHint(
                scenario.id,
                hint,
                i + 1, // Hint level (1, 2, 3...)
                {
                  problemTitle: scenario.title,
                  problemType: scenario.type,
                  tags: scenario.tags || [],
                }
              )
              results.hints++
            } catch (hintError) {
              results.errors.push(`Hint error for ${scenario.id}: ${hintError}`)
            }
          }
        }

        results.processed++

        // Log progress every 10 scenarios
        if (results.processed % 10 === 0) {
          console.log(`[Seed Vectors] Processed ${results.processed}/${scenariosToProcess.length}`)
        }
      } catch (error) {
        results.errors.push(`Error processing ${scenario.id}: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.processed} scenarios with ${results.problems} problem embeddings and ${results.hints} hint embeddings`,
      results,
    })
  } catch (error) {
    console.error("Seed vectors error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed vectors" },
      { status: 500 }
    )
  }
}

/**
 * Build full problem text for embedding
 */
function buildProblemText(scenario: any): string {
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
        .map((ex: any) => `Input: ${ex.input}, Output: ${ex.output}`)
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
