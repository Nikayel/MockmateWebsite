---
title: "Continental can see Bekins' claims"
points: 3
labels:
  - tenants
  - security
ai_policy: assisted
objectives:
  - transaction-scoped-tenant-context
acceptanceCriteria:
  - "Looking up a claim by its external reference never returns a row belonging to a different tenant, under any caller."
  - "The fix scopes tenant identity to the current request's transaction, not to a value threaded manually through each function call."
  - "A two-tenant load against a connection pool of size one proves a connection released after one tenant's request cannot carry that tenant's context into the next request."
---

SUP-2291, P1, escalated from Continental's ops lead:

> Why is there a Bekins Van Lines claim in my queue? I opened it. I read the adjuster's notes.

Continental and Bekins are two different tenants on the same claims platform. One query used to look up a claim by its external reference does not filter by tenant at all, so it returns whichever tenant's row matches, regardless of who asked.

This needs an immediate fix while the bigger tenant-isolation work for this sprint lands. Support's ask is understandably blunt: "how do we know this is the only place, and how do we know it won't come back?"
