---
title: "Review: agent PR #447 sign outbound webhooks, reject replays"
points: 3
labels:
  - delivery
  - security
  - code-review
ai_policy: review-only
objectives:
  - webhook-hmac-verification-review
acceptanceCriteria:
  - "The review states a clear verdict, naming any gap between what the PR claims and what its own tests actually exercise."
  - "If rejected, the review identifies the specific defect class: something about how the signature is computed, compared, or paired with replay protection that a green test suite would not catch."
  - "The accepted design signs over the exact bytes transmitted with the timestamp inside the signed material, compares signatures in constant time, and rejects a replayed delivery outside a bounded window even with a valid signature."
  - "The accepted design supports verifying against either of two active keys, so a key rotation never causes a receiver to reject a legitimate delivery."
---

An agent picked up the long-standing request to sign outbound webhooks and reject replayed deliveries. CI is green.

From the PR description:

> Adds an HMAC signature header computed over the JSON body, and a timestamp header. Receivers are expected to check both. Includes a test that a tampered body fails signature verification.

Decide whether this is actually safe to hand to integration partners as a security control, or whether it only looks complete because its own tests only check the case it was written to pass.

Ambiguous ask from the partnerships lead: "partners have been asking for this for months, can we tell them it's done?"
