import { useGuidedLabStore } from "@/lib/stores/guided-lab-store"
import { isHarnessError } from "@/lib/workspace-execution/harness-errors"

interface Result {
  description?: string
  input: unknown
  passed: boolean
  error: string | null
}
/**
 * Feed workspace test results into the guided-lab gating store. For workspace
 * scenarios the execute API encodes each result's suite as `input`, so we map
 * that to {suite, passed}. No-op unless a guided lab is active.
 */
export function applyGuidedLabGating(
  scenarioId: string | undefined,
  results: Result[],
  sourceRevision: number,
  phaseId: string | undefined
): void {
  const store = useGuidedLabStore.getState()
  if (!store.config || !scenarioId || store.scenarioId !== scenarioId) return
  store.observe(
    scenarioId,
    {
      kind: "test_run",
      runId: crypto.randomUUID(),
      stale: sourceRevision !== store.sourceRevision,
      results: results.slice(0, 200).map((result) => ({
        name: String(result.description ?? result.input ?? "Workspace check").slice(0, 300),
        suite: String(result.input ?? "").slice(0, 100),
        passed: result.passed,
        harnessError: isHarnessError(result.error),
      })),
    },
    phaseId,
    sourceRevision
  )
  store.applyTestResults(
    results.map((result) => ({ suite: String(result.input ?? ""), passed: result.passed })),
    sourceRevision
  )
}
