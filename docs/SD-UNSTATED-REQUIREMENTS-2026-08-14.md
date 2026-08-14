# The answer key grades what the prompt never asked

Second pass over the CUR-09 material, 2026-08-14. Sibling to `docs/SD-CLOSURE-AUDIT-2026-08-14.md`,
which owns the closure findings. This document owns a different defect class that the closure pass
did not look for, found while re-reading all 208 lessons and 416 exercises against their answer keys.

**44 exercises grade a requirement their prompt never states.** The learner reads the prompt, answers
exactly what it asks, reveals the model answer, and is told they missed a section.

## Why this is its own class

Closure asks "was the learner given the facts?" This asks "was the learner given the question?"

They fail independently. An exercise can be perfectly closed, with every term taught, and still be
unfair because the answer key silently widened the scope. Both produce the same experience, which is
a learner concluding they are worse at this than they are, and both were invisible to the metric the
retracted SD-W5 thesis used.

This is the same defect as a hidden test grading an unstated rule, which the Python curriculum had
and fixed. The rule that came out of that repair applies unchanged here:

> Hidden tests probe edges, they never spring traps. If a hidden test grades duplicate inputs, the
> README says duplicates occur.

The design-exercise equivalent: **if the model answer grades it, the prompt asks for it, or
`thinkAbout` names it.** `thinkAbout` is shown beside the editor, so a requirement surfaced there is
a fair one. A requirement that appears for the first time in the revealed answer is not.

## The one that is not a scope gap but a contradiction

`sd-l6-sync-vs-async`, apply, `lib/tutorials/system-design/curriculum/level6.ts:3523`.

The prompt tells the learner where inventory goes:

> decide which steps stay synchronous (payment auth) and which become async events (**inventory**,
> email, analytics)

The model answer reverses it and grades the opposite:

> Keep a synchronous inventory reservation too if oversell is unacceptable

A learner who does what the prompt instructs is marked wrong by the answer key, and the oversell
tolerance that justifies the reversal is never stated anywhere. This is the most serious item in
either document: every other finding here widens the question, this one contradicts it.

Fix by choosing one. Either the prompt stops assigning inventory to the async side, or the answer
stops grading a synchronous reservation.

## Distribution

| Levels | Exercises grading an unstated requirement |
| --- | ---: |
| 0 and 1 | 4 |
| 2 and 3 | 6 |
| 4 and 5 | 7 |
| 6 and 7 | 10 |
| 8 and 9 | 7 |
| 10 and 11 | 10 |
| **Total** | **44** |

The rate climbs with level, which is what you would expect: a case study's answer key reaches for
the whole curriculum, and the prompt stays one paragraph.

## The recurring shapes

### An invented constraint the answer then reasons from

The answer key introduces a number or a target the prompt never set, then grades the design against
it. `sd-l10-distributed-cache` says "read-heavy service" and the answer grades against an invented
sub-millisecond p99 target. `sd-l4-capacity-planning` asks for fleet sizing at 50k RPS and grades a
cost-and-autoscaling-bounds section built on reserved versus spot pricing. `sd-l7-availability-nines`
asks the learner to compute downtime, then grades them against three named dependencies at 99.95%
each that only the answer key knows about.

Stating an assumption is correct and is what the estimation lessons teach. Grading against an
assumption the learner could not have made is not.

### A compliance or safety requirement bolted on

`sd-l11-globally-consistent-multiregion` grades GDPR data residency, and residency materially changes
the partitioning answer. `sd-l6-compaction-retention` asks for retention and storage tiers, then
grades GDPR right-to-erasure via crypto-shredding. `sd-l10-payment-ledger` grades PCI scope
minimisation and a daily settlement reconciliation job. `sd-l4-global-gslb` asks for nearest-healthy
routing and grades geo rules for data residency.

These are all good content. They belong in the prompt.

### One more deliverable than the prompt lists

`sd-l0-core-entities-api` names exactly two endpoints, "create, redirect", then grades a third for
listing a user's links with cursor pagination. `sd-l2-choosing-db-polyglot` lists four workloads and
grades a fifth store. `sd-l1-http-semantics` asks for methods, status codes and ETag handling, then
grades content negotiation and `Vary`. `sd-l7-golden-signals` asks the learner to enumerate signals
and dashboards, then grades alerting policy and closes with a wrong-turn bullet about shipping
dashboards without alerts.

### Operational policy the prompt never scoped

`sd-l7-error-budgets` grades a carve-out list for what still ships during a freeze.
`sd-l9-containers-k8s` grades scheduled pre-scaling and a deploy-freeze calendar. `sd-l7-dr-rto-rpo`
grades a ransomware control and a quarterly game-day.

## Repair guidance

Cheapest fix first, and most of these are cheap:

1. **Move the requirement into the prompt.** One clause. The exercise keeps all its difficulty and
   becomes answerable. This is the right fix for the large majority.
2. **Or move it into `thinkAbout`**, which is visible beside the editor while the learner writes.
   Acceptable when the requirement is a prompt the learner should arrive at themselves, and the
   answer key rewards noticing it.
3. **Or drop the bullet.** Correct when the graded extra is genuinely another lesson's subject.

What not to do: do not delete the content wholesale. Several of these bullets are the most
interview-relevant material in their lesson, and a real interviewer does widen scope mid-question.
The defect is that the widening happens after the learner has committed an answer and cannot respond.
An exercise that wants to test scope discovery should ask for it in the prompt, which is also what
the AI-resistant genre work in CUR-10 is reaching for.

## Verification note

These 44 were found by the same six agents that re-ran the closure pass, reading each prompt against
its own `modelAnswerOutline`. They were asked for it as a separate deliverable precisely because the
first pass had not looked for it. Each finding below the summary level carries the prompt clause and
the answer clause side by side in the agent reports; anyone repairing a lesson should re-read the
pair rather than trust this summary, since the line between "widened the scope" and "the prompt
implied it" is a judgement call and this document errs toward flagging.
