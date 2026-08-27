// Browser-safe surface ONLY. Deliberately does NOT re-export node-runner.ts: that module imports
// the real `@electric-sql/pglite` npm package (Node-native, no reason to ever reach a browser
// bundle) and `node:path`/`node:url` at load time, mirroring exactly why
// ts-workspace/index.ts excludes node-harness.ts from ITS barrel. `runPgSuiteNode` is reachable
// only via its own path: `@/lib/workspace-execution/pg-sandbox/node-runner`.
export { runPgSuite } from "./runner"
export { runPgInWorker } from "./worker-runner"
export { isPgRuntimeWarm, markPgRuntimeWarm, prewarmPgRuntime } from "./warm-state"
export type {
  PgSuite,
  PgSuiteAssertion,
  PgSuiteOptions,
  PgWorkerRequest,
  PgWorkerRunResult,
} from "./types"
