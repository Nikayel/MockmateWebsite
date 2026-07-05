/**
 * System Design — Level 1: Foundations & Mental Models.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l1-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L1. 21 lessons across 4
 * modules (sd-l1-m1..m4). Same lesson shape as level0.ts: `apply` and `practice` are both
 * required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const networkStackTeach = `
## Five layers you reason with, two you argue about

The 7-layer OSI model is a reference diagram, not how real systems are built. In practice you reason
about a 5-layer stack, and the only two layers you will argue about in interviews are L4 and L7.

Bottom to top, the practical stack:

\`\`\`
  L7  HTTP / gRPC / app semantics   (methods, headers, paths, request bodies)
  L6  TLS                            (encryption, identity, SNI)   <- sits between
  L4  TCP / UDP                      (ports, connections, reliability)
  L3  IP                             (addresses, routing, MTU)
  L2  Link                           (Ethernet, MAC, the wire)
\`\`\`

Each layer has one job. IP (L3) moves packets between hosts by address and decides routing hop by
hop; it knows nothing about ports or requests, and it is where MTU and fragmentation live (jumbo
frames, the classic 1500-byte Ethernet MTU). TCP and UDP (L4) address a specific process on a host
via a port number and, for TCP, add reliability. TLS secures the byte stream. HTTP (L7) carries the
application meaning: this is a \`POST /orders\`, this is \`Authorization: Bearer ...\`, this is a 404.

### L4 versus L7: the decision that matters

An L4 load balancer (AWS NLB, IPVS, a hardware LB) forwards packets or TCP connections. It sees the
4-tuple and that is roughly all: it cannot read a URL path, a Host header, or a cookie, so it cannot
route \`/api\` to one pool and \`/images\` to another. It is cheap, extremely fast, and
protocol-agnostic (it will happily proxy a database connection). An L7 load balancer or reverse proxy
(Envoy, NGINX, AWS ALB, HAProxy in HTTP mode) terminates the connection, parses the request, and can
route on path, header, or method, do TLS termination, retries, and rate limiting. That power costs
CPU and adds latency.

A connection is identified by its 4-tuple: \`(source IP:source port, destination IP:destination
port)\`. This is why one client can hold many simultaneous connections to the same server (each uses
a different ephemeral source port) and why a NAT gateway can multiplex thousands of internal hosts
behind one public IP by rewriting ports. It is also why L4 load balancing has to keep a connection
pinned to the same backend: the 4-tuple is the only identity it has.

**Interview nuance:** interviewers probe whether you conflate an L4 LB with L7 routing. If you say
"the load balancer routes \`/checkout\` to the payments service," you have quietly assumed an L7
proxy. Say so, and note the cost: TLS termination and request parsing on every request.

**Interview nuance:** TLS does not have a clean OSI number (people say L5, L6, or "between 4 and 7").
Do not die on that hill. Say "TLS sits on top of TCP and below HTTP" and move on.

Recap: Reason in a practical 5-layer stack, remember IP routes packets and TCP/UDP address processes
by port, and know that L4 sees only the 4-tuple while L7 can read and route on request content.
`.trim()

const dnsTeach = `
## DNS is your first routing and failover lever

DNS is not just a phone book. It is the first routing and failover lever a request touches, and its
main limitation, caching you do not control, is the single most misunderstood thing about it.

### The resolver chain

Your app calls the OS stub resolver, which asks a recursive resolver (your ISP's, or 8.8.8.8, or
1.1.1.1). If that recursive resolver has no cached answer it walks the hierarchy: a root server
returns the nameservers for \`.com\` (the TLD), the TLD returns the authoritative nameservers for
\`example.com\`, and the authoritative server (Route 53, NS1, Cloudflare) returns the actual A
record. Caching happens at every hop: the browser caches, the OS caches, the recursive resolver
caches, each keyed by TTL. That is the whole point and the whole problem.

Record types you must know: **A** (name to IPv4), **AAAA** (name to IPv6), **CNAME** (alias one name
to another, cannot exist at the zone apex or alongside other records), **NS** (delegation), and
provider **ALIAS/ANAME** records, which behave like a CNAME but are legal at the apex
(\`example.com\` itself) because the provider resolves them server-side and returns an A record.

**Interview nuance:** "why can't I CNAME my apex to my load balancer?" is a real, common gotcha.
Answer: the apex needs SOA/NS records that a CNAME would forbid coexisting with; use ALIAS/ANAME.

### TTL: the core tradeoff

A short TTL (say 60s) means clients re-query often, so a failover or IP change propagates fast, at
the cost of far more DNS queries and dependence on your DNS provider's availability. A long TTL (say
3600s) is cheap and resilient but means an IP change takes up to an hour to be seen. The trap: even a
60s TTL does not give instant failover, because misbehaving recursive resolvers and corporate caches
ignore or clamp TTLs, and clients that already resolved keep using the stale IP until their cache
expires. So DNS failover is best-effort and eventually-consistent, on the order of minutes, not
milliseconds.

### Steering traffic with DNS

Authoritative providers return different answers based on the querier. **GeoDNS** returns the IP of
the nearest region by the resolver's location. **Latency-based routing** (Route 53) returns the
region with the lowest measured RTT to the user. **Weighted routing** splits traffic by percentage,
which is how you do blue-green and canary at the DNS layer. Crucially, pair these with **health
checks**: the authoritative server stops handing out a region's IP when its health check fails.
Without health checks, plain round-robin DNS will keep sending one in N users to a dead box.

The hard limit: DNS load balancing has no per-request awareness. It cannot see server load, cannot do
sticky sessions, cannot retry. It steers at the granularity of "which IP do I hand back," resolved
once and cached. So DNS gets a user to the right region or the right LB, and a real L4/L7 load
balancer takes over from there.

Recap: DNS resolves through a cached recursive-to-authoritative chain, TTL trades failover speed for
query load but never gives instant failover because of resolver caching, and GeoDNS/latency/weighted
routing plus health checks steer users to the nearest healthy region before a real LB takes over.
`.trim()

const tcpUdpTeach = `
## Every avoidable round trip is a visible stall

The single most important latency fact in networking: setting up a TCP connection costs a round trip
before any application data flows, and if you also do TLS you pay more. On a fast intra-datacenter
link (RTT under 1ms) nobody notices. On a mobile user in Jakarta hitting a US server (RTT 200ms+),
every avoidable round trip is a visible stall.

### The handshake and slow start

The 3-way handshake: client sends SYN, server replies SYN-ACK, client sends ACK. Only after that ACK
can the client send the request. That is 1 RTT of pure setup. Layer TLS 1.3 on top and you add
roughly 1 more RTT (TLS 1.2 added 2). So a brand-new HTTPS connection is about 2 RTTs before the
first request byte, then more RTTs for the response. Over a 200ms link that is 400ms+ of overhead
spent on nothing but ceremony.

TCP earns that cost by giving reliability: every byte has a sequence number, the receiver ACKs what
it got, and unacknowledged data is retransmitted, so the application sees an ordered, gap-free
stream. It also runs **congestion control**: a new connection starts in slow start with a small
congestion window and ramps up as ACKs return, probing for available bandwidth. This is why
throughput on a fresh connection is low at first and climbs, and why short-lived connections never
reach full speed: they die in slow start before the window opens up. Reusing a warmed connection
means you keep the opened window.

### The fixes for a chatty API

If each of 30 API calls opens a new connection, you pay the handshake and restart slow start 30
times. The fixes, none of which touch business logic:

- **Keep-alive and connection pooling**: reuse one warm connection for many requests, amortizing the
  handshake and keeping the congestion window open. HTTP keep-alive and client pools (a database
  connection pool is the same idea) do this.
- **HTTP/2 multiplexing**: many concurrent requests share one connection, so you pay one handshake
  and one slow start for all of them.
- **Move the endpoint closer**: an edge POP or CDN near the user shrinks the RTT itself, so every
  round trip is cheaper. A TLS terminator at a nearby POP means the expensive handshakes happen over
  a short hop, and the long-haul leg is a reused warm connection.

### When UDP is right

UDP is the other L4 protocol: connectionless, no handshake, no ordering, no retransmission, no
congestion control by default. You send a datagram and hope. That sounds worse, but it is exactly
right when late data is useless: real-time voice and video (a retransmitted audio packet arrives
after the moment it was needed, so drop it and move on), gaming, DNS (one small request/reply, a
handshake would double the cost), and high-volume telemetry where losing a few samples is fine. QUIC
(HTTP/3) is built on UDP precisely to escape TCP's handshake and head-of-line-blocking constraints
while rebuilding reliability itself.

**Interview nuance:** at scale, watch **TIME_WAIT** and ephemeral-port exhaustion. A client that
opens and closes connections rapidly leaves each in TIME_WAIT (about 60s) holding an ephemeral port;
a single source IP has ~28k usable ports, so a busy proxy talking to one backend IP can run out and
start failing to connect. Connection reuse fixes this too. This is another reason pooling is not
optional at scale.

Recap: the TCP handshake costs a round trip (plus TLS) before data and starts slow in congestion
control, so reuse connections (keep-alive, pooling, HTTP/2) and move endpoints closer to cut RTTs;
reach for UDP when late data is worthless and watch TIME_WAIT/port exhaustion under churn.
`.trim()

const tlsHttpsTeach = `
## Update your TLS mental model to 1.3

Most engineers carry stale TLS mental models from the 1.2 era. Update them: **TLS 1.3 is a 1-RTT
handshake**, and 0-RTT on resumption. That single fact changes the latency math for every HTTPS
design.

What the handshake does in one round trip: the client sends a \`ClientHello\` with its key share and
supported ciphers; the server responds with its key share, certificate, and \`Finished\`; the client
verifies and can send application data on its next flight. One RTT and you have a shared symmetric
key. The certificate lets the client verify server identity: the cert is signed by a Certificate
Authority (CA) the client trusts, forming a chain up to a root CA in the client's trust store. **SNI**
(Server Name Indication) is the client telling the server, in the clear, which hostname it wants, so
one IP hosting many tenants (a CDN, a shared LB) can present the right certificate.

**Interview nuance:** certificate expiry is one of the most common real-world outage causes (an
unrotated cert on a load balancer takes the whole site down at midnight). Always mention automated
rotation (ACME/Let's Encrypt, AWS ACM) as part of a TLS design.

### Cutting handshake cost

- **Session resumption**: after a first full handshake, the server issues a session ticket; a
  returning client presents it and skips the certificate exchange, dropping to a cheaper handshake.
- **0-RTT (early data)**: on resumption, TLS 1.3 lets the client send application data in its very
  first flight, before the handshake completes, saving a full round trip. The caveat that
  interviewers will push on: **0-RTT early data is replayable**. An attacker who captures it can
  resend it, so you must only allow 0-RTT for idempotent requests (GET, or writes guarded by an
  idempotency key). Never let a non-idempotent \`POST /charge\` ride on 0-RTT.
- **Connection reuse**: the cheapest handshake is the one you do not do. Keep connections warm so you
  handshake once and reuse.

### Where do you terminate TLS?

Three common choices; the tradeoff is latency/operational-simplicity versus how far encryption
reaches:

- **Terminate at the edge/LB**: the ALB, CDN POP, or Envoy front proxy decrypts, and traffic behind
  it is plaintext (or re-encrypted). This offloads crypto from app servers, centralizes cert
  management, and lets the L7 proxy read requests for routing. The cost: the internal network sees
  plaintext, which is only acceptable if that network is trusted.
- **End-to-end / passthrough**: TLS is not terminated until the app, so even the LB cannot read the
  request (it must be an L4 LB). Maximum confidentiality, but you lose L7 routing and pay crypto on
  every app server.
- **Re-encrypt inside the mesh**: terminate at the edge for routing, then open a fresh TLS connection
  to the backend. This is the common enterprise answer: edge features plus encrypted internal hops.

**mTLS** (mutual TLS) extends this: not only does the client verify the server, the server verifies
the client's certificate too. This gives cryptographic **service-to-service identity**, the backbone
of zero-trust architectures and service meshes (Istio, Linkerd) where "is this caller really the
orders service" cannot rely on network location. Each service gets a short-lived cert from an
internal CA, and the mesh rotates them automatically.

Recap: TLS 1.3 is a 1-RTT handshake (0-RTT on resumption, but only for idempotent requests due to
replay), you cut cost with session resumption and connection reuse, you choose termination by trading
internal visibility for edge features, and mTLS gives services cryptographic identity for zero-trust.
`.trim()

const httpVersionsTeach = `
## The recurring villain: head-of-line blocking

Each HTTP version exists to fix a specific bottleneck of the previous one, and the recurring villain
is **head-of-line (HOL) blocking**: a stuck item stalls everything behind it. Knowing where HOL
blocking bites in each version is the whole lesson.

### HTTP/1.1

One request in flight per connection. You send a request, you wait for its full response, then you
send the next. Keep-alive lets you reuse the connection but not overlap requests (pipelining exists
on paper but is broken in practice). To get parallelism, browsers open about 6 connections per host,
which means 6 handshakes and 6 slow-start ramps, and everything past 6 queues. HOL blocking here is
at the request level: a slow response blocks its whole connection.

### HTTP/2

Multiplexing. Many requests become independent **streams** over a single TCP connection, interleaved
as frames, so you send all your requests at once and responses come back concurrently over one warm
connection. Add header compression (HPACK), since HTTP headers are hugely repetitive. This kills
application-level HOL blocking and the 6-connection tax. But there is a catch that interviewers love:
**TCP-level HOL blocking remains**. Because all streams ride one TCP connection, a single lost TCP
packet stalls TCP's ordered delivery, and every multiplexed stream waits for that retransmission,
even streams whose data already arrived. On a clean network you never notice; on a lossy one, H2 can
be worse than H1's separate connections.

### HTTP/3 over QUIC

QUIC is a new transport built on **UDP** that reimplements reliability, ordering, and congestion
control per stream. Because each stream is independently reliable, a lost packet only stalls its own
stream, not the others: **QUIC removes TCP-level HOL blocking**. It also folds the transport and TLS
handshake together for a faster (often 1-RTT, 0-RTT on resumption) setup, and supports **connection
migration**: the connection is identified by a connection ID, not the 4-tuple, so a phone switching
from Wi-Fi to cellular (new IP) keeps the same connection instead of re-handshaking.

When does H3 actually win? On **lossy and mobile networks** and paths with **many short
connections**, where per-stream independence and connection migration matter most. On a stable,
low-loss, high-bandwidth link (two datacenters), H3's advantage over H2 is marginal, and UDP can even
be throttled or blocked by some middleboxes, and its user-space congestion control can burn more CPU
than kernel TCP. So H3 is a clear win at the mobile-facing edge, a weak case for stable internal
links.

**Interview nuance:** **gRPC runs on HTTP/2 today**. So internal service-to-service RPC is naturally
H2 (multiplexed streams, which gRPC needs for streaming). The common real topology: public edge on H2
and H3 (serve mobile users the H3 benefit, fall back to H2), internal RPC on H2/gRPC where the
network is stable and H3 adds little.

Recap: HOL blocking is the theme, H1 blocks per request and needs ~6 connections, H2 multiplexes over
one TCP connection but still suffers TCP-level HOL blocking on loss, H3/QUIC removes it with
per-stream reliability over UDP plus connection migration, so use H3 at the lossy/mobile edge and
keep stable internal RPC on H2/gRPC.
`.trim()

const requestLifecycleTeach = `
## What happens when you hit enter

This is the integrative lesson: "what happens when you type a URL and hit enter" for a signed-in user
loading a dynamic page. Everything from the previous five lessons appears as one hop in this chain.
The skill is naming every hop, the RTT it adds, the cache that can short-circuit it, and how it can
fail.

The path, top to bottom:

\`\`\`
Browser cache/SW  ->  DNS  ->  TCP  ->  TLS  ->  [CDN/anycast POP -> WAF -> LB -> reverse proxy/API gateway]
   ->  app server  ->  auth  ->  app cache (Redis)  ->  database / downstream services
   ->  response: serialize -> compress -> cache headers -> CDN fill -> client render
\`\`\`

Walk it:

1. **Browser cache / service worker**: before any network, the browser checks its own cache. A fresh
   cached response short-circuits the entire chain (0 RTT). This is the cheapest possible hit.
2. **DNS**: resolve the hostname. Cached at browser/OS/resolver, so usually 0 RTT; on a cold miss, a
   resolver walk adds one or more RTTs.
3. **TCP**: 3-way handshake, ~1 RTT. Reused/pooled connections skip this.
4. **TLS**: ~1 RTT for TLS 1.3 (0-RTT on resumption). So a cold HTTPS connection is roughly 2 RTTs
   before the first request byte.
5. **Edge: CDN/anycast POP**: anycast routes you to the nearest POP. For static or cacheable content,
   a **CDN hit returns here** without ever touching origin, the biggest short-circuit after the
   browser cache. A miss makes the POP fetch from origin (CDN fill) and cache it.
6. **WAF**: inspects for attacks (SQLi, XSS, bot patterns); can block before origin.
7. **Load balancer -> reverse proxy / API gateway**: L4 then L7; the gateway does routing, auth
   offload, rate limiting.
8. **App server**: now real work. **Auth** (validate the session/JWT). Then business logic.
9. **App cache (Redis/Memcached)**: before hitting the database, check the cache. A **hit** returns
   in ~1ms and skips the DB. A **miss** falls through to the database (read-through), then populates
   the cache.
10. **Database / downstream services**: the authoritative read/write, plus any fan-out to other
    microservices (each its own network hop with its own timeout).
11. **Response path**: serialize (JSON/Protobuf), compress (gzip/brotli), set **cache headers**
    (Cache-Control, ETag) that decide what the browser and CDN may cache next time, the CDN fills its
    cache on the way out, and the client renders.

### Hit versus miss is the whole game

On a warm path (browser cache fresh, or CDN hit, or Redis hit) most hops are skipped and you answer
in single-digit ms. On a full cold miss (cold DNS, new connection, CDN miss, Redis miss) you pay
every RTT plus the DB query, easily hundreds of ms.

**Interview nuance:** for a **signed-in user on a dynamic page**, the CDN usually cannot cache the
personalized HTML, so the browser cache and the app-tier Redis cache do the heavy lifting, and the
CDN mostly accelerates static assets and terminates TLS near the user. Say this; it is the
distinction between caching a public marketing page and a logged-in dashboard.

Failure points and timeouts, per hop: DNS resolution timeout, TCP connect timeout, TLS handshake
failure (expired cert), LB/gateway 502/503/504 when a backend is down or slow, app-to-DB query
timeout, and downstream-service timeouts that need circuit breakers so one slow dependency does not
cascade. Every hop needs a bounded timeout and a fallback, or a single slow dependency stalls the
whole request.

Recap: a request walks browser cache -> DNS -> TCP -> TLS -> CDN/WAF/LB/gateway -> app -> auth -> app
cache -> DB/downstream and back through serialize/compress/cache-header/render, where each layer adds
an RTT and offers a cache that can short-circuit the rest, and every hop needs its own timeout so one
slow dependency cannot stall the whole path.
`.trim()

const apiParadigmsTeach = `
## A paradigm is a bet about your consumer

An API paradigm is a bet about who the consumer is and what the traffic looks like. Pick it after you
know those two things, not before.

### REST

REST is resource-oriented over HTTP. You model nouns (\`/orders/123\`), lean on HTTP methods and
status codes, and get the entire HTTP ecosystem for free: caching via \`Cache-Control\` and \`ETag\`,
proxies, CDNs, browser tooling, and near-universal client support. That ubiquity is why REST is the
default for public developer APIs. The cost is chattiness. A mobile screen that needs a user, their
last five orders, and a loyalty balance may make three round trips, and REST tends to over-fetch (you
get the whole resource) or under-fetch (you need another call).

### gRPC

gRPC is contract-first RPC. You define services and messages in a Protobuf \`.proto\` file, generate
typed clients and servers in every language, and send compact binary frames over HTTP/2 with
multiplexing and bidirectional streaming. On an internal service mesh at high QPS this is the winner:
a Protobuf payload is often 3 to 10 times smaller than the equivalent JSON, parsing is faster, and
the generated stubs make cross-service calls feel like local function calls. The cost is that it is
unfriendly to browsers (you need grpc-web plus a proxy) and to casual \`curl\` debugging, and HTTP
caches cannot see inside a binary POST.

### GraphQL

GraphQL exposes a single typed schema and lets the client ask for exactly the fields it wants in one
request. That directly solves the over/under-fetching problem for clients with varied, evolving data
needs, which is why product teams with many screens and one flexible backend reach for it. The costs
are real: HTTP caching mostly stops working because everything is a POST to \`/graphql\`, you must
add explicit query-cost limiting and depth limiting to stop a client from asking for the whole graph,
and the resolver layer invites N+1 database calls unless you add DataLoader-style batching.

### The real answer is usually hybrid

Put REST or GraphQL at the edge where public or client-facing consumers live, and use gRPC between
your own services where you control both ends and care about latency and bytes. Netflix, Uber, and
Google all run this split.

Two more tools round out the picture. WebSocket and SSE handle server push (chat, live updates) where
request/response does not fit. Message queues (Kafka, SQS) handle asynchronous decoupling, where the
caller should not wait at all.

**Interview nuance:** interviewers probe whether you can name what each paradigm *costs*, not just
what it optimizes. "GraphQL is flexible" is a junior answer; "GraphQL trades HTTP caching and needs
query-cost limits" is a senior one.

Recap: match paradigm to consumer and traffic (REST public, gRPC internal, GraphQL flexible clients),
and expect the real answer to be a hybrid.
`.trim()

const contractDesignTeach = `
## The contract is a schema, not a wiki page

A contract is the promise your API makes to its consumers about shape, names, types, and behavior.
The durable version of that promise is a machine-readable schema that is the single source of truth,
not prose in a wiki and not whatever the code happens to return today.

Schema-first means you write the schema before or alongside the code and generate everything else
from it: OpenAPI for REST, a Protobuf IDL for gRPC, or SDL for GraphQL. From that one artifact you
generate typed server stubs, client SDKs in every language, request validation, and reference docs.
The payoff is that the contract cannot silently drift from the implementation, because the
implementation is generated from (or validated against) the contract in CI.

### Disciplined naming and typing

- Resources are nouns, not verbs: \`POST /orders\`, not \`POST /createOrder\`. The HTTP method
  already carries the verb.
- Casing is consistent everywhere (pick \`snake_case\` or \`camelCase\` and never mix).
- Types are explicit, including nullability. A field is either always present or documented optional;
  "sometimes null, sometimes missing" is how clients break.
- Enums are closed sets with documented values, and unknown values are handled by tolerant readers
  rather than crashing.
- Units and formats are explicit: \`amount_cents\` not \`amount\`, ISO-8601 timestamps, currency
  codes.

### Design for evolution

You want additive, non-breaking change to be the default: adding an optional field or a new endpoint
must never break an existing consumer. The tolerant-reader pattern (ignore fields you do not
recognize, do not choke on extra data) is what makes that safe on the consumer side. In Protobuf you
never renumber or reuse a field tag; in GraphQL you deprecate a field rather than delete it; in REST
you add fields rather than repurpose them.

### Enforcement: contract tests in CI

Enforcement is where teams actually get burned. Consumer-driven contract testing (Pact is the common
tool) captures each consumer's real expectations as a contract and replays them against the provider
in CI. If a provider is about to ship a change that violates a consumer's expectation, the build
fails *before* deploy, not at 2am in production. This is the single highest-leverage practice for
teams shipping independent services.

**Interview nuance:** when asked "how do you keep two teams' services compatible," the strong answer
is "schema as source of truth plus consumer-driven contract tests in CI," not "we coordinate
releases." Coordination does not scale past a handful of services.

Recap: make a machine-readable schema the source of truth, name and type it for tolerant additive
evolution, and enforce it with consumer-driven contract tests in CI.
`.trim()

const versioningTeach = `
## The best versioning strategy is to rarely need it

Versioning exists to let you change an API without breaking the integrations already depending on it.
The core insight most engineers miss: the best versioning strategy is to need it as rarely as
possible. Most changes should be additive and never trigger a version bump at all.

### What breaks a client and what does not

Adding an optional field, adding an endpoint, adding an enum value that clients already ignore when
unknown: non-breaking. Removing a field, renaming a field, changing a type, tightening validation,
changing default behavior: breaking. If you design for additive change and your clients are tolerant
readers (they ignore unknown fields and do not assume the response is exhaustive), the large majority
of your evolution costs zero version bumps.

### When you genuinely must break

- **URL-path versioning** (\`/v1/orders\`, \`/v2/orders\`). Visible, trivial to route, trivial to
  test with \`curl\`, and easy for developers to reason about. This is the pragmatic default for
  public REST APIs (Stripe, Twilio, GitHub all expose a visible version).
- **Header or media-type versioning** (\`Accept: application/vnd.acme.v2+json\`). Purer from a REST
  standpoint because the resource URL is stable, but it is invisible in a browser address bar, harder
  to test casually, and easy for a proxy to strip or ignore.

Per-paradigm nuance: GraphQL avoids URL versions entirely and evolves field by field, marking old
fields \`@deprecated\` with a reason and adding new ones. gRPC follows Protobuf's field-number rules:
add new fields with new tags, never renumber, mark removed tags \`reserved\`, so old and new binaries
interoperate.

Compatibility runs two directions. **Backward** compatibility: a new server can still serve old
clients. **Forward** compatibility: an old client can tolerate data from a new server (this is
exactly what the tolerant-reader pattern buys you). You want both, because in a distributed deploy
the two sides are never upgraded at the same instant.

### Retiring a version is a sequenced migration

Deprecate (announce, document the replacement), warn (return \`Deprecation\` and \`Sunset\` headers,
log usage, email the top callers), then remove only after telemetry shows traffic has drained. A hard
cutover with no warning is how you generate an angry customer incident.

**Interview nuance:** the strongest signal is saying "I would design so most changes are additive and
never bump the version, and only cut /v2 for a true break," then describing the deprecate-warn-remove
sequence. Jumping straight to "put v1 in the URL" misses that versioning is a last resort.

Recap: prefer additive change with tolerant readers so you rarely version, use visible /v1 path
versioning for true public breaks, and retire old versions with a deprecate then warn then remove
sequence.
`.trim()

const idempotencyRetriesTeach = `
## The two-generals problem in every network call

The problem idempotency solves is the two generals nature of a network call. A client sends "submit
payment," the server processes it, and then the response is lost to a timeout or a dropped
connection. The client does not know whether the charge happened. If it retries naively, you
double-charge. If it gives up, you might drop a real payment. Idempotency lets the client retry
safely and get the *same* result every time.

Start with what HTTP already gives you. \`GET\`, \`PUT\`, and \`DELETE\` are idempotent by
definition: sending them twice leaves the server in the same state as sending them once (\`PUT\` sets
a value; setting it twice is the same value; \`DELETE\` twice still ends deleted). \`POST\` and
\`PATCH\` are not idempotent, because "create" or "add $50" applied twice does two things. Those are
exactly the methods that need explicit help.

### The idempotency key

The client generates a unique key (a UUID) for the logical operation and sends it, typically as an
\`Idempotency-Key\` header. The server, on first receipt, processes the request and stores the *full
response* keyed by that key with a TTL (24 hours is a common window). On any retry with the same key,
the server does not reprocess; it returns the stored response.

The subtle, commonly-missed detail: store the response, not just a boolean "seen it" flag. Two things
force this. First, the retry must get the actual result (the charge id, the status), not just "yes."
Second, concurrency: the original request and the retry can arrive at the same instant. You need a
way for the second one to either wait for the first to finish or detect an in-flight operation, so
they converge on one answer instead of both charging. In practice you insert the key into a store
with a unique constraint (a Redis \`SETNX\` or a unique DB row) before doing work; the loser of that
race waits and returns the winner's stored response.

### From at-least-once to effectively-once

Networks and queues give you at-least-once delivery: a message can arrive more than once. Idempotency
(deduplication on a key) is what turns at-least-once into effectively-once processing. You cannot get
true exactly-once over an unreliable network; you get at-least-once plus idempotent handling, which
is behaviorally equivalent and is what payment systems actually do.

The same pattern extends beyond synchronous APIs. Webhooks should carry an event id so the receiver
can dedupe redelivered events, and message-queue consumers should dedupe on a key so a redelivered
Kafka or SQS message is processed once.

**Interview nuance:** interviewers push on the concurrency case. "Store a flag" is the answer that
fails; "store the response behind a unique-constraint insert so concurrent duplicates converge" is
the one that passes.

Recap: give mutating requests a client-generated idempotency key, store the full response behind a
unique constraint with a TTL, and return it on any retry so at-least-once delivery becomes
effectively-once and nobody double-charges.
`.trim()

const paginationErrorsTeach = `
## Two boring details where APIs fall over at scale

Two boring-looking API details, pagination and error shape, are where APIs quietly fall over at
scale. Both have a correct answer.

### Pagination: offset is the trap

The naive approach is offset/limit: \`?offset=100000&limit=20\`. Two problems. It is O(n) deep: to
return page 5,000 the database must scan and discard the first 100,000 rows, so deep pages get
linearly slower and hammer the DB. And it is unstable under inserts: if a new row is added at the top
between fetching page 1 and page 2, every item shifts down by one, so the user sees a duplicate or
skips a row. On a live feed this is constant.

The fix is cursor (keyset) pagination. Instead of "skip N rows," you say "give me rows after this
position." With an indexed ordering column:

\`\`\`
WHERE (created_at, id) < (:cursor_ts, :cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT 20
\`\`\`

Because the DB seeks directly into the index rather than counting from the start, each page is O(1)
regardless of depth, and because the cursor points at a stable row identity, inserts at the top do
not shift the window. You return an opaque \`next_cursor\` (base64 of the last row's sort key) so the
client cannot fabricate positions and you can change the encoding later. Always enforce a server-side
max page size, and prefer a \`has_more\` boolean over an exact total count, because \`COUNT(*)\` on a
large table is itself an expensive scan.

### Errors: machine-readable and precisely coded

Clients need machine-readable, consistent errors to retry correctly, and humans need enough detail to
debug. The standard shape is RFC 9457 Problem Details (the successor to RFC 7807): a JSON body with
\`type\` (a URI naming the error class), \`title\`, \`status\`, \`detail\`, and \`instance\`, plus a
correlation id so a support ticket maps to a specific log line.

Status codes must be used precisely, because they drive client retry logic:

- \`400\` malformed request, \`422\` well-formed but semantically invalid (validation).
- \`401\` not authenticated, \`403\` authenticated but not allowed, \`404\` not found.
- \`409\` conflict (for example a version clash or duplicate), \`429\` rate limited.
- \`5xx\` server error.

The critical distinction is retryable versus not. \`5xx\` and \`429\` are retryable (with backoff,
and honor \`Retry-After\` on \`429\`). \`4xx\` other than \`429\` are the client's fault and must not
be blindly retried, because retrying a \`400\` just wastes calls and can amplify load.

**Interview nuance:** two things separate strong answers. Saying "keyset pagination is O(1) and
stable, offset is O(n) and shifts under inserts" (with the SQL), and saying "structured errors so
clients can distinguish retryable 5xx/429 from non-retryable 4xx," plus the warning to never leak
stack traces to clients.

Recap: use opaque cursor/keyset pagination with a bounded page size for O(1) stable paging, and
return RFC 9457 structured errors with precise status codes so clients retry 5xx/429 but not other
4xx.
`.trim()

const realtimeCommsTeach = `
## "Real-time" is a menu, not a single choice

You pick from short-poll, long-poll, SSE, WebSocket, and webhooks by four axes: latency, connection
cost at your fan-out, direction of data flow, and delivery guarantee. Getting this right is mostly
about not paying for a duplex, stateful connection when the workload is one-directional.

**Short-polling**: the client re-requests every N seconds. Dead simple and fully stateless (any
server can answer any poll), so it plays nicely with load balancers. The cost is wasted requests
(most polls return nothing) and up to N seconds of latency. It fits low-urgency counters, like an
unread badge that can lag a few seconds.

**Long-polling**: the client makes a request and the server holds it open until there is data or a
timeout, then the client immediately re-requests. This gets you near-real-time latency over plain
HTTP that works through every proxy and firewall. The cost is that each waiting client ties up a
connection and a server-side handler, and you must handle timeouts and reconnects carefully. It is
the universal-compatibility fallback.

**Server-Sent Events (SSE)**: one long-lived HTTP response over which the server streams events
(\`text/event-stream\`). It is purpose-built for one-way server-to-client streaming: notifications,
live feeds, and streaming LLM tokens. It has automatic reconnection and a \`Last-Event-ID\` for
resume built into the browser \`EventSource\` API, and because it is plain HTTP it passes through
proxies and CDNs easily. Limits: there is no client-to-server channel (the client uses normal
requests for that), and on HTTP/1.1 browsers cap concurrent connections per domain (about 6), which
HTTP/2 multiplexing relieves.

**WebSocket**: after an HTTP upgrade you get a full-duplex TCP connection, so both sides can push at
low latency. This is the right tool for genuinely bidirectional, low-latency work: chat, presence,
collaborative editing, multiplayer. The costs are real: the connection is stateful, so scaling across
many server nodes needs sticky sessions or, better, a pub/sub backbone (Redis, NATS, Kafka) so a
message published on node A reaches a user connected to node B. You also own heartbeats (ping/pong)
and reconnect/replay logic yourself.

**Webhooks**: server-to-server HTTP callbacks. This is not browser delivery at all; it is how *your*
server notifies *another* server of an event (Stripe calling your endpoint on \`payment.succeeded\`).
Pair webhooks with retries, HMAC signing, and idempotency, because they will be redelivered.

\`\`\`
one-way, low urgency ....... short-poll
one-way, near-real-time .... long-poll (fallback) / SSE (preferred)
two-way, low latency ....... WebSocket
server-to-server async ..... webhooks
\`\`\`

**Interview nuance:** the classic trap is reaching for WebSocket for everything. If the data flow is
one-directional (a notifications feed, LLM tokens), SSE gives you the latency without the
stateful-connection and sticky-session tax. Being able to say that out loud is the signal.

Recap: choose by direction, latency, per-connection cost, and delivery guarantee: short-poll for lazy
counters, long-poll as the universal fallback, SSE for one-way streaming, WebSocket for true duplex,
and webhooks for server-to-server async.
`.trim()

const httpSemanticsTeach = `
## Decades of distributed-systems thinking, already encoded

HTTP already encodes decades of distributed-systems thinking about safety, idempotency, caching, and
concurrency. Using its semantics correctly gets you free caching and safe retries; ignoring them
silently loses data.

### Methods: safe and idempotent are orthogonal

Safe means read-only (no server state change): \`GET\` and \`HEAD\`. Idempotent means repeating it
lands the same final state: \`GET\`, \`HEAD\`, \`PUT\`, \`DELETE\`. \`POST\` is neither safe nor
idempotent, \`PATCH\` generally is not idempotent. This directly drives retry behavior: an
intermediary or client can safely auto-retry \`GET\`/\`PUT\`/\`DELETE\` after a network blip, but
must not blindly auto-retry \`POST\` (that is what idempotency keys are for). Safe methods are also
the cacheable ones.

Status families are a contract with the client:

- \`2xx\` success: \`200\` OK, \`201\` Created (return a \`Location\` header pointing at the new
  resource), \`204\` No Content.
- \`3xx\`: redirects and, importantly, \`304 Not Modified\` for conditional requests.
- \`4xx\` client error: \`400\`, \`401\`, \`403\`, \`404\`, \`409\` conflict, \`422\` unprocessable,
  \`429\` rate limited. Do not retry these blindly.
- \`5xx\` server error: \`500\`, \`503\`. Retry with backoff.

### Read caching: Cache-Control plus a validator

On a \`GET\` you send \`Cache-Control\` (\`max-age\` for private/browser caches, \`s-maxage\` for
shared/CDN caches, \`no-store\` for sensitive data) plus a validator: an \`ETag\` (an opaque version
hash) or \`Last-Modified\` timestamp. The validator enables the conditional GET: the client sends
\`If-None-Match: <etag>\` (or \`If-Modified-Since\`), and if nothing changed the server returns
\`304 Not Modified\` with no body. That saves bandwidth and origin rendering while keeping the client
current.

### Optimistic concurrency: ETag + If-Match

The same \`ETag\` gives you optimistic concurrency control, which prevents the lost-update problem.
Two editors both \`GET\` a document (ETag \`v5\`). Editor A saves with \`If-Match: v5\`; the server
sees the current version is still \`v5\`, applies the write, and the ETag becomes \`v6\`. Editor B
then saves with \`If-Match: v5\`; the server sees the current version is now \`v6\`, refuses, and
returns \`412 Precondition Failed\`. B is forced to re-read and merge instead of silently clobbering
A's change. This is far cheaper than pessimistic locking and is exactly how you avoid last-write-wins
data loss.

Content negotiation completes the picture: honor \`Accept\` and \`Accept-Language\`, and set
\`Vary: Accept, Accept-Encoding\` on responses so a shared cache does not serve a JSON body to a
client that asked for XML, or a Brotli body to a client that cannot decode it.

**Interview nuance:** the two high-signal moves are (1) tying method idempotency to retry safety, and
(2) describing ETag + If-Match -> 412 as optimistic concurrency to prevent lost updates. Saying
"return 200 and last-write-wins" is the wrong turn interviewers listen for.

Recap: use safe/idempotent method semantics to drive retry and caching, add Cache-Control plus ETag
for cheap conditional GETs (304), and use ETag + If-Match -> 412 for optimistic concurrency that
prevents lost updates.
`.trim()

export const systemDesignLevel1: DesignLevel = {
  id: 1,
  slug: "foundations",
  title: "Level 1 — Foundations & Mental Models",
  tagline: "The networking, API-contract, and performance fundamentals every later design assumes.",
  estimatedHours: 9,
  modules: [
    {
      id: "sd-l1-m1",
      title: "Networking & the Request Lifecycle",
      description:
        "Trace a request from the address bar to a database row and back, naming every hop (DNS, TCP, TLS, CDN, LB, proxy, app, cache, database), the latency each adds, and where each can fail.",
      lessons: [
        {
          id: "sd-l1-network-stack",
          title: "The Network Stack (OSI / TCP-IP)",
          summary:
            "Reason in the practical 5-layer stack and know that L4 sees only the 4-tuple while L7 can read and route on request content.",
          estimatedMinutes: 20,
          difficulty: "easy",
          skills: ["networking", "osi"],
          teach: {
            markdown: networkStackTeach,
            estimatedMinutes: 8,
          },
          apply: {
            id: "sd-l1-network-stack-apply",
            prompt:
              "Explain the layers a browser request traverses from app code down to the wire, and label which component (LB, proxy, TLS terminator, app) operates at which layer.",
            thinkAbout: [
              "What is the practical 5-layer view versus the OSI reference?",
              "Why is the L4-vs-L7 distinction the one that actually matters for LBs and proxies?",
              "What does the 4-tuple identify about a connection?",
            ],
            modelAnswerOutline: [
              "Assume a browser calling `https://api.example.com/orders`, reasoned in the practical 5-layer stack (link / IP / transport / TLS / HTTP) rather than strict OSI, which is a teaching reference.",
              "**Top down from app code:** the app emits an HTTP request at L7 (method, path, headers, body); it is serialized into a TLS record (encryption and identity), handed to TCP at L4 which segments it and adds sequence numbers and the destination port (443), wrapped in an IP packet at L3 with source and destination addresses, and framed at L2 (Ethernet) onto the wire. Each layer only understands its own header; a router at L3 never reads the HTTP path.",
              "**Components mapped to layers:** an L4 load balancer (NLB, IPVS) operates on TCP, sees the 4-tuple `(client IP:port, VIP:443)`, and forwards the connection to a backend pinned by that tuple, reading nothing above TCP. A TLS terminator (edge box, ALB, Envoy) operates at the TLS layer: it decrypts, which is what unlocks L7. A reverse proxy or L7 LB (Envoy, NGINX, ALB) operates at L7: with TLS terminated it reads `Host` and path, routes `/orders` to the orders pool, and applies per-route retries and rate limits. The app server also lives at L7.",
              "**The key tradeoff:** L4 is fast, cheap, and protocol-agnostic but blind to content, so it cannot do path or header routing. L7 can route on anything but must terminate TLS and parse every request, costing CPU and latency. A common real topology is L4 at the very edge (raw throughput, DDoS absorption) fronting an L7 proxy fleet.",
              "**Why the 4-tuple matters:** it is the connection's identity. It lets one client hold many connections to one server (different ephemeral source ports), lets NAT multiplex hosts behind one IP by rewriting ports, and forces L4 LBs to pin flows to backends.",
              "Common wrong turn: claiming a network (L4) load balancer routes by URL or cookie. It cannot see them; that requires an L7 proxy that has terminated TLS.",
            ],
          },
          practice: {
            id: "sd-l1-network-stack-practice",
            prompt:
              "Design the edge layering for Cloudflare-style traffic where the front tier must absorb a 500 Gbps volumetric DDoS attack yet still route /api/* and /static/* to different origin pools. Explain which tier operates at L4 versus L7, and why you cannot do the whole job at a single layer.",
            thinkAbout: [
              "Why does DDoS absorption want the cheapest, most stateless filtering possible?",
              "What does completing a TCP+TLS handshake prove about the traffic that survives tier 1?",
              "Why would terminating TLS on raw attack traffic defeat the purpose?",
            ],
            modelAnswerOutline: [
              "Split the edge into two tiers because the requirements pull in opposite directions: DDoS absorption wants the cheapest, most stateless, protocol-agnostic filtering, and path routing requires reading L7, which is expensive per request.",
              "**Tier 1 is L3/L4.** Anycast advertises the same IPs from every POP so a volumetric flood spreads geographically across dozens of sites instead of concentrating on one. At each POP, L4 scrubbing (XDP/eBPF or hardware) drops spoofed SYN floods and malformed packets by inspecting only IP and TCP headers, with SYN-cookie defense so no per-connection state is held for half-open floods. This tier must stay at L4: at 500 Gbps you cannot afford to terminate TLS and parse HTTP on attack traffic, and most volumetric attacks are not even valid HTTP.",
              "**Tier 2 is L7,** reached only by traffic that survived tier 1 and completed a TCP+TLS handshake (which already filters most spoofed sources, since a spoofer cannot complete the handshake). Envoy or NGINX terminates TLS, reads Host and path, and routes `/api/*` to the origin API pool and `/static/*` to the cache/object-store pool. L7 rate limiting, WAF rules, and bot scoring also run here because they need request content.",
              "**Why not one layer:** an L4 tier is blind to `/api` vs `/static`, so it physically cannot route by path. An L7-only edge would have to terminate TLS on the entire flood, and TLS handshakes are the expensive part, so a volumetric attack would exhaust CPU long before you filtered it. Layering lets cheap stateless work shed the bulk while expensive stateful work sees only legitimate-looking, handshake-completing traffic.",
              "Common wrong turn: trying to do WAF/path routing at L4 (impossible, it cannot see the path) or terminating TLS on raw attack traffic (burns the CPU you are trying to protect).",
            ],
          },
        },
        {
          id: "sd-l1-dns",
          title: "DNS Resolution & Traffic Steering",
          summary:
            "Use the cached resolver chain, TTL tradeoffs, and GeoDNS/latency/weighted routing with health checks to steer users to the nearest healthy region.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["dns", "routing", "failover"],
          teach: {
            markdown: dnsTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l1-dns-apply",
            prompt:
              "Design the DNS setup for a globally deployed API: specify record types, TTLs, and how you steer users to the nearest healthy region.",
            thinkAbout: [
              "What is the resolver chain and where does caching happen at each hop?",
              "What does TTL trade off, and why is failover not instant?",
              "How does GeoDNS or latency-based routing steer traffic?",
            ],
            modelAnswerOutline: [
              "Assume `api.example.com` served from three regions (us-east, eu-west, ap-south), each fronted by a regional load balancer with a stable IP or hostname. Goal: send each user to the nearest healthy region with fast-enough failover.",
              "**Records:** at the apex `example.com` use an ALIAS/ANAME (not a CNAME, which is illegal at the apex) pointing at the CDN or LB. For `api.example.com` use latency-based routing on Route 53 (or GeoDNS if data residency matters more than raw latency), one record set per region, each an ALIAS to that region's ALB and each attached to a **health check** probing a real `/healthz` endpoint. Publish both A and AAAA so IPv6 clients get a native answer.",
              "**TTL: 60s on the API records.** Short enough that a failover propagates in roughly a minute for well-behaved resolvers; accept the higher query volume because the authoritative provider is built for it. Not 5s (marginal benefit, resolver noise, some resolvers clamp it) and not 3600s (an hour to fail away from a dead region is unacceptable for an API).",
              "**Steering and failover:** latency-based routing returns the region with the lowest RTT to the user's recursive resolver. When a region's health check fails, the authoritative server stops returning its IP, so new resolutions flow to the next-nearest healthy region. Existing clients keep using the dead IP until their cache expires (up to the TTL plus resolver misbehavior), so the regional LB and client retries must fail fast so a stuck user recovers on the next request.",
              "**The tradeoff stated out loud:** DNS failover is eventually-consistent and best-effort, minutes not milliseconds, because you do not control downstream caches. For true instant failover within a region, rely on the L4/L7 LB and health checks, not DNS. DNS gets the user to the right region; the LB handles per-request routing and instant backend failover.",
              "Common wrong turn: assuming a 60s TTL means 60s guaranteed failover. Resolvers cache and clamp; treat DNS failover as a coarse, minutes-scale lever and put the fast failover in the LB.",
            ],
          },
          practice: {
            id: "sd-l1-dns-practice",
            prompt:
              "Design the DNS and traffic-steering cutover for a Netflix-scale blue-green deploy where you must shift 5% of global traffic to a new stack, watch error rates, and roll back within 2 minutes if p99 errors spike. Specify records, TTLs, and exactly what 'roll back in 2 minutes' depends on.",
            thinkAbout: [
              "Can DNS weight changes alone honor a 2-minute rollback SLO, given resolver caching?",
              "Where does the fast, deterministic traffic-shift lever actually live?",
              "How do you keep the green fleet's error signal isolated and readable?",
            ],
            modelAnswerOutline: [
              "Use weighted DNS routing as the coarse traffic split and lean on load-balancer-level shifting for the fast, precise control, because DNS alone cannot hit a 2-minute rollback reliably.",
              "**Setup:** two record sets for `api.example.com`, blue (current, weight 95) and green (new, weight 5), each an ALIAS to its own regional LB fleet with health checks. TTL deliberately low, 30 to 60s, so a weight change propagates quickly. Roll out the 5% by setting green's weight, then watch green's p99 error rate and latency on its own dashboards (isolated because green is a distinct fleet).",
              "**The catch, said explicitly:** 'roll back in 2 minutes' cannot depend purely on DNS, because even at a 30s TTL some resolvers cache longer and clients that already resolved green keep hitting it. The real fast lever is at the LB/app tier: put the blue-green split behind a single L7 proxy (Envoy) that shifts weights instantly via config push, so DNS just points everyone at the proxy and rollback is a proxy config change taking effect in seconds. (Alternative: a feature flag / router at the app edge.) DNS weighting becomes the coarse regional dial; proxy weighting is the instant one.",
              "**Rollback sequence:** alert fires on green p99 error spike; automation flips the proxy weight for green to 0 (seconds), and separately sets green's DNS weight to 0 (minutes, to drain cached clients). Green fleet stays warm until traffic drains so the canary can be retried.",
              "**Tradeoff:** a pure DNS canary is simple but its rollback is bounded below by TTL plus resolver misbehavior, so it is minutes-scale and unreliable for a 2-minute SLO. Fronting with an L7 proxy gives second-scale, deterministic shifting at the cost of an extra hop.",
              "Common wrong turn: promising a 2-minute rollback from DNS weight changes alone; resolver caching makes that unsafe. Put the fast shift in the proxy, use DNS for the coarse split.",
            ],
          },
        },
        {
          id: "sd-l1-tcp-udp",
          title: "TCP & UDP Fundamentals",
          summary:
            "The TCP handshake and slow start make new connections expensive; reuse connections, multiplex, move endpoints closer, and reach for UDP when late data is worthless.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["tcp", "udp", "latency"],
          teach: {
            markdown: tcpUdpTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l1-tcp-udp-apply",
            prompt:
              "Explain why a chatty API over new connections is slow on a high-latency link, and list three ways to fix it without changing business logic.",
            thinkAbout: [
              "What does the 3-way handshake cost before any data flows?",
              "How does connection reuse amortize that cost?",
              "When is UDP the right choice despite losing reliability?",
            ],
            modelAnswerOutline: [
              "Assume a mobile client on a 200ms RTT link calling an API that makes 30 small sequential requests, each opening a fresh HTTPS connection.",
              "**Why it is slow:** each new connection pays a TCP 3-way handshake (1 RTT = 200ms) plus a TLS 1.3 handshake (~1 more RTT = 200ms) before the first request byte, then at least 1 RTT for the response. Roughly 600ms per call of overhead doing no work, times 30 calls if serialized: seconds of pure ceremony. On top of that, every fresh connection restarts TCP slow start with a tiny congestion window, so even the data transfer is throttled and never reaches full throughput before the short connection closes.",
              "**Fix 1, keep-alive plus connection pooling:** reuse one warm connection for all 30 requests. Pay the handshake once and keep the congestion window that slow start opened, so later requests are both handshake-free and full-speed. Almost every HTTP client and database driver does this via a pool; the fix is often just enabling and sizing it.",
              "**Fix 2, HTTP/2 multiplexing:** one TCP+TLS connection carries all 30 requests concurrently as independent streams. One handshake, one slow start, and the requests do not even serialize, so wall-clock time collapses toward a single round trip's worth of latency.",
              "**Fix 3, move the endpoint closer (edge POP / CDN):** terminate TLS at a POP near the user so the expensive handshakes traverse a 20ms hop instead of 200ms, and let the POP hold a warm, pooled long-haul connection to origin. Every remaining round trip is simply cheaper.",
              "**Tradeoff and the UDP scope:** pooling and H2 add a little client/proxy complexity and connection-management state, but the latency win on high-RTT links is enormous. If the data were loss-tolerant and latency-critical (voice/video/telemetry), consider UDP, accepting no retransmission because late data is useless there; not the case for a transactional API.",
              "Common wrong turn: opening a new connection per request, which multiplies handshake and slow-start cost by the request count and can exhaust ephemeral ports (TIME_WAIT) on a busy client.",
            ],
          },
          practice: {
            id: "sd-l1-tcp-udp-practice",
            prompt:
              "Design the transport strategy for Zoom-scale live video where 1 million concurrent participants need sub-150ms glass-to-glass latency, plus a separate reliable control channel for join/leave and chat. Choose TCP vs UDP for each path and justify, and explain how you handle packet loss on the media path.",
            thinkAbout: [
              "Why does retransmission fundamentally conflict with a 150ms glass-to-glass budget?",
              "Which data in this system cannot tolerate loss, and what transport does it deserve?",
              "Without TCP, where do loss handling and congestion control come from on the media path?",
            ],
            modelAnswerOutline: [
              "Split media and control onto different transports because they have opposite requirements.",
              "**Media path: UDP** (typically SRTP over UDP, or a QUIC/WebRTC data path). Glass-to-glass under 150ms is impossible with retransmission: a lost packet, retransmitted, arrives 1+ RTT late, after the moment it was meant to be played, so it is useless. TCP would also stall the entire stream on any single loss (head-of-line blocking) while retransmitting, causing the freeze-then-catch-up artifact.",
              "**Loss handling without retransmission:** forward error correction (send redundant parity so the receiver reconstructs a lost packet without asking), packet loss concealment (interpolate a missing audio frame), and adaptive bitrate that lowers resolution when the network degrades. Congestion control happens at the app layer (WebRTC/GCC bandwidth estimation) since UDP gives none for free.",
              "**Control path: TCP** (or a reliable QUIC stream). Join, leave, mute state, chat, and roster updates must be delivered in order and not lost; a dropped 'user left' event corrupts UI state. Latency here is human-scale, so TCP's reliability and ordering are worth the handshake and retransmit cost. Keep this connection warm and pooled per client.",
              "**Scale:** 1M concurrent participants means no peer mesh; route media through Selective Forwarding Units (SFUs) in regional POPs near users, so each client has one short-RTT UDP path to its nearest SFU and the SFU fans out. Keeping per-hop RTT low is the only way to stay under 150ms once encode/decode and jitter-buffer time are subtracted.",
              "**Tradeoff:** UDP forces rebuilding loss handling (FEC, concealment, app-layer congestion control), real complexity, but it is the only way to hit the latency target. TCP for control is the easy, correct default because its data cannot tolerate loss and can tolerate latency.",
              "Common wrong turn: running media over TCP for 'reliability.' Its head-of-line blocking and retransmits guarantee missing the latency budget; reliability is the wrong goal for live media.",
            ],
          },
        },
        {
          id: "sd-l1-tls-https",
          title: "TLS / HTTPS & the Secure Handshake",
          summary:
            "TLS 1.3 is a 1-RTT handshake; cut cost with resumption and reuse, choose the termination point deliberately, and use mTLS for service identity.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["tls", "security", "mtls"],
          teach: {
            markdown: tlsHttpsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-tls-https-apply",
            prompt:
              "Design TLS termination for a multi-region service: decide where you terminate, how you cut handshake latency, and how services authenticate each other.",
            thinkAbout: [
              "Where do you terminate TLS and what is the latency vs security tradeoff?",
              "How do session resumption and 0-RTT cut handshake cost, and what is the replay caveat?",
              "Why use mTLS between services?",
            ],
            modelAnswerOutline: [
              "Assume a multi-region service behind a CDN, with regional L7 proxies (Envoy/ALB) in front of app fleets, and internal service-to-service calls within each region.",
              "**Termination: at the regional edge proxy** (and optionally at the CDN POP for static content). This offloads TLS crypto from app servers, centralizes certificate management, and lets the L7 proxy read the request for path/header routing, which an L4 passthrough could not do. Behind the edge, re-encrypt to backends rather than sending plaintext, because 'internal network is trusted' is a weak assumption in a multi-tenant cloud VPC. Terminate at edge for features and offload, re-encrypt inward for confidentiality.",
              "**The explicit tradeoff:** full end-to-end passthrough would hide requests even from your own LB but costs L7 routing and puts crypto on every app server; edge-terminate-plus-reencrypt is the pragmatic middle.",
              "**Cutting handshake latency:** (1) TLS 1.3 everywhere, so a fresh handshake is 1 RTT, not 1.2's two. (2) Session resumption with tickets so returning clients skip the certificate exchange. (3) Terminate at a nearby POP so full handshakes happen over a short RTT, and keep warm pooled connections from POP to origin so the long-haul leg rarely re-handshakes. (4) Enable 0-RTT only for idempotent GETs, never mutations: 0-RTT early data is replayable, so a captured `POST /charge` could be resent.",
              "**Automate cert rotation** (ACM/ACME): an expired cert on the edge is a classic total outage.",
              "**Service-to-service auth: mTLS** via a service mesh (Istio/Linkerd) or SPIFFE identities. Each service presents a short-lived cert from an internal CA and both sides verify, so 'is this really the orders service' is answered cryptographically, not by IP allowlist. That is the zero-trust posture: network location grants nothing; identity is the cert.",
              "Common wrong turn: treating the handshake as free (it is 1 RTT plus crypto, worth optimizing), forgetting cert rotation (the top outage cause), or enabling 0-RTT on non-idempotent endpoints.",
            ],
          },
          practice: {
            id: "sd-l1-tls-https-practice",
            prompt:
              "Design the TLS and identity architecture for a bank's payment microservices where a compliance rule forbids plaintext on any wire, even inside the VPC, and every service call must be cryptographically attributable to a specific service identity for audit. Explain termination, key rotation, and how you keep the added crypto from blowing the latency budget.",
            thinkAbout: [
              "Where does plaintext exist in an edge-terminate design, and why does that violate the rule here?",
              "How do short-lived, auto-rotated certificates change the blast radius of a leaked key?",
              "Which crypto cost dominates (handshakes or steady-state), and what amortizes it?",
            ],
            modelAnswerOutline: [
              "The 'no plaintext anywhere' and 'every call attributable' rules push to end-to-end mTLS with a service mesh, not edge-terminate-and-trust-the-network.",
              "**Encryption on every wire:** do not terminate to plaintext behind the edge. The public edge terminates the client's TLS (or passes through), and every internal hop runs its own mTLS connection, so no packet is ever plaintext on any wire. A sidecar proxy (Envoy via Istio/Linkerd) sits next to each service and handles the TLS so app code stays simple; plaintext only exists inside the loopback between app and its own sidecar, which never touches a wire.",
              "**Attributable identity:** mTLS with SPIFFE/SPIRE-issued identities. Each service gets an X.509 SVID encoding its identity (e.g. `spiffe://bank/payments/settlement`). Both sides verify certs on every connection, so every call is provably from a named service, and the mesh emits audit logs keyed by that identity. Authorization policies ('only settlement may call ledger-write') are enforced on identity, not IP.",
              "**Key rotation:** short-lived certs, on the order of hours, auto-rotated by SPIRE. Short lifetimes shrink the blast radius of a leaked key and remove the manual-rotation outage risk; the mesh rotates transparently, so no midnight cert-expiry outage.",
              "**Keeping latency in budget:** (1) TLS 1.3 for 1-RTT handshakes; (2) aggressive connection reuse/pooling between sidecars so the handshake amortizes over thousands of requests (steady state is symmetric-key encryption, cheap and often hardware-accelerated AES-NI); (3) session resumption for reconnects; (4) shallow call graphs so handshake RTTs do not stack. Do not enable 0-RTT: these are payment mutations, and 0-RTT's replay risk is unacceptable for a charge.",
              "**Tradeoff:** full mesh mTLS is operationally heavy (CA, sidecars, rotation infra) and adds a small per-connection cost, but it is the only way to satisfy 'encrypted everywhere, attributable everywhere.' The latency hit is contained because reuse makes handshakes rare and symmetric crypto is cheap.",
              "Common wrong turn: edge-terminating to plaintext internally 'because the VPC is private,' which violates the compliance rule, or using long-lived certs that become a rotation-outage and leak-blast-radius problem.",
            ],
          },
        },
        {
          id: "sd-l1-http-versions",
          title: "HTTP/1.1 vs 2 vs 3 (QUIC)",
          summary:
            "Locate head-of-line blocking in each version: H1 blocks per request, H2 still stalls on TCP loss, H3/QUIC removes it, so H3 belongs at the mobile edge and H2/gRPC internally.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["http", "quic", "protocols"],
          teach: {
            markdown: httpVersionsTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l1-http-versions-apply",
            prompt:
              "Choose the HTTP version(s) for a public API plus its internal microservices and justify each with its failure and latency profile.",
            thinkAbout: [
              "Where does head-of-line blocking bite in H1, H2, and H3?",
              "When does HTTP/3 over QUIC actually win?",
              "What protocol does gRPC use today?",
            ],
            modelAnswerOutline: [
              "Assume a public API serving mostly mobile and browser clients over the open internet, and a fleet of internal microservices on a low-loss datacenter network.",
              "**Public edge: HTTP/3 (QUIC) with HTTP/2 fallback.** Public clients are on mobile and lossy links, exactly where H3 wins. Per-stream reliability means one lost packet stalls only its own stream, avoiding the TCP-level HOL blocking that hurts H2 on lossy networks. QUIC's connection migration keeps a user's connection alive across a Wi-Fi-to-cellular switch instead of forcing a fresh handshake, and its combined transport+TLS handshake shaves a round trip. Keep H2 as a fallback because some networks and middleboxes block or throttle UDP, and older clients need it.",
              "**Latency and failure profile of the edge choice:** faster handshake, no cross-stream stalls on loss; if UDP is blocked, fall back cleanly to H2 over TCP.",
              "**Internal microservices: HTTP/2, via gRPC.** gRPC runs on H2 today, and internal RPC benefits from H2's multiplexed streams and streaming support with contract-first Protobuf. The internal network is stable and low-loss, so H2's one weakness, TCP-level HOL blocking under packet loss, rarely triggers; H3 would add operational complexity and user-space congestion-control CPU cost for little benefit.",
              "**Why not H1 anywhere new:** one request per connection forces ~6 connections per host (6 handshakes, 6 slow starts) and blocks per request; H2 multiplexing strictly dominates it on the same TCP transport.",
              "**The committed tradeoff:** H3 at the edge buys mobile/lossy-network resilience and connection migration at the cost of UDP-middlebox risk (mitigated by H2 fallback); H2/gRPC internally buys mature multiplexed RPC on a network where H3's loss-resilience advantage does not pay for itself.",
              "Common wrong turn: rolling H3 everywhere including stable internal links, where it adds CPU and operational cost for a benefit (loss resilience, migration) that a low-loss datacenter never needs.",
            ],
          },
          practice: {
            id: "sd-l1-http-versions-practice",
            prompt:
              "Choose and justify the HTTP protocol strategy for a mobile game backend where players on flaky 4G in moving vehicles need low-latency state sync, plus a companion web dashboard and internal matchmaking services. Explain the failure mode you are optimizing against on the mobile path and where you would not use HTTP/3.",
            thinkAbout: [
              "What happens to a TCP connection when a moving vehicle's IP changes between towers?",
              "Which state updates tolerate loss, and is even QUIC's reliability unwanted for them?",
              "Where does H3 earn nothing, and what should those links use instead?",
            ],
            modelAnswerOutline: [
              "The dominant constraint is players on flaky, mobile 4G in moving vehicles, the textbook case for HTTP/3, so the mobile path drives the decision.",
              "**Mobile game clients: HTTP/3 over QUIC**, optimizing against two failure modes. First, packet loss: on 4G, loss is frequent, and under H2 a single lost TCP packet head-of-line-blocks every multiplexed stream until retransmission, so one dropped packet stalls unrelated state updates. QUIC's per-stream reliability confines the stall to the affected stream. Second, network changes: a moving vehicle hands off between cell towers and Wi-Fi, changing IP; under TCP that breaks the 4-tuple and forces a full reconnect and re-handshake mid-game. QUIC's connection migration keeps the same connection ID across the IP change, so the session survives. The faster QUIC handshake also helps on reconnects. Keep H2 fallback for networks that block UDP.",
              "**For the truly latency-critical, loss-tolerant real-time state** (position updates), additionally consider a raw UDP or WebRTC data channel, since even QUIC's reliability is unwanted for data that is stale on arrival; for reliable game events QUIC is the sweet spot.",
              "**Companion web dashboard: H2 with H3 where available.** Not latency-critical or mobile-hostile, so H2 multiplexing over one connection is plenty; H3 is a nice-to-have.",
              "**Internal matchmaking and game services: H2/gRPC.** Contract-first Protobuf RPC on a stable, low-loss datacenter network. Exactly where NOT to use H3: the loss-resilience and migration benefits do not apply on a clean internal link, and H3's user-space congestion control just adds CPU and operational complexity.",
              "**Tradeoff:** H3 on mobile buys survival of loss and network handoffs at the cost of UDP-middlebox risk (mitigated by fallback); H2/gRPC internally is the boring correct choice where H3 earns nothing.",
              "Common wrong turn: forcing H3 on internal services for consistency, paying its cost with none of its mobile-network benefit, or running reliable game events over plain UDP and then reinventing retransmission badly.",
            ],
          },
        },
        {
          id: "sd-l1-request-lifecycle",
          title: "End-to-End Request Lifecycle",
          summary:
            "Name every hop from browser cache to database and back, the RTT each adds, the cache that can short-circuit it, and the timeout that bounds it.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["request-lifecycle", "caching"],
          teach: {
            markdown: requestLifecycleTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-request-lifecycle-apply",
            prompt:
              "Trace a request from browser to database and back for a signed-in user hitting a dynamic page, naming every hop and the cache at each layer.",
            thinkAbout: [
              "What RTTs are added at each step from DNS through TLS to first byte?",
              "Where can a cache short-circuit the path, and what changes on a hit vs miss?",
              "What are the failure points and timeouts at each hop?",
            ],
            modelAnswerOutline: [
              "Assume a signed-in user loading their dashboard at `https://app.example.com/dashboard`, dynamic and personalized, served from a CDN-fronted, multi-tier backend.",
              "**1-4, getting connected:** browser cache / service worker first (0 RTT; personalized HTML usually not cacheable here, but static assets and prior API responses may be; a fresh hit ends the chain). DNS: usually cached (0 RTT), cold miss adds a resolver walk; failure mode is a resolution timeout. TCP: ~1 RTT handshake, skipped on a pooled connection; failure is a connect timeout. TLS 1.3: ~1 RTT (0-RTT on resumption), so cold is ~2 RTTs before the first request byte; failure is an expired cert.",
              "**5-7, the edge:** CDN/anycast POP routes to the nearest POP and terminates TLS near the user. For this dynamic personalized page the CDN cannot cache the HTML, so it proxies to origin while still caching the page's static assets: the key point for a signed-in user. WAF inspects and can block early. LB (L4) then reverse proxy / API gateway (L7) do routing, rate limiting, auth offload; failure is 502/503/504 when backends are unhealthy.",
              "**8-10, the app tier:** app server validates the session token/JWT (failure: 401), then checks the app cache (Redis) before the DB. Hit: ~1ms, skip the DB. Miss: query the DB, then populate Redis (read-through). This cache is the real short-circuit for a logged-in user. The database plus downstream services are the authoritative read and fan-out, each hop with its own timeout and ideally a circuit breaker.",
              "**11, the response path:** serialize (JSON), compress (brotli), set Cache-Control/ETag so the browser can revalidate cheaply next time, CDN fills static assets, client renders.",
              "**Hit vs miss:** a warm path (reused connection plus Redis hit) answers in single-digit ms; a cold path (new connection, Redis miss, DB plus fan-out) is hundreds of ms.",
              "Common wrong turn: assuming the CDN caches the signed-in HTML. It generally cannot; the browser cache and Redis do the caching, and the CDN's job is TLS termination near the user and static-asset acceleration. Also: forgetting per-hop timeouts, so one slow downstream stalls the whole request.",
            ],
          },
          practice: {
            id: "sd-l1-request-lifecycle-practice",
            prompt:
              "Trace and optimize the request lifecycle for an Amazon-style product page under a Black Friday spike (200k RPS, 60% signed-in) where p99 must stay under 300ms. Name each hop's cache, say what you cache versus what you cannot, and identify the two hops most likely to be your bottleneck.",
            thinkAbout: [
              "How do you split the page between shared cacheable data and per-user data?",
              "What does a hot doorbuster product do to a single cache key, and how do you defend?",
              "Which hop absorbs the connection-setup flood at 200k RPS?",
            ],
            modelAnswerOutline: [
              "Assume a product detail page: mostly-shared product data (title, images, price, description) plus a personalized strip (cart, recommendations, 'buy again'). Split the page by cacheability; that split is what makes 200k RPS at p99 under 300ms possible.",
              "**Browser cache / CDN:** shared product data and all static assets cached aggressively at the CDN with a short TTL plus stale-while-revalidate, so the vast majority of product-data reads never reach origin. At 200k RPS the CDN absorbing the shared load is the only way to survive. Edge-cache the product HTML fragment or serve a cacheable shell and hydrate the personalized parts client-side.",
              "**Personalized strip (60% signed-in):** cannot be CDN-cached (per-user). Fetched via a separate API call and served from an app-tier Redis cache keyed per user, with the cart in Redis and recommendations precomputed offline and cached. Redis hit ~1ms; the DB only on miss.",
              "**Database:** authoritative product and inventory data behind Redis (read-through) and read replicas; writes (inventory decrement) go to the primary.",
              "**Bottleneck 1: the database on cache misses / hot keys.** A doorbuster product is a single cache key every request wants; a miss or expiry causes a thundering herd. Defend with request coalescing (single-flight so one miss repopulates while others wait), jittered TTLs, and pre-warming hot products. Inventory decrement is a write hot spot: atomic Redis counters or a dedicated inventory service, not a row lock.",
              "**Bottleneck 2: TLS/connection setup at the edge.** 200k RPS of new mobile connections is a handshake flood: keep connections warm/pooled, terminate TLS at the POP with session resumption, and use H2/H3 multiplexing so one connection carries many requests.",
              "**Holding p99 under 300ms:** shared data from the edge, Redis with herd protection for personalized data, aggressive connection reuse, per-hop timeouts with circuit breakers so a slow recommendations service degrades to a generic strip instead of stalling the page, and graceful degradation (show the product even if recs are slow).",
              "Common wrong turn: trying to cache the whole personalized page at the CDN (impossible for signed-in users) instead of splitting cacheable shared data from per-user data, or ignoring the hot-key thundering herd a single doorbuster creates.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l1-m2",
      title: "API Design & Contracts",
      description:
        "Choose the right API paradigm, design schema-first contracts that evolve without breaking clients, make mutations safe to retry, and use HTTP semantics, pagination, real-time delivery, and serialization like production systems do.",
      lessons: [
        {
          id: "sd-l1-api-paradigms",
          title: "REST vs gRPC vs GraphQL",
          summary:
            "Match the paradigm to the consumer and traffic shape (REST public, gRPC internal, GraphQL flexible clients) and name what each choice costs.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["api-design", "grpc", "graphql"],
          teach: {
            markdown: apiParadigmsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-api-paradigms-apply",
            prompt:
              "Recommend the API style for (a) a public developer API, (b) internal service-to-service calls, and (c) a mobile client with varied data needs, and defend each.",
            thinkAbout: [
              "What does each paradigm optimize, and what does it cost?",
              "Why is a hybrid (REST/GraphQL edge, gRPC internal) the common real answer?",
              "Where do WebSocket/SSE and queues fit for push and async?",
            ],
            modelAnswerOutline: [
              "Assumptions: a company with external developers, dozens of internal microservices, and a mobile app with many screens.",
              "**(a) Public developer API: REST.** External developers already know REST, want `curl`-debuggable endpoints, and benefit from HTTP caching, standard status codes, and OpenAPI-generated docs and SDKs. The chattiness cost is acceptable because you cannot dictate client behavior and ubiquity matters more than bytes. Version it (`/v1`) and document with OpenAPI.",
              "**(b) Internal service-to-service: gRPC.** You own both ends, so contract-first Protobuf gives typed generated clients, compact binary frames over HTTP/2, and streaming. At high internal QPS the 3 to 10x payload reduction and faster parsing directly cut CPU and tail latency, and the shared `.proto` becomes the enforced contract. Browser-unfriendliness does not matter here.",
              "**(c) Mobile client with varied data needs: GraphQL at the edge** (often via a BFF). Mobile screens need different field combinations and mobile networks punish extra round trips, so letting the client fetch exactly what a screen needs in one request removes over/under-fetching. Add persisted queries plus query-depth and cost limits so a bad client cannot ask for the entire graph, and DataLoader batching to avoid N+1.",
              "**The unifying point:** these coexist. GraphQL or REST at the edge resolves down into gRPC calls between services. For push (a live order-status screen) add SSE or WebSocket; for async work (the confirmation email) drop an event on Kafka rather than block the request.",
              "Common wrong turn: choosing GraphQL or gRPC because they sound modern, before establishing the consumer and traffic shape. gRPC on a public browser API or GraphQL with no cost limiting both cause real production pain.",
            ],
          },
          practice: {
            id: "sd-l1-api-paradigms-practice",
            prompt:
              "Design the API surface for Stripe-scale infrastructure: a public payments API used by millions of external developers, plus the internal fraud, ledger, and notification services behind it that must handle tens of thousands of charge requests per second. Choose paradigms per layer and justify against caching, debuggability, latency, and contract enforcement.",
            thinkAbout: [
              "What do millions of external developers need that internal services do not?",
              "Which parts of a charge's fan-out should not block the request at all?",
              "Why does GraphQL buy nothing for a small, stable set of payment resources?",
            ],
            modelAnswerOutline: [
              "Assumptions: external developers integrate over the internet with mixed languages; internally a charge fans out to fraud scoring, ledger writes, and notifications at 10k to 50k QPS.",
              "**Public layer: REST with JSON.** Developers need to `curl` a charge, read predictable status codes, and paste examples into any language. Stripe does exactly this and pairs it with Idempotency-Key support so retries are safe. Version with a date-based scheme, keep evolution additive, document with OpenAPI and auto-generate SDKs.",
              "**Internal layer: gRPC** between the API service and fraud, ledger, and notification services. At 10k+ QPS the Protobuf payload savings and HTTP/2 multiplexing cut both bytes and CPU, and generated stubs make the fan-out ergonomic. The `.proto` files are the enforced cross-team contract, and Protobuf field-number rules keep them evolvable. Fraud scoring can use a streaming RPC if signals arrive incrementally.",
              "**Async layer:** the charge request should not block on sending a receipt email or updating analytics. Publish `charge.succeeded` to Kafka; the notification service consumes independently, decoupling latency and letting each side scale and fail on its own.",
              "**Why not GraphQL here:** the public payments API is a small, stable set of resources (charges, refunds, customers), not a screen-driven UI with varied field needs, so GraphQL's flexibility buys nothing while costing HTTP caching and cost-limiting complexity.",
              "Common wrong turn: forcing one paradigm everywhere. REST internally would waste bytes and CPU at this QPS; gRPC publicly would break `curl` and browser developers. The layered split is what makes it work.",
            ],
          },
        },
        {
          id: "sd-l1-contract-design",
          title: "Contract & Schema-First Design",
          summary:
            "Make a machine-readable schema the source of truth, design for tolerant additive evolution, and enforce compatibility with consumer-driven contract tests in CI.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["api-design", "contracts", "schema"],
          teach: {
            markdown: contractDesignTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l1-contract-design-apply",
            prompt:
              "Design the contract for a 'create order' endpoint: resource naming, request/response schema, required vs optional fields, and how a client discovers it.",
            thinkAbout: [
              "What is the source of truth for the contract, and how is it enforced?",
              "How do you design for additive, non-breaking evolution?",
              "How do consumer-driven contract tests catch breakage in CI?",
            ],
            modelAnswerOutline: [
              "Assumptions: a REST API consumed by a web app and a mobile app maintained by other teams.",
              "**Source of truth:** an OpenAPI 3 document, checked into the repo, from which the server stub, client SDKs, and docs are generated. CI validates that the running service conforms to it.",
              "**Resource and method:** `POST /v1/orders`. Noun resource, POST to create, returns 201 Created with a `Location: /v1/orders/{id}` header and the created resource body.",
              "**Request schema (JSON, snake_case):** `customer_id` (required), `currency` (required, ISO-4217), `line_items` (required, at least 1, each with sku and quantity), `idempotency_key` (optional but recommended), `note` (optional). Response includes a server-generated `id`, `status` (enum: pending|confirmed|failed), `amount_cents` (integer, explicit units), and `created_at` (ISO-8601). Required vs optional is explicit in the schema, and unknown fields sent by clients are ignored (tolerant reader).",
              "**Discovery:** the client discovers the contract from published OpenAPI docs plus a generated SDK, not by reading source. A sandbox base URL lets them integrate before going live.",
              "**Evolution:** all future change is additive. Adding `discount_cents` later is safe because existing clients ignore unknown fields; never rename `amount_cents` or change `status` from a string to an object. Removing or renaming a field forces a version bump.",
              "**Enforcement:** consumer-driven contract tests (Pact). The web and mobile teams publish the fields and shapes they actually depend on, and provider CI replays those and fails the build if a change would break them.",
              "Common wrong turn: an ad-hoc contract that renames or removes fields between releases, or 'optional' fields that are sometimes missing and sometimes null, both of which break consumers silently.",
            ],
          },
          practice: {
            id: "sd-l1-contract-design-practice",
            prompt:
              "Design the contract governance for a company with 200 microservices owned by 40 teams, where the payments team's PaymentIntent message is consumed by 15 other services. Explain how you prevent one team's schema change from breaking the other 14 consumers, and how the contract stays the source of truth at that scale.",
            thinkAbout: [
              "Where do the schemas live so no team can drift from the wire contract?",
              "What mechanically blocks a breaking change before merge, without a meeting?",
              "How does a field ever actually get removed at this scale?",
            ],
            modelAnswerOutline: [
              "Assumptions: gRPC internally with Protobuf, services deploy independently many times a day, no shared release train.",
              "**Single source of truth:** all `.proto` files live in a central schema repository (a proto monorepo or schema registry). Nobody hand-writes message types; every service generates its stubs from the published protos, so the wire contract and the code cannot drift.",
              "**Compatibility enforcement in CI:** a schema linter (Buf is the standard) runs on every proto change and rejects breaking changes automatically, enforcing the Protobuf rules that matter: never reuse or renumber a field tag, never change a field's type, mark removed fields `reserved`. Additive change (new optional fields, new RPCs) passes; a breaking change fails the PR before merge.",
              "**Consumer awareness:** the schema registry tracks which of the 15 services consume PaymentIntent. A proposed change surfaces the consumer list on the PR so the payments team knows the blast radius. For behavioral (not just structural) expectations, consumer-driven contract tests capture what each of the 14 consumers actually reads, and the provider build replays them.",
              "**Evolution discipline:** to change semantics, add `payment_intent_v2` fields alongside the old ones and migrate consumers one at a time, deprecating the old field with a documented sunset rather than deleting it. Removal happens only after telemetry shows zero readers.",
              "At 200 services, coordination-by-meeting does not scale. The system holds because the schema is centralized, breaking changes are mechanically blocked in CI, and evolution is additive-first with per-consumer contract tests.",
              "Common wrong turn: letting each team keep its own copy of the proto, or relying on release coordination. Both guarantee some consumer breaks the first time two teams deploy out of sync.",
            ],
          },
        },
        {
          id: "sd-l1-versioning",
          title: "Versioning & Backward Compatibility",
          summary:
            "Prefer additive change with tolerant readers so you rarely version, use visible /v1 path versioning for true breaks, and retire versions with deprecate-warn-remove.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["versioning", "compatibility"],
          teach: {
            markdown: versioningTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l1-versioning-apply",
            prompt:
              "Design a versioning strategy that lets you ship a breaking change to a public API without breaking existing integrations.",
            thinkAbout: [
              "URL-path vs header/media-type versioning, and which is the visible default?",
              "How do additive changes and tolerant readers avoid version bumps?",
              "How do you sequence a migration: deprecate, warn, remove?",
            ],
            modelAnswerOutline: [
              "Assumptions: a public REST API with thousands of external integrations you do not control and cannot force to upgrade.",
              "**Default posture: minimize versioning.** Design every response as additive-friendly and require tolerant readers in your own SDKs, so adding fields, endpoints, or enum values never breaks anyone and never needs a new version. Version bumps are reserved for true breaks: removing or renaming a field, changing a type, or changing default behavior.",
              "**Mechanism: URL-path versioning** (`/v1`, `/v2`) as the visible default, because external developers can see it, route it, and `curl` it without ceremony. Offer header/media-type versioning only if a client base specifically needs stable URLs. `/v1` and `/v2` run side by side; `/v2` is a new deployment or routing target, not a mutation of `/v1`.",
              "**Shipping the break:** stand up `/v2` with the new shape while `/v1` keeps working unchanged. New integrations use `/v2`; existing ones keep running on `/v1`.",
              "**Migration sequence:** (1) Deprecate: announce `/v2`, publish a migration guide and diff, update SDKs. (2) Warn: return `Deprecation: true` and a `Sunset: <date>` header on `/v1`, log per-caller usage, proactively email the highest-volume `/v1` callers. (3) Remove: only after telemetry shows `/v1` traffic has drained to near zero past the sunset date, and even then return a clear 410 Gone rather than a silent failure.",
              "**Compatibility both ways:** the `/v1` server must still serve old clients (backward), and old clients must tolerate any additive data (forward, via tolerant readers).",
              "Common wrong turn: having no versioning story from day one, then discovering a design flaw you cannot fix without breaking everyone, or hard-removing `/v1` on a date with no warning headers and no drain, which turns a routine change into an outage for paying customers.",
            ],
          },
          practice: {
            id: "sd-l1-versioning-practice",
            prompt:
              "Design a versioning model that lets you evolve a payments API for a decade while every integration written on day one still works (as Stripe has done since 2011, shipping changes constantly without ever breaking its API). Explain the mechanism and how new behavior reaches new callers without a /v2.",
            thinkAbout: [
              "What does pinning a version per account (rather than per URL) change about migration pressure?",
              "How can one canonical implementation serve a decade of historical response shapes?",
              "Why do coarse /v1-/v2 URL versions fail at a ten-year horizon?",
            ],
            modelAnswerOutline: [
              "Assumptions: hundreds of thousands of live integrations, many never touched after launch, that must not break, yet the product must keep evolving.",
              "**Mechanism: date-based, per-account pinned versions** (Stripe's real model). Each account is pinned to the API version current when it integrated, e.g. `2020-08-27`. Every request runs against that pinned behavior unless explicitly overridden with a `Stripe-Version` header. A business that integrated in 2013 keeps getting exactly the responses it was coded against, forever.",
              "**How new behavior ships:** each breaking change becomes a new dated version. The backend keeps a chain of request and response transformers, one per dated version, translating between the internal current model and each historical shape. A request from an old pinned account is up-converted to the current internal model, processed once, and the response is down-converted back through the transformer chain to that account's dated shape. One canonical implementation plus a stack of small, tested shims, not N forked codebases.",
              "**Upgrading:** a caller opts in by changing their pinned version in the dashboard or sending the header, after reading the changelog for that date. No forced /v2 migration and no sunset, because old versions cost only a thin transformer, not a parallel service.",
              "**Why not /v1, /v2:** coarse URL versions force periodic painful migrations and tempt you to sunset old versions. Fine-grained dated versions plus transformers let evolution be continuous and backward compatibility be effectively permanent.",
              "Common wrong turn: forking the whole service per version (unmaintainable at decade scale) or relying on tolerant readers alone, which handles additive change but not the genuine behavioral breaks a payments API accumulates over ten years. The transformer chain is what makes 'never break, always evolve' simultaneously true.",
            ],
          },
        },
        {
          id: "sd-l1-idempotency-retries",
          title: "Idempotency & Safe Retries",
          summary:
            "Give mutations a client-generated idempotency key, store the full response behind a unique-constraint insert, and turn at-least-once delivery into effectively-once.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["idempotency", "retries", "payments"],
          teach: {
            markdown: idempotencyRetriesTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-idempotency-retries-apply",
            prompt:
              "Make a 'submit payment' POST safe to retry after a client timeout, and specify the server behavior on the duplicate.",
            thinkAbout: [
              "Which HTTP methods are idempotent by definition, and which need explicit handling?",
              "What does the server store so concurrent duplicates get the same answer?",
              "How does at-least-once become effectively-once?",
            ],
            modelAnswerOutline: [
              "Assumptions: a `POST /v1/payments` that charges a card, called by clients over flaky networks that will retry on timeout. POST is not idempotent, so a naive retry after a lost response double-charges; 'charge a card' is inherently a create.",
              "**Design:** the client generates a UUID per logical payment and sends it as `Idempotency-Key: <uuid>`, reusing the *same* key on every retry of that payment.",
              "**Server behavior, step 1:** on receipt, atomically insert the key into a store with a unique constraint (a unique DB row, or Redis `SET key NX` with a 24h TTL). This is the concurrency gate.",
              "**Step 2:** if the insert wins (first time), process the charge, persist the full response (status, `payment_id`, amount) against the key, and return it.",
              "**Step 3:** if the insert loses (duplicate, whether a retry or a concurrent twin), do not charge again. Wait for the in-flight original to finish if needed, then return the *stored response*, so both callers get the identical `payment_id` and status. Storing the full response, not a boolean, is what makes this correct: the retry needs the real result, and two simultaneous requests must converge on one charge.",
              "**Edge cases:** if the same key arrives with a *different* request body, return 422 (key reuse for a different operation). Give the stored record a TTL so keys do not accumulate forever.",
              "**Delivery semantics:** the network is at-least-once. The idempotency key deduplicates, turning at-least-once into effectively-once processing, the practical stand-in for exactly-once, which is unachievable over an unreliable link. Extend the same keys to webhooks (event id dedupe) and queue consumers.",
              "Common wrong turn: retrying without an idempotency key (double charge), or storing only a 'seen' flag so concurrent duplicates either both charge or the retry gets no usable result.",
            ],
          },
          practice: {
            id: "sd-l1-idempotency-retries-practice",
            prompt:
              "Design idempotency for an event-driven order pipeline where a checkout publishes an order.placed event to Kafka, and three consumers (charge the card, decrement inventory, send confirmation) each process it. Kafka guarantees at-least-once delivery, so every consumer will occasionally see the same event twice. Make the whole pipeline effectively-once without a distributed transaction.",
            thinkAbout: [
              "Why must idempotency live in each consumer rather than in one global transaction?",
              "How does the transactional-inbox pattern make 'already handled?' and 'the effect' atomic?",
              "When is it safe to commit the Kafka offset?",
            ],
            modelAnswerOutline: [
              "Assumptions: Kafka at-least-once delivery, consumers can crash and reprocess after rebalance, no two-phase commit across the card processor, inventory DB, and email provider.",
              "**Core idea:** idempotency is per consumer, keyed on the event id (or a deterministic derivative), because effectively-once must hold independently for each side effect. There is no global transaction; each consumer makes its own action idempotent.",
              "**Charge consumer:** use the `order_id` (or event id) as the `Idempotency-Key` to the payment API. Redelivery of order.placed reuses the same key, so the card is charged once even if the event is processed twice. This reuses the exact synchronous idempotency mechanism.",
              "**Inventory consumer:** record processed event ids. Insert `(event_id, order_id)` into a `processed_events` table with a unique constraint inside the *same* DB transaction that decrements stock. On redelivery the insert violates the constraint, the transaction aborts, and inventory is not double-decremented. This is the transactional-inbox pattern: 'did I already handle this' and 'the effect' are atomic.",
              "**Email consumer:** dedupe on event id before sending, and lean on the provider's own idempotency (SendGrid/SES message keys) so a redelivery does not send a second confirmation.",
              "**Offset commits:** each consumer commits its Kafka offset only after its idempotent write succeeds, so a crash before commit causes a safe reprocess (absorbed by dedup) rather than a lost event.",
              "**Why no distributed transaction:** a 2PC across a card processor, a database, and an email API is unavailable and slow. Independent per-consumer idempotency plus at-least-once delivery gives effectively-once end to end without coupling the three systems.",
              "Common wrong turn: trying to make the pipeline exactly-once with a global transaction, or deduping in only one consumer and letting the others double-act, so inventory drifts or customers get two emails.",
            ],
          },
        },
        {
          id: "sd-l1-pagination-errors",
          title: "Pagination & Error Modeling",
          summary:
            "Use opaque cursor/keyset pagination for O(1) stable paging, and RFC 9457 structured errors with precise status codes so clients retry 5xx/429 but never other 4xx.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["pagination", "errors", "api-design"],
          teach: {
            markdown: paginationErrorsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-pagination-errors-apply",
            prompt:
              "Design a feed/list endpoint that stays fast at page 10,000 and is stable while new items are inserted, and define the error response shape for validation, auth, conflict, rate-limit, and server errors.",
            thinkAbout: [
              "Why does offset pagination degrade and become unstable under inserts?",
              "What does a cursor/keyset page look like, and why is it O(1)?",
              "What structured error body and status codes let clients retry correctly?",
            ],
            modelAnswerOutline: [
              "Assumptions: a `GET /v1/feed` returning items newest-first, with new items inserted continuously.",
              "**Reject offset:** `offset=200000` forces the DB to scan and discard 200k rows (O(n), slow at depth) and shifts every item when new rows are inserted at the top (duplicates and skips).",
              "**Request:** `GET /v1/feed?limit=20&cursor=<opaque>`. Query: `WHERE (created_at, id) < (:cursor_ts, :cursor_id) ORDER BY created_at DESC, id DESC LIMIT :limit + 1`, with a composite index on `(created_at, id)`. Fetch limit + 1 to compute `has_more` without a count.",
              "**Response:** `{ items, next_cursor, has_more }`. The cursor is base64 of the last row's `(created_at, id)` so clients cannot forge positions and the encoding can evolve. Enforce a server max limit (say 100) and prefer `has_more` over `COUNT(*)`, which is an expensive scan.",
              "**Why O(1) and stable:** the index seek jumps straight to the cursor position instead of counting from row zero, and the cursor pins a real row identity, so inserts above it do not move the window.",
              "**Error shape (RFC 9457 Problem Details):** JSON with `type` (URI naming the error class), `title`, `status`, `detail`, `instance`, plus a `correlation_id` so a support ticket maps to a log line. Example: type `.../errors/validation`, title 'Invalid request', status 422, detail 'limit must be <= 100'.",
              "**Status codes:** 422 validation, 401 unauthenticated, 403 forbidden, 409 conflict, 429 rate limit (with Retry-After), 5xx server error. Clients retry 5xx and 429 with backoff and never blindly retry other 4xx. Never leak stack traces.",
              "Common wrong turn: offset pagination on a large table (slow deep pages, unstable under inserts) and dumping raw exceptions or returning 200 with an error body, which breaks both retry logic and security.",
            ],
          },
          practice: {
            id: "sd-l1-pagination-errors-practice",
            prompt:
              "Design pagination and error handling for the Twitter/X home timeline at 500M tweets per day, where users scroll infinitely, new tweets stream in constantly, and the timeline is ranked (not strictly chronological). Explain how the cursor survives ranking and inserts, and how you keep p99 fast at deep scroll.",
            thinkAbout: [
              "What does the cursor point into when the feed is ranked rather than time-ordered?",
              "Where do new tweets go so they do not disrupt a user's downward scroll?",
              "What store serves page 500 in O(1) instead of re-querying the tweet database?",
            ],
            modelAnswerOutline: [
              "Assumptions: hundreds of millions of daily tweets, infinite scroll, a ranked (not purely time-ordered) timeline, and a fan-out-on-write timeline cache per user.",
              "**Pagination: keyset cursor, never offset.** Offset at deep scroll on this volume would be catastrophically slow and would shift wildly as new tweets arrive. The timeline is materialized per user (fan-out-on-write) into a cache like Redis, so the 'list' is a precomputed, ordered set of tweet ids.",
              "**Cursor design for a ranked feed:** the cursor is opaque and encodes the position in the materialized ranked list, not a raw `created_at`. Because ranking can reorder items, the cursor pins a stable snapshot boundary: where the last page ended in the already-materialized list, so continued scrolling reads forward from that point rather than re-ranking from scratch.",
              "**Inserts:** new tweets go to the head of the materialized list; since the cursor points into the middle/tail, they do not disrupt the downward scroll. They appear on pull-to-refresh at the top instead. This is the standard 'stable pagination over a snapshot, refresh brings new items at the top' model.",
              "**p99 at depth:** serve pages from the per-user materialized Redis list (O(1) range reads by index/score), not by querying the tweet store with a deep scan. Deep scroll is just reading further into an in-memory ordered set. Cap page size and total scroll depth (older items fall out of the hot cache and are served from a colder store or cut off).",
              "**Errors:** RFC 9457 Problem Details with a correlation id, precise codes (429 with Retry-After for aggressive scrolling is common), and clients retry only 5xx/429. At this scale rate limiting is first-class, so client-side 429 handling is essential.",
              "Common wrong turn: offset pagination or re-ranking the entire timeline on every page (unstable and slow), or querying the source-of-truth tweet DB per page instead of a precomputed per-user timeline cache, which blows p99 at deep scroll.",
            ],
          },
        },
        {
          id: "sd-l1-realtime-comms",
          title: "Real-Time Delivery: Short-Poll, Long-Poll, SSE, WebSocket & Webhooks",
          summary:
            "Choose by direction, latency, per-connection cost, and delivery guarantee: SSE for one-way streaming, WebSocket for true duplex, webhooks for server-to-server.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["real-time", "api-design", "networking"],
          teach: {
            markdown: realtimeCommsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-realtime-comms-apply",
            prompt:
              "Choose a real-time delivery mechanism for three features (a chat app, a notifications bell, and streaming LLM tokens back to a browser) and justify each choice against short-poll, long-poll, SSE, WebSocket, and webhooks.",
            thinkAbout: [
              "Is the data flow one-directional server-to-client, or does the client also need to push at low latency?",
              "What does each open connection cost at your fan-out, and how does that interact with load balancers and proxies?",
              "What delivery guarantee does the feature need, and who reconnects and replays missed messages?",
            ],
            modelAnswerOutline: [
              "Assumptions: browser clients, a stateless service tier behind an L7 load balancer, millions of concurrent users at peak.",
              "**Chat app -> WebSocket.** Chat is genuinely bidirectional and latency-sensitive: users both send and receive constantly, and typing/presence indicators push both ways. Accept the costs: the connection is stateful, so scale it with a pub/sub backbone (Redis or NATS) rather than sticky sessions alone, so a message from a user on node A reaches a recipient on node B. Add heartbeats and client reconnect with replay of missed messages (each message carries a sequence id).",
              "**Notifications bell -> SSE, with long-poll fallback.** The flow is one-directional server-to-client; the client never pushes over this channel. SSE gives near-real-time delivery, automatic reconnection, and `Last-Event-ID` resume, all over plain HTTP that traverses proxies and CDNs. WebSocket would be over-engineering: the stateful-connection tax for no bidirectional benefit. Long-poll is the fallback for old clients or hostile proxies.",
              "**Streaming LLM tokens -> SSE.** Token streaming is strictly one-way, incremental, and resumable: exactly SSE's sweet spot, proxy-friendly with no duplex channel needed. This is why most LLM chat UIs stream over SSE. The user's prompt is a normal POST; the token stream comes back as SSE.",
              "**Delivery and reconnect:** for the bell and LLM stream, SSE auto-reconnect plus event ids handle resume. For chat, you own reconnect and replay via sequence ids and the pub/sub backbone.",
              "Common wrong turn: using WebSocket for the bell and the LLM stream. Both are one-directional, so SSE delivers the same latency without sticky sessions, per-connection state, and custom reconnect logic.",
            ],
          },
          practice: {
            id: "sd-l1-realtime-comms-practice",
            prompt:
              "Design the real-time delivery for a live-sports scoreboard that pushes score updates to 5 million concurrent viewers during a World Cup final, where the update is one-way (server to client), viewers join and leave in huge waves, and a few seconds of staleness is acceptable but a server meltdown is not. Choose the mechanism and explain how you fan out to 5M connections.",
            thinkAbout: [
              "Why does one-way flow at 5M connections rule out the stateful duplex option?",
              "How does publish-once-broadcast-many keep origin load at O(events) instead of O(viewers)?",
              "What absorbs the reconnect stampede after a goal?",
            ],
            modelAnswerOutline: [
              "Assumptions: 5M concurrent browsers, strictly one-directional score pushes, seconds of staleness tolerable, massive join/leave waves at kickoff and goals.",
              "**Mechanism: SSE, not WebSocket.** The flow is purely server-to-client, so SSE gives streaming updates with auto-reconnect and `Last-Event-ID` resume over plain HTTP, avoiding the stateful-duplex, sticky-session, and heartbeat costs of WebSocket at 5M connections. Because a few seconds of staleness is fine, you need cheap resilient fan-out, not per-viewer low latency.",
              "**Fan-out architecture:** viewers do not connect to origin. They connect through a large fleet of edge/proxy nodes (or a CDN that supports streaming), each holding a share of the connections; at ~50k per node that is ~100 nodes. A score-update event is published once to a pub/sub backbone (Redis Cluster, NATS, or Kafka), and every edge node subscribes and broadcasts the same event down its held SSE connections. One publish fans out to millions of reads, so origin does O(events), not O(viewers).",
              "**Join/leave waves:** SSE connections are cheap (a file descriptor plus a little memory on an event-loop server), so a goal-triggered reconnect stampede is absorbed by the horizontally scaled edge fleet, with jittered client reconnect to avoid a thundering herd. `Last-Event-ID` lets a reconnecting viewer resume without a gap.",
              "**Meltdown protection:** rate-limit and shed at the edge (429/503 with Retry-After) so a reconnect storm cannot take down origin, and cache the latest score so a cold viewer gets current state immediately on connect.",
              "Common wrong turn: WebSocket for a one-way scoreboard, paying the stateful-connection and sticky-session tax on 5M connections for a duplex channel nobody uses, or fanning out per-viewer from origin instead of publish-once-broadcast-many across an edge fleet.",
            ],
          },
        },
        {
          id: "sd-l1-http-semantics",
          title: "HTTP Semantics: Methods, Status Codes & Caching Headers",
          summary:
            "Use safe/idempotent method semantics to drive retries and caching, conditional GETs with ETag for cheap 304s, and ETag + If-Match for optimistic concurrency.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["http", "api-design", "caching", "concurrency"],
          teach: {
            markdown: httpSemanticsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-http-semantics-apply",
            prompt:
              "Design the HTTP semantics for a document API: choose methods and status codes for read, create, update, and delete, and explain how you would use ETag, If-None-Match, and If-Match to cache reads and prevent lost updates.",
            thinkAbout: [
              "Which methods are safe, which are idempotent, and why does that distinction drive retry behavior?",
              "How do Cache-Control, ETag, and Last-Modified turn a GET into a cheap conditional request?",
              "How does ETag plus If-Match give you optimistic concurrency, and what status code signals a conflict?",
            ],
            modelAnswerOutline: [
              "Assumptions: a JSON document API behind a CDN and shared caches, with clients that retry on failure and multiple editors per document.",
              "**Read:** `GET /v1/docs/{id}` -> 200 with the document and an ETag; HEAD for metadata only. Both safe and idempotent, so caches and clients can auto-retry them. **Create:** `POST /v1/docs` -> 201 Created with a `Location: /v1/docs/{id}` header and the body; POST is not idempotent, so no auto-retry (add an idempotency key if duplicates are costly). **Update:** `PUT /v1/docs/{id}` -> 200/204; idempotent, safe to retry. **Delete:** `DELETE /v1/docs/{id}` -> 204; idempotent (deleting twice still ends deleted), retry-safe.",
              "**Errors:** 404 missing, 409/412 conflict, 422 validation, 429 rate limit, 5xx server.",
              "**Read caching:** on GET return `Cache-Control: max-age=60` (or `s-maxage` for the CDN, `no-store` for private docs) plus an ETag. The client later sends `If-None-Match: <etag>`; if unchanged the server returns 304 Not Modified with no body, saving bandwidth and origin work while keeping the client current.",
              "**Optimistic concurrency (prevent lost updates):** each GET returns the current ETag. An update must send `If-Match: <etag>`. If the document's current version still matches, the write applies and the ETag advances; if another editor already changed it, the server returns 412 Precondition Failed, forcing the client to re-read and merge instead of overwriting. Two editors on the same doc cannot silently clobber each other.",
              "**Negotiation:** honor `Accept`/`Accept-Language` and set `Vary: Accept, Accept-Encoding` so shared caches never serve the wrong representation or encoding.",
              "Common wrong turn: returning 200 for everything and doing last-write-wins updates, which silently loses concurrent edits and defeats caching, plus auto-retrying non-idempotent POST.",
            ],
          },
          practice: {
            id: "sd-l1-http-semantics-practice",
            prompt:
              "Design the HTTP concurrency and caching model for Google Docs-style collaborative editing where dozens of users edit the same document simultaneously, edits must not be lost, and reads should be cheap. Explain where simple ETag + If-Match optimistic concurrency is sufficient and where it breaks down, and what you would use instead.",
            thinkAbout: [
              "What contention level does optimistic concurrency assume, and does the document body meet it?",
              "Which writes on this product are actually low-contention and ETag-friendly?",
              "What protocol family merges concurrent edits instead of rejecting them?",
            ],
            modelAnswerOutline: [
              "Assumptions: many concurrent editors per document, sub-second edit frequency, no acceptable data loss, and a desire to keep read traffic cheap.",
              "**Where ETag + If-Match works:** coarse-grained, low-frequency writes (document metadata: title, sharing settings, folder). Each GET returns an ETag; a metadata PUT sends If-Match, and a stale write gets 412 Precondition Failed and re-reads. Contention is rare, so 412 retries are cheap, and lost updates are prevented without locking.",
              "**Where it breaks down:** the document *body* under dozens of sub-second edits. If-Match would 412 almost every keystroke, because the version advances constantly. Optimistic concurrency assumes low write contention; collaborative body editing is the opposite. Reject it here.",
              "**What to use instead:** a real-time collaboration protocol, either Operational Transformation (OT, what Google Docs historically used) or CRDTs. Edits are fine-grained operations (insert char at position, delete range) that are transformed or merged so concurrent operations converge to the same document without a whole-document version check. These flow over a WebSocket, with the server ordering and rebroadcasting operations to all editors. Operations are merged, not clobbered; nothing is lost.",
              "**Caching reads:** the shareable published/read-only view is cached aggressively at the CDN with `s-maxage` plus an ETag and fingerprinted URLs, so viewers (not editors) hit cache. Live editors do not use HTTP read caching; they read the live OT/CRDT stream.",
              "**The hybrid model:** ETag + If-Match optimistic concurrency for coarse metadata, OT/CRDT over WebSocket for the hot collaborative body, and CDN + ETag caching for read-only viewers.",
              "Common wrong turn: forcing whole-document If-Match optimistic concurrency onto high-frequency collaborative editing, which produces constant 412s and a broken editor, or using last-write-wins and losing edits.",
            ],
          },
        },
      ],
    },
  ],
}
