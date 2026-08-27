// Browser-safe surface ONLY. Deliberately does NOT re-export node-harness.ts (or
// transpile-cache.ts / require-graph.ts, which only node-harness.ts consumes): that module
// imports `node:module`/`node:path`/`node:url` and the full `typescript` package at load time
// (createRequire/fileURLToPath run at module scope, not lazily), and browser-execution.ts imports
// THIS barrel to reach the client runner below. Mixing them into one barrel risks a bundler
// failing to tree-shake the unused Node-only binding out of the browser bundle. `runTsWorkspace`
// is reachable only via its own path: `@/lib/workspace-execution/ts-workspace/node-harness`.
export { executeWorkspaceScenarioTsClientSide } from "./workspace-runner"
export { runTsInWorker } from "./worker-runner"
export type { TsWorkerData, TsWorkerFile, TsWorkerRunResult } from "./worker-runner"
export type { TsWorkspaceFile, TsWorkspaceInput, TsWorkspaceRunResult } from "./types"
