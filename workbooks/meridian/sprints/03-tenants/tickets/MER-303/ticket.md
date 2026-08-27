---
title: "PR #431: fix(db) reset tenant context on connection release"
points: 5
labels:
  - tenants
  - code-review
ai_policy: review-only
objectives:
  - review-concurrency-fix-pushback
acceptanceCriteria:
  - "The review states a clear verdict, with the precise window, if any, the proposed fix still leaves open."
  - "If rejected, the review names exactly what the PR's reasoning about connection exclusivity gets wrong, in terms of when a reset can run relative to when the connection is handed to the next request."
  - "The accepted design ties tenant context to the lifetime of a single transaction, not to a listener that runs at some point after release."
---

An agent opened a follow-up to the tenant-isolation work, aimed at making sure a connection's tenant context cannot leak between requests.

From the PR:

> Adds a listener on connection release that resets the session's tenant variable to null before the connection goes back into the pool. If a released connection somehow gets reused before the reset runs, that's a pool-implementation bug, not something application code should have to guard against.

Decide whether that reasoning holds. Ambiguous ask from the reviewer who first looked at it: "the logic seems sound and every test passes, are we just being paranoid here?"
