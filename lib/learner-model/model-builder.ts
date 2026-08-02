/**
 * Builds the open learner model from the user's problem_mastery cards.
 *
 * One Firestore read (getAllUserProblems); everything else is derived with
 * the existing FSRS helpers — reconstructState, estimateRetentionForAlgorithm
 * and getMemoryStrength (this module is that exported helper's first real
 * caller). Universal FSRS is assumed (the A/B has ended); cards flow through
 * reconstructState which seeds legacy shapes safely.
 */

import { getAllUserProblems, type ProblemMastery } from "../spaced-repetition"
import {
  reconstructState,
  estimateRetention,
  getMemoryStrength,
} from "../spaced-repetition/algorithm-router"
import { calculateRetrievability } from "../spaced-repetition/fsrs-algorithm"
import { DSA_PATTERNS, PATTERN_METADATA, type DSAPattern } from "../types/dsa-patterns"
import { formatPatternLabel } from "../pattern-labels"
import { daysUntilRetentionDrops, describeCardBelief, describeConceptBelief } from "./translate"
import type { CardBelief, ConceptBelief, LearnerModelPayload } from "./types"

/** Cards below this retrievability count as "at risk" in concept summaries. */
const AT_RISK_RETRIEVABILITY = 70

/** Samples in a rendered forgetting curve. Enough for a smooth path, small in JSON. */
const RECALL_CURVE_SAMPLES = 16

/**
 * Sample the card's forgetting curve from its last review through a forecast window,
 * so the client can draw the model's mechanism instead of just its output.
 *
 * The window always spans the elapsed time AND enough future to show the curve
 * crossing the solid-recall line; a card that is already past it still gets a
 * forward-looking tail so the shape reads as decay rather than a flat floor.
 */
function sampleRecallCurve(
  stability: number,
  elapsedDays: number,
  daysUntilForgetting: number | null
): Array<{ t: number; r: number }> {
  const forecast = Math.max(elapsedDays + (daysUntilForgetting ?? 0), elapsedDays, 1) * 1.6
  const step = forecast / (RECALL_CURVE_SAMPLES - 1)
  return Array.from({ length: RECALL_CURVE_SAMPLES }, (_, i) => {
    const t = Math.round(i * step * 10) / 10
    return { t, r: Math.round(calculateRetrievability(stability, t) * 1000) / 10 }
  })
}

function daysSince(iso: string | undefined | null, now: Date): number {
  if (!iso) return 0
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 0
  return Math.max(0, (now.getTime() - then) / (1000 * 60 * 60 * 24))
}

/** Derive the model's belief about a single card. Pure given `now`. */
export function buildCardBelief(card: ProblemMastery, now: Date = new Date()): CardBelief {
  const base = {
    problem_id: card.problem_id,
    scenario_id: card.scenario_id || card.problem_id,
    title: card.title || card.problem_id,
    pattern: card.pattern,
    difficulty: card.difficulty,
    next_review_at: card.next_review_at,
    last_reviewed_at: card.last_reviewed_at ?? null,
    interval_days: card.interval_days ?? null,
    review_count: card.review_count ?? 0,
    last_score: card.last_score ?? null,
    average_score: card.average_score ?? null,
    best_score: card.best_score ?? null,
    scores_history: card.scores_history ?? [],
    hints_used_total: card.hints_used_total ?? null,
    time_spent_minutes: card.time_spent_minutes ?? null,
    mastery_level: card.mastery_level ?? null,
    confidence: card.confidence ?? null,
  }

  // Never reviewed: the model has no evidence yet — say so instead of faking a number.
  if (!card.review_count || card.review_count <= 0) {
    return {
      ...base,
      retrievability: null,
      stability_days: null,
      fsrs_difficulty: null,
      lapses: null,
      memory: null,
      belief_text:
        "No reviews yet — the system has no evidence about this problem. Solve it once to give the model something to reason about.",
      days_until_forgetting: null,
      recall_curve: null,
    }
  }

  const state = reconstructState("fsrs", card)
  const elapsed = daysSince(card.last_reviewed_at, now)
  const retrievability = estimateRetention("fsrs", state, elapsed)
  const memory = getMemoryStrength("fsrs", state, elapsed)
  const stability = state.fsrs_state?.stability ?? null
  const forgetIn = stability !== null ? daysUntilRetentionDrops(stability, elapsed) : null

  return {
    ...base,
    retrievability,
    stability_days: stability !== null ? Math.round(stability * 10) / 10 : null,
    fsrs_difficulty:
      state.fsrs_state?.difficulty !== undefined
        ? Math.round(state.fsrs_state.difficulty * 10) / 10
        : null,
    lapses: state.fsrs_state?.lapses ?? null,
    memory,
    belief_text: describeCardBelief(retrievability, forgetIn ?? 0),
    days_until_forgetting: forgetIn,
    recall_curve: stability !== null ? sampleRecallCurve(stability, elapsed, forgetIn) : null,
  }
}

function buildConcept(pattern: DSAPattern, cards: CardBelief[]): ConceptBelief {
  const reviewed = cards.filter((c) => c.retrievability !== null)
  const counts = {
    mastered: cards.filter((c) => c.mastery_level === "mastered").length,
    reviewing: cards.filter((c) => c.mastery_level === "reviewing").length,
    learning: cards.filter((c) => c.mastery_level === "learning").length,
    new_count: cards.filter((c) => !c.mastery_level || c.mastery_level === "new").length,
  }

  const meanRet =
    reviewed.length > 0
      ? Math.round(reviewed.reduce((sum, c) => sum + (c.retrievability ?? 0), 0) / reviewed.length)
      : null
  const minRet =
    reviewed.length > 0 ? Math.min(...reviewed.map((c) => c.retrievability ?? 0)) : null
  const meanStability =
    reviewed.length > 0
      ? Math.round(
          (reviewed.reduce((sum, c) => sum + (c.stability_days ?? 0), 0) / reviewed.length) * 10
        ) / 10
      : null

  const soonest = reviewed
    .filter((c) => c.days_until_forgetting !== null)
    .sort((a, b) => (a.days_until_forgetting ?? 0) - (b.days_until_forgetting ?? 0))[0]

  const atRisk = reviewed.filter((c) => (c.retrievability ?? 100) < AT_RISK_RETRIEVABILITY).length

  const metadata = PATTERN_METADATA[pattern]
  const label = metadata?.name ?? formatPatternLabel(pattern)

  return {
    pattern,
    label,
    description: metadata?.description ?? null,
    card_count: cards.length,
    reviewed_count: reviewed.length,
    ...counts,
    mean_retrievability: meanRet,
    min_retrievability: minRet,
    mean_stability_days: meanStability,
    belief_text:
      meanRet !== null ? describeConceptBelief(label, meanRet, reviewed.length, atRisk) : null,
    forgetting_soonest: soonest
      ? {
          problem_id: soonest.problem_id,
          title: soonest.title,
          days: soonest.days_until_forgetting ?? 0,
        }
      : null,
    // Most at-risk cards first inside a concept.
    cards: [...cards].sort((a, b) => (a.retrievability ?? 101) - (b.retrievability ?? 101)),
  }
}

/** Build the full learner model for a user (one Firestore read). */
export async function buildLearnerModel(userId: string): Promise<LearnerModelPayload> {
  const problems = await getAllUserProblems(userId)
  const now = new Date()

  const byPattern = new Map<DSAPattern, CardBelief[]>()
  for (const problem of problems) {
    const belief = buildCardBelief(problem, now)
    const list = byPattern.get(belief.pattern) ?? []
    list.push(belief)
    byPattern.set(belief.pattern, list)
  }

  const concepts: ConceptBelief[] = []
  const systems: ConceptBelief[] = []
  for (const [pattern, cards] of byPattern) {
    const concept = buildConcept(pattern, cards)
    if (pattern === DSA_PATTERNS.CASE_LAB) {
      systems.push(concept)
    } else {
      concepts.push(concept)
    }
  }

  // Most at-risk concepts first (nulls — all-new concepts — last).
  const riskOrder = (c: ConceptBelief) => c.min_retrievability ?? 101
  concepts.sort((a, b) => riskOrder(a) - riskOrder(b))

  return {
    generated_at: now.toISOString(),
    condition: "open",
    challenges_enabled: true,
    total_cards: problems.length,
    concepts,
    systems,
  }
}

/**
 * The black-box (control) condition: concepts and titles stay listed so the
 * control group still has a page to visit — making view events comparable —
 * but every number, forecast, and explanation is withheld and challenges are
 * disabled.
 */
export function maskForBlackBox(payload: LearnerModelPayload): LearnerModelPayload {
  const maskCard = (card: CardBelief): CardBelief => ({
    ...card,
    retrievability: null,
    stability_days: null,
    fsrs_difficulty: null,
    lapses: null,
    memory: null,
    belief_text: null,
    days_until_forgetting: null,
    // The curve IS the belief, plotted. Leaving it would hand the control group the
    // exact number every other field is masking.
    recall_curve: null,
    interval_days: null,
    review_count: null,
    last_score: null,
    average_score: null,
    best_score: null,
    scores_history: null,
    hints_used_total: null,
    time_spent_minutes: null,
    mastery_level: null,
    confidence: null,
  })

  const maskConcept = (concept: ConceptBelief): ConceptBelief => ({
    ...concept,
    mastered: 0,
    reviewing: 0,
    learning: 0,
    new_count: 0,
    mean_retrievability: null,
    min_retrievability: null,
    mean_stability_days: null,
    belief_text: null,
    forgetting_soonest: null,
    cards: concept.cards.map(maskCard),
  })

  return {
    ...payload,
    condition: "black_box",
    challenges_enabled: false,
    concepts: payload.concepts.map(maskConcept),
    systems: payload.systems.map(maskConcept),
  }
}
