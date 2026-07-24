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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "A request for '/checkout' arrives carrying a session cookie. Sort each piece of information by which kind of load balancer can act on it.",
  "buckets": [
    "An L4 LB can act on it",
    "Only an L7 proxy can act on it"
  ],
  "items": [
    {
      "label": "The URL path '/checkout'",
      "bucket": "Only an L7 proxy can act on it",
      "feedback": "Paths live inside the HTTP request. An L4 LB forwards packets and connections without ever parsing HTTP."
    },
    {
      "label": "The destination port, 443",
      "bucket": "An L4 LB can act on it",
      "feedback": "Ports are part of the 4-tuple, which is exactly what L4 sees."
    },
    {
      "label": "The 'Host' header",
      "bucket": "Only an L7 proxy can act on it",
      "feedback": "Headers are HTTP content. Reading one means terminating the connection and parsing the request."
    },
    {
      "label": "The client's source IP",
      "bucket": "An L4 LB can act on it",
      "feedback": "The source IP is in the 4-tuple, visible without touching a single HTTP byte."
    },
    {
      "label": "A session cookie",
      "bucket": "Only an L7 proxy can act on it",
      "feedback": "Cookies ride in HTTP headers, invisible at L4. Cookie-based sticky sessions need an L7 proxy."
    }
  ]
}
\`\`\`

**Interview nuance:** interviewers probe whether you conflate an L4 LB with L7 routing. If you say
"the load balancer routes \`/checkout\` to the payments service," you have quietly assumed an L7
proxy. Say so, and note the cost: TLS termination and request parsing on every request.

**Interview nuance:** TLS does not have a clean OSI number (people say L5, L6, or "between 4 and 7").
Do not die on that hill. Say "TLS sits on top of TCP and below HTTP" and move on.

Recap: Reason in a practical 5-layer stack, remember IP routes packets and TCP/UDP address processes
by port, and know that L4 sees only the 4-tuple while L7 can read and route on request content.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "In your design write you say 'the load balancer sends /api to the API pool and /images to the static pool'. What have you just committed to?",
  "options": [
    {
      "label": "An L4 load balancer is enough; routing by path is a basic LB feature",
      "feedback": "Tempting because 'load balancer' sounds like one thing, but path-based routing requires parsing the request, and L4 sees only the 4-tuple, never a URL."
    },
    {
      "label": "An L7 proxy that terminates the connection and parses every request, paying CPU and latency for it",
      "correct": true,
      "feedback": "Right. Path routing quietly assumes an L7 proxy, and the honest version of the design names its cost: TLS termination and request parsing on every request."
    },
    {
      "label": "Nothing extra; DNS can do this split before traffic reaches any LB",
      "feedback": "DNS hands back an IP per hostname before any request exists. It never sees paths, so it cannot split '/api' from '/images'."
    }
  ],
  "reveal": "Whenever a design routes on path, header, or cookie, an L7 proxy is doing it. In your design write, label each load balancer L4 or L7 on purpose and say why."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "sequence",
  "title": "DNS resolution: the cold walk vs a cache hit",
  "actors": [
    {
      "id": "stub",
      "label": "Browser / stub resolver"
    },
    {
      "id": "recursive",
      "label": "Recursive resolver"
    },
    {
      "id": "root",
      "label": "Root server"
    },
    {
      "id": "tld",
      "label": "'.com' TLD server"
    },
    {
      "id": "auth",
      "label": "Authoritative NS"
    }
  ],
  "toggles": [
    {
      "id": "cacheWarm",
      "label": "Cached answer (TTL live)",
      "description": "the recursive resolver still holds the record and its TTL has not expired"
    }
  ],
  "steps": [
    {
      "from": "stub",
      "to": "recursive",
      "label": "A? for 'example.com'",
      "kind": "request"
    },
    {
      "from": "recursive",
      "label": "no cached answer, walk it",
      "kind": "note",
      "when": "!cacheWarm"
    },
    {
      "from": "recursive",
      "to": "root",
      "label": "who serves '.com'?",
      "kind": "request",
      "when": "!cacheWarm",
      "predict": {
        "question": "The recursive resolver has no cached answer. Who does it ask first?",
        "options": [
          "The root servers",
          "The '.com' TLD servers",
          "example.com's authoritative server"
        ]
      }
    },
    {
      "from": "root",
      "to": "recursive",
      "label": "'.com' TLD nameservers",
      "kind": "response",
      "when": "!cacheWarm"
    },
    {
      "from": "recursive",
      "to": "tld",
      "label": "NS for 'example.com'?",
      "kind": "request",
      "when": "!cacheWarm"
    },
    {
      "from": "tld",
      "to": "recursive",
      "label": "authoritative nameservers",
      "kind": "response",
      "when": "!cacheWarm"
    },
    {
      "from": "recursive",
      "to": "auth",
      "label": "give me the A record",
      "kind": "request",
      "when": "!cacheWarm"
    },
    {
      "from": "auth",
      "to": "recursive",
      "label": "A record + TTL",
      "kind": "response",
      "when": "!cacheWarm"
    },
    {
      "from": "recursive",
      "label": "caches answer, keyed by TTL",
      "kind": "note",
      "when": "!cacheWarm"
    },
    {
      "from": "recursive",
      "label": "cache hit, TTL not expired",
      "kind": "note",
      "when": "cacheWarm"
    },
    {
      "from": "recursive",
      "to": "stub",
      "label": "A record",
      "kind": "response"
    }
  ],
  "caption": "Caching happens at every hop and is keyed by TTL: flip the toggle and the whole hierarchy walk disappears. That same caching is why a DNS failover is never instant."
}
\`\`\`

Record types you must know: **A** (name to IPv4), **AAAA** (name to IPv6), **CNAME** (alias one name
to another, cannot exist at the zone apex or alongside other records), **NS** (delegation), and
provider **ALIAS/ANAME** records, which behave like a CNAME but are legal at the apex
(\`example.com\` itself) because the provider resolves them server-side and returns an A record.

**Interview nuance:** "why can't I CNAME my apex to my load balancer?" is a real, common gotcha.
Answer: the apex needs SOA/NS records that a CNAME would forbid coexisting with; use ALIAS/ANAME.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You set a 60 second TTL on 'api.example.com'. The primary region dies and you repoint the record to a healthy IP. When does traffic actually stop hitting the dead IP?",
  "options": [
    {
      "label": "Within 60 seconds; that is what the TTL guarantees",
      "feedback": "Tempting because that is the contract on paper, but resolvers you do not control clamp or ignore TTLs, and clients that already resolved keep using the stale IP until their own caches expire."
    },
    {
      "label": "Within minutes, best effort, with some stragglers even later",
      "correct": true,
      "feedback": "Right. DNS failover is eventually consistent: misbehaving recursive resolvers, corporate caches, and already-resolved clients all outlive your TTL."
    },
    {
      "label": "Almost instantly; the authoritative server pushes the change out to resolvers",
      "feedback": "DNS has no push. Every cache in the chain waits out its own timer and re-queries; nothing you do invalidates them remotely."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your design needs region failover within 5 seconds of a health check failing. Can DNS routing alone, Geo or latency or weighted plus health checks, deliver that?",
  "options": [
    {
      "label": "Yes; health checks make the authoritative server stop handing out the dead region's IP immediately",
      "feedback": "Health checks do fix what new resolutions receive, which is real and valuable, but everyone who already resolved keeps the cached answer until it expires. New lookups heal fast; existing users do not."
    },
    {
      "label": "No; DNS steers new lookups on the order of minutes, so seconds-level failover needs a load balancer or anycast layer below it",
      "correct": true,
      "feedback": "Right. DNS gets users to the right region eventually; per-request health, retries, and instant failover belong to the L4/L7 layer that takes over after resolution."
    },
    {
      "label": "Yes, if you drop the TTL to 1 second",
      "feedback": "Tempting arithmetic, but very low TTLs get clamped by many resolvers, multiply your query load, and make you dependent on your DNS provider's uptime, while already-resolved clients still hold stale answers."
    }
  ],
  "reveal": "The division of labor to carry into your design write: DNS steers users to the nearest healthy region in minutes, best effort; a real load balancer handles per-request health and failover in milliseconds from there."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "sequence",
  "title": "TCP handshake cost vs a reused connection",
  "actors": [
    {
      "id": "client",
      "label": "Client (200ms RTT away)"
    },
    {
      "id": "server",
      "label": "Server"
    }
  ],
  "toggles": [
    {
      "id": "reuse",
      "label": "Connection reuse",
      "description": "keep-alive: the warm connection and its congestion window survive"
    }
  ],
  "steps": [
    {
      "from": "client",
      "label": "cold start: no connection",
      "kind": "note",
      "when": "!reuse"
    },
    {
      "from": "client",
      "to": "server",
      "label": "SYN",
      "kind": "request",
      "when": "!reuse"
    },
    {
      "from": "server",
      "to": "client",
      "label": "SYN-ACK",
      "kind": "response",
      "when": "!reuse"
    },
    {
      "from": "client",
      "to": "server",
      "label": "ACK",
      "kind": "request",
      "when": "!reuse",
      "state": {
        "rtts_spent": "1"
      }
    },
    {
      "from": "client",
      "label": "1 RTT of pure setup burned",
      "kind": "timer",
      "when": "!reuse"
    },
    {
      "from": "client",
      "label": "keep-alive: warm connection",
      "kind": "note",
      "when": "reuse",
      "state": {
        "rtts_spent": "0"
      }
    },
    {
      "from": "client",
      "to": "server",
      "label": "'GET /api/orders'",
      "kind": "request",
      "predict": {
        "question": "How many round trips passed before this first request byte left the client?",
        "options": [
          "0",
          "1",
          "2"
        ]
      }
    },
    {
      "from": "server",
      "to": "client",
      "label": "response, 2 RTTs total",
      "kind": "response",
      "when": "!reuse",
      "state": {
        "rtts_spent": "2"
      }
    },
    {
      "from": "server",
      "to": "client",
      "label": "response, 1 RTT total",
      "kind": "response",
      "when": "reuse",
      "state": {
        "rtts_spent": "1"
      }
    },
    {
      "from": "client",
      "label": "reuse saved 200ms of ceremony",
      "kind": "timer",
      "when": "reuse"
    }
  ],
  "caption": "On a 200ms link the handshake is a visible stall before any data flows. Reuse keeps the connection warm and keeps the opened congestion window, so you also skip slow start's ramp."
}
\`\`\`

TCP earns that cost by giving reliability: every byte has a sequence number, the receiver ACKs what
it got, and unacknowledged data is retransmitted, so the application sees an ordered, gap-free
stream. It also runs **congestion control**: a new connection starts in slow start with a small
congestion window and ramps up as ACKs return, probing for available bandwidth. This is why
throughput on a fresh connection is low at first and climbs, and why short-lived connections never
reach full speed: they die in slow start before the window opens up. Reusing a warmed connection
means you keep the opened window.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A mobile client 200ms away makes 30 sequential API calls, each on a brand new HTTPS connection. Every response is small. What dominates the total wait?",
  "options": [
    {
      "label": "Bandwidth; 30 responses is a lot of bytes to move",
      "feedback": "Tempting, but the responses are small. Bandwidth limits how fast bytes flow once they are flowing; it does nothing about the round trips you burn before any byte flows."
    },
    {
      "label": "Setup ceremony; roughly 2 RTTs of handshake per call, around 12 seconds of pure setup",
      "correct": true,
      "feedback": "Right. TCP plus TLS 1.3 costs about 2 RTTs before the first request byte, times 30 calls at 200ms per RTT. Each fresh connection also restarts slow start, so none of them ever reaches full speed."
    },
    {
      "label": "Server processing time; 30 requests is a real load",
      "feedback": "The server is the usual suspect, which is what makes this tempting, but it could answer instantly and the user would still stare at many seconds of handshakes."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your design has an internal proxy opening a fresh connection per request to one backend at thousands of requests per second, all inside a datacenter. What breaks first?",
  "options": [
    {
      "label": "Nothing; with sub-millisecond RTT, connections are effectively free",
      "feedback": "The tiny RTT does hide the handshake cost, which is why this feels safe, but every closed connection sits in TIME_WAIT for about 60 seconds holding an ephemeral port, and each fresh connection restarts slow start."
    },
    {
      "label": "The proxy exhausts its ~28k ephemeral ports as closed connections pile up in TIME_WAIT, and throughput never leaves slow start",
      "correct": true,
      "feedback": "Right. One source IP talking to one backend IP has a hard port budget, and 60-second TIME_WAIT holds burn through it fast at high churn. Connection pooling fixes the ports, the handshakes, and the slow-start ramp in one move."
    },
    {
      "label": "The network link saturates from all the extra traffic",
      "feedback": "Handshake packets are tiny, so bandwidth is rarely the first casualty. Port exhaustion and per-connection slow start arrive long before the wire fills up."
    }
  ],
  "reveal": "Carry this into your design write: say where connections are pooled and kept warm, and where UDP or QUIC fits because late data is worthless. Pooling is not an optimization at scale; it is what keeps the system connecting at all."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "TLS 1.3 0-RTT lets a returning client send application data in its very first flight, saving a full round trip. Should you enable it for every endpoint, including 'POST /charge'?",
  "options": [
    {
      "label": "Yes; the early data is encrypted, so it is as safe as any other TLS traffic",
      "feedback": "Tempting because encryption feels like the whole story, but replay is a different threat: an attacker who captures the encrypted flight can resend it verbatim, without ever decrypting a byte."
    },
    {
      "label": "No; 0-RTT early data is replayable, so only idempotent requests may ride it",
      "correct": true,
      "feedback": "Right. A captured 'POST /charge' replayed five times is five charges. Allow 0-RTT for GETs, or for writes guarded by an idempotency key, and never for raw non-idempotent writes."
    },
    {
      "label": "No, because 0-RTT only works on the very first connection to a server, before any trust exists",
      "feedback": "Backwards: 0-RTT only exists on resumption, after a first full handshake has already issued a session ticket. The risk is not missing trust; it is that the saved round trip removes the replay protection."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each requirement from a design review to the TLS termination choice it points to.",
  "buckets": [
    "Terminate at the edge/LB",
    "End-to-end passthrough",
    "Re-encrypt inside the mesh"
  ],
  "items": [
    {
      "label": "Route on paths and headers; the internal network is trusted, so plaintext behind the LB is acceptable",
      "bucket": "Terminate at the edge/LB",
      "feedback": "Edge termination buys L7 routing and offloaded crypto, at the price of plaintext on the inside."
    },
    {
      "label": "Not even the load balancer may read requests; confidentiality beats everything",
      "bucket": "End-to-end passthrough",
      "feedback": "Passthrough forces an L4 LB and gives up L7 routing, retries, and rate limiting; that is the cost of maximum confidentiality."
    },
    {
      "label": "Want L7 routing at the edge and encrypted hops inside too",
      "bucket": "Re-encrypt inside the mesh",
      "feedback": "The common enterprise answer: decrypt for routing at the edge, then open a fresh TLS connection to each backend."
    },
    {
      "label": "Centralize certificate management and take crypto load off the app servers",
      "bucket": "Terminate at the edge/LB",
      "feedback": "One fleet of proxies holding the certs is far easier to rotate and monitor than certs scattered across every app server."
    }
  ],
  "reveal": "Termination is a dial between edge features and how far encryption reaches. In your design write, say where TLS terminates, how certs rotate automatically so an expired cert cannot take the site down, and whether internal hops use mTLS for service identity."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "sequence",
  "title": "Head-of-line blocking: H2 streams vs H1's ordered lane",
  "actors": [
    {
      "id": "client",
      "label": "Browser"
    },
    {
      "id": "server",
      "label": "Server"
    }
  ],
  "toggles": [
    {
      "id": "h1",
      "label": "HTTP/1.1 mode",
      "description": "one connection, one request in flight at a time"
    }
  ],
  "steps": [
    {
      "from": "client",
      "label": "H2: 3 streams, 1 connection",
      "kind": "note",
      "when": "!h1"
    },
    {
      "from": "client",
      "to": "server",
      "label": "stream 1: 'GET /report'",
      "kind": "request",
      "when": "!h1"
    },
    {
      "from": "client",
      "to": "server",
      "label": "stream 2: 'GET /styles.css'",
      "kind": "request",
      "when": "!h1"
    },
    {
      "from": "client",
      "to": "server",
      "label": "stream 3: 'GET /avatar.png'",
      "kind": "request",
      "when": "!h1"
    },
    {
      "from": "server",
      "to": "client",
      "label": "stream 2 done first",
      "kind": "response",
      "when": "!h1",
      "predict": {
        "question": "Stream 1's report is slow to build. Which response arrives first?",
        "options": [
          "stream 1: responses follow request order",
          "stream 2: each stream is independent"
        ]
      }
    },
    {
      "from": "server",
      "to": "client",
      "label": "stream 3 done",
      "kind": "response",
      "when": "!h1"
    },
    {
      "from": "server",
      "to": "client",
      "label": "stream 1 done, blocked nobody",
      "kind": "response",
      "when": "!h1"
    },
    {
      "from": "client",
      "label": "1 lost TCP packet stalls all 3",
      "kind": "note",
      "when": "!h1"
    },
    {
      "from": "client",
      "label": "H1: one request in flight",
      "kind": "note",
      "when": "h1"
    },
    {
      "from": "client",
      "to": "server",
      "label": "'GET /report' goes alone",
      "kind": "request",
      "when": "h1"
    },
    {
      "from": "server",
      "label": "slow report holds the lane",
      "kind": "timer",
      "when": "h1"
    },
    {
      "from": "server",
      "to": "client",
      "label": "report done, lane reopens",
      "kind": "response",
      "when": "h1"
    },
    {
      "from": "client",
      "to": "server",
      "label": "'GET /styles.css' finally",
      "kind": "request",
      "when": "h1"
    },
    {
      "from": "server",
      "to": "client",
      "label": "styles.css done, was queued",
      "kind": "response",
      "status": "late",
      "when": "h1"
    },
    {
      "from": "client",
      "to": "server",
      "label": "'GET /avatar.png' last",
      "kind": "request",
      "when": "h1"
    },
    {
      "from": "server",
      "to": "client",
      "label": "avatar done, queued behind",
      "kind": "response",
      "status": "late",
      "when": "h1"
    }
  ],
  "caption": "H2 interleaves streams over one warm connection so the slow report blocks nobody; in H1 mode everything queues behind it, which is why browsers opened about 6 connections per host. The note is the interview catch: all H2 streams ride one TCP connection, so a single lost packet stalls every stream."
}
\`\`\`

### HTTP/3 over QUIC

QUIC is a new transport built on **UDP** that reimplements reliability, ordering, and congestion
control per stream. Because each stream is independently reliable, a lost packet only stalls its own
stream, not the others: **QUIC removes TCP-level HOL blocking**. It also folds the transport and TLS
handshake together for a faster (often 1-RTT, 0-RTT on resumption) setup, and supports **connection
migration**: the connection is identified by a connection ID, not the 4-tuple, so a phone switching
from Wi-Fi to cellular (new IP) keeps the same connection instead of re-handshaking.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "H3 removes TCP-level HOL blocking, folds the handshakes together, and survives network switches. Where do you roll it out first?",
  "options": [
    {
      "label": "Everywhere at once; a better protocol is better on every link",
      "feedback": "Tempting, but H3's wins come from loss and mobility. A stable low-loss datacenter link rarely triggers HOL blocking, some middleboxes throttle or block UDP, and QUIC's user-space stack can burn more CPU than kernel TCP."
    },
    {
      "label": "The mobile-facing edge, where loss and network switches are common",
      "correct": true,
      "feedback": "Right. Per-stream recovery pays off exactly where packets get lost, and connection migration saves the Wi-Fi-to-cellular handoff. Stable internal links keep most of the benefit already via warm H2 connections."
    },
    {
      "label": "The internal service-to-service links first, since you control both ends there",
      "feedback": "Controlling both ends makes the rollout easy, which is the temptation, but the benefit is tiny: stable links rarely lose packets, and gRPC runs on HTTP/2 today anyway."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "File each statement under the HTTP version it describes.",
  "buckets": [
    "HTTP/1.1",
    "HTTP/2",
    "HTTP/3"
  ],
  "items": [
    {
      "label": "One slow response blocks its whole connection, so browsers open about 6 per host",
      "bucket": "HTTP/1.1",
      "feedback": "Request-level HOL blocking: one request in flight per connection, and parallelism means more connections, more handshakes, more slow starts."
    },
    {
      "label": "Streams share one TCP connection, and a single lost packet stalls all of them",
      "bucket": "HTTP/2",
      "feedback": "The interview catch: multiplexing killed request-level HOL blocking, but TCP's ordered delivery still makes every stream wait for one retransmission."
    },
    {
      "label": "A lost packet stalls only its own stream",
      "bucket": "HTTP/3",
      "feedback": "QUIC rebuilds reliability per stream over UDP, so the head-of-line problem finally dissolves at the transport level."
    },
    {
      "label": "The connection survives a phone switching from Wi-Fi to cellular",
      "bucket": "HTTP/3",
      "feedback": "QUIC identifies a connection by connection ID rather than the 4-tuple, so a new IP does not force a re-handshake."
    },
    {
      "label": "What gRPC runs on today",
      "bucket": "HTTP/2",
      "feedback": "gRPC needs multiplexed streams and gets them from H2, which is why internal RPC is naturally H2."
    }
  ],
  "reveal": "Each version pushed the head-of-line problem down one layer until QUIC dissolved it. The topology to carry into your design write: H3 with H2 fallback at the lossy mobile edge, H2/gRPC for stable internal RPC."
}
\`\`\`
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
   in ~1ms and skips the DB. A **miss** falls through to the database (cache-aside), then populates
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A signed-in user loads their personalized dashboard and gets a fast warm-path response. Which caches are most likely doing the heavy lifting?",
  "options": [
    {
      "label": "The CDN; it caches whatever passes through it at the edge",
      "feedback": "Tempting because CDN and cache feel like synonyms, but the CDN cannot serve one user's personalized HTML to anyone else, so for a dashboard it mostly holds static assets."
    },
    {
      "label": "The browser cache and the app-tier Redis cache",
      "correct": true,
      "feedback": "Right. Personalized responses live in caches that know the user: the browser's own cache in front, and Redis behind the app server skipping the database."
    },
    {
      "label": "The DNS cache; skipping the resolver walk is the big win",
      "feedback": "A DNS cache saves one lookup's worth of RTT. The request still travels the entire chain and does full origin work, so it cannot explain a warm path by itself."
    }
  ]
}
\`\`\`

**Interview nuance:** for a **signed-in user on a dynamic page**, the CDN usually cannot cache the
personalized HTML, so the browser cache and the app-tier Redis cache do the heavy lifting, and the
CDN mostly accelerates static assets and terminates TLS near the user. Say this; it is the
distinction between caching a public marketing page and a logged-in dashboard.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Which layer does each job on this page load?",
  "buckets": [
    "Browser cache",
    "CDN POP",
    "Redis app cache"
  ],
  "items": [
    {
      "label": "Serves a fresh response with zero network traffic at all",
      "bucket": "Browser cache",
      "feedback": "The cheapest possible hit: the entire chain, DNS included, is short-circuited before a single packet leaves the device."
    },
    {
      "label": "Serves static assets and public pages from near the user",
      "bucket": "CDN POP",
      "feedback": "Shared, non-personalized content is the CDN's home turf: a hit returns at the edge without touching origin."
    },
    {
      "label": "Answers hot reads in about 1ms so the database is skipped",
      "bucket": "Redis app cache",
      "feedback": "The app server checks Redis before the database; a hit skips the authoritative store, a miss falls through and populates it."
    },
    {
      "label": "Terminates TLS close to the user even on pages it cannot cache",
      "bucket": "CDN POP",
      "feedback": "Easy to miss: even with nothing cacheable, the POP makes the expensive handshakes happen over a short hop instead of the long haul."
    }
  ]
}
\`\`\`

Failure points and timeouts, per hop: DNS resolution timeout, TCP connect timeout, TLS handshake
failure (expired cert), LB/gateway 502/503/504 when a backend is down or slow, app-to-DB query
timeout, and downstream-service timeouts that need circuit breakers so one slow dependency does not
cascade. Every hop needs a bounded timeout and a fallback, or a single slow dependency stalls the
whole request.

Recap: a request walks browser cache -> DNS -> TCP -> TLS -> CDN/WAF/LB/gateway -> app -> auth -> app
cache -> DB/downstream and back through serialize/compress/cache-header/render, where each layer adds
an RTT and offers a cache that can short-circuit the rest, and every hop needs its own timeout so one
slow dependency cannot stall the whole path.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Fully cold start: DNS uncached, new connection, CDN miss, Redis miss, and the user is 200ms from origin. Roughly how much time passes before the app server even begins real work?",
  "options": [
    {
      "label": "Almost none; the setup steps overlap with sending the request",
      "feedback": "Each stage needs the previous one's answer: you cannot handshake TCP before DNS returns an IP, or send HTTP before TLS finishes. Cold setup is strictly sequential."
    },
    {
      "label": "Around 2 to 3 RTTs, so 400 to 600ms, before the first request byte even reaches origin",
      "correct": true,
      "feedback": "Right. The DNS walk plus the TCP handshake plus TLS 1.3 is 2+ RTTs of pure ceremony at 200ms each, and the request still has to clear the WAF, LB, gateway, and auth before a Redis miss sends it to the database."
    },
    {
      "label": "About one RTT; each of these layers is individually cheap",
      "feedback": "That is exactly the trap: each layer is cheap alone, but DNS, TCP, and TLS each bill their own round trip, and a cold miss makes you pay every one of them at once."
    }
  ],
  "reveal": "This chain is your design-write checklist: name every hop, the RTT it adds, the cache that can short-circuit it, and the timeout that bounds it. Showing where hits land and what happens when each hop fails is what turns a diagram into a system."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your team is designing a public API for external developers in dozens of languages. A teammate pushes for gRPC because it is faster and more modern. What should drive the decision instead?",
  "options": [
    {
      "label": "Raw performance: gRPC's smaller payloads win, so use it",
      "feedback": "Tempting, and the payload savings are real, but a public API's consumers are browsers and 'curl'-level integrators you do not control. gRPC needs grpc-web plus a proxy for browsers and defeats HTTP caching, so speed is not the deciding axis here."
    },
    {
      "label": "Consumer shape: external developers need ubiquity, 'curl' debugging, and HTTP caching, which points to REST",
      "correct": true,
      "feedback": "Right. A paradigm is a bet about who the consumer is and what the traffic looks like. For a public developer API, ubiquity and the HTTP ecosystem outweigh binary-payload savings."
    },
    {
      "label": "Whatever the biggest tech companies use",
      "feedback": "Netflix, Uber, and Google run hybrids: REST or GraphQL at the edge and gRPC internally. Copying a logo without matching the consumer shape is how gRPC ends up on a browser-facing API."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each consumer to the paradigm you would bet on.",
  "buckets": [
    "REST",
    "gRPC",
    "GraphQL"
  ],
  "items": [
    {
      "label": "Public developer API integrated from many languages",
      "bucket": "REST",
      "feedback": "Ubiquity, 'curl' debugging, HTTP caching, and OpenAPI docs matter most when you do not control the clients."
    },
    {
      "label": "Internal fraud-scoring calls at 20k QPS between services you own",
      "bucket": "gRPC",
      "feedback": "You own both ends, so Protobuf's compact frames, HTTP/2 multiplexing, and generated stubs pay off at high QPS."
    },
    {
      "label": "Mobile app whose screens each need different field combinations",
      "bucket": "GraphQL",
      "feedback": "Varied, evolving data needs across many screens is exactly the over/under-fetching problem GraphQL solves, provided you add cost limits and DataLoader-style batching."
    },
    {
      "label": "Partner endpoint that support engineers debug by pasting a URL",
      "bucket": "REST",
      "feedback": "Human-debuggable request/response over plain HTTP is REST's home turf; a binary POST cannot be inspected that way."
    }
  ],
  "reveal": "The pattern to carry into the design exercise: name the consumer and traffic shape first, then pick the paradigm, and expect a hybrid, with REST or GraphQL at the edge resolving into gRPC between your own services."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "A consumer team depends on your order API and follows the tolerant-reader pattern. Sort each schema change.",
  "buckets": [
    "Breaks consumers",
    "Safe to ship"
  ],
  "items": [
    {
      "label": "Rename 'amount_cents' to 'amount'",
      "bucket": "Breaks consumers",
      "feedback": "A rename is a removal plus an addition. Every reader of 'amount_cents' finds nothing there, tolerant or not."
    },
    {
      "label": "Add an optional 'discount_cents' field",
      "bucket": "Safe to ship",
      "feedback": "Tolerant readers ignore fields they do not recognize, so adding optional fields is the default safe move."
    },
    {
      "label": "A field that is sometimes null and sometimes missing entirely",
      "bucket": "Breaks consumers",
      "feedback": "The classic trap: clients must handle two different absence cases and one of them ships untested. Pick one representation and document it."
    },
    {
      "label": "Add a brand-new endpoint",
      "bucket": "Safe to ship",
      "feedback": "Existing consumers never call it, so it cannot break them."
    },
    {
      "label": "Change 'status' from a string to an object",
      "bucket": "Breaks consumers",
      "feedback": "A type change breaks every parser that expected a string, even a tolerant one. Add a new field instead of repurposing the old one."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Two teams ship independent services that talk to each other, deploying many times a day. What actually keeps the provider from breaking the consumer?",
  "options": [
    {
      "label": "Coordinated releases: both teams deploy together",
      "feedback": "Tempting because it feels careful, but coordination does not scale past a handful of services, and in a distributed deploy the two sides are never upgraded at the same instant anyway."
    },
    {
      "label": "The consumer team reads the provider's code before each release",
      "feedback": "Cross-team code review is slow, optional, and misses behavioral expectations. The code is not the contract; the schema is."
    },
    {
      "label": "A machine-readable schema as source of truth plus consumer-driven contract tests in CI",
      "correct": true,
      "feedback": "Right. The schema stops silent drift because everything is generated from or validated against it, and contract tests replay each consumer's real expectations so a breaking change fails the build before deploy, not at 2am."
    }
  ],
  "reveal": "Carry this into the design write: name the schema artifact (OpenAPI, Protobuf, or SDL), state that evolution is additive with tolerant readers, and name the CI enforcement that catches the breaks people miss."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Your public API is at /v1 and your clients are tolerant readers. Sort each proposed change.",
  "buckets": [
    "Needs a /v2",
    "Additive, no bump"
  ],
  "items": [
    {
      "label": "Add an optional 'gift_message' field to orders",
      "bucket": "Additive, no bump",
      "feedback": "Tolerant readers ignore unknown fields, so optional additions are the bread and butter of bump-free evolution."
    },
    {
      "label": "Rename 'created' to 'created_at'",
      "bucket": "Needs a /v2",
      "feedback": "A rename removes the old name, so every client reading 'created' breaks. Better still: add the new field alongside and deprecate the old one, avoiding the bump entirely."
    },
    {
      "label": "Add a new refunds endpoint",
      "bucket": "Additive, no bump",
      "feedback": "New endpoints cannot break clients that never call them."
    },
    {
      "label": "Tighten validation to reject addresses you previously accepted",
      "bucket": "Needs a /v2",
      "feedback": "Tempting to treat as a bug fix, but requests that used to succeed now fail. Changing behavior under existing integrations is a true break."
    },
    {
      "label": "Add a new value to the status enum",
      "bucket": "Additive, no bump",
      "feedback": "Safe only because your clients handle unknown enum values as tolerant readers. If they switch exhaustively on the enum, this one bites, so state the assumption."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You genuinely must break the public orders API. Which rollout avoids the angry-customer incident?",
  "options": [
    {
      "label": "Announce a date, then hard-cut the existing endpoint to the new behavior",
      "feedback": "Tempting because it is simple, but announcements get missed, and a cutover with no telemetry gate is exactly how the incident happens."
    },
    {
      "label": "Ship /v2, deprecate /v1, warn with 'Deprecation' and 'Sunset' headers plus emails to top callers, and remove only after telemetry shows traffic drained",
      "correct": true,
      "feedback": "Right. Deprecate, warn, remove, with telemetry as the gate. The old version dies when the data says nobody needs it, not when the calendar says so."
    },
    {
      "label": "Keep both versions forever so nothing ever breaks",
      "feedback": "Every live version multiplies test, support, and security surface. Versions need a retirement path or they accumulate without bound."
    }
  ],
  "reveal": "For the design exercise, lead with the posture: most changes should be additive and bump-free with tolerant readers on both sides, /v2 is a last resort for true breaks, and retirement is a sequenced deprecate, warn, remove migration."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A server dedupes payments by storing a boolean 'seen this key' flag. The original request and its retry arrive at the same instant. What happens?",
  "options": [
    {
      "label": "The retry sees the flag and safely gets the same answer",
      "feedback": "That is what the flag was meant to do, but both requests can check the flag before either has set it, so neither sees it. And even without the race, a bare flag has no charge id or status to give back to the retry."
    },
    {
      "label": "Both requests can pass the flag check, both do the work, and you double-charge",
      "correct": true,
      "feedback": "Right. Check-then-set is a race. The fix is to claim the key with a unique-constraint insert (a unique DB row or 'SETNX') before doing any work, so one request wins and the other waits for the winner's stored response."
    },
    {
      "label": "The database serializes them automatically",
      "feedback": "Tempting, but two independent read-then-write sequences are not serialized unless you make them contend on something, which is exactly what the unique-constraint insert provides."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A payments team says their API guarantees exactly-once charging over the public internet. If it really works, what are they actually running?",
  "options": [
    {
      "label": "True exactly-once delivery at the network layer",
      "feedback": "No protocol can promise that: the request, the response, or the ack can always be lost, which is the two-generals problem. Anyone claiming wire-level exactly-once is hiding a retry somewhere."
    },
    {
      "label": "At-least-once delivery plus idempotent handling keyed on an idempotency key",
      "correct": true,
      "feedback": "Right. Retries make delivery at-least-once, and dedupe on the key with a stored full response makes processing effectively-once. Behaviorally that is the exactly-once the customer experiences."
    },
    {
      "label": "At-most-once delivery: never retry, so nothing can duplicate",
      "feedback": "That trades double-charging for silently dropped payments whenever a response is lost. Giving up on retries is not safety, it is a different failure mode."
    }
  ],
  "reveal": "The design-exercise checklist: client-generated key on every mutating request, claim the key with a unique-constraint insert before doing work, store the full response with a TTL, return it on any retry, and dedupe webhooks and queue consumers with the same pattern."
}
\`\`\`
`.trim()

const paginationErrorsTeach = `
## Two boring details where APIs fall over at scale

Two boring-looking API details, pagination and error shape, are where APIs quietly fall over at
scale. Both have a correct answer.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A feed API serves page 5,000 with 'offset=100000&limit=20' on a table whose sort column is indexed. Compared with page 1, that query is:",
  "options": [
    {
      "label": "About the same speed, since the index lets the database jump straight to row 100,000",
      "feedback": "Tempting, but a B-tree index does not know row numbers. To honor the offset, the database walks and discards 100,000 rows first, on every request."
    },
    {
      "label": "Linearly slower, because the database scans and throws away everything before the offset",
      "correct": true,
      "feedback": "Right. Offset is O(n) in depth, and it gets worse: inserts at the top shift every row between page fetches, so users see duplicates or skipped items."
    },
    {
      "label": "Slower only because the sort column needs an index",
      "feedback": "The index already covers the ordering; offset still forces the scan-and-discard walk. The real fix is to seek by position with a cursor rather than count rows."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your client library just got an error response. Which errors should it automatically retry with backoff?",
  "options": [
    {
      "label": "All of them, retrying is the safe default",
      "feedback": "It feels robust, but most 4xx mean the request itself is wrong. Retrying a 400 returns the same 400 forever while amplifying load on a possibly struggling service."
    },
    {
      "label": "5xx and 429 only, honoring 'Retry-After' when present",
      "correct": true,
      "feedback": "Right. Server faults and rate limits are transient, so back off and retry. Client-fault 4xx will fail identically on every attempt, so surface them to the caller instead."
    },
    {
      "label": "4xx only, since those responses come back quickly",
      "feedback": "Backwards: fast failure does not mean retryable. A 422 validation error answers instantly and fails on every retry no matter what."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each API habit by how it behaves once the table is large and the traffic is real.",
  "buckets": [
    "Scales cleanly",
    "Trap at scale"
  ],
  "items": [
    {
      "label": "Offset/limit for arbitrarily deep pages",
      "bucket": "Trap at scale",
      "feedback": "O(n) in depth and unstable under inserts: both failure modes of the naive approach."
    },
    {
      "label": "An opaque 'next_cursor' built from the last row's sort key",
      "bucket": "Scales cleanly",
      "feedback": "Keyset paging seeks the index directly, O(1) at any depth, and the opaque encoding leaves you free to change it later."
    },
    {
      "label": "Returning an exact 'COUNT(*)' total with every page",
      "bucket": "Trap at scale",
      "feedback": "Feels helpful, but counting a large table is itself an expensive scan on every request. Prefer a 'has_more' boolean."
    },
    {
      "label": "A server-side maximum page size",
      "bucket": "Scales cleanly",
      "feedback": "Without a cap, one client asking for a million rows becomes your outage."
    },
    {
      "label": "Clients that blindly retry every 4xx",
      "bucket": "Trap at scale",
      "feedback": "Non-429 4xx fail identically on every attempt, so blind retries only multiply load."
    },
    {
      "label": "RFC 9457 error bodies with a correlation id",
      "bucket": "Scales cleanly",
      "feedback": "Machine-readable errors let clients branch on retryability, and the correlation id turns a support ticket into a specific log line."
    }
  ],
  "reveal": "For the design exercise, state both halves in one breath: cursor pagination with a bounded page size and 'has_more', plus structured errors whose status codes tell clients exactly what to retry."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Three HTTP-based delivery mechanisms so far. Match each workload to the cheapest one that fits.",
  "buckets": [
    "Short-poll",
    "Long-poll",
    "SSE"
  ],
  "items": [
    {
      "label": "An unread-count badge that can lag a few seconds",
      "bucket": "Short-poll",
      "feedback": "Low urgency tolerates the poll interval, and full statelessness keeps it trivially load-balanced."
    },
    {
      "label": "Near-real-time updates through old proxies that break streaming responses",
      "bucket": "Long-poll",
      "feedback": "Each held request completes as an ordinary HTTP response, which is why long-polling is the universal-compatibility fallback."
    },
    {
      "label": "Streaming LLM tokens to a browser as they generate",
      "bucket": "SSE",
      "feedback": "One-way server-to-client streaming with built-in reconnect and 'Last-Event-ID' resume: exactly what 'EventSource' was built for."
    }
  ]
}
\`\`\`

**WebSocket**: after an HTTP upgrade you get a full-duplex TCP connection, so both sides can push at
low latency. This is the right tool for genuinely bidirectional, low-latency work: chat, presence,
collaborative editing, multiplayer. The costs are real: the connection is stateful, so scaling across
many server nodes needs sticky sessions or, better, a pub/sub backbone (Redis, NATS, Kafka) so a
message published on node A reaches a user connected to node B. You also own heartbeats (ping/pong)
and reconnect/replay logic yourself.

**Webhooks**: server-to-server HTTP callbacks. This is not browser delivery at all; it is how *your*
server notifies *another* server of an event (Stripe calling your endpoint on \`payment.succeeded\`).
Pair webhooks with retries, HMAC signing, and idempotency, because they will be redelivered.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You need a notifications feed: the server pushes to browsers with sub-second latency, and clients never send data back on that channel. Which mechanism?",
  "options": [
    {
      "label": "WebSocket, it is the real-time tool",
      "feedback": "The famous answer, and it would work, but you would pay for a stateful duplex connection used in one direction only: sticky sessions or a pub/sub backbone, heartbeats, and hand-rolled reconnect logic."
    },
    {
      "label": "SSE",
      "correct": true,
      "feedback": "Right. One-directional flow is exactly SSE's shape: plain HTTP that proxies and CDNs pass through, automatic reconnection with 'Last-Event-ID' resume, and none of the duplex tax."
    },
    {
      "label": "Webhooks",
      "feedback": "Webhooks are server-to-server callbacks. A browser has no public endpoint to receive them, so they cannot deliver to a user's open tab."
    },
    {
      "label": "Short-polling every 10 seconds",
      "feedback": "Simple and stateless, but latency is capped at the poll interval, which fails the sub-second requirement here."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your WebSocket chat now runs on 10 server nodes. A user connected to node A sends a message to a user connected to node B. What makes delivery work?",
  "options": [
    {
      "label": "Sticky sessions on the load balancer",
      "feedback": "Tempting because sticky sessions do matter for keeping one user's connection pinned to a node, but they say nothing about how a message crosses from node A to node B."
    },
    {
      "label": "A pub/sub backbone (Redis, NATS, Kafka) that every node subscribes to",
      "correct": true,
      "feedback": "Right. Node A publishes, node B is subscribed and pushes down its local socket. This is the price of stateful connections, and exactly the cost you skip when a one-way workload uses SSE instead."
    },
    {
      "label": "Nothing extra, HTTP load balancing already routes messages to the right node",
      "feedback": "Load balancers route incoming requests. A message bound for another user's open socket has to travel between nodes, which plain load balancing never does."
    }
  ],
  "reveal": "The menu to carry into the design write: choose by direction, latency, per-connection cost, and delivery guarantee. Short-poll for lazy counters, long-poll as the universal fallback, SSE for one-way streaming, WebSocket for true duplex plus its pub/sub scaling tax, and webhooks for server-to-server with retries, HMAC signing, and dedupe."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "A network blip cuts the connection before the response arrives, so the client cannot tell whether the server did the work. Sort each call by whether the client can safely fire it again.",
  "buckets": [
    "Safe to auto-retry",
    "Do not blindly retry"
  ],
  "items": [
    {
      "label": "'GET' a document",
      "bucket": "Safe to auto-retry",
      "feedback": "Safe and idempotent: reading twice changes nothing, so clients and intermediaries retry it freely."
    },
    {
      "label": "'PUT' the full updated document",
      "bucket": "Safe to auto-retry",
      "feedback": "It writes, but replaying the same full body lands the same final state. Idempotent does not mean read-only."
    },
    {
      "label": "'DELETE' a document",
      "bucket": "Safe to auto-retry",
      "feedback": "Tempting to treat destructive as unrepeatable, but deleting twice still ends with the document gone. Same final state, so retry is safe."
    },
    {
      "label": "'POST' to create an order",
      "bucket": "Do not blindly retry",
      "feedback": "Each replay can create another order. This is exactly the gap idempotency keys exist to close."
    },
    {
      "label": "'PATCH' that appends an entry to a list",
      "bucket": "Do not blindly retry",
      "feedback": "An append applied twice appends twice, so this 'PATCH' is not idempotent and a blind retry duplicates data."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Two editors both fetch a document at version 'v5'. Editor A saves a change; moments later Editor B saves an edit still based on 'v5'. Your API returns '200 OK' to both and applies each write as it arrives. What happened to A's change?",
  "options": [
    {
      "label": "Nothing bad, the server merged both edits",
      "feedback": "Tempting, but plain HTTP has no merge step. The server simply stored whichever body arrived last."
    },
    {
      "label": "B's write silently overwrote it: a lost update",
      "correct": true,
      "feedback": "Right. Last-write-wins destroyed A's edit with no error anywhere. ETag plus 'If-Match' turns this silent loss into an explicit '412 Precondition Failed' that forces B to re-read and merge."
    },
    {
      "label": "The server rejected B because the version had moved on",
      "feedback": "Only if B sent 'If-Match: v5' and the server checked it. Version checking is opt-in; an API that answers '200' to everything checked nothing."
    }
  ],
  "reveal": "This bug is the whole lesson in one scene: method semantics decide what is retryable and cacheable, 'Cache-Control' plus an ETag makes reads cheap via '304 Not Modified', and the same ETag with 'If-Match' gives optimistic concurrency. In the design exercise, have every read return an ETag, require 'If-Match' on every update, and name '412' as the conflict signal."
}
\`\`\`
`.trim()

const serializationCompressionTeach = `
## A CPU-versus-bytes trade, decided by your bottleneck

Serialization and compression are a CPU-versus-bytes trade, and the right answer depends entirely on
where your bottleneck is: bandwidth (mobile, cross-region, metered) or CPU (very high QPS internal
traffic). You also have to keep schemas evolvable when producers and consumers deploy independently.

### Serialization formats

- **JSON**: human-readable, self-describing, universal, debuggable in a browser. But verbose (field
  names repeat on every object) and comparatively slow to parse. It is the correct default for public
  APIs where developer ergonomics and debuggability beat raw efficiency.
- **Protobuf**: compact binary driven by an IDL, fast to encode/decode, with generated types. Fields
  are tagged by number, not name, so payloads are small. Ideal for internal high-QPS RPC (it pairs
  with gRPC).
- **Avro**: the schema is registered centrally or travels with the data (in the file header), which
  makes it strong for data pipelines and Kafka, where a schema registry lets producers and consumers
  evolve independently.
- **Thrift**: RPC plus serialization from one IDL, similar niche to Protobuf, common in older
  Facebook-lineage stacks.

### Compression, negotiated via Accept-Encoding

- **gzip**: universal and cheap, the safe default.
- **Brotli**: better ratio than gzip, especially on text over HTTPS to browsers.
- **zstd**: excellent ratio and speed with tunable levels, great for internal transfer where you
  control both ends.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your API serves two payloads: a 200-byte JSON health status and a 4 MB JPEG. A teammate proposes turning on gzip for every response. What is the actual effect?",
  "options": [
    {
      "label": "Both shrink, so it is a pure win",
      "feedback": "Tempting, because compression usually helps, but these two payloads are precisely the cases where it does not."
    },
    {
      "label": "The JSON shrinks meaningfully, the JPEG barely changes",
      "feedback": "Half right: JPEG is already compressed, so gzip just burns CPU. But 200 bytes has almost nothing to squeeze either; the CPU and framing overhead can exceed the bytes saved."
    },
    {
      "label": "Neither payload is worth compressing",
      "correct": true,
      "feedback": "Right. Tiny payloads cost more CPU and latency than the bytes they save, and already-compressed media does not shrink again. Set a size threshold and skip media types that are already compressed."
    }
  ]
}
\`\`\`

The tradeoff to state explicitly: compression and binary encoding cut bytes but add CPU, and
aggressive compression can add tail latency on large responses (the compressor has to run before the
first byte goes out). So set a payload-size threshold below which you do not compress (compressing a
200-byte response is a net loss), and do not double-compress already-compressed data (images, video).

### Schema evolution: the part people forget

Protobuf, Avro, and Thrift all support forward and backward compatibility if you follow the rules:
add only optional/new fields, and never reuse or renumber a field tag (mark removed tags
\`reserved\`). That is what lets a new producer and an old consumer coexist during a rolling deploy.
JSON has no built-in schema, so it relies on the tolerant-reader discipline: consumers ignore unknown
fields and tolerate missing optional ones.

Putting it together with content negotiation: a public API defaults to JSON, honors
\`Accept-Encoding\` to pick Brotli for browsers, and sets \`Vary: Accept-Encoding\` so a shared cache
does not hand a Brotli body to a client that only speaks gzip. An internal mesh uses Protobuf with
zstd because both ends are controlled and CPU/bytes dominate.

**Interview nuance:** the trap is "Protobuf everywhere because it is faster." On a public browser API
the network savings are usually tiny relative to the developer and debugging cost, and you lose
\`curl\`-ability. The senior move is to locate the bottleneck first (bandwidth vs CPU) and choose per
surface.

Recap: choose format and codec by bottleneck (JSON+Brotli for public/bandwidth, Protobuf+zstd for
internal/CPU), never compress tiny or already-compressed payloads, and keep schemas evolvable by
adding optional fields and never reusing field tags.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Mid rolling deploy, half your fleet runs new code and half runs old. A teammate deleted a Protobuf field last month and today reuses its tag number, 7, for a new field with a different type and meaning. What do the old consumers do with new messages?",
  "options": [
    {
      "label": "Fail loudly with a schema mismatch error",
      "feedback": "Tempting, but Protobuf has no runtime schema handshake to catch this. Tags are just numbers on the wire, so nothing detects the reuse."
    },
    {
      "label": "Ignore field 7 because they do not recognize the new name",
      "feedback": "Field names never travel on the wire; only tag numbers do. Old consumers still recognize tag 7 and read it as the deleted field."
    },
    {
      "label": "Silently decode the new data as the old field, corrupting values",
      "correct": true,
      "feedback": "Right. The wire carries only tag numbers, so old readers interpret the new field's bytes as the old one. That is why removed tags get marked 'reserved' and evolution means adding optional fields only."
    }
  ],
  "reveal": "Pulling the lesson together: choose format and codec by bottleneck (JSON plus Brotli where developers and browser bandwidth matter, Protobuf plus zstd on internal high-QPS paths), skip compressing tiny or already-compressed payloads, and protect rolling deploys by adding only optional fields and never reusing a tag. The design exercise asks you to defend exactly these choices, surface by surface."
}
\`\`\`
`.trim()

const loadBalancingTeach = `
## Scale out, not up, and notice when a node dies

A load balancer is the primitive that lets you scale out instead of up. Once one machine cannot serve
your traffic, you run N identical machines and put a load balancer in front to spread requests across
them. Everything else in this lesson is about doing that spreading correctly and about noticing when
one of those N machines is dead.

### The layer

An **L4 (transport) load balancer** works at the TCP/UDP level. It sees IP addresses and ports, not
HTTP. It picks a backend, forwards packets, and stays out of the way. Because it never parses the
request body or terminates TLS, it is extremely fast and cheap per connection, and it is
content-blind: it cannot route \`/api/*\` to one pool and \`/images/*\` to another. AWS NLB and IPVS
are L4. An **L7 (application) load balancer** terminates the connection, reads the HTTP request, and
can route on host, path, header, or cookie. It usually terminates TLS, can retry failed requests,
inject headers, and do sticky routing. AWS ALB, Nginx, Envoy, and HAProxy in HTTP mode are L7. The
cost is CPU and latency: it does real work per request. Rule of thumb: use L7 when you need
HTTP-aware routing, TLS termination, or per-request features, and L4 when you need raw throughput or
non-HTTP protocols.

**Interview nuance:** Interviewers love to ask "L4 or L7 and why," then probe TLS. The clean answer:
L7 terminates TLS at the edge so backends speak plain HTTP inside the trusted network (or re-encrypt
for zero-trust); L4 passes TLS straight through, so the backend does the handshake and the LB never
sees plaintext.

### The algorithm

**Round robin** rotates evenly and is fine when every request costs about the same. **Least
connections** sends the next request to the backend with the fewest in-flight connections, which is
the right default when request durations vary a lot (some calls take 2 ms, some take 2 s), because it
naturally avoids piling long requests onto one node. **Weighted** variants let a bigger box take more
traffic. **Consistent hashing** pins a given key (user id, cache key) to the same backend so you get
cache affinity with minimal reshuffling when the pool changes.

### Failure detection and draining

**Active health checks** have the LB probe each backend on a schedule (\`GET /healthz\` every few
seconds); miss a threshold of probes and the node is marked down and pulled from rotation. **Passive
health checks** watch real traffic: if a backend returns errors or times out, eject it. You want
both. When you deploy, you do not want to kill in-flight requests, so you use **connection
draining**: the LB stops sending new requests to a node, waits for existing ones to finish (up to a
timeout), then removes it. Pair that with graceful shutdown in the app (stop accepting, finish work,
exit).

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You keep login sessions in each app server's memory and enable sticky sessions so the LB pins every user to one node. That node dies. What happens to its pinned users?",
  "options": [
    {
      "label": "The LB re-pins them to a healthy node and they continue seamlessly",
      "feedback": "The LB does re-route their traffic, but the sessions lived only in the dead node's memory. Re-pinning cannot recover state that no longer exists."
    },
    {
      "label": "They are all logged out and lose their in-flight state",
      "correct": true,
      "feedback": "Right. Stickiness let state hide on one machine, so that machine's death takes every pinned user down with it. Stateless services with sessions in Redis let any node serve any user."
    },
    {
      "label": "Nothing visible, health checks catch the node before users notice",
      "feedback": "Tempting, health checks do pull the node from rotation quickly, but they only stop new traffic. They cannot resurrect session data that died with the node."
    }
  ]
}
\`\`\`

Two traps. First, prefer **stateless** services so any node can serve any request; sticky sessions
(pinning a user to one node) are a crutch that breaks when that node dies and complicates deploys.
Push session state to Redis instead. Second, the load balancer itself is a **single point of
failure**. One LB in front of ten app servers just moves the SPOF up a layer. Run it redundant:
active-active pairs, or an anycast VIP fronting multiple LBs, with health-checked failover.

\`\`\`
        anycast VIP (redundant LBs)
              |
        [ L7 load balancer ]  <- TLS terminate, path routing, least-conn
         /        |        \\
     app-1     app-2     app-3   (stateless; session in Redis)
       ^ active healthz probes every 3s; drain on deploy
\`\`\`

Recap: Pick L4 for raw speed or L7 for HTTP-aware routing and TLS, use least-connections when
durations vary, combine active and passive health checks with connection draining, keep services
stateless, and never leave the LB itself un-replicated.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You are picking the balancer tier for a new system. Sort each requirement by the layer it forces you toward.",
  "buckets": [
    "L4 load balancer",
    "L7 load balancer"
  ],
  "items": [
    {
      "label": "Terminate TLS at the edge and route '/api' and '/images' to different pools",
      "bucket": "L7 load balancer",
      "feedback": "Path routing and TLS termination require reading the HTTP request, which only L7 does."
    },
    {
      "label": "Raw packet throughput for a non-HTTP game protocol",
      "bucket": "L4 load balancer",
      "feedback": "L4 forwards TCP/UDP without parsing anything, so it is the fast, cheap, content-blind choice, and the only one that handles non-HTTP traffic."
    },
    {
      "label": "Transparently retry a failed request and inject a tracing header",
      "bucket": "L7 load balancer",
      "feedback": "Per-request features mean the balancer must understand and buffer requests, which is L7 work that costs CPU per request."
    },
    {
      "label": "Pass TLS straight through so the backend does the handshake and the balancer never sees plaintext",
      "bucket": "L4 load balancer",
      "feedback": "Tempting to call TLS an L7 topic, but passthrough is the L4 mode: the encrypted stream flows to the backend untouched."
    }
  ],
  "reveal": "Layer choice is the first decision in the design exercise. After it: least-connections when request durations vary, active plus passive health checks with connection draining on deploys, stateless nodes with session state in Redis, and a redundant balancer tier, because one LB in front of ten servers just moves the single point of failure up a layer."
}
\`\`\`
`.trim()

const reverseProxyGatewayTeach = `
## Cross-cutting concerns live once, at the door

As soon as you have more than a couple of services, you face a question: where do the concerns that
*every* request needs (TLS, auth, rate limiting, routing) actually live? The wrong answer is "in
every service," because then you reimplement auth twelve times and update it twelve times. The edge
tier exists to handle cross-cutting concerns once, in front of everything.

### Reverse proxy, then API gateway

The **reverse proxy** sits in front of your backends and forwards client requests to them. Its jobs
are infrastructural: TLS termination, request routing, connection buffering (absorbing slow clients
so backends are not tied up), response compression (gzip/brotli), and static asset serving. Nginx and
Envoy are the canonical examples. A reverse proxy is content-aware (L7) but does not know about
*your* business or *your* users.

An **API gateway** is a reverse proxy that also owns application-edge policy. On top of routing and
TLS it does: **authentication and authorization** (validate the JWT or session, reject anonymous
calls before they reach a service), **rate limiting and quotas** (per-API-key token buckets),
**request and response transformation** (rewrite headers, translate protocols), and sometimes
**aggregation** (fan one client call out to several services and merge). Kong, AWS API Gateway,
Apigee, and Envoy-plus-control-plane are typical. The value is that a request is authenticated,
rate-limited, and validated once at the door, so internal services can trust it and stay focused on
business logic.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Your gateway authenticates every request before it reaches a service. A teammate now wants to move more logic to the edge since everything flows through it anyway. Sort each concern into where it belongs.",
  "buckets": [
    "Gateway work",
    "Service work"
  ],
  "items": [
    {
      "label": "Validate the JWT and reject anonymous calls",
      "bucket": "Gateway work",
      "feedback": "Token validation is cross-cutting and request-shaped: every request needs the identical treatment, so do it once at the door."
    },
    {
      "label": "Decide whether this user may edit this specific document",
      "bucket": "Service work",
      "feedback": "Tempting to bundle with auth at the edge, but fine-grained authorization needs domain data (owners, roles, sharing state) that the gateway should not own."
    },
    {
      "label": "Enforce per-API-key rate limits",
      "bucket": "Gateway work",
      "feedback": "Quota enforcement is generic edge policy with the same shape for every service behind it."
    },
    {
      "label": "Apply pricing and discount rules to an order",
      "bucket": "Service work",
      "feedback": "Pricing is pure business logic. Parking it at the gateway is the first step toward a gateway that every team must coordinate on."
    },
    {
      "label": "Check that an order total matches its line items",
      "bucket": "Service work",
      "feedback": "Domain validation depends on business meaning, not request shape, so it lives in the owning service."
    }
  ]
}
\`\`\`

**Interview nuance:** The classic follow-up is "what belongs at the gateway versus in the service."
The line: put *cross-cutting, request-shaped* concerns at the gateway (authn, coarse authz, rate
limits, TLS, routing, WAF). Keep *business* concerns in the service (domain validation, fine-grained
authorization like "can this user edit this specific document," pricing rules). Auth token
*validation* is edge work; deciding *what this user may do to this resource* is service work.

### BFFs and the mesh

The **BFF (backend-for-frontend)** pattern is a gateway variant: instead of one general gateway, you
run a thin per-client gateway. The web app talks to a web BFF, the mobile app to a mobile BFF. Each
BFF aggregates and shapes exactly the payload its client wants, so the mobile client is not forced to
over-fetch a web-sized response. BFFs prevent one generic API from being pulled in incompatible
directions by different clients.

For internal, service-to-service concerns, a **service mesh** (Istio, Linkerd) is often the better
tool than the gateway. Each service gets a sidecar proxy (Envoy) that handles mTLS between services,
retries, timeouts, circuit breaking, and traffic-shifting, controlled centrally without changing app
code. Mental model: the **gateway is north-south** (client to system), the **mesh is east-west**
(service to service). Add a **WAF** and **DDoS protection** at the very edge, in front of the
gateway, to filter malicious traffic before it costs you anything.

The failure mode to avoid: the gateway becoming a **logic monolith**. It is tempting to keep adding
"just one more" business rule to the gateway until it holds pricing logic, feature flags, and
per-endpoint special cases, at which point it is a distributed monolith that every team must
coordinate on and a single bottleneck all traffic squeezes through. Keep the gateway thin and
generic; push business logic down into services.

\`\`\`
Internet
  |
[ WAF / DDoS ]            <- filter junk before it costs you
  |
[ API Gateway ]           <- TLS, authn, rate limit, routing (north-south)
  |     |     |
 svcA  svcB  svcC         <- business logic + fine-grained authz
   \\____|____/
    service mesh sidecars <- mTLS, retries, timeouts (east-west)
\`\`\`

Recap: Push TLS, authn, rate limiting, and routing to a thin API gateway (north-south), handle
service-to-service mTLS and retries in a mesh (east-west), use BFFs to shape per-client payloads,
front it all with a WAF, and never let the gateway swell into a business-logic monolith.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A teammate proposes adding discount pricing rules to the API gateway, arguing that every request already flows through it, so it is the natural home. If the team keeps saying yes to ideas like this, where does the architecture end up?",
  "options": [
    {
      "label": "A well-organized shared layer, since the gateway exists to hold shared logic",
      "feedback": "Tempting, the gateway does hold shared concerns, but only cross-cutting, request-shaped ones like TLS, authn, and rate limits. Business rules are not request-shaped."
    },
    {
      "label": "A distributed monolith: one bottleneck every team must coordinate on and all traffic squeezes through",
      "correct": true,
      "feedback": "Right. Each business rule at the gateway couples another team to its release cycle and widens the blast radius of every gateway deploy. Keep it thin and generic; push domain logic into services."
    },
    {
      "label": "No harm, the service mesh will absorb the extra logic",
      "feedback": "The mesh handles east-west plumbing like mTLS, retries, and timeouts between services. It is not a home for business rules either."
    }
  ],
  "reveal": "The edge tier in one line: WAF and DDoS filtering out front, a thin gateway doing TLS, authn, rate limiting, and routing (north-south), a mesh for service-to-service mTLS and retries (east-west), BFFs shaping per-client payloads, and all business logic down in the services. That layering is exactly what the design exercise asks you to draw and defend."
}
\`\`\`
`.trim()

const cdnCachingFoundationsTeach = `
## The highest-leverage tool, and the nastiest bugs

Caching is the highest-leverage performance tool you have: it turns a 50 ms database query into a
sub-millisecond memory hit and takes load off the systems that are hardest to scale. It is also the
source of the nastiest correctness bugs, because a cache is a copy of the truth that can silently go
stale. Phil Karlton's line ("there are only two hard things in computer science: cache invalidation
and naming things") is a joke that ships incidents.

Think of caching as a **stack of layers**, each catching what the layer above missed:

\`\`\`
Browser cache (private, per user)
   |
CDN / edge POP (shared, geographic)
   |
Reverse proxy / gateway cache
   |
App in-memory cache (local, per instance)
   |
Distributed cache (Redis / Memcached, shared)
   |
Database buffer pool (pages in RAM)
\`\`\`

The closer to the user a request is served, the cheaper and faster it is, so you try to satisfy reads
as high up as possible. A product page image should be served from the browser or CDN, never from
your database.

### Write/read policies

- **Cache-aside (lazy loading)** is the default. The app checks the cache; on a miss it reads the DB,
  writes the value into the cache, and returns it. Simple and resilient (a cache outage just means
  slower reads), but the first read after a write is a miss, and you must invalidate on writes or
  serve stale data.
- **Read-through** is cache-aside where the cache library, not your code, loads from the DB on a
  miss. Same semantics, less boilerplate.
- **Write-through** writes to the cache and the DB together on every write, so the cache is always
  fresh, at the cost of write latency and caching data that may never be read.
- **Write-behind (write-back)** writes to the cache immediately and flushes to the DB asynchronously.
  Fast writes, but you risk data loss if the cache dies before the flush.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Four policies just went by. Match each observed behavior to the policy that produces it.",
  "buckets": [
    "Cache-aside",
    "Write-through",
    "Write-behind"
  ],
  "items": [
    {
      "label": "A cache outage means slower reads, not wrong answers",
      "bucket": "Cache-aside",
      "feedback": "The app falls back to the database on every miss, so losing the cache degrades speed, never correctness."
    },
    {
      "label": "Writes pay extra latency, but reads never see stale data",
      "bucket": "Write-through",
      "feedback": "Writing cache and database together keeps them in lockstep, and you pay for it on every write, even for data nobody reads."
    },
    {
      "label": "Writes are fast, but a cache crash can lose acknowledged data",
      "bucket": "Write-behind",
      "feedback": "The database is updated asynchronously, so data that looked committed can vanish if the cache dies before the flush."
    },
    {
      "label": "The first read after a write misses unless you invalidate",
      "bucket": "Cache-aside",
      "feedback": "Tempting to expect the cache to stay current on its own, but lazy loading only fills entries on reads, so a write leaves a gap until the next miss."
    }
  ]
}
\`\`\`

### Invalidation, the hard part

Three strategies, usually combined. **TTL** expires entries after N seconds; simple and self-healing,
but you serve stale data for up to the TTL, so you tune TTL against how stale you can tolerate.
**Explicit purge** deletes or updates the entry when the underlying data changes; precise but
requires the write path to know every cache key it affects. **Event-driven** invalidation publishes a
change event (via Kafka or a CDC stream) that fan-out invalidates caches; this scales to many caches
but is more machinery. A powerful pattern is **stale-while-revalidate**: serve the stale value
immediately while asynchronously refreshing it, which hides refresh latency and keeps you serving
during a backend blip. Guard hot keys against a **cache stampede** (thundering herd): when a popular
key expires and a thousand requests all miss and hit the DB at once, use request coalescing
(single-flight), a short lock, or jittered TTLs so they do not all expire together.

### The CDN

The CDN is the caching layer nearest the user: a network of **anycast POPs** worldwide that cache
your static (and cacheable dynamic) content near users, cutting latency and offloading your origin.
Key knobs: the **cache key** (usually URL plus a chosen subset of headers/query params; include too
much and hit rate collapses, include user-specific fields and you leak data), **Cache-Control**
headers (\`max-age\`, \`s-maxage\` for shared caches, \`immutable\` for content that never changes),
and **cache busting**. The clean way to invalidate a CDN asset is not to purge, it is to **version
the URL**: ship \`app.9f3a1c.js\` (a content fingerprint) with a one-year \`immutable\` TTL, and when
the file changes the filename changes, so clients fetch the new URL and the old one just ages out.
Purge APIs exist for emergencies, but fingerprinting avoids the need.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You put the CDN in front of everything, and 'GET /account', each user's own dashboard, gets cached with 's-maxage=300' like any other page. What is the failure?",
  "options": [
    {
      "label": "Dashboards go stale for up to five minutes",
      "feedback": "Tempting, staleness is the usual caching worry, but a shared cache holding per-user content has a far worse failure mode than being out of date."
    },
    {
      "label": "The CDN serves Alice's account page to Bob",
      "correct": true,
      "feedback": "Right. A shared cache stores one copy per cache key, so the first user's personalized response becomes everyone's response. Authenticated pages need 'Cache-Control: private, no-store' at shared layers."
    },
    {
      "label": "The hit rate collapses because every user becomes a separate cache key",
      "feedback": "That only happens if something per-user, like 'Vary: Cookie', is in the key. Here nothing user-specific keys the entry, which is exactly why users receive each other's pages."
    }
  ]
}
\`\`\`

**Interview nuance:** The correctness landmine is caching **personalized or authenticated**
responses. Never let a shared cache (CDN or proxy) store a response that contains one user's data, or
you will serve Alice's account page to Bob. Mark those \`Cache-Control: private, no-store\`, and be
careful with the \`Vary\` header: \`Vary: Cookie\` technically keys per user but destroys hit rate,
so the right move is usually to not cache authenticated responses at the shared layer at all and
cache only truly public assets.

Recap: Cache as high up the browser-CDN-proxy-app-Redis-DB stack as you can, default to cache-aside,
invalidate with a mix of TTL, explicit purge, and events plus stale-while-revalidate, version CDN
URLs instead of purging, defend hot keys against stampedes, and never let a shared cache store
authenticated responses.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your logo file shipped with a rendering bug. It is cached at the CDN under '/static/logo.png' with a one-year 'max-age'. What is the cleanest fix?",
  "options": [
    {
      "label": "Call the CDN purge API for that path",
      "feedback": "It works in an emergency, but purges are per-provider, easy to miss a layer with, and do nothing about copies already sitting in browser caches for a year."
    },
    {
      "label": "Drop the TTL to sixty seconds going forward",
      "feedback": "New headers only apply to future fetches. Every cache already holding the old file keeps serving it until the original year runs out."
    },
    {
      "label": "Ship the fixed file at a new fingerprinted URL and reference that",
      "correct": true,
      "feedback": "Right. Content-fingerprinted names like 'logo.8c2f91.png' with long 'immutable' TTLs make invalidation unnecessary: change the content, change the URL, and the stale copy ages out unreferenced."
    }
  ],
  "reveal": "The caching story to carry into the design exercise: serve each read as high in the browser-CDN-proxy-app-Redis stack as you can, default to cache-aside, invalidate with TTLs plus purges plus events and stale-while-revalidate, defend hot keys from stampedes with single-flight and jittered TTLs, version CDN URLs instead of purging, and never let a shared cache store an authenticated response."
}
\`\`\`
`.trim()

const latencyPercentilesTeach = `
## Three numbers, one law, and a lying average

Three numbers describe how a system behaves under load, and confusing them is the fastest way to
sound junior. **Latency** is how long one request takes. **Throughput** is how many requests complete
per second (QPS). **Concurrency** is how many requests are in flight at once. They are not
independent, and the glue between them is Little's Law.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "100 requests hit your service: 99 finish in 10 ms and one takes 2000 ms. Your dashboard shows only the average latency. What does it report, and what should you conclude?",
  "options": [
    {
      "label": "About 10 ms, and the system is healthy",
      "feedback": "That is the median, not the mean. A single 2000 ms outlier drags the average far above the typical request."
    },
    {
      "label": "About 30 ms, and 30 ms means the system is healthy",
      "feedback": "The arithmetic is right, and that is exactly the trap: the average looks fine while 1 in 100 users just waited two full seconds."
    },
    {
      "label": "About 30 ms, but that average is hiding a 2-second experience for 1 percent of users",
      "correct": true,
      "feedback": "Right. (99 x 10 + 2000) / 100 is about 30 ms, yet what users feel lives in the tail. That is why you report percentiles like 'p99' instead of means."
    }
  ]
}
\`\`\`

### Averages lie

Imagine 100 requests, 99 at 10ms and one at 2000ms. The mean is 30ms, which sounds healthy, but 1% of
your users just waited two seconds. The number that matters is a **percentile**: p50 (median) is the
typical request, p99 is the request that only 1 in 100 users beats, and p99.9 is the tail your
biggest, most active users hit constantly. Report p50, p95, p99, and p99.9, and treat **p99 as the
user number**, because a heavy user who makes 100 requests per page load will almost certainly hit
your p99 on every single page.

### Fan-out makes the tail common

Tail latency gets worse, not better, as you scale, because of **fan-out**. If one API request fans
out to 20 backend calls and you must wait for all of them, your response is as slow as the slowest of
the 20. Even if each backend has a clean 1% chance of a slow (p99) response, the probability that at
least one of 20 is slow is 1 minus 0.99^20, roughly 18%. So a backend p99 becomes a frontend p82.
Fan-out turns rare tails into common ones, which is why Google's "tail at scale" work pushes
techniques like hedged requests (send a duplicate after the p95 mark, take the first to answer).

\`\`\`cswidget
{
  "type": "calc",
  "title": "Fan-out tail explorer",
  "predictPrompt": {
    "question": "Each of 20 backends misses its p99 (runs slow) only 1% of the time. What fraction of user requests hit at least one slow backend call?",
    "options": [
      "About 1%",
      "About 5%",
      "About 18%",
      "Nearly half"
    ]
  },
  "workedExample": "At the initial values, a 0.01 miss probability across 20 backends, the chance every call dodges its tail is 0.99 to the 20th power, about 81.8%, so about 18.2% of requests hit at least one slow call: your per-service p99 is a p82 experience for the user. Drag the fan-out toward 50 and watch the sparkline; the slow fraction climbs to nearly 40%.",
  "inputs": [
    {
      "kind": "slider",
      "id": "p_slow",
      "label": "Per-service p99 miss probability",
      "min": 0.001,
      "max": 0.05,
      "scale": "log",
      "initial": 0.01
    },
    {
      "kind": "slider",
      "id": "n_services",
      "label": "Backend calls per request (fan-out)",
      "min": 1,
      "max": 50,
      "scale": "linear",
      "step": 1,
      "initial": 20
    }
  ],
  "outputs": [
    {
      "id": "all_fast",
      "label": "Chance every call is fast (your effective percentile)",
      "expr": "pow(1 - p_slow, n_services)",
      "format": "percent"
    },
    {
      "id": "any_slow",
      "label": "Requests hitting at least one slow call",
      "expr": "1 - all_fast",
      "format": "percent",
      "sparkline": {
        "over": "n_services"
      }
    }
  ],
  "caption": "Fan-out turns a rare per-service tail into the common case: the user experiences the slowest of N calls."
}
\`\`\`

### Little's Law

\`L = arrival_rate x latency\`, where L is the average number of requests concurrently in the system.
If you serve 2000 QPS and each request takes 50ms (0.05s), then on average \`2000 x 0.05 = 100\`
requests are in flight, so you need at least 100 units of concurrency (threads, connections, or async
slots). Turn it around: if you have a fixed pool of 200 workers and latency creeps to 200ms, your
ceiling is \`200 / 0.2 = 1000 QPS\`, no matter how much traffic arrives. Little's Law is how you size
pools and how you spot that rising latency is silently capping throughput.

**Interview nuance:** When asked "how many threads/connections do you need," reach for Little's Law
out loud. \`concurrency = QPS x latency\` is a one-line answer that signals you can size a system
rather than guess.

### The measurement trap: coordinated omission

Many load testers send the next request only after the previous one returns. When the server stalls,
the tester stalls with it and simply fails to send the requests that would have piled up, so those
never get timed. The result badly understates the tail. Fix it by measuring against intended send
time (record when a request *should* have started), or use tools like \`wrk2\` or HdrHistogram that
correct for it. Always aggregate with histograms, not by averaging per-node p99s, because you cannot
average percentiles.

Recap: Averages hide the tail, p99 is the number users feel and fan-out makes it common, and Little's
Law (L = arrival_rate x latency) sizes your concurrency and exposes when latency is capping
throughput.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You run a fixed pool of 200 workers and normally serve 2000 QPS at 50 ms per request. A slow dependency pushes latency to 200 ms while arrivals stay at 2000 QPS. What happens?",
  "options": [
    {
      "label": "Nothing structural, every request is just slower",
      "feedback": "Tempting, but concurrency is finite. Little's Law says in-flight work equals arrival rate times latency, and that product now exceeds your 200 workers."
    },
    {
      "label": "Throughput caps near 1000 QPS and the excess queues or fails",
      "correct": true,
      "feedback": "Right. 200 workers divided by 0.2 seconds is a 1000 QPS ceiling, half your traffic. Rising latency silently converts into falling throughput once the pool saturates."
    },
    {
      "label": "Throughput rises because more requests are in flight at once",
      "feedback": "More requests in flight is higher concurrency, not higher throughput. The pool is fixed at 200, so extra arrivals wait in queues or get shed."
    }
  ],
  "reveal": "The lesson in three moves for the design exercise: quote 'p50', 'p99', and 'p99.9' instead of averages because fan-out turns rare tails into the common case, size pools with Little's Law (concurrency equals QPS times latency), and trust only measurements that dodge coordinated omission by timing from intended send time and aggregating with histograms."
}
\`\`\`
`.trim()

const resiliencePrimitivesTeach = `
## How one slow dependency becomes an outage

A distributed system fails one dependency at a time, and the way one failure becomes an outage is
almost always the caller mishandling a slow or broken downstream. The client-side call policy is your
primary defense, and it has four moving parts: timeouts, retries, circuit breakers, and isolation.

### Timeouts

Every network call must have one. The default in most HTTP clients is infinite or 30+ seconds, which
is a trap: when a downstream stalls, your threads (or async slots) block waiting, the pool drains,
and you stop serving healthy requests too. This is the classic cascading failure. Set the timeout
from the downstream's SLO (for example, if it promises p99 of 50ms, time out at maybe 150ms), and
**propagate a deadline** down the call chain. If the top-level request has a 300ms budget and 200ms
is already spent, the next hop should be told it has 100ms left, not handed a fresh 150ms. gRPC
deadlines and context propagation do this for you; without it, downstreams do work for a client that
already gave up.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A popular service hiccups for two seconds and comes back up. Thousands of clients had a request fail, and every client retries the instant its call errors, with no delay. What happens to the recovering service?",
  "options": [
    {
      "label": "It recovers normally; the retries simply succeed on the second attempt",
      "feedback": "Tempting, because each individual retry looks harmless and usually would succeed. But every client retrying at the same instant multiplies load at the exact moment the service is weakest."
    },
    {
      "label": "It gets hit by a synchronized wave of retries and may be knocked right back down",
      "correct": true,
      "feedback": "Right. This is a retry storm: lockstep retries multiply load onto a recovering service and can keep it down. That is why retries need exponential backoff, jitter to break the synchronization, and a retry budget."
    },
    {
      "label": "Retries have no effect on the service either way",
      "feedback": "Retries are real requests. Each one adds load, and thousands arriving in lockstep can double or triple traffic at the worst possible moment."
    }
  ]
}
\`\`\`

### Retries

A retry can turn a transient blip into a success, but only under two conditions. First, the operation
must be **idempotent or the error safely retryable** (a timeout on a non-idempotent POST might have
already charged the card). Use idempotency keys so a retried write dedupes. Second, retries must have
**exponential backoff with jitter**. Without backoff, thousands of clients retry in lockstep the
instant a service hiccups, creating a synchronized thundering herd that keeps the service down (a
"retry storm"). Backoff spreads them out; jitter (randomizing the delay) breaks the synchronization.
Cap the total with a **retry budget**: allow retries only up to, say, 10% of request volume, so a
widespread failure cannot multiply your load 3x and turn a partial outage into a total one.

**Interview nuance:** "Retries make it more reliable" is only half true. The senior answer names the
failure mode retries cause (retry amplification) and the three guards: idempotency,
backoff-with-jitter, and a retry budget.

### Circuit breaker

When a downstream is genuinely down, retrying at all is waste that adds load. A circuit breaker
tracks the recent failure rate and has three states. **Closed:** calls flow normally. When failures
cross a threshold (for example 50% of the last 20 calls), it trips to **Open:** calls fail fast
immediately without touching the network, giving the downstream room to recover and freeing your
threads. After a cool-down it goes **Half-open:** it lets a trickle of trial calls through, and if
they succeed it closes, if they fail it re-opens. This converts a slow, thread-eating failure into a
fast, cheap one.

### Isolation and fallback

**Bulkheads** give each dependency its own bounded connection pool or thread pool, so one slow
dependency drowns only its own bulkhead instead of every thread in the process (the pattern that
named the Hystrix library). When a call fails fast, **degrade gracefully**: serve a cached value, a
default, or a partial response rather than an error.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You have just met four primitives in quick succession. Match each situation to the one that addresses it.",
  "buckets": [
    "Timeout with a propagated deadline",
    "Circuit breaker",
    "Bulkhead"
  ],
  "items": [
    {
      "label": "A downstream stalls and your threads sit blocked waiting on it indefinitely",
      "bucket": "Timeout with a propagated deadline",
      "feedback": "A timeout frees the waiting thread, and the propagated deadline stops downstreams from doing work for a caller that already gave up."
    },
    {
      "label": "A dependency is clearly down, yet every request still pays a full timeout before failing",
      "bucket": "Circuit breaker",
      "feedback": "An open breaker fails fast without touching the network, freeing your threads instantly and giving the dependency room to recover."
    },
    {
      "label": "One slow dependency drains the shared connection pool that every other dependency uses",
      "bucket": "Bulkhead",
      "feedback": "Bulkheads give each dependency its own bounded pool, so a stall drowns only its own compartment instead of the whole process."
    },
    {
      "label": "A request arrives at the next hop with only 40ms of its 300ms budget left",
      "bucket": "Timeout with a propagated deadline",
      "feedback": "Deadline propagation tells the next hop it has 40ms, so it fails fast instead of spending a fresh full timeout on work that will be discarded."
    }
  ]
}
\`\`\`

\`\`\`
Closed --failures over threshold--> Open --cool-down--> Half-open --trial ok--> Closed
   ^                                                         |
   +---------------- trial fails ----------------------------+
\`\`\`

Recap: Give every call a propagated deadline, retry only idempotent errors with backoff, jitter, and
a budget, trip a circuit breaker to fail fast when a dependency is down, and isolate with bulkheads
so one slow dependency cannot drain the whole caller.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your team adds aggressive retries to every call but skips timeouts, jitter, and idempotency keys 'for now'. The payment downstream slows during a deploy. What is the most likely outcome?",
  "options": [
    {
      "label": "Reliability improves, since each retry is another chance to succeed",
      "feedback": "Tempting, and true for a single transient blip. But under a real slowdown, unguarded retries amplify load onto the struggling service, and retrying a non-idempotent payment can duplicate the charge."
    },
    {
      "label": "Threads pile up behind the slow calls, retries multiply the load, and some customers get charged twice",
      "correct": true,
      "feedback": "Right. Without timeouts the pool drains behind the stalled calls, without backoff and a budget the retries amplify load, and without idempotency keys a retried charge can execute twice. The primitives only work as a set."
    },
    {
      "label": "Nothing changes until the downstream fully crashes",
      "feedback": "A slow dependency is often worse than a dead one: calls do not fail, they hang, quietly eating threads while the pool drains and healthy requests starve."
    }
  ],
  "reveal": "Carry this into the design exercise: for the flaky dependency, state the timeout and propagated deadline first, then which errors you retry and with what backoff, jitter, and budget, then the breaker thresholds, and finally the bulkhead and the fallback you serve when calls fail fast."
}
\`\`\`
`.trim()

const backpressureSheddingTeach = `
## What happens when traffic exceeds capacity

Every system has a maximum sustainable throughput. The question is what happens when arriving traffic
exceeds it. The wrong answer is "queue it all and hope," because that quietly trades a latency
problem for a crash. The right answer is a deliberate overload strategy built from backpressure,
bounded queues, and load shedding.

### Backpressure and the unbounded-queue trap

**Backpressure** is the signal that flows upstream telling producers to slow down. In a well-designed
pipeline, a full downstream buffer stops the upstream from producing, all the way back to the source.
TCP flow control does this at the socket level; reactive stream libraries (Reactive Streams, gRPC
flow control) do it at the application level; a bounded queue does it implicitly, because a producer
that cannot enqueue must block or drop. The enemy of backpressure is the **unbounded queue**. It
looks like it is absorbing the spike, but it is really accumulating latency (a request that waits 30
seconds in a queue is useless, the user left) and memory, until the process runs out of heap and
OOM-crashes, taking down everything including the in-flight work that was fine. Bound every queue.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Two identical services have the same average service time. One runs at 70% utilization, the other at 99%. How do their average latencies compare?",
  "options": [
    {
      "label": "About 40% higher at 99%, roughly in line with the extra load",
      "feedback": "Tempting, because it assumes latency grows linearly with load. Queueing does not work that way: wait time scales like '1 / (1 - rho)', which blows up as utilization approaches 100%."
    },
    {
      "label": "Dramatically higher at 99%, tens of times worse, because wait time explodes near saturation",
      "correct": true,
      "feedback": "Right. With time in system scaling like '1 / (1 - rho)', 70% utilization costs roughly 3x the service time while 99% costs about 100x. The last few points of utilization are bought with unbounded latency."
    },
    {
      "label": "Essentially identical, since neither service is over 100% capacity",
      "feedback": "Under 100% the queue does not grow forever, but arrivals are bursty, so requests still queue, and the closer you run to saturation, the longer each one waits."
    }
  ]
}
\`\`\`

### Why you cannot run hot

As utilization (rho) approaches 100%, queue length and wait time do not rise linearly, they explode.
A rough mental model from M/M/1 queues: average time in system scales like \`1 / (1 - rho)\`. At 50%
utilization latency is roughly 2x the service time; at 90% it is 10x; at 99% it is 100x. This is why
you provision to run at 60 to 70% and treat the last 30% as headroom for spikes, not capacity to
sell. A system run at 95% "efficient" utilization has a brutal tail.

**Interview nuance:** If asked "why not just run at 100% utilization, isn't that efficient," answer
with the 1/(1-rho) intuition. Utilization is bought with latency, and near saturation the price is
unbounded.

### Load shedding: reject early, on purpose

**Load shedding (admission control)** is the deliberate choice to reject some work so the rest
survives. When you are over capacity, it is far better to reject early with a **429** or **503** at
the edge than to accept a request, let it sit in a queue, and time it out after doing partial work.
Rejecting early is cheap and preserves latency for accepted requests; queue-and-timeout burns
capacity on work nobody will use (this is "goodput" collapsing even as "throughput" stays busy). Shed
at the front door, before you have invested resources.

Do it with real tools: **concurrency limits** (cap in-flight requests, the most robust knob because
it directly bounds Little's Law's L), **token-bucket rate limiters** (smooth bursts to a sustainable
rate), and **adaptive concurrency** (algorithms like Netflix's that watch latency and dynamically
lower the limit as latency rises, no hand-tuned magic number). Pair shedding with **prioritization**:
shed low-value traffic first (batch, retries, free tier) so critical traffic (checkout, paying users,
health of the system) survives. And **drop stale work**: if a request has already exceeded its
deadline while queued, discard it instead of processing it, because the caller has already given up.

\`\`\`
arrivals --> [admission control] --accept--> [bounded queue] --> workers
                    |                              |
                  reject                       drop if stale/
                429/503                        past deadline
\`\`\`

Recap: Bound every queue and let backpressure propagate, run below saturation because latency
explodes as utilization nears 100%, and when overloaded reject early with 429/503, prioritize
critical traffic, and drop stale requests instead of letting an unbounded queue hide the overload
until an OOM.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Your ingestion service is in the middle of a spike. Decide the fate of each request.",
  "buckets": [
    "Accept and process",
    "Reject at admission with 429",
    "Drop from the queue"
  ],
  "items": [
    {
      "label": "A critical write that arrives while you are under the in-flight cap",
      "bucket": "Accept and process",
      "feedback": "Within capacity, work flows normally. Overload controls should be invisible until you actually need them."
    },
    {
      "label": "A free-tier batch upload that arrives while you are over the cap",
      "bucket": "Reject at admission with 429",
      "feedback": "Reject early, before investing any resources, and shed low-value traffic first so critical traffic survives."
    },
    {
      "label": "A queued request whose deadline expired while it waited",
      "bucket": "Drop from the queue",
      "feedback": "The caller has already given up. Processing it burns capacity on work nobody will use, which is exactly how goodput collapses while throughput looks busy."
    },
    {
      "label": "A request over the cap that you could park in an unbounded buffer instead",
      "bucket": "Reject at admission with 429",
      "feedback": "Tempting to queue and hope, but the unbounded buffer silently accumulates latency and heap until an OOM takes down everything. A fast 429 with a retry hint is kinder."
    }
  ],
  "reveal": "In the design exercise, make these choices explicit: name the bound on every queue, the admission limit and exactly what gets a '429', the utilization you provision for and why, and which traffic classes you shed first when the spike hits."
}
\`\`\`
`.trim()

const concurrencyModelsTeach = `
## One question decides it: CPU-bound or IO-bound?

How a server maps incoming connections onto CPU work is one of the oldest and most consequential
design choices, and it is entirely governed by one question: is the workload CPU-bound or IO-bound?

### Thread-per-request

Classic Apache prefork, Tomcat's default, most synchronous frameworks: a thread (or process) per
in-flight request. Its great virtue is simplicity: you write straight-line blocking code
(\`result = db.query(...)\`), the OS scheduler handles switching, and stack traces are clean. The
cost is that each thread carries a real price. A default Linux thread reserves around 1MB of stack,
so 10,000 threads is roughly 10GB of address space before doing any work, and the scheduler pays
context-switch overhead that grows with thread count. The killer is **blocking IO**: when a thread
waits on a slow database or a downstream API, it is parked doing nothing but still consuming a
thread. If your workload is 90% waiting on IO, your threads sit idle while CPU is nearly free, and
you exhaust the thread pool (and memory) long before the CPU saturates. That is why a
thread-per-request box can fall over at a few thousand concurrent connections while showing 10% CPU.

### Event loop

Node.js, Nginx, Netty, Redis, Python asyncio (Go's runtime is a hybrid): one thread (or one per core)
multiplexes thousands of sockets using an OS readiness API, **epoll** on Linux or **kqueue** on
BSD/macOS, which lets the kernel say "these 50 of your 10,000 sockets have data ready" in one cheap
call. Idle connections cost only a file descriptor and a little kernel memory, not a thread, so a
single event-loop process holds hundreds of thousands of mostly-idle connections. This is precisely
what IO-bound fan-out needs: an API gateway waiting on 20 backends per request spends almost all its
time waiting, and the event loop turns that waiting into near-free multiplexing.

But the event loop has one absolute rule: **never block the loop**. Because one thread drives
everything, any single long operation (a synchronous CPU task, a blocking file read, a
\`JSON.parse\` of a 50MB payload) freezes every other connection until it finishes. A CPU-heavy image
transcode on the event loop serializes the whole server behind it. The fix is to offload CPU work to
a **worker pool** sized to the number of cores, keeping the loop free to do IO.

**Interview nuance:** The crisp rule is "event loops are for waiting, thread/worker pools are for
computing." CPU-bound work does not benefit from an event loop because there is nothing to wait on;
you are limited by cores, so you want exactly one busy worker per core, not async.

### C10k and the OS limits

The **C10k / C10M problem** names the challenge of holding 10,000 (or 10 million) concurrent
connections. It is unsolvable with one blocking thread per connection and requires non-blocking IO
plus tuned OS limits:

- **File descriptors:** every socket is an fd, and the default \`ulimit -n\` is often 1024. Raise
  \`nofile\` (and system-wide \`fs.file-max\`) to hundreds of thousands.
- **Ephemeral ports:** a single source IP connecting to one destination IP:port is limited to roughly
  28,000 outbound connections, so a proxy fanning out to one backend runs out of ports. Fix with
  connection pooling and spreading across multiple destination IPs/ports.
- **Memory per thread:** the ~1MB stack per thread that caps thread-per-request; event loops sidestep
  it by not having a thread per connection.

\`\`\`
Thread-per-request:   [req]->thread->BLOCK on IO (idle, 1MB)   ... caps at ~thousands
Event loop:           epoll -> 1 thread -> 100k idle sockets   ... never block it
                                     \`-> CPU task? offload to worker pool (N=cores)
\`\`\`

Recap: CPU-bound work wants a worker pool sized to cores, IO-bound fan-out wants an event loop
multiplexing many connections via epoll/kqueue, never block the loop with CPU or blocking IO, and
past ~10k connections you must raise fd limits, pool connections around the ephemeral-port ceiling,
and avoid the per-thread memory wall.
`.trim()

export const systemDesignLevel1: DesignLevel = {
  id: 1,
  slug: "foundations",
  title: "Level 1: Foundations & Mental Models",
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
              "**8-10, the app tier:** app server validates the session token/JWT (failure: 401), then checks the app cache (Redis) before the DB. Hit: ~1ms, skip the DB. Miss: query the DB, then populate Redis (cache-aside). This cache is the real short-circuit for a logged-in user. The database plus downstream services are the authoritative read and fan-out, each hop with its own timeout and ideally a circuit breaker.",
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
              "**Database:** authoritative product and inventory data behind Redis (cache-aside) and read replicas; writes (inventory decrement) go to the primary.",
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
        {
          id: "sd-l1-serialization-compression",
          title: "Serialization, Content Negotiation & Compression",
          summary:
            "Choose format and codec by bottleneck (JSON+Brotli public, Protobuf+zstd internal), skip compressing tiny payloads, and keep schemas evolvable with field-tag discipline.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["serialization", "api-design", "performance", "schema-evolution"],
          teach: {
            markdown: serializationCompressionTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-serialization-compression-apply",
            prompt:
              "Choose a serialization format and compression scheme for a high-fan-out internal API and for a public mobile API, and justify each against JSON, Protobuf, Avro, Thrift, and gzip, Brotli, zstd on the size, CPU, and schema-evolution axes.",
            thinkAbout: [
              "Where is the bottleneck: bandwidth (mobile, cross-region) or CPU (very high QPS)?",
              "How does each format handle schema evolution when producers and consumers deploy independently?",
              "How do you pick a compression codec via Accept-Encoding without paying tail latency on large payloads?",
            ],
            modelAnswerOutline: [
              "Assumptions: two surfaces, a chatty internal service mesh at very high QPS, and a public API serving mobile clients on slow, metered networks.",
              "**Internal high-fan-out API -> Protobuf with zstd.** You own both ends and the bottleneck is CPU and bytes at high QPS, so a compact binary format matters. Protobuf is small (tag-numbered fields, no repeated field names), fast to encode/decode, and IDL-driven so it pairs with gRPC and generated stubs. zstd adds strong compression at low CPU with tunable levels. Schema evolution via Protobuf rules: add optional fields, never renumber or reuse tags, mark removed tags `reserved`, so rolling deploys with mixed versions interoperate. (Avro would be the choice specifically for Kafka pipelines, where a schema registry shines.)",
              "**Public mobile API -> JSON with Brotli, plus `Vary: Accept-Encoding`.** The bottleneck is bandwidth and the consumers are external, so debuggability and ubiquity matter. JSON is universal and `curl`-able; Brotli beats gzip on text over HTTPS to browsers and mobile clients, negotiated via Accept-Encoding. `Vary: Accept-Encoding` keeps a shared cache from serving a Brotli body to a gzip-only client. Schema evolution relies on tolerant readers and additive-only changes.",
              "**Compression discipline on both:** a size threshold (roughly 1KB) below which compression is skipped, because compressing tiny payloads is a net CPU loss, and never re-compress already-compressed assets (images). For very large responses watch tail latency, since the compressor runs before the first byte.",
              "Common wrong turn: forcing Protobuf onto the public browser/mobile API for 'speed,' paying a large developer and debugging cost and losing `curl`-ability for byte savings the network barely needed, or compressing 200-byte responses and adding CPU for no gain.",
            ],
          },
          practice: {
            id: "sd-l1-serialization-compression-practice",
            prompt:
              "Design the serialization and schema-evolution strategy for a Kafka-based event platform at LinkedIn scale, where thousands of producers emit events consumed by hundreds of independently-deployed consumers, producers and consumers upgrade on their own schedules, and a bad schema change must never break downstream consumers. Choose the format and the governance.",
            thinkAbout: [
              "What lets a consumer decode an event written by a producer it has never coordinated with?",
              "Where is the enforcement point that blocks a breaking schema change before any event is produced?",
              "Why does raw JSON on Kafka fail this requirement even though it is flexible?",
            ],
            modelAnswerOutline: [
              "Assumptions: thousands of producers, hundreds of consumers, fully independent deploys, events durable in Kafka for days, zero tolerance for a schema change silently breaking a consumer.",
              "**Format: Avro with a central Schema Registry** (essentially LinkedIn's own design; Confluent Schema Registry is the productized version). Avro's schema-on-read model and registry integration fit streaming: each message carries a small schema id, the consumer fetches the writer schema from the registry, and Avro resolves it against the consumer's reader schema. Producers and consumers do not deploy in lockstep.",
              "**Why not JSON:** at this volume JSON's verbosity wastes storage and bandwidth across billions of events, and it has no enforced schema, so a bad producer change is discovered only when a consumer crashes. **Why Avro over Protobuf:** the registry-plus-schema-resolution model is the standard, well-tooled fit for Kafka; Protobuf also works but Avro is the canonical choice in this ecosystem.",
              "**Governance (the real protection):** the Schema Registry enforces a compatibility mode per topic, typically BACKWARD (new schema can read old data) or FULL. On registration, a proposed schema is checked against the existing one and rejected if it would break compatibility (removing a field a consumer needs, changing a type). The bad change is blocked at publish time, before any event is produced. Allowed evolution is additive: add fields with defaults, never change or reuse a field's identity.",
              "**Operational:** consumers use tolerant resolution (unknown fields ignored, new data has defaults), and the registry's version history plus per-topic compatibility gives an auditable contract across teams.",
              "Common wrong turn: raw JSON on Kafka with no registry (no enforcement, breakage found in production), or forcing global lockstep upgrades of thousands of producers and consumers, impossible at this scale. Registry-enforced Avro compatibility is what lets everyone deploy independently and safely.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l1-m3",
      title: "Edge, Proxies & Caching Foundations",
      description:
        "Design the front half of any system: redundant load balancing over a stateless tier, an API gateway that owns cross-cutting concerns, and a full browser-to-database caching stack with a defensible invalidation strategy.",
      lessons: [
        {
          id: "sd-l1-load-balancing",
          title: "Load Balancing: L4 vs L7 & Health Checks",
          summary:
            "Pick L4 for raw speed or L7 for HTTP-aware routing and TLS, use least-connections for variable durations, and combine health checks with connection draining.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["load-balancing", "health-checks"],
          teach: {
            markdown: loadBalancingTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l1-load-balancing-apply",
            prompt:
              "Place and configure load balancing for a stateless API tier and explain how a dead instance is detected and drained.",
            thinkAbout: [
              "What does L4 vs L7 change about routing, TLS, and content awareness?",
              "Which algorithm fits variable request durations?",
              "How are active vs passive health checks and connection draining used?",
            ],
            modelAnswerOutline: [
              "Assume a stateless HTTP/JSON API tier of about 12 instances behind one virtual IP, serving a mix of fast reads and slower search calls, with rolling deploys several times a day.",
              "**L7 load balancer** (Envoy or an AWS ALB): chosen for TLS termination at the edge, path-based routing (`/v1/search` may go to a differently sized pool than `/v1/read`), and per-request retries on idempotent GETs. TLS terminates at the LB; inside the VPC either speak plain HTTP on a trusted network or re-encrypt for zero-trust. For a non-HTTP protocol or millions of PPS with minimal latency, drop to an L4 NLB instead, accepting no path routing.",
              "**Algorithm: least connections, not round robin**, precisely because request durations vary: a 2-second search must not get round-robined onto a node already busy with three other searches while a neighbor sits idle. Least-connections tracks in-flight work and steers around hot nodes.",
              "**Failure detection:** active health checks probe `GET /healthz` every 3 seconds; after 3 consecutive failures the node is removed from rotation and must pass 2 checks to return. `/healthz` checks real readiness (DB pool reachable), not just process-up. Passive checks eject a node returning 5xx or timing out on live traffic immediately rather than waiting for the next probe.",
              "**Deploys: connection draining.** The LB stops routing new requests to the target, waits up to 30 seconds for in-flight requests to complete, then removes it; the app cooperates with graceful shutdown (stop accepting, drain, exit). This gives zero-downtime rolling deploys.",
              "**Statelessness and LB redundancy:** any node serves any request, so no sticky sessions; session state lives in Redis. The LB itself is redundant (active-active ALB across AZs, or anycast VIP over multiple Envoys) so it is not the new single point of failure.",
              "Common wrong turn: turning on sticky sessions 'to be safe,' which reintroduces state and breaks graceful failover, or leaving a single LB as an un-replicated SPOF.",
            ],
          },
          practice: {
            id: "sd-l1-load-balancing-practice",
            prompt:
              "Design the load-balancing tier for Stripe's payments API at roughly 100k requests per second, global, where mis-routing a request during a deploy can double-charge a customer. Explain how you route, health-check, and deploy without dropping or duplicating a single in-flight payment.",
            thinkAbout: [
              "Which layer actually guarantees no double charge: the load balancer or the application?",
              "When is it safe for the LB to auto-retry a payment request?",
              "How do you deploy so in-flight charges complete and a bad canary is contained?",
            ],
            modelAnswerOutline: [
              "Assumptions: global traffic, strict correctness (no dropped or duplicated charges), p99 latency budget in the low hundreds of ms, and frequent deploys.",
              "**Global entry:** anycast so clients hit the nearest point of presence, terminating TLS at regional L7 load balancers (Envoy). Anycast plus health-checked withdrawal means a failing region is pulled from BGP and traffic shifts to the next-closest region without client changes. Within a region, active-active Envoy behind a shared VIP so no single LB is a SPOF.",
              "**Routing:** L7 on path and API version. For the payment-execution path use least connections because charge calls have variable latency (some hit slow card networks).",
              "**The key insight: do NOT rely on the LB to prevent duplicates.** Duplication is solved at the application layer with idempotency keys: every charge carries a client-supplied key and the service dedupes on it, so even if the LB retries or a request lands twice during failover, the customer is charged once. The LB is for availability; idempotency is for correctness. Only enable automatic LB retries on requests carrying an idempotency key.",
              "**Health checks:** active `GET /healthz` every 2 to 3 seconds with a low failure threshold, plus passive ejection on 5xx or timeout, so a node processing payments incorrectly is removed fast.",
              "**Deploys:** connection draining with a generous timeout so in-flight charges complete, plus graceful shutdown. Deploy region by region (or canary a small weighted slice via weighted routing) and watch error and latency SLOs before widening; a misbehaving canary's weight goes back to zero instantly.",
              "Common wrong turn: trusting the load balancer to guarantee exactly-once delivery. Networks retry and LBs fail over; only application-level idempotency makes double-charging impossible, and the LB design just has to avoid dropping in-flight work via draining.",
            ],
          },
        },
        {
          id: "sd-l1-reverse-proxy-gateway",
          title: "Reverse Proxy, API Gateway & the Edge",
          summary:
            "Push cross-cutting concerns (TLS, authn, rate limits, routing) to a thin gateway, shape per-client payloads with BFFs, and keep business logic in the services.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["gateway", "edge", "proxy"],
          teach: {
            markdown: reverseProxyGatewayTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l1-reverse-proxy-gateway-apply",
            prompt:
              "Design the edge tier for a microservices backend: list the responsibilities you push to the gateway and why.",
            thinkAbout: [
              "Which cross-cutting concerns belong at the gateway vs in the service?",
              "What is the BFF pattern for, and when does a service mesh handle internal concerns?",
              "How do you keep the gateway from becoming a logic monolith?",
            ],
            modelAnswerOutline: [
              "Assume roughly 20 backend microservices, web and mobile clients, and a requirement that every service can trust that inbound requests are already authenticated and rate-limited.",
              "**At the very front: a WAF and DDoS layer** (Cloudflare or AWS WAF/Shield) to drop obvious attacks and volumetric floods before they consume gateway or service capacity.",
              "**The API gateway** (Kong or Envoy with a control plane) owns the cross-cutting, request-shaped concerns: TLS termination so backends speak plain HTTP inside the VPC (or mTLS via the mesh); authentication (validate the JWT or session and reject anonymous requests at the door, so no service reimplements this); coarse authorization (enforce scopes and roles in the token); rate limiting and quotas (per-API-key token buckets); routing (host and path to the right service, versioning); observability (assign a request/trace id, emit consistent access logs).",
              "**Business logic stays out of the gateway.** Fine-grained authorization ('can THIS user edit THIS document'), domain validation, and pricing stay in the owning service, because they depend on domain state the gateway does not have and would otherwise turn the gateway into a distributed monolith every team must coordinate on.",
              "**BFFs for clients:** a web BFF and a mobile BFF that each aggregate and shape payloads for their client, so mobile is not forced to over-fetch a web-shaped response and each client evolves independently.",
              "**Service mesh for east-west:** sidecar proxies (Istio or Linkerd) handle mTLS, retries, timeouts, and circuit breaking between services, centrally configured without app changes. That keeps the north-south gateway thin.",
              "**The anti-bloat rule:** only cross-cutting, non-domain policy lives at the gateway; anything needing business state goes to a service. If someone proposes adding pricing rules to the gateway, that is the signal to stop.",
              "Common wrong turn: duplicating auth in every service (unmaintainable) or, at the other extreme, cramming business logic into the gateway until it is a bottleneck and a shared point of contention.",
            ],
          },
          practice: {
            id: "sd-l1-reverse-proxy-gateway-practice",
            prompt:
              "Design the edge tier for Netflix-style traffic where the mobile app, TV app, and web app each need different payload shapes, one gateway pool handles hundreds of thousands of requests per second, and a bad gateway deploy must not black out every client at once. Explain your gateway topology and how you avoid a single global point of failure and a logic monolith.",
            thinkAbout: [
              "Why does one generic gateway get pulled in incompatible directions by three client types?",
              "What blast-radius isolation do per-client BFFs buy during a bad deploy?",
              "Which concerns still belong in a shared thin edge in front of the BFFs?",
            ],
            modelAnswerOutline: [
              "Assumptions: three very different client types (constrained mobile, big-screen TV, rich web), extreme scale, and a hard requirement that no single deploy or region can take down all clients.",
              "**Per-client BFFs, not one god-gateway.** Each client (mobile, TV, web) gets its own BFF, so the TV app can request large, image-heavy aggregated payloads while the mobile BFF returns lean responses tuned for cellular. One generic gateway would be pulled in three incompatible directions and every client change would risk the others. It also gives blast-radius isolation: a bad mobile-BFF deploy degrades mobile only, not TV or web.",
              "**Shared edge, isolated logic.** In front of the BFFs, a thin common edge does the universal cross-cutting work: WAF/DDoS, TLS termination, authentication, coarse rate limiting, and routing to the right BFF. Universal concerns live once at this edge; client-specific aggregation lives in each BFF; business logic stays down in the domain services. That three-way split prevents any layer from becoming a monolith.",
              "**No single global SPOF:** the edge runs active-active across multiple regions behind anycast, so a failing region is withdrawn and traffic shifts to the next-closest one. Within a region the gateway/BFF pools are horizontally scaled and health-checked.",
              "**Safe deploys:** roll gateway and BFF changes as canaries: shift a small weighted slice of traffic, watch error and latency SLOs, widen only if healthy, roll back by dropping the weight to zero. Because BFFs are separate pools, a bad canary is contained to one client type and one region, never a global blackout.",
              "**East-west** (BFF to domain services) goes through a service mesh for mTLS, retries, and circuit breaking, keeping resilience policy out of BFF code.",
              "Common wrong turn: a single monolithic gateway serving all clients and holding client-specific logic: it becomes both a global SPOF and a coordination bottleneck, and one bad deploy blacks out every device at once.",
            ],
          },
        },
        {
          id: "sd-l1-cdn-caching-foundations",
          title: "CDN & Caching Across Layers",
          summary:
            "Cache as high up the browser-CDN-app-Redis stack as possible, default to cache-aside, mix TTL/purge/event invalidation, and never let a shared cache hold user data.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["cdn", "caching", "invalidation"],
          teach: {
            markdown: cdnCachingFoundationsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-cdn-caching-foundations-apply",
            prompt:
              "Design the caching layers for a read-heavy product page and state your invalidation strategy at each layer, including the CDN.",
            thinkAbout: [
              "What are the cache layers from browser to DB buffer?",
              "Which write policy (cache-aside, write-through, write-back) fits, and how do you invalidate?",
              "How do you invalidate a stale CDN asset?",
            ],
            modelAnswerOutline: [
              "Assume an e-commerce product page: mostly public content, read-to-write ratio around 1000:1, prices and stock change occasionally, and the page must never show one user's data to another.",
              "**Split public from personalized.** Public parts (product details, images, marketing copy) render as a cacheable shell; personalized bits (cart badge, recommendations, 'your price') load client-side or via a non-cached fragment, so shared caches only ever hold public data.",
              "**Browser cache:** static assets served with `Cache-Control: max-age=31536000, immutable` and fingerprinted filenames; the HTML shell gets a short TTL (60s) or is revalidated. **CDN:** caches images and the public product HTML with `s-maxage`; the cache key is URL plus product id, explicitly excluding cookies and user query params so no personalized variant is ever cached. Hit rate here should be very high at 1000:1.",
              "**App in-memory cache:** hot product objects per instance for a few seconds to absorb bursts with zero network hop. **Redis (distributed):** the shared product-object cache using cache-aside: on miss, read the DB, populate Redis, return. **DB buffer pool:** PostgreSQL keeps hot pages in RAM as the last line.",
              "**Write policy: cache-aside**, because it is simple, survives a Redis outage (degrades to slower DB reads), and fits a read-heavy workload where write-through would waste effort caching rarely-read writes.",
              "**Invalidation:** Redis and app cache use a short TTL plus explicit purge on price/stock change: the write path publishes a product-updated event (Kafka) that deletes the affected keys, so a price change propagates in seconds rather than waiting out the TTL. Add stale-while-revalidate on the product object and jittered TTLs to prevent a stampede when a hot product expires.",
              "**CDN invalidation:** images and versioned assets by URL fingerprinting (`hero.9f3a.jpg`, a new image is a new URL); for the public HTML, a short `s-maxage` and, on a price change, a targeted purge API call for that product's URL as a backstop.",
              "Common wrong turn: caching the whole page including the personalized cart/price at the CDN, which leaks one user's data to another, or a long TTL with no purge path so a price change is invisible for an hour.",
            ],
          },
          practice: {
            id: "sd-l1-cdn-caching-foundations-practice",
            prompt:
              "Design the caching and invalidation strategy for a news homepage like the BBC during a breaking-news event, where a single URL gets 500k requests per second globally and an editor's correction to the headline must reach every reader within about 10 seconds without melting the origin. Explain your CDN strategy, invalidation, and stampede protection.",
            thinkAbout: [
              "What fraction of 500k RPS can the origin afford to see, and what keeps the rest at the edge?",
              "Why is TTL expiry alone not enough for a 10-second correction target?",
              "What stops thousands of edge misses from stampeding the origin when the entry expires?",
            ],
            modelAnswerOutline: [
              "Assumptions: one extremely hot public URL, global readership, 500k RPS, editor-updated content, a hard freshness target of ~10 seconds for corrections. The content is public, which is what makes aggressive edge caching possible.",
              "**Serve almost everything from the CDN edge.** Cache the homepage HTML at the CDN with a short `s-maxage` (5 to 10s) so the edge answers the vast majority of requests and the origin sees at most a trickle. Static assets are fingerprinted and immutable with a one-year TTL.",
              "**Stale-while-revalidate is the core trick:** the edge keeps serving the slightly old page instantly while refetching in the background. Readers never wait on the origin, and the origin is hit only for occasional revalidation, not per request. This is what keeps a 500k RPS spike from melting the origin.",
              "**Fast corrections via targeted purge:** when an editor fixes the headline, the CMS fires a purge/invalidate for that one URL to the CDN. Combined with the short TTL, the correction reaches all POPs within the freshness window. Do not rely on TTL expiry alone; 10 seconds is tight, and the explicit purge guarantees it.",
              "**Stampede protection at the edge:** rely on the CDN's origin shielding / request coalescing: a designated shield POP talks to the origin, and concurrent misses for the same key collapse into one origin fetch (single-flight) while the rest wait or serve stale. Add small TTL jitter so POPs do not expire in lockstep.",
              "**Origin resilience:** the origin sits behind its own cache (Redis/Varnish) so even revalidation requests rarely hit the database, and the CDN TTL can be raised during an incident to shed origin load.",
              "Common wrong turn: a long TTL with no purge (corrections invisible for minutes) or a very short TTL with no request coalescing (every expiry stampedes the origin at 500k RPS and takes it down).",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l1-m4",
      title: "Performance & Resilience Fundamentals",
      description:
        "Reason about latency the way users experience it (tails, not averages), size systems with Little's Law, design timeouts/retries/breakers, protect against overload, and pick the right concurrency model.",
      lessons: [
        {
          id: "sd-l1-latency-percentiles",
          title: "Latency, Throughput, Percentiles & Little's Law",
          summary:
            "Averages hide the tail: target p99, understand how fan-out amplifies it, and size concurrency with Little's Law (L = arrival rate x latency).",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["latency", "percentiles", "littles-law"],
          teach: {
            markdown: latencyPercentilesTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-latency-percentiles-apply",
            prompt:
              "Define the SLIs/SLOs for an API endpoint and explain why you target p99 latency rather than the mean, using Little's Law to relate concurrency, throughput, and latency.",
            thinkAbout: [
              "Why does tail latency dominate when one request fans out to many services?",
              "How does Little's Law (L = arrival rate x latency) bound concurrency?",
              "What is coordinated omission and why does it distort measured latency?",
            ],
            modelAnswerOutline: [
              "Assumptions: a read-heavy JSON API (a product-detail endpoint) serving 3000 QPS at peak, fronting a service that fans out to a catalog store, a pricing service, and an inventory service.",
              "**SLIs vs SLOs:** SLIs are the measured signals: latency distribution (p50/p95/p99/p99.9), availability (fraction of requests returning non-5xx within the latency budget), error rate. SLOs are the targets: 'p99 under 200ms and success rate >= 99.9%, over a rolling 28-day window,' with an error budget (0.1% of requests may miss; burning it too fast pages someone).",
              "**Why p99, not the mean:** the mean hides the tail users actually feel. A page fanning out to 3 backends returns only when the slowest returns, so a backend p99 shows up far more often than 1 in 100 at page level (1 minus 0.99^3, about 3% of pages). Users with many items on screen hit p99 on nearly every load: the tail is the experience, not the outlier.",
              "**Little's Law sizes the system:** at 3000 QPS and 50ms latency, average concurrency is 3000 x 0.05 = 150 in-flight requests, so thread pools and downstream connection pools must comfortably exceed 150 or requests queue and latency spikes. If a downstream slows to 150ms, concurrency demand triples to 450; a pool capped at 200 bounds throughput at 200 / 0.15 = 1333 QPS and everything above queues.",
              "**Guard measurement against coordinated omission:** a closed-loop load test that waits for each response stops sending during a stall and never records the requests that should have piled up, understating the tail. Measure against intended send time, aggregate with HdrHistogram, and never average per-host p99s.",
              "Common wrong turn: quoting average latency ('we're at 30ms average, we're fine') while p99 is 800ms and fan-out is making that 800ms the common case.",
            ],
          },
          practice: {
            id: "sd-l1-latency-percentiles-practice",
            prompt:
              "Design the latency SLOs and capacity model for Amazon's product-page assembly service during a Prime Day peak, where a single page renders by fanning out to about 100 backend services (recommendations, pricing, reviews, inventory, ads) and must return in 300ms at p99. Quantify why the tail dominates and how you size for it.",
            thinkAbout: [
              "At fan-out 100, what fraction of pages hit at least one backend's p99?",
              "Which techniques collapse the tail: hedged requests, per-backend deadlines, degradation?",
              "What utilization headroom does the latency-vs-utilization curve force you to keep?",
            ],
            modelAnswerOutline: [
              "Assumptions: peak of 500,000 page assemblies per second, a strict 300ms p99 page budget, fan-out to ~100 independent backends where the page needs most of them to render.",
              "**Tail amplification quantified:** if each backend hit its own p99 independently, the chance a page dodges every tail is 0.99^100, about 37%, meaning 63% of pages would hit at least one slow backend. A per-backend p99 is nowhere near good enough; each backend needs roughly p99.99 to keep the page's p99 in budget. Push per-backend budgets down to single-digit milliseconds and treat the tail, not the mean, as the design target.",
              "**Techniques:** hedged requests (after a backend passes its p95, fire a duplicate to a second replica and take the first answer, collapsing the tail for a few percent extra load); hard per-backend deadlines with graceful degradation (if reviews or ads miss their budget, render the page without them rather than blowing the whole SLO); and a skeleton with critical blocks (price, buy button) prioritized over optional blocks.",
              "**Capacity by Little's Law:** at 500k pages/sec and a 300ms budget, in-flight pages average 500000 x 0.3 = 150000, and each page holds up to 100 downstream calls, so downstream connection pools and thread/async budgets must be sized against the fan-out, not the page count.",
              "**Headroom:** provision to keep every tier well under ~70% utilization at peak, because latency explodes as utilization approaches 100%.",
              "Common wrong turn: setting a single p99 SLO on the page and assuming healthy per-backend p99s will deliver it, when fan-out math says they will not.",
            ],
          },
        },
        {
          id: "sd-l1-resilience-primitives",
          title: "Timeouts, Retries, Backoff & Circuit Breakers",
          summary:
            "Propagated deadlines on every call, retries gated by idempotency with backoff-jitter-budget, circuit breakers to fail fast, and bulkheads to contain the blast.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["resilience", "retries", "circuit-breaker"],
          teach: {
            markdown: resiliencePrimitivesTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-resilience-primitives-apply",
            prompt:
              "Design the client-side call policy for a flaky downstream dependency so a slow dependency cannot take down the caller.",
            thinkAbout: [
              "Why does every network call need a timeout and a propagated deadline?",
              "When is a retry safe, and why do you need jitter and a retry budget?",
              "What do the circuit-breaker states do?",
            ],
            modelAnswerOutline: [
              "Assumptions: a service calling a downstream pricing API that promises p99 of 40ms but occasionally stalls or returns 503s during deploys; a 250ms end-to-end budget and a bounded thread pool.",
              "**Timeouts and deadlines:** per-call timeout derived from the downstream SLO, roughly 120ms (a few multiples of its p99, not its worst case). Critically, propagate a deadline (gRPC deadline or context header): if 200ms of the 250ms budget is already gone, the pricing call gets 50ms and fails fast instead of doing work that will be discarded. This keeps the thread pool from filling with requests waiting on a downstream that already blew the budget, which is how a slow dependency cascades into your own outage.",
              "**Retries:** only on idempotent, retryable errors: connection failures, 503s, timeouts on safe reads. Writes carry an idempotency key so a retry dedupes rather than double-charges. Exponential backoff with full jitter (base 20ms, doubling, randomized) so clients do not resynchronize into a thundering herd on recovery. Cap at a retry budget of ~10% of traffic, so a broad failure cannot triple outbound load: at most 1 to 2 retries per request, never unbounded.",
              "**Circuit breaker:** closed normally; if failures exceed ~50% over a rolling window of 20 calls it opens and fails fast (serving a fallback) for a cool-down of a few seconds, then half-open to test with a few trial calls before closing. This stops hammering a downed dependency and frees threads instantly.",
              "**Isolation and fallback:** the pricing dependency gets its own bulkhead (a bounded pool), so a stall exhausts only its pool, not the whole process. On failure, degrade: serve a slightly stale cached price or a default rather than failing the user's request.",
              "Common wrong turn: adding retries with no backoff, no jitter, no idempotency, and no budget, which turns a brief downstream hiccup into a self-inflicted retry storm that keeps the dependency down.",
            ],
          },
          practice: {
            id: "sd-l1-resilience-primitives-practice",
            prompt:
              "Design the resilience policy for Stripe's payment-charge path when its downstream fraud-scoring service degrades under a traffic spike, where charges must not be double-executed and the fraud check is on the critical path. Specify exactly how retries, deadlines, and the breaker behave for a money-moving, non-idempotent operation.",
            thinkAbout: [
              "What must be in place before any retry of a money-moving operation is safe?",
              "On a fraud-check timeout, is failing open or failing closed the expensive error?",
              "When the breaker opens, who decides the fallback: the code or the business?",
            ],
            modelAnswerOutline: [
              "Assumptions: the charge operation moves money and is not naturally idempotent, fraud scoring is on the critical path, and correctness (never double-charge, never approve fraud incorrectly) outranks latency.",
              "**Idempotency first, non-negotiable:** every charge carries a client-supplied idempotency key, and the charge service dedupes on it, so a retry arriving after a first attempt already succeeded returns the original result instead of charging twice. This is what makes retrying safe at all here.",
              "**Deadlines with fail-closed:** the fraud call gets a tight, propagated deadline (say 200ms of the charge's budget). On timeout, do NOT silently approve; for a money path the fraud check fails closed (decline or queue for manual review), because approving an unscored charge is the expensive error.",
              "**Retries, tightly bounded:** the fraud call is retried at most once, with jittered backoff, only on clearly transient errors, under a retry budget so a spike cannot amplify load into the already-struggling fraud service.",
              "**Circuit breaker with a business-decision fallback:** when the breaker opens because fraud scoring is broadly down, failing fast is correct, but the fallback is a policy choice: decline (safest, hurts conversion), route to a cheaper cached/heuristic model, or approve-and-async-review small low-risk charges under a strict cap. Degrade to the heuristic model for low-risk charges and fail closed above a risk/amount threshold.",
              "**Bulkhead:** fraud scoring gets its own bounded pool so its stall never drains the charge service's threads.",
              "Common wrong turn: retrying the non-idempotent charge itself (not just the fraud read) without an idempotency key, or failing OPEN on a fraud timeout and letting unscored charges through under load.",
            ],
          },
        },
        {
          id: "sd-l1-backpressure-shedding",
          title: "Backpressure, Flow Control & Load Shedding",
          summary:
            "Bound every queue, run below saturation (latency explodes near 100% utilization), and reject early with 429/503 while prioritizing critical traffic.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["backpressure", "load-shedding", "overload"],
          teach: {
            markdown: backpressureSheddingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-backpressure-shedding-apply",
            prompt:
              "Design overload protection for an ingestion endpoint that receives more traffic than it can process.",
            thinkAbout: [
              "How do bounded queues and backpressure prevent memory blowup?",
              "Why reject early (429/503) rather than queue-and-hope?",
              "What does queueing theory say about latency near 100% utilization?",
            ],
            modelAnswerOutline: [
              "Assumptions: an HTTP ingestion endpoint for event/telemetry writes, downstream of which events are validated and written to Kafka then a datastore. Sustainable capacity ~20,000 events/sec per instance; spikes hit 60,000.",
              "**Bound everything.** The intake buffer between the HTTP handler and the Kafka producer is a bounded queue (say 10,000 slots). When it fills, that is backpressure: the handler cannot enqueue, so it stops accepting new work rather than growing the queue. An unbounded queue would appear to absorb the 60k spike while silently accumulating multi-second latency and heap until the process crashes and drops everything, including the 20k it could have served.",
              "**Admission control at the front door:** a concurrency limiter and a token-bucket rate limiter at the edge. The concurrency limit directly bounds in-flight work (Little's Law: at 20k/sec sustainable and 5ms of processing, L = 100, so cap in-flight near that). When over the limit, reject immediately with 429 plus a `Retry-After` header (the client backs off, ideally into a durable client-side buffer). Rejecting early is cheap and keeps p99 healthy for the accepted 20k; accepting all 60k into a queue would collapse goodput as everything times out after wasting CPU.",
              "**Run below saturation:** target ~70% utilization, because wait time scales like 1/(1 - rho): fine at 70%, catastrophic at 99%. The headroom absorbs bursts without the tail exploding.",
              "**Prioritize and drop stale:** shed free-tier or low-priority events first so paying/critical streams survive, and drop any event that has sat past its deadline in the buffer rather than writing it, because it is stale and the producer has moved on.",
              "**Scale-out seam:** shedding buys survival now; horizontally, add instances behind the LB, and since ingestion is naturally async, let clients buffer and retry into a durable queue so a spike is absorbed over time rather than dropped.",
              "Common wrong turn: an unbounded in-memory queue that 'handles' the spike right up until the OOM, plus accepting-then-timing-out instead of rejecting at admission.",
            ],
          },
          practice: {
            id: "sd-l1-backpressure-shedding-practice",
            prompt:
              "Design overload protection for Cloudflare's edge accepting a sudden 10x legitimate traffic surge (a flash sale plus a viral event) across thousands of edge nodes, where dropping paying customers' checkout traffic is unacceptable but best-effort analytics traffic is expendable. Specify how you decide what to shed.",
            thinkAbout: [
              "Why does a uniform global rate limit fail this requirement?",
              "How do per-class budgets (bulkheads by priority) keep cheap traffic from starving critical traffic?",
              "What can the edge serve instead of an error when it sheds?",
            ],
            modelAnswerOutline: [
              "Assumptions: a global edge fleet, a 10x surge exceeding origin capacity, and traffic classes: checkout/payment (must survive), authenticated app traffic (should survive), analytics/prefetch/bot traffic (expendable).",
              "**Load shedding must be priority-aware, not uniform.** A dumb global rate limit would drop 90% of everything including checkouts. Classify requests at the edge (by route, auth state, customer tier, a cost/priority header) and shed from the bottom up: expendable analytics and prefetch first, then anonymous browsing, protecting checkout and authenticated traffic to the last.",
              "**Bulkhead by priority:** each class gets its own token bucket / concurrency budget, so a flood of cheap traffic cannot starve the expensive-but-critical class.",
              "**Shed at the edge, before origin:** rejecting a 429 at the nearest PoP is nearly free and protects scarce origin capacity. The edge tracks origin health via backpressure signals (rising latency, 503s, connection limits), and adaptive concurrency lowers admitted load automatically as origin latency climbs, rather than relying on a static hand-set limit that is wrong at 10x.",
              "**Graceful behavior for shed traffic:** serve stale-but-cached content from the edge cache where possible (a slightly old product page beats an error), return 429 with Retry-After for the truly rejectable, queue nothing unboundedly. For write-ish analytics, accept-and-async or simply drop, since it is best-effort.",
              "**Origin protection:** run origins below saturation and let the edge soak the burst via caching, so the 1/(1-rho) latency cliff never hits the origin.",
              "Common wrong turn: a single global rate limit applied uniformly, which sheds checkout and analytics at the same rate and loses revenue to protect telemetry.",
            ],
          },
        },
        {
          id: "sd-l1-concurrency-models",
          title: "Server Concurrency Models: Thread-per-Request vs Event Loop & C10k",
          summary:
            "CPU-bound work wants a core-sized worker pool; IO-bound fan-out wants an event loop that you never block; past 10k connections, tune fds, ports, and memory.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["concurrency", "performance", "operating-systems"],
          teach: {
            markdown: concurrencyModelsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l1-concurrency-models-apply",
            prompt:
              "Explain how you would choose between a thread-per-request server and an event-loop server for two workloads (a CPU-heavy image transcoder and an IO-heavy API gateway fanning out to 20 backends), and describe the C10k limits each model runs into.",
            thinkAbout: [
              "Is the workload CPU-bound or IO-bound, and how does that change which model wins?",
              "Why does blocking IO cap a thread-per-request server long before CPU saturates?",
              "Which OS limits (file descriptors, ephemeral ports, memory per thread) surface at 10k or more connections?",
            ],
            modelAnswerOutline: [
              "The deciding axis is CPU-bound vs IO-bound. Image transcoding is CPU-bound: each request pins a core for hundreds of milliseconds with nothing to wait on. The API gateway is IO-bound: each request fans out to 20 backends and spends almost all its wall-clock time waiting on the network, using near-zero CPU.",
              "**Image transcoder -> thread/process worker pool sized to cores.** The work is compute, so the only thing that matters is keeping every core busy without oversubscription: roughly N workers for N cores plus a bounded queue in front. An event loop would be actively wrong: a single transcode blocks the loop and serializes every other request. If an event runtime handles the HTTP layer, offload the transcode itself to worker threads or a separate service.",
              "**API gateway -> event-loop / async runtime with connection pooling.** Thread-per-request fails here specifically: with 20 blocking downstream calls per request, each request parks threads doing nothing but waiting. At a few thousand concurrent requests the thread pool and memory (~1MB stack each) are exhausted while CPU sits near idle: blocking IO caps the server long before compute does. An event loop multiplexes thousands of waiting connections on a few threads via epoll, so idle connections cost only an fd.",
              "**C10k / OS limits to tune:** raise the file-descriptor limit (`ulimit -n`, `fs.file-max`) from the 1024 default to hundreds of thousands, since every connection is an fd. Watch ephemeral ports: the gateway opening connections to a single backend IP:port caps near 28,000, so pool and reuse connections and spread across multiple backend endpoints. The per-thread ~1MB stack is exactly the wall that makes thread-per-request infeasible at 10k+, which the event loop avoids.",
              "Common wrong turn: putting a blocking DB call or a CPU-heavy transform directly on the event loop, which serializes every request behind it and destroys throughput: the mirror image of running CPU work on an async model that gives no benefit.",
            ],
          },
          practice: {
            id: "sd-l1-concurrency-models-practice",
            prompt:
              "Explain the concurrency architecture you would choose for Discord's real-time gateway holding several million idle-but-connected WebSocket clients per cluster, where most connections sit silent and occasionally receive a pushed message, and contrast it with the model you would use for the media/voice transcoding tier. Name the OS-level limits and how you get past them.",
            thinkAbout: [
              "What does a million mostly-idle connections cost per connection under each model?",
              "Why are the gateway and the voice tier deliberately separate services?",
              "Which kernel knobs and sharding moves get you past single-box limits?",
            ],
            modelAnswerOutline: [
              "Assumptions: millions of persistent WebSocket connections that are mostly idle (heartbeats plus occasional pushed events), and a separate voice/media tier doing CPU-heavy audio transcoding and mixing.",
              "**Gateway (millions of idle sockets) -> event-loop / async, unambiguously.** This is the C10M problem: connections are almost entirely idle, so the cost that matters is per-connection memory and the ability to wait cheaply. Thread-per-connection is dead on arrival: a million threads at ~1MB each is a terabyte of stack. An event-driven runtime built on epoll (Discord famously uses Elixir/BEAM, whose lightweight processes are effectively userspace green threads over an async core; Go, Netty, or Node is analogous) holds each connection as a few KB of userspace state, and epoll surfaces only the handful of active sockets per tick. The workload is 99.9% waiting, exactly what async multiplexing is for.",
              "**Media/voice tier -> worker pool sized to cores (or GPUs).** Transcoding and mixing are CPU-bound, so this tier wants one busy worker per core, a bounded intake queue, and horizontal scale-out, not async. These are deliberately separate services precisely because their concurrency models are opposite.",
              "**OS limits and fixes:** raise `nofile` to millions and `fs.file-max` system-wide (every WebSocket is an fd); shard connections across many gateway nodes so no single box holds all millions; tune kernel socket buffers and `somaxconn` for accept bursts; on any node making outbound connections, pool them and spread across destination IPs to dodge the ~28k ephemeral-port ceiling per source/destination pair. Heartbeat/keepalive tuning matters too: at millions of connections even a cheap per-connection timer adds up.",
              "Common wrong turn: trying to hold millions of WebSockets with a thread-per-connection server (instant memory death), or conversely running voice transcoding on the same event loop and freezing every connected client behind one CPU-bound mixing job.",
            ],
          },
        },
      ],
    },
  ],
}
