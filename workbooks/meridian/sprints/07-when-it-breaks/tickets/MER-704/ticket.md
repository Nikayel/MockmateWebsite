---
title: "Contract says 99.9%: turn that into something that can page us"
points: 5
labels:
  - "observability"
  - "slo"
  - "alerting"
ai_policy: assisted
objectives:
  - slo-error-budget-burn-rate-alerts
acceptanceCriteria:
  - "A written SLI and error budget exist for the claims API, derived from the 99.9% commitment."
  - "Multi-window burn-rate alerts exist and are configured against that error budget."
  - "Replaying the alerts against yesterday's 14:05 incident data shows they would have fired."
  - "Replaying the same alerts against a normal, quiet day's data shows they do not fire."
---

Sales tells prospects Meridian offers 99.9% uptime on the claims API. Nobody
in engineering has ever written down what that number means in terms an
alert can act on, and there is currently no alert that would have fired
during yesterday's 14:05 regression at all. If p99 quietly degrades for an
hour and nobody notices until a customer calls, the SLA is decorative.

The ask is to turn 99.9% into an actual SLI, an error budget it burns
against, and alerts that fire on a meaningful burn rate rather than on a
single slow request. It needs to be tight enough to catch a real incident
and loose enough that a quiet Tuesday doesn't page anyone at 3am for
nothing.

Whatever thresholds get chosen, replay them against yesterday's actual
incident data before calling this done. If the alert wouldn't have fired at
14:05, the thresholds are wrong.
