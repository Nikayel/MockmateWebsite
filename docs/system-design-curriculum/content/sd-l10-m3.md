> Module **sd-l10-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l10-m2](./sd-l10-m2.md) · Next: [sd-l10-m4](./sd-l10-m4.md)

# L10 · Geo, Media & Collaboration

After this module you can walk an interviewer through five of the most-asked case studies end to end: ride matching over moving objects, cross-device file sync, upload-to-playback video at global scale, real-time collaborative editing, and read-heavy proximity search. Each teaches a transferable core (spatial indexing, content-defined chunking, transcoding and CDN economics, convergence under concurrent writes, and denormalized read models) that recurs far beyond the named product.

### sd-l10-ride-sharing: Design a Ride-Sharing Service (Uber)

- **id:** `sd-l10-ride-sharing`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** ride-sharing, geospatial, dispatch

#### Learn

Ride-sharing is the canonical "moving objects" system. The defining property is that hundreds of thousands of drivers each emit a location update every 4 to 5 seconds, and riders ask "who is near me right now" against that constantly-changing set. Both the write rate and the spatial query are the hard parts, and a naive `SELECT ... WHERE lat BETWEEN ? AND ? AND lng BETWEEN ?` full scan collapses immediately: a bounding-box scan over millions of rows with no spatial index is O(n) per query, and you have thousands of queries per second.

The fix is a **spatial index** that maps 2D coordinates to a 1D sortable key so "nearby" becomes a range or key lookup. The options interviewers expect you to compare:

- **Geohash**: interleaves lat/lng bits into a base-32 string; a shared prefix means spatial proximity. Simple and stringy, but has edge effects (two close points can straddle a cell boundary and share no prefix), so you always query the cell plus its 8 neighbors.
- **Quadtree**: recursively splits space into 4 quadrants, adapting depth to density. Great for skewed distributions (dense downtown, empty suburbs) but is a tree you must maintain in memory.
- **S2 (Google)** and **H3 (Uber)**: project onto a space-filling curve (S2 uses a Hilbert curve on a sphere; H3 uses hexagons). Hexagons matter because every neighbor is equidistant, which makes "expand the search ring" uniform. Uber built and open-sourced H3 for exactly this.

For writes, the trick is to **not** treat driver locations as durable database rows. Locations are ephemeral: you only ever care about the latest one. Keep the live index in memory (Redis geospatial commands, or a sharded in-memory service) and treat the write as an overwrite, not an append. Shard the index **by geography** (city or region), because a rider in Chicago never needs a driver in Miami. Regional sharding keeps each shard's write volume and index size bounded and lets you scale cities independently.

```
driver app --loc every 4s--> location ingest --> in-memory geo index (Redis/H3), sharded by city
rider request --> matching engine --> query index (cell + neighbor ring) --> rank candidates --> offer --> trip FSM
```

The **dispatch/matching engine** does candidate generation (query the rider's H3 cell and its neighbor rings until it has enough drivers), then ranks by ETA (not raw distance, because a driver across a river is far by road), driver acceptance likelihood, and supply-demand balance. **Surge** is a pricing signal computed per cell from the ratio of open requests to available drivers. Once a driver accepts, a **trip state machine** (requested -> accepted -> arrived -> in-progress -> completed) becomes the source of truth, and this part **does** need durable, strongly consistent storage because it maps to money.

**Interview nuance:** the assignment must be exclusive. If you offer the same driver to two riders you double-book. Use a short lock or conditional write on the driver's state so only one match wins, and expire the offer if the driver does not accept in a few seconds so the driver returns to the pool.

**Interview nuance:** hot cities (New Year's Eve downtown) concentrate load on one shard. Degrade gracefully by lowering location-update frequency (QoS) and widening the matching radius under load rather than dropping updates blindly.

Recap: index moving drivers with a space-filling spatial index (H3/S2/geohash) sharded by geography, keep locations in memory as overwrites, and rank matches by ETA under an exclusive-assignment lock, with the trip state machine as the one strongly consistent part.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design ride matching that pairs a rider with the nearest available driver and tracks live locations at city scale.

**Think about:**
- Which spatial index (geohash, quadtree, S2, H3) fits nearby queries?
- How do you handle high-frequency driver location writes?
- How does the matching/dispatch engine and trip state machine work?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assume a large city with roughly 100k active drivers, each sending a location every 4 seconds (about 25k location writes/sec), and tens of thousands of ride requests per hour with a p99 match latency target under 2 seconds.

High-level design: three planes. A **location ingest plane** takes driver pings and updates an in-memory geospatial index. A **matching plane** answers "nearest available driver" queries. A **trip plane** owns the durable ride lifecycle.

For the spatial index I choose **H3** (hexagonal cells): a driver's location maps to a cell id, and a rider query reads its own cell plus expanding neighbor rings until it collects enough candidates. Hexagons give uniform neighbor distance so ring expansion is even. I shard the index **by city/region** so each shard's write and query volume stays bounded, and I keep it in **Redis (or a custom in-memory service)** treating each driver's location as an overwrite, not an append, since only the latest matters and durability is unnecessary for ephemeral positions.

Location writes: 25k writes/sec is fine for an in-memory overwrite index. I do not persist every ping to a durable DB; that would be pointless write amplification. I only persist trip-relevant location snapshots (pickup, drop-off, breadcrumb sampling for support/billing) to something like Cassandra.

Matching: candidate generation via H3 ring query, then rank by **road-network ETA** (not straight-line distance), acceptance likelihood, and supply balance. Assignment must be **exclusive**: I use a conditional update on the driver's availability so only one match claims a driver, with a few-second offer TTL that returns unaccepted drivers to the pool. Surge multiplier is computed per cell from request/supply ratio.

The **trip state machine** (requested -> matched -> arrived -> in-progress -> completed/canceled) lives in a strongly consistent store because it drives billing; state transitions are idempotent and event-sourced so a retry does not double-charge.

Key tradeoffs: in-memory index trades durability for speed (acceptable, positions are ephemeral); regional sharding trades cross-region flexibility for bounded load. Common wrong turn: a lat/lng bounding-box SQL scan, which is O(n) per query and cannot meet the latency target at this write and read rate.

**Self-check rubric:**
- [ ] Named a real spatial index (H3/S2/geohash/quadtree) and justified the choice for nearby queries
- [ ] Treated driver locations as in-memory overwrites, not durable appended rows
- [ ] Sharded the live index by geography
- [ ] Made driver assignment exclusive (lock/conditional write + offer TTL)
- [ ] Ranked by ETA/road distance, not straight-line, and separated the durable trip FSM from the ephemeral index
- [ ] Called out the naive bounding-box scan as the wrong turn

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design DoorDash-style dispatch where a single courier can carry multiple orders (batching) across a metro of 5 million people, and one dispatch decision must jointly consider restaurant prep time, courier location, and multiple in-flight deliveries. Explain how the matching objective and index differ from single-rider Uber matching.

**Model answer (revealed on demand):**
Assumptions: a metro with tens of thousands of active couriers and hundreds of thousands of daily orders, where a courier may hold 2 to 3 orders and pickups happen at restaurants (clustered points), not arbitrary rider locations.

The spatial index is the same idea (H3 cells, sharded by metro), but the **matching objective changes from nearest-driver to route optimization**. Instead of "closest available courier," dispatch solves a constrained assignment: minimize total delivery time and courier idle miles while respecting food-ready times and per-order lateness. This is effectively an online vehicle-routing problem, so I run a batch optimizer every few seconds per region rather than matching each order instantly. Delaying assignment by 30 to 90 seconds is deliberate: it lets the optimizer see more orders and batch two deliveries onto one courier heading the same direction.

Key additions over Uber: (1) a **restaurant prep-time model** so a courier is dispatched to arrive when food is ready, not before (idle courier) or after (cold food); (2) a **batching engine** that groups orders with compatible routes and time windows; (3) each courier carries a small route (ordered list of pickups and drop-offs), so the state machine is per-stop, not a single trip. I keep courier live positions in the same in-memory H3 index, but candidate generation also filters by remaining capacity and current route detour cost.

Tradeoffs: batching lowers cost per delivery and raises courier utilization but risks lateness on the first order, so the optimizer bounds added delay per order. Common wrong turn: greedily assigning each order to the nearest free courier the instant it arrives, which forbids batching and produces far worse total efficiency at metro scale.

### sd-l10-file-sync: Design a File Sync & Storage Service (Dropbox)

- **id:** `sd-l10-file-sync`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** file-sync, chunking, dedup

#### Learn

File sync looks like "upload files to the cloud," but the entire difficulty is in **not** uploading files. A 2GB video where a user changes one tag should cost a few kilobytes of network, not 2GB. Two people uploading the same popular PDF should cost one copy of storage. Editing offline on a laptop and a phone must reconcile without silently losing an edit. The core techniques are chunking, dedup, delta sync, and conflict resolution.

**Content-defined chunking (CDC).** Instead of splitting a file into fixed 4MB blocks, CDC uses a rolling hash (Rabin fingerprint) over a sliding window and cuts a chunk boundary wherever the hash matches a pattern, yielding variable-size chunks averaging, say, 4MB. Why variable? Because if you insert one byte near the front of a file, fixed-size blocks all shift and every block hash changes, so the whole file re-uploads. CDC boundaries are anchored to content, so inserting a byte only changes the one chunk containing it; every other chunk keeps its old hash. Each chunk is hashed (SHA-256); the hash is both its content-address and its dedup key.

**Dedup.** Store each unique chunk hash exactly once in the object store. A file becomes a **manifest**: an ordered list of chunk hashes. If two files (or two users, with global dedup) share chunks, they share storage. **Delta sync** falls straight out: to sync a changed file the client computes the new manifest, sends only the hashes to the server, the server replies which hashes it already has, and the client uploads only the missing chunks.

```
file --CDC--> [c1][c2][c3][c4]   each chunk -> SHA-256 -> content address
manifest = [h1, h2, h3, h4]
edit near start -> only c1 changes -> new manifest [h1', h2, h3, h4] -> upload 1 chunk
```

**Metadata service.** Separate from blob storage, a metadata DB tracks: the file tree (paths, folders), each file's current manifest (chunk list) and version, per-device sync cursors, and sharing/ACLs. This is the coordination brain and needs strong consistency (a client must never see a manifest pointing at chunks that are not yet uploaded). The usual ordering: upload chunks to the object store first, then commit the metadata that references them. Blobs live in S3-style object storage plus a CDN for downloads; metadata lives in a sharded relational or document store.

**Conflict resolution.** Each file has a version vector or a monotonically increasing version per file. When a client uploads based on version N but the server is already at N+1 (someone else edited), that is a conflict. Dropbox's pragmatic answer is not to merge binary files: it keeps both, creating a "conflicted copy" (yourname's conflicted copy), so no edit is lost. For an append-only or text case you could do smarter merges, but the safe default is keep-both plus full version history so nothing is destroyed.

**Client sync protocol.** A local filesystem watcher detects changes, an upload queue chunks and pushes, a download queue applies remote changes, and a persisted cursor tracks the last-seen server state so an interrupted sync resumes instead of rescanning everything. Offline edits queue locally and reconcile on reconnect against the server version.

**Interview nuance:** the tempting-but-wrong move is to compute deltas on the server. You cannot, because the server does not have the client's new bytes until they are uploaded. The client computes the manifest and asks the server which chunks are missing (a "have/need" negotiation), so the expensive comparison happens before any bulk transfer.

Recap: content-defined chunking plus per-chunk hashing gives dedup and delta sync (upload only changed chunks), a strongly consistent metadata service maps files to chunk manifests and versions, and conflicts are resolved by keeping both copies plus history rather than merging blindly.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a service that syncs a user's files across devices, uploading only changed chunks and resolving conflicts.

**Think about:**
- How does content-defined chunking + hashing enable dedup and delta sync?
- What does the metadata service track?
- How do you detect and resolve conflicts and keep versions?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: hundreds of millions of files per large user base, files ranging from tiny docs to multi-GB videos, multiple devices per user syncing near-real-time, and a hard goal that a small edit costs proportionally small bandwidth.

API: `commit(file_path, base_version, manifest[])` where manifest is the ordered chunk-hash list; `have_chunks(hashes[]) -> missing[]`; `put_chunk(hash, bytes)`; `list_changes(cursor) -> {changes, new_cursor}`.

Data model: a **metadata store** (sharded SQL or a document DB) holds the file tree, and per file the current version plus manifest, and per device a sync cursor. A **chunk store** (S3-style, content-addressed by SHA-256) holds unique chunks once. A CDN fronts downloads.

Upload path: the client runs **content-defined chunking** (Rabin rolling hash, ~4MB average) so an insert only rewrites the affected chunk, hashes each chunk, and calls `have_chunks` to learn which are missing. It uploads only missing chunks, then commits the new manifest with `base_version`. The server commits metadata **after** confirming chunks exist, so a manifest never dangles. Global dedup means a chunk uploaded by anyone is instantly "have" for everyone (with per-user access still enforced at the metadata layer).

Conflict resolution: `commit` is a conditional write on `base_version`. If the server has advanced, it is a conflict; the safe default is **keep both** (create a conflicted copy) and retain full version history, so no edit is lost. Text-specific merges are an optimization, not the default.

Sync protocol: a filesystem watcher feeds an upload queue; a `list_changes(cursor)` long-poll feeds a download queue; the persisted cursor makes interrupted syncs resumable. Offline edits queue and reconcile on reconnect.

Tradeoffs: CDC costs client CPU (hashing) to save bandwidth and storage, a good trade. Global dedup saves storage but needs careful access control so a hash guess cannot leak someone's file (the metadata ACL, not chunk possession, gates access). Common wrong turn: re-uploading whole files on any change, or trying to diff on the server before the client has sent its bytes.

**Self-check rubric:**
- [ ] Used content-defined (not fixed-size) chunking and justified why for inserts
- [ ] Hash-addressed chunks and stored each unique chunk once (dedup)
- [ ] Delta sync via a have/need negotiation driven by the client
- [ ] Separated a strongly consistent metadata service (file tree, manifests, versions, cursors) from blob storage, committing metadata after chunks
- [ ] Handled conflicts by keep-both + version history, not blind overwrite
- [ ] Described the client sync loop (watcher, queues, resumable cursor, offline)

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the sync layer for Google Drive / Dropbox handling a 500-person company sharing a 50GB folder of large binary assets (video, CAD files), where dozens of people may edit different files in that shared folder simultaneously. Explain how shared-folder sync and permissions change the design versus single-user sync.

**Model answer (revealed on demand):**
Assumptions: one shared namespace (a team folder) with ~500 members, 50GB of mostly large binaries, high concurrent edit activity across different files (rarely the same file), and a need for fast fan-out so member B sees member A's change within seconds.

Shared folders turn sync from per-user into per-namespace. I model the shared folder as its own **namespace with its own change log** (a monotonic sequence of commits). Every member device holds a cursor into that log and pulls `list_changes(namespace, cursor)`, so a single edit fans out to all 500 members via their cursors rather than N independent copies. Because edits usually hit **different** files, per-file conditional writes on version handle correctness cleanly; genuine same-file conflicts still fall back to keep-both plus history.

Storage and dedup are unchanged and pay off more here: chunk dedup means the 50GB is stored once, and a member who joins syncs by pulling manifests and only the chunks they lack. Large binaries (video, CAD) get big average chunk sizes and parallel multi-connection chunk transfer.

Permissions are the new hard part. ACLs live at the namespace and can be scoped per subfolder. When someone is removed, their device's next `list_changes` must be rejected and its local cached chunks are no longer refreshable; sensitive setups additionally re-key. The metadata layer, not chunk possession, is the access gate, so global dedup is safe.

Fan-out scale: a naive design that pushes every change to every member synchronously would thrash; instead members long-poll their cursor and the server batches notifications. Tradeoffs: a per-namespace log centralizes ordering (simple, consistent) but makes a hyper-active folder a hotspot, mitigated by sharding logs per subtree. Common wrong turn: treating a shared folder as N private copies, which multiplies storage and loses a single consistent ordering of who-changed-what.

### sd-l10-video-streaming: Design Video Streaming / VOD (YouTube/Netflix)

- **id:** `sd-l10-video-streaming`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** video-streaming, transcoding, cdn

#### Learn

Video is two very different problems bolted together: an **asynchronous ingest/transcoding pipeline** (write path, minutes of latency, compute-heavy) and a **delivery path** (read path, milliseconds, bandwidth-heavy, CDN-dominated). Conflating them is the classic mistake. A single 4K source uploaded once may be watched a billion times, so the economics are entirely about the read path and egress cost.

**Ingest and transcoding.** A raw upload lands in object storage (S3). You never serve that file. Instead a job is enqueued (SQS/Kafka) and a fleet of transcoding workers produces an **ABR ladder**: the same content re-encoded at multiple resolutions and bitrates (for example 240p at 400kbps, 480p, 720p, 1080p, 4K), each in modern codecs (H.264 for compatibility, plus H.265/VP9/AV1 for efficiency). Transcoding is embarrassingly parallel: split the video into segments, transcode segments across many workers, then assemble. Each rendition is cut into short **segments** (2 to 10 seconds) and described by a **manifest** (an HLS `.m3u8` or DASH `.mpd`) that lists the available bitrates and segment URLs.

```
upload --> S3 (raw) --> transcode queue --> worker pool (segment-parallel)
   --> renditions [240p 480p 720p 1080p 4K] x segments --> manifest (HLS/DASH) --> object store --> CDN
```

**Adaptive bitrate (ABR).** The player, not the server, drives quality. It downloads the manifest, measures throughput and buffer level, and requests the next 4-second segment at whatever bitrate it can sustain. Bandwidth drops on a train, the player steps down to 480p mid-stream and steps back up later, all by choosing different segment URLs from the same manifest. This is why segmentation and per-bitrate manifests exist: they make quality a client-side, per-segment choice with no server session state.

**CDN and origin offload.** You must not serve segments from origin; a viral video would saturate origin egress and bankrupt you. Segments are cached at CDN edge PoPs close to viewers. Netflix built **Open Connect**, placing its own caches inside ISPs; YouTube uses Google's edge. The cache key is the segment URL, and because segments are immutable you cache them with long TTLs. Only cold or brand-new content misses to origin. For a live spike (a premiere), you pre-warm edges and rely on the CDN's request coalescing so a million viewers of the same segment produce one origin fetch.

**Storage tiering.** The vast majority of the catalog is watched rarely. Keep hot content on fast storage and at many edges; tier cold content to cheaper storage (S3 Infrequent Access / Glacier) and fewer edges, re-warming on demand. Thumbnails and preview scrubbing frames are generated during transcoding and cached like any static asset.

**Metadata and recommendations** are a completely separate serving path from delivery: titles, descriptions, watch history, and the recommendation model live in their own services (often the recommendation system is the actual product). Delivery just needs the manifest and segments.

**Interview nuance:** interviewers love "what happens the instant a video goes viral." The right answer names CDN request coalescing and edge caching absorbing the read fan-out, plus the fact that transcoding already happened once at upload so the spike is pure cached reads, not compute. If you find yourself scaling transcoding for a viral watch spike, you have conflated the write and read paths.

Recap: transcode once, asynchronously, into an ABR ladder of segmented renditions with manifests; let the client adapt bitrate per segment; and serve segments from a CDN (Open Connect-style edge caches) with long TTLs so origin egress stays flat even under viral read spikes.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design upload-to-playback for user videos including transcoding, storage, and adaptive streaming to a global audience.

**Think about:**
- How does the async transcoding pipeline produce an ABR ladder?
- How does the CDN offload origin, and what is cached?
- How do you tier storage for popular vs cold content?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: user-generated video (YouTube-like), hundreds of hours uploaded per minute, a global audience, playback start under ~2s, and read traffic orders of magnitude above write.

API: `initiate_upload` (multipart) -> raw bytes to S3; on completion emit a `video.uploaded` event. Playback: `GET /manifest/{videoId}` returns the HLS/DASH manifest; players then `GET` immutable segment URLs from the CDN.

Ingest pipeline: raw upload to **S3**, which enqueues a transcode job on **Kafka/SQS**. A **worker pool** splits the video into segments and transcodes in parallel into an **ABR ladder** (240p through 4K, H.264 plus AV1/VP9 for efficiency), cutting each rendition into 4s segments and writing a manifest. Jobs are idempotent and retryable; a failed segment re-transcodes without redoing the whole video. Status flows back so the UI shows "processing" until ready.

Storage and delivery: segments and manifests live in object storage as the **origin**, fronted by a **CDN**. Because segments are immutable, they cache with long TTLs; the cache key is the segment URL. New/cold content misses to origin, hot content is served entirely from edge. Netflix-style, the biggest players push caches into ISPs (Open Connect) to cut transit cost.

Adaptive streaming: the **client** measures bandwidth and buffer and picks the next segment's bitrate from the manifest, stepping down on congestion and up on recovery, with no server session state.

Storage tiering: hot titles stay on fast storage and many edges; cold catalog tiers to S3-IA/Glacier and fewer edges, re-warmed on demand. Thumbnails/preview frames are generated during transcode and cached as static assets.

Separation of concerns: **metadata and recommendations** are a distinct serving path from delivery. Tradeoffs: bigger ABR ladders and more codecs improve quality-per-byte and device reach but multiply transcode compute and storage, so you tune the ladder to your audience. Common wrong turn: serving video straight from origin with no CDN, which saturates egress on the first viral video, or scaling transcoding to absorb a watch spike (that is a cached-read problem, not a compute one).

**Self-check rubric:**
- [ ] Async transcoding via a queue + worker pool producing a segmented ABR ladder + manifest
- [ ] Client-driven adaptive bitrate (per-segment, no server session state)
- [ ] CDN edge caching of immutable segments with origin offload, and a viral-spike answer using coalescing
- [ ] Storage tiering for hot vs cold content
- [ ] Delivery path kept separate from metadata/recommendation serving
- [ ] Named the origin-serving-no-CDN wrong turn

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design live streaming for a Super Bowl-scale event: 30 million concurrent viewers watching the same live feed with under 10 seconds of glass-to-glass latency. Explain how live differs from the VOD design above.

**Model answer (revealed on demand):**
Assumptions: a single live source, up to 30M concurrent viewers globally, a latency budget of roughly 5 to 10 seconds (low-latency HLS/DASH), and a hard requirement that one hot moment does not melt the origin.

Live inverts the timing of VOD: transcoding is **real-time and continuous**, not a one-shot batch. The encoder ingests the live feed (via RTMP/SRT), transcodes it on the fly into an ABR ladder, and publishes short segments continuously, rewriting a rolling manifest that lists only the last few segments. Segment duration is a direct latency knob: 2s segments cut latency but raise request rate; low-latency HLS uses partial segments/chunked transfer to push latency toward a few seconds.

The delivery challenge is that **everyone wants the same newest segment at the same instant**, so the CDN's job is request coalescing at massive fan-out: 30M requests for segment N collapse to one origin fetch per edge tier. You use a multi-tier CDN (edge -> mid-tier shield -> origin) so origin sees a handful of requests per segment regardless of viewer count. Pre-provision and pre-warm capacity; live events are scheduled, so you scale ahead rather than react.

Differences from VOD: (1) no complete file exists, so no random seek beyond the DVR window and manifests are rolling, not static; (2) transcoding capacity must be reserved live and cannot fall behind; (3) latency, not just throughput, is a primary SLO; (4) a redundant encoder path and instant failover matter because you cannot re-run a live moment. Tradeoffs: shorter segments and low-latency modes cut delay but increase request volume and reduce coalescing efficiency, so you balance latency against origin protection. Common wrong turn: reusing the VOD assumption that content is fully transcoded and cacheable ahead of time, which is impossible when the segment being requested was encoded one second ago.

### sd-l10-collaborative-editor: Design a Collaborative Editor (Google Docs)

- **id:** `sd-l10-collaborative-editor`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** collaborative-editor, crdt, ot

#### Learn

The whole problem of a collaborative editor is **convergence**: many people edit the same document concurrently, each edit is applied against a slightly different local state, and yet every replica must end up byte-for-byte identical, while preserving what each user intended. Last-write-wins on the whole document is the disqualifying answer: if Alice and Bob both type at the same moment, LWW throws one person's work away.

There are two correct families: **Operational Transformation (OT)** and **CRDTs**.

**Operational Transformation.** Edits are operations like `insert(pos=5, "x")` and `delete(pos=8)`. When two operations are made concurrently against the same base, applying them in different orders gives different results, so OT **transforms** an incoming operation against operations that were applied before it locally, adjusting indices so intent is preserved. If Alice inserts at position 5 and Bob concurrently inserts at position 3, Bob's op shifts Alice's effective position to 6. OT is what Google Docs uses. It is proven and compact, but the transformation functions are notoriously subtle, and classic OT relies on a **central server** to impose a single canonical order of operations, which makes correctness tractable.

**CRDTs (Conflict-free Replicated Data Types).** Instead of transforming operations, CRDTs give every character a globally unique, totally-ordered identifier (often a fractional index or a dense position between two neighbors) so that concurrent inserts have a deterministic, commutative merge order with no transformation needed. Sequence CRDTs (RGA, Logoot, YATA as used by Yjs, Automerge) let replicas merge in any order and converge. The advantage is they work **peer-to-peer and offline** without a central sequencer; the cost is metadata overhead (every character carries an id, and deleted characters may linger as tombstones).

```
OT:   op flows to server -> server orders + transforms against concurrent ops -> broadcasts transformed op
CRDT: each char has a unique id -> ops commute -> any replica merges in any order -> same result
```

The interview framing is the tradeoff: **OT** is server-centric, memory-lean, battle-tested, but the transform logic is fragile and hard to extend to rich data. **CRDTs** are decentralization-friendly and offline-first, conceptually cleaner to reason about for convergence, but carry more per-character metadata and need periodic tombstone garbage collection. For a server-backed product like Docs, OT (or a server-ordered CRDT) is pragmatic; for offline-first or P2P (local-first apps, Figma-like tools), CRDTs shine.

**Real-time transport and presence.** Edits flow over a persistent **WebSocket** to a per-document collaboration server. Beyond the edits themselves, you broadcast **presence**: each user's cursor position and selection, and who is online. Presence is high-frequency but ephemeral and lossy-tolerant (a dropped cursor update just means a slightly stale caret), so you send it on a lighter channel and never persist it.

**Persistence and replay.** You do not save the document as a blob on every keystroke. You append operations to an **op log** and periodically write a **snapshot** so a new joiner can load the latest snapshot plus the tail of ops rather than replaying from creation. Undo/redo and history come from the op log. On reconnect after being offline, the client sends its queued local ops and receives the ops it missed (identified by a version/sequence number), then transforms or merges to catch up.

**Scaling.** All editors of one document must reach the same collaboration server (or a consistent group) so ordering is coherent, so you **route by document id** to a specific server/shard (sticky, consistent-hashed). Different documents scale out horizontally across servers. Access control (who can view/comment/edit) is checked at connect and per operation.

**Interview nuance:** the killer follow-up is offline editing. If a laptop edits offline for an hour and reconnects, you cannot LWW. You must replay/merge the queued ops against everything that happened meanwhile. CRDTs make this natural (merge is commutative); OT requires transforming the whole queued batch against the missed history. Naming this is what separates a real answer from "use WebSockets."

Recap: converge concurrent edits with OT (server-ordered, transform indices, memory-lean, Docs-style) or CRDTs (per-character ids, commutative merge, offline/P2P-friendly), broadcast ephemeral presence over WebSocket, persist an op log plus snapshots for replay and reconnect, and route all editors of a document to one server for coherent ordering.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a document that multiple users edit simultaneously with all edits converging and cursors shown live.

**Think about:**
- What is the OT vs CRDT tradeoff for convergence and intention preservation?
- How do you broadcast presence and cursors in real time?
- How do you persist and replay edits and handle offline reconnection?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: documents edited by up to a few dozen concurrent users, thousands of documents active at once, a hard requirement that no concurrent edit is lost and all replicas converge, and live cursors/presence.

Concurrency model: I choose **server-ordered OT** for a server-backed product (this is Google Docs' approach). Edits are operations (`insert(pos, text)`, `delete(range)`); the server imposes a single canonical order and **transforms** each incoming op against the ops applied since the client's known version, so indices adjust and intent is preserved. I would name CRDTs (per-character unique ids, commutative merge) as the alternative I would pick for an offline-first or P2P product, since they converge without a central sequencer at the cost of per-character metadata and tombstone GC.

Transport: a persistent **WebSocket** from each client to a per-document collaboration server. Two channels: a reliable, ordered channel for document ops (each ack'd with a version number), and a lossy, ephemeral channel for **presence** (cursor position, selection, who is online), which is broadcast frequently and never persisted.

Persistence: append every op to an **op log** and periodically write a **snapshot**. A joiner loads the latest snapshot plus the op tail rather than replaying from zero. Undo/redo and version history derive from the op log.

Reconnection/offline: the client tracks its last-acknowledged version. On reconnect it sends queued local ops and pulls the ops it missed by version; the server transforms its queued ops against the missed history so it converges. This is the case LWW cannot handle.

Scaling and access: route all editors of a document to one server via **consistent hashing on document id** so ordering is coherent; different docs shard horizontally. ACLs (view/comment/edit) are checked at connect and per op. Comments and suggestions are modeled as their own operation types anchored to positions.

Tradeoffs: OT is lean and proven but the transform functions are subtle and centralize ordering; CRDTs decentralize at a metadata cost. Common wrong turn: last-write-wins on the whole document, which silently discards concurrent edits.

**Self-check rubric:**
- [ ] Picked OT or CRDT and articulated the convergence + intention-preservation tradeoff (not just named them)
- [ ] Operations model (insert/delete) with a canonical order or per-char ids, never whole-doc LWW
- [ ] WebSocket transport with a separate ephemeral presence/cursor channel
- [ ] Op log + snapshots for persistence, replay, and history
- [ ] Concrete offline-reconnect reconciliation by version number
- [ ] Routed all editors of a doc to one server (consistent hashing on doc id) and checked ACLs

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the collaboration engine for Figma, where the shared document is not text but a tree of graphical objects (frames, shapes, layers with properties), edited by dozens of designers in real time. Explain why Figma chose a CRDT-style model and how editing a property tree differs from editing a text string.

**Model answer (revealed on demand):**
Assumptions: a design file is a tree of objects (frames containing shapes, each with properties like position, size, fill, and a parent/child and z-order), edited by dozens of designers concurrently, with live multiplayer cursors and instant local feedback.

Figma uses a **CRDT-style model** rather than text OT because the data is a **document tree of objects with typed properties**, not a linear character sequence. Each object has a stable globally-unique id, and each property is a last-writer-wins register keyed by that id: if two designers set the fill of the same shape concurrently, a LWW-register (ordered by a logical timestamp) deterministically picks one and both clients converge, and crucially they edited a **property**, not overlapping text, so the loss is acceptable and bounded. Different objects and different properties never conflict, which is the common case, so most concurrent edits merge with zero contention.

The tree structure adds ordering and parenting concerns absent in text: children under a parent and z-order are modeled as CRDT-ordered lists (fractional indexing between neighbors) so concurrent inserts/reorders converge without index rewrites. Object creation, deletion, and reparenting are operations on the tree; deletion leaves a tombstone so a concurrent edit to a just-deleted object resolves deterministically.

Architecture: a server holds the authoritative document and relays operations; clients apply locally first for instant feedback (optimistic) and reconcile via the CRDT merge, so latency feels zero. Presence (multiplayer cursors, selection) is ephemeral and broadcast separately.

Why not text OT: OT's transform functions are defined for sequence insert/delete and become very hard to generalize to a rich object tree with typed properties, whereas per-object, per-property CRDT registers plus ordered-list CRDTs map naturally onto the data model. Tradeoffs: CRDT metadata per object and tombstones need periodic GC, and LWW-per-property means a genuinely conflicting property edit silently drops one value, which is acceptable for design tooling but would be wrong for, say, financial text. Common wrong turn: treating the design file as a serialized blob and doing whole-file LWW, which loses concurrent edits across unrelated objects.

### sd-l10-yelp-nearby: Design Yelp / Nearby Places (Proximity Search)

- **id:** `sd-l10-yelp-nearby`  ·  **difficulty:** medium  ·  **est:** 40 min  ·  **skills:** geospatial, search, caching, case-study

#### Learn

Yelp's "nearby places" looks like Uber matching at first glance (both are "find things near me"), and the whole lesson is why it is actually the **opposite** workload. In Uber, the points (drivers) move every few seconds, so writes dominate and you keep the index in memory as overwrites. In Yelp, the points (restaurants, shops, POIs) barely move; a place's location changes essentially never, its hours and rating change rarely. The workload is **read-heavy over a mostly-static dataset**, which flips every design decision toward precomputation, denormalization, and aggressive caching.

Scale assumption: tens of millions of POIs, very high read QPS, queries like "coffee within 2km, open now, sorted by rating and distance." The spatial part is only half the query; the other half is **attribute filtering** (category, open-now, price, minimum rating) and **ranking**.

**Spatial index.** You still bucket coordinates into cells (geohash, quadtree, or S2), so a radius query hits a cell plus its neighbors. But instead of a bespoke in-memory geo service, the natural home is a **search engine (Elasticsearch/OpenSearch)** with a native `geo_distance` filter, because it does spatial filtering, attribute filtering, full-text ("coffee"), and ranking in one query. This is the key architectural difference from Uber: Yelp's index is a search index you can rebuild from source, not a volatile live index.

```
source of truth (Postgres/doc store)  --pipeline-->  denormalized read model in Elasticsearch (geo + attrs + text)
place edits/new reviews (low rate) --> update pipeline --> reindex
query --> [ES: geo_distance cell + filters + rank] --> results, with popular (cell,filter) pages cached
```

**Query flow.** (1) Candidate generation: spatial filter by cell/radius. (2) Attribute filter: category, open-now (computed from stored hours plus current time), price band, minimum rating. (3) Rank: a blend of distance, rating, review count/popularity, and sponsored boost. Because "open now" depends on the query time, you either compute it at query time from stored hours or precompute open/closed only for coarse time buckets.

**Storage layers.** Source of truth for places, reviews, and edits lives in a relational or document store. A **denormalized read model** (the ES index) is what queries hit. Place **detail** pages (a specific restaurant's full info) go in a KV cache (Redis). Photos and media sit on a CDN.

**Caching, the heart of the lesson.** Because the underlying data is stable, you cache hard: popular `(cell, filter)` result pages and place-detail pages get **generous TTLs** (minutes to hours). A search for "coffee near downtown SF, open now" is asked constantly and its answer barely changes, so it should be served from cache the overwhelming majority of the time. Invalidate on the rare place update (new hours, closed permanently) rather than expiring everything constantly. Reads scale with **replicas** (ES read replicas) and **CDN edge caching** of common result sets and all media.

**Write path.** New reviews, edits, and new places are comparatively low-rate. They update the source of truth, then flow through an indexing pipeline that updates the ES read model and invalidates affected cache entries. You never optimize this path for high throughput because the workload does not have it.

**Interview nuance:** the trap is to over-engineer the write path. If you find yourself building a high-frequency location-write ingestion system or geofencing with constant updates, you have modeled Yelp like Uber and wasted your design budget on throughput the workload never generates. The senior move is to explicitly state "this is read-heavy and mostly static, so I precompute and cache instead of optimizing writes," which shows you diagnosed the workload before designing.

Recap: nearby-places is read-heavy over a near-static POI set, so serve it from a search engine (geo_distance plus attribute filters plus ranking) fed by a denormalized read model, cache popular result pages and detail pages with generous TTLs invalidated on rare edits, and do not over-build the low-rate write path.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design Yelp's "nearby places" feature: given a user location and filters, return ranked places within a radius, and justify your spatial index, ranking, and caching for a read-heavy, mostly-static dataset.

**Think about:**
- How is this different from Uber matching, where points move every few seconds?
- How do you combine spatial filtering with attribute filters (open now, category, rating) and ranking?
- What is cacheable when the underlying place data barely changes?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: tens of millions of mostly-static POIs, heavy read traffic (think tens of thousands of QPS at peak), and queries like "coffee within 2km, open now, sorted by rating and distance." The defining fact is read-heavy and rarely-changing, which is the opposite of Uber's write-heavy moving points.

Because data barely changes, I **precompute, denormalize, and cache** instead of optimizing location writes. Source of truth for places and reviews lives in a relational or document store; the query-serving layer is a **denormalized read model in Elasticsearch/OpenSearch**, which handles spatial filtering (`geo_distance` over cell-bucketed coordinates), attribute filters, and text in one query.

Query flow: (1) candidate generation by spatial cell/radius; (2) filter by category, open-now (from stored hours plus current time), price, minimum rating; (3) rank by a blend of distance, rating, popularity (review count), and sponsored boost. Spatial index choice: geohash/S2/quadtree buckets so a radius query reads a cell plus neighbors; I lean on ES's native geo support rather than a bespoke in-memory index because, unlike Uber, this index is rebuildable and read-optimized, not volatile.

Caching (the core lever): cache popular `(cell, filter)` result pages and place-detail pages in Redis with **generous TTLs** (minutes to hours) since data is stable, plus CDN edge caching for common result sets and all media. Invalidate on the rare place update rather than expiring aggressively. Scale reads with ES replicas and the CDN.

Write path: new reviews/edits/places are low-rate; they update the source of truth, then an indexing pipeline updates the ES read model and invalidates affected caches. I deliberately do not build high-throughput write ingestion.

Tradeoffs: denormalized read model plus caching trades slight staleness (a just-added review may take seconds to appear) for huge read scalability, which is the right trade here. Common wrong turn: modeling it like Uber with constant location writes and geofencing, over-engineering write throughput the workload never has.

**Self-check rubric:**
- [ ] Explicitly diagnosed the workload as read-heavy/static and contrasted it with Uber's write-heavy moving points
- [ ] Used a search engine (ES/OpenSearch geo_distance) as the denormalized read model, not a bespoke live index
- [ ] Combined spatial filtering with attribute filters (open-now, category, rating) and a ranking blend
- [ ] Cached popular result pages and detail pages with generous TTLs, invalidated on rare edits
- [ ] Kept the write path simple/low-rate through an indexing pipeline
- [ ] Named over-engineering the write path (Uber-modeling) as the wrong turn

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the "restaurants near you, open now, delivering to your address" search for a food-delivery app (Uber Eats scale) where, unlike Yelp, availability is genuinely dynamic: a restaurant can go offline, hit capacity, or stop delivering to your zone within minutes. Explain how you keep Yelp-style read caching while a slice of the data is now fast-changing.

**Model answer (revealed on demand):**
Assumptions: millions of restaurants, very high read QPS, but with **two data velocities**: static-ish attributes (location, menu, cuisine, base hours) that change rarely, and **fast-changing availability** (open/paused, at-capacity, current delivery radius, prep-time estimate) that changes every few minutes.

The core move is to **split the data by velocity** and cache them differently. Static attributes go in the Yelp-style path: a denormalized Elasticsearch read model for spatial plus attribute plus text search, with popular `(cell, filter)` result pages cached at generous TTLs. This gives the candidate set cheaply.

Fast-changing availability goes in a **separate low-latency store** (Redis) keyed by restaurant id, updated by the availability service on each state change with short TTLs (tens of seconds) or push updates. The query does a two-stage flow: ES returns spatial/attribute candidates (cacheable), then a **real-time overlay** joins the live availability from Redis to filter out paused/at-capacity restaurants and those not delivering to the user's zone, and to attach live prep-time. So the expensive spatial/text search stays cached and static, while only a cheap per-candidate availability lookup is real-time.

Delivery-zone filtering adds a geospatial twist: each restaurant has a dynamic delivery polygon/radius, so "delivers to me" is a point-in-polygon check against the user's address, evaluated in the overlay stage against current zones (which can shrink under load).

Tradeoffs: splitting velocities keeps 90% of the work cached while a small, cheap slice is fresh, versus the naive alternative of dropping all caching because "availability changes," which would collapse under read load. The risk is a brief inconsistency (a restaurant paused 5 seconds ago may still show, then get filtered on tap), which is acceptable and far better than uncached search. Common wrong turn: putting fast-changing availability into the ES index and reindexing constantly, turning a read-optimized search index into a high-write hotspot, exactly the Uber-modeling mistake applied to the wrong field.
