---
title: "AWS was $180/mo. It is $4,900 in nine days and it is not the LLM."
points: 5
labels:
  - "aws"
  - "cost"
  - "finops"
ai_policy: unassisted
ai_policy_reason: "Deciding which of last week's changes to keep, cut, or redesign because of what they cost is a judgment call about the business, not a coding task. An agent will find the biggest line item, recommend deleting it, and take your monitoring down with it."
objectives:
  - cloud-cost-attribution
acceptanceCriteria:
  - "The cost increase is attributed to specific services and specific lines of code shipped this sprint, not a guess."
  - "At least one root cause is identified that is not the LLM provider."
  - "The fix brings spend back toward the prior baseline without removing logging, tracing, or alerting coverage."
  - "The attribution and the fix are both written down somewhere the next person can find them before the next bill arrives."
---

Finance flagged this on the monthly card statement before anyone else did.
AWS was running about $180 a month through last week. The bill for the
first nine days of this billing period alone is $4,900, and it is trending
to keep climbing. Someone's first guess was the new LLM extraction path, but
the LLM provider's own dashboard says token spend hasn't moved.

Whatever this sprint shipped is the likely cause: new SQS traffic, a second
IAM-scoped role doing its own polling, presigned uploads going straight to
S3, maybe something in how the blue/green deploy handles target groups. The
cost-and-usage export is available. Nobody has actually read it line by
line yet.

Bring the number back down without turning off anything that is actually
catching problems. Deleting the CloudWatch alarms would also bring the bill
down, and it would also mean nobody hears about the next incident until a
customer calls.
