---
title: "CLM-9001 shows as paid, then under_review, and delivery p95 is 40 minutes"
points: 5
labels:
  - delivery
  - ordering
ai_policy: assisted
objectives:
  - per-claim-ordering-guarantee
acceptanceCriteria:
  - "Two webhooks for the same claim are always delivered in the order they were produced, even if an earlier attempt had to be retried."
  - "The ordering guarantee is stated as per-claim, not global; two different claims' deliveries have no required order relative to each other."
  - "One destination that is slow or completely unreachable does not delay delivery of an unrelated tenant's or an unrelated claim's webhooks."
  - "Delivery p95 returns to its prior baseline once one slow destination can no longer hold up an unrelated lane."
---

Northwind's system briefly showed CLM-9001 as paid and then as under_review a few minutes later, the reverse of what actually happened to the claim. Separately, webhook delivery p95 has crept up to 40 minutes.

From the support thread:

> Their side received the two webhooks out of order. We definitely sent the correct one first. Also somebody flagged that delivery times have gotten a lot worse this week, might be related, might not.

There is currently no stated guarantee about delivery order at all, within a claim or across claims, and one very slow or unreachable destination appears to be able to hold up delivery for everyone else sharing whatever drains the backlog.

Ambiguous ask from the PM: "can we just guarantee global ordering so this never happens again?"
