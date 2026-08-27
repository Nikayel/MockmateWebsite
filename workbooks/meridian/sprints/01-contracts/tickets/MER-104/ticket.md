---
title: "Publish a spec Northwind can hold us to"
points: 5
labels:
  - contracts
  - openapi
ai_policy: assisted
objectives:
  - openapi-contract-versioning
acceptanceCriteria:
  - "The published document is generated from the same schema objects the server validates requests and responses against, never a hand-maintained copy."
  - "A route whose implementation drifts from the published document fails a contract test in CI, on both the request and the response side."
  - "The document is never asserted against a frozen golden snapshot; it is checked for validity and for agreement with the live route table."
  - "Every query parameter the list endpoint accepts today, and whether it is active or on a path to sunset, is described in one place that both the runtime and the generated document read from."
  - "A parameter marked for removal stamps a Deprecation header and a Sunset date on every response that uses it, and the generated document states the same date."
payoffFor: "MER-204"
payoffSignoff: true
---

Northwind wants a written contract for the claims API before they will commit their integration team to more work against it. Right now the only description of the API is whatever the handler code happens to do this week.

From the partnerships thread:

> Can you send over an OpenAPI doc or a Postman collection or something? Our engineers keep guessing at what's required vs optional and getting it wrong.

A hand-maintained document drifts from the code within a sprint. Whatever we publish has to be generated from the same definitions the server actually validates against, not a second copy someone edits by hand and forgets to update.

There is also a smaller, related problem: the list endpoint currently accepts a couple of query parameters informally, with no stated rule for what happens to them later. Northwind has asked, reasonably, whether anything they depend on today could disappear without warning.
