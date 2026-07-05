> Module **sd-l10-m5** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l10-m4](./sd-l10-m4.md) · Next: [sd-l11-m1](./sd-l11-m1.md)

# L10 · Commerce, Money & Analytics

By the end of this module you can run the correctness-critical and high-volume "design X" interviews that separate senior candidates from the pack: a payment ledger that never loses money, a flash-sale system that never oversells, a web crawler at web scale, a metrics platform, a real-time ad-click aggregator, a leaderboard, and a microsecond order-matching engine. Each one is a repeatable pattern (idempotency, reservations, frontier queues, TSDB rollups, streaming windows, sorted sets, single-writer event sourcing) that you can name and defend under pressure.

### sd-l10-payment-ledger: Design a Payment System & Ledger

- **id:** `sd-l10-payment-ledger`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** payments, ledger, idempotency

#### Learn

Payments is the interview where "roughly correct" is a failing answer. The whole problem is money that must never be double-charged, never lost, and always auditable, and every design choice flows from that. Volume is modest by web standards (a large processor might do 5K to 50K payments/sec at peak), so this is a correctness problem, not a throughput problem.

Start with idempotency, because retries are guaranteed. Networks time out, clients resubmit, and your own workers retry after crashes. Every mutating request carries a client-generated idempotency key (a UUID the client mints per logical intent). The payment service stores that key with the request result in a dedup table before doing work, keyed uniquely so a second request with the same key returns the first result instead of charging again. This turns at-least-once delivery into effectively-once behavior. Without it, one dropped ACK becomes a double charge.

The ledger is the source of truth, and it must be double-entry and immutable. Instead of storing a mutable `balance` column you update in place, you append immutable journal entries: every movement of money is two entries that sum to zero (debit one account, credit another). A charge of $50 becomes a debit to the customer's funding account and a credit to the merchant's payable account. A balance is then a derived sum of entries, never an overwritten field. This gives you a complete audit trail, makes reconciliation with the bank statement mechanical, and makes bugs detectable (entries that do not sum to zero are corruption you can alarm on).

**Interview nuance:** The fastest way to fail this round is proposing `UPDATE accounts SET balance = balance - 50`. Say explicitly that you use an append-only double-entry ledger and derive balances, because mutable balances make audit and reconciliation impossible and hide bugs.

Now the hard part: a charge spans several systems (your wallet/ledger, an external provider like Stripe or Adyen, and the orders service), and you cannot hold a distributed ACID transaction across an external API. Use a saga (an orchestrated sequence of local transactions with compensating actions). The orchestrator: (1) reserves funds in the ledger as a pending entry, (2) calls the provider with an idempotency key, (3) on success posts the settled ledger entries and marks the order paid, (4) on failure posts a compensating reversal. State lives in a durable workflow so a crash resumes rather than orphans money.

```
client --idem key--> Payment API --> dedup check
   |                                     |
   v                                     v
saga orchestrator --> ledger (pending) --> provider (charge, idem) --> ledger (settle) --> order paid
        \--- on failure ---> compensating reversal entry ---/
```

Providers confirm asynchronously via webhooks, which are themselves at-least-once, so webhook handlers must be idempotent too (dedup on the provider's event id). Reconcile daily by summing ledger entries and comparing to the provider's settlement report; any drift is an incident. Layer PCI scope reduction (never store raw PANs, tokenize via the provider) and fraud hooks (score before capture) on top.

Recap: idempotency keys on every mutating call turn retries safe, an append-only double-entry ledger with derived balances gives auditability and reconciliation, and a saga with compensations plus idempotent webhook handling coordinates the provider, wallet, and orders without a distributed transaction.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a payment service that charges a user and credits a merchant with no double-charges and an auditable ledger.

**Think about:**
- How do idempotency keys make charges safe under retries?
- Why a double-entry immutable ledger?
- How do you coordinate across payment provider, wallet, and orders?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: peak ~10K payments/sec, external provider (Stripe/Adyen) does the card network work, we own the wallet/ledger and orders, correctness beats latency, full audit is required.

Estimation: 10K/sec is small; the constraint is that every cent is accounted for. Ledger entries are ~200 bytes; even 1B payments/year at 2 entries each is ~400 GB/year of journal, trivially storable.

API: `POST /payments {idempotencyKey, userId, merchantId, amount, currency}` returns a payment status. The idempotency key is client-minted per intent and is the uniqueness contract.

Data model: an append-only `ledger_entries(id, account_id, amount_signed, currency, txn_id, created_at)` where every `txn_id` has entries summing to zero (double-entry). Balances are `SUM(amount_signed)` per account, never a mutable column. A `payments(idempotency_key PK, status, provider_ref, ...)` table dedups requests.

Flow: the API first does a conditional insert on the idempotency key; a duplicate returns the stored result with no side effect. A saga orchestrator then posts a pending ledger entry (funds reserved), calls the provider with the same idempotency key so the provider also dedups, and on success posts the settled double-entry pair (debit customer, credit merchant payable) and marks the order paid. On provider failure or timeout, it posts a compensating reversal and fails the payment. Workflow state is durable so a crash resumes.

Async and reconciliation: provider webhooks are idempotent (dedup on event id) and drive final state for delayed settlements. A daily job sums ledger entries and reconciles against the provider settlement file; any mismatch pages on-call.

Tradeoffs: strong consistency on the ledger (single-writer per account or serializable transactions) costs throughput but is required for balance correctness; we accept eventual consistency only on downstream read models (analytics, dashboards). PCI scope is minimized by tokenizing cards at the provider.

Common wrong turn: mutable `balance = balance - amount` updates with no ledger, which makes reconciliation and audit impossible and hides double-spend bugs, plus non-idempotent charge and webhook handlers that double-charge under retry.

**Self-check rubric:**
- [ ] Did I put a client-minted idempotency key on every mutating call and dedup before doing work?
- [ ] Did I use an append-only double-entry ledger with balances derived as sums, not mutable columns?
- [ ] Did I coordinate provider + wallet + orders with a saga and compensating actions, not a distributed ACID transaction?
- [ ] Did I make provider webhook handling idempotent?
- [ ] Did I include daily reconciliation against the provider settlement report?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the ledger and money-movement core for Stripe-style multi-currency payouts, where a marketplace collects from buyers in 135 currencies, holds funds, deducts platform fees, and pays out to sellers on a rolling schedule, with an auditable trail that survives a full external audit.

**Model answer (revealed on demand):**

Assumptions: funds are held between capture and payout, fees split per transaction, FX conversion happens at payout, regulators can demand a full trace of any dollar.

Model every party as a set of accounts in one double-entry ledger: a buyer funding account, a platform fee account, a seller payable account, and per-currency clearing accounts. A single purchase becomes a balanced set of entries: debit buyer funding, credit seller payable (minus fee), credit platform fee account, all in the transaction currency. Because entries are immutable and balanced, any dollar is traceable from capture to payout by following `txn_id` links, which is exactly what an audit needs.

Multi-currency: never mix currencies in one account. Each account is single-currency, and FX is an explicit transaction that debits a source-currency clearing account and credits a target-currency clearing account at a recorded rate, so the conversion itself is an auditable, balanced ledger event rather than a hidden arithmetic step.

Payouts: a scheduled job sums each seller's payable balance, applies holds/reserves for risk, creates a payout transaction (debit seller payable, credit an outbound clearing account), and hands it to the bank rail (ACH/SEPA/wire) with an idempotency key. The payout is pending until the rail confirms; a webhook settles or reverses it, and the ledger reflects each state transition as new entries, never edits.

Correctness at scale: shard the ledger by account to parallelize writes while keeping each account single-writer for balance integrity, and enforce a database constraint or write-time check that every transaction's entries sum to zero per currency. Reconcile daily against each bank partner's statement.

The wrong turn is a single mutable multi-currency balance with fees subtracted inline: it cannot survive an audit, cannot represent in-flight FX, and silently drifts from the banks.

### sd-l10-ecommerce-flash-sale: Design E-Commerce Inventory / Flash Sale (Ticketmaster)

- **id:** `sd-l10-ecommerce-flash-sale`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** flash-sale, inventory, contention

#### Learn

A flash sale is the interview where correctness and concurrency collide. You have a finite inventory (10,000 concert seats), millions of buyers arriving in the same second, and one absolute rule: never oversell. Everything else (fairness, UX, latency) is negotiable, but selling seat 4A twice is a lawsuit.

The core failure is the read-modify-write race. If two requests both read `available = 1`, both decide "yes, buy," and both write `available = 0`, you have sold one item twice. Naive application-level checks always lose under concurrency. You need the decrement to be atomic. Three real options: (1) an atomic conditional update in the database, `UPDATE inventory SET available = available - 1 WHERE item_id = ? AND available > 0`, and check that exactly one row changed; (2) an atomic operation in Redis (DECR with a Lua script that rejects going below zero), serving as a fast front-line counter backed by durable storage; (3) a per-item serialized queue where a single consumer processes purchase requests for a hot item in order, which converts contention into a sequential log.

**Interview nuance:** Interviewers deliberately probe the race. State plainly that you never do "read available, then write" in app code; the check and decrement must be a single atomic operation, and you verify the affected-row count to confirm you actually won the decrement.

Real commerce does not charge instantly, so you need reservation holds. When a buyer adds a seat to their cart, you decrement inventory and create a hold with a TTL (say 10 minutes). The seat is unavailable to others during the hold. If the buyer completes checkout, the hold converts to a sale; if the TTL expires, a background sweeper (or a lazy check on next read) releases the seat back to inventory via an atomic increment. This prevents both oversell and permanent leakage from abandoned carts. Optimistic locking (version numbers, retry on conflict) works when contention is low; pessimistic locking or serialized queues are better for genuinely hot items where most optimistic attempts would fail and retry-storm.

The other half of the problem is spike load, and the answer is a waiting room. You cannot let 5 million people hit checkout simultaneously; you would melt the inventory store no matter how atomic it is. Put a virtual waiting room in front: arriving users get a queue token, are shown a "you are number 480,000 in line" page, and are admitted in controlled batches at a rate the backend can absorb (say 5,000 checkouts/sec). This sheds and paces load and provides fairness (FIFO or a randomized lottery to defeat bots). Only admitted users can even attempt a reservation, so the inventory store sees bounded QPS regardless of how many people showed up.

```
5M arrivals -> Waiting Room (token, FIFO/lottery) -> admit 5K/sec
   -> Reservation (atomic decrement + hold TTL) -> Checkout saga -> Payment -> convert hold to sale
                                    \-- TTL expiry --> atomic increment (release) --/
```

Hot-item sharding has a limit: you cannot shard a single seat, so the truly contended item is serialized. Accept that a sold-out item's throughput is bounded by one atomic counter, and design the waiting room so most users never reach it.

Recap: prevent oversell with a single atomic conditional decrement (never read-then-write), use reservation holds with TTL and automatic release for the cart window, and put a fair, rate-limiting waiting room in front to shed and pace the spike so the inventory store sees bounded load.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design ticket/seat purchasing that never oversells a finite inventory during a flash sale with millions of concurrent buyers.

**Think about:**
- How do you prevent oversell under massive concurrency?
- How do reservation holds with timeouts work?
- How does a waiting room shed and fairly admit spike traffic?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: fixed inventory (e.g., 20,000 seats), up to 5M concurrent buyers at on-sale, individually addressable seats, payment happens after seat selection, oversell is unacceptable, some queueing latency is acceptable.

Estimation: 5M arrivals in the first minute is ~80K arrivals/sec of pressure, but only ~20K seats exist, so the design goal is to admit buyers at a rate the inventory store can serve (target ~5K reservation attempts/sec) and shed the rest into a queue.

API: `POST /reserve {seatId, userId}` returns a hold token or "unavailable"; `POST /checkout {holdToken, payment}` converts the hold to a sale. Both are behind a waiting-room admission gate.

Waiting room: on arrival, users get a signed queue token and a position. An admission controller releases tokens at the backend's safe rate, FIFO for fairness with per-account limits and bot defenses (CAPTCHA, rate caps) to stop scalpers. Only admitted tokens can call `/reserve`.

Oversell prevention: each seat is a row/key with a state. Reservation is a single atomic conditional operation, `UPDATE seats SET state='held', hold_expires=now+10m, holder=? WHERE seat_id=? AND state='available'`, and we succeed only if one row changed. Equivalent Redis approach: a Lua script that atomically checks-and-sets seat state. There is no separate read step, so no race.

Holds: a successful reserve sets a 10-minute TTL. Checkout within the window converts `held -> sold`. On expiry, a sweeper (plus a lazy check on read) atomically returns `held -> available`. This bounds cart-hold leakage and prevents both oversell and permanent lockup.

Checkout saga: reserve -> charge (idempotent payment) -> mark sold -> issue ticket, with compensation (release seat) if payment fails.

Tradeoffs: per-seat atomicity serializes contention on hot seats, which is fine because there are only so many seats; the waiting room is what protects the store from the crowd. We choose strong consistency on seat state (correctness) over availability of the buy button under overload (we show a queue instead).

Common wrong turn: reading availability into the app, deciding, then writing back, which oversells under concurrency, and letting all traffic hit checkout directly with no waiting room, which collapses the inventory store.

**Self-check rubric:**
- [ ] Is the decrement/reserve a single atomic conditional operation with an affected-row check, never read-then-write?
- [ ] Do reservations use a TTL hold with automatic release on expiry?
- [ ] Is there a waiting room that paces admission to the inventory store's safe rate?
- [ ] Did I address fairness and bot/scalper defenses?
- [ ] Did I wire reserve -> pay -> confirm as a saga with seat-release compensation?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the on-sale system for Taylor Swift tickets on Ticketmaster, where 14 million people queued for 2 million seats across dozens of venues, bots made up a large share of traffic, and the previous system melted down. Prioritize fairness, oversell-safety, and graceful degradation under 10x the expected load.

**Model answer (revealed on demand):**

Assumptions: demand is ~7x supply, traffic is globally distributed, a large fraction is bots, and the failure mode to avoid is total collapse plus double-sold seats.

Front the entire on-sale with a mandatory waiting room that users enter before the sale even opens. Pre-registration issues verified codes so real fans are distinguished from bots up front (identity + payment pre-verification), and at on-sale time admission is a randomized lottery among verified users rather than pure FIFO, which defeats the bot advantage of hammering at t=0. Admitted users get a short-lived signed token that authorizes exactly one reservation session.

Shard inventory by venue and by section so hot events do not share a contention domain, and within a section each seat is an atomically-guarded key (Redis-backed counter/state with durable Postgres or DynamoDB behind it). Reservation is a single atomic check-and-set with a strict per-account seat cap enforced at reservation time (not at checkout, where it is too late). Holds carry a tight TTL (e.g., 5 minutes) because demand is so far above supply that long holds waste scarce inventory.

Graceful degradation is the headline lesson from the real meltdown: the buy path must have no synchronous dependency that cannot absorb 10x. Serve the waiting-room and queue-position pages from a CDN/edge with cached, static-ish content so the queue itself never falls over even when 14M people watch it. Rate-limit admission dynamically based on live backend health (admit slower when the inventory store's latency climbs) rather than a fixed rate. If the payment provider degrades, extend holds and slow admission rather than dropping reservations. Bot defense is layered: verified pre-registration, device fingerprinting, per-account and per-payment-instrument caps, and anomaly detection that shadow-bans obvious scripts.

The wrong turn, and the one that actually happened, is letting unbounded verified-and-unverified traffic reach the reservation tier at once with no adaptive shedding, so the store saturates, latency explodes, and the site is down for everyone. The fix is admission control tied to backend health plus lottery fairness, so the system stays up and slow rather than down and unfair.

### sd-l10-web-crawler: Design a Web Crawler

- **id:** `sd-l10-web-crawler`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** web-crawler, frontier, dedup

#### Learn

A web crawler is the canonical large-scale batch pipeline: discover, fetch, dedup, store, and repeat, across billions of pages, without getting banned. The interview tests whether you can build a distributed producer-consumer loop that is polite, deduplicated, and incrementally fresh.

The heart is the frontier: the queue of URLs to fetch. It is not a single FIFO. It must do two jobs at once: prioritize (crawl important, fresh, high-PageRank pages first) and enforce politeness (never hammer one host). The classic design (Mercator style) uses two layers of queues: front queues for priority (a URL is assigned to a priority band) and back queues for politeness (each back queue holds URLs for exactly one host, and a per-host timer enforces a minimum delay, respecting `Crawl-delay` and robots.txt). A heap of "next-fetch-time per host" tells the fetchers which host is due. This is what keeps you from sending 10,000 requests/sec to one small site and getting your IP blocked.

**Interview nuance:** Politeness is the single most common thing juniors omit and the first thing interviewers probe. Say explicitly: fetch robots.txt per host (and cache it), enforce a per-host rate limit / min delay, identify with a real User-Agent, and back off on 429/503. A crawler without politeness gets banned and is useless.

Dedup happens at two levels. URL dedup: before adding a URL to the frontier, check whether you have seen it, using a normalized URL (canonicalize scheme/host/case, strip tracking params, resolve relative links). At billions of URLs a hash set in memory is too big, so use a bloom filter (or scalable variant) for a fast "definitely new / probably seen" check backed by a durable seen-set store; a bloom filter's false positives cost you a few dropped new URLs, which is acceptable. Content dedup: many URLs return identical or near-identical content (mirrors, session-id URLs, print pages). Hash the content (or use MinHash/simhash shingling for near-duplicate detection) so you do not index the same page a million times. This also helps with crawler traps (infinite calendars, faceted-search URL explosions) which you additionally bound with max-depth and per-host URL caps.

Fetching is distributed and I/O-bound. Run many fetcher workers pulling due URLs from the frontier, with async I/O for high concurrency per box, DNS caching (DNS lookups are a real bottleneck at scale, cache aggressively), and connection reuse. Fetched pages go to a raw store (S3/HDFS) as the crawl corpus, a link-extraction stage parses out new URLs and feeds them back to the frontier (the loop), and the corpus feeds a downstream indexing pipeline that builds the inverted index for search.

```
Frontier (front=priority, back=per-host politeness)
   -> Fetchers (async I/O, DNS cache, robots check)
   -> raw store (S3)  --> link extractor --> URL dedup (bloom) --> back to Frontier
                      \-> content dedup (simhash) --> Indexer (inverted index)
```

Freshness needs incremental recrawl, not one-shot. Estimate change rates per page (news changes hourly, an archive never does) and schedule recrawls adaptively, using HTTP conditional GETs (If-Modified-Since / ETag) so unchanged pages cost a cheap 304 instead of a full refetch.

Recap: a two-layer frontier balances priority and per-host politeness, bloom-filter URL dedup plus simhash content dedup avoid redundant work and traps, distributed async fetchers with DNS caching do the I/O, and adaptive incremental recrawl with conditional GETs keeps the corpus fresh.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a crawler that discovers, fetches, dedups, and indexes billions of web pages while respecting politeness.

**Think about:**
- How does the frontier queue prioritize and respect robots.txt/per-host rate?
- How do you dedup URLs and content and avoid traps?
- How do you keep the index fresh with incremental recrawl?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: target ~10B pages, refresh important pages frequently, must respect robots.txt and not get banned, output feeds a search index. Politeness and freshness matter more than raw peak speed.

Estimation: 10B pages / 30 days is ~3,900 pages/sec sustained just to cover once a month; hot pages need far more. Average page ~100 KB compressed means ~1 PB of corpus, so raw storage is S3/HDFS, not a database.

Frontier: a distributed priority-and-politeness queue. Front queues assign priority (by estimated importance and staleness); back queues hold one host each and a per-host next-fetch-time heap enforces a minimum delay and robots `Crawl-delay`. Fetchers pull only hosts that are due, so no host is overwhelmed.

Politeness: fetch and cache robots.txt per host, honor disallow rules and crawl-delay, send a truthful User-Agent with contact info, cap concurrent connections per host, and back off on 429/503. This is stated up front as non-negotiable.

Dedup: normalize URLs (canonical scheme/host, strip tracking params) and check a bloom filter before enqueue for a cheap "probably seen" test, backed by a durable seen-set. Hash page content and use simhash shingling to drop exact and near-duplicate pages. Bound traps with max-depth, per-host URL caps, and pattern detection on calendar/faceted URLs.

Fetching: many async workers, aggressive DNS caching, connection reuse. Pages land in S3; a link-extraction stage emits new URLs back to the frontier (the crawl loop) and hands content to the indexer.

Freshness: track per-page change frequency and recrawl adaptively; use conditional GET (If-Modified-Since/ETag) so unchanged pages return a cheap 304.

Tradeoffs: bloom-filter dedup trades a small false-positive rate (a few new URLs dropped) for bounded memory at 10B scale. Politeness caps throughput per host, which we accept because getting banned is worse than being slow. We optimize for coverage and freshness of important pages over crawling everything equally.

Common wrong turn: no politeness / per-host rate limiting (the crawler gets blocked and trapped), and an exact in-memory seen-set that does not fit at billions of URLs.

**Self-check rubric:**
- [ ] Does the frontier separate priority from per-host politeness (two-layer queue)?
- [ ] Did I explicitly handle robots.txt, per-host rate limits, and backoff?
- [ ] Did I dedup both URLs (bloom filter) and content (hash/simhash) and bound crawler traps?
- [ ] Did I distribute fetching with DNS caching and store the corpus in object storage?
- [ ] Did I make recrawl incremental with change estimation and conditional GETs?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the crawl and refresh pipeline for Googlebot-scale coverage of a fast-moving vertical (a news and social discovery crawler) that must surface breaking-news pages within 60 seconds of publication while still crawling the long tail of the web politely.

**Model answer (revealed on demand):**

Assumptions: two very different SLAs coexist. Breaking news must be indexed in under a minute; the long tail can wait days. Both must stay polite and deduplicated.

Split the frontier into tiers with different scheduling policies rather than one uniform queue. A hot tier is driven by discovery signals (publisher sitemaps and RSS/Atom feeds polled on a tight loop, PubSubHubbub/WebSub push notifications where publishers support it, plus social-share velocity), so a newly published article is discovered from its feed within seconds and jumped to the front of the queue. A cold tier does normal breadth-first coverage of the long tail at a leisurely, polite rate. Each tier still runs through the same per-host politeness layer, so even a hot page respects the host's crawl-delay; we buy speed from earlier discovery, not from hammering the site.

For the 60-second SLA, the bottleneck is discovery latency, not fetch latency, so invest there: subscribe to WebSub hubs, prioritize sitemaps with `lastmod`, and maintain a per-source publish-rate model to poll active news sources every few seconds and dormant ones rarely. On discovery, a hot URL skips the priority bands and goes straight to a low-latency fetch lane with its own dedicated fetcher pool so a backlog in the cold tier cannot delay it.

Freshness of already-known pages uses conditional GETs and change-rate models, but news pages get a burst schedule (recrawl every few minutes for the first hour after publish, then decay) because comments, updates, and corrections change them rapidly. Dedup still applies: near-duplicate detection (simhash) collapses the syndication explosion where one wire story appears on hundreds of sites, keeping the canonical and clustering the rest.

The wrong turn is a single-priority frontier: either you crawl politely and miss the 60-second window, or you crawl aggressively enough to hit it and get banned across the long tail. The tiered frontier with feed/push-based discovery and a dedicated hot fetch lane is what reconciles the two SLAs.

### sd-l10-metrics-monitoring: Design a Metrics & Monitoring System (Prometheus/Datadog)

- **id:** `sd-l10-metrics-monitoring`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** monitoring, time-series, alerting

#### Learn

A metrics platform ingests a firehose of numbers over time (millions of data points per second from thousands of hosts), stores them cheaply, serves fast dashboard queries, and fires alerts. The interview is really about two things: write throughput into a time-series database, and controlling cardinality so cost does not explode.

A metric is a name plus a set of labels plus a timestamped value: `http_requests_total{service="checkout", region="us-east", status="200"} = 4823 @ t`. The unique combination of label values is a time series. Here is the trap that dominates this problem: cardinality is the product of all label value counts. Add a `user_id` label with 10M values and one metric becomes 10M time series, and your storage and query cost explode. Controlling cardinality (never put unbounded-cardinality fields like user id, request id, or email in labels) is the single most important design discipline.

**Interview nuance:** When asked "what breaks first," say high-cardinality labels. Interviewers want to hear that you would reject `user_id`/`trace_id` as labels, cap label sets, and detect cardinality spikes, because unbounded cardinality is what actually takes these systems down.

Ingestion must absorb bursts without dropping data. Agents on each host batch and push samples (or the platform scrapes `/metrics` endpoints on an interval, the Prometheus pull model). A high-throughput front door (a stateless ingestion tier writing to Kafka) buffers the firehose and decouples spiky producers from storage. Batching and compression are essential: time-series data compresses beautifully because timestamps are regular and adjacent values are similar (delta-of-delta timestamp encoding plus XOR float compression, the Gorilla/Facebook technique, gets ~1.3 bytes per sample versus 16 raw).

Storage is a purpose-built TSDB (Prometheus TSDB, Cortex/Mimir, InfluxDB, TimescaleDB) organized for the dominant query pattern: "give me one series over a time range." Data is partitioned by time into blocks (recent blocks in memory/SSD for fast writes and hot reads, older blocks flushed to object storage) and indexed by label so a query can find matching series quickly. This hot/cold tiering is how you keep recent data fast and old data cheap.

Retention and rollups bound cost. You do not keep raw 1-second resolution for a year. Downsample: keep raw for a short window (e.g., 15 days), then pre-aggregate into 5-minute and 1-hour rollups (min/max/avg/count) for longer retention. A dashboard showing last quarter reads cheap hourly rollups, not billions of raw points. Retention tiers plus rollups are the cost-control lever alongside cardinality.

```
hosts -> agents (batch, compress) -> Kafka -> ingester (TSDB write)
                                                  |
   raw (hot, in-mem/SSD) --downsample--> 5m/1h rollups (cold, object store)
                                                  |
   Query engine (label index, range scan) -> dashboards
   Rule evaluator (every 15s) -> alerts -> dedup/group -> notify (PagerDuty/Slack)
```

Alerting is periodic rule evaluation. A rule engine runs queries on a schedule (e.g., every 15s), `avg(rate(errors[5m])) > 0.05`, and on a firing condition creates an alert. Crucially, an alert manager deduplicates and groups (one incident, not 500 pages from 500 hosts), applies silences/inhibitions, and routes to PagerDuty/Slack/email. Query engine sharding is by metric name and time so dashboard reads scale horizontally.

Recap: buffer the ingestion firehose through Kafka into a compressed TSDB partitioned by time, control cost with cardinality limits plus retention tiers and downsampled rollups, serve dashboards from a label-indexed query engine, and evaluate alert rules on a schedule with a dedup/group/route alert manager.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a metrics platform that ingests millions of data points/sec and serves dashboards + alerts over them.

**Think about:**
- How do you handle high-throughput ingestion and TSDB storage?
- How do downsampling, rollups, and cardinality control bound cost?
- How does alerting/rule evaluation work?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: ~5M samples/sec from ~50K hosts, dashboards query recent data most, a year of history at coarse resolution, sub-second dashboard reads, alert latency of tens of seconds is fine.

Estimation: 5M samples/sec at ~1.3 bytes/sample compressed is ~6.5 MB/sec, ~560 GB/day of hot raw data before rollups; downsampling and short raw retention keep long-term cost bounded. Cardinality: if each host emits 1,000 series, that is 50M active series, which is the real scaling number to defend.

API: a push/scrape ingest endpoint and a query API (`/query?expr=...&start&end&step`). Metrics are `name{labels} value @ ts`.

Ingestion: host agents batch and compress; a stateless ingest tier writes to Kafka to absorb bursts and decouple producers; ingesters consume and write to the TSDB. Backpressure and buffering prevent data loss during spikes.

Storage: a TSDB with delta-of-delta timestamp and XOR value compression, partitioned into time blocks, with recent blocks hot (memory/SSD) and old blocks flushed to object storage, indexed by label for series lookup.

Cost control: reject/limit high-cardinality labels (no user_id/trace_id in labels), cap series per metric, and alert on cardinality spikes. Keep raw for ~15 days, then downsample to 5-minute and 1-hour rollups (min/max/avg/count) for long retention, so old dashboards read cheap rollups.

Query: a query engine uses the label index to find matching series and range-scans blocks; shard by metric name and time to scale reads; cache frequent dashboard queries.

Alerting: a rule evaluator runs each rule on a schedule (every 15s), fires on threshold breach, and an alert manager dedups and groups related alerts into one incident, applies silences, and routes to PagerDuty/Slack.

Tradeoffs: pull vs push (pull gives the platform control over scrape timing and easy target health, push handles short-lived jobs and NAT better); we can support both. We trade query flexibility of a general DB for the compression and range-scan speed of a purpose-built TSDB.

Common wrong turn: allowing unbounded tag cardinality (per-user or per-request labels), which explodes series count, storage, and query cost and eventually takes the system down.

**Self-check rubric:**
- [ ] Did I buffer ingestion (Kafka) and use a compressed, time-partitioned TSDB with hot/cold tiers?
- [ ] Did I explicitly control cardinality and reject unbounded labels?
- [ ] Did I use retention tiers plus downsampled rollups to bound long-term cost?
- [ ] Does the query engine use a label index and shard by metric/time?
- [ ] Does alerting evaluate rules on a schedule and dedup/group/route via an alert manager?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the metrics backend for a Datadog-style multi-tenant SaaS serving 20,000 customer organizations, where each org sends its own custom metrics, noisy neighbors must not degrade others, and per-org billing is based on ingested custom-metric cardinality. Prioritize tenant isolation and cardinality-based cost attribution.

**Model answer (revealed on demand):**

Assumptions: 20K tenants with wildly uneven volume, one tenant can suddenly emit a cardinality explosion, and cardinality is literally the billing unit, so it must be measured accurately per tenant.

Tenant isolation is the headline. Tag every sample with a tenant id from ingestion onward and enforce per-tenant quotas and rate limits at the ingest tier so a noisy neighbor cannot starve others. Partition storage by tenant (dedicated series namespaces, and for the largest tenants dedicated ingesters/shards) so one tenant's write load and query load are contained. Kafka topics or partitions keyed by tenant let you throttle a runaway producer without touching everyone else. A per-tenant cardinality limiter tracks active series in real time and, when a tenant blows past its plan, applies backpressure (drop new series, keep existing ones) and alerts them, rather than silently exploding shared storage.

Cardinality-based billing requires an accurate, cheap count of unique series per tenant per period. Exact counting of tens of millions of series per tenant is expensive, so use HyperLogLog per tenant to estimate distinct active series with ~2 percent error at kilobytes of memory, and reconcile against the storage index periodically for the authoritative bill. This gives real-time cardinality visibility (so both you and the customer see spend as it happens) plus an accurate month-end total.

Query isolation: run per-tenant query quotas and a fair scheduler so one org's expensive dashboard query cannot monopolize the query fleet, and cache per-tenant. Hot/cold tiering and downsampling work as in the single-tenant design but are metered and retained per plan.

The wrong turn in multi-tenant metrics is a shared, unpartitioned TSDB with global cardinality: one customer's bad deploy that adds a `request_id` label then explodes series count, blows up storage and query latency for all 20,000 tenants, and you cannot even attribute the cost. Per-tenant partitioning, quotas, and HLL-based cardinality metering are what make the noisy neighbor a billing event instead of an outage.

### sd-l10-ad-click-aggregator: Design an Ad Click Aggregator / Real-Time Analytics

- **id:** `sd-l10-ad-click-aggregator`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** ad-aggregator, streaming, dedup

#### Learn

An ad click aggregator ingests a high-volume stream of click events and produces per-campaign counts that advertisers see in near real time and that also feed billing, so the numbers must be both fast and eventually exact. This is the canonical streaming-aggregation interview, and it lives or dies on two ideas: idempotent counting and reconciling real-time with batch truth.

The naive design fails immediately. If you just do `counter++` per event on an at-least-once stream (Kafka redelivers on consumer restart), you double-count, and since clicks are money, that is fraud-by-bug. You need exactly-once or idempotent counting. Each click carries a unique id; dedup on it. At high volume you cannot keep every id forever, so use a bloom filter or a windowed dedup store (recent ids in Redis with TTL) to reject replays cheaply, accepting a tiny false-positive rate. Alternatively, lean on the stream processor's exactly-once semantics (Flink checkpointing, Kafka transactions) so an aggregate update and the source offset commit are atomic, meaning a replay after crash does not double-apply.

**Interview nuance:** State the delivery-semantics problem out loud: Kafka gives at-least-once by default, so naive increments double-count. Name your fix (Flink exactly-once via checkpointed state + transactional sink, or explicit dedup on click id), because "just increment a counter" is the failing answer.

Time is the other hard part. Clicks arrive late and out of order (a mobile device offline for an hour uploads its clicks later). You aggregate over windows (per-minute, per-hour tumbling windows per campaign), and you need watermarks to decide when a window is "done." A watermark is the stream's assertion that "no events older than T will still arrive," so the window can close and emit. You also configure allowed lateness: hold windows open a bit past the watermark to admit stragglers, and emit late updates for clicks arriving after close. Event time (when the click happened) not processing time (when you saw it) is what you window on, or your counts are wrong whenever ingestion lags.

Real-time systems are approximate and can have gaps, so the industry pattern is Lambda or Kappa. Lambda runs two paths: a fast streaming path (Flink) that gives immediate, slightly-approximate counts for the advertiser dashboard, and a slow batch path (Spark over the raw event log in S3, run hourly/daily) that recomputes the exact, deduplicated, fraud-filtered numbers that billing uses. The batch layer is the source of truth and corrects any streaming drift. Kappa simplifies to one streaming engine with replay: the same Flink job can reprocess from the Kafka/log retention to recompute, avoiding two codebases. Kappa is simpler to maintain; Lambda is common when the batch tooling and semantics genuinely differ.

```
clicks -> Kafka (raw log, retained) --> Flink (windows + watermarks + dedup) --> sharded counters -> dashboard (fast, ~approx)
                          \--> S3 raw --> Spark batch (hourly, exact, fraud-filtered) --> billing (truth)
```

Hot campaigns create counter hotspots; a viral ad might take millions of increments/sec on one key. Shard the counter into N sub-counters updated independently and summed on read (trading read cost for write parallelism), and pre-aggregate within the stream processor before writing. Fraud/bot filtering (dedup, rate anomalies, click-farm patterns) runs in-stream for fast defense and again in batch for the authoritative purge.

Recap: dedup clicks idempotently (bloom/windowed store or Flink exactly-once) so at-least-once delivery does not double-count, window on event time with watermarks and allowed lateness for out-of-order clicks, use Lambda/Kappa so a fast approximate stream is reconciled by an exact batch (or replayable) source of truth, and shard hot-campaign counters.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design real-time aggregation of ad clicks producing per-campaign counts with fraud-resistant dedup.

**Think about:**
- How do windowing and watermarks handle late clicks?
- How do you dedup and count idempotently?
- How does Lambda vs Kappa reconcile real-time with batch truth?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: ~1M clicks/sec at peak, advertisers want dashboard freshness within seconds, billing needs exact deduplicated fraud-filtered counts, clicks can arrive minutes late and out of order.

Estimation: 1M clicks/sec, each event ~200 bytes, is ~200 MB/sec into the log, ~17 TB/day of raw events in S3; the aggregated per-campaign-per-minute counts are tiny by comparison.

API: producers emit `{clickId, campaignId, userId, ts, context}` to Kafka. Reads: `GET /campaigns/{id}/clicks?window=...` from a serving store.

Ingestion: all clicks land in Kafka as the durable, replayable raw log (retained days), which decouples producers from processing and is the backbone for both fast and exact paths.

Streaming (fast path): Flink consumes Kafka, windows by event time into tumbling per-minute windows per campaign, uses watermarks to close windows once late arrivals are unlikely, and allows a bounded lateness to admit stragglers with late updates. Dedup on `clickId` using Flink keyed state (or a windowed Redis/bloom set) so redeliveries do not double-count; Flink's checkpointing plus a transactional sink gives exactly-once so a crash-replay does not double-apply. Results write to sharded counters serving the dashboard.

Batch (truth): Spark runs hourly over the S3 raw log to recompute exact, fully-deduplicated, fraud-filtered counts that billing uses, correcting any streaming drift. This is Lambda; a Kappa alternative reprocesses via a second Flink run over Kafka retention, avoiding a separate codebase at the cost of long-retention replay.

Hot campaigns: shard each campaign counter into N sub-counters summed on read, and pre-aggregate in the Flink operator before the sink so one viral ad does not hotspot a single key.

Fraud: in-stream filters (dedup, per-user rate caps, obvious bot signatures) for fast defense; the batch layer does the authoritative fraud purge before billing.

Tradeoffs: the dashboard is fast but approximate (open windows, in-stream fraud only); billing is slower but exact (batch reconciliation). We choose event-time windowing over processing-time so lagging ingestion does not corrupt counts.

Common wrong turn: naive per-event increments on at-least-once delivery, which double-count under replay, and windowing on processing time, which misattributes late clicks.

**Self-check rubric:**
- [ ] Did I make counting idempotent (dedup on click id or exactly-once stream state)?
- [ ] Did I window on event time with watermarks and allowed lateness?
- [ ] Did I put a durable replayable log (Kafka + S3) at the core?
- [ ] Did I reconcile a fast approximate path with an exact batch/replay source of truth (Lambda/Kappa)?
- [ ] Did I shard hot-campaign counters and run fraud filtering in-stream and in-batch?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the real-time attribution and counting pipeline for TikTok-scale ad analytics, where 10M events/sec span impressions, clicks, and conversions that must be joined across a multi-day attribution window, advertisers see near-real-time spend, and click fraud is adversarial. Prioritize the cross-event join under late data and the fraud pipeline.

**Model answer (revealed on demand):**

Assumptions: three event types (impression, click, conversion) must be attributed together, conversions can land days after the click (a purchase two days later still credits that click), fraud actors actively try to inflate counts, and advertisers watch spend live.

The hard new problem is a stateful stream join across a multi-day window. A conversion must be matched to the click and impression that drove it, but those happened days earlier, so the join key state (per user/device/campaign) must be held for the full attribution window (e.g., 7 days) in the stream processor. Use Flink with RocksDB-backed keyed state so the join state spills to disk and survives being large, keyed by device/user, with state TTL equal to the attribution window so it is garbage-collected automatically. When a conversion arrives, it looks up the retained click/impression state and emits an attributed event; late conversions still find their click because the state is retained. Event-time processing with watermarks tuned to the multi-day lateness is essential, and windows emit incremental updates as late data arrives.

Because state for the full window at 10M events/sec is huge, partition by device/user so each Flink task holds a bounded slice, and checkpoint frequently to durable storage so a failure does not lose days of join state.

Fraud is adversarial, so it is layered and partly offline. In-stream, cheap defenses run first: dedup on event id, per-device and per-IP rate limits, and obvious bot fingerprints, so live spend is roughly clean. Offline, a batch/ML fraud pipeline over the S3 raw log detects click-farm coordination, anomalous conversion-rate patterns, and device-graph collusion that need a global view, then issues corrections that claw back fraudulent counts before final billing. Advertiser dashboards show provisional near-real-time numbers with a clear "subject to fraud adjustment" reconciliation, and billing uses the post-batch authoritative figure.

The wrong turn is trying to do multi-day attribution with fixed short windows or stateless joins: you either lose the click by the time the conversion lands, or you hold unbounded state with no TTL and blow up memory. Keyed, TTL'd, disk-backed stream state plus a two-tier (in-stream + batch/ML) fraud pipeline is what makes adversarial, late-arriving attribution correct.

### sd-l10-leaderboard-topk: Design a Leaderboard / Top-K / Distributed Counter

- **id:** `sd-l10-leaderboard-topk`  ·  **difficulty:** medium  ·  **est:** 40 min  ·  **skills:** leaderboard, redis, approximation, case-study

#### Learn

A leaderboard looks trivial ("sort players by score") and is a trap, because the naive SQL answer collapses under load. The interview tests whether you know the right data structure (a sorted set), how to scale it, how to handle hot counters, and where approximation is a legitimate win.

The wrong instinct is `SELECT ... ORDER BY score DESC LIMIT 10` plus, for a player's rank, `SELECT COUNT(*) WHERE score > my_score`. Both do a full sort or scan on every request, and at tens of millions of players and constant score updates they melt. The right primitive is a Redis sorted set (ZSET). A ZSET keeps members ordered by score in a skip list, giving O(log n) inserts/updates (ZADD), O(log n + k) top-K reads (ZREVRANGE 0 k), and O(log n) rank lookup (ZREVRANK). That single structure answers both "top 10" and "my rank" without scanning everyone. This is the standard, expected answer.

**Interview nuance:** The interviewer wants you to reject the SQL-sort-per-request answer and name the sorted set with its complexities. Saying "Redis ZSET, ZREVRANGE for top-K, ZREVRANK for my rank, both O(log n)" is the seniority signal.

A single ZSET has limits at tens of millions of members and high write rate, so shard it. Segment by natural boundaries (region, league, time window like daily/weekly boards) so each ZSET stays a manageable size, and maintain a smaller global top-N ZSET merged from the top of each shard for the global board (only the top entries of each shard can be globally top-N, so you merge cheaply). All-time boards are snapshotted periodically rather than recomputed live. "My rank" within a segment is exact; global exact rank across shards is expensive, so global rank is often approximate or bucketed ("top 1%").

The counters behind the scores are their own problem. A single hot key (global likes, total views, a mega-popular player's score) taking millions of increments/sec becomes a write hotspot and lock contention point. The fix is a sharded/distributed counter: split the logical counter into N sub-counters (`counter:0..N-1`), increment a random shard per write so writes fan out across keys/nodes, and sum the N shards on read. This trades a slightly more expensive read (sum N values) for massive write parallelism, and it is the canonical answer to "a single counter can't take the write rate."

Where exactness is not required, approximate structures are a big memory win. HyperLogLog counts unique items (unique players seen, unique visitors) with ~2 percent error in ~12 KB regardless of cardinality, versus gigabytes for an exact set. Count-Min Sketch estimates per-item frequencies and heavy hitters (approximate top-K of a stream) in fixed memory with bounded overcount. Use these when "about 4.2M unique" or "roughly the top trending items" is good enough, which for analytics dashboards it usually is.

Durability matters: Redis is the fast serving/index layer, not the system of record. Persist authoritative scores in a database and treat the ZSET as a rebuildable index (write-behind, or rebuild from an event stream), so a Redis loss is a rebuild, not data loss. Real-time rank changes push to clients over WebSocket/SSE, and expensive global boards recompute on a cadence rather than on every single increment.

```
score update -> DB (truth) + ZADD to segment ZSET (O(log n))
top-K:  ZREVRANGE segment 0 k          (O(log n + k))
my rank: ZREVRANK segment player       (O(log n))
global:  merge top-N of each shard ZSET
hot counter: INCR counter:rand(0..N) ; read = SUM(counter:0..N-1)
unique count: HyperLogLog ; trending top-K: Count-Min Sketch
```

Recap: use a Redis sorted set for O(log n) updates and top-K/rank reads instead of SQL sort-per-request, shard the ZSET by segment with a merged global top-N, break hot counters into summed sub-counters for write parallelism, reach for HyperLogLog and Count-Min Sketch when approximate is good enough, and keep authoritative scores in a database with Redis as a rebuildable index.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a real-time global leaderboard and the counters behind it for a game with tens of millions of players, and justify your use of Redis sorted sets, sharded counters, and approximate structures for scale.

**Think about:**
- How do you get a player's rank and the top-K without scanning everyone on every request?
- What breaks when a single hot counter takes millions of increments per second?
- Where is an approximate answer good enough, and which structure gives it cheaply?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: tens of millions of players, frequent score updates, reads for both top-K and "my rank and neighbors," near-real-time freshness, Redis available as the serving layer with a database as source of truth.

Top-K and rank: use a Redis sorted set keyed by leaderboard segment. ZADD updates a score in O(log n), ZREVRANGE 0 k returns the top-K in O(log n + k), and ZREVRANK returns a player's rank in O(log n). "My rank and neighbors" is ZREVRANK plus a ZREVRANGE around that index. This avoids the fatal `ORDER BY score LIMIT k` plus `COUNT(*) WHERE score > x` per request, which full-scans and collapses under load.

Scaling the ZSET: shard by segment (region, league, daily/weekly window) so each set stays bounded, and keep a smaller global top-N ZSET merged from each shard's top entries for the global board. Exact global rank across all shards is costly, so global rank is bucketed/approximate while in-segment rank is exact. All-time boards are snapshotted on a cadence.

Distributed counters: a single hot key (a viral player's score, global counts) taking millions of increments/sec is a write hotspot. Shard the counter into N sub-counters, increment a random shard per write, and sum on read, trading read cost for write parallelism.

Approximation: use HyperLogLog for unique counts (unique players seen) at ~12 KB with ~2 percent error, and Count-Min Sketch for heavy-hitter/top-K frequency estimates in streams, both trading bounded error for large memory savings, which is fine for dashboards.

Durability and real-time: persist authoritative scores in a database and treat Redis as a rebuildable index via write-behind or an event stream, so a Redis failure is a rebuild not data loss. Push rank changes to clients over WebSocket/SSE, and recompute expensive global boards on a cadence rather than on every increment.

Tradeoffs: we accept approximate global rank and cadence-based global recompute to keep per-request cost O(log n); we accept summed-read counters to remove the write hotspot.

Common wrong turn: SQL sort-and-count per request (full scan, collapses under load) and a single global counter row that becomes a lock hotspot.

**Self-check rubric:**
- [ ] Did I use a Redis sorted set with ZREVRANGE (top-K) and ZREVRANK (rank), and cite O(log n)?
- [ ] Did I explicitly reject SQL sort-and-count-per-request?
- [ ] Did I shard the ZSET by segment with a merged global top-N?
- [ ] Did I break the hot counter into summed sub-counters for write parallelism?
- [ ] Did I name HyperLogLog / Count-Min Sketch for approximate counts and keep a DB as source of truth?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the leaderboard and engagement-counter backend for a live mobile battle-royale like Fortnite during a global event, where 100M+ players generate score updates in bursts at match-end, players demand their exact rank among friends instantly, and a global "players online" and "matches played" counter must be shown live. Prioritize the friends leaderboard and the hot global counters.

**Model answer (revealed on demand):**

Assumptions: 100M+ players, updates arrive in synchronized bursts (matches end together, so the write rate spikes hard), friends leaderboards are the primary social feature, and global aggregate counters are on every screen.

Friends leaderboard is the interesting twist because it is per-viewer and small (a player has maybe 200 friends) but there are 100M viewers. Do not build a ZSET per friend group. Instead keep each player's score in a global or sharded ZSET as the source of scores, and compute a friends board on read by fetching the player's friend list and doing a small batched score lookup (ZSCORE/ZMSCORE for those 200 members) then sorting 200 items in the client or edge, which is trivial. This gives an exact friends ranking instantly without maintaining 100M overlapping leaderboards, and it caches well per player between score changes.

Burst writes at match-end are a thundering herd on the ZSET and DB. Absorb them through Kafka: match results publish to a stream, consumers batch-apply ZADDs and DB writes, and dashboards read slightly-lagged values. Batching turns millions of simultaneous single updates into far fewer pipelined operations.

Global "players online" and "matches played" are exactly the hot-counter problem at its worst. For "matches played" (monotonic, high write rate) use sharded counters: N sub-counters incremented on random shards, summed (and cached for a second) on read, so no single key takes the full write rate. For "players online" (a distinct count that goes up and down) use HyperLogLog to approximate unique concurrent players at ~2 percent error and tiny memory, refreshed every few seconds, since an exact live concurrent count across 100M is neither cheap nor necessary on a marketing counter.

The wrong turn is a per-friend-group materialized leaderboard (100M of them, impossible to keep fresh) and a single global counter row for matches-played that becomes a write bottleneck the instant a global event ends. Read-time friends computation over a shared ZSET, Kafka-batched burst writes, and sharded-counter-plus-HLL for the live aggregates are what hold up under the match-end spike.

### sd-l10-stock-exchange: Design a Stock Exchange / Order-Matching Engine

- **id:** `sd-l10-stock-exchange`  ·  **difficulty:** hard  ·  **est:** 45 min  ·  **skills:** low-latency, matching-engine, event-sourcing, case-study

#### Learn

An order-matching engine is the interview where the usual web instincts (throw it in a database, shard it, scale horizontally) are all wrong, and knowing why is the whole point. The requirements are microsecond latency, perfect determinism (an audit must be able to replay every fill exactly), and strict fairness. Those force a single-writer, in-memory, event-sourced design.

The matching rule is price-time priority over a limit order book: for buys, highest price first; for sells, lowest price first; and at the same price, the earliest order wins (time priority). A limit order rests in the book until matched; a market order takes the best available price immediately; a cancel removes a resting order. The book is two sorted structures (bids descending, asks ascending) grouped by price level, each level a FIFO queue of orders. Matching pops the best price levels and fills in time order.

The counterintuitive core: use a single-writer, single-threaded matching engine, not a database with locks. Why is single-threaded faster and more correct here? Because a lock per order in a general database adds milliseconds and nondeterminism (thread scheduling decides tie-breaks), and this domain needs microseconds and reproducibility. A sequencer assigns a total order to all inbound events (every order, cancel, and modify gets a monotonic sequence number), and a single thread processes them one at a time from an in-memory ring buffer (the LMAX Disruptor pattern), with no locks, cache-friendly memory access, and no cross-thread nondeterminism. Horizontal scale comes from sharding by instrument: each symbol (AAPL, TSLA) gets its own single-writer engine, and there is no cross-symbol coordination on the hot path.

**Interview nuance:** The signal here is explaining that single-threaded beats multi-threaded for this workload. Say: the bottleneck is not CPU throughput, it is determinism and tail latency, and a lock-free single writer over sequenced input gives both, which a sharded transactional database cannot.

The order book lives entirely in memory (arrays or intrusive structures per price level for O(1) best-price access), with no per-order database round-trip on the hot path, because a disk read would blow the microsecond budget.

Determinism is a hard requirement, not a nice-to-have, because regulators and replay demand that the same ordered input always yields identical output. That means: no wall-clock decisions in matching logic (derive time and ids from the sequence number), no random tie-breaking, and no multi-threaded races. Given the exact same sequenced input, a replay must reproduce every fill identically.

Recovery uses event sourcing. Before the engine acts on an accepted event, append it to a durable, replicated journal (the sequenced event log). On a crash, spin up a fresh engine and replay the journal to reconstruct the exact book state; periodic snapshots bound replay time so you replay from the last snapshot forward rather than from the beginning of the day. Because matching is deterministic, replay is guaranteed to rebuild the identical book.

```
orders --> pre-trade risk checks --> Sequencer (assign seq #, append to journal) 
   --> [single-threaded matching engine per instrument, in-memory book] 
   --> fills + book deltas --> market-data bus (multicast/streaming)
Journal (replicated) --replay--> hot-standby replica (deterministic takeover)
```

Market-data fan-out must not slow matching: publish trades and book deltas onto a separate high-throughput multicast or streaming bus so slow subscribers cannot backpressure the matcher. Availability comes from hot-standby replicas that consume the same sequenced log and can take over deterministically, plus pre-trade risk checks in front of the matcher (credit/position limits) so bad orders never reach the book.

Recap: match by price-time priority in an in-memory order book, process a single-writer sequenced event stream single-threaded (Disruptor style) for lock-free determinism and microsecond latency, shard by instrument for scale, keep matching fully deterministic (no wall-clock, no randomness), recover by replaying a replicated event journal from snapshots, and fan out market data on a separate bus with hot standbys for availability.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a stock exchange order-matching engine targeting microsecond latency, and justify deterministic price-time-priority matching, single-writer sequencing, an in-memory order book, event-log replay recovery, and market-data fan-out.

**Think about:**
- Why is a single-writer, in-memory design faster and more correct here than a sharded database?
- How do you make matching fully deterministic so replay reproduces the exact same fills?
- How do you recover state after a crash without losing or reordering orders?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: match a single instrument's book fairly at microsecond latency with strict auditability, replicate the pattern per instrument for scale, and require that any replay reproduces identical fills.

Matching rule: price-time priority over a limit order book. Bids sorted descending, asks ascending, each price level a FIFO by arrival. Limit orders rest, market orders take best price, cancels remove resting orders, all handled deterministically.

Architecture: a sequencer assigns a monotonic sequence number to every inbound event and appends it to a durable, replicated journal, then a single-threaded matching engine consumes the sequenced stream from an in-memory ring buffer (LMAX Disruptor style). Single-writer and lock-free means no lock latency and no thread-scheduling nondeterminism, which is exactly what a general transactional database cannot provide. Horizontal scale is per-instrument sharding: each symbol has its own engine with no cross-symbol hot-path coordination.

In-memory book: price levels in arrays/intrusive structures for O(1) best-price access, no per-order DB round-trip on the hot path, because a disk hit would break the microsecond budget.

Determinism: derive time and ids from the sequence number, forbid wall-clock and random tie-breaks, and keep matching single-threaded, so the same ordered input always yields identical output.

Recovery: append every accepted event to the replicated journal before matching (event sourcing); on crash, replay the journal into a fresh engine from the latest snapshot to reconstruct the exact book. Deterministic matching guarantees the replay matches the original.

Market data and availability: publish trades and book deltas on a separate high-throughput multicast/streaming bus so slow subscribers cannot backpressure the matcher, run hot-standby replicas consuming the same sequenced log for deterministic takeover, and put pre-trade risk checks in front of the matcher.

Tradeoffs: single-threaded caps per-instrument throughput at what one core can do, which we accept because latency and determinism dominate and sharding by instrument scales out; we trade the flexibility of a database for microsecond in-memory matching.

Common wrong turn: putting the order book in a general-purpose transactional database with a lock per order, which adds milliseconds and nondeterminism and cannot reach microsecond latency or reproducible replay.

**Self-check rubric:**
- [ ] Did I specify price-time priority over an in-memory limit order book?
- [ ] Did I justify single-writer single-threaded (Disruptor) over a locking database, on latency and determinism?
- [ ] Did I enforce determinism (no wall-clock, no randomness, derive time/ids from sequence)?
- [ ] Did I recover via replicated event-journal replay plus snapshots?
- [ ] Did I fan out market data on a separate bus and provide hot-standby availability with pre-trade risk checks?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the matching core for a Coinbase-style crypto exchange that runs 24/7 with no maintenance window, matches hundreds of trading pairs, must survive data-center failure without losing or reordering a single order, and faces bursty retail volume spikes of 50x during market events. Prioritize continuous availability and cross-datacenter failover of a deterministic engine.

**Model answer (revealed on demand):**

Assumptions: no nightly downtime (crypto never closes), hundreds of pairs, zero tolerance for lost or reordered orders even across a DC failure, and 50x burst spikes that must not corrupt matching.

Keep the single-writer, deterministic, event-sourced engine per trading pair, because the correctness argument is unchanged. The new problems are 24/7 availability, cross-DC failover, and bursts. The backbone is the replicated sequenced log. Every accepted order is sequenced and written to a synchronously replicated journal spanning at least two datacenters (Raft/quorum replication) before matching acts on it, so an order acknowledged to the client is guaranteed durable in multiple DCs and can never be lost or reordered. The sequence number is the single source of truth for ordering.

Failover: run a hot standby in a second datacenter consuming the same sequenced log and rebuilding the identical book deterministically, kept in lockstep by replay. On primary failure, the standby, which is already caught up to the last committed sequence number, takes over from exactly that point. Because ordering is defined by the committed log and matching is deterministic, takeover cannot reorder or drop orders; it resumes at the next uncommitted sequence. Careful fencing (a single active writer via leader election, rejecting a demoted primary's writes) prevents split-brain double-matching.

Bursts of 50x: the sequencer and journal must absorb the write spike, so use a high-throughput append-only log (the ring buffer plus batched fsync/replication) that batches under load, and apply admission control / rate limiting and pre-trade risk checks in front so malformed or abusive order floods are shed before the matcher. Per-pair sharding spreads the burst across engines; a single hot pair is still bounded by one core, so capacity-plan the busiest pairs and, if needed, place them on dedicated hardware.

The wrong turn is async replication of the journal for speed: an async gap means a DC failure loses acknowledged orders or lets the standby diverge, violating the no-loss/no-reorder requirement. Synchronous cross-DC quorum commit of the sequenced log, deterministic standby replay, and leader-fenced failover are what deliver 24/7 availability without sacrificing the exactly-reproducible matching that the single-writer design exists to guarantee.
