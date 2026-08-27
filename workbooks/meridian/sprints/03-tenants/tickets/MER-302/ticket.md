---
title: "Make the database refuse"
points: 8
labels:
  - tenants
  - database
ai_policy: assisted
objectives:
  - row-level-security-policy
acceptanceCriteria:
  - "Every tenant-scoped table refuses a cross-tenant read or write at the database level, enforced for every role including the one the application connects as, not only for a superuser bypassing it."
  - "The policy covers both reads and writes: a row a tenant is not allowed to see cannot be inserted or updated to reference that tenant's data either."
  - "Document visibility is derived from the parent claim in the database, not from a tenant key copied onto the document row. Justify this in review on isolation grounds alone: a copied tenant id is a second source of truth the extraction worker could set wrong, which is exactly the kind of mistake this ticket exists to make structurally impossible."
  - "A document that ends up attached to another tenant's claim is not visible to either tenant, and cannot be created that way in the first place."
payoffFor: "MER-304"
payoffSignoff: true
---

The immediate leak from SUP-2291 is patched, but it only proves one query was missing a filter. Nobody can currently answer how many other queries against tenant-scoped tables are trusting application code to remember the same thing.

From the incident retro:

> We keep finding tenant isolation bugs one query at a time. Every fix is "add the WHERE clause here too." What happens the day someone adds a new query and forgets?

Leadership wants isolation enforced somewhere a forgotten WHERE clause cannot bypass it, for every tenant-scoped table, not just the one that already leaked.

Documents are a related, harder case: a claim's documents are only ever looked up by claim, and the extraction worker that writes them receives a claim id off a queue message with no tenant of its own in scope. Whatever visibility rule ships for documents has to hold even though the row itself carries no tenant identity today.
