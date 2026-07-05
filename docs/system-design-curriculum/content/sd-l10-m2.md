> Module **sd-l10-m2** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l10-m1](./sd-l10-m1.md) · Next: [sd-l10-m3](./sd-l10-m3.md)

# L10 · Social, Feed & Messaging

By the end of this module you can whiteboard the four social-scale classics under interview time pressure: a fan-out timeline with celebrity hot keys, a photo-sharing app that splits blobs from metadata behind a CDN, a real-time chat system with per-conversation ordering and offline delivery, and a reusable multi-channel notification backbone. Each lesson walks requirements to estimation to API to data model to the one deep dive an interviewer actually probes.

### sd-l10-news-feed: Design a News Feed / Timeline (Twitter)

- **id:** `sd-l10-news-feed`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** news-feed, fan-out, celebrity

#### Learn

A home timeline shows a user the recent posts of everyone they follow, newest first, in under 200ms. The entire problem is a read-vs-write cost tradeoff, and the whole interview hinges on the word "fan-out."

**Fan-out-on-write (push).** When Alice posts, you immediately write that post id into the timeline cache of every follower. Reads become trivial: a follower's timeline is a precomputed list you slice with a cursor. The cost moves to write time. If Alice has 200 followers, one post is 200 small writes. That is fine until Alice is a celebrity with 50M followers, at which point a single tweet is 50M writes, a multi-minute fan-out that hammers the cache and delays delivery.

**Fan-out-on-read (pull).** Store each post once keyed by author. When Bob loads his timeline, fetch the recent posts of everyone Bob follows and merge them at read time. Writes are cheap (one insert). Reads are expensive: if Bob follows 2,000 accounts you issue a scatter-gather across 2,000 authors and merge-sort on every timeline load. That blows the 200ms budget for active users.

**The hybrid (the senior answer).** Fan-out-on-write for the common case, fan-out-on-read for celebrities. When you post, you push to normal followers' timelines. Accounts above a follower threshold (say 100K) are marked "celebrity" and are NOT pushed. At read time you take a user's precomputed timeline and merge in the recent posts of the handful of celebrities they follow, pulled live and cached briefly. Most users follow only a few celebrities, so the read-time merge is small and bounded. This caps write amplification and keeps reads fast.

```
Alice posts
  |
  +-- Alice is normal?  push post_id -> timeline:<each follower>   (fan-out-on-write)
  +-- Alice is celeb?   do nothing on write; readers pull her recent posts

Bob loads timeline:
  precomputed timeline:Bob   (Redis list of post_ids)
  + merge recent posts of celebs Bob follows (pulled + cached)
  -> rank -> hydrate post bodies -> return page
```

**Storage.** Posts live once in a partitioned store (Cassandra or a sharded SQL, partitioned by post id or author). Per-user timelines are Redis lists or sorted sets of post ids (not full bodies), capped to a few hundred entries. You hydrate bodies in a second batched lookup. Pagination uses an opaque cursor (last post id or a score), never `OFFSET`, which degrades linearly.

**Ranking.** Chronological is a sorted set scored by timestamp. ML-ranked timelines change the shape: fan-out now delivers candidates, and a ranking service scores them per request using features (author affinity, recency, engagement). You keep fan-out as candidate generation and add a scoring layer, which means the timeline is no longer a simple slice.

**Deletes and edits.** Because post bodies are stored once and timelines hold only ids, a delete is a tombstone on the post; readers filter tombstoned ids at hydration. You do not chase 50M cached copies. This is exactly why timelines store ids, not bodies: it keeps the source of truth single and makes deletes and edits O(1).

**Interview nuance:** The consistency-vs-freshness tradeoff. Fan-out-on-write means a follower may see a post seconds after it is created (async fan-out lag). That is acceptable for a feed. Do not promise read-after-write on someone else's timeline.

Recap: use a hybrid, push posts to normal followers' timelines and pull celebrities at read time, store post ids not bodies so deletes stay cheap, and paginate by cursor.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a home timeline that shows a user the recent posts of everyone they follow, at read latency under 200ms.

**Think about:**
- When do you fan out on write vs on read?
- How does a hybrid handle celebrity accounts?
- How do ranking and deletes/edits change the design?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 300M users, average 200 follows, a heavy read skew (users load their timeline far more often than they post), p99 read under 200ms, feed freshness of a few seconds is acceptable. Estimate: if 10% of users post twice a day that is 60M posts/day, roughly 700 posts/sec average and maybe 10x at peak. Read QPS is far higher, on the order of hundreds of thousands per second.

API: `POST /posts`, `GET /timeline?cursor=<opaque>&limit=20`, `POST /follow`. Timeline returns hydrated posts plus a next cursor.

Data model: `posts(post_id snowflake PK, author_id, body, created_at)` in Cassandra partitioned by post id, giving time-sortable ids for free. `follows(follower_id, followee_id)` and its inverse for fan-out. Per-user timeline as a Redis sorted set `timeline:<user>` scored by post time, capped at ~800 ids.

High-level design: a write path publishes each post to Kafka; a fan-out worker looks up the author's followers. If the author is normal, it pushes the post id into each follower's Redis timeline. If the author is a celebrity (follower count over 100K), it skips fan-out. The read path loads `timeline:<user>`, merges in recent posts from the small set of celebrities the user follows (each celebrity's recent posts cached), ranks (chronological or ML), then batch-hydrates bodies from Cassandra and returns a page by cursor.

Deep dive, the celebrity hot key: pure fan-out-on-write for a 50M-follower account is 50M writes per tweet, which saturates the cache and delays delivery by minutes. The hybrid caps write amplification because celebrities are pulled, and caps read cost because a user follows only a few celebrities.

Tradeoffs: async fan-out means eventual timeline freshness (seconds of lag), which is fine for a feed. Deletes are tombstones filtered at hydration, so a delete is O(1) rather than chasing millions of cached copies.

Common wrong turn: pushing a celebrity's post to all 50M followers on write, exploding write cost and delivery latency. Another: storing full post bodies in every timeline, making edits and deletes an O(followers) rewrite.

**Self-check rubric:**
- [ ] Did you name push vs pull vs hybrid and pick hybrid with a follower threshold?
- [ ] Do timelines store post ids (not bodies), hydrated in a second lookup?
- [ ] Did you cap write amplification for celebrities by pulling them at read time?
- [ ] Is pagination cursor-based, not OFFSET?
- [ ] Did you address deletes/edits and the freshness (async fan-out lag) tradeoff?
- [ ] Did you give rough read vs write QPS numbers?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the timeline for X (Twitter) during a live event like the World Cup final, where a single account (the official league account) with 90M followers posts a goal, and 30M users are refreshing their timeline in the same 60-second window. Explain how you keep both the write and read paths from collapsing.

**Model answer (revealed on demand):**

Assumptions: one hot author (90M followers, celebrity-tier so never fanned out on write), a spike of 30M concurrent readers in a minute, and a demand to see the goal within a few seconds.

Write path: the goal post is one insert into Cassandra. Because the account is celebrity-tier, there is zero fan-out on write, so the "goal tweet" costs one write regardless of 90M followers. This is precisely why the hybrid exists.

Read path is the hard part. 30M readers in 60 seconds is ~500K read QPS, and nearly all of them want the same handful of recent posts from the same hot celebrity. That is a textbook hot key. Mitigations, layered: cache the celebrity's recent-posts list in Redis with hot-key replication (store the key on several replicas / multiple shards, or replicate it into every read-path cache node) so no single Redis node takes 500K QPS. Add request coalescing (single-flight) at the app tier so a cache miss triggers exactly one backend fetch while other requests wait on the same in-flight promise. Put a short-TTL (1 to 2 second) local in-process cache in front of Redis on each app server, which is enough to collapse a burst since the content barely changes second to second.

Serve the hot post body from a CDN or edge cache keyed by post id, since the body is immutable once posted. Ranking can degrade gracefully: during the spike, fall back to chronological merge and drop the expensive ML scoring to protect latency, then re-enable it as load subsides.

Tradeoff: readers may see the goal a second or two apart because of the short local caches, which is an acceptable freshness cost to survive the spike. Common wrong turn: treating this as a write-throughput problem and trying to fan out to 90M timelines, when it is a read hot-key problem solved by cache replication and coalescing.

### sd-l10-instagram: Design Instagram (Photo Sharing)

- **id:** `sd-l10-instagram`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** instagram, blob-storage, cdn

#### Learn

Instagram is a fan-out timeline (you already know that half from the news-feed lesson) bolted onto a media pipeline. The new material is how you store and serve photos and videos, so this lesson leans on the storage and delivery half.

**Split blob from metadata.** The single most important decision: photos go in object storage (S3, GCS), and the database stores only metadata plus a pointer (the object key or URL). A post row is `(post_id, user_id, caption, media_key, created_at, like_count)`, a few hundred bytes. The 3MB photo never enters the database. Storing image bytes in Postgres or MySQL bloats the row store, wrecks buffer-cache hit rates, makes backups enormous, and cannot be served from a CDN. The metadata DB (users, posts, follows) can be a partitioned relational store or a KV store; the media store is separate and optimized for large immutable blobs.

**Presigned uploads.** The naive path streams the photo through your app servers to S3, which doubles bandwidth and makes your app tier a throughput bottleneck. Instead the client asks the app server for a presigned S3 URL, then uploads the bytes directly to S3. Your app servers never touch the image bytes. The app tier does auth and issues a short-lived signed URL; S3 absorbs the upload.

```
Client -> app: "I want to upload" -> app returns presigned PUT URL (+ media_key)
Client -> S3: PUT bytes directly (app never sees them)
S3 event -> queue -> transcode worker: make 1080/640/thumbnail variants
Worker -> writes variant keys; marks post ready; triggers feed fan-out
```

**Async variant generation.** On upload you generate multiple resolutions and a thumbnail (1080w, 640w, 320w, a small square thumb) via a worker triggered by an S3 event through a queue. This is async so the user is not blocked. Clients request the resolution that fits their screen, saving bandwidth. Videos add a transcoding ladder (covered fully in the video lesson).

**CDN for reads.** Media is immutable and read far more than written, the perfect CDN workload. Serve every image and thumbnail through a CDN (CloudFront, Fastly) so 90%+ of reads hit an edge cache near the user and never touch origin. Cache keys are the media URLs; because media is immutable you set long TTLs and use a versioned key if you ever replace it.

**Feed reuse.** The timeline is the same hybrid fan-out from the news-feed lesson: push post ids to normal followers' timelines, pull for celebrity accounts, store ids not bodies, hydrate metadata in a batch, and resolve media URLs to CDN links at render time.

**Counters.** Likes and comment counts on a viral post get millions of increments. A single `UPDATE ... SET like_count = like_count + 1` row is a hot-row contention nightmare. Shard the counter across N sub-counters and sum them, or maintain an approximate count in Redis flushed periodically. Exact like counts are not worth serializing every write.

**Interview nuance:** Estimate to show you can size it. 100M photos/day at 2MB average is 200TB/day of new media before replication, and with 3x replication or erasure coding that is the storage bill the CDN then fronts. Read bandwidth dwarfs write bandwidth, which is the whole reason a CDN is non-negotiable.

Recap: metadata DB plus object storage plus CDN, upload direct to S3 with presigned URLs, generate resolution variants async, reuse hybrid fan-out for the feed, and never store image bytes in the database.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design upload-to-view for a photo-sharing app including media storage, metadata, and feed delivery to a global audience.

**Think about:**
- How do you split blob storage from metadata?
- How do presigned uploads and a CDN serve media efficiently?
- How does the feed reuse fan-out patterns?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 500M users, 100M photos/day at ~2MB average, global audience, read-heavy (views far exceed uploads), feed freshness of seconds is fine. Estimate: 100M x 2MB = 200TB/day of new media before replication; with 3x that is ~600TB/day of storage growth. Read bandwidth is many multiples of write, which forces a CDN.

API: `POST /uploads` returns a presigned S3 PUT URL plus a `media_key`; client PUTs bytes to S3 directly; `POST /posts` with the `media_key` and caption; `GET /feed?cursor=...`; `POST /posts/{id}/like`.

Data model: metadata store `posts(post_id, user_id, caption, media_key, created_at, like_count)`, `users`, `follows` and its inverse. Media store: S3 buckets holding the original plus generated variants (1080/640/320/thumb). Per-user timeline as Redis sorted sets of post ids.

High-level design: client requests a presigned URL and uploads directly to S3, so app servers never carry image bytes. An S3 put-event lands on a queue; a transcode worker generates resolution variants and a thumbnail, writes their keys, marks the post ready, and enqueues fan-out. Fan-out is the hybrid from the timeline lesson: push post ids to normal followers, pull for celebrities. The read path loads the user's timeline of ids, batch-hydrates metadata, resolves media keys to CDN URLs, and returns a page by cursor. All media is served through a CDN with long TTLs because it is immutable.

Deep dive, media delivery: the CDN offloads 90%+ of read traffic from origin, which is what makes 500M users affordable. Clients fetch the variant matching their viewport, cutting bandwidth. Like counts on viral posts are sharded sub-counters or an approximate Redis counter, avoiding hot-row contention.

Tradeoffs: async variant generation means a just-uploaded photo may briefly show a placeholder until variants exist; acceptable. Approximate like counts trade exactness for write throughput.

Common wrong turn: storing image bytes in the database instead of object storage plus a pointer, which bloats the DB, kills cache hit rates, and cannot be CDN-served. Another: proxying uploads through app servers instead of presigned direct-to-S3.

**Self-check rubric:**
- [ ] Did you split object storage (blobs) from a metadata DB (pointer + fields)?
- [ ] Are uploads presigned and direct to S3, bypassing app servers?
- [ ] Are resolution variants generated async via a queue/worker?
- [ ] Is media served through a CDN with long TTLs (immutable)?
- [ ] Did you reuse hybrid fan-out for the feed and address like-counter contention?
- [ ] Did you estimate media storage and note read >> write bandwidth?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design Instagram Stories: media that 500M daily users post and view but that expires and is deleted after 24 hours. Explain how the ephemeral lifecycle changes storage, delivery, and the feed compared to permanent posts.

**Model answer (revealed on demand):**

Assumptions: Stories are short photos/videos, viewed heavily in the first few hours then rarely, and hard-deleted at 24 hours. Volume is even higher than permanent posts because posting a Story is casual.

Storage lifecycle: put Story media in an S3 bucket with a lifecycle policy that auto-expires objects after 24 hours, so deletion is the storage layer's job, not a cron scanning billions of rows. Metadata rows carry a TTL: in DynamoDB use native item TTL, or in Cassandra write with a 24h TTL so tombstones and compaction reclaim them automatically. You never run an app-level delete sweep.

Delivery: Stories are extremely hot in the first hours (the classic recency skew), so CDN caching matters even more, but TTLs must not outlive the media. Set CDN TTL at or below the remaining Story lifetime, and rely on the origin returning 404/410 after expiry so stale edge copies drain. Because a Story is viewed in bursts right after posting, a short-TTL edge cache captures most of the reads.

Feed shape differs: the Stories tray is not a ranked infinite timeline, it is "which of the people I follow have an unexpired Story," a bounded set. Rather than fan-out-on-write to every follower's tray, use fan-out-on-read: when a user opens the app, query the recent (unexpired) Stories of the accounts they follow, which is cheap because the candidate set is small and time-bounded, and cache it briefly. Track seen/unseen per viewer with a lightweight per-user read-state record (also TTL'd).

Tradeoff: fan-out-on-read fits here precisely because Stories are short-lived and the query window is tiny, the opposite call from the permanent timeline. Common wrong turn: reusing permanent-post fan-out-on-write and then needing a massive delete job at 24 hours, when a storage TTL policy deletes for free.

### sd-l10-chat-messaging: Design a Chat / Messaging System (WhatsApp)

- **id:** `sd-l10-chat-messaging`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** chat, websocket, presence

#### Learn

Chat is a real-time delivery problem at massive concurrency. WhatsApp famously ran millions of connections per server. The interview lives in four areas: the connection layer, ordering, offline delivery, and group fan-out.

**Connection layer.** Messaging needs the server to push to the client the instant a message arrives, so you hold persistent connections, WebSocket (or MQTT, which WhatsApp used for battery efficiency). A tier of stateless-ish connection servers each hold hundreds of thousands to millions of open sockets. A user is connected to exactly one connection server at a time; a routing layer (a session registry in Redis mapping `user_id -> connection_server`) knows where each user is. When Alice sends to Bob, the system looks up Bob's connection server and forwards the message there over an internal pub/sub backplane (Kafka or a Redis pub/sub / a dedicated message bus).

```
Alice ==WS== connSrv-A          connSrv-B ==WS== Bob
                |                     ^
                v                     |
        session registry: Bob -> connSrv-B
                |                     |
                +---- pub/sub backplane (routes msg) 
```

**Ordering and dedup.** Global ordering across all messages is neither needed nor affordable. What users need is per-conversation ordering: messages within one chat appear in a consistent order. Assign each message a per-conversation monotonic sequence number (or a Snowflake-style time-sortable id scoped to the conversation). Clients sort by it. Because networks retry, messages carry a client-generated message id so the server (and other clients) can dedup: if the same message id arrives twice, drop the duplicate. This makes sends idempotent.

**Delivery and read receipts.** Delivery is a state machine per message: sent (server accepted), delivered (recipient's device ACKed receipt), read (recipient opened the chat). Each transition is an ACK flowing back that updates message state and notifies the sender. This is just small control messages over the same channel.

**Offline delivery (store-and-forward).** If Bob is offline, you cannot push. Persist the message in Bob's per-user inbox / mailbox (a durable store), and when Bob reconnects, his device pulls everything since its last acknowledged sequence number. The message store is a wide-column database (Cassandra / HBase) partitioned by conversation or by recipient, which suits the append-heavy, time-ordered access pattern. Messages are typically deleted or aged out after delivery to all devices (WhatsApp does not keep server-side history once delivered).

**Group fan-out.** A group message is written once and delivered to each member: look up each member's connection server (or inbox if offline) and forward. For small groups this is a simple loop. For very large channels (Telegram-style broadcast channels with millions of members) you need hierarchical distribution: shard the member list, fan out through layers of workers rather than one server pushing millions of copies, similar in spirit to the celebrity timeline problem.

**Multi-device and E2E.** Multi-device sync means a message must reach all of a user's devices and read state must converge across them, so the "recipient" is really a set of device sessions. End-to-end encryption (the Signal protocol, which WhatsApp uses) means the server routes ciphertext it cannot read; key exchange and per-device session keys are the client's job, and the server just stores and forwards opaque blobs.

**Interview nuance:** When asked about ordering, say "per-conversation ordering via sequence numbers," never "global ordering." Claiming a global total order across a billion users is the classic red flag that you have not thought about scale.

Recap: hold WebSocket connections on a connection tier with a session registry, order per-conversation with sequence numbers, dedup by client message id, store-and-forward for offline users, and fan out groups (hierarchically for huge channels).

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design 1:1 and group messaging with delivery + read receipts, online presence, and offline delivery.

**Think about:**
- What transport and connection layer sustain millions of persistent connections?
- How do you guarantee per-conversation ordering and dedup?
- How do you deliver to offline users and fan out to large groups?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 1B users, 50M concurrent connections, tens of billions of messages/day, 1:1 and group chats up to a few hundred members, delivery within a second when both parties are online. Estimate: 50B msgs/day is ~600K messages/sec average, several million/sec at peak, each message small (a few hundred bytes plus metadata).

API/transport: clients hold a persistent WebSocket (or MQTT) to a connection server. `send(conversation_id, client_msg_id, body)`, ACK frames for delivered/read, and a `sync(last_seq)` on reconnect. Presence is a heartbeat over the same socket.

Data model: `messages(conversation_id, seq, msg_id, sender_id, body, created_at)` in Cassandra partitioned by conversation_id so a chat is a contiguous, time-ordered partition. A session registry in Redis maps `user_id -> {device -> connection_server}`. Per-user undelivered mailboxes for offline recipients.

High-level design: Alice's message hits connection server A, which assigns a per-conversation sequence number and persists it. A routing layer looks up each recipient in the session registry; online recipients get the message pushed via the pub/sub backplane to their connection server, offline recipients get it queued in their mailbox and pulled on reconnect by `sync(last_seq)`. Client message ids make sends idempotent and let clients dedup retries. Delivery and read receipts are small ACK control messages that advance a per-message state machine and notify the sender.

Deep dive, ordering: per-conversation monotonic sequence numbers give a consistent order within a chat without any global coordinator. Clients sort by seq; gaps trigger a re-sync. Presence uses heartbeats with a short TTL in Redis so a dropped connection expires the "online" flag.

Group fan-out: write once, deliver per member via their connection server or mailbox; for huge channels, fan out hierarchically through worker layers instead of one server pushing millions of copies.

Tradeoffs: per-conversation (not global) ordering is the deliberate scale choice. Optional E2E encryption (Signal) means the server stores and forwards ciphertext blobs it cannot read.

Common wrong turn: assuming a global total order across all messages instead of per-conversation ordering, which does not scale and is not needed.

**Self-check rubric:**
- [ ] Persistent WebSocket/MQTT connection tier plus a session registry mapping user to server?
- [ ] Per-conversation sequence numbers for ordering (not global ordering)?
- [ ] Client message id for idempotency and dedup on retries?
- [ ] Store-and-forward mailbox for offline users, pulled on reconnect?
- [ ] Delivery/read receipts as an ACK-driven per-message state machine?
- [ ] Group fan-out, with hierarchical distribution for very large channels?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design Slack-style channels where a busy engineering channel has 50,000 members and a message triggers a burst of typing indicators, reactions, and read-state updates. Explain how you keep the fan-out and the presence/typing signals from overwhelming the system.

**Model answer (revealed on demand):**

Assumptions: workspaces with large channels (50K members), most members are passive readers, and the noisy signals are typing indicators, reactions, and per-user read cursors, which vastly outnumber actual messages.

Message fan-out: a channel message is written once to the channel's partition (Cassandra by channel_id), then delivered to the connection servers holding that channel's online members. For 50K members you do not push from one node; you fan out hierarchically, and you only push to currently-connected members (the session registry filters offline users, who instead advance their read cursor on next open). Offline members are not individually queued; they catch up by reading the channel history from `last_read_seq`, which is far cheaper than 50K mailbox writes per message.

Typing indicators are the real flood: they are high-frequency and disposable. Never persist them and never fan them out to all 50K members. Debounce on the client (send at most one "typing" per few seconds), route them over an ephemeral pub/sub topic with no durability, and optionally only deliver to members who currently have the channel open (viewport-aware). A typing signal that is dropped is harmless.

Reactions and read state: reactions are frequent but each is tiny; aggregate them (store counts, broadcast a debounced aggregate rather than one event per reaction) to collapse a burst of 500 reactions into a few update frames. Read state is per-user and does not need broadcasting at all: store each member's `last_read_seq` and compute unread counts on read, rather than pushing every read event to every member.

Tradeoff: typing/presence are best-effort and lossy by design, traded for survivability; message delivery stays durable and ordered. Common wrong turn: treating typing indicators and read receipts as durable, ordered messages and fanning them out to all 50K members, which produces orders of magnitude more traffic than the actual chat.

### sd-l10-notification-system: Design a Notification / Push System

- **id:** `sd-l10-notification-system`  ·  **difficulty:** medium  ·  **est:** 35 min  ·  **skills:** notifications, fan-out, queue

#### Learn

A notification system is a reusable delivery backbone: something happens (a like, a shipped order, a fraud alert) and the user must be reached across push, SMS, email, and in-app, respecting their preferences, without ever double-sending. The design is a pipeline, and the interview probes channel abstraction, idempotency, and preferences.

**Channel abstraction with provider adapters.** Do not scatter APNs, FCM, Twilio, and SES calls through your code. Define one internal notification, then route it to channel adapters. Each adapter (a Push adapter over APNs and FCM, an SMS adapter over Twilio, an Email adapter over SES) implements a common interface, handles that provider's quirks, retries transient failures with backoff, and can fail over to a backup provider (Twilio to a second SMS vendor). Adding a new channel is a new adapter, not a rewrite.

```
event -> ingestion API -> queue
   -> preference/eligibility filter (opt-out? quiet hours? channel enabled?)
   -> template/render service (localized, per-channel)
   -> per-channel queues (priority lanes) -> provider adapters (retry/failover)
   -> provider (APNs/FCM/Twilio/SES) -> delivery-status callback -> tracking + DLQ
```

**Queue-based fan-out and priority lanes.** Ingestion just validates and enqueues, returning fast. Workers consume from the queue (Kafka or SQS) and do the heavy work: fan-out, rendering, and dispatch. Use priority lanes: a 2FA code or fraud alert goes on a high-priority queue and must not sit behind a million marketing pushes. Per-user rate limiting and throttling prevent bombarding one user, and per-provider throttling respects APNs/Twilio rate limits.

**Idempotency and dedup (the heart of it).** Every request carries an idempotency key (event id + user + channel). Before sending, check whether that key was already delivered (a dedup store in Redis with a TTL, or a unique constraint). Delivery pipelines retry constantly (a worker crashes after sending but before recording success, a queue redelivers), and without idempotency a retry sends the same push twice. The dedup check is what makes at-least-once delivery machinery feel exactly-once to the user.

**Templates and rendering.** A template/rendering service turns an event plus data into channel-specific, localized content (a push has a title and short body, an email has HTML, an SMS has 160 characters). Keeping this separate means product can change copy without touching delivery.

**Preferences, quiet hours, batching.** A preference/eligibility filter runs before dispatch: has the user opted out of this category, is this channel enabled, is it their quiet hours (defer to morning), should low-priority notifications be batched into a digest rather than sent one at a time? Digest/batching both respects the user and cuts provider cost.

**Delivery tracking and observability.** Providers send delivery/open callbacks; record them. A dead-letter queue (DLQ) captures messages that fail after all retries for inspection and replay. Track send rate, delivery rate, and open rate per channel so you can see when APNs is degraded or open rates crater.

**Interview nuance:** The most common follow-up is "a worker retries and the user gets two pushes, why?" The answer names the idempotency key plus a dedup store checked before dispatch, and explains that the pipeline is at-least-once so dedup is mandatory, not optional.

Recap: an event flows through a queue to a preference filter, a renderer, priority per-channel lanes, and provider adapters with retries/failover, and an idempotency key checked against a dedup store is what prevents retries from double-sending.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a system that delivers a notification to a user across push (APNs/FCM), SMS, email, and in-app with per-user preferences.

**Think about:**
- How do provider adapters with retries/failover abstract channels?
- How do you prevent double-sends with idempotency?
- How do preferences, quiet hours, and batching fit?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: multi-tenant, hundreds of millions of notifications/day across four channels, a mix of transactional (2FA, order shipped) and marketing traffic, and a hard requirement that a user is never double-notified for one event. Estimate: 200M/day is ~2.3K/sec average with large spikes (a marketing blast or an outage recovery), so the pipeline must absorb bursts on a queue.

API: `POST /notifications` with `{event_id, user_id, category, channel_hint, payload, idempotency_key}`, returning 202 Accepted after enqueue. Delivery-status webhooks from providers feed back into tracking.

Data model: `user_preferences(user_id, category, channels_enabled, quiet_hours, digest_pref)`, `device_tokens(user_id, platform, token)`, a `dedup` store (Redis, key = idempotency_key, TTL), and a `delivery_log(notification_id, channel, provider, status, timestamps)`.

High-level design: the ingestion API validates and pushes to Kafka, returning fast. Workers consume and run the pipeline: check the dedup store for the idempotency key (skip if already sent), apply the preference/eligibility filter (opt-out, channel enabled, quiet hours defer, digest batching), render channel-specific content via the template service, then enqueue onto per-channel priority lanes. Channel adapters (APNs/FCM, Twilio, SES) dispatch with retry/backoff and failover to a backup provider, record the send in the dedup store and delivery log, and messages that exhaust retries land in a DLQ for replay.

Deep dive, idempotency: because the pipeline is at-least-once (queues redeliver, workers crash mid-send), a retry would re-push without protection. The idempotency key checked against the dedup store before dispatch, plus recording success atomically after, makes the user experience effectively exactly-once. Priority lanes keep a 2FA code from queuing behind a marketing blast.

Tradeoffs: quiet-hours deferral and digest batching trade immediacy for user respect and cost, applied only to low-priority categories. Failover trades a little latency for resilience when a provider degrades.

Common wrong turn: no idempotency, so a retry double-sends a push. Another: calling provider SDKs directly from application code instead of behind adapters, making a new channel or a failover impossible.

**Self-check rubric:**
- [ ] Channel abstraction with provider adapters (APNs/FCM/Twilio/SES) doing retry/failover?
- [ ] Queue-based ingestion with priority lanes separating transactional from marketing?
- [ ] Idempotency key checked against a dedup store to prevent double-sends?
- [ ] A template/render service producing channel-specific, localized content?
- [ ] Preferences: opt-out, quiet hours, and digest/batching applied before dispatch?
- [ ] Delivery tracking, DLQ, and per-channel observability (send/open rates)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the notification system for an incident-alerting product like PagerDuty, where an alert must reach an on-call engineer within seconds and escalate through push, then SMS, then a phone call if unacknowledged. Explain the escalation state machine, idempotency, and how you avoid both missed pages and alert storms.

**Model answer (revealed on demand):**

Assumptions: alerts are high-priority and low-volume relative to marketing, correctness is life-or-death for uptime, and the key mechanic is timed escalation with acknowledgment. Latency target: first notification within a couple of seconds.

Escalation state machine: an alert creates an escalation instance with an ordered policy, for example push immediately, if no ACK within 60s send SMS, if no ACK within another 120s place a phone call (Twilio Voice), then escalate to the next person in the rotation. Model this as a durable state machine driven by a scheduler / delayed queue: each step schedules a "check for ACK" timer; when the timer fires, if the alert is still unacknowledged, advance to the next channel. An ACK (from any channel, via a deep link or reply) transitions the alert to Acknowledged and cancels all pending timers.

Idempotency and correctness: each escalation step has an idempotency key (alert_id + step) so a retried timer does not double-page the same step. Because a missed page is worse than a duplicate, dispatch uses at-least-once with dedup, biased toward delivering. Phone and SMS go through provider failover (a second voice/SMS vendor) because a single provider outage during an incident is unacceptable.

Avoiding alert storms: dedupe and group alerts at ingestion so 500 alerts from one failing service become one incident with a count, not 500 pages (this is alert grouping / suppression). Apply a per-service rate limit and maintenance windows to suppress known-noisy sources. Deduplication keys on the alert fingerprint (service + check) collapse repeats.

Tradeoffs: this system biases hard toward delivery over cost and over avoiding duplicates, the opposite of a marketing system, because a missed page causes an outage. Quiet hours do NOT apply to on-call pages. Common wrong turn: treating pages like best-effort marketing notifications (batching, quiet hours, fire-and-forget) instead of a durable, timed, acknowledged escalation with failover.
