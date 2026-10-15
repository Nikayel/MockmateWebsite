# Product journey tracking

Browser product events flow through `lib/analytics.ts` to PostHog and, after
analytics consent, GA4. PostHog remains cookieless before consent; replay stays
disabled on code/chat/report routes. No consent or replay policy changed in this fix.

## Acquisition

`lib/attribution.ts` saves the first landing before React hydration. Explicit
UTM tags, `src`, and `ref` take precedence. Untagged search landings infer
`organic` from Google, Bing, DuckDuckGo, Yahoo Search, or Brave Search referrers;
other external referrers use `referral`, and absent/internal referrers use `direct`.
An absent referrer cannot prove that traffic was organic.

Named browser events include `acquisition_source`, `acquisition_medium`,
`acquisition_landing_page`, and, for external landings, `acquisition_referrer`.
Referrers contain only the origin, never the query or path. Existing `utm_*`
event fields remain compatible with the attribution helper's historical mapping.
Existing stored first touches are preserved; missing historical attribution is
not backfilled. Storage failures remain best effort.

## Feedback

`feedback_viewed` fires when the written report mounts with a session ID. Its
properties are `session_id`, `feedback_surface` (`interview` or `saved_session`),
`scenario_type` when known, and `language`. Rerenders do not add views; reopening
the report does. This is a rendered-report signal, not proof every section was read.
Code, transcript, and written feedback contents are not included.

## Tour event loss

The tour previously reported a step view on every scroll/resize, and its scroll
listener called smooth scrolling again. Live ingestion warnings showed the SDK's
10-events/second, 100-event burst bucket dropping events while tour views flooded
the bucket. Geometry updates now reposition the highlight; each step entry
reports one view and scrolls once. The SDK rate limit stays enabled.

## Release scope

Saved next practice has its own measurement contract in `RECOMMENDATION-ENGINE.md`.
Cookieless anonymous IDs rotate daily; cross-day return reporting should use
identified users. Event capture is not proof of a durable save or completed payment.

## Roadmap and paid conversion

The roadmap release tracks `roadmap_flow` with bounded `step` values: `view`,
`assessment_completed`, `generation_requested`, `generation_succeeded`,
`generation_failed`, `paywall_viewed`, and `upgrade_clicked`. `generation_requested`
means an API attempt, not proof an LLM call occurred. Paywall events include
`gate_reason: pro_required | free_roadmap_used`; auth, rate-limit, inactive-subscription,
and in-progress errors must not become sales prompts.

No assessment answers, interview dates, code, or API error messages are sent in
these events. Existing PostHog/GA4 consent behavior is unchanged.

`upgrade_flow` and browser `purchase` events carry the allowlisted `source`:
`roadmap`, `practice-plan`, or `direct`. Other query values become `direct`.
The same coarse source is stored as Stripe Checkout metadata `upgradeSource`.
It is attribution, not an authorization signal or proof of causal purchase intent.

Source and chosen billing period survive sign-in and checkout cancellation. A
server-verified Pro sync returns a roadmap buyer to `/roadmap/new`, where the
existing single-shot assessment resume runs. Only an intentional upgrade click
re-saves a consumed assessment, so passive visits cannot create a gate/retry loop.

Use Stripe's reconciled payment records for actual purchases, discounts, refunds,
and revenue. Browser capture can be blocked, replayed, or missed when a buyer does
not return; its configured list-price value is not a financial ledger. Historical
events without source cannot establish which feature caused an upgrade.
