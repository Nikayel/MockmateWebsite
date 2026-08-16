/**
 * Curated cross-track "related concepts" edges, plus the one practice CTA a lesson may carry.
 *
 * ## Why this exists (SEO-24)
 *
 * The corpus links along one axis only. Every lesson page chains prev and next inside its own
 * course, so the median lesson has three or four inbound links and all of them come from its own
 * level. Measured 2026-08-13, only 21 of 425 lessons had any inbound link from outside `/learn`.
 * The site is authority-limited rather than content-limited, and internal linking is the single
 * authority lever we own outright.
 *
 * ## Why curated and never computed
 *
 * `lesson-drills.ts` already recorded what happens when a "related" mapping is derived from tags:
 * measured, a `skills`-versus-`tags` match covered 30 of 208 lessons and got several of them wrong,
 * because a shared adjective is not a shared subject. The same failure mode is worse here, because a
 * computed edge also produces a computed anchor, and a generic anchor ("Related lesson", "Learn
 * more") carries none of the query phrase that makes an internal link worth having. So every edge is
 * written by hand with the anchor text it should carry, and `related-concepts.test.ts` fails the
 * build when an id stops resolving, when a lesson links to itself, or when an anchor drifts generic.
 *
 * ## Shape of the graph
 *
 * Not reciprocal islands. Each seeded lesson points at three to five others, deliberately skewed
 * toward levels Search Console shows as under-surfaced (`system-design/scaling-compute` is 1 of 14,
 * `data-engineering/modeling` 2 of 12) and toward the other tracks: Data Engineering and System
 * Design share dozens of subjects (delivery semantics, dedup, partitioning, skew, freshness SLAs)
 * and until now neither track admitted the other existed.
 *
 * ## The twin-pair anchor rule (binding)
 *
 * Several subjects are taught twice: `sd-l1-load-balancing` and `sd-l4-lb-l4-l7`,
 * `sd-l1-backpressure-shedding` and `sd-l4-load-shedding-backpressure`, `sd-l1-tls-https` and
 * `sd-l4-tls-connection-mgmt`, `sd-l1-dns` and `sd-l4-global-gslb`, `sd-l7-blast-radius-cells` and
 * `sd-l4-cell-shuffle-sharding`, `sd-l10-rate-limiter` and the two L4 rate-limiting lessons,
 * `sd-l2-time-series` and `sd-l11-time-series-storage`.
 *
 * For each pair Search Console already shows which page Google assigned the shared head term to, and
 * that page keeps it: `sd-l1-load-balancing` owns "L4 vs L7", `sd-l10-rate-limiter` owns "distributed
 * rate limiter". **An anchor pointing at the OTHER twin must carry that page's own differentiator and
 * must not repeat the shared term.** Repeating it re-creates the duplicate-intent signal that is the
 * best available explanation for `system-design/scaling-compute` sitting at 1 of 14 lessons ever
 * surfaced while every sibling level is at 76 percent or better.
 *
 * So the anchor pointing at `sd-l4-tls-connection-mgmt` is about a long-lived connection pinning to
 * one backend, not "TLS termination"; the anchor pointing at `sd-l4-distributed-rate-limiting` is
 * about per-node limits granting N times the cap, not "distributed rate limiting". Each of those
 * phrases is taken from the destination lesson's own summary, so the anchor is also true.
 *
 * ## The CTA
 *
 * Brief section 3: at most ONE contextual practice CTA per lesson, its label describing what the
 * reader will practice rather than saying "Start now". Destinations are an allowlist
 * ({@link PRACTICE_CTA_DESTINATIONS}) of indexable landing pages. `/interview` is deliberately absent
 * and must stay absent: it is `robots: { index: false }` (see `app/interview/layout.tsx`), so a CTA
 * pointing there would spend a link on a page that cannot rank. The eleven Level 10 case studies that
 * already carry a timed-drill card (`LESSON_DRILLS`) carry no CTA here, so no lesson ever shows two
 * competing "go practice" boxes.
 */
import { listAllCatalogEntries } from "./course-catalog"
import { LEARN_COURSE_LABEL, publicLessonPath } from "./lesson-routes"
import type { CourseId } from "./types"

/** One curated edge: the target lesson and the exact anchor text the link should carry. */
export interface RelatedConcept {
  /** Lesson id of the target. Must resolve in the course catalog; the test pins this. */
  id: string
  /**
   * Hand-written anchor text. Carries the phrase the target page wants to rank for, in a form a
   * human would click. Never a bare title repeat and never generic.
   */
  anchor: string
}

/**
 * The only destinations a lesson CTA may point at. All are indexable landing pages with real product
 * behind them. Adding a route here means asserting that the page exists, is indexable, and matches
 * the practice the label promises.
 */
export const PRACTICE_CTA_DESTINATIONS = [
  "/system-design-interview-practice",
  "/data-engineer-interview-practice",
  "/ai-coding-interview-practice",
  "/free-ai-coding-interview",
  "/labs",
] as const

export type PracticeCtaHref = (typeof PRACTICE_CTA_DESTINATIONS)[number]

/** The single contextual conversion module a lesson may carry. */
export interface PracticeCta {
  href: PracticeCtaHref
  /** What the reader will practice. Never "Start now", never "Try it free". */
  label: string
}

export interface RelatedConceptsEntry {
  related: readonly RelatedConcept[]
  cta?: PracticeCta
}

/**
 * The registry. Keyed by lesson id, which is frozen (learner progress is keyed on it).
 *
 * Seeded for the high-visibility set: every lesson named in `seofixesbacklog.md` items SEO-04
 * through SEO-23, every Learn URL in the 28-day Search Console top-pages export, and the natural
 * neighbours that make those into a connected graph rather than a pile of pairs.
 */
export const RELATED_CONCEPTS: Readonly<Record<string, RelatedConceptsEntry>> = {
  // ---------------------------------------------------------------------------------------------
  // System Design: distributed systems core (SEO-04, SEO-06, SEO-07, SEO-20)
  // ---------------------------------------------------------------------------------------------
  "sd-l5-leader-election-fencing": {
    related: [
      {
        id: "sd-l10-distributed-lock",
        anchor: "Designing a distributed lock, and why Redlock still needs a fencing token",
      },
      {
        id: "sd-l5-raft-paxos",
        anchor: "How Raft elects a leader, and what a term number fences off",
      },
      {
        id: "sd-l5-2pc-3pc",
        anchor: "Two-phase commit versus three-phase commit, and the coordinator that blocks",
      },
      {
        id: "sd-l5-failure-detection",
        anchor: "Failure detection with heartbeats, phi-accrual and SWIM",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a distributed systems round where an AI interviewer asks how you fence a stale leader",
    },
  },

  "sd-l5-2pc-3pc": {
    related: [
      {
        id: "sd-l5-sagas",
        anchor: "Sagas and compensating transactions, what long workflows use instead of 2PC",
      },
      {
        id: "sd-l5-raft-paxos",
        anchor: "Consensus with Raft and Paxos, which survives losing the coordinator",
      },
      {
        id: "sd-l2-isolation-levels",
        anchor: "Isolation levels, and the anomalies a single database still permits",
      },
      {
        id: "sd-l3-cross-shard-ops",
        anchor: "Cross-shard writes and distributed transactions inside one database",
      },
      {
        id: "sd-l5-leader-election-fencing",
        anchor: "Leader election, leases, fencing tokens and split-brain",
      },
      {
        id: "sd-l9-monolith-vs-microservices",
        anchor:
          "Monolith, modular monolith or microservices, the boundary decision that creates the distributed transaction",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice defending an atomic-commit choice out loud in a timed system design round",
    },
  },

  "sd-l10-distributed-lock": {
    related: [
      {
        id: "sd-l5-leader-election-fencing",
        anchor:
          "Leader election and leases, and the fencing token that makes a stale lock holder harmless",
      },
      {
        id: "sd-l5-raft-paxos",
        anchor: "Raft consensus, the algorithm underneath etcd and ZooKeeper",
      },
      {
        id: "sd-l4-distributed-rate-limiting",
        anchor:
          "Why naive per-node limits grant N times the cap, and the atomic Redis operation that fixes it",
      },
      {
        id: "sd-l3-distributed-cache-arch",
        anchor: "Distributed cache architecture, where a Redis-based lock actually lives",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a mutual-exclusion design round and get scored on the failure cases you name",
    },
  },

  "sd-l5-raft-paxos": {
    related: [
      {
        id: "sd-l5-leader-election-fencing",
        anchor: "Leader election, leases, fencing and split-brain in practice",
      },
      {
        id: "sd-l5-smr-total-order",
        anchor: "State-machine replication and total-order broadcast",
      },
      { id: "sd-l5-quorums-tunable", anchor: "Quorums and Dynamo-style tunable consistency" },
      {
        id: "sd-l10-distributed-lock",
        anchor: "Design a distributed lock on ZooKeeper or etcd",
      },
      {
        id: "sd-l5-logical-clocks",
        anchor: "Lamport and vector clocks, ordering events without a leader",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice explaining a consensus choice to an interviewer who asks what happens on a network partition",
    },
  },

  "sd-l5-sagas": {
    related: [
      {
        id: "sd-l5-2pc-3pc",
        anchor: "Two-phase commit, and why long-running workflows stopped using it",
      },
      {
        id: "sd-l5-outbox-messaging",
        anchor: "The transactional outbox, for publishing an event and committing a row atomically",
      },
      { id: "sd-l6-event-sourcing", anchor: "Event sourcing as the write model behind a saga" },
      { id: "sd-l10-payment-ledger", anchor: "Design a payment system and double-entry ledger" },
      {
        id: "sd-l9-monolith-vs-microservices",
        anchor:
          "Monolith, modular monolith or microservices, the boundary decision that creates the saga",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice designing a multi-service checkout flow and walking through its compensations",
    },
  },

  "sd-l5-logical-clocks": {
    related: [
      {
        id: "sd-l5-physical-time-hlc",
        anchor: "Physical time, clock uncertainty, hybrid logical clocks and TrueTime",
      },
      { id: "sd-l5-crdts", anchor: "CRDTs, strong eventual consistency and anti-entropy" },
      {
        id: "sd-l5-consistency-spectrum",
        anchor: "The consistency spectrum, from linearizable to eventual",
      },
      {
        id: "sd-l5-smr-total-order",
        anchor: "Total-order broadcast, where a partial order is not enough",
      },
      {
        id: "sd-l10-collaborative-editor",
        anchor: "Design a collaborative editor with operational transforms or CRDTs",
      },
      {
        id: "sd-l10-stock-exchange",
        anchor: "Design a stock exchange, where a single agreed order of events is the product",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round where the interviewer asks how you order events without a global clock",
    },
  },

  "sd-l5-delivery-idempotency": {
    related: [
      {
        id: "sd-l6-delivery-semantics",
        anchor:
          "Why Kafka exactly-once semantics stop at Kafka's edge, and how ack timing decides the guarantee",
      },
      {
        id: "sd-l1-idempotency-retries",
        anchor: "Idempotency keys that make an API retry safe",
      },
      {
        id: "de-l9-delivery-semantics",
        anchor: "What each delivery guarantee costs in a streaming data pipeline",
      },
      {
        id: "sd-l5-outbox-messaging",
        anchor: "Outbox, inbox and CDC for transactional messaging",
      },
      {
        id: "sd-l10-chat-messaging",
        anchor: "Design a chat and messaging system, where at-least-once means a duplicate message",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on a pipeline that must not double-charge after a redelivery",
    },
  },

  "sd-l5-smr-total-order": {
    related: [
      {
        id: "sd-l5-raft-paxos",
        anchor: "Consensus with Raft and Paxos, the protocol underneath the log",
      },
      {
        id: "sd-l5-logical-clocks",
        anchor: "Lamport and vector clocks, and the orders they cannot give you",
      },
      {
        id: "sd-l10-stock-exchange",
        anchor: "Design a stock exchange, where one agreed sequence of events is the product",
      },
      {
        id: "sd-l6-partitioning-ordering",
        anchor: "Partitioning, keys and per-key ordering in a log",
      },
      {
        id: "sd-l5-consistency-spectrum",
        anchor: "The consistency spectrum, from linearizable down to eventual",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round where the interviewer asks what a replica does after it falls behind",
    },
  },

  // ---------------------------------------------------------------------------------------------
  // System Design: data storage (SEO-08, SEO-15)
  // ---------------------------------------------------------------------------------------------
  "sd-l2-isolation-levels": {
    related: [
      {
        id: "sd-l2-mvcc-locking",
        anchor: "MVCC, two-phase locking and optimistic concurrency control",
      },
      {
        id: "sd-l2-relational-acid",
        anchor: "The relational model, and what ACID really promises",
      },
      {
        id: "sd-l5-consistency-spectrum",
        anchor: "Consistency models across replicas, once one database is not enough",
      },
      {
        id: "sd-l5-2pc-3pc",
        anchor: "Distributed transactions across two databases with 2PC and 3PC",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round where the interviewer asks which anomaly your isolation level still allows",
    },
  },

  "sd-l2-mvcc-locking": {
    related: [
      {
        id: "sd-l2-isolation-levels",
        anchor: "The isolation levels, and the read anomaly each one permits",
      },
      { id: "sd-l2-relational-acid", anchor: "The relational model and the ACID guarantees" },
      {
        id: "sd-l2-physical-storage-wal",
        anchor: "Pages, the buffer pool and the write-ahead log",
      },
      { id: "sd-l2-btree-vs-lsm", anchor: "B-tree versus LSM-tree storage engines" },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round on a write-heavy table and defend your concurrency-control choice",
    },
  },

  "sd-l2-relational-acid": {
    related: [
      {
        id: "sd-l2-isolation-levels",
        anchor: "Isolation levels and read anomalies, the I in ACID up close",
      },
      { id: "sd-l2-mvcc-locking", anchor: "How MVCC and locking actually deliver isolation" },
      {
        id: "sd-l2-choosing-db-polyglot",
        anchor: "Choosing a database, and when polyglot persistence pays",
      },
      {
        id: "sd-l5-2pc-3pc",
        anchor: "What atomicity costs once the transaction spans two databases",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round where you justify a relational store over a key-value one",
    },
  },

  "sd-l2-time-series": {
    related: [
      {
        id: "sd-l11-time-series-storage",
        anchor:
          "Delta-of-delta and XOR compression, and the tag cardinality that breaks a metrics store first",
      },
      {
        id: "sd-l10-metrics-monitoring",
        anchor: "Design a metrics and monitoring system like Prometheus",
      },
      { id: "sd-l2-wide-column", anchor: "Wide-column stores, the other write-heavy shape" },
      {
        id: "sd-l2-choosing-db-polyglot",
        anchor: "Choosing a database and mixing storage engines on purpose",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on a metrics ingest path and size its retention out loud",
    },
  },

  "sd-l11-time-series-storage": {
    related: [
      {
        id: "sd-l2-time-series",
        anchor:
          "How a time-series database earns 10x compression, and why one unbounded label can OOM Prometheus",
      },
      {
        id: "sd-l10-metrics-monitoring",
        anchor: "Design a metrics and monitoring system end to end",
      },
      {
        id: "sd-l10-ad-click-aggregator",
        anchor: "Design an ad click aggregator for real-time analytics",
      },
      {
        id: "sd-l11-iot-edge-ingestion",
        anchor: "IoT and edge ingestion, the other high-cardinality firehose",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round on a high-cardinality metrics store and defend the rollup plan",
    },
  },

  // ---------------------------------------------------------------------------------------------
  // System Design: foundations and the L1/L4 twins (SEO-14)
  // ---------------------------------------------------------------------------------------------
  "sd-l1-load-balancing": {
    related: [
      {
        id: "sd-l4-lb-l4-l7",
        anchor:
          "Why production stacks a content-blind edge tier in front of a fleet that routes on path and terminates TLS",
      },
      {
        id: "sd-l4-lb-algorithms",
        anchor:
          "Why least connections beats round robin when request durations vary, and where power of two choices wins",
      },
      {
        id: "sd-l4-health-checks",
        anchor:
          "Why conflating liveness with readiness crash-loops a warming node, and what slow-start does about it",
      },
      {
        id: "sd-l1-reverse-proxy-gateway",
        anchor:
          "Reverse proxy and the edge tier, and what it handles before your service sees a request",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round where you place the load balancer and say why it sits at that layer",
    },
  },

  "sd-l4-lb-l4-l7": {
    related: [
      {
        id: "sd-l1-load-balancing",
        anchor: "L4 vs L7 load balancing, with health checks and connection draining",
      },
      {
        id: "sd-l4-lb-algorithms",
        anchor:
          "Least connections, power of two choices, and when consistent hashing is the right pick",
      },
      {
        id: "sd-l4-tls-connection-mgmt",
        anchor:
          "Why a long-lived gRPC or WebSocket connection pins to one backend and starves your new pods",
      },
      {
        id: "sd-l4-global-gslb",
        anchor:
          "Anycast plus BGP withdrawal for seconds-scale failover, and why GeoDNS is TTL-bound",
      },
      {
        id: "sd-l1-tls-https",
        anchor:
          "The TLS 1.3 handshake itself, and what session resumption saves on every reconnect",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round that turns on where you terminate TLS and what the edge tier may read",
    },
  },

  "sd-l4-lb-algorithms": {
    related: [
      {
        id: "sd-l4-lb-l4-l7",
        anchor: "Stacking a content-blind edge tier in front of the fleet that terminates TLS",
      },
      {
        id: "sd-l3-consistent-hashing",
        anchor: "Consistent hashing, virtual nodes and rebalancing",
      },
      {
        id: "sd-l4-service-discovery",
        anchor: "How callers find healthy instances when IPs change every minute",
      },
      {
        id: "sd-l1-load-balancing",
        anchor: "L4 vs L7 load balancing, with health checks and connection draining",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on sticky sessions and what breaks when a node leaves",
    },
  },

  "sd-l1-backpressure-shedding": {
    related: [
      {
        id: "sd-l4-load-shedding-backpressure",
        anchor:
          "Why an unbounded queue turns 150 percent traffic into zero throughput, and what adaptive concurrency limits do instead",
      },
      {
        id: "sd-l1-resilience-primitives",
        anchor: "Cascading failure, and the resilience primitives that stop it spreading",
      },
      {
        id: "sd-l6-retries-dlq-backpressure",
        anchor: "Retries, dead-letter queues and backpressure on a message consumer",
      },
      {
        id: "sd-l1-latency-percentiles",
        anchor: "Little's law, percentiles and the queue that explains your p99",
      },
      {
        id: "sd-l4-autoscaling",
        anchor:
          "Scaling on queue depth rather than lagging CPU, and why the new instance always arrives late",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round where traffic exceeds capacity and you have to choose what to drop",
    },
  },

  "sd-l1-resilience-primitives": {
    related: [
      {
        id: "sd-l7-circuit-breakers",
        anchor: "Circuit breakers, bulkheads and fallbacks in depth",
      },
      {
        id: "sd-l7-timeouts-retries",
        anchor: "Timeouts, retries, exponential backoff and jitter",
      },
      {
        id: "sd-l1-backpressure-shedding",
        anchor: "Backpressure, flow control and load shedding at the front door",
      },
      {
        id: "sd-l7-blast-radius-cells",
        anchor: "Static stability, and staying up when the control plane is the thing that failed",
      },
      {
        id: "sd-l4-cell-shuffle-sharding",
        anchor: "Why shuffle sharding makes two tenants sharing total fate a 1-in-28 event",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on a dependency that fails slowly rather than cleanly",
    },
  },

  "sd-l1-concurrency-models": {
    related: [
      {
        id: "py-l4-concurrency",
        anchor: "Threads, the GIL and concurrent.futures, the same trade-off in Python",
      },
      { id: "py-l4-asyncio", anchor: "async and await: the event loop, written out in Python" },
      {
        id: "sd-l1-latency-percentiles",
        anchor: "Little's law, throughput and tail latency for a bounded worker pool",
      },
      {
        id: "sd-l4-load-shedding-backpressure",
        anchor: "Adaptive concurrency limits and brownout, once the pool is already saturated",
      },
      {
        id: "sd-l4-autoscaling",
        anchor:
          "Scaling on queue depth rather than lagging CPU, and hiding the boot lag with warm pools",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round where you size a thread pool and justify the number",
    },
  },

  "sd-l1-tls-https": {
    related: [
      {
        id: "sd-l4-tls-connection-mgmt",
        anchor:
          "Why a long-lived gRPC or WebSocket connection pins to one backend and starves your new pods",
      },
      {
        id: "sd-l8-encryption-transit-mtls",
        anchor: "mTLS and encryption in transit between internal services",
      },
      { id: "sd-l1-http-versions", anchor: "HTTP/1.1, HTTP/2 and HTTP/3 over QUIC" },
      {
        id: "sd-l1-network-stack",
        anchor: "The network stack underneath, from TCP up to the request",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round that starts at the TLS handshake and ends at the origin",
    },
  },

  "sd-l3-search-inverted-index": {
    related: [
      {
        id: "sd-l10-typeahead",
        anchor: "Design typeahead and autocomplete on top of the index",
      },
      {
        id: "sd-l3-vector-hybrid-search",
        anchor: "Vector and hybrid search, the semantic half of the same retrieval tier",
      },
      {
        id: "sd-l10-web-crawler",
        anchor: "Design a web crawler, where the documents come from",
      },
      {
        id: "sd-l2-document",
        anchor: "Document databases, and what they index by default",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on a search tier and defend how you rank the results",
    },
  },

  "sd-l3-vector-hybrid-search": {
    related: [
      {
        id: "sd-l3-search-inverted-index",
        anchor: "Full-text search and the inverted index behind it",
      },
      {
        id: "sd-l11-vector-db-ann",
        anchor: "Vector databases and approximate nearest neighbour search",
      },
      {
        id: "sd-l2-vector-embeddings",
        anchor: "Vector databases and embeddings, from the storage side",
      },
      {
        id: "sd-l11-rag-architecture",
        anchor: "RAG architecture, the system this retrieval tier serves",
      },
      {
        id: "sd-l10-typeahead",
        anchor: "Design typeahead and autocomplete",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on hybrid retrieval and justify the reranking step",
    },
  },

  "sd-l1-realtime-comms": {
    related: [
      {
        id: "sd-l10-chat-messaging",
        anchor: "Design a chat and messaging system on top of persistent connections",
      },
      {
        id: "sd-l10-notification-system",
        anchor: "Design a push notification system",
      },
      {
        id: "sd-l4-tls-connection-mgmt",
        anchor: "Why a long-lived WebSocket pins to one backend and starves your new pods",
      },
      {
        id: "py-l4-asyncio",
        anchor: "async and await, the event loop that holds those connections open",
      },
      {
        id: "sd-l1-http-versions",
        anchor: "HTTP/1.1, HTTP/2 and HTTP/3 over QUIC",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round where you choose between WebSocket, SSE and polling and say why",
    },
  },

  // ---------------------------------------------------------------------------------------------
  // System Design: scaling compute (the level Search Console shows at 1 of 14 surfaced)
  // ---------------------------------------------------------------------------------------------
  "sd-l4-rate-limit-algorithms": {
    related: [
      {
        id: "sd-l4-distributed-rate-limiting",
        anchor:
          "Why per-node limits grant N times the cap, and the fail-open plan for when Redis is down",
      },
      {
        id: "sd-l10-rate-limiter",
        anchor: "Design a distributed rate limiter as a full interview round",
      },
      { id: "sd-l8-ddos-rate-abuse", anchor: "Quotas, abuse control and DDoS defense" },
      {
        id: "sd-l1-backpressure-shedding",
        anchor: "Load shedding, for when the limiter is not the right answer",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on an API that has to survive one abusive tenant",
    },
  },

  "sd-l4-distributed-rate-limiting": {
    related: [
      {
        id: "sd-l4-rate-limit-algorithms",
        anchor: "Why a fixed window lets a client send double its limit in two seconds",
      },
      {
        id: "sd-l10-rate-limiter",
        anchor: "Design a distributed rate limiter end to end",
      },
      {
        id: "sd-l3-distributed-cache-arch",
        anchor: "Distributed cache architecture, where the shared counters live",
      },
      {
        id: "sd-l10-distributed-lock",
        anchor: "Design a distributed lock, the strict-coordination version of the same problem",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round where the rate limiter itself becomes the bottleneck",
    },
  },

  "sd-l4-cell-shuffle-sharding": {
    related: [
      {
        id: "sd-l7-blast-radius-cells",
        anchor: "Static stability, and staying up when the control plane is the thing that failed",
      },
      {
        id: "sd-l3-shard-key-hotspots",
        anchor: "Shard-key selection, hotspots and the celebrity problem",
      },
      { id: "sd-l7-multi-region", anchor: "Multi-AZ and multi-region architecture" },
      {
        id: "sd-l4-capacity-planning",
        anchor:
          "Turning RPS and latency into a defensible instance count, with an explicit N+1 factor",
      },
      {
        id: "sd-l3-partitioning-strategies",
        anchor: "Range, hash and directory partitioning, the layer underneath a cell",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round where one noisy tenant must not take the whole fleet down",
    },
  },

  "sd-l4-autoscaling": {
    related: [
      {
        id: "sd-l4-capacity-planning",
        anchor:
          "Turning RPS and latency into a defensible instance count, with an explicit N+1 factor",
      },
      { id: "sd-l9-k8s-autoscaling", anchor: "HPA, VPA and cluster autoscaling inside Kubernetes" },
      {
        id: "sd-l4-horizontal-stateless",
        anchor: "Externalizing sessions and files so any node can serve any request",
      },
      {
        id: "sd-l1-latency-percentiles",
        anchor: "Little's law, the arithmetic behind any scaling target",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round on a traffic spike that arrives faster than a new instance boots",
    },
  },

  "sd-l3-partitioning-strategies": {
    related: [
      {
        id: "sd-l3-consistent-hashing",
        anchor: "Consistent hashing, virtual nodes and rebalancing",
      },
      {
        id: "sd-l3-shard-key-hotspots",
        anchor: "Shard-key selection, hotspots and the celebrity problem",
      },
      {
        id: "sql-l6-what-is-a-partition",
        anchor: "What a partition is on a data lake, and why pruning makes a big table cheap",
      },
      {
        id: "sql-l6-choosing-partition-key",
        anchor: "Choosing a partition key, and the small-files problem it creates",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round where you pick a shard key and defend it against a hotspot",
    },
  },

  // ---------------------------------------------------------------------------------------------
  // System Design: reliability and operations (SEO-09, SEO-11, SEO-12, SEO-13, SEO-23)
  // ---------------------------------------------------------------------------------------------
  "sd-l7-sli-slo-sla": {
    related: [
      {
        id: "sd-l7-error-budgets",
        anchor: "Error budgets, and the policy that gives an SLO teeth",
      },
      {
        id: "sd-l7-availability-nines",
        anchor: "Availability math: what three nines and four nines cost per month",
      },
      { id: "sd-l7-golden-signals", anchor: "The four golden signals, RED and USE" },
      {
        id: "sd-l7-burn-rate-alerting",
        anchor: "Multi-window, multi-burn-rate alerting on an error budget",
      },
      {
        id: "de-l9-freshness-slas",
        anchor: "Freshness SLAs for a data pipeline, measured over run metadata",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round where you name the SLI before you promise the number",
    },
  },

  "sd-l7-availability-nines": {
    related: [
      {
        id: "sd-l7-sli-slo-sla",
        anchor: "SLI, SLO and SLA: which number you measure and which you promise",
      },
      { id: "sd-l7-redundancy-failover", anchor: "Redundancy, failover and health checking" },
      {
        id: "sd-l7-dr-rto-rpo",
        anchor: "Disaster recovery targets: RTO, RPO and the four strategies",
      },
      {
        id: "sd-l7-multi-region",
        anchor: "Multi-AZ versus multi-region, and when the second region pays for itself",
      },
      {
        id: "sd-l7-golden-signals",
        anchor: "The four golden signals, RED and USE",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round where you turn an availability target into concrete redundancy",
    },
  },

  "sd-l7-golden-signals": {
    related: [
      { id: "sd-l7-sli-slo-sla", anchor: "Turning a golden signal into an SLI and then an SLO" },
      { id: "sd-l7-three-pillars-otel", anchor: "Metrics, logs and traces with OpenTelemetry" },
      {
        id: "sd-l7-burn-rate-alerting",
        anchor: "Burn-rate alerting, the alternative to a static threshold",
      },
      {
        id: "de-l10-observability-pillars",
        anchor: "The five pillars of data observability, written as SQL monitors",
      },
      {
        id: "sd-l10-metrics-monitoring",
        anchor: "Design a metrics and monitoring system like Prometheus",
      },
      {
        id: "sd-l7-deployment-strategies",
        anchor: "Blue-green, canary and rolling deploys, and the signal that aborts a canary",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round where the interviewer asks what you would put on the dashboard",
    },
  },

  "sd-l7-multi-region": {
    related: [
      { id: "sd-l7-dr-rto-rpo", anchor: "Disaster recovery: RTO, RPO and the four strategies" },
      {
        id: "sd-l7-blast-radius-cells",
        anchor:
          "Static stability inside one region, so a failover you never exercise is not the only plan",
      },
      {
        id: "sd-l11-globally-consistent-multiregion",
        anchor: "Globally consistent multi-region data, and what strong consistency costs",
      },
      {
        id: "sd-l3-replication-topologies",
        anchor: "Replication topologies: single-leader, multi-leader and leaderless",
      },
      {
        id: "sd-l4-global-gslb",
        anchor:
          "Anycast plus BGP withdrawal for seconds-scale failover, and the headroom active-active needs",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on a regional failover and state your RPO out loud",
    },
  },

  "sd-l7-timeouts-retries": {
    related: [
      { id: "sd-l7-circuit-breakers", anchor: "Circuit breakers, bulkheads and fallbacks" },
      {
        id: "sd-l1-idempotency-retries",
        anchor: "Idempotency keys, the thing that makes a retry safe to send",
      },
      {
        id: "sd-l6-retries-dlq-backpressure",
        anchor: "Retries and dead-letter queues on an async consumer",
      },
      {
        id: "sd-l1-resilience-primitives",
        anchor: "Cascading failure and the resilience primitives that contain it",
      },
      {
        id: "sd-l7-chaos-engineering",
        anchor: "Chaos engineering and fault injection, how you prove the retry budget holds",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round where a retry storm is the failure you have to prevent",
    },
  },

  "sd-l7-circuit-breakers": {
    related: [
      { id: "sd-l7-timeouts-retries", anchor: "Timeouts, retries, backoff and jitter" },
      {
        id: "sd-l1-resilience-primitives",
        anchor: "Cascading failure and the full set of resilience primitives",
      },
      {
        id: "sd-l7-load-shedding-degradation",
        anchor: "Load shedding and graceful degradation when the breaker is open",
      },
      {
        id: "sd-l7-chaos-engineering",
        anchor: "Chaos engineering and fault injection, how you find out it works",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on a downstream dependency that goes slow instead of down",
    },
  },

  "sd-l7-chaos-engineering": {
    related: [
      { id: "sd-l7-incident-postmortem", anchor: "Incident management and blameless postmortems" },
      {
        id: "sd-l7-blast-radius-cells",
        anchor: "Static stability, so an injected fault stays inside one slice of users",
      },
      {
        id: "sd-l7-circuit-breakers",
        anchor: "Circuit breakers and bulkheads, the hypotheses a chaos test checks",
      },
      {
        id: "sd-l5-partial-failure",
        anchor: "Partial failure and the fallacies of distributed computing",
      },
      {
        id: "sd-l4-cell-shuffle-sharding",
        anchor: "Why shuffle sharding makes two tenants sharing total fate a 1-in-28 event",
      },
      {
        id: "sd-l7-deployment-strategies",
        anchor:
          "Blue-green, canary and rolling deploys, and the rollback path a game day exercises",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round where the interviewer injects a dependency failure mid-answer",
    },
  },

  "sd-l7-deployment-strategies": {
    related: [
      {
        id: "sd-l7-progressive-delivery-schema",
        anchor: "Feature flags, progressive delivery and backward-compatible schema migrations",
      },
      {
        id: "sd-l4-health-checks",
        anchor: "Health checks and connection draining during a rolling deploy",
      },
      {
        id: "sd-l9-iac-progressive-delivery",
        anchor: "Infrastructure as code and promoting a change between environments",
      },
      {
        id: "sd-l7-error-budgets",
        anchor: "Error budgets, and the release policy they are supposed to drive",
      },
      {
        id: "sd-l7-availability-nines",
        anchor: "Availability math, and how much downtime a rollout is allowed to spend",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round where you ship a schema change without downtime",
    },
  },

  // ---------------------------------------------------------------------------------------------
  // System Design: event-driven, architecture, security, AI systems (SEO-17, SEO-18, SEO-19)
  // ---------------------------------------------------------------------------------------------
  "sd-l6-retries-dlq-backpressure": {
    related: [
      { id: "sd-l7-timeouts-retries", anchor: "Timeouts, retries, backoff and jitter" },
      {
        id: "sd-l6-idempotency-dedup",
        anchor: "Idempotency keys and deduplication for a redelivered message",
      },
      {
        id: "sd-l1-backpressure-shedding",
        anchor: "Backpressure and load shedding at the request tier",
      },
      {
        id: "de-l8-retries-slas-alerting",
        anchor: "Task retries, SLAs and the alert you actually page on in a pipeline",
      },
      { id: "sd-l10-webhook-delivery", anchor: "Design a reliable webhook delivery system" },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round on a consumer that keeps failing on the same poisoned message",
    },
  },

  "sd-l9-monolith-vs-microservices": {
    related: [
      {
        id: "sd-l9-decomposition-ddd",
        anchor: "Service decomposition and bounded contexts, if you do split",
      },
      {
        id: "sd-l9-inter-service-comm",
        anchor: "Inter-service communication and the failure modes it adds",
      },
      { id: "sd-l1-api-paradigms", anchor: "REST, gRPC and GraphQL between services" },
      { id: "sd-l9-containers-k8s", anchor: "Containers and Kubernetes fundamentals" },
      {
        id: "sd-l4-api-gateway-bff",
        anchor:
          "What belongs in a backend-for-frontend, and how to stop the edge rotting into a god object",
      },
      {
        id: "sd-l5-sagas",
        anchor: "Sagas and compensating transactions, once one write spans two services",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round where you argue for a modular monolith and hold the line",
    },
  },

  "sd-l8-oauth-oidc": {
    related: [
      { id: "sd-l8-sessions-tokens", anchor: "Sessions, tokens and the refresh-token lifecycle" },
      { id: "sd-l8-passkeys-webauthn", anchor: "Passkeys and WebAuthn, the passwordless path" },
      {
        id: "sd-l8-authz-rbac-rebac",
        anchor: "Authorization models: RBAC, ABAC and ReBAC after the login succeeds",
      },
      {
        id: "sd-l8-auth-credentials",
        anchor: "Authentication fundamentals and credential handling",
      },
      {
        id: "sd-l1-tls-https",
        anchor: "The TLS 1.3 handshake, and why the token never travels in the clear",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round on third-party sign-in and where the token is allowed to live",
    },
  },

  "sd-l11-llm-inference-serving": {
    related: [
      {
        id: "sd-l11-model-gateway",
        anchor: "The model gateway and LLM router that sits in front of many providers",
      },
      { id: "sd-l11-online-serving-rollout", anchor: "Online model serving and rollout" },
      { id: "sd-l11-rag-architecture", anchor: "RAG architecture, end to end" },
      { id: "sd-l11-llm-eval-guardrails", anchor: "LLM evaluation and guardrails before rollout" },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round where GPU cost per token is the constraint you design against",
    },
  },

  "sd-l11-model-gateway": {
    related: [
      { id: "sd-l11-llm-inference-serving", anchor: "LLM inference serving and GPU economics" },
      {
        id: "sd-l4-rate-limit-algorithms",
        anchor: "Why a fixed window lets one tenant burst to double its token quota",
      },
      { id: "sd-l11-llm-agents", anchor: "LLM agents and orchestration above the gateway" },
      {
        id: "sd-l7-circuit-breakers",
        anchor: "Circuit breakers and fallbacks when one model provider degrades",
      },
      {
        id: "sd-l11-rag-architecture",
        anchor: "RAG architecture, the retrieval tier a gateway fronts",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round on routing traffic across model providers under a cost ceiling",
    },
  },

  "sd-l8-auth-credentials": {
    related: [
      {
        id: "sd-l8-oauth-oidc",
        anchor: "OAuth 2.1 and OpenID Connect, delegating the login entirely",
      },
      {
        id: "sd-l8-sessions-tokens",
        anchor: "Sessions, tokens and the refresh-token lifecycle",
      },
      {
        id: "sd-l8-passkeys-webauthn",
        anchor: "Passkeys and WebAuthn, removing the password altogether",
      },
      {
        id: "sd-l8-authz-rbac-rebac",
        anchor: "RBAC, ABAC and ReBAC, the question that starts once identity is settled",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on a sign-in flow and say where the credential is stored",
    },
  },

  "sd-l8-sessions-tokens": {
    related: [
      {
        id: "sd-l8-oauth-oidc",
        anchor: "OAuth 2.1 and OpenID Connect, where the token is issued",
      },
      {
        id: "sd-l8-auth-credentials",
        anchor: "Authentication fundamentals and credential handling",
      },
      {
        id: "sd-l8-authz-rbac-rebac",
        anchor: "RBAC, ABAC and ReBAC, deciding what the bearer may actually do",
      },
      {
        id: "sd-l3-caching-patterns",
        anchor: "Caching patterns, and where a session store belongs",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on token revocation and defend your expiry choice",
    },
  },

  "sd-l11-rag-architecture": {
    related: [
      {
        id: "sd-l11-vector-db-ann",
        anchor: "Vector databases and approximate nearest neighbour search",
      },
      {
        id: "sd-l11-llm-inference-serving",
        anchor: "LLM inference serving and GPU economics",
      },
      {
        id: "sd-l11-model-gateway",
        anchor: "The model gateway and LLM router in front of many providers",
      },
      {
        id: "sd-l11-finetune-rag-prompting",
        anchor: "Fine-tuning versus retrieval versus prompting",
      },
      {
        id: "sd-l3-search-inverted-index",
        anchor: "Full-text search and the inverted index, the lexical half of hybrid retrieval",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round on a retrieval pipeline and explain how you keep the index fresh",
    },
  },

  // ---------------------------------------------------------------------------------------------
  // System Design: case studies (SEO-16, SEO-22, and the top-pages export)
  // ---------------------------------------------------------------------------------------------
  "sd-l10-stock-exchange": {
    related: [
      {
        id: "sd-l5-smr-total-order",
        anchor:
          "State-machine replication and total-order broadcast, the sequencer behind a matching engine",
      },
      {
        id: "sd-l6-partitioning-ordering",
        anchor: "Partitioning, keys and per-symbol ordering in a log",
      },
      { id: "sd-l10-payment-ledger", anchor: "Design a payment system and double-entry ledger" },
      { id: "sd-l0-latency-numbers", anchor: "Latency numbers every engineer should know" },
      {
        id: "sd-l10-leaderboard-topk",
        anchor: "Design a leaderboard and top-K counter, the other ranked-in-memory problem",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label:
        "Practice a design round on an order-matching engine and get scored on the ordering guarantees you claim",
    },
  },

  "sd-l10-typeahead": {
    related: [
      {
        id: "sd-l3-search-inverted-index",
        anchor: "Full-text search and the inverted index behind it",
      },
      { id: "sd-l3-vector-hybrid-search", anchor: "Vector, semantic and hybrid search" },
      {
        id: "sd-l10-leaderboard-topk",
        anchor: "Top-K counting, for ranking the suggestions you return",
      },
      {
        id: "sd-l3-cache-stampede-hotkey",
        anchor: "Cache stampede, thundering herd and hot keys on a popular prefix",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on autocomplete under a 100 millisecond budget",
    },
  },

  "sd-l10-chat-messaging": {
    related: [
      {
        id: "sd-l1-realtime-comms",
        anchor: "WebSocket, SSE and long polling for a persistent connection",
      },
      { id: "sd-l10-notification-system", anchor: "Design a push notification system" },
      {
        id: "sd-l6-queue-pubsub-log",
        anchor: "Queue versus pub/sub versus log, for the fan-out",
      },
      { id: "sd-l2-wide-column", anchor: "Wide-column stores for a message history table" },
      {
        id: "sd-l5-delivery-idempotency",
        anchor: "Why at-least-once plus an idempotency key is the real answer for message delivery",
      },
    ],
    // No CTA: this lesson already carries a timed-drill card from LESSON_DRILLS.
  },

  "sd-l10-rate-limiter": {
    related: [
      {
        id: "sd-l4-rate-limit-algorithms",
        anchor: "Why a fixed window lets a client send double its limit in two seconds",
      },
      {
        id: "sd-l4-distributed-rate-limiting",
        anchor: "Why naive per-node counters grant N times the cap, and what fail-open costs you",
      },
      { id: "sd-l8-ddos-rate-abuse", anchor: "Quotas, abuse control and DDoS defense" },
      {
        id: "sd-l3-distributed-cache-arch",
        anchor: "Distributed cache architecture, where the counters live",
      },
    ],
    // No CTA: this lesson already carries a timed-drill card from LESSON_DRILLS.
  },

  "sd-l10-metrics-monitoring": {
    related: [
      {
        id: "sd-l2-time-series",
        anchor:
          "How a time-series database earns 10x compression, and why one unbounded label can OOM Prometheus",
      },
      {
        id: "sd-l11-time-series-storage",
        anchor:
          "Delta-of-delta and XOR compression, and the tag cardinality that breaks a metrics store first",
      },
      {
        id: "sd-l7-golden-signals",
        anchor: "The four golden signals, RED and USE",
      },
      {
        id: "sd-l10-ad-click-aggregator",
        anchor: "Design an ad click aggregator for real-time analytics",
      },
      {
        id: "de-l10-observability-pillars",
        anchor: "The five pillars of data observability, written as SQL monitors",
      },
    ],
    cta: {
      href: "/system-design-interview-practice",
      label: "Practice a design round on a metrics pipeline and size its write path out loud",
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Data Engineering (SEO-10 and the top-pages export)
  // ---------------------------------------------------------------------------------------------
  "sql-l1-dates": {
    related: [
      {
        id: "sql-l1-cast-types",
        anchor: "CAST and SQLite type affinity, why a date column is really TEXT",
      },
      { id: "sql-l1-strings", anchor: "String functions for cleaning a messy source column" },
      {
        id: "py-l2-datetimes",
        anchor: "Dates, times and the naive-versus-aware trap in Python",
      },
      {
        id: "sql-l4-window-offset",
        anchor: "LAG and LEAD, once you need period-over-period on those dates",
      },
      {
        id: "de-l9-watermarks-late-events",
        anchor: "Event time, watermarks and late events in a streaming pipeline",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label:
        "Practice a data engineering interview round and write the date filter under the clock",
    },
  },

  "sql-l1-cast-types": {
    related: [
      { id: "sql-l1-dates", anchor: "Dates and times in SQLite, stored as ISO-8601 text" },
      { id: "sql-l1-null-logic", anchor: "NULLs and three-valued logic in a WHERE clause" },
      { id: "sql-l3-ddl-create", anchor: "CREATE TABLE, and choosing the column type up front" },
      { id: "sql-l1-strings", anchor: "String functions for cleaning source data" },
      {
        id: "sql-l1-order-by",
        anchor: "Sorting with ORDER BY, and what a text-affinity column does to a numeric sort",
      },
      {
        id: "py-l2-datetimes",
        anchor: "Dates, times and the naive-versus-aware trap in Python",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a data engineering round where a silent type coercion is the bug",
    },
  },

  "sql-l1-order-by": {
    related: [
      { id: "sql-l1-limit-distinct", anchor: "LIMIT and DISTINCT, and the top-N query" },
      {
        id: "sql-l4-window-ranking",
        anchor: "ROW_NUMBER, RANK and DENSE_RANK for top-N inside each group",
      },
      { id: "sql-l1-null-logic", anchor: "NULLs, three-valued logic and where they sort" },
      { id: "sql-l3-indexes", anchor: "Indexes, and how the right one removes the sort entirely" },
      {
        id: "sql-l1-cast-types",
        anchor: "CAST and SQLite type affinity, the reason a numeric column sorts like text",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a SQL interview round on a top-N-per-group question",
    },
  },

  "sql-l2-inner-join": {
    related: [
      { id: "sql-l2-left-join", anchor: "LEFT JOIN, and preserving the rows with no match" },
      { id: "sql-l2-anti-join", anchor: "Anti-joins, for finding the rows that match nothing" },
      {
        id: "sql-l5-join-fan-out-and-skew",
        anchor: "Join fan-out: the duplicate rows a many-to-many join quietly creates",
      },
      {
        id: "sql-l3-foreign-keys",
        anchor: "Foreign keys and referential integrity, what a join key should be",
      },
      {
        id: "sd-l2-normalization-denorm",
        anchor: "Normalization versus denormalization, the modeling choice that creates the join",
      },
      {
        id: "sql-l6-skew-and-joins",
        anchor:
          "Data skew, stragglers and broadcast versus shuffle joins, when the same join runs on a cluster",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a SQL interview round where the join key is not unique",
    },
  },

  "sql-l2-left-join": {
    related: [
      { id: "sql-l2-inner-join", anchor: "INNER JOIN and choosing a join key" },
      { id: "sql-l2-anti-join", anchor: "Anti-joins for the rows with no match at all" },
      {
        id: "sql-l1-null-logic",
        anchor:
          "NULLs and three-valued logic, why a WHERE clause turns a LEFT JOIN back into an inner one",
      },
      { id: "sql-l5-join-fan-out-and-skew", anchor: "Join fan-out, duplicate rows and skew" },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a SQL interview round on a report that must keep the zero-activity rows",
    },
  },

  "de-l11-exact-dedup": {
    related: [
      {
        id: "sql-l4-dedup",
        anchor: "Deduplication in SQL with ROW_NUMBER over a partition key",
      },
      { id: "de-l9-dedup-at-read", anchor: "Where dedup lives: write-side versus read-side" },
      { id: "de-l11-pii-scrubbing", anchor: "PII scrubbing funnels before training" },
      {
        id: "sd-l6-idempotency-dedup",
        anchor: "Idempotency and deduplication for a redelivered message",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label:
        "Practice a data engineering round on a corpus with duplicate documents and a size budget",
    },
  },

  "sql-l4-dedup": {
    related: [
      {
        id: "de-l11-exact-dedup",
        anchor: "Deduplicating a training corpus with content hashes",
      },
      { id: "de-l9-dedup-at-read", anchor: "Write-side versus read-side dedup in a stream" },
      {
        id: "sql-l4-window-ranking",
        anchor: "ROW_NUMBER over a partition, the workhorse behind the dedup",
      },
      { id: "sql-l4-idempotent-merge", anchor: "Idempotent loads with upsert and MERGE" },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a data engineering round where the source table has redelivered rows",
    },
  },

  "sql-l4-idempotent-merge": {
    related: [
      {
        id: "de-l7-upsert-merge-semantics",
        anchor: "MERGE semantics: upserts that survive a rerun",
      },
      {
        id: "de-l8-partition-replacement",
        anchor: "Delete plus insert, replacing a run's partition instead of merging",
      },
      { id: "sql-l4-dedup", anchor: "Deduplication before the load, not after it" },
      {
        id: "sd-l1-idempotency-retries",
        anchor: "Idempotency keys and safe retries, the same idea at an API boundary",
      },
      {
        id: "sql-l4-star-build",
        anchor: "Building a star schema load, the job this merge is a step of",
      },
      {
        id: "sql-l5-cdc-changelog-apply",
        anchor: "Applying a CDC changelog, where the upsert also has to handle deletes",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a data engineering round on a load that has to be safe to run twice",
    },
  },

  "de-l9-delivery-semantics": {
    related: [
      {
        id: "sd-l6-delivery-semantics",
        anchor:
          "Why Kafka exactly-once semantics stop at Kafka's edge, and how ack timing decides the guarantee",
      },
      {
        id: "sd-l5-delivery-idempotency",
        anchor:
          "Why at-least-once plus an idempotency key is the real answer, and where fencing tokens fit",
      },
      { id: "de-l9-dedup-at-read", anchor: "Where dedup lives: write-side versus read-side" },
      {
        id: "de-l9-ordering-guarantees",
        anchor: "Kafka ordering guarantees and the checkpointed apply",
      },
      {
        id: "de-l11-exact-dedup",
        anchor:
          "Deduplicating a corpus with content hashes, the batch version of the same guarantee",
      },
      {
        id: "de-l9-log-topic-partition-offset",
        anchor: "Topics, partitions and offsets, and the offset commit that decides the guarantee",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label:
        "Practice a data engineering round where you price at-least-once against exactly-once out loud",
    },
  },

  "de-l9-log-topic-partition-offset": {
    related: [
      {
        id: "sd-l6-kafka-internals",
        anchor: "Kafka architecture internals: brokers, the ISR and the commit log",
      },
      {
        id: "sd-l6-partitioning-ordering",
        anchor: "Partitioning, keys and the ordering guarantee you actually get",
      },
      { id: "de-l9-consumer-groups-lag", anchor: "Consumer groups and measuring lag" },
      {
        id: "sd-l10-message-queue",
        anchor: "Design a message queue and streaming log from scratch",
      },
      {
        id: "de-l9-delivery-semantics",
        anchor: "What each delivery guarantee costs, once you can choose when to commit the offset",
      },
      {
        id: "sql-l5-cdc-changelog-apply",
        anchor: "Applying a CDC changelog with MERGE, including the deletes",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a data engineering round on a consumer that has fallen hours behind",
    },
  },

  "sql-l6-what-is-a-partition": {
    related: [
      {
        id: "sql-l6-choosing-partition-key",
        anchor: "Choosing a partition key, and the small-files problem it creates",
      },
      {
        id: "sql-l6-row-groups-pushdown",
        anchor: "Row groups, predicate pushdown and Parquet versus ORC versus Avro",
      },
      {
        id: "sd-l3-partitioning-strategies",
        anchor: "Range, hash and directory partitioning of an operational database",
      },
      {
        id: "de-l10-parquet-partition-lever",
        anchor: "Quantifying the Parquet and partitioning lever on a real bill",
      },
      {
        id: "sql-l6-skew-and-joins",
        anchor: "Data skew, stragglers, and broadcast versus shuffle joins",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a data engineering round where the answer is scanning less, not scaling up",
    },
  },

  "sql-l6-skew-and-joins": {
    related: [
      {
        id: "de-l10-diagnosing-skew",
        anchor: "Skew diagnosis: max versus median, not max versus mean",
      },
      {
        id: "de-l10-narrow-wide-and-broadcast",
        anchor: "Narrow, wide and the broadcast join decision at 10 MB and 100 MB",
      },
      {
        id: "sql-l5-join-fan-out-and-skew",
        anchor: "Join fan-out and duplicate rows in plain SQL",
      },
      {
        id: "sd-l3-shard-key-hotspots",
        anchor: "Shard keys, hotspots and the celebrity problem, the same skew online",
      },
      {
        id: "sql-l6-what-is-a-partition",
        anchor: "What a partition is on a data lake, and why pruning makes a big table cheap",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a data engineering round on a job where one task runs ten times longer",
    },
  },

  "sql-l5-cdc-changelog-apply": {
    related: [
      {
        id: "sd-l3-cdc-dual-write",
        anchor: "Change data capture and the outbox, keeping a derived store in sync",
      },
      { id: "de-l9-changelog-anatomy", anchor: "The anatomy of a change event" },
      { id: "de-l7-upsert-merge-semantics", anchor: "MERGE upserts that survive a rerun" },
      {
        id: "sql-l4-scd-type2",
        anchor: "Type 2 slowly changing dimensions, the history the changelog feeds",
      },
      {
        id: "sql-l4-idempotent-merge",
        anchor: "Idempotent loads with upsert and MERGE, in plain SQL",
      },
      {
        id: "de-l9-log-topic-partition-offset",
        anchor: "Topics, partitions and offsets, where a changelog is published",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a data engineering round on applying a changelog that contains deletes",
    },
  },

  "sql-l3-dimensional-intro": {
    related: [
      { id: "sql-l4-star-build", anchor: "Building a star schema load" },
      { id: "sql-l4-fact-types", anchor: "Fact table types and measure additivity" },
      {
        id: "de-l7-grain-audit",
        anchor: "Grain rehearsal: say the sentence, then prove it in SQL",
      },
      {
        id: "sql-l3-normalize-2nf-3nf",
        anchor: "Second and third normal form, the model a star schema departs from",
      },
      {
        id: "sql-l4-scd-type2",
        anchor: "Type 2 slowly changing dimensions, how a dimension keeps its history",
      },
      {
        id: "sql-l2-inner-join",
        anchor: "INNER JOIN and join keys, how a fact row finds its dimension",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label:
        "Practice a data engineering round where you state the grain before writing a line of SQL",
    },
  },

  "sql-l1-null-logic": {
    related: [
      {
        id: "sql-l1-order-by",
        anchor: "Sorting with ORDER BY, and where NULLs land in the result",
      },
      {
        id: "sql-l2-left-join",
        anchor: "LEFT JOIN, the join that manufactures the NULLs",
      },
      {
        id: "sql-l2-anti-join",
        anchor: "Anti-joins, and the NOT IN trap a single NULL creates",
      },
      {
        id: "sql-l1-cast-types",
        anchor: "CAST and SQLite type affinity, the other silent source of wrong answers",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a SQL interview round where a NULL is the reason the count is wrong",
    },
  },

  "sql-l4-scd-type2": {
    related: [
      {
        id: "sql-l4-scd-type1",
        anchor: "Type 1 dimensions, overwriting instead of versioning",
      },
      {
        id: "sql-l3-dimensional-intro",
        anchor: "Facts, dimensions and grain, the model an SCD2 table sits inside",
      },
      {
        id: "sql-l5-as-of-scd2-join",
        anchor: "Point-in-time as-of joins against an SCD2 dimension",
      },
      {
        id: "de-l7-scd2-rehearsal",
        anchor: "SCD2 under the clock: apply the change batch",
      },
      {
        id: "sql-l4-star-build",
        anchor: "Building a star schema load around it",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label:
        "Practice a data engineering round where the interviewer asks for last night's version of a row",
    },
  },

  "sql-l4-star-build": {
    related: [
      {
        id: "sql-l3-dimensional-intro",
        anchor: "Facts, dimensions and grain, before you build anything",
      },
      {
        id: "sql-l4-fact-types",
        anchor: "Fact table types and measure additivity",
      },
      {
        id: "sql-l4-snowflake",
        anchor: "Star versus snowflake schemas",
      },
      {
        id: "sql-l4-scd-type2",
        anchor: "Type 2 slowly changing dimensions for the dimension load",
      },
      {
        id: "de-l7-kimball-vs-obt",
        anchor: "Kimball versus one big table, and the 10 GB join-side heuristic",
      },
    ],
    cta: {
      href: "/data-engineer-interview-practice",
      label: "Practice a data engineering round where you load a fact table and state its grain",
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Python
  // ---------------------------------------------------------------------------------------------
  "py-l2-datetimes": {
    related: [
      { id: "sql-l1-dates", anchor: "Dates and times in SQLite, stored as ISO-8601 text" },
      {
        id: "py-l2-files-json-csv",
        anchor: "Context managers, JSON and CSV, where those timestamps arrive from",
      },
      { id: "py-l3-pandas-dataframes", anchor: "pandas DataFrames, filtering and groupby" },
      {
        id: "de-l9-watermarks-late-events",
        anchor: "Event time, watermarks and late events in a streaming pipeline",
      },
    ],
    cta: {
      href: "/ai-coding-interview-practice",
      label: "Practice a Python coding round and talk through the timezone bug before it ships",
    },
  },

  "py-l1-complexity-choice": {
    related: [
      { id: "py-l1-dicts", anchor: "Dictionaries, the hash map behind most interview answers" },
      { id: "py-l2-collections", anchor: "Counter, defaultdict and deque from collections" },
      { id: "py-l1-recursion", anchor: "Recursion, and the call stack it costs you" },
      { id: "py-l4-performance", anchor: "Profiling, complexity and caching with functools" },
    ],
    cta: {
      href: "/free-ai-coding-interview",
      label: "Take a free AI coding interview and justify the data structure you reached for",
    },
  },

  "py-l1-recursion": {
    related: [
      {
        id: "py-l1-complexity-choice",
        anchor: "Choosing the right data structure, and what each operation costs",
      },
      {
        id: "py-l1-debugging",
        anchor: "Reading a traceback and stepping with breakpoint(), for when it recurses forever",
      },
      { id: "py-l4-performance", anchor: "Profiling, complexity and memoisation with functools" },
      { id: "py-l2-generators", anchor: "Generators, yield and lazy iteration" },
      {
        id: "py-l2-collections",
        anchor: "Counter, defaultdict and deque, when an explicit stack beats recursion",
      },
    ],
    cta: {
      href: "/free-ai-coding-interview",
      label: "Take a free AI coding interview and talk through a recursive solution out loud",
    },
  },

  "py-l2-collections": {
    related: [
      { id: "py-l1-dicts", anchor: "Dictionaries and hash-map lookups" },
      {
        id: "py-l1-complexity-choice",
        anchor: "Choosing the right data structure for the operation you repeat",
      },
      { id: "py-l2-comprehensions", anchor: "List, dict and set comprehensions" },
      { id: "py-l2-itertools", anchor: "itertools: chain, islice, groupby and product" },
    ],
    cta: {
      href: "/free-ai-coding-interview",
      label:
        "Take a free AI coding interview on a counting problem and explain your choice of container",
    },
  },

  "py-l4-concurrency": {
    related: [
      {
        id: "sd-l1-concurrency-models",
        anchor: "Thread-per-request versus the event loop, and the C10k problem",
      },
      { id: "py-l4-asyncio", anchor: "async, await and the asyncio event loop" },
      { id: "py-l4-performance", anchor: "Profiling, complexity and caching" },
      {
        id: "sd-l1-latency-percentiles",
        anchor: "Little's law, throughput and tail latency for a worker pool",
      },
    ],
    cta: {
      href: "/ai-coding-interview-practice",
      label:
        "Practice a coding round where the interviewer asks whether the work is CPU or IO bound",
    },
  },

  "py-l4-asyncio": {
    related: [
      { id: "py-l4-concurrency", anchor: "Threads, the GIL and concurrent.futures" },
      {
        id: "sd-l1-concurrency-models",
        anchor: "Server concurrency models: thread-per-request versus event loop",
      },
      { id: "py-l2-generators", anchor: "Generators and yield, the machinery underneath await" },
      {
        id: "sd-l1-realtime-comms",
        anchor: "WebSocket, SSE and long polling, the connections an event loop holds open",
      },
    ],
    cta: {
      href: "/ai-coding-interview-practice",
      label: "Practice a coding round on concurrent API calls and defend your cancellation story",
    },
  },

  "py-l1-debugging": {
    related: [
      { id: "py-l5-failing-test", anchor: "Write the test that catches the bug" },
      { id: "py-l5-trace-first", anchor: "Trace it before you run it" },
      { id: "py-l2-exceptions", anchor: "try, except, finally and custom exceptions" },
      { id: "py-l3-logging-errors", anchor: "Error boundaries and logging habits" },
      {
        id: "py-l1-recursion",
        anchor: "Recursion, and the stack trace it prints when it does not terminate",
      },
    ],
    cta: {
      href: "/labs",
      label: "Debug a failing test suite inside a real multi-file codebase in a Case Lab",
    },
  },

  "py-l5-failing-test": {
    related: [
      { id: "py-l5-pin-the-seam", anchor: "Pin the seam with a regression test" },
      { id: "py-l3-pytest-basics", anchor: "pytest assertions and test structure" },
      { id: "py-l5-shrink", anchor: "Shrink the failing input until it is minimal" },
      {
        id: "py-l5-trace-first",
        anchor: "Trace it before you run it",
      },
      {
        id: "py-l1-debugging",
        anchor: "Reading a traceback and stepping with breakpoint()",
      },
    ],
    cta: {
      href: "/labs",
      label: "Reproduce and fix a real bug in a Case Lab, starting from the failing test",
    },
  },

  "py-l5-trace-first": {
    related: [
      { id: "py-l1-debugging", anchor: "Reading a traceback and stepping with breakpoint()" },
      { id: "py-l5-happy-path", anchor: "The happy path is not the test" },
      { id: "py-l5-failure-signatures", anchor: "The failure signatures of generated code" },
      { id: "py-l5-failing-test", anchor: "Write the test that catches the bug" },
    ],
    cta: {
      href: "/labs",
      label: "Read an unfamiliar codebase and find the defect in a Case Lab",
    },
  },
}

/** One resolved link, ready to render. */
export interface ResolvedRelatedLink {
  /** Canonical public reading path, built by `publicLessonPath`. */
  href: string
  anchor: string
  /** "Python" / "Data Engineering" / "System Design", for labelling a link that leaves the track. */
  courseLabel: string
  /** True when the target sits in a different course from the lesson being read. */
  crossTrack: boolean
}

export interface ResolvedRelatedConcepts {
  links: ResolvedRelatedLink[]
  cta: PracticeCta | null
}

/** Lazily built id lookup over the whole corpus. Built once per process, not per lesson page. */
let lessonLocations: Map<string, { courseId: CourseId; levelSlug: string }> | null = null

function lessonLocationIndex(): Map<string, { courseId: CourseId; levelSlug: string }> {
  if (!lessonLocations) {
    lessonLocations = new Map(
      listAllCatalogEntries().map(({ courseId, level, lesson }) => [
        lesson.id,
        { courseId, levelSlug: level.slug },
      ])
    )
  }
  return lessonLocations
}

/**
 * Resolve a lesson's curated edges into renderable links, plus its CTA.
 *
 * Returns empty for a lesson with no entry, which is most of the corpus and is the point: an
 * unseeded lesson renders no block at all rather than an invented one.
 *
 * An id that no longer resolves is dropped rather than rendered as a dead link. The test is what
 * makes that branch unreachable in a shipped build; this is the belt so a curriculum rename cannot
 * publish a 404 on 425 pages before anyone runs the suite.
 */
export function resolveRelatedConcepts(
  lessonId: string,
  courseId: CourseId
): ResolvedRelatedConcepts {
  const entry = RELATED_CONCEPTS[lessonId]
  if (!entry) return { links: [], cta: null }

  const index = lessonLocationIndex()
  const links: ResolvedRelatedLink[] = []

  for (const concept of entry.related) {
    if (concept.id === lessonId) continue
    const location = index.get(concept.id)
    if (!location) continue
    links.push({
      href: publicLessonPath(location.courseId, location.levelSlug, concept.id),
      anchor: concept.anchor,
      courseLabel: LEARN_COURSE_LABEL[location.courseId],
      crossTrack: location.courseId !== courseId,
    })
  }

  return { links, cta: entry.cta ?? null }
}
