# AGENTS.md

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

### Maintainability & Code Cleanliness

- **Focus & Cohesion**: Keep files and classes focused on a single responsibility. When a file mixes concerns or becomes hard to scan, split it by domain responsibility.
- **Clean Interfaces**: Prefer small, pure functions with descriptive names, explicit inputs, and clear return types.
- **Modularity**: Design decoupled modules with clear boundaries. Avoid hidden coupling between UI, API routes, Firestore documents, and AI prompts.
- **Dead Code Elimination**: Proactively delete dead code when replacing behavior. Do not leave commented-out code blocks.
- **Thin Handlers**: Keep route handlers (`app/api/*/route.ts`) thin. Handlers should only parse requests, authenticate/authorize, validate inputs, call service services, and return responses.
- **Readable UI**: Keep React components presentational when possible; move mutations, fetching, and complex derived state into custom hooks or services.

### DRY & Modularity

- **No Business Logic Duplication**: Do not duplicate business rules, validation schemas, scoring formulas, auth checks, billing entitlement logic, or Firestore document-shape assumptions.
- **Avoid Premature Abstraction**: Accept small local duplication when the abstraction would be harder to scan than the repeated code.
- **Helper Extraction**: Only extract shared helpers when the shared concept is stable, has a clear domain name, and reduces real maintenance risk.

### File Size & Modular Grouping

- Treat large logic-heavy files as a warning sign.
- Split by responsibility: component, hook, service, schema, type, test, fixture.
- **Dedicated Folders for Interconnected Logic**: When a feature consists of multiple interconnected logical pieces (e.g., transpiler, wrapper, runner, comment-stripper), do not keep them in one large file. Instead, split them into separate, small files (<150 lines) and group them inside a dedicated folder (e.g., `lib/workspace-execution/js-sandbox/`).
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
