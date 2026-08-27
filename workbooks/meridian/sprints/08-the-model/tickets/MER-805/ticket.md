---
title: "Review: PR #494: stream extraction results (agent-authored)"
points: 5
labels:
  - "ai-engineering"
  - "streaming"
  - "code-review"
ai_policy: review-only
objectives:
  - review-streaming-pr-hidden-regressions
acceptanceCriteria:
  - "The review states explicitly whether a client can observe extraction output before it has passed schema validation, and whether that is acceptable."
  - "The review identifies that the latency metric's definition changed under an unchanged name, and states what that does to the existing burn-rate alert."
  - "The verdict names a specific fix for whichever of these is a real regression, not a general recommendation to add tests."
---

An agent shipped PR #494 to stream extraction results back to the client
token by token instead of waiting for the full response, and CI is green.
It is genuinely faster to first byte, which is the number everyone was
asking for.

Two things about this diff deserve more than a glance. First, streaming
means a partial, not-yet-schema-validated result is now readable before the
full response has been checked, and it is not obvious from the diff where
validation actually happens relative to what the client can already see.
Second, and more subtly: the latency histogram last sprint's observability
work was built against gets redefined in this PR to measure
time-to-first-token instead of time-to-full-response, under the exact same
metric name. The dashboard will keep reporting a healthy number even if the
full response starts taking nine seconds, because the alert is now watching
a different thing than the SLO was written against.
