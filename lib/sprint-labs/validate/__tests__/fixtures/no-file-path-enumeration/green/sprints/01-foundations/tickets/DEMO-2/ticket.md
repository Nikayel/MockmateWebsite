---
title: "Migrate the three claim modules to the new schema"
points: 5
labels: []
ai_policy: assisted
objectives: []
acceptanceCriteria:
  - "All three modules compile against the new schema."
pathEnumerationSignoff: true
---

A reviewer signed off on naming these explicitly because the ticket is a
mechanical migration, not a locate-the-bug exercise: src/api/claims/handler.ts,
src/api/claims/parser.ts, and src/db/repositories/claims.ts.
