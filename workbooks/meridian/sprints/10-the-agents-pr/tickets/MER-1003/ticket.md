---
title: "Consolidate payout amount and currency, properly this time"
points: 5
labels:
  - "migrations"
  - "money"
ai_policy: assisted
objectives:
  - expand-backfill-contract-migration
acceptanceCriteria:
  - "Payout amount and currency round-trip through the database and back out exactly, with no floating-point representation appearing anywhere in between."
  - "The schema change ships as an expand step, a backfill step, and a contract step, each independently deployable."
  - "The previous version of the application continues to run correctly against the expanded schema before the contract step ships."
  - "A test asserts against the exact serialized value on the wire, not only the parsed numeric value, so this class of regression cannot pass silently again."
---

Finance found another discrepancy: a payout amount came back out of the
database as 8675.309999999999, with the trailing zeros gone, even though
money was already made cent-exact back in sprint 2. Sprint 2's own test
still passes, because it compares the value after parsing rather than the
raw text on the wire, so it never noticed the representation degrading
somewhere in between.

The specific path is writing payout amounts through a JSON-building
database function rather than through the money type's own serializer, and
that function is happy to hand back a floating-point number the moment it
touches the value at all. One of last night's overnight PRs, under review
as part of this sprint's PR triage, attempts a fix, but it changes the
column type directly in a way that would lock the payouts table during a
deploy and gives the previous version of the application nothing sane to
read if a rollback happens mid-migration.
