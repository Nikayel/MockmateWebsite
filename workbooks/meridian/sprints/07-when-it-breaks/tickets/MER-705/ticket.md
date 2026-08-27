---
title: "Sign off the incident review before Friday"
points: 3
labels:
  - "observability"
  - "postmortem"
  - "code-review"
ai_policy: review-only
objectives:
  - review-postmortem-systemic-causes
acceptanceCriteria:
  - "The root cause section names a system, not a person, and matches the actual mechanism identified during triage."
  - "Every action item is attached to a named owner and either a test or a concrete artifact that did not exist before the incident."
  - "The reviewer's sign-off states explicitly what was changed from the draft and why."
---

An agent drafted the postmortem for yesterday's 14:05 incident and it needs
a sign-off before Friday's review meeting. The draft is competent on the
timeline: it correctly lists when the regression started, when it was
noticed, and when it was mitigated. Where it falls down is the root cause
section, which names the on-call engineer who happened to be paged as the
cause, and the only action item is "add more monitoring," attached to no
owner and no deadline.

This is exactly the kind of postmortem that reads fine in the moment and
produces nothing that prevents a repeat. A person got paged; that is not
what caused the regression. And an action item with no owner and no test
attached to it is a wish, not a fix.

Rewrite what needs rewriting before this ships to the wider team.
