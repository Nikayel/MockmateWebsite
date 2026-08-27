---
title: "A delivered webhook and the claim that produced it are in two different traces"
points: 6
labels:
  - "observability"
  - "tracing"
ai_policy: assisted
objectives:
  - distributed-trace-context-propagation
acceptanceCriteria:
  - "A trace started by the original API request continues through the outbox row, the queued message, and the delivery worker as one trace."
  - "The trace id is recoverable from the queued message itself, not reconstructed after the fact from a claim id in the payload."
  - "A retried delivery for the same claim links back to the same originating trace."
  - "Two different claims processed concurrently never share or cross into each other's trace."
---

Support asked for the trace on a webhook delivery to Northwind so they could
show it landed correctly. What came back was a trace that started and ended
inside the delivery worker, with no link back to the original API request
that created the claim or the outbox row that queued the webhook. From the
tracing tool's point of view, these are two unrelated events that happen to
reference the same claim id in their payloads.

The trace context needs to survive every hop: the original HTTP request,
the row written to the outbox, the message that goes out over the queue,
and the delivery worker that eventually sends the webhook. Right now it
dies at the first queue boundary, because nothing carries it across.

Once this works, a claim and every webhook attempt it ever produced should
read as one causal story in the tracing tool, not a pile of orphaned spans
that happen to share an id in their JSON body.
