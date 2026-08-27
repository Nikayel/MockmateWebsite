---
title: "Staging signed eleven minutes of webhooks with the dev key"
points: 5
labels:
  - parity
  - configuration
ai_policy: assisted
objectives:
  - boot-time-config-validation
acceptanceCriteria:
  - "Every environment variable the process depends on is validated once, against a typed schema, before the process starts accepting connections."
  - "A missing or malformed value fails the process at boot with a non-zero exit and a message naming which variable, not a fallback default that lets it start anyway."
  - "No path exists where the process can start serving traffic, including signing a webhook, using a fallback or development value for a secret."
---

During Tuesday's deploy, staging ran for eleven minutes with the developer signing key instead of its own, because the deploy did not fail when the real secret was missing from the environment.

From the incident channel:

> All six replicas reported healthy. Every webhook we sent in that window came back invalid_signature on the receiving end. The env var was misconfigured on the deploy, not missing from the secret store, so nothing upstream caught it.

Configuration is read piecemeal, wherever a value happens to be needed, with no single point that checks the whole set is present and well-formed before the process starts serving traffic. A missing or wrong value fails quietly, deep in whatever code path first touches it, if it fails at all.

Ambiguous ask from the on-call engineer: "can we just add a check for the signing key specifically?"
