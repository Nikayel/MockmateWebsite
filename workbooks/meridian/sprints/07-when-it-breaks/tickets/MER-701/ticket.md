---
title: "The logs from 14:05 are unusable: fix the logger before we do this again"
points: 5
labels:
  - "observability"
  - "logging"
ai_policy: assisted
objectives:
  - request-scoped-structured-logging
acceptanceCriteria:
  - "Every log line is a single structured record, not a multi-line pretty-printed dump."
  - "A log line emitted during request handling carries trace id, tenant id, and claim id without the caller having to pass them manually at each call site."
  - "Two requests running concurrently on the same process never see each other's context bleed into their own log lines."
  - "No log line contains a policyholder's name, address, or full claim payload by default."
---

Rico spent twenty minutes during yesterday's incident scrolling through logs
from the window when p99 spiked, and came up with nothing usable. Every
line is a multi-line pretty-printed object dumped to stdout, there is no
claim id or tenant id on any of them, and two concurrent requests interleave
their output so badly that it isn't even clear which lines belong to which
request.

This cannot be the second time we do this. The ask is a logger that emits
one structured line per event, carries the request's trace id, tenant id,
and claim id automatically, and does not leak one request's context into a
different request running at the same time on the same process.

One more thing from that same incident: a support engineer pasted a raw
claim payload into the incident channel to make a point, and it had a
policyholder's name and address in it. Whatever ships here needs to not
make that easier to do by accident either.
