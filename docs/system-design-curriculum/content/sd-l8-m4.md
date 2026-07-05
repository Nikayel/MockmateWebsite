> Module **sd-l8-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l8-m3](./sd-l8-m3.md) · Next: [sd-l8-m5](./sd-l8-m5.md)

# L8 · Abuse & Perimeter Defense

After this module you can defend a public-facing system against the full spectrum of hostile traffic: separate L3/L4 volumetric floods from L7 application floods and choose the right control for each, design rate limiting and quotas that shed abuse without denying-of-wallet yourself, stop automated abuse (credential stuffing, fake accounts, card testing) with graduated risk-based friction instead of blunt blocks, and reason about attackers systematically with STRIDE while redesigning a flat internal network into a zero-trust architecture that authenticates every request.

### sd-l8-ddos-rate-abuse: Rate Limiting, Quotas & DDoS Defense

- **id:** `sd-l8-ddos-rate-abuse`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** ddos, rate-limiting, waf

#### Learn

The mistake juniors make is treating "DDoS" as one problem with one fix. It is at least two problems that live at different layers and need different defenses.

**L3/L4 volumetric attacks** try to saturate your pipes or your connection tables: UDP reflection/amplification (DNS, NTP, memcached, giving 50x to 50000x amplification), SYN floods, ACK floods. These are measured in Gbps and Mpps (millions of packets per second), and a large one is hundreds of Gbps to multiple Tbps. You cannot absorb that on your origin. The defense is upstream and distributed: **anycast** advertises the same IP from hundreds of edge PoPs so an attack is split across the whole global network instead of hitting one datacenter, a **CDN/scrubbing center** (Cloudflare, AWS Shield Advanced, Akamai) filters malformed and reflected packets before they reach you, and for on-prem you can use **BGP flowspec** or a scrubbing provider to divert and clean traffic. SYN floods are handled with SYN cookies so no state is allocated until the handshake completes.

**L7 application floods** are the sneaky ones: valid-looking HTTP requests that each cost you a database query or an expensive render. A few thousand well-chosen requests per second to a search endpoint can take you down while looking like normal traffic at the network layer. Here you need a **WAF** (rule and signature matching, OWASP core ruleset), **behavioral rate limits** per identity, IP reputation and ASN blocking, and a **graduated challenge**: suspicious clients get a JS challenge or a managed CAPTCHA, and truly abusive ones get proof-of-work (make the client burn CPU before you spend a query). The graduated response matters because you do not want to CAPTCHA your real users.

**Rate limiting** is the core mechanic. Know the algorithms and their tradeoffs:

```
  token bucket    : refill R tokens/sec, capacity B; allows bursts up to B, smooths to R
  sliding window  : count requests in the trailing T seconds; accurate, more memory
  fixed window    : count per calendar minute; cheap but allows 2x burst at the boundary
```

Token bucket is the usual default (bursty but bounded). Apply limits on multiple **dimensions**: per API key, per user, per IP, per endpoint, and offer **tiered quotas** (free 100 req/min, pro 10k req/min). Store counters in Redis with atomic Lua scripts so the check is one round trip.

**The fail-open vs fail-closed decision** is a classic interview probe. If your Redis limiter store is down, do you allow all traffic (fail-open, availability first, risk letting an attack through) or block all traffic (fail-closed, safety first, risk a self-inflicted outage from a Redis blip)? For a general public API you usually fail-open with a conservative local fallback limit so a limiter outage does not become a total outage; for a login or payment endpoint you fail-closed because letting abuse through is worse.

**Interview nuance:** name **economic denial-of-service (denial of wallet)**. If your response to load is to autoscale, an attacker who cannot take you down can still make you spend: they drive traffic, you scale to 500 instances, and the bill (or your serverless invocation count) explodes. Cap autoscaling, put a cache/CDN in front to shed load cheaply, and set billing alarms.

Recap: split defenses into L3/L4 volumetric (anycast, CDN/scrubbing, SYN cookies, BGP) and L7 application (WAF, behavioral limits, graduated challenges); rate-limit with token bucket on multiple dimensions and tiered quotas in Redis; return 429 with Retry-After; decide fail-open vs fail-closed per endpoint; and cap autoscaling so you do not denial-of-wallet yourself.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design DDoS protection plus abuse rate limiting for a high-traffic public API covering volumetric floods and L7 HTTP floods.

**Think about:**
- How do L3/L4 volumetric and L7 application defenses differ?
- What is economic denial-of-service (denial of wallet)?
- What is the fail-open vs fail-closed decision for the limiter?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a public REST/gRPC API at ~50k QPS baseline, authenticated by API key, some anonymous read endpoints, running on autoscaling containers behind a cloud load balancer. Attackers range from a 400 Gbps UDP reflection flood to a 20k QPS L7 flood on the search endpoint.

I defend in two independent layers. **L3/L4:** put the whole API behind an anycast CDN with DDoS protection (Cloudflare or AWS Shield Advanced + CloudFront). Anycast spreads a volumetric flood across hundreds of PoPs, and the scrubbing layer drops reflected/malformed packets and absorbs SYN floods with SYN cookies before anything reaches origin. Origin IPs are never published; only the CDN can reach them (origin firewall allowlists the CDN ranges), so attackers cannot bypass the edge. **L7:** at the edge I run a WAF with the OWASP core ruleset plus IP-reputation and ASN blocking, and I set behavioral rate limits.

Rate limiting uses token bucket in Redis with atomic Lua, keyed on multiple dimensions: per API key (tiered: free 100/min, pro 10k/min), per IP for anonymous endpoints, and a tighter per-endpoint limit on the expensive search path. Over-limit returns `429` with `Retry-After` and `RateLimit-*` headers so well-behaved clients back off. Suspicious-but-not-clearly-abusive clients get a graduated challenge (managed CAPTCHA, then JS proof-of-work) rather than a hard block.

Fail behavior is per endpoint: reads fail-open with a conservative per-instance local limit if Redis is unreachable (a limiter blip should not become an outage), but auth/write endpoints fail-closed.

Denial-of-wallet: I cap the autoscaler's max instances and rely on the CDN cache to serve reads so a flood hits cheap edge capacity, not my origin or my invoice, plus billing alarms.

Common wrong turn: treating this as one problem and buying only a WAF. A WAF does nothing against a 400 Gbps L3 flood, and anycast scrubbing does nothing against 20k QPS of valid-looking HTTP. You need both layers.

**Self-check rubric:**
- [ ] Separates L3/L4 volumetric (anycast/CDN/scrubbing/SYN cookies) from L7 (WAF/behavioral limits)
- [ ] Hides origin behind the edge and allowlists CDN ranges so the edge cannot be bypassed
- [ ] Names a rate-limit algorithm, multiple dimensions, and tiered quotas
- [ ] Returns 429 + Retry-After and uses a graduated challenge, not just hard blocks
- [ ] Makes an explicit, per-endpoint fail-open vs fail-closed decision
- [ ] Addresses denial-of-wallet by capping autoscale and caching

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design abuse defense for a serverless GraphQL API (AWS Lambda + API Gateway) powering a startup's mobile app at 5k QPS, where a single crafted GraphQL query can fan out into hundreds of resolver calls and every invocation costs money. Lead with how you stop query-cost abuse and denial-of-wallet on a pay-per-invocation stack.

**Model answer (revealed on demand):**

Assumptions: unauthenticated clients can hit a few queries (config, product listing); most operations require a signed-in token. The business risk is not "site down," it is a runaway AWS bill, because Lambda charges per invocation and per GB-second and GraphQL lets a client request deeply nested, expensive graphs.

First, **query-cost limiting**, which is GraphQL-specific and the heart of the answer. I enforce a **maximum query depth** and **query complexity budget**: each field has a cost weight, the server sums the requested query's cost before executing, and rejects anything over the budget with a `400`. I disable introspection in production and use **persisted queries** (allowlist of hashed, pre-approved operations) so clients cannot send arbitrary expensive graphs at all; anything not on the allowlist is rejected. This turns an open attack surface into a closed one.

Second, **denial-of-wallet controls on the serverless stack.** I set a Lambda **reserved/maximum concurrency** so a flood cannot scale invocations (and the bill) without bound; excess requests get throttled at API Gateway rather than executed. API Gateway usage plans give per-API-key rate and burst limits and monthly quotas. I add a CloudFront + WAF layer in front for L3/L4 absorption and IP reputation, and put AWS Budgets alarms on invocation count and spend so a novel attack pages a human early.

Third, **standard abuse limits:** token-bucket rate limits per user and per IP in DynamoDB or ElastiCache, tiered by plan, with `429`/`Retry-After`. Anonymous endpoints get the tightest limits since they lack an identity to attribute abuse to.

Fail behavior: I fail-closed on the concurrency cap (better to shed load with 429s than to autoscale into a five-figure bill), and fail-open only on non-cost-bearing cached reads.

Common wrong turn: applying only a request-per-second limit. At GraphQL, one allowed request can still cost 100x a normal one, so without depth/complexity limits and persisted queries the QPS limit does nothing to stop cost abuse.

### sd-l8-bot-fraud-ato: Bot Defense, Fraud & Account-Takeover Prevention

- **id:** `sd-l8-bot-fraud-ato`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** fraud, bot-defense, ato

#### Learn

DDoS is about volume. This lesson is about **intent hiding inside legitimate-looking traffic**: an attacker doing exactly what a real user does, just automated and at scale. Rate limits alone will not catch it because each individual request looks fine.

**Credential stuffing and account takeover (ATO).** Attackers take username/password pairs leaked from other breaches (billions are public) and replay them against your login, because people reuse passwords. A few percent succeed. Defenses stack:

- **Breached-password checks** at login and signup (check against a corpus like Have I Been Pwned's k-anonymity API) so a known-leaked password is rejected or force-reset.
- **MFA**, ideally phishing-resistant (WebAuthn/passkeys, TOTP over SMS). This is the single highest-leverage control against ATO.
- **Velocity and impossible-travel checks.** Track login attempts per account, per IP, and per device. "Failed logins across 5000 accounts from one IP in a minute" is stuffing. "Login from New York, then London 20 minutes later" is impossible travel and a hijack signal.

**Bot management** is detecting automation itself. Signals: **device fingerprinting** (TLS/JA3 fingerprint, browser and header entropy, canvas fingerprint), **behavioral signals** (mouse movement, typing cadence, time-on-form, since bots fill a form in 50 ms), and **invisible challenges** that run before you ever show a CAPTCHA. These feed a **risk score**, not a binary verdict.

**Fake-account / Sybil defense.** One attacker creating thousands of accounts to farm signup bonuses, post spam, or launder fraud. You cannot stop account creation, so you raise its cost and reduce its value: **phone/email verification** (a phone number costs more to acquire than an email), **per-identity and per-device velocity limits** (N accounts per device per day), **reputation and aging** (new accounts have limited privileges until they build trust), and rejecting disposable-email and VOIP-number ranges.

**Card testing** on checkout: fraudsters validate stolen card numbers by running many tiny authorizations. Defend with velocity limits per card/BIN/device, 3-D Secure step-up, and blocking the classic "many $1 auths, high decline rate" pattern.

The unifying idea is **graduated, risk-based response**. Every event gets a risk score from a pipeline of **features + rules + ML**. Low risk passes silently. Medium risk triggers **step-up auth** (MFA challenge, email verification, 3DS). High risk gets blocked or sent to a **manual-review queue**. Make every action **auditable and reversible** (you will have false positives and must be able to unblock a real user fast) and build a **feedback loop** so confirmed fraud and confirmed false positives retrain the model.

**Interview nuance:** the tradeoff to name explicitly is **friction versus conversion**. A hard block on anything suspicious kills signups and revenue and generates support tickets from real users. The senior move is graduated friction: invisible checks for the 95% who are clearly fine, a light challenge for the ambiguous middle, hard action only for high-confidence abuse. State the metric: you are optimizing fraud caught per unit of legitimate-user friction, not fraud caught in isolation.

Recap: layer breached-password checks, MFA, and velocity/impossible-travel against credential stuffing and ATO; use fingerprinting, behavioral signals, and invisible challenges for bots; raise cost and lower value (phone verification, per-device limits, reputation) against Sybil/fake accounts; score every event with features+rules+ML and respond with graduated, auditable, reversible step-up friction instead of blunt blocks.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design abuse defense for a signup/login and checkout flow facing credential stuffing, fake accounts, and card testing.

**Think about:**
- What signals detect credential stuffing and impossible travel?
- How do you balance friction against conversion with graduated response?
- How do you defend against Sybil/fake accounts?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a consumer e-commerce app, ~1M users, email+password login with optional social, guest and account checkout. Three threats: credential stuffing/ATO on login, fake accounts farming a signup promo, and card testing on checkout.

I run every sensitive event (signup, login, checkout) through a **risk-scoring pipeline**: extract features (IP reputation, device fingerprint, velocity counters, breached-password result, behavioral timings), apply deterministic rules for known-bad patterns, and a gradient-boosted model for the fuzzy middle, producing a 0 to 1 risk score.

**Login / ATO:** reject known-breached passwords at auth and force reset. Enforce MFA, and require WebAuthn/passkeys for high-value accounts. Velocity counters per account and per IP detect stuffing (many accounts hit from one IP, or many IPs hitting one account); impossible-travel (geo distance / time between logins exceeding physical possibility) forces step-up. On medium risk, step-up with an MFA or email challenge rather than blocking.

**Fake accounts / Sybil:** require verified email plus phone verification for promo eligibility, reject disposable-email and VOIP ranges, and cap accounts per device and per payment instrument per day. New accounts get limited privileges (reputation/aging) so a freshly minted account cannot immediately drain the promo.

**Card testing:** velocity limits per card, per BIN, and per device; trigger 3-D Secure step-up on risk; and alarm on the signature pattern (many small auths, high decline rate) to auto-tighten.

The governing principle is graduated response tuned on **fraud caught per unit of legitimate friction**: silent for the clean majority, challenge the ambiguous, hard-block only high-confidence abuse. Every block is logged, auditable, and reversible, and confirmed outcomes feed back to retrain.

Common wrong turn: a blanket CAPTCHA or hard block on any suspicious login. It tanks conversion, floods support with locked-out real users, and still fails against modern CAPTCHA-solving bots. Risk-based step-up beats it on both fraud and conversion.

**Self-check rubric:**
- [ ] Names concrete stuffing/ATO signals (breached-password, velocity, impossible travel) and MFA
- [ ] Uses a risk score from features + rules + ML, not a single binary rule
- [ ] Sybil defense raises cost (phone verification) and lowers value (per-device limits, reputation/aging)
- [ ] Card-testing defense uses per-card/BIN/device velocity and 3DS step-up
- [ ] Explicitly frames friction vs conversion and uses graduated step-up
- [ ] Responses are auditable, reversible, and feed a retraining loop

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design bot and fraud defense for a concert-ticket platform (think Ticketmaster on an on-sale) where scalper bots try to buy the entire inventory in the first 90 seconds using thousands of residential-proxy IPs and pre-created verified accounts. Lead with how you keep inventory reaching real fans without a hard CAPTCHA wall that collapses under the on-sale spike.

**Model answer (revealed on demand):**

Assumptions: a hyped on-sale, 20k tickets, hundreds of thousands of real fans plus scalper botnets arriving in the same 90-second window. The adversary is well-funded: rotating residential proxies (so IP reputation is weak), aged accounts with verified phone/email (so signup friction already happened), and headless-browser automation.

The core move is a **virtual waiting room** (Queue-it style or homegrown): all users are admitted to a queue at the edge before they can reach the buy flow, and released at a controlled rate. This flattens the 90-second spike into manageable throughput, removes the "fastest bot wins" race, and gives me time to score each session. Queue position is issued as a signed token so it cannot be forged or parallelized.

Because IP reputation is weak, I lean on **device and behavioral signals**: TLS/JA3 fingerprints, headless-browser detection, and behavioral biometrics (real humans move a mouse and hesitate; bots do not). Sessions get a risk score; high-risk sessions are throttled or shadow-queued rather than hard-blocked (a hard block tells the attacker exactly what tripped and invites tuning).

Against pre-created accounts I add **purchase-side limits**: strict tickets-per-account, per-payment-instrument, and per-device caps, plus linking accounts that share a device fingerprint or payment method so one operator's 500 accounts count as one entity. Payment-instrument velocity catches the same card funding many "different" accounts.

I keep friction graduated and defer the hard CAPTCHA to only the highest-risk sessions, because a blanket CAPTCHA at on-sale peak both frustrates fans and is solvable by paid solver services anyway. Post-purchase, I run asynchronous fraud review and cancel/reclaim orders that later score as bot-bought, which is a reversible, auditable backstop that does not add real-time friction.

Common wrong turn: treating this as pure rate limiting by IP. Residential proxies defeat IP limits, so identity-, device-, and payment-linkage plus a waiting room are what actually protect inventory.

### sd-l8-threat-modeling-zerotrust: Threat Modeling & Zero-Trust Architecture

- **id:** `sd-l8-threat-modeling-zerotrust`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** threat-modeling, zero-trust, stride

#### Learn

The two skills here are complementary: **threat modeling** is how you reason about attackers before you build, and **zero-trust** is the architecture you arrive at when you take the conclusions seriously.

**Threat modeling with STRIDE.** You draw a **data-flow diagram** with **trust boundaries** (where data crosses from less-trusted to more-trusted, for example browser to API, API to database, your service to a third-party processor), then walk each element and each boundary crossing against the STRIDE categories:

```
  S  Spoofing               pretending to be another identity        -> authentication
  T  Tampering              modifying data or code in transit/rest    -> integrity (signing, hashes, TLS)
  R  Repudiation            denying an action you took                -> audit logging, non-repudiation
  I  Information disclosure  leaking data                             -> encryption, access control
  D  Denial of service      degrading availability                    -> rate limits, quotas, redundancy
  E  Elevation of privilege gaining rights you should not have        -> authorization, least privilege
```

Each STRIDE category maps to a defense property, so the exercise systematically surfaces gaps instead of relying on whoever remembers to think about security. You prioritize the resulting threats (likelihood x impact, or DREAD) and only mitigate what matters.

The **secure-design principles** you apply to the mitigations are worth naming crisply because interviewers probe them: **least privilege** (each component gets the minimum access it needs), **defense in depth** (layered controls so one failure is not fatal), **fail secure** (on error, deny rather than allow), **complete mediation** (check authorization on every access, not once at the start), **secure defaults** (safe out of the box, opt into risk), and **assume breach** (design as if the attacker is already inside).

**Zero-trust.** The old model was a hard perimeter with a soft interior: get past the VPN/firewall and the internal network trusts you. That fails because one phished laptop or one compromised service inside the perimeter can then talk freely to everything (**lateral movement**), and the blast radius is the whole network. Zero-trust, popularized by Google's **BeyondCorp**, flips it: **never trust, always verify**. There is no privileged network location. Every request, including internal east-west service-to-service traffic, is authenticated and authorized on its own merits.

Concretely for microservices: give every workload a cryptographic **identity** (**SPIFFE/SPIRE**, or cloud IAM roles), and enforce **mTLS** for all service-to-service calls via a **service mesh** (Istio, Linkerd, Consul) so both sides prove who they are and traffic is encrypted and its identity is verified. Replace the VPN with an **identity-aware proxy** (BeyondCorp-style, or Cloudflare Access / Google IAP) that authenticates the user and device on every request to internal apps. Add **micro-segmentation**: default-deny network policy so service A can reach only the specific services it needs, not the whole subnet.

The payoff is **blast-radius containment**. If one service is compromised, it holds a narrowly scoped identity, can reach only its explicit dependencies, and every call it tries is authenticated and logged, so lateral movement is slow, loud, and bounded instead of instant and silent.

**Interview nuance:** the classic wrong turn is **bolting security on at the end** ("we will add auth before launch"). Threat modeling is valuable precisely because it is done at design time, when changing a trust boundary is a diagram edit rather than a rewrite. And the classic zero-trust misconception is that it is a product you buy; it is an architecture principle (verify every request, no implicit network trust) that mTLS, identity-aware proxies, and micro-segmentation implement.

Recap: STRIDE walks a data-flow diagram's trust boundaries to surface spoofing/tampering/repudiation/info-disclosure/DoS/elevation threats, each mapping to a defense; apply least privilege, defense in depth, fail secure, complete mediation, secure defaults, and assume-breach; and implement zero-trust (never trust, always verify) with workload identity, mTLS via a service mesh, identity-aware proxies replacing VPNs, and micro-segmentation to contain lateral movement and blast radius.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Produce a threat model for a payments feature using STRIDE, then redesign a flat internal network into a zero-trust model for microservices.

**Think about:**
- What does STRIDE enumerate, and what are the core secure-design principles?
- What does "never trust, always verify" change about internal traffic?
- How do you limit lateral movement and blast radius?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a `CheckoutService` takes a payment request from a browser, calls a `PaymentService` that talks to a third-party processor (Stripe), and writes an order to a database. Today all internal services sit on one flat VPC subnet behind a VPN; any service can reach any other.

**STRIDE over the payment data flow.** Trust boundaries: browser to Checkout, Checkout to Payment, Payment to Stripe, services to database. Walking STRIDE:
- **Spoofing:** a caller impersonates a user or a service. Mitigate with strong auth on the user (session + MFA for high value) and workload identity + mTLS between services.
- **Tampering:** amount or recipient altered in transit or a request replayed. Mitigate with TLS everywhere, server-side price/amount recomputation (never trust client-sent totals), and idempotency keys.
- **Repudiation:** a user denies a charge. Mitigate with a tamper-evident audit log of who paid what, when.
- **Information disclosure:** card data leaks. Mitigate by never touching raw PANs, tokenizing via Stripe, and encrypting PII at rest.
- **DoS:** checkout flooded. Mitigate with rate limits and quotas.
- **Elevation:** a low-privilege service reaches payment internals. Mitigate with least privilege and authorization checks on every call.

**Zero-trust redesign.** Remove implicit network trust. Give every service a SPIFFE identity issued by SPIRE (or cloud IAM), and put all traffic through a service mesh (Istio) enforcing mTLS, so PaymentService only accepts calls that cryptographically prove they came from CheckoutService. Apply micro-segmentation with default-deny network policy: CheckoutService may reach PaymentService and the order DB, nothing else; PaymentService may reach Stripe and its own DB, nothing else. Replace the VPN for human/admin access with an identity-aware proxy (BeyondCorp / IAP) that verifies user and device per request. Enforce complete mediation: authorization is checked on every request, not once at login.

Blast radius: if CheckoutService is compromised, its identity is scoped, it can reach only Payment and its DB, mTLS stops it impersonating anything else, and every attempt is logged, so lateral movement is contained and visible.

Common wrong turn: treating "we have a VPN and a firewall" as security. Once inside, a flat network lets one compromised pod roam freely; zero-trust removes that implicit interior trust.

**Self-check rubric:**
- [ ] Draws trust boundaries on a data-flow diagram and walks all six STRIDE categories
- [ ] Maps each threat to a concrete defense (auth, integrity, audit, encryption, rate limits, authz)
- [ ] Names secure-design principles (least privilege, defense in depth, complete mediation, assume breach)
- [ ] Gives workloads cryptographic identity and enforces mTLS via a service mesh
- [ ] Uses micro-segmentation (default-deny) and an identity-aware proxy instead of a flat VPN
- [ ] Explains lateral-movement and blast-radius containment as the payoff

#### Practice: real-world variant (save, then reveal)

**Prompt:** Explain how you would run a threat-modeling exercise and a zero-trust rollout for a 200-service platform migrating off a flat corporate network (think a bank moving from perimeter VPN to BeyondCorp) without a big-bang cutover. Lead with how you sequence the migration so nothing breaks and you get blast-radius reduction early.

**Model answer (revealed on demand):**

Assumptions: ~200 microservices, thousands of employees, a flat network reachable via corporate VPN, strict audit and uptime requirements. A big-bang "turn on mTLS everywhere Monday" is a guaranteed outage, so I sequence it.

**Threat modeling first, but scoped.** I do not threat-model all 200 services at once. I rank services by data sensitivity and exposure (payments, PII stores, auth, internet-facing edges), and run STRIDE data-flow sessions on the top tier, feeding findings into the migration order so the highest-risk trust boundaries get zero-trust protection first. Threat modeling becomes a required step in the design-review template for all new services, so the problem stops growing.

**Zero-trust rollout in phases.** Phase 1: establish workload identity. Deploy SPIRE (or adopt cloud IAM identities) and issue every service an identity, with no enforcement yet. Phase 2: deploy the service mesh (Istio/Linkerd) with mTLS in **permissive mode**, where the mesh accepts both plaintext and mTLS and reports which calls are already mutually authenticated. This surfaces the real call graph without breaking anything. Phase 3: service by service, flip destinations to **strict mTLS** once their inbound callers are all authenticated, and layer in authorization policies (which identities may call which endpoints). Phase 4: introduce default-deny micro-segmentation the same incremental way, using the observed call graph to write least-privilege policies. Phase 5: replace VPN access to internal apps with an identity-aware proxy (BeyondCorp/IAP) that checks user and device posture per request, retiring the VPN once coverage is complete.

I get blast-radius reduction early because the highest-risk services move first, and permissive-then-strict means every step is observable and reversible.

Common wrong turn: enforcing strict mTLS globally before mapping the actual call graph. You will break undocumented dependencies and trigger a rollback that discredits the whole initiative. Permissive mode plus incremental strict cutover is what makes a 200-service migration survivable.
