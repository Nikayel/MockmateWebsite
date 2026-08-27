---
title: "The deductible is always $500"
points: 8
labels:
  - "ai-engineering"
  - "rag"
  - "retrieval"
ai_policy: assisted
objectives:
  - tenant-scoped-policy-retrieval
payoffFor: "MER-903"
payoffSignoff: true
acceptanceCriteria:
  - "Retrieval is exposed to the extractor as a callable tool, and because extraction has run off the request path since MER-603, there is no ambient request identity for it to read, so the tool's scope is bound by its call site, from the job envelope's tenant."
  - "The tool's tenant and document scope is bound at the call site from the job's own tenant, never from a value the model's output could influence."
  - "The policy revision retrieved is the one in force on the claim's loss date, not simply the newest revision on file."
  - "The extracted deductible cites which policy chunks it was derived from."
---

Three claims from three different tenants were extracted this week, all
with a deductible of exactly $500. Two of those tenants have never had a
$500 deductible policy in force. Someone finally checked and the extractor
is not reading the policy document that applies to the claim at all. It has
no access to policy documents in the first place, so $500 is a hardcoded
fallback nobody remembers writing.

Fixing this means giving the extractor real retrieval over policy
documents, scoped to the tenant the claim belongs to, resolving whichever
revision of the policy was in force on the loss date rather than whatever
is newest. And because extraction runs off a queue rather than inside a
request since MER-603, there is no ambient request identity for retrieval
to read off of the way an HTTP handler could. Retrieval has to be exposed
to the extractor as a callable tool, and its scope has to be bound at the
point it is called, from the tenant on the job that triggered extraction,
not from anything the model itself supplies.
