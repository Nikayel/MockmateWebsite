---
title: "CX-88431 was extracted and billed twice"
points: 5
labels:
  - tenants
  - concurrency
  - sql
ai_policy: unassisted
ai_policy_reason: "This ticket is about naming the exact interleaving the database allows and closing it with a constraint you can defend under questioning, not about making a flaky test go green. Handed to an agent, it reaches for a bigger lock or a longer transaction and the tests pass without anyone ever naming the race. Do this one yourself."
objectives:
  - isolation-level-race-condition
acceptanceCriteria:
  - "Two concurrent attempts to bill the same claim can no longer both succeed, under the database's actual default isolation level, not a stricter one substituted for the test."
  - "The fix is a constraint the database enforces, not a bigger lock or a longer transaction wrapped around the same check-then-act sequence."
  - "A test reproduces the original race deterministically, fails before the fix, and passes after it."
  - "The one-paragraph explanation of the fix states precisely which interleaving READ COMMITTED was permitting, in terms an interviewer could probe."
---

Claim CX-88431 was extracted by two worker runs seconds apart, and both runs proceeded to bill it, because each one checked whether a bill already existed before inserting its own.

From the incident channel:

> Both workers checked first, both saw nothing, both inserted. Classic check-then-act, except neither engineer who wrote either code path thought they were writing anything unusual. It's a completely ordinary insert-if-not-exists.

Name the exact interleaving the database's default isolation level allows here, and close it in a way that holds under real concurrent load, not just in a test that happens not to race.

Ambiguous ask from the engineer who first patched it: "can we just wrap both statements in one transaction and call it done?"
