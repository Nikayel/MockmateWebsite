---
title: "Thursday's model bill is 3.1x Wednesday's on flat volume"
points: 3
labels:
  - "ai-engineering"
  - "cost"
  - "caching"
ai_policy: assisted
objectives:
  - prompt-cache-prefix-cost-regression
acceptanceCriteria:
  - "The prompt-cache prefix is restored so that content identical across every call sits above the breakpoint and only per-claim content sits below it."
  - "The fencing instruction added for the prompt-injection fix still names its per-request delimiter and still defends against the same injection path; moving it does not weaken it."
  - "No tenant's cached prompt prefix is ever reused for a different tenant's request."
  - "The cache hit ratio returns to its prior baseline on replayed traffic before this ships."
---

Thursday's model spend is 3.1 times Wednesday's, and claim volume between
the two days is flat. The cache hit ratio panel that last sprint's caching
work shipped is showing 0.71 on a normal day and dropped hard starting
Thursday morning, right around when the prompt-injection fix went in.

That is not a coincidence. The fencing instruction the injection fix added
sits below the prompt-cache breakpoint, mixed in with the rest of the
per-claim content, which means every single call now differs from the last
one at a point earlier in the prompt than before. The provider's prefix
cache only discounts tokens identical up to where the first difference
appears, so pushing anything variable earlier in the prompt breaks the
cache for everything after it, for every claim, all day.

Whatever fixes this has to put the fencing instruction back above the
breakpoint without reopening the exact injection path that was just closed,
and it cannot leak one tenant's cached prefix into another tenant's request
in the process.
