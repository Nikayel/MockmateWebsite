---
title: "Deprecate v1 query params without breaking Northwind's integration"
points: 5
labels:
  - contracts
  - api-versioning
aiPolicy: unassisted
aiPolicyReason: "This ticket decides what a breaking change means for a real integration partner. You write this one yourself. An agent will happily delete the old parameter and call it done."
objectives:
  - contract-versioning
acceptanceCriteria:
  - "The v1 list endpoint still accepts the deprecated page and per_page query parameters."
  - "A response served under the deprecated parameters includes a Deprecation header."
  - "The v2 list endpoint does not accept page or per_page at all."
---

Product wants to sunset offset pagination on the claims list endpoint in
favor of cursor pagination, but Northwind's integration still sends `page`
and `per_page` on every call. Turning those parameters off outright breaks
their nightly sync.

A PM dropped this in the ticket:

> Can we just switch everyone to cursor pagination? I don't think anyone is
> still using page numbers.

Support pulled the access logs. Northwind is still using page numbers,
today.
