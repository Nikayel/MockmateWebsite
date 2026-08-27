---
title: "Cascade sent 41 claims on Monday and got 38 results back"
points: 5
labels:
  - "ai-engineering"
  - "reliability"
ai_policy: assisted
objectives:
  - rejected-extraction-first-class-outcome
acceptanceCriteria:
  - "A rejected extraction is published through the outbox as a distinct outcome, the same delivery mechanism a successful extraction already uses."
  - "A rejected claim is never silently retried; the rejection is treated as terminal and recorded as such."
  - "The rejection outcome is scoped to the tenant that submitted the claim and is observable in the same places a successful outcome would be."
  - "Cascade's batch of 41 claims produces exactly 41 outcomes, whether accepted or rejected."
---

Cascade Insurance submitted 41 claims in a batch on Monday morning and their
integration only ever received 38 results back over the webhook. Nobody
rejected the missing three out loud; they simply never produced an outcome
of any kind, successful or otherwise, so Cascade has no way to know they
were ever received.

Some claims genuinely should be rejected: unreadable documents, a policy
number that does not exist, a loss date outside any policy period on file.
Right now a rejection like that has no first-class representation anywhere
in the system. It is not retried, because retrying would not help, but it
is also not recorded, reported, or delivered as an outcome, so from the
outside it just looks like the claim vanished.
