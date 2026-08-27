---
title: "Move extraction onto SQS (staging is extracting the same claim four times)"
points: 8
labels:
  - "aws"
  - "sqs"
  - "concurrency"
ai_policy: assisted
objectives:
  - sqs-consumer-at-least-once-delivery
acceptanceCriteria:
  - "Extraction is triggered by a queued message, not run inline inside the upload request."
  - "The same message delivered twice does not produce two extraction results for the same claim."
  - "A consumer that receives SIGTERM mid-extraction finishes its current message or cleanly releases it instead of losing it."
  - "A message that fails extraction repeatedly is moved to a dead-letter queue instead of being redelivered forever."
---

QA reported that a single claim submitted in staging came back with four
separate extraction results, three of which silently overwrote each other
before anyone noticed. Right now, extraction runs synchronously off the back
of the upload confirmation, in-process, with no retry and no way to tell if
a claim is already being worked.

The plan has always been to put extraction behind a real queue instead of
running it inline, so a slow or failing extraction doesn't block the request
that triggered it and a redelivered message doesn't extract the same claim
twice. Staging is already showing us what happens when that queue doesn't
exist yet: at-least-once delivery without any dedup reprocesses things,
repeatedly, and whatever consumes those messages needs to survive that on
its own.

This also needs to survive a deploy. If a consumer is mid-extraction when a
new version rolls out, that claim cannot just vanish.
