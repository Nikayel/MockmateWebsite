/**
 * System Design — Level 7: Reliability, Resilience & Operations.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l7-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L7. 17 lessons across 5
 * modules (sd-l7-m1..m5). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const availabilityNinesTeach = `
## Availability, in minutes you can feel

Availability is the fraction of time (or of valid requests) a service is up and serving correctly. People quote it in "nines," and the single most useful senior habit is to translate nines into minutes of allowed downtime per month, because that is what an on-call rotation actually feels.

The math: allowed downtime = (1 - availability) x window. For a 30-day month (43,200 minutes):

\`\`\`
Nines     Availability   Downtime / month   Downtime / year
two        99%            ~7.2 hours          ~3.65 days
three      99.9%          ~43.2 minutes       ~8.76 hours
four       99.99%         ~4.3 minutes        ~52.6 minutes
five       99.999%        ~26 seconds         ~5.26 minutes
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "nines-cost-per-nine",
  "prompt": "A team runs at 99.9 percent today and wants 99.99 percent. Their recovery works like this: an alert pages the on-call engineer, who opens a laptop, finds the bad node, and restarts it. What is the main problem with that plan?",
  "options": [
    {
      "label": "Nothing much, since four nines is only one step up from three",
      "feedback": "The labels sit next to each other, but the budgets do not. Going from 99.9 to 99.99 percent cuts allowed downtime from about 43 minutes a month to about 4.3 minutes."
    },
    {
      "label": "Human response time alone spends most of a 4.3 minute monthly budget, so recovery has to become automatic",
      "correct": true,
      "feedback": "Right. Paging, waking up, and diagnosing already exceed the budget, which is why each added nine costs roughly 10x more: it forces you to take humans and manual steps out of the recovery path."
    },
    {
      "label": "Four nines is unreachable without at least five geographic regions",
      "feedback": "This over-corrects. Multi-AZ redundancy and automated failover measured in seconds usually get you to four nines, and region count is not the lever."
    },
    {
      "label": "They should measure availability more generously so the number looks better",
      "feedback": "Redefining what counts as good and valid to flatter yourself is the opposite of the discipline. Measured, SLA, and SLO stay three separate honest numbers."
    }
  ]
}
\`\`\`

Notice the leap between each row. Going from 99.9% to 99.99% shrinks your monthly downtime budget from 43.2 minutes to 4.3 minutes. That is not "a bit better," it is a 10x reduction in the failure you are allowed, and every added nine costs roughly 10x more to achieve. The reason: the cheap failures (a bad deploy, a full disk) are gone by three nines, so the next nine forces you to attack rare, expensive causes: multi-AZ redundancy, automated failover measured in seconds, eliminating every manual step from recovery, and testing failure paths constantly. Human response time alone (someone gets paged, opens a laptop, diagnoses) blows a five-nines budget, so five nines effectively means no human in the recovery loop.

## Dependencies combine

**Serial dependencies multiply.** If your checkout calls auth, inventory, and payments in series and each is 99.9% available, your ceiling is 0.999^3 = 99.7%, worse than any single component. More hops means a lower ceiling. You cannot be more available than the product of everything you synchronously depend on.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Serial chain availability",
  "predictPrompt": {
    "question": "Your checkout calls 3 dependencies in series, each 99.9% available. How much monthly downtime does the chain allow compared to the ~43 minutes a single 99.9% component gets?",
    "options": [
      "Still about 43 minutes",
      "About double",
      "About triple, over 2 hours",
      "More than a full day"
    ]
  },
  "workedExample": "At the initial values, 3 serial components at 99.9% each give a chain availability of about 99.7%, which allows roughly 129 minutes of downtime in a 30-day month instead of the 43.2 minutes one component gets on its own. Slide the component count up to 10 hops to watch the ceiling sink, then push per-component availability to 99.99% and see the chain recover.",
  "inputs": [
    {
      "kind": "slider",
      "id": "a",
      "label": "Per-component availability",
      "min": 0.99,
      "max": 0.99999,
      "scale": "linear",
      "step": 1e-05,
      "initial": 0.999
    },
    {
      "kind": "slider",
      "id": "n",
      "label": "Serial components",
      "min": 1,
      "max": 20,
      "scale": "linear",
      "step": 1,
      "initial": 3
    }
  ],
  "outputs": [
    {
      "id": "chain_availability",
      "label": "Chain availability",
      "expr": "a ^ n",
      "format": "percent",
      "sparkline": {
        "over": "n"
      }
    },
    {
      "id": "budget_minutes",
      "label": "Monthly error budget",
      "expr": "(1 - (a ^ n)) * 43200",
      "format": "number",
      "unit": "min"
    }
  ],
  "caption": "Serial dependencies multiply: the chain can never be more available than the product of its hops."
}
\`\`\`

**Redundancy adds availability.** Two independent replicas of a 99% component, where either can serve, fail only when both fail: 1 - (1 - 0.99)^2 = 99.99%. Parallel combines as 1 - (1 - a)^n. This is why the fix for a shaky dependency is often a second independent copy, not a more reliable single copy.

## Interview nuance: three different numbers

Interviewers probe whether you distinguish three different numbers. **Measured** availability is what your telemetry actually observed last month. The **SLA** is the external contractual promise with financial penalties (service credits) if you miss it. The **SLO** is your stricter internal target, deliberately tighter than the SLA so you get warning before you breach the contract. A team runs to a 99.95% SLO to safely honor a 99.9% SLA.

Common wrong turn: chasing five nines everywhere. If your database ceiling is 99.9% and a feature earns 20 dollars a minute of downtime saved, spending a quarter's engineering to add a nine it can never reach is malpractice. Match the target to revenue impact and to the dependency ceiling.

**Recap:** convert nines to downtime minutes, remember serial dependencies multiply (lowering the ceiling) while redundancy combines as 1 - (1-a)^n, each nine costs about 10x more, and keep measured, SLA, and SLO as three separate numbers.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "nines-dependency-ceiling",
  "prompt": "Checkout depends synchronously on a database with a hard 99.9 percent ceiling. Product wants to sell a 99.99 percent SLA on checkout. What is the senior answer?",
  "options": [
    {
      "label": "Promise the 99.99 percent SLA and push the team to hit it",
      "feedback": "You cannot be more available than the product of everything you synchronously depend on. Signing this promise signs you up for service credits you can never avoid paying."
    },
    {
      "label": "Add an independent second copy of the dependency first",
      "correct": true,
      "feedback": "Right. Redundancy combines as 1 minus (1 minus a) to the power n, so a second independent copy of a 99.9 percent dependency lifts that hop to about 99.9999 percent and moves the ceiling off it. Taking the dependency off the synchronous path does the same job another way. Only then is there a number worth promising, and the external SLA still sits looser than the internal SLO so your own alerting fires before you owe anyone money."
    },
    {
      "label": "Set the internal SLO at 99.99 percent and the SLA at 99.999 percent",
      "feedback": "Backwards. The SLA carries the financial penalties, so it is the looser number, and the SLO is the stricter internal target that warns you first."
    },
    {
      "label": "Nothing to do: measured availability last month was 99.995 percent, so quote that",
      "feedback": "Measured is one window of luck against a ceiling that has not moved. Measured, SLA, and SLO are three different numbers, and only one of them is a promise."
    }
  ],
  "reveal": "Nines are minutes: 99.9 percent buys about 43 minutes a month and 99.99 percent about 4.3. Serial dependencies multiply that ceiling down, redundancy combines it back up as 1 minus (1 minus a) to the power n, each added nine costs roughly 10x more than the last, and the number you promise externally always sits looser than the one you run to internally."
}
\`\`\`
`.trim()

const sliSloSlaTeach = `
## Turning "reliable enough" into a number

"Reliable enough" is not a target you can enforce. The SLI/SLO/SLA hierarchy is how you turn it into a number a dashboard computes and a policy acts on.

An **SLI** (Service Level Indicator) is a measured ratio: good events divided by valid events, expressed as a percentage. Availability SLI = (successful requests) / (valid requests). Latency SLI = (requests served faster than 300 ms) / (valid requests). The discipline is defining "good" and "valid" precisely. Good might mean HTTP status not in 5xx and served under a threshold. Valid deliberately excludes noise you should not be graded on: health-check pings, requests from a client that sent a malformed body (a 400 is the client's fault, not an outage), traffic during an announced maintenance window.

An **SLO** (Service Level Objective) is an SLI plus a target plus a window: "99.9% of valid requests succeed, measured over a rolling 28 days." The window matters. A rolling 28-day window smooths out one bad afternoon; a calendar-month window resets your budget on the 1st. Rolling windows are usually preferred because they do not give you a "free" reset that hides a chronic problem.

An **SLA** (Service Level Agreement) is the external, contractual version with teeth: financial penalties (service credits) if you miss it. You always set the internal SLO stricter than the SLA, so your own alerting fires before you owe customers money.

## Where you measure changes the number

The same request looks different at three points. At the **load balancer** you capture what most users experience but miss failures that never reached the LB (DNS, a dead region). At the **server** you get clean internal numbers but hide network loss and the LB's own errors, flattering yourself. At the **client** (real-user monitoring) you capture the true end-to-end experience including the last mile, but the data is noisy and attributes the user's flaky wifi to you. Good practice: measure availability at the load balancer (the boundary you own and control) and latency with client RUM plus server-side, and state your measurement point when you quote a number.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "latency-mean-hides-tail",
  "prompt": "A service reports a mean latency of about 100 ms against a 300 ms latency objective, and the dashboard is green. In the same window, 1 request in 100 takes 5 seconds. What does that mean tell you about those users?",
  "options": [
    {
      "label": "They are fine, since the average sits comfortably inside the 300 ms objective",
      "feedback": "This is exactly how a green dashboard hides an angry tail. Ninety-nine requests at 50 ms and one at 5 seconds average to about 100 ms while one user in a hundred waits 5 seconds."
    },
    {
      "label": "Nothing useful, because the mean averages them away",
      "correct": true,
      "feedback": "Right. Ninety-nine requests at 50 ms and one at 5 seconds average to about 100 ms, so a green dashboard and an angry tail are the same number here. One user in a hundred sits far outside the 300 ms objective and the mean has no way to show it. That is why latency objectives are set on p95, p99, or p99.9: a percentile reports the tail instead of dissolving it."
    },
    {
      "label": "The objective is too loose and should be tightened to 100 ms",
      "feedback": "Tightening a target you still measure with a mean surfaces nothing new, and users do not notice 200 ms versus 250 ms. The statistic is the problem here, not the threshold."
    },
    {
      "label": "The 5 second requests should be excluded as invalid events",
      "feedback": "Valid excludes noise you should not be graded on, such as health-check pings and malformed client requests. A slow but legitimate user request is precisely what the indicator must count."
    }
  ]
}
\`\`\`

## Use percentiles, not averages, for latency

An average hides the tail. If 99 requests take 50 ms and one takes 5 seconds, the mean is ~100 ms, which looks fine while one user in a hundred is furious. p99 = 5 s tells the truth. SLOs are set on p95/p99/p99.9 depending on how much the tail matters. Averages are actively misleading for latency and you should say so.

**Interview nuance:** the strongest answers keep the SLO count small and tie each to a user journey. "99.9% of checkout submissions succeed over 28 days" is a good SLO because a human cares about that event. "CPU under 80%" is not an SLO, it is a resource metric with no user in it. Few SLOs, each anchored to a journey, targets set from what users actually expect (nobody notices 200 ms vs 250 ms, everybody notices 3 s).

**Recap:** SLI is good/valid events, SLO adds a target and window (99.9% over 28 days), SLA is the external promise with penalties; the measurement point (LB vs server vs client) changes the number, and latency SLOs use percentiles because averages hide the tail.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "sli-slo-sla-sort",
  "prompt": "Sort each statement by which layer of the reliability hierarchy owns it. The percentages will not sort them for you: what matters is whether the statement measures, targets, or promises.",
  "buckets": [
    "SLI",
    "SLO",
    "SLA"
  ],
  "items": [
    {
      "label": "Non-5xx responses divided by valid requests, read at the load balancer",
      "bucket": "SLI",
      "feedback": "A measured ratio of good events over valid events, with no target and no window attached to it yet. Naming where you measured it is part of the indicator too, because the load balancer, the server, and the client each report a different number for the same traffic."
    },
    {
      "label": "Dropping a request with a malformed body from the denominator",
      "bucket": "SLI",
      "feedback": "Deciding what counts as valid is part of defining the indicator, before any target exists. A 400 from a client that sent garbage is the client's fault, so grading yourself on it would measure the wrong thing."
    },
    {
      "label": "Choosing a rolling 28 days over a calendar month",
      "bucket": "SLO",
      "feedback": "The window belongs to the objective. An indicator is a bare ratio; adding a target and a window is what turns it into something a dashboard computes and a policy acts on. Rolling is usually preferred because a calendar reset hands you a free clean slate that hides a chronic problem."
    },
    {
      "label": "99.95 percent, the tighter number the team runs to internally",
      "bucket": "SLO",
      "feedback": "Strictness is the tell. The internal target is deliberately set inside the external promise so your own alerting fires before you owe anyone money."
    },
    {
      "label": "99.9 percent, and missing it this month owes the customer service credits",
      "bucket": "SLA",
      "feedback": "Financial penalties are what separate the agreement from the objective. Same shape, same kind of number, and only this one costs money when it is missed."
    },
    {
      "label": "Whichever of the three is deliberately the loosest",
      "bucket": "SLA",
      "feedback": "The one with the penalties has to be the loosest, otherwise your contract breaches before your own alerting has said anything. Ordering the three by strictness is a faster way to place a number than reading its wording."
    }
  ],
  "reveal": "The indicator measures, the objective adds a target and a window, and the agreement adds money. Keep the objective stricter than the agreement so your own alerting fires before the credits do, say where you measured (load balancer, server, or client) whenever you quote a number, and set latency objectives on percentiles because averages hide the tail."
}
\`\`\`
`.trim()

const errorBudgetsTeach = `
## The error budget is permission to fail

An **error budget** is the inverse of your SLO: budget = 1 - SLO. A 99.9% SLO means 0.1% of requests are allowed to fail, and that 0.1% is a real, spendable resource. Over 28 days at 10 million requests, a 99.9% SLO buys you 10,000 failed requests, or about 40 minutes of full outage. The mental shift that makes this powerful: the budget is not a threat, it is permission to fail that much. It exists to be spent, not hoarded.

Why spent, not hoarded? A team sitting at 100% budget remaining all quarter is not "doing great," it is over-investing in reliability the users did not ask for and under-shipping features they did. Perfect reliability is the wrong target because it means you shipped too slowly. The budget converts reliability from an argument ("is this safe enough?") into an account balance everyone can read.

## The policy is the point

A pre-agreed, written set of consequences that trigger automatically as the budget drains, so the ship-versus-stabilize decision is made in advance and does not become a political fight during a crisis. A typical policy:

\`\`\`
Budget remaining   Consequence
100% - 50%         Normal operation. Ship features at full speed.
50% - 10%          Caution. Extra review on risky changes; start
                   burning down reliability debt in parallel.
0% (exhausted)     Feature freeze. All release capacity redirects to
                   reliability until the budget recovers.
\`\`\`

The freeze is the teeth. When the budget hits zero, feature launches stop and the team works reliability until the rolling window recovers the budget. This is what makes the SLO enforceable rather than aspirational.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "freeze-carve-outs",
  "prompt": "Your error budget is exhausted and the policy has triggered a feature freeze. Overnight, a data-loss bug is found in production and an actively exploited CVE lands in a dependency you ship. What does a sane policy allow?",
  "options": [
    {
      "label": "Nothing ships until the rolling window recovers the budget",
      "feedback": "A freeze that blocks a patch for a data-loss bug or an exploited CVE makes the service less reliable, not more. That is the failure the carve-outs exist to prevent."
    },
    {
      "label": "Security fixes and P0 bug fixes ship, while new features and risky changes stay frozen",
      "correct": true,
      "feedback": "Right. The freeze redirects release capacity toward reliability, and reliability work itself is also exempt. It was never meant to halt every deploy."
    },
    {
      "label": "The freeze is lifted entirely, since an emergency proves the policy is too rigid",
      "feedback": "This is how a policy becomes theater. The carve-out is written narrowly and in advance precisely so nobody can argue the whole freeze away during a crisis."
    },
    {
      "label": "The team ships everything and labels it a hotfix",
      "feedback": "Relabeling a feature launch is the political fight the policy exists to end. The point is that the number already decided, not that the wording is flexible."
    }
  ]
}
\`\`\`

Two carve-outs keep the policy sane. First, **security and P0 fixes ship even during a freeze**: a freeze must never block a patch for an actively exploited CVE or a data-loss bug. Second, the freeze applies to *new features and risky changes*, not to reliability work itself. The point is to redirect effort, not to halt all deploys.

**Interview nuance:** the policy only works if it **depoliticizes** the decision and has **shared accountability**. Dev and ops (or product and SRE) both sign the policy in advance, and leadership pre-commits to honoring the freeze. Without that pre-agreement, when the budget is blown the product VP will simply overrule the freeze for the quarter's big launch, and the SLO becomes theater. The budget's whole purpose is that nobody has to win that argument in the moment: the number already decided.

Track burn over a rolling window and remember that **one bad incident can consume weeks of budget**. A 90-minute outage against a 40-minute budget doesn't just fail the window, it can put you underwater for the next two. That is why the response to a blown budget is a freeze, not a shrug: you are already borrowing against the future.

**Recap:** error budget = 1 - SLO and it is permission to fail that you spend, not hoard; the policy pre-agrees consequences (freeze at zero) with security carve-outs and shared accountability so the ship-versus-stabilize call is depoliticized before the incident, not fought during it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "budget-hoarding",
  "prompt": "A team ends every month of the quarter having spent only 5 percent of its error budget against a 99.9 percent objective. Their director calls it a model of reliability. What does an experienced SRE say?",
  "options": [
    {
      "label": "Agree: unused budget is pure margin, so the lower the burn the better",
      "feedback": "Perfect reliability means you shipped too slowly. Ninety-five percent of the budget left unspent every month is reliability the users never asked for, bought with features they did."
    },
    {
      "label": "They are over-investing in reliability and under-shipping",
      "correct": true,
      "feedback": "Right. The budget is permission to fail that much and it exists to be spent, so 95 percent of it left over every single month is reliability the users never asked for, bought with features they did. A permanently full budget is a signal to ship faster, or to re-examine whether the target matches what users actually expect."
    },
    {
      "label": "Loosen the objective to 99 percent so the dashboard looks busier",
      "feedback": "Half right. Re-examining the target is fair, but the reason is what users notice, not how the dashboard looks, and loosening the number without shipping anything changes nothing real."
    },
    {
      "label": "Spend the rest of the budget deliberately by injecting failures until it drains",
      "feedback": "Chaos experiments are guardrailed by the budget, not justified by it. Burning budget for its own sake helps nobody, because the way you spend it is by shipping."
    }
  ],
  "reveal": "The budget is 1 minus the objective, and it is a spendable resource rather than a threat. The policy pre-agrees the consequences (extra review as it drains, a feature freeze at zero) with narrow carve-outs for security and P0 fixes, and both sides sign it in advance so the ship-versus-stabilize call is settled before the incident instead of fought during it."
}
\`\`\`
`.trim()

const burnRateAlertingTeach = `
## When to wake a human

Once you have an SLO and an error budget, the question is when to wake a human. The naive answer, "alert whenever the error rate is above X," produces either a flood of pages during any tiny blip or a threshold so high you miss slow bleeds. Burn-rate alerting solves this by alerting on *how fast you are spending the budget*.

**Burn rate** is how many times faster than sustainable you are consuming the error budget. A burn rate of **1x** means you are spending the budget exactly on pace: at 1x you will use precisely 100% of it by the end of the SLO window and no more. A burn rate of **2x** means you will exhaust the whole window's budget in half the window. **14.4x** means you burn a 30-day budget in about 2 days, or equivalently 2% of a 30-day budget in one hour. Concretely, burn rate = (observed error rate) / (1 - SLO). For a 99.9% SLO the budget is 0.1%, so a sustained 1.44% error rate is a 14.4x burn.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Error budget depletion time",
  "predictPrompt": {
    "question": "At a sustained 14.4x burn rate against a 30-day error budget, how long until the entire budget is gone?",
    "options": [
      "About 2 hours",
      "About 2 days",
      "About 2 weeks",
      "The full 30 days"
    ]
  },
  "workedExample": "At the initial 14.4x burn against a 30-day window, the whole month's budget is gone in 50 hours, about 2 days, and every hour spends 2% of it. Drag the burn rate down to 1x and the budget lasts exactly the full 30 days; push it to 100x and it vanishes in just over 7 hours.",
  "inputs": [
    {
      "kind": "slider",
      "id": "burn_rate",
      "label": "Burn rate multiplier",
      "min": 1,
      "max": 100,
      "scale": "log",
      "initial": 14.4,
      "unit": "x"
    },
    {
      "kind": "slider",
      "id": "window_days",
      "label": "SLO window",
      "min": 7,
      "max": 90,
      "scale": "linear",
      "step": 1,
      "initial": 30,
      "unit": "days"
    }
  ],
  "outputs": [
    {
      "id": "time_to_empty",
      "label": "Time until budget exhausted",
      "expr": "window_days * 86400 / burn_rate",
      "format": "duration",
      "sparkline": {
        "over": "burn_rate"
      }
    },
    {
      "id": "budget_per_hour",
      "label": "Budget spent per hour",
      "expr": "burn_rate / (window_days * 24)",
      "format": "percent"
    }
  ],
  "caption": "Alert thresholds are picked so that tripping means a meaningful slice of the budget is already gone."
}
\`\`\`

## The canonical multi-window ladder

You pick a burn rate and a window so that tripping means you would consume a meaningful fraction of your total budget. The Google SRE canonical setup for a 99.9% SLO:

\`\`\`
Alert type     Burn rate   Long window   Short window   Budget spent   Action
Fast burn      14.4x       1 hour        5 min          ~2% in 1h      Page now
Medium burn    6x          6 hours       30 min         ~5% in 6h      Page
Slow burn      1x          3 days        6 hours        ~10% in 3d     Ticket
\`\`\`

Fast burn (14.4x over 1 hour) means something is badly wrong right now and you will blow the whole month's budget in a couple of days at this rate: that pages a human immediately. Medium burn (6x over 6 hours) is slower but still spends a twentieth of the month in an afternoon, so it also pages, just without the drop-everything urgency. Slow burn (1x over 3 days) is a chronic bleed that is not an emergency but must not be ignored: that files a ticket for business hours.

## Why two windows

Each alert requires both a long window and a short window to be over threshold simultaneously. The long window (1 hour) gives significance so you do not page on a 30-second spike. The short window (5 minutes) makes the alert *reset quickly* once the problem is fixed, so you are not stuck with a firing page for an hour after recovery. Requiring both cuts false positives (a brief blip fails the long window) and flapping (a recovered incident clears the short window fast). This is the multi-window multi-burn-rate pattern.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "symptoms-not-causes",
  "prompt": "Your team can add exactly one new condition to the on-call pager. Which one deserves to wake a human at 3 a.m.?",
  "options": [
    {
      "label": "CPU across the API fleet above 90 percent for 10 minutes",
      "feedback": "A cause, not a symptom. High CPU is often perfectly fine, and it frequently auto-scales away before the engineer has opened a laptop. This is the number-one source of alert fatigue."
    },
    {
      "label": "The checkout error budget burning at 14.4x over the last hour and the last 5 minutes",
      "correct": true,
      "feedback": "Right. Users are being hurt right now and a human must act, which is what a page has to mean."
    },
    {
      "label": "A single 30 second spike in 5xx responses",
      "feedback": "The long window exists so a brief blip does not page anyone. A 30 second spike fails the significance test on purpose."
    },
    {
      "label": "Memory on one pod above 80 percent",
      "feedback": "Another cause. Resource pressure belongs on a dashboard and in a capacity ticket, where nobody has to be woken up to read it."
    }
  ]
}
\`\`\`

**Interview nuance:** the single most important principle is **alert on symptoms, not causes**. Page on SLO burn (users are experiencing errors or slowness) not on CPU at 90% or memory pressure. High CPU might be fine; it is a cause that may or may not hurt users. A page must mean "a user is being hurt and a human must act now." Cause-based metrics belong on dashboards and in tickets for capacity planning, not on the pager. Alerting on causes is the number-one source of alert fatigue: engineers get paged for a high-CPU condition that auto-scaled away before they opened their laptop, learn to ignore pages, and then miss the real one.

The tuning tradeoff: shorter windows and lower burn-rate thresholds detect problems faster but page on smaller, sometimes self-healing events (more false positives, more budget-noise). Longer windows and higher thresholds page only on serious sustained problems but let more budget burn before you know. You trade detection time against budget spent and against page volume. Fast-burn catches acute outages quickly; slow-burn catches the chronic bleed that would otherwise silently drain you over a week.

**Recap:** burn rate is multiples of sustainable spend (1x uses exactly the budget, 14.4x burns ~2% of a month in an hour); require a long window for significance and a short window for fast reset; page on fast burn and ticket on slow burn; and always alert on the SLO-burn symptom, never on causes like CPU, to kill alert fatigue.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "burn-rate-arithmetic",
  "prompt": "A service with a 99.9 percent objective has returned 1.44 percent errors steadily for the last 90 minutes, and the last 5 minutes look the same. What fires, and why?",
  "options": [
    {
      "label": "A slow-burn ticket, since 1.44 percent is a small number",
      "feedback": "1.44 percent against a 0.1 percent budget is a 14.4x burn: about 2 percent of the month spent every hour, and the whole budget gone in roughly 2 days. That is the fast-burn case."
    },
    {
      "label": "A fast-burn page, because 1.44 over 0.1 is a 14.4x burn",
      "correct": true,
      "feedback": "Right. Burn rate is the observed error rate divided by 1 minus the objective, so 1.44 percent against a 0.1 percent budget is 14.4x. Ninety minutes of it fully covers the 1 hour long window, so that window reads 14.4x, and the 5 minute short window reads 14.4x as well. Both windows over threshold at the same moment is the multi-window trigger, and at that pace about 2 percent of the month goes every hour."
    },
    {
      "label": "Nothing: an error rate under 2 percent is inside a 99 percent objective",
      "feedback": "The objective here is 99.9 percent, so the budget is 0.1 percent rather than 1 percent. Comparing an error rate against the wrong budget is how a real outage gets waved through."
    },
    {
      "label": "A fast-burn page, but only once the short window has been over threshold for a full hour",
      "feedback": "The short window is there to make the alert clear quickly after recovery, not to delay the firing. Both windows over threshold at the same moment is the trigger."
    }
  ],
  "reveal": "Burn rate is multiples of sustainable spend: 1x uses exactly the budget over the window, and 14.4x burns about 2 percent of a month in an hour. The long window supplies significance and the short window supplies fast reset, so page on fast burn and ticket on slow burn. Above all, keep the pager pointed at the symptom users feel rather than at causes like CPU, because cause-based paging is what teaches engineers to ignore the pager."
}
\`\`\`
`.trim()

const goldenSignalsTeach = `
## A small, dependable set of numbers

When you own a service at 3am and it is misbehaving, you do not have time to stare at forty dashboards. You need a small, dependable set of numbers that tells you *whether* the service is healthy and *which direction* it is failing. Google's SRE book distills this to the **four golden signals**: latency, traffic, errors, and saturation. Instrument these four for every service and you can answer "is it up, is it fast, is it failing, is it about to fall over?" without guessing.

**Latency**: how long a request takes. Measure it as a distribution, not a mean. A mean of 40ms can hide a p99 of 900ms that is torching 1% of your users. Alert and dashboard on p50, p95, p99, and often p99.9. **Traffic**: demand on the system, typically requests per second (QPS) for an API, or bytes per second for a pipe. **Errors**: the rate of failing requests, split by explicit failures (HTTP 500) and implicit ones (a 200 with a wrong or empty body, or a request that blew its latency budget). **Saturation**: how full the most constrained resource is (CPU, memory, connection pool, queue depth). Saturation is your *leading* indicator: latency and errors tell you the house is on fire, saturation tells you the wiring is overheating before it ignites.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "fast-failures-flatter-latency",
  "prompt": "You ship a build with a bug that rejects 30 percent of requests with a validation 400 in about 2 ms each. Your latency chart mixes successes and failures into one series. What does that chart do?",
  "options": [
    {
      "label": "Spikes, because failed requests are always slower",
      "feedback": "Some failures are slow, such as a request that times out at 30 seconds and then returns a 500. This one comes back in 2 ms, faster than any success."
    },
    {
      "label": "Drops, so a bad deploy shows up on the dashboard as a latency improvement",
      "correct": true,
      "feedback": "Right. That is why you chart the latency of successful requests and the latency of failed requests as separate series."
    },
    {
      "label": "Stays flat, because errors are excluded from latency by definition",
      "feedback": "Only if you deliberately split the series. An aggregate includes them by default, which is precisely the trap."
    },
    {
      "label": "Becomes unreadable, because latency is a distribution rather than a number",
      "feedback": "Reading latency as a distribution is the right habit, but that is not what happens here. The chart stays perfectly readable and perfectly misleading."
    }
  ]
}
\`\`\`

**Interview nuance:** interviewers love to ask why you separate the latency of successful requests from the latency of failed ones. Fast failures (a validation 400 returning in 2ms) drag your aggregate latency *down* and make a struggling service look healthy; slow failures (a request that times out at 30s then 500s) can hide inside an aggregate that averages them with fast successes. Always chart success latency and error latency as separate series, or a bad deploy that fails fast will look like a latency *improvement*.

## RED and USE

- **RED** (Rate, Errors, Duration) is for **request-driven services**: an API, a gRPC endpoint, a web handler. Per endpoint you emit request rate, error rate, and duration distribution. This is the workhorse for microservices.
- **USE** (Utilization, Saturation, Errors) is for **resources**: a CPU, a disk, a NIC, a connection pool, a thread pool. Per resource you emit how busy it is (utilization), how much work is queued beyond what it can serve (saturation), and its error count.

They are complementary, not competing. RED tells you the checkout API's p99 doubled; USE tells you it is because the Postgres connection pool is saturated and requests are queuing for a connection.

\`\`\`
  request-driven service   ->  RED   (Rate, Errors, Duration)
  underlying resource       ->  USE   (Utilization, Saturation, Errors)
  every service, always     ->  4 golden signals
\`\`\`

## The cardinality trap

The trap that quietly bankrupts observability budgets is **cardinality**. A metric's cost scales with the number of unique label combinations (time series), not the number of data points. Add a \`user_id\` label to a request counter and a service with 5 million users creates up to 5 million time series per metric; Prometheus will OOM and your bill explodes. Keep labels bounded: \`endpoint\`, \`method\`, \`status_class\` (2xx/4xx/5xx), \`region\`. Never put unbounded values (user id, order id, full URL with ids, raw error message) in a metric label. High-cardinality identifiers belong in logs and traces, not metrics.

The other common wrong turn is building **dashboards nobody watches** instead of signal-based alerting. A wall of graphs does not page anyone. Alert on symptoms the golden signals expose (error rate over budget, p99 over SLO, saturation climbing), keep dashboards for diagnosis after the page fires, and delete the ones that have not been opened in a quarter.

**Recap:** instrument latency, traffic, errors, saturation on every service; use RED for request-driven services and USE for resources; split success vs error latency; treat saturation as your early warning; and guard cardinality by keeping unbounded ids out of metric labels.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "metric-label-cardinality",
  "prompt": "Metric cost scales with the number of unique label combinations. Sort each field by where it belongs.",
  "buckets": [
    "Safe as a metric label",
    "Belongs in logs or traces"
  ],
  "items": [
    {
      "label": "endpoint",
      "bucket": "Safe as a metric label"
    },
    {
      "label": "http method",
      "bucket": "Safe as a metric label"
    },
    {
      "label": "status class such as 2xx, 4xx, 5xx",
      "bucket": "Safe as a metric label",
      "feedback": "Bounded to a handful of values, so it multiplies the series count by a small constant."
    },
    {
      "label": "region",
      "bucket": "Safe as a metric label"
    },
    {
      "label": "user id",
      "bucket": "Belongs in logs or traces",
      "feedback": "Five million users can create up to five million time series per metric. The identifier is valuable, just not on a metric."
    },
    {
      "label": "the full request URL including order ids",
      "bucket": "Belongs in logs or traces"
    },
    {
      "label": "the raw error message text",
      "bucket": "Belongs in logs or traces",
      "feedback": "Unbounded free text is the worst possible label. Put it on the log line and correlate by trace id instead."
    }
  ],
  "reveal": "Latency, traffic, errors, and saturation answer is it up, is it fast, is it failing, and is it about to fall over. Use rate, errors, and duration for request-driven services and utilization, saturation, and errors for the resources underneath them. Treat saturation as the leading indicator, split success latency from error latency so a fast-failing deploy cannot look like an improvement, and keep unbounded identifiers off metric labels so both the memory footprint and the bill stay bounded."
}
\`\`\`
`.trim()

const threePillarsOtelTeach = `
## Three pillars, three questions

Observability rests on three kinds of telemetry, and the skill is knowing which one answers which question. They are not redundant; each trades detail against cost differently.

**Metrics** are cheap numeric aggregates over time (counters, gauges, histograms). They cost almost nothing per data point, retain for a long time, and are what you *alert* on and trend on. They answer "how many, how fast, how full, right now and over the last quarter?" What they cannot tell you is *why* one specific request was slow, because they have thrown away the individual events.

**Logs** are structured records of discrete events. They carry the detail metrics discarded: the exact error, the parameters, the code path. They answer "what exactly happened to this request?" But logs are expensive at volume and painful to correlate across services unless they are structured (JSON with consistent fields) and carry shared ids. A wall of free-text log lines from twelve services with no common id is nearly useless for a distributed problem.

**Traces** capture the causal path of a single request as it fans across services. A trace is a tree of **spans**; each span is one unit of work (an HTTP handler, a DB query, a cache lookup) with a start time, duration, and attributes. Traces answer the question metrics and logs alone cannot: "this checkout took 1.4s, *where* did the time go across the 12 hops?" That is the pillar most teams under-invest in and most regret skipping.

\`\`\`cswidget
{
  "type": "steps",
  "title": "Trace waterfall: where did 1.4s go?",
  "frames": [
    {
      "note": "A checkout request hits api-gateway, which starts the root span of the trace (20ms of its own work) and sends the traceparent header downstream, so every service can attach child spans to the same trace.",
      "rows": [
        {
          "label": "api-gateway",
          "cells": [
            {
              "text": "20ms",
              "state": "active"
            }
          ]
        },
        {
          "label": "outbound",
          "cells": [
            {
              "text": "traceparent header ->",
              "state": "new"
            }
          ]
        }
      ]
    },
    {
      "note": "order-svc reads the traceparent and starts a child span: 200ms. Inside it, the postgres write is a nested span of 40ms. Each span is one unit of work with a start time, duration, and attributes.",
      "rows": [
        {
          "label": "api-gateway",
          "cells": [
            {
              "text": "20ms",
              "state": "dim"
            }
          ]
        },
        {
          "label": "order-svc",
          "cells": [
            {
              "text": "============",
              "state": "active"
            },
            {
              "text": "200ms",
              "state": "active"
            }
          ]
        },
        {
          "label": "-> postgres write",
          "cells": [
            {
              "text": "====",
              "state": "new"
            },
            {
              "text": "40ms",
              "state": "new"
            }
          ]
        }
      ]
    },
    {
      "note": "payment-svc and its nested fraud-check gRPC call land, then notify-svc closes it out: checkout took 1.4s across the hops. Metrics said checkout is slow; the waterfall shows where the time sits.",
      "rows": [
        {
          "label": "trace total",
          "cells": [
            {
              "text": "checkout 1.4s",
              "state": "active"
            }
          ]
        },
        {
          "label": "api-gateway",
          "cells": [
            {
              "text": "20ms",
              "state": "dim"
            }
          ]
        },
        {
          "label": "order-svc",
          "cells": [
            {
              "text": "============",
              "state": "dim"
            },
            {
              "text": "200ms",
              "state": "dim"
            }
          ]
        },
        {
          "label": "-> postgres write",
          "cells": [
            {
              "text": "====",
              "state": "dim"
            },
            {
              "text": "40ms",
              "state": "dim"
            }
          ]
        },
        {
          "label": "payment-svc",
          "cells": [
            {
              "text": "================================",
              "state": "new"
            },
            {
              "text": "1.1s",
              "state": "new"
            }
          ]
        },
        {
          "label": "-> fraud-check gRPC",
          "cells": [
            {
              "text": "============================",
              "state": "new"
            },
            {
              "text": "1.0s",
              "state": "new"
            }
          ]
        },
        {
          "label": "notify-svc",
          "cells": [
            {
              "text": "30ms",
              "state": "new"
            }
          ]
        }
      ],
      "predict": {
        "question": "Checkout took 1.4s. Which unit of work do you optimize?",
        "options": [
          "order-svc (200ms)",
          "payment-svc's own code",
          "fraud-check gRPC (1.0s)",
          "postgres write (40ms)"
        ]
      }
    },
    {
      "note": "Open payment-svc: its 1.1s is almost entirely the nested fraud-check gRPC span, 1.0s of waiting on one downstream call. Tuning payment-svc's own code wins almost nothing; the culprit is the fraud-check hop.",
      "rows": [
        {
          "label": "trace total",
          "cells": [
            {
              "text": "checkout 1.4s",
              "state": "dim"
            }
          ]
        },
        {
          "label": "api-gateway",
          "cells": [
            {
              "text": "20ms",
              "state": "dim"
            }
          ]
        },
        {
          "label": "order-svc",
          "cells": [
            {
              "text": "============",
              "state": "dim"
            },
            {
              "text": "200ms",
              "state": "dim"
            }
          ]
        },
        {
          "label": "-> postgres write",
          "cells": [
            {
              "text": "====",
              "state": "dim"
            },
            {
              "text": "40ms",
              "state": "dim"
            }
          ]
        },
        {
          "label": "payment-svc",
          "cells": [
            {
              "text": "================================",
              "state": "dim"
            },
            {
              "text": "1.1s",
              "state": "dim"
            }
          ]
        },
        {
          "label": "-> fraud-check gRPC",
          "cells": [
            {
              "text": "============================",
              "state": "active"
            },
            {
              "text": "1.0s",
              "state": "active"
            }
          ]
        },
        {
          "label": "notify-svc",
          "cells": [
            {
              "text": "30ms",
              "state": "dim"
            }
          ]
        }
      ]
    },
    {
      "note": "The shared trace id makes this findable: propagated in the traceparent header, stamped on every log line, and attached to metrics as an exemplar, so a metric spike pivots to the exact trace and then to the logs for exactly that request.",
      "rows": [
        {
          "label": "pivot",
          "cells": [
            {
              "text": "metric spike",
              "state": "normal"
            },
            {
              "text": "exemplar trace id",
              "state": "new"
            },
            {
              "text": "full trace",
              "state": "active"
            },
            {
              "text": "logs for that request",
              "state": "normal"
            }
          ]
        }
      ]
    }
  ],
  "caption": "One trace, a tree of spans: the waterfall turns 'checkout is slow' into 'the fraud-check gRPC call inside payment-svc costs 1.0s'."
}
\`\`\`

\`\`\`
  Trace: checkout (1.4s)
  |-- api-gateway            [ 20ms ]
  |-- order-svc              [ ============ 200ms ]
  |     |-- postgres write   [ ==== 40ms ]
  |-- payment-svc            [ ================================ 1.1s ]
  |     |-- fraud-check gRPC [ ============================ 1.0s ]  <- culprit
  |-- notify-svc            [ 30ms ]
\`\`\`

## Context propagation ties traces together

The thing that makes traces work across service boundaries is **context propagation**. Each incoming request carries a \`traceparent\` header (the W3C Trace Context standard) holding the trace id and the parent span id. Each service reads it, starts a child span, and passes the updated header to its own downstream calls. That shared trace id is also what you stamp onto every log line and (as an *exemplar*) onto metrics, so you can pivot: a metric spike -> an exemplar trace id -> the full trace -> the correlated logs for exactly that request. Without propagated context, "why is it slow?" is unanswerable in a distributed system, which is the single most common wrong turn in this space.

## OpenTelemetry

**OpenTelemetry (OTel)** is the vendor-neutral standard that ties all three pillars together. It gives you: SDKs (per language) that produce metrics, logs, and traces with a common data model and automatic context propagation; instrumentation libraries that trace popular frameworks with near-zero code; and the **OTel Collector**, a separate process that receives your telemetry, processes it (batching, sampling, redaction, adding resource attributes), and exports it to whatever backends you choose (Prometheus for metrics, Loki/Elasticsearch for logs, Jaeger/Tempo for traces, or a vendor like Datadog/Honeycomb). The payoff is decoupling: your application code emits OTel and knows nothing about the backend, so you can switch vendors or fan out to several by editing Collector config, not redeploying every service.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "head-vs-tail-sampling",
  "prompt": "Trace volume is too expensive, so you keep 1 percent of traces and the decision is taken at the first span of each request. A customer reports a checkout that took 9 seconds. What is the chance you have that trace?",
  "options": [
    {
      "label": "About 1 percent, because the sampling decision was made before anyone knew the request would be slow",
      "correct": true,
      "feedback": "Right. Head-based sampling is cheap and simple and may drop exactly the trace you needed. Tail-based sampling buffers whole traces at the collector and then keeps all the errors and all the slow requests plus a small share of normal traffic."
    },
    {
      "label": "100 percent, since errors and slow requests are always kept",
      "feedback": "That is tail-based sampling. A decision taken at the first span cannot know the duration or the outcome, because neither exists yet."
    },
    {
      "label": "Zero, because sampling drops the slow requests first",
      "feedback": "Sampling is not biased against slow requests, it is blind to them. The head-based decision happens before the duration exists at all."
    },
    {
      "label": "It does not matter, because the logs contain the same causal path",
      "feedback": "Logs carry per-event detail, but a wall of lines from twelve services does not show where the time went across the hops. That is the question only a trace answers."
    }
  ]
}
\`\`\`

**Interview nuance:** be ready to talk cost control, because that is where these designs are won or lost. Cardinality drives metric cost, so keep labels bounded. Trace volume is enormous at scale, so you *sample*: **head-based** sampling decides at the first span (cheap, simple, but may drop the one trace you needed), while **tail-based** sampling buffers whole traces at the Collector and keeps the interesting ones (all errors, all slow requests) plus a small percentage of normal traffic (accurate, but the Collector must hold traces in memory). Logs get tiered storage: hot in a fast index for a few days, then rolled to cheap object storage (S3) for compliance retention.

**Recap:** metrics for cheap aggregates and alerting, logs for structured per-event detail, traces for the causal cross-service path; propagate W3C trace context and share the trace id across all three; standardize on OpenTelemetry SDKs plus a Collector to decouple apps from backends; and control cost with bounded cardinality, trace sampling (tail-based keeps errors/slow), and tiered log retention.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "pillar-per-question",
  "prompt": "Each question below is answered cheaply by exactly one pillar. Sort them.",
  "buckets": [
    "Metrics",
    "Logs",
    "Traces"
  ],
  "items": [
    {
      "label": "Page the on-call when the checkout error rate crosses the budget",
      "bucket": "Metrics"
    },
    {
      "label": "Trend p99 latency cheaply across the last quarter",
      "bucket": "Metrics",
      "feedback": "Cheap numeric aggregates retained for a long time is exactly what metrics are for."
    },
    {
      "label": "Read the exact exception and parameters for one failed order",
      "bucket": "Logs"
    },
    {
      "label": "Recover which branch the code took inside a single service for one request",
      "bucket": "Logs"
    },
    {
      "label": "Find which of twelve hops consumed 1.0 second of a 1.4 second checkout",
      "bucket": "Traces",
      "feedback": "A tree of spans is the only view that shows where the time went across service boundaries."
    },
    {
      "label": "See the parent and child relationship of one request's work across services",
      "bucket": "Traces"
    }
  ],
  "reveal": "Metrics are cheap aggregates you alert and trend on, logs are per-event detail, and traces are the causal path across services. The trace id propagated in the W3C trace context header, stamped onto log lines and attached to metrics as exemplars, is what lets a metric spike pivot to one trace and then to the logs for that exact request. OpenTelemetry standardizes all three and the collector decouples your services from whichever backends you buy, while cost stays under control through bounded cardinality, tail-based sampling, and tiered log retention."
}
\`\`\`
`.trim()

const timeoutsRetriesTeach = `
## The self-inflicted DDoS

Level 1's resilience-primitives lesson introduced the four call-policy parts (timeouts, retries, circuit breakers, isolation) as a first pass; this lesson is the deep walkthrough of the first two. The single most common way a distributed system takes itself down is not a hardware failure. It is a small blip amplified by its own retry logic into a self-inflicted DDoS, and this lesson is the defense.

## Every call needs a timeout

A call with no timeout inherits the operating system default, which for a TCP connect can be minutes. When a downstream slows down, requests that would have failed fast instead pile up, each holding a thread and a connection. Your thread pool fills, and now a service that was merely slow makes your service completely unavailable. You need two timeouts: a **connect timeout** (how long to wait to establish the connection, usually tens of ms inside a datacenter) and a **request timeout** (how long to wait for the response). Set the request timeout from the downstream's real p99, not a guess. If the downstream's p99 is 80 ms, a 250 ms timeout is generous; a 30 second timeout is a liability.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "deadline-propagation",
  "prompt": "A user-facing request carries a 1 second budget. Service A spends 400 ms, then calls B with its own fresh 1 second timeout, and B calls C with another fresh 1 second timeout. Count the work the chain can spend on this one request, not the wall clock the user waits. What is the worst case?",
  "options": [
    {
      "label": "1 second, because the user's budget bounds the whole chain",
      "feedback": "Nothing enforces the user's budget across hops unless the remaining time is passed down. A fresh timeout at each hop is permission to start the clock over."
    },
    {
      "label": "Up to 3 seconds of work across the chain",
      "correct": true,
      "feedback": "Right. Three hops with fresh timeouts can legally spend 3x the user's budget, most of it producing a result the user already gave up on. The wall clock is the smaller number here: the user stops waiting at 1.4 seconds, because A's own 1 second timeout on B fires 400 ms in. B and C keep burning server time behind that, which is the waste. The fix is a shrinking deadline: tell B it has 600 ms left, and have B tell C what remains of that."
    },
    {
      "label": "400 ms, because A already consumed the budget",
      "feedback": "A consumed 400 ms of the user's budget, but it never told B or C, so each of them starts a full second of its own."
    },
    {
      "label": "It depends only on C, since C is the last hop",
      "feedback": "Every hop contributes. C's timeout bounds C, while A and B each wait on their own fresh clocks stacked on top of it."
    }
  ]
}
\`\`\`

## Propagate a deadline, do not reset it

If the user-facing request has a 1 second budget and it has already spent 400 ms, the call to service B must be told "you have 600 ms left," and service B must pass the remaining budget to service C. gRPC does this natively with deadlines; in HTTP you pass a header like \`X-Deadline\` or \`grpc-timeout\`. Without propagation each hop uses its own fresh timeout, so a 3-hop chain can legally spend 3x the user's budget doing work whose result the user already gave up waiting for.

Two different quantities move here and it pays to name both, because interviewers ask which one you mean. The **wall clock the user waits** is bounded at 1.4 seconds: A spends 400 ms, then its own 1 second timeout on B fires and A gives up. The **work the chain spends** is up to 3 seconds, because B and C are still computing against clocks nobody reset. Propagation is what collapses the second number back onto the first.

## Retries need backoff, jitter, and a budget

Retrying immediately after a failure is how a blip becomes an outage: the downstream chokes, every caller retries at once, and the synchronized wave of retries keeps it choked. The formula is exponential backoff with jitter:

\`\`\`
  delay = random_between(0, min(cap, base * 2^attempt))
\`\`\`

The exponential part (\`base * 2^attempt\`) spaces retries further apart as failures persist. The \`cap\` bounds the worst-case wait. The **jitter** (randomizing within the window) is the part juniors omit and the part that matters most: without it, a thousand clients that failed at the same instant all retry at the same instant, recreating the thundering herd. AWS's published guidance is full jitter, exactly the form above.

**Cap total retries with a retry budget.** Even with backoff, blind retries multiply load. Level 1 introduced this guard as the rough "retries stay under ~10% of request volume"; in production you enforce it as a live ratio, for example retries may not exceed 5% of successful requests over a rolling 10-second window, tightened further for expensive downstreams. When the downstream is broadly failing, the budget exhausts and you stop retrying, which is correct: retrying a dead dependency just delays recovery.

**Only retry idempotent operations.** A GET is safe. A POST that charges a card is not: a timeout does not tell you whether the charge happened, so a naive retry can double-charge. Make writes safe to retry with an idempotency key the server dedupes on.

**Interview nuance:** the killer is **retry amplification**. If the gateway retries 3x, and it calls a service that also retries 3x, and that service calls a database client that also retries 3x, one user request can become 27 database calls. Retry at exactly one layer, usually the outermost one that owns the deadline, and let inner layers fail fast.

\`\`\`cswidget
{
  "type": "sequence",
  "title": "Retry storm: one request becomes 27 db calls",
  "actors": [
    {
      "id": "client",
      "label": "Client"
    },
    {
      "id": "gateway",
      "label": "Edge gateway"
    },
    {
      "id": "service",
      "label": "Service"
    },
    {
      "id": "db",
      "label": "Database"
    }
  ],
  "toggles": [
    {
      "id": "storm",
      "label": "Retry storm",
      "description": "The database turns slow; gateway, service, and db client each retry 3x"
    },
    {
      "id": "jitter",
      "label": "Full jitter",
      "description": "Randomize each retry delay so the synchronized wave spreads out"
    }
  ],
  "steps": [
    {
      "from": "client",
      "to": "gateway",
      "kind": "request",
      "label": "GET /checkout",
      "state": {
        "attempts_at_db": "0"
      }
    },
    {
      "from": "gateway",
      "to": "service",
      "kind": "request",
      "label": "call service"
    },
    {
      "from": "service",
      "to": "db",
      "kind": "request",
      "label": "query orders",
      "state": {
        "attempts_at_db": "1"
      }
    },
    {
      "from": "db",
      "to": "service",
      "kind": "response",
      "label": "rows in 80 ms",
      "when": "!storm"
    },
    {
      "from": "service",
      "to": "gateway",
      "kind": "response",
      "label": "200 OK",
      "when": "!storm"
    },
    {
      "from": "gateway",
      "to": "client",
      "kind": "response",
      "label": "200 OK",
      "when": "!storm"
    },
    {
      "from": "db",
      "kind": "timer",
      "label": "db slow, no reply",
      "status": "late",
      "when": "storm"
    },
    {
      "from": "service",
      "to": "db",
      "kind": "request",
      "label": "db client retry 1 of 3",
      "status": "error",
      "when": "storm",
      "state": {
        "attempts_at_db": "2"
      },
      "predict": {
        "question": "Gateway, service, and db client each try 3x. How many db calls can this one user request become?",
        "options": [
          "3",
          "9",
          "27"
        ]
      }
    },
    {
      "from": "service",
      "kind": "note",
      "label": "db client tries 3x, all fail",
      "when": "storm",
      "state": {
        "attempts_at_db": "3"
      }
    },
    {
      "from": "service",
      "kind": "note",
      "label": "service retry x3 redoes all",
      "when": "storm",
      "state": {
        "attempts_at_db": "9"
      }
    },
    {
      "from": "service",
      "to": "gateway",
      "kind": "response",
      "label": "error after 9 db calls",
      "status": "error",
      "when": "storm"
    },
    {
      "from": "gateway",
      "to": "service",
      "kind": "request",
      "label": "gateway retry 1 of 3",
      "status": "error",
      "when": "storm",
      "state": {
        "attempts_at_db": "18"
      }
    },
    {
      "from": "gateway",
      "kind": "note",
      "label": "gateway x3: 27 db calls",
      "when": "storm",
      "state": {
        "attempts_at_db": "27"
      }
    },
    {
      "from": "gateway",
      "to": "client",
      "kind": "response",
      "label": "504, request abandoned",
      "status": "error",
      "when": "storm"
    },
    {
      "from": "service",
      "kind": "timer",
      "label": "wait rand(0, base * 2^n)",
      "when": "jitter"
    },
    {
      "from": "gateway",
      "kind": "note",
      "label": "retries spread, herd gone",
      "when": "jitter"
    }
  ],
  "caption": "Retry at exactly one layer, the outermost one that owns the deadline, and let inner layers fail fast."
}
\`\`\`

**Recap:** connect plus request timeouts on every call, propagate a shrinking deadline down the chain, exponential backoff with full jitter, a retry budget capping retries to a small fraction of traffic, retry only idempotent operations, and retry at one layer to avoid multiplicative amplification.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "retry-idempotency",
  "prompt": "A POST that charges a card times out. Your client is configured with exponential backoff, full jitter, and a retry budget. Is it safe to retry?",
  "options": [
    {
      "label": "Yes: backoff and jitter make retries safe",
      "feedback": "Backoff and jitter protect the downstream from a synchronized wave of retries. They say nothing about whether the charge already happened."
    },
    {
      "label": "No, not unless the charge carries an idempotency key",
      "correct": true,
      "feedback": "Right. A timeout is ambiguous: the request may have been lost, the response may have been lost, or the downstream may be slow and still processing, so it never tells you whether the card was charged. An idempotency key the server dedupes on is what makes a second attempt safe, because the duplicate returns the original result instead of charging again."
    },
    {
      "label": "Yes, because a timeout means the request never arrived",
      "feedback": "A timeout means you stopped waiting. It carries no information at all about what the downstream did or did not do."
    },
    {
      "label": "No: writes can never be retried under any circumstances",
      "feedback": "Too absolute. Writes become retryable once they are idempotent, which is exactly why idempotency keys exist."
    }
  ],
  "reveal": "Every call gets a connect timeout and a request timeout set from the downstream's real p99, and the remaining deadline travels down the chain instead of resetting at each hop. Retries need exponential backoff with full jitter so a thousand clients do not retry in the same instant, a budget capping retries to a small fraction of traffic, idempotency before any write is retried, and exactly one retrying layer so three tiers of retries cannot multiply into twenty-seven calls."
}
\`\`\`
`.trim()

const circuitBreakersTeach = `
## Three patterns of failure isolation

Level 1's resilience-primitives lesson sketched the circuit-breaker state machine (Closed to Open to Half-Open) as a first pass. This lesson credits that and goes past the single breaker to what senior answers actually hinge on: how the breaker and the bulkhead cover different halves of the same failure, and how a service mesh configures both. Timeouts and retries stop one slow call from hanging forever; when a dependency is broadly failing you instead want to stop calling it at all, contain the damage to one part of your service, and serve something useful instead of an error. That is circuit breakers, bulkheads, and fallbacks: the three patterns of failure isolation.

## Circuit breaker

A circuit breaker is a state machine wrapped around a dependency that trips like an electrical breaker so you stop sending requests into a failure.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Circuit breaker states",
  "reveal": "all",
  "nodes": [
    {
      "id": "closed",
      "label": "CLOSED: traffic flows, failures counted over a rolling window",
      "kind": "service"
    },
    {
      "id": "open",
      "label": "OPEN: calls fail instantly, nothing reaches the dependency",
      "kind": "service"
    },
    {
      "id": "half_open",
      "label": "HALF-OPEN: a few trial requests, after a cooldown of about 5 s",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "closed",
      "to": "open",
      "kind": "sync",
      "label": "error rate or slow-call rate crosses the threshold, above a minimum request volume"
    },
    {
      "from": "open",
      "to": "half_open",
      "kind": "sync",
      "label": "cooldown elapses"
    },
    {
      "from": "half_open",
      "to": "closed",
      "kind": "feedback",
      "label": "probe succeeds"
    },
    {
      "from": "half_open",
      "to": "open",
      "kind": "feedback",
      "label": "probe fails: re-open and wait another cooldown"
    }
  ],
  "caption": "Open is the state doing the work: failing fast spares your callers a 500 ms timeout on every request, and it sheds all load off the sick dependency so it can drain its queue instead of being pinned down."
}
\`\`\`

- **Closed** is normal: requests flow, and the breaker counts failures over a rolling window.
- **Open** trips when the failure rate crosses a threshold over a rolling window. Level 1 used the canonical "half of the last 20 calls"; real configs harden that by also gating on a minimum request volume (so a 2-of-3 blip cannot trip a breaker) and by pairing the error-rate threshold with a slow-call-rate threshold (so climbing latency alone can trip it before errors even appear). In Open state calls **fail immediately** without touching the dependency, which protects your callers from waiting on timeouts and sheds all load off the sick dependency so it can recover instead of being pinned down.
- **Half-Open** starts after a cooldown (say 5 seconds). The breaker lets a small number of trial requests through. If they succeed, it closes; if they fail, it re-opens and waits again.

The key insight is that failing fast is a feature. A breaker in Open state gives an instant error, which is far better than a client waiting 500 ms for a timeout on every request, and it is the only thing that lets an overloaded dependency drain its queue.

\`\`\`cswidget
{
  "type": "sequence",
  "title": "Drive the breaker: Closed to Open to Half-Open",
  "actors": [
    {
      "id": "caller",
      "label": "Caller"
    },
    {
      "id": "breaker",
      "label": "Circuit breaker"
    },
    {
      "id": "dep",
      "label": "Dependency"
    }
  ],
  "toggles": [
    {
      "id": "depDown",
      "label": "Dependency failing",
      "description": "Calls time out instead of answering; timeouts count as failures in the rolling window of the last 20 calls."
    },
    {
      "id": "probeFails",
      "label": "Probe fails in Half-Open",
      "description": "Only matters once the breaker reaches Half-Open: turn on Dependency failing first to get there."
    }
  ],
  "steps": [
    {
      "from": "caller",
      "to": "breaker",
      "label": "call dependency",
      "kind": "request",
      "status": "ok",
      "state": {
        "breaker": "Closed",
        "window": "0/20 fail"
      }
    },
    {
      "from": "breaker",
      "to": "dep",
      "label": "forward (Closed)",
      "kind": "request",
      "status": "ok"
    },
    {
      "from": "dep",
      "to": "breaker",
      "label": "200 OK",
      "kind": "response",
      "status": "ok",
      "when": "!depDown"
    },
    {
      "from": "breaker",
      "to": "caller",
      "label": "200 OK",
      "kind": "response",
      "status": "ok",
      "when": "!depDown"
    },
    {
      "from": "breaker",
      "label": "500 ms timeout = failure",
      "kind": "timer",
      "status": "error",
      "when": "depDown",
      "state": {
        "window": "11/20 fail"
      }
    },
    {
      "from": "breaker",
      "label": "over half of last 20: trip",
      "kind": "note",
      "status": "error",
      "when": "depDown",
      "state": {
        "breaker": "Open"
      },
      "predict": {
        "question": "Failures just crossed half of the rolling window of 20 calls, so the breaker trips to Open. What happens to the caller's next request?",
        "options": [
          "It fails instantly and never touches the dependency",
          "It waits the full 500 ms timeout, then errors",
          "It queues inside the breaker until the dependency recovers"
        ]
      }
    },
    {
      "from": "caller",
      "to": "breaker",
      "label": "next call",
      "kind": "request",
      "status": "ok",
      "when": "depDown"
    },
    {
      "from": "breaker",
      "to": "caller",
      "label": "instant fail, no call out",
      "kind": "response",
      "status": "error",
      "when": "depDown"
    },
    {
      "from": "breaker",
      "label": "5 s cooldown ends",
      "kind": "timer",
      "status": "ok",
      "when": "depDown",
      "state": {
        "breaker": "Half-Open"
      }
    },
    {
      "from": "breaker",
      "to": "dep",
      "label": "trial probe",
      "kind": "request",
      "status": "ok",
      "when": "depDown",
      "predict": {
        "question": "Half-Open lets a small number of trial requests through. If this probe fails, what does the breaker do?",
        "options": [
          "Re-opens and waits out another cooldown",
          "Stays Half-Open and probes forever",
          "Closes anyway and resumes full traffic"
        ]
      }
    },
    {
      "from": "dep",
      "to": "breaker",
      "label": "probe fails",
      "kind": "response",
      "status": "error",
      "when": "probeFails"
    },
    {
      "from": "breaker",
      "label": "re-open, cooldown again",
      "kind": "note",
      "status": "error",
      "when": "probeFails",
      "state": {
        "breaker": "Open"
      }
    },
    {
      "from": "dep",
      "to": "breaker",
      "label": "probe 200 OK",
      "kind": "response",
      "status": "ok",
      "when": "depDown"
    },
    {
      "from": "breaker",
      "label": "close: traffic flows again",
      "kind": "note",
      "status": "ok",
      "when": "depDown",
      "state": {
        "breaker": "Closed",
        "window": "0/20 fail"
      }
    }
  ],
  "caption": "Turn on Dependency failing to watch the trip to Open and the fail-fast; then flip Probe fails to see Half-Open send the breaker back to Open instead of Closed."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "slow-but-not-failing",
  "prompt": "Dependency C has gone slow but not failing: every call still returns 200, just after 900 ms. Your breaker on C is configured on error rate alone, so it has not tripped, and A, B, and C all draw from one shared pool of 200 threads. What happens?",
  "options": [
    {
      "label": "Nothing: C is returning success, so the system is healthy",
      "feedback": "Success is not the same as cheap. Each slow call holds a thread for 900 ms, and threads are the scarce resource here."
    },
    {
      "label": "Calls to C fill the shared pool, so A and B get no threads",
      "correct": true,
      "feedback": "Right. A, B, and C draw from the same 200 threads, and each 900 ms call to C parks one of them. Enough slow C calls and every thread is stuck waiting on C, so requests to A and B, which are perfectly healthy, find no thread and fail too. One sick dependency starved the others, and the breaker saw nothing because nothing errored."
    },
    {
      "label": "The breaker trips anyway, because latency always counts as a failure",
      "feedback": "Only if you configured it to. Hardened breakers pair the error-rate threshold with a slow-call-rate threshold for this very case, but an error-rate-only breaker sees nothing wrong."
    },
    {
      "label": "The 900 ms calls time out, and the breaker trips on the timeouts",
      "feedback": "Only if the request timeout is under 900 ms. Here the call completes and returns a 200, so nothing lands in the breaker's failure window and it stays Closed."
    }
  ]
}
\`\`\`

## Bulkhead

A bulkhead isolates resources per dependency, named after ship compartments that stop one flooded section from sinking the vessel. If your service calls Dependencies A, B, and C from a single shared thread pool of 200 threads, and C gets slow, requests to C hold threads until they time out. Enough slow C calls and all 200 threads are stuck in C, so calls to A and B, which are perfectly healthy, get no threads and fail too. One sick dependency starved the others. The fix is to give each dependency its own bounded pool (for example 60 threads for A, 60 for B, 40 for C). Now a C brownout can consume at most C's 40 threads; A and B keep serving. Bulkheads convert a total outage into a partial one.

## Fallbacks

Fallbacks answer "what do we serve when the dependency is unavailable?" Options, in order of preference: return cached or slightly stale data; return a sensible default; or gracefully omit the feature. The rule is that **only non-critical dependencies should be fallback-able**. You cannot fall back on the payment authorization, but you absolutely can fall back on the "customers also bought" recommendations by rendering the page without them. The product still sells.

**Interview nuance:** breakers and bulkheads solve different halves of the same problem, and strong answers use both. The breaker decides *whether* to call a dependency based on its recent health; the bulkhead bounds *how much of your resources* any one dependency can ever consume, even before the breaker trips. Without the bulkhead, a dependency that is slow but not yet failing enough to trip the breaker can still exhaust your shared pool. Envoy and service meshes provide both as config (outlier detection for breaking, circuit-breaker connection/request limits for bulkheading).

**Recap:** circuit breakers move Closed to Open to Half-Open to fail fast and let a sick dependency recover; bulkheads give each dependency a bounded pool so one cannot starve the others; fallbacks serve stale, default, or omitted content, but only for non-critical dependencies.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "fallback-critical-vs-not",
  "prompt": "Checkout calls the payment authorizer and the customers-also-bought recommender. Both are timing out. What is the right pair of responses?",
  "options": [
    {
      "label": "Fall back on both: serve the last known payment approval and cached recommendations",
      "feedback": "You cannot fall back on payment authorization. Serving a stale approval ships goods you were never paid for, which is why only non-critical dependencies are fallback-able."
    },
    {
      "label": "Fail the whole checkout until both recover",
      "feedback": "This throws away revenue for a panel nobody buys. The product still sells with the recommendations missing."
    },
    {
      "label": "Render checkout without the recommendations, and fail the payment step honestly while its breaker sheds load off the sick authorizer",
      "correct": true,
      "feedback": "Right. The non-critical dependency degrades gracefully, the critical one fails honestly, and the open breaker gives the sick authorizer room to drain its queue instead of pinning it down."
    },
    {
      "label": "Retry both aggressively until one of them answers",
      "feedback": "Retrying a broadly failing dependency keeps it saturated and delays its recovery, which is the exact condition the open state exists to relieve."
    }
  ],
  "reveal": "The breaker decides whether to call a dependency at all, based on its recent health, moving Closed to Open to Half-Open so failures return instantly and a sick dependency gets room to recover. The bulkhead bounds how much of your resources any one dependency can ever consume, which covers the slow-but-not-yet-failing case the breaker misses. Fallbacks then decide what you serve instead, and only for dependencies the product can survive without."
}
\`\`\`
`.trim()

const loadSheddingDegradationTeach = `
## Load shedding protects you from too many clients

Levels 1 and 4 already covered the shedding mechanics (reject early at the edge with 429/503, bound every queue, prioritize by request class, discover the limit with adaptive concurrency); this lesson recaps those in one pass and leads with the two ideas that decide whether shedding actually saves you: goodput versus throughput, and metastable failure. Circuit breakers protect you from a sick *dependency*; load shedding protects you from too many *clients*. When demand exceeds capacity you have two choices: try to serve everyone and serve no one (collapse), or deliberately reject some requests so the rest succeed. Controlled partial service beats total collapse, every time.

## Goodput, not throughput

Throughput is requests you process; goodput is requests you process *successfully and in time*. Under overload these diverge sharply. Imagine a service that maxes out at 10k QPS of goodput. Push 20k QPS at it with no shedding and throughput climbs while goodput *falls*, because the machine spends its CPU on context switches, GC, and requests that will time out before the client sees them. You are doing 20k QPS of work and delivering maybe 3k useful responses. The extra 17k is pure waste that actively harms the 3k. Maximizing goodput means throwing away the doomed work early so the machine's capacity goes to requests that can actually complete.

## The mechanics, recapped in one pass

Levels 1 and 4 own the how, so this is only the recap. Shed at the edge with \`429 Too Many Requests\` or \`503 Service Unavailable\` plus a \`Retry-After\` header before you spend work on a request; prioritize by request class so prefetch and batch jobs die before checkout and paying-customer writes; and cap in-flight work with bounded queues and adaptive concurrency limits (a TCP-Vegas-style controller such as Netflix's \`concurrency-limits\`) rather than a bigger queue, which adds only latency and eventually an OOM. With those assumed, the rest of this lesson is *why* they work: goodput, and the metastable trap they exist to break.

## Metastable failures

\`\`\`csdiagram
{
  "type": "topology",
  "title": "A metastable failure builds, then outlives its trigger",
  "nodes": [
    {
      "id": "clients",
      "label": "Clients (retry on timeout)",
      "kind": "client"
    },
    {
      "id": "service",
      "label": "Service (ceiling: 10k QPS of goodput)",
      "kind": "service"
    },
    {
      "id": "spike",
      "label": "Traffic spike (the trigger)",
      "kind": "external"
    },
    {
      "id": "queue",
      "label": "Unbounded request queue (work waits past the client timeout)",
      "kind": "queue"
    }
  ],
  "edges": [
    {
      "from": "clients",
      "to": "service",
      "kind": "sync",
      "label": "steady demand, under the ceiling"
    },
    {
      "from": "spike",
      "to": "service",
      "kind": "sync",
      "label": "arrivals jump to 20k QPS"
    },
    {
      "from": "service",
      "to": "queue",
      "kind": "async",
      "label": "work past capacity queues instead of being refused"
    },
    {
      "from": "queue",
      "to": "clients",
      "kind": "feedback",
      "label": "timeouts, so every client retries the same work"
    }
  ],
  "stages": [
    {
      "adds": [
        "clients",
        "service"
      ],
      "note": "Steady demand sits under the 10k QPS goodput ceiling, so every accepted request still finishes inside the client's timeout. Throughput and goodput are the same number here."
    },
    {
      "adds": [
        "spike"
      ],
      "note": "The trigger arrives: 20k QPS against the same 10k ceiling. The requirement that breaks first is timeliness, not capacity, because the service is now accepting work it can never finish in time."
    },
    {
      "adds": [
        "queue"
      ],
      "note": "Nothing bounds the in-flight work, so doomed requests queue, time out, and come back as retries. Once that return arc closes, the load no longer depends on the spike: it can end and the system stays down, which is what makes the failure metastable. Only shedding demand below capacity, plus client backoff with jitter, breaks it."
    }
  ],
  "caption": "The spike starts it and the retry arc sustains it. That is why tripling the fleet does not help: the retries expand to fill whatever capacity you add."
}
\`\`\`

A metastable failure is one that *sustains itself after the original trigger is gone*. A traffic spike pushes the system into overload; the overload causes timeouts; the timeouts cause client retries; the retries add more load than the original spike; and now even after the spike passes, the retry-driven load keeps the system saturated.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "autoscale-vs-metastable",
  "prompt": "A traffic spike pushed your service into a retry-driven collapse. The spike is long over and the system is still saturated. Your autoscaler triples the app fleet. What happens?",
  "options": [
    {
      "label": "The system recovers, because capacity now exceeds demand",
      "feedback": "The demand is no longer the original spike, it is the retry loop, and retries expand to consume whatever capacity you add."
    },
    {
      "label": "It usually does not break the loop",
      "correct": true,
      "feedback": "Right. The demand is no longer the original spike, it is the retry loop, and retries expand to fill whatever capacity you add. If the bottleneck is a shared database, more app servers make it actively worse. You have to attack the feedback loop itself: shed load until demand falls below capacity, and make clients back off with jitter so the wave dissipates."
    },
    {
      "label": "The system recovers, but only once the autoscaler finishes a few seconds later",
      "feedback": "Autoscaling is minutes-slow. A retry storm can double load in seconds, so the scaler arrives at a fight that was already lost."
    },
    {
      "label": "Nothing changes, because autoscaling cannot add capacity during an incident",
      "feedback": "It can add capacity. The problem is that capacity is the wrong lever against a self-sustaining retry loop, not that it is unavailable."
    }
  ]
}
\`\`\`

Adding capacity often does not break the loop, because the retries scale up to consume it, and if the bottleneck is a shared database then more app servers make it worse. The way out is to attack the feedback loop directly: shed load aggressively to drop goodput demand below capacity, and combine it with backoff and jitter on the clients so the retry wave dissipates. Sometimes you must shed almost everything briefly to let the queues drain, then ramp back.

**Interview nuance:** the wrong turn is "we will autoscale." Autoscaling is minutes-slow and cannot outrun a retry storm that doubles load in seconds, and if the bottleneck is a shared database, more app servers make it worse. Load shedding acts in milliseconds at the edge and is the only thing that reliably breaks a metastable collapse.

**Recap:** maximize goodput not throughput by discarding doomed work early; shed cheaply at the edge with \`429\`/\`503\` and \`Retry-After\`; prioritize by request class; use admission control and bounded concurrency instead of unbounded queues; and break metastable failures with aggressive shedding plus client backoff, because autoscaling is too slow.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "goodput-under-overload",
  "prompt": "Your service tops out at 10k requests per second of goodput and 20k are arriving. Which move raises the number of users who actually get a served response?",
  "options": [
    {
      "label": "Increase the request queue depth so nothing is dropped",
      "feedback": "A deeper queue buys latency and eventually an out-of-memory kill. Requests sit until the client has already given up, so the work is wasted before it finishes."
    },
    {
      "label": "Reject about half of them at the edge with a 503",
      "correct": true,
      "feedback": "Right. Discarding doomed work early is what converts throughput into goodput: the machine's capacity goes to requests that can still finish instead of to context switches, garbage collection, and work the client already abandoned. Send a Retry-After header so the rejected clients back off, and prioritize by request class so prefetch and batch traffic die before checkout does."
    },
    {
      "label": "Serve everything and let the clients retry whatever fails",
      "feedback": "This is the metastable trap. Retries pile on top of the overload and the system stops self-recovering even after the original spike has passed."
    },
    {
      "label": "Raise every timeout so fewer requests are cut short",
      "feedback": "Longer timeouts hold threads on doomed work for longer. Goodput falls further and collapse gets closer."
    }
  ],
  "reveal": "Under overload, throughput and goodput move in opposite directions and only goodput is worth anything. Shed cheaply at the edge with 429 or 503 plus Retry-After, prioritize by request class, and cap in-flight work with bounded queues and adaptive concurrency rather than a deeper queue. That is also the only lever fast enough to break a metastable collapse, because autoscaling arrives minutes after the retry loop has already locked itself in."
}
\`\`\`
`.trim()

const redundancyFailoverTeach = `
## No single point of failure

Availability starts with a simple rule: no component whose failure takes down the system may exist as a single instance. A single point of failure (SPOF) is any box, process, or record that has no live substitute. Redundancy is having N+1 or N+2 of everything, so losing one (or two) instances still leaves enough capacity to serve.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "hidden-spofs",
  "prompt": "Three stateless web servers sit behind one load balancer, read their config from one config service at boot, and write to one database primary. How many single points of failure does that design carry?",
  "options": [
    {
      "label": "None: the web tier is redundant",
      "feedback": "The redundant tier is the part people notice. Every request still funnels through one load balancer and one primary, and every pod boots through one config service."
    },
    {
      "label": "Three: the load balancer, the database primary, and the config service, each of which quietly undoes the redundant web tier",
      "correct": true,
      "feedback": "Right. A real audit walks the request path and asks, at every hop, whether traffic stops if this single thing dies."
    },
    {
      "label": "One: the database primary, since everything else is stateless",
      "feedback": "Statelessness makes a component easy to replace, not redundant. A single stateless load balancer still stops all traffic the moment it dies."
    },
    {
      "label": "Two: the load balancer and the primary, since config is only read at boot",
      "feedback": "Boot-time dependencies are still dependencies. A config-service outage during a deploy or a scale-out event means no new pod can start, which is exactly when you need them most."
    }
  ]
}
\`\`\`

The trap is that SPOFs hide. Engineers dutifully run three web servers, then route all of them through one load balancer, one database primary, one DNS name backed by one provider, and one config service that every pod reads on boot. Each of those is a SPOF that quietly undoes the redundant web tier. A real audit walks the request path and asks, at every hop, "if this single thing dies, does traffic stop?" Load balancers need a redundant pair (or a managed multi-node LB like AWS ALB/NLB); the DB primary needs replicas plus automated promotion; DNS needs multiple providers or at least multiple authoritative servers; the config store needs a quorum (etcd/ZooKeeper run 3 or 5 nodes for exactly this reason).

## Two shapes of redundancy

**Active-active**: every instance serves live traffic, so you use the capacity you pay for and failover is instant (just stop routing to the dead one). The cost is shared state, which is hard when instances are stateful (two DB primaries accepting writes will diverge). **Active-passive**: a hot or warm standby sits idle until the primary fails, then gets promoted. Simpler to reason about because only one instance owns the state, but you pay for idle hardware and you eat a failover lag while the standby takes over.

## Health checking triggers failover

Failover has to be *triggered* by something, and that something is health checking. Three depths matter:

- **Liveness**: is the process up? (answers a TCP connect or a trivial \`/healthz\`). If it fails, restart the instance.
- **Readiness**: can this instance serve *right now*? (warmed caches, DB pool connected). If it fails, pull it from the LB pool but do not kill it.
- **Deep / dependency check**: can it reach its critical dependencies? Useful but dangerous: if your health check calls the shared database and the database blips, *every* instance fails its check at once, the LB pulls them all, and a minor blip becomes a total outage.

**Interview nuance:** the two failure modes interviewers probe are flapping and split-brain. Flapping is an instance that fails and recovers repeatedly, causing constant add/remove churn; you damp it with hysteresis (require N consecutive failures to eject, M consecutive successes to re-admit) and cooldowns. Split-brain is worse: during a network partition, a passive standby cannot tell "primary is dead" from "I just cannot reach the primary," promotes itself, and now you have two primaries taking writes. The fix is to never let a single node decide promotion. Use quorum-based leader election (Raft/Paxos, or a fencing token) so a minority side cannot win, and fence the old primary (STONITH, revoke its storage lease) before the new one takes over. Also plan failback: returning to the recovered primary is its own controlled operation, not automatic.

\`\`\`cswidget
{
  "type": "partition-sim",
  "title": "Split-brain: two primaries taking writes",
  "predictPrompt": {
    "question": "A network partition separates the primary from its passive standby. The standby cannot tell whether the primary is dead or just unreachable, so it promotes itself while the old primary keeps serving. What happens to writes?",
    "options": [
      "Both nodes accept writes and their copies of the data diverge",
      "The old primary automatically demotes itself, so only one node writes",
      "The promoted standby serves reads only, so nothing can diverge",
      "Clients notice two primaries and refuse to write to either"
    ]
  },
  "workedExample": "Cut the link and the passive standby loses contact with the primary. It cannot tell primary-is-dead from I-just-cannot-reach-the-primary, so it promotes itself, and now the old primary and the promoted standby are both live. Pick AP and both accept writes: fire them and watch the copies diverge as the old primary marks the order shipped while the new primary cancels it, each side committing confidently. On heal there is no good merge. Last-writer-wins keeps whichever write carries the later timestamp and silently discards the other primary's committed write, a loss no merge rule can honestly fix. Pick CP instead and you get what quorum-based leader election enforces: the minority side cannot win, so the isolated node stops accepting writes and a second primary never exists. That is why promotion must never be one lonely standby's decision.",
  "kind": "register",
  "writes": [
    {
      "side": "A",
      "value": "shipped",
      "label": "old primary: marks order 1042 shipped"
    },
    {
      "side": "B",
      "value": "cancelled",
      "label": "promoted standby: cancels order 1042"
    }
  ],
  "strategies": [
    "lww"
  ],
  "caption": "The real fix is making dual-primary impossible, not merging after the fact: quorum-based leader election so a minority side cannot win, and fencing the old primary (STONITH, revoke its storage lease) before the new one takes over."
}
\`\`\`

\`\`\`
        clients
           |
     [ DNS: 2 providers ]
           |
   [ LB pair, active-active ]
        /        \\
   web-1       web-2 ... web-N     (N+2, stateless, readiness-gated)
        \\        /
   [ DB primary ]==async/sync==>[ replica ]
     leader elected via quorum; fence old primary on failover
\`\`\`

**Recap:** eliminate every SPOF (LB, DB primary, DNS, config) with N+1/N+2 redundancy, pick active-active for instant failover or active-passive for simpler state, gate traffic with liveness/readiness/deep checks, and use quorum election plus fencing and hysteresis to avoid split-brain and flapping.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "health-check-depth",
  "prompt": "Sort each statement by the depth of health check it describes.",
  "buckets": [
    "Liveness",
    "Readiness",
    "Deep dependency check"
  ],
  "items": [
    {
      "label": "Answers a TCP connect or a trivial healthz endpoint",
      "bucket": "Liveness"
    },
    {
      "label": "Failing it should restart the process",
      "bucket": "Liveness"
    },
    {
      "label": "Fails while caches are still warming after a restart",
      "bucket": "Readiness"
    },
    {
      "label": "Failing it should pull the instance out of the pool but leave it running",
      "bucket": "Readiness",
      "feedback": "The instance is alive and will be useful shortly, so killing it would only lengthen the outage."
    },
    {
      "label": "Queries the shared database on every probe",
      "bucket": "Deep dependency check"
    },
    {
      "label": "Can turn a brief database blip into a total outage by failing every instance at once",
      "bucket": "Deep dependency check",
      "feedback": "Every instance shares the dependency, so they all fail the probe together and the load balancer ejects the entire fleet."
    }
  ],
  "reveal": "Eliminate every single point of failure with N+1 or N+2, including the load balancer, the primary, DNS, and the config store. Active-active uses the capacity you already pay for and fails over instantly but forces you to share state, while active-passive keeps one owner of the state and pays with idle hardware and failover lag. Health checks trigger the failover, hysteresis stops an instance flapping in and out of the pool, and promotion goes through quorum election plus fencing so a partitioned standby can never become a second primary."
}
\`\`\`
`.trim()

const drRtoRpoTeach = `
## DR is a set of promises, proven by drills

Disaster recovery is not "we have backups." It is a set of promises about how fast you come back and how much data you lose, made per system, and *proven* by drills. The two numbers that anchor everything are RTO and RPO.

**RTO (Recovery Time Objective)** is the maximum tolerable downtime: how long the system can be unavailable before the business is unacceptably harmed. **RPO (Recovery Point Objective)** is the maximum tolerable data loss, measured in time: if you can lose at most 5 minutes of data, your RPO is 5 minutes, which means your recovery point can be no older than 5 minutes before the disaster. RTO is about the clock; RPO is about the data. A checkout system might need RTO of minutes and RPO near zero; a marketing analytics warehouse might be fine with RTO of a day and RPO of an hour.

## The strategy ladder

These numbers set your strategy, because recovery speed costs money. The industry ladder, cheapest and slowest first:

\`\`\`csdiagram
{
  "type": "ladder",
  "title": "The DR strategy ladder: readiness and cost rise, RTO/RPO fall",
  "scale": "linear",
  "bands": [
    {
      "label": "Backup & restore",
      "value": 1,
      "display": "RTO hours to days",
      "note": "Periodic snapshots to durable storage (S3, cross-region); on disaster you provision infra and restore. RPO is only as good as your backup cadence. Cheapest; fine for non-critical tiers."
    },
    {
      "label": "Pilot light",
      "value": 2,
      "display": "RTO tens of minutes",
      "note": "Critical data continuously replicated and a minimal always-on core (the database) in the DR region; app servers stay off until you start and scale them on disaster."
    },
    {
      "label": "Warm standby",
      "value": 3,
      "display": "RTO minutes",
      "note": "A scaled-down but fully functional copy runs in the DR region all the time; on disaster you fail over and scale up."
    },
    {
      "label": "Multi-site active/active",
      "value": 4,
      "display": "RTO and RPO near zero",
      "note": "Full capacity live in 2+ regions with traffic already flowing to both, so a region loss is just a traffic shift. The most expensive rung by far."
    }
  ],
  "caption": "Tier your systems and pick the cheapest rung that meets each tier's numbers: the payment ledger might warrant warm standby while the recommendation model lives on backup & restore."
}
\`\`\`

- **Backup & restore**: periodic snapshots to durable storage (S3, cross-region). On disaster you provision infra and restore. Cheapest, RTO in hours, RPO as good as your backup cadence. Fine for non-critical tiers.
- **Pilot light**: keep the critical data continuously replicated to the DR region and a minimal always-on core (the database), but application servers are off. On disaster you start and scale the app tier. RTO in tens of minutes.
- **Warm standby**: a scaled-down but fully functional copy runs in the DR region all the time. You fail over and scale up. RTO in minutes.
- **Multi-site active/active**: full capacity live in two or more regions, traffic already flowing to both. A region loss is just a traffic shift. RTO/RPO near zero, and the most expensive by far.

The senior move is to **tier your systems** and apply a different rung to each. Your payment ledger might warrant warm standby; your recommendation model can live on backup & restore. Spending active/active money on a system whose users would not notice an hour of downtime is a classic waste.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "failover-replicates-corruption",
  "prompt": "A bad migration silently corrupts a table at 09:00. You run multi-site active/active with an RPO near zero, so you fail over to the other region. What do you get?",
  "options": [
    {
      "label": "A clean copy, because the second region was not the one running the migration",
      "feedback": "Replication does not judge the data it carries, it copies it. Both regions now hold the same corrupted rows."
    },
    {
      "label": "The same corrupted data, just faster, because replication shipped the corruption to the other region well inside the RPO",
      "correct": true,
      "feedback": "Right. A near-zero RPO is a promise about freshness, and corruption is fresh. You recover from this with point-in-time restore from immutable backups, never with failover."
    },
    {
      "label": "The pre-corruption data, because failover reverts to the last good snapshot",
      "feedback": "Failover switches which region serves traffic. It does not move time backwards, which is what point-in-time restore is for."
    },
    {
      "label": "A partial copy, since replication lag would have left some of the corruption behind",
      "feedback": "Tempting, because lag sounds protective. You cannot plan on corruption being in flight, and here replication is deliberately fast anyway."
    }
  ]
}
\`\`\`

## Interview nuance: name the disaster types

Name the disaster *types*, because they need different recovery. **Region loss** (fire, flood, power) is what most people picture and multi-region solves. **Data corruption or a bad migration** is different: it replicates *instantly* to your standby, so failover just gives you the corrupted data faster. You recover corruption with point-in-time restore from immutable backups, not failover. **Ransomware** is different again: it may sit dormant and encrypt your backups too, so you need immutable, air-gapped (or object-lock) backups the attacker cannot reach. A DR plan that only handles "the region went away" fails the other two.

And the line that separates real DR from theater: **an untested backup is not a DR plan.** Backups silently rot, restore scripts break, permissions drift, and the one time you need it you discover the restore takes 14 hours or fails. Real DR means restore-drills, documented runbooks, and periodic game-days where you actually fail over and time it against your stated RTO.

**Recap:** RTO is tolerable downtime, RPO is tolerable data loss, both set per tier; pick the cheapest rung on the backup -> pilot-light -> warm-standby -> active/active ladder that meets the tier's numbers; handle corruption and ransomware (not just region loss) with immutable/air-gapped backups; and prove it with restore drills and game-days or it is not a plan.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "tier-the-ladder",
  "prompt": "A marketing analytics warehouse tolerates a day of downtime and an hour of lost data. The payment ledger tolerates minutes of downtime and near-zero loss. What does a senior answer propose?",
  "options": [
    {
      "label": "Multi-site active/active for both, so nothing is a weak link",
      "feedback": "This spends the most expensive rung's money on a system whose users would not notice an hour of downtime. RTO and RPO are set per tier for exactly this reason."
    },
    {
      "label": "Backup and restore for both, accepting the risk on the ledger",
      "feedback": "Hours of recovery time on the payment ledger is the outcome those numbers were written down to prevent."
    },
    {
      "label": "Warm standby for the ledger, backup and restore for the warehouse, with a timed restore drill on both",
      "correct": true,
      "feedback": "Right. Each tier takes the cheapest rung that meets its own numbers, and the drill is what turns the stated numbers into evidence rather than hope."
    },
    {
      "label": "Pilot light for both, as a compromise between the two",
      "feedback": "Averaging the tiers gives the ledger a slower recovery than it needs and hands the warehouse a bill it does not. The ladder exists so each tier can choose independently."
    }
  ],
  "reveal": "RTO is tolerable downtime and RPO is tolerable data loss, both set per tier, and the ladder from backup and restore through pilot light and warm standby to multi-site active/active trades money for both numbers. Plan for three disaster types rather than one: region loss is what failover solves, while corruption and ransomware are not, and they need point-in-time restore from immutable, air-gapped backups. An untested backup is not a plan, so drills and game-days are what make the promise real."
}
\`\`\`
`.trim()

const multiRegionTeach = `
## Multi-AZ and multi-region are different tools

Multi-AZ and multi-region are not the same tool, and conflating them is a common tell. Know exactly what each buys and what it costs.

**Multi-AZ** spreads a system across Availability Zones: physically separate data centers within one region, tens of km apart, connected by fast, low-latency (single-digit ms) links. Because latency between AZs is tiny, you can replicate **synchronously** across them cheaply, so multi-AZ is the default for HA.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "multi-az-is-not-multi-region",
  "prompt": "Your database is multi-AZ with synchronous replication across three availability zones in one region. A region-wide provider outage takes that region out. What happens to your service?",
  "options": [
    {
      "label": "It stays up: three zones are three physically separate data centers",
      "feedback": "Three data centers, one region. Multi-AZ protects against losing a building, not against losing the region all three of them sit in."
    },
    {
      "label": "It goes down: every zone is inside the failed region",
      "correct": true,
      "feedback": "Right. Multi-AZ is high availability within a region, not disaster recovery across regions. It is cheap precisely because the zones sit close enough for synchronous replication, and that closeness is exactly why all three share a regional fate. Surviving the loss of a region means paying for a copy in a different one."
    },
    {
      "label": "It stays up with higher latency, since traffic reroutes to another region",
      "feedback": "Nothing reroutes unless you built and paid for a copy somewhere else. A multi-AZ deployment has no other region to fall to."
    },
    {
      "label": "It stays up, because synchronous replication guarantees a reachable live copy",
      "feedback": "Synchronous replication guarantees the copy is current, not that it sits outside the blast radius. All three copies are in the region that just failed."
    }
  ]
}
\`\`\`

So multi-AZ protects against a data-center failure (power, cooling, a fire in one building) but *not* against a whole-region outage, and not against region-wide control-plane failures. The closeness that makes synchronous replication cheap is exactly what gives all three zones a shared regional fate.

**Multi-region** spreads across regions hundreds or thousands of km apart, with 50-150+ ms of round-trip latency between them. It protects against losing an entire region (natural disaster, region-wide provider outage, regulatory blackout). But that latency changes everything about data: synchronous replication across regions would add 100+ ms to every write, so you almost always replicate **asynchronously**, which means the remote copy lags and a region loss can lose the un-replicated tail. Multi-region is expensive (full or partial stacks in each region, cross-region data transfer, more operational surface) and it makes consistency genuinely hard.

## The consistency crux (CAP made concrete)

Across a WAN partition you cannot have both strong consistency and full availability:

- **Sync replication**: a write is acknowledged only after it lands in the remote region. RPO is zero, but every write eats the cross-region round trip, and if the remote region is unreachable your writes stall (you chose consistency over availability).
- **Async replication**: acknowledge locally, ship to the remote region in the background. Writes are fast and stay available, but the remote copy lags (seconds), so a sudden region loss loses the in-flight tail (non-zero RPO), and reads from the remote region can be stale.

For **active-passive** multi-region (one region serves, the other is a hot standby), async is standard: the passive region trails by seconds, and on failover you accept that small RPO. Simple, one writer, no conflicts.

For **active-active** multi-region (both regions take writes), you now have two places accepting writes to the same data, and reconciling them is the whole problem. Options:

- **Single-writer-region per record**: partition ownership so each record (or shard/tenant) has exactly one home region that owns its writes; other regions forward writes there or serve read-only. Avoids conflicts entirely at the cost of cross-region write latency for non-local records. This is the most common sane choice.
- **Conflict resolution**: allow writes anywhere and reconcile. Last-writer-wins (simple, silently drops one update), vector clocks (detect conflicts, push resolution to the app), or **CRDTs** (conflict-free replicated data types that merge deterministically, great for counters/sets/carts, not for everything).
- **Globally consistent stores** like Spanner or CockroachDB use synchronized clocks (TrueTime) and consensus to give strong consistency across regions, paying the latency, so you do not hand-roll conflict logic.

\`\`\`cswidget
{
  "type": "partition-sim",
  "title": "Active-active regions: one record, two writers",
  "predictPrompt": {
    "question": "The WAN link between us-east and eu-west is cut, and both regions accept a write to the same contact-email record. When the link heals and last-writer-wins reconciles, what does the record hold?",
    "options": [
      "Both updates, kept side by side as siblings",
      "Only the update with the later timestamp; the other is silently dropped",
      "Neither update; both regions roll back to the pre-partition value",
      "The regions stall until an operator merges the two by hand"
    ]
  },
  "workedExample": "Cut the link and you have a WAN partition between two active-active regions. Pick CP and one side must stop taking writes, which is what single-writer-region gives you: no conflict, but writes to a non-local record stall or forward. Pick AP and both regions keep accepting writes locally with async replication, so fire the writes: us-east sets the record one way, eu-west sets it another, and the two copies diverge. On heal, replication finally ships both versions and the store must reconcile. Last-writer-wins is the simple option and it does exactly what the lesson warns: it keeps whichever write carries the later timestamp and silently drops the other region's update. Switch to version vectors and the store instead detects that neither write saw the other, surfaces both as conflicting siblings, and pushes the resolution to the app. Neither choice is free consistency; that is the whole active-active problem.",
  "kind": "register",
  "writes": [
    {
      "side": "A",
      "value": "ana@newmail.com",
      "label": "us-east: a support agent updates the contact email"
    },
    {
      "side": "B",
      "value": "ana.k@corp.com",
      "label": "eu-west: the customer updates the same contact email"
    }
  ],
  "strategies": [
    "lww",
    "version-vector"
  ],
  "caption": "Two regions accepting writes to the same data is the whole problem: avoid conflicts with single-writer-region, resolve them (LWW silently drops one update, version vectors detect and push resolution to the app, CRDTs merge), or pay a Spanner-class store's latency."
}
\`\`\`

Traffic steering sits on top: **GeoDNS** (route by client location, but DNS TTL caching makes failover slow), a **global load balancer / anycast** (AWS Global Accelerator, Cloudflare) that health-checks regions and shifts traffic in seconds. Health-based failover moves traffic off a dead region automatically.

**Interview nuance:** two things separate strong answers. First, **cell-based and shuffle-sharding** thinking applies here: an active-active pair still shares a blast radius if a bad config or poison request replicates to both, so regions should fail independently and you must **test region evacuation** (actually drain a region) rather than assume it works. Second, do not claim multi-region gives strong consistency for free. It does not. You either pay cross-region latency (sync/Spanner) or accept eventual consistency and design conflict resolution. Saying "we go multi-region active-active and everything is consistent and fast" is the wrong turn interviewers wait for.

**Recap:** multi-AZ is cheap synchronous HA within a region; multi-region is expensive async protection against region loss; sync gives RPO~0 but latency and stall risk while async gives speed but lag/loss; active-active forces a consistency choice (single-writer-region, CRDTs, or a Spanner-class store); steer with GeoDNS/global-LB health-based failover and actually test region evacuation.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "active-active-consistency-claim",
  "prompt": "A candidate says: we will run active-active in two regions, both accepting writes to the same records, with strong consistency and no added write latency. What is the interviewer waiting to hear?",
  "options": [
    {
      "label": "That is fine as long as replication is asynchronous",
      "feedback": "Async is what makes those writes fast and available, and it is also what makes the remote copy lag and the two copies conflict. It buys the speed by giving up the consistency claim."
    },
    {
      "label": "You cannot have all three across a WAN",
      "correct": true,
      "feedback": "Right. Strong consistency, writes accepted in both regions, and no added write latency do not come together across a wide-area link. Either you pay the cross-region round trip with synchronous replication or a globally consistent store such as Spanner, or you accept eventual consistency and own a conflict story. Single-writer-region per record is the most common sane choice: it avoids conflicts entirely at the cost of cross-region write latency for non-local records."
    },
    {
      "label": "Multi-region is always the wrong call, and multi-AZ is enough",
      "feedback": "This over-corrects. Multi-region is the only thing that survives losing a region, so the job is to price it honestly rather than to avoid it."
    },
    {
      "label": "GeoDNS solves it by routing each user to their nearest region",
      "feedback": "Steering decides where a request lands, not how two regions agree about one record. DNS TTL caching also makes it slow to fail over."
    }
  ],
  "reveal": "Multi-AZ is cheap synchronous high availability inside one region, and multi-region is expensive asynchronous protection against losing that region. Synchronous gives an RPO near zero and pays in latency and stall risk, asynchronous gives speed and pays in lag and a lost tail. Active-active forces a real consistency choice, traffic steering rides on top through GeoDNS or a health-checking global load balancer, and none of it is trustworthy until you have actually drained a region on purpose."
}
\`\`\`
`.trim()

const blastRadiusCellsTeach = `
## Blast-radius reduction limits how many users a failure hurts

Redundancy keeps you up when a component dies. Blast-radius reduction limits *how many users* any single failure, bad deploy, or poison input can hurt. The two are different: a perfectly redundant global fleet can still be taken down entirely by one bad config that every node loads. The goal here is that no single failure affects more than a small fraction of customers.

## Cell-based architecture

Instead of one big shared stack serving all users, you run many independent, isolated **cells**, each a complete stack (LB, app, database, cache) serving a fixed subset of users. Cells share nothing at runtime: a failure, a bad deploy, an overloaded database, or a poison request in cell 7 cannot reach cells 1 through 6. If you have 20 cells and one fails, ~5% of users are affected, not 100%. A thin routing layer maps each user to their cell (by user id hash or tenant id) and is kept deliberately simple so it is not itself a fragile shared brain.

\`\`\`
        [ thin cell router: user_id -> cell ]
        /        |          |          \\
     cell-1    cell-2     cell-3  ...  cell-N     (each: full independent stack)
     LB/app    LB/app     LB/app       LB/app
     +DB       +DB        +DB          +DB
   failure in cell-3 stays in cell-3  ->  ~1/N of users affected
\`\`\`

Cells also transform deploys: you roll a change **cell by cell** (a form of canary at the cell granularity), watch health, and stop after one cell if it regresses. A bad deploy hits one cell's worth of users, then halts.

## Shuffle sharding

Shuffle sharding sharpens isolation for shared-worker pools where full cells are too coarse. Suppose 8 workers and you assign each customer 2 of them at random. With plain sharding (each customer pinned to 1 worker), a customer who sends poison traffic takes down everyone on that worker. With shuffle sharding, each customer gets a *unique combination* of 2 workers out of 8 (28 possible pairs). A noisy or malicious customer degrades only their 2 workers; another customer overlapping on at most one of those workers still has a second healthy worker and stays up. With enough workers and picks, the probability that two customers share their *entire* combination is tiny, so one poison tenant is isolated to a handful of others rather than everyone. AWS Route 53 and API Gateway use this to contain abusive customers.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Shuffle-shard overlap odds (3 workers per customer)",
  "predictPrompt": {
    "question": "The lesson's 8 workers with 2 picks gave 28 combinations, so full overlap is 1 in 28. Keep 8 workers but give each customer 3 picks instead. What happens to the chance another customer shares your ENTIRE combination?",
    "options": [
      "It rises: sharing more workers means more overlap",
      "It halves, to 1 in 56, because 8 choose 3 is 56 combinations",
      "It is unchanged: the pool is still 8 workers"
    ]
  },
  "workedExample": "With 8 workers and 3 picks per customer there are 56 possible combinations (8 choose 3), so the chance a specific other customer holds your exact trio is 3/8 x 2/7 x 1/6 = 1/56, about 1.8 percent. With 1000 customers, expect about 1000 x 1/56, roughly 18 customers who fully share your combination. Slide workers to 16 and the odds drop to 3/16 x 2/15 x 1/14 = 1/560, about 0.18 percent: roughly 2 of the same 1000 customers.",
  "inputs": [
    {
      "kind": "slider",
      "id": "n",
      "label": "Workers in the pool",
      "min": 4,
      "max": 32,
      "step": 1,
      "scale": "linear",
      "initial": 8
    },
    {
      "kind": "slider",
      "id": "customers",
      "label": "Customers in the pool",
      "min": 100,
      "max": 1000000,
      "scale": "log",
      "initial": 1000
    }
  ],
  "outputs": [
    {
      "id": "comboProb",
      "label": "Chance another customer shares your ENTIRE trio",
      "expr": "3 / n * (2 / (n - 1)) * (1 / (n - 2))",
      "format": "percent"
    },
    {
      "id": "expectedFullOverlap",
      "label": "Expected customers sharing your exact trio",
      "expr": "customers * comboProb",
      "format": "number",
      "sparkline": {
        "over": "n"
      }
    }
  ],
  "caption": "Three picks means all three must match: the odds now fall with roughly n cubed, which is why enough workers and picks make one poison customer a rounding error."
}
\`\`\`

Blast radius is a lens you apply everywhere, not just to compute: **deploys** (canary/cell-by-cell), **data** (partition so one corrupt shard is not the whole dataset), and **dependencies** (bulkheads and circuit breakers so one slow downstream does not exhaust every thread).

## Control plane vs data plane, and static stability

**Separate control plane from data plane.** The data plane serves user requests (the hot path). The control plane manages the system: config changes, scaling decisions, deployments, service discovery, health orchestration. Control planes are complex and change often, so they fail more. If your data plane *depends on the control plane being up to serve requests*, then a control-plane outage becomes a user-facing outage. The rule: the data plane must keep serving even while the control plane is down.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "static-stability-no-data",
  "prompt": "The control plane that reports which backends are healthy goes dark, so your load balancer stops receiving health data. What should it do with traffic?",
  "options": [
    {
      "label": "Eject every backend, since none can be confirmed healthy any more",
      "feedback": "This is the classic cascade: no data gets treated as all dead, and a control-plane hiccup becomes a total user-facing outage."
    },
    {
      "label": "Keep routing to the last-known-healthy set and take no new action that needs the control plane",
      "correct": true,
      "feedback": "Right, and that is static stability in one sentence: keep working on last-known-good state and defer anything that requires the missing dependency."
    },
    {
      "label": "Fail every request with a 503 until health data returns",
      "feedback": "The same outage with a different status code. The backends are almost certainly still serving, and only the reporting path broke."
    },
    {
      "label": "Restart the backends so they report fresh health",
      "feedback": "Taking a new action that depends on the missing control plane is exactly what static stability forbids, and restarting healthy servers turns a reporting outage into a real one."
    }
  ]
}
\`\`\`

Which brings in **static stability**, the AWS-coined principle that ties this together: a system is statically stable if it keeps working on its **last-known-good state** when its dependencies (especially the control plane) are unavailable, taking **no new action** that requires them. The canonical example: an EC2 instance keeps running even if the EC2 control-plane API is down, because running instances do not need the control plane; you just cannot *launch new ones* until it recovers. Applied to your design: cache config locally and keep serving the last-known-good config if the config service is unreachable, rather than failing or blocking. Load balancers should keep routing to the last-known-healthy set if the health-check control plane blips, rather than assuming "no data means all dead" and ejecting everyone. The failure mode static stability prevents is a control-plane hiccup cascading into a total data-plane outage.

**Interview nuance:** the wrong turn interviewers listen for is a design where "one bad tenant or one bad deploy takes down everyone," or where the data plane cannot serve a single request because a control-plane component (config store, service discovery, a central auth service) is briefly down. Strong answers bound impact with cells/shuffle-sharding *and* make the data plane statically stable so it coasts on cached state through control-plane failures.

**Recap:** cells give independent isolated stacks so one failure hits ~1/N of users, shuffle sharding gives each customer a unique worker combination to isolate noisy tenants, apply blast-radius thinking to deploys/data/dependencies, separate control plane from data plane, and use static stability so the data plane keeps serving last-known-good state when the control plane is down.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "redundancy-vs-blast-radius",
  "prompt": "A globally redundant fleet of 3,000 identical servers pushes one bad config that every node loads. How many users are hurt, and what would have bounded it?",
  "options": [
    {
      "label": "All of them, and the fix is more replicas",
      "feedback": "More replicas of the same shared fate change nothing, because every additional node loads the same poison."
    },
    {
      "label": "All of them, and independent cells would have bounded it",
      "correct": true,
      "feedback": "Right. Every node loaded the same poison, so redundancy bought nothing here: it keeps you up when a component dies, while blast-radius reduction limits how many users any one change or poison input can reach. Independent cells would have held this to roughly one Nth of users, because the change rolls cell by cell and stops after the first cell regresses. Different properties, and a serious design needs both."
    },
    {
      "label": "About a third, since a config rollout moves one availability zone at a time",
      "feedback": "Nothing in this design stops the change at a zone boundary. Zones bound hardware and facility failures, not a config that every node reads."
    },
    {
      "label": "None: the redundant fleet routes around the bad nodes",
      "feedback": "There is nothing healthy left to route to. Every node loaded the same config, which is precisely the difference between redundancy and blast-radius reduction."
    }
  ],
  "reveal": "Cells give each slice of users a complete independent stack, so a failure, a bad deploy, or a poison request stays inside one cell and hits roughly one Nth of users. Shuffle sharding gives each customer a unique combination of workers so a noisy tenant degrades only the few who overlap with them. The same lens applies to deploys, data, and dependencies. Then separate the control plane from the data plane and make the data plane statically stable, so it keeps serving last-known-good state while the control plane is down instead of failing along with it."
}
\`\`\`
`.trim()

const deploymentStrategiesTeach = `
## Most outages are self-inflicted by a change

A deploy is a change to a running system, and most outages are self-inflicted by a change. The whole discipline of release engineering is about making that change small, observable, and reversible. Three strategies dominate, and they trade infra cost against rollback speed and blast radius.

**Rolling** replaces instances in place, a few at a time. You have N pods; the orchestrator (Kubernetes Deployment with \`maxSurge\`/\`maxUnavailable\`) drains and replaces them in batches until every pod runs the new version. Cost is near zero (no extra fleet), but rollback is slow because "rolling back" is just another rolling deploy in reverse, and during the roll both versions serve live traffic simultaneously. That last fact is the source of most rolling-deploy surprises.

**Blue-green** stands up a full second environment (green) alongside the live one (blue), warms it, smoke-tests it, then flips the router/load-balancer to send 100% of traffic to green in one move. Rollback is instant: flip the router back to blue, which is still running. The cost is doubling your fleet for the duration, plus the hard part that the shared database must be compatible with both versions at the moment of the flip and the moment of the flip-back.

**Canary** routes a small slice (1%, then 5%, 25%, 50%, 100%) of real production traffic to the new version and watches it. It has the smallest blast radius of the three because a bad build only touches 1% of users before you catch it. Canary is only as good as its **automated analysis**: a system (Argo Rollouts + Prometheus, Spinnaker + Kayenta, Flagger) that compares the golden signals (error rate, p99 latency, saturation) of the canary against the baseline over a **bake time** at each step, and auto-aborts if the canary's SLIs diverge. Without automated analysis a canary is just a slow manual deploy where a human squints at a dashboard.

\`\`\`
Rolling:   [v1 v1 v1 v1] -> [v2 v1 v1 v1] -> [v2 v2 v1 v1] -> [v2 v2 v2 v2]   (both versions live mid-roll)
Blue-Green: blue=100% live | green warmed --smoke ok--> router flip --> green=100% (blue idle, instant rollback)
Canary:    v2 gets 1% -> analyze -> 5% -> analyze -> 25% -> ... auto-abort if SLIs diverge
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "rollback-is-not-a-redeploy",
  "prompt": "Your rollback plan is: revert the commit, rebuild, and run the rolling deploy again. During a SEV1 caused by the last release, how good is that plan?",
  "options": [
    {
      "label": "Excellent: rollback is just a deploy in reverse, so it takes seconds",
      "feedback": "A rolling deploy in reverse is still a rolling deploy: build, drain, replace, batch by batch, with both versions live throughout."
    },
    {
      "label": "Minutes at best, on a path you have never rehearsed",
      "correct": true,
      "feedback": "Right. A rolling deploy in reverse is still a rolling deploy: build, drain, replace, batch by batch, with both versions live throughout, and you are running it for the first time during a SEV1. Blue-green or a feature flag turns rollback into a routing change instead, measured in seconds, because the old version is still running or the new behavior is still gated."
    },
    {
      "label": "Instant, because the old container image is still cached on the nodes",
      "feedback": "A cached image saves the pull. It does not save the rebuild, the rollout, or the drain, and it does nothing to make the path rehearsed."
    },
    {
      "label": "It does not matter, because you can roll forward with a fix instead",
      "feedback": "Rolling forward means authoring and testing new code while users are down. During an incident you want the change reversed first and understood afterwards."
    }
  ]
}
\`\`\`

## Separate deploy from release

**Interview nuance:** separate *deploy* from *release*. Deploy means the new code is present on machines; release means live traffic is running on it. Blue-green and flags let you deploy without releasing, which is what makes rollback a routing change (seconds) instead of a rebuild (minutes). If your rollback path is "redeploy the old version," you do not have a fast rollback, you have a slow one you have not tested.

The trap that ties this module together is the **destructive schema change**. During any of these strategies old and new code run at the same time (mid-roll, at the blue-green flip, during a canary). If the new deploy drops or renames a column the old code still reads, the old version breaks the instant the migration runs, and you cannot roll back the code because the schema is already gone. Schema changes must be backward compatible with the currently deployed version, which is the next lesson.

**Recap:** rolling is cheap but slow to reverse, blue-green buys instant rollback for double the fleet, canary gives the smallest blast radius but needs automated analysis and bake time, and every strategy runs two versions at once so never ship a destructive schema change inside a code deploy.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "destructive-change-mid-roll",
  "prompt": "Mid-roll, half your pods run v1 and half run v2. The v2 release also runs a migration that drops the email column, which v1 still selects. What happens?",
  "options": [
    {
      "label": "Nothing, because the rollout finishes quickly",
      "feedback": "Rolling deploys replace pods in batches and both versions serve live traffic for the whole window. Every v1 pod breaks the instant the migration commits."
    },
    {
      "label": "The v1 pods start failing, and you cannot roll the code back because the column no longer exists",
      "correct": true,
      "feedback": "Right, and that is the trap that ties this module together: the code is reversible, the schema change is not, so the two must never ship together."
    },
    {
      "label": "The orchestrator rolls back automatically once the v1 pods fail their readiness checks",
      "feedback": "It can halt or reverse the rollout, but reverting to v1 puts you back on code that reads a column the database no longer has. A routing move cannot undo a dropped column."
    },
    {
      "label": "Only the canary slice is affected, because a canary bounds the blast radius",
      "feedback": "A canary bounds who sees the new code. The migration runs against the shared database, so it reaches every version at once."
    }
  ],
  "reveal": "Rolling is cheap and slow to reverse, blue-green buys instant rollback for double the fleet, and canary gives the smallest blast radius but is only as good as the automated analysis and bake time behind it. All three run two versions at once, so separate deploy from release to make rollback a routing change, and never let a destructive schema change ride along inside a code deploy."
}
\`\`\`
`.trim()

const progressiveDeliverySchemaTeach = `
## Ship code dark, turn it on gradually

Progressive delivery is the practice of shipping code dark and then turning it on gradually, independent of the deploy. The two tools are **feature flags** for behavior and the **expand/contract** pattern for schema. Both exist because, during any rollout, old and new code run at the same time, so every change in flight must be both backward compatible (old code tolerates the new state) and forward compatible (new code tolerates the old state).

## Feature flags

Feature flags are runtime conditionals (\`if flag('new_pricing_engine', user)\`) evaluated against a flag service (LaunchDarkly, Unleash, Statsig, or a homegrown config-plus-Redis setup). They decouple deploy from release: you deploy the new code disabled, then flip it on for 1% of users, then 100%, and if it misbehaves you flip it off in seconds without a redeploy. That kill switch is the point. Flags also target: by percentage, by user segment, by geo, by tenant, or by an allowlist, which is how you dogfood internally, then beta a cohort, then GA. The same flag doubles as a **feature circuit breaker**, cut a struggling feature to shed load during an incident. The tax is flag debt: every flag is a live branch, so you must remove flags after full rollout or they rot into untested dead paths.

## Expand/contract (parallel change)

Expand/contract migrates schema in ordered, individually-safe steps so that at no point does the deployed code disagree with the schema:

\`\`\`
1. EXPAND    add the new column/table (nullable, additive) -- old code unaffected
2. DUAL-WRITE deploy code that writes BOTH old and new; reads still from old
3. BACKFILL  copy historical rows old -> new, throttled + idempotent + restartable
4. MIGRATE READS switch reads to the new column (behind a flag), verify parity
5. CONTRACT  once nothing reads the old column, stop dual-writing, then drop old
\`\`\`

Each arrow is a separately deployable, separately reversible step. You never combine "add new" with "drop old" in one deploy, because that is exactly the destructive change that makes rollback impossible.

For the physical DDL on a large hot table, a naive \`ALTER TABLE\` can lock the table and stall writes. **Online schema-change tools** (gh-ost, pt-online-schema-change for MySQL) build a shadow table, backfill it while capturing live changes via triggers or the binlog, and swap it in with a brief atomic rename, so the table stays writable throughout. On Postgres the same step looks different: \`ADD COLUMN ... NULL\` is metadata-only and never rewrites the table, so the risk moves to the backfill, which you run as batched \`UPDATE\`s over key ranges with a short \`lock_timeout\` (the setting that makes a statement give up quickly instead of queueing on a lock and blocking every writer behind it). Backfills must be **throttled** (chunked, watching replica lag), **idempotent** (safe to re-run), and **restartable** (checkpoint progress) because a multi-hour backfill will get interrupted.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "rename-is-never-one-step",
  "prompt": "A ticket asks you to rename the email column to email_address. It is one line of DDL, and you run it during a rolling deploy. What happens?",
  "options": [
    {
      "label": "Nothing, as long as the new code ships in the same release",
      "feedback": "During any rollout both versions run at once. The still-deployed old instances select the old name, and it stops existing the instant the statement commits."
    },
    {
      "label": "The old instances break immediately, and you cannot roll the code back because the old column name is gone",
      "correct": true,
      "feedback": "Right. The code is reversible and the schema change is not, which is why a rename in a live system is always expand, dual-write, backfill, migrate reads, then contract."
    },
    {
      "label": "The database keeps the old name as an alias, so old queries keep working",
      "feedback": "A rename is not an alias. The old name stops resolving and every query that uses it errors."
    },
    {
      "label": "It locks the table for a while, but every query still succeeds once it completes",
      "feedback": "Locking is a real and separate hazard on a large hot table. Even with zero lock time, the rename by itself is what breaks the deployed code."
    }
  ]
}
\`\`\`

**Interview nuance:** the classic disaster is renaming a column. \`ALTER TABLE users RENAME COLUMN email TO email_address\` looks trivial and is a trap: the instant it runs, every still-deployed old instance that selects \`email\` breaks, and you cannot roll the code back because the column named \`email\` no longer exists. The correct answer is expand/contract: add \`email_address\`, dual-write, backfill, migrate reads, then drop \`email\` in a later deploy. A rename is never one step in a live system.

**Recap:** flags decouple release from deploy and give you a per-feature kill switch and targeting, expand/contract migrates schema in individually-safe reversible steps, everything in flight must be backward and forward compatible, and never pair "add new" with "drop old" in a single deploy.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "safe-step-vs-breaks-rollback",
  "prompt": "Sort each schema move by whether it is safe on its own or destroys your ability to roll back.",
  "buckets": [
    "Individually safe step",
    "Breaks rollback"
  ],
  "items": [
    {
      "label": "Add a nullable column that nothing reads yet",
      "bucket": "Individually safe step"
    },
    {
      "label": "Deploy code that writes both the old and the new column",
      "bucket": "Individually safe step"
    },
    {
      "label": "Backfill historical rows in throttled, idempotent, restartable batches",
      "bucket": "Individually safe step",
      "feedback": "Additive and re-runnable, which is what lets a multi-hour backfill be interrupted and resumed without drama."
    },
    {
      "label": "Switch reads to the new column behind a flag",
      "bucket": "Individually safe step",
      "feedback": "Reversible in seconds by flipping the flag back, which is the whole reason reads move behind one."
    },
    {
      "label": "Add the new column and drop the old one in the same deploy",
      "bucket": "Breaks rollback",
      "feedback": "Pairing add-new with drop-old is the single combination expand and contract exists to forbid."
    },
    {
      "label": "Rename a column the currently deployed code still selects",
      "bucket": "Breaks rollback"
    },
    {
      "label": "Drop the old column while one service still reads it",
      "bucket": "Breaks rollback"
    }
  ],
  "reveal": "Flags decouple release from deploy and give you a per-feature kill switch and targeting, at the price of flag debt you have to pay down. Expand and contract migrates schema in steps that are each separately deployable and separately reversible, and everything in flight must tolerate both the old and the new shape because both versions of the code are running. Never pair adding the new with dropping the old in one deploy."
}
\`\`\`
`.trim()

const chaosEngineeringTeach = `
## Chaos engineering is controlled experiments, not random breakage

Chaos engineering is not "randomly break things." It is the disciplined practice of running controlled experiments on a system to build confidence that it withstands turbulent real-world conditions. Every redundancy, timeout, retry, and failover you designed is a hypothesis about behavior under failure, and an untested failover is not a failover, it is a guess. Chaos engineering turns those guesses into evidence.

## The method is a scientific loop

1. Define the **steady state** as a measurable output that means "the system is healthy," typically a business or SLI metric like successful checkouts per second or playback-start rate, not an internal metric like CPU.
2. Form a **hypothesis**: "if we inject fault X, the steady-state metric stays within tolerance because failover/degradation Y handles it."
3. **Inject a real-world fault** into a controlled slice.
4. **Measure** the steady-state metric against the hypothesis.
5. **Learn**: either you gained confidence, or you found a weakness to fix before it finds you at 3 a.m.

**Fault types** map to real failures: added latency (a slow dependency), error injection (a dependency returning 500s), instance/AZ/region termination (Chaos Monkey killing a node, an AZ going dark), resource exhaustion (CPU/memory/disk/file-descriptor pressure), and dependency loss (the cache tier or a downstream service disappearing). Each corresponds to something that will actually happen in production.

## Blast radius is the safety discipline

Blast radius is the safety discipline that separates engineering from sabotage. You start with the smallest possible scope (one instance, one non-critical service, a tiny percentage of traffic, off-peak) and expand only as confidence grows. You always run with **guardrails**: an automatic **abort condition** that halts and reverts the experiment the moment a key metric crosses a threshold. That abort should be tied to the **error budget**, if the experiment is about to burn more budget than you can afford, it stops itself, so a chaos experiment can never cause an outage worse than your reliability target already tolerates.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "why-production-not-staging",
  "prompt": "Your failover drill passes reliably in staging. Leadership asks why you want to run the same experiment in production. What is the strongest answer?",
  "options": [
    {
      "label": "Production is the only place with a blast radius big enough to be a real test",
      "feedback": "Blast radius is the thing you deliberately keep small. You run in production narrowly and with guardrails, not to make the damage larger."
    },
    {
      "label": "Staging never reproduces the real conditions under test",
      "correct": true,
      "feedback": "Right. Real traffic patterns, real data volumes, real cache-hit ratios, real cross-service dependency graphs, and real autoscaler behavior exist only in production, and a failover that passes in an empty environment routinely fails under production load. That class of bug lives only where the risk lives, which is why you eventually have to test there, narrowly and with an auto-abort."
    },
    {
      "label": "Staging environments are usually broken anyway",
      "feedback": "An unreliable staging environment is its own problem to fix. It is not an argument about where the experiment belongs."
    },
    {
      "label": "Because the error budget has to be spent somewhere",
      "feedback": "The budget guardrails the experiment rather than justifying it. The abort condition is tied to the budget so an experiment can never cost more than your reliability target already tolerates."
    }
  ]
}
\`\`\`

**Interview nuance:** the strongest justification for running in production (with guardrails) rather than only staging is that staging never matches real conditions: real traffic patterns, real data volumes, real cache-hit ratios, real cross-service dependency graphs, and real autoscaler behavior only exist in prod. A failover that works in an empty staging environment routinely fails under production load. That is precisely the class of bug chaos exists to find, so you must eventually test where the risk lives, carefully.

Maturity progresses from **GameDays** (scheduled, human-run exercises where a team injects a fault together and watches) toward **continuous automated experiments** run by tooling: AWS Fault Injection Simulator (FIS), Gremlin, Chaos Mesh (Kubernetes), and Netflix's Chaos Monkey / Simian Army lineage. Automation lets you re-verify resilience on every change, so it does not silently regress.

**Recap:** state a steady-state hypothesis, inject a realistic fault into the smallest blast radius, measure against the hypothesis, always run with an error-budget-tied auto-abort, and test in production with guardrails because staging never reproduces real conditions.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "steady-state-metric",
  "prompt": "You are designing a chaos experiment on the checkout path. Which metric should the steady-state hypothesis and the auto-abort watch?",
  "options": [
    {
      "label": "CPU utilization across the checkout fleet",
      "feedback": "An internal resource metric can move a long way without any user noticing, and it can sit perfectly flat while checkouts fail. Steady state is defined on the output that means healthy to a user."
    },
    {
      "label": "Successful checkouts per second",
      "correct": true,
      "feedback": "Right. A business or indicator metric is what the hypothesis is written against, and it is what the auto-abort watches so the experiment stops before it burns budget you cannot afford."
    },
    {
      "label": "The number of instances the experiment terminated",
      "feedback": "That measures the fault you injected, not the system's response to it. The hypothesis is about the output staying within tolerance despite the fault."
    },
    {
      "label": "Mean request latency across all checkout requests",
      "feedback": "Closer, but a mean hides the tail and mixes fast failures in with successes. If the steady state has to be latency, use a percentile over successful requests."
    }
  ],
  "reveal": "Define the steady state as a user-facing output, write a hypothesis that names the mechanism you expect to absorb the fault, inject a realistic fault into the smallest possible slice, then measure against the hypothesis. Guardrails are not optional: an auto-abort tied to the error budget means a chaos experiment can never cause an outage worse than your reliability target already tolerates. Maturity moves from scheduled game-days toward continuous automated experiments, so resilience is re-verified on every change instead of silently regressing."
}
\`\`\`
`.trim()

const incidentPostmortemTeach = `
## Detect, respond, and learn fast enough that reliability compounds

Failure is inevitable at scale, so the differentiator is not preventing every incident but detecting, responding, and learning fast enough that reliability compounds over time. Incident management is the structured response; the blameless postmortem is the learning loop. Companies usually adopt both right after their first big outage teaches them that ad-hoc heroics do not scale.

## Severity levels

Severity levels give everyone a shared vocabulary for "how bad" and the expected response. A typical scheme: **SEV1** = critical, major user-facing outage or data loss, all-hands, wake people up; **SEV2** = significant degradation, urgent but not everything-down; **SEV3** = minor/partial, handled in business hours; **SEV4** = negligible, tracked but not paged. Each level has explicit **entry criteria** (e.g. "checkout error rate > 5% for 5 min = SEV1") so declaring severity is objective, not a debate, and the severity drives who is paged and how often you communicate.

## Roles separate coordination from fixing

Roles exist to separate coordination from fixing, because the person elbow-deep in the database should not also be fielding "is it fixed yet?" from executives. The **Incident Commander (IC)** owns the response, makes decisions, and delegates; they do not fix, they coordinate. The **Communications Lead** posts regular updates to stakeholders and the status page on a fixed cadence. The **Operations/Scribe** does the hands-on remediation and keeps a timestamped log of actions. This is adapted from emergency-services incident command. In a small SEV3 one person may hold several hats; in a SEV1 they are distinct people.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "mitigate-before-diagnose",
  "prompt": "Checkout error rate crosses 5 percent, a SEV1 is declared, and the deploy from 20 minutes ago is the prime suspect but nobody has proven it. What does the team do first?",
  "options": [
    {
      "label": "Reproduce the bug in staging so the rollback is justified",
      "feedback": "Users are down while you build a case. Diagnosis is what the postmortem is for, and the incident is for stopping the bleeding."
    },
    {
      "label": "Roll the deploy back now, and investigate once service is restored",
      "correct": true,
      "feedback": "Right. Restoring service beats understanding it: if a bad deploy is suspected you roll it back first, and if a region is unhealthy you fail traffic away first."
    },
    {
      "label": "Have the Incident Commander open a debugger, since they own the response",
      "feedback": "The Commander coordinates and decides, they do not fix. Putting the coordinator elbow-deep in the code is how status updates stop and decisions stall."
    },
    {
      "label": "Wait for another data point to confirm the error rate is real",
      "feedback": "Severity levels carry explicit entry criteria so that declaring is objective and immediate. The threshold was already crossed."
    }
  ]
}
\`\`\`

## Mitigate before you diagnose

**The response flow prioritizes mitigation over diagnosis:** detect -> triage/declare severity -> **mitigate (stop the bleeding)** -> then root-cause. During an active incident, restoring service beats understanding it. If a bad deploy is suspected, roll it back first and investigate after; if a region is unhealthy, fail traffic away first. Chasing the root cause while users are down is a classic and expensive mistake. Diagnosis is what the postmortem is for; mitigation is what the incident is for.

\`\`\`
detect -> declare SEV + assign IC/Comms/Ops -> MITIGATE (rollback / failover / shed) -> service restored
        -> (only now) diagnose root cause -> blameless postmortem -> action items -> tracked to done
\`\`\`

## The blameless postmortem

The blameless postmortem is the compounding step. Blameless means it assumes everyone acted reasonably with the information and tools they had, so the analysis targets the *system* that allowed the failure, not the individual who tripped it. Structure: a **timeline** (what happened, when), **impact** (users/revenue/duration), **contributing causes** (usually several, not one), and **action items** with named owners and due dates. Action items that are not tracked to completion are the reason the same incident recurs.

**Interview nuance:** never accept "human error" as a root cause, and be ready to say why. "Engineer ran the wrong command" is a stopping point that hides the real questions: why did the system let a single command take prod down, why was there no confirmation or dry-run, why did no guardrail catch it? Ask "why did the system allow this?" (this is the spirit of the Five Whys). Blameful postmortems make people hide mistakes, which hides the next incident, so blamelessness is a reliability strategy, not just a kindness.

**Recap:** objective severity levels drive the response, separate the Commander from the fixers, mitigate before you diagnose, and run a blameless postmortem that targets the system (never "human error") with owned action items tracked to completion.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "human-error-is-not-a-cause",
  "prompt": "A postmortem concludes that the root cause was an engineer running a delete against production instead of staging. Why is that not a root cause?",
  "options": [
    {
      "label": "Because the engineer was not on call, so responsibility sits with their manager",
      "feedback": "Reassigning blame is still blame, and it still ends the investigation. Blamelessness assumes everyone acted reasonably with the information and tools they had."
    },
    {
      "label": "Because it stops exactly where the useful questions start",
      "correct": true,
      "feedback": "Right. The questions it forecloses are the ones worth asking: why could one command take production down, why was there no confirmation or dry run, why did no guardrail catch it. Asking why the system allowed this usually surfaces several contributing causes rather than one, and each of them is something you can actually go and fix."
    },
    {
      "label": "Because human error is rare enough to ignore",
      "feedback": "Humans make mistakes constantly. A reliable system is one built to absorb that, which is why the analysis targets the system rather than the person."
    },
    {
      "label": "Because the correct action item is retraining the engineer",
      "feedback": "Retraining is the action item a blameful postmortem produces, and it is the one that does nothing to stop the next engineer from doing the same thing."
    }
  ],
  "reveal": "Objective severity criteria decide how hard the response is, and separate roles keep the Commander coordinating while operations fixes and communications posts on a fixed cadence. Mitigate first and diagnose afterwards. Then the blameless postmortem turns the incident into compounding reliability: a timeline, the impact, several contributing causes, and action items with named owners tracked to completion, because untracked action items are why the same incident happens twice."
}
\`\`\`
`.trim()

export const systemDesignLevel7: DesignLevel = {
  id: 7,
  slug: "reliability-ops",
  title: "Level 7: Reliability, Resilience & Operations",
  tagline:
    "SLOs and error budgets, observability, resilience patterns, redundancy and multi-region DR, and safe deploys and chaos.",
  estimatedHours: 8,
  modules: [
    {
      id: "sd-l7-m1",
      title: "SLOs & Error Budgets",
      description:
        "Turn a vague 'make it reliable' goal into hard numbers: convert nines into real downtime and dollars, define SLIs and SLOs a team can measure and enforce, write an error-budget policy that settles the ship-versus-stabilize fight without a meeting, and design multi-window multi-burn-rate alerts that page a human only when it matters.",
      lessons: [
        {
          id: "sd-l7-availability-nines",
          title: "Availability Math & the Nines",
          summary:
            "What 99.9 percent actually costs you in downtime minutes, and why one weak serial dependency caps the number you are allowed to promise.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["availability", "nines", "slo"],
          teach: {
            markdown: availabilityNinesTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l7-availability-nines-apply",
            prompt:
              "Compute the allowable monthly downtime for a checkout service at 99.9% vs 99.99%, then decide which nine is worth the cost and justify it.",
            thinkAbout: [
              "How do serial dependencies combine, and how does redundancy add availability?",
              "Why does each added nine cost roughly 10x more?",
              "What is the difference between measured, promised (SLA), and target (SLO) availability?",
            ],
            modelAnswerOutline: [
              "Assumptions: checkout is a revenue-critical path processing 500 orders/minute at peak, average order value 60 dollars, so a full outage costs roughly 30,000 dollars/minute of lost or delayed revenue plus reputational damage. Window is a 30-day month (43,200 minutes).",
              "**The numbers:** at 99.9% the budget is (1 - 0.999) x 43,200 = 43.2 minutes/month. At 99.99% it is (1 - 0.9999) x 43,200 = 4.32 minutes/month. So the question is whether cutting allowed downtime by ~39 minutes/month is worth the cost.",
              "**Value side:** 39 minutes x 30,000 dollars is over 1 million dollars of exposure per month removed, and checkout downtime directly abandons carts. That easily justifies serious investment.",
              "**Cost and feasibility side:** checkout is not standalone. It synchronously depends on auth, inventory, and payments. If each is 99.95%, the serial ceiling is 0.9995^3 = 99.85%, below even three nines. I cannot promise 99.99% at the edge while my dependencies cap me at 99.85%. So the honest answer: target 99.99% only after I harden the chain. Add redundancy to the weakest hop (two independent inventory replicas turn 99.95% into 1 - (1 - 0.9995)^2 = 99.999975%, which lifts that hop out of the binding position), make payments and inventory calls tolerate a slow or failed dependency via async confirmation and idempotent retries, and remove any single-AZ single point of failure.",
              "**Decision:** every number I commit to has to sit under the 99.85% ceiling I just derived, so: commit to a 99.8% SLO for checkout now (about 86 minutes/month), sign a looser 99.5% SLA externally so the contractual promise keeps margin under the internal target, and treat both 99.95% and 99.99% as roadmap targets gated on first raising the dependency ceiling. Chasing the fourth nine at the edge before fixing the serial chain would be spending money on a number the architecture cannot deliver. Common wrong turn avoided: quoting 99.99% at the edge while the multiplied dependency chain physically caps me lower.",
            ],
          },
          practice: {
            id: "sd-l7-availability-nines-practice",
            prompt:
              "Design the availability target and redundancy strategy for Stripe-style payment authorization at 5,000 auth requests/second, where a single 99.99% card-network dependency sits on the critical path and the business wants 'four nines end to end.' Explain what is and is not achievable and how you close the gap.",
            thinkAbout: [
              "Why does one 99.99% serial dependency cap the end-to-end number below four nines?",
              "How does routing through multiple card networks change the ceiling?",
              "What target do you actually commit to, and how do you degrade gracefully on a network blip?",
            ],
            modelAnswerOutline: [
              "Assumptions: 5,000 QPS, each failed auth is a lost or retried payment, and one hard external dependency (the card network) is quoted at 99.99% and is not something I can make more reliable.",
              "**The blunt truth:** if the card network is a mandatory synchronous hop at 99.99%, my end-to-end ceiling is at most 99.99% minus whatever my own stack subtracts. If my internal path is 99.99% and the network is 99.99%, serial gives 0.9999 x 0.9999 = 99.98%. So literal 'four nines end to end' is not achievable while that dependency is on the hot path. I say that explicitly rather than promising a number physics forbids.",
              "**Close the gap #1: remove hops from the synchronous path.** Fraud scoring and ledger writes go async where possible so only the gateway, auth, and network are serial.",
              "**Close the gap #2: add redundancy on everything I own.** Multi-region active-active gateways and auth so my internal contribution rises toward 99.999%, making the network the sole binding constraint.",
              "**Close the gap #3: exploit multiple card-network routes.** If I can route a transaction through more than one acquirer/network, those parallel paths combine as 1 - (1 - 0.9999)^2 = 99.999999%, which lifts the external ceiling far above four nines. That is the real unlock: redundancy at the dependency, not heroics in my code.",
              "**Target I commit to:** 99.99% for my own stack (measured), a 99.95% customer SLA with service credits for margin, and an internal 99.995% SLO reachable only once multi-network routing is live. I also add graceful handling: on network failure, queue for retry with idempotency keys rather than hard-declining, so a network blip degrades to slight latency rather than a lost payment. Common wrong turn avoided: accepting 'four nines end to end' as a spec without checking that a single 99.99% serial dependency mathematically caps it lower.",
            ],
          },
        },
        {
          id: "sd-l7-sli-slo-sla",
          title: "SLI / SLO / SLA Hierarchy",
          summary:
            "The difference between what you measure, what you target, and what you promise a customer, and why averaging latency hides the users who are angry.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["sli", "slo", "sla"],
          teach: {
            markdown: sliSloSlaTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-sli-slo-sla-apply",
            prompt:
              "Define 3 SLIs and their SLO targets and measurement windows for a photo-upload API, and specify exactly how each SLI is computed from telemetry.",
            thinkAbout: [
              "How is an SLI defined as good events over valid events?",
              "Why does the measurement point (LB vs client vs server) change the number?",
              "Why use percentiles, not averages, for latency SLIs?",
            ],
            modelAnswerOutline: [
              "Assumptions: the photo-upload API accepts a multipart POST, stores the object in S3, writes metadata to a database, and returns a URL. Users care about three things: does my upload succeed, is it fast enough, and is my photo still there later. So I pick three SLIs, each tied to that journey, and keep it to three deliberately.",
              "**1. Availability SLI.** Good = requests returning 2xx (or a legitimate 4xx that is the client's fault). Valid = all requests to `POST /uploads` excluding health checks and requests we rejected as malformed before doing work. Computed from load-balancer access logs: `count(status < 500 and status != 429) / count(valid requests)`, measured at the LB because that is the boundary I own and it reflects what the client actually reached, not flattering myself by hiding failures the server never saw. SLO: 99.9% over a rolling 28 days.",
              "**2. Latency SLI.** Good = uploads completing under 3 seconds for a photo up to 10 MB. Valid = successful uploads only, bucketed by size so a 50 MB upload is not graded against the 10 MB threshold. Computed as `count(request_duration_ms < 3000) / count(successful uploads)` from server-side histograms exported to Prometheus, cross-checked with client RUM to catch last-mile latency. SLO: 95% under 3 s and 99% under 8 s over 28 days. I use thresholds/percentiles, not the average, because one slow multi-second upload would vanish in a mean.",
              "**3. Durability/correctness SLI.** Good = uploaded objects still readable and matching their checksum on a later read. Valid = all committed uploads. Computed by a background job that samples recent uploads, re-reads from S3, and compares stored vs computed checksum. SLO: 99.999% over 90 days (durability is a long-window, high-bar number).",
              "I would not add a 'CPU under 80%' SLO: that is a resource signal with no user in it, useful for capacity but not a promise to a customer. Common wrong turn avoided: averaging latency, measuring availability server-side, or sprawling into ten SLOs.",
            ],
          },
          practice: {
            id: "sd-l7-sli-slo-sla-practice",
            prompt:
              "Define the SLI/SLO set for YouTube-style video playback at global scale, where 'the video plays' is the journey and CDN edges, adaptive bitrate, and buffering all affect perceived quality. Specify how you compute each SLI from telemetry and why client-side measurement is unavoidable here.",
            thinkAbout: [
              "Why can server/edge 2xx rates report health while users stare at a spinner?",
              "Why is rebuffer ratio a time-weighted SLI rather than a request ratio?",
              "Which SLIs live on the client and which stay server-side, and why keep both?",
            ],
            modelAnswerOutline: [
              "Assumptions: hundreds of millions of playback sessions/day served from a global CDN, adaptive bitrate (ABR) so the same 'success' can mean 4K or 240p. The journey is 'I pressed play and watched smoothly,' which server-side metrics cannot fully capture, so client RUM is mandatory.",
              "**1. Playback-start SLI.** Good = sessions where video begins within 2 seconds of pressing play (time-to-first-frame). Valid = all play attempts on a supported client, excluding user-cancelled starts. Computed from client beacons: `count(ttff_ms < 2000) / count(valid starts)`. Must be client-side because CDN logs show the byte was served, not that the frame rendered. SLO: 99% under 2 s over 28 days.",
              "**2. Rebuffer-ratio SLI.** Good = playback time not spent in a stall. A time-weighted SLI, not a request ratio: `1 - (rebuffer_seconds / total_watch_seconds)`. Valid = active sessions over 30 seconds. SLO: rebuffer ratio under 0.5% over 28 days. Buffering is the single biggest driver of abandonment, so it earns its own SLI, and only the client knows when the picture actually froze.",
              "**3. Playback-failure SLI.** Good = sessions that never hit a fatal error (manifest fetch fail, decode error, 5xx from the edge). Valid = all sessions. Computed from client error beacons joined with edge logs. SLO: 99.95% error-free over 28 days.",
              "**Why client-side is unavoidable:** the CDN can return 200 for every segment while the user stares at a spinner because their device throttled or the ABR ladder picked a bitrate their connection could not sustain. Server metrics would report a healthy service during a visibly broken experience. I still keep server/edge SLIs (segment fetch latency, edge error rate) for fast localization, but the customer-facing SLOs live on the client. Common wrong turn avoided: measuring only edge 2xx rate and declaring success while real users buffer.",
            ],
          },
        },
        {
          id: "sd-l7-error-budgets",
          title: "Error Budgets & Policy",
          summary:
            "Why an unspent error budget means you shipped too slowly, and how a written freeze policy settles the ship-versus-stabilize fight before the incident.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["error-budget", "policy", "sre"],
          teach: {
            markdown: errorBudgetsTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l7-error-budgets-apply",
            prompt:
              "Write an error-budget policy for a team: what happens at 100%, 50%, and 0% budget remaining, and who has authority to halt releases.",
            thinkAbout: [
              "Why is the error budget permission to fail that should be spent?",
              "What consequences kick in as the budget is exhausted?",
              "How does the policy depoliticize the release-vs-reliability decision?",
            ],
            modelAnswerOutline: [
              "Assumptions: a product team owning a service with a 99.9% availability SLO over a rolling 28-day window, so the budget is roughly 40 minutes of downtime or 0.1% of requests. Dev and SRE share on-call. The policy is signed by engineering, product, and the VP before it takes effect, which is the whole point.",
              "**100% to 50% remaining (healthy):** Normal operation. Ship features at full velocity, deploy on the normal cadence, run experiments. The budget exists to be spent, so consistently sitting near 100% triggers a review of whether the SLO is too loose or we are shipping too slowly.",
              "**50% to 10% remaining (caution):** Risky or large changes require a second reviewer and a rollback plan. The team allocates a fraction of the sprint to burning down known reliability debt in parallel, so we do not coast into a freeze.",
              "**0% (exhausted):** Automatic feature freeze. All release capacity redirects to reliability work: fixing the top burn sources, adding tests, hardening the failing dependency. The freeze lifts when the rolling window recovers the budget above a set threshold (say 20%).",
              "**Carve-outs:** security patches, data-loss fixes, and P0 incident mitigations ship even during a freeze. The freeze blocks new features and risky changes, not the reliability work itself and not emergency fixes.",
              "**Authority:** the freeze is automatic, triggered by the budget number, not a manager's discretion. The on-call SRE lead declares it when telemetry shows the budget exhausted; product and engineering leadership pre-committed to honor it. Overriding requires an explicit, logged exception approved by the VP of Engineering, reviewed in the postmortem. Why this depoliticizes: the decision to stop shipping was made months ago when everyone signed the policy, so nobody argues 'is the big launch worth it' in the moment. Common wrong turn avoided: leaving the freeze to a case-by-case judgment call, which guarantees it gets overruled whenever inconvenient.",
            ],
          },
          practice: {
            id: "sd-l7-error-budgets-practice",
            prompt:
              "Design the error-budget policy for a platform team whose service is a shared dependency for 40 internal product teams (think an internal auth or payments platform), where one product team's risky deploys can burn a budget that all 40 teams depend on. Explain how you allocate budget and assign accountability across the shared boundary.",
            thinkAbout: [
              "Why does an undifferentiated shared budget punish the best-behaved teams?",
              "How do you attribute burn to a specific consumer and cap it?",
              "What enforcement protects the other 39 teams from one abuser automatically?",
            ],
            modelAnswerOutline: [
              "Assumptions: a shared internal auth platform with a 99.95% SLO consumed by 40 teams. A single noisy consumer or one bad platform deploy can burn the shared budget, and the blast radius is all 40 teams. The hard problem is accountability across a boundary the platform team does not fully control.",
              "**Budget structure:** split the budget into two ledgers. The **platform-owned budget** covers failures caused by the platform itself (bad deploys, capacity, dependency outages). The **consumer-induced budget** covers degradation caused by a specific team's abuse (retry storms, unbounded queries, cardinality explosions). Telemetry tags every request with the calling team so burn is attributable. This is the key move: a shared budget with no attribution means the best-behaved team gets frozen for the worst team's sins.",
              "**Policy:** when the platform-owned budget is exhausted, the platform team freezes its own feature work and stabilizes (standard SRE policy). When a single consumer's induced burn exceeds a per-consumer sub-budget, that consumer gets rate-limited or quota-throttled at the platform edge (protecting the other 39) and must fix their integration before the throttle lifts. The platform enforces this automatically via admission control keyed on the team tag, so one team cannot spend everyone's budget.",
              "**Accountability:** the platform publishes a per-consumer reliability dashboard so burn is visible and social. A shared reliability council (platform lead plus rotating consumer reps) reviews cross-cutting incidents and owns the SLO target. Leadership pre-agrees that the platform may throttle an abusive consumer without per-incident negotiation, because protecting 40 teams outranks one team's launch.",
              "Common wrong turn avoided: running one undifferentiated shared budget with no per-team attribution, which both punishes well-behaved teams and gives the abuser no incentive to fix anything. Attribution plus per-consumer sub-budgets plus automatic throttling turns a tragedy-of-the-commons into an enforceable contract.",
            ],
          },
        },
        {
          id: "sd-l7-burn-rate-alerting",
          title: "Burn-Rate Alerting (Multi-Window, Multi-Burn-Rate)",
          summary:
            "Why the pager should watch how fast you are spending the error budget, and what the 14.4x fast-burn rule buys that a fixed error threshold cannot.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["burn-rate", "alerting", "slo"],
          teach: {
            markdown: burnRateAlertingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-burn-rate-alerting-apply",
            prompt:
              "Design the alert rules for a 99.9% SLO service using multi-window multi-burn-rate alerts, giving thresholds for a fast-burn page vs a slow-burn ticket.",
            thinkAbout: [
              "What is a burn rate, and what does 1x mean?",
              "Why require both a short and a long window to trip?",
              "Why alert on SLO burn (symptom) not CPU (cause)?",
            ],
            modelAnswerOutline: [
              "Assumptions: a request-driven API with a 99.9% availability SLO over a rolling 30-day window, so the error budget is 0.1% of requests. The SLI is (non-5xx responses) / (valid requests), evaluated from load-balancer metrics in Prometheus. Burn rate = observed error rate / 0.1%.",
              "**Fast-burn (page):** burn rate 14.4x, evaluated over a **1-hour long window AND a 5-minute short window**, both must exceed 14.4x. A 14.4x burn is an observed error rate of ~1.44%, spending ~2% of the entire month's budget in one hour. This is an acute outage: page the on-call immediately. The 1-hour window ensures the problem is real and sustained; the 5-minute window ensures the page clears within minutes of recovery instead of staying lit for an hour.",
              "**Slow-burn (ticket):** burn rate 1x over a **3-day long window AND a 6-hour short window**. That is a ~0.1% error rate spending ~10% of the monthly budget over 3 days. Not an emergency worth waking someone, but a real chronic bleed that will drain the budget if ignored, so it opens a ticket handled in business hours. Between the two sits the canonical middle tier: 6x over a 6-hour / 30-minute pair, a ~0.6% error rate spending ~5% of the monthly budget in 6 hours, which still pages but without the drop-everything urgency of the fast-burn rule.",
              "**Why symptoms not causes:** every rule fires on SLO burn, the thing users actually feel. I would not page on CPU > 85% or queue depth, because those are causes that may auto-scale away or be perfectly healthy. Those live on dashboards for diagnosis and on capacity tickets, never on the pager. Prometheus pattern: `error_rate_1h = sum(rate(errors[1h]))/sum(rate(requests[1h]))`, `error_rate_5m` likewise, `page IF error_rate_1h > 14.4*0.001 AND error_rate_5m > 14.4*0.001`.",
              "Common wrong turn avoided: a single static threshold (page at 1% errors) with no burn-rate math, which flaps on brief spikes and cannot distinguish a 2-minute blip from a budget-destroying sustained outage.",
            ],
          },
          practice: {
            id: "sd-l7-burn-rate-alerting-practice",
            prompt:
              "Design burn-rate alerting for Amazon-style checkout with a 99.99% SLO and a strict latency SLO (p99 under 300 ms), where the business tolerates almost no false-negative on a real outage but on-call is already drowning in pages. Specify how you handle both the availability and latency SLOs and how you cut page volume without missing a genuine outage.",
            thinkAbout: [
              "Why does a four-nines budget need a sharper very-fast tier than a 99.9% service?",
              "Why does latency get its own burn-rate ladder separate from availability?",
              "What cuts page volume without lowering every threshold uniformly?",
            ],
            modelAnswerOutline: [
              "Assumptions: checkout at 99.99% availability (budget 0.01%, only ~4.3 min/month) and a latency SLO of 99% of requests under 300 ms. Two separate SLOs means two separate burn-rate ladders. The tension: a four-nines budget is tiny so a real outage burns it terrifyingly fast, yet on-call is already fatigued, so I cannot just lower thresholds everywhere.",
              "**Availability ladder:** because the budget is 10x smaller than a 99.9% service, the same 14.4x burn now means a ~0.14% error rate and I have far less room. I keep the multi-window structure but add a very-fast tier: a 30x+ burn over a 5-minute/1-minute pair pages instantly, because at four nines a hard outage can vaporize the monthly budget in minutes and I cannot wait an hour for the long window to confirm. The standard 14.4x (1h/5m) and 6x (6h/30m) tiers still apply below it.",
              "**Latency ladder:** the latency SLI is (requests under 300 ms) / (valid requests); I compute burn against the 1% latency budget with the same multi-window multi-burn-rate math. Slow-but-up is a distinct failure mode from errors, so it gets its own rules, and I separate the latency of successful vs failed requests so a wave of fast 500s does not mask a latency regression.",
              "**Cutting page volume without missing outages:** the multi-window pattern is itself the biggest lever (requiring both windows kills most flapping). Beyond that: (1) only page on fast-burn tiers, route every slow-burn to tickets, (2) deduplicate and group related alerts so one incident is one page not fifty, (3) move all cause-based alerts (CPU, disk, queue depth) off the pager onto dashboards, since those are the bulk of fatigue, and (4) audit pages monthly and delete any that were not actionable.",
              "Common wrong turn avoided: keeping the same thresholds as a 99.9% service (too slow for a four-nines budget) or lowering every threshold uniformly (which worsens the fatigue I am trying to fix). The fix is a sharper very-fast tier for detection plus ruthless removal of cause-based pages for volume.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l7-m2",
      title: "Observability",
      description:
        "Instrument any service or resource with the minimal, high-signal metric set (the four golden signals plus RED and USE), and design end-to-end observability across a multi-service request path by choosing correctly between metrics, logs, and traces and tying them together with OpenTelemetry and propagated trace context.",
      lessons: [
        {
          id: "sd-l7-golden-signals",
          title: "The Four Golden Signals & RED/USE",
          summary:
            "The four numbers worth instrumenting on every service, when RED beats USE, and how one unbounded metric label bankrupts an observability budget.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["golden-signals", "red-use", "metrics"],
          teach: {
            markdown: goldenSignalsTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l7-golden-signals-apply",
            prompt:
              "Enumerate the golden signals for a payments microservice, plus the specific metrics, labels, and dashboards you would instrument for each.",
            thinkAbout: [
              "What are the four golden signals, and when do you use RED vs USE?",
              "Why separate successful vs failed request latency?",
              "Why does high-cardinality labeling blow up cost?",
            ],
            modelAnswerOutline: [
              "Assumptions: `payments-svc` is a gRPC/HTTP service that authorizes and captures card charges via Stripe, backed by Postgres and a Redis idempotency store, running ~2,000 charge requests/sec at peak, with a 99.9% success SLO and a p99 latency SLO of 500ms. I instrument the four golden signals, RED for the service surface and USE for its resources.",
              "**Latency (Duration).** A histogram `payment_request_duration_seconds` with buckets tuned around the 500ms SLO, labels `endpoint` (authorize, capture, refund), `status_class`. Chart p50/p95/p99/p99.9. Crucially I emit a separate series for successful vs failed charges, because a Stripe timeout that 500s at 30s must not be averaged into the healthy-charge p99.",
              "**Traffic (Rate).** Counter `payment_requests_total{endpoint,method,status_class}`, graphed as QPS. This is my demand baseline; a sudden drop is itself an incident (upstream checkout broke).",
              '**Errors.** Rate derived from the same counter filtered to `status_class="5xx"`, plus domain errors as `payment_failures_total{reason}` where `reason` is a *bounded* enum (card_declined, insufficient_funds, stripe_timeout, idempotency_conflict). I track both HTTP-level and business-level failures because a card decline is a 200 to us but a failure to the user.',
              "**Saturation.** USE on the constrained resources: Postgres connection pool (`db_pool_in_use / db_pool_size`), Redis pool, the outbound-to-Stripe concurrency limiter, worker thread pool, and queue depth for async captures. This is the leading indicator: pool utilization climbing toward 100% predicts the latency spike before it lands.",
              "**Labels I deliberately avoid:** `user_id`, `card_id`, `charge_id`, raw Stripe error strings. At 2,000 QPS these are unbounded and would create millions of time series and OOM Prometheus. Those identifiers go into structured logs and trace spans instead. I page on symptoms (5xx budget burn, p99 over 500ms for 5 min, saturation over 85%) and keep dashboards for post-page diagnosis. Common wrong turn avoided: shipping a 30-panel dashboard and no alerts, so a slow leak in decline rate goes unseen until support tickets pile up.",
            ],
          },
          practice: {
            id: "sd-l7-golden-signals-practice",
            prompt:
              "Design the golden-signal instrumentation for Uber's ride-matching service at ~10,000 match requests/sec across 400 cities, where 'success' is subtle (a match returned is not the same as a good match) and you must keep per-city visibility without letting cardinality explode.",
            thinkAbout: [
              "Why is 'match returned' not the same as a good outcome, and how do you measure the difference?",
              "How do you keep per-city visibility without multiplying every series by 400?",
              "Why does an empty match often return fast and flatter the p95?",
            ],
            modelAnswerOutline: [
              "Assumptions: `match-svc` receives a rider request, queries nearby-driver indexes, and returns a matched driver; 10k req/s, 400 cities, p95 match latency SLO of 2s, and a business KPI of match *rate* (fraction of requests that get an acceptable driver).",
              "**Traffic:** `match_requests_total{city_tier, status_class}` as QPS. I do not label by raw `city_id` on every metric; 400 cities times other labels is borderline, so I bucket into `city_tier` (top / mid / long-tail) for high-frequency counters and keep full per-city breakdown only on a small number of key metrics where I have budgeted for it.",
              "**Errors and the 'subtle success' problem:** a returned match is not automatically a good outcome, so I instrument three tiers. Hard errors (5xx, timeouts) as RED errors. Implicit errors: requests that returned *no* driver (`match_empty_total`) and requests where the offered driver was rejected or the ETA exceeded threshold (`match_low_quality_total{reason}`). The headline health metric is **match rate = matched / requested**, tracked per city_tier. This catches the classic trap where latency and 5xx look perfect but riders in one city cannot get a car.",
              "**Latency:** histogram split by success vs empty-result vs error, because an empty match often returns *fast* and would otherwise flatter the p95. Buckets tuned around the 2s SLO.",
              "**Saturation (USE):** the driver-index query pool, the geospatial cache (Redis/S2 cell store), and the matching worker concurrency. Saturation here predicts the surge-hour latency cliff.",
              "**Cardinality control:** per-city detail is a real business need, so I split storage: bounded `city_tier` labels on the hot high-QPS metrics for cheap alerting, and full per-city dimensions pushed to a longer-retention analytics store (a columnar OLAP system) sampled or pre-aggregated per minute, not on the live Prometheus path. Common wrong turn: slapping `city_id` on every counter and histogram bucket, which multiplies series by 400 and takes down the metrics backend during exactly the surge event you needed it for.",
            ],
          },
        },
        {
          id: "sd-l7-three-pillars-otel",
          title: "Three Pillars & OpenTelemetry",
          summary:
            "When to reach for a metric, a log, or a trace, and how one propagated trace id turns 'checkout is slow' into 'the fraud hop costs a second'.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["opentelemetry", "tracing", "observability"],
          teach: {
            markdown: threePillarsOtelTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-three-pillars-otel-apply",
            prompt:
              "Design end-to-end observability for a 12-service request path: what you emit as metrics vs logs vs traces, and how a trace correlates across services.",
            thinkAbout: [
              "When do you reach for metrics vs logs vs traces?",
              "How does trace context propagate across hops?",
              "How do you control cardinality and retention cost?",
            ],
            modelAnswerOutline: [
              "Assumptions: an e-commerce checkout flows through 12 services (gateway, auth, cart, inventory, pricing, order, payment, fraud, notification, ledger, search-index, and a BFF), peak ~5,000 checkouts/sec, and the recurring pain is 'checkout is slow but no single service looks unhealthy.'",
              "**What goes where.** Every service emits RED **metrics** (request rate, error rate, duration histogram, bounded labels) for alerting and SLO tracking, plus USE metrics on its constrained resources. Every service emits **structured logs** (JSON) for discrete notable events: errors, business decisions (fraud declined, inventory reservation failed), with severity and the trace id on every line. Every service participates in **distributed traces** so I can see the causal path of one checkout across all 12 hops.",
              "**Correlation is the core of the design.** The gateway starts a root span and generates a trace id, injected into the W3C `traceparent` header. Each downstream service (over HTTP and gRPC, and via the message queue by stamping the header into message metadata) reads `traceparent`, starts a child span, and re-injects it on its own outbound calls. That single trace id is written onto every log line and attached as an **exemplar** on latency metrics. Result: a p99 alert fires, I click an exemplar to the trace, see the fraud service ate 1s, and jump straight to fraud's logs for that trace id. Metrics tell me *that* it is slow, the trace tells me *where*, the logs tell me *why*.",
              "**Instrumentation.** Standardize on OpenTelemetry SDKs with auto-instrumentation for the web/gRPC/DB libraries, so most spans are free. Run an OTel Collector (as a sidecar or per-node agent plus a gateway tier) to batch, redact PII, attach resource attributes, and export: metrics -> Prometheus, traces -> Tempo/Jaeger, logs -> Loki. Apps never name a backend.",
              "**Cost control.** Metrics: bounded labels only, no user/order ids. Traces: tail-based sampling at the Collector keeping 100% of error and slow (>p99) traces plus ~1-5% of normal traffic. Logs: hot index for 7 days, then roll to S3 for cheap long retention. Common wrong turn avoided: shipping metrics and logs but no tracing and no shared id, which leaves 'which of the 12 hops is slow?' permanently unanswerable.",
            ],
          },
          practice: {
            id: "sd-l7-three-pillars-otel-practice",
            prompt:
              "Design observability for a request that crosses a synchronous API tier and then an asynchronous Kafka pipeline (order placed via API, then processed by 4 downstream consumers over Kafka) at Shopify-scale checkout volume, so that a single order is traceable end to end across both the sync hop and the async hops.",
            thinkAbout: [
              "Why does naive HTTP tracing break at the Kafka boundary?",
              "Why are span links, not a single parent, the right primitive for a batched consumer poll?",
              "What is the golden saturation signal for the async half?",
            ],
            modelAnswerOutline: [
              "Assumptions: an order is placed via a synchronous REST call, published to a Kafka topic, and processed asynchronously by inventory, payment, fulfillment, and analytics consumers; tens of thousands of orders/sec at peak; the hard requirement is a single coherent trace spanning the sync API and the async consumers, which is where naive tracing breaks.",
              "**The async trap.** HTTP auto-instrumentation propagates `traceparent` in request headers, but Kafka messages are not HTTP requests. If you do nothing, the trace ends at 'published to Kafka' and each consumer starts a *fresh* trace, so you cannot follow one order end to end. The fix: on publish, inject the current trace context into **Kafka message headers** (OTel's messaging conventions do this); on consume, extract it and start the consumer span as a **span link** or child of the producer span. Span links are the right primitive because one consumer poll can batch many messages from different traces, so a rigid single-parent model does not fit; links let one processing span reference multiple upstream trace contexts.",
              "**What each pillar does here.** Metrics: RED on the API tier, plus per-consumer USE metrics on **consumer lag** (offset behind head) which is the golden saturation signal for a Kafka pipeline; rising lag predicts SLA breach on order processing. Logs: structured, every line carrying `order_id` and the trace id. Traces: the end-to-end span tree, sync + async, keyed by trace id, with `order_id` as a span attribute so I can search either way.",
              "**Correlation and cost.** Propagate trace id into Kafka headers and stamp `order_id` on spans and logs so ops can pivot from a customer complaint (order id) to the full cross-tier trace. Tail-based sampling keeps all failed and slow order journeys. Consumer lag and DLQ depth get their own alerts. Common wrong turn: treating the async half as untraceable and relying only on per-consumer logs, which forces engineers to manually stitch an order's journey by grepping four services during an incident.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l7-m3",
      title: "Resilience Patterns",
      description:
        "Design the client-side defenses that stop one slow dependency from taking down a whole fleet: timeout and retry policies with propagated deadlines, backoff, jitter and retry budgets; circuit breakers, bulkheads and fallbacks that isolate and contain a failing dependency; and load shedding plus graceful degradation that keep a system serving useful work under overload instead of collapsing.",
      lessons: [
        {
          id: "sd-l7-timeouts-retries",
          title: "Timeouts, Retries, Backoff & Jitter",
          summary:
            "How a small blip becomes a self-inflicted DDoS, and the four defenses: a real timeout, a propagated deadline, full jitter, and one retrying layer.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["timeouts", "retries", "backoff"],
          teach: {
            markdown: timeoutsRetriesTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-timeouts-retries-apply",
            prompt:
              "Design the timeout/retry policy for a service calling three downstreams; specify budgets, backoff formula, and how you prevent retry storms.",
            thinkAbout: [
              "Why does every call need a timeout and a propagated deadline?",
              "What is the backoff-with-jitter formula and the retry budget?",
              "How does retry amplification turn a blip into an outage?",
            ],
            modelAnswerOutline: [
              "Assumptions: an `OrderService` with a 1 second end-to-end SLO handles a user request by calling three downstreams: `InventoryService` (p99 40 ms, read, idempotent), `PricingService` (p99 60 ms, read, idempotent), and `PaymentService` (p99 200 ms, write, not naturally idempotent). Traffic is ~2k QPS.",
              "**Per-call timeouts** come from each downstream's p99 with headroom: connect timeout 20 ms everywhere (same datacenter), request timeout 120 ms for Inventory, 150 ms for Pricing, 500 ms for Payment. These are ceilings for a single attempt, not the budget.",
              "**Deadline propagation is the spine.** `OrderService` stamps a deadline of `now + 900 ms` (reserving 100 ms for its own work) and passes the remaining budget on every downstream call via a `grpc-timeout` style header. Each downstream must abandon work when the deadline passes rather than compute a response nobody is waiting for.",
              "**Retries:** Inventory and Pricing are idempotent reads, so I allow up to 2 retries each, but only if the deadline has budget left. Backoff is full jitter, `delay = random(0, min(200ms, 25ms * 2^attempt))`. I retry **only at the OrderService layer** and configure the gRPC clients for Inventory/Pricing with no internal retries, so one user request cannot fan out into 3x3 calls.",
              "**Payment is a write:** I do not blind-retry it. Checkout generates an idempotency key per order; PaymentService dedupes on it, so a retry after a timeout is safe and returns the original result instead of double-charging. Even so I cap it at 1 retry.",
              "**Retry budget:** each client tracks a token bucket allowing retries up to 10% of its recent successful requests. When PaymentService is broadly failing, the budget drains and OrderService stops retrying and fails fast, shedding load off the sick dependency instead of hammering it. Common wrong turn: setting generous timeouts and unbounded retries 'to be safe,' which is exactly how a 2 second Payment blip becomes a full outage because held threads exhaust the pool and synchronized retries keep Payment down.",
            ],
          },
          practice: {
            id: "sd-l7-timeouts-retries-practice",
            prompt:
              "Design the retry and timeout policy for Stripe's API gateway fronting a payments core, handling 5k QPS with a hard rule of zero double-charges even during a 90 second partial outage of the ledger service. Lead with the deliverable.",
            thinkAbout: [
              "How does an idempotency key make retries safe at any layer?",
              "Why must the gateway stop retrying (not raise the timeout) during the brownout?",
              "How do backoff and a retry budget let the ledger drain its backlog?",
            ],
            modelAnswerOutline: [
              "Deliverable: a gateway policy that keeps charges correct and the ledger recoverable during a 90 second brownout.",
              "**Idempotency first.** Every charge request carries a client-supplied `Idempotency-Key`. The gateway persists the key with the request fingerprint and the eventual result in a fast store (Redis with a durable backing) before touching the ledger. A repeat of the same key returns the stored response verbatim and never re-executes, which is what makes retries safe at any layer.",
              "**Gateway to ledger timeouts:** connect timeout 30 ms, request timeout 800 ms (ledger p99 is ~300 ms but writes fsync). On timeout the gateway does not know if the write landed, so it retries the same idempotency key: the ledger dedupes, so at most one charge is recorded. Retries use full jitter, `delay = random(0, min(1s, 50ms * 2^attempt))`, capped at 2 attempts, gated by a retry budget of 10% of recent successes.",
              "**During the 90 second brownout** the budget saturates within seconds and the circuit trips, so the gateway stops retrying and returns a fast `503` with `Retry-After`. This is the crucial move: continuing to retry a struggling ledger prevents it from draining its backlog and recovering. Idempotency keys mean clients can safely retry after the brownout with the same key and still get exactly one charge.",
              "Common wrong turn: raising the request timeout to 10 seconds 'so slow charges succeed.' That holds threads through the entire brownout, exhausts the gateway pool, and turns a ledger slowdown into a total payments outage.",
            ],
          },
        },
        {
          id: "sd-l7-circuit-breakers",
          title: "Circuit Breakers, Bulkheads & Fallbacks",
          summary:
            "Why a circuit breaker alone cannot save you from a dependency that is slow but still returning 200, and what a bulkhead covers that it misses.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["circuit-breaker", "bulkhead", "fallback"],
          teach: {
            markdown: circuitBreakersTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-circuit-breakers-apply",
            prompt:
              "Add a circuit breaker + bulkhead + fallback around a flaky recommendations dependency on a product page; describe states and degraded UX.",
            thinkAbout: [
              "What do the circuit-breaker states do?",
              "How do bulkheads prevent one dependency from starving others?",
              "Which dependencies should be fallback-able?",
            ],
            modelAnswerOutline: [
              "Assumptions: a product-detail page renders core content (title, price, inventory, add-to-cart) plus a 'Recommended for you' carousel served by a separate `RecoService` that is occasionally flaky (p99 spikes to seconds, intermittent 5xx). The page serves ~10k QPS. Recommendations are valuable but strictly non-critical: the page must sell even with no carousel. I classify RecoService as fallback-able and the core content dependencies (catalog, inventory, pricing) as critical and non-fallback-able. That classification drives everything.",
              "**Bulkhead:** RecoService gets its own small bounded thread or connection pool, for example 30 threads, separate from the pools serving catalog and inventory. Now even if every Reco call hangs to its timeout, it can tie up at most those 30 threads; the core page pools are untouched and the page keeps rendering. This is the difference between a broken carousel and a broken store.",
              "**Circuit breaker** around the RecoService client: Closed normally, counting failures (timeouts count as failures) over a rolling window of the last 20 calls. It trips to Open when >50% fail, and in Open state every Reco call returns instantly with the fallback instead of waiting on a doomed request. After a 5 second cooldown it goes Half-Open and lets a few probes through; success closes it, failure re-opens it. The Reco request timeout itself is tight, say 150 ms, because the carousel is not worth making the user wait.",
              "**Fallback / degraded UX:** when the breaker is Open or a call fails, I serve, in order: a cached set of recommendations for that product from Redis (a few minutes stale is fine for recos), or if none, a generic 'Popular in this category' list, or if that is also unavailable, I omit the carousel entirely and render the rest of the page normally. The user still sees price and can buy.",
              "Common wrong turn: calling RecoService from the shared page-rendering thread pool with a long timeout and no breaker. A Reco brownout then exhausts the shared pool, and a non-critical carousel takes down the entire product page and stops sales.",
            ],
          },
          practice: {
            id: "sd-l7-circuit-breakers-practice",
            prompt:
              "Design failure isolation for Netflix's home screen, which composes rows from ~20 microservices (continue-watching, trending, because-you-watched, new-releases). One personalization service degrades during peak. Deliver the isolation and degradation strategy so the home screen always renders in under 400 ms.",
            thinkAbout: [
              "Why does each row need its own bulkhead and breaker?",
              "How does a propagated per-row deadline keep a slow row from blocking the frame?",
              "What is the per-row fallback ladder from personalized to generic?",
            ],
            modelAnswerOutline: [
              "Deliverable: a per-row isolation strategy so a single degraded service never blocks or breaks the whole home screen.",
              "**Per-row bulkheads.** Each of the ~20 row services gets its own bulkhead: an independent bounded thread/connection pool (this is essentially what Hystrix, born at Netflix, provided). A slow personalization service can exhaust only its own pool, so the other 19 rows keep loading. Each service also gets a circuit breaker with outlier detection: when the personalization service's failure or latency rate crosses threshold, its breaker opens and calls fail fast rather than eating the 400 ms budget.",
              "**Hard render deadline.** The home screen has a 400 ms render deadline and composes rows concurrently with per-row deadlines propagated from it. Any row that has not returned by its slice of the deadline is dropped from this render, so a slow row never blocks the frame.",
              "**Fallback ladder per row:** serve a recently cached version of that row from an edge cache (a few minutes stale is invisible for 'trending'); if empty, substitute a non-personalized default row (global 'Popular on Netflix'); if still nothing, omit the row and let the rows below shift up. Because rows are independent and non-critical relative to each other, the screen degrades gracefully from fully personalized to partially personalized to generic, never to blank.",
              "Common wrong turn: composing rows sequentially from a shared pool with no per-row deadline. The one degraded personalization service then blocks composition, blows the 400 ms budget, and users get a spinner instead of a slightly-less-personalized but instant home screen.",
            ],
          },
        },
        {
          id: "sd-l7-load-shedding-degradation",
          title: "Load Shedding & Graceful Degradation",
          summary:
            "Why serving everyone under overload serves almost nobody, and why autoscaling cannot break a retry loop that has already become self-sustaining.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["load-shedding", "degradation", "goodput"],
          teach: {
            markdown: loadSheddingDegradationTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-load-shedding-degradation-apply",
            prompt:
              "Design overload behavior for a search service at 2x capacity: what you shed, what you prioritize, and how you signal clients.",
            thinkAbout: [
              "How do you prioritize what to shed and what to protect?",
              "Why maximize goodput rather than raw throughput?",
              "How do metastable failures form, and how do you break them?",
            ],
            modelAnswerOutline: [
              "Assumptions: a search service rated for 50k QPS of goodput at p99 200 ms is hit with 100k QPS (2x). Requests fall into classes: logged-in user searches, anonymous searches, typeahead/autocomplete prefetches, and internal crawler/reindex traffic. The goal is to keep goodput at ~50k successful, fast responses rather than collapsing to near-zero.",
              "**Goal is goodput, not throughput.** If I try to serve all 100k, CPU goes to GC, context switching, and requests that will time out before the client sees them, and successful responses crater. I would rather cleanly reject 50k than fail 90k. So I shed the excess.",
              "**Admission control at the edge:** an adaptive concurrency limiter (Netflix-style, watching latency) caps in-flight requests to what keeps p99 under 200 ms and immediately rejects the rest. I do **not** add a big queue; a queue would just push requests past their deadline and trigger retries. Rejection is cheap: it happens at the load balancer / front proxy before query parsing or index access.",
              "**Prioritization by class, shed low value first:** I drop internal crawler/reindex traffic first (it can run later), then typeahead prefetches (speculative, the user has not committed), then anonymous searches, protecting logged-in user searches last. Requests are tagged with a class header at the edge so the shedder can rank them.",
              "**Client signaling:** shed requests get `503` (or `429`) with `Retry-After` and a jittered value, so clients back off instead of instantly retrying. Internally I also enable graceful degradation of the served requests: under stress I disable expensive re-ranking and personalization and serve the cheaper first-pass results, which raises capacity per request.",
              "**Breaking metastability:** at 2x, naive clients retry failures and can push effective load to 3x, and it stays there after the spike. I break the loop by shedding hard enough to drop admitted load below capacity, requiring client backoff-with-jitter, and using a retry budget so retries cannot exceed a small fraction of traffic. Autoscaling is a background action, not the fix, because it is minutes-slow and the shared index tier is the real bottleneck. Common wrong turn: no admission control, an unbounded request queue, and reliance on autoscaling, so the queue fills with expired requests, retries pile on, and the service collapses to near-zero goodput instead of cleanly serving 50k.",
            ],
          },
          practice: {
            id: "sd-l7-load-shedding-degradation-practice",
            prompt:
              "Deliver an overload-control design that restores service and keeps the highest-value orders flowing: DoorDash sees a Super Bowl demand spike driving 4x normal order volume into the order-placement service, and a retry storm from mobile clients is keeping it saturated even between ad breaks.",
            thinkAbout: [
              "How do you diagnose and break the retry-driven metastable loop?",
              "What do you protect and what do you shed under a 4x spike?",
              "Why does 'scale the fleet and widen the queue' feed the collapse rather than fix it?",
            ],
            modelAnswerOutline: [
              "Deliverable: an overload-control plan that breaks the retry-driven metastable state and protects order placement.",
              "**Diagnose the metastable loop first:** the 4x spike pushed order placement over capacity, timeouts triggered aggressive mobile retries, and those retries now supply more than the original excess load, so the service stays saturated even when raw user demand dips. Adding servers has not helped because the shared orders database is the bottleneck and retries expand to fill any new capacity.",
              "**Break the loop at the edge.** Enable aggressive admission control at the API gateway with an adaptive concurrency limit tied to the database's healthy latency, admitting only what the datastore can commit under p99 target and rejecting the rest with `503` + `Retry-After` carrying a large jittered value (say 5 to 20 seconds) to spread the retry wave. Enforce a server-side retry budget so retries cannot exceed ~10% of successful traffic; excess retries are rejected immediately and cheaply.",
              "**Prioritize by value:** protect in-progress checkouts and payment confirmations (a dropped order is lost revenue and a lost customer) over cart edits, and shed non-essential traffic first, menu refreshes, restaurant browsing prefetch, and analytics/telemetry writes, routing the latter to an async buffer.",
              "**Graceful degradation:** during the peak, disable expensive synchronous work in the order path, defer ETA recomputation, personalization, and promo re-evaluation to async, and accept the order with a provisional estimate. This shrinks the per-order database cost and lifts effective capacity.",
              "Because the fix is admission control plus client backoff, the retry storm dissipates within seconds and goodput recovers, rather than waiting minutes for autoscaling that the database bottleneck would negate anyway. Common wrong turn: 'scale the fleet and widen the queue,' which feeds the metastable loop instead of starving it.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l7-m4",
      title: "Redundancy, DR & Multi-Region",
      description:
        "Hunt down and eliminate single points of failure across a stack, set defensible RTO/RPO targets and pick a matching disaster-recovery strategy per tier, design a multi-region deployment with an honest story about replication and consistency, and shrink blast radius with cells, shuffle sharding, and static stability so a single failure never takes everyone down.",
      lessons: [
        {
          id: "sd-l7-redundancy-failover",
          title: "Redundancy, Failover & Health Checking",
          summary:
            "How to find the single points of failure hiding behind a redundant web tier, and why a lone standby must never be allowed to promote itself.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["redundancy", "failover", "health-checks"],
          teach: {
            markdown: redundancyFailoverTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-redundancy-failover-apply",
            prompt:
              "Remove every single point of failure from a 3-tier web app; specify redundancy, health checks, and how failover is triggered at each tier.",
            thinkAbout: [
              "Where are the hidden SPOFs (LB, DB primary, DNS, config store)?",
              "Active-active vs active-passive: what do you trade?",
              "How do you avoid flapping and split-brain during a partition?",
            ],
            modelAnswerOutline: [
              "Assumptions: a classic 3-tier app (LB -> stateless app servers -> relational DB) serving a few thousand QPS in one region; goal is to survive any single instance failure with no outage and minimal data loss. I will walk the path and kill each SPOF.",
              "**DNS / edge:** a single DNS name on one provider is a SPOF. I use a provider with multiple authoritative servers, ideally two providers, with health-checked records so a dead endpoint is pulled from rotation.",
              "**Load balancer tier:** one LB is a SPOF even if the app tier is redundant. I run a managed LB (AWS NLB/ALB, or an HAProxy/Envoy pair with a floating VIP via keepalived/VRRP), active-active across at least two AZs. The LB itself health-checks the app tier.",
              "**App tier:** stateless by design (sessions in Redis/JWT, not local memory), run N+2 instances across 3 AZs so losing one AZ still leaves capacity. Active-active. The LB uses a **readiness** check (`/ready` that verifies the DB pool and warm caches) to decide routing, and the orchestrator (Kubernetes) uses a **liveness** check to restart hung processes. I keep readiness shallow, not a deep DB call from every pod, to avoid a DB blip ejecting the whole fleet at once.",
              "**Database tier:** the primary is the classic hidden SPOF. I run a primary with one or two replicas across AZs. Synchronous replication to at least one replica bounds data loss (RPO near zero) at some write-latency cost; async to the rest. Failover is automated (RDS Multi-AZ, Patroni, Orchestrator) but promotion is decided by **quorum**, not by a lone standby, and the old primary is **fenced** (storage lease revoked) before the new one accepts writes, to prevent split-brain dual-primary.",
              "**Config store:** if every pod reads one config service on boot, that is a SPOF. I run etcd/Consul as a 3- or 5-node quorum and cache config locally so a control-plane blip does not stop serving. I add hysteresis (N-consecutive-failure ejection, cooldown before re-admit) to stop flapping. Common wrong turn: making the app tier redundant while leaving one LB or one un-replicated DB primary, so the 'HA' system still has a single box that ends it.",
            ],
          },
          practice: {
            id: "sd-l7-redundancy-failover-practice",
            prompt:
              "Explain how you would make the PostgreSQL primary behind a payments API highly available at 20,000 writes/second, with automated failover that provably cannot cause a split-brain dual-primary during a network partition.",
            thinkAbout: [
              "How does a quorum-held leader lease make dual-primary structurally impossible?",
              "Where does synchronous replication bound RPO, and what does it cost?",
              "Why is a single monitoring node's promotion decision dangerous?",
            ],
            modelAnswerOutline: [
              "Assumptions: single-region, one PostgreSQL primary is the write bottleneck and the SPOF; payments demand near-zero data loss (RPO ~0) and fast, safe failover.",
              "**Quorum-held leader lease.** I run the cluster with **Patroni**, which uses a distributed configuration store (etcd, 5 nodes for quorum) to hold the leader lease. Only the node that holds a valid, unexpired lease in etcd is primary. Because etcd requires a majority to grant or renew a lease, a partition that isolates the current primary means it *cannot renew its lease*, so it demotes itself; simultaneously the majority side elects a new leader. A minority partition can never win, which is what structurally prevents dual-primary.",
              "**Replication:** synchronous to at least one standby (`synchronous_standby_names` with `ANY 1`) so a committed payment is on two nodes before the client sees success. This bounds RPO to zero for committed writes at the cost of a few ms of commit latency, the right trade for payments. Additional async replicas serve reads and provide more failover candidates.",
              "**Fencing:** Patroni demotes the losing primary via its own lease loss, and I add **watchdog** (softdog) so a hung primary that cannot demote itself gets its node reset rather than lingering. Clients reach the DB through a proxy (PgBouncer + HAProxy, or the cluster VIP) that always points at the current leader, so application code does not chase failovers.",
              "**Throughput:** at 20k writes/s the single primary is a ceiling too, so beyond HA I would shard by account/tenant to spread writes, giving each shard its own Patroni cluster. Tradeoff: sync replication adds latency and, if the sync standby dies, writes stall unless I allow degrading to async (which reopens an RPO window, so I alert loudly on it). Common wrong turn: automated failover driven by a single monitoring node's opinion rather than a quorum lease, which promotes a standby during a partition and double-writes.",
            ],
          },
        },
        {
          id: "sd-l7-dr-rto-rpo",
          title: "Disaster Recovery: RTO/RPO & Strategies",
          summary:
            "How to set RTO and RPO per tier and pick a recovery rung that meets them, and why failing over to a second region just replicates the corruption.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["dr", "rto-rpo", "backups"],
          teach: {
            markdown: drRtoRpoTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-dr-rto-rpo-apply",
            prompt:
              "Set RTO/RPO per tier for an e-commerce platform and pick a DR strategy (backup/restore, pilot light, warm standby, multi-site active/active) for each, justifying cost.",
            thinkAbout: [
              "What do RTO and RPO mean concretely?",
              "How does the strategy ladder trade cost against recovery time?",
              "Why is an untested backup not a DR plan?",
            ],
            modelAnswerOutline: [
              "Assumptions: a mid-size e-commerce platform with checkout/payments, product catalog and browse, order history, and an analytics/reporting warehouse. Downtime during checkout directly loses revenue; analytics downtime loses almost nothing. I tier by business impact.",
              "**Checkout, payments, and the order ledger** (revenue-critical). RTO: 5 minutes. RPO: near zero, because a lost paid order is a customer who was charged and got nothing. Strategy: **warm standby** in a second region, with synchronous or low-lag async replication of the orders/payments database. It runs scaled down continuously and scales up on failover. This is the tier where I spend the money.",
              "**Product catalog and browse** (important, but degradable). RTO: 30 minutes. RPO: 1 hour (catalog changes slowly and can be re-derived from the source of truth). Strategy: **pilot light**. Keep the catalog data replicated and the DB warm in DR, but leave the stateless serving tier off and spin it up on disaster. Cheaper than warm standby, and a 30-minute recovery is acceptable for browse if checkout is protected separately.",
              "**Order history and account data** (needed, not on the hot path). RTO: 2 hours. RPO: 15 minutes. Strategy: **backup & restore** with 15-minute incremental backups plus continuous WAL archiving for point-in-time recovery, restored into fresh infra on disaster.",
              "**Analytics/reporting warehouse** (internal, tolerant). RTO: 24 hours. RPO: 24 hours. Strategy: **backup & restore** from daily snapshots. It can be rebuilt from upstream sources anyway, so anything more is wasted spend.",
              "**Cross-cutting:** all backups are **immutable / object-locked and cross-region** so ransomware or a bad migration cannot destroy the recovery point, because failover alone would just replicate corruption faster. I keep runbooks per tier and run a quarterly game-day that actually fails over checkout and times it against the 5-minute RTO. Common wrong turn: buying one uniform active/active tier for everything (overpaying for analytics) or, worse, calling nightly snapshots a DR plan without ever test-restoring them.",
            ],
          },
          practice: {
            id: "sd-l7-dr-rto-rpo-practice",
            prompt:
              "Design the DR plan for a hospital's electronic health records (EHR) system where regulators require RPO under 15 minutes and RTO under 1 hour, and explain how you would prove the plan works before an auditor asks.",
            thinkAbout: [
              "How does continuous replication plus WAL archiving hit RPO under 15 minutes?",
              "Why does a regulated safety-critical system rule out the cheaper ladder rungs?",
              "How do you produce audit evidence that the plan actually works?",
            ],
            modelAnswerOutline: [
              "Assumptions: EHR is safety-critical and regulated (HIPAA-style controls); clinicians must reach records during an outage, and lost records can harm patients. Regulator-set targets: RPO < 15 min, RTO < 1 hour.",
              "**Hitting RPO < 15 min:** run **continuous replication**, not periodic snapshots: streaming database replication to a warm standby in a second region plus continuous transaction-log (WAL) archiving to immutable, cross-region storage. Committed writes reach the standby within seconds, so the realistic RPO is well under a minute of async lag, comfortably inside 15 minutes, with the WAL archive as the point-in-time floor if the standby itself is compromised.",
              "**Hitting RTO < 1 hour:** use **warm standby**: a scaled-down but functional EHR stack always running in DR, fronted by a DNS/global-LB failover that shifts clinician traffic on health-check failure. Failover plus scale-up is minutes, well under an hour.",
              "**Corruption/ransomware defense:** because EHR is a prime target, backups are **immutable (object-lock/WORM) and air-gapped** so an attacker who encrypts production cannot reach the recovery point, and I keep point-in-time restore to recover from a bad write rather than replicating it. Access to DR is role-gated and audited like production.",
              "**Proving it to an auditor:** I do not claim readiness, I **demonstrate** it. Quarterly game-days actually fail over to DR and time both RTO and RPO against the targets, with signed records of each drill. Monthly automated restore tests provision a throwaway environment from backups and verify integrity. All runbooks are versioned, and I retain the drill logs, timings, and any misses-with-remediation as the audit evidence.",
              "Tradeoff: continuous replication plus an always-on warm standby is expensive, but for a regulated safety-critical system the cheaper, slower rung is not permitted. Common wrong turn: pointing at nightly backups and a written procedure that has never been restore-tested, which fails both the RPO math and the audit.",
            ],
          },
        },
        {
          id: "sd-l7-multi-region",
          title: "Multi-Region & Multi-AZ Architecture",
          summary:
            "What multi-AZ protects you from and what it does not, and why active-active across regions cannot be strongly consistent and fast at the same time.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["multi-region", "replication", "failover"],
          teach: {
            markdown: multiRegionTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l7-multi-region-apply",
            prompt:
              "Design a multi-region deployment for a globally used app; decide active-active vs active-passive, data replication mode, and traffic routing/failover.",
            thinkAbout: [
              "What do multi-AZ and multi-region each protect against, and at what cost?",
              "Sync vs async replication: what is the RPO and latency tradeoff?",
              "How do you resolve conflicts in active-active?",
            ],
            modelAnswerOutline: [
              "Assumptions: a globally used app (say a collaboration/productivity SaaS) with users in North America, Europe, and Asia; goals are low read latency worldwide, survival of a full region loss, and honest data-correctness guarantees. Write volume moderate, reads dominant.",
              "**Topology.** Each region is already **multi-AZ** internally (3 AZs, synchronous within-region replication) for cheap HA against a data-center failure. On top of that I run **three regions** (us-east, eu-west, ap-southeast) to survive a region loss and cut latency for each geography.",
              "**Active-active vs active-passive.** I go **active-active for reads** (every region serves local reads, cutting latency to single-digit ms for nearby users) and **single-writer-region for writes**, a pragmatic active-active. Each account/workspace is *homed* to one region that owns its writes. Users read locally everywhere, and writes route to the workspace's home region. This avoids cross-region write conflicts entirely, the honest version of active-active. Fully symmetric multi-master I would only choose for data that is naturally conflict-free (CRDT-friendly: presence, counters, collaborative doc ops via OT/CRDT).",
              "**Replication mode.** Within a region: **synchronous** across AZs (RPO~0, sub-ms cost). Across regions: **asynchronous** (seconds of lag) because sync across 100+ ms WAN would make every write painfully slow and would stall on partition. I accept a small cross-region RPO on catastrophic region loss and make that explicit. For the small set of data that must be globally strongly consistent (billing, unique-username allocation) I use a Spanner-class store (Spanner or CockroachDB) and pay its latency rather than hand-roll conflict resolution.",
              "**Traffic routing / failover.** A global anycast layer (AWS Global Accelerator / Cloudflare) with **health-based failover** steers users to the nearest healthy region and shifts traffic within seconds if a region fails checks; I avoid relying solely on GeoDNS because DNS TTL caching makes failover minutes-slow. On region loss, the failed region's homed workspaces are re-homed to a surviving region (promote its async replica, accepting the small RPO tail).",
              "**Tradeoffs and wrong turn.** Cost roughly triples versus single-region, and cross-region writes for a non-local workspace are slower. I test **region evacuation** as a drill, not an assumption. Common wrong turn I avoid: claiming symmetric active-active multi-master gives strong consistency for free; instead I use single-writer-region (or CRDTs/Spanner) and name the consistency I actually provide.",
            ],
          },
          practice: {
            id: "sd-l7-multi-region-practice",
            prompt:
              "Design the multi-region data layer for a global shopping-cart service (think Amazon-scale) where the cart must always accept 'add to item' writes even during a network partition, and no item a user added may silently vanish.",
            thinkAbout: [
              "Why choose AP over CP for the cart, and what does that cost?",
              "Why is last-writer-wins wrong, and what merges adds without loss?",
              "How do you handle quantities and removals without un-deleting forever?",
            ],
            modelAnswerOutline: [
              "Assumptions: carts are written from anywhere, availability of writes trumps immediate consistency (a customer must always be able to add to cart, even mid-partition), and the correctness rule is 'never lose an added item.' This is the classic Dynamo shopping-cart problem.",
              "**AP over CP for the cart:** always accept writes, reconcile later. That means an **active-active, multi-master** store replicating asynchronously across regions, backed by a Dynamo-style system (DynamoDB global tables, or Cassandra/Riak). Each region takes cart writes locally with low latency and stays writable during a partition because it does not need a cross-region quorum to accept a write.",
              "**Conflict resolution that never drops an add.** Naive last-writer-wins is wrong: if two regions concurrently modify a cart, LWW discards one region's change and an item vanishes, violating the rule. Instead I model the cart as a **conflict-free merge**: adds merge by union rather than overwrite, so when replication surfaces divergent versions (detected via vector clocks / version vectors), I merge by taking the union of added items (a CRDT OR-Set, or the classic Dynamo approach of returning both siblings and merging on read). The bias is deliberately toward keeping items: a resurrected deleted item is a far better failure than a lost purchase intent.",
              "**Quantities and removals** get more care: I represent quantity as a PN-counter-style CRDT or reconcile by max, and treat deletes as tombstones with enough causal history that a concurrent add does not un-delete forever. Reads that encounter siblings merge them and write back the reconciled value.",
              "**Traffic:** users hit the nearest region via anycast/global-LB; a region failure just routes them elsewhere, and because replication is async multi-master the cart is already writable there. Tradeoffs: I accept eventual consistency and occasional resurrected items in exchange for always-available writes and zero silent loss. Common wrong turn: using a single-writer-region or strong-consistency store here, which would block cart writes during a partition, exactly the availability the business refuses to give up.",
            ],
          },
        },
        {
          id: "sd-l7-blast-radius-cells",
          title: "Blast Radius Reduction: Cells & Static Stability",
          summary:
            "How cells and shuffle sharding cap the share of users any one failure reaches, and why the data plane must keep serving when the control plane dies.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["cells", "static-stability", "blast-radius"],
          teach: {
            markdown: blastRadiusCellsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-blast-radius-cells-apply",
            prompt:
              "Redesign a multi-tenant SaaS so a bad deploy or poison tenant impacts under 5% of customers; use cells, shuffle sharding, and static stability.",
            thinkAbout: [
              "How do cells and shuffle sharding bound impact?",
              "Why separate control plane from data plane?",
              "What is static stability, and why does it matter when the control plane is down?",
            ],
            modelAnswerOutline: [
              "Assumptions: a multi-tenant SaaS on one big shared stack today, so any bad deploy or heavy/abusive tenant currently affects 100% of customers. Goal: no single failure or deploy hits more than ~5% of customers.",
              "**Cells.** I split the shared stack into at least **20 independent cells**, each a full self-contained stack (LB, app, database, cache) serving a fixed slice of tenants (~5% each). Cells share nothing at runtime, so a database meltdown, memory leak, or poison request in one cell is contained to that cell's ~5%. A thin, deliberately simple **cell router** maps tenant id to cell. I place large tenants carefully (a huge tenant may get its own dedicated cell).",
              "**Deploys become cell-by-cell.** I roll each change one cell at a time, bake and watch golden signals, and halt if a cell regresses. A bad deploy reaches at most one cell (~5%) before automated health gates stop the rollout, instead of everyone. This is canary at cell granularity.",
              "**Shuffle sharding** inside shared pools. For any tier that is still a shared worker pool (async job workers, a rate-limited API front), I assign each tenant a unique random *combination* of workers rather than pinning them to one. A poison tenant then degrades only their small combination of workers; other tenants, overlapping on at most part of that set, keep a healthy worker and stay up. This isolates a noisy neighbor to a handful of tenants, not the whole pool.",
              "**Control plane vs data plane + static stability.** I separate the control plane (deploys, config distribution, tenant->cell mapping updates, autoscaling) from the data plane (serving tenant requests). Critically, the data plane is **statically stable**: each cell caches its config and its tenant-routing table locally and keeps serving on last-known-good state if the control plane is unreachable. It takes no action that *requires* the control plane to serve a request. So a control-plane outage means 'we cannot deploy or re-shard right now,' not 'customers are down.' Health checking likewise coasts on last-known-healthy rather than ejecting everything on a blip.",
              "**Tradeoffs.** Cells add operational overhead (N stacks to run, patch, observe) and complicate cross-tenant features; per-cell databases mean data is partitioned, not global. I accept that for a hard 5% blast-radius ceiling. Common wrong turn: keeping one shared database or one shared deploy under the 'cells,' so a poison tenant or bad migration still reaches everyone through the shared piece.",
            ],
          },
          practice: {
            id: "sd-l7-blast-radius-cells-practice",
            prompt:
              "Explain how you would design a global DNS/health-check service (think Route 53 scale, serving millions of queries/second across all customers) so that one abusive customer's traffic and one control-plane outage each affect a minimal set of customers, and the service keeps answering queries even when its control plane is completely down.",
            thinkAbout: [
              "Why must the query data plane never call the control plane?",
              "How does shuffle sharding contain a customer under DDoS?",
              "Why is async propagation of record changes the safe design?",
            ],
            modelAnswerOutline: [
              "Assumptions: an authoritative DNS + health-checking service at Route-53 scale; queries are the hot data-plane path and must never stop; the control plane handles record changes, health-check configuration, and customer onboarding.",
              "**Data plane must be statically stable, full stop.** DNS resolution is life-or-death for every customer's site, so the resolvers (data plane) serve from **locally replicated zone data and last-known health state**. If the control plane is entirely down, resolvers keep answering with the last-known-good records and last-known health status. The only thing lost is the ability to *change* records or reconfigure health checks, not the ability to answer. This is exactly the EC2-style static stability principle: running functions do not depend on the control plane.",
              "**Shuffle sharding to contain abuse.** The resolver fleet is huge, and I assign each customer's zones a **unique shuffle-sharded subset** of resolver capacity (this is literally what Route 53 does). A customer under a massive DDoS or issuing pathological queries only stresses their subset of nodes; another customer overlapping on at most a few of those nodes retains healthy capacity elsewhere. With enough nodes and picks, the chance two customers share their full combination is negligible, so abuse is isolated to a tiny blast radius.",
              "**Cell-based control plane.** The control plane is regionalized/celled so a control-plane failure in one cell affects only the customers homed there, and control-plane failures never propagate to the data plane by construction (the data plane does not call the control plane on the query path).",
              "**Propagation as async, not synchronous dependency.** Record and health changes flow to resolvers via an async replication pipeline; resolvers apply updates when they arrive but never block a query waiting for the control plane. Tradeoff: changes have eventual propagation delay (seconds), which I accept because the alternative (resolvers synchronously consulting the control plane) would make a control-plane blip a global DNS outage. Common wrong turn: putting any control-plane call on the query hot path, which turns the most failure-prone subsystem into a single point of global failure.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l7-m5",
      title: "Deploy, Release & Chaos",
      description:
        "Pick and defend a safe rollout strategy (rolling, blue-green, canary) with real health gates and a tested rollback path, decouple release from deploy using feature flags while migrating a live schema with zero downtime, design a chaos experiment that has a hypothesis and a bounded blast radius, and run an incident plus write the blameless postmortem that stops it from recurring.",
      lessons: [
        {
          id: "sd-l7-deployment-strategies",
          title: "Deployment Strategies: Blue-Green, Canary, Rolling",
          summary:
            "Rolling, blue-green, and canary compared on rollback speed and blast radius, and why every one of them runs two versions of your code at once.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["deployment", "canary", "blue-green"],
          teach: {
            markdown: deploymentStrategiesTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-deployment-strategies-apply",
            prompt:
              "Choose and design a rollout strategy for a schema-touching backend change, and describe the traffic ramp, the health gates between steps, and the exact rollback path.",
            thinkAbout: [
              "What does each strategy trade in infra cost and rollback speed?",
              "What automated analysis gates a canary?",
              "Why separate 'deploy' from 'release'?",
            ],
            modelAnswerOutline: [
              "Assumptions: a payments service, ~5k QPS, on Kubernetes behind Envoy, backed by Postgres. The change adds a `currency_code` column and new write logic. I want small blast radius and fast rollback, so I choose **canary** for the code and **expand/contract** for the schema, run as two separate deploys.",
              "**Schema first, non-destructively.** Deploy migration 1: `ADD COLUMN currency_code TEXT NULL` with a default applied in application code. This is backward compatible, so the currently live version ignores the new column and keeps working. I never rename or drop anything in the same deploy as the code that depends on it.",
              "**Canary ramp with gates.** Using Argo Rollouts, I route 1% of traffic to the new version. At each step (1%, 5%, 25%, 50%, 100%) there is a **bake time** of 10 to 15 minutes during which Kayenta/Prometheus runs automated analysis comparing the canary's error rate, p99 latency, and 5xx ratio against the baseline pods. Promotion happens only if every SLI stays within tolerance; any breach triggers **auto-abort**, shifting traffic back to 0% on the canary. Health gates are objective metrics, not a human eyeball.",
              "**Rollback path (tested).** Because the schema change was additive, rolling the code back is safe: auto-abort routes 100% back to the old version, which still functions because the new column is nullable and unused by it. The rollback is a routing change of seconds, not a rebuild. Only after the new version is at 100% and stable for a day do I run the **contract** migration to drop the old column, in a later deploy.",
              "**Deploy vs release.** The code is deployed to the canary pods before any meaningful traffic reaches it; the 'release' is the analysis-gated traffic ramp. That decoupling is what makes rollback instant. Common wrong turn: shipping `ALTER TABLE ... DROP COLUMN` or a rename inside the same deploy as the new code, so the moment it runs the still-live old version 500s and you cannot roll back because the schema it needs is gone.",
            ],
          },
          practice: {
            id: "sd-l7-deployment-strategies-practice",
            prompt:
              "Design the deploy strategy for a change to Netflix's playback-authorization service, which serves ~2M RPS globally across three AWS regions and cannot tolerate more than a few seconds of elevated error rate. Specify how you ramp, what auto-aborts you, and how you avoid a global blast radius.",
            thinkAbout: [
              "Why is region-by-region isolation, not just a percentage, what bounds the blast radius?",
              "How do you derive the auto-abort threshold from the error budget?",
              "How does keeping one region on the old version enable fast reversal?",
            ],
            modelAnswerOutline: [
              "Assumptions: stateless service, multi-region active-active, fronted by regional load balancers, strict SLO (99.99% availability, so the monthly error budget is minutes). A bad global deploy could black out playback worldwide, so the goal is to make it structurally impossible to break all regions at once.",
              "**Region-by-region canary.** I never deploy to all regions simultaneously. I canary in one region first (say us-east-1): 1% of that region's traffic to the new version, with Kayenta automated analysis comparing canary vs baseline on error rate, latency, and playback-start success. Bake 10 minutes per step, ramp 1% to 100% within the region. Only after the first region is fully healthy for a bake period do I begin the next region, keeping at least one region entirely on the old version until the last step. This caps blast radius at one region even for a bug the canary analysis misses.",
              "**Auto-abort tied to the SLO.** The abort threshold is derived from the error budget, not a round number: if the canary burns budget faster than roughly 10x the baseline rate over a 5-minute window, Argo/Spinnaker auto-rolls traffic back to 0%. Because Netflix pioneered this, the analysis runs continuously, not at a single checkpoint.",
              "**Fast reversal.** The old version is still fully deployed and taking traffic in the untouched regions, so a bad build is contained by shifting the canary region's traffic back and, if needed, using regional DNS/load-balancer steering to drain the affected region to the healthy ones. Recovery is a routing change measured in seconds.",
              "Common wrong turn: a single global canary at 1% of *global* traffic. That still exposes every region to the new code path and a subtle bug (say a bad cache-key format) can corrupt shared state across regions before analysis fires. Regional isolation, not just percentage, is what bounds the blast radius at this scale.",
            ],
          },
        },
        {
          id: "sd-l7-progressive-delivery-schema",
          title: "Progressive Delivery, Feature Flags & Zero-Downtime Schema Changes",
          summary:
            "Why renaming a database column is never one step in a live system, and how expand and contract makes every migration step separately reversible.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["feature-flags", "progressive-delivery", "schema-migration"],
          teach: {
            markdown: progressiveDeliverySchemaTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l7-progressive-delivery-schema-apply",
            prompt:
              "Roll out a risky new pricing engine behind flags to 1% then 100%, and separately rename a heavily-used DB column with zero downtime. Give the ordered migration steps for each.",
            thinkAbout: [
              "How do flags enable targeted rollout, kill-switch, and experiments?",
              "What is the expand/contract (parallel change) sequence?",
              "Why must changes be both backward and forward compatible during rollout?",
            ],
            modelAnswerOutline: [
              "Assumptions: an e-commerce checkout service on Kubernetes with Postgres; the pricing change alters money math, so a bug is a revenue/trust incident. The column rename targets `orders.amount` (hot, millions of rows) to `orders.amount_cents`.",
              "**Pricing engine behind a flag.** Deploy the new engine dark: the code is present but gated by `flag('new_pricing_engine')`, defaulting off, so release is decoupled from deploy. Turn it on for an internal-employee allowlist first (dogfood), then 1% of real users. Run it as an **experiment**: compute the new price alongside the old for flagged users and log both, so I compare distributions before trusting it. Ramp 1% -> 5% -> 25% -> 100% while watching order-value distribution, checkout error rate, and support tickets. If anything looks wrong, flip the flag off in seconds, no redeploy. That kill switch is why a flag beats a plain canary here. After 100% and a stable week, delete the flag to avoid flag debt.",
              "**Column rename with zero downtime (expand/contract).** 1. Expand: `ADD COLUMN amount_cents BIGINT NULL`; old code untouched. 2. Dual-write: deploy code that writes both `amount` and `amount_cents`; reads still use `amount`. 3. Backfill: a throttled, idempotent, restartable job copies `amount` -> `amount_cents` in batched `UPDATE`s by id range, checkpointing after each batch and watching replica lag, with a short `lock_timeout` so the table stays writable and never long-locks. 4. Migrate reads: behind a flag, switch reads to `amount_cents`, verify parity against `amount` for a bake period. 5. Contract: once nothing reads or writes `amount`, stop dual-writing, then in a final separate deploy `DROP COLUMN amount`.",
              "**Why both-directional compatibility.** Mid-rollout, some pods run old code and some new. New code must tolerate rows where `amount_cents` is still NULL (forward compat during backfill); old code must tolerate the extra column existing (backward compat). Violate either and the mixed fleet breaks.",
              "Common wrong turn: rolling back the pricing code after a bad migration without rolling back the schema, or doing the rename in one `ALTER`. Either leaves deployed code pointing at a column that no longer matches, so rollback itself fails and the outage extends.",
            ],
          },
          practice: {
            id: "sd-l7-progressive-delivery-schema-practice",
            prompt:
              "Design the migration to shard Stripe's monolithic `charges` table (billions of rows, thousands of writes/sec, zero tolerance for a wrong or lost charge) from a single Postgres primary onto a partitioned/sharded layout, keeping the API serving throughout. Give the ordered steps and how you verify no charge is lost.",
            thinkAbout: [
              "How does expand/contract apply at the storage layer, not just a column?",
              "Why is a continuous reconciliation gate the part that matters for money?",
              "Why gate the read cutover on a zero-diff metric rather than 'backfill finished'?",
            ],
            modelAnswerOutline: [
              "Assumptions: financial data, so correctness dominates and any inconsistency is a payable incident. Single Postgres primary is the write bottleneck; target is charges sharded by a customer/merchant key. Must stay online.",
              "**Expand/contract at the storage layer.** 1. Expand: stand up the new sharded cluster (Postgres partitioned by hash of merchant_id, or Citus). Schema present, no traffic. 2. Dual-write: deploy a data-access layer that writes every charge to both the old table and the new shards inside the same logical unit, with the old store still authoritative for reads, behind a flag so it can be cut instantly. 3. Backfill: throttled, idempotent, restartable job copies historical charges into the shards, chunked by id range with checkpoints, watching replica and CDC lag; use an online tool or a CDC stream (Debezium off the WAL) so nothing long-locks.",
              "**Reconcile (the part that matters for money):** a continuous verifier reads both stores and asserts row counts and per-charge field parity, emitting a diff metric. I do not migrate reads until the diff is zero and stays zero across a bake period. This catches dropped or mismatched charges before they can affect a customer.",
              "**Migrate reads:** flip reads to the shards for 1% of merchants, then ramp, comparing responses against the old store (shadow reads) until parity holds. **Contract:** once reads are fully on shards and dual-write has been off long enough to be sure, decommission the old table.",
              "**Verification of no loss:** the reconciliation job plus shadow reads are the safety net; the migration is gated on their metrics, not on a calendar. Rollback at any step is a flag flip back to the still-authoritative old store. Common wrong turn: cutting reads over based on 'backfill finished' without a continuous reconciliation gate. At billions of rows a 0.001% drift is thousands of wrong charges, and you will not know until a customer disputes one.",
            ],
          },
        },
        {
          id: "sd-l7-chaos-engineering",
          title: "Chaos Engineering & Fault Injection",
          summary:
            "How to turn 'our failover works' from a guess into evidence: a steady-state hypothesis, a small blast radius, and an abort tied to the error budget.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["chaos", "fault-injection", "resilience"],
          teach: {
            markdown: chaosEngineeringTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-chaos-engineering-apply",
            prompt:
              "Design a chaos experiment to validate that a service survives losing its cache tier. State the hypothesis, the blast radius, the metrics you watch, and the abort criteria.",
            thinkAbout: [
              "What is the steady-state-hypothesis method?",
              "Why run in production with guardrails rather than only staging?",
              "What automatic stop condition ties to the error budget?",
            ],
            modelAnswerOutline: [
              "Assumptions: a product-catalog service at ~20k QPS fronting Postgres with a Redis cache at a ~95% hit ratio. The fear is that if Redis vanishes, the 5% miss rate becomes 100% and Postgres gets a 20x read surge that could topple it. I want to prove the service degrades gracefully instead.",
              "**Steady-state hypothesis.** Steady state is 'catalog p99 latency < 200ms and error rate < 0.1% at current QPS.' Hypothesis: 'if Redis becomes unavailable, the steady state holds within tolerance because request coalescing, a small in-process cache, and a Postgres read-replica pool absorb the miss surge, with load-shedding as a backstop.'",
              "**Fault and blast radius.** The fault is dependency loss: make Redis unreachable. I do NOT flush production Redis. I start tiny: inject the fault for a single canary instance (or 1% of traffic via a fault-injection sidecar / Envoy fault filter / AWS FIS) that treats Redis as down, off-peak, while the rest of the fleet runs normally. This bounds the blast radius to a slice of users and lets me compare the fault instance against the healthy baseline. Only if it holds do I widen to 5%, then an AZ, then consider the whole tier.",
              "**Metrics.** I watch the steady-state SLIs (catalog p99, error rate, successful responses per second) plus the downstream signal that actually predicts collapse: Postgres read QPS, connection-pool saturation, and replica CPU. The point is to see whether the DB surge stays survivable.",
              "**Abort criteria (tied to error budget).** Automatic abort if error rate exceeds 1% or p99 exceeds 500ms for more than 60 seconds, or if Postgres connection saturation crosses 90%. That threshold is derived from the error budget: the experiment may consume a bounded, pre-agreed slice of budget and no more, and crossing it instantly reverts the injection. The experiment can never cause a worse outage than the SLO already tolerates.",
              "**Why production.** Staging has a warm empty cache, tiny data, and no real traffic mix, so the miss surge there is meaningless. Only production has the real 95% hit ratio and real QPS, the entire variable under test. Common wrong turn: running with no hypothesis and no abort ('let's just kill Redis and see'), which is not an experiment, it is an incident, or flushing the whole prod cache at once, converting a bounded test into a real 20x DB overload.",
            ],
          },
          practice: {
            id: "sd-l7-chaos-engineering-practice",
            prompt:
              "Design a GameDay for a fintech that must prove its payments platform survives losing an entire AWS availability zone during business hours, without dropping or double-processing a single payment. State the hypothesis, blast radius controls, what you measure, and the abort plan.",
            thinkAbout: [
              "Why is the exactly-once reconciliation check, not just availability, the point?",
              "How do you bound risk while deliberately running during business hours?",
              "What zero-tolerance condition aborts the experiment instantly?",
            ],
            modelAnswerOutline: [
              "Assumptions: multi-AZ active-active payments platform on AWS, strict correctness (no lost or duplicate payment) and a tight availability SLO. The claim under test is that AZ redundancy actually fails over cleanly under real load.",
              "**Hypothesis.** Steady state: payment-authorization success rate > 99.9% and settlement lag within SLA. Hypothesis: 'if we terminate AZ us-east-1a, steady state holds within tolerance because load balancers reroute to the surviving AZs, the DB has a synchronous standby that promotes, and in-flight payments are idempotent so none are lost or double-charged.'",
              "**Fault and blast radius.** Use AWS FIS to progressively fail AZ-a: first inject latency/errors to a small percentage of AZ-a traffic, then terminate a subset of AZ-a instances, then simulate full AZ loss. Business-hours is deliberate because that is when the failover matters, but I bound risk by ramping the scope and having every payment write be idempotent (keyed by an idempotency token) so a reroute or retry cannot double-process. I brief on-call, freeze other deploys, and run inside a declared maintenance-aware window.",
              "**What I measure.** Authorization success rate, p99 auth latency, DB failover time and replication lag at promotion, and a reconciliation counter that asserts every initiated payment reaches exactly one terminal state. The idempotency/reconciliation check is the one that guarantees correctness, not just availability.",
              "**Abort plan.** Auto-abort and restore the AZ if success rate drops below 99% for 60s, if DB promotion exceeds the RTO, or if the reconciliation counter shows any divergence at all (zero tolerance for lost/duplicate payments). Abort is a single control that stops the FIS experiment and re-enables the AZ.",
              "Common wrong turn: treating this as a pure availability test and skipping the exactly-once reconciliation. An AZ failover can be 'successful' on latency while silently double-submitting the payments that were in flight during the promotion, the far more expensive failure for a fintech.",
            ],
          },
        },
        {
          id: "sd-l7-incident-postmortem",
          title: "Incident Management & Blameless Postmortems",
          summary:
            "Why you roll back before you understand, how incident roles keep the coordinator off the keyboard, and where a 'human error' postmortem stops too early.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["incident-management", "postmortem", "oncall"],
          teach: {
            markdown: incidentPostmortemTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l7-incident-postmortem-apply",
            prompt:
              "Define an incident-response process (severity levels, roles, comms cadence) for a company scaling past its first big outage, and the structure of the blameless postmortem that follows.",
            thinkAbout: [
              "What roles separate coordination from fixing?",
              "Why does mitigation beat diagnosis during an incident?",
              "Why avoid 'human error' as a root cause?",
            ],
            modelAnswerOutline: [
              "Assumptions: a ~150-person startup that just had a multi-hour outage handled by whoever happened to be online. I want a lightweight but real process that scales.",
              "**Severity levels with objective entry criteria.** SEV1: major outage or data loss (checkout error rate > 5% for 5 min, or any data corruption), page immediately, all-hands. SEV2: significant degradation affecting many users but with a workaround, urgent response. SEV3: minor/partial, business hours. SEV4: negligible, ticket only. Objective triggers mean anyone can declare without a debate.",
              "**Roles that separate coordination from fixing.** On a SEV1 I appoint an **Incident Commander** who runs the response and decides but does not touch keyboards; a **Communications Lead** who posts updates to the status page and internal channel; and **Operations/Scribe** engineers who do the hands-on fix and keep a timestamped action log. Anyone can declare an incident and become the initial IC until a more appropriate one takes over. For a SEV3 one person wears several hats.",
              "**Comms cadence.** SEV1: stakeholder + status-page update every 15 to 30 minutes even if the update is 'still investigating,' because silence is worse than bad news. SEV2: every 30 to 60 minutes. This is why Comms is a separate role: fixed cadence should never depend on the person doing the fixing.",
              "**Response flow: mitigate first.** Detect (alerting on SLOs) -> declare severity and assign roles -> **stop the bleeding** (roll back the suspect deploy, fail over the region, shed load, flip a feature flag off) -> only then diagnose. Restoring service is the job during the incident; understanding it is the job of the postmortem. Rolling back first and investigating later routinely turns a 2-hour outage into a 10-minute one.",
              "**Blameless postmortem structure.** Within a few days: a factual **timeline**, quantified **impact** (users, revenue, duration), **contributing causes** (expect several, from the trigger to the missing guardrail to the slow detection), and **action items** each with a named owner and due date, tracked in the same system as feature work so they actually ship. Blameless means we ask 'why did the system allow this,' not 'who did it.' Common wrong turn: a postmortem that concludes 'human error, engineer will be more careful,' which names no fixable system weakness, so the same incident recurs and it teaches people to hide mistakes.",
            ],
          },
          practice: {
            id: "sd-l7-incident-postmortem-practice",
            prompt:
              "Walk through your first 30 minutes as Incident Commander for a Cloudflare-style global outage where a single bad config push has taken down a service fronting millions of sites worldwide, then outline the blameless postmortem, focused on the systemic fixes that prevent a recurrence.",
            thinkAbout: [
              "Why do you revert the config before fully understanding what in it was wrong?",
              "How does the Scribe's timestamped log serve the postmortem?",
              "What systemic causes replace 'someone pushed bad config'?",
            ],
            modelAnswerOutline: [
              "Assumptions: global blast radius, a config change is the prime suspect, every minute is enormous customer impact. Correctness of the response process matters more than cleverness.",
              "**First 30 minutes as IC.** Declare SEV1 immediately and assign roles: I command and do not touch config; a Comms Lead starts posting to the public status page and internal war room on a strict 15-minute cadence; Ops engineers execute. **Mitigate before diagnosis:** the fastest path to recovery is to revert the last config push, so I direct an immediate rollback to the last-known-good config rather than debating what in it was wrong. In parallel someone confirms the change is the trigger (timeline correlation with the deploy), but the rollback does not wait for full understanding.",
              "**If the config system itself is wedged**, I escalate to the break-glass path to force the previous version. Throughout, the Scribe timestamps every action so the postmortem timeline is accurate. I resist the strong pull to root-cause live; restoring millions of sites is the only priority until the metric recovers.",
              "**Blameless postmortem, systemic focus.** Timeline from push to detection to rollback to recovery, with quantified impact (duration, sites affected, error volume). Contributing causes will be plural and systemic, not 'someone pushed bad config': Why could one config change reach 100% of the global fleet at once (no staged/progressive rollout)? Why did validation not catch it before deploy (no schema/canary check on config)? Why was detection reliant on customer reports instead of automated SLO alerting?",
              "**Action items target each:** progressive config rollout with automated analysis (config is a deploy and deserves canarying), pre-deploy validation, a fast tested rollback, and better detection. Each item gets an owner and a due date and is tracked to completion. Common wrong turn: stopping at 'human error, the engineer will be retrained.' The real failure is a system that let a single unvalidated change hit every region simultaneously; blaming the person leaves that system unchanged, so the outage recurs with a different name on the commit.",
            ],
          },
        },
      ],
    },
  ],
}
