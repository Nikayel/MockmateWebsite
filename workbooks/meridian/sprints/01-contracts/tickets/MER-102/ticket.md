---
title: "Give the errors codes: support can't answer partners"
points: 5
labels:
  - contracts
  - error-handling
ai_policy: assisted
objectives:
  - error-taxonomy-http-codes
acceptanceCriteria:
  - "Every error response, including one the framework generates itself, uses the same envelope shape."
  - "Every error code is a stable, documented string that does not change if the human-readable message is reworded."
  - "Every error response carries a correlation id that also appears in the server's own log line for that request."
  - "No error response leaks an internal detail such as a stack trace or a database error string."
---

Support has been escalating the same question for three weeks: when a partner's integration gets a 400, what do they tell them went wrong?

Pasted from #support-escalations:

> Northwind asked what error code means "duplicate external reference" so their retry logic can branch on it. We don't have one. Right now every failure is just a message string that changes if anyone rewords it.

Today a validation failure, a not-found claim, and an unhandled exception can all render differently, and the framework's own default error page looks nothing like the rest of the API. A partner cannot build retry logic against a string that is free to change.

We also have no way to join a support ticket back to the request that produced it. Support has started asking customers to "try again and paste everything you see," which is not a debugging strategy.
