/**
 * System Design — Level 7: Reliability, Resilience & Operations.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l7-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L7. 17 lessons across 5
 * modules (sd-l7-m1..m5). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const availabilityNinesTeach = `
## Availability, in minutes you can feel

Availability is the fraction of time (or of valid requests) a service is up and serving correctly. People quote it in "nines," and the single most useful senior habit is to translate nines into minutes of allowed downtime per month, because that is what an on-call rotation actually feels.

The math: allowed downtime = (1 - availability) x window. For a 30-day month (43,200 minutes):

\`\`\`
Nines     Availability   Downtime / month   Downtime / year
two        99%            ~7.2 hours          ~3.65 days
three      99.9%          ~43.8 minutes       ~8.76 hours
four       99.99%         ~4.4 minutes        ~52.6 minutes
five       99.999%        ~26 seconds         ~5.26 minutes
\`\`\`

Notice the leap between each row. Going from 99.9% to 99.99% shrinks your monthly downtime budget from 43.8 minutes to 4.4 minutes. That is not "a bit better," it is a 10x reduction in the failure you are allowed, and every added nine costs roughly 10x more to achieve. The reason: the cheap failures (a bad deploy, a full disk) are gone by three nines, so the next nine forces you to attack rare, expensive causes: multi-AZ redundancy, automated failover measured in seconds, eliminating every manual step from recovery, and testing failure paths constantly. Human response time alone (someone gets paged, opens a laptop, diagnoses) blows a five-nines budget, so five nines effectively means no human in the recovery loop.

## Dependencies combine

**Serial dependencies multiply.** If your checkout calls auth, inventory, and payments in series and each is 99.9% available, your ceiling is 0.999^3 = 99.7%, worse than any single component. More hops means a lower ceiling. You cannot be more available than the product of everything you synchronously depend on.

**Redundancy adds availability.** Two independent replicas of a 99% component, where either can serve, fail only when both fail: 1 - (1 - 0.99)^2 = 99.99%. Parallel combines as 1 - (1 - a)^n. This is why the fix for a shaky dependency is often a second independent copy, not a more reliable single copy.

## Interview nuance: three different numbers

Interviewers probe whether you distinguish three different numbers. **Measured** availability is what your telemetry actually observed last month. The **SLA** is the external contractual promise with financial penalties (service credits) if you miss it. The **SLO** is your stricter internal target, deliberately tighter than the SLA so you get warning before you breach the contract. A team runs to a 99.95% SLO to safely honor a 99.9% SLA.

Common wrong turn: chasing five nines everywhere. If your database ceiling is 99.9% and a feature earns 20 dollars a minute of downtime saved, spending a quarter's engineering to add a nine it can never reach is malpractice. Match the target to revenue impact and to the dependency ceiling.

**Recap:** convert nines to downtime minutes, remember serial dependencies multiply (lowering the ceiling) while redundancy combines as 1 - (1-a)^n, each nine costs about 10x more, and keep measured, SLA, and SLO as three separate numbers.
`.trim()

const sliSloSlaTeach = `
## Turning "reliable enough" into a number

"Reliable enough" is not a target you can enforce. The SLI/SLO/SLA hierarchy is how you turn it into a number a dashboard computes and a policy acts on.

An **SLI** (Service Level Indicator) is a measured ratio: good events divided by valid events, expressed as a percentage. Availability SLI = (successful requests) / (valid requests). Latency SLI = (requests served faster than 300 ms) / (valid requests). The discipline is defining "good" and "valid" precisely. Good might mean HTTP status not in 5xx and served under a threshold. Valid deliberately excludes noise you should not be graded on: health-check pings, requests from a client that sent a malformed body (a 400 is the client's fault, not an outage), traffic during an announced maintenance window.

An **SLO** (Service Level Objective) is an SLI plus a target plus a window: "99.9% of valid requests succeed, measured over a rolling 28 days." The window matters. A rolling 28-day window smooths out one bad afternoon; a calendar-month window resets your budget on the 1st. Rolling windows are usually preferred because they do not give you a "free" reset that hides a chronic problem.

An **SLA** (Service Level Agreement) is the external, contractual version with teeth: financial penalties (service credits) if you miss it. You always set the internal SLO stricter than the SLA, so your own alerting fires before you owe customers money.

## Where you measure changes the number

The same request looks different at three points. At the **load balancer** you capture what most users experience but miss failures that never reached the LB (DNS, a dead region). At the **server** you get clean internal numbers but hide network loss and the LB's own errors, flattering yourself. At the **client** (real-user monitoring) you capture the true end-to-end experience including the last mile, but the data is noisy and attributes the user's flaky wifi to you. Good practice: measure availability at the load balancer (the boundary you own and control) and latency with client RUM plus server-side, and state your measurement point when you quote a number.

## Use percentiles, not averages, for latency

An average hides the tail. If 99 requests take 50 ms and one takes 5 seconds, the mean is ~100 ms, which looks fine while one user in a hundred is furious. p99 = 5 s tells the truth. SLOs are set on p95/p99/p99.9 depending on how much the tail matters. Averages are actively misleading for latency and you should say so.

**Interview nuance:** the strongest answers keep the SLO count small and tie each to a user journey. "99.9% of checkout submissions succeed over 28 days" is a good SLO because a human cares about that event. "CPU under 80%" is not an SLO, it is a resource metric with no user in it. Few SLOs, each anchored to a journey, targets set from what users actually expect (nobody notices 200 ms vs 250 ms, everybody notices 3 s).

**Recap:** SLI is good/valid events, SLO adds a target and window (99.9% over 28 days), SLA is the external promise with penalties; the measurement point (LB vs server vs client) changes the number, and latency SLOs use percentiles because averages hide the tail.
`.trim()

const errorBudgetsTeach = `
## The error budget is permission to fail

An **error budget** is the inverse of your SLO: budget = 1 - SLO. A 99.9% SLO means 0.1% of requests are allowed to fail, and that 0.1% is a real, spendable resource. Over 28 days at 10 million requests, a 99.9% SLO buys you 10,000 failed requests, or about 43 minutes of full outage. The mental shift that makes this powerful: the budget is not a threat, it is permission to fail that much. It exists to be spent, not hoarded.

Why spent, not hoarded? A team sitting at 100% budget remaining all quarter is not "doing great," it is over-investing in reliability the users did not ask for and under-shipping features they did. Perfect reliability is the wrong target because it means you shipped too slowly. The budget converts reliability from an argument ("is this safe enough?") into an account balance everyone can read.

## The policy is the point

A pre-agreed, written set of consequences that trigger automatically as the budget drains, so the ship-versus-stabilize decision is made in advance and does not become a political fight during a crisis. A typical policy:

\`\`\`
Budget remaining   Consequence
100% - 50%         Normal operation. Ship features at full speed.
50% - 10%          Caution. Extra review on risky changes; start
                   burning down reliability debt in parallel.
0% (exhausted)     Feature freeze. All release capacity redirects to
                   reliability until the budget recovers.
\`\`\`

The freeze is the teeth. When the budget hits zero, feature launches stop and the team works reliability until the rolling window recovers the budget. This is what makes the SLO enforceable rather than aspirational.

Two carve-outs keep the policy sane. First, **security and P0 fixes ship even during a freeze**: a freeze must never block a patch for an actively exploited CVE or a data-loss bug. Second, the freeze applies to *new features and risky changes*, not to reliability work itself. The point is to redirect effort, not to halt all deploys.

**Interview nuance:** the policy only works if it **depoliticizes** the decision and has **shared accountability**. Dev and ops (or product and SRE) both sign the policy in advance, and leadership pre-commits to honoring the freeze. Without that pre-agreement, when the budget is blown the product VP will simply overrule the freeze for the quarter's big launch, and the SLO becomes theater. The budget's whole purpose is that nobody has to win that argument in the moment: the number already decided.

Track burn over a rolling window and remember that **one bad incident can consume weeks of budget**. A 90-minute outage against a 43-minute monthly budget doesn't just fail the month, it can put you underwater for the next two windows. That is why the response to a blown budget is a freeze, not a shrug: you are already borrowing against the future.

**Recap:** error budget = 1 - SLO and it is permission to fail that you spend, not hoard; the policy pre-agrees consequences (freeze at zero) with security carve-outs and shared accountability so the ship-versus-stabilize call is depoliticized before the incident, not fought during it.
`.trim()

const burnRateAlertingTeach = `
## When to wake a human

Once you have an SLO and an error budget, the question is when to wake a human. The naive answer, "alert whenever the error rate is above X," produces either a flood of pages during any tiny blip or a threshold so high you miss slow bleeds. Burn-rate alerting solves this by alerting on *how fast you are spending the budget*.

**Burn rate** is how many times faster than sustainable you are consuming the error budget. A burn rate of **1x** means you are spending the budget exactly on pace: at 1x you will use precisely 100% of it by the end of the SLO window and no more. A burn rate of **2x** means you will exhaust the whole window's budget in half the window. **14.4x** means you burn a 30-day budget in about 2 days, or equivalently 2% of a 30-day budget in one hour. Concretely, burn rate = (observed error rate) / (1 - SLO). For a 99.9% SLO the budget is 0.1%, so a sustained 1.44% error rate is a 14.4x burn.

## The canonical multi-window ladder

You pick a burn rate and a window so that tripping means you would consume a meaningful fraction of your total budget. The Google SRE canonical setup for a 99.9% SLO:

\`\`\`
Alert type     Burn rate   Long window   Short window   Budget spent   Action
Fast burn      14.4x       1 hour        5 min          ~2% in 1h      Page now
Slow burn      3x          6 hours       30 min         ~5% in 6h      Ticket
Slow burn      1x          3 days        6 hours        ~10% in 3d     Ticket
\`\`\`

Fast burn (14.4x over 1 hour) means something is badly wrong right now and you will blow the whole month's budget in a couple of days at this rate: that pages a human immediately. Slow burn (3x over 6 hours) is a chronic bleed that is not an emergency but must not be ignored: that files a ticket for business hours.

## Why two windows

Each alert requires both a long window and a short window to be over threshold simultaneously. The long window (1 hour) gives significance so you do not page on a 30-second spike. The short window (5 minutes) makes the alert *reset quickly* once the problem is fixed, so you are not stuck with a firing page for an hour after recovery. Requiring both cuts false positives (a brief blip fails the long window) and flapping (a recovered incident clears the short window fast). This is the multi-window multi-burn-rate pattern.

**Interview nuance:** the single most important principle is **alert on symptoms, not causes**. Page on SLO burn (users are experiencing errors or slowness) not on CPU at 90% or memory pressure. High CPU might be fine; it is a cause that may or may not hurt users. A page must mean "a user is being hurt and a human must act now." Cause-based metrics belong on dashboards and in tickets for capacity planning, not on the pager. Alerting on causes is the number-one source of alert fatigue: engineers get paged for a high-CPU condition that auto-scaled away before they opened their laptop, learn to ignore pages, and then miss the real one.

The tuning tradeoff: shorter windows and lower burn-rate thresholds detect problems faster but page on smaller, sometimes self-healing events (more false positives, more budget-noise). Longer windows and higher thresholds page only on serious sustained problems but let more budget burn before you know. You trade detection time against budget spent and against page volume. Fast-burn catches acute outages quickly; slow-burn catches the chronic bleed that would otherwise silently drain you over a week.

**Recap:** burn rate is multiples of sustainable spend (1x uses exactly the budget, 14.4x burns ~2% of a month in an hour); require a long window for significance and a short window for fast reset; page on fast burn and ticket on slow burn; and always alert on the SLO-burn symptom, never on causes like CPU, to kill alert fatigue.
`.trim()

export const systemDesignLevel7: DesignLevel = {
  id: 7,
  slug: "reliability-ops",
  title: "Level 7 — Reliability, Resilience & Operations",
  tagline:
    "SLOs and error budgets, observability, resilience patterns, redundancy and multi-region DR, and safe deploys and chaos.",
  estimatedHours: 8,
  modules: [
    {
      id: "sd-l7-m1",
      title: "SLOs & Error Budgets",
      description:
        "Turn a vague 'make it reliable' goal into hard numbers: convert nines into real downtime and dollars, define SLIs and SLOs a team can measure and enforce, write an error-budget policy that settles the ship-versus-stabilize fight without a meeting, and design multi-window multi-burn-rate alerts that page a human only when it matters.",
      lessons: [
        {
          id: "sd-l7-availability-nines",
          title: "Availability Math & the Nines",
          summary:
            "Convert nines to downtime minutes, remember serial dependencies multiply (lowering the ceiling) while redundancy combines as 1 - (1-a)^n, each nine costs about 10x more, and keep measured, SLA, and SLO as three separate numbers.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["availability", "nines", "slo"],
          teach: {
            markdown: availabilityNinesTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l7-availability-nines-apply",
            prompt:
              "Compute the allowable monthly downtime for a checkout service at 99.9% vs 99.99%, then decide which nine is worth the cost and justify it.",
            thinkAbout: [
              "How do serial dependencies combine, and how does redundancy add availability?",
              "Why does each added nine cost roughly 10x more?",
              "What is the difference between measured, promised (SLA), and target (SLO) availability?",
            ],
            modelAnswerOutline: [
              "Assumptions: checkout is a revenue-critical path processing 500 orders/minute at peak, average order value 60 dollars, so a full outage costs roughly 30,000 dollars/minute of lost or delayed revenue plus reputational damage. Window is a 30-day month (43,200 minutes).",
              "**The numbers:** at 99.9% the budget is (1 - 0.999) x 43,200 = 43.2 minutes/month. At 99.99% it is (1 - 0.9999) x 43,200 = 4.32 minutes/month. So the question is whether cutting allowed downtime by ~39 minutes/month is worth the cost.",
              "**Value side:** 39 minutes x 30,000 dollars is over 1 million dollars of exposure per month removed, and checkout downtime directly abandons carts. That easily justifies serious investment.",
              "**Cost and feasibility side:** checkout is not standalone. It synchronously depends on auth, inventory, and payments. If each is 99.95%, the serial ceiling is 0.9995^3 = 99.85%, below even three nines. I cannot promise 99.99% at the edge while my dependencies cap me at 99.85%. So the honest answer: target 99.99% only after I harden the chain. Add redundancy to the weakest hop (two independent inventory replicas turns 99.9% into ~99.9999%), make payments and inventory calls tolerate a slow or failed dependency via async confirmation and idempotent retries, and remove any single-AZ single point of failure.",
              "**Decision:** commit to a 99.95% SLO for checkout now (about 21 minutes/month), sign a 99.9% SLA externally for margin, and treat 99.99% as a roadmap target gated on first raising the dependency ceiling. Chasing the fourth nine at the edge before fixing the serial chain would be spending money on a number the architecture cannot deliver. Common wrong turn avoided: quoting 99.99% at the edge while the multiplied dependency chain physically caps me lower.",
            ],
          },
          practice: {
            id: "sd-l7-availability-nines-practice",
            prompt:
              "Design the availability target and redundancy strategy for Stripe-style payment authorization at 5,000 auth requests/second, where a single 99.99% card-network dependency sits on the critical path and the business wants 'four nines end to end.' Explain what is and is not achievable and how you close the gap.",
            thinkAbout: [
              "Why does one 99.99% serial dependency cap the end-to-end number below four nines?",
              "How does routing through multiple card networks change the ceiling?",
              "What target do you actually commit to, and how do you degrade gracefully on a network blip?",
            ],
            modelAnswerOutline: [
              "Assumptions: 5,000 QPS, each failed auth is a lost or retried payment, and one hard external dependency (the card network) is quoted at 99.99% and is not something I can make more reliable.",
              "**The blunt truth:** if the card network is a mandatory synchronous hop at 99.99%, my end-to-end ceiling is at most 99.99% minus whatever my own stack subtracts. If my internal path is 99.99% and the network is 99.99%, serial gives 0.9999 x 0.9999 = 99.98%. So literal 'four nines end to end' is not achievable while that dependency is on the hot path. I say that explicitly rather than promising a number physics forbids.",
              "**Close the gap #1: remove hops from the synchronous path.** Fraud scoring and ledger writes go async where possible so only the gateway, auth, and network are serial.",
              "**Close the gap #2: add redundancy on everything I own.** Multi-region active-active gateways and auth so my internal contribution rises toward 99.999%, making the network the sole binding constraint.",
              "**Close the gap #3: exploit multiple card-network routes.** If I can route a transaction through more than one acquirer/network, those parallel paths combine as 1 - (1 - 0.9999)^2 = 99.999999%, which lifts the external ceiling far above four nines. That is the real unlock: redundancy at the dependency, not heroics in my code.",
              "**Target I commit to:** 99.99% for my own stack (measured), a 99.95% customer SLA with service credits for margin, and an internal 99.995% SLO reachable only once multi-network routing is live. I also add graceful handling: on network failure, queue for retry with idempotency keys rather than hard-declining, so a network blip degrades to slight latency rather than a lost payment. Common wrong turn avoided: accepting 'four nines end to end' as a spec without checking that a single 99.99% serial dependency mathematically caps it lower.",
            ],
          },
        },
        {
          id: "sd-l7-sli-slo-sla",
          title: "SLI / SLO / SLA Hierarchy",
          summary:
            "SLI is good/valid events, SLO adds a target and window (99.9% over 28 days), SLA is the external promise with penalties; the measurement point (LB vs server vs client) changes the number, and latency SLOs use percentiles because averages hide the tail.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["sli", "slo", "sla"],
          teach: {
            markdown: sliSloSlaTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-sli-slo-sla-apply",
            prompt:
              "Define 3 SLIs and their SLO targets and measurement windows for a photo-upload API, and specify exactly how each SLI is computed from telemetry.",
            thinkAbout: [
              "How is an SLI defined as good events over valid events?",
              "Why does the measurement point (LB vs client vs server) change the number?",
              "Why use percentiles, not averages, for latency SLIs?",
            ],
            modelAnswerOutline: [
              "Assumptions: the photo-upload API accepts a multipart POST, stores the object in S3, writes metadata to a database, and returns a URL. Users care about three things: does my upload succeed, is it fast enough, and is my photo still there later. So I pick three SLIs, each tied to that journey, and keep it to three deliberately.",
              "**1. Availability SLI.** Good = requests returning 2xx (or a legitimate 4xx that is the client's fault). Valid = all requests to `POST /uploads` excluding health checks and requests we rejected as malformed before doing work. Computed from load-balancer access logs: `count(status < 500 and status != 429) / count(valid requests)`, measured at the LB because that is the boundary I own and it reflects what the client actually reached, not flattering myself by hiding failures the server never saw. SLO: 99.9% over a rolling 28 days.",
              "**2. Latency SLI.** Good = uploads completing under 3 seconds for a photo up to 10 MB. Valid = successful uploads only, bucketed by size so a 50 MB upload is not graded against the 10 MB threshold. Computed as `count(request_duration_ms < 3000) / count(successful uploads)` from server-side histograms exported to Prometheus, cross-checked with client RUM to catch last-mile latency. SLO: 95% under 3 s and 99% under 8 s over 28 days. I use thresholds/percentiles, not the average, because one slow multi-second upload would vanish in a mean.",
              "**3. Durability/correctness SLI.** Good = uploaded objects still readable and matching their checksum on a later read. Valid = all committed uploads. Computed by a background job that samples recent uploads, re-reads from S3, and compares stored vs computed checksum. SLO: 99.999% over 90 days (durability is a long-window, high-bar number).",
              "I would not add a 'CPU under 80%' SLO: that is a resource signal with no user in it, useful for capacity but not a promise to a customer. Common wrong turn avoided: averaging latency, measuring availability server-side, or sprawling into ten SLOs.",
            ],
          },
          practice: {
            id: "sd-l7-sli-slo-sla-practice",
            prompt:
              "Define the SLI/SLO set for YouTube-style video playback at global scale, where 'the video plays' is the journey and CDN edges, adaptive bitrate, and buffering all affect perceived quality. Specify how you compute each SLI from telemetry and why client-side measurement is unavoidable here.",
            thinkAbout: [
              "Why can server/edge 2xx rates report health while users stare at a spinner?",
              "Why is rebuffer ratio a time-weighted SLI rather than a request ratio?",
              "Which SLIs live on the client and which stay server-side, and why keep both?",
            ],
            modelAnswerOutline: [
              "Assumptions: hundreds of millions of playback sessions/day served from a global CDN, adaptive bitrate (ABR) so the same 'success' can mean 4K or 240p. The journey is 'I pressed play and watched smoothly,' which server-side metrics cannot fully capture, so client RUM is mandatory.",
              "**1. Playback-start SLI.** Good = sessions where video begins within 2 seconds of pressing play (time-to-first-frame). Valid = all play attempts on a supported client, excluding user-cancelled starts. Computed from client beacons: `count(ttff_ms < 2000) / count(valid starts)`. Must be client-side because CDN logs show the byte was served, not that the frame rendered. SLO: 99% under 2 s over 28 days.",
              "**2. Rebuffer-ratio SLI.** Good = playback time not spent in a stall. A time-weighted SLI, not a request ratio: `1 - (rebuffer_seconds / total_watch_seconds)`. Valid = active sessions over 30 seconds. SLO: rebuffer ratio under 0.5% over 28 days. Buffering is the single biggest driver of abandonment, so it earns its own SLI, and only the client knows when the picture actually froze.",
              "**3. Playback-failure SLI.** Good = sessions that never hit a fatal error (manifest fetch fail, decode error, 5xx from the edge). Valid = all sessions. Computed from client error beacons joined with edge logs. SLO: 99.95% error-free over 28 days.",
              "**Why client-side is unavoidable:** the CDN can return 200 for every segment while the user stares at a spinner because their device throttled or the ABR ladder picked a bitrate their connection could not sustain. Server metrics would report a healthy service during a visibly broken experience. I still keep server/edge SLIs (segment fetch latency, edge error rate) for fast localization, but the customer-facing SLOs live on the client. Common wrong turn avoided: measuring only edge 2xx rate and declaring success while real users buffer.",
            ],
          },
        },
        {
          id: "sd-l7-error-budgets",
          title: "Error Budgets & Policy",
          summary:
            "Error budget = 1 - SLO and it is permission to fail that you spend, not hoard; the policy pre-agrees consequences (freeze at zero) with security carve-outs and shared accountability so the ship-versus-stabilize call is depoliticized before the incident, not fought during it.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["error-budget", "policy", "sre"],
          teach: {
            markdown: errorBudgetsTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l7-error-budgets-apply",
            prompt:
              "Write an error-budget policy for a team: what happens at 100%, 50%, and 0% budget remaining, and who has authority to halt releases.",
            thinkAbout: [
              "Why is the error budget permission to fail that should be spent?",
              "What consequences kick in as the budget is exhausted?",
              "How does the policy depoliticize the release-vs-reliability decision?",
            ],
            modelAnswerOutline: [
              "Assumptions: a product team owning a service with a 99.9% availability SLO over a rolling 28-day window, so the monthly budget is roughly 43 minutes of downtime or 0.1% of requests. Dev and SRE share on-call. The policy is signed by engineering, product, and the VP before it takes effect, which is the whole point.",
              "**100% to 50% remaining (healthy):** Normal operation. Ship features at full velocity, deploy on the normal cadence, run experiments. The budget exists to be spent, so consistently sitting near 100% triggers a review of whether the SLO is too loose or we are shipping too slowly.",
              "**50% to 10% remaining (caution):** Risky or large changes require a second reviewer and a rollback plan. The team allocates a fraction of the sprint to burning down known reliability debt in parallel, so we do not coast into a freeze.",
              "**0% (exhausted):** Automatic feature freeze. All release capacity redirects to reliability work: fixing the top burn sources, adding tests, hardening the failing dependency. The freeze lifts when the rolling window recovers the budget above a set threshold (say 20%).",
              "**Carve-outs:** security patches, data-loss fixes, and P0 incident mitigations ship even during a freeze. The freeze blocks new features and risky changes, not the reliability work itself and not emergency fixes.",
              "**Authority:** the freeze is automatic, triggered by the budget number, not a manager's discretion. The on-call SRE lead declares it when telemetry shows the budget exhausted; product and engineering leadership pre-committed to honor it. Overriding requires an explicit, logged exception approved by the VP of Engineering, reviewed in the postmortem. Why this depoliticizes: the decision to stop shipping was made months ago when everyone signed the policy, so nobody argues 'is the big launch worth it' in the moment. Common wrong turn avoided: leaving the freeze to a case-by-case judgment call, which guarantees it gets overruled whenever inconvenient.",
            ],
          },
          practice: {
            id: "sd-l7-error-budgets-practice",
            prompt:
              "Design the error-budget policy for a platform team whose service is a shared dependency for 40 internal product teams (think an internal auth or payments platform), where one product team's risky deploys can burn a budget that all 40 teams depend on. Explain how you allocate budget and assign accountability across the shared boundary.",
            thinkAbout: [
              "Why does an undifferentiated shared budget punish the best-behaved teams?",
              "How do you attribute burn to a specific consumer and cap it?",
              "What enforcement protects the other 39 teams from one abuser automatically?",
            ],
            modelAnswerOutline: [
              "Assumptions: a shared internal auth platform with a 99.95% SLO consumed by 40 teams. A single noisy consumer or one bad platform deploy can burn the shared budget, and the blast radius is all 40 teams. The hard problem is accountability across a boundary the platform team does not fully control.",
              "**Budget structure:** split the budget into two ledgers. The **platform-owned budget** covers failures caused by the platform itself (bad deploys, capacity, dependency outages). The **consumer-induced budget** covers degradation caused by a specific team's abuse (retry storms, unbounded queries, cardinality explosions). Telemetry tags every request with the calling team so burn is attributable. This is the key move: a shared budget with no attribution means the best-behaved team gets frozen for the worst team's sins.",
              "**Policy:** when the platform-owned budget is exhausted, the platform team freezes its own feature work and stabilizes (standard SRE policy). When a single consumer's induced burn exceeds a per-consumer sub-budget, that consumer gets rate-limited or quota-throttled at the platform edge (protecting the other 39) and must fix their integration before the throttle lifts. The platform enforces this automatically via admission control keyed on the team tag, so one team cannot spend everyone's budget.",
              "**Accountability:** the platform publishes a per-consumer reliability dashboard so burn is visible and social. A shared reliability council (platform lead plus rotating consumer reps) reviews cross-cutting incidents and owns the SLO target. Leadership pre-agrees that the platform may throttle an abusive consumer without per-incident negotiation, because protecting 40 teams outranks one team's launch.",
              "Common wrong turn avoided: running one undifferentiated shared budget with no per-team attribution, which both punishes well-behaved teams and gives the abuser no incentive to fix anything. Attribution plus per-consumer sub-budgets plus automatic throttling turns a tragedy-of-the-commons into an enforceable contract.",
            ],
          },
        },
        {
          id: "sd-l7-burn-rate-alerting",
          title: "Burn-Rate Alerting (Multi-Window, Multi-Burn-Rate)",
          summary:
            "Burn rate is multiples of sustainable spend (1x uses exactly the budget, 14.4x burns ~2% of a month in an hour); require a long window for significance and a short window for fast reset; page on fast burn and ticket on slow burn; and always alert on the SLO-burn symptom, never on causes like CPU.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["burn-rate", "alerting", "slo"],
          teach: {
            markdown: burnRateAlertingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-burn-rate-alerting-apply",
            prompt:
              "Design the alert rules for a 99.9% SLO service using multi-window multi-burn-rate alerts, giving thresholds for a fast-burn page vs a slow-burn ticket.",
            thinkAbout: [
              "What is a burn rate, and what does 1x mean?",
              "Why require both a short and a long window to trip?",
              "Why alert on SLO burn (symptom) not CPU (cause)?",
            ],
            modelAnswerOutline: [
              "Assumptions: a request-driven API with a 99.9% availability SLO over a rolling 30-day window, so the error budget is 0.1% of requests. The SLI is (non-5xx responses) / (valid requests), evaluated from load-balancer metrics in Prometheus. Burn rate = observed error rate / 0.1%.",
              "**Fast-burn (page):** burn rate 14.4x, evaluated over a **1-hour long window AND a 5-minute short window**, both must exceed 14.4x. A 14.4x burn is an observed error rate of ~1.44%, spending ~2% of the entire month's budget in one hour. This is an acute outage: page the on-call immediately. The 1-hour window ensures the problem is real and sustained; the 5-minute window ensures the page clears within minutes of recovery instead of staying lit for an hour.",
              "**Slow-burn (ticket):** burn rate 3x over a **6-hour long window AND a 30-minute short window**. That is a ~0.3% error rate spending ~5% of the monthly budget over 6 hours. Not an emergency worth waking someone, but a real chronic bleed that will drain the budget if ignored, so it opens a ticket handled in business hours. Optionally a third rule at 1x over 3 days / 6 hours catches the very slow leak.",
              "**Why symptoms not causes:** every rule fires on SLO burn, the thing users actually feel. I would not page on CPU > 85% or queue depth, because those are causes that may auto-scale away or be perfectly healthy. Those live on dashboards for diagnosis and on capacity tickets, never on the pager. Prometheus pattern: `error_rate_1h = sum(rate(errors[1h]))/sum(rate(requests[1h]))`, `error_rate_5m` likewise, `page IF error_rate_1h > 14.4*0.001 AND error_rate_5m > 14.4*0.001`.",
              "Common wrong turn avoided: a single static threshold (page at 1% errors) with no burn-rate math, which flaps on brief spikes and cannot distinguish a 2-minute blip from a budget-destroying sustained outage.",
            ],
          },
          practice: {
            id: "sd-l7-burn-rate-alerting-practice",
            prompt:
              "Design burn-rate alerting for Amazon-style checkout with a 99.99% SLO and a strict latency SLO (p99 under 300 ms), where the business tolerates almost no false-negative on a real outage but on-call is already drowning in pages. Specify how you handle both the availability and latency SLOs and how you cut page volume without missing a genuine outage.",
            thinkAbout: [
              "Why does a four-nines budget need a sharper very-fast tier than a 99.9% service?",
              "Why does latency get its own burn-rate ladder separate from availability?",
              "What cuts page volume without lowering every threshold uniformly?",
            ],
            modelAnswerOutline: [
              "Assumptions: checkout at 99.99% availability (budget 0.01%, only ~4.3 min/month) and a latency SLO of 99% of requests under 300 ms. Two separate SLOs means two separate burn-rate ladders. The tension: a four-nines budget is tiny so a real outage burns it terrifyingly fast, yet on-call is already fatigued, so I cannot just lower thresholds everywhere.",
              "**Availability ladder:** because the budget is 10x smaller than a 99.9% service, the same 14.4x burn now means a ~0.14% error rate and I have far less room. I keep the multi-window structure but add a very-fast tier: a 30x+ burn over a 5-minute/1-minute pair pages instantly, because at four nines a hard outage can vaporize the monthly budget in minutes and I cannot wait an hour for the long window to confirm. The standard 14.4x (1h/5m) and 3x (6h/30m) tiers still apply below it.",
              "**Latency ladder:** the latency SLI is (requests under 300 ms) / (valid requests); I compute burn against the 1% latency budget with the same multi-window multi-burn-rate math. Slow-but-up is a distinct failure mode from errors, so it gets its own rules, and I separate the latency of successful vs failed requests so a wave of fast 500s does not mask a latency regression.",
              "**Cutting page volume without missing outages:** the multi-window pattern is itself the biggest lever (requiring both windows kills most flapping). Beyond that: (1) only page on fast-burn tiers, route every slow-burn to tickets, (2) deduplicate and group related alerts so one incident is one page not fifty, (3) move all cause-based alerts (CPU, disk, queue depth) off the pager onto dashboards, since those are the bulk of fatigue, and (4) audit pages monthly and delete any that were not actionable.",
              "Common wrong turn avoided: keeping the same thresholds as a 99.9% service (too slow for a four-nines budget) or lowering every threshold uniformly (which worsens the fatigue I am trying to fix). The fix is a sharper very-fast tier for detection plus ruthless removal of cause-based pages for volume.",
            ],
          },
        },
      ],
    },
  ],
}
