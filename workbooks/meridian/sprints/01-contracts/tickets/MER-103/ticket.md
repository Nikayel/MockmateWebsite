---
title: "The claims list shows the same claim twice (and page 340 takes 9s)"
points: 8
labels:
  - contracts
  - pagination
ai_policy: assisted
objectives:
  - keyset-pagination
acceptanceCriteria:
  - "Paging through the claims list while new claims are being written never returns the same claim twice or skips one."
  - "A page far into the list returns in roughly the same time as the first page."
  - "The pagination cursor has a tiebreak so two claims with the same timestamp still sort deterministically."
  - "The page size is bounded; an unbounded or absurd page size is rejected, not silently truncated."
---

An adjuster reported seeing the same claim on two different pages of the claims list while triaging this morning's queue. Separately, ops flagged that paging deep into the list, around page 340 and beyond, now takes 9 seconds.

From the adjuster's message:

> I paged forward through 40 claims, went back to check something, and CLM-66210 was on both page 3 and page 4. Did we lose track of one?

The list endpoint pages by an offset and a page size. New claims keep arriving while someone is paging through, which shifts every row after the insert point by one. Nobody plans around that when they wire up an offset query, and the deep-page slowness is a related symptom of the same design.

Product's ask so far has just been "make the list not be slow," which does not by itself explain the duplicate row.
