# Retention strategy: make the next practice obvious

## Scope and evidence

This is a code audit and an implementation/evaluation proposal. It is not a
claim about production behavior: this workspace does not provide access to
PostHog, GA4, Firestore analytics rows, email-provider logs, or cron execution
history. Existing code tells us what can happen; it does not tell us that a
user saw, clicked, or completed any of it.

Keep these distinctions explicit:

- **Capability** means a path exists in the code.
- **Activation** means a user reaches and uses that path after a session.
- **Retention** means the user returns for meaningful practice after a fully
  elapsed follow-up window. A login, dashboard load, or notification open is
  not meaningful practice.

The product problem is therefore a testable activation hypothesis, not a
conclusion that the scheduler or emails are broken.

## Verified product path

The existing interview flow already has the ingredients for a return loop:

1. `useInterviewMetrics.trackSessionCompletion` sends the completed session to
   `POST /api/session/metrics` and `updateSpacedRepetition` sends the result to
   `POST /api/spaced-repetition/complete` ([`app/interview/_hooks/useInterviewMetrics.ts`](../app/interview/_hooks/useInterviewMetrics.ts)).
2. The spaced-repetition endpoint updates the problem card and asynchronously
   calls `triggerSessionNotifications` ([`app/api/spaced-repetition/complete/route.ts`](../app/api/spaced-repetition/complete/route.ts)).
3. The dashboard requests due/upcoming review data and renders a “Due for
   Review / Next Review” card linking to `/practice` ([`app/dashboard/page.tsx`](../app/dashboard/page.tsx)).
4. `/practice` renders due items, streaks, mastery, calendar, and review links
   back to `/interview?scenario=...&practice=true` ([`app/practice/page.tsx`](../app/practice/page.tsx),
   [`components/practice/ReviewCard.tsx`](../components/practice/ReviewCard.tsx)).
5. Feedback renders score and detail first. Its recommendations are behind a
   collapsed “Learning Recommendations” section ([`components/PracticeFeedback.tsx`](../components/PracticeFeedback.tsx),
   [`components/practice/FeedbackSections.tsx`](../components/practice/FeedbackSections.tsx)).

This is the highest-leverage loop to activate because it reuses stored
feedback, mastery, and FSRS scheduling; it does not require another LLM call.

## Primary hypothesis

After a first completed interview, the user does not receive a sufficiently
visible, specific next action. The current feedback surface can end at a
report, with recommendations collapsed; the dashboard card exposes only a
count/date and routes all tiers to `/practice`.

That makes the intended loop harder to discover even though the backend can
schedule a review. The treatment should make one recommendation concrete:

> “Your next practice: review **[problem/pattern]** on **[date]**”

with one CTA to start the selected scenario. It should be derived from existing
feedback/FSRS data and preserve the current report, roadmap, and notification
flows.

The product promise is: **“Close the one gap your last interview exposed.”** For
example, a debugging session shows that the learner edited before reproducing
the failure. Their next practice should name that skill, open one eligible
incident, and ask them to reproduce it before editing. The return visit then
shows concrete evidence of improvement from existing tests and debugging events.
Avoid promising a higher overall AI score: scenario difficulty and model scoring
can change independently of the user's skill.

For scheduled reviews, show the date the existing scheduler actually returns.
Offer an optional reminder using current preferences. After the review, recommend
a different eligible problem that exercises the same weakness so the user can
test transfer rather than memorize a solution. Build that transfer step only
after the first recommendation reliably produces completed practice.

Interview preparation is often temporary. A learner who reaches their interview
date and stops may have succeeded. Separate active-preparation users from those
whose stated target date has passed when interpreting return rates; do not
optimize indiscriminately for daily visits.

### Free-tier entitlement is a decision, not an assumption

`/practice` currently checks subscription entitlement and presents an upgrade
wall for non-Pro users ([`app/practice/page.tsx`](../app/practice/page.tsx));
the dashboard review card is not visibly tier-aware. This is verified code
behavior, not evidence that free users are actually clicking it or being lost.

Before choosing the treatment’s CTA for free users, instrument the split:

- If review is intended to remain Pro-only, render a truthful, tier-aware
  dashboard state and measure upgrade intent separately from return practice.
- If retention is the priority and the product permits it, route free users to
  an eligible ordinary practice/recommendation action while keeping FSRS
  review scheduling Pro-only.
- If the intended entitlement is unclear, do not silently broaden access. Run
  the same next-action treatment with tier-specific outcomes and let observed
  upgrade/return behavior inform the product decision.

## Small rollout

Use one sequential change; do not run a multi-cell A/B test with insufficient
traffic and do not rely on interviews with existing users.

### Phase 0: instrument before changing copy

Add a single, typed product-event vocabulary through the existing client/server
analytics chokepoints (`lib/analytics.ts` and `lib/analytics-server.ts`). At
minimum record:

- `feedback_viewed`: `session_id`, `scenario_id`, `tier`, `surface`,
  `acquisition_surface`, `course_or_track`;
- `next_practice_impression`: same identifiers plus `recommendation_source`;
- `next_practice_click`: plus `destination` and `entitlement_result`;
- `review_started` and `review_completed`: `session_id`, `scenario_id`,
  `source`, `tier`;
- `notification_impression`, `notification_open`, and `notification_click` if
  the notification surface is included in the rollout.

Choose data sources explicitly: browser `trackEvent` sends events to PostHog/GA4,
not to Firestore. Only `trackEventServer` writes `analytics_events`. Use PostHog
for the observed impression/click funnel. Use authenticated, server-persisted
session completion records and timestamps for the eligible return cohorts; do not
assume new client events will automatically appear in the admin/Firestore dataset.
If durable client-event ingestion becomes necessary, that is a separate validated,
authenticated endpoint, not an implicit side effect of browser tracking.

Do not infer notification delivery from the presence of cron code: the cron route
exists, but this audit did not verify that it is scheduled, running, or successfully
delivering.

Preserve existing consent gates and identity conventions. Use bounded properties
and identifiers, never raw chat, submitted code, feedback text, or email addresses
as event properties. Record each impression once per session/surface; component
rerenders must not inflate the funnel. Respect the PostHog identity/consent behavior
in `instrumentation-client.ts` and `lib/posthog-consent.ts`, separately from GA4's
consent gate. Segment by observable consent/identity state where permitted.
Client counts describe their observable cohort and must not be silently combined
with all server completions; missing client events are not proof of abandonment.

### Phase 1: ship the single next-action treatment

At the first stable feedback render, show one prominent card after the score:

- use the already-persisted structured `fixNext`/action-plan signal and the
  existing recommendation/scheduler result;
- show one scenario, estimated time, and review timing when available;
- link to the existing interview scenario route;
- keep “Learning Recommendations” as a secondary detail surface;
- never make a second AI request just to write the card;
- record impression/click and whether the user completed the destination.

The treatment belongs at the feedback boundary represented by
`InterviewFeedbackView`/`PracticeFeedback`; recommendation selection should
remain in existing recommendation/FSRS services rather than being duplicated in
the page component.

### Phase 2: evaluate sequentially

Use a predeclared observation window and raw counts. Report results by:

- acquisition surface (for example content, community, paid, or direct);
- course/track (DSA, debugging, system design, and relevant Learn surfaces);
- tier/entitlement outcome;
- first-session versus repeat-session entry.

For D7, the eligible denominator is only users whose full seven-day follow-up
has elapsed by the measurement cutoff. The primary retention metric is:

`7-day meaningful-practice return = users with a new completed practice session
between 24 hours and 7 days after the index completion / eligible users who
completed the index session`.

Call this a windowed 7-day return metric, not exact-day D7 retention. Report
exact-day D1 separately as a completion between 24 and 48 hours after the index
completion, and exact-day D7 separately as a completion between 168 and 192
hours. Only include users with a fully elapsed window in each denominator.

Use the same definition for a baseline period and the post-treatment period.
Also report the nearer activation funnel:

`feedback_viewed → next_practice_impression → next_practice_click →
meaningful practice completion`.

“Meaningful practice” must be a completed interview/review with the existing
completion event, not a login, page view, dashboard visit, notification open,
or an abandoned interview. Include D1 and D7 raw numerator/denominator, median
time to return, and upgrade-wall exposure. Do not claim statistical
significance or causal lift with a small sequential sample; label findings
directional and stop/continue based on a pre-set minimum cohort and practical
effect threshold.

A workable first checkpoint is 20 eligible first completers before and 20 after
the change, or four weeks per collection period plus the full follow-up window,
whichever collection limit comes first. If either cohort stays below 20, report
the raw counts as insufficient evidence. As an exploratory product threshold,
look for at least two more 7-day returners per 20 first completers without worse
click-to-completion or feedback reliability. This is a decision aid, not a power
calculation or statistical proof; acquisition changes can explain the difference.

## Alternate hypotheses and disconfirming evidence

1. **Feedback reliability/latency is the primary loss.** The dirty feedback
   pipeline currently has active changes around queued/failed feedback and
   retry paths (`app/api/feedback/persist/route.ts`,
   `app/api/feedback/retry/route.ts`, and the streaming hook). If a large share
   of index sessions never reaches `feedback_viewed` or remains queued/failed,
   a next-action card cannot be the first fix. Disprove the hypothesis by
   measuring high feedback completion and low queued/failed exposure among
   non-returners.
2. **Acquisition/course mismatch is primary.** A user acquired for a one-off
   sample or a course lesson may not intend an interview return. Disprove by
   showing comparable D7 meaningful-practice rates across acquisition surfaces
   and tracks after full follow-up.
3. **The next action is visible, but the destination is blocked by entitlement.**
   Disprove by showing low free-tier exposure to the `/practice` upgrade wall
   and comparable free/pro click-to-completion rates.
4. **Notifications are not reaching or not prompting users.** Existing code has
   in-app and email paths (`components/notification-bell.tsx`,
   `app/api/cron/email-notifications/route.ts`,
   `lib/services/session-notifications.ts`), but code presence proves neither
   scheduling nor delivery. Disprove by reconciling send/open/click logs with
   meaningful-practice returns; do not call the cron healthy without execution
   evidence.
5. **The product needs a different learning cadence, not better CTA copy.**
   High CTA completion followed by low subsequent return supports this
   hypothesis: users find the action but do not keep getting value from it.
   Repeated meaningful returns after improving placement alone would weaken
   it. Inspect recommendation quality/cadence when users take one review and stop.

## Decision rules

- If `feedback_viewed → next_practice_click` is low, improve prominence and
  specificity before changing notifications.
- If clicks are healthy but completion is low, fix destination/entitlement or
  reliability before adding reminders.
- If completion is healthy but D7 return is low, inspect cohort/track and
  recommendation cadence; do not keep polishing the same CTA.
- If no surface reaches the minimum cohort, keep the treatment and accumulate
  directional evidence rather than manufacturing an A/B conclusion.

This strategy intentionally makes one existing return loop observable and
actionable first. It does not add AI cost, assume free access, claim that cron
jobs run, or substitute login/notification activity for retained practice.
