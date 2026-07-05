> Module **sd-l1-m2** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l1-m1](./sd-l1-m1.md) · Next: [sd-l1-m3](./sd-l1-m3.md)

# L1 · API Design & Contracts

After this module you can choose the right API paradigm for a consumer and traffic shape, design a schema-first contract that evolves without breaking clients, make mutating calls safe to retry, paginate and model errors at scale, pick the correct real-time delivery mechanism, and use HTTP semantics, serialization, and compression like someone who has run these systems in production. These are the building blocks every later "Design X" question assumes you already know.

### sd-l1-api-paradigms: REST vs gRPC vs GraphQL

- **id:** `sd-l1-api-paradigms`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** api-design, grpc, graphql

#### Learn
An API paradigm is a bet about who the consumer is and what the traffic looks like. Pick it after you know those two things, not before.

REST is resource-oriented over HTTP. You model nouns (`/orders/123`), lean on HTTP methods and status codes, and get the entire HTTP ecosystem for free: caching via `Cache-Control` and `ETag`, proxies, CDNs, browser tooling, and near-universal client support. That ubiquity is why REST is the default for public developer APIs. The cost is chattiness. A mobile screen that needs a user, their last five orders, and a loyalty balance may make three round trips, and REST tends to over-fetch (you get the whole resource) or under-fetch (you need another call).

gRPC is contract-first RPC. You define services and messages in a Protobuf `.proto` file, generate typed clients and servers in every language, and send compact binary frames over HTTP/2 with multiplexing and bidirectional streaming. On an internal service mesh at high QPS this is the winner: a Protobuf payload is often 3 to 10 times smaller than the equivalent JSON, parsing is faster, and the generated stubs make cross-service calls feel like local function calls. The cost is that it is unfriendly to browsers (you need grpc-web plus a proxy) and to casual `curl` debugging, and HTTP caches cannot see inside a binary POST.

GraphQL exposes a single typed schema and lets the client ask for exactly the fields it wants in one request. That directly solves the over/under-fetching problem for clients with varied, evolving data needs, which is why product teams with many screens and one flexible backend reach for it. The costs are real: HTTP caching mostly stops working because everything is a POST to `/graphql`, you must add explicit query-cost limiting and depth limiting to stop a client from asking for the whole graph, and the resolver layer invites N+1 database calls unless you add DataLoader-style batching.

The honest real-world answer is usually hybrid. Put REST or GraphQL at the edge where public or client-facing consumers live, and use gRPC between your own services where you control both ends and care about latency and bytes. Netflix, Uber, and Google all run this split.

Two more tools round out the picture. WebSocket and SSE handle server push (chat, live updates) where request/response does not fit. Message queues (Kafka, SQS) handle asynchronous decoupling, where the caller should not wait at all.

Interview nuance: interviewers probe whether you can name what each paradigm *costs*, not just what it optimizes. "GraphQL is flexible" is a junior answer; "GraphQL trades HTTP caching and needs query-cost limits" is a senior one.

Recap: match paradigm to consumer and traffic (REST public, gRPC internal, GraphQL flexible clients), and expect the real answer to be a hybrid.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Recommend the API style for (a) a public developer API, (b) internal service-to-service calls, and (c) a mobile client with varied data needs, and defend each.

**Think about:**
- What does each paradigm optimize, and what does it cost?
- Why is a hybrid (REST/GraphQL edge, gRPC internal) the common real answer?
- Where do WebSocket/SSE and queues fit for push and async?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: a company with external developers, dozens of internal microservices, and a mobile app with many screens.

(a) Public developer API: REST. External developers already know REST, want `curl`-debuggable endpoints, and benefit from HTTP caching, standard status codes, and OpenAPI-generated docs and SDKs. The chattiness cost is acceptable because we cannot dictate client behavior and ubiquity matters more than bytes. I would version it (`/v1`) and document it with OpenAPI.

(b) Internal service-to-service: gRPC. We own both ends, so contract-first Protobuf gives us typed generated clients, compact binary frames over HTTP/2, and streaming. At high internal QPS the 3 to 10x payload reduction and faster parsing directly cut CPU and tail latency, and the shared `.proto` becomes the enforced contract. Browser-unfriendliness does not matter here.

(c) Mobile client with varied data needs: GraphQL at the edge (often via a BFF). Mobile screens need different field combinations and mobile networks punish extra round trips, so letting the client fetch exactly what a screen needs in one request removes over/under-fetching. I would add persisted queries plus query-depth and cost limits so a bad client cannot ask for the entire graph, and DataLoader batching to avoid N+1.

The unifying point is that these coexist: GraphQL or REST at the edge resolves down into gRPC calls between services. For push (a live order-status screen) I would add SSE or WebSocket, and for async work (sending the confirmation email) I would drop an event on Kafka rather than block the request.

Common wrong turn: choosing GraphQL or gRPC because they sound modern, before establishing the consumer and traffic shape. gRPC on a public browser API or GraphQL with no cost limiting both cause real production pain.

**Self-check rubric:**
- [ ] Did I name a distinct paradigm for each of the three consumers?
- [ ] Did I state a concrete *cost* for each choice, not just a benefit?
- [ ] Did I explain why a hybrid edge/internal split is normal?
- [ ] Did I place push (WebSocket/SSE) and async (queues) correctly?
- [ ] Did I avoid picking a paradigm as a buzzword before defining the consumer?

#### Practice: real-world variant (save, then reveal)
**Prompt:** Design the API surface for Stripe-scale infrastructure: a public payments API used by millions of external developers, plus the internal fraud, ledger, and notification services behind it that must handle tens of thousands of charge requests per second. Choose paradigms per layer and justify against caching, debuggability, latency, and contract enforcement.

**Model answer (revealed on demand):**
Assumptions: external developers integrate over the internet with mixed languages; internally a charge fans out to fraud scoring, ledger writes, and notifications at 10k to 50k QPS.

Public layer: REST with JSON. Developers need to `curl` a charge, read predictable status codes, and paste examples into any language. Stripe famously does exactly this, and pairs it with `Idempotency-Key` support (covered later in this module) so retries are safe. I version with a date-based scheme and keep evolution additive. REST also lets us document with OpenAPI and auto-generate SDKs.

Internal layer: gRPC between the API service and fraud, ledger, and notification services. At 10k+ QPS the Protobuf payload savings and HTTP/2 multiplexing cut both bytes and CPU, and generated stubs make the fan-out ergonomic. The `.proto` files are the enforced contract across teams, and Protobuf field-number rules keep them evolvable. Fraud scoring can use a streaming RPC if signals arrive incrementally.

Async layer: the charge request should not block on sending a receipt email or updating analytics. I publish a `charge.succeeded` event to Kafka; the notification service consumes it independently, which decouples latency and lets each side scale and fail on its own.

I would not use GraphQL here: the public payments API is a small, stable set of resources (charges, refunds, customers), not a screen-driven UI with varied field needs, so GraphQL's flexibility buys nothing while costing us HTTP caching and cost-limiting complexity.

Common wrong turn: forcing one paradigm everywhere. REST internally would waste bytes and CPU at this QPS; gRPC publicly would break `curl` and browser developers. The layered split is what makes it work.

### sd-l1-contract-design: Contract & Schema-First Design

- **id:** `sd-l1-contract-design`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** api-design, contracts, schema

#### Learn
A contract is the promise your API makes to its consumers about shape, names, types, and behavior. The durable version of that promise is a machine-readable schema that is the single source of truth, not prose in a wiki and not whatever the code happens to return today.

Schema-first means you write the schema before or alongside the code and generate everything else from it: OpenAPI for REST, a Protobuf IDL for gRPC, or SDL for GraphQL. From that one artifact you generate typed server stubs, client SDKs in every language, request validation, and reference docs. The payoff is that the contract cannot silently drift from the implementation, because the implementation is generated from (or validated against) the contract in CI.

Good contract design is mostly disciplined naming and typing:

- Resources are nouns, not verbs: `POST /orders`, not `POST /createOrder`. The HTTP method already carries the verb.
- Casing is consistent everywhere (pick `snake_case` or `camelCase` and never mix).
- Types are explicit, including nullability. A field is either always present or documented optional; "sometimes null, sometimes missing" is how clients break.
- Enums are closed sets with documented values, and unknown values are handled by tolerant readers rather than crashing.
- Units and formats are explicit: `amount_cents` not `amount`, ISO-8601 timestamps, currency codes.

The other half is designing for evolution. You want additive, non-breaking change to be the default: adding an optional field or a new endpoint must never break an existing consumer. The tolerant-reader pattern (ignore fields you do not recognize, do not choke on extra data) is what makes that safe on the consumer side. In Protobuf you never renumber or reuse a field tag; in GraphQL you deprecate a field rather than delete it; in REST you add fields rather than repurpose them.

Enforcement is where teams actually get burned. Consumer-driven contract testing (Pact is the common tool) captures each consumer's real expectations as a contract and replays them against the provider in CI. If a provider is about to ship a change that violates a consumer's expectation, the build fails *before* deploy, not at 2am in production. This is the single highest-leverage practice for teams shipping independent services.

Interview nuance: when asked "how do you keep two teams' services compatible," the strong answer is "schema as source of truth plus consumer-driven contract tests in CI," not "we coordinate releases." Coordination does not scale past a handful of services.

Recap: make a machine-readable schema the source of truth, name and type it for tolerant additive evolution, and enforce it with consumer-driven contract tests in CI.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Design the contract for a "create order" endpoint: resource naming, request/response schema, required vs optional fields, and how a client discovers it.

**Think about:**
- What is the source of truth for the contract, and how is it enforced?
- How do you design for additive, non-breaking evolution?
- How do consumer-driven contract tests catch breakage in CI?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: a REST API consumed by a web app and a mobile app maintained by other teams.

Source of truth: an OpenAPI 3 document, checked into the repo, from which we generate the server stub, client SDKs, and docs. CI validates that the running service conforms to it.

Resource and method: `POST /v1/orders`. Noun resource, `POST` to create, returns `201 Created` with a `Location: /v1/orders/{id}` header and the created resource body.

Request schema (JSON, `snake_case`):
```
{
  "customer_id": "cus_123",        // required
  "currency": "usd",               // required, ISO-4217
  "line_items": [                  // required, >= 1
    { "sku": "ABC", "quantity": 2 }
  ],
  "idempotency_key": "uuid",       // optional but recommended
  "note": "gift wrap"              // optional
}
```
Response includes a server-generated `id`, `status` (enum: `pending|confirmed|failed`), `amount_cents` (integer, explicit units), and `created_at` (ISO-8601). Required vs optional is explicit in the schema, and unknown fields sent by clients are ignored (tolerant reader).

Discovery: the client discovers the contract from published OpenAPI docs plus a generated SDK, not by reading our source. A sandbox base URL lets them integrate before going live.

Evolution: all future change is additive. Adding `discount_cents` later is safe because existing clients ignore unknown fields; I would never rename `amount_cents` or change `status` from a string to an object. Removing or renaming a field forces a version bump.

Enforcement: consumer-driven contract tests (Pact). The web and mobile teams publish the fields and shapes they actually depend on, and our provider CI replays those and fails the build if we would break them.

Common wrong turn: an ad-hoc contract that renames or removes fields between releases, or "optional" fields that are sometimes missing and sometimes null, both of which break consumers silently.

**Self-check rubric:**
- [ ] Did I name a concrete schema format (OpenAPI/Protobuf/SDL) as the source of truth?
- [ ] Did I use noun resources, consistent casing, explicit types, units, and enums?
- [ ] Did I mark each field required vs optional and handle unknown fields?
- [ ] Did I describe additive-only evolution and what forces a version bump?
- [ ] Did I explain how contract tests catch breakage in CI before deploy?

#### Practice: real-world variant (save, then reveal)
**Prompt:** Design the contract governance for a company with 200 microservices owned by 40 teams, where the payments team's `PaymentIntent` message is consumed by 15 other services. Explain how you prevent one team's schema change from breaking the other 14 consumers, and how the contract stays the source of truth at that scale.

**Model answer (revealed on demand):**
Assumptions: gRPC internally with Protobuf, services deploy independently many times a day, no shared release train.

Single source of truth: all `.proto` files live in a central schema repository (a monorepo of protos or a schema registry). Nobody hand-writes message types; every service generates its stubs from the published protos. This guarantees the wire contract and the code cannot drift.

Compatibility enforcement in CI: a schema-linter (Buf is the standard) runs on every proto change and rejects breaking changes automatically. It enforces the Protobuf rules that matter: never reuse or renumber a field tag, never change a field's type, mark removed fields `reserved`. Additive change (new optional fields, new RPCs) passes; a breaking change fails the PR before merge.

Consumer awareness: the schema registry tracks which of the 15 services consume `PaymentIntent`. A proposed change surfaces the consumer list on the PR so the payments team knows the blast radius. For behavioral (not just structural) expectations, consumer-driven contract tests capture what each of the 14 consumers actually reads, and the payments provider build replays them.

Evolution discipline: to change semantics, add `payment_intent_v2` fields alongside the old ones and migrate consumers one at a time, deprecating the old field with a documented sunset rather than deleting it. Removal happens only after telemetry shows zero readers.

At 200 services, coordination-by-meeting does not scale. The system holds because the schema is centralized, breaking changes are mechanically blocked in CI, and evolution is additive-first with per-consumer contract tests.

Common wrong turn: letting each team keep its own copy of the proto, or relying on release coordination. Both guarantee that some consumer breaks the first time two teams deploy out of sync.

### sd-l1-versioning: Versioning & Backward Compatibility

- **id:** `sd-l1-versioning`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** versioning, compatibility

#### Learn
Versioning exists to let you change an API without breaking the integrations already depending on it. The core insight most engineers miss: the best versioning strategy is to need it as rarely as possible. Most changes should be additive and never trigger a version bump at all.

Start with what breaks a client versus what does not. Adding an optional field, adding an endpoint, adding an enum value that clients already ignore when unknown: non-breaking. Removing a field, renaming a field, changing a type, tightening validation, changing default behavior: breaking. If you design for additive change and your clients are tolerant readers (they ignore unknown fields and do not assume the response is exhaustive), the large majority of your evolution costs zero version bumps.

When you genuinely must break, you choose a versioning mechanism:

- URL-path versioning (`/v1/orders`, `/v2/orders`). Visible, trivial to route, trivial to test with `curl`, and easy for developers to reason about. This is the pragmatic default for public REST APIs (Stripe, Twilio, GitHub all expose a visible version).
- Header or media-type versioning (`Accept: application/vnd.acme.v2+json`). Purer from a REST standpoint because the resource URL is stable, but it is invisible in a browser address bar, harder to test casually, and easy for a proxy to strip or ignore. GitHub offers it, but the path version is what most developers actually use.

Per-paradigm nuance: GraphQL avoids URL versions entirely and evolves field by field, marking old fields `@deprecated` with a reason and adding new ones. gRPC follows Protobuf's field-number rules: add new fields with new tags, never renumber, mark removed tags `reserved`, so old and new binaries interoperate.

Compatibility runs two directions. Backward compatibility: a new server can still serve old clients. Forward compatibility: an old client can tolerate data from a new server (this is exactly what the tolerant-reader pattern buys you). You want both, because in a distributed deploy the two sides are never upgraded at the same instant.

Finally, retiring a version is a sequenced migration, not a switch you flip. Deprecate (announce, document the replacement), warn (return `Deprecation` and `Sunset` headers, log usage, email the top callers), then remove only after telemetry shows traffic has drained. A hard cutover with no warning is how you generate an angry customer incident.

Interview nuance: the strongest signal is saying "I would design so most changes are additive and never bump the version, and only cut `/v2` for a true break," then describing the deprecate-warn-remove sequence. Jumping straight to "put v1 in the URL" misses that versioning is a last resort.

Recap: prefer additive change with tolerant readers so you rarely version, use visible `/v1` path versioning for true public breaks, and retire old versions with a deprecate then warn then remove sequence.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Design a versioning strategy that lets you ship a breaking change to a public API without breaking existing integrations.

**Think about:**
- URL-path vs header/media-type versioning, and which is the visible default?
- How do additive changes and tolerant readers avoid version bumps?
- How do you sequence a migration: deprecate, warn, remove?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: a public REST API with thousands of external integrations we do not control and cannot force to upgrade.

Default posture: minimize versioning. I design every response as additive-friendly and require tolerant readers on our own SDKs, so adding fields, endpoints, or enum values never breaks anyone and never needs a new version. Version bumps are reserved for true breaks: removing or renaming a field, changing a type, or changing default behavior.

Mechanism: URL-path versioning (`/v1`, `/v2`) as the visible default, because external developers can see it, route it, and `curl` it without ceremony. I would offer header/media-type versioning only if a client base specifically needs stable URLs. `/v1` and `/v2` run side by side; `/v2` is a new deployment or routing target, not a mutation of `/v1`.

Shipping the break: stand up `/v2` with the new shape while `/v1` keeps working unchanged. New integrations use `/v2`; existing ones keep running on `/v1`.

Migration sequence:
1. Deprecate: announce `/v2`, publish a migration guide and diff, update SDKs.
2. Warn: return `Deprecation: true` and a `Sunset: <date>` header on `/v1`, log per-caller usage, and proactively email the highest-volume `/v1` callers.
3. Remove: only after telemetry shows `/v1` traffic has drained to near zero past the sunset date, and even then consider returning a clear `410 Gone` rather than a silent failure.

Compatibility both ways: the `/v1` server must still serve old clients (backward), and old clients must tolerate any additive data (forward, via tolerant readers).

Common wrong turn: having no versioning story from day one, then discovering a design flaw you cannot fix without breaking everyone, or hard-removing `/v1` on a date with no warning headers and no drain, which turns a routine change into an outage for paying customers.

**Self-check rubric:**
- [ ] Did I say most changes should be additive and avoid a version bump?
- [ ] Did I pick visible `/v1` path versioning as the public default and justify it?
- [ ] Did I run old and new versions side by side rather than mutating in place?
- [ ] Did I sequence deprecate then warn (Sunset headers, telemetry) then remove?
- [ ] Did I address both backward and forward compatibility?

#### Practice: real-world variant (save, then reveal)
**Prompt:** Design a versioning model that lets you evolve a payments API for a decade while every integration written on day one still works (as Stripe has done since 2011, shipping changes constantly without ever breaking its API). Explain the mechanism and how new behavior reaches new callers without a `/v2`.

**Model answer (revealed on demand):**
Assumptions: hundreds of thousands of live integrations, many never touched after launch, that must not break, yet the product must keep evolving.

Mechanism: date-based, per-account pinned versions (this is Stripe's real model). Each account is pinned to the API version that was current when it integrated, for example `2020-08-27`. Every request runs against that pinned behavior unless the caller explicitly overrides it with a `Stripe-Version` header. So a business that integrated in 2013 keeps getting exactly the responses it was coded against, forever.

How new behavior ships: each breaking change becomes a new dated version. The backend keeps a chain of *request and response transformers*, one per dated version, that translate between the internal current model and each historical shape. A request from an old pinned account is up-converted to the current internal model, processed once, and the response is down-converted back through the transformer chain to that account's dated shape. There is one canonical implementation plus a stack of small, tested shims, not N forked codebases.

Upgrading: a caller opts in by changing their pinned version in the dashboard or sending the header, after reading the changelog for that date. There is no forced `/v2` migration and no sunset, because old versions cost only a thin transformer, not a parallel service.

Why not `/v1`, `/v2`: coarse URL versions force periodic painful migrations and tempt you to sunset old versions. Fine-grained dated versions plus transformers let evolution be continuous and backward compatibility be effectively permanent.

Common wrong turn: forking the whole service per version (unmaintainable at a decade scale) or relying on tolerant readers alone, which handles additive change but not the genuine behavioral breaks a payments API accumulates over ten years. The transformer chain is what makes "never break, always evolve" simultaneously true.

### sd-l1-idempotency-retries: Idempotency & Safe Retries

- **id:** `sd-l1-idempotency-retries`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** idempotency, retries, payments

#### Learn
The problem idempotency solves is the two generals nature of a network call. A client sends "submit payment," the server processes it, and then the response is lost to a timeout or a dropped connection. The client does not know whether the charge happened. If it retries naively, you double-charge. If it gives up, you might drop a real payment. Idempotency lets the client retry safely and get the *same* result every time.

Start with what HTTP already gives you. `GET`, `PUT`, and `DELETE` are idempotent by definition: sending them twice leaves the server in the same state as sending them once (`PUT` sets a value; setting it twice is the same value; `DELETE` twice still ends deleted). `POST` and `PATCH` are not idempotent, because "create" or "add $50" applied twice does two things. Those are exactly the methods that need explicit help.

The mechanism is an idempotency key. The client generates a unique key (a UUID) for the logical operation and sends it, typically as an `Idempotency-Key` header. The server, on first receipt, processes the request and stores the *full response* keyed by that key with a TTL (24 hours is a common window). On any retry with the same key, the server does not reprocess; it returns the stored response.

The subtle, commonly-missed detail: store the response, not just a boolean "seen it" flag. Two things force this. First, the retry must get the actual result (the charge id, the status), not just "yes." Second, concurrency: the original request and the retry can arrive at the same instant. You need a way for the second one to either wait for the first to finish or detect an in-flight operation, so they converge on one answer instead of both charging. In practice you insert the key into a store with a unique constraint (a Redis `SETNX` or a unique DB row) before doing work; the loser of that race waits and returns the winner's stored response.

This is also where delivery semantics matter. Networks and queues give you at-least-once delivery: a message can arrive more than once. Idempotency (deduplication on a key) is what turns at-least-once into effectively-once processing. You cannot get true exactly-once over an unreliable network; you get at-least-once plus idempotent handling, which is behaviorally equivalent and is what payment systems actually do.

The same pattern extends beyond synchronous APIs. Webhooks should carry an event id so the receiver can dedupe redelivered events, and message-queue consumers should dedupe on a key so a redelivered Kafka or SQS message is processed once.

Interview nuance: interviewers push on the concurrency case. "Store a flag" is the answer that fails; "store the response behind a unique-constraint insert so concurrent duplicates converge" is the one that passes.

Recap: give mutating requests a client-generated idempotency key, store the full response behind a unique constraint with a TTL, and return it on any retry so at-least-once delivery becomes effectively-once and nobody double-charges.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Make a "submit payment" POST safe to retry after a client timeout, and specify the server behavior on the duplicate.

**Think about:**
- Which HTTP methods are idempotent by definition, and which need explicit handling?
- What does the server store so concurrent duplicates get the same answer?
- How does at-least-once become effectively-once?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: a `POST /v1/payments` that charges a card, called by clients over flaky networks that will retry on timeout.

Why it needs help: `POST` is not idempotent, so a naive retry after a lost response double-charges. `GET`/`PUT`/`DELETE` would be safe by definition, but "charge a card" is inherently a create.

Design: the client generates a UUID per logical payment and sends it as `Idempotency-Key: <uuid>`. It reuses the *same* key on every retry of that payment.

Server behavior:
1. On receipt, atomically insert the key into a store with a unique constraint (a unique DB row, or Redis `SET key NX` with a TTL of 24 hours). This is the concurrency gate.
2. If the insert wins (first time), process the charge, then persist the full response (status, `payment_id`, amount) against the key, and return it.
3. If the insert loses (duplicate, whether a retry or a concurrent twin), do not charge again. Wait for the in-flight original to finish if needed, then return the *stored response*, so both callers get the identical `payment_id` and status.

Storing the full response, not a boolean, is what makes step 3 correct: the retry needs the real result, and two simultaneous requests must converge on one charge.

Edge cases: if the same key arrives with a *different* request body, return `422` (key reuse for a different operation). Give the stored record a TTL so keys do not accumulate forever.

Delivery semantics: the network is at-least-once. The idempotency key deduplicates, turning at-least-once into effectively-once processing, which is the practical stand-in for exactly-once, which is unachievable over an unreliable link.

Extend the same keys to webhooks (event id dedupe) and to any queue consumer that acts on the payment.

Common wrong turn: retrying without an idempotency key (double charge), or storing only a "seen" flag so concurrent duplicates either both charge or the retry gets no usable result.

**Self-check rubric:**
- [ ] Did I identify that POST is not idempotent and needs an explicit key?
- [ ] Did I use a client-generated key reused across retries?
- [ ] Did I store the full response, not a flag, with a TTL?
- [ ] Did I handle concurrency with an atomic unique-constraint insert so duplicates converge?
- [ ] Did I connect at-least-once delivery to effectively-once via dedup?

#### Practice: real-world variant (save, then reveal)
**Prompt:** Design idempotency for an event-driven order pipeline where a checkout publishes an `order.placed` event to Kafka, and three consumers (charge the card, decrement inventory, send confirmation) each process it. Kafka guarantees at-least-once delivery, so every consumer will occasionally see the same event twice. Make the whole pipeline effectively-once without a distributed transaction.

**Model answer (revealed on demand):**
Assumptions: Kafka at-least-once delivery, consumers can crash and reprocess after rebalance, no two-phase commit across the card processor, inventory DB, and email provider.

Core idea: idempotency is per consumer, keyed on the event id (or a deterministic derivative), because "effectively-once" must hold independently for each side effect. There is no global transaction; each consumer makes its own action idempotent.

Charge consumer: use the `order_id` (or the event id) as the `Idempotency-Key` to the payment API. Redelivery of `order.placed` reuses the same key, so the card is charged once even if the consumer processes the event twice. This reuses the exact synchronous idempotency mechanism above.

Inventory consumer: make the decrement idempotent by recording processed event ids. Insert `(event_id, order_id)` into a `processed_events` table with a unique constraint inside the *same* DB transaction that decrements stock. On redelivery the insert violates the constraint, the transaction aborts, and inventory is not double-decremented. This is the transactional-inbox pattern, and it makes "did I already handle this" and "the effect" atomic.

Email consumer: dedupe on event id before sending, and lean on the provider's own idempotency (SendGrid/SES message keys) so a redelivery does not send a second confirmation.

Offset commits: each consumer commits its Kafka offset only after its idempotent write succeeds, so a crash before commit causes a safe reprocess (which dedup absorbs) rather than a lost event.

Why no distributed transaction: a 2PC across a card processor, a database, and an email API is unavailable and slow. Independent per-consumer idempotency plus at-least-once delivery gives effectively-once end to end without coupling the three systems.

Common wrong turn: trying to make the pipeline exactly-once with a global transaction, or deduping in only one consumer and letting the others double-act, so inventory drifts or customers get two emails.

### sd-l1-pagination-errors: Pagination & Error Modeling

- **id:** `sd-l1-pagination-errors`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** pagination, errors, api-design

#### Learn
Two boring-looking API details, pagination and error shape, are where APIs quietly fall over at scale. Both have a correct answer.

Pagination first. The naive approach is offset/limit: `?offset=100000&limit=20`. Two problems. It is O(n) deep: to return page 5,000 the database must scan and discard the first 100,000 rows, so deep pages get linearly slower and hammer the DB. And it is unstable under inserts: if a new row is added at the top between fetching page 1 and page 2, every item shifts down by one, so the user sees a duplicate or skips a row. On a live feed this is constant.

The fix is cursor (keyset) pagination. Instead of "skip N rows," you say "give me rows after this position." With an indexed ordering column: `WHERE (created_at, id) < (:cursor_ts, :cursor_id) ORDER BY created_at DESC, id DESC LIMIT 20`. Because the DB seeks directly into the index rather than counting from the start, each page is O(1) regardless of depth, and because the cursor points at a stable row identity, inserts at the top do not shift the window. You return an opaque `next_cursor` (base64 of the last row's sort key) so the client cannot fabricate positions and you can change the encoding later. Always enforce a server-side max page size, and prefer a `has_more` boolean over an exact total count, because `COUNT(*)` on a large table is itself an expensive scan.

Now errors. Clients need machine-readable, consistent errors to retry correctly, and humans need enough detail to debug. The standard shape is RFC 9457 Problem Details (the successor to RFC 7807): a JSON body with `type` (a URI naming the error class), `title`, `status`, `detail`, and `instance`, plus a correlation id so a support ticket maps to a specific log line.

Status codes must be used precisely, because they drive client retry logic:

- `400` malformed request, `422` well-formed but semantically invalid (validation).
- `401` not authenticated, `403` authenticated but not allowed, `404` not found.
- `409` conflict (for example a version clash or duplicate), `429` rate limited.
- `5xx` server error.

The critical distinction is retryable versus not. `5xx` and `429` are retryable (with backoff, and honor `Retry-After` on `429`). `4xx` other than `429` are the client's fault and must not be blindly retried, because retrying a `400` just wastes calls and can amplify load.

Interview nuance: two things separate strong answers. Saying "keyset pagination is O(1) and stable, offset is O(n) and shifts under inserts" (with the SQL), and saying "structured errors so clients can distinguish retryable `5xx`/`429` from non-retryable `4xx`," plus the warning to never leak stack traces to clients.

Recap: use opaque cursor/keyset pagination with a bounded page size for O(1) stable paging, and return RFC 9457 structured errors with precise status codes so clients retry `5xx`/`429` but not other `4xx`.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Design a feed/list endpoint that stays fast at page 10,000 and is stable while new items are inserted, and define the error response shape for validation, auth, conflict, rate-limit, and server errors.

**Think about:**
- Why does offset pagination degrade and become unstable under inserts?
- What does a cursor/keyset page look like, and why is it O(1)?
- What structured error body and status codes let clients retry correctly?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: a `GET /v1/feed` returning items newest-first, with new items inserted continuously.

Pagination: cursor/keyset, not offset. Offset is rejected because `offset=200000` forces the DB to scan and discard 200k rows (O(n), slow at depth) and shifts every item when new rows are inserted at the top (duplicates and skips).

Request: `GET /v1/feed?limit=20&cursor=<opaque>`. Query:
```
SELECT ... FROM feed
WHERE (created_at, id) < (:cursor_ts, :cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT :limit + 1
```
with a composite index on `(created_at, id)`. Fetch `limit + 1` to compute `has_more` without a count. Response: `{ "items": [...], "next_cursor": "<opaque>", "has_more": true }`. The cursor is base64 of the last row's `(created_at, id)` so clients cannot forge positions and the encoding can evolve. Enforce a server max `limit` (say 100) and prefer `has_more` over `COUNT(*)`, which is an expensive scan.

Why O(1) and stable: the index seek jumps straight to the cursor position instead of counting from row zero, and the cursor pins a real row identity, so inserts above it do not move the window.

Error shape (RFC 9457 Problem Details):
```
{ "type": "https://api.acme.com/errors/validation",
  "title": "Invalid request",
  "status": 422,
  "detail": "limit must be <= 100",
  "instance": "/v1/feed",
  "correlation_id": "req_abc123" }
```
Status codes: `422` validation, `401` unauthenticated, `403` forbidden, `409` conflict, `429` rate limit (with `Retry-After`), `5xx` server error. Clients retry `5xx` and `429` with backoff and never blindly retry other `4xx`. Never leak stack traces; the correlation id is how support maps a ticket to a log line.

Common wrong turn: offset pagination on a large table (slow deep pages, unstable under inserts) and dumping raw exceptions or `200` with an error body, which breaks both retry logic and security.

**Self-check rubric:**
- [ ] Did I reject offset and use keyset with the WHERE/ORDER BY/LIMIT and an index?
- [ ] Did I explain why keyset is O(1) and stable under inserts?
- [ ] Did I return an opaque cursor, a bounded page size, and has_more over a count?
- [ ] Did I give a structured error body with type/title/status/detail plus a correlation id?
- [ ] Did I map precise status codes and separate retryable 5xx/429 from non-retryable 4xx?

#### Practice: real-world variant (save, then reveal)
**Prompt:** Design pagination and error handling for the Twitter/X home timeline at 500M tweets per day, where users scroll infinitely, new tweets stream in constantly, and the timeline is ranked (not strictly chronological). Explain how the cursor survives ranking and inserts, and how you keep p99 fast at deep scroll.

**Model answer (revealed on demand):**
Assumptions: hundreds of millions of daily tweets, infinite scroll, a ranked (not purely time-ordered) timeline, and a fan-out-on-write timeline cache per user.

Pagination: keyset cursor, never offset, because offset at deep scroll on this volume would be catastrophically slow and would shift wildly as new tweets arrive. The timeline is materialized per user (fan-out-on-write) into a cache like Redis, so the "list" is a precomputed, ordered set of tweet ids.

Cursor design for a ranked feed: the cursor is opaque and encodes the position in the materialized ranked list, not a raw `created_at`. Because ranking can reorder items, the cursor pins a stable snapshot boundary: it captures where the last page ended in the already-materialized list, so continued scrolling reads forward from that point rather than re-ranking from scratch. New tweets are inserted at the head of the materialized list; since the cursor points into the middle/tail, they do not disrupt the user's downward scroll (they appear on pull-to-refresh at the top instead). This is the standard "stable pagination over a snapshot, refresh brings new items at the top" model.

Keeping p99 fast at depth: serve pages from the per-user materialized Redis list (O(1) range reads by index/score), not by querying the tweet store with a deep scan. Deep scroll is just reading further into an in-memory ordered set. Cap page size, and cap total scroll depth (older items fall out of the hot cache and are served from a colder store or simply cut off).

Errors: RFC 9457 Problem Details with a correlation id, precise codes (`429` with `Retry-After` for the aggressive scroll case is common), and clients retry only `5xx`/`429`. At this scale rate limiting is first-class, so `429` handling on the client is essential.

Common wrong turn: offset pagination or re-ranking the entire timeline on every page (unstable and slow), or querying the source-of-truth tweet DB per page instead of a precomputed per-user timeline cache, which blows p99 at deep scroll.

### sd-l1-realtime-comms: Real-Time Delivery: Short-Poll, Long-Poll, SSE, WebSocket & Webhooks

- **id:** `sd-l1-realtime-comms`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** real-time, api-design, networking

#### Learn
"Real-time" is a menu, not a single choice. You pick from short-poll, long-poll, SSE, WebSocket, and webhooks by four axes: latency, connection cost at your fan-out, direction of data flow, and delivery guarantee. Getting this right is mostly about not paying for a duplex, stateful connection when the workload is one-directional.

Short-polling: the client re-requests every N seconds. Dead simple and fully stateless (any server can answer any poll), so it plays nicely with load balancers. The cost is wasted requests (most polls return nothing) and up to N seconds of latency. It fits low-urgency counters, like an unread badge that can lag a few seconds.

Long-polling: the client makes a request and the server holds it open until there is data or a timeout, then the client immediately re-requests. This gets you near-real-time latency over plain HTTP that works through every proxy and firewall. The cost is that each waiting client ties up a connection and a server-side handler, and you must handle timeouts and reconnects carefully. It is the universal-compatibility fallback.

Server-Sent Events (SSE): one long-lived HTTP response over which the server streams events (`text/event-stream`). It is purpose-built for one-way server-to-client streaming: notifications, live feeds, and streaming LLM tokens. It has automatic reconnection and a `Last-Event-ID` for resume built into the browser `EventSource` API, and because it is plain HTTP it passes through proxies and CDNs easily. Limits: there is no client-to-server channel (the client uses normal requests for that), and on HTTP/1.1 browsers cap concurrent connections per domain (about 6), which HTTP/2 multiplexing relieves.

WebSocket: after an HTTP upgrade you get a full-duplex TCP connection, so both sides can push at low latency. This is the right tool for genuinely bidirectional, low-latency work: chat, presence, collaborative editing, multiplayer. The costs are real: the connection is stateful, so scaling across many server nodes needs sticky sessions or, better, a pub/sub backbone (Redis, NATS, Kafka) so a message published on node A reaches a user connected to node B. You also own heartbeats (ping/pong) and reconnect/replay logic yourself.

Webhooks: server-to-server HTTP callbacks. This is not browser delivery at all; it is how *your* server notifies *another* server of an event (Stripe calling your endpoint on `payment.succeeded`). Pair webhooks with retries, HMAC signing, and idempotency, because they will be redelivered.

```
one-way, low urgency ....... short-poll
one-way, near-real-time .... long-poll (fallback) / SSE (preferred)
two-way, low latency ....... WebSocket
server-to-server async ..... webhooks
```

Interview nuance: the classic trap is reaching for WebSocket for everything. If the data flow is one-directional (a notifications feed, LLM tokens), SSE gives you the latency without the stateful-connection and sticky-session tax. Being able to say that out loud is the signal.

Recap: choose by direction, latency, per-connection cost, and delivery guarantee: short-poll for lazy counters, long-poll as the universal fallback, SSE for one-way streaming, WebSocket for true duplex, and webhooks for server-to-server async.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Choose a real-time delivery mechanism for three features (a chat app, a notifications bell, and streaming LLM tokens back to a browser) and justify each choice against short-poll, long-poll, SSE, WebSocket, and webhooks.

**Think about:**
- Is the data flow one-directional server-to-client, or does the client also need to push at low latency?
- What does each open connection cost at your fan-out, and how does that interact with load balancers and proxies?
- What delivery guarantee does the feature need, and who reconnects and replays missed messages?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: browser clients, a stateless service tier behind an L7 load balancer, millions of concurrent users at peak.

Chat app -> WebSocket. Chat is genuinely bidirectional and latency-sensitive: users both send and receive constantly, and typing/presence indicators push both ways. Full-duplex WebSocket is the right fit. I accept the costs: the connection is stateful, so I scale it with a pub/sub backbone (Redis or NATS) rather than sticky sessions alone, so a message from a user on node A reaches a recipient on node B. I add heartbeats and client reconnect with replay of missed messages (each message carries a sequence id).

Notifications bell -> SSE, with long-poll fallback. The flow is one-directional server-to-client (the server tells the client "you have a new notification"); the client never needs to push over this channel. SSE gives near-real-time delivery, automatic reconnection, and `Last-Event-ID` resume, all over plain HTTP that traverses proxies and CDNs. WebSocket would be over-engineering here and would cost me the stateful-connection tax for no bidirectional benefit. For old clients or hostile proxies, long-poll is the fallback.

Streaming LLM tokens -> SSE. Token streaming is strictly one-way (server to browser), incremental, and resumable, which is exactly SSE's sweet spot; it is proxy-friendly and needs no duplex channel. This is why most LLM chat UIs stream over SSE. The user's prompt is a normal `POST`; the token stream comes back as SSE.

Delivery and reconnect: for the bell and LLM stream, SSE auto-reconnect plus event ids handle resume. For chat, I own reconnect and replay via sequence ids and the pub/sub backbone.

Common wrong turn: using WebSocket for the bell and the LLM stream. Both are one-directional, so SSE delivers the same latency without sticky sessions, per-connection state, and custom reconnect logic.

**Self-check rubric:**
- [ ] Did I pick WebSocket for chat and justify it by true bidirectional low-latency need?
- [ ] Did I pick SSE for the notifications bell and LLM streaming and justify by one-way flow?
- [ ] Did I address per-connection cost, sticky sessions, and a pub/sub backbone for WebSocket fan-out?
- [ ] Did I address reconnect and replay (Last-Event-ID for SSE, sequence ids for chat)?
- [ ] Did I explicitly avoid defaulting to WebSocket for one-directional features?

#### Practice: real-world variant (save, then reveal)
**Prompt:** Design the real-time delivery for a live-sports scoreboard that pushes score updates to 5 million concurrent viewers during a World Cup final, where the update is one-way (server to client), viewers join and leave in huge waves, and a few seconds of staleness is acceptable but a server meltdown is not. Choose the mechanism and explain how you fan out to 5M connections.

**Model answer (revealed on demand):**
Assumptions: 5M concurrent browsers, strictly one-directional score pushes, seconds of staleness tolerable, massive join/leave waves at kickoff and goals.

Mechanism: SSE, not WebSocket. The flow is purely server-to-client, so SSE gives us streaming updates with auto-reconnect and `Last-Event-ID` resume over plain HTTP, and we avoid the stateful-duplex, sticky-session, and heartbeat costs of WebSocket at 5M connections. Because a few seconds of staleness is fine, we do not need per-viewer low latency; we need cheap, resilient fan-out.

Fan-out architecture: viewers do not connect to origin. They connect through a large fleet of edge/proxy nodes (or a CDN that supports streaming), each holding a share of the connections; at 5M connections and ~50k per node that is ~100 nodes. A single score-update event is published once to a pub/sub backbone (Redis Cluster, NATS, or Kafka), and every edge node subscribes and broadcasts the same event down its held SSE connections. This is one publish fanning out to millions of reads, so the origin does O(events), not O(viewers).

Handling join/leave waves: SSE connections are cheap (a file descriptor plus a little memory per connection on an event-loop server), so a goal that triggers a reconnect stampede is absorbed by the horizontally scaled edge fleet, with jittered client reconnect to avoid a thundering herd. `Last-Event-ID` lets a reconnecting viewer resume without a gap.

Protecting against meltdown: rate-limit and shed at the edge (`429`/`503` with `Retry-After`) so a reconnect storm cannot take down origin, and cache the latest score so a cold viewer gets current state immediately on connect.

Common wrong turn: WebSocket for a one-way scoreboard, paying the stateful-connection and sticky-session tax on 5M connections for a duplex channel nobody uses, or fanning out per-viewer from origin instead of publish-once-broadcast-many across an edge fleet.

### sd-l1-http-semantics: HTTP Semantics: Methods, Status Codes & Caching Headers

- **id:** `sd-l1-http-semantics`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** http, api-design, caching, concurrency

#### Learn
HTTP already encodes decades of distributed-systems thinking about safety, idempotency, caching, and concurrency. Using its semantics correctly gets you free caching and safe retries; ignoring them silently loses data.

Methods carry two orthogonal properties. Safe means read-only (no server state change): `GET` and `HEAD`. Idempotent means repeating it lands the same final state: `GET`, `HEAD`, `PUT`, `DELETE`. `POST` is neither safe nor idempotent, `PATCH` generally is not idempotent. This directly drives retry behavior: an intermediary or client can safely auto-retry `GET`/`PUT`/`DELETE` after a network blip, but must not blindly auto-retry `POST` (that is what idempotency keys are for). Safe methods are also the cacheable ones.

Status families are a contract with the client:
- `2xx` success: `200` OK, `201` Created (return a `Location` header pointing at the new resource), `204` No Content.
- `3xx`: redirects and, importantly, `304 Not Modified` for conditional requests.
- `4xx` client error: `400`, `401`, `403`, `404`, `409` conflict, `422` unprocessable, `429` rate limited. Do not retry these blindly.
- `5xx` server error: `500`, `503`. Retry with backoff.

Read caching is where HTTP pays off. On a `GET` you send `Cache-Control` (`max-age` for private/browser caches, `s-maxage` for shared/CDN caches, `no-store` for sensitive data) plus a validator: an `ETag` (an opaque version hash) or `Last-Modified` timestamp. The validator enables the conditional GET: the client sends `If-None-Match: <etag>` (or `If-Modified-Since`), and if nothing changed the server returns `304 Not Modified` with no body. That saves bandwidth and origin rendering while keeping the client current.

The same `ETag` gives you optimistic concurrency control, which prevents the lost-update problem. Two editors both `GET` a document (ETag `v5`). Editor A saves with `If-Match: v5`; the server sees the current version is still `v5`, applies the write, and the ETag becomes `v6`. Editor B then saves with `If-Match: v5`; the server sees the current version is now `v6`, refuses, and returns `412 Precondition Failed`. B is forced to re-read and merge instead of silently clobbering A's change. This is far cheaper than pessimistic locking and is exactly how you avoid last-write-wins data loss.

Content negotiation completes the picture: honor `Accept` and `Accept-Language`, and set `Vary: Accept, Accept-Encoding` on responses so a shared cache does not serve a JSON body to a client that asked for XML, or a Brotli body to a client that cannot decode it.

Interview nuance: the two high-signal moves are (1) tying method idempotency to retry safety, and (2) describing `ETag` + `If-Match` -> `412` as optimistic concurrency to prevent lost updates. Saying "return 200 and last-write-wins" is the wrong turn interviewers listen for.

Recap: use safe/idempotent method semantics to drive retry and caching, add `Cache-Control` plus `ETag` for cheap conditional GETs (`304`), and use `ETag` + `If-Match` -> `412` for optimistic concurrency that prevents lost updates.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Design the HTTP semantics for a document API: choose methods and status codes for read, create, update, and delete, and explain how you would use ETag, If-None-Match, and If-Match to cache reads and prevent lost updates.

**Think about:**
- Which methods are safe, which are idempotent, and why does that distinction drive retry behavior?
- How do Cache-Control, ETag, and Last-Modified turn a GET into a cheap conditional request?
- How does ETag plus If-Match give you optimistic concurrency, and what status code signals a conflict?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: a JSON document API behind a CDN and shared caches, with clients that retry on failure and multiple editors per document.

Methods and status codes:
- Read: `GET /v1/docs/{id}` -> `200` with the document and an `ETag`; `HEAD` for metadata only. Both are safe and idempotent, so caches and clients can auto-retry them.
- Create: `POST /v1/docs` -> `201 Created` with a `Location: /v1/docs/{id}` header and the body. `POST` is not idempotent, so I would not auto-retry it (and I would add an idempotency key if duplicates are costly).
- Update: `PUT /v1/docs/{id}` -> `200`/`204`. `PUT` is idempotent, so it is safe to retry.
- Delete: `DELETE /v1/docs/{id}` -> `204`. Idempotent (deleting twice still ends deleted), so retry-safe.
- Errors: `404` missing, `409`/`412` conflict, `422` validation, `429` rate limit, `5xx` server.

Read caching: on `GET` I return `Cache-Control: max-age=60` (or `s-maxage` for the CDN, `no-store` for private docs) plus an `ETag`. The client later sends `If-None-Match: <etag>`; if unchanged the server returns `304 Not Modified` with no body, saving bandwidth and origin work while keeping the client current.

Optimistic concurrency (prevent lost updates): each `GET` returns the current `ETag`. An update must send `If-Match: <etag>`. If the document's current version still matches, the write applies and the ETag advances; if another editor already changed it, the server returns `412 Precondition Failed`, forcing the client to re-read and merge instead of overwriting. Two editors on the same doc cannot silently clobber each other.

Negotiation: honor `Accept`/`Accept-Language` and set `Vary: Accept, Accept-Encoding` so shared caches never serve the wrong representation or encoding.

Common wrong turn: returning `200` for everything and doing last-write-wins updates, which silently loses concurrent edits and defeats caching, plus auto-retrying non-idempotent `POST`.

**Self-check rubric:**
- [ ] Did I map read/create/update/delete to correct methods and status codes (201+Location, 204)?
- [ ] Did I connect method idempotency to which calls are safe to auto-retry?
- [ ] Did I use Cache-Control + ETag and describe the 304 conditional GET?
- [ ] Did I use ETag + If-Match -> 412 for optimistic concurrency to prevent lost updates?
- [ ] Did I set Vary for content negotiation?

#### Practice: real-world variant (save, then reveal)
**Prompt:** Design the HTTP concurrency and caching model for Google Docs-style collaborative editing where dozens of users edit the same document simultaneously, edits must not be lost, and reads should be cheap. Explain where simple ETag + If-Match optimistic concurrency is sufficient and where it breaks down, and what you would use instead.

**Model answer (revealed on demand):**
Assumptions: many concurrent editors per document, sub-second edit frequency, no acceptable data loss, and a desire to keep read traffic cheap.

Where ETag + If-Match works: for coarse-grained, low-frequency writes (document metadata: title, sharing settings, folder), optimistic concurrency is ideal. Each `GET` returns an `ETag`; a metadata `PUT` sends `If-Match`, and a stale write gets `412 Precondition Failed` and re-reads. Contention is rare, so `412` retries are cheap, and this prevents lost updates without locking.

Where it breaks down: for the document *body* under dozens of sub-second edits, `If-Match` would `412` almost every keystroke, because the version advances constantly. Optimistic concurrency assumes low write contention; collaborative body editing is the opposite. Reject it here.

What to use instead: a real-time collaboration protocol, either Operational Transformation (OT, what Google Docs historically used) or CRDTs. Edits are expressed as fine-grained operations (insert char at position, delete range) that are transformed or merged so concurrent operations converge to the same document without a whole-document version check. These flow over a WebSocket (true bidirectional low latency), with the server ordering and rebroadcasting operations to all editors. No operation is lost; they are merged, not clobbered.

Caching reads: the shareable published/read-only view is cached aggressively at the CDN with `Cache-Control: s-maxage` plus an `ETag` and fingerprinted URLs, so viewers (not editors) hit cache. Live editors do not use HTTP read caching; they read the live OT/CRDT stream.

So the model is hybrid: ETag + If-Match optimistic concurrency for coarse metadata, OT/CRDT over WebSocket for the hot collaborative body, and CDN + ETag caching for read-only viewers.

Common wrong turn: trying to force whole-document `If-Match` optimistic concurrency onto high-frequency collaborative editing, which produces constant `412`s and a broken editor, or using last-write-wins and losing edits.

### sd-l1-serialization-compression: Serialization, Content Negotiation & Compression

- **id:** `sd-l1-serialization-compression`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** serialization, api-design, performance, schema-evolution

#### Learn
Serialization and compression are a CPU-versus-bytes trade, and the right answer depends entirely on where your bottleneck is: bandwidth (mobile, cross-region, metered) or CPU (very high QPS internal traffic). You also have to keep schemas evolvable when producers and consumers deploy independently.

Serialization formats:
- JSON: human-readable, self-describing, universal, debuggable in a browser. But verbose (field names repeat on every object) and comparatively slow to parse. It is the correct default for public APIs where developer ergonomics and debuggability beat raw efficiency.
- Protobuf: compact binary driven by an IDL, fast to encode/decode, with generated types. Fields are tagged by number, not name, so payloads are small. Ideal for internal high-QPS RPC (it pairs with gRPC).
- Avro: the schema is registered centrally or travels with the data (in the file header), which makes it strong for data pipelines and Kafka, where a schema registry lets producers and consumers evolve independently.
- Thrift: RPC plus serialization from one IDL, similar niche to Protobuf, common in older Facebook-lineage stacks.

Compression, negotiated via `Accept-Encoding`:
- gzip: universal and cheap, the safe default.
- Brotli: better ratio than gzip, especially on text over HTTPS to browsers.
- zstd: excellent ratio and speed with tunable levels, great for internal transfer where you control both ends.

The tradeoff to state explicitly: compression and binary encoding cut bytes but add CPU, and aggressive compression can add tail latency on large responses (the compressor has to run before the first byte goes out). So set a payload-size threshold below which you do not compress (compressing a 200-byte response is a net loss), and do not double-compress already-compressed data (images, video).

Schema evolution is the part people forget. Protobuf, Avro, and Thrift all support forward and backward compatibility if you follow the rules: add only optional/new fields, and never reuse or renumber a field tag (mark removed tags `reserved`). That is what lets a new producer and an old consumer coexist during a rolling deploy. JSON has no built-in schema, so it relies on the tolerant-reader discipline: consumers ignore unknown fields and tolerate missing optional ones.

Putting it together with content negotiation: a public API defaults to JSON, honors `Accept-Encoding` to pick Brotli for browsers, and sets `Vary: Accept-Encoding` so a shared cache does not hand a Brotli body to a client that only speaks gzip. An internal mesh uses Protobuf with zstd because both ends are controlled and CPU/bytes dominate.

Interview nuance: the trap is "Protobuf everywhere because it is faster." On a public browser API the network savings are usually tiny relative to the developer and debugging cost, and you lose `curl`-ability. The senior move is to locate the bottleneck first (bandwidth vs CPU) and choose per surface.

Recap: choose format and codec by bottleneck (JSON+Brotli for public/bandwidth, Protobuf+zstd for internal/CPU), never compress tiny or already-compressed payloads, and keep schemas evolvable by adding optional fields and never reusing field tags.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Choose a serialization format and compression scheme for a high-fan-out internal API and for a public mobile API, and justify each against JSON, Protobuf, Avro, Thrift, and gzip, Brotli, zstd on the size, CPU, and schema-evolution axes.

**Think about:**
- Where is the bottleneck: bandwidth (mobile, cross-region) or CPU (very high QPS)?
- How does each format handle schema evolution when producers and consumers deploy independently?
- How do you pick a compression codec via Accept-Encoding without paying tail latency on large payloads?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**
Assumptions: two surfaces, a chatty internal service mesh at very high QPS, and a public API serving mobile clients on slow, metered networks.

Internal high-fan-out API -> Protobuf with zstd. We own both ends, and the bottleneck is CPU and bytes at high QPS, so a compact binary format matters. Protobuf is small (tag-numbered fields, no repeated field names), fast to encode/decode, and IDL-driven so it pairs with gRPC and generated stubs. zstd adds strong compression at low CPU with tunable levels for internal links. Schema evolution is handled by Protobuf rules: add optional fields, never renumber or reuse tags, mark removed tags `reserved`, so rolling deploys with mixed versions interoperate. (Avro would be my choice specifically for the Kafka pipelines, where a schema registry shines.)

Public mobile API -> JSON with Brotli, plus `Vary: Accept-Encoding`. Here the bottleneck is bandwidth (slow, metered mobile networks) and the consumers are external, so debuggability and ubiquity matter. JSON is universal and `curl`-able; Brotli gives a better ratio than gzip on text over HTTPS to browsers and mobile clients, negotiated via `Accept-Encoding`. I set `Vary: Accept-Encoding` so a shared cache never serves a Brotli body to a gzip-only client. Schema evolution relies on tolerant readers (clients ignore unknown fields), and I keep changes additive.

Compression discipline on both: set a size threshold (roughly 1KB) below which I skip compression, because compressing tiny payloads is a net CPU loss, and never re-compress already-compressed assets (images). For very large responses I watch tail latency, since the compressor runs before the first byte.

Common wrong turn: forcing Protobuf onto the public browser/mobile API for "speed," paying a large developer and debugging cost and losing `curl`-ability for byte savings the network barely needed, or compressing 200-byte responses and adding CPU for no gain.

**Self-check rubric:**
- [ ] Did I locate the bottleneck (CPU/bytes internal vs bandwidth mobile) before choosing?
- [ ] Did I pick Protobuf+zstd internal and JSON+Brotli public, with reasons on all three axes?
- [ ] Did I address schema evolution per format (tag rules for binary, tolerant readers for JSON)?
- [ ] Did I use Accept-Encoding and set Vary for the public surface?
- [ ] Did I set a no-compress size threshold and avoid re-compressing compressed data?

#### Practice: real-world variant (save, then reveal)
**Prompt:** Design the serialization and schema-evolution strategy for a Kafka-based event platform at LinkedIn scale, where thousands of producers emit events consumed by hundreds of independently-deployed consumers, producers and consumers upgrade on their own schedules, and a bad schema change must never break downstream consumers. Choose the format and the governance.

**Model answer (revealed on demand):**
Assumptions: thousands of producers, hundreds of consumers, fully independent deploys, events durable in Kafka for days, zero tolerance for a schema change silently breaking a consumer.

Format: Avro with a central Schema Registry (this is essentially LinkedIn's own design; Confluent Schema Registry is the productized version). Avro is chosen over Protobuf here specifically because its schema-on-read model and registry integration fit streaming: each message carries a small schema id, the consumer fetches the writer schema from the registry, and Avro resolves it against the consumer's reader schema. Producers and consumers therefore do not need to deploy in lockstep.

Why not JSON: at this volume JSON's verbosity wastes storage and bandwidth across billions of events, and it has no enforced schema, so a bad producer change is discovered only when a consumer crashes. Why Avro over Protobuf: Avro's registry-plus-schema-resolution model is the standard, well-tooled fit for Kafka; Protobuf also works but Avro is the canonical choice in this ecosystem.

Governance (the real protection): the Schema Registry enforces a compatibility mode per topic, typically BACKWARD (new schema can read old data) or FULL. On registration, a proposed schema is checked against the existing one and rejected if it would break compatibility, for example removing a field a consumer needs or changing a type. This blocks the bad change at publish time, before any event is produced, which is the whole point. Allowed evolution is additive: add fields with defaults, never change or reuse a field's identity.

Operational: consumers use tolerant resolution (fields they do not know are ignored; new required data has defaults), and the registry's version history plus per-topic compatibility gives an auditable contract across teams.

Common wrong turn: raw JSON on Kafka with no registry (no enforcement, breakage found in production), or forcing global lockstep upgrades of thousands of producers and consumers, which is impossible at this scale. Registry-enforced Avro compatibility is what lets everyone deploy independently and safely.
