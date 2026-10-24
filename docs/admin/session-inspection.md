# Admin session inspection

Open **Admin → Sessions → Inspect**, or **Admin → Users → a user → Recent Sessions → View conversation & details**. Both use the same inspector. Closing it returns to the list or profile.

The Conversation, Saved work, and Details tabs show the stored conversation, final code, editable workspace checkpoint files, test counts, language, checkpoint timing, scores, and session metadata. Transcript text and code are rendered as plain text; no HTML or user code executes. Large stored content is bounded and marked as shortened.

## Data sources

- `interview_sessions/{id}`: metadata, final code/test counts, and recovery checkpoint.
- `interview_sessions/{id}/artifacts/transcript`: durable conversation in its stored order. This archive takes precedence over recovery buffers.
- When an archive is missing, saved interviewer and AI partner buffers are displayed separately as partial recovery copies. The inspector does not invent cross-channel chronology or duplicate archived messages with recovery copies.
- Older sessions may have neither source. An absent transcript is shown explicitly; a failed Firestore read returns an error with retry.
- Legacy user-history summaries do not necessarily reference a live interview session. Such rows are labeled summary-only rather than opening an unrelated or nonexistent session.

## Access and cost

The list retains `VIEW_ANALYTICS`. Individual inspection requires `VIEW_USER_DETAILS` (super admin, admin, support). Analysts cannot read conversations or code. Reads are audited as `view_session_detail` with target/session metadata; transcript contents are never copied to the audit log. Private silent notes and raw model feedback remain excluded from API responses.

Only an opened session loads its heavy content: one session document, one fixed transcript document, and a profile lookup for the user label. No transcript collection scans or per-row artifact queries are used. Nothing changes the learner's session or triggers an AI call.

No new Firestore index is required for direct document reads. The existing user-history query (`user_id ==`, `completed_at != null`, `orderBy completed_at desc`, `limit 10`) is covered by the existing `interview_sessions` composite index on `user_id ASC, completed_at DESC` in `firestore.indexes.json`. Existing session-list filter indexes remain unchanged.

## Verification

Focused Vitest coverage exercises archive preference, historical/malformed documents, partial recovery lanes, preview limits, test-run precedence, point reads, data allowlists, authentication, role permissions, and failures. Playwright uses real admin pages, drawer, dialog, and fetch hooks against fixture API responses; it covers both entry points, mobile overflow, inert transcript HTML, retry, missing transcripts, and closing/reopening during a slow response.
