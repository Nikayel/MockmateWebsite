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

/** Characters of transcript sent to the scorer. ~1.5k tokens, once per session. */
export const BUGFIX_TRANSCRIPT_BUDGET = 6000

/**
 * Fit a transcript to `budget` while keeping BOTH ends.
 *
 * The three scored language dimensions sit at opposite ends of a session: the hypothesis
 * is stated early, the root cause and prevention at the debrief. Truncating from either
 * side drops a dimension's only evidence and scores it 0 for a candidate who did state it.
 * So keep a head and a tail and mark the elision.
 */
export function fitTranscript(transcript: string, budget = BUGFIX_TRANSCRIPT_BUDGET): string {
  if (transcript.length <= budget) return transcript

  const marker = "\n\n[... middle of the session omitted for length ...]\n\n"
  const keep = budget - marker.length
  if (keep <= 0) return transcript.slice(0, budget)

  // Favor the tail: the debrief carries two of the three dimensions.
  const head = Math.floor(keep * 0.4)
  const tail = keep - head
  return `${transcript.slice(0, head)}${marker}${transcript.slice(-tail)}`
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

/**
 * Render the candidate's reasoning for the scorer.
 *
 * The session used to carry three textareas (Hypothesis / Root cause / Prevention) whose
 * contents landed on the evidence summary. They are gone: a real debugging round does not
 * hand you a form, you say these things to the interviewer. So the transcript is now the
 * primary evidence, and these fields are only ever populated by a legacy session restored
 * from Firestore. Render them when present so old sessions score as they always did.
 */
function renderCandidateReasoning(e: BugfixEvidenceSummary): string {
  const written = [
    ["Hypothesis", e.hypothesisText],
    ["Root cause", e.rootCauseText],
    ["Prevention", e.preventionText],
  ].filter(([, text]) => Boolean(text?.trim()))

  if (written.length === 0) {
    return `[This session captured no written notes. The candidate states their hypothesis, root
cause, and prevention by TALKING TO THE INTERVIEWER, so score those three dimensions from the
transcript below. Absence of a written note is NOT evidence of absence -- read the transcript.]`
  }

  return written.map(([label, text]) => `${label}: "${text}"`).join("\n")
}

function buildScorerPrompt(input: BugfixSemanticScorerInput): string {
  const { deterministicSubScores: d, evidenceSummary: e, rootCauseRubric, bugDescription } = input

  return `
You are scoring a candidate's bugfix session. You have 7 pre-computed deterministic signal
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

═══ CANDIDATE'S WRITTEN NOTES (legacy sessions only) ═══
${renderCandidateReasoning(e)}

═══ CONVERSATION TRANSCRIPT (the primary evidence) ═══
${input.conversationExcerpt || "[no conversation]"}

═══ SCORING TASK ═══
Score 0-100 on each dimension. Use the ground truth rubric strictly for rootCauseAccuracy.

Read the transcript for the candidate's reasoning. They are not asked to fill in a form, so a
hypothesis stated in conversation ("I think the dedup key is per-stream, so a cross-replica
event double counts") counts in full. Reason stated informally still counts. Only score 0 when
the candidate genuinely never expressed the idea.

- hypothesisQuality:  Was the hypothesis specific, plausible, and connected to the actual bug?
                      (0=never stated one, 40=vague guess, 70=reasonable theory, 90+=correct+specific)
- rootCauseAccuracy:  Does their root cause explanation satisfy the rubric criteria above?
                      (0=missing/wrong, 50=partially correct, 90+=matches all rubric points)
- preventionQuality:  Is their prevention idea actionable and technically sound?
                      (0=never raised, 40=generic advice, 70=specific, 90+=production-ready pattern)
- communicationScore: Did the candidate articulate their debugging process clearly throughout?
                      (0=silent, 50=minimal, 90+=clear narration)

Return ONLY this JSON:
{
  "hypothesisQuality": 0-100,
  "rootCauseAccuracy": 0-100,
  "preventionQuality": 0-100,
  "communicationScore": 0-100,
  "scoringRationale": "one sentence explaining the rootCauseAccuracy score"
}`.trim()
}
