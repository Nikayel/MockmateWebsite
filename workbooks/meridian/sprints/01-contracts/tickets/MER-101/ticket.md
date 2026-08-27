---
title: "POST /claims returns 500 on Northwind's payload"
points: 5
labels:
  - contracts
  - typescript
ai_policy: assisted
objectives:
  - typed-boundary-parsing
acceptanceCriteria:
  - "A malformed claim payload is rejected with a 400 and a field-level reason, never a 500."
  - "A claim amount that is not a finite number is rejected before it reaches the repository."
  - "The parsed claim type has no untyped or any-shaped field anywhere in its public surface."
  - "A well-formed claim with every required field still succeeds exactly as before."
---

Northwind's integration engineer says their payload is valid and Meridian disagrees.

Support pasted this from the on-call channel:

> Claim CLM-77102 came back 500. I checked the payload three times, it looks fine to me. Also noticed claim CLM-77043 got accepted last week with an amount of "not-a-number" and nobody caught it until reconciliation.

The intake handler parses the request body once, loosely, and hands it straight to the claims repository. Nothing narrows the shape before that, so a technically well-formed but wrong payload can either crash the handler or slide through untouched.

Whatever we ship here has to reject the second case as loudly as the first.
