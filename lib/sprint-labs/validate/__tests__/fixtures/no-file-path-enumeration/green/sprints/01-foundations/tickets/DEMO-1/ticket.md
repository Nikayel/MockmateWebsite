---
title: "Fix the intake parser"
points: 3
labels: []
ai_policy: assisted
objectives: []
acceptanceCriteria:
  - "A malformed payload is rejected with a 400."
---

Northwind says the payload is valid. It mentions src/api/claims/handler.ts
once, in passing, and src/db/repositories/claims.ts once more.
