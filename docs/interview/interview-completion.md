# Completing an interview from chat

After submission, the candidate normally chooses **View feedback**. An explicit
current request recognized by `lib/interview/completion/intent.ts` can also close
the debrief and open scoring. For example, "How do I close this interview?" or
"Where can I find my interview score?" receives:

> I’ll close the interview for you and open your score and feedback now.

This is a deterministic application action. `completion/response.ts` checks the
candidate's actual message and requires an interviewer turn with both
`isPostInterview` and `hasSubmitted` set. Partner turns, proactive messages, and
the initial wrap-up cannot execute it. Authentication, quota enforcement, input
validation, and cancellation still apply. `chat-service.ts` returns the local
reply and `{ type: "end_interview" }` before retrieval, model generation, or
background extraction. No model tool selection or extra AI call is needed.

The allowlist matches whole messages conservatively. Technical answers, confusion
about the problem, negation, mixed requests, and declining further questions
(including "No nothing to add") leave the interview open. Passing tests and
completing the regression discussion never authorize closing. Unrecognized
wording continues through normal chat; **View feedback** remains available.

Both JSON and validated-stream transports carry the same reply and action. The
chat hook validates the action, current candidate request, and session. It appends
the acknowledgment and displays it in a six-second toast before invoking
`proceedToFinalFeedback`. The global toast remains visible as the discussion is
replaced by scoring; there is no artificial delay or extra confirmation. The final
exchange is passed explicitly to the feedback hook to avoid stale state. Existing
saving, scoring, and duplicate-submission protection remain in that hook.

Tests cover request eligibility, the reported 1800/1801-second regression answers,
unsolicited model calls, authorization, cancellation, both response transports,
restored debriefs, stale sessions, acknowledgment ordering, and the last exchange
in saved/scored transcripts. Browser checks use the real chat hook and review UI
with a local response fixture and simulated scoring screen; they do not invoke
paid scoring or write production sessions.
