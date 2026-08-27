---
title: "Review the three overnight agent PRs before standup"
points: 3
labels:
  - "code-review"
  - "agent-prs"
ai_policy: review-only
objectives:
  - review-agent-pr-defensible-verdict
acceptanceCriteria:
  - "Each of PR #511, PR #512, and PR #513 receives its own verdict: approve, reject, or request changes."
  - "Every verdict is backed by a repro test that fails on that PR's branch and passes on main, not by the PR's own passing CI run."
  - "At least one of the three verdicts is not a simple approval, and the review states specifically why."
---

The agent burned down the whole backlog overnight. Three PRs are open, CI
is green on all three, and Priya wants them merged before standup so the
team can move on to something else. Reviewing three green agent PRs before
a 9am meeting is not really enough time to do this properly, but
rubber-stamping three PRs because CI is green is exactly the failure mode
this whole sprint exists to name.

PR #511 touches the outbox drain path. PR #512 touches how payout amount
and currency get written to the database. PR #513 adds a couple of new CI
checks. All three pass every existing test. That is not the same as all
three being correct, and at least one of them is not.

Give each of the three a real verdict: merge, reject, or request changes,
and back every verdict with something more specific than "looks fine" or
"tests pass."
