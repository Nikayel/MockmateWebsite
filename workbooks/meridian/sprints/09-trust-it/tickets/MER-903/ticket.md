---
title: "Northwind received a claimant name that isn't theirs"
points: 8
labels:
  - "ai-engineering"
  - "security"
  - "prompt-injection"
ai_policy: assisted
objectives:
  - prompt-injection-defense-tool-scoping
acceptanceCriteria:
  - "Document text extracted from an uploaded file is fenced as untrusted data in the prompt, distinguishable from the instructions that actually govern the model's behavior."
  - "The fencing instruction names the specific per-request delimiter it fences with, since an unnamed delimiter defends nothing. This is a visible test, justified purely on security grounds, independent of cost."
  - "The SQS consumer path enforces the same tenant scoping the HTTP path already enforces, so a message processed off the queue cannot read or return another tenant's data."
  - "No document text, regardless of formatting, can cause the extractor to select which tenant's data to read or return."
---

Northwind's support team forwarded a webhook payload where the claimant's
name did not match anyone on their policy. It matched a claimant on a
completely different tenant's claim instead. Someone found the source: a
PDF uploaded through the SQS-based intake path had a block of text near the
bottom formatted to look like a system instruction, telling the extractor
to include "the most recently processed claimant's name" in its output.

The consumer that picks these messages off the queue never sets a tenant
context the way an HTTP request does, so whatever ambient scoping the
request path relies on for isolation is simply absent here. The document's
text is currently handed to the model without being fenced off from the
parts of the prompt that are actual instructions, so a well-formatted
sentence inside a PDF can be read as one.

Report the guard's false-positive rate on the golden set before this ships.
A fencing rule tight enough to block every injection but loose enough to
never flag a legitimate claim document is the actual bar, not just "it
caught this one PDF."
