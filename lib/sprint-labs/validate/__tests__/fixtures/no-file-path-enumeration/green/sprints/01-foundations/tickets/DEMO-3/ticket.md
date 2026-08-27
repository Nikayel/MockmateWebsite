---
title: "Fix the repeated bug in the intake handler"
points: 3
labels: []
ai_policy: assisted
objectives: []
acceptanceCriteria:
  - "src/api/claims/handler.ts no longer 500s on a malformed payload."
---

The bug is in src/api/claims/handler.ts. We've seen src/api/claims/handler.ts
mentioned in three separate incident reports, all pointing at
src/api/claims/handler.ts -- that's the same one file, mentioned three times,
not three files.
