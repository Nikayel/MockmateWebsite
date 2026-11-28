# CodeSparring: SEO, repeat practice, and roadmap purchase audit

Audit date: November 6, 2026. Read-only production investigation. No website, billing, flag, email, or analytics configuration was changed.

## Product judgment

Prioritize getting an interview-focused visitor into a small, useful preparation loop: choose a target, see today's task, complete it, understand the result, and return to the next task. Roadmaps are a plausible organizing promise for that loop. Evidence of durable willingness to pay is still absent in the configured Stripe account.

The historical roadmap purchase is a useful lead, with a critical qualification: the one $25 charge was fully refunded the same day. The buyer created a Google roadmap immediately after payment, recorded no interview sessions, and has no questions marked complete. We cannot establish their reason for purchasing or requesting a refund from these records.

## What was verified

| Source | Scope and window | Coverage |
| --- | --- | --- |
| PostHog project 563097 | Production host www.codesparring.dev; October 9–November 5, inclusive; UTC | Typed web reports with configured test-account filtering; raw aggregate diagnostics state their filters separately |
| Firestore profiles and interview_sessions | Accounts created October 9–29; observed activity October 9–November 5 | 19 accounts; all 91 profiles and 602 interview-session documents read with field projections; neither collection capped |
| Firestore user_roadmaps and payment_history | Available history as of November 6 | 14 roadmaps and eight ledger records; neither collection capped |
| Stripe live charges API | Configured account's available charge history, checked November 6 at 17:18 UTC | One charge; complete pagination; no truncation |
| Buyer-specific Stripe and Firestore reads | September 1 purchase through November 6 | Checkout, charge, subscription, roadmap state, and notification records cross-checked |
| Public HTTP checks | November 6 | Six distinct public HTML pages, robots.txt, sitemap.xml, and apex-host redirect destination |

The governed PostHog metric catalog was empty. Calculations below are analyst-defined for this audit, rather than approved catalog metrics. Canonical application records are used where browser analytics cannot establish durable identity.

No active entries were returned by the admin_roles exclusion query. Unflagged internal/test accounts may remain. Customer identifiers, emails, code, and transcripts are excluded from this report.

## 1. SEO: useful traffic exists; rankings remain unverified

PostHog query-web-overview and query-web-stats, October 9–November 5, production host:

| Channel | Observed visitors | Bounce rate |
| --- | ---: | ---: |
| Direct | 1,290 | 88.5% |
| Organic Search | 179 | 29.2% |
| AI | 80 | 25.8% |
| Referral | 35 | 48.9% |

Overall: 1,576 observed visitor identities, 1,672 sessions, and 2,211 pageviews in the filtered web report. Channel-level visitor counts overlap and should not be added together. These are analytics identities, not independently verified humans.

The search and AI segments engage substantially more than the large Direct segment. The site-wide bounce rate of 77.3% is therefore a poor reason to conclude that search visitors find the product irrelevant.

Organic landing-page report, same dates and filters:

| Landing page | Observed visitors | Bounce rate |
| --- | ---: | ---: |
| /labs | 52 | 41.5% |
| / | 34 | 20.6% |
| /interview | 11 | 8.3% |
| /free-ai-coding-interview | 11 | 9.1% |
| /ai-coding-interview-practice | 8 | 25.0% |
| /labs/palantir-ontology-learning | 7 | 12.5% |
| /roadmap/preview | 3 | 33.3% |

Small rows are directional, especially the roadmap preview. This is acquisition-channel evidence; it does not reveal search queries, current ranking positions, or causation.

Separate raw pageview inspection found four observed identities and four views at /roadmap/preview, versus 15 identities and 19 views at /roadmap/new. These counts use raw production pageviews without the web report's configured test-account filter, so they should not be mixed into conversion ratios with the filtered web totals.

Live HTML checks found:
- Homepage, roadmap preview, debugging landing page, Labs catalog, Palantir Ontology lab, and a system-design lesson all returned HTTP 200, one H1, a matching canonical, and index/follow metadata.
- The sitemap returned 200 and contained 528 URLs, including the public roadmap preview. This is a submitted-URL inventory, not an indexed-page count.
- The apex homepage resolved to the www host.
- The homepage links to /roadmap/new. The Labs catalog and debugging landing page had no roadmap link in the HTML inspected. The Ontology detail page links to /roadmap/preview.
- Live robots.txt includes Cloudflare-injected policy text in addition to application rules. Source inspection alone does not describe the complete deployed file.

No site-wide technical indexing failure was established by this sample. It was not a full crawl, Core Web Vitals study, or URL Inspection audit.

Search Console access failed with payment_required because the GSC Wizard subscription/trial has expired. Latest impressions, CTR, rankings, cannibalization, decay, and Google indexing coverage remain unverified. Restore that connector before choosing a large keyword/content expansion.

Sources: [PostHog channel report](https://us.posthog.com/project/563097/insights/new#q=%7B%22kind%22%3A%22InsightVizNode%22%2C%22source%22%3A%7B%22breakdownBy%22%3A%22InitialChannelType%22%2C%22dateRange%22%3A%7B%22date_from%22%3A%222026-10-09%22%2C%22date_to%22%3A%222026-11-05%22%7D%2C%22doPathCleaning%22%3Afalse%2C%22filterTestAccounts%22%3Atrue%2C%22includeAvgTimeOnPage%22%3Afalse%2C%22includeBounceRate%22%3Atrue%2C%22includeHost%22%3Afalse%2C%22kind%22%3A%22WebStatsTableQuery%22%2C%22limit%22%3A15%2C%22properties%22%3A%5B%7B%22key%22%3A%22%24host%22%2C%22operator%22%3A%22exact%22%2C%22type%22%3A%22event%22%2C%22value%22%3A%22www.codesparring.dev%22%7D%5D%7D%7D), [organic landing report](https://us.posthog.com/project/563097/insights/new#q=%7B%22kind%22%3A%22InsightVizNode%22%2C%22source%22%3A%7B%22breakdownBy%22%3A%22InitialPage%22%2C%22dateRange%22%3A%7B%22date_from%22%3A%222026-10-09%22%2C%22date_to%22%3A%222026-11-05%22%7D%2C%22doPathCleaning%22%3Afalse%2C%22filterTestAccounts%22%3Atrue%2C%22includeAvgTimeOnPage%22%3Afalse%2C%22includeBounceRate%22%3Atrue%2C%22includeHost%22%3Afalse%2C%22kind%22%3A%22WebStatsTableQuery%22%2C%22limit%22%3A15%2C%22properties%22%3A%5B%7B%22key%22%3A%22%24host%22%2C%22operator%22%3A%22exact%22%2C%22type%22%3A%22event%22%2C%22value%22%3A%22www.codesparring.dev%22%7D%2C%7B%22key%22%3A%22%24channel_type%22%2C%22operator%22%3A%22exact%22%2C%22type%22%3A%22session%22%2C%22value%22%3A%22Organic%20Search%22%7D%5D%7D%7D), [live homepage](https://www.codesparring.dev/), [roadmap preview](https://www.codesparring.dev/roadmap/preview), [live sitemap](https://www.codesparring.dev/sitemap.xml).

## 2. Repeat practice: a real drop-off, with a major anonymous-measurement limit

Authoritative application-record cohort: accounts created October 9–29, observed through November 5. Each account has had at least seven days since signup by the observation boundary.

| Observed account outcome | Accounts | Share of 19 signup accounts |
| --- | ---: | ---: |
| Signed up | 19 | 100.0% |
| Has an interview session created in the observation window | 13 | 68.4% |
| Has completed_at and final feedback_status = complete | 9 | 47.4% |
| Practiced on more than one UTC date | 2 | 10.5% |
| Created a roadmap | 0 | 0.0% |

The same two repeat-practice accounts also had a session at least 24 hours after their first recorded session.

The repeat row is an observed multi-day practice measure. It is not exact Day-7 retention, and it does not capture reading lessons or using a plan outside the product. A late first practice can also leave less follow-up time than the signup age suggests.

Five of the 13 accounts had session creation only before signup, consistent with a guest-to-account path or migrated session timestamps. This is why an ordered signup → session_start browser funnel is not the same definition as having any account-owned practice. The PostHog ordered seven-day funnel returned 22 signups → eight subsequent starts → three completions → three feedback views for the larger October 9–November 5 window. Do not combine that result with the 19-account application-record cohort.

Anonymous identity is an additional limitation. Raw production pageviews in the 28-day window:

| Identity mode | Pageviews | Observed identities |
| --- | ---: | ---: |
| Cookieless | 1,846 | 1,531 |
| Other capture mode | 801 | 46 |

PostHog documents that cookieless hashes include the calendar day. Most anonymous identities therefore cannot support cross-day retention measurement. Their absence tomorrow is not evidence that the person did not return. This does not justify removing consent controls; use stable account-owned activity for the product return loop.

All 19 older-cohort accounts have a welcome-email notification record. Their observed-window records also include 10 activation nudges, nine 24-hour inactivity reminders, nine 48-hour inactivity reminders, and five spaced-repetition messages. These are logged sends/notification records, not proof of inbox delivery, opens, or causal lift.

Interpretation: first-use activity is present, but repeat practice is scarce in the observed account cohort. More generic reminders are an unproven remedy. The handoff from one useful result to a concrete next task deserves priority.

Sources: projected read-only Firestore audit; [PostHog cookieless documentation](https://posthog.com/docs/data/ingestion-warnings#discarded-cookieless-event-because-cookieless-tracking-is-disabled); lib/posthog-consent.ts and instrumentation-client.ts.

## 3. The roadmap purchase: interest followed by an early refund

Verified historical sequence for the one positive-value live Stripe customer:

| September 1 event | UTC time |
| --- | --- |
| Account created | 06:27:58 |
| $25 charge succeeded | 06:31:10 |
| Google roadmap saved | 06:32:41 |
| Refund recorded in application ledger | 11:27:06 |
| Subscription canceled in Stripe | 11:27:07 |

Stripe confirmed one successful $25 charge with $25 refunded. The configured account has $0 remaining from charges after refunds, before fees. The ledger has both a checkout success record and an invoice success record for this payment; they are not two customer purchases. Five other succeeded ledger rows have amount zero and are not paid conversions.

The roadmap contains 171 questions. Its stored updatedAt equals createdAt, zero questions are marked complete, and there are no account-owned interview-session records for this buyer. These observations support a roadmap-oriented purchase hypothesis. They do not identify the refund reason or prove that roadmap size caused abandonment.

The buyer has 59 daily_roadmap notification records through November 6, despite no recorded plan completion. Their current preference still enables roadmap reminders, so this is not evidence of unauthorized sending. It is evidence that reminder volume alone has not produced recorded practice for this account.

Historical attribution is insufficient to claim a marketing source: Stripe checkout source metadata is absent, and the server purchase event uses direct as a fallback. No source proves that SEO or a roadmap CTA caused the purchase. No new charge occurred during the 28-day PostHog window, so the absence of purchase events there is not itself a current tracking failure.

PM conclusion: preserve the roadmap insight as a research lead. One fully refunded purchase is too little evidence for pricing or positioning certainty. A short plan-preview usability study and a small next cohort are more useful than declaring product-market fit.

Sources: live Stripe charges, checkout, and subscription APIs; projected payment_history, profiles, user_roadmaps, interview_sessions, analytics_events, and buyer-scoped email_notifications reads. No customer contact was made.

## 4. Current roadmap and return-loop friction

Observed roadmap_flow events, October 9–November 5:
- Nine view events from nine identities, first observed October 22.
- Two assessment_completed events from one identity.
- No observed generation_requested or generation_succeeded events.
- View events were marked anonymous/cookieless. The assessment-completed events were also marked not identified.

Application code in app/roadmap/new/page.tsx saves the assessment and asks for authentication when no user is available; generation starts only after authentication. These observations make the assessment-to-sign-in transition a specific usability hypothesis. They do not establish an OAuth failure. Existing resume code already attempts to preserve progress.

The FIRST_ROADMAP_FREE default is already true in the inspected repository. Its deployed effective flag and end-to-end entitlement behavior were not verified. Avoid proposing a new free-roadmap mechanism before checking the existing one.

Version-1 next-practice telemetry is extremely young in this project: October 28–November 5 returned three views, two clicks, two accepted starts, and two persisted-feedback completions, all from one observed user identity. Legacy events are excluded. This cannot establish retention lift, and the user may be an internal tester.

The interview-completion tool developed in this conversation is still local and unpushed. Its automated tests do not prove a production fix. The reported score-button confusion remains a release-verification item.

## 5. What I would prioritize as the PM

1. **Make one completed session feel complete.** Release and browser-verify the finish-interview → scoring transition through the normal deployment workflow. Confirm that the candidate sees a clear result and an explicit next practice action. Measure final feedback persisted, rather than a Submit click.
2. **Test the roadmap promise at the strongest existing entry points.** Add a clear target-company/date planning path to the Labs and debugging journeys. Show a small deterministic sample of today's preparation before asking for account creation or generating a full plan. Preserve the immediate practice path and existing server-owned free-roadmap entitlement.
3. **Make the first plan manageable.** Start with one task and a short upcoming sequence. Let a learner expand the longer plan. The 171-question unused roadmap is a reason to investigate perceived effort; it is not proof of the buyer's motivation.
4. **Close the result-to-return loop using existing features.** Save one next task with a direct return link; resume that task on the next visit. Audit reminder relevance and stale-plan repetition before increasing send frequency. Reuse the current saved-plan/next-practice flow.
5. **Evaluate with a small, honest cohort.** Track account-owned first feedback completion → second completed practice on another day, with a fixed seven-day follow-up window. Also track roadmap preview → assessment → authenticated resume → roadmap created → first task completed, plus paid charges net of refunds. At today's sample size, observe five end-to-end usability sessions and inspect counts; avoid claims of statistically significant A/B lift.
6. **Finish the search audit when access is restored.** Pull settled 28-day and 90-day GSC query-to-page data. Prioritize terms already bringing interview-intent visitors into Labs, debugging, and company-related pages. Evaluate new content by downstream completed practice and returns as well as clicks.

The smallest coherent promise to test is: “Tell us your interview target and date; know what to practice today.” The roadmap, practice round, feedback, and saved next task should feel like consecutive steps in that promise.

## Verification and boundaries

- Read-only API and public-page checks only; no customer messages, campaign sends, feature-flag changes, billing changes, or production code changes.
- Initial broad email collection read was capped at 1,000 documents and is not used for complete email totals. Buyer and signup-cohort email counts above came from subsequent exact owner-scoped reads.
- One raw-identifier diagnostic query was rejected by automatic approval review. Aggregate alternatives were sufficient; this report does not include that export.
- No full live browser walkthrough or session replay was reviewed. Motivation, confusion, and perceived effort remain hypotheses requiring direct observation.
- Evidence summaries and temporary diagnostics are outside the repository under /private/tmp; the report contains anonymized findings only.

Engineering judgment: this audit found substantial measurement work and an existing free-roadmap/resume/next-practice system. Reuse those paths and validate their delivery before adding another onboarding layer, reminder service, or roadmap generator.

