---
title: "Claim intake 500s on a technically-valid payload"
points: 3
labels:
  - contracts
  - typescript
ai_policy: assisted
objectives:
  - typed-boundaries
acceptanceCriteria:
  - "A malformed claim payload is rejected with a 400 and a field-level reason, not a 500."
  - "A claim amount that is not a finite number is rejected before it reaches the repository."
  - "The parsed claim type has no any in its public shape."
---

Northwind's integration engineer says their payload is valid and CodeSparring
disagrees. The claim intake endpoint 500s on some claims and silently accepts
garbage on others.

A support engineer pasted this from the on-call channel:

> Claim CLM-77102 came back 500. I checked the payload three times, it looks
> fine to me. Also noticed claim CLM-77043 got accepted last week with an
> amount of "not-a-number" and nobody caught it until reconciliation.

The intake handler currently parses the request body once, as `any`, and
passes it straight to the claims repository. Nothing validates shape before
that.
