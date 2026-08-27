---
title: "Ship the new money format without breaking the two v1 customers"
points: 5
labels:
  - data-contracts
  - api-versioning
ai_policy: assisted
objectives:
  - backward-compatible-wire-format
acceptanceCriteria:
  - "A request that sends no version information at all receives exactly the response shape it received before this ticket, unchanged."
  - "The v1 response shape keeps serializing money the way it always has, unchanged by the new representation."
  - "The v2 response shape drops the two legacy pagination parameters entirely; the v1 shape keeps honoring them under the compatibility shim."
  - "A subscription's pinned version is stored and honored on every subsequent request from that subscription, not just the one that set it."
  - "The generated contract document for this route states both the v1 and the v2 parameter lists correctly, from the same source of truth."
---

The new minor-unit money representation and civil-date modeling are ready to ship, but two insurers are still integrated against the old shape and cannot upgrade on our timeline.

From the account team:

> Northwind and Cascade are both still on the original claim shape. Neither has a sprint free to migrate before end of quarter. We can't hold the new format hostage to their roadmap, but we also can't break them.

Product's early framing was "just version the response by content type," which turns out not to fit this API's actual shape: this endpoint has exactly one list of query parameters, and a new version needs to both add fields the old shape never had and drop query parameters the old shape still depends on. Whatever mechanism ships has to make both of those true for the same route and method at once.

Every existing integration test for this endpoint sends no version information at all, which means today's behavior has to keep being what a caller gets by default.
