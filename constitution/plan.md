# Plan

## Product Direction

CodeSparring should keep deepening the complete interview-preparation loop: realistic sessions, reliable execution, useful feedback, spaced repetition, roadmap guidance, and company-oriented preparation.

## Priorities

1. Improve the interview session loop.
   - Keep chat, editor, tests, hints, and feedback connected.
   - Reduce latency in chat, execution, and feedback paths.
   - Preserve interviewer realism instead of turning sessions into simple answer explanation.

2. Strengthen feedback quality.
   - Base feedback on evidence from code, tests, transcript, and session metrics.
   - Prefer fast deterministic scoring where possible, with richer AI narrative layered on top.
   - Make feedback specific, actionable, and tied to the next practice step.

3. Expand learning systems.
   - Keep spaced repetition central to long-term retention.
   - Improve recommendations using performance, weak patterns, and target-company goals.
   - Make progress visible without creating dashboard noise.

4. Protect reliability and cost.
   - Use quotas, rate limits, caching, and feature flags around AI-heavy flows.
   - Keep third-party failures graceful and user-readable.
   - Track AI, execution, email, and vector-search cost as operational signals.

5. Preserve trust.
   - Keep auth, billing, account deletion, and admin actions secure and auditable.
   - Validate input at API boundaries.
   - Minimize sensitive data in logs.

## Non-Goals

- Do not become a general competitive-programming judge.
- Do not replace every form of human mentorship.
- Do not add enterprise self-hosting unless it becomes an explicit product commitment.
- Do not build large admin surfaces without concrete operational need.

## Definition of Done

A feature is done when it:

- Supports a real user journey.
- Handles loading, empty, error, and unauthorized states.
- Has appropriate validation and authorization.
- Has focused tests for meaningful logic.
- Avoids unnecessary third-party calls.
- Is documented when it changes platform behavior, data shape, or operational practice.
