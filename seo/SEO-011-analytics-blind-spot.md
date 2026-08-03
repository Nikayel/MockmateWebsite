# SEO-011: Decide the analytics posture for organic visitors

**Phase:** 5, optional but decide it deliberately
**Owner:** repo owner (policy call, then a small code change)
**Blocking:** no
**Effort:** the decision is the work

## Why

Right now you are paying the compliance cost of a consent banner without getting the data, for
exactly the audience this project is about.

The situation, as found during the SEO audit:

- Analytics consent defaults to **false**. `trackEvent` early returns until a visitor opts in.
- A visitor arriving from Google who ignores the cookie banner, which is most of them, therefore
  records **nothing** in the primary web analytics view.
- Meanwhile Firebase Analytics initializes at module scope and collects GA4 pageviews regardless of
  that banner, which is the inverse problem.

So the measurement story for organic traffic is: the tool you would look at is blind, and the tool
that is collecting is the one you did not consent gate. Both halves are worth fixing, and the first
one directly undercuts [SEO-003](SEO-003-search-console-baseline.md), because Search Console will
tell you people arrived and nothing will tell you what they did next.

## The decision

Pick one, explicitly:

**A. Mount cookieless analytics unconditionally.** Vercel Web Analytics and Speed Insights are
cookieless and do not set identifiers. Under most readings of GDPR and ePrivacy, cookieless
aggregate measurement does not require prior consent. This is the common posture and it makes the
funnel visible. It is a policy call and you should make it on purpose, not by accident.

**B. Keep everything consent gated and accept the blind spot.** Defensible, especially in a
university context where you may be held to a stricter standard than a commercial product. If you
choose this, then Search Console becomes your only organic measurement and the 30/60/90 criteria in
`docs/learn-seo/LAUNCH-BASELINE.md` should be rewritten to depend only on impressions, clicks and
position.

Either way, **fix the inconsistency**: Firebase Analytics collecting GA4 pageviews before consent
while Vercel Analytics waits for it is not a defensible middle ground, it is just an accident.

## Also worth knowing

Even with option A, attribution for a search visitor who later signs up needs the landing page
recorded at signup. Confirm whether the attribution capture currently records an organic landing on
a Learn page, or only records paid and referral sources. Without it you can see traffic and see
signups but cannot connect them, which is the specific number this whole project exists to move.

## Done when

The choice is made, written down here, and the Firebase versus Vercel inconsistency is resolved in
whichever direction you chose.

## Related to the pitch

If the Michigan pitch leans on a traffic and conversion story, this is the ticket that makes that
story provable rather than anecdotal. Worth doing before the corpus has been public for months,
because like [SEO-003](SEO-003-search-console-baseline.md), the early data cannot be recovered later.
