---
title: "The audit hash disagrees with itself"
points: 5
labels:
  - data-contracts
  - code-review
ai_policy: review-only
objectives:
  - canonical-encoding-audit-hash
acceptanceCriteria:
  - "The review states a clear verdict on the PR, with a reason grounded in what the hash is actually supposed to guarantee."
  - "If rejected, the review is backed by a failing test showing two encodings of the same logical claim that a generic serializer does not treat identically."
  - "The accepted design produces byte-identical encodings of the same logical value across process restarts, locales, and a database round trip."
---

Compliance's tamper check reruns the audit hash over stored claims and compares it to the hash recorded at write time. This month a growing number of claims fail that comparison despite nobody having touched the row.

An agent already opened PR #418 against this, described as:

> Hashes JSON.stringify(claim) at write time and re-hashes the same way at check time. Tests pass locally.

Before this ships, decide whether hashing whatever a generic JSON serializer happens to produce is actually a fix, given that the same logical claim can serialize to different byte sequences depending on key order, locale, and whether it passed through a database round trip.

Ambiguous ask attached to the PR: "CI is green, is there anything left to check?"
