/**
 * Build-scenario -> parent Case Lab pointers for the practice browser.
 *
 * The four Case Lab Build exercises are also registered as standalone
 * scenarios in the Debugging track, and that door scores them as full
 * interviews (communication included) while the lab door scores Build tests
 * only. Users who arrive through the browser deserve to know the guided
 * version exists before they choose (a real user prepped Palantir through the
 * standalone door without ever learning the labs existed).
 *
 * HAND-WRITTEN map rather than derived from the lab registry: scenario cards
 * are client components, and the registry carries every lab's full content.
 * lab-links.test.ts asserts a bijection against the live registry, so an
 * entry cannot drift, vanish, or be invented at the call site.
 */

export interface ScenarioLabLink {
  labId: string
  labTitle: string
}

export const SCENARIO_LAB_LINKS: Record<string, ScenarioLabLink> = {
  "palantir-911-dispatch-build": {
    labId: "palantir-911-dispatch",
    labTitle: "911 Dispatch Optimization",
  },
  "palantir-ontology-org-build": {
    labId: "palantir-ontology-learning",
    labTitle: "Ontology Learning Round",
  },
  "bugfix-foundry-usage-rollup": {
    labId: "palantir-usage-rollup",
    labTitle: "Usage Rollup Double-Count",
  },
  "bugfix-billing-webhook-idempotency": {
    labId: "stripe-billing-webhook",
    labTitle: "Billing Webhook Idempotency",
  },
}

export function getScenarioLabLink(scenarioId: string | undefined): ScenarioLabLink | null {
  if (!scenarioId) return null
  return SCENARIO_LAB_LINKS[scenarioId] ?? null
}
