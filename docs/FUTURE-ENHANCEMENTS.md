<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- CODESPARRING — FUTURE ENHANCEMENTS (product roadmap + PM training ground)   -->
<!-- ════════════════════════════════════════════════════════════════════════ -->

# CodeSparring — Future Enhancements

**Document type:** forward-looking product roadmap · PM-style research across every platform surface
**Horizon:** post-launch growth & expansion (Next / Later / Big Bets) — *not* the pre-launch fixes
**Companions:** [`PRD.md`](./PRD.md) (what exists) · [`GTM.md`](./GTM.md) (launch plan & blockers) · [`immediate_fixes.md`](../immediate_fixes.md) (hardening backlog)

---

## What this is (and isn't)

This is the **"what to build next"** doc: the growth, depth, and category-expansion bets to pursue
*once the product is live and stable*. It is deliberately scoped to the **future horizon** — it does
**not** re-litigate the launch blockers (cost-abuse hardening, claims cleanup, observability) already
tracked in `GTM.md` and `immediate_fixes.md`. Assume those are done.

Every proposal is anchored to the two things that make CodeSparring defensible:
- **The wedge** — *"practice the interview rounds LeetCode skips"* (Bug Fix, Case Labs, and the round
  types a single-function-puzzle model structurally can't serve).
- **The moat** — *evidence-based scoring* (the work-sample signal), the bridge to a B2B story.

## It's also a PM training ground 🧠

This roadmap is written to **build the reader's product-management muscle**, not just list features.
So:
- Every area section is a **real PM artifact** (JTBD → proposals → metrics → RICE → risks →
  competitive lens) you can learn the shape of by reading.
- Each area ends with a **"Your turn" rep** — a 15-minute exercise.
- **§1 (PM frameworks primer)** and the **PM practice program** at the end turn the whole doc into a
  course: frameworks explained, a reusable feature-brief template, graded drills, and a glossary.
- Bring your drill answers back to your mentor for critique — that's the loop.

> How to read it: skim **§0 (North Star & strategy)** and the **master roadmap** first for the big
> picture, then dive into the area you care about. If you're here to practice, start at §1, then pick
> one area and do its "Your turn."

---

## Contents

- **Part 0 — Strategy & prioritized roadmap** (North Star, themes, RICE master table, sequencing)
- **Part 1 — PM frameworks primer** (the toolkit this doc uses)
- **Part 2 — The twelve surfaces** (one PM deep-dive each, ending in a "Your turn" rep)
- **Part 3 — Build the muscle** (practice program: feature-brief template, drills, glossary)

---

# Part 0 · Strategy & prioritized roadmap

# CodeSparring Future-Enhancements Strategy & Master Roadmap

*Head of Product synthesis — post-launch growth horizon. Assumes the product is live and stable; pre-launch blockers live in GTM.md/immediate_fixes.md and are out of scope here.*

---

## 1. North Star & Strategy Frame

### North Star Metric: **Weekly Completed Scored Rounds (WCSR)**

> The number of Bug Fix / Case Lab (and, later, other-format) rounds that reach a completed, rubric-scored state per week.

**Why this and not the alternatives.** WCSR is the one number that sits at the intersection of every part of the strategy:

- **It is the atomic unit of delivered value.** A user gets what they came for exactly when they finish a scored round — not when they sign up, not when they read a page. Activation ("first scored round"), engagement depth (rounds per user), and retention (repeat rounds) are all just WCSR viewed at different time horizons.
- **Every scored round is a deposit into the moat.** The proprietary asset is a *corpus of graded real-codebase transcripts*. WCSR literally counts the rate at which that corpus — the thing LeetCode can't backfill in a quarter — compounds. Growing the North Star and deepening the moat are the same act.
- **It resists the wrong optimizations.** "Sessions started" rewards a leaky funnel; "streaks/DAU" rewards Duolingo-style vanity that corrodes the serious-prep brand; "revenue" is lagging and blind to the guest funnel. A *completed, scored* round can't be faked by a cold visitor bouncing off the editor.

**Guardrail / counter-metrics** (WCSR must not be grown by sacrificing these):

1. **Score credibility** — LLM-judge-vs-golden inter-rater agreement (weighted κ) and test–retest variance. If we manufacture rounds faster than we can score them honestly, the moat inverts into a liability. **Floor, not a dial.**
2. **Contribution margin per scored session** — fully-loaded AI COGS (interviewer + RAG + feedback + Sable) per completed round. Guest volume can spike WCSR while torching unit economics; this keeps growth solvent.
3. **Guest → Pro conversion rate** — the check that we're not padding WCSR with free volume that never monetizes, and that gating stays on the differentiated asset (the scorecard) rather than blunting the free wedge.

### The 4 strategic themes the roadmap ladders up to

| Theme | One-line thesis | Wedge/moat tie |
|---|---|---|
| **A. Deepen the work-sample moat** | Make the editor a *behavioral sensor*, the interviewer *react to what you do*, and the rubric *calibrated + longitudinal* — so the evidence is real, trustworthy, and improves with use. | This *is* the moat. It's the answer to "why can't LeetCode copy this in a quarter." |
| **B. Expand the round catalog & category** | Turn one round (Bug Fix) into a *format library* (Code Review, Scoping, later Design) and a *scalable company-lab catalog* via a verification-gated authoring pipeline. | Cashes the "rounds LeetCode skips" promise in full instead of half; feeds SEO and retention. |
| **C. Turn learners into interviewees** | Fuse Learn courses, interview rounds, FSRS, and roadmaps into one readiness loop with a single next-best-action, so new top-of-funnel audiences don't churn at the "now what?" cliff. | Converts the courses' new audiences into the wedge; makes the catalog feel like one coached journey. |
| **D. Open the B2B signal wedge** | Package the same rubric-scored transcript into a portable candidate credential, then an employer-issued work-sample assessment. | The strategic north star: the rubric becomes a product, not just a readout. Gated on A's calibration maturing. |

**The activation-to-moat spine that connects all four:** a guest fixes a real failing test → the editor instruments their behavior (A) → the rubric scores it credibly (A) → the scored card is the paywall (activation) → the readiness loop pulls them back (C) → the shareable scorecard advertises the wedge and seeds employer demand (D) → catalog breadth keeps them from running out (B). WCSR is the flow rate through that spine.

---

## 2. The Prioritized Master Roadmap

RICE normalized to one convention across all areas: **Reach** = users touched/quarter at soft-launch scale (guests/SEO largest, scored-session features mid, Pro-tier smaller); **Impact** on 0.25–3; **Confidence** 0–1; **Effort** in person-months; **RICE = R×I×C÷E**. Cross-area RICE numbers in the source sections used incompatible scales — these are re-scored on one ruler so they rank against each other.

| # | Feature | Area | Reach | Impact | Conf | Effort | RICE | Horizon |
|---|---|---|---|---|---|---|---|---|
| 1 | Programmatic "Company × Round" landing pages (page→*play*) | Growth | 20,000 | 2.0 | 0.70 | 4 | **7,000** | Now |
| 2 | Tiered + urgency packaging (Pro / Sprint / Maintenance) | Monetization | 8,000 | 2.0 | 0.80 | 2 | **6,400** | Now |
| 3 | Shareable Work-Sample Scorecard (viral + SEO artifact) | Feedback/Growth | 6,000 | 2.5 | 0.75 | 2 | **5,625** | Now |
| 4 | Rubric-first guest activation (scored-card as paywall) | Onboarding | 8,000 | 3.0 | 0.70 | 3 | **5,600** | Now |
| 5 | First-class Test Panel (explorer + diff-on-fail) | Editor | 5,000 | 2.5 | 0.85 | 2 | **5,313** | Now |
| 6 | Case-Lab "sign in for scored feedback" conversion gate | Onboarding | 3,000 | 2.0 | 0.85 | 1 | **5,100** | Now |
| 7 | Due-Review Reactivation Loop (FSRS → cross-channel nudge) | Retention | 6,000 | 1.5 | 0.80 | 1.5 | **4,800** | Now |
| 8 | Warm runner pool + reproducible env snapshots | Editor | 8,000 | 1.5 | 0.80 | 2 | **4,800** | Now |
| 9 | Multi-file workspace + real runtime stack traces | Editor | 5,000 | 3.0 | 0.85 | 3 | **4,250** | Now→Next |
| 10 | Interview-Readiness Score (per round-type / per company) | Readiness | 5,000 | 3.0 | 0.75 | 3 | **3,750** | Next |
| 11 | Next-Best-Action engine (one action per visit) | Readiness | 5,000 | 2.0 | 0.70 | 2 | **3,500** | Next |
| 12 | Behavioral phase-detection engine ("reacts to what you DO") | AI Interviewer | 5,000 | 3.0 | 0.70 | 4 | **2,625** | Next |
| 13 | Calibrated rubric v2 + percentile benchmark | Feedback | 5,000 | 2.0 | 0.70 | 3 | **2,333** | Next |
| 14 | Scenario Forge (verification-gated assisted authoring) | Content | 4,000 | 3.0 | 0.75 | 4 | **2,250** | Next |
| 15 | Rubric Calibration Warehouse (event pipeline) | Platform | 5,000 | 2.0 | 0.80 | 4 | **2,000** | Next (foundation) |
| 16 | Verified Work-Sample Report (candidate credential = B2B bridge) | Monetization | 5,000 | 2.5 | 0.55 | 4 | **1,718** | Later |
| 17 | Code Review Round (new round type on same substrate) | Case Labs | 2,500 | 2.0 | 0.80 | 3 | **1,333** | Later |
| 18 | Interview Countdown Mode (date-anchored prep plan) | Retention | 2,000 | 3.0 | 0.70 | 4 | **1,050** | Later |
| 19 | Employer Work-Sample Assessments (seat + per-assessment B2B) | Monetization | 500 | 3.0 | 0.40 | 8 | **75** | Big Bet |

*Also live in the backlog below the cut line and pulled forward as their dependencies land:* AI Cost & Quality Observability (~2,830 — ride it in with the warehouse as the margin guardrail on Theme D), Rubric-driven spaced repetition (~1,400), Adaptive company-targeted roadmap (~1,600), Scoping/Requirements Round (~cheap, ships beside Code Review), Skill Mastery Graph (foundational, RICE-punished — treated as an enabling substrate for 10/11/18, not a standalone bet), DuckDB-WASM SQL runner (unlocks Learn SQL / data-eng audience), In-browser debugger (XL — deferred until multi-file proves demand).

### Now / Next / Later / Big Bets

**NOW (first post-launch quarter — fill the funnel, keep the promise honest, don't leak):**
Programmatic Company×Round pages (1) · Tiered/urgency packaging (2) · Shareable Scorecard (3) · Rubric-first guest activation (4) · Test Panel (5) · Case-Lab conversion gate (6) · Due-Review Reactivation (7) · Warm runner pool (8) · Multi-file workspace + stack traces (9).
*Rationale: this is the acquisition→activation→first-retention spine. Cheap, high-confidence, high-reach, and every item either fills the top of funnel or makes the wedge feel real on contact. Packaging (2) is here because it's the near-term revenue win that funds everything.*

**NEXT (quarters 2–3 — turn the moat into a felt, adaptive product):**
Interview-Readiness Score (10) · Next-Best-Action (11) · Behavioral phase-detection (12) · Calibrated rubric v2 + percentile (13) · Scenario Forge (14) · Rubric Calibration Warehouse (15).
*Rationale: this is where "reacts as you work" and "am I improving?" stop being taglines. Requires the Now editor/telemetry substrate to exist first.*

**LATER (quarters 3–4 — breadth, credential, deadline-driven retention):**
Verified Work-Sample Report (16) · Code Review + Scoping Rounds (17) · Interview Countdown Mode (18) · Learn SQL + DuckDB-WASM runner · Rubric-driven spaced repetition · Adaptive company-targeted roadmap.

**BIG BETS (4q+ — the durable-revenue endgame, gated on calibration + volume):**
Employer Work-Sample Assessments (19) · Proctored "verified round" integrity layer · Skill Mastery Graph (full) · SOC2 + Privacy productization · System Design Round.

---

## 3. Sequencing & Dependencies

The roadmap is not a flat priority list — it's a chain of unlocks, and getting the order wrong wastes quarters.

**The load-bearing sequence:**

1. **Instrument before you adapt.** The Editor upgrades (Test Panel #5, Multi-file + stack traces #9, Warm pool #8) are the *sensor* that emits real "files inspected / tests run / root cause" telemetry. Everything in Theme A that reacts to behavior — phase-detection (#12), adaptive difficulty, the readiness score's evidence base — is only as good as this signal. **A debugger or adaptive interviewer built on a single-file model is wasted effort.** Build the sensor first.

2. **Warehouse before you calibrate, calibrate before you benchmark, benchmark before you sell.** The Rubric Calibration Warehouse (#15) is the append-only event pipeline everything downstream reads from. Calibrated rubric v2 + percentiles (#13) needs the warehouse *and* enough volume per scenario (gate percentile display behind an N-threshold — early self-selected guest cohorts make a "P70" meaningless). The B2B assessment (#19) needs a *measured* reliability number, not a marketing one. **Do not sell "signal" before it's calibrated** — the sequence is warehouse → calibration → consumer benchmark → employer product.

3. **Normalize the taxonomy before the readiness score; readiness before smart recommendations.** The Interview-Readiness Score (#10) depends on a stable rubric schema *across* round types (Bug Fix vs Case Lab vs Learn) — the competency taxonomy (skill graph, thin v1) underpins it. The Next-Best-Action engine (#11) then routes *from* a detected weakness *to* the right round — so it needs both the score and the catalog to point at.

4. **Forge before catalog breadth; catalog breadth before B2B.** Scenario Forge (#14) is the enabler whose RICE is *understated* because Company Packs, the difficulty matrix, new round types (#17), and Learn-course generation all become cheap only after it ships. An employer (#19) needs breadth, not 17 items — so Forge is on the critical path to the B2B bet, not just to consumer retention. **Hold the line on Forge-first**; building any downstream catalog work bespoke duplicates the authoring/verification spine.

5. **The scorecard is one artifact serving two audiences in sequence.** The consumer Shareable Scorecard (#3, Now) → the Verified Work-Sample Report credential (#16, Later) → the Employer-issued Assessment (#19, Bet) are the *same artifact at rising trust levels*. Candidate-side sharing seeds employer-side demand; ship them in that order, and never ship "shareable" without the reliability floor from #13/#15 behind it.

**The 1–2 highest-leverage bets to protect if forced to cut:**

- **Protect #4 (Rubric-first guest activation) + #1 (Company×Round pages) as a pair.** Together they are the entire low-CAC engine: SEO dumps high-intent cold traffic onto a *playable* page, and the scored-card-as-paywall converts it on the moat itself. Cut these and every downstream retention/monetization feature is optimizing an empty funnel. This is the pair that most directly moves WCSR.
- **Protect the sensor→warehouse foundation (#5/#9 → #15).** These are unglamorous and RICE-punished relative to their strategic weight, so they're the first things a quarter-crunch tempts you to defer. But they are the *precondition for the moat existing as data* — defer them and Themes A and D quietly become impossible. Everything else is a feature; this is the foundation.

---

## 4. How to Keep This Doc Alive

Treat this as a **living quarterly artifact, not a launch plan.** Every quarter, re-score the master RICE table with *real* usage data — swap the estimated Reach numbers for measured funnel volumes, replace guessed Confidence with observed effect sizes from flag-gated experiments, and re-rank. The moment the Calibration Warehouse (#15) and an experimentation loop exist, RICE stops being a debate and becomes a readout: promote what measurably moved WCSR without breaching a guardrail (score credibility, contribution margin, guest→Pro conversion), and **kill — not quietly deprioritize — anything that shipped and did not move the North Star or a theme it ladders to.** Each quarterly review should produce three decisions per active bet: *double down, hold, or kill*, with the deciding metric named in advance (the PM-rep "kill-memo" discipline from each area section, applied for real). The wedge and moat are fixed; the roadmap under them is an evidence-based, decaying prior — revisit it before it goes stale, exactly as we ask users to refresh their own readiness.

---

# Part 1 · PM frameworks primer


A primer. Every framework below is a *thinking tool*, not a ritual. Each entry: what it is, a CodeSparring example, and when it lies to you. Read once, then refer back when a roadmap item cites one.

---

### North Star Metric (NSM)
**What:** The single number that best proxies the value customers get from you — the metric you'd optimize if you could only watch one.
**CodeSparring example:** *Substantiated practice rounds completed per active user per week* (a round where the AI interviewer engaged AND feedback was generated). It captures the core loop: real practice, not sign-ups.
**Use it when:** you need one shared direction across eng, growth, and content.
**It misleads when:** you treat it as a target to game rather than a proxy for value. "Rounds started" would inflate with a louder CTA while learning stays flat. A good NSM must degrade if you cheat it — which is why it's paired with counter-metrics.

### Jobs-To-Be-Done (JTBD)
**What:** People "hire" a product to make progress in a situation; describe the *job*, not the user demographic.
**CodeSparring example:** *"When I have a Palantir onsite in two weeks, help me practice the exact rounds I'll face so I walk in calm and prepared."* Note the job is progress-in-a-situation, not "SWE wants coding practice."
**Use it when:** you're deciding what to build and want to avoid feature-envy of competitors.
**It misleads when:** you write jobs so broad ("get a job") they justify anything, or so narrow they're just a feature restated. A job should survive the question "would a user say this out loud?"

### RICE prioritization
**What:** A score to rank initiatives. **RICE = (Reach × Impact × Confidence) / Effort.**
- **Reach:** how many users/events per time period (e.g. users/quarter).
- **Impact:** per-user effect, scored on a fixed scale (3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal).
- **Confidence:** % you believe your Reach/Impact estimates (100% / 80% / 50%).
- **Effort:** person-months (or person-weeks). The one term in the denominator.

**CodeSparring example:** "SQL runner in Learn" — Reach 4,000/qtr, Impact 1, Confidence 80%, Effort 3 → (4000×1×0.8)/3 ≈ **1,067**. Compare against "voice mode polish" scored the same way; the numbers force an argument.
**Use it when:** you have many comparable, roughly-independent items and need a defensible ranking.
**It misleads when:** items aren't comparable (a moat bet vs. a bug fix), Effort is unknown, or people fudge Confidence to float a pet feature. RICE ranks *within a horizon*, not across strategy tiers.

### ICE
**What:** RICE's lightweight cousin. **ICE = Impact × Confidence × Ease.** No Reach, no units — fast and rough.
**CodeSparring example:** Triaging ten small growth experiments (new vs-competitor SEO page, referral banner copy) in an hour.
**Use it when:** early ideation, high volume, low stakes, speed matters more than rigor.
**It misleads when:** you use it for real resource allocation. Without Reach it over-rewards easy, low-audience tweaks. Graduate winners to RICE.

### Kano model
**What:** Classifies features by how satisfaction responds to them:
- **Basic (must-have):** absence causes anger; presence is unnoticed. (Code editor doesn't lose your work.)
- **Performance (linear):** more is better, and users notice. (Feedback quality; scenario catalog size.)
- **Delighter (exciter):** unexpected joy; absence isn't missed. (AI interviewer reacts *emotionally* as you debug.)

**CodeSparring example:** Reliable client-side execution = Basic. Depth of the evidence-based rubric = Performance. Sable tutor cracking a well-timed joke = Delighter.
**Use it when:** balancing a roadmap so you're not all-delighters-no-basics (or vice versa).
**It misleads when:** you forget delighters decay into expectations (today's wow is next year's baseline), and that shipping a delighter on top of a broken basic is worthless.

### Opportunity Solution Tree (OST)
**What:** A tree linking your **outcome** (top) → **opportunities** (unmet needs/pain, branches) → **solutions** (leaves) → **experiments**. Keeps solutions tied to a need tied to a goal.
**CodeSparring example:** Outcome: *increase guest→Pro conversion*. Opportunity: *"guests finish one Bug Fix round but don't see what Pro unlocks."* Solutions: post-round "here's your rubric gap" teaser, company-targeted round preview, referral nudge. You compare *solutions against the same opportunity*, not against each other blindly.
**Use it when:** you're tempted to jump straight to a feature. The tree forces "which need does this serve, and are there cheaper ways?"
**It misleads when:** it becomes a documentation exercise. It's a discovery aid, not a deliverable.

### MoSCoW
**What:** Scope-cutting buckets: **Must / Should / Could / Won't (this time).** The "Won't" is the point — it's explicit, recorded descoping.
**CodeSparring example:** For a Case Labs v2 launch — Must: authorable scenario schema. Should: difficulty tiers. Could: peer-comparison percentile. Won't-yet: live human review.
**Use it when:** you have a fixed date (soft launch) and negotiable scope.
**It misleads when:** everything becomes a "Must" (then it's just a to-do list) or "Won't" is left blank (then you haven't actually decided anything).

### Effort/Impact 2×2
**What:** Plot items on Effort (x) vs Impact (y). Quadrants: **Quick wins** (low effort/high impact — do now), **Big bets** (high/high — plan), **Fill-ins** (low/low — maybe), **Money pits** (high effort/low impact — avoid).
**CodeSparring example:** Quick win: add three vs-competitor SEO pages. Big bet: B2B "work-sample signal" employer product. Money pit: a bespoke VS Code extension no persona asked for.
**Use it when:** you need a fast visual portfolio view for a room of stakeholders.
**It misleads when:** you pretend it's precise. It's a conversation starter; two dots near each other aren't meaningfully ranked. Use RICE when the call is close.

### Leading vs lagging metrics
**What:** **Leading** metrics predict the future and you can influence them this week; **lagging** metrics confirm the past and move slowly.
**CodeSparring example:** Leading = guest round completion rate, day-2 return rate, rubric-gap views. Lagging = MRR, churn, LTV. If the leading indicators move, the lagging ones follow later.
**Use it when:** you need a signal *before* the quarter is over. Steer by leading, judge by lagging.
**It misleads when:** you celebrate a leading metric that doesn't actually connect to the lagging one (a "vanity" leading metric). The link must be validated, not assumed.

### Feature vs Bet vs Theme
**What:** Three altitudes, often confused:
- **Feature:** a specific thing you build. *"SQL runner in the editor."* Scoped, shippable, estimable.
- **Bet:** a hypothesis about value with an uncertain outcome and a wager attached. *"If we ship company-specific Case Labs, target-company job-seekers will convert to Pro at 2× the generic rate."* A bet can contain several features and can fail.
- **Theme:** a strategic area of focus for a period. *"Deepen the evidence-based moat," "Expand the category beyond interviews into learning."* A theme frames many bets.

**Use it when:** planning. Themes set direction (quarters), bets test strategy (weeks–months), features execute (sprints).
**It misleads when:** you dress a feature up as a bet (no hypothesis, no way to be wrong) or a theme as a feature (too vague to build). Ask: *Can this be wrong? At what altitude?*

---



---

# Part 2 · The twelve surfaces

> Each surface is a self-contained PM artifact: **JTBD → why now → proposed backlog → success metrics → RICE → risks → competitive lens → a "Your turn" rep.**

## AI Interviewer & Interview Realism
**TL;DR:** Evolve the interviewer from a reactive chat layer into a calibrated, persona-accurate examiner whose questioning, difficulty, and hint timing are driven by your live problem-solving signals — making "reacts as you work" the product's defensible realism rather than a tagline.

### The job & the gap (JTBD)
- **JTBD:** *When* I'm preparing for a specific company's technical rounds, *I want to* rehearse against an interviewer who probes, pushes back, and reacts the way a real one would, *so I can* build the composure and communication habits that actually decide pass/fail — not just get the code green.
- **The gap today:** The interviewer is a competent chat layer with RAG-assisted hints, but its behavior is largely uniform across ~17 Bug Fix scenarios and Case Labs. "Reacts as you work" is shallow — it responds to *messages* far more than to your actual editor/test/execution activity. Difficulty doesn't calibrate to demonstrated skill, hint timing is generic (fires on ask, not on stuck-vs-thinking state), and personas are cosmetic (a name/logo, not a behaviorally distinct interviewer with a different bar and probing style). The realism promise is one behavioral layer deeper than the current implementation delivers.

### Why now
- **The wedge IS realism.** Bug Fix + Case Labs are live and the entire differentiation vs LeetCode is the *round*, not the puzzle. Every increment of interviewer believability compounds the "rounds LeetCode skips" positioning — this is the highest-leverage surface in the product.
- **We already capture the substrate no one else has.** The evidence-based rubric is *streaming* behavioral signals (files inspected, tests run, hypothesis stated, root cause found, AI-collaboration quality). That is exactly the real-time input needed to drive an adaptive interviewer — a moat asset currently used only for post-session feedback.
- **Human-interviewer scarcity is the arbitrage.** interviewing.io/Pramp deliver realism via scarce, scheduled humans. An AI that credibly *behaves* like a strong interviewer at infinite scale, on company-specific rounds, is the structural advantage — and buyers increasingly expect company-accurate realism, not a generic mock.

### Proposed enhancements (the backlog)

1. **Behavioral phase-detection engine ("reacts to what you DO")** — the interviewer reacts to your keystrokes, test runs, and idle time, not just your chat messages.
   - *User story:* "As a job-seeking SWE, I want the interviewer to notice when I've been stuck for two minutes or when I run tests without stating a hypothesis, so that the pressure and prompts feel like a real round."
   - *Effort:* L · *Impact:* Very-High · *Horizon:* Next.
   - *Ties to moat/wedge:* Operationalizes the "reacts as you work" claim from telemetry and feeds the evidence rubric with live signals — the precise capability LeetCode's single-function model structurally can't copy.

2. **Adaptive difficulty & follow-up laddering** — the round gets harder or eases off based on how you actually performed, and picks your next scenario accordingly.
   - *User story:* "As a career switcher, I want follow-ups to soften when I'm struggling and sharpen when I'm cruising, so that I'm always practicing at the edge of my ability."
   - *Effort:* M · *Impact:* High · *Horizon:* Next.
   - *Ties to moat/wedge:* Turns the scoring rubric into a closed control loop — personalization that only works if you own the behavioral signal, which we do.

3. **Behaviorally-distinct company personas** — practice against an interviewer who probes like *that* company (Palantir FDSE data-modeling tradeoffs; Amazon LP-style bar-raising), grounded in Case Labs company data.
   - *User story:* "As a job seeker targeting Palantir, I want an FDSE-style interviewer who pushes on data-modeling tradeoffs and prevention, so that the rehearsal transfers to the real round."
   - *Effort:* M · *Impact:* High · *Horizon:* Next/Later.
   - *Ties to moat/wedge:* Extends the Case Labs catalog into the interviewer layer; company-accurate realism is both a programmatic-SEO magnet and a hard-to-replicate content+behavior moat.

4. **Voice-mode "live round" with verbal think-aloud scoring** — a spoken mock round that scores how clearly you explain your reasoning, not just your code.
   - *User story:* "As a working SWE refreshing my skills, I want to talk through my debugging out loud and get feedback on my communication, so that I'm ready for the verbal reality of onsites."
   - *Effort:* L · *Impact:* Med/High · *Horizon:* Later.
   - *Ties to moat/wedge:* Communication/collaboration is a rubric dimension LeetCode ignores entirely — extends the moat to the soft signal that actually decides onsites.

5. **Proctored "verified round" (B2B integrity)** — a tamper-evident, paste/AI-assist-aware session that produces an employer-trustable work-sample signal.
   - *User story:* "As a hiring manager, I want a proctored CodeSparring round with an integrity-scored transcript, so that I can trust it as a real work-sample signal for screening."
   - *Effort:* XL · *Impact:* High (B2B) · *Horizon:* Bet.
   - *Ties to moat/wedge:* The literal bridge from consumer practice to the B2B "work-sample signal" story — the endgame the evidence rubric was built to enable.

### Success metrics
- **Leading — realism felt:** post-session "felt like a real interview" micro-rating (target ↑), and % of sessions where phase-detection fires a *human-rated-appropriate* intervention (↑).
- **Leading — engagement depth:** rounds-per-active-user and session completion rate (↑) — realism should increase, not stress users out of, finishing.
- **Adaptive quality:** difficulty-calibration accuracy (predicted vs. actual performance gap ↓) and hint-appropriateness rating (↑).
- **North-Star-linked:** guest→Pro conversion on the first Bug Fix round (realism is the activation aha) and Pro repeat-round retention (↑).

### RICE snapshot
*Assumptions: Reach = active users touched per quarter (pre-launch ~8k target base); Impact on 0.25–3 scale; Confidence 0–1; Effort in person-months. RICE = Reach×Impact×Confidence÷Effort.*

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| Behavioral phase-detection engine | 8,000 | 3.0 | 0.7 | 4 | 4,200 |
| Adaptive difficulty & follow-up laddering | 8,000 | 2.0 | 0.7 | 3 | 3,733 |

### Risks & dependencies
- **Cost/latency:** telemetry-driven prompting risks inflating LLM call volume and mid-round latency. Mitigate with local heuristics/debouncing *before* any LLM call and feature-flag gating (per the AI-cost principle) — don't turn every keystroke into an inference.
- **Adoption/perception:** "realism" is subjective and over-aggressive interruptions can feel gimmicky or stressful and *reduce* completion. Needs tuning, a user-adjustable "interviewer intensity," and A/B validation against completion rate.
- **Sequencing:** adaptive difficulty and personas both depend on *trustworthy* rubric signals — if scoring is noisy, the control loop misfires. Nail phase-detection + signal quality first; keep proctoring (a different, B2B buyer) from pulling the roadmap ahead of consumer realism.

### Competitive lens
- **The field splits two ways:** interviewing.io/Pramp buy realism with scarce, scheduled *humans* (high fidelity, low scale, friction); LeetCode/AlgoExpert offer static problems with *no* interviewer; CodeSignal proctors assessments but isn't conversational practice; HelloInterview does guided AI mocks but skews puzzle/system-design.
- **CodeSparring's angle:** an infinite-scale interviewer that reacts to your *actual work* on real-codebase rounds and scores you on an evidence rubric — the fidelity of a human plus the repeatability, personalization, and data of software. That combination is what makes the realism defensible rather than a demo.

### 🧠 Your turn (PM rep)
Take features **1 (phase-detection), 2 (adaptive difficulty), and 4 (voice mode)** and RICE them yourself using your *own* reach/effort assumptions for a 10k-MAU pre-launch product — then write the 3-sentence **kill-memo for shipping phase-detection first**: what breaks if the behavioral signal is noisy, what cheaper experiment could prove "realism moves conversion" before you build the telemetry engine, and which single metric you'd watch to reverse the decision. Doable in 15 minutes; the point is to pressure-test the highest-RICE item, not to confirm it.

---

## Code Execution & Editor Experience
**TL;DR:** The in-browser IDE should stop being a code sandbox and become CodeSparring's *evidence instrument* — a realistic, multi-file, instantly-warm debugging surface whose every action (files opened, tests run, breakpoints set) feeds the scoring rubric that LeetCode structurally cannot replicate.

### The job & the gap (JTBD)
- **Core JTBD:** *"When I'm practicing a Bug Fix or Case Lab round, I want to navigate, run, and debug a real codebase the way I would at work, so I can prove (to the AI and to myself) how I actually diagnose and fix problems — not just whether I can type the answer."*
- **The gap today:** The current CodeMirror + Pyodide/JS surface runs code, but it behaves like a single-function puzzle box, not a codebase. The flagship promise — "fix a failing test in a real codebase" — is undercut when a candidate can't fluidly open multiple files, read a real stack trace pointing to the failing line, step through execution, or see *which* assertion failed and why. The moat rubric wants "files inspected, tests run, hypothesis, root cause" — but the editor currently emits weak signal for those fields because it doesn't natively capture navigation, test-run, or debugging behavior. Add cold-start latency on Pyodide (first-run wheel loads) and the guest's very first "Run" — the highest-stakes moment in the funnel — can feel slow and unrealistic.

### Why now
- **The wedge just shipped and needs a body to match the promise.** Bug Fix (~17 scenarios) and Case Labs are live; the positioning is "rounds LeetCode skips." A puzzle-grade editor makes that claim feel hollow on contact. The editor is now the credibility bottleneck, not the content.
- **The moat is only as strong as its evidence pipeline.** Scoring on "files inspected / tests run / hypothesis / root cause" is the answer to "why can't LeetCode copy this in a quarter." That answer is real only if the editor *instruments* those behaviors. Every editor investment here compounds directly into defensibility and the future B2B work-sample-signal story.
- **Client-side execution tech has caught up.** DuckDB-WASM (real SQL/warehouse-ish analytics in-browser), maturing Pyodide, and WASM toolchains make multi-language, zero-server, reproducible runners viable — matching the deliberate Piston-deprecation/client-side direction while unlocking Learn SQL and data-eng case rounds.

### Proposed enhancements (the backlog)

1. **Multi-file workspace + real runtime stack traces** — turn the pane into an actual repo: file tree, cross-file jump-to-definition, and errors that surface a clickable stack trace landing on the offending line.
   - *User story:* "As a job-seeking SWE, I want to navigate a multi-file codebase and read a real stack trace when a test throws, so that the Bug Fix round feels like debugging at work instead of solving a puzzle."
   - *Effort:* L · *Impact:* Very-High · *Horizon:* Next.
   - *Ties to moat/wedge:* This *is* the wedge made tangible; navigation + trace-reading events are the raw material for the "files inspected / root cause located" rubric fields.

2. **First-class Test Panel (explorer + diff-on-fail + per-test run)** — a dedicated panel listing each test, red/green status, expected-vs-actual diff on failure, and one-click "run this test only" / watch mode.
   - *User story:* "As a career switcher, I want to see exactly which assertion failed and how expected differs from actual, so that I can form a hypothesis instead of guessing what 'the test' wants."
   - *Effort:* M · *Impact:* Very-High · *Horizon:* Next.
   - *Ties to moat/wedge:* Test-run cadence and diff-reading are directly scored ("tests run," "hypothesis quality"); makes the AI interviewer's reactions specific ("you re-ran without changing the fix — walk me through your reasoning").

3. **In-browser debugger: breakpoints, step, inspect (Pyodide + JS first)** — set breakpoints, step over/into, and inspect variables client-side; where WASM stepping is infeasible, ship an instrumented "trace mode" (print/inspect scaffolding) as the fallback.
   - *User story:* "As a working SWE refreshing skills, I want to set a breakpoint and inspect state at the moment the bug manifests, so that I can demonstrate real diagnostic methodology, not print-statement archaeology."
   - *Effort:* XL · *Impact:* High · *Horizon:* Bet.
   - *Ties to moat/wedge:* Breakpoint placement is the single richest signal of debugging skill — no puzzle competitor captures it; deepens "hypothesis → root cause" scoring dramatically.

4. **DuckDB-WASM SQL runner + dialect coverage (warehouse flavors)** — client-side SQL execution with result-grid, query plans, and Postgres/warehouse-style dialects to power Learn SQL and data-eng Case Labs.
   - *User story:* "As a data-engineering intern candidate, I want to run analytical SQL against a realistic schema and see the result set and plan, so that I can practice the warehouse rounds real data interviews use."
   - *Effort:* M · *Impact:* High · *Horizon:* Later.
   - *Ties to moat/wedge:* Category expansion (new audience: data-eng), not dilution — same evidence-capture model (queries run, iterations, correctness) extends the rubric to a new interview family.

5. **Warm runner pool + reproducible environment snapshots** — pre-warm Pyodide/DuckDB with cached wheels/assets so first "Run" feels instant, and pin each scenario to a versioned, reproducible environment.
   - *User story:* "As a guest on my first no-signup round, I want my first Run to return results in under a second, so that I trust the product before I'm asked to sign up."
   - *Effort:* M · *Impact:* High · *Horizon:* Next.
   - *Ties to moat/wedge:* Adjacent but load-bearing — identical, pinned environments make evidence *comparable across candidates*, the technical precondition for the B2B "work-sample signal" pitch; and cold-start is a direct guest-conversion lever.

### Success metrics
- **Run-to-first-result latency** (p50/p95) — down (leading; guest-conversion proxy).
- **Evidence-capture rate** — % of Bug Fix sessions that open >1 file AND run tests ≥2 times — up (leading; proves the editor is feeding the rubric).
- **Rubric-field completeness** — % of scored sessions where "files inspected / tests run / root cause" are populated from real editor telemetry (not inferred from chat) — up (moat health).
- **Guest→Pro conversion on Bug Fix rounds** — up (North-Star-linked outcome).

### RICE snapshot
*Assumptions: Reach = 1–10 relative share of live sessions the feature touches; Impact = {0.25,0.5,1,2,3}; Confidence = probability; Effort = person-months.*

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| Test Panel (explorer + diff-on-fail) | 10 | 2 | 0.85 | 2 | **8.5** |
| Multi-file workspace + stack traces | 9 | 3 | 0.9 | 3 | **8.1** |

(Warm runner pool scores ~6.0 and is the clear #3 — cheap, universal reach, but incremental to an already-working experience.)

### Risks & dependencies
- **Sequencing:** Multi-file workspace is a dependency for a credible Test Panel and debugger — build it first; a debugger on a single-file model is wasted effort.
- **Technical ceiling of client-side execution:** Breakpoint stepping in Pyodide/WASM is genuinely hard, and Go/Rust essentially require WASM toolchains or a thin ephemeral server runner (Vercel Sandbox / microVMs) — which reopens the cost-abuse surface the client-side move deliberately closed. Gate compiled-language execution behind auth + quotas from day one.
- **Cannibalization/scope creep:** A "real IDE" invites feature requests (extensions, terminals, git) that pull toward being a worse VS Code. Hold the line: build only what generates *interview evidence*, not general-purpose developer tooling.

### Competitive lens
- **LeetCode / AlgoExpert:** single-file, server-run hidden-judge, no surfaced stack traces, no debugger, no multi-file — structurally a puzzle box; they can't cheaply retrofit codebase-realism because their whole content model is single functions.
- **CodeSignal** is the real threat here — its assessment IDE already does multi-file and multiple languages — but it's proctored one-shot *evaluation*, not AI-coached *practice with an evidence rubric*. **CodeSparring's angle:** the editor is not just where you type — it's a behavioral sensor wired to an AI interviewer and an evidence-based score, on real multi-file codebases, running instantly client-side.

### 🧠 Your turn (PM rep)
You have **one engineer for one quarter**. You cannot ship everything. In 15 minutes: build a 5-row RICE table for the features above using your *own* Reach/Impact/Confidence/Effort numbers, then write a 3-sentence decision memo answering one question — **do you spend the quarter on the debugger (Feature 3), or on the bundle of Multi-file + Test Panel + Warm pool (1, 2, 5)?** Force yourself to name the one metric you'd bet your decision on, and the strongest argument for the option you *didn't* pick.

---

## Feedback, Scoring & the Rubric (the moat)

**TL;DR:** Turn the six-dimension evidence rubric from a per-session score into a *calibrated, benchmarked, longitudinal signal* — a shareable scorecard candidates trust and employers can eventually consume as work-sample evidence LeetCode structurally cannot produce.

### The job & the gap (JTBD)
- **Core JTBD:** "When I finish a Bug Fix or Case Lab round, I want to know *how good that was against a real hiring bar and whether I'm getting better*, so I can decide what to practice next and walk into the real interview calibrated." Secondary (B2B): "When I'm screening candidates, I want *defensible evidence of how someone actually debugs a real codebase*, so I can advance fewer false negatives."
- **The gap today:** The rubric already captures the right *dimensions* (files inspected, tests run, hypothesis, root cause, prevention, AI-collaboration quality) — but a score is only meaningful relative to a bar and over time. Right now feedback is almost certainly delivered as a single-session, absolute readout with no answer to the two questions that actually drive retention: *"Is this a good score?"* and *"Am I improving?"* There's no benchmark anchor, no per-skill trend, no artifact worth sharing, and no reliability story that lets us ever say "this signal predicts interview performance." The moat is *described* in the rubric dimensions but not yet *productized* into something defensible or viral.

### Why now
- **The rubric is built but under-monetized as a moat.** The dimensions exist; the differentiated value (calibration, benchmarking, longitudinal signal, employer-consumable report) is 100% upside we haven't harvested — and it's the single hardest thing for LeetCode to copy in a quarter because it requires a *corpus of scored real-codebase sessions*, not a judge prompt.
- **We now have the two inputs a benchmark needs.** ~17 substantiated Bug Fix scenarios + an expanding Case Labs catalog + a live guest funnel means we're about to accumulate the graded-transcript volume that makes percentile benchmarks and calibration statistically real. Every guest round is free labeled training data for the bar — a compounding, proprietary asset.
- **Spaced repetition (ts-fsrs) is already in the stack** but scoring and scheduling aren't yet fused. Per-skill scores are the natural signal to drive review scheduling — the "evidence-based learning" vision is one integration away, and it's the thing that turns feedback from a report into a habit loop.

### Proposed enhancements (the backlog)

1. **Calibrated rubric v2 with a named bar + percentile benchmark** — every dimension scored against an explicit hiring bar (e.g., "senior SWE, FAANG-tier debugging round") plus a cohort percentile.
   - *User story:* "As a job-seeking SWE, I want each of my six rubric scores shown against the bar and my percentile vs everyone who did this scenario, so I know if my root-cause reasoning is actually interview-ready or just felt fine."
   - *Effort:* M · *Impact:* High · *Horizon:* Next.
   - *Ties to moat/wedge:* The benchmark corpus (proprietary graded real-codebase transcripts) is the exact asset a puzzle-first competitor can't backfill; a percentile is only credible if you own the distribution.

2. **Shareable "Work-Sample Scorecard"** — a clean, public-linkable report of a completed round (rubric radar, the bar comparison, a 3-line narrative of how they debugged), with the reasoning trace optionally attached.
   - *User story:* "As a career switcher, I want a shareable scorecard proving I can fix a failing test in a real repo, so I can send it to a recruiter (or myself) as evidence I've moved past LeetCode drills."
   - *Effort:* M · *Impact:* Very-High · *Horizon:* Next.
   - *Ties to moat/wedge:* Every share is SEO + a viral loop that literally advertises the wedge ("rounds LeetCode skips"), *and* it's the MVP of the B2B employer signal — same artifact, two audiences.

3. **Longitudinal per-skill improvement engine (score → spaced review)** — trend lines per rubric dimension, a weekly "biggest mover / biggest gap," and auto-scheduled review scenarios that target the weakest dimension via ts-fsrs.
   - *User story:* "As a working SWE on maintenance mode, I want the product to notice my 'prevention/test-writing' score is flat and queue a targeted review, so I refresh efficiently without re-grinding everything."
   - *Effort:* L · *Impact:* High · *Horizon:* Later.
   - *Ties to moat/wedge:* Fuses scoring with the existing FSRS engine — turns a one-shot report into the retention habit loop, and "are you improving" is a claim only a longitudinal rubric can make.

4. **Rubric calibration & reliability program (golden transcripts + judge audit)** — a set of expert-scored "golden" sessions, inter-rater agreement tracking between the LLM judge and human labels, and drift alerts when the judge diverges.
   - *User story:* "As the PM/founder, I want a measured reliability number for the scorer, so I can defend 'this score means something' to a candidate today and an employer's legal/hiring team later."
   - *Effort:* L · *Impact:* High (moat) · *Horizon:* Later.
   - *Ties to moat/wedge:* This is the *actual* defensibility — a calibrated, audited scorer with a labeled corpus is the barrier to entry and the precondition for any B2B claim. Without it, benchmarks and B2B are marketing, not signal.

5. **Employer Work-Sample Signal (B2B) — verified round + exportable evidence report** — a proctored/verified Bug Fix or Case Lab an employer assigns, returning a standardized evidence report (rubric + reasoning trace + integrity flags) instead of a pass/fail.
   - *User story:* "As a hiring manager, I want to send a candidate one real-codebase round and get back *how they debugged* — hypothesis quality, tests run, root-cause depth — so I stop screening on whiteboard puzzles that don't predict the job."
   - *Effort:* XL · *Impact:* Very-High · *Horizon:* Bet.
   - *Ties to moat/wedge:* The whole strategic north star — the rubric becomes a B2B product, not just a consumer readout. Adjacent to today's revenue but the reason the moat is worth building.

### Success metrics
- **Score calibration / test–retest reliability** (moat health): judge-vs-golden inter-rater agreement ↑ toward a defensible threshold (e.g., weighted κ / correlation); score variance on repeated identical inputs ↓.
- **Scorecard share rate** (leading, growth): % of completed rounds whose scorecard is shared or public-linked ↑ — and share→signup conversion on inbound scorecard traffic.
- **Per-skill improvement rate** (leading, retention/moat): % of returning users whose weakest-dimension score rises ≥1 band across 3 sessions ↑.
- **North-Star-linked outcome:** guest→Pro conversion and 4-week retention for users who *saw a benchmark/percentile* vs those who didn't — proving calibrated feedback drives the funnel, not just the vanity of a score.

### RICE snapshot
Assumptions: Reach = share of active users touched per quarter (0–1 × relative scale); Impact 0.25→3 (Massive); Confidence 0–1; Effort in person-months. RICE = R×I×C÷E.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| Shareable Work-Sample Scorecard | 900 (all finishers, incl. guests) | 2.0 | 0.8 | 2.0 | **720** |
| Calibrated rubric v2 + percentile benchmark | 800 (every scored session) | 2.0 | 0.7 | 3.0 | **373** |

*Read:* the scorecard wins on reach + virality + lower effort; but it's *hollow without* the benchmark behind it — sequence them together (benchmark powers the scorecard's "vs the bar" line), which is why both are Next.

### Risks & dependencies
- **Cold-start benchmark bias.** Early percentiles come from a small, self-selected (guest-heavy, possibly low-effort) cohort — a "P70" could be meaningless or discouraging. Mitigate: gate percentile display behind an N-threshold per scenario; until then show only the named-bar comparison.
- **LLM-judge reliability is the whole moat and the whole risk.** A scorecard people *share* raises the stakes on a wrong score (reputational + eventually legal for B2B). Calibration program (#4) is a hard dependency for the B2B bet (#5) and a soft dependency for public scorecards — don't ship "shareable" without a reliability floor.
- **Cannibalization / positioning.** A too-generous shareable score cheapens the signal ("everyone's a P90"); a too-harsh one kills the guest funnel. This is a tuning problem that trades directly against activation — own it explicitly, don't let it default.

### Competitive lens
- **LeetCode / AlgoExpert / Educative** grade *correctness on a puzzle* (pass/fail on hidden tests) — no process signal, nothing to benchmark a *bar* against, nothing an employer reads as work-sample evidence. **CodeSignal** productizes an employer score, but on standardized algorithmic tasks, not real-codebase debugging behavior. **Pramp / interviewing.io** give qualitative peer/expert feedback — high trust, zero scale, no longitudinal or comparable signal. **HelloInterview** offers structured rubrics/mock feedback but human-paced and not a proprietary graded corpus.
- **CodeSparring's angle:** we're the only one whose feedback is *both* process-based (how you debugged a real failing test, incl. AI-collaboration quality) *and* scalable *and* longitudinal — a scored corpus of work-sample rounds LeetCode can't fabricate and Pramp can't scale. The scorecard is the wedge made visible; calibration is why the number survives contact with an employer.

### 🧠 Your turn (PM rep)
Take the six rubric dimensions and pick the one you believe is **hardest for an LLM judge to score reliably** (my bet: "root cause identification" or "AI-collaboration quality"). In 15 minutes, write the **1–5 scoring anchors** for that one dimension for a Bug Fix round — concretely define what a *2 vs 4 vs 5* looks like ("a 5 states the mechanism *and* why the failing test exposes it; a 3 names the symptom but not the mechanism"). Then write two sentences on how you'd *measure* whether the judge applies your anchors consistently (what would go in the golden-transcript set, and what agreement number you'd defend to an employer). If you can't write crisp anchors, the judge can't either — that's the moat's real bottleneck.

---

## Learning Engine: Courses, Spaced Repetition & Roadmaps
**TL;DR:** Fuse Learn courses, Bug Fix/Case Labs interviews, and FSRS reviews into one **evidence-based skill-mastery graph** so the product stops feeling like three tools and becomes a single loop that measurably moves you from "learning" to "interview-ready" — the thing LeetCode's puzzle model structurally can't assemble.

### The job & the gap (JTBD)
- **Core JTBD:** "When I'm preparing for a specific role/company on a deadline, I want a system that always tells me the single highest-leverage thing to practice next and proves I'm actually getting better, so I can walk into the interview confident instead of guessing."
- **The gap today:** The pieces exist but don't compose. Learn Python teaches concepts; Bug Fix/Case Labs generate a rich rubric score (files inspected, tests run, hypothesis, root cause, prevention, AI-collaboration); ts-fsrs schedules reviews; roadmaps sequence work. But these are **four disconnected signals**. Finishing a Learn lesson doesn't unlock or recommend the interview round that exercises it; a low "root cause" rubric score in a Bug Fix round doesn't schedule a targeted review or adjust the roadmap; Sable tutors inside Learn but goes silent during the interview debrief where the teachable moment actually is. The learner has no single, trustworthy answer to "am I ready, and what's next?"

### Why now
- **The moat signal already exists but is stranded.** Every Bug Fix/Case Labs round emits a multi-dimensional rubric score — the richest per-skill signal in the category. It's currently used for one post-session feedback screen, then thrown away. Turning it into a persistent mastery estimate is mostly plumbing on an asset competitors don't have.
- **Learn courses just opened new top-of-funnel audiences** (beginners via Learn Python, data-eng interns via Learn SQL). Those users need a *bridge* from lesson → work-sample round or they churn at the "now what?" cliff — the learning engine is the retention mechanism for the audience the courses just bought us.
- **FSRS (ts-fsrs) is already in production**, so we can extend spaced repetition from flashcard-style recall to scheduling *skills and rounds* without new infra — a fast path to a differentiated, evidence-based review loop.

### Proposed enhancements (the backlog)

1. **Skill Mastery Graph** — a persistent per-user, per-skill mastery estimate fed by course completions, interview rubric dimensions, and review outcomes; the single source of truth every other surface reads from.
   - *User story:* "As a job-seeking SWE, I want one honest view of where I'm strong and weak across concepts and interview behaviors, so I can trust the product to direct my limited prep time."
   - *Effort:* XL · *Impact:* Very-High · *Horizon:* Bet (4q+, but ship a thin v1 in Later)
   - *Ties to moat/wedge:* This IS the moat made durable — mastery grounded in *how you actually debug a real codebase* (rubric), not whether you solved a puzzle. It's the substrate for the B2B "work-sample signal" story.

2. **Adaptive company-targeted roadmap** — pick a target company/role + date; the roadmap sequences Learn lessons, Bug Fix scenarios, and Case Labs rounds toward it and re-plans as your mastery changes.
   - *User story:* "As a career switcher targeting Palantir FDSE in 6 weeks, I want a plan that adapts when I improve or stall, so I always know the next best action without building my own study schedule."
   - *Effort:* L · *Impact:* High · *Horizon:* Next (0-2q)
   - *Ties to moat/wedge:* Sequences *toward the rounds LeetCode skips* (Case Labs, Bug Fix) — a company plan that ends in a work-sample round, not a problem list.

3. **Rubric-driven spaced repetition** — extend ts-fsrs from recall cards to scheduling *targeted micro-drills and re-rounds keyed to weak rubric dimensions* (e.g., chronically low "prevention" → a schedule of prevention-focused drills).
   - *User story:* "As a working SWE refreshing before interviews, I want the system to resurface exactly the interview behaviors I'm weakest at on an evidence-based schedule, so my limited review time compounds."
   - *Effort:* M · *Impact:* High · *Horizon:* Next (0-2q)
   - *Ties to moat/wedge:* Applies spaced repetition to *interview behaviors* (root cause, AI-collaboration quality), not trivia — only possible because we have rubric data.

4. **Mastery-aware Sable across surfaces** — Sable follows the learner from Learn into the interview debrief, grounded in *their own* rubric history: "you missed root cause here the same way you did in Lesson 3 — review this."
   - *User story:* "As a beginner, I want a tutor that remembers my past mistakes across lessons and interviews and connects them, so feedback feels personal and cumulative instead of one-off."
   - *Effort:* M · *Impact:* High · *Horizon:* Later (2-4q)
   - *Ties to moat/wedge:* Turns the rubric into a coaching relationship; deepens switching cost (the tutor knows your history).

5. **New tracks authored to feed the graph (Learn SQL, Learn Debugging)** — expand the catalog, but every lesson is tagged to mastery-graph skills and ends in a linked work-sample round (SQL → data-eng Case Lab).
   - *User story:* "As a data-engineering intern, I want a SQL track that ends in a realistic data case round, so I practice the actual interview, not just syntax."
   - *Effort:* L · *Impact:* Med → High (as graph matures) · *Horizon:* Next (SQL) / Later (Debugging)
   - *Ties to moat/wedge:* Category expansion into new work-sample rounds + new audiences, all reinforcing one learner graph — not a cheaper mock.

### Success metrics
- **Cross-surface activation (leading):** % of learners who complete a Learn lesson AND attempt the linked interview round within 7 days. Direction: ↑ (this is the bridge working).
- **Review adherence (leading):** scheduled-review completion rate from FSRS. Direction: ↑.
- **Mastery lift (moat-linked):** measured improvement in weak rubric-dimension scores on repeat rounds (e.g., +Δ on "root cause" across a user's first vs. third Bug Fix). Direction: ↑ — this is the evidence the engine actually teaches.
- **North-Star-linked outcome:** Week-4 retention and Pro conversion of users who *enter via a course track*. Direction: ↑ (proves the new funnel monetizes).

### RICE snapshot
Scoring the two "Next"-horizon features I'd build first (mastery-graph v1 is a dependency of both, sequenced underneath). *Assumptions: Reach = est. active learners reached/quarter; Impact 3=massive/2=high/1=med; Confidence as %; Effort in person-months.*

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| Adaptive company-targeted roadmap | 4000 | 2 | 0.8 | 4 | **1600** |
| Rubric-driven spaced repetition | 3000 | 2 | 0.7 | 3 | **1400** |

(The Skill Mastery Graph scores lower on raw RICE — ~750 at Reach 4000 × Impact 3 × Conf 0.5 ÷ Effort 8 — because RICE punishes foundational bets; treat it as an enabling dependency, not a standalone bet.)

### Risks & dependencies
- **Sequencing / foundation risk:** Features 2-4 all quietly depend on the mastery graph. Ship it as a thin, event-sourced v1 (append rubric + lesson + review events, compute a simple per-skill estimate) *before* over-investing in roadmap/Sable, or you build three features on sand.
- **Signal-quality risk:** Rubric-driven SR is only as trustworthy as the rubric. If scoring is noisy, the schedule and roadmap will mis-direct users and erode trust fast — gate on rubric reliability and show *why* something was scheduled ("you scored low on prevention twice").
- **Cannibalization / scope creep:** A great learning engine could pull effort toward "becoming a course platform" (Educative/CodeSignal Learn territory) and dilute the "rounds LeetCode skips" wedge. Guardrail: every lesson must terminate in a work-sample round, or it's off-strategy.

### Competitive lens
- **LeetCode** has static "study plans" and a lightweight review feature, but no skill model tied to *work-sample* performance — its signal is binary (solved/not), so it can't schedule against interview *behaviors*. **CodeSignal Learn (Cosmo tutor)** is the closest analog and the one to watch, but its learning loop is decoupled from an evidence-based work-sample rubric. **HelloInterview** offers guided company prep but around a question bank; **interviewing.io/Pramp** are human/peer mocks with no persistent learning loop.
- **CodeSparring's differentiated angle:** the only learning engine whose mastery estimate is fed by a multi-dimensional rubric from real codebase-debugging rounds — so "you're ready" means "you demonstrated root-cause and prevention behavior on work-sample tasks," not "you completed 100 problems." That's the sentence a competitor can't reproduce without first building the wedge.

### 🧠 Your turn (PM rep)
Write the **one-page kill memo for Feature 1 (Skill Mastery Graph)** — argue in ~5 bullets why we should *not* build it before launch traction proves the funnel (cost of the XL build, opportunity cost vs. the Next-horizon roadmap, risk that rubric noise makes it misleading, unproven demand). Then rebut yourself in exactly 3 bullets using the moat thesis. Finally, pick a side and write the one sentence you'd say to the founder to justify the sequencing decision. Doable in 15 minutes; it forces you to feel the real tension between "biggest moat" and "best RICE," which is the actual job here.

---

## Content & Problem Generation

**TL;DR:** Turn scenario authoring from an artisanal bottleneck (~17 hand-built Bug Fix rounds) into a governed, semi-automated pipeline that scales *verified, rubric-anchored* work-sample scenarios faster than LeetCode can hand-write puzzles — while keeping "substantiated" as a hard quality gate, not a marketing word.

### The job & the gap (JTBD)
- **Core JTBD:** "When I'm preparing for a specific role/company, I want a deep, fresh supply of realistic rounds *at my level and in my stack* that I haven't already seen, so I can practice repeatedly and trust that clearing them means I'm actually ready."
- **The gap today:** The catalog is the constraint on every other surface. ~17 Bug Fix scenarios means a motivated Pro user exhausts the flagship in a week or two, spaced repetition re-serves a small pool, roadmaps point at content that doesn't exist yet, and Case Labs is a thin (if differentiated) catalog anchored to a few companies. Authoring is manual and expensive — each scenario needs a real codebase, a genuinely failing test, plausible interviewer reactions, and rubric anchor points — so supply grows linearly with founder-hours. That caps retention (nothing new to come back to), caps programmatic SEO (few problem pages to index), and caps the B2B story (an employer needs breadth, not 17 items).

### Why now
- **Retention cliff at launch:** the guest→Pro funnel converts on the *promise* of depth; the moment Pro users hit the end of the catalog, churn and refund risk spike. Content velocity is now the rate-limiter on LTV, not features.
- **The tech finally makes semi-automation safe:** client-side execution (Pyodide/JS) means a generated scenario can be *machine-verified* (test genuinely fails, fix genuinely passes, no network) before a human ever sees it — you can let AI draft and let the runtime + rubric reject, which is exactly the guardrail raw AI-generation usually lacks.
- **The moat compounds with volume:** every substantiated scenario carries a scoring rubric (files inspected, tests run, hypothesis, root cause, prevention, AI-collaboration quality). More rubric-anchored scenarios = more work-sample signal = a stronger answer to "why can't LeetCode ship this in a quarter." Breadth is the moat here, not just a nicety.

### Proposed enhancements (the backlog)

1. **Scenario Forge — assisted authoring pipeline with a verification gate.** An internal tool where AI drafts a Bug Fix scenario (codebase snippet + failing test + seeded bug + interviewer beats + rubric anchors), the client runtime auto-verifies the test fails/passes correctly, and a human reviewer only approves/edits — turning authoring from "write from scratch" into "review and sign off."
   - *User story:* "As a content author, I want AI to draft a fully-runnable, rubric-anchored scenario that's already passed automated verification, so that I can publish 10 quality rounds in the time it used to take me to write one."
   - *Effort:* L · *Impact:* Very-High · *Horizon:* Next (0–2q).
   - *Ties to moat/wedge:* Directly scales the substantiated-scenario supply that *is* the wedge; the verification gate keeps "substantiated" honest, protecting the moat instead of diluting it with AI slop.

2. **Company Packs (Case Labs catalog expansion).** Productize company-specific round bundles (Palantir FDSE → Stripe, Databricks, Ramp, mid-size YC startups) as named, purchasable/entitled collections with company-flavored codebases, failing tests, and interviewer personas.
   - *User story:* "As a job-seeking SWE interviewing at Stripe next month, I want a pack of Stripe-flavored bug-fix and case rounds, so that I practice the exact style and domain I'll face instead of generic problems."
   - *Effort:* M (per pack, once Forge exists) · *Impact:* High · *Horizon:* Next→Later.
   - *Ties to moat/wedge:* Company-targeted work-sample rounds are the category LeetCode structurally can't serve; each pack is a programmatic SEO landing page *and* a concrete "prep for interviewing.io/HelloInterview at company X" wedge.

3. **Difficulty & stack coverage matrix (freshness engine).** A coverage dashboard + generation queue that maps the catalog across difficulty × language/stack × bug-class (concurrency, off-by-one, null-handling, state, API contract) and auto-targets Forge at the thin cells, so no persona (career switcher → senior) hits a dead end.
   - *User story:* "As a career switcher on a guided roadmap, I want each recommended round to be reliably one notch harder in my stack, so that I feel a smooth difficulty ramp instead of gaps and cliffs."
   - *Effort:* M · *Impact:* High · *Horizon:* Later (2–4q).
   - *Ties to moat/wedge:* Roadmaps and FSRS spaced repetition are only as good as the underlying coverage; filling the matrix makes personalization real and keeps repeat sessions fresh (retention).

4. **Community-contributed scenarios (moderated, revenue-shared later).** Let power users / SWEs submit real bug-fix scenarios through the same Forge verification gate, with human moderation and attribution — a supply flywheel and a marketing surface ("I authored a round that's now used to interview-prep").
   - *User story:* "As a working SWE, I want to turn a nasty bug I actually fixed into a practice round others use, so that I get recognition (and later, a cut) while sharpening my own diagnostic skill."
   - *Effort:* L · *Impact:* Med (High long-run) · *Horizon:* Bet (4q+).
   - *Ties to moat/wedge:* A UGC flywheel is the durable answer to "why can't a competitor copy the catalog" — the content becomes a community asset, and every submission is auto-gated by the same rubric that defines the moat.

5. **Learn-course problem generation (Python shipped → SQL planned).** Extend Forge to author graded exercises for the Learn tracks (Python/SQL) with the same runtime-verification gate, feeding the beginner and data-engineering-intern audiences with an always-fresh problem set inside the Sable tutor loop.
   - *User story:* "As a beginner in Learn Python, I want an endless supply of small, auto-verified practice problems at my current lesson, so that I can drill until it sticks without exhausting the course."
   - *Effort:* M · *Impact:* Med · *Horizon:* Later.
   - *Ties to moat/wedge:* Adjacent — justify: Learn is the top-of-funnel for the new beginner/data audiences; shared authoring infra means one pipeline feeds both the flagship *and* the funnel, lowering marginal content cost.

### Success metrics
- **Verified scenarios published per author-week** (leading) — the throughput proof that Forge worked; target a step-change (e.g. 3–5x) vs. manual baseline.
- **Catalog-exhaustion rate** — % of Pro users who run out of unseen at-level content within 30 days (direction: down). Directly predicts churn.
- **New-scenario approval rate through the verification gate** — % of AI drafts that pass auto-verification + human review unedited (direction: up, but watched as a *quality* guardrail, not gamed for volume).
- **North-Star-linked:** Pro 90-day retention / repeat-session rate (direction: up) — the outcome that content depth ultimately defends.

### RICE snapshot
Assumptions: Reach = share of active users touched per quarter (0–1); Impact per Intercom scale (3=massive, 2=high); Confidence 0–1; Effort in person-months.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| Scenario Forge (verification-gated authoring) | 0.9 | 3 | 0.8 | 4 | **0.54** |
| Company Packs | 0.5 | 2 | 0.7 | 2 | **0.35** |

*Read:* Forge is the enabler — it's a platform bet whose RICE is understated because Company Packs, the coverage matrix, and Learn generation all become cheap *only after* it ships. Sequence Forge first even though Packs are the more legible revenue line.

### Risks & dependencies
- **Quality dilution / trust erosion:** the single biggest risk is shipping plausible-but-wrong AI scenarios that break the "substantiated" promise and poison the scoring rubric. Mitigation is non-negotiable: runtime auto-verification + mandatory human sign-off *before* publish, and a fast unpublish path. Do not let volume metrics override the approval-rate guardrail.
- **Sequencing dependency:** Company Packs, the difficulty matrix, and Learn generation are all downstream of Forge. Building any of them bespoke first duplicates the authoring/verification work — hold the line on Forge-first.
- **Cannibalization / cost:** community UGC and heavy AI drafting both add moderation and LLM-generation cost; gate the UGC flywheel behind Forge's automated verification so moderation load stays sub-linear, and treat generation as a tracked expensive path (batch, cache, don't regenerate on every author session).

### Competitive lens
- **LeetCode / AlgoExpert / Educative** scale single-function puzzles and curated static content — high volume, but structurally can't produce *work-sample rounds* (real codebase + failing test + interviewer reaction), which is exactly the category CodeSparring is expanding into. Volume there is not a threat to *this* catalog.
- **HelloInterview / interviewing.io / Pramp** offer realistic/mock rounds but lean on human interviewers or hand-authored guides — expensive to scale and impossible to serve on-demand at 2am. CodeSparring's differentiated angle: a *machine-verified, rubric-anchored* generation pipeline that produces fresh, company-flavored rounds on demand — human-realism economics without the human-per-session cost, and a scoring artifact none of them emit.

### 🧠 Your turn (PM rep)
In 15 minutes, **write the one-page "kill criteria" for Scenario Forge.** Specifically: define the exact threshold on the *approval-rate guardrail* below which you pause AI-drafting and revert to manual authoring (e.g. "if <40% of drafts pass verification + review unedited for two consecutive weeks"), and name the two failure modes you'd watch for (silent quality drift; reviewers rubber-stamping to hit volume). Then defend why that number, not a higher or lower one — you're forcing yourself to decide, before you build, what "the moat is being diluted" actually looks like in a dashboard.

---

## Case Labs & New Round Types — the rounds LeetCode structurally can't run

**TL;DR:** Turn Bug Fix's evidence-scored, AI-reactive round engine into a *format library* (code review, scoping, system design, take-home) and a *scalable company-lab catalog*, so CodeSparring owns "full software-interview readiness" instead of "one clever round."

### The job & the gap (JTBD)
- **Core JTBD:** *When I'm preparing for a real onsite loop, I want to rehearse every round the company actually runs — not just algorithm puzzles — so I can walk in calibrated and not get surprised by the design, review, or ambiguity-heavy rounds where I actually get dinged.*
- **The gap today:** The product's positioning promise ("practice the rounds LeetCode skips") is currently cashed out by a *single* round type — Bug Fix — plus a thin, hand-built Case Labs catalog (Palantir FDSE as the marquee). A candidate prepping for a Stripe or Datadog loop can rehearse the debugging round but has nowhere to practice the code-review round, the scoping/requirements round, or the design round *inside CodeSparring* — the exact rounds that differentiate us. The evidence-scoring moat (files inspected, hypothesis, root cause, prevention, AI-collaboration quality) is built and proven on one format; it is not yet a reusable rubric engine that new round types plug into. So the wedge is real but under-delivered: we tell the market "the rounds LeetCode skips" and ship one of them.

### Why now
- **The engine already exists.** Bug Fix proves the hard parts — AI interviewer reacting live, in-browser execution (Pyodide/JS), evidence-based scoring, guest-convertible flow. New round types are *format variations on a working substrate*, not net-new platforms. The marginal cost of the second and third round type is far lower than the first.
- **The wedge is a promise we're only half-keeping, and competitors are converging.** HelloInterview is aggressively owning "system design"; CodeSignal and interviewing.io are moving toward work-sample realism. Shipping the *breadth* of skipped rounds now — before a competitor bundles them — is what makes "modern software-interview readiness" a category we own rather than a tagline.
- **Catalog breadth is the SEO growth engine's fuel.** Programmatic/comparison SEO and the guest funnel both scale with *how many company-specific labs exist*. Every new lab is an indexable landing page and a guest-activation entry point. Right now catalog growth is bottlenecked by hand-authoring; unblocking it compounds the entire acquisition loop.

### Proposed enhancements (the backlog)

1. **Code Review Round** — you're dropped into a PR/diff and must review it like a senior engineer: catch defects, flag design smells, rank severity, and leave comments while the AI author "pushes back."
   - *User story:* "As a job-seeking SWE, I want to practice reviewing a realistic pull request so that I'm ready for the code-review round at companies that run one (Stripe, Shopify, GitLab)."
   - *Effort:* M · *Impact:* High · *Horizon:* Next.
   - *Ties to moat/wedge:* The purest reuse of the Bug Fix substrate (same codebase-in-browser, same AI-reacts-as-you-work loop) and the evidence rubric maps almost 1:1 — defects caught vs. missed, false-positive rate, severity calibration, communication quality. It's a *new round LeetCode can't touch* built on proven infra.

2. **Scoping / Requirements-Clarification Round** — an intentionally ambiguous problem where you're scored on the *questions you ask and assumptions you surface* before writing a line of code; the AI plays a vague PM/stakeholder.
   - *User story:* "As a career switcher, I want to practice clarifying an underspecified problem so that I stop diving straight into code and losing points on scoping — the thing my mock feedback keeps flagging."
   - *Effort:* S · *Impact:* Med · *Horizon:* Next.
   - *Ties to moat/wedge:* Cheapest new type to build (mostly the existing chat + a scoping-specific rubric: questions asked, edge cases surfaced, scope negotiated, assumptions stated). It's a skill LeetCode ignores *entirely*, and it extends the evidence rubric into "thinking before coding" — hard for competitors to fake without our scoring spine.

3. **Case Lab Studio (authoring pipeline + catalog scale-out)** — an internal templating tool that turns "author a new company lab" from a bespoke engineering task into a structured content workflow (scenario spec → execution contract → rubric mapping → indexable landing page).
   - *User story:* "As the CodeSparring team, we want to ship a new company case lab in days not weeks so that the catalog (and its SEO surface) grows fast enough to feed the guest funnel."
   - *Effort:* M · *Impact:* High · *Horizon:* Next.
   - *Ties to moat/wedge:* Adjacent — justify: this is the *reach multiplier*, not a new round type. Every lab it produces is a programmatic-SEO page and a guest-activation door, and it operationalizes the catalog-as-moat story (breadth competitors would have to hand-build to match).

4. **Take-Home-Style Build Round** — a timed mini-spec ("add feature X to this small service, make the tests pass, keep it clean") that scores the *finished artifact* plus process, mirroring async take-homes.
   - *User story:* "As a job-seeking SWE, I want to rehearse a scoped take-home under time pressure so that I submit real ones faster and cleaner."
   - *Effort:* L · *Impact:* Med · *Horizon:* Later.
   - *Ties to moat/wedge:* Reuses client-side execution + codebase substrate; extends the evidence rubric to *artifact quality* (test coverage added, code cleanliness, commit hygiene) — the strongest bridge yet to the B2B "work-sample signal" story.

5. **System Design Round (lightweight, structured)** — a diagram/whiteboard canvas + AI interviewer probing tradeoffs, scoped to a rubric (requirements → data model → API → scaling → failure modes) rather than open-ended freehand.
   - *User story:* "As a working SWE refreshing for senior loops, I want a design round with an interviewer who probes my tradeoffs so that I practice the round that actually gates senior offers."
   - *Effort:* XL · *Impact:* Very-High · *Horizon:* Bet.
   - *Ties to moat/wedge:* Highest ceiling and highest risk — scoring open-ended design is genuinely hard and HelloInterview has a head start. Our differentiated angle: force the design into the *same evidence-rubric shape* (explicit requirements surfaced, tradeoffs named, failure modes considered) rather than vibes-based feedback. Sequence it *after* the rubric engine is generalized by the cheaper round types.

### Success metrics
- **Round-type attach rate** (leading): % of active users who try ≥2 distinct round types within 14 days — proves breadth is used, not just shipped. Direction: up.
- **Multi-round session depth** (leading): median distinct round types completed per user per week. Direction: up.
- **Catalog velocity** (leading): net-new company labs shipped per month via Case Lab Studio, and indexed-page count. Direction: up.
- **North-Star-linked:** guest→Pro conversion rate *segmented by entry round type* — validates whether new rounds convert as well as Bug Fix and which are worth SEO investment. Direction: up (or at least non-diluting vs. Bug Fix).

### RICE snapshot
*Assumptions: Reach = distinct users who start the round in the first post-ship quarter at ~2k soft-launch MAU; Impact 0.5/1/2/3 = Low/Med/High/Massive; Confidence as %; Effort in person-months. RICE = R×I×C÷E.*

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| Code Review Round | 1,200 | 2 | 0.8 | 3 | **640** |
| Scoping / Requirements Round | 1,000 | 1 | 0.8 | 1.5 | **533** |

Code Review wins on impact-per-substrate-reuse; Scoping wins on effort — both are Next, and shipping the two together is what first makes "a library of round types" true.

### Risks & dependencies
- **Rubric generalization is the real dependency.** Today's evidence rubric is Bug-Fix-shaped. If each new round type forks its own bespoke scoring, we get maintenance sprawl and inconsistent feedback quality. Sequencing must be: *generalize the rubric engine → then add round types* (Code Review and Scoping are deliberately the cheapest tests of that generalization; System Design is gated behind it).
- **Adoption / cannibalization:** more round types can dilute the crisp "start here = Bug Fix" guest funnel and fragment the top of funnel. Keep Bug Fix as the single guest wedge; introduce other types *after* activation, not on the cold-start screen.
- **Cost & quality on open-ended scoring:** System Design and Take-Home multiply LLM-judge cost and variance. Don't greenlight them until the cheaper rounds prove the rubric engine holds calibration; hold System Design as a Bet behind a feature flag.

### Competitive lens
- **LeetCode / CodeSignal** are structurally single-function-puzzle graders; a code-review or scoping round doesn't fit their model without rebuilding the interaction and scoring layer — exactly the "why can't they copy it in a quarter" question our rubric engine answers.
- **HelloInterview** owns system-design mindshare and interviewing.io/Pramp offer human mocks with unstructured, non-repeatable feedback. CodeSparring's differentiated angle: *the same evidence-based, repeatable rubric across every round type* — a consistent, improvable signal (and the bridge to a B2B work-sample story) rather than one strong round or one strong human's opinion on any given night.

### 🧠 Your turn (PM rep)
In 15 minutes, **write the kill-argument for the System Design Round** — the memo arguing CodeSparring should *not* build it in the next year. Force yourself to name (1) the real reason (scoring variance? HelloInterview's lead? XL effort starving the cheaper wins?), (2) what leading metric would have to be true to *reverse* your decision, and (3) the cheapest experiment that would produce that metric. Then re-score it in the RICE table with honest numbers and check whether your Confidence input actually justified calling it a "Bet" versus a "no." If your memo is convincing, you've just learned why sequencing beats enthusiasm.

---

## Readiness Intelligence: Dashboard, Skill Graph & Next-Best-Action

**TL;DR:** Turn the dashboard from a passive metrics wall into an interview-readiness operating system — a per-company, per-round readiness score built from the evidence-based rubric, a skill graph that names your weakest competency, and a single next-best-action that pulls you back tomorrow.

### The job & the gap (JTBD)
- **Core JTBD:** "When I'm prepping for a specific interview (or keeping my skills warm), I want to know exactly how ready I am and what to do next, so I can spend my scarce prep hours on the one gap that most changes my odds of passing."
- **The gap today:** The product already captures the richest signal in the category — per-session rubric dimensions (files inspected, tests run, hypothesis quality, root-cause accuracy, prevention thinking, AI-collaboration quality) — but the dashboard surfaces session counts, streaks, and roadmap progress, not a defensible *readiness* judgment. The rubric data is written per session and never aggregated into a competency view. Spaced repetition (ts-fsrs) schedules reviews, but nothing connects a detected weakness to the specific Bug Fix scenario, Case Lab, or Learn lesson that would fix it. A returning user sees "you did 4 sessions" — not "you're 62/100 ready for Palantir FDSE; your root-cause isolation is the thing holding you back; do this next."

### Why now
- **The moat already emits the fuel.** Every scored session produces structured rubric data that exists nowhere else in the market. We're sitting on a proprietary data asset and rendering it as a streak counter. The readiness layer is the first feature that *monetizes the moat back to the learner* instead of just to a future employer.
- **Category expansion created surface sprawl.** Bug Fix + Case Labs + Learn Python + (planned) Learn SQL now compete for the same session slot. Without a unifying progress layer they feel like four apps; a readiness score and a next-best-action are the connective tissue that makes the catalog feel like one coached journey.
- **Retention is the post-launch bottleneck, and the infra is already here.** The growth model (guest → Pro → retain) lives or dies on return visits; progress storytelling is the cheapest retention lever, and lifecycle email + FSRS scheduling are already built to carry it. LLMs also make weakness narration and competency tagging cheap enough to run weekly.

### Proposed enhancements (the backlog)

1. **Interview-Readiness Score (per round-type, per company)** — a 0-100 "are you ready" signal computed from rubric dimensions, not session counts.
   - *User story:* "As a job-seeking SWE targeting Palantir, I want a single readiness number for FDSE-style Bug Fix rounds so that I know whether to keep practicing or start applying."
   - *Effort:* M · *Impact:* Very-High · *Horizon:* Next (0-2q).
   - *Ties to moat/wedge:* This is the moat rendered as a product. The score is credible *only because* it's built on work-sample evidence (did you actually isolate the root cause and verify with tests) for rounds LeetCode structurally can't score — LeetCode can show a contest rating, it cannot show Bug Fix readiness.

2. **Skill Graph & weakness detection** — decompose performance into named competencies mapped to the rubric (root-cause isolation, test-driven verification, hypothesis discipline, prevention/regression thinking, AI-collaboration quality) and surface the 1-2 weakest nodes.
   - *User story:* "As a career switcher, I want to see which specific skill is dragging my scores so that I stop grinding the things I'm already good at."
   - *Effort:* L · *Impact:* High · *Horizon:* Next (0-2q).
   - *Ties to moat/wedge:* The competency taxonomy *is* the rubric — a named, defensible vocabulary of software-interview skill that a puzzle-count model can't produce. It's the diagnostic layer that feeds both the readiness score and the recommendation engine.

3. **Next-Best-Action engine** — exactly one recommended action per dashboard visit: a specific scenario, a due spaced review, or a Learn lesson that targets the weakest skill node.
   - *User story:* "As a working SWE doing maintenance practice, I want one clear thing to do when I open the app so that a 20-minute window turns into progress, not decision paralysis."
   - *Effort:* M · *Impact:* High · *Horizon:* Next (0-2q).
   - *Ties to moat/wedge:* Routes weakness → the right round in the catalog (Bug Fix ↔ Case Lab ↔ Learn), converting the wedge's breadth into a coached path and lifting cross-surface engagement. Adjacent to FSRS — extends existing scheduling rather than replacing it.

4. **Weekly Readiness Report (narrative progress storytelling)** — an LLM-generated weekly recap, in-dashboard and via lifecycle email: what moved, what's next, one shareable win.
   - *User story:* "As a job-seeker, I want a weekly 'you improved X, you're now ready for Y' summary so that I feel momentum and keep coming back."
   - *Effort:* S · *Impact:* Med → High · *Horizon:* Next (0-2q).
   - *Ties to moat/wedge:* Evidence-grounded narrative ("your root-cause isolation improved 18% across 3 Bug Fix rounds") is only possible with rubric data — and the "share your win" hook feeds the existing referral loop. Adjacent — justified by retention/referral leverage on top of moat data.

5. **Shareable Readiness Profile (the B2B bridge)** — an exportable, evidence-backed readiness profile candidates can share; the seed of the employer work-sample-signal product.
   - *User story:* "As a job-seeker, I want a credible, evidence-backed readiness profile I can attach to an application so that my practice becomes proof, not just prep."
   - *Effort:* XL · *Impact:* High (strategic) · *Horizon:* Bet (4q+).
   - *Ties to moat/wedge:* Directly extends the moat toward the B2B "work-sample signal" story — the answer to "why can't LeetCode copy this." Depends on 1-3 shipping and calibrating first.

### Success metrics
- **Return-visit rate (leading):** D7/D30 dashboard return rate for users who have a readiness score vs. those who don't — target a measurable lift. This is the North-Star-linked retention outcome.
- **NBA follow-through (leading):** % of sessions that were initiated from a Next-Best-Action recommendation — proves the engine drives behavior, not just decoration.
- **Readiness → conversion (leading):** free/guest → Pro conversion lift among users shown a below-threshold readiness score (a concrete "you're not ready yet" is the honest upgrade motive).
- **Score credibility (guardrail/outcome):** among users who self-report interview outcomes, correlation between readiness score at apply-time and reported pass rate — the calibration metric that protects trust.

### RICE snapshot
Assumptions: Reach = est. active practicers touched per quarter; Impact 0.25–3 (Very-High=3, High=2); Confidence 0–1; Effort in person-months.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| Interview-Readiness Score | 5,000 | 3 | 0.8 | 3 | 4,000 |
| Next-Best-Action engine | 5,000 | 2 | 0.7 | 2 | 3,500 |

### Risks & dependencies
- **Score credibility & cold start.** A wrong or overconfident number erodes trust fast, and most early users will have 1-2 sessions. Needs an explicit low-confidence/no-data state and later calibration against real interview outcomes. **Sequencing:** the score depends on enough rubric volume and a stable rubric schema *across* round types (Bug Fix vs. Case Lab vs. Learn) — normalize the taxonomy first (feature 2 underpins feature 1).
- **Over-gamification cannibalizes positioning.** Streaks and scores can drift into Duolingo-style vanity engagement that undercuts the "serious, evidence-based interview prep" brand. Keep the score outcome-anchored, not activity-anchored.
- **Recurring LLM cost.** Weekly narrative generation is a per-user-per-week LLM call; must cache and batch on the existing lifecycle/cron infra, and gate deeper personalization behind a flag if cost runs hot.

### Competitive lens
- **Activity, not readiness, everywhere.** LeetCode shows solved-count, streak, and a contest Elo — none of which say "ready for this round at this company." HelloInterview is content/guide-led with company framing but no evidence-scored personal signal; Pramp is peer practice with no persistent analytics; interviewing.io gives expert feedback but doesn't aggregate it into a durable skill graph. CodeSignal's certified score is the closest analog — but it's an *assessment score sold to employers*, not a self-improvement readiness loop the candidate steers.
- **CodeSparring's angle:** a readiness score and skill graph built from *work-sample evidence on rounds competitors don't run* — defensible because the underlying rubric data literally doesn't exist elsewhere, and it doubles as the on-ramp to a B2B signal product.

### 🧠 Your turn (PM rep)
Design the **cold-start states for the Readiness Score** in 15 minutes. A brand-new user has completed exactly **one** Bug Fix round. Write the three states the dashboard can show — (a) no data, (b) low-confidence early read, (c) calibrated score — and for each, write the *exact* one-line dashboard copy plus the rule that triggers it (e.g., how many scored sessions across how many rubric dimensions flips (b)→(c)). Then defend one hard call: do you show a *number* at state (b), or only a qualitative band — and what does that choice do to trust vs. motivation? This is the decision that determines whether the flagship feature builds credibility or destroys it.

---

## Onboarding & Activation

**TL;DR:** The activation surface should stop selling "try a demo" and start manufacturing a single, unmistakable aha — *a guest fixes a real failing test, the AI reacts like an interviewer, and the scored rubric card is the paywall* — so the evidence-based moat becomes the reason to sign up rather than a reward after signup.

### The job & the gap (JTBD)
- **Core JTBD:** "When I'm anxious about an upcoming technical interview and skeptical of yet another practice tool, I want to *feel* what a realistic interview round is like and get one piece of credible, specific feedback in under 10 minutes, so I can decide this is worth my time (and money) before I commit."
- **The gap today:** The guest funnel already lets someone start a Bug Fix round with no signup — that's the right wedge. But activation is under-instrumented as a *designed moment*. The scored rubric (files inspected, tests run, hypothesis, root cause, prevention, AI-collaboration quality) is the single most differentiated asset in the product, yet a first-time guest experiences it as an end-of-session artifact rather than the thing they're *pulled toward*. There is no personalized cold-start: every guest lands in the same scenario regardless of whether they're prepping for Palantir FDSE next week or switching careers over six months. Case Labs already has a natural "sign in to see your scored feedback" gate, but that moment isn't yet engineered as the primary conversion event with a preview of the value being withheld. Net: we have the raw aha ingredients but no orchestrated aha *sequence*.

### Why now
- **The wedge just became demonstrable.** With ~17 substantiated Bug Fix scenarios and client-side execution (Pyodide/JS, no server round-trip, no cost per guest keystroke), we can finally let unlimited guests run real code and reach the aha with near-zero marginal cost — the classic blocker on "let anyone try it" is gone.
- **The moat is only a moat if people meet it early.** "Why can't LeetCode copy this in a quarter" is answered by the scoring rubric — but only if it's the *first* thing a prospect associates with the brand, not a post-purchase surprise. Soft-launch is the one window to bake the rubric into the top of funnel before SEO traffic starts arriving cold.
- **Programmatic SEO traffic is about to arrive with high intent and zero context.** The vs-leetcode / vs-pramp / interviewing.io comparison pages will dump visitors who are actively evaluating. A generic "start practicing" landing wastes that intent; a personalized cold-start (goal → company → timeline) turns a comparison-shopper into an activated user in one session.

### Proposed enhancements (the backlog)

1. **Rubric-first guest activation (the scored-card teaser)** — Make the evidence-based scored card the visible carrot, previewed live *during* the guest round and gated at the reveal.
   - *User story:* "As a job-seeking SWE trying CodeSparring for the first time, I want to see my interview performance being scored on real dimensions as I work, so that I understand what makes this different from LeetCode before I'm asked to sign up."
   - *Effort:* M · *Impact:* Very-High · *Horizon:* Next (0–2q).
   - *Ties to moat/wedge:* Directly weaponizes the moat as the acquisition hook — the rubric *is* the pitch. Signup happens to unlock the full scored breakdown + save it, so the paywall sits exactly on the differentiated asset.

2. **Personalized cold-start (goal → target company → timeline)** — A 3-tap intake (before or right after the first round) that routes the user to the right first scenario and seeds the roadmap.
   - *User story:* "As a career switcher six months out, I want to tell the product my goal and timeline in three taps, so that my first round and my roadmap match my level instead of dropping me into a Palantir case I'm not ready for."
   - *Effort:* M · *Impact:* High · *Horizon:* Next (0–2q).
   - *Ties to moat/wedge:* Feeds personalization (roadmaps, Case Labs targeting) from minute one and lets us route company-targeted users straight to Case Labs — deepening the "company-specific work-sample practice" category story rather than the generic-puzzle one.

3. **Case-Lab "sign in to see your scored feedback" as an engineered conversion moment** — Turn the existing gate into a designed reveal: show a blurred/partial rubric card with 1–2 real dimensions unlocked and the rest gated behind signup.
   - *User story:* "As a job-seeker who just finished a Palantir FDSE case as a guest, I want a concrete preview of how I actually did, so that signing in feels like claiming feedback I earned rather than hitting a wall."
   - *Effort:* S · *Impact:* High · *Horizon:* Next (0–2q).
   - *Ties to moat/wedge:* The withheld value is the rubric itself — the gate teaches the moat and converts on it simultaneously. Loss-aversion on *earned* feedback is a stronger CTA than a generic "sign up to continue."

4. **Time-to-value instrumentation + "first-scored-round" as the North-Star activation event** — Define, instrument, and optimize a single activation metric (guest → first *scored* round completed) with a funnel dashboard and a 10-minute target.
   - *User story:* "As the PM/growth owner, I want to see exactly where guests drop between landing and their first scored round, so that I can attack the biggest leak instead of guessing."
   - *Effort:* S · *Impact:* Med (enabling; unlocks everything else) · *Horizon:* Next (0–2q).
   - *Ties to moat/wedge:* Adjacent — justify: doesn't build moat directly, but without a defined activation event and funnel we can't tell whether the rubric-first hook is working. It's the measurement substrate for the other three.

5. **"Resume your round" cross-device rescue + save-your-progress signup** — A guest who's mid-round or just finished gets a lightweight prompt to save their work/score, with magic-link/OAuth so signup costs zero typed characters.
   - *User story:* "As a working SWE squeezing in practice on my phone at lunch, I want to save this round and pick it up on my laptop tonight, so that I don't lose progress and have a reason to create an account."
   - *Effort:* M · *Impact:* Med · *Horizon:* Later (2–4q).
   - *Ties to moat/wedge:* Adjacent — justify: reduces signup friction and creates a persistence hook that feeds spaced repetition (the scored round becomes a reviewable card), linking activation to the retention/evidence loop.

### Success metrics
- **Guest → first-scored-round completion rate** (leading; target set post-instrumentation) — the activation North-Star-linked event. Direction: up.
- **Median time-to-first-scored-round** — proxy for time-to-value. Direction: down (target under 10 min).
- **Scored-card reveal → signup conversion rate** — does gating on the rubric actually convert? Direction: up.
- **Cold-start completion rate + downstream 7-day return** — did personalization intake complete, and did personalized users come back? Direction: both up (guardrail against intake adding friction that hurts activation).

### RICE snapshot
Assumptions: Reach = share of guest visitors touched per quarter (0–1 scale, applied to a common traffic base); Impact on a 0.25–3 scale; Confidence 0–1; Effort in person-weeks. RICE = Reach×Impact×Confidence ÷ Effort.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| Rubric-first guest activation | 0.9 | 3.0 | 0.7 | 4 | 0.47 |
| Case-Lab scored-feedback gate | 0.4 | 2.0 | 0.8 | 1.5 | 0.43 |

*Read:* the rubric-first hook wins on reach and raw impact; the Case-Lab gate is nearly tied because it's cheap, high-confidence, and reuses an existing moment — a strong "ship the small one first while building the big one" sequencing signal.

### Risks & dependencies
- **Cold-start friction cannibalizes activation.** Any intake placed *before* the first round risks reducing the very completion rate we're optimizing. Mitigation: default to intake *after* the aha (post first scored round), A/B the placement, and keep it 3 taps max with skip.
- **Sequencing dependency on instrumentation.** Features 1–3 are un-tunable without Feature 4. The activation event + funnel must land first (or in parallel) or we're optimizing blind.
- **Gating too aggressively erodes the free-guest wedge.** The wedge is "no-signup first Bug Fix round"; if the scored card is gated too hard, we blunt the differentiator that gets people in. Mitigation: always unlock ≥1 real rubric dimension for guests so the moat is *felt*, not just *teased*.

### Competitive lens
- **LeetCode/AlgoExpert** gate content behind subscription and have no interviewer reaction or work-sample rubric — their "activation" is a problem list. CodeSparring's differentiated activation is a *reactive interviewer + an evidence-scored card on a real codebase*, something a puzzle catalog structurally can't preview.
- **Pramp/interviewing.io** front-load friction: scheduling a peer or booking a mock is the opposite of instant. HelloInterview offers guided content but not an executable, scored round. CodeSparring's angle: **zero-signup, zero-scheduling, instant real-round aha**, with the moat (rubric) as the thing you sign up to keep — an activation loop none of them can match without rebuilding their product model.

### 🧠 Your turn (PM rep)
In 15 minutes, **write the kill-argument for Feature 2 (personalized cold-start): "We should NOT build the goal/company/timeline intake."** Force yourself to make the strongest case — e.g., "every question before the aha is a leak," "we can infer goal from the SEO landing page they arrived on," "personalization value is unproven until we have retention data." Then decide: does your kill-argument change the *placement* (before vs. after first round) or the *existence* of the feature? Write the one experiment that would settle it. If you can't design that experiment in under five lines, your feature spec isn't falsifiable yet — and that's the real finding.

---

## Monetization, Pricing & B2B
**TL;DR:** The ~$24/mo consumer Pro tier should fund the flywheel, but *durable, defensible* revenue comes from productizing the evidence-based scoring rubric into a portable work-sample **signal** — sold to candidates as a verifiable credential, then to employers, bootcamps, and universities as an assessment — with intent-based packaging capturing willingness-to-pay along the way.

### The job & the gap (JTBD)
- **Core JTBD (buyer side):** "When I need to know whether someone can actually do the maintenance/debugging work of the job — not solve a whiteboard puzzle — I want a defensible, bias-reduced work-sample signal, so I can screen or place people with less senior-engineer time." **And (consumer side):** "When I'm preparing on a deadline for specific companies, I want to pay for exactly the practice depth that maps to my target, so I can justify the spend against a real job outcome."
- **The gap today:** Monetization is a single flat Pro tier + a guest funnel. That flat price ignores enormous WTP variance (a job-seeker three weeks from an onsite has 10x the urgency of a working SWE doing a maintenance refresh). Worse, the moat asset — the rubric-scored session trace (files inspected, tests run, hypothesis → root cause → prevention, AI-collaboration quality) — is generated on every Bug Fix and Case Lab but only ever shown back to the *learner* as feedback. Its B2B value (a portable, verifiable hiring signal) is 100% uncaptured. There is no exportable credential, no team/seat billing, no employer-facing report. Referrals ($10 + 1 free month) are a pure consumer discount, not a loop tied to the work-sample artifact.

### Why now
- **The sellable asset already exists as a byproduct.** Every scored session is the raw material of a work-sample assessment — the build isn't an assessment engine, it's *packaging and issuance*. That collapses the effort of the B2B bet dramatically.
- **The category is moving toward exactly what the rubric measures.** AI-assisted coding is eroding the single-function LeetCode puzzle as a hiring signal; "can you debug a real codebase *with* AI" is the emerging screen. CodeSparring already scores AI-collaboration quality — the precise thing employers now can't measure and CodeSignal's isolated-task format can't produce.
- **Soft-launch is the instrumentation moment.** The consumer funnel is about to generate the exact evidence deck (guest→Pro rates, completion, score distributions) that sells the first employer pilot — and Case Labs (company-specific, e.g. Palantir FDSE) plus Learn Python/SQL are already warm wedges into employer and cohort buyers.

### Proposed enhancements (the backlog)

1. **Tiered + urgency packaging (Pro / Pro+ Sprint / Maintenance)** — replace the flat price with intent-based tiers so urgency-driven WTP is captured.
   - *User story:* "As a job-seeking SWE three weeks from an onsite, I want a time-boxed Interview Sprint with company-targeted Case Labs and unlimited feedback so that I can pay a premium for urgency without a 12-month commitment."
   - *Effort:* M · *Impact:* High · *Horizon:* Next.
   - *Ties to moat/wedge:* Monetizes the wedge directly — Case Labs (the rounds LeetCode skips) become the premium lever rather than a flat add-on. Deepens positioning as "category expansion," not "cheaper mock."

2. **Verified Work-Sample Report (shareable, rubric-backed)** — turn any completed Bug Fix / Case Lab into an exportable, verifiable evidence report the candidate can attach to applications.
   - *User story:* "As a career switcher without a brand-name resume, I want a verifiable artifact proving I can debug a real codebase so that I can send employers evidence instead of a LeetCode count."
   - *Effort:* M · *Impact:* High · *Horizon:* Next/Later.
   - *Ties to moat/wedge:* THE moat-to-B2B bridge — makes the rubric a portable credential. Candidate-side sharing seeds employer-side demand (they receive a report, then want to *issue* their own), and every shared report is branded, viral distribution.

3. **CodeSparring for Teams / Employer Assessments (seat + per-assessment billing)** — employer-issued, invite-based real-codebase screens using the same scenarios + rubric, with a recruiter dashboard and calibrated scoring.
   - *User story:* "As a hiring manager, I want to send candidates a 45-min real-codebase debugging assessment and get a calibrated, bias-reduced signal so that I can screen for on-the-job ability without burning senior-engineer hours."
   - *Effort:* XL · *Impact:* Very-High · *Horizon:* Bet.
   - *Ties to moat/wedge:* The durable-revenue answer. The rubric is the thing LeetCode can't copy in a quarter — it requires the real-codebase scenario corpus *plus* AI-collaboration scoring, neither of which they have.

4. **Cohort licenses for bootcamps & universities (Learn courses as the wedge)** — seat-based org licensing of Learn Python/SQL + Bug Fix scenarios with an instructor cohort dashboard and placement-outcome reporting.
   - *User story:* "As a bootcamp program director, I want to license practice plus a progress/placement dashboard for my cohort so that I can prove employability outcomes to prospective students and employer partners."
   - *Effort:* L · *Impact:* High · *Horizon:* Later.
   - *Ties to moat/wedge:* Adjacent — justified: the same rubric powers "placement-ready" evidence, and cohort buyers are a B2B2C channel that provides warm intros to their hiring partners (feeds #3).

5. **AI Interviewer credits / metered premium (voice, deep feedback, higher-reasoning model tier)** — a credit layer over the subscription for the genuinely expensive AI paths.
   - *User story:* "As a working SWE doing occasional refresh, I want to pay only for the few voice mock rounds I actually run so that I'm not carrying a full monthly sub for light usage."
   - *Effort:* M · *Impact:* Med · *Horizon:* Next/Later.
   - *Ties to moat/wedge:* Adjacent — justified: aligns price with COGS on the expensive AI paths (protects the margin that funds everything) and opens a low-commitment door for the maintenance persona.

### Success metrics
- **Blended ARPU + Net Revenue Retention** — up (proves packaging and expansion capture WTP). *North-Star-linked outcome.*
- **% of Pro conversions choosing a premium/Sprint tier or buying credits** — leading indicator of packaging fit.
- **Work-Sample Reports generated & externally shared per activated user** — leading/viral indicator feeding B2B demand.
- **B2B pipeline: employer + cohort pilots signed and assessment-seats activated** — the durable-revenue outcome.

### RICE snapshot
Top 2 scored. *Assumptions: Reach = users touched/quarter at modest post-launch scale; Impact on a 0.25–3 scale; Confidence 0–1; Effort in person-weeks; RICE = R×I×C÷E.*

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| #1 Tiered + urgency packaging | 8,000 | 2.0 | 0.8 | 6 | **2,133** |
| #2 Verified Work-Sample Report | 5,000 | 2.5 | 0.55 | 8 | **859** |

Read: packaging is the near-term revenue win (do first); the Report scores lower on confidence (unproven that candidates share and that employers pull) but is the *strategic* unlock for the #3 bet — it's a sequencing dependency, not a competitor to #1.

### Risks & dependencies
- **Dilution / cannibalization:** over-tiering or a too-cheap credit model can cheapen the "not a cheaper mock" positioning, and over-gating can suppress guest→Pro activation. Keep Sprint a *premium*, and keep the guest first-round free.
- **B2B is a different, heavier motion with legal exposure:** hiring-decision tools face adverse-impact scrutiny (EEOC / NYC Local 144-style AEDT audit rules). #3 depends on (a) enough scored-session volume to statistically calibrate the rubric before selling it as a hiring signal, and (b) a validity/fairness study. Don't sell "signal" before it's calibrated.
- **Sequencing:** #3 depends on #2 existing (to seed demand) and on an org/seat billing model (Stripe is in place but built for individual subs). Build #2 before #3.

### Competitive lens
- **LeetCode / HelloInterview / Pramp / interviewing.io** monetize consumer prep — flat premium (problem access), peer-matching, or per-session human mocks. None produce an employer-issued, rubric-scored, real-codebase signal; interviewing.io's human marketplace is high-touch and unscalable with no structured artifact.
- **CodeSignal already sells B2B assessments** (pre-screen / Certify) — but on isolated algorithmic tasks, the exact single-function model the wedge rejects. **CodeSparring's differentiated angle:** the assessment *is* real-codebase debugging with AI-collaboration scoring — the signal employers newly need and a puzzle-format incumbent structurally can't generate.

### 🧠 Your turn (PM rep)
Time-box 15 minutes. Write the one-paragraph objection a skeptical **Head of Talent** raises about the Verified Work-Sample Report — "why would we ever trust a self-serve, candidate-*generated* score?" — then design the single smallest product change that neutralizes it. (Hint: the answer lives in *who controls issuance and calibration* — candidate-run practice vs. employer-issued proctored assessment are different trust objects even with the same rubric.) Deliverable: the objection, your one change, and one sentence on how that change moves feature #2 from a consumer share-toy toward the #3 B2B bet.

---

## Growth, Acquisition & SEO — The Low-CAC Engine

**TL;DR:** Turn CodeSparring's one thing competitors can't cheaply copy — a *playable* work-sample round with an evidence-based scorecard — into the acquisition surface itself, so every "how do I prep for X" query in Google *and* in ChatGPT/Perplexity routes to a round you can play in 30 seconds, not a blog post you read.

### The job & the gap (JTBD)
- **Core JTBD:** "When I'm preparing for a specific company's engineering interview and I don't trust generic advice, I want to find and *try* the exact rounds that company actually runs, so I can walk in ready instead of guessing." (On the growth surface the "user" is also the cold searcher who lands with zero product context and decides in one screen.)
- **The gap today:** The guest funnel (no-signup first Bug Fix round) and comparison/programmatic SEO are the *intended* growth engine — but the moat isn't rendered as indexable, shareable, link-worthy content. The differentiator (a real work-sample + a 6-signal rubric) lives *behind* the funnel, while the acquisition pages compete with interviewing.io/HelloInterview on the one axis where they're strongest: editorial. We're bringing a blog to a work-sample fight.

### Why now
- **Content compounds slowly and the product is pre-launch** — seeding the programmatic layer *at* soft-launch is the single highest-leverage timing decision; every quarter of delay is a quarter of un-compounded organic.
- **AI answer engines are reshuffling interview-prep search** (ChatGPT, Perplexity, Google AI Overviews). The category's citation graph is still wet cement; a "playable round + structured-data" strategy can win GEO citations before incumbents' domain authority calcifies the answers.
- **We finally have a differentiated content *atom*.** Bug Fix (~17 substantiated scenarios) + the expanding Case Labs catalog + the rubric give us an ungameable, demo-able unit LeetCode's blog structurally cannot render — and Learn Python/SQL open brand-new top-of-funnel keyword surfaces (beginners, DE interns).

### Proposed enhancements (the backlog)

1. **Programmatic "Company × Round" landing pages** — auto-generated, indexable pages for "{Company} {round} interview practice" that terminate in a *playable* guest round, not a signup wall.
   - *User story:* "As a job-seeking SWE targeting a Palantir FDSE loop, I want a page that shows exactly what that case round looks like and lets me attempt one immediately, so I can start practicing without evaluating the whole product first."
   - *Effort:* L · *Impact:* Very-High · *Horizon:* Next
   - *Ties to moat/wedge:* Each page is anchored by a real Case Lab/Bug Fix scenario + a rubric preview — page→*play*, not page→read. This is content the wedge produces natively and LeetCode's blog cannot fake.

2. **Interactive "vs" comparison pages** — "CodeSparring vs LeetCode / vs HelloInterview" pages whose differentiator is a *live* demo of the round the competitor skips, not an editorial table.
   - *User story:* "As a career switcher comparing tools, I want an honest side-by-side that lets me *feel* the difference (fix a failing test in a real codebase vs solve an isolated puzzle), so I can pick the tool that matches real interviews."
   - *Effort:* M · *Impact:* High · *Horizon:* Next
   - *Ties to moat/wedge:* Literally dramatizes "practice the rounds LeetCode skips" on the exact query where buyers are comparing.

3. **GEO / answer-engine ownership of the category definition** — structured data + a canonical, citable "what is a work-sample / bug-fix interview round and how to practice it" answer hub, engineered to be quoted by AI answer engines.
   - *User story:* "As a candidate who asks ChatGPT 'how do I prep for a debugging interview,' I want the answer to point me somewhere I can actually practice, so I don't just get generic tips."
   - *Effort:* M · *Impact:* High · *Horizon:* Next→Later
   - *Ties to moat/wedge:* Publish the rubric as *the* named framework ("the 6-signal debugging rubric: files inspected, tests run, hypothesis, root cause, prevention, AI-collaboration"). Owning the category's *definition* in the answer graph is a moat competitors have to dislodge, not just outrank.

4. **Shareable evidence scorecard → referral loop** — post-round, generate a credible, shareable scorecard (rubric radar + one-line evidence summary) carrying the existing referral offer (1 free month + $10).
   - *User story:* "As a working SWE who just nailed a Bug Fix round, I want to share a scorecard that makes me look competent, so my friend gets a free month and I look good doing it."
   - *Effort:* M · *Impact:* High · *Horizon:* Next
   - *Ties to moat/wedge:* The scorecard *is* the moat made viral — every share advertises evidence-based scoring (not a vanity streak), and doubles as a proof artifact for the future B2B "work-sample signal" story.

5. **Creator / community "Scenario Challenge" loop** — an embeddable weekly public Bug Fix or Case challenge with a leaderboard ranked on *rubric quality*, not speed.
   - *User story:* "As a coding creator, I want an embeddable weekly bug-fix challenge my audience can attempt, so I get repeatable content and my viewers discover CodeSparring."
   - *Effort:* L · *Impact:* Med · *Horizon:* Later
   - *Ties to moat/wedge:* A quality-ranked leaderboard reinforces the category story (evidence > speed) and turns creators into a distribution flywheel — the anti-LeetCode of "fastest AC."

### Success metrics
- **Leading — SEO/GEO coverage:** indexed programmatic pages and non-brand organic impressions/clicks ↑; **AI-answer-engine citation share** (# of target queries where CodeSparring is cited/linked in ChatGPT/Perplexity/AI Overviews) ↑.
- **Leading — funnel:** landing-page → **completed first guest Bug Fix round** activation rate ↑ (the make-or-break conversion for cold traffic).
- **Leading — virality:** invites per activated user via scorecard shares / referral **K-factor** ↑.
- **North-Star-linked outcome:** **organic-sourced Pro trials** ↑ while **blended organic CAC** ↓.

### RICE snapshot
Top 2 features scored. *Assumptions: Reach = people reached/quarter once live; Impact on 0.25/0.5/1/2/3 scale; Confidence as %; Effort in person-months.*

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| 1. Programmatic Company × Round pages | 20,000 | 2 | 0.70 | 4 | **7,000** |
| 4. Shareable scorecard → referral loop | 4,000 | 1.5 | 0.60 | 2 | **1,800** |

(Programmatic pages win on raw reach + wedge fit; the scorecard loop is the cheaper, faster virality multiplier that makes every acquired user compound — sequence #1 for reach, #4 close behind to lift K-factor.)

### Risks & dependencies
- **Thin-content / Helpful-Content risk.** Programmatic pages must be genuinely differentiated (real playable scenario per page), not doorway/templated pages, or Google demotes the whole cluster. Depends on scenario density per company — where coverage is thin, position honestly as "based on reported rounds."
- **Substantiation dependency (trust/legal).** Company-named claims must be defensible; this rides on the fabricated-claims cleanup tracked in GTM — don't scale company pages ahead of substantiated provenance.
- **Cost + cannibalization.** Cold traffic hitting free guest rounds raises Pyodide/RAG/LLM exposure (sequences behind cost-abuse hardening), and ranking for generic "leetcode practice" can import the *wrong* puzzle-seeking audience that won't activate on Bug Fix — target intent-rich queries, not the biggest head terms.

### Competitive lens
- **How incumbents do it:** interviewing.io and HelloInterview win on editorial authority and long-form guides; LeetCode owns the branded head term and problem pages; Pramp/CodeSignal are content-weak. Critically, *every one of them terminates an SEO page in a signup wall or a "read more" CTA* — none terminate in a playable work-sample.
- **CodeSparring's angle:** page → *play*, not page → read; and own the emerging category term ("work-sample / bug-fix interview practice") in both Google and the AI answer graph *before* incumbents pivot. The rubric gives us a citable framework to anchor GEO that a blog post can't match.

### 🧠 Your turn (PM rep)
In 15 minutes: run the query **"how to prepare for a debugging interview"** in *both* Google and ChatGPT. Write down who ranks/gets cited, and what each result's CTA is (read? signup? nothing playable?). Then spec the one-screen CodeSparring page that would out-convert them: name the **H1**, the **single interactive element above the fold**, and the **exact point where you gate signup**. Defend, in three sentences, why your gate placement maximizes *activated guests* without tanking indexability — and name the one metric you'd watch to know you got the gate wrong.

---

## Retention & Lifecycle
**TL;DR:** Stop chasing vanity streaks — build a moat-native retention loop where an *evidence-based Readiness Score* decays over time and the highest-intent moment (a scheduled interview) drives a countdown-orchestrated prep plan, turning "practice when I remember" into "the product tells me exactly what to run today, and why."

### The job & the gap (JTBD)
- **Core JTBD:** *"When I'm preparing for a specific interview loop over the next few weeks, I want the product to keep me practicing the right rounds at the right cadence, so I can walk in confident that my weak spots are covered and fresh."*
- **The gap today:** The building blocks exist in isolation — FSRS spaced repetition, lifecycle email, NPS, dashboard/metrics, referrals — but there is no *orchestration layer* that fuses them into a felt loop. FSRS computes due items but nothing turns "you have 4 reviews due" into a re-engagement event with a one-click "run one round in 10 min" CTA across channels. There's no urgency object tied to the user's actual interview date, so the product can't ride the single highest-intent window a candidate ever has. Retention is currently passive (user must remember to come back) rather than a designed, evidence-informed cadence.

### Why now
- **The wedge creates a natural clock LeetCode doesn't have.** A Bug Fix / Case Labs round is a *dated event* in a job search ("Palantir FDSE onsite in 9 days"). That real deadline is a re-engagement engine competitors built on infinite puzzle-grinding structurally lack — we should exploit it before we scale acquisition spend into a leaky bucket.
- **The moat gives us a better retention primitive than streaks.** Because we score *evidence quality* (files inspected, hypothesis, root cause, prevention, AI-collaboration), we can model skill *freshness* per competency and let a Readiness Score decay honestly — a re-engagement trigger that's true, not gamified, and that no one can copy without the rubric.
- **Product stage.** Soft-launch means the acquisition funnel (SEO + guest activation) is about to fill the top; without a lifecycle loop, CAC is wasted. Retention infrastructure compounds — every point of W4 retention lifts LTV and the referral/SEO flywheel.

### Proposed enhancements (the backlog)

1. **Interview Countdown Mode** — set your interview date + target company, get a day-by-day prep plan and escalating nudges tuned to the loop.
   - *User story:* "As a job-seeking SWE with a Stripe onsite in 12 days, I want a countdown plan that schedules the right Bug Fix scenarios, Case Labs, and due reviews for me, so that I show up covered instead of guessing what to grind."
   - *Effort:* L · *Impact:* Very-High · *Horizon:* Next (0–2q).
   - *Ties to moat/wedge:* Pure wedge — only a product with company-specific *rounds* (not puzzles) can plan against a real loop; the plan's "readiness by interview day" projection is powered by the evidence rubric.

2. **Readiness Decay & Skill Freshness (the anti-streak)** — replace/augment vanity streaks with a per-competency Readiness Score that decays and tells you *what* got stale.
   - *User story:* "As a working SWE keeping skills warm, I want to see which competencies (debugging discipline, root-cause depth, AI collaboration) have gone stale, so that I refresh the weak one instead of re-grinding what I'm already good at."
   - *Effort:* M · *Impact:* High · *Horizon:* Next (0–2q).
   - *Ties to moat/wedge:* Directly monetizes the moat — decay is computed from evidence-rubric dimensions, so the retention trigger *is* the differentiated signal; impossible to clone without the scoring layer.

3. **Due-Review Reactivation Loop** — turn FSRS due-items into cross-channel (email + web push) re-engagement events with a "one round, 10 min" deep-link.
   - *User story:* "As a career switcher who forgets to come back, I want a nudge the day my reviews are due with a single button that drops me straight into a scenario, so that I keep my spacing intact without planning it myself."
   - *Effort:* S/M · *Impact:* High · *Horizon:* Next (0–2q).
   - *Ties to moat/wedge:* Adjacent-but-justified — spaced repetition is table stakes, but our review items are *evidence-scored scenarios*, so completing a review measurably moves Readiness, not just a checkmark.

4. **NPS Routing Engine** — route each NPS response to an action: promoter → referral prompt ($10 + free month), passive → "what's missing" targeted content, detractor → founder win-back / offer.
   - *User story:* "As a promoter who just aced a mock, I want to be asked to invite a friend at that exact peak moment, so that referring feels natural — and as a detractor I want someone to actually address my complaint."
   - *Effort:* S · *Impact:* Med · *Horizon:* Next (0–2q).
   - *Ties to moat/wedge:* Adjacent — closes the loop between the existing NPS + referral surfaces to feed the growth flywheel; peak-moment timing is enabled by session/feedback events.

5. **Evidence-Backed Win-Back** — a churned/lapsed sequence that leads with a personalized "here's what you'd forgotten" evidence snapshot + one fresh scenario before any discount.
   - *User story:* "As a lapsed user who stopped after my interview, I want a comeback message that shows my decayed weak spots and hands me a relevant new Case Lab, so that returning feels useful rather than a discount grab."
   - *Effort:* M · *Impact:* Med · *Horizon:* Later (2–4q).
   - *Ties to moat/wedge:* Deepens moat — win-back personalization is built on stored evidence scores, making the message something only CodeSparring can send.

### Success metrics
- **Leading:** Due-review reactivation CTR (email/push → session start) and week-over-week due-review completion rate — direction: up.
- **Leading:** Countdown Mode activation (% of users who set an interview date) and plan-adherence (% of scheduled days with ≥1 round) — direction: up.
- **Leading:** Notification opt-in rate (web push) and NPS-promoter → referral-send conversion — direction: up.
- **North-star-linked outcome:** W4 retention of *activated* users and Pro subscription net revenue retention (churn down) — the ultimate proof the loop protects LTV.

### RICE snapshot
Assumptions: Reach = eligible users touched per quarter at soft-launch scale; Impact on RICE scale (3=massive, 2=high, 1.5=high-med, 1=med); Confidence as %; Effort in person-months.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| Due-Review Reactivation Loop | 6,000 | 1.5 | 0.8 | 1.5 | **4,800** |
| Interview Countdown Mode | 2,000 | 3 | 0.7 | 4 | **1,050** |

*Read:* the reactivation loop wins on RICE (cheap, broad, high-confidence — build first), but Countdown Mode is the strategic wedge bet worth its lower RICE because it's defensible and hits the highest-intent, highest-willingness-to-pay window.

### Risks & dependencies
- **Notification fatigue / deliverability:** decay-based and countdown nudges can feel nagging; needs per-user frequency capping, quiet hours, and a single preference center, or opt-out and spam-flagging rise. Depends on a reliable email + web-push infra and event bus.
- **Readiness Score honesty & cannibalization:** if decay is tuned to manufacture urgency it erodes trust and undercuts the moat's credibility; the score must be defensible from the rubric. Also risks cannibalizing the "clean" evidence signal we want to sell to B2B — keep the consumer decay model and the employer work-sample signal clearly separated.
- **Sequencing:** Countdown Mode depends on Case Labs catalog breadth per target company; a thin catalog produces weak plans. Ship the reactivation loop + Readiness decay first (they run on existing scenarios), then Countdown as the catalog fills.

### Competitive lens
- **LeetCode** leans on streaks/badges and generic "keep your streak" reminders — vanity metrics decoupled from real readiness; **Pramp/interviewing.io** are booking-driven with essentially no owned habit loop between sessions; **HelloInterview** is content-first. None can tie re-engagement to an *evidence-scored, decaying competency model* or a company-specific interview-date plan.
- **CodeSparring's angle:** retention driven by *truthful skill freshness* and *real interview urgency* around the rounds LeetCode skips — the same rubric that powers the moat powers the nudge, so the retention loop is itself un-clonable.

### 🧠 Your turn (PM rep)
Design the **5-touch Evidence-Backed Win-Back sequence** for a user who churned two weeks *after* their interview date passed. For each touch, write (a) the subject line, (b) the single evidence hook it leads with (e.g., a specific decayed competency), and (c) the CTA. Then decide **which touch carries the reactivation discount** — and write the one-paragraph defense for why moving the offer to touch 1 would *lower* LTV. Doable in 15 minutes; the discipline is separating "give them a reason to return" from "buy them back," and proving the ordering with a retention/LTV argument, not a gut call.

---

## Trust, Reliability, Admin & Data Platform

**TL;DR:** Turn the internal plumbing (flags, warehouse, compliance, AI observability) into a compounding advantage — the data layer that makes the evidence-based rubric *provably* better over time and the trust layer that lets CodeSparring sell a "work-sample signal" to employers.

### The job & the gap (JTBD)
- **Core JTBD (internal PM/eng persona):** *When* I ship a scenario, a rubric tweak, or a pricing change, *I want to* measure its real effect on activation, score quality, and retention on a clean, queryable dataset, *so I can* decide what to double down on without guessing or shipping regressions blind.
- **Core JTBD (B2B buyer persona, emerging):** *When* I consider CodeSparring's scores as a hiring/upskilling signal, *I want* documented evidence that the platform is secure, private, and that its scoring is calibrated, *so I can* clear procurement and trust the number.
- **The gap today:** the product has admin tooling, dashboards, NPS, and a feedback pipeline — but these are operational surfaces, not an analytics *substrate*. There's no clean event warehouse decoupled from Firestore, no first-class experimentation loop to validate that a rubric change actually improved outcomes, no cost/quality telemetry that persists as a durable capability (vs. the pre-launch observability patch), and no compliance artifact a security reviewer can consume. The moat (evidence-based scoring) is asserted but not yet *instrumented to prove itself*.

### Why now
- **The moat is only a moat if it improves with use.** The rubric (files inspected, tests run, hypothesis, root cause, prevention, AI-collaboration quality) generates rich structured signal every session — but without a warehouse and experimentation loop, that signal evaporates. Post-launch traffic is the raw material; capture it now or lose the compounding advantage LeetCode can't replicate.
- **B2B/enterprise is the aspirational tier**, and every "work-sample signal" conversation dies at procurement without SOC2 + a privacy story. Building the compliance productization early (data retention controls, audit logs, DPA-ready posture) is the unlock for the highest-value revenue line, and it's cheapest to build before the data model calcifies.
- **AI cost is the variable that scales with success.** LLM interviewer + RAG hints + feedback + tutor ("Sable") are per-session spend. As guest activation and Learn courses pull in beginners at volume, cost/quality observability stops being a nice-to-have and becomes the difference between healthy and negative contribution margin.

### Proposed enhancements (the backlog)

1. **Rubric Calibration Warehouse** — a clean, append-only event pipeline (Firestore → warehouse, e.g. BigQuery) that lands every rubric sub-score, hint used, test run, and session outcome as queryable facts.
   - *User story:* "As a PM, I want to query rubric sub-score distributions by scenario and cohort so that I can find mis-calibrated scenarios (too easy/hard, score doesn't predict retention) and fix them."
   - *Effort:* L · *Impact:* Very-High · *Horizon:* Next (0–2q).
   - *Ties to moat:* This IS the moat's flywheel — it turns per-session rubric data into a calibration loop no single-function-puzzle competitor has the data shape to build.

2. **Experimentation & Feature-Flag Platform** — a lightweight flag + A/B assignment service with warehouse-joined readouts, so rubric weights, interviewer prompts, guest paywall timing, and Case Lab difficulty are all testable.
   - *User story:* "As a PM, I want to ship a new interviewer-tone prompt to 10% of sessions and read its effect on completion + NPS so that I can promote or kill it on evidence, not vibes."
   - *Effort:* M · *Impact:* High · *Horizon:* Next (0–2q).
   - *Ties to moat:* Lets the evidence-based rubric itself be tuned empirically — the rubric becomes a *learning system*, widening the gap vs. a static problem bank.

3. **SOC2 + Privacy Productization** — audit logging, configurable data retention/deletion, PII minimization on transcripts, and a customer-facing trust page/DPA posture that clears B2B security review.
   - *User story:* "As an enterprise buyer, I want documented security controls and a data-processing agreement so that I can approve CodeSparring scores as an internal upskilling/screening signal."
   - *Effort:* XL · *Impact:* High · *Horizon:* Bet (4q+).
   - *Ties to moat:* Converts the "work-sample signal" story from aspiration into a sellable B2B product; the moat's endgame is employer trust, which is gated entirely on this.

4. **AI Cost & Quality Observability (durable)** — per-session/per-feature cost attribution (interviewer, RAG, feedback, Sable), quality signals (hint relevance, feedback groundedness, hallucination flags), and margin dashboards with alerting.
   - *User story:* "As an operator, I want cost-per-completed-session broken down by feature and plan so that I can protect contribution margin as guest + Learn volume scales, and catch a prompt regression that spikes token spend."
   - *Effort:* M · *Impact:* High · *Horizon:* Next (0–2q).
   - *Ties to moat:* Adjacent — justified: keeps the AI-heavy differentiators economically viable at scale, and quality signals feed rubric calibration (#1).

5. **Admin/Ops Depth: Scenario Health & Signal Console** — an internal console surfacing per-scenario funnel (start→complete→convert), rubric drift, guest-abuse anomalies, and one-click flags to quarantine a broken scenario or Case Lab.
   - *User story:* "As an ops owner, I want to see which of the ~17 Bug Fix scenarios and each Case Lab is underperforming or breaking so that I can pull or patch it before it hurts activation."
   - *Effort:* M · *Impact:* Med · *Horizon:* Later (2–4q).
   - *Ties to wedge:* Keeps the flagship Bug Fix + Case Labs catalog healthy as it expands — catalog quality is the wedge's durability.

### Success metrics
- **Rubric calibration coverage** (leading): % of scenarios with a validated score↔retention correlation ≥ target — up and to the right.
- **Experiment velocity** (leading): # of flag-gated experiments shipped/quarter with a warehouse readout — up (from 0).
- **Cost per completed session, by feature** (leading + margin): down or held flat as volume grows; alert coverage on token-spend anomalies at 100%.
- **B2B qualification rate** (North-Star-linked outcome): % of enterprise conversations that clear security review — up (unblocks the highest-value revenue line).

### RICE snapshot
Assumptions: Reach = share of sessions/decisions the capability touches per quarter (0–1 normalized ×10); Impact 3=high, 2=med; Confidence as %; Effort in person-months. RICE = Reach×Impact×Confidence÷Effort.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| Rubric Calibration Warehouse | 9 | 3 | 0.8 | 4 | 5.4 |
| AI Cost & Quality Observability | 8 | 3 | 0.85 | 3 | 6.8 |

Read: Observability edges out the warehouse on RICE (cheaper, high confidence, immediate margin protection), but the warehouse is the strategic prerequisite for experimentation *and* calibration — sequence observability first for the quick margin win, land the warehouse in parallel because everything downstream depends on it.

### Risks & dependencies
- **Sequencing / foundation risk:** experimentation (#2) and calibration (#1) both depend on the warehouse existing; ship the pipeline first or the rest stalls. Don't build flags against Firestore reads directly — you'll rebuild it.
- **Compliance cost & timing:** SOC2 (#3) is XL, calendar-bound (audit windows), and partly non-engineering (policy, vendor). Cannibalization risk if it pulls focus from wedge/catalog growth pre-revenue — gate it on the first real enterprise pipeline, not speculatively.
- **Privacy vs. data richness tension:** the warehouse wants rich transcript data; privacy productization wants minimization. Decide the retention/PII policy *before* landing the pipeline schema, or you'll re-migrate.

### Competitive lens
- LeetCode/Pramp/HelloInterview expose leaderboards and streaks but have no structured *work-sample* signal to calibrate — their unit (a puzzle pass/fail) is too thin to build an evidence warehouse around. **CodeSignal** is the real comparable here: it monetizes assessment *signal* to employers (SOC2, calibrated scores) — validating the B2B thesis but from the sterile-assessment side.
- **CodeSparring's angle:** own the same trust/signal infrastructure CodeSignal has, but wrapped around the wedge CodeSignal lacks — realistic, AI-mediated, multi-dimensional *work-sample* rounds (Bug Fix, Case Labs) that LeetCode structurally can't serve. The platform layer is what turns "we have a better round" into "we have a defensible, sellable signal."

### 🧠 Your turn (PM rep)
In 15 minutes, **write the kill-argument for the Rubric Calibration Warehouse (#1).** Make the strongest case that a pre-launch/soft-launch startup should NOT build it yet: name the opportunity cost (what wedge/catalog work it displaces), the volume threshold below which calibration is statistical noise (estimate the sessions/scenario you'd need for a trustworthy score↔retention signal), and the cheaper interim substitute (e.g. manual weekly SQL-on-Firestore export). Then decide: does your kill-argument change the *sequencing* or the *decision*? Defend your answer in three sentences — that distinction (delay vs. drop) is the actual PM judgment being tested.

---

# Part 3 · Build the muscle — a PM practice program


This is a curriculum, not reading. The product above is your training ground. Do the drills, hand them to your mentor, get graded, iterate. That feedback loop *is* the skill.

---

### 1. How a PM would actually work this roadmap — the 5-step loop

Run this loop on any roadmap item before you advocate for it. It's the difference between "I think we should build X" and "here's why X, and here's how I'll know I was wrong."

1. **Frame the outcome, not the feature.** Start from a metric that must move (NSM or a counter-metric), and the JTBD it serves. *"Guest→Pro conversion is 3%; the job is 'show me Pro is worth $24 before I pay.'"* If you can't name the outcome, you're not ready to build.
2. **Map opportunities before solutions.** List the unmet needs behind the outcome (mini OST). Force at least three solutions per opportunity so you're choosing, not defaulting to the first idea.
3. **Write the hypothesis and the bet.** *"We believe [solution] will cause [outcome change] for [persona] because [reason]. We'll know it worked if [leading metric] moves [amount] in [time]."* Name what would prove you wrong.
4. **Prioritize and cut.** RICE-rank candidates within the horizon; MoSCoW the chosen bet's scope. Explicitly write the "Won't-yet." Sequence: Basics before Delighters (Kano).
5. **Instrument, ship, read the signal, decide.** Define the leading metric *before* launch. Ship the smallest test of the hypothesis. Read the result honestly and either double down, iterate, or kill. Write down what you learned — that's the compounding asset.

The loop is fractal: run it in 20 minutes for a quick win, over two weeks for a bet.

---

### 2. Reusable one-page feature brief template

Copy this verbatim. If you can't fill a field, that's the field telling you to go do more work. Keep it to one page — the constraint is the discipline.

```markdown
# Feature Brief: <name>
Author: <you>   Date: <>   Horizon: Now / Next / Later   Status: Draft

## 1. Problem
What's broken or missing today, for whom, and how do we know it's real?
(1–3 sentences. Cite evidence: a metric, a support theme, a user quote — not a hunch.)

## 2. Job-To-Be-Done
"When <situation>, I want to <motivation>, so I can <expected outcome>."
Persona this job belongs to: <job-seeker / switcher / working SWE / beginner / DE intern>

## 3. Hypothesis
"We believe <solution> will cause <outcome change> for <persona>
because <reason>. We'll know we're right if <leading metric> moves
<amount> within <timeframe>. We'll know we're wrong if <falsifier>."

## 4. Solution (this is a Feature / part of a Bet: <which>)
The smallest version that tests the hypothesis. What we build, what we
deliberately DON'T (MoSCoW: Must / Should / Could / Won't-yet).

## 5. Success metric
Primary (leading): <>       Guardrail / counter-metric: <>
Lagging metric it should eventually move: <>

## 6. RICE
Reach: <n/qtr>  Impact: <0.25–3>  Confidence: <%>  Effort: <person-weeks>
Score = (R × I × C) / E = <>
One line defending each number.

## 7. Risks
Biggest way this is wrong; the moat/strategy risk; the cost/reliability risk.

## 8. Open questions
What you don't yet know and how you'll find out (before building, not after).
```

---

### 3. Graded practice drills

Do these on CodeSparring specifically. Each says what "good" looks like so you can self-check before handing it to me. Aim for one page each; brevity under constraint is the skill being graded.

**Drill 1 — Define the North Star + 3 counter-metrics.**
Write CodeSparring's North Star Metric in one sentence, then three counter-metrics that would catch you gaming it. Defend why this NSM (not "sign-ups," not "MRR").
*Good looks like:* an NSM that proxies real learned value and degrades if cheated; counter-metrics that guard the obvious failure modes (e.g. quality-per-round, retention, refund/complaint rate). You can articulate the failure each counter-metric prevents.

**Drill 2 — RICE-rank five features and justify.**
Rank these five for the next quarter: (a) Learn SQL course + SQL runner, (b) B2B employer "work-sample signal" pilot, (c) 20 new vs-competitor SEO pages, (d) 10 new Bug Fix scenarios, (e) mobile-responsive editor. Show every R/I/C/E number with a one-line defense, compute scores, then override the ranking *once* with a strategic reason and explain why RICE alone was wrong there.
*Good looks like:* honest Effort estimates, Confidence that reflects real uncertainty, and — critically — a demonstrated understanding that RICE ranks within a horizon and a moat bet may deserve a seat RICE won't give it.

**Drill 3 — Design the guest-funnel activation metric.**
The guest funnel is: no-signup first Bug Fix round → Pro. Define the single **activation** event that best predicts conversion, and defend why it (not "started a round," not "signed up"). Then propose the leading metric you'd watch weekly.
*Good looks like:* an activation moment tied to *experiencing core value* (e.g. "completed a round AND viewed their rubric gap"), a stated causal link to conversion, and a plan to validate that link rather than assume it.

**Drill 4 — Write a crisp PRD one-pager for one Later-horizon feature.**
Pick one Later bet (B2B work-sample signal, peer benchmarking, or an interviewer "difficulty adapts to you" engine). Fill the Section-2 brief template end to end.
*Good looks like:* a falsifiable hypothesis, a Must/Won't-yet that shows real scope discipline, a leading + lagging metric pair, and named risks including the strategic one. If nothing in it could fail, you wrote a wish, not a bet.

**Drill 5 — Stakeholder role-play: eng says the bet is too expensive.**
Eng lead: *"The B2B work-sample scoring export is 8 person-weeks; we don't have it this quarter."* Write your negotiation. Cut scope without killing the hypothesis. Produce a Must/Should/Could/Won't-yet that still tests whether employers value the signal.
*Good looks like:* you protect the *hypothesis* while trading away everything non-essential; you find the 2-week version that still generates signal (e.g. a manual export for 3 design-partner employers, not a self-serve dashboard). You don't cave, and you don't steamroll — you re-scope.

**Drill 6 — Cut the roadmap to one bet, 6 weeks.**
You have one team and six weeks before you must show traction to justify the raise/next phase. Pick the single bet. Write the one-paragraph defense: which theme it serves, what it proves if it works, and what you're consciously NOT doing.
*Good looks like:* a choice that advances either the moat (evidence-based rubric → B2B) or the wedge (Bug Fix depth / activation), an explicit list of what dies, and a clear "if this works we've learned ___" statement. Choosing everything = automatic fail.

**Drill 7 — Kano-classify the surface and find the gap.**
Sort ten current features (AI interviewer, code execution, spaced repetition, voice, Sable tutor, referrals, rubric depth, roadmaps, Case Labs, Learn Python) into Basic / Performance / Delighter. Then name the one Basic that, if it's shaky, makes every Delighter worthless — and one Delighter worth building next.
*Good looks like:* correct recognition that reliability/data-safety are Basics, that rubric depth and scenario breadth are Performance, and that you'd never ship a delighter on a broken basic. Your "next delighter" is tied to a persona's job.

**Drill 8 — Write the counter-positioning memo (why LeetCode can't copy this in a quarter).**
One page. Using the moat (evidence-based scoring rubric: files inspected, tests run, hypothesis, root cause, prevention, AI-collaboration quality), argue why a well-resourced incumbent can't trivially replicate CodeSparring's category. Then name the one thing that *would* let them, and how you'd widen the gap first.
*Good looks like:* the argument rests on the compounding, structural asset (work-sample data + rubric + B2B signal loop), not on UI polish. You honestly name your vulnerability and a concrete widening move (e.g. lock in employer design partners so the signal becomes a two-sided asset).

---

### 4. Glossary

- **Activation:** the first moment a new user experiences core value; the strongest early predictor of retention/conversion.
- **Bet:** a hypothesis with an uncertain outcome and resources wagered on it; can fail. (vs. a feature, which just ships.)
- **Counter-metric (guardrail):** a metric you watch to make sure improving your primary metric didn't break something else.
- **Delighter:** a Kano category — unexpected value; its absence isn't missed, its presence wows (until it becomes expected).
- **Falsifier:** the specific result that would prove your hypothesis wrong. A hypothesis without one isn't testable.
- **Horizon (Now / Next / Later):** planning tiers by time and certainty; Now is committed, Later is directional.
- **JTBD:** Jobs-To-Be-Done — the progress a user hires the product to make in a situation.
- **Lagging metric:** slow, confirms outcomes (MRR, churn, LTV); good for judging, bad for steering.
- **Leading metric:** fast, influenceable, predicts a lagging metric; what you steer by week to week.
- **Moat:** a structural, compounding advantage competitors can't cheaply copy.
- **North Star Metric (NSM):** the single best proxy for delivered customer value; the org's shared direction.
- **OST (Opportunity Solution Tree):** outcome → opportunities → solutions → experiments; keeps solutions tied to real needs.
- **RICE / ICE:** prioritization scores. RICE = (Reach × Impact × Confidence) / Effort; ICE = Impact × Confidence × Ease.
- **Theme:** a strategic focus area for a period, framing multiple bets.
- **Vanity metric:** a number that looks good and moves easily but doesn't connect to real value or a lagging outcome.
- **Wedge:** the sharp, narrow entry point into a market (here: "practice the rounds LeetCode skips," flagship Bug Fix) from which you expand the category.
