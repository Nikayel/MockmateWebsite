---
title: "Claims list is 4.2s for Continental since Tuesday's deploy"
points: 5
labels:
  - tenants
  - performance
ai_policy: assisted
objectives:
  - n-plus-one-diagnosis-concurrent-index
acceptanceCriteria:
  - "The claims list returns in roughly the time it did before Tuesday's deploy, for a tenant with a realistic claim and document volume."
  - "The diagnosis identifies the actual query pattern responsible, not a plausible-sounding guess, and is backed by a test that is red before the fix and green after."
  - "Fetching documents for a page of claims uses a bounded number of queries regardless of how many claims are on the page."
  - "A composite index supports the query pattern the fix introduces, with column order matching the pagination cursor's own ordering."
---

Continental's claims list, which used to render in under 100ms, has taken 4.2 seconds since Tuesday's tenant-isolation deploy. Nothing about the list endpoint's own query changed in that deploy.

From the on-call channel:

> Nothing in the diff touches the list query. The isolation change only touched how documents get their tenant check. Why would that make the claims list slow?

Locate the actual cause before proposing a fix. The retro on this one matters as much as the patch: whoever picks this up should be able to point at the specific mechanism, not just "it's probably the database."

Separately, git blame on the code path involved points at a comment blaming "the transaction wrapper" for a performance regression a few months back. That comment turns out to be wrong about the mechanism, which is worth correcting while it is fresh.
