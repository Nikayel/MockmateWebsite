---
title: "double() doesn't actually double"
points: 1
labels:
  - arithmetic
ai_policy: assisted
objectives:
  - arithmetic
acceptanceCriteria:
  - "double(n) returns n * 2."
---

Fixture ticket for the regression-gate test suite. Its `reference.diff` DELIBERATELY also reverts
REG-101's fix, as an accidental side effect a regression gate must catch. Not real learner content.
