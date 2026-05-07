# Engineering Principles

## Core Standard

Build boring, reliable, maintainable software. Prefer clear code that future engineers can safely change over clever code that only works in the moment.

## Maintainability

- Keep files focused. When a file mixes unrelated concerns or becomes hard to scan, split it by domain responsibility.
- Prefer small functions with descriptive names and explicit inputs.
- Keep route handlers thin. Move reusable business logic into `lib/` services.
- Avoid hidden coupling between UI, API routes, Firebase documents, and AI prompts.
- Delete dead code when replacing behavior.

## DRY, But Not Prematurely Abstract

- Do not duplicate business rules, validation schemas, scoring formulas, auth checks, or billing entitlement logic.
- Accept small local duplication when the abstraction would be harder to understand than the repeated code.
- Extract shared helpers only after the shared concept is stable and named clearly.

## File Size Discipline

- A file should usually have one primary reason to change.
- Treat large files as a design smell, especially when they contain mixed data fetching, UI rendering, validation, and business rules.
- Prefer splitting by cohesive responsibility: view, hook, service, schema, type, test, fixture.
- Scenario/data files may be larger when they are mostly structured content, but logic-heavy files should stay compact.

## Naming Standards

- Use names that describe intent, not implementation trivia.
- Components: `PascalCase`.
- Hooks: `useThing`.
- Types and interfaces: `PascalCase`.
- Functions and variables: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` only for true constants and environment-style values.
- Files: follow the surrounding directory convention; prefer `kebab-case` for route-adjacent modules and descriptive domain files.
- Avoid vague names like `data`, `item`, `thing`, `helper`, `utils`, or `manager` unless the scope makes them obvious.

## TypeScript

- Prefer explicit domain types at module boundaries.
- Avoid `any`; use `unknown` and narrow it when input is untrusted.
- Use discriminated unions for state machines and async statuses.
- Keep shared types close to the domain that owns them.
- Validate runtime input with schemas instead of trusting TypeScript alone.

## React and UI

- Keep components presentational when possible.
- Move data fetching, mutation orchestration, and complex derived state into hooks or services.
- Handle loading, empty, error, disabled, and unauthorized states.
- Keep accessibility in the default path: semantic elements, labels, keyboard navigation, and readable focus states.
- Use existing UI primitives before creating new component patterns.

## API and Backend

- Authenticate and authorize before performing protected work.
- Validate request bodies, query params, and webhook payloads.
- Return clear error responses without leaking sensitive details.
- Keep third-party calls isolated behind service helpers.
- Make expensive AI, vector, email, and execution calls observable and rate-limited.

## Data and Security

- Treat Firestore document shapes as contracts.
- Keep migrations and schema changes documented.
- Minimize sensitive data in logs.
- Never expose server secrets to client components.
- Keep admin routes role-gated and auditable.

## Testing

- Test business logic, scoring, scheduling, validation, and auth-sensitive behavior.
- Prefer focused unit tests for pure logic and integration tests for API/data contracts.
- Add regression tests for bugs that could recur.
- Do not test implementation details when user-visible behavior is the contract.

## Performance and Cost

- Avoid unnecessary renders, repeated fetches, and duplicate AI calls.
- Cache intentionally and invalidate explicitly.
- Track high-cost paths: AI generation, vector search, code execution, email, and analytics jobs.
- Use feature flags for risky or expensive changes.

## Review Checklist

Before merging, ask:

- Is the code easy to name, read, and change?
- Is duplicate business logic avoided?
- Are files and functions still cohesive?
- Are untrusted inputs validated?
- Are protected routes authorized?
- Are loading, error, and empty states handled?
- Are tests proportional to the risk?
- Did this introduce unnecessary cost, latency, or coupling?
