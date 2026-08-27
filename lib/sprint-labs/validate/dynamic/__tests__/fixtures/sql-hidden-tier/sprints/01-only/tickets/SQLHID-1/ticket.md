---
title: "nums ends up with the wrong sign, with a hidden tier that never checks it (fixture)"
points: 1
labels:
  - sql
ai_policy: assisted
objectives:
  - arithmetic
acceptanceCriteria:
  - "nums contains a positive five, not a negative one."
---

Fixture ticket for `lib/sprint-labs/validate/dynamic`'s own SQL hidden-tier test suite. Not real
learner content. Its hidden tier is deliberately non-discriminating (a bare `select 1;` check that
never looks at the `nums` table this ticket is actually about), to prove `runSqlRedGreen`'s
tier-independent RED check catches it as an escape test that does not catch its own escape.
