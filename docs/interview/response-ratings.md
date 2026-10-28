# Partner and hint response ratings

Signed-in learners can mark a completed Sparra reply or revealed generated hint Helpful or Not helpful. The shared `AIResponseRating` control shows a saved selection only after the server confirms it, reloads the current rating on mount, and preserves the previous selection if a change fails. Buttons support keyboard input and 44-pixel targets. Errors are local to the rating; the conversation remains usable.

Static greetings, legacy messages without generation metadata, streaming text, local acknowledgments and interviewer messages do not offer ratings. No generation IDs are invented for old messages. A failure to register metadata does not discard a generated reply; its rating control is unavailable.

## Identity and storage

The chat service creates a UUID `generationId` for one logical response before calling the model. The same value reaches provider usage rows (including cache hits and validation regenerations), `ai_chat` telemetry, the JSON/validated-stream completion, the AI message, autosave and final transcript archive. Proactive and post-interview replies retain it too. An AI chat message uses that value as its message ID; candidate messages keep their independent IDs.

Hints use a UUID per delivered batch and an output ID per hint. Reusing a retrieved hint or regenerating a hint at the same level does not reuse the batch identity. Both generate and get-next paths register returned outputs, including retrieved hints. `hint_generated` and `hint_revealed` analytics include generation identity where available.

`ai_response_generations/{generationId}` is server-written and default-denied by Firestore client rules. Its version-1 shape is:

```ts
{
  schemaVersion: 1,
  userId: string, // authenticated learner, never accepted from rating input
  kind: "partner" | "interviewer" | "hint",
  sessionId?: string, // retained only after checking session ownership
  scenarioId?: string,
  createdAt: string, // server ISO time
  outputs: Array<{
    id: string,
    contentHash: string, // SHA-256 of exact returned content
    source?: string,
    level?: number,
    feedback?: {
      value: "helpful" | "unhelpful",
      labelSource: "user",
      updatedAt: string
    }
  }>
}
```

One document holds a reply or a bounded hint batch. A transaction reads its owner and output IDs before changing a rating. This preserves sibling ratings under concurrency and makes repeated identical saves a no-op. Generation documents are create-only at registration, so a later request cannot overwrite their owner or reset a rating. Account erasure deletes these documents by `userId` through the existing user-data map.

## API and compatibility

- `GET /api/ai-response-feedback?generationId=…&responseId=…` returns `{ feedbackType: "helpful" | "unhelpful" | null }`.
- `POST /api/ai-response-feedback` accepts exactly `{ generationId, responseId, feedbackType }` and returns the persisted rating.
- Both require a verified bearer token, use the existing RAG request rate limit, and validate IDs/values. Missing, foreign, unknown-output and interviewer targets cannot be rated. Responses are private/no-store.
- Legacy `POST /api/rag` with `action: "record-feedback"` delegates to the same persistence handler; `hintId` is accepted as an alias for the output ID, with a required generation ID. It no longer logs success without writing. Feedback collection does not spend an AI allowance and remains available when the global AI spend ceiling pauses generation.
- The client uses the existing authenticated-fetch hook, including token refresh. It handles loading, deadlines, failed saves, account changes and stale responses. The former scenario/index rating map and its reset plumbing have been removed.

## Interpretation and limits

These are user helpfulness judgments, not correctness grades, proof of understanding, or model-training permission. They do not enter interview scores or model prompts. No additional model calls, raw prompt snapshots, code copies or transcript copies are created for ratings.

Generation identity denotes a logical displayed reply/batch, not a unique provider attempt. Multiple successful provider calls in a validation-regeneration flow can share it. It is not a complete request/span trace. The usage ledger supplies provider/model details; the generation document supplies output identity and the current user rating. It retains the latest rating rather than an append-only preference-edit history. Generation registration is best-effort and its availability flag must be respected by clients.

This closes exact-response feedback linkage, not the whole recommendation/outcome chain. Actual recommendation visibility, a stable recommendation decision ID carried into starts/completions, and explicit skip reasons remain separate follow-ups. Complete training datasets would additionally require eligible context snapshots, reviewed labels, export governance and reproducible outcome evidence.

## Verification

Focused checks cover API authentication/validation/failure reporting, legacy feedback during a spend pause, real Firestore transactions/ownership/concurrent sibling updates, generation links through chat/hint delivery and cost tracking, transcript preservation, and client confirmation/reload/failure/account-change behavior. Browser fixtures exercise the actual chat hook, partner UI and hint controls at mobile/desktop widths in both themes, with synthetic API responses. These checks do not claim a production deployment or a training-data export.

The production bundle check also exposed a pre-existing Edge import issue: the feedback stream imported a rate-limit barrel that reached Firebase Admin. Its unchanged burst/sustained limiter now lives in `lib/rate-limiting/enforce.ts`, and the Edge route imports that safe module directly. Node callers retain the same barrel export.

Next's build validation also rejected helper/schema value exports from API route modules. The existing feature-flag schemas/write guard now live in `lib/admin/feature-flag-schema.ts`; the existing attempt error mapper lives in `lib/sprint-labs/grading/attempt-http-error.ts`. Their callers and tests import those modules directly. Their validation, authorization and error semantics are unchanged.

Verification on 2026-10-28 passed 267 focused unit/regression checks across 27 test files, four real-Firestore-emulator checks and 19 browser checks. TypeScript and targeted lint passed (existing warnings remain in older files). `next build --webpack` completed successfully; the default Turbopack build had remained idle in this environment and was stopped. No production deployment or live-account verification was performed.
