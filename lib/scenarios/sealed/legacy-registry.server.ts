/**
 * Sealed legacy-scenario registry (SERVER-ONLY). Mirrors the sealed-PACK registry
 * (`registry.server.ts`) for the 10 legacy bugfix scenarios and the 4
 * add-functionality scenarios whose answer content (root cause, ground truth,
 * scoring rubric, and the complete reference solution) used to ship in the client
 * bundle.
 *
 * The real answer for each scenario lives in `./legacy/<id>.server.ts`; the client
 * module keeps only the symptom-level brief and the generic process rubric. This
 * module is the ONLY loader for that sealed content and is imported ONLY by the
 * feedback stream route, the admin bugfix-quality route, the RAG bugfix
 * vectorization job, and the node-side test gates (enforced by the sealing
 * import-graph test). The window guard is the runtime seal (this repo has no
 * server-only package).
 */
import type { BugFixScenario, WorkspaceScenarioFile } from "@/lib/scenarios/types"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

/**
 * The answer half of a legacy scenario, moved out of the client module.
 *
 * `referenceFiles` (the complete fixed solution) is always present. The bugfix
 * fields are present only for the 10 legacy bugfix scenarios; the 4
 * add-functionality scenarios seal only their reference solution because no
 * runtime code reads their bug description / ground truth / rubric.
 */
export interface SealedLegacyScenario {
  id: string
  referenceFiles: WorkspaceScenarioFile[]
  bugDescription?: string
  groundTruth?: string
  rootCauseRubric?: string[]
}

const SEALED_LEGACY_LOADERS: Record<string, () => Promise<{ sealed: SealedLegacyScenario }>> = {
  "bugfix-search-race": () => import("./legacy/bugfix-search-race.server"),
  "bugfix-billing-webhook-idempotency": () =>
    import("./legacy/bugfix-billing-webhook-idempotency.server"),
  "bugfix-api-rate-limiter-workspace": () =>
    import("./legacy/bugfix-api-rate-limiter-workspace.server"),
  "bugfix-comment-thread-merge": () => import("./legacy/bugfix-comment-thread-merge.server"),
  "bugfix-event-aggregation-retries": () =>
    import("./legacy/bugfix-event-aggregation-retries.server"),
  "bugfix-feature-pipeline-nan-workspace": () =>
    import("./legacy/bugfix-feature-pipeline-nan-workspace.server"),
  "bugfix-temperature-alert-regression": () =>
    import("./legacy/bugfix-temperature-alert-regression.server"),
  "bugfix-onboarding": () => import("./legacy/bugfix-onboarding.server"),
  "bugfix-bookclub-reading-streak-workspace": () =>
    import("./legacy/bugfix-bookclub-reading-streak-workspace.server"),
  "bugfix-foundry-usage-rollup": () => import("./legacy/bugfix-foundry-usage-rollup.server"),
  // The two Palantir case-lab build scenarios key on their runtime scenario id,
  // which differs from the module filename (palantir-*-build, not add-feature-*).
  "add-feature-support-ticket-search": () =>
    import("./legacy/add-feature-support-ticket-search.server"),
  "add-feature-digest-scheduler": () => import("./legacy/add-feature-digest-scheduler.server"),
  "palantir-911-dispatch-build": () => import("./legacy/palantir-911-dispatch-build.server"),
  "palantir-ontology-org-build": () => import("./legacy/palantir-ontology-org-build.server"),
}

export function hasSealedLegacyBugfix(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(SEALED_LEGACY_LOADERS, id)
}

export async function loadSealedLegacyBugfix(id: string): Promise<SealedLegacyScenario | null> {
  const loader = SEALED_LEGACY_LOADERS[id]
  if (!loader) return null
  const mod = await loader()
  return mod.sealed
}

/**
 * The sealed reference solution for any of the 14 scenarios. Used by the node-side
 * workspace-runner and case-lab wiring gates, which apply the fixed files over the
 * starter workspace and assert the suite goes green.
 */
export async function loadSealedLegacyReferenceFiles(
  id: string
): Promise<WorkspaceScenarioFile[] | null> {
  const sealed = await loadSealedLegacyBugfix(id)
  return sealed ? sealed.referenceFiles : null
}

/**
 * Re-merge the sealed answer content back onto a client scenario, server-side.
 * The admin audit and RAG vectorization need the real bug description, rubric, and
 * reference solution that the client module no longer carries. Scoring behavior is
 * preserved because the values are the exact ones that used to live on the client.
 */
export async function hydrateSealedLegacyBugfix(
  scenario: BugFixScenario
): Promise<BugFixScenario> {
  const sealed = await loadSealedLegacyBugfix(scenario.id)
  if (!sealed) return scenario
  return {
    ...scenario,
    bugDescription: sealed.bugDescription ?? scenario.bugDescription,
    ...(sealed.groundTruth !== undefined ? { groundTruth: sealed.groundTruth } : {}),
    ...(sealed.rootCauseRubric !== undefined ? { rootCauseRubric: sealed.rootCauseRubric } : {}),
    ...(scenario.workspace
      ? { workspace: { ...scenario.workspace, referenceFiles: sealed.referenceFiles } }
      : {}),
  }
}

export function sealedLegacyScenarioIds(): string[] {
  return Object.keys(SEALED_LEGACY_LOADERS)
}
