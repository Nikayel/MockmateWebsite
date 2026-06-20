import { z } from "zod"
import { generateAIResponseEdge } from "@/lib/ai-providers-edge"
import type { BugfixEvidenceSummary } from "./types"
import type { BugfixScoreBreakdown } from "./types"

export const BugfixSemanticScoreSchema = z.object({
  hypothesisQuality: z.number().int().min(0).max(100),
  rootCauseAccuracy: z.number().int().min(0).max(100),
  preventionQuality: z.number().int().min(0).max(100),
  communicationScore: z.number().int().min(0).max(100),
  scoringRationale: z.string().max(500).optional(),
})

export type BugfixSemanticScores = z.infer<typeof BugfixSemanticScoreSchema>

// Safe fallback — never throws, returns neutral scores on any failure
export const BUGFIX_SEMANTIC_NEUTRAL: BugfixSemanticScores = {
  hypothesisQuality: 50,
  rootCauseAccuracy: 50,
  preventionQuality: 50,
  communicationScore: 50,
}

export interface BugfixSemanticScorerInput {
  deterministicSubScores: Omit<BugfixScoreBreakdown, "overall">
  evidenceSummary: BugfixEvidenceSummary
  rootCauseRubric: string[]
  bugDescription: string
  conversationExcerpt: string
}

export async function scoreBugfixSemantics(
  input: BugfixSemanticScorerInput
): Promise<BugfixSemanticScores> {
  try {
    const prompt = buildScorerPrompt(input)

    const response = await generateAIResponseEdge(
      "You score debugging interviews. Return ONLY valid JSON matching the specified schema. No prose, no markdown.",
      prompt,
      { maxTokens: 256, temperature: 0 }
    )

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return BUGFIX_SEMANTIC_NEUTRAL

    const parsed = JSON.parse(jsonMatch[0])
    const result = BugfixSemanticScoreSchema.safeParse(parsed)
    return result.success ? result.data : BUGFIX_SEMANTIC_NEUTRAL
  } catch {
    return BUGFIX_SEMANTIC_NEUTRAL
  }
}

function buildScorerPrompt(input: BugfixSemanticScorerInput): string {
  const { deterministicSubScores: d, evidenceSummary: e, rootCauseRubric, bugDescription } = input

  return `
You are scoring a candidate's bugfix session. You have 11 pre-computed deterministic signal
scores and must produce 4 semantic scores that require language understanding.

═══ DETERMINISTIC SIGNALS (computed from observable behavior) ═══
- Reproduced bug before editing:    ${d.reproductionDiscipline}/100
- Codebase navigation (files read): ${d.codebaseNavigation}/100
- Evidence gathering (tests/docs):  ${d.evidenceGathering}/100
- Minimal fix quality (right files):${d.minimalFixQuality}/100
- Verification discipline (tests):  ${d.verificationDiscipline}/100
- Over-edit control (no thrashing): ${d.overEditControl}/100
- AI collaboration quality:         ${d.aiCollaborationQuality}/100

═══ GROUND TRUTH (what a correct answer looks like) ═══
Root cause rubric (ALL must be addressed for full credit):
${rootCauseRubric.map((r, i) => `  ${i + 1}. ${r}`).join("\n")}

Bug description (internal ground truth, do NOT echo in output):
  ${bugDescription}

═══ CANDIDATE'S FREE TEXT ═══
Hypothesis: "${e.hypothesisText || "[none written]"}"
Root cause: "${e.rootCauseText || "[none written]"}"
Prevention: "${e.preventionText || "[none written]"}"

═══ CONVERSATION EXCERPT ═══
${input.conversationExcerpt || "[no conversation]"}

═══ SCORING TASK ═══
Score 0-100 on each dimension. Use the ground truth rubric strictly for rootCauseAccuracy.

- hypothesisQuality:  Was the hypothesis specific, plausible, and connected to the actual bug?
                      (0=no hypothesis, 40=vague guess, 70=reasonable theory, 90+=correct+specific)
- rootCauseAccuracy:  Does the root cause explanation satisfy the rubric criteria above?
                      (0=missing/wrong, 50=partially correct, 90+=matches all rubric points)
- preventionQuality:  Is the prevention idea actionable and technically sound?
                      (0=none, 40=generic advice, 70=specific, 90+=production-ready pattern)
- communicationScore: Did the candidate articulate their debugging process clearly throughout?
                      (based on conversation excerpt, 0=silent, 50=minimal, 90+=clear narration)

Return ONLY this JSON:
{
  "hypothesisQuality": 0-100,
  "rootCauseAccuracy": 0-100,
  "preventionQuality": 0-100,
  "communicationScore": 0-100,
  "scoringRationale": "one sentence explaining the rootCauseAccuracy score"
}`.trim()
}
