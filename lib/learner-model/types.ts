/**
 * Open learner model — shared types
 *
 * The learner model is the system's beliefs about what a user knows, derived
 * from FSRS card state, exposed for inspection (with evidence), challenge,
 * and correction. "black_box" is the study-control condition: concepts are
 * listed but every number/forecast is masked and challenges are disabled.
 */

import type { DSAPattern } from "../types/dsa-patterns"

export type LearnerModelCondition = "open" | "black_box"

export type ChallengeReason = "typo" | "rushed" | "learned_elsewhere"

export interface MemoryStrengthChip {
  score: number
  label: string
  urgency: "safe" | "ok" | "warning" | "urgent"
}

/** The model's belief about one problem card. Numeric fields are null in black-box mode. */
export interface CardBelief {
  problem_id: string
  scenario_id: string
  title: string
  pattern: DSAPattern
  difficulty: string

  /** 0-100 probability the user could solve this cold right now. */
  retrievability: number | null
  /** FSRS stability in days. */
  stability_days: number | null
  /** FSRS difficulty 1-10. */
  fsrs_difficulty: number | null
  lapses: number | null
  memory: MemoryStrengthChip | null
  /** Plain-language translation of the belief. */
  belief_text: string | null
  /** Days from now until recall drops below the solid-recall threshold. */
  days_until_forgetting: number | null
  /**
   * The card's forgetting curve, pre-sampled for rendering: recall `r` (0-100) at `t`
   * days since the last review, covering the past through the near forecast.
   *
   * Sampled here rather than in the browser on purpose. The curve is FSRS business
   * logic, so a client-side reimplementation would be a second copy of a scheduling
   * rule, and importing the real one would pull ts-fsrs into a user-facing bundle.
   * The client stays a polyline renderer.
   */
  recall_curve: Array<{ t: number; r: number }> | null

  next_review_at: string
  last_reviewed_at: string | null
  interval_days: number | null

  // Evidence summary (full per-review history comes from the evidence endpoint)
  review_count: number | null
  last_score: number | null
  average_score: number | null
  best_score: number | null
  scores_history: number[] | null
  hints_used_total: number | null
  time_spent_minutes: number | null
  mastery_level: string | null
  confidence: number | null
}

/** The model's rolled-up belief about one concept (DSA pattern or systems bucket). */
export interface ConceptBelief {
  pattern: DSAPattern
  label: string
  description: string | null

  card_count: number
  /**
   * How many of those cards have actually been reviewed. Every statistic below is
   * computed over these, not over card_count, so the UI has to be able to say which
   * number a claim is about.
   */
  reviewed_count: number
  mastered: number
  reviewing: number
  learning: number
  new_count: number

  mean_retrievability: number | null
  min_retrievability: number | null
  mean_stability_days: number | null
  belief_text: string | null
  forgetting_soonest: { problem_id: string; title: string; days: number } | null

  cards: CardBelief[]
}

export interface LearnerModelPayload {
  generated_at: string
  condition: LearnerModelCondition
  challenges_enabled: boolean
  total_cards: number
  /** DSA concepts, most at-risk first. */
  concepts: ConceptBelief[]
  /** The case-lab systems bucket (System Design, labs), rendered separately. */
  systems: ConceptBelief[]
}
