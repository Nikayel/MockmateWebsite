# SEO-011: Verify the analytics posture for organic visitors

**Owner:** repo owner for policy; engineering for implementation verification.
**Blocking:** no, but conversion claims depend on a verified measurement path.

## Current boundary

Inspect `components/ConsentAnalytics.tsx`, `lib/analytics.ts`, and
`lib/posthog-consent.ts` before changing vendor initialization or tracking.
The old audit claim that Firebase initializes GA4 unconditionally is not a
current implementation contract.

Optional analytics must follow the existing consent policy. PostHog's pre-consent
cookieless mode is distinct from identified analytics; vendors do not necessarily
share initialization or storage behavior.

## Verify

- Test unknown, declined, granted, and withdrawn consent states.
- Confirm Firebase, Vercel analytics, Speed Insights, and PostHog follow their
  respective existing gates without premature identified tracking.
- Confirm organic landing/source capture survives signup before claiming a
  user-level acquisition funnel.
- Confirm the analytics property and its intended consumers work.
- Keep Search Console as independent acquisition measurement when consent or
  attribution coverage makes conversion data incomplete.

Use [the measurement guide](../docs/seo-measurement.md). A policy change requires
owner approval; this ticket does not authorize weakening consent.
