---
title: "Northwind rate-limited us: your retries hit us every 5 seconds"
points: 5
labels:
  - delivery
  - retries
ai_policy: assisted
objectives:
  - defensible-retry-policy-backoff-jitter
acceptanceCriteria:
  - "A 429 or 503 response's Retry-After value, when present, is honored ahead of the default backoff schedule."
  - "The backoff interval grows exponentially between attempts, capped at a maximum, with jitter applied after the cap rather than replacing it."
  - "A failure classified as non-retryable stops retrying immediately rather than exhausting the same schedule as a retryable one."
  - "An attempt count and next-attempt time are persisted per delivery, so a process restart does not reset or lose the schedule."
  - "A delivery that exhausts its retry budget is dead-lettered with its original payload intact, not dropped."
---

Northwind's platform team flagged that our webhook retries are landing on their endpoint at a fixed 5-second interval regardless of how many times a given delivery has already failed, and regardless of the Retry-After header their own 429 responses return.

From their message:

> Every retry from you is exactly 5 seconds after the last one, forever, for the same delivery. We rate-limit at exactly the interval that makes that pattern the worst possible one to be stuck in.

There is also no distinction today between a failure that is worth retrying and one that never will succeed no matter how many times it is attempted, so both get the same fixed-interval treatment forever, with nothing ever falling out of the loop.

Ambiguous ask from the account team: "can we just retry less often?"
