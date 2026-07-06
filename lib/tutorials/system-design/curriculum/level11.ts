/**
 * System Design — Level 11: Modern & Specialized Systems (the final level).
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l11-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L11. 15 lessons across 4
 * modules (sd-l11-m1..m4). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const mlBlueprintTeach = `
## The interview is about the plumbing, not the model

An ML system design interview is almost never about the model. It is about the plumbing around the model: where features come from, how the thing retrains, how you serve predictions in single-digit milliseconds, and how you notice when it silently rots. Candidates who dive straight into "I would use gradient-boosted trees" fail; the ones who draw two planes and a feedback loop pass.

## Frame the metric hierarchy first

There is a business metric (revenue, engagement), an ML objective that is a proxy for it (predicted click-through rate), and a training label that is a proxy for that (did the user click within a 30-minute attribution window). These are never identical, and the gap is where products die. Offline metrics (AUC, log-loss on a holdout) tell you the model learned something; online metrics (actual CTR, revenue per session in an A/B test) tell you it helped. Optimizing offline AUC while online engagement drops is the classic trap.

## Two planes plus a loop

\`\`\`
OFFLINE (training plane)                 ONLINE (serving plane)
raw logs -> ETL -> feature pipeline      request -> feature fetch (online store)
   -> training data -> train             -> candidate gen -> ranking -> response
   -> eval -> model registry  --push-->  -> model service loads artifact
        ^                                        |
        |                                        v
        +---------- feedback log <--------- impressions + outcomes (clicks)
\`\`\`

The offline plane is throughput-oriented and runs on a schedule: batch ETL over the warehouse, feature computation, training, evaluation, and a push to a model registry. The online plane is latency-oriented and runs per request: fetch precomputed features, generate candidates, rank, return. They must share one feature definition or you get training/serving skew. The feedback log is the piece juniors forget: every prediction and its eventual outcome must be written back, because without it you cannot build tomorrow's training set or detect drift.

## The latency and cost funnel

You do not run a heavy model on millions of items per request. You cascade: candidate generation cheaply narrows millions to hundreds (embedding retrieval or a simple filter), ranking runs the expensive model on those hundreds, and re-ranking applies business rules and diversity on the top dozen. Each stage is cheaper per item and touches fewer items, so total cost stays bounded.

**Interview nuance:** rollout is not a stateless deploy. A model is code plus weights plus the feature distribution it expects. Ship it through shadow (score live traffic, serve nothing), then canary or A/B (small traffic slice), with automatic rollback keyed on an online metric regression, and keep the previous artifact hot for instant revert.

## Monitoring closes the loop

Watch data drift (input feature distributions shift), concept drift (the label relationship changes, for example fraud tactics evolve), prediction drift (output distribution moves), plus operational alarms on feature nulls and ground-truth label delay. Daily retraining only helps if these signals decide when a retrain or rollback is warranted.

**Recap:** frame business metric to ML objective to label, split an offline training plane from an online serving plane, cascade candidate generation to ranking to re-ranking to hit latency, and close a feedback log so you can retrain and detect drift.
`.trim()

const featureStoreTeach = `
## A feature store exists to kill training/serving skew

Training/serving skew is the single most common cause of a model that looks great offline and quietly underperforms in production, and it is subtle enough that teams ship for months before noticing. If you learn one thing in this lesson: the same feature value the model saw at train time must be the value it sees at inference time, and that is harder than it sounds.

## The two sources of skew

First, code divergence: the training pipeline computes "average order value over the last 7 days" in a Spark job, and the serving path recomputes it in Java service code, and the two implementations disagree on time zones, null handling, or rounding. Second, time divergence: at training you accidentally use the feature's current value instead of its value as of the moment the labeled event happened, which leaks future information into the past.

## The dual-store architecture

\`\`\`
                 +------------------ feature definition (one) ------------------+
                 |                                                              |
   raw events -> feature pipeline ---> OFFLINE store (warehouse / Parquet) ---> point-in-time join -> training data
                          |                                                                          (train time)
                          +---------> ONLINE store (Redis / DynamoDB)  ---> low-latency get -> inference
                                                                                            (serve time)
\`\`\`

The offline store holds the full history of every feature value with timestamps, in a warehouse or Parquet on S3, optimized for large point-in-time joins. The online store holds only the latest value per entity, in Redis or DynamoDB, optimized for single-digit-ms point lookups by entity key. Both are populated by one pipeline from one definition, which is what guarantees the serving path and the training path compute the feature identically.

## Point-in-time correctness

When you build a training row for "user U at event time T," every feature must be joined as-of T, using the last value known strictly before T, never a value computed after T. If a user's "total lifetime purchases" feature is joined at its current value while the label is a purchase from six months ago, the model learns from the future and posts fantastic offline numbers that collapse in production. Feature stores implement this with an as-of join keyed on entity and event timestamp.

**Interview nuance:** if the interviewer asks "how do you know your feature store works," the strong answer is not "we tested it," it is "we log served feature vectors and compare them to the offline-computed vectors for the same entity and time; skew shows up as a mismatch rate."

## Freshness tiers

Batch features (7-day average spend) recompute hourly or daily. Streaming features (clicks in the last 5 minutes) update within seconds via Kafka plus Flink. On-demand features (distance between user and merchant) are computed at request time from request inputs because they cannot be precomputed. A registry tracks each feature's definition, owner, freshness, and lineage so features are reused rather than reinvented, and so you can reason about high-cardinality features whose online storage cost (one row per user times millions of users) can dwarf everything else.

**Recap:** a feature store uses a dual offline/online store fed by one definition to kill code-divergence skew, enforces point-in-time as-of joins to prevent label leakage, tiers features by freshness SLA, and proves correctness by comparing served vectors to offline vectors.
`.trim()

const realtimeRecommendationTeach = `
## A latency-constrained funnel

A recommender is a latency-constrained funnel that turns a catalog of millions into an ordered list of a dozen, personalized to what the user did seconds ago, in under 100ms. You cannot run a heavy ranking model over millions of items per request, so the entire design is about narrowing the set cheaply before spending compute where it matters.

\`\`\`
millions of items
   -> candidate generation   (two-tower + ANN, ~5ms)      -> ~1000 candidates
   -> ranking                (deep model on candidates)    -> ~100 scored
   -> re-ranking             (diversity, freshness)        -> ~20
   -> business rules         (dedup, blocklist, ads)       -> final feed
\`\`\`

## Candidate generation with two-tower + ANN

Candidate generation must be sublinear in catalog size. Train two encoders: a user tower that maps user features (history, context) to a vector, and an item tower that maps item features to a vector in the same space, so that dot product approximates relevance. Precompute all item vectors offline and load them into an ANN index (HNSW or IVF). At request time you compute only the user vector and do an ANN lookup for its nearest item vectors. That is how you retrieve the top 1000 relevant items from millions in a few milliseconds. Item vectors refresh nightly (batch), while the user vector can be computed fresh per request from recent activity, which is what makes it react to the last few clicks.

## Ranking and real-time signals

Ranking then runs a heavier model (gradient-boosted trees or a deep network) on the ~1000 candidates, using richer features and cross-features that would be too expensive at retrieval scale. Modern rankers are multi-task: they jointly predict click, watch-time or dwell, and conversion, then combine those into one score, because optimizing clicks alone trains clickbait. Calibrated probabilities matter when you blend objectives or mix in ads priced by expected value.

The user's last few clicks reach the recommender within seconds via Kafka plus Flink, updating either the user embedding or fast counter features. The common split is near-line (compute embeddings and features within seconds of an event, store them) versus online (per-request scoring), which keeps the request path fast while still reacting quickly.

**Interview nuance:** the evaluation answer separates senior from junior. Your logs are biased: users can only click what you showed them (position bias) and popular items get shown more (popularity bias), so naively training on click logs makes the model recommend what it already recommends. You break the loop with exploration (bandits or epsilon-random slots) to gather counterfactual data, and you evaluate with offline replay plus a real online A/B test, not just offline AUC.

## Cold start

Both new users (fall back to popularity, context, or onboarding signals until you have history) and new items (rely on content features in the item tower so a brand-new item still gets an embedding without interaction data) need an explicit answer.

**Recap:** cascade two-tower plus ANN candidate generation into a multi-task ranker into diversity re-ranking to hit p99 under 100ms, feed recent clicks through Kafka/Flink for real-time reaction, handle cold start with content features and popularity, and evaluate with exploration plus online A/B to escape feedback-loop bias.
`.trim()

const onlineServingRolloutTeach = `
## Shipping a model is not shipping a stateless service

Shipping a model is not shipping a stateless service, and treating it like one is how teams cause outages that lose money silently. A model deploy changes behavior in ways a green health check cannot catch: the new artifact may load fine and return 200s while quietly making worse predictions. So the serving and rollout layer is designed around two ideas: never trust a new model on real traffic without measuring its decisions, and never let the model service being down take the product down with it.

## The rollout ladder

Rollout strategies form a ladder of increasing exposure with a measurement gate at each rung. Shadow (or dark launch) runs the new model on live traffic and logs its predictions but serves the old model's output, so you compare decisions on identical inputs with zero user risk. Canary sends a small traffic slice (1 to 5 percent) to the new model and watches business and operational metrics. A/B splits traffic to attribute a metric change causally. Interleaving, used in ranking, mixes results from two models in one list to compare them with far fewer samples. The non-negotiable piece is automatic rollback: a controller watches an online metric (CTR, revenue, error rate, latency) and reverts to the previous artifact on regression, which requires keeping that previous artifact hot for an instant switch, not a redeploy.

## Separate weights from serving code

The registry holds versioned, reproducible artifacts (weights plus the feature schema plus preprocessing) addressed by id; the serving binary loads an artifact by id. This lets you roll a model forward or back by pointing at a different id without shipping code, and it makes rollback a config change measured in seconds.

## Inference modes and the latency budget

Real-time (online) inference scores per request and is what most interactive products need. Batch inference precomputes predictions offline (nightly scoring of every user) and serves them from a cache, which is cheapest when inputs change slowly. Streaming inference scores events as they arrive. Micro-batching, grouping requests that land within a few milliseconds into one model call, trades a tiny latency increase for large throughput gains and is essential on GPUs.

Meeting the latency budget is mostly a feature-fetch problem, not a model-math problem. The model forward pass is often the cheap part; fetching dozens of features per request from an online store is where the milliseconds go. Co-locate or cache online features next to the model service, batch the reads, and keep the hot set in memory. If your budget is 30ms and feature fetch is 20ms of it, optimizing the model buys you little.

**Interview nuance:** the question that fails most candidates is "what happens when the model service is down." A strong answer is a graceful degradation ladder: serve the last cached prediction, then a simpler fallback model that needs fewer or no features, then a static heuristic or default, and only then error. A fraud system, for example, falls back to strict rules rather than approving everything; the fallback's bias should fail safe for the domain.

**Recap:** roll models out through shadow to canary to A/B with automatic rollback on an online metric, keep versioned artifacts in a registry so rollback is a hot config switch, pick batch/real-time/streaming inference with micro-batching for throughput, spend your latency budget on feature fetch, and always have a graceful degradation ladder for when the model is unavailable.
`.trim()

export const systemDesignLevel11: DesignLevel = {
  id: 11,
  slug: "specialized-systems",
  title: "Level 11 — Modern & Specialized Systems",
  tagline:
    "The frontier: ML systems, LLM and GenAI infrastructure, real-time analytics and globally consistent data, and IoT, edge, and time-series.",
  estimatedHours: 8,
  modules: [
    {
      id: "sd-l11-m1",
      title: "ML Systems Design",
      description:
        "Design the production systems around a model rather than the model itself: the two-plane blueprint that wires data, features, training, serving, and a feedback loop; a feature store that kills training/serving skew; a real-time recommendation funnel that keeps heavy models off the hot path; and a serving/rollout layer that ships model updates safely and degrades gracefully when the model service is down.",
      lessons: [
        {
          id: "sd-l11-ml-blueprint",
          title: "End-to-End ML System Blueprint",
          summary:
            "Frame business metric to ML objective to label, split an offline training plane from an online serving plane, cascade candidate generation to ranking to re-ranking to hit latency, and close a feedback log so you can retrain and detect drift.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["ml-systems", "serving", "drift"],
          teach: { markdown: mlBlueprintTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l11-ml-blueprint-apply",
            prompt:
              "Design an ML platform that serves a click-through-rate model at 50k QPS with p99 < 30ms, retrains daily, and detects when the model degrades.",
            thinkAbout: [
              "How do the offline training plane and online serving plane differ?",
              "How does a retrieval-ranking funnel keep heavy models off the hot path?",
              "How do you detect drift and fall back when the model service is down?",
            ],
            modelAnswerOutline: [
              "Assumptions: 50k QPS ranking requests, p99 < 30ms end to end, daily retrain acceptable (CTR concept drifts slowly), a click label arrives within a 30-minute attribution window, and we control both the app and the pipeline.",
              "**Frame it:** business metric is revenue per session, ML objective is predicted CTR, label is click-within-window. We optimize offline log-loss and calibration but gate launches on an online A/B lift in CTR and revenue, because offline AUC gains routinely fail to transfer.",
              "**Two planes.** Offline: raw impression and click logs land in the warehouse (S3 plus Spark or BigQuery); a daily job builds point-in-time-correct training data, trains the model, evaluates against a holdout and the current champion, and pushes a versioned artifact to a model registry. Online: a stateless ranking service fetches precomputed features from an online store (Redis or DynamoDB, single-digit-ms), scores candidates, and returns. One shared feature definition feeds both to avoid skew.",
              "**Latency funnel** to hit p99 < 30ms at 50k QPS: candidate generation narrows the catalog to a few hundred cheaply (embedding ANN or filters), the CTR model ranks only those hundreds, and re-ranking applies business rules on the top items. Budget roughly: feature fetch 5ms, candidate gen 5ms, ranking 15ms, re-rank plus overhead 5ms. Micro-batch scoring within a request to amortize model overhead.",
              "**Rollout:** push artifact to registry, run it in shadow, then canary at 1 to 5 percent with automatic rollback if online CTR or latency regresses. Keep the prior artifact loaded for instant revert.",
              "**Monitoring and fallback:** log every prediction with features and the eventual click for retraining and drift detection. Alarm on data drift, concept drift, prediction drift, and feature-null spikes. When the model service is down or slow, degrade gracefully: serve cached predictions, then a cheap fallback model, then a popularity or recency heuristic, never a 500. Common wrong turn: omitting the feedback log (makes retraining and drift detection impossible), or treating the model deploy as a stateless push with no shadow or rollback.",
            ],
          },
          practice: {
            id: "sd-l11-ml-blueprint-practice",
            prompt:
              "Design the ML platform for Uber Eats delivery-time estimation (ETA) serving 500k QPS globally with p99 < 50ms, where a bad estimate directly hurts orders and the ground-truth label (actual delivery time) only arrives 30 to 60 minutes after the prediction.",
            thinkAbout: [
              "Why does an asymmetric cost change the loss function?",
              "How does a 30-60 minute label delay reshape the feedback loop and monitoring?",
              "How do you serve globally at 500k QPS with real-time features?",
            ],
            modelAnswerOutline: [
              "Assumptions: 500k QPS, p99 < 50ms, global multi-region, label delay of 30 to 60 minutes, and ETA errors are asymmetric (underestimating by 20 minutes is worse than overestimating).",
              "**Framing:** business metric is order conversion and customer satisfaction; ML objective is predicted delivery minutes; label is observed delivery time, available only after the trip completes. The asymmetric cost means we do not minimize plain squared error; we use a quantile or asymmetric loss so the model slightly over-predicts, because a late surprise costs far more than a padded estimate.",
              "**Label delay reshapes the feedback loop.** Predictions are logged immediately; a delayed-join pipeline (Kafka plus Flink, or a scheduled warehouse join) attaches the actual delivery time 30 to 60 minutes later to produce training rows. Retrain daily, but monitor in near-real-time on leading signals that do not need the label: input drift (order volume, weather, restaurant prep-time features) and prediction drift. You cannot compute accuracy live because labels lag, so you alert on distribution shift, not error, until labels land.",
              "**Serving at 500k QPS globally:** deploy the model service per region with regional online feature stores (real-time features like current courier density and restaurant queue depth come from a streaming pipeline). The funnel is light here (no huge candidate set), so the budget is feature fetch plus a single model score; cache and co-locate hot features to stay under 50ms. Autoscale on GPU or CPU utilization.",
              "**Rollout and fallback:** shadow then canary per region with rollback on prediction drift or a business KPI. When the model or feature store is degraded, fall back to a segment-level heuristic (median delivery time by city and hour and distance band) rather than failing the order flow.",
              "Common wrong turn: treating this like the CTR case and alarming on live accuracy, which is impossible under 30 to 60 minute label delay; the correct move is drift-based monitoring plus a delayed-label join.",
            ],
          },
        },
        {
          id: "sd-l11-feature-store",
          title: "Feature Stores & Training/Serving Skew",
          summary:
            "A feature store uses a dual offline/online store fed by one definition to kill code-divergence skew, enforces point-in-time as-of joins to prevent label leakage, tiers features by freshness SLA, and proves correctness by comparing served vectors to offline vectors.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["feature-store", "training-serving-skew", "point-in-time"],
          teach: { markdown: featureStoreTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l11-feature-store-apply",
            prompt:
              "Design a feature store that serves precomputed features online at single-digit-ms latency while guaranteeing the exact same feature values are used at train time.",
            thinkAbout: [
              "How do offline and online stores split responsibilities?",
              "How does point-in-time correctness avoid label leakage?",
              "How does a single feature definition eliminate skew?",
            ],
            modelAnswerOutline: [
              "Assumptions: hundreds of features across a few entity types (user, item, merchant), millions of entities, online reads at single-digit-ms p99, and both batch and streaming features in scope.",
              "**Architecture:** a single declarative feature definition (transformation plus entity key plus data source) is the source of truth. One pipeline materializes it into two stores. The offline store is Parquet on S3 or a warehouse holding the full timestamped history, used for training-time point-in-time joins. The online store is Redis or DynamoDB holding only the latest value per entity key, used for inference-time point lookups. Because both derive from the same definition and pipeline, the serving path and training path compute features identically.",
              "**Serving path:** the model service does a batched key lookup against the online store (Redis MGET or DynamoDB BatchGetItem) keyed by entity id. Co-locate the store with the model service and keep the working set in memory to hit single-digit-ms.",
              "**Training path:** to build a row for entity E at event time T, do an as-of join against the offline store that selects each feature's last value strictly before T. This point-in-time correctness prevents leakage: you never let a value computed after the labeled event enter its training row.",
              "**Freshness tiers:** batch features recompute on a schedule (hourly/daily); streaming features update in seconds via Kafka plus Flink writing straight to the online store; on-demand features compute at request time. A registry stores definitions, owners, lineage, and freshness SLAs so features are reused and high-cardinality cost is visible.",
              "**Correctness proof:** periodically log the feature vector actually served and compare it against the offline-computed vector for the same entity and timestamp; any mismatch rate is skew and pages the owner. Common wrong turn: computing features separately in serving code and training code (code-divergence skew), or joining current feature values into historical training rows (label leakage), both of which produce great offline metrics and bad production behavior.",
            ],
          },
          practice: {
            id: "sd-l11-feature-store-practice",
            prompt:
              "Design the feature store for a real-time fraud model at a payments company processing 20k transactions/sec, where features include 5-second, 1-minute, and 24-hour aggregates over card and device, and a stale or skewed feature directly lets fraud through.",
            thinkAbout: [
              "How do you maintain multi-scale streaming aggregates without recomputing in the request path?",
              "Why does point-in-time correctness matter when chargeback labels arrive weeks later?",
              "How do you degrade when the streaming pipeline lags?",
            ],
            modelAnswerOutline: [
              "Assumptions: 20k TPS, sub-10ms feature-fetch budget on the authorization path, features span very short windows (5s, 1m) to long windows (24h), and correctness is a security property, not just accuracy.",
              "**The hard part is streaming aggregates at multiple time scales.** Use a streaming engine (Flink or Kafka Streams) maintaining windowed aggregations per card and per device: count and sum over 5-second, 1-minute, and 24-hour sliding windows. Flink writes the current window state into the online store (Redis, or an in-memory keyed state) so the auth path does a point lookup, not a recompute. The 5-second and 1-minute windows are the differentiator for velocity fraud (many rapid attempts) and demand real streaming, not batch.",
              "**Dual store with one definition still holds:** the same window definitions materialize both to the offline store (for point-in-time training joins over historical transactions) and to the online store. Point-in-time correctness is critical here because fraud labels (chargebacks) arrive weeks later; joining the current 24-hour aggregate onto an old transaction would leak the future and inflate offline metrics while missing live fraud.",
              "**Latency:** the auth path cannot afford a recompute, so features must be precomputed and read in under 10ms; co-locate Redis, batch the reads, and keep card/device keys hot. On-demand features (amount versus the card's usual amount) combine the request with a stored profile.",
              "**Skew and freshness monitoring:** because a stale feature is exploitable, alarm on streaming lag (Flink watermark delay) and on served-versus-offline vector mismatch. If the streaming pipeline lags, the model is effectively blind to velocity, so degrade to a stricter rule-based fallback rather than approving on stale features.",
              "Common wrong turn: computing short-window aggregates in the request path (too slow at 20k TPS) or ignoring streaming lag, which silently disables the exact velocity features that catch fraud.",
            ],
          },
        },
        {
          id: "sd-l11-realtime-recommendation",
          title: "Real-Time Recommendation Systems",
          summary:
            "Cascade two-tower plus ANN candidate generation into a multi-task ranker into diversity re-ranking to hit p99 under 100ms, feed recent clicks through Kafka/Flink for real-time reaction, handle cold start with content features and popularity, and evaluate with exploration plus online A/B to escape feedback-loop bias.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["recommendation", "two-tower", "ann"],
          teach: { markdown: realtimeRecommendationTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l11-realtime-recommendation-apply",
            prompt:
              "Design a home-feed recommender (short-video or e-commerce) that personalizes in real time from the user's last few clicks with p99 < 100ms.",
            thinkAbout: [
              "What are the stages of the candidate-to-ranking funnel?",
              "How do two-tower embeddings + ANN retrieve candidates?",
              "How do you handle cold start and feedback-loop bias?",
            ],
            modelAnswerOutline: [
              "Assumptions: catalog of tens of millions of items, tens of millions of active users, p99 < 100ms per feed request, and reactivity to the user's last few interactions within seconds.",
              "**Funnel:** candidate generation narrows millions to ~1000, ranking scores those to ~100, re-ranking picks a diverse ~20, business rules dedup and apply blocklists and ads. Budget: retrieval ~10ms, feature fetch ~10ms, ranking ~40ms, re-rank and overhead ~20ms.",
              "**Candidate generation:** two-tower model. An item tower encodes item features into vectors, precomputed offline nightly and loaded into an ANN index (HNSW for high recall). A user tower encodes the user's features and recent history into a vector at request time. ANN returns the nearest ~1000 item vectors in a few ms, sublinear in catalog size. Add a few parallel retrieval sources (trending, followed authors) and union the candidates.",
              "**Ranking:** a multi-task deep model scores the ~1000 candidates on click, dwell/watch-time, and conversion, combined into one calibrated score using richer cross-features affordable at this scale. **Re-ranking:** apply diversity (avoid five near-identical items), freshness, and business rules.",
              "**Real-time signals:** the user's recent clicks stream through Kafka plus Flink and update fast features or the user embedding within seconds (near-line), so the feed reflects what they just did without slowing the request path.",
              "**Cold start:** new users get popularity plus context plus onboarding-topic signals until history accrues; new items get an embedding from content features in the item tower, so they are retrievable before any interactions. **Feedback-loop bias:** click logs suffer position and popularity bias, so reserve exploration slots (bandits or epsilon-random) to gather counterfactual data, and evaluate launches with online A/B, not offline AUC alone. Common wrong turn: running the ranking model over the whole catalog (blows the latency budget) or evaluating only on biased click logs.",
            ],
          },
          practice: {
            id: "sd-l11-realtime-recommendation-practice",
            prompt:
              "Design TikTok's For You feed at 1M+ recommendation requests/sec globally, where the model must react within one or two videos to a user's watch signals (skip, replay, like) and the catalog includes videos uploaded seconds ago.",
            thinkAbout: [
              "Why are implicit watch signals richer than sparse likes, and how do they update the session embedding?",
              "How do content embeddings plus exploration solve fresh-content cold start?",
              "How do you serve 1M+ QPS with a huge, fast-turning item index?",
            ],
            modelAnswerOutline: [
              "Assumptions: over 1M QPS, p99 < 100ms, extreme reactivity (behavior on the current video should shift the next few), and a firehose of brand-new videos that must be discoverable within minutes.",
              "**Reactivity is the defining constraint.** Implicit signals dominate: watch-time ratio, replays, skips, and quick swipe-aways are far richer than sparse likes. Stream these through Kafka plus Flink and update the user's session embedding and fast counters within seconds, so candidate generation and ranking both see the just-watched signal. The user tower is recomputed per request from this fresh session state, which is what makes the feed pivot after one or two videos.",
              "**Fresh-content cold start is the second hard part.** New videos have no interaction history, so retrieval must use content embeddings (video and audio understanding) so a seconds-old upload already sits in the ANN space. Pair this with aggressive exploration: route a slice of new videos into feeds to gather early engagement signal quickly, then let the ranker take over once signal accrues. Without exploration, new creators never surface and the feedback loop starves.",
              "**Serving at 1M+ QPS:** shard everything regionally with per-region ANN indexes and model replicas; the item index is huge, so it is sharded and the retrieval fans out and merges. Keep item vectors refreshed continuously (near-line) rather than only nightly because the catalog turns over fast.",
              "**Ranking** is multi-task on watch-time, completion, replay, and share, calibrated and combined; diversity re-ranking prevents ten near-identical clips. Evaluate with online A/B and guard against popularity and position bias, which on a firehose catalog would otherwise collapse the feed onto a few viral videos.",
              "Common wrong turn: nightly-only embedding refresh (misses fresh content) or optimizing likes instead of watch-time signals, which under-uses the strongest, densest feedback TikTok has.",
            ],
          },
        },
        {
          id: "sd-l11-online-serving-rollout",
          title: "Online Model Serving & Rollout",
          summary:
            "Roll models out through shadow to canary to A/B with automatic rollback on an online metric, keep versioned artifacts in a registry so rollback is a hot config switch, pick batch/real-time/streaming inference with micro-batching for throughput, spend your latency budget on feature fetch, and always have a graceful degradation ladder for when the model is unavailable.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["model-serving", "rollout", "fallback"],
          teach: { markdown: onlineServingRolloutTeach, estimatedMinutes: 14 },
          apply: {
            id: "sd-l11-online-serving-rollout-apply",
            prompt:
              "Design the serving/rollout layer for a fraud model that must update multiple times per day without downtime and be instantly reversible.",
            thinkAbout: [
              "Which rollout strategy gives instant, reversible model updates?",
              "How do you meet the feature-fetch latency budget on the serving path?",
              "How do you degrade gracefully when the model service is down?",
            ],
            modelAnswerOutline: [
              "Assumptions: fraud scoring sits inline on the payment authorization path with a tight budget (under 50ms), models update several times a day as fraud tactics shift, updates must be zero-downtime and instantly reversible, and errors must fail safe (a false decline beats approving fraud).",
              "**Artifacts and registry:** every model is a versioned, reproducible artifact (weights plus feature schema plus preprocessing) in a registry addressed by id. The serving service loads an artifact by id, so a model change is a config pointer change, not a code deploy. Keep the current and previous artifacts hot in memory so rollback is an in-process switch measured in seconds.",
              "**Rollout:** push the new artifact and run it in shadow on live authorizations, logging its decisions while the current model still decides, so you compare fraud-catch and false-positive rates on identical transactions with zero risk. Promote to canary at a small percentage watching precision, recall proxies, and latency, with a controller that auto-rolls back on regression. Because both artifacts are loaded, rollback is instant.",
              "**Latency budget:** the model math is cheap; feature fetch dominates. Precompute and co-locate online features (card and device velocity aggregates from a streaming pipeline) in Redis next to the service, batch the reads, and keep hot keys in memory to stay well under budget. Do not recompute aggregates in the request path.",
              "**Graceful degradation:** if the model service or feature store is unavailable, degrade down a ladder rather than approving blindly: use a cached recent score, then a simpler fallback model needing few features, then a strict rule-based engine (velocity and amount thresholds) that fails safe by declining suspicious transactions. Never default to approve.",
              "Common wrong turn: no fallback path, so when the model or its feature store is down the system either errors out the entire payment flow or, worse, approves everything, both unacceptable for fraud.",
            ],
          },
          practice: {
            id: "sd-l11-online-serving-rollout-practice",
            prompt:
              "Design the serving and rollout layer for an ads ranking model at a company like Meta, serving 3M+ inferences/sec on a shared GPU fleet, where a bad rollout directly loses ad revenue and a full retrain ships several times a day.",
            thinkAbout: [
              "Why is micro-batching essential to keep the GPU fleet utilized at 3M QPS?",
              "Why gate rollout on calibration, not just AUC, when ads are priced on predicted value?",
              "Why does interleaving beat split A/B for noisy ad-ranking metrics?",
            ],
            modelAnswerOutline: [
              "Assumptions: over 3M QPS on GPUs, revenue is measured in real time so regressions are visible in minutes, multiple ships per day, and GPU cost is a first-order constraint.",
              "**Throughput on GPUs:** micro-batch requests arriving within a few milliseconds into one forward pass to keep GPU utilization high; a per-request-per-GPU-call design would waste the fleet. Autoscale on GPU utilization and queue depth, and separate candidate retrieval (CPU, ANN) from ranking (GPU) so the expensive GPU stage runs only on the narrowed candidate set.",
              "**Rollout with money on the line:** shadow every new ranking model on live traffic and compare predicted-versus-realized value, then use interleaving or A/B to measure revenue lift with tight confidence, because ad ranking metrics are noisy and interleaving needs far fewer samples than split A/B. An automatic controller rolls back on a revenue or latency regression; the previous artifact stays loaded on the fleet for an instant switch.",
              "**Calibration is critical:** ads are priced on predicted value, so a miscalibrated but higher-AUC model can still lose money, and you gate on calibration, not just ranking quality.",
              "**Artifacts:** versioned in a registry, weights separate from serving code, so shipping several times a day is pointer changes plus artifact loads, not binary redeploys. **Latency and degradation:** keep latency low with cached embeddings and co-located features; if the ranking model is degraded, fall back to a lighter model or to a cached/heuristic ranking so ads still serve (empty ad slots lose revenue directly) rather than erroring.",
              "Common wrong turn: gating rollout on offline AUC while ignoring calibration, so a model that ranks slightly better but misprices auctions ships and quietly loses revenue, or skipping micro-batching and melting the GPU budget at 3M QPS.",
            ],
          },
        },
      ],
    },
  ],
}
