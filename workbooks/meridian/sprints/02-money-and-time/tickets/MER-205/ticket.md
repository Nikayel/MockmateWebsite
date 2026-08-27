---
title: "Compliance flags 3 in 10,000 claims as tampered"
points: 3
labels:
  - data-contracts
  - compliance
ai_policy: assisted
objectives:
  - audit-hash-compatibility-tracing
acceptanceCriteria:
  - "The audit hash is computed over the claim's stored, canonical fields, before any client-facing compatibility shim rewrites anything for a legacy caller."
  - "A hash is pinned to the specific projection version it was computed over, so a later field addition cannot make an old, correctly written hash appear tampered."
  - "The trace from a flagged claim back to the exact shim or code change that altered its serialized shape is reproducible from the stored version information alone."
---

Compliance's tamper detector is firing on roughly 3 claims in every 10,000, all of them claims that were written before the v1 compatibility shim shipped and never touched since.

From the compliance report:

> Every flagged claim is old. Nobody edited them. The stored hash and the recomputed hash disagree, but only for claims written before last sprint's release.

The shim that keeps v1 clients working rewrites a couple of fields on the way out to match the shape they expect. If the audit hash is computed after that rewrite instead of before it, or if it is computed over whatever fields happen to exist today instead of the exact set it originally covered, a hash from before the shim shipped will never match again, correctly written claim or not.

Compliance's ask: "can we just recompute and re-save the hash for the old ones?" That would erase the evidence a tamper check exists to preserve, if the old hash was actually the correct one all along.
