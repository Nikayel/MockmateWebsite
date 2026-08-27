---
title: "Find the 14:05 regression and make it reproducible"
points: 6
labels:
  - "observability"
  - "performance"
ai_policy: unassisted
ai_policy_reason: "Deciding which gap in an incomplete trace to trust and which to dismiss is a judgment call, not a lookup. An agent will pattern-match to whatever changed most recently and call it root cause without checking that the timing actually lines up."
objectives:
  - latency-regression-diagnosis-wait-vs-service-time
acceptanceCriteria:
  - "The regression is localized to a specific layer (application code, database, queue, or network) using evidence, not elimination by assumption."
  - "Wait time and service time are measured separately, including time spent waiting on the event loop, not just wall-clock request duration."
  - "A test exists that fails against the current code and passes once the regression is fixed."
  - "The finding names what changed to introduce the regression, with a date it can be tied to."
---

Yesterday at 14:05, p99 on POST /claims went from 380ms to 2.1s and never
came back down on its own. Rico grabbed one trace before the tab crashed: a
single 2.1s span for the whole request, with nothing inside it. No child
spans, no indication of where the time actually went. The logs from that
same minute are the ones MER-701 is fixing, so they are no more useful than
the trace was.

Nobody can currently say whether this is application code, a slow query,
connection pool exhaustion, or something external to us entirely. The
deploy log shows nothing shipped at 14:05 specifically, though something
from the last few days is the likely trigger.

Find where the time is actually going, and prove it with something more
durable than a screenshot of one trace: a test that is red right now and
turns green once whatever this is gets fixed.
