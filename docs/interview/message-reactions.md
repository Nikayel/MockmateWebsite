# Interviewer acknowledgments

Sable acknowledges brief social turns and requests for time to work with a small
thumbs-up attached to the candidate's message. This means receipt, never approval
of a solution. It applies throughout an active interview, including after a Sparra
handoff; it does not open Sparra or advance a phase.

`lib/interview/reactions/policy.ts` recognizes complete, short acknowledgments,
dismissals, and intentions to investigate. Extra content falls through to the
normal interviewer: questions, findings, test results, code explanations, and
session controls still get their usual handling. A bare acknowledgment after a
question or offered hint also falls through, since it may accept help or answer
a question. Explicit "no thanks" and "let me work on it" can still receive a reaction.

The request carries the original `candidateMessage` separately from the model-facing
message with attribution, timing, and code annotations. Intent uses the original
text; older callers without this field retain the existing message fallback.

The authenticated chat service checks this policy before retrieval, generation,
and extraction. JSON and validated-stream responses carry `reaction: "acknowledged"`
with an empty reply. Common phrases need no model or tool call. Other brief wording uses the existing
model turn, which may choose the native `acknowledge_message` tool. There is no
additional classifier call. Strict empty arguments and active-turn eligibility are
validated server-side; text resembling a tool call is never executed. Questions
and other substantive turns retain normal replies.

The client attaches the validated reaction to the exact message it sent, using
its ID and existing attempt-generation guard. It creates no interviewer turn,
phase-tracker update, or AI-message scoring event. Normal candidate tracking remains. A local receipt preserves the last model-seen
code snapshot so the next substantive turn still reports intervening edits.
A shared accessible badge renders the receipt in chat and admin inspection.

Reaction metadata survives local/cloud recovery, attributed timelines, bounded
feedback transcripts, and archive persistence. Legacy messages need no migration.
No extra Firestore query or index is required.

Checks: policy and authenticated route tests, recovery and transcript boundary
regressions, and the real chat hook/workspace browser fixture on mobile and desktop
with both JSON and validated-stream replies. Browser fixtures make no paid AI calls.
