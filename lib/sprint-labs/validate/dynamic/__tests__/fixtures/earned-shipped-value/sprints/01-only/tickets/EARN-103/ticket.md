---
title: "probeAnswer leaks its own answer"
points: 1
labels:
  - provisioning
ai_policy: unassisted
ai_policy_reason: "n/a -- fixture ticket"
objectives:
  - provisioning
acceptanceCriteria:
  - "probeAnswer returns the downstream answer string."
---

Fixture ticket. Its setup deliberately embeds its own hidden answer AND an earlier ticket's humanName, so the scan must still flag both. Not real content.
