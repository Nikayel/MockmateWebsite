# Rate-limiter exception-handling exercise

`bugfix-rate-limiter-error-handling` is an original JavaScript debugging exercise,
adapted from our existing rate-limiter workspace. Its focus is handling dependency
failures without hiding defects. It is a separate question so existing burst
sessions, completions, and server-side grading keep their original meaning.

The same catalog card now offers Python as
`bugfix-rate-limiter-error-handling-python`. Both variants share the incident,
public exception-handling concept, and sealed assessment. Source, tests, and
reference solutions remain language-specific in the same feature folders.
Choose the language before starting; active attempts remain fixed to preserve
their files, evidence, and grading identity. Catalog round counts group variants,
while session histories and the selected language's Solved state stay separate.

Python replaces JavaScript's non-Error throw cases with original-exception and
process-control propagation checks. Both variants have three visible and nine
hidden cases. The Python reference uses a typed exception clause; other failures
propagate naturally. A browser check runs starter, reference, then starter again
in the same real Pyodide worker to catch stale imports after edits.

The public concept note and dialog explain failure propagation and uncertain
remote outcomes without showing the patch. The same text is generated into
task.md, so the interviewer and AI partner see the learner's preparation context.

Hint generation also receives the active workspace language for both initial and
follow-up requests. The hook requires that language explicitly; a regression test
checks Python and JavaScript across a language change. The debugging validation
command includes the chat route and payload snapshots so intentional prompt edits
cannot silently leave the release checks stale. The obsolete `/api/rag` rating
payload was removed from its snapshot after verifying ratings now use
`useResponseRating` and `/api/ai-response-feedback` (covered by their own tests).

Live Python interviewer and partner probes succeeded on November 1, 2026 using
the production prompt/response pipeline. Replies respected the public contract
without supplying an implementation. The existing background semantic observer
logged an empty provider response, and the Logflare log sink again returned 401;
the main replies succeeded. These probes do not validate authenticated HTTP,
durable session persistence, or a complete feedback-generation request.

The wider workspace browser suite still has an unrelated initial-viewport check:
`workspace-task.spec.ts` expects the cache exercise's "Request a signal" button to
be fully visible without scrolling. Its intersection ratio is about 0.825. The
same failure was reproduced with the unchanged HEAD version of `ProblemColumn`,
then the feature version was restored. No assertion was relaxed for this change.

## Research and attribution

Reviewed November 1, 2026:

- [Published mock interview with a Google engineer](https://interviewing.io/mocks/google-python-rate-limiter):
  the rate-limiter discussion explicitly probes exception handling, resource
  exhaustion, and multiple-client testing. This is a mock interview, not evidence
  that Google uses our incident in hiring.
- [First-person Google L4 interview report](https://leetcode.com/discuss/post/882062/google-onsite-phone-interviews/):
  the author reports a rolling rate limiter with a failed-call retry follow-up.
  This is an unverified candidate account, not an official Google question bank.
- [Google Python Style Guide, exceptions](https://google.github.io/styleguide/pyguide.html#24-exceptions):
  recommends narrow handling and cautions against broad catches that hide unrelated
  failures. The exercise applies that principle in JavaScript with an exported
  dependency error class.
- [Google SRE, handling overload](https://sre.google/sre-book/handling-overload/):
  describes bounded retries and the danger of retries multiplying across layers.

The question remains tagged Generic. Neither its card nor the AI context claims
it is an actual Google interview question.

## Assessment contract

The public assignment specifies what the gateway must do when storage fails.
It does not prescribe the catch-block repair. The starter is healthy on normal
quotas but admits requests and suppresses unexpected failures on the error path.

Three visible tests cover healthy limits, outage denial, and unexpected-error
propagation. Nine hidden cases cover each failing operation, ambiguous writes,
recovery, error identity, non-Error thrown values, bursts, and healthy boundaries.
The reference solution and scenario-specific rubric stay in the sealed server
registry. Both AI roles receive the complete public task, original files, and
current evidence through the existing shared session context. No extra runtime AI
call, per-question prompt override, scoring formula, or backend schema is needed.

Source and test content are grouped in `rate-limiter-error-handling/`; the workspace
manifest uses the shared JavaScript test runner. Follow
[the debugging authoring contract](debugging-authoring.md) for future questions.

Post-session feedback can pinpoint whether the candidate classified failures,
preserved caller-owned error reporting, or introduced unsafe retries. The sealed
trade-off guidance explains this gateway's availability/quota choice without
presenting it as a universal rule. It distinguishes constant exception-checking
overhead from the existing O(k) scan of retained timestamps.

## Engineering judgment

- A changed assessment needs a distinct identity when grading is resolved by ID;
  a content hash for workspace evidence does not version the server's rubric.
- A timeout is not proof that a write failed. This store lacks idempotency keys,
  so retrying an uncertain reservation can charge capacity twice.
- Test likely partial fixes: blanket denial hides defects, and retry-on-error
  can duplicate a reservation. The browser assertion shim must reject both.

## Live validation

The November 1 authoring check called the real response pipeline for both roles
using the configured DeepSeek provider. The interviewer acknowledged baseline
investigation without giving a diagnosis. The first partner reply was accurate
but overly detailed and included an implementation expression despite the request
for no patch; the shared partner requirement-summary guidance was tightened and
the check was rerun. The final partner probe returned three concise bullets,
preserved the error contract, and pointed to one visible test without a repair.
Provider responses are reviewed locally, not treated as
deterministic unit-test expectations.

One initial probe also logged a Logflare HTTP 401. That logging-service credential
issue is separate from the successful provider requests and remains outside this
scenario change.
