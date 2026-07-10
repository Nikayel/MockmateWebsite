/**
 * Case Lab registry. Authored labs are registered here; the app resolves a lab
 * definition by id (the run's `caseLabId`).
 */

import type { CaseLab } from "@/lib/labs/types"
import { palantir911Dispatch } from "./palantir-911-dispatch"
import { palantirUsageRollup } from "./palantir-usage-rollup"
import { stripeBillingWebhook } from "./stripe-billing-webhook"

const CASE_LABS: CaseLab[] = [palantir911Dispatch, palantirUsageRollup, stripeBillingWebhook]

export function getCaseLabById(id: string): CaseLab | undefined {
  return CASE_LABS.find((lab) => lab.id === id)
}

export function listCaseLabs(): CaseLab[] {
  return CASE_LABS
}

export { palantir911Dispatch, palantirUsageRollup, stripeBillingWebhook }
