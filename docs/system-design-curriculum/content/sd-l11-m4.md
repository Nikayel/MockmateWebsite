> Module **sd-l11-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l11-m3](./sd-l11-m3.md)

# L11 · IoT, Edge & Time-Series

After this module you can design the two halves of a large sensor platform: the ingestion path that pulls telemetry from millions of intermittently-connected devices and splits it into a hot alerting path and a cold analytics path, and the specialized time-series storage substrate underneath it that survives high write rates and controls the cardinality explosion that kills most metrics systems.

### sd-l11-iot-edge-ingestion: IoT / Edge Ingestion Architecture

- **id:** `sd-l11-iot-edge-ingestion`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** iot, edge, mqtt

#### Learn

An IoT platform is a write-fan-in problem: a huge fleet of small devices each dribbles telemetry toward the cloud, and the platform must never assume a device is online, well-behaved, or trustworthy. With 10M devices each emitting one reading every 10 seconds you are already at 1M messages/sec sustained, and fleets are bursty (whole regions reconnect at once after an outage), so the design must absorb spikes several times the average.

The first decision is the **edge-cloud split**: what runs on or near the device versus in the cloud. Push work to the edge when it cuts bandwidth or when latency matters for control. A smart thermostat should not stream raw 50Hz sensor data to the cloud; a **gateway** (a Raspberry Pi class device, or an on-prem box like AWS Greengrass / Azure IoT Edge) filters, aggregates ("send the 1-minute average, plus any reading outside a band"), and runs local inference so a safety cutoff fires in milliseconds without a cloud round trip. The cloud gets a compressed, pre-filtered stream instead of the firehose.

Devices talk over lightweight protocols, not HTTP-per-reading. **MQTT** (a pub/sub broker protocol over a persistent TCP connection) dominates: one long-lived connection, tiny headers, QoS levels (0 fire-and-forget, 1 at-least-once, 2 exactly-once), and a "last will" message the broker publishes when a device drops. **CoAP** (UDP, REST-like) is used on the most constrained/low-power links. Crucially, devices **buffer offline**: when connectivity drops, the edge does **store-and-forward**, persisting readings locally and replaying them on reconnect. That means the cloud must accept **late and out-of-order** data and dedupe on a device-supplied event id.

```
devices --MQTT/CoAP--> edge gateway (filter, aggregate, buffer, local inference)
                                     |
                          MQTT broker cluster (auth, backpressure)
                                     |
                             ingest gateway --> Kafka (durable buffer)
                                    /                        \
                        hot path: stream alerting        cold path: batch -> lake/TSDB
```

The **ingestion gateway** sits behind the broker and does device provisioning and auth (each device gets its own X.509 certificate, never a shared key, so one compromised device can be revoked without re-keying the fleet), applies **backpressure** (reject or shed low-QoS traffic before the pipeline melts), and writes into a durable buffer like **Kafka** so a slow downstream consumer never blocks ingestion. From Kafka the stream **forks**: a **hot path** (Flink / Kafka Streams) evaluates alerting and anomaly rules in seconds, and a **cold path** lands raw data in S3 / a lake and a time-series DB for batch analytics and ML training.

Control flows the other way via a **device shadow / digital twin**: a cloud-side JSON document of each device's desired and reported state. You write the desired state, and the device reconciles when it next connects, which is exactly how **OTA firmware rollouts** work: stage to 1% (canary), watch crash/health telemetry, then ramp, so a bad image cannot brick 10M devices at once.

**Interview nuance:** the classic failure is assuming devices are always online. Without offline buffering you silently lose data during every outage; without dedupe you double-count the replay. State both.

**Interview nuance:** a thundering herd of reconnects after a regional outage can DDoS your own broker. Devices need randomized exponential backoff with jitter on reconnect, and the broker needs connection-rate limiting.

Recap: filter and buffer at the edge, connect over MQTT with per-device certs, absorb bursts and reconnects with a Kafka buffer and backpressure, fork into a seconds-latency hot path and a durable cold path, and drive control and OTA through a device shadow with canary rollout.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a platform ingesting telemetry from 10M IoT devices, tolerating offline devices, doing edge filtering, and enabling both real-time alerts and historical analytics.

**Think about:**
- What belongs at the edge vs the cloud?
- How do you handle intermittent connectivity and high write fan-out?
- How do the hot (alerting) and cold (analytics) paths split?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assume 10M devices, one reading every 10s average (about 1M msg/sec), bursts to 3x on regional reconnects, readings around 200 bytes, alert latency target under 5s, and analytics data retained for years.

**Edge vs cloud:** at the edge (gateway or on-device agent) I filter and aggregate to cut bandwidth: send rolling aggregates plus any out-of-band reading, run local inference for safety-critical cutoffs that cannot wait for a cloud round trip, and buffer to disk when offline (store-and-forward). The cloud owns durable storage, fleet-wide analytics, alerting correlation across devices, and control.

**Connectivity and fan-out:** devices hold one long-lived **MQTT** connection to a broker cluster (EMQX / HiveMQ or AWS IoT Core), authenticated with **per-device X.509 certs** so any device can be revoked individually. On disconnect the edge persists locally and replays on reconnect with a device-supplied event id so the cloud can **dedupe**, and I accept out-of-order/late data. Reconnects use exponential backoff with jitter to avoid a thundering herd, and the broker rate-limits new connections. Behind the broker an ingest gateway applies **backpressure** and writes to **Kafka**, partitioned by device id, which is the durable shock absorber so a slow consumer never blocks devices.

**Hot vs cold split:** Kafka forks. The **hot path** is a stream processor (Flink) evaluating threshold/anomaly rules with per-device state, emitting alerts within seconds to a notification service; it also feeds a short-retention store (Redis / a TSDB hot tier) for live dashboards. The **cold path** lands raw events in S3 (partitioned by date/device) for batch ETL and ML, and downsampled series into a time-series DB for historical queries.

**Control:** a **device shadow** holds desired vs reported state; **OTA** firmware ships as a canary (1% -> watch health telemetry -> ramp) so a bad build cannot brick the fleet.

**Tradeoffs / wrong turns:** the common mistake is assuming always-online devices with no buffering (silent data loss) and no dedupe (double-counted replays). Another is persisting every raw ping to a hot database instead of buffering in Kafka and filtering at the edge, which blows up cost and write load.

**Self-check rubric:**
- [ ] Names a lightweight device protocol (MQTT/CoAP) and per-device cert auth, not shared keys
- [ ] Explicitly handles offline buffering, store-and-forward, and replay dedupe
- [ ] Puts a durable buffer (Kafka) with backpressure between devices and downstream
- [ ] Cleanly separates a seconds-latency hot alerting path from a durable cold analytics path
- [ ] Describes control via device shadow/twin and a canary OTA rollout
- [ ] Addresses reconnect thundering-herd with backoff + jitter and broker rate limits

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the ingestion and control plane for a Tesla-scale connected-vehicle fleet: 5M cars, each streaming ~50 signals at up to 10Hz over flaky cellular, where some telemetry drives safety alerts within 2s, video/Autopilot snapshots must be uploaded opportunistically, and OTA updates ship new firmware to the fleet weekly. Deliver the edge split, the connectivity/ingestion design, and how you stage OTA without bricking cars.

**Model answer (revealed on demand):**
Assume 5M cars, ~50 signals at up to 10Hz (a raw 2.5M x 10 = 25M points/sec if streamed naively, so streaming raw is a non-starter), cellular links that drop constantly, safety alert latency under 2s, and large opportunistic media uploads.

**Edge split:** the car is a real computer, so it does heavy edge work. It aggregates high-rate signals locally (send 1Hz summaries plus event-triggered high-rate bursts around anomalies, hard braking, or faults), runs on-vehicle models for safety, and **records to local storage** continuously. Only a filtered fraction reaches the cloud; full-rate data is uploaded on demand or when the car is on Wi-Fi and parked. This turns 25M points/sec of raw signal into a manageable cloud stream.

**Connectivity/ingestion:** cars hold an **MQTT** (or gRPC-over-QUIC) session with per-vehicle certs. Cellular flakiness makes **store-and-forward mandatory**: buffer to disk, replay with monotonic event ids, dedupe in the cloud, tolerate hours of offline gap. Split traffic by QoS: safety/health signals go over a small high-priority topic into a Kafka hot partition feeding a Flink alerting job (sub-2s), while bulk media (dashcam clips, Autopilot snapshots) uploads **opportunistically** to S3 via presigned URLs, prioritized to Wi-Fi to avoid burning cellular data, and is fully decoupled from the telemetry path. Kafka partitioned by VIN absorbs reconnect bursts; brokers rate-limit connects with jittered backoff.

**OTA without bricking:** desired firmware version lives in each car's **device shadow**. Rollout is a staged canary: 0.1% -> 1% -> 10% -> fleet, gated on health telemetry (boot success, crash rate, error signals) with automatic halt-and-rollback if the canary regresses. Updates are cryptographically signed and verified on-device, installed to an **A/B partition** so a failed flash boots the previous known-good image, and safety-critical installs only apply while parked. This makes the blast radius of a bad build a fraction of a percent, recoverable by rollback, instead of a fleet-wide brick.

### sd-l11-time-series-storage: Time-Series Databases & Storage Design

- **id:** `sd-l11-time-series-storage`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** time-series, cardinality, downsampling

#### Learn

A time-series database (TSDB) is specialized because time-series workloads have a lopsided shape a general-purpose DB handles badly: writes are almost entirely **appends** at the current timestamp (you rarely update the past), the write rate is enormous (millions of points/sec), reads are **time-range scans over a filtered set of series** ("CPU for these hosts over the last 6 hours"), and old data is queried less and less over time. A B-tree row store like Postgres chokes here because random-position index maintenance under a pure-append firehose is wasted work.

A **series** is identified by a metric name plus a set of key/value **tags/labels**, for example `cpu_usage{host="web-1", region="us-east", pod="abc"}`. Each unique combination of tag values is a distinct series with its own timeline. This is the single most important concept in the whole topic: **cardinality is the number of distinct series**, and cardinality explosion is the dominant failure mode. Put a high-cardinality tag like `user_id`, `request_id`, `pod_uuid`, or `email` on a metric and you can go from thousands of series to tens of millions, blowing up the in-memory index, slowing every query, and OOM-killing the database. The rule: tags must be **bounded, low-cardinality dimensions** (region, host, status code), never unbounded identifiers.

Storage is built for append-heavy writes. TSDBs use **LSM-tree** style storage (buffer writes in memory, flush sorted immutable chunks to disk) and store data **columnar** per series so a range scan reads one contiguous block. Compression is where TSDBs win big, using two Gorilla/Facebook techniques:

- **Delta-of-delta on timestamps:** samples arrive at near-regular intervals, so store the change in the interval, which is usually 0 and packs into a bit or two instead of a 64-bit timestamp.
- **XOR compression on values:** consecutive float values are similar, so XOR them and store only the changed bits.

Together these routinely get metrics down to around 1 to 2 bytes per sample versus 16 raw, which is what makes million-point-per-second ingestion economically possible.

```
write path: memory buffer (recent, WAL-backed) --flush--> compressed columnar chunks
partition by TIME (e.g. 2h blocks) and by SERIES/shard
query: pick time chunks -> filter series by tags via inverted index -> scan + aggregate -> gap-fill
```

Two techniques keep old data cheap. **Downsampling / rollups (continuous aggregates):** you do not need per-second data from last year, so precompute 1m, 1h, 1d rollups and serve old queries from the coarse ones. **Tiering + retention:** recent raw data lives on fast SSD (hot), older rolled-up data on cheaper disk/object storage (warm/cold), and raw data past its retention window is dropped entirely. Partitioning **by time** makes this trivial: expiring old data is dropping whole chunks, not deleting rows.

Query patterns you must support: time-range scans, tag filters (served by an inverted index from tag to series), aggregation across series (sum/avg/percentiles), and **gap-filling / interpolation** for missing samples. The ecosystem: **Prometheus** (pull-based monitoring, its own TSDB), **InfluxDB** and **TimescaleDB** (a Postgres extension, so you keep SQL and joins), and **ClickHouse** (a columnar OLAP DB people push into service as a huge-scale TSDB).

**Interview nuance:** if asked "why not just use Postgres," answer with write pattern (append vs random-write index churn), compression (delta-of-delta/XOR vs generic), and lifecycle (drop-a-time-chunk vs DELETE-scan). If asked "what breaks first at scale," the answer is cardinality, every time.

Recap: a TSDB exploits append-only, columnar, delta-of-delta + XOR compressed storage partitioned by time, keeps old data cheap with downsampling and hot/warm/cold tiering plus retention, serves time-range + tag-filtered aggregations, and lives or dies by controlling tag cardinality.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a time-series store for high-frequency sensor metrics that ingests millions of points/sec and serves fast time-range + downsampled queries.

**Think about:**
- Why is tag/label cardinality the dominant failure mode?
- How do downsampling and tiering keep old data cheap?
- Why is columnar + delta-of-delta compression a fit?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assume 2M points/sec sustained, each point being (series id, timestamp, float), series identified by a metric + bounded tags, dashboards querying the last few hours at second resolution and analysts querying months at coarse resolution, with multi-year retention on cheap storage.

**Storage engine:** an **LSM-tree** write path. Incoming samples buffer in memory (WAL-backed for durability) and flush as sorted, immutable, **columnar** chunks partitioned **by time** (e.g. 2-hour blocks) and sharded **by series** across nodes. Columnar-by-series means a range scan for one series reads one contiguous block instead of skipping across interleaved rows.

**Compression:** timestamps use **delta-of-delta** (regular intervals compress to near-zero bits) and values use **XOR** compression (Gorilla), getting roughly 1 to 2 bytes/sample versus 16 raw. This is what makes 2M points/sec affordable to store and fast to scan, because scan cost is dominated by bytes read.

**Cardinality control (the crux):** each unique tag-set is a series, so I keep tags **bounded and low cardinality** (sensor_type, region, unit) and forbid unbounded tags (device_uuid as a tag, request_id) which would explode series count and OOM the index. I enforce a per-metric series-count budget, reject/relabel offending writes, and monitor active-series as a first-class metric.

**Lifecycle:** **downsampling** rollups precompute 1m/1h/1d aggregates via continuous aggregation, so month-long queries hit coarse data cheaply. **Tiering**: raw on hot SSD for recent windows, rollups on warm/cold object storage for old data, and raw dropped past its retention window; because partitioning is by time, expiry is dropping whole chunks, not row deletes.

**Query path:** select the relevant time chunks, resolve tag filters through an **inverted index** (tag -> series ids), scan the matching series, aggregate (sum/avg/percentile), and gap-fill missing samples. The query planner routes long ranges to the appropriate rollup automatically.

**Tech and tradeoffs:** Prometheus for pull-based monitoring, TimescaleDB if I want SQL/joins, ClickHouse for huge analytical scale. **Common wrong turn:** unbounded tag cardinality plus no downsampling/retention, which works in a demo and dies in production. Second wrong turn: reaching for a general row store like vanilla Postgres, which suffers index churn on append and lacks time-series compression and chunk-drop retention.

**Self-check rubric:**
- [ ] Explains cardinality = distinct series and why high-cardinality tags are the top failure mode
- [ ] Uses append-optimized LSM + columnar storage partitioned by time (and sharded by series)
- [ ] Names delta-of-delta (timestamps) and XOR/Gorilla (values) compression and why it fits
- [ ] Keeps old data cheap via downsampling/rollups plus hot/warm/cold tiering and retention
- [ ] Describes tag-filtered, time-range aggregate queries with gap-filling and rollup routing
- [ ] Justifies a TSDB over general-purpose Postgres on write pattern, compression, and lifecycle

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the metrics backend for a Datadog-scale observability product: 100M+ active time series across thousands of customers, ingesting 10M+ points/sec, serving p99 dashboard queries under 1s over the last hour and ad-hoc queries over 15 months, all multi-tenant. Deliver the storage layout, how you keep 100M series from melting the index, and the query/retention strategy.

**Model answer (revealed on demand):**
Assume 10M+ points/sec, 100M+ active series, thousands of tenants, hot dashboard queries (last hour, p99 < 1s) mixed with cold analytical queries (15 months), and per-customer isolation and quotas.

**Storage layout:** a horizontally sharded, LSM-based columnar TSDB (a Cortex/Mimir/Thanos-style long-term Prometheus system, or a ClickHouse cluster). Data partitions by **time** (2h blocks) and is sharded across nodes by a hash of **(tenant, series)**, which both spreads write load and hard-isolates tenants so one noisy customer cannot hot-shard everyone. Recent blocks live on local SSD (the ingesters), and sealed blocks ship to **object storage (S3)** as immutable, indexed chunk files; a query layer (queriers + a store-gateway) reads from both so hot and cold share one query API. Compression stays delta-of-delta + XOR.

**Keeping 100M series alive:** cardinality is the whole game at this scale. I enforce **per-tenant active-series limits** and per-metric label budgets, reject writes past quota (with a clear error, not silent drop), and run automatic label-cardinality detection to flag a customer who just shipped `user_id` as a label. The inverted index (postings lists from label -> series) is sharded per tenant and kept in memory only for the hot window; cold blocks carry their own on-disk index in S3. This bounds index RAM regardless of total historical series.

**Query and retention:** a query frontend **splits** long ranges by time, **caches** results, and enforces per-tenant concurrency/cost limits so one heavy query cannot starve dashboards. Recent-hour p99 < 1s is met from in-memory/SSD ingester data with the hot index; 15-month queries transparently route to **downsampled rollups** (5m/1h) in S3 rather than scanning raw. Retention is tiered per plan: raw for weeks, rollups for 15 months, then chunk-drop by time. Multi-tenancy runs through every layer: quotas, isolation by shard key, and per-tenant retention, so cost and blast radius track each customer independently.
