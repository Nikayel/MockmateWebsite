---
title: "Fix the intake parser"
points: 3
labels: []
ai_policy: assisted
objectives: []
acceptanceCriteria:
  - "A malformed payload is rejected with a 400."
---

Northwind says the payload is valid. Files to touch: src/api/claims/handler.ts,
src/api/claims/parser.ts, and src/db/repositories/claims.ts.
