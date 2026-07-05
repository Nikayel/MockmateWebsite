> Module **sd-l3-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l3-m3](./sd-l3-m3.md) · Next: [sd-l3-m5](./sd-l3-m5.md)

# L3 · CDN, Search & Geo

After this module you can push bytes to the edge and shield a fragile origin with a multi-tier CDN, stand up a dedicated search tier backed by an inverted index and keep it in sync with your source of truth, extend that tier with vector and hybrid retrieval for semantic recall plus exact matching, and index millions of points on a sphere so "find things near me" and k-nearest-neighbor queries stay fast without hot-spotting.

### sd-l3-cdn-scale: CDN & Edge Caching at Scale

- **id:** `sd-l3-cdn-scale`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** cdn, edge, origin-shield

#### Learn

A CDN exists to do two things: move bytes physically closer to users so latency drops, and absorb read traffic so your origin never sees the full load. A user in Sydney fetching from a single us-east-1 origin pays roughly 150 to 250 ms of round-trip time per request; an edge PoP 20 ms away turns that into a snappy response and, because the object is cached, the origin never handles the request at all.

There are two CDN fill models. A **pull CDN** is lazy: the edge fetches from origin on the first miss for an object, caches it, and serves subsequent hits locally. A **push CDN** is eager: you publish objects into the CDN ahead of demand. Pull is the default for almost everything because it is self-managing; push is reserved for large predictable launches (a game patch, a video premiere) where you want the object warm everywhere before the flood.

The structure that actually protects a fragile origin is a **multi-tier hierarchy**: many L1 edge caches close to users, a smaller set of L2 regional PoPs behind them, and a single **origin shield** in front of the origin. The shield is the key trick. When a popular object expires, thousands of edges could each miss and hammer the origin simultaneously (a "thundering herd"). The shield **coalesces** those misses: it lets one request through to origin, holds the others, and fans the single response back out. On a burst the origin sees thousands of QPS instead of millions. Set `stale-while-revalidate` so the edge keeps serving the slightly stale object while one background fetch refreshes it, and the user never waits on the origin.

```
  users -> [ L1 edge PoPs ] -> [ L2 regional ] -> [ origin shield ] -> origin
   millions of QPS            coalesced misses      ~1 fetch/object     protected
```

Invalidation is where teams get burned. You have three tools. **TTL expiry** is simplest but coarse (the object is stale until it ages out). **Explicit purge** is precise but slow to propagate globally and easy to over-use. The production default is **versioned or content-hashed URLs**: `app.4f9c2a.js` instead of `app.js`. A new deploy is a new URL, so you can cache the old one forever (immutable) and never purge; the HTML that references it gets a short TTL. This sidesteps invalidation almost entirely.

**Cache-key normalization** decides your hit rate. By default the key is the full URL including query string, so `?utm_source=twitter` and `?utm_source=email` are two cache entries for one image. Strip tracking params, normalize casing, and only `Vary` on headers that actually change the body (like `Accept-Encoding`). Vary on `Cookie` and your hit rate collapses to near zero.

**Interview nuance:** the sharpest question is "what can you cache and what must you never cache?" Static assets and public semi-dynamic HTML: yes, with **micro-caching** (a 1 to 5 second TTL on the homepage still collapses a 100k-QPS spike to ~20 origin fetches/sec). Personalized or authenticated responses: never at a shared edge, or you leak one user's account page to another. Do personalization with **edge compute** (Cloudflare Workers, Lambda@Edge) that assembles a cached shell plus a small per-user fragment, or with ESI-style composition.

Recap: use a pull CDN with an L1/L2/shield hierarchy so the shield coalesces misses down to ~1 fetch per object, prefer versioned URLs over purging, normalize cache keys, micro-cache semi-dynamic HTML with stale-while-revalidate, and never cache authenticated bodies at a shared edge.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design content delivery for a media site serving images, video, and semi-dynamic HTML to a global audience, where the origin is fragile and cannot absorb spikes.

**Think about:**
- How does an origin shield coalesce fetches to protect the origin?
- How do you invalidate: TTL, purge, or versioned URLs?
- What dynamic content is cacheable, and what must never be cached?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: global readership, read-heavy, traffic is spiky (an article can go viral), origin is a modest app+DB tier that falls over above a few thousand QPS.

High-level design: front everything with a **pull CDN** (CloudFront, Cloudflare, or Fastly) in a **multi-tier hierarchy**: L1 edges near users, L2 regional PoPs, and an **origin shield** as the single choke point in front of origin. On a viral spike the shield **coalesces** all edge misses for a hot object into one origin fetch and fans the response back, so the origin sees thousands of QPS, not millions.

Content classes and caching:
- **Images and video**: immutable, content-hashed keys (`img/9af3c1.jpg`), cached at the edge with long TTLs. Video is served as **HLS/DASH segments**, each segment cached independently. This is the bulk of bytes and it never touches origin after the first fill.
- **Semi-dynamic HTML** (article pages, homepage): cacheable with **micro-caching**, a 1 to 5 second TTL plus `stale-while-revalidate`, so a 100k-QPS burst collapses to ~20 origin fetches/sec while readers still get fresh-enough pages.
- **Authenticated/personalized responses** (logged-in account, cart): never cached at a shared edge. Use **edge compute** to stitch a cached public shell with a per-user fragment, or mark them `private, no-store`.

Invalidation: default to **versioned URLs** so a new asset is a new URL that can be cached immutably; reserve **explicit purge** for the rare "take this down now" case; use **TTL** for the micro-cached HTML. Normalize the cache key: strip UTM/tracking query params and only `Vary` on `Accept-Encoding`, never on `Cookie`.

Key tradeoff: micro-caching trades a few seconds of staleness for surviving spikes, which is almost always worth it for a media site. Common wrong turn: caching a personalized or authenticated response at a shared edge (leaking user A's page to user B), or forgetting cache-key normalization so query-string variants shatter the hit rate.

**Self-check rubric:**
- [ ] Multi-tier hierarchy with an origin shield that coalesces misses is named and justified.
- [ ] Invalidation strategy leads with versioned URLs, with TTL and purge in support.
- [ ] Explicitly separates cacheable (static + micro-cached HTML) from never-cache (authenticated) content.
- [ ] Mentions cache-key normalization and stale-while-revalidate.
- [ ] Flags the personalized-response-at-shared-edge wrong turn.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the edge delivery for a live sports streaming event like a World Cup final peaking at 5 million concurrent viewers, where the origin encoder produces new HLS segments every 2 seconds and cannot be hit by more than a few thousand requests per second. Lead with how a fresh, uncacheable-by-age segment still shields the origin.

**Model answer (revealed on demand):**

Assumptions: single global live event, ~5M concurrent viewers, adaptive bitrate ladder (240p to 4K), new 2-second segments produced continuously, origin encoder fragile.

The hard part: unlike static media, every segment is brand new, so there is no warm cache when 5M players request `seg_1050.ts` in the same 2-second window. The answer is **request coalescing at the origin shield plus a tiered hierarchy**. All 5M requests fan into L1 edges, then L2, then a shield that lets exactly one request per segment through to the encoder origin and holds the rest. The origin sees roughly (segments per second) x (bitrate ladder size) fetches, on the order of a few dozen QPS, not millions.

Manifest handling: the HLS **playlist manifest** updates every 2 seconds and is the one genuinely dynamic object. Cache it with a **~1 to 2 second TTL** so players poll the edge, not origin; even a 1-second micro-cache collapses millions of manifest polls to one origin fetch per second.

Prewarming: because segments are predictable, **push** each new segment to L2 PoPs the instant the encoder emits it, so the first viewer request is already a hit. Use `stale-while-revalidate` so a late manifest refresh serves the last good version rather than stalling playback.

Scale math: 5M viewers x ~5 Mbps average rendition is ~25 Tbps of egress, which only a large CDN footprint can serve, so this is multi-CDN across providers with DNS/steering-based failover. Key tradeoff: a 2-second segment size trades latency (viewers are ~6 to 10 seconds behind live) for cacheability and resilience; shrinking segments cuts latency but multiplies request rate and origin risk. Common wrong turn: caching the manifest with a long TTL (viewers freeze on stale playlists) or skipping the shield (the encoder melts on segment rollover).

### sd-l3-search-inverted-index: Full-Text Search & the Inverted Index

- **id:** `sd-l3-search-inverted-index`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** search, inverted-index, elasticsearch

#### Learn

A relational `WHERE description LIKE '%wireless headphone%'` cannot power real search: it does a full scan, cannot rank by relevance, cannot handle typos or word stems, and dies at scale. That is why a **dedicated search tier** exists. Its core data structure is the **inverted index**: instead of mapping a document to its words, it maps each word (term) to a **posting list** of the documents that contain it. Query "wireless headphones" and the engine intersects the posting lists for `wireless` and `headphone` in milliseconds, no scan required.

Terms do not go into the index raw; they pass through an **analysis pipeline**. Tokenize the text into words, lowercase them, **stem** ("running", "ran", "runs" all collapse to "run"), drop stopwords, and expand **synonyms** ("tv" also indexes as "television"). The same analyzer must run at index time and query time so the terms match. Typo tolerance comes from **fuzzy matching** (edit distance) or n-gram indexing, so "hedphones" still finds "headphones".

```
  doc: "Wireless Bluetooth Headphones"
   -> analyze -> [wireless, bluetooth, headphone]
  inverted index:
    headphone -> [doc7, doc19, doc204, ...]
    wireless  -> [doc7, doc44, doc204, ...]
  query "wireless headphone" -> intersect posting lists -> [doc7, doc204] ranked by BM25
```

Ranking is what makes results feel good. The default is **BM25** (a refined TF-IDF): a term matters more when it is rare across the corpus (high IDF) and appears often in a short document (term frequency, length-normalized). On top you apply **boosting** (title matches worth more than description, in-stock and popular items lifted) and **filters**. Crucial distinction: a **query** contributes to the relevance score (does this match, how well); a **filter** is a yes/no constraint (brand = Sony, price < 100) that does not score and, because it is deterministic, is **cached as a bitset** and reused cheaply across requests. Facets (counts per brand/category) and highlighting come from the same index.

At scale you run **Elasticsearch or OpenSearch**, which shards the index. A shard is a self-contained inverted index (a Lucene index); documents are **routed** to a primary shard by hash of the id, and each primary has **replica shards** for read throughput and failover. A 50M-document catalog might use 10 primaries; you size shards to keep each in the tens-of-GB range because oversharding wastes memory and overhead.

The other half of the lesson is **keeping the index in sync**. Search is **not a system of record**. The truth lives in your primary DB (Postgres); the index is a **derived, rebuildable store**. You feed it with a **CDC / indexing pipeline**: capture DB changes (Debezium on the binlog, or an application event) onto a stream, and an indexer applies them to Elasticsearch. This is **eventually consistent**, so a product edit shows in search a second or two later, which is fine. Because it is derivable, you plan for **full reindexing**: mapping changes (a new analyzer, a new field) require building a fresh index and switching an **alias** over atomically, with zero downtime.

**Interview nuance:** the classic trap is **deep pagination**. `from: 100000, size: 10` forces every shard to sort 100,010 docs and is O(offset). Use **`search_after`** (a cursor on the last sort value) for deep result sets, and cap the max page. Also be ready to say why you would not make Elasticsearch your primary DB: weaker durability and consistency guarantees, and no transactions.

Recap: search runs on a dedicated tier built on an inverted index plus an analysis pipeline, ranks with BM25 and boosting, separates scoring queries from cached filters, shards across primaries and replicas, stays in sync as an eventually-consistent derived store fed by CDC, and paginates deep sets with `search_after`, never large `from` offsets.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design search for an e-commerce catalog of 50M products with typo tolerance, filters, and relevance-ranked results, including how the index stays in sync with the product database.

**Think about:**
- What is the analysis pipeline (tokenize, stem, synonyms) and inverted index?
- How do you keep the index in sync with the DB?
- Why is search not a system of record?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 50M products, high read QPS with bursty spikes, product data owned by a relational primary (Postgres), search must tolerate typos, support faceted filtering, and rank by relevance.

High-level design: a dedicated **Elasticsearch/OpenSearch** cluster holds an **inverted index** of products. At index and query time, run an **analysis pipeline**: tokenize, lowercase, **stem**, drop stopwords, and expand a curated **synonym** list ("tv" -> "television"). Typo tolerance via **fuzzy matching** (edit distance 1 to 2) or edge n-grams for autocomplete.

Sharding: route 50M docs across ~10 primary shards (tens of GB each) with 1 to 2 **replicas** per primary for read throughput and HA; documents route by product id hash.

Query shape: the free-text term is a scored **query** ranked by **BM25**, with **boosting** (title > description, in-stock and high-rating products lifted). Structured constraints (brand, price range, category, availability) are **filters**, not queries: they do not affect score and are **cached as bitsets**, so repeated "Sony under $100" filters are nearly free. Return **facets** (counts per brand/category) and **highlighting** from the same request.

Sync: the DB is the **system of record**; the index is a **derived, rebuildable store**. Capture product changes via **CDC** (Debezium on the DB log) or app-emitted events onto Kafka; an indexer service applies them to Elasticsearch. This is **eventually consistent** (a second or two of lag), which is acceptable for a catalog. Support **full reindexing**: for a mapping/analyzer change, build a new index and flip a read **alias** atomically for zero-downtime.

Why not use search as the primary store: it offers weaker durability and consistency and no transactions, and its schema/analysis is tuned for retrieval, not for being the truth. If it corrupts or a mapping changes, you rebuild it from the DB.

Key tradeoff: eventual consistency (fast, resilient indexing) versus read-your-write freshness, which you paper over per-session if needed. Common wrong turn: deep offset pagination (`from: 100000`) that sorts the whole prefix on every shard (use **`search_after`** cursors instead), or treating the search index as your system of record when it is a derived read model you rebuild from the source of truth, never the other way around.

**Self-check rubric:**
- [ ] Names the inverted index and a concrete analysis pipeline (tokenize, stem, synonyms, fuzzy).
- [ ] Separates scored queries (BM25 + boosting) from cached filters, and returns facets.
- [ ] Describes shard/replica layout sized to the 50M-doc corpus.
- [ ] Keeps the index in sync via CDC/event pipeline and calls it eventually consistent.
- [ ] States search is a derived store, plans reindex-via-alias, and avoids deep `from` pagination.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design log and event search for an observability platform like Datadog or Elastic Observability ingesting 2M log lines per second across thousands of customers, where engineers run ad-hoc keyword and field queries over the last 15 minutes constantly and over the last 30 days occasionally. Lead with the index layout that makes recent data fast and old data cheap.

**Model answer (revealed on demand):**

Assumptions: 2M events/sec ingest, write-once read-many, queries skew heavily to recent data, strict cost pressure at petabyte scale, multi-tenant.

Index layout: use **time-based indices** with an **ILM (index lifecycle management)** rollover, e.g. one index per hour or per size threshold, aliased as `logs-write` and `logs-read-*`. This is the whole game: a query for the last 15 minutes touches one or two small, hot shards, and 30-day queries can be bounded and parallelized. It also makes deletion an O(1) **drop-the-index** operation instead of expensive per-document deletes.

Hot-warm-cold tiering: recent indices live on **hot nodes** (fast NVMe, in memory) for low-latency writes and reads; after a day they migrate to **warm nodes** (cheaper disk, fewer replicas); after a week to **cold/frozen** tier backed by object storage (searchable snapshots on S3) where query latency is seconds but storage is 10 to 20x cheaper. This matches the access pattern: recent is hot and pricey, old is cold and cheap.

Ingest and sharding: buffer through **Kafka** to absorb 2M/sec spikes and decouple producers from indexing; route by tenant + time so one noisy customer does not hotspot a shard, and cap shard size. Force-merge and reduce replicas on rolled-over indices to shrink footprint.

Query: mostly filters (service, host, level, time range) plus keyword match, so lean on **cached filter bitsets** and time pruning. Key tradeoff: cheaper cold storage means slow historical queries, which is the right call because engineers tolerate a few seconds for a 30-day search but never for a live incident. Common wrong turn: one giant append-only index (deletes and retention become impossible and every query scans everything) or keeping all data on hot nodes (cost explodes at petabyte scale).

### sd-l3-vector-hybrid-search: Vector, Semantic & Hybrid Search

- **id:** `sd-l3-vector-hybrid-search`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** vector-search, hybrid-search, rag

#### Learn

Keyword (BM25) search matches tokens. Ask it "my card was declined" and it will not find a document titled "payment authorization failed" because the words do not overlap. **Vector search** fixes this. An **embedding model** maps text into a dense vector (say 768 or 1536 dimensions) where semantically similar text lands close together. Now "declined card" and "payment authorization failed" are near neighbors even with zero shared words. Retrieval becomes: embed the query, find the nearest document vectors by cosine similarity.

Exhaustively comparing the query to every vector is O(N) and too slow at millions of docs, so you use an **approximate nearest neighbor (ANN)** index. The two workhorses are **HNSW** (a navigable small-world graph, excellent recall and latency, high memory) and **IVF** (inverted file, cluster the space and search a few clusters, lower memory, tunable recall). ANN trades a little **recall** (occasionally missing a true nearest neighbor) for a massive latency win; you tune parameters (`efSearch`, `nprobe`) to sit where you want on the recall/latency/memory curve. This lives in a vector store (pgvector, Pinecone, Weaviate, Milvus, or Elasticsearch's dense_vector).

The catch: pure vector search is **bad at exact tokens**. Error code `E-4021`, SKU `SKU-99183`, version `v2.14.0`, a person's exact name, these are precisely where semantic similarity fails, because the embedding blurs the exact string. That is why production systems use **hybrid search**: run **BM25 for exact/lexical matching** and **dense vectors for semantic recall** in parallel, then combine.

You cannot just add the scores: BM25 scores are unbounded and dataset-dependent, cosine similarity is bounded 0 to 1, so summing them is meaningless. The clean fix is **Reciprocal Rank Fusion (RRF)**, which ignores raw scores and fuses by **rank**: each result gets `1 / (k + rank)` from each list (k ~ 60) and the sums are combined. A document ranked high by either method surfaces, and the incompatible score scales never touch.

```
  query --> [ BM25 exact match ]   --> ranked list A
        \-> [ embed -> ANN vectors ] --> ranked list B
                          \-> RRF fuse by rank -> top-k
                                        \-> cross-encoder rerank -> top-n
```

The second production upgrade is **retrieve-then-rerank**. First-stage retrieval (BM25 + ANN) is cheap and optimized for **recall**: cast a wide net, fetch the top ~100 candidates. Then a **cross-encoder reranker** (a model that reads the query and each candidate together, far more accurate but far more expensive) reorders just those 100 to produce a precise top 5 to 10. You get the recall of cheap retrieval and the precision of an expensive model, without running the expensive model over the whole corpus.

**Interview nuance:** two operational realities interviewers probe. **Freshness and metadata filtering**: you often must restrict to `product_id = X` or `updated_at > T`. Prefer **pre-filtering** (filter the candidate set, then ANN) when the filter is selective, and be aware naive **post-filtering** can return too few results after ANN. **Re-embedding cost**: if you change the embedding model, every vector must be recomputed and reindexed, which for hundreds of millions of docs is a real migration, so you version embeddings and roll over like a search alias.

Recap: use embeddings + an ANN index (HNSW/IVF) for semantic recall, run it alongside BM25 for exact tokens like codes and IDs, fuse the two by rank with RRF (never by raw score), add a cross-encoder reranker over the top-k for precision, and plan for metadata filtering and the migration cost of re-embedding.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design retrieval for a support and knowledge base that must match paraphrased questions plus exact error codes and version numbers, and return the most relevant articles.

**Think about:**
- Why combine dense vectors with BM25, and how are the scores fused?
- What does a retrieve-then-rerank pipeline add?
- How do you handle freshness and metadata filtering?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a KB of tens to hundreds of thousands of articles, queries are a mix of natural-language paraphrases ("my payment won't go through") and exact tokens (`E-4021`, `v2.14.0`), latency budget in the low hundreds of ms, articles updated continuously.

High-level design: a **hybrid retrieval** pipeline. Chunk articles into passages and index them two ways. (1) **BM25 / inverted index** for exact lexical matching, which is what catches error codes, SKUs, and version numbers that embeddings blur. (2) **Dense embeddings + ANN** (HNSW in pgvector, Weaviate, or Elasticsearch dense_vector) for semantic recall so paraphrases match the right article even with no shared words.

Fusion: run both retrievers in parallel and combine with **Reciprocal Rank Fusion (RRF)**, which fuses by rank (`1/(k+rank)`, k ~ 60) rather than raw score, because BM25 scores are unbounded and cosine is 0 to 1, so summing them directly is meaningless.

Two-stage precision: first stage retrieves a wide net of ~100 candidates optimized for **recall**; a **cross-encoder reranker** then reads the query with each candidate and reorders them into a precise **top 5 to 10**. This buys the recall of cheap retrieval plus the precision of an expensive model, run only over 100 items, not the whole corpus.

Freshness and filtering: index updates flow through the same CDC/event pipeline as the article store (eventually consistent, seconds of lag). Apply **metadata filters** (product, version, locale, `is_published`) as **pre-filters** when selective so ANN searches only the valid subset; avoid naive post-filtering that can starve results.

Key tradeoff: reranking adds tens of ms and model cost per query, worth it for a support surface where a wrong top result means a filed ticket. Migration reality: changing the embedding model forces **re-embedding and reindexing every passage**, so version embeddings and roll over via an alias. Common wrong turn: relying on raw vector similarity alone with no exact-match path (so `E-4021` returns vaguely-related payment articles) and no reranker (so the top result is only approximately right).

**Self-check rubric:**
- [ ] Runs BM25 (exact tokens) and dense ANN (semantic) together, with a reason for each.
- [ ] Fuses by rank with RRF and explains why raw-score addition fails.
- [ ] Adds a retrieve-then-rerank stage (cross-encoder over top-k) for precision.
- [ ] Handles metadata pre-filtering and freshness via the sync pipeline.
- [ ] Names the re-embedding migration cost and the no-exact-match wrong turn.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the retrieval layer for a coding assistant's RAG over a company's 20M-file private codebase and docs, where a query might be "how do we rotate service credentials" or an exact symbol like `AuthTokenRefresher.refresh()`, and answers must never leak one team's private repos to another. Lead with how you keep exact-symbol matching and per-repo access control correct.

**Model answer (revealed on demand):**

Assumptions: 20M files, mixed natural-language and exact-symbol queries, strict per-user/per-repo authorization, low-latency IDE completions, code and docs updated on every commit.

Exact-symbol correctness: code retrieval lives or dies on exact tokens, so **BM25 (or a symbol index) is first-class**, not an afterthought. `AuthTokenRefresher.refresh()` must match that exact symbol, which embeddings blur badly. Index code with a **code-aware analyzer** (split camelCase and snake_case, keep the raw symbol), and build a dedicated **symbol/definition index** from the parser (ctags/LSP/tree-sitter) so definitions and references are exact lookups. Run dense embeddings in parallel for conceptual queries like "rotate service credentials," and **fuse with RRF**, then **rerank** the top ~100 with a cross-encoder for precision.

Access control (the load-bearing part): retrieval must be **security-trimmed**. Attach `repo_id` and ACL/visibility metadata to every chunk and apply it as a **pre-filter** so the ANN and BM25 candidate sets only ever contain repos the user can read. Never post-filter after ranking (that risks timing leaks and starved results), and never let the reranker or the LLM see a chunk the user cannot access. Enforce ACLs at query time from the authoritative permission service, not from stale cached grants, because repo access changes.

Freshness: index on **commit via CDC/webhooks**, chunk by function/symbol, and re-embed only changed files. Key tradeoff: per-repo pre-filtering shrinks the candidate pool and can hurt recall for broad queries, which is the correct trade because a leak is catastrophic and a slightly narrower result set is not. Common wrong turn: a single shared index queried then filtered afterward (leaks via ranking side channels and counts), or leaning on vector similarity alone so exact symbol lookups fail.

### sd-l3-geospatial-indexing: Geospatial Indexing: Geohash, Quadtree, S2 & H3

- **id:** `sd-l3-geospatial-indexing`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** geospatial, indexing, data-modeling

#### Learn

"Find drivers near me" looks trivial and is a scaling trap. The naive query, `SELECT ... WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?` or worse a full distance scan over every row, cannot use a normal B-tree index effectively (two independent range predicates) and does not scale past a small table. Worse, distance on a sphere is not Euclidean. The real problem is turning a **2D nearest-neighbor query into a 1D or hierarchical key** you can index, shard, and range-scan.

The foundational trick is **geohash**. Interleave the bits of latitude and longitude and encode them base-32 into a short string. The magic property: **nearby points share a prefix**. `9q8yy` and `9q8yz` are adjacent cells; truncating the string zooms out (fewer characters = bigger cell). This means a geohash stores trivially in **any B-tree or a Redis sorted set** and **shards by prefix**, and a proximity query becomes a prefix range scan. The flaw is **boundary problems**: two points a meter apart can straddle a cell edge and share almost no prefix. The fix is to query the target cell **plus its 8 neighbors** (a 3x3 ring) so you never miss a nearby point across a boundary.

```
  geohash "9q8yy" and neighbors (query a 3x3 ring to avoid edge misses):
     9q8yw 9q8yx 9q8yz
     9q8yt [9q8yy] 9q8zn      <- center cell + 8 neighbors
     9q8ym 9q8yq 9q8yr
```

**Quadtree** takes a different tack: recursively subdivide space into four quadrants, but only where it is dense. A downtown block splits into fine cells while an ocean stays one coarse cell. This **adapts to non-uniform density**, so no cell holds too many points, at the cost of maintaining and rebalancing a tree rather than doing flat key math.

Two production systems refine this. **S2 (Google)** projects the sphere onto a cube and orders cells along a **Hilbert curve**, giving excellent spatial locality (nearby cells have nearby ids, so range scans are tight) and true spherical geometry, with 30 levels of precision. **H3 (Uber)** tiles the world in **hexagons**. Hexagons matter because every neighbor is equidistant (a square has 4 close and 4 diagonal neighbors), which makes movement, coverage, and radius queries cleaner, exactly what a rideshare or delivery system wants.

The central tuning knob is **cell size (precision) versus cell count**. Finer cells hold **fewer points**, so each cell scan is cheap, but a radius query must **enumerate more cells** to cover the area, and boundary rings grow. Coarser cells mean fewer cells to enumerate but each holds many points to scan and filter. The rule of thumb: pick a resolution near your **typical query radius**, and query a **ring of neighbor cells** to cover the radius and dodge boundary misses. Then do a final exact-distance filter and sort on the small candidate set.

The failure mode that separates seniors from juniors is the **hot cell**. A dense downtown or a stadium at concert-end becomes a single cell with a huge point set: a hotspot on both writes (drivers pinging every few seconds) and reads. Fixes: **subdivide adaptively** (quadtree, or drop to a finer S2/H3 resolution just for that cell), **cap points per cell**, **shard hot cells separately** so one node does not carry Manhattan, and **cache** popular cell results.

**Interview nuance:** for moving points, storage and refresh matter as much as the index. Keep `cell_id -> set of driver_ids` in **Redis** (a sorted set or a per-cell set) and refresh a moving driver on a **short TTL** so stale positions age out; the source of truth for a driver's live position is the fast store, not your durable DB.

Recap: encode points into a prefix-shareable or hierarchical cell key (geohash, S2, H3) so 2D proximity becomes an indexable/shardable range query, query the cell plus a neighbor ring to beat boundary misses, tune cell size to your query radius (fine = cheap scans but more cells), and defuse hot cells by adaptive subdivision, per-cell caps, separate sharding, and caching. For rideshare-style moving points, H3 or S2 with `cell_id -> points` in Redis on a short TTL.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the spatial index for a "find drivers near me" query over millions of moving points, and justify a choice among geohash, quadtree, S2, and H3 for range and k-nearest-neighbor lookups.

**Think about:**
- How do you turn a 2D nearest-neighbor query into a 1D or hierarchical key you can index and shard?
- How does cell size trade recall (missing a nearby point) against cost (scanning too many points)?
- What happens to a dense downtown cell, and how do you keep it from becoming a hotspot?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: millions of points, some static (restaurants, pickup spots) and many moving (drivers updating position every few seconds), queries are "drivers within radius R" and "nearest K drivers," latency budget low tens of ms.

Turning 2D into an indexable key: map each point to a **cell id** so proximity becomes a range/hierarchical lookup. **Geohash** interleaves lat/lng bits into a base-32 string where nearby points share a prefix, so it stores in any B-tree or a Redis sorted set and **shards by prefix**. Its boundary problem (adjacent points across a cell edge diverge) is handled by querying the center cell **plus its 8 neighbors** (a 3x3 ring), then doing an exact haversine distance filter and sort on the candidates.

Precision tradeoff: pick a cell resolution near the **typical query radius**. Finer cells hold fewer points (cheap per-cell scans) but a radius query must enumerate more cells and larger neighbor rings; coarser cells enumerate fewer cells but each holds more points to scan. State the tradeoff explicitly and size to the common case (e.g. a ~1 km cell for city pickups).

Hot cells: a downtown or event cell becomes a hotspot on writes and reads. **Subdivide adaptively** (drop to a finer S2/H3 level or a quadtree there), **cap points per cell**, **shard hot cells onto separate nodes**, and **cache** their results.

Choice and storage: for moving points I pick **H3 (or S2)** over plain geohash. H3's hexagons give **uniform neighbor distance**, which makes ring queries and movement cleaner; S2's Hilbert-curve ordering gives tight range scans and true spherical geometry. Store `cell_id -> set of driver_ids` in **Redis** and refresh each moving driver on a **short TTL** so stale positions expire; the durable DB is not in the hot path.

Key tradeoff: geohash is simplest and shards trivially but has ugly boundaries; H3/S2 cost a library and cell math but pay off for moving points and radius coverage. Common wrong turn: a bounding-box `SELECT` or full distance scan over all rows, which ignores the sphere's geometry and does not scale.

**Self-check rubric:**
- [ ] Encodes points to a cell key so 2D proximity becomes an indexable, shardable lookup.
- [ ] Queries the cell plus a neighbor ring and does a final exact-distance filter/sort.
- [ ] Explains the cell-size vs cell-count (recall vs scan cost) tradeoff and ties it to query radius.
- [ ] Handles hot cells with adaptive subdivision, per-cell caps, separate sharding, and caching.
- [ ] Justifies a concrete choice (H3/S2 for moving points) and states Redis + short-TTL storage.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the geospatial layer for a ride-matching system like Uber at 5M active drivers pinging their location every 4 seconds and 1M rider "cars near me" queries per second at peak, where surge zones create extreme density spikes. Lead with how you absorb the write storm and keep dense cells from hot-spotting.

**Model answer (revealed on demand):**

Assumptions: 5M drivers x a ping every 4 seconds is ~1.25M location writes/sec, ~1M proximity reads/sec, geographically skewed (dense cities, surge events), sub-50ms match latency.

Write storm: driver pings are **high-volume, low-durability** updates, so the live position store is an **in-memory grid**, not the primary DB. Keep `h3_cell -> {driver_id: (lat, lng, ts)}` in **Redis** (sharded by cell) with a **short TTL** (e.g. 10 s) so a driver who stops pinging ages out automatically and no delete is needed. Buffer/ingest pings through a streaming layer if you also need them durably (Kafka to a warehouse), but the match path reads only the memory grid.

Index and reads: use **H3** at a resolution matched to city pickup radius. A "cars near me" query resolves the rider's cell, gathers the cell plus a **ring of neighbors** (`kRing`) to cover the radius, unions the driver sets, then does exact distance + ETA ranking on the small candidate set. Because H3 cell ids are the shard key, reads and writes for a city colocate.

Hot cells (the crux): surge zones and airports overload a single cell. **Shard by cell so dense cells spread across nodes**, and for a pathologically hot cell **drop to a finer H3 resolution** locally so it splits into many sub-cells, **cap** drivers scanned per cell, and **cache** the recent nearby-driver result for a second (riders a block apart get the same answer). Precompute surge-zone cell sets.

Key tradeoff: a short TTL and in-memory grid trade durability (a crashed Redis shard loses live positions, rebuilt in one ping cycle) for the throughput to absorb 1.25M writes/sec, which is the right call because positions are ephemeral anyway. Common wrong turn: writing every ping to the durable DB (it melts) or a single global index without per-cell sharding (surge cells hotspot one node).
