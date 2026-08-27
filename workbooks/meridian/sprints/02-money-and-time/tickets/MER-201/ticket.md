---
title: "Payout totals drift by a cent and Finance has the spreadsheet"
points: 8
labels:
  - money
  - data-contracts
ai_policy: assisted
objectives:
  - exact-money-representation-rounding
acceptanceCriteria:
  - "An amount is represented as an exact integer count of the currency's minor unit, paired with its currency code, from parsing through storage through the response body."
  - "Rounding happens at exactly one point in any calculation, using round-half-to-even, never at each intermediate step."
  - "Splitting a total across line items produces parts that sum back to exactly the original total."
  - "An amount from an untrusted request that cannot be represented exactly in the target currency's minor unit is rejected, not silently truncated."
---

Finance's monthly reconciliation is out by $412.19 across 40,317 claims, and the gap moves to a different set of claims every time they re-run the export.

From #finance-ops:

> We export payout totals, sum them in the spreadsheet, and compare to what actually got paid out. It's never the same claims that are off, and it's never more than a cent or two per claim, but at this volume it adds up to real money every month.

Every amount in the system today is a plain floating-point number, from the database column to the JSON on the wire. Floating point cannot represent most decimal currency amounts exactly, and each arithmetic step, tax, discount, per-line allocation, both rounds and cannot know it just did.

Finance's ask, verbatim: "just round it at the end, right before it goes out?" That would hide the symptom without fixing where the error actually comes from.
