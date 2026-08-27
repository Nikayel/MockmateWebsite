---
title: "$41k in nine days"
points: 8
labels:
  - "ai-engineering"
  - "cost"
  - "caching"
ai_policy: assisted
objectives:
  - cost-ceiling-cache-key-design
payoffFor: "MER-904"
payoffSignoff: true
acceptanceCriteria:
  - "A local result cache exists, keyed by document bytes, prompt hash, schema version, model, decoding parameters, and retrieved chunk revisions."
  - "A near-identical but non-identical claim is never served a cached result as if it were an exact match."
  - "Everything that instructs the model rather than describes this specific claim sits above the prompt-cache breakpoint; everything specific to this claim, including tenant and claim identifiers, sits below it."
  - "A hard per-claim cost ceiling is enforced before the spend happens, estimated at worst case and re-checked against actual provider usage after the response returns."
  - "Tokens spent on repair turns, aborted streams, and cache hits are all accounted for in the cost figure, not just the final successful call."
---

The model bill for the first nine days since extraction went live is
$41,000. Claim volume has not moved. Every retry, every repair turn where
the model was asked to fix its own malformed output, and every
near-identical claim from the same tenant is being sent to the provider as
a brand new, full-price call.

Two caches need to exist here, and they are not the same thing. A local
result cache, keyed by everything the answer actually depends on (document
bytes, prompt hash, schema version, model and decoding parameters, retrieved
chunk revisions) so a genuinely repeated input never re-calls the model at
all. And a provider-side prompt-prefix cache, which only discounts tokens
that are byte-identical to a previous call up to some point in the prompt,
meaning where things sit in the prompt matters as much as what they say.

That second one has a real shape, not a vague "put the stable stuff first":

| Above the breakpoint (instructs the model) | Below the breakpoint (derived from this request) |
| --- | --- |
| role and task, field glossary, output schema and version, exemplars, abstain rules | tenant id, claim id, loss date, retrieved chunks, document text |

Everything above the line is identical call to call. Everything below it is
specific to this one claim. There is deliberately no third category here
for "per-request but not tenant-specific": anything that varies by request
goes below the line, full stop, because the provider's cache is keyed to
our API key, not to a tenant, and mixing tenant-varying content above the
line would mean one tenant's cached prefix could apply to another tenant's
call.
