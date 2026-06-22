# CLAUDE.md

This file gives AI coding agents and human contributors the working rules for this repository. Follow the constitution in `constitution/` and the engineering standards below.

## Project Context

CodeSparring is an AI-powered coding interview practice platform built in the `MockmateWebsite` repository. The product combines AI interviewer chat, an in-browser code editor, executable tests, feedback, spaced repetition, roadmaps, billing, and admin tooling.

## Working Rules

- Read nearby code before editing.
- Match existing project patterns before introducing new abstractions.
- Keep changes scoped to the user request.
- Do not revert unrelated user changes.
- Prefer clear, boring, maintainable code over clever code.
- Run focused checks after meaningful changes.

## Engineering Principles

### Maintainability

- Keep files focused and cohesive.
- Split files when they become hard to scan or mix unrelated responsibilities.
- Move reusable business logic into `lib/` services.
- Keep `app/api/*/route.ts` handlers thin: parse, auth, validate, call service, return response.
- Keep UI components readable and split complex behavior into hooks or smaller components.

### DRY

- Do not duplicate business rules, auth checks, validation schemas, scoring formulas, entitlement logic, or Firestore document-shape assumptions.
- Do not create an abstraction just because two lines look similar.
- Extract shared helpers when the shared concept has a stable name and reduces real maintenance risk.

### File Size

- Treat large logic-heavy files as a warning sign.
- Split by responsibility: component, hook, service, schema, type, test, fixture.
- Large structured scenario/data files are acceptable when they are mostly content.
- Avoid files that combine UI, API calls, scoring, validation, and persistence in one place.

### Naming

- Use names that explain purpose.
- Components: `PascalCase`.
- Hooks: `useThing`.
- Types/interfaces: `PascalCase`.
- Functions/variables: `camelCase`.
- True constants: `UPPER_SNAKE_CASE`.
- Avoid vague names like `utils`, `helper`, `manager`, `data`, `item`, and `thing` unless the scope is tiny and obvious.
- Follow the existing file-name convention in each folder.

### TypeScript

- Avoid `any`.
- Use `unknown` for untrusted inputs, then narrow or validate.
- Define explicit types at API, service, and data boundaries.
- Use Zod or local validators for runtime input.
- Prefer discriminated unions for status/state variants.

### React

- Use existing `components/ui/` primitives first.
- Keep server/client component boundaries intentional.
- Handle loading, empty, error, disabled, and unauthorized states.
- Keep derived state simple; avoid syncing state that can be computed.
- Preserve accessibility with semantic markup, labels, keyboard support, and focus states.

### API, Auth, and Data

- Authenticate and authorize protected routes before doing work.
- Validate request bodies, query params, and webhooks.
- Keep server secrets out of client code.
- Treat Firestore document shapes as contracts.
- Keep admin actions role-gated and auditable.
- Return useful errors without leaking sensitive internals.

### AI, Cost, and Reliability

- Avoid duplicate AI calls and repeated vector searches.
- Cache only with clear invalidation rules.
- Use feature flags for risky or expensive behavior changes.
- Make third-party failures graceful and user-readable.
- Track expensive paths: LLM calls, embeddings, vector search, code execution, email, and billing webhooks.

### Testing

- Add or update tests for business logic, scoring, scheduling, validation, and auth-sensitive behavior.
- Add regression tests for fixed bugs.
- Prefer focused tests over broad brittle tests.
- Run the smallest useful verification first, then broader checks when risk justifies it.

## Standard Commands

- Development server: `pnpm dev`
- Lint: `pnpm lint`
- Fix lint: `pnpm lint:fix`
- Type check: `pnpm typecheck`
- Test: `pnpm test`
- Build: `pnpm build`

## Pre-Merge Checklist

- The code supports a real user journey.
- Files and functions remain cohesive.
- Duplicate business logic is avoided.
- Names are specific and consistent.
- Inputs are validated at trust boundaries.
- Protected actions are authorized.
- User-visible states are handled.
- Tests match the risk of the change.
- Expensive third-party calls are controlled.
- Docs are updated when platform behavior changes.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
