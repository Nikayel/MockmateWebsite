---
title: "Use the model (Northwind churn risk)"
points: 8
labels:
  - "ai-engineering"
  - "llm"
  - "schema"
ai_policy: assisted
objectives:
  - constrained-json-output-typed-errors
acceptanceCriteria:
  - "Model output is validated against a JSON Schema generated from the same source the rest of the code already validates against."
  - "A schema-invalid response, a timed-out request, and a rate-limited request are three distinct, typed outcomes, not one generic failure."
  - "No response is accepted downstream until it has passed schema validation."
  - "A field the model is not confident about is represented as such, not silently coerced to a default."
---

Northwind's contract renewal is coming up and their lead adjuster has said,
more than once, that the regex extractor misses fields a human reader would
catch immediately. Product wants the actual model call live before that
renewal conversation, replacing the regex pass entirely rather than running
alongside it.

The model needs to return something the rest of the system can trust the
shape of. A raw text completion that mostly looks like the right JSON is
not good enough when the fallback path for a malformed response has, so
far, been to just retry until something parses. Timeouts and rate limits
from the provider are also going to happen in production and need to be
told apart from a response that came back but didn't match the schema,
because the right response to each is different.
