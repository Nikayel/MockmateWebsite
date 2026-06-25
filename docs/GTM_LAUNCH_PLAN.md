# CodeSparring — Go-To-Market & Launch Plan

_Strategy artifact. Living document. Last updated: 2026-06-25._

## 1. Positioning

**One-liner:** _Don't just practice interviews — actually get better, permanently._

**Why this and not "AI interviewer":** Every competitor (LeetCode, NeetCode,
interviewing.io, Exponent, OphyAI, Edesy, Final Round) now ships an "AI
interviewer." It is table stakes, not a differentiator. Our defensible edge is
the **learning loop**: FSRS spaced repetition + mastery scoring + RAG-personalized
roadmaps. That loop is also our retention engine — spaced repetition brings users
back on a schedule by design.

**Three pillars to lead with:**
1. **Retention science** — FSRS spaced repetition, mastery curves (no competitor at our tier has this).
2. **Company-specific personalization** — RAG over company interviewer styles, your history, weaknesses.
3. **Complete realistic loop** — chat + real code execution + adaptive hints + voice.

## 2. Market context (mid-2026)

- The interview itself changed: Meta's "AI-aware coding round" (late 2025) is
  spreading; pure DSA recall is being devalued.
- Behavioral rounds grew from ~10-15% to **30-40%** of interview time at big tech.
- 71% of eng leaders say AI makes technical skill harder to assess → more weight
  on system design + reasoning out loud.
- Price compression: new all-in-one AI tools land at **$9-19/mo** vs our $25.

**Implication:** our DSA core (181 problems) is necessary but not sufficient.
Growth lanes = **behavioral**, **system design** (we have only 12), and an
**AI-aware interview mode** that nobody has branded yet.

## 3. Competitive map

| Player | Price | Their wedge | Our counter |
|---|---|---|---|
| LeetCode | $35/mo | 3,000+ problems, brand | Learning loop + realistic AI interview, not just a problem bank |
| NeetCode | Pro | Free curriculum + NeetBot | Spaced repetition + company personalization |
| interviewing.io | $225+/session | Real senior humans | 1/10th the cost, unlimited reps, retention science |
| Exponent (ate Pramp) | sub+credits | Peer mocks, sys design | Always-available AI, no scheduling friction |
| HelloInterview | — | Owns system design | Close the gap; lead with full-loop + SR |
| OphyAI/Edesy/Lodely | $9-19/mo | Cheap all-in-one | Depth + retention, consider a Lite tier |
| Final Round/LockedIn | sub | Real-time in-interview AI | Different (cheating-adjacent) category; stay practice-side |

## 4. Pre-launch punch list

**Launch blockers**
- [x] Wire Sentry error tracking (done — ingestion API, no SDK).
- [ ] Resolve VS Code extension copy on pricing page (ship thin / waitlist / remove). Don't sell vaporware.
- [ ] Pricing decision (see §6).
- [ ] Wire `logger.track` to a real analytics sink (PostHog) — funnel visibility before users arrive.

**Competitive gaps (fast-follow)**
- [ ] Expand system design beyond 12 scenarios.
- [ ] Ship a v1 behavioral track (STAR coaching on existing voice + RAG stack).
- [ ] Brand + build an "AI-aware interview" mode.

## 5. Acquisition triad

### A. Content / SEO (owned, compounding — highest ROI)
Already started: `codesparring-vs-*` pages, 14 blog posts, intent landing pages.
Double down with programmatic generation:
- One page per **company** ("Google coding interview prep", "Amazon…", etc.).
- One page per **pattern** (sliding window, graphs, DP…).
- One page per **competitor comparison** (extend existing set).
- Keep publishing educational posts targeting long-tail prep keywords.

### B. Community (where SWE job-seekers live)
- Reddit: r/cscareerquestions, r/leetcode, r/csMajors (genuinely useful posts, not spam).
- Discords + Blind. Offer generous free tier (8 sessions) as the hook.
- Time a **Product Hunt** + **Show HN** launch around the retention angle.

### C. B2B2C (Enterprise tier unlock)
- Bootcamps + university career centers = cheap, high-trust cohorts + social proof.
- One bootcamp deal = a cohort of users + a logo.

### Built-in growth loops (already in codebase)
- Referrals + promo codes exist → surface a referral prompt at the post-session "win" moment.
- Spaced-repetition due reminders = built-in re-engagement.

## 6. Pricing — decision pending

Current: Free ($0, 8 sessions) / Pro ($25/mo or $225/yr) / VSCode ($19, unshipped) / Enterprise (custom).

| Option | Upside | Downside |
|---|---|---|
| **Hold $25** | Protects margin (AI costs are real); premium signals depth | Exposed vs $9-19 all-in-one tools; may lose price-sensitive top-of-funnel |
| **Add $9-12 Lite tier** | Wider funnel, competes on price, upsell path to Pro | Risk of cannibalizing Pro; must cap AI budget tightly on Lite |
| **Drop Pro to ~$19** | Matches mid-market directly | Hurts unit economics given LLM + execution costs; hard to walk back |

**Recommendation:** Hold $25 for Pro **and** add a **$9-12 Lite tier** with a hard
AI-budget cap — widen the funnel without discounting the flagship. Validate
against the actual per-user AI cost model before committing.

## 7. Tooling (Claude Code) to run this

- **Sentry** (done) — production error visibility.
- **Canva MCP** (connected) — launch visuals, social cards, comparison graphics, OG images.
- **Vercel MCP** (to add) — deploy visibility + funnel data.
- **PostHog/analytics MCP** (to add) — wire `logger.track`, find onboarding drop-off.
- **Stripe MCP** (to add) — revenue ops, promo campaigns, subscription debugging.
- **`deep-research` skill** — scheduled competitive intel (pricing, new entrants).
- **Custom workflows** — programmatic SEO page generation; scenario authoring (DSA/system-design/behavioral with executable tests).
- **Scheduled competitor-watch (cron)** — alert on rival pricing/feature moves.
