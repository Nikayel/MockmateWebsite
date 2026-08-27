---
title: "Review PR #478: blue/green deploy + rollback (agent-authored, CI green)"
points: 5
labels:
  - "aws"
  - "deployment"
  - "code-review"
ai_policy: review-only
objectives:
  - blue-green-rollback-review
acceptanceCriteria:
  - "The reviewer's verdict states explicitly what a rollback under this PR would do to a service that had already applied a schema-incompatible migration."
  - "Approval, rejection, or requested changes is backed by a specific mechanism in the diff, not by the PR's own description of itself."
  - "If changes are requested, the review names the exact scenario that breaks and what would have to be true for rollback to be safe."
---

An agent picked up the ticket to move us onto a blue/green release with an
actual rollback, and the PR is sitting there green: CI passed, the diff
looks clean, and it deletes both of the hand-written deploy files security
already flagged as stale. Priya wants a second pair of eyes before it
merges, since the team has been burned by a green agent PR before.

The description on PR #478 claims rollback restores the previous version in
under a minute, and the diff does stand up a second target group and a
deployment config that shifts traffic between them. What it does not appear
to do anywhere is say what happens to the database when a rollback fires
after a migration has already run against the new schema. The old container
image would come back up and start talking to a schema it doesn't
recognize.

Sign off on this only if that gap is actually closed, not just
plausible-sounding in the PR description.
