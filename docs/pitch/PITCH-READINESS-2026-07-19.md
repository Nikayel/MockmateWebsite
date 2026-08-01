# CodeSparring Pitch-Readiness Brief (Council Synthesis, 2026-07-19)

Produced by an 11-agent council: 5 evidence scouts (product truth from the repo, metrics instrumentation, UMich ecosystem via live web research, competitor field via web, market + unit economics via web) feeding 5 seats (pre-seed VC skeptic, campus GTM operator, pitch coach, technical diligence engineer, red team), merged by a chair. All fall dates are last cycle's where 2026 dates were unpublished; verify on arrival.

## 1. Verdict

**Ready for competitions this fall; not ready for checks.** The product is unusually complete for pre-launch (full loop demoable, 1645 tests green, live Stripe, day-1 instrumentation), so pitch it, but sequence rooms by what they tolerate: **(1) non-dilutive grants and competitions Sept–Feb** (Dare to Dream, optiMize, MBC), which accept pre-traction and pay ~$25–35K combined; **(2) student ecosystem for users, not money** (MHacks, V1 Startup Fair); **(3) funds only after a 4+ week WCSR curve with 100+ UMich users exists** (realistically late October at the earliest, real asks in March–April). The pitch coach's "relationship and a date" ask and the red team's "no fund meetings before data" reconcile: coffee anytime, money asks only after the curve.

**Single biggest gap: zero users.** Every technical objection has a code-grounded answer; traction and team objections have only a plan. The next six months are a distribution job. Anything shipped that doesn't move users, WCSR, or retention is procrastination dressed as engineering.

## 2. The story

**Chosen one-liner (default for judges and angels):** "Tech interviews are moving from LeetCode puzzles to 'debug and extend this real codebase.' CodeSparring is the AI interviewer that trains you for that round: realistic multi-file scenarios, a turn-by-turn interviewer, a scored rubric, at a student price, because the code runs in your browser, not on our servers."

Runners-up: **(B)** for students at MHacks/V1: "LeetCode drills puzzles. Copilot apps whisper answers so you can fake it. CodeSparring makes you good at the interview that's coming, and you can try it in 60 seconds with no signup." **(C)** for optiMize's social-impact frame: "Human mocks cost $100–225 a session, so students without money walk in cold. CodeSparring gives every student an AI interviewer, real bug-hunt codebases, and a free curriculum that closes each gap the interview finds."

**60-second narrative:** fewer at-bats, higher bar (junior postings down ~28% from 2022 peak, new grads ~7% of Big Tech hires, 5.6% recent-grad unemployment) → the hiring side is already AI (Mercor, Karat NextGen, HackerRank; Meta piloting AI-in-the-interview) and the format is shifting to fix-real-code rounds nobody trains → CodeSparring trains and scores that round end-to-end, with sealed answers and ~$0 marginal execution → every gap found routes into free curriculum and spaced repetition → launching at Michigan in September with the measurement layer already built.

**Founder-market-fit (use verbatim shape, verify personal claims first):** "I'm the user: a Michigan grad student walking into the same SWE and DE interviews as everyone's students. I couldn't pay $200 a session for human mocks, and LeetCode doesn't train the round where they hand you a broken codebase. So I built the interviewer I needed, all of it: AI interviewer, in-browser execution so sessions cost cents, three curricula, billing, and the analytics to prove whether it works. 1,645 tests, production build green, launching at Michigan in September." Rule: every technical fact gets one sentence ending in a business consequence. Curriculum gets 30 seconds, framed as the retention loop, never the headline.

## 3. Target map + calendar (all fall dates are last cycle's; verify on arrival)

| Vehicle | When | Ask type / size |
|---|---|---|
| Dare to Dream (ZLI) | Apply Sept + Jan | Non-dilutive $500–10K; milestone-framed (Flash migration, campus acquisition, WCSR target) |
| MHacks | ~Sept 20–22 (unconfirmed) | Users: hallway table, 2 pre-signed-in laptops, ?src=mhacks QR |
| V1 Startup Fair Week | ~Sept 29–Oct 3 | Users + network; join as member |
| SPARK Entrepreneur Boot Camp | 8 weeks, free, Sept start | Coaching + funded pitch comp; gateway to SPARK/Michigan Angel |
| optiMize SIC | Submit ~Oct, pitch Feb | Up to $10K + summer fellowship; lead with access framing (one-liner C); cohort = users |
| MBC (Innovation track) | Register ~Oct 31; rounds Nov–Dec; finals Feb | $15K Pryor-Hale; live demo + WCSR data beats slideware |
| NSF I-Corps Great Lakes (U-M-led) | Fall cohort | ~$1K customer discovery; unlocks $50K national |
| ID Ventures First Capital | Mar–Apr, with data | Up to $150K, milestone-driven, **no co-founder rule** (FUSE requires 2+ founders; blocked solo) |
| Michigan Rise | Mar–Apr, with data | $50K–250K pre-seed |
| Zell Founders Fund | Spring 2027 if 1-yr program | $50K + $50K milestone; eligibility = final semester through 1 yr post-grad; open conversation early, ask later |

TechArb is on hiatus (interest form only). Wolverine Venture Fund, Michigan Angel Fund, Accelerate Blue: not applicable now. Spring pre-seed band: ~$750K–1.5M on $4–6M post, raised on team + demo + usage.

## 4. Traction plan (Jul 19 → pitch day)

**Launch publicly by Aug 25, before classes.** Soft-launch to friends in early August. First 100 users are hand-to-hand: own cohort (20 signups week one; if desperate classmates won't sign up, stop and find out why), MHacks, V1, ~30 per-location ?src= QR posters.

| Date | WCSR | Users (cum.) |
|---|---|---|
| Sept 7 | 10 | ~40 |
| Sept 21 (MHacks) | 40 | ~75 |
| Sept 28 | — | 100 |
| Oct 5 (post-career-fair) | 100 | ~200 |
| Oct 26 | 150 | 300–500 |
| Nov–Dec (dip) | hold 75–100 | — |
| Feb | 200+ | ~1000 by March |

Guardrails: guest→signup ≥10–15% (under 10% = trial or value prop broken), activation (first scored round ≤24h of signup) ~40%, week-2 return ≥20% in October, week-4 retention ≥25%. **Pre-commit to the November dip** (recruiting is seasonal; expect a 40–60% WCSR drop) and show it annotated rather than truncating the chart.

**Headline number: the weekly WCSR curve** (current week + series). It is first-party, test-gated, and immune to the vanity traps (estimated visits, cumulative signups, tier-count MRR, n<10 NPS).

Named disagreement: the VC skeptic's checklist wants $1–2K MRR by fall; the GTM operator says don't chase MRR. **Side with GTM:** pre-seed is raised on usage, and forced discounts poison both the data and campus goodwill; let organic payers accrue and make ~$10–25K MRR the spring/seed milestone.

## 5. Demo (3 minutes)

**0:00–0:40, guest funnel, incognito:** homepage → Start → open scenario → run code, tests pass. Say: "No account. That code ran in your browser; our marginal cost was zero cents. That's why we can price for students." Show local score + signup prompt. Close window.

**0:40–2:20, the wow spine, signed in:** open a company-style bug-hunt pack (Datadog alert-dedup). "This is the round LeetCode never trains: here's a codebase, something's wrong, fix it." One AI interviewer exchange, run tests (terminal output), submit, land on the AI-scored rubric. Hold silence two beats. "Reference answers are sealed server-side; you cannot scrape the solution."

**2:20–3:00, close the loop:** one SQL window-functions lesson with live query output, or /practice. "Every gap the interview finds, the free curriculum and spaced repetition close. Then you interview again." Stop. No Learn tour. No voice, ever (Deepgram raw-key fallback; one judge with devtools ends the pitch). Never demo AI chat as a guest (guests get editor + tests + local score only).

**T-24h checklist:** own hotspot, never venue Wi-Fi (3 guest sessions/hour/IP dies after 3 people); pre-warm Pyodide in the demo tab (5–15s CDN cold load) and keep it open; primary + backup seeded accounts with completed sessions; Gemini quota verified and DEEPSEEK_API_KEY live; offline backup video (guest funnel + full pack interview); audience try-it via QR on cellular or an event-window cap raise; three timed dress rehearsals including one deliberate Wi-Fi kill.

## 6. The 10 hardest questions

1. **"How many users do you have?" / why fund this?** "Zero; I launch at Michigan in six weeks. What I have that pre-launch teams don't is the measurement layer already live: WCSR, guest funnel, per-poster attribution, retention cohorts. Judge me on that curve by [date], and if I hit 4 of 6 named numbers, take the real meeting." State the zero without flinching; no waitlist theater. **(Weakest answer #1: measurement isn't traction; the only strengthener is shipping the launch and returning with the curve.)**
2. **"Why doesn't NeetCode end you?"** "They already added AI, bolted onto the same DSA library their brand and content engine are built on. Graded multi-file scenarios with sealed answers and executable oracles are a different production pipeline; I've shipped 14 company packs through mine, plus a DE-intern wedge no DSA platform serves. My job is to be 18 months deep before it's worth their attention." **(Weakest answer #2: "out-execute before they notice" is a hope, not a moat; strengtheners are visible scenario volume, campus channels incumbents don't work, and October retention data proving students stick with real-world rounds.)**
3. **"Aren't you a Gemini wrapper?"** "The LLM is a commodity I buy at $0.10–0.20 a session with a fallback chain. What I own: a sealed scenario library that can't be scraped, client-side execution making marginal compute ~$0, a per-scenario-type rubric, and the closed loop into curriculum and SR. The compounding asset is the scored-attempt corpus, collecting from day 1."
4. **"Solo founder in a full-time grad program: who sells this?"** "Grad school is the go-to-market: I'm inside 1000+ target users and the campus calendar is the pipeline. Bus factor is one, mitigated by 1645 gating tests, managed infra, and zero backend load at campus scale. Fall is a deliberate co-founder search (V1, MHacks, optiMize); a partner also unlocks FUSE, which requires two founders. If I can't recruit or personally produce a repeatable channel by December, that's a real signal and I'll treat it as one."
5. **"$25–50M episodic wedge: lifestyle business, why venture?"** "Consumer alone, correct: ~88% margin, churny, a good cash-flow business. The venture ladder is campus wedge → career-center/bootcamp site licenses (my admin/WCSR dashboards are already the reporting layer; UMich is the pilot) → hiring-side assessment where Mercor and micro1 prove buyers. One career-center LOI by February converts this from thesis to evidence, and it's obtainable."
6. **"Is this those cheating copilots?"** Preempt it: "The best-funded player sells live answer-whispering; it makes you fake. We're the opposite architecture: answers sealed server-side, rubric scoring an employer could trust, spaced repetition. We make you good for the job." This is the best 30 seconds of Q&A; rehearse it.
7. **"Gemini 2.5 Flash deprecates Oct 16. Vendor risk?"** "Migration is on the calendar for August, with a scoring regression pass. Fallback chain exists (DeepSeek/Claude) and gets a kill-the-key fire drill this month. Worst case is bounded: the 35-session cap keeps even doubled token prices under ~2/3 of revenue, and half the product (editor, tests, all Learn tracks) has zero LLM dependency."
8. **"Is 90% margin measured or modeled?"** "Modeled, and the slide says so: published token prices against realistic transcripts, ~$0.10–0.20 typical, $0.40 pathological, $0 execution. The event log already records every AI call; within a month of real users I'll quote measured p50/p95."
9. **"AI is gutting junior hiring. Market dying?"** "Same data is the why-now: fewer at-bats makes each one worth more prep, and the surviving interviews are shifting to exactly the real-world, AI-aware rounds I train. Honest tail risk: if junior hiring structurally collapses rather than resets, the wedge shrinks and my hedge is the B2B/hiring side, currently unvalidated."
10. **"Your activation and W4 retention? And November?"** "Undefined until launch; going in, activation = first scored round within 24h. WCSR will drop 40–60% in November when apps close; I'll show the dip annotated with the recruiting calendar plus Learn-track usage and the spring re-acceleration. If November shows no Learn stickiness either, that's a product problem I want to find in November."

## 7. Prep actions, ranked

**Next 2 weeks (by Aug 2):**
1. [product] Set DEEPSEEK_API_KEY in prod; fire-drill the fallback in staging; begin the Flash-successor migration with a scoring regression pass (done before classes, not during MBC).
2. [product] Metrics trio: define activation (first scored round ≤24h), add Learn activity to cohort retention (or render both lines), wire GA4 Data API visits or never quote a visit %.
3. [materials] Claims hygiene: verify pricing-page claims hold. (POST-COUNCIL VERIFICATION, see below: copy is consistent; only the money-back guarantee needs a decision.)
4. [gtm] Event-mode decision: allowlist/raise the 3-guest-sessions/hour/IP cap for event windows; pre-warm Pyodide on /interview load. Named disagreement: GTM wanted 5 free guest AI turns; VC/red team said keep the gate and demo signed in. **Side: keep the gate** (it's a deliberate cost/abuse control and launch-window engineering should be near zero); compensate with pre-signed-in event machines and revisit only if guest→signup runs under 10% by mid-October.

**By Sept 1:**
5. [gtm] Public launch by Aug 25; 20 cohort signups week one; ~30 QR posters with per-location ?src=; Dare to Dream application submitted; V1/CFE lists joined; SPARK Boot Camp enrolled; club outreach sent (HKN, WiCS, MDST, Michigan Hackers) for a pre-career-fair workshop.
6. [materials] 10-slide deck (max 12 words/slide; real dashboard screenshot on the metrics slide); three ask closers (competition / ecosystem / angel), each ending in a number and a date; FMF paragraph verified true; three timed demo rehearsals + backup video.
7. [product] Add token counts to ai_chat/feedback_generated events; add a scored-rounds dataset counter to admin (the flywheel needs a live number).

**By pitch day (rolling, Sept–Feb):**
8. [gtm] MHacks table + career-fair workshop; 6–8 ambassadors by Oct 15 (free Pro + leaderboard + small bounty from grant money); optiMize submission and MBC registration in October; one UMich career-center pilot conversation started by December.
9. [materials] Internal scoreboard of the six investor numbers (users, WCSR slope, W4 retention, guest→signup, organic MRR, B2B LOI); quote only first-party metrics; NPS verbatims, never the score.
10. [product] One manual Edge-vs-Node feedback parity check on the scored feedback screen; if scores match, sign off both deferred refactors as post-pitch and stop.

---

## Post-council verification (founder-side, done 2026-07-19)

- **Pricing copy is internally consistent** — the chair's action 3 flagged a "Free 8/mo vs 35/mo" discrepancy that does not exist: Free = 8 full interview sessions/mo, Pro = 35 sessions/mo at $25/mo or $225/yr. Both numbers are correct for their tiers (verified in app/pricing/).
- **"29% cheaper than LeetCode Premium" is arithmetically right** vs LeetCode's $35/mo monthly plan ($25 vs $35 = 28.6%). Keep the comparison pinned to monthly-vs-monthly.
- **The 30-day money-back guarantee is live copy on /pricing.** Keep only if you intend to honor it; a judge or user will quote it back.

## Seat verdicts

- **Pre-seed VC skeptic:** Today I pass on the meeting: solo founder, zero users, consumer prep wedge with a ~$25-50M US SAM, in a category where NeetCode already owns your exact audience at $119/yr. But this is a "come back in 90 days" pass, not a dead pass — the product is unusually complete and instrumented for pre-launch, the client-side-execution margin story is real, and the real-world-rounds thesis matches where interviews are demonstrably going. If you show up in November with a rising WCSR curve, 300+ UMich users, week-4 retention above 25%, and even $1-2K of student MRR, this becomes a fundable pre-seed on team velocity + early proof; without users it is a well-built demo, and I fund demand, not demos.
- **Campus GTM operator:** You have a genuinely demoable product landing on the single best campus GTM window that exists (intern apps peak Aug-Oct, career fairs late September), and the attribution/WCSR instrumentation means every poster and club talk is measurable from day 1. But two product facts will sabotage the launch if untouched: the guest trial hides your wow moment (AI chat is signed-in-only), and the 3-guest-sessions/hour/IP limit means any tabling event or lecture-hall demo on shared Wi-Fi dies after 3 people. Fix event-mode before August 25, run the first 100 users hand-to-hand through MHacks and a career-fair-prep event, then scale to 1000 via ambassadors and the free Learn tracks — and be honest with yourself that WCSR will crater in November when recruiting season ends; plan the spring cycle now.
- **Pitch coach / storyteller:** You have a rare pre-launch position: a fully demoable product, a real cost-structure story (client-side execution, ~90% gross margin), day-1 instrumentation, and a citable why-now (interviews shifting to real-world AI-aware rounds). The pitch risk is entirely delivery: zero users, a solo founder in love with the codebase, and a demo with known landmines (guest AI confusion, shared Wi-Fi rate limits, Pyodide cold load). Win by being demo-led on the bug-fix interviewer moment, brutally honest about traction ("judge me on this dashboard curve in 8 weeks"), and disciplined about what you do NOT show — voice, architecture depth, and the 316-lesson curriculum tour.
- **Technical diligence engineer:** This is an unusually strong pre-launch codebase for a solo founder — clean gates (1645 tests, typecheck, prod build), sealed server-side answers, and client-side execution that makes the ~85-90% margin story structurally real, not aspirational. Neither deferred engineering item blocks the pitch. The real technical risks are operational: an untested LLM fallback chain with Gemini 2.5 Flash deprecating Oct 16, 2026 (mid-first-semester), a bus factor of 1, and a moat that today is a 6-12 month execution lead plus cost structure — the data flywheel only starts compounding once campus users exist. Live-demo risk is fully manageable, but only if the checklist is executed: the two things that can kill a room are the 3-guest-sessions/hour/IP cap on shared venue Wi-Fi and a cold 5-15s Pyodide CDN load on stage.
- **Red team:** The product is real, deep, and demoable, but the founder walks into every room with the two weakest possible cards: zero users and solo. Nothing in the deck survives contact until the pricing-page claims are defensible, the demo landmines are scripted around, and there is a WCSR curve with real UMich students on it — so the fall sequence must be grants and competitions first, funds only after October data exists. The good news from the hostile seat: the "cheating" question and the "GPT wrapper" question both have genuinely strong answers grounded in what is actually built (sealed answers, client-side execution, rubric scoring, integrated curriculum), and the founder should want those questions asked.

## Scout headlines

- **Product truth (repo):** The full interview loop, Learn tracks, roadmap/SR, and Stripe billing are live and demoable — but the AI interviewer is signed-in-only (guests get editor + tests + a local score, not AI chat), and the 14 company packs ARE publicly reachable (the OFF flag only quarantines the unwired 10-state pack interviewer prompt).
- **Metrics (repo):** Instrumentation is genuinely strong for a pre-launch product — WCSR series, guest/registered funnel, first-touch attribution, NPS, referrals, and even retention cohorts all exist and are test-gated — but there is no per-user activation definition, no churn computation, and no real top-of-funnel visit count, and guest metrics are consent-gated.
- **UMich ecosystem (web):** UMich has a dense, grad-eligible ladder for this founder: Dare to Dream + Michigan Business Challenge + optiMize for non-dilutive cash (Sept-Feb), V1/MHacks for users, and Zell Founders Fund / ID Ventures / Michigan Rise for real checks once traction exists — but TechArb is on hiatus and ID's student FUSE Fund requires 2+ founders.
- **Competitors (web):** The field is crowded on DSA drills and real-time "interview copilots," but nobody credibly owns the practice loop for real-world engineering rounds (bug-fix/add-feature/decomposition) integrated with a learn-to-mastery curriculum — that is CodeSparring's defensible lane, and the scariest competitors are Final Round AI (distribution) and NeetCode/Hello Interview (student mindshare).
- **Market + unit economics (web):** Marginal cost per AI interview session is roughly $0.10-0.40 in Gemini tokens, giving ~90% realistic gross margins at $15-20/mo; the wedge market is real but modest (~$50-150M/yr US serviceable, est.), so the venture story must lean on B2B career-center/hiring-side expansion, and the category is demonstrably fundable (Final Round AI raised a $6.88M seed).
