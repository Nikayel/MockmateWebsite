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

Production's next-practice feature is separate from this instrumentation fix.
Its event calls exist on staging, but the feature must be released before those
events can appear from production usage. Cookieless anonymous IDs rotate daily;
cross-day return reporting should use identified users.
