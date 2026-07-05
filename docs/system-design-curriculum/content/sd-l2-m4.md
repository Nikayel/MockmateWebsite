> Module **sd-l2-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l2-m3](./sd-l2-m3.md) · Next: [sd-l2-m5](./sd-l2-m5.md)

# L2 · Data Modeling

After this module you can turn a feature spec into a schema that survives real traffic: decide where to normalize for write integrity and where to denormalize for read speed, model a NoSQL table backward from its access patterns so every query is a single lookup, and pick an ID and key strategy that does not silently create write hotspots or index fragmentation as the table grows. These are the decisions that are cheap to get right on day one and brutally expensive to change after the table has a billion rows.

### sd-l2-normalization-denorm: Normalization vs Denormalization

- **id:** `sd-l2-normalization-denorm`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** normalization, denormalization, modeling

#### Learn

Normalization and denormalization are the two ends of the single most fundamental lever in schema design: you are trading write integrity against read performance, and every schema sits somewhere on that line.

**Normalization** means storing each fact exactly once. Third normal form (3NF), the practical target, says every non-key column depends on the key, the whole key, and nothing but the key. A product's name and price live in one `products` row; an `order_items` row references that product by `product_id` rather than copying the name and price. The payoff is write integrity: change the product name in one place and every order that references it sees the new name, with zero risk of two rows disagreeing. Normalized schemas make writes cheap and correct, and they make **update anomalies** (the same fact stored in two rows that drift apart) structurally impossible.

The cost of normalization is joins on read. To render an order-history page you join `orders`, `order_items`, and `products`. Joins are perfectly fine when they are indexed and bounded: an index on `order_items.order_id` and a primary-key lookup on `products` turns a 3-table join into a handful of B-tree seeks, and Postgres or MySQL will serve that in single-digit milliseconds even at hundreds of millions of rows. Joins fail to scale in two situations. First, when the join fan-out is large and unbounded (joining a user to all of their events across years). Second, and this is the one that actually forces the issue, **when the tables live on different shards**: a cross-shard join means a scatter-gather across the network, and that does not scale. Once your data is sharded, you cannot join across shards cheaply, so you must co-locate or denormalize.

**Denormalization** means deliberately storing a copy of a fact where it is read, to avoid a join or a cross-shard lookup on a hot read path. For a read-heavy order-history page you precompute a row that already contains the product name, the quantity, the line total, and the order status, so rendering the page is a single indexed range scan with no joins. The cost is symmetrical to normalization's benefit: you now have copies to keep in sync, so a product rename becomes a **fan-out write** that must touch every denormalized copy, and if you miss one you get an update anomaly. You have moved the pain from read time to write time, which is the right trade only when reads vastly outnumber writes.

**Interview nuance:** the strong answer never says "denormalize for performance" in the abstract. It names the specific query, the read/write ratio, and the scale trigger: "this order-history query runs 20k times per second, product data changes maybe once a day, so I denormalize the display fields into the order row and accept a rare backfill on rename."

The managed middle ground is a **materialized view** (or a summary table). You keep the source of truth normalized, and the database maintains a precomputed, denormalized copy for you, refreshing it on a schedule or incrementally. You get join-free reads without hand-writing fan-out logic in the application, at the cost of some staleness. Daily revenue rollups, leaderboard tables, and dashboard aggregates are the classic use.

```
normalized (write-optimized)        denormalized (read-optimized)
  orders                              order_history_rows
    order_id, user_id, status          order_id, user_id, status,
  order_items                          product_name, qty, line_total,
    order_id, product_id, qty          created_at   <- copies, join-free
  products                            trade: fan-out write on product change
    product_id, name, price
  join on read (indexed, ms)         source of truth stays normalized;
                                     refresh via materialized view
```

Recap: normalize by default for write integrity, denormalize only for a specific hot read path with a real read/write ratio and scale trigger (especially to dodge cross-shard joins), and reach for materialized views when you want join-free reads without hand-maintaining the copies.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the schema for an e-commerce order, line-items, and product catalog, then denormalize it for a read-heavy order-history page.

**Think about:**
- When are joins fine, and when do they fail to scale?
- What is the cost of denormalization (update anomalies, fan-out writes)?
- How do materialized views offer a managed middle ground?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume a store doing thousands of orders per hour, an order-history page that renders hundreds of times per second per popular user cohort, and a product catalog that changes slowly (prices and names update a few times a day, not per second).

**Normalized core (source of truth).** Three tables in Postgres. `products(product_id PK, name, price_cents, ...)`. `orders(order_id PK, user_id FK, status, created_at, total_cents)`. `order_items(order_item_id PK, order_id FK, product_id FK, quantity, unit_price_cents)`. Critically, I copy `unit_price_cents` into `order_items` at purchase time, because the price at the moment of sale is a distinct historical fact from the current catalog price; this is not denormalization, it is capturing the right fact. I index `order_items(order_id)` and `orders(user_id, created_at)`.

**Are the joins fine?** For most reads, yes. Rendering one order joins `orders` to `order_items` to `products` via primary and foreign keys, which is a few indexed seeks, single-digit milliseconds. Joins would fail if I sharded `orders` by user and `products` globally, because rendering history would then scatter-gather across shards.

**Denormalize the hot page.** The order-history page is read-heavy and product data is slow-changing, so I build an `order_history` read model: one row per line item carrying `order_id, user_id, status, created_at, product_name, quantity, line_total_cents`. Now the page is a single indexed range scan on `(user_id, created_at DESC)` with zero joins, which scales to very high read QPS.

**Cost and how I pay it.** The copies must stay consistent. `product_name` is now duplicated, so a rename is a **fan-out write**: I update the catalog, then backfill the read model asynchronously (a job or CDC stream), accepting brief staleness on a cosmetic field. I do NOT copy `unit_price_cents` from the catalog, since the historical sale price never changes. Order status does change, so status updates must propagate to the read model; I drive that off the same order-events stream.

**The managed middle ground.** Rather than hand-code the fan-out, I can define `order_history` as a **materialized view** over the normalized tables and refresh it incrementally, or maintain it via a CDC pipeline (Debezium to a denormalized table). This keeps the source of truth normalized while the database (or pipeline) owns the copy.

**Common wrong turn:** denormalizing the whole schema up front "for speed" with no measured hot path, which trades guaranteed write-time complexity for a read win nobody needed. Denormalize the one page that is actually hot, and only after naming its read/write ratio.

**Self-check rubric:**
- [ ] Did I give a normalized 3-table core with correct keys and indexes?
- [ ] Did I capture sale-time price as a distinct fact rather than joining to current price?
- [ ] Did I denormalize specifically the read-heavy page and justify it with a read/write ratio?
- [ ] Did I name the cost (fan-out write, update anomaly) and how the copy is kept in sync?
- [ ] Did I mention materialized views or CDC as the managed middle ground?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the data model for the Amazon-scale "Your Orders" page where the `orders` service is sharded by `customer_id` across hundreds of nodes and must render a customer's last 50 orders in under 100 ms at p99, while the product catalog is a separate, globally replicated service. Show exactly where you refuse to join and what you denormalize instead.

**Model answer (revealed on demand):**

Assume hundreds of millions of customers, orders sharded by `customer_id` (so all of one customer's orders live on one shard), and a catalog service owned by a different team, replicated globally, that I cannot join against from the orders shard.

**Where I refuse to join.** The hard constraint is that orders and catalog live in different services and different shard maps. A join from an order shard to the catalog would be a cross-service, cross-shard network fan-out per line item: unacceptable at a 100 ms p99. So the "Your Orders" read path performs **zero** live catalog joins.

**What I denormalize.** At order-placement time I snapshot the display fields I will need forever: `product_title`, `image_url`, `unit_price_cents`, `quantity` into the order-item record on the customer's shard. These are captured facts (title and price as of purchase), so they are correct to freeze and never need a catalog lookup on read. The "Your Orders" page becomes a single-shard query: `WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`, served from the local shard with an index on `(customer_id, created_at DESC)`, comfortably under 100 ms.

**Handling change.** If the catalog corrects a title or the image CDN URL rotates, I do not rewrite history for cosmetic drift; the snapshot is the record of what the customer bought. Mutable fields the page must show live, such as current delivery status or return eligibility, are stored on the order itself (same shard) and updated via the order-events stream, never fetched from another service on render.

**Scale and hotspots.** Sharding by `customer_id` keeps each customer's history co-located and spreads load evenly, since no single customer is a hotspot the way a celebrity product would be. For the rare very-high-order customer, the `LIMIT 50 + index` bound keeps the query cheap regardless of lifetime order count.

**Trade acknowledged.** I accept snapshot staleness on cosmetic catalog fields in exchange for a join-free, single-shard, sub-100 ms read. The wrong turn here is trying to preserve normalization purity by calling the catalog service per line item, which turns one page load into 50 cross-service RPCs and blows the latency budget.

### sd-l2-access-pattern-modeling: Query-First Data Modeling

- **id:** `sd-l2-access-pattern-modeling`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** access-patterns, modeling, nosql

#### Learn

Relational modeling starts with entities: you draw the nouns (users, orders, products), normalize them, and trust the query planner to join them together at read time. NoSQL modeling inverts this completely. In a system like DynamoDB or Cassandra there is no join and no flexible query planner, so if you model entities first and hope to query them later, you will find that the query you need is impossible or requires a full-table scan. The mindset shift is: **list the access patterns first, then design keys and tables so each pattern is a single lookup.**

Start by writing every read and write your feature performs, as concrete sentences: "list a user's conversations, most recent first," "load the last 50 messages in a thread," "get the unread count per conversation." Each of these must become one query against one partition. If any access pattern would require scanning or a scatter-gather, the model is wrong, not the database.

The core tool is the **composite primary key**: a **partition key** plus a **sort key**. The partition key decides which physical node (partition) the item lives on; everything with the same partition key is stored together, sorted by the sort key. This is how you co-locate related data so a range read is one lookup. To store a thread's messages, you set partition key = `THREAD#<id>` and sort key = `MSG#<timestamp>`; "load the last 50 messages" is then a single `Query` on that partition, `ScanIndexForward=false`, `Limit=50`. No join, one partition, one round trip.

Modeling relationships is about **embedding versus referencing**. A **one-to-many** where the many are always read with the one, and are bounded, can be **embedded**: store the child items in the same partition as the parent (same partition key, distinct sort keys), so one query returns the parent and children together. If the many are large or unbounded, or read independently, you **reference**: give them their own partition and store just an id. A **many-to-many** (users in many groups, groups have many users) is handled with an **adjacency-list** pattern or a global secondary index that lets you query the relationship from both directions.

**Interview nuance:** the tell of a weak NoSQL answer is designing a `users` table, a `conversations` table, and a `messages` table that mirror a relational schema, then discovering you cannot list a user's conversations without a scan. The strong answer often puts multiple entity types in **one table** (single-table design), keyed so each access pattern hits one partition.

The failure mode you must actively design against is the **hot partition**. Because the partition key routes to a physical node with a throughput ceiling (DynamoDB caps a single partition around 3,000 read and 1,000 write units per second), a key that concentrates traffic becomes a bottleneck no matter how much total capacity you provision. A celebrity user's thread, or a partition key of `status=ACTIVE` that every write touches, will throttle. You spread heat by choosing a high-cardinality partition key and, for known-heavy keys, **write sharding**: append a suffix (`THREAD#123#<0..9>`) to fan one logical partition across ten physical ones, then scatter-read the ten on the way out.

**Secondary indexes** buy you additional access patterns without a second table. A **global secondary index (GSI)** has its own partition and sort key over the same items, so you can query by a different attribute (list conversations by `user_id` even though the base table is keyed by conversation). GSIs are eventually consistent and cost extra write capacity (every base write replicates to the index), so you add them per access pattern, not by default. A **local secondary index (LSI)** shares the partition key but offers an alternate sort key, and can be strongly consistent.

Recap: enumerate access patterns first, turn each into a single-partition lookup using composite partition and sort keys, choose embedding versus referencing by how the related data is read, design the partition key to avoid hot partitions, and add secondary indexes only to serve a named additional access pattern.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the primary keys and item layout for the top 3 access patterns of a chat app (list conversations, load a thread, unread counts).

**Think about:**
- What are the access patterns, and how does each become a single lookup?
- How do partition key + sort key co-locate related data?
- How do you avoid a hot partition in the key design?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume DynamoDB single-table design, chat with direct and small group conversations, and the three named access patterns. I write them first as one-lookup requirements:

1. **List a user's conversations, most recent activity first.**
2. **Load the last N messages in a thread.**
3. **Get a user's unread count per conversation.**

**Base table (messages, embedded in the thread partition).** For access pattern 2, partition key `PK = THREAD#<threadId>`, sort key `SK = MSG#<ts>`. All messages of a thread are co-located and sorted by time, so "load last 50" is one `Query` with `ScanIndexForward=false, Limit=50`. New messages are appends, which are cheap.

**Membership and conversation list.** For access pattern 1, I store a membership item per (user, thread): `PK = USER#<userId>`, `SK = CONV#<lastActivityTs>#<threadId>`, with attributes for the conversation title and the peer. Querying `PK = USER#<userId>` with descending sort returns that user's conversations already ordered by recency, in one lookup. When a new message arrives, I update the member items' `lastActivityTs` (rewriting the sort key) so ordering stays correct; for small group sizes this fan-out write is bounded and fine.

**Unread counts.** For access pattern 3, I keep a counter on each membership item: `unreadCount`. On a new message I atomically `ADD unreadCount 1` for every member except the sender; when a user opens a thread I reset theirs to 0. Reading pattern 3 is then free, it comes back with the conversation list from pattern 1, no extra query.

**Co-location.** The design leans on partition+sort keys twice: messages co-located under `THREAD#`, and a user's conversations co-located and pre-sorted under `USER#`. Each access pattern is exactly one `Query`.

**Hot partitions.** A busy group thread concentrates writes on one `THREAD#` partition. If a thread can exceed ~1,000 writes/sec I write-shard it: `PK = THREAD#<id>#<shard 0..N>` chosen by message hash, and scatter-read N shards for history. Membership writes spread naturally across `USER#` partitions because they are keyed per user.

**Common wrong turn:** mirroring a relational schema (separate users, conversations, messages tables) and then needing a scan to list a user's conversations, or computing unread counts on read by scanning a thread.

**Self-check rubric:**
- [ ] Did I list the access patterns before designing keys?
- [ ] Does each of the 3 patterns resolve to a single partition Query?
- [ ] Did I use composite partition + sort keys to co-locate and pre-sort data?
- [ ] Did I maintain unread counts as a counter rather than computing on read?
- [ ] Did I identify the hot-partition risk (busy thread) and give a write-sharding fix?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the DynamoDB key schema for Slack-scale messaging where a single channel can have 500,000 members and a viral message triggers hundreds of thousands of unread-count updates in seconds. Show how you keep "list my channels," "load channel history," and "unread badge" as single lookups without a hot partition melting down.

**Model answer (revealed on demand):**

Assume hundreds of millions of users, channels up to 500k members, and fan-out spikes when a message lands in a mega-channel. The naive design (increment an `unreadCount` on every member item per message) means one message = 500k writes, which both melts write capacity and is pointless work for users who are offline.

**History (channel partition, write-sharded).** `PK = CHAN#<id>#<shard>`, `SK = TS#<ts>`, shard chosen by hash of message id across, say, 16 shards. A mega-channel's writes spread across 16 physical partitions, staying under the per-partition write ceiling; "load history" scatter-reads the 16 shards and merges by timestamp, still a bounded, low-latency read.

**List my channels.** `PK = USER#<id>`, `SK = CHAN#<lastActivityTs>#<channelId>` for membership items, so a user's channel list is one pre-sorted `Query` keyed by the user, which spreads load perfectly across users.

**Unread badge without 500k writes.** I do not fan out a per-member counter on every message. Instead each channel stores a monotonic `lastMessageSeq`, and each membership item stores the user's `lastReadSeq`. Unread is computed as `lastMessageSeq - lastReadSeq` at read time, which comes back with the channel-list query, so one message is a single write (bump the channel's `lastMessageSeq`) instead of 500k. Reading a channel updates only that one user's `lastReadSeq`. This converts an O(members) write into O(1).

**Why this beats the counter design.** The per-member counter is correct but has catastrophic write amplification on mega-channels; the seq-difference approach makes writes independent of membership size and reads still single-lookup. The trade is that a per-message mention badge (distinct from unread) still needs targeted fan-out, but that is a small set (people actually @-mentioned), which is exactly the kind of bounded fan-out that is fine.

**Common wrong turn:** treating a 500k-member channel like a 5-member DM and fanning out counters, or keeping channel history on one partition key and throttling the moment a channel goes viral.

### sd-l2-keys-ids-constraints: Keys, IDs & Constraints

- **id:** `sd-l2-keys-ids-constraints`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** ids, keys, sharding

#### Learn

An ID looks like the most trivial column in the table. It is actually one of the highest-leverage decisions you make, because the primary key drives physical storage layout, index locality, and how the data shards, and all three are painful to change once the table is large.

**The monotonic-key hotspot.** Auto-increment integer keys are compact, sort naturally, and give great index locality: because new rows have ever-increasing keys, they cluster at the right edge of the B-tree. That same property is a curse at write scale. In an InnoDB-style **clustered index**, rows are physically stored in primary-key order, so if the key is monotonic, every insert lands on the same rightmost page and, worse, the same shard. You get a **write hotspot**: one page or one node absorbs all the insert traffic while the rest sit idle. Auto-increment also leaks information (competitors count your order volume) and does not work cleanly across multiple write nodes that would collide on the next value.

**The random-UUID cure that causes a new disease.** The obvious fix is a random **UUIDv4**: 128 bits of randomness, generated anywhere with no coordination, no information leak, no collision. But UUIDv4 destroys index locality. Because values are random, every insert lands on a random B-tree page, so the working set of pages you must keep in memory balloons, pages split constantly, and the index **fragments**. On a large table this can multiply write cost and index size several-fold. Using a random UUIDv4 as a clustered primary key is one of the most common and expensive modeling mistakes.

**Time-ordered IDs, the actual answer.** You want the coordination-free, information-hiding property of a UUID with the locality of a sequential key. That is exactly what **ULID** and **UUIDv7** provide: a high-order timestamp prefix (millisecond) followed by random bits. Because the prefix increases with time, new IDs are roughly ordered, so they cluster like an auto-increment for locality, while the random suffix keeps them collision-free and generatable anywhere. **Snowflake** IDs (Twitter's scheme: timestamp + machine id + per-ms sequence, packed into 64 bits) give the same time-ordering plus an embedded shard/worker id, at the cost of needing worker-id coordination. Rule of thumb: default to ULID/UUIDv7 for distributed primary keys; use Snowflake when you want a compact 64-bit id and already have worker-id assignment.

**Interview nuance:** if you propose random UUIDs, expect "what does that do to your clustered index," and if you propose auto-increment, expect "how does that shard." The answer that ends the line of questioning is "ULID/UUIDv7: time-ordered for locality, random-tailed for distribution, coordination-free."

**Natural vs surrogate keys.** A **natural key** is a real-world attribute (email, ISBN, SKU). A **surrogate key** is a synthetic id with no business meaning. Prefer surrogate keys for entity primary keys, because natural attributes change (people change emails) and a primary key should be immutable and stable as a foreign-key target. Keep the natural attribute as a `UNIQUE` constraint, not the PK. **Composite keys** (multiple columns forming the key) are right when the identity truly is the combination, for example a junction table keyed by `(order_id, product_id)`.

**Constraints are guardrails, not decoration.** They enforce invariants at the one place nothing can bypass: the database. `NOT NULL` stops missing data, `UNIQUE` stops duplicate emails, a `FOREIGN KEY` stops orphaned rows and dangling references, and a `CHECK` (for example `quantity > 0`, `status IN (...)`) stops invalid values regardless of which service wrote them. Application-level validation is not a substitute, because a second service or a manual fix can write around it.

**Data types encode correctness.** Store **money as decimal/integer cents, never float**, because binary floating point cannot represent 0.10 exactly and will drift by cents over millions of rows. Use **timezone-aware timestamps** (`timestamptz`, stored UTC) so events order correctly across regions. Size integers to the domain (a `bigint` id, a `smallint` for a bounded enum). Finally, decide **soft vs hard delete**: a `deleted_at` timestamp (soft delete) preserves history and audit trails and lets you undo, at the cost of every query filtering `WHERE deleted_at IS NULL`; a hard delete reclaims space and simplifies queries but loses the record. Pick soft delete when history or recovery matters, hard delete for high-churn or privacy-mandated erasure.

Recap: avoid monotonic keys for hotspots and random UUIDv4 for fragmentation, default to ULID/UUIDv7 (or Snowflake) for time-ordered distributed IDs, use surrogate keys with natural attributes as unique constraints, enforce invariants with DB constraints, and pick types that encode correctness (decimal money, timezone-aware timestamps, soft vs hard delete).

#### Apply: think, then answer (save, then reveal)

**Prompt:** Choose a primary-key/ID strategy for a distributed order service and explain its impact on index locality and sharding.

**Think about:**
- Why do monotonic keys cause write hotspots on B-trees?
- How do ULID/UUIDv7 restore time-ordering without random-UUID fragmentation?
- Which constraints and data types protect integrity (money, timestamps)?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume an order service that must scale writes across multiple nodes/shards, generate ids without a central sequence, and support "list a customer's recent orders" efficiently.

**ID choice: ULID (or UUIDv7).** I reject auto-increment first: in a clustered index every insert lands on the same rightmost page and, once sharded by id, the same node, creating a write hotspot, and it needs central coordination to avoid collisions across nodes. I reject random UUIDv4 next: it is coordination-free but random values scatter inserts across the whole B-tree, fragmenting the index, causing constant page splits, and inflating the in-memory working set, which on a large orders table multiplies write cost. **ULID** gives me both properties I want: a millisecond timestamp prefix so ids are time-ordered (new orders cluster like an auto-increment, giving good index locality and cheap "recent orders" range scans) and a random suffix so ids are collision-free and generatable on any node with no coordination. UUIDv7 is the standardized equivalent and equally fine.

**Sharding impact.** Because the id is time-ordered, sharding directly on the raw id would send all current writes to one shard (the newest time-prefix range), recreating the hotspot. So I shard on `customer_id` (hash), which spreads writes evenly and co-locates a customer's orders for the "list my orders" query, while keeping ULID as the primary key for locality within a shard. This separates the routing key (customer) from the storage-ordering key (ULID).

**Keys.** Surrogate ULID PK for `orders`; `order_number` (a human-facing natural value) kept as a separate `UNIQUE` column, not the PK, since it may be formatted or change. The line-items table uses a composite identity `(order_id, line_no)`.

**Constraints.** `FOREIGN KEY(customer_id)` to prevent orphaned orders, `CHECK(quantity > 0)`, `CHECK(status IN ('pending','paid','shipped','cancelled'))`, `NOT NULL` on money and status, `UNIQUE(order_number)`. These live in the DB so a second service cannot write around them.

**Types.** Money as `bigint` cents (or `numeric`), never float, to avoid rounding drift. `created_at timestamptz` in UTC for cross-region ordering. Soft delete via `cancelled_at`/`deleted_at` because order history is audit-relevant, with queries filtering it out.

**Common wrong turn:** using UUIDv4 as the clustered PK and discovering write amplification and index bloat in production, or sharding on the time-ordered id and hotspotting the newest shard.

**Self-check rubric:**
- [ ] Did I reject both auto-increment (hotspot) and UUIDv4 (fragmentation) with the mechanism?
- [ ] Did I choose ULID/UUIDv7 and explain time-ordering plus coordination-free generation?
- [ ] Did I separate the shard/routing key from the storage-ordering key?
- [ ] Did I use surrogate PK with the natural value as a unique constraint?
- [ ] Did I specify money as decimal/cents and timezone-aware UTC timestamps?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Choose the ID and key strategy for a payments ledger at Stripe scale that must generate globally unique ids across dozens of regions with no coordination, guarantee no double-charge on retries, and keep money math exact. Show the ID scheme, the idempotency mechanism, and the constraints and types that make correctness enforceable in the database.

**Model answer (revealed on demand):**

Assume a ledger writing across dozens of regions, clients that retry on timeout, and zero tolerance for a lost cent or a double charge.

**ID scheme.** I use **UUIDv7/ULID** for internal row ids: time-ordered for index locality on the append-heavy ledger, random-tailed for collision-free generation in every region with no central sequence and no coordination round trip. I avoid Snowflake here only because it requires worker-id assignment across dozens of regions; if that infrastructure existed, its compact 64-bit ordered id would also be defensible. Public-facing object ids get a prefixed opaque form (`ch_<base32>`) so the type is visible and the internal id is not leaked.

**No double-charge: idempotency keys.** The double-charge risk comes from retries, not id generation. The client sends an **idempotency key** (a UUID it picks per logical charge attempt). I store it in an `idempotency_keys` table with a `UNIQUE` constraint on the key, plus the stored response. The first request inserts the key inside the same transaction that writes the charge; a retry hits the unique-constraint violation, and I return the stored original response instead of charging again. The uniqueness is enforced in the database, so even two concurrent retries racing across regions cannot both succeed. This is the mechanism, not "check if it exists then insert," which has a TOCTOU race; the unique constraint is the atomic guard.

**Money math.** Amounts are stored as **integer minor units** (`bigint` cents, or `numeric(20,0)`), never floating point, because binary float cannot represent 0.10 and would drift over a ledger of billions of rows. Currency is a separate `char(3)` column, and a `CHECK` guards it. Every ledger entry is immutable and append-only; corrections are new reversing entries, never updates, and I enforce double-entry with a `CHECK`/trigger that debits and credits sum to zero per transaction.

**Constraints and types that carry the correctness.** `UNIQUE(idempotency_key)`, `FOREIGN KEY` from entries to accounts, `CHECK(amount_minor <> 0)`, `NOT NULL` on amount/currency/account, `timestamptz` UTC for global ordering, and hard append-only (no soft delete on a ledger; reversals instead). The point is that the invariants live in the database, where no service, retry, or manual fix can bypass them.

**Common wrong turn:** relying on application-code checks to prevent double charges (racy under retries), or storing money as float and reconciling penny drift later.
