---
title: "Extraction has no way to say \"I don't know\""
points: 5
labels:
  - "ai-engineering"
  - "llm"
ai_policy: assisted
objectives:
  - llm-replayable-seam-typed-abstention
acceptanceCriteria:
  - "The extraction path can run entirely in CI with no network call and no provider key, replaying a fixed recorded exchange."
  - "A claim where a field cannot be found returns a distinct, typed \"not found\" outcome rather than a fabricated default value."
  - "A change to the prompt or the model produces a visible diff against what CI already has recorded, rather than passing silently."
  - "Nothing downstream of extraction treats \"not found\" the same way it treats a real extracted value."
---

The extractor currently always returns a full set of fields for every
claim, because the regex-based pipeline it started life as had no other
option: if a field didn't match, it fell back to a default rather than
admitting it found nothing. Whatever replaces it needs to be honest about
the difference between "I read the deductible and it's $500" and "I could
not find a deductible on this document," because right now those two cases
are indistinguishable downstream.

This also has to run somewhere other than production. Right now, testing
anything about extraction means burning real provider tokens against a real
API on every test run, with no way to pin a specific model response and
replay it later. A prompt change or model swap should show up as a
reviewable diff, not a surprise discovered days later on live claims.
