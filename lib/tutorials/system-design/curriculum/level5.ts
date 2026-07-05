/**
 * System Design — Level 5: Distributed Systems Core.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l5-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L5. 18 lessons across 5
 * modules (sd-l5-m1..m5). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const partialFailureTeach = `
## No global off switch

A single program has one failure mode a programmer really cares about: it crashes, and everything
stops together. A distributed system does not have an off switch. Some nodes and links fail while the
rest keep running, and that is **partial failure**. Node A is healthy, node B is on fire, the network
between them is dropping 3% of packets, and no component has a global view of any of this. Every hard
result in distributed systems descends from this one fact.

### The ambiguity of a timeout

When service A sends a request to service B and starts a timer, exactly one of these happened when
the timer expires, and **A cannot tell which**:

1. The request never reached B (lost on the way out). B did nothing.
2. B received it, did the work, and the response was lost on the way back. B did the work.
3. B is just slow (GC pause, overloaded, 200ms of queueing) and the response is still coming.
4. B crashed before, during, or after the work.

A timeout is not "B failed." It is "I have no idea what B did." If A retries after case 2, B performs
the side effect twice. If A gives up after case 1 when the write actually needed to happen, data is
lost.

### The fallacies of distributed computing

The fallacies (Deutsch, Gosling, at Sun) are the false assumptions that make people write code that
ignores the four outcomes above. The load-bearing ones: the network is reliable (it is not), latency
is zero (a cross-region round trip is 60 to 150ms), bandwidth is infinite (fan-out saturates links),
topology is static (nodes and routes change constantly), and transport cost is zero (serialization
and TLS are real CPU). Believing any of these produces a system that works in the demo and falls over
in production.

Theory pins this down. In a fully **asynchronous** model (unbounded message delay, no clocks) you
cannot even reliably tell a dead node from a slow one, which is why consensus is impossible there
(FLP). Real systems assume **partial synchrony**: delays are usually bounded but occasionally are
not, and clocks drift. That "occasionally not" is exactly where split-brain and lost writes hide.

**Interview nuance:** the single most common junior mistake is treating a timeout as a definite
failure and re-issuing a side effect, causing a double charge or duplicate order. The senior answer:
make the operation **idempotent** (idempotency key, dedup on the receiver) so a retry is safe
regardless of which of the four outcomes actually happened. Then retries become a
correctness-preserving tool instead of a bug.

The design implication: every remote interaction must assume the worst. Requests get retried (so
handle **duplicates**), messages arrive out of order (so handle **reordering**), and reads can be
**stale**. This is the baseline contract of talking over a network, not something you sprinkle in
later.

\`\`\`
   A ---- request ----> B      timeout fires. which one?
   A <--- response ---- B      (1) req lost   (2) resp lost
                               (3) B slow     (4) B dead
   A cannot distinguish them from A's side.
\`\`\`

Recap: partial failure means parts fail independently with no global off switch, a timeout is
fundamentally ambiguous (lost request, lost response, slow peer, or dead peer), the fallacies of
distributed computing are the false assumptions that ignore this, and the fix is to design every call
for retries, reordering, duplication, and stale reads, made safe by idempotency.
`.trim()

export const systemDesignLevel5: DesignLevel = {
  id: 5,
  slug: "distributed-core",
  title: "Level 5 — Distributed Systems Core",
  tagline:
    "CAP/PACELC, consistency, clocks, consensus, distributed transactions, and failure handling.",
  estimatedHours: 9,
  modules: [
    {
      id: "sd-l5-m1",
      title: "Failure Models & CAP",
      description:
        "Reason like a staff engineer: why a timeout tells you almost nothing, CAP as a per-partition choice rather than pick-2-of-3, and real databases placed on the PACELC spectrum with their latency tax named.",
      lessons: [
        {
          id: "sd-l5-partial-failure",
          title: "Partial Failure & the Fallacies of Distributed Computing",
          summary:
            "A timeout is fundamentally ambiguous across four physical outcomes, so every call must be designed for retries, reordering, duplication, and stale reads via idempotency.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["fallacies", "partial-failure"],
          teach: {
            markdown: partialFailureTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-partial-failure-apply",
            prompt:
              "Write a failure-mode analysis for a service A calling service B over the network: enumerate every outcome A can observe and how A should react to each.",
            thinkAbout: [
              "Why can A not distinguish a lost request from a slow or dead peer?",
              "Which fallacies of distributed computing bite here?",
              "What must every call handle: retries, reordering, duplication, stale reads?",
            ],
            modelAnswerOutline: [
              "Assumptions: A calls B synchronously over HTTP/gRPC, B performs a side effect ('charge $20'), A has a 500ms timeout, and the network is partially synchronous: usually fast, occasionally not.",
              "**Three observable results, with the failure ones ambiguous.** Success: a 2xx before the timeout, A knows B did the work. Explicit error: a 5xx or connection refused, honest but still not always telling A whether the side effect ran (a 500 can fire after the charge committed). Timeout / no response: the hard case, collapsing four physically distinct events into one observation: request lost (B did nothing), response lost (B did the work), B slow (work in flight), or B dead. A genuinely cannot distinguish them: absence of a reply looks identical in all four.",
              "**The reaction cannot be 'assume failure' or 'assume success': it is retry with idempotency.** A attaches an idempotency key; on timeout or 5xx it retries the same key; B deduplicates so a replayed 'charge $20' charges once. Safe under all four outcomes: if the first attempt succeeded, the retry is a no-op; if it failed, the retry does the work. Bound retries (say 3 attempts) with exponential backoff plus jitter, and after exhaustion route to a dead-letter queue or compensating action rather than looping forever.",
              "**The fallacies that bite:** the network is reliable (drops cause outcomes 1 and 2), latency is zero (slowness causes outcome 3 and forces the timeout choice), topology is static (B's instances come and go behind a load balancer).",
              "**Beyond retries:** handle reordering (retry N+1 can land before a delayed attempt N, so B orders by key/sequence, not arrival), duplication (the dedup above), and stale reads (replication lag means A must not treat a read of B's state as confirmation of its own write).",
              "Common wrong turn: treating the timeout as a definite failure and re-charging, producing a double charge. The whole discipline: ambiguous outcome plus idempotent retry equals correctness.",
            ],
          },
          practice: {
            id: "sd-l5-partial-failure-practice",
            prompt:
              "Design the client-side failure handling for a mobile checkout calling Stripe's payment API at 2,000 requests/second, where the app is on flaky cellular networks and a duplicate charge is a Sev-1 incident. Enumerate the outcomes the app observes and the exact mechanism that prevents a second charge.",
            thinkAbout: [
              "What must be stable across retries for the idempotency mechanism to work at all?",
              "How does the app behave when fully offline mid-checkout?",
              "Where does your own backend add a second line of dedup defense?",
            ],
            modelAnswerOutline: [
              "Assumptions: cellular RTT swings from 80ms to seconds, connections drop mid-request, users tap 'Pay' again when a spinner hangs. At 2,000 rps a 1% ambiguous-timeout rate is 20 potential double-charge events per second, so this must be structurally safe.",
              "**Mechanism:** generate an idempotency key per checkout attempt on the client (a UUID tied to the cart, NOT regenerated on retry) and send it as Stripe's Idempotency-Key header. Stripe stores the first request's result under that key for 24 hours and returns the identical response to any replay, so a lost-response retry and a user double-tap both collapse to a single charge. Regenerating the key per attempt defeats the entire mechanism: the classic wrong turn.",
              "**Outcomes and reactions:** 2xx: persist the charge id locally, done. 4xx (card declined, bad key): terminal, show the user, do not retry. Timeout / connection dropped: ambiguous, retry the same key with exponential backoff and jitter, capped (~4 attempts over ~30s). Network offline: queue the attempt durably on device and replay when connectivity returns, still with the same key, so offline-then-online cannot double charge.",
              "**Reordering:** because the key is per checkout, out-of-order retries are harmless; Stripe resolves them to one outcome.",
              "**The backend's second line of defense:** record the Stripe charge id under the cart id with a unique constraint, so even an application-level replay cannot create two orders.",
              "The load-bearing insight: correctness comes from the idempotency key end to end (client generates, Stripe dedups, your DB uniquely constrains), not from trying to make the flaky network reliable, which is impossible.",
            ],
          },
        },
      ],
    },
  ],
}
