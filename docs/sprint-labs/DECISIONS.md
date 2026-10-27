# Sprint Labs: access, execution, and grading boundaries

These are durable product and trust contracts, not a build-status ledger.
The implementation and tests remain authoritative for current availability.

## Access and rollout

- Keep Sprint Labs behind `SPRINT_LABS_ENABLED`; a flag is not proof of release.
- Sprint 1 is free for signed-in users. Sprints 2–10 require Pro.
- Submissions and cost-bearing AI routes require authentication.
- Keep learning objectives visible across catalog, standup, ticket, and retro.

## Execution and graded truth

Visible tests execute in browser workers and are formative. Browser-reported
pass/fail is never authoritative for a score.

For scored IO-cases, the server issues inputs, the client executes learner code
and returns raw outputs, and the server compares them with server-held expected
outputs. Expected answers must not ship to the client. This keeps the answer key
private, but is not server-isolated execution or proof of honest client execution.

Client-side property probes are extractable and spoofable. They may support
formative feedback, never be the sole readiness-feeding evidence.
Keep first-submit finalization, variants, budgets/cooldowns, and safe result
projections enforced server-side.

Use the existing Python/JS/TS runners and PGlite for browser Postgres semantics.
True parallelism and server-isolated grading require a future sandbox.
Describe that limitation honestly; an old “next month” message is not a delivery date.
Docker/AWS workbook stubs are not implemented runtimes.

## Workspace and partner

Provision the initial tree using the existing content/persistence machinery;
do not confuse available workbook metadata with a playable provisioned environment.
Preserve path validation, deterministic tree materialization, and stdout-only
last-marker parsing. Client marker output remains forgeable.

The partner is chat-only with the Sable persona: no edit/bash tools.
Retain policy modes, capability gates, transcripts, and spoiler filtering so
future tools do not bypass authored boundaries.

See [WORKBOOK-SPEC.md](WORKBOOK-SPEC.md), [SPRINT-PLAN.md](SPRINT-PLAN.md),
and [AGENT-CONTEXT.md](AGENT-CONTEXT.md) for the detailed authoring contracts.
