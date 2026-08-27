---
title: "Duplicate payment authorization sent to Northwind for CLM-8842"
points: 5
labels:
  - delivery
  - idempotency
ai_policy: assisted
objectives:
  - idempotent-post-with-replay
acceptanceCriteria:
  - "A request carrying an idempotency key that was already processed for this tenant returns the original response verbatim, without processing anything twice."
  - "The same idempotency key arriving with a materially different body is rejected with a 409, not silently reprocessed and not silently accepted as the original."
  - "The stored fingerprint of a request body is computed the same way regardless of key order or incidental whitespace in the original payload."
  - "An idempotency key is scoped to the tenant that issued it; one tenant cannot collide with or replay another tenant's key."
---

Northwind Mutual, 08:41:

> You sent us two payment authorizations for CLM-8842, 412ms apart, identical amounts. Finance has already cut both cheques. Who do I talk to?

Northwind's client retried a POST after a slow response, and intake processed it twice because nothing about the request tells us it is a retry of one already handled rather than a second, distinct submission.

Product's first instinct: "can the client just check before it submits?" That relies on every integrating client behaving correctly, which is exactly the assumption that failed here.
