# Completing an interview from chat

After submission, Sable can call `end_interview` when the candidate asks to finish,
asks to see or find their score, or declines further questions after the final
invitation. The application supplies this acknowledgment:

> Sounds good. I’ll end the interview and open your score and feedback now.

The completed reply opens the existing feedback screen and starts score generation.
The candidate does not need to locate a score button. Technical answers and requests
to continue remain normal debrief turns; declining one suggestion is not an instruction
to finish. The manual **View feedback** button remains available.

`lib/interview/completion/` defines the native tool and strict action contract.
The tool is available only on candidate-initiated interviewer turns with both
`isPostInterview` and `hasSubmitted` set. Partner turns, proactive messages, and the
initial wrap-up cannot execute it. Selection shares the existing model generation,
provider fallback, authorization, quota checks, and cancellation; no classifier or
second model call is added. Only native calls with valid empty arguments execute.

Both JSON and validated-stream responses carry `{ type: "end_interview" }`. The
chat hook validates that action and the current session before invoking
`proceedToFinalFeedback`. It supplies the closing exchange explicitly because the
feedback callback otherwise captures state from before the send. The existing
feedback hook handles saving, scoring, and duplicate-submission protection. Button
handlers invoke it without passing a browser click event as transcript data.

Tests cover tool eligibility and argument validation, both response transports,
restored debriefs containing a previous goodbye, stale-session responses, and
inclusion of the last exchange in saved sessions and feedback requests. These tests
stub model responses; they do not establish live-model tool-selection accuracy.
