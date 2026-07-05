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
      ],
    },
  ],
}
