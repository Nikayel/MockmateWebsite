---
title: "Claims filed on the 1st keep landing in the previous month"
points: 5
labels:
  - time
  - data-contracts
ai_policy: assisted
objectives:
  - date-time-zone-modeling
acceptanceCriteria:
  - "A claim's filed-on date is computed in the owning tenant's own time zone, not the server's."
  - "A calendar-day deadline computed from a filing date lands on the correct day across a daylight-saving transition in either direction."
  - "A date-only value and an instant in time are represented as distinct types; neither can be silently substituted for the other."
  - "A tenant in a non-whole-hour offset, for example a half-hour zone, computes the same deadline a whole-hour tenant would, adjusted correctly for the offset."
---

A tenant in a UTC-negative time zone keeps filing claims that land in the wrong reporting month.

From the support queue:

> Filed at 11:40pm on the 1st, local time. Shows up under the last day of the previous month in every report. Happened three times this cycle for the same tenant, always right around midnight.

The system stores a single timestamp and reports "the day it was filed" by formatting that instant in server time, not the tenant's own time zone. Whoever built this treated a moment in time and a calendar day as the same thing, and they are not, especially for a tenant far from UTC and especially across a daylight-saving transition.

There is a second, related complaint from ops about a payout deadline that landed an hour early during the spring transition, which smells like the same root cause.
