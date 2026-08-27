---
title: "leaky ticket, short signature (fixture)"
points: 1
labels:
  - arithmetic
ai_policy: assisted
objectives:
  - arithmetic
acceptanceCriteria:
  - "n/a"
---

Fixture ticket for the provisioning-scan test suite. `setup.diff` deliberately leaks its own
hidden test's SHORT humanName, once via a comment and once via a literal file path. Not real
learner content.
