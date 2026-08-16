/**
 * Case Lab registry. Authored labs are registered here; the app resolves a lab
 * definition by id (the run's `caseLabId`).
 */

import type { DifficultyLevel } from "@/lib/scenarios/types"
import type { CaseLab } from "@/lib/labs/types"
import { palantir911Dispatch } from "./palantir-911-dispatch"
import { palantirUsageRollup } from "./palantir-usage-rollup"
import { palantirOntologyLearning } from "./palantir-ontology-learning"
import { stripeBillingWebhook } from "./stripe-billing-webhook"

const CASE_LABS: CaseLab[] = [
  palantir911Dispatch,
  palantirUsageRollup,
  palantirOntologyLearning,
  stripeBillingWebhook,
]

export function getCaseLabById(id: string): CaseLab | undefined {
  return CASE_LABS.find((lab) => lab.id === id)
}

export function listCaseLabs(): CaseLab[] {
  return CASE_LABS
}

const DIFFICULTY_RANK: Record<DifficultyLevel, number> = { easy: 0, medium: 1, hard: 2 }

/**
 * The lab to point a first-time visitor at.
 *
 * `/labs` needs one primary call to action, and naming a lab id in the page markup would rot the
 * day that lab is renamed or retired — quietly, into a 404 on the page's most important link.
 * Gentlest first (lowest difficulty, then shortest) is the honest answer to "where do I start", and
 * it stays correct as the registry grows.
 */
export function getStarterCaseLab(): CaseLab | undefined {
  return [...CASE_LABS].sort(
    (a, b) =>
      DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
      a.estimatedMinutes - b.estimatedMinutes
  )[0]
}

export { palantir911Dispatch, palantirUsageRollup, palantirOntologyLearning, stripeBillingWebhook }
