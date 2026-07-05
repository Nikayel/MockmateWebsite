> Module **sd-l7-m2** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l7-m1](./sd-l7-m1.md) · Next: [sd-l7-m3](./sd-l7-m3.md)

# L7 · Observability

After this module you can instrument any service or resource with the minimal, high-signal metric set (the four golden signals plus RED and USE), and you can design end-to-end observability across a multi-service request path by choosing correctly between metrics, logs, and traces and tying them together with OpenTelemetry and propagated trace context.

### sd-l7-golden-signals: The Four Golden Signals & RED/USE

- **id:** `sd-l7-golden-signals`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** golden-signals, red-use, metrics

#### Learn

When you own a service at 3am and it is misbehaving, you do not have time to stare at forty dashboards. You need a small, dependable set of numbers that tells you *whether* the service is healthy and *which direction* it is failing. Google's SRE book distills this to the **four golden signals**: latency, traffic, errors, and saturation. Instrument these four for every service and you can answer "is it up, is it fast, is it failing, is it about to fall over?" without guessing.

**Latency**: how long a request takes. Measure it as a distribution, not a mean. A mean of 40ms can hide a p99 of 900ms that is torching 1% of your users. Alert and dashboard on p50, p95, p99, and often p99.9. **Traffic**: demand on the system, typically requests per second (QPS) for an API, or bytes per second for a pipe. **Errors**: the rate of failing requests, split by explicit failures (HTTP 500) and implicit ones (a 200 with a wrong or empty body, or a request that blew its latency budget). **Saturation**: how full the most constrained resource is (CPU, memory, connection pool, queue depth). Saturation is your *leading* indicator: latency and errors tell you the house is on fire, saturation tells you the wiring is overheating before it ignites.

**Interview nuance:** interviewers love to ask why you separate the latency of successful requests from the latency of failed ones. Fast failures (a validation 400 returning in 2ms) drag your aggregate latency *down* and make a struggling service look healthy; slow failures (a request that times out at 30s then 500s) can hide inside an aggregate that averages them with fast successes. Always chart success latency and error latency as separate series, or a bad deploy that fails fast will look like a latency *improvement*.

Two framings package the golden signals for different targets:

- **RED** (Rate, Errors, Duration) is for **request-driven services**: an API, a gRPC endpoint, a web handler. Per endpoint you emit request rate, error rate, and duration distribution. This is the workhorse for microservices.
- **USE** (Utilization, Saturation, Errors) is for **resources**: a CPU, a disk, a NIC, a connection pool, a thread pool. Per resource you emit how busy it is (utilization), how much work is queued beyond what it can serve (saturation), and its error count.

They are complementary, not competing. RED tells you the checkout API's p99 doubled; USE tells you it is because the Postgres connection pool is saturated and requests are queuing for a connection.

```
  request-driven service   ->  RED   (Rate, Errors, Duration)
  underlying resource       ->  USE   (Utilization, Saturation, Errors)
  every service, always     ->  4 golden signals
```

The trap that quietly bankrupts observability budgets is **cardinality**. A metric's cost scales with the number of unique label combinations (time series), not the number of data points. Add a `user_id` label to a request counter and a service with 5 million users creates up to 5 million time series per metric; Prometheus will OOM and your bill explodes. Keep labels bounded: `endpoint`, `method`, `status_class` (2xx/4xx/5xx), `region`. Never put unbounded values (user id, order id, full URL with ids, raw error message) in a metric label. High-cardinality identifiers belong in logs and traces, not metrics.

The other common wrong turn is building **dashboards nobody watches** instead of signal-based alerting. A wall of graphs does not page anyone. Alert on symptoms the golden signals expose (error rate over budget, p99 over SLO, saturation climbing), keep dashboards for diagnosis after the page fires, and delete the ones that have not been opened in a quarter.

Recap: instrument latency, traffic, errors, saturation on every service; use RED for request-driven services and USE for resources; split success vs error latency; treat saturation as your early warning; and guard cardinality by keeping unbounded ids out of metric labels.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Enumerate the golden signals for a payments microservice, plus the specific metrics, labels, and dashboards you would instrument for each.

**Think about:**
- What are the four golden signals, and when do you use RED vs USE?
- Why separate successful vs failed request latency?
- Why does high-cardinality labeling blow up cost?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: `payments-svc` is a gRPC/HTTP service that authorizes and captures card charges via Stripe, backed by Postgres and a Redis idempotency store, running ~2,000 charge requests/sec at peak, with a 99.9% success SLO and a p99 latency SLO of 500ms.

I instrument the four golden signals, using RED for the service surface and USE for its resources.

**Latency (Duration).** A histogram `payment_request_duration_seconds` with buckets tuned around the 500ms SLO, labels `endpoint` (authorize, capture, refund), `status_class`. Chart p50/p95/p99/p99.9. Crucially I emit a separate series for successful vs failed charges, because a Stripe timeout that 500s at 30s must not be averaged into the healthy-charge p99. Dashboard: latency percentiles per endpoint, success and error series side by side.

**Traffic (Rate).** Counter `payment_requests_total{endpoint,method,status_class}`, graphed as QPS. This is my demand baseline; a sudden drop is itself an incident (upstream checkout broke).

**Errors.** Rate derived from the same counter filtered to `status_class="5xx"`, plus domain errors as `payment_failures_total{reason}` where `reason` is a *bounded* enum (card_declined, insufficient_funds, stripe_timeout, idempotency_conflict). I track both HTTP-level and business-level failures because a card decline is a 200 to us but a failure to the user.

**Saturation.** USE on the constrained resources: Postgres connection pool (`db_pool_in_use / db_pool_size`), Redis pool, the outbound-to-Stripe concurrency limiter, worker thread pool, and queue depth for async captures. This is the leading indicator: pool utilization climbing toward 100% predicts the latency spike before it lands.

**Labels I deliberately avoid:** `user_id`, `card_id`, `charge_id`, raw Stripe error strings. At 2,000 QPS these are unbounded and would create millions of time series and OOM Prometheus. Those identifiers go into structured logs and trace spans instead, where I can pivot from a paging alert to the exact failing charge.

**Alerting vs dashboards:** I page on symptoms (5xx error budget burn rate, p99 over 500ms for 5 minutes, saturation over 85%), and keep dashboards purely for post-page diagnosis. Common wrong turn I avoid: shipping a 30-panel dashboard and no alerts, so a slow leak in decline rate goes unseen until support tickets pile up.

**Self-check rubric:**
- [ ] Named all four golden signals and mapped RED to the service, USE to the resources.
- [ ] Split success vs error latency and justified why (fast/slow failures distort aggregates).
- [ ] Used bounded labels only and explicitly kept unbounded ids out of metrics (into logs/traces).
- [ ] Called out saturation as a leading indicator on a specific constrained resource.
- [ ] Alerted on symptoms rather than relying on dashboards nobody watches.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the golden-signal instrumentation for Uber's ride-matching service at ~10,000 match requests/sec across 400 cities, where "success" is subtle (a match returned is not the same as a good match) and you must keep per-city visibility without letting cardinality explode.

**Model answer (revealed on demand):**

Assumptions: `match-svc` receives a rider request, queries nearby-driver indexes, and returns a matched driver; 10k req/s, 400 cities, p95 match latency SLO of 2s, and a business KPI of match *rate* (fraction of requests that get an acceptable driver).

**Traffic:** `match_requests_total{city_tier, status_class}` as QPS. I do not label by raw `city_id` on every metric; 400 cities times other labels is borderline, so I bucket into `city_tier` (top / mid / long-tail) for high-frequency counters and keep full per-city breakdown only on a small number of key metrics where I have budgeted for it.

**Errors and the "subtle success" problem:** a returned match is not automatically a good outcome, so I instrument three tiers. Hard errors (`5xx`, timeouts) as USE/RED errors. Implicit errors: requests that returned *no* driver (`match_empty_total`) and requests where the offered driver was rejected or the ETA exceeded threshold (`match_low_quality_total{reason}`). The headline health metric is **match rate = matched / requested**, tracked per city_tier. This catches the classic trap where latency and 5xx look perfect but riders in one city cannot get a car.

**Latency:** histogram split by success vs empty-result vs error, because an empty match often returns *fast* and would otherwise flatter the p95. Buckets tuned around the 2s SLO.

**Saturation (USE):** the driver-index query pool, the geospatial cache (Redis/S2 cell store), and the matching worker concurrency. Saturation here predicts the surge-hour latency cliff.

**Cardinality control:** per-city detail is a real business need, so I split storage: bounded `city_tier` labels on the hot high-QPS metrics for cheap alerting, and full per-city dimensions pushed to a longer-retention analytics store (e.g. a columnar OLAP system) sampled or pre-aggregated per minute, not on the live Prometheus path. This keeps live time-series count bounded while preserving the per-city drilldown ops actually needs. Common wrong turn: slapping `city_id` on every counter and histogram bucket, which multiplies series by 400 and takes down the metrics backend during exactly the surge event you needed it for.

### sd-l7-three-pillars-otel: Three Pillars & OpenTelemetry

- **id:** `sd-l7-three-pillars-otel`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** opentelemetry, tracing, observability

#### Learn

Observability rests on three kinds of telemetry, and the skill is knowing which one answers which question. They are not redundant; each trades detail against cost differently.

**Metrics** are cheap numeric aggregates over time (counters, gauges, histograms). They cost almost nothing per data point, retain for a long time, and are what you *alert* on and trend on. They answer "how many, how fast, how full, right now and over the last quarter?" What they cannot tell you is *why* one specific request was slow, because they have thrown away the individual events.

**Logs** are structured records of discrete events. They carry the detail metrics discarded: the exact error, the parameters, the code path. They answer "what exactly happened to this request?" But logs are expensive at volume and painful to correlate across services unless they are structured (JSON with consistent fields) and carry shared ids. A wall of free-text log lines from twelve services with no common id is nearly useless for a distributed problem.

**Traces** capture the causal path of a single request as it fans across services. A trace is a tree of **spans**; each span is one unit of work (an HTTP handler, a DB query, a cache lookup) with a start time, duration, and attributes. Traces answer the question metrics and logs alone cannot: "this checkout took 1.4s, *where* did the time go across the 12 hops?" You look at the trace and see the payment service waited 1.1s on a slow fraud-check gRPC call. That is the pillar most teams under-invest in and most regret skipping.

```
  Trace: checkout (1.4s)
  |-- api-gateway            [ 20ms ]
  |-- order-svc              [ ============ 200ms ]
  |     |-- postgres write   [ ==== 40ms ]
  |-- payment-svc            [ ================================ 1.1s ]
  |     |-- fraud-check gRPC [ ============================ 1.0s ]  <- culprit
  |-- notify-svc            [ 30ms ]
```

The thing that makes traces work across service boundaries is **context propagation**. Each incoming request carries a `traceparent` header (the W3C Trace Context standard) holding the trace id and the parent span id. Each service reads it, starts a child span, and passes the updated header to its own downstream calls. That shared trace id is also what you stamp onto every log line and (as an *exemplar*) onto metrics, so you can pivot: a metric spike -> an exemplar trace id -> the full trace -> the correlated logs for exactly that request. Without propagated context, "why is it slow?" is unanswerable in a distributed system, which is the single most common wrong turn in this space.

**OpenTelemetry (OTel)** is the vendor-neutral standard that ties all three pillars together. It gives you: SDKs (per language) that produce metrics, logs, and traces with a common data model and automatic context propagation; instrumentation libraries that trace popular frameworks with near-zero code; and the **OTel Collector**, a separate process that receives your telemetry, processes it (batching, sampling, redaction, adding resource attributes), and exports it to whatever backends you choose (Prometheus for metrics, Loki/Elasticsearch for logs, Jaeger/Tempo for traces, or a vendor like Datadog/Honeycomb). The payoff is decoupling: your application code emits OTel and knows nothing about the backend, so you can switch vendors or fan out to several by editing Collector config, not redeploying every service.

**Interview nuance:** be ready to talk cost control, because that is where these designs are won or lost. Cardinality drives metric cost, so keep labels bounded (previous lesson). Trace volume is enormous at scale, so you *sample*: **head-based** sampling decides at the first span (cheap, simple, but may drop the one trace you needed), while **tail-based** sampling buffers whole traces at the Collector and keeps the interesting ones (all errors, all slow requests) plus a small percentage of normal traffic (accurate, but the Collector must hold traces in memory). Logs get tiered storage: hot in a fast index for a few days, then rolled to cheap object storage (S3) for compliance retention.

Recap: metrics for cheap aggregates and alerting, logs for structured per-event detail, traces for the causal cross-service path; propagate W3C trace context and share the trace id across all three; standardize on OpenTelemetry SDKs plus a Collector to decouple apps from backends; and control cost with bounded cardinality, trace sampling (tail-based keeps errors/slow), and tiered log retention.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design end-to-end observability for a 12-service request path: what you emit as metrics vs logs vs traces, and how a trace correlates across services.

**Think about:**
- When do you reach for metrics vs logs vs traces?
- How does trace context propagate across hops?
- How do you control cardinality and retention cost?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an e-commerce checkout flows through 12 services (gateway, auth, cart, inventory, pricing, order, payment, fraud, notification, ledger, search-index, and a BFF), peak ~5,000 checkouts/sec, and the recurring pain is "checkout is slow but no single service looks unhealthy."

**What goes where.** Every service emits RED **metrics** (request rate, error rate, duration histogram, bounded labels) for alerting and SLO tracking, plus USE metrics on its constrained resources. Every service emits **structured logs** (JSON) for discrete notable events: errors, business decisions (fraud declined, inventory reservation failed), with severity and the trace id on every line. Every service participates in **distributed traces** so I can see the causal path of one checkout across all 12 hops.

**Correlation is the core of the design.** The gateway starts a root span and generates a trace id, injected into the W3C `traceparent` header. Each downstream service (over HTTP and gRPC, and via the message queue by stamping the header into message metadata) reads `traceparent`, starts a child span, and re-injects it on its own outbound calls. That single trace id is written onto every log line and attached as an **exemplar** on latency metrics. Result: a p99 alert fires, I click an exemplar to the trace, see the fraud service ate 1s, and jump straight to fraud's logs for that trace id. Metrics tell me *that* it is slow, the trace tells me *where*, the logs tell me *why*.

**Instrumentation.** Standardize on OpenTelemetry SDKs with auto-instrumentation for the web/gRPC/DB libraries, so most spans are free. Run an OTel Collector (as a sidecar or per-node agent plus a gateway tier) to batch, redact PII, attach resource attributes, and export: metrics -> Prometheus, traces -> Tempo/Jaeger, logs -> Loki. Apps never name a backend.

**Cost control.** Metrics: bounded labels only, no user/order ids. Traces: tail-based sampling at the Collector keeping 100% of error and slow (>p99) traces plus ~1-5% of normal traffic, so I keep the interesting ones without storing 5k full traces/sec. Logs: hot index for 7 days, then roll to S3 for cheap long retention. Common wrong turn I avoid: shipping metrics and logs but no tracing and no shared id, which leaves "which of the 12 hops is slow?" permanently unanswerable.

**Self-check rubric:**
- [ ] Assigned each pillar to the question it actually answers (aggregates/alerting, per-event detail, causal path).
- [ ] Described concrete context propagation via W3C `traceparent` across HTTP/gRPC and the queue.
- [ ] Tied all three pillars together with a shared trace id (log correlation + metric exemplars).
- [ ] Standardized on OpenTelemetry SDKs + Collector and explained the app/backend decoupling.
- [ ] Controlled cost with bounded cardinality, trace sampling (tail-based keeps errors/slow), and tiered log retention.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design observability for a request that crosses a synchronous API tier and then an asynchronous Kafka pipeline (order placed via API, then processed by 4 downstream consumers over Kafka) at Shopify-scale checkout volume, so that a single order is traceable end to end across both the sync hop and the async hops.

**Model answer (revealed on demand):**

Assumptions: an order is placed via a synchronous REST call, published to a Kafka topic, and processed asynchronously by inventory, payment, fulfillment, and analytics consumers; tens of thousands of orders/sec at peak; the hard requirement is a single coherent trace spanning the sync API and the async consumers, which is where naive tracing breaks.

**The async trap.** HTTP auto-instrumentation propagates `traceparent` in request headers, but Kafka messages are not HTTP requests. If you do nothing, the trace ends at "published to Kafka" and each consumer starts a *fresh* trace, so you cannot follow one order end to end. The fix: on publish, inject the current trace context into **Kafka message headers** (OTel's messaging conventions do this); on consume, extract it and start the consumer span as a **span link** or child of the producer span. Span links are the right primitive here because one consumer poll can batch many messages from different traces, so a rigid single-parent model does not fit; links let one processing span reference multiple upstream trace contexts.

**What each pillar does here.** Metrics: RED on the API tier, plus per-consumer USE metrics on **consumer lag** (offset behind head) which is the golden saturation signal for a Kafka pipeline; rising lag predicts SLA breach on order processing. Logs: structured, every line carrying `order_id` and the trace id. Traces: the end-to-end span tree, sync + async, keyed by trace id, with `order_id` as a span attribute so I can search either way.

**Correlation and cost.** Propagate trace id into Kafka headers and stamp `order_id` on spans and logs so ops can pivot from a customer complaint (order id) to the full cross-tier trace. Tail-based sampling keeps all failed and slow order journeys. Consumer lag and DLQ depth get their own alerts. Common wrong turn: treating the async half as untraceable and relying only on per-consumer logs, which forces engineers to manually stitch an order's journey by grepping four services during an incident.
