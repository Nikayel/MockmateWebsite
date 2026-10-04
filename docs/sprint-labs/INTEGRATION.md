# Sprint Labs integration guide

Use the current modules below when extending Sprint Labs.
This is an integration map, not a dated inventory or delivery report.
[DECISIONS.md](DECISIONS.md) defines access and grading boundaries.

## Modules to reuse

| Concern | Source |
| --- | --- |
| Types and content registry | `lib/sprint-labs/types.ts`, `content/types.ts`, `content/registry.ts` |
| Owned runs and file persistence | `lib/sprint-labs/runs.ts`, `workspace-files.ts`, `runs-client.ts` |
| Provisioning | `lib/sprint-labs/provisioning/materialize-initial-tree.ts` |
| Workspace and visible tests | `lib/sprint-labs/workspace/`, `components/sprint-labs/workspace/` |
| Client IO-case execution | `lib/sprint-labs/runtime/io-case-executor.ts` |
| Server-only expected outputs | `lib/scenarios/sealed/sprint-labs/` |
| Attempt lifecycle, budgets, scoring | `lib/sprint-labs/grading/` |
| Auth and access | `lib/sprint-labs/route-guards.ts`, `entitlements.ts` |
| Chat context, modes, transcripts | `lib/sprint-labs/partner/` |
| API routes | `app/api/sprint-labs/` |
| Authoring validation | `lib/sprint-labs/validate/` |

Browser execution already includes TypeScript transpilation and Postgres:
`public/workers/ts-transpiler-loader.js`, `pg-sandbox-worker.js`, and
`pg-suite-core.mjs`. Reuse them rather than planning a second runtime from
an obsolete inventory.

## Integration contracts

- Authenticate and authorize before provisioning, submissions, and AI work.
- Keep ownership and document shapes explicit; see
  [FIREBASE_STRUCTURE.md](../FIREBASE_STRUCTURE.md).
- Preserve validated paths and per-file persistence; do not store an unbounded
  workspace in a single Firestore document.
- Keep expected outputs server-only. Score through server comparisons, never
  client-reported pass/fail.
- Reuse metered AI and declare the service in `lib/usage/services.ts`;
  do not duplicate spend recording.
- Keep Sprint Labs mastery separate from DSA patterns.
- Preserve flag reads, loading/error/access states, and objective visibility.
- Preserve safe grading projections and spoiler boundaries.

## Verification

Run focused module tests, then affected route/UI tests. Useful boundaries include
`entitlements.test.ts`, `sealing.test.ts`, `mer-101-end-to-end.test.ts`,
grading tests, and tests under `app/api/sprint-labs/`.
Compiler tests may require permission to create local IPC sockets.
Unit tests do not verify deployed flags or real AI providers.

See [AUTHORING-RULES.md](AUTHORING-RULES.md), [WORKBOOK-SPEC.md](WORKBOOK-SPEC.md),
and [SPRINT-PLAN.md](SPRINT-PLAN.md) for content contracts.
