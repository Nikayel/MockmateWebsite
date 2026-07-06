/**
 * System Design — Level 6: Asynchronous & Event-Driven Systems.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l6-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L6. 15 lessons across 5
 * modules (sd-l6-m1..m5). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const syncVsAsyncTeach = `
## The chain of availability

A synchronous call blocks the caller until the callee returns. The caller's latency is the sum of
every hop, and the caller's availability is the product of every downstream's availability. Chain
five services at 99.9 percent each synchronously and your effective availability is about 99.5
percent, because any one being down fails the whole request. Async breaks that chain by putting a
broker between producer and consumer.

Async buys you three specific decouplings, and naming them is how you sound senior:

- **Time decoupling (buffering).** The producer writes to the broker and moves on; the consumer
  processes later, at its own pace. A traffic spike that would overwhelm a synchronous downstream
  instead grows a queue that drains when load falls.
- **Space decoupling (location).** The producer does not know or care which service, or how many of
  them, consume the message. You add a fraud checker or a new analytics consumer without touching the
  producer.
- **Synchronization decoupling (non-blocking).** The producer does not wait for the work to finish.
  Its latency drops to the cost of one durable write to the broker (single-digit ms) instead of the
  sum of all downstream work.

The price is eventual consistency. The moment you make a step async, the effect (inventory
decremented, email sent) happens after the response, so a follow-up read can observe a state where
the effect has not landed yet. You must design for that gap.

### Command versus event

A **command** ("ChargeCard") is an instruction to one specific handler that must succeed and often
returns a result, so it tends to stay synchronous. An **event** ("OrderPlaced") is an immutable
statement of fact that already happened; any number of consumers react to it, and the producer does
not care what they do. Events point the coupling arrow away from the producer, which is why they
scale fan-out cleanly.

The failure mode also inverts. Synchronously, a failure is an error returned to the caller who can
retry right now. Async pushes failure into the background: a consumer that throws must be retried
with backoff, and after N failures the message lands in a dead-letter queue (DLQ). You now need retry
policy, idempotent consumers (because retries duplicate), a DLQ, and monitoring on consumer lag and
DLQ depth. The user already got a 200; nobody is watching the screen when the async step breaks.

**Interview nuance:** the wrong turn is adding a broker to simple CRUD that needs a strong-consistency
read right after the write. If a user saves a setting and immediately reads it back, an async write
behind a queue gives them a stale read and a support ticket. Async pays off when the follow-up work
is genuinely independent of the response.

\`\`\`
Sync:   client -> [payment] -> [inventory] -> [email] -> [analytics] -> 200
        latency = sum of all; one down = request fails

Async:  client -> [payment] -> 200
                       |
                   OrderPlaced --> broker --> [inventory]
                                          --> [email]
                                          --> [analytics]
\`\`\`

Recap: async decouples in time, space, and synchronization, trading immediate consistency for
throughput and availability; keep steps synchronous when the caller needs the result or a consistent
read, and make independent side effects events.
`.trim()

export const systemDesignLevel6: DesignLevel = {
  id: 6,
  slug: "event-driven",
  title: "Level 6 — Asynchronous & Event-Driven Systems",
  tagline:
    "Messaging models, Kafka and the log, delivery guarantees, stream processing, and schema governance.",
  estimatedHours: 7,
  modules: [
    {
      id: "sd-l6-m1",
      title: "Messaging Foundations",
      description:
        "Decide which parts of a flow stay synchronous and which become async events, tell a queue from a pub/sub topic from a durable log by retention and replay, and pick a specific broker instead of reaching for Kafka by reflex.",
      lessons: [
        {
          id: "sd-l6-sync-vs-async",
          title: "Sync vs Async & When to Go Event-Driven",
          summary:
            "Async decouples in time, space, and synchronization at the cost of eventual consistency; keep the result-bearing or consistency-sensitive steps synchronous and make independent side effects events.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["async", "event-driven", "checkout"],
          teach: {
            markdown: syncVsAsyncTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-sync-vs-async-apply",
            prompt:
              "Design the checkout flow for an e-commerce site: decide which steps stay synchronous (payment auth) and which become async events (inventory, email, analytics), and justify each boundary.",
            thinkAbout: [
              "What are the three decouplings async buys (time, space, synchronization)?",
              "Which steps need synchronous consistency, and which tolerate eventual?",
              "How does the failure mode shift from sync errors to background retries/DLQ?",
            ],
            modelAnswerOutline: [
              "Assumptions: a mid-size store, a few hundred checkouts per minute with 10x sale spikes, payment via Stripe, correctness on money and inventory matters more than shaving the last few ms.",
              "**The synchronous core is what the user must know before a confirmation:** validate the cart, then call payment authorization synchronously. Payment auth is a command with a result the user needs right now (approved or declined changes what we show), and it is where ambiguity is unacceptable, so block on it. Keep a synchronous inventory reservation too if oversell is unacceptable (`SELECT ... FOR UPDATE` or a conditional decrement), because 'sorry, out of stock' after charging is a terrible experience.",
              "**Everything the user does not need in the response becomes async:** on successful auth, write one immutable `OrderPlaced` event to a broker (Kafka topic or SNS fan-out) and return 200. Independent consumers subscribe: fulfillment/inventory-settlement, email/receipt, analytics, loyalty-points. Space decoupling means adding a fraud-review consumer later touches no existing code; time decoupling means a 10x sale spike grows consumer lag instead of timing out checkout.",
              "**The failure model shifts deliberately:** a failed email is retried with exponential backoff and, after N attempts, parked in a DLQ with an alert, not surfaced to the buyer who already succeeded. Consumers must be idempotent because at-least-once delivery redelivers: key side effects on `order_id` so a duplicate `OrderPlaced` does not send two receipts or double-decrement stock. Monitor consumer lag and DLQ depth as first-class SLOs.",
              "Common wrong turn: making payment async to 'speed up checkout.' Then the user sees a confirmation before the charge is real, and declines become a reconciliation nightmare. Keep the money-and-stock decision synchronous; make notifications, analytics, and downstream fulfillment async.",
            ],
          },
          practice: {
            id: "sd-l6-sync-vs-async-practice",
            prompt:
              "Design the async boundary for Uber's ride-request flow at the moment a rider taps 'Confirm,' where the dispatch match must feel near-instant (sub-second) but a single ride fans out to pricing finalization, driver notification, ETA updates, fraud scoring, and the trip-history/analytics pipeline. Decide what stays on the synchronous request path and what becomes events.",
            thinkAbout: [
              "What is the narrow synchronous path the rider is actually waiting on?",
              "Why must the driver reservation be strongly consistent?",
              "How do you keep a lagging analytics consumer from degrading dispatch?",
            ],
            modelAnswerOutline: [
              "Assumptions: hundreds of thousands of concurrent riders, dispatch latency budget under about one second because the rider is staring at the screen, correctness on matching (one driver per ride) is critical.",
              "**The synchronous path is narrow:** validate the request, run the dispatch match against nearby available drivers, and reserve the chosen driver so no other ride grabs them. The match is a command with a result the rider needs immediately, and the driver reservation needs strong consistency to avoid double-assigning, so keep it synchronous against a low-latency store (Redis or an in-memory geo-index with a conditional claim). Return the assigned driver and a first ETA.",
              "**Everything else is an event:** on a successful match, emit `RideMatched` to Kafka keyed by `ride_id`. Consumers: pricing finalization (surge, promos), the driver-app push notification, continuous ETA recomputation, fraud/risk scoring, and the trip-history/warehouse pipeline. These are independent, tolerate hundreds of ms of lag, and must not block the rider's confirmation. Space decoupling lets the risk team add a consumer without touching dispatch.",
              "**Because delivery is at-least-once, consumers are idempotent on `ride_id`:** the notification consumer dedupes so a driver is not double-pinged, and the analytics consumer upserts. Failures go to per-consumer retry then DLQ with alerts; a lagging analytics consumer never degrades dispatch because offsets are per-consumer.",
              "Common wrong turn: putting fraud scoring or pricing on the synchronous path to 'get it right up front,' which blows the sub-second budget and couples dispatch availability to five downstreams. Keep the match and driver reservation synchronous; make the fan-out events.",
            ],
          },
        },
      ],
    },
  ],
}
