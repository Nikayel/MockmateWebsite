import { describe, expect, it } from "vitest"

import { runTsInWorker } from "../worker-runner"

/**
 * The persistent-worker two-phase-timeout orchestration itself (mirroring
 * python-sandbox/worker-runner.ts, which has no dedicated unit test either) is not practically
 * unit-testable without a real Worker/importScripts environment — see the task report for how
 * that path is verified instead (the worker-simulation test plus manual/parity reasoning).
 * This covers the one behavior that IS safely testable in Node: the non-browser guard every
 * other *-sandbox worker-runner shares.
 */
describe("runTsInWorker", () => {
  it("resolves with a clear error instead of throwing when not in a browser", async () => {
    const result = await runTsInWorker({ files: [], testPaths: [], hiddenTestPaths: [] })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not.*browser/i)
  })
})
