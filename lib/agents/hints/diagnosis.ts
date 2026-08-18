import type { HintCategory, HintDiagnosis, HintGenerationRequest, HintLevel } from "./types"
import type { StruggleLevel } from "./struggle-calculator"

/**
 * Deterministic hint diagnosis.
 *
 * This used to be an LLM call: Luna was asked, on every hint generation, to
 * emit routing booleans (shouldUseRag, recommendedLevel, ...) from signals the
 * client had already computed locally - paying a model to decide whether to
 * call another model, doubling the cost and latency of every generation. The
 * deterministic mapping below was originally its FALLBACK; measured against a
 * month of usage (2026-08-18) the LLM's routing added nothing the fallback
 * didn't already express, so the fallback was promoted to the only path. The
 * one remaining LLM call in the hint pipeline is the one that writes the hint
 * text itself.
 */

function primaryNeedFor(request: HintGenerationRequest): HintCategory {
  if (request.trigger === "test_failed" || (request.testResults?.failingTests?.length ?? 0) > 0) {
    return "debugging"
  }

  if (!request.userCode.trim()) {
    return "conceptual"
  }

  if (request.trigger === "test_passed" && request.optimalComplexity) {
    return "optimization"
  }

  if (request.trigger === "code_change") {
    return "implementation"
  }

  return "approach"
}

export function buildDeterministicDiagnosis(
  request: HintGenerationRequest,
  struggleLevel: StruggleLevel,
  recommendedRevealLevel: HintLevel
): HintDiagnosis {
  const primaryNeed = primaryNeedFor(request)
  const failingCount = request.testResults?.failingTests?.length ?? 0

  // Hard signals (failing tests, an empty editor) justify high confidence;
  // everything else scales with how much struggle the metrics show.
  const confidence =
    failingCount > 0 || !request.userCode.trim()
      ? 0.9
      : struggleLevel === "high"
        ? 0.75
        : struggleLevel === "moderate"
          ? 0.65
          : 0.55

  const reasonByNeed: Record<HintCategory, string> = {
    debugging: "Failing tests point at a concrete bug to chase.",
    conceptual: "No code yet, so the underlying idea is the useful nudge.",
    optimization: "Tests pass and a target complexity exists to compare against.",
    implementation: "Code is actively changing; translation into working code is the gap.",
    approach: "Code exists but is not converging; the algorithm choice is the likely gap.",
  }

  return {
    primaryNeed,
    confidence,
    reason: reasonByNeed[primaryNeed],
    evidence: [
      `trigger=${request.trigger || "manual"}`,
      `tests=${
        request.testResults ? `${request.testResults.passed}/${request.testResults.total}` : "none"
      }`,
      `struggle=${struggleLevel}`,
    ],
    recommendedLevel: recommendedRevealLevel,
    shouldUseRag: primaryNeed !== "debugging",
    shouldUseUserHistory: true,
    shouldUsePatternKnowledge: primaryNeed === "conceptual" || primaryNeed === "approach",
    shouldUseTestFailures: primaryNeed === "debugging",
  }
}

/**
 * Kept as the graph node's entry point (async signature preserved so the
 * LangGraph node needs no change). Also retained under its old fallback name
 * for any legacy import.
 */
export async function diagnoseHintNeed(params: {
  request: HintGenerationRequest
  struggleLevel: StruggleLevel
  recommendedRevealLevel: HintLevel
}): Promise<HintDiagnosis> {
  return buildDeterministicDiagnosis(
    params.request,
    params.struggleLevel,
    params.recommendedRevealLevel
  )
}

export function buildFallbackDiagnosis(
  request: HintGenerationRequest,
  recommendedRevealLevel: HintLevel
): HintDiagnosis {
  return buildDeterministicDiagnosis(request, "none", recommendedRevealLevel)
}
