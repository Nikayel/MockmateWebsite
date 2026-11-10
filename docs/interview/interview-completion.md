# Completing an interview from chat

After submission, the candidate normally chooses **View feedback**. Sable can call
`end_interview` as an alternative when the current candidate message explicitly
asks to finish, asks how to close the interview, or asks to see or find their score.
The application supplies this acknowledgment:

> Sounds good. I’ll end the interview and open your score and feedback now.

The completed reply opens the existing feedback screen and starts score generation.
Technical answers, confusion about the problem, and declining further questions
(including "No nothing to add") leave the interview open. Passing tests and completing
the regression discussion never authorize closing.

`lib/interview/completion/` defines the native tool and strict action contract.
The tool is available only on candidate-initiated interviewer turns with both
`isPostInterview` and `hasSubmitted` set and an explicit current request recognized
by `lib/interview/completion/intent.ts`. Both tool availability and execution check
this conservative whole-message allowlist; negation, quotations, mixed requests,
and ambiguous wording fall back to the manual button. Partner turns, proactive
messages, and the initial wrap-up cannot execute it. Selection shares the existing model generation,
provider fallback, authorization, quota checks, and cancellation; no classifier or
second model call is added. Only native calls with valid empty arguments execute.

Both JSON and validated-stream responses carry `{ type: "end_interview" }`. The
chat hook validates that action, the current candidate's request, and the current session before invoking
`proceedToFinalFeedback`. It supplies the closing exchange explicitly because the
feedback callback otherwise captures state from before the send. The existing
feedback hook handles saving, scoring, and duplicate-submission protection. Button
handlers invoke it without passing a browser click event as transcript data.

Tests cover the reported 1800/1801-second regression answers, unsolicited model tool
calls, ambiguous/negated requests, tool eligibility and argument validation, both response transports,
restored debriefs containing a previous goodbye, stale-session responses, and
inclusion of the last exchange in saved sessions and feedback requests. These tests
stub model responses; they do not establish live-model tool-selection accuracy.
