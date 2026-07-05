> Module **sd-l1-m1** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l0-m4](./sd-l0-m4.md) · Next: [sd-l1-m2](./sd-l1-m2.md)

# L1 · Networking & the Request Lifecycle

After this module you can trace a request from a browser address bar all the way to a database row and back, naming every hop (DNS, TCP, TLS, CDN, load balancer, proxy, app, cache, database), knowing the latency each adds and where each can fail. You will be able to make the L4-versus-L7, DNS-steering, connection-reuse, TLS-termination, and HTTP-version decisions that every later module (load balancing, caching, service mesh) assumes you already understand.

### sd-l1-network-stack: The Network Stack (OSI / TCP-IP)

- **id:** `sd-l1-network-stack`  ·  **difficulty:** easy  ·  **est:** 20 min  ·  **skills:** networking, osi

#### Learn

The 7-layer OSI model is a reference diagram, not how real systems are built. In practice you reason about a 5-layer stack, and the only two layers you will argue about in interviews are L4 and L7.

Bottom to top, the practical stack:

```
  L7  HTTP / gRPC / app semantics   (methods, headers, paths, request bodies)
  L6  TLS                            (encryption, identity, SNI)   <- sits between
  L4  TCP / UDP                      (ports, connections, reliability)
  L3  IP                             (addresses, routing, MTU)
  L2  Link                           (Ethernet, MAC, the wire)
```

Each layer has one job. IP (L3) moves packets between hosts by address and decides routing hop by hop; it knows nothing about ports or requests, and it is where MTU and fragmentation live (jumbo frames, the classic 1500-byte Ethernet MTU). TCP and UDP (L4) address a specific process on a host via a port number and, for TCP, add reliability. TLS secures the byte stream. HTTP (L7) carries the application meaning: this is a `POST /orders`, this is `Authorization: Bearer ...`, this is a 404.

The decision that actually matters is L4 versus L7, because it defines what a load balancer or proxy can see and do. An L4 load balancer (AWS NLB, IPVS, a hardware LB) forwards packets or TCP connections. It sees the 4-tuple and that is roughly all: it cannot read a URL path, a Host header, or a cookie, so it cannot route `/api` to one pool and `/images` to another. It is cheap, extremely fast, and protocol-agnostic (it will happily proxy a database connection). An L7 load balancer or reverse proxy (Envoy, NGINX, AWS ALB, HAProxy in HTTP mode) terminates the connection, parses the request, and can route on path, header, or method, do TLS termination, retries, and rate limiting. That power costs CPU and adds latency.

A connection is identified by its 4-tuple: `(source IP:source port, destination IP:destination port)`. This is why one client can hold many simultaneous connections to the same server (each uses a different ephemeral source port) and why a NAT gateway can multiplex thousands of internal hosts behind one public IP by rewriting ports. It is also why L4 load balancing has to keep a connection pinned to the same backend: the 4-tuple is the only identity it has.

Interview nuance: interviewers probe whether you conflate an L4 LB with L7 routing. If you say "the load balancer routes `/checkout` to the payments service," you have quietly assumed an L7 proxy. Say so, and note the cost: TLS termination and request parsing on every request.

Interview nuance: TLS does not have a clean OSI number (people say L5, L6, or "between 4 and 7"). Do not die on that hill. Say "TLS sits on top of TCP and below HTTP" and move on.

Recap: Reason in a practical 5-layer stack, remember IP routes packets and TCP/UDP address processes by port, and know that L4 sees only the 4-tuple while L7 can read and route on request content.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain the layers a browser request traverses from app code down to the wire, and label which component (LB, proxy, TLS terminator, app) operates at which layer.

**Think about:**
- What is the practical 5-layer view versus the OSI reference?
- Why is the L4-vs-L7 distinction the one that actually matters for LBs and proxies?
- What does the 4-tuple identify about a connection?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume a browser calling `https://api.example.com/orders`. I will use the practical 5-layer stack rather than strict OSI, because OSI is a teaching reference and real components map cleanly onto link / IP / transport / TLS / HTTP.

Top down from app code: the app emits an HTTP request at L7 (method, path, headers, body). That is serialized into a TLS record (encryption and identity), handed to TCP at L4 which segments it and adds sequence numbers and the destination port (443), wrapped in an IP packet at L3 with source and destination addresses, and framed at L2 (Ethernet) onto the wire. Each layer only understands its own header; a router at L3 never reads the HTTP path.

Now the components and their layers. An L4 load balancer (NLB, IPVS) operates on TCP: it sees the 4-tuple `(client IP:port, VIP:443)` and forwards the connection to a backend, pinned by that tuple, without reading anything above TCP. A TLS terminator (often the same edge box, an ALB, or Envoy) operates at the TLS layer: it decrypts, which is what unlocks L7. A reverse proxy or L7 load balancer (Envoy, NGINX, ALB) operates at L7: now that TLS is terminated it can read `Host` and path and route `/orders` to the orders pool, apply per-route retries and rate limits. The app server also lives at L7, consuming the parsed request.

The key tradeoff to state: L4 is fast, cheap, and protocol-agnostic but blind to content, so it cannot do path or header routing. L7 can route on anything but must terminate TLS and parse every request, costing CPU and latency. A common real topology is L4 at the very edge (for raw throughput and DDoS absorption) fronting an L7 proxy fleet.

The 4-tuple matters because it is the connection's identity: it lets one client hold many connections to one server, lets NAT multiplex hosts, and forces L4 LBs to pin flows.

Common wrong turn: claiming a network (L4) load balancer routes by URL or cookie. It cannot see them; that requires an L7 proxy that has terminated TLS.

**Self-check rubric:**
- [ ] Did I list the practical 5 layers (link, IP, TCP/UDP, TLS, HTTP) and note OSI is a reference?
- [ ] Did I map each component (L4 LB, TLS terminator, L7 proxy, app) to the correct layer?
- [ ] Did I state the L4-vs-L7 tradeoff (blind and fast vs content-aware and costly)?
- [ ] Did I explain what the 4-tuple identifies and why it matters?
- [ ] Did I avoid claiming an L4 LB can route on path/header/cookie?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the edge layering for Cloudflare-style traffic where the front tier must absorb a 500 Gbps volumetric DDoS attack yet still route `/api/*` and `/static/*` to different origin pools. Explain which tier operates at L4 versus L7, and why you cannot do the whole job at a single layer.

**Model answer (revealed on demand):**

I split the edge into two tiers because the two requirements pull in opposite directions: DDoS absorption wants the cheapest, most stateless, protocol-agnostic filtering, and path routing requires reading L7, which is expensive per request.

Tier 1 is L3/L4. Anycast advertises the same IPs from every POP so a volumetric flood is geographically spread across dozens of sites instead of concentrating on one. At each POP, L4 scrubbing (XDP/eBPF or hardware) drops spoofed SYN floods and malformed packets by inspecting only IP and TCP headers, and does SYN-cookie defense so no per-connection state is held for half-open floods. This tier must stay at L4: at 500 Gbps you cannot afford to terminate TLS and parse HTTP on attack traffic, and most volumetric attacks are not even valid HTTP.

Tier 2 is L7, reached only by traffic that survived tier 1 and completed a TCP+TLS handshake (which already filters most spoofed sources, since a spoofer cannot complete the handshake). Here Envoy or NGINX terminates TLS, reads the `Host` and path, and routes `/api/*` to the origin API pool and `/static/*` to the cache/object-store pool. This is also where L7 rate limiting, WAF rules, and bot scoring run, because they need request content.

Why not one layer: an L4 tier is blind to `/api` vs `/static`, so it physically cannot route by path. An L7-only edge would have to terminate TLS on the entire flood, and TLS handshakes are the expensive part, so a volumetric attack would exhaust CPU long before you filtered it. Layering lets cheap stateless work shed the bulk and expensive stateful work see only legitimate-looking, handshake-completing traffic.

Common wrong turn: trying to do WAF/path routing at L4 (impossible, it cannot see the path) or terminating TLS on raw attack traffic (burns the CPU you are trying to protect).

### sd-l1-dns: DNS Resolution & Traffic Steering

- **id:** `sd-l1-dns`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** dns, routing, failover

#### Learn

DNS is not just a phone book. It is the first routing and failover lever a request touches, and its main limitation, caching you do not control, is the single most misunderstood thing about it.

The resolver chain: your app calls the OS stub resolver, which asks a recursive resolver (your ISP's, or 8.8.8.8, or 1.1.1.1). If that recursive resolver has no cached answer it walks the hierarchy: a root server returns the nameservers for `.com` (the TLD), the TLD returns the authoritative nameservers for `example.com`, and the authoritative server (Route 53, NS1, Cloudflare) returns the actual A record. Caching happens at every hop: the browser caches, the OS caches, the recursive resolver caches, each keyed by TTL. That is the whole point and the whole problem.

Record types you must know: **A** (name to IPv4), **AAAA** (name to IPv6), **CNAME** (alias one name to another, cannot exist at the zone apex or alongside other records), **NS** (delegation), and provider **ALIAS/ANAME** records, which behave like a CNAME but are legal at the apex (`example.com` itself) because the provider resolves them server-side and returns an A record. Interview nuance: "why can't I CNAME my apex to my load balancer?" is a real, common gotcha. Answer: apex needs SOA/NS records that a CNAME would forbid coexisting with; use ALIAS/ANAME.

TTL is the core tradeoff. A short TTL (say 60s) means clients re-query often, so a failover or IP change propagates fast, at the cost of far more DNS queries and dependence on your DNS provider's availability. A long TTL (say 3600s) is cheap and resilient but means an IP change takes up to an hour to be seen. The trap: even a 60s TTL does not give instant failover, because misbehaving recursive resolvers and corporate caches ignore or clamp TTLs, and clients that already resolved keep using the stale IP until their cache expires. So DNS failover is best-effort and eventually-consistent, on the order of minutes, not milliseconds.

Steering traffic with DNS: authoritative providers return different answers based on the querier. **GeoDNS** returns the IP of the nearest region by the resolver's location. **Latency-based routing** (Route 53) returns the region with the lowest measured RTT to the user. **Weighted routing** splits traffic by percentage, which is how you do blue-green and canary at the DNS layer. Crucially, pair these with **health checks**: the authoritative server stops handing out a region's IP when its health check fails. Without health checks, plain round-robin DNS will keep sending one in N users to a dead box.

The hard limit: DNS load balancing has no per-request awareness. It cannot see server load, cannot do sticky sessions, cannot retry. It steers at the granularity of "which IP do I hand back," resolved once and cached. So DNS gets a user to the right region or the right LB, and a real L4/L7 load balancer takes over from there.

Recap: DNS resolves through a cached recursive-to-authoritative chain, TTL trades failover speed for query load but never gives instant failover because of resolver caching, and GeoDNS/latency/weighted routing plus health checks steer users to the nearest healthy region before a real LB takes over.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the DNS setup for a globally deployed API: specify record types, TTLs, and how you steer users to the nearest healthy region.

**Think about:**
- What is the resolver chain and where does caching happen at each hop?
- What does TTL trade off, and why is failover not instant?
- How does GeoDNS or latency-based routing steer traffic?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume `api.example.com` served from three regions (us-east, eu-west, ap-south), each fronted by a regional load balancer with a stable IP or hostname. Goal: send each user to the nearest healthy region with fast-enough failover.

Records: at the apex `example.com` I use an ALIAS/ANAME (not a CNAME, which is illegal at the apex) pointing at the CDN or LB. For `api.example.com` I use latency-based routing on Route 53 (or GeoDNS if I care about data residency more than raw latency), with one record set per region. Each region's record is an ALIAS to that region's ALB, and each is attached to a **health check** that probes a real `/healthz` endpoint. I publish both A and AAAA so IPv6 clients get a native answer.

TTL: I set the API records to 60s. That is short enough that a failover propagates in roughly a minute for well-behaved resolvers, and I accept the higher query volume because my authoritative provider is built for it. I would not go to 5s (marginal benefit, resolver noise, some resolvers clamp it) nor to 3600s (an hour to fail away from a dead region is unacceptable for an API).

Steering and failover: latency-based routing returns the region with the lowest RTT to the user's recursive resolver. When a region's health check fails, the authoritative server stops returning its IP, so new resolutions flow to the next-nearest healthy region. Existing clients keep using the dead IP until their cache expires (up to the TTL plus resolver misbehavior), which is why I also want the regional LB and client retries to fail fast so a stuck user recovers on the next request.

Key tradeoff to state out loud: DNS failover is eventually-consistent and best-effort, minutes not milliseconds, because I do not control downstream caches. For true instant failover within a region I rely on the L4/L7 LB and health checks, not DNS. DNS gets the user to the right region; the LB handles per-request routing and instant backend failover.

Common wrong turn: assuming a 60s TTL means 60s guaranteed failover. Resolvers cache and clamp; treat DNS failover as a coarse, minutes-scale lever and put the fast failover in the LB.

**Self-check rubric:**
- [ ] Did I use ALIAS/ANAME at the apex and explain why not CNAME?
- [ ] Did I attach health checks to each regional record?
- [ ] Did I pick a concrete TTL and justify the failover-vs-query-load tradeoff?
- [ ] Did I name a real steering policy (latency-based / GeoDNS / weighted)?
- [ ] Did I state that DNS failover is minutes-scale and that the LB does instant failover?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the DNS and traffic-steering cutover for a Netflix-scale blue-green deploy where you must shift 5% of global traffic to a new stack, watch error rates, and roll back within 2 minutes if p99 errors spike. Specify records, TTLs, and exactly what "roll back in 2 minutes" depends on.

**Model answer (revealed on demand):**

I use weighted DNS routing as the coarse traffic split and lean on load-balancer-level shifting for the fast, precise control, because DNS alone cannot hit a 2-minute rollback reliably.

Setup: two record sets for `api.example.com`, blue (current, weight 95) and green (new, weight 5), each an ALIAS to its own regional LB fleet with health checks. TTL is deliberately low, 30 to 60s, so a weight change propagates quickly. I roll out the 5% by setting green's weight, then watch green's p99 error rate and latency on its own dashboards (isolated because green is a distinct fleet).

The catch, and the thing to say explicitly: "roll back in 2 minutes" cannot depend purely on DNS, because even at a 30s TTL some resolvers cache longer and clients that already resolved green keep hitting it. So my real fast lever is at the LB and app tier. Options: (1) put the blue-green split behind a single L7 proxy (Envoy) that shifts weights instantly via config push, so DNS just points everyone at the proxy and the 2-minute rollback is a proxy config change that takes effect in seconds; or (2) use a feature flag / router at the app edge. DNS weighting becomes the coarse regional dial, and the proxy weighting is the instant one.

Rollback sequence: alert fires on green p99 error spike, automation flips the proxy weight for green to 0 (seconds), and separately sets green's DNS weight to 0 (minutes, to drain cached clients). Green fleet stays warm until traffic drains so I can retry the canary.

Tradeoff: pure DNS canary is simple but its rollback is bounded below by TTL plus resolver misbehavior, so it is minutes-scale and unreliable for a 2-minute SLO. Fronting with an L7 proxy gives second-scale, deterministic shifting at the cost of an extra hop.

Common wrong turn: promising a 2-minute rollback from DNS weight changes alone; resolver caching makes that unsafe. Put the fast shift in the proxy, use DNS for the coarse split.

### sd-l1-tcp-udp: TCP & UDP Fundamentals

- **id:** `sd-l1-tcp-udp`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** tcp, udp, latency

#### Learn

The single most important latency fact in networking: setting up a TCP connection costs a round trip before any application data flows, and if you also do TLS you pay more. On a fast intra-datacenter link (RTT under 1ms) nobody notices. On a mobile user in Jakarta hitting a US server (RTT 200ms+), every avoidable round trip is a visible stall.

The 3-way handshake: client sends SYN, server replies SYN-ACK, client sends ACK. Only after that ACK can the client send the request. That is 1 RTT of pure setup. Layer TLS 1.3 on top and you add roughly 1 more RTT (TLS 1.2 added 2). So a brand-new HTTPS connection is about 2 RTTs before the first request byte, then more RTTs for the response. Over a 200ms link that is 400ms+ of overhead spent on nothing but ceremony.

TCP earns that cost by giving reliability: every byte has a sequence number, the receiver ACKs what it got, and unacknowledged data is retransmitted, so the application sees an ordered, gap-free stream. It also runs **congestion control**: a new connection starts in slow start with a small congestion window and ramps up as ACKs return, probing for available bandwidth. This is why throughput on a fresh connection is low at first and climbs, and why short-lived connections never reach full speed: they die in slow start before the window opens up. Reusing a warmed connection means you keep the opened window.

This is the crux of "chatty API is slow." If each of 30 API calls opens a new connection, you pay the handshake and restart slow start 30 times. The fixes, none of which touch business logic:
- **Keep-alive and connection pooling**: reuse one warm connection for many requests, amortizing the handshake and keeping the congestion window open. HTTP keep-alive and client pools (a database connection pool is the same idea) do this.
- **HTTP/2 multiplexing**: many concurrent requests share one connection, so you pay one handshake and one slow start for all of them.
- **Move the endpoint closer**: an edge POP or CDN near the user shrinks the RTT itself, so every round trip is cheaper. A TLS terminator at a nearby POP means the expensive handshakes happen over a short hop, and the long-haul leg is a reused warm connection.

UDP is the other L4 protocol: connectionless, no handshake, no ordering, no retransmission, no congestion control by default. You send a datagram and hope. That sounds worse, but it is exactly right when late data is useless: real-time voice and video (a retransmitted audio packet arrives after the moment it was needed, so drop it and move on), gaming, DNS (one small request/reply, a handshake would double the cost), and high-volume telemetry where losing a few samples is fine. QUIC (HTTP/3) is built on UDP precisely to escape TCP's handshake and head-of-line-blocking constraints while rebuilding reliability itself.

Interview nuance: at scale, watch **TIME_WAIT** and ephemeral-port exhaustion. A client that opens and closes connections rapidly leaves each in TIME_WAIT (about 60s) holding an ephemeral port; a single source IP has ~28k usable ports, so a busy proxy talking to one backend IP can run out and start failing to connect. Connection reuse fixes this too. This is another reason pooling is not optional at scale.

Recap: the TCP handshake costs a round trip (plus TLS) before data and starts slow in congestion control, so reuse connections (keep-alive, pooling, HTTP/2) and move endpoints closer to cut RTTs; reach for UDP when late data is worthless and watch TIME_WAIT/port exhaustion under churn.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why a chatty API over new connections is slow on a high-latency link, and list three ways to fix it without changing business logic.

**Think about:**
- What does the 3-way handshake cost before any data flows?
- How does connection reuse amortize that cost?
- When is UDP the right choice despite losing reliability?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume a mobile client on a 200ms RTT link calling an API that makes 30 small sequential requests, each opening a fresh HTTPS connection.

Why it is slow: each new connection pays a TCP 3-way handshake (1 RTT = 200ms) plus a TLS 1.3 handshake (about 1 more RTT = 200ms) before the first request byte, then at least 1 RTT for the response. That is roughly 600ms per call of overhead that is not doing any work, times 30 calls if they are serialized, so seconds of pure ceremony. On top of that, every fresh connection restarts TCP slow start with a tiny congestion window, so even the data transfer is throttled and never reaches full throughput before the short connection closes. The business logic is fine; the connection lifecycle is the problem.

Three fixes, none touching business logic:

1. **Keep-alive plus connection pooling.** Reuse one warm connection for all 30 requests. You pay the handshake once, and you keep the congestion window that slow start opened, so later requests are both handshake-free and full-speed. Almost every HTTP client and every database driver does this via a pool; the fix is often just enabling/sizing it.

2. **HTTP/2 multiplexing.** One TCP+TLS connection carries all 30 requests concurrently as independent streams. One handshake, one slow start, and the requests do not even have to serialize, so wall-clock time collapses toward a single round trip's worth of latency.

3. **Move the endpoint closer with an edge POP / CDN.** Terminate TLS at a POP near the user so the expensive handshakes traverse a 20ms hop instead of 200ms, and let the POP hold a warm, pooled long-haul connection to origin. Every remaining round trip is simply cheaper.

Key tradeoff: pooling and H2 add a little client/proxy complexity and connection-management state, but the latency win on high-RTT links is enormous. If the data were loss-tolerant and latency-critical (voice/video/telemetry) I would instead consider UDP, accepting no retransmission because late data is useless there, but that is not the case for a transactional API.

Common wrong turn: opening a new connection per request. That multiplies the handshake and slow-start cost by the request count and can even exhaust ephemeral ports (TIME_WAIT) on a busy client.

**Self-check rubric:**
- [ ] Did I quantify handshake cost (TCP ~1 RTT, TLS ~1 RTT) on a concrete RTT?
- [ ] Did I mention slow start / congestion window as a second cost of new connections?
- [ ] Did I give three concrete no-logic fixes (pooling/keep-alive, H2, edge proximity)?
- [ ] Did I explain that reuse keeps both the connection and the warm window?
- [ ] Did I correctly scope when UDP applies (late data useless) instead of forcing it?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the transport strategy for Zoom-scale live video where 1 million concurrent participants need sub-150ms glass-to-glass latency, plus a separate reliable control channel for join/leave and chat. Choose TCP vs UDP for each path and justify, and explain how you handle packet loss on the media path.

**Model answer (revealed on demand):**

I split media and control onto different transports because they have opposite requirements.

Media path: UDP (typically SRTP over UDP, or a QUIC/WebRTC data path). Glass-to-glass under 150ms is impossible if I retransmit: a lost audio or video packet, if retransmitted, arrives 1+ RTT late, after the moment it was meant to be played, so it is useless. TCP would also stall the entire stream on any single loss (head-of-line blocking) while it retransmits, causing the freeze-then-catch-up artifact everyone hates. With UDP I simply tolerate loss. I handle it with codec-level techniques instead of retransmission: forward error correction (send redundant parity so the receiver reconstructs a lost packet without asking), packet loss concealment (interpolate a missing audio frame), and adaptive bitrate that lowers resolution when the network degrades. I also do congestion control at the app layer (Google's GCC / WebRTC bandwidth estimation) since UDP gives me none for free.

Control path: TCP (or a reliable QUIC stream). Join, leave, mute state, chat, and roster updates must be delivered in order and not lost; a dropped "user left" event corrupts UI state. Latency here is human-scale (tens to hundreds of ms is fine), so TCP's reliability and ordering are worth the handshake and retransmit cost. I keep this connection warm and pooled per client.

Scale: 1M concurrent participants means I do not mesh peers; I route media through Selective Forwarding Units (SFUs) in regional POPs near users, so each client has one short-RTT UDP path to its nearest SFU and the SFU fans out. This keeps per-hop RTT low, which is the only way to stay under the 150ms budget once you subtract encode/decode and jitter-buffer time.

Tradeoff: UDP forces me to rebuild loss handling (FEC, concealment, app-layer congestion control), which is real complexity, but it is the only way to hit the latency target. TCP for control is the easy, correct default because its data cannot tolerate loss and can tolerate latency.

Common wrong turn: running media over TCP for "reliability." Its head-of-line blocking and retransmits guarantee you miss the latency budget; reliability is the wrong goal for live media.

### sd-l1-tls-https: TLS / HTTPS & the Secure Handshake

- **id:** `sd-l1-tls-https`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** tls, security, mtls

#### Learn

Most engineers carry stale TLS mental models from the 1.2 era. Update them: **TLS 1.3 is a 1-RTT handshake**, and 0-RTT on resumption. That single fact changes the latency math for every HTTPS design.

What the handshake does in one round trip: the client sends a `ClientHello` with its key share and supported ciphers; the server responds with its key share, certificate, and `Finished`; the client verifies and can send application data on its next flight. One RTT and you have a shared symmetric key. The certificate lets the client verify server identity: the cert is signed by a Certificate Authority (CA) the client trusts, forming a chain up to a root CA in the client's trust store. **SNI** (Server Name Indication) is the client telling the server, in the clear, which hostname it wants, so one IP hosting many tenants (a CDN, a shared LB) can present the right certificate. Interview nuance: certificate expiry is one of the most common real-world outage causes (an unrotated cert on a load balancer takes the whole site down at midnight). Always mention automated rotation (ACME/Let's Encrypt, AWS ACM) as part of a TLS design.

Cutting handshake cost:
- **Session resumption**: after a first full handshake, the server issues a session ticket; a returning client presents it and skips the certificate exchange, dropping to a cheaper handshake.
- **0-RTT (early data)**: on resumption, TLS 1.3 lets the client send application data in its very first flight, before the handshake completes, saving a full round trip. The caveat that interviewers will push on: **0-RTT early data is replayable**. An attacker who captures it can resend it, so you must only allow 0-RTT for idempotent requests (GET, or writes guarded by an idempotency key). Never let a non-idempotent `POST /charge` ride on 0-RTT.
- **Connection reuse**: the cheapest handshake is the one you do not do. Keep connections warm (see the TCP lesson) so you handshake once and reuse.

Where do you terminate TLS? Three common choices, and the tradeoff is latency/operational-simplicity versus how far encryption reaches:
- **Terminate at the edge/LB**: the ALB, CDN POP, or Envoy front proxy decrypts, and traffic behind it is plaintext (or re-encrypted). This offloads crypto from app servers, centralizes cert management, and lets the L7 proxy read requests for routing. The cost: the internal network sees plaintext, which is only acceptable if that network is trusted.
- **End-to-end / passthrough**: TLS is not terminated until the app, so even the LB cannot read the request (it must be an L4 LB). Maximum confidentiality, but you lose L7 routing and pay crypto on every app server.
- **Re-encrypt inside the mesh**: terminate at the edge for routing, then open a fresh TLS connection to the backend. This is the common enterprise answer: edge features plus encrypted internal hops.

**mTLS** (mutual TLS) extends this: not only does the client verify the server, the server verifies the client's certificate too. This gives cryptographic **service-to-service identity**, the backbone of zero-trust architectures and service meshes (Istio, Linkerd) where "is this caller really the orders service" cannot rely on network location. Each service gets a short-lived cert from an internal CA, and the mesh rotates them automatically.

Recap: TLS 1.3 is a 1-RTT handshake (0-RTT on resumption, but only for idempotent requests due to replay), you cut cost with session resumption and connection reuse, you choose termination by trading internal visibility for edge features, and mTLS gives services cryptographic identity for zero-trust.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design TLS termination for a multi-region service: decide where you terminate, how you cut handshake latency, and how services authenticate each other.

**Think about:**
- Where do you terminate TLS and what is the latency vs security tradeoff?
- How do session resumption and 0-RTT cut handshake cost, and what is the replay caveat?
- Why use mTLS between services?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume a multi-region service behind a CDN, with regional L7 proxies (Envoy/ALB) in front of app fleets, and internal service-to-service calls within each region.

Where I terminate: at the regional edge proxy (and optionally at the CDN POP for static content). Terminating at the edge offloads TLS crypto from app servers, centralizes certificate management, and, crucially, lets the L7 proxy read the request for path/header routing, which an L4 passthrough could not do. Behind the edge I re-encrypt to backends rather than sending plaintext, because "internal network is trusted" is a weak assumption in a multi-tenant cloud VPC. So: terminate at edge for features and offload, re-encrypt inward for confidentiality. The tradeoff I am making explicit: full end-to-end passthrough would hide requests even from my own LB but would cost me L7 routing and put crypto on every app server; edge-terminate-plus-reencrypt is the pragmatic middle.

Cutting handshake latency: (1) TLS 1.3 everywhere, so a fresh handshake is 1 RTT, not 1.2's two. (2) Session resumption with tickets so returning clients skip the certificate exchange. (3) Terminate at a nearby POP so the expensive full handshakes happen over a short RTT, and keep warm, pooled connections from POP to origin so the long-haul leg rarely re-handshakes. (4) I would enable 0-RTT only for idempotent GETs, never for mutations, because 0-RTT early data is replayable; a captured `POST /charge` on 0-RTT could be resent. I also automate cert rotation (ACM/ACME) because an expired cert on the edge is a classic total outage.

Service-to-service auth: mTLS via a service mesh (Istio/Linkerd) or SPIFFE identities. Each service presents a short-lived cert from an internal CA, and both sides verify, so "is this really the orders service" is answered cryptographically, not by IP allowlist. This is the zero-trust posture: network location grants nothing; identity is the cert.

Common wrong turn: treating the handshake as free (it is 1 RTT plus crypto, worth optimizing), forgetting cert rotation (the top outage cause), or enabling 0-RTT on non-idempotent endpoints.

**Self-check rubric:**
- [ ] Did I pick a termination point and justify it against the L7-routing vs internal-visibility tradeoff?
- [ ] Did I state TLS 1.3 = 1 RTT and name resumption + connection reuse as cost cutters?
- [ ] Did I gate 0-RTT to idempotent requests and explain the replay risk?
- [ ] Did I mention automated certificate rotation as an outage guard?
- [ ] Did I use mTLS for service identity and tie it to zero-trust?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the TLS and identity architecture for a bank's payment microservices where a compliance rule forbids plaintext on any wire, even inside the VPC, and every service call must be cryptographically attributable to a specific service identity for audit. Explain termination, key rotation, and how you keep the added crypto from blowing the latency budget.

**Model answer (revealed on demand):**

The "no plaintext anywhere" and "every call attributable" rules push me to end-to-end mTLS with a service mesh, not edge-terminate-and-trust-the-network.

Encryption on every wire: I do not terminate to plaintext behind the edge. The public edge terminates the client's TLS (or passes through), and every internal hop runs its own mTLS connection, so no packet is ever plaintext on any wire, satisfying compliance. A sidecar proxy (Envoy via Istio/Linkerd) sits next to each service and handles the TLS so app code stays simple; the plaintext only ever exists inside the loopback between app and its own sidecar, which never touches a wire.

Attributable identity: mTLS with SPIFFE/SPIRE-issued identities. Each service gets an X.509 SVID encoding its identity (e.g. `spiffe://bank/payments/settlement`). Both sides verify certs on every connection, so every call is provably from a named service, and the mesh emits audit logs keyed by that identity. Authorization policies ("only settlement may call ledger-write") are enforced on identity, not IP.

Key rotation: short-lived certs, on the order of hours, auto-rotated by SPIRE. Short lifetimes shrink the blast radius of a leaked key and remove the manual-rotation outage risk. The mesh handles rotation transparently, so there is no midnight cert-expiry outage.

Keeping latency in budget: mTLS adds handshakes and crypto, so (1) TLS 1.3 for 1-RTT handshakes, (2) aggressive connection reuse/pooling between sidecars so the handshake is amortized over thousands of requests (the steady state is symmetric-key encryption, which is cheap and often hardware-accelerated AES-NI), (3) session resumption for reconnects, and (4) keep call graphs shallow so I am not stacking handshake RTTs. I would not enable 0-RTT here: these are payment mutations, and 0-RTT's replay risk is unacceptable for a charge.

Tradeoff: full mesh mTLS is operationally heavy (CA, sidecars, rotation infra) and adds a small per-connection cost, but it is the only way to satisfy "encrypted everywhere, attributable everywhere." The latency hit is contained because reuse makes handshakes rare and symmetric crypto is cheap.

Common wrong turn: edge-terminating to plaintext internally "because the VPC is private," which violates the compliance rule, or using long-lived certs that become a rotation-outage and leak-blast-radius problem.

### sd-l1-http-versions: HTTP/1.1 vs 2 vs 3 (QUIC)

- **id:** `sd-l1-http-versions`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** http, quic, protocols

#### Learn

Each HTTP version exists to fix a specific bottleneck of the previous one, and the recurring villain is **head-of-line (HOL) blocking**: a stuck item stalls everything behind it. Knowing where HOL blocking bites in each version is the whole lesson.

**HTTP/1.1**: one request in flight per connection. You send a request, you wait for its full response, then you send the next. Keep-alive lets you reuse the connection but not overlap requests (pipelining exists on paper but is broken in practice). To get parallelism, browsers open about 6 connections per host, which means 6 handshakes and 6 slow-start ramps, and everything past 6 queues. HOL blocking here is at the request level: a slow response blocks its whole connection.

**HTTP/2**: multiplexing. Many requests become independent **streams** over a single TCP connection, interleaved as frames, so you send all your requests at once and responses come back concurrently over one warm connection. Add header compression (HPACK), since HTTP headers are hugely repetitive. This kills application-level HOL blocking and the 6-connection tax. But there is a catch that interviewers love: **TCP-level HOL blocking remains**. Because all streams ride one TCP connection, a single lost TCP packet stalls TCP's ordered delivery, and every multiplexed stream waits for that retransmission, even streams whose data already arrived. On a clean network you never notice; on a lossy one, H2 can be worse than H1's separate connections.

**HTTP/3 over QUIC**: QUIC is a new transport built on **UDP** that reimplements reliability, ordering, and congestion control per stream. Because each stream is independently reliable, a lost packet only stalls its own stream, not the others: **QUIC removes TCP-level HOL blocking**. It also folds the transport and TLS handshake together for a faster (often 1-RTT, 0-RTT on resumption) setup, and supports **connection migration**: the connection is identified by a connection ID, not the 4-tuple, so a phone switching from Wi-Fi to cellular (new IP) keeps the same connection instead of re-handshaking.

When does H3 actually win? On **lossy and mobile networks** and paths with **many short connections**, where per-stream independence and connection migration matter most. On a stable, low-loss, high-bandwidth link (two datacenters), H3's advantage over H2 is marginal, and UDP can even be throttled or blocked by some middleboxes, and its user-space congestion control can burn more CPU than kernel TCP. So H3 is a clear win at the mobile-facing edge, a weak case for stable internal links.

Where does gRPC fit? Interview nuance: **gRPC runs on HTTP/2 today**. So internal service-to-service RPC is naturally H2 (multiplexed streams, which gRPC needs for streaming). The common real topology: public edge on H2 and H3 (serve mobile users the H3 benefit, fall back to H2), internal RPC on H2/gRPC where the network is stable and H3 adds little.

Recap: HOL blocking is the theme, H1 blocks per request and needs ~6 connections, H2 multiplexes over one TCP connection but still suffers TCP-level HOL blocking on loss, H3/QUIC removes it with per-stream reliability over UDP plus connection migration, so use H3 at the lossy/mobile edge and keep stable internal RPC on H2/gRPC.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Choose the HTTP version(s) for a public API plus its internal microservices and justify each with its failure and latency profile.

**Think about:**
- Where does head-of-line blocking bite in H1, H2, and H3?
- When does HTTP/3 over QUIC actually win?
- What protocol does gRPC use today?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume a public API serving mostly mobile and browser clients over the open internet, and a fleet of internal microservices talking to each other inside a low-loss datacenter network.

Public edge: serve **HTTP/3 (QUIC) with HTTP/2 fallback**. My public clients are on mobile and lossy links, which is exactly where H3 wins. Per-stream reliability means one lost packet stalls only its own stream, not every multiplexed response, so I avoid the TCP-level HOL blocking that hurts H2 on lossy networks. QUIC's connection migration keeps a user's connection alive across a Wi-Fi-to-cellular switch instead of forcing a fresh handshake, and its combined transport+TLS handshake shaves a round trip. I keep H2 as a fallback because some networks and middleboxes block or throttle UDP, and older clients need it. Latency profile: faster handshake, no cross-stream stalls on loss. Failure profile: if UDP is blocked, fall back cleanly to H2 over TCP.

Internal microservices: **HTTP/2, via gRPC**. gRPC runs on H2 today, and internal service RPC benefits from H2's multiplexed streams and streaming support with contract-first Protobuf. The internal network is stable and low-loss, so H2's one weakness, TCP-level HOL blocking under packet loss, rarely triggers, meaning H3 would add operational complexity and user-space congestion-control CPU cost for little benefit. So I deliberately do not chase H3 internally.

Why not H1 anywhere new: its one-request-per-connection model forces ~6 connections per host (6 handshakes, 6 slow starts) and blocks per request; H2 multiplexing strictly dominates it on the same TCP transport.

The committed tradeoff: H3 at the edge buys mobile/lossy-network resilience and connection migration at the cost of UDP-middlebox risk (mitigated by H2 fallback); H2/gRPC internally buys mature multiplexed RPC on a network where H3's loss-resilience advantage does not pay for itself.

Common wrong turn: rolling H3 everywhere including stable internal links, where it adds CPU and operational cost for a benefit (loss resilience, migration) that a low-loss datacenter never needs.

**Self-check rubric:**
- [ ] Did I locate HOL blocking correctly in each version (H1 per-request, H2 TCP-level, H3 removed)?
- [ ] Did I put H3 at the lossy/mobile edge and justify it with migration + per-stream reliability?
- [ ] Did I keep H2 as a fallback and say why (UDP blocking/throttling)?
- [ ] Did I put internal RPC on H2/gRPC and say gRPC uses H2 today?
- [ ] Did I explicitly decline H3 on stable internal links and give the reason?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Choose and justify the HTTP protocol strategy for a mobile game backend where players on flaky 4G in moving vehicles need low-latency state sync, plus a companion web dashboard and internal matchmaking services. Explain the failure mode you are optimizing against on the mobile path and where you would not use HTTP/3.

**Model answer (revealed on demand):**

The dominant constraint is players on flaky, mobile 4G in moving vehicles, which is the textbook case for HTTP/3, so the mobile path drives the decision.

Mobile game clients: **HTTP/3 over QUIC**. Two failure modes I am optimizing against. First, packet loss: on 4G, loss is frequent, and under H2 a single lost TCP packet head-of-line-blocks every multiplexed stream until retransmission, so one dropped packet stalls unrelated state updates. QUIC's per-stream reliability confines the stall to the affected stream, keeping other state flowing. Second, network changes: a moving vehicle hands off between cell towers and Wi-Fi, changing IP; under TCP that breaks the 4-tuple and forces a full reconnect and re-handshake mid-game. QUIC's connection migration keeps the same connection ID across the IP change, so the session survives. The faster QUIC handshake also helps on reconnects. I keep H2 fallback for networks that block UDP. For the truly latency-critical, loss-tolerant real-time state (position updates) I would additionally consider a raw UDP or WebRTC data channel, since even QUIC's reliability is unwanted for data that is stale on arrival, but for reliable game events QUIC is the sweet spot.

Companion web dashboard: **H2 with H3 where available**. It is not latency-critical or mobile-hostile, so H2 multiplexing over one connection is plenty; H3 is a nice-to-have, not a requirement.

Internal matchmaking and game services: **H2/gRPC**. Contract-first Protobuf RPC on a stable, low-loss datacenter network. This is exactly where I would **not** use H3: the loss-resilience and migration benefits do not apply on a clean internal link, and H3's user-space congestion control would just add CPU and operational complexity.

Tradeoff: H3 on mobile buys survival of loss and network handoffs at the cost of UDP-middlebox risk (mitigated by fallback); H2/gRPC internally is the boring correct choice where H3 earns nothing.

Common wrong turn: forcing H3 on internal services for consistency, paying its cost with none of its mobile-network benefit, or running reliable game events over plain UDP and then reinventing retransmission badly.

### sd-l1-request-lifecycle: End-to-End Request Lifecycle

- **id:** `sd-l1-request-lifecycle`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** request-lifecycle, caching

#### Learn

This is the integrative lesson: "what happens when you type a URL and hit enter" for a signed-in user loading a dynamic page. Everything from the previous five lessons appears as one hop in this chain. The skill is naming every hop, the RTT it adds, the cache that can short-circuit it, and how it can fail.

The path, top to bottom:

```
Browser cache/SW  ->  DNS  ->  TCP  ->  TLS  ->  [CDN/anycast POP -> WAF -> LB -> reverse proxy/API gateway]
   ->  app server  ->  auth  ->  app cache (Redis)  ->  database / downstream services
   ->  response: serialize -> compress -> cache headers -> CDN fill -> client render
```

Walk it:

1. **Browser cache / service worker**: before any network, the browser checks its own cache. A fresh cached response short-circuits the entire chain (0 RTT). This is the cheapest possible hit.
2. **DNS**: resolve the hostname. Cached at browser/OS/resolver, so usually 0 RTT; on a cold miss, a resolver walk adds one or more RTTs (see the DNS lesson).
3. **TCP**: 3-way handshake, ~1 RTT. Reused/pooled connections skip this.
4. **TLS**: ~1 RTT for TLS 1.3 (0-RTT on resumption). So a cold HTTPS connection is roughly 2 RTTs before the first request byte.
5. **Edge: CDN/anycast POP**: anycast routes you to the nearest POP. For static or cacheable content, a **CDN hit returns here** without ever touching origin, the biggest short-circuit after the browser cache. A miss makes the POP fetch from origin (CDN fill) and cache it.
6. **WAF**: inspects for attacks (SQLi, XSS, bot patterns); can block before origin.
7. **Load balancer -> reverse proxy / API gateway**: L4 then L7; the gateway does routing, auth offload, rate limiting.
8. **App server**: now real work. **Auth** (validate the session/JWT). Then business logic.
9. **App cache (Redis/Memcached)**: before hitting the database, check the cache. A **hit** returns in ~1ms and skips the DB. A **miss** falls through to the database (read-through), then populates the cache.
10. **Database / downstream services**: the authoritative read/write, plus any fan-out to other microservices (each its own network hop with its own timeout).
11. **Response path**: serialize (JSON/Protobuf), compress (gzip/brotli), set **cache headers** (Cache-Control, ETag) that decide what the browser and CDN may cache next time, the CDN fills its cache on the way out, and the client renders.

Hit versus miss is the whole game. On a warm path (browser cache fresh, or CDN hit, or Redis hit) most hops are skipped and you answer in single-digit ms. On a full cold miss (cold DNS, new connection, CDN miss, Redis miss) you pay every RTT plus the DB query, easily hundreds of ms. Interview nuance: for a **signed-in user on a dynamic page**, the CDN usually cannot cache the personalized HTML, so the browser cache and the app-tier Redis cache do the heavy lifting, and the CDN mostly accelerates static assets and terminates TLS near the user. Say this; it is the distinction between caching a public marketing page and a logged-in dashboard.

Failure points and timeouts, per hop: DNS resolution timeout, TCP connect timeout, TLS handshake failure (expired cert), LB/gateway 502/503/504 when a backend is down or slow, app-to-DB query timeout, and downstream-service timeouts that need circuit breakers so one slow dependency does not cascade. Every hop needs a bounded timeout and a fallback, or a single slow dependency stalls the whole request.

Recap: a request walks browser cache -> DNS -> TCP -> TLS -> CDN/WAF/LB/gateway -> app -> auth -> app cache -> DB/downstream and back through serialize/compress/cache-header/render, where each layer adds an RTT and offers a cache that can short-circuit the rest, and every hop needs its own timeout so one slow dependency cannot stall the whole path.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Trace a request from browser to database and back for a signed-in user hitting a dynamic page, naming every hop and the cache at each layer.

**Think about:**
- What RTTs are added at each step from DNS through TLS to first byte?
- Where can a cache short-circuit the path, and what changes on a hit vs miss?
- What are the failure points and timeouts at each hop?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume a signed-in user loading their dashboard at `https://app.example.com/dashboard`, dynamic and personalized, served from a CDN-fronted, multi-tier backend.

Down the path, with RTTs and caches:

1. **Browser cache / service worker**: checked first, 0 RTT. Personalized dashboard HTML is usually not cacheable here, but static assets and prior API responses may be. On a fresh hit the chain ends immediately.
2. **DNS**: usually cached (0 RTT); cold miss adds a resolver walk (1+ RTT). Failure: DNS timeout.
3. **TCP**: ~1 RTT handshake, skipped if a pooled connection is reused. Failure: connect timeout.
4. **TLS 1.3**: ~1 RTT (0-RTT on resumption). So cold, ~2 RTTs before the first request byte. Failure: expired cert.
5. **CDN/anycast POP**: routes to the nearest POP and terminates TLS near the user. For this dynamic personalized page the CDN cannot cache the HTML, so it proxies to origin; it still caches the page's static assets. This is the key point for a signed-in user: the CDN accelerates and terminates TLS but does not short-circuit the personalized response.
6. **WAF**: attack inspection, can block early.
7. **LB (L4) -> reverse proxy / API gateway (L7)**: routing, rate limiting, auth offload. Failure: 502/503/504 if backends are unhealthy.
8. **App server -> auth**: validate the session token/JWT. Failure: 401.
9. **App cache (Redis)**: before the DB, check Redis for the user's dashboard data. **Hit**: ~1ms, skip the DB. **Miss**: fall through, query the DB, then populate Redis (read-through). This cache is the real short-circuit for a logged-in user.
10. **Database / downstream services**: authoritative read, plus fan-out to other services, each a network hop with its own timeout and ideally a circuit breaker.
11. **Response back**: serialize (JSON), compress (brotli), set Cache-Control/ETag so the browser can revalidate cheaply next time, CDN fills static assets, client renders.

Hit vs miss: warm path (reused connection + Redis hit) answers in single-digit ms; cold path (new connection + Redis miss + DB + fan-out) is hundreds of ms.

Common wrong turn: assuming the CDN caches the signed-in HTML. It generally cannot; for a personalized page the browser cache and Redis do the caching, and the CDN's job is TLS termination near the user and static-asset acceleration. Also: forgetting per-hop timeouts, so one slow downstream stalls the whole request.

**Self-check rubric:**
- [ ] Did I name every hop in order (browser cache, DNS, TCP, TLS, CDN, WAF, LB, gateway, app, auth, cache, DB)?
- [ ] Did I attach an RTT to DNS/TCP/TLS and note reuse skips them?
- [ ] Did I identify the cache at each layer and what changes on hit vs miss?
- [ ] Did I correctly note the CDN cannot cache the signed-in dynamic HTML?
- [ ] Did I list per-hop failure modes and timeouts (incl. circuit breakers on downstream)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Trace and optimize the request lifecycle for an Amazon-style product page under a Black Friday spike (200k RPS, 60% signed-in) where p99 must stay under 300ms. Name each hop's cache, say what you cache versus what you cannot, and identify the two hops most likely to be your bottleneck.

**Model answer (revealed on demand):**

Assume a product detail page: mostly-shared product data (title, images, price, description) plus a personalized strip (your cart, recommendations, "buy again"). Split the page by cacheability, because that split is what makes 200k RPS at p99 under 300ms possible.

Per-hop caches and what I cache:
- **Browser cache / CDN**: the shared product data and all static assets (images, JS, CSS) are cached aggressively at the CDN with a short TTL plus stale-while-revalidate, so the vast majority of product-data reads never reach origin. At 200k RPS this is the only way to survive; the CDN absorbs the shared load. I edge-cache the product HTML fragment or serve a cacheable shell and hydrate the personalized parts client-side.
- **Personalized strip (60% signed-in)**: cannot be CDN-cached (it is per-user). It is fetched via a separate API call and served from an **app-tier Redis cache** keyed per user, with the cart in Redis and recommendations precomputed offline and cached. On a Redis hit this is ~1ms; the DB is only touched on miss.
- **Database**: authoritative product and inventory data, protected behind Redis (read-through) and read replicas. Writes (inventory decrement) go to the primary.

The two most likely bottlenecks:
1. **The database on cache misses / hot keys.** A hot product (the doorbuster) is a single cache key that every request wants; a cache miss or expiry causes a **thundering herd** all hitting the DB at once. I defend with request coalescing (single-flight so one miss repopulates while others wait), slightly jittered TTLs, and pre-warming hot products before the sale. Inventory decrement is a write hot spot: I use atomic Redis counters or a dedicated inventory service, not a row lock on the DB.
2. **TLS/connection setup at the edge.** 200k RPS of new mobile connections means a flood of handshakes; I keep connections warm/pooled, terminate TLS at the POP with session resumption, and use H2/H3 multiplexing so one connection carries many requests.

Optimizations to hold p99 < 300ms: serve shared data from the edge (offload origin), Redis for personalized data with herd protection, aggressive connection reuse, per-hop timeouts with circuit breakers so a slow recommendations service degrades to a generic strip instead of stalling the page, and graceful degradation (show the product even if recs are slow).

Common wrong turn: trying to cache the whole personalized page at the CDN (impossible for signed-in users) instead of splitting cacheable shared data from per-user data, or ignoring the hot-key thundering herd that a single doorbuster product creates.
