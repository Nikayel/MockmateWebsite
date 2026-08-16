/**
 * L5 real-codebase module, lesson 2: "The other caller of the code you changed".
 *
 * Multi-file workspace lesson, and the module's first two-file edit. The entry state is
 * realistic: a generated change to a shared helper already landed, it satisfied the caller
 * it was aimed at, and it silently broke a second caller that was never in the context
 * window. The graded fix is to restore the helper's documented contract and relocate the
 * special case into the layer that actually wants it. Apply: a metrics pipeline where
 * `duration.minutes` was changed to round up for billing and made ops alerts fire early.
 * Practice: a back office where the shared week helper was moved to Sunday starts for the
 * analytics report and broke payroll's Monday pay periods.
 *
 * Workspace contract (mirrors level3/level4): every package dir has an __init__.py; the
 * runner (role "test", hidden) prints __WORKSPACE_TEST_RESULTS__: + JSON; a suite label
 * containing the word "hidden" marks its rows hidden. The apply exercise keeps BOTH caller
 * suites visible, because the seesaw between them is the thing the learner has to watch,
 * and adds a third suite of hidden boundary tests; the practice pairs one visible suite
 * with hidden boundary days. In both exercises the hidden suite is what punishes a repair
 * that satisfies the visible assertions at the inputs they happen to name while leaving the
 * shared helper's promise broken everywhere else. `buildRunner` below takes N suites for
 * that reason. This file only exports the lesson; the lead agent wires it into
 * level5/index.ts inside the "py-l5-real-codebases" module.
 */
import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"

const EMPTY_INIT = ""

/** One test module the runner imports, paired with the suite label its rows carry. */
interface RunnerSuite {
  /** Module name under `tests/`, without the `.py`. */
  module: string
  /** Suite label. `record_factory` derives isHidden from the word "hidden" appearing here. */
  label: string
}

/**
 * File-local by design: level3 and level4 each carry their own copy of this helper and none of
 * them is importable, so the signature is this file's to choose. Generalized from the fixed
 * (visible, hidden) pair those files use to N suites, which is what lets the apply exercise keep
 * both of its teaching suites visible and still ship a hidden one.
 */
function buildRunner(suites: RunnerSuite[]): string {
  const imports = suites.map((suite) => suite.module).join(", ")
  const invocations = suites
    .map((suite) => `${suite.module}.run_tests(record_factory("${suite.label}"))`)
    .join("\n")

  return String.raw`import json
import os
import sys
import traceback

sys.path.insert(0, os.getcwd())
from tests import ${imports}

results = []


def record_factory(suite):
    def record(name, fn):
        is_hidden = "hidden" in suite.lower()
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None, "isHidden": is_hidden})
        except AssertionError as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or (name + " failed"), "isHidden": is_hidden})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc(), "isHidden": is_hidden})

    return record


${invocations}
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`
}

// ───────────────────────────────────────────────────────────────────────────
// Apply workspace: the metrics pipeline (ops alerts vs the usage report)
// ───────────────────────────────────────────────────────────────────────────

const APPLY_README = buildBrief({
  lesson: "py-l5-the-other-caller",
  slot: "apply",
  kind: "change-log",
  headline: "the usage fix landed, the alerts now fire early",
  body: `Yesterday's ticket was that sessions shorter than a minute billed zero minutes on the usage
report. A generated change edited \`pipeline/duration.py\` so \`minutes\` rounds up. The usage
suite went green and the change shipped.

This morning the ops team reports that runtime alerts fire a minute early.
\`pipeline/alerts.py\` belongs to the ops team and is read-only, so whatever the repair is, it
has to work without touching their module.

Keep yesterday's billing behavior and give ops their thresholds back. \`pipeline/duration.py\`
and \`pipeline/usage.py\` are yours to edit, and every suite has to pass at the same time.

The hidden tests check the same two contracts at durations the visible suites do not
name, so a repair that only satisfies the seconds you can read will not be enough.`,
})

const PIPELINE_DURATION_STARTER = String.raw`"""Elapsed time helpers for the metrics pipeline."""


def minutes(seconds):
    """Return the number of whole elapsed minutes in seconds.

    A partial minute does not count, so 179 seconds is 2 elapsed minutes.
    """
    # Generated change under review: rounds up so short sessions bill at least
    # one minute. Leave it exactly as it is until you have read every caller.
    return (seconds + 59) // 60
`

const PIPELINE_DURATION_REFERENCE = String.raw`"""Elapsed time helpers for the metrics pipeline."""


def minutes(seconds):
    """Return the number of whole elapsed minutes in seconds.

    A partial minute does not count, so 179 seconds is 2 elapsed minutes.
    """
    return seconds // 60
`

const PIPELINE_ALERTS = String.raw`"""Runtime alerting. Owned by the ops team and read-only for this repair."""

from pipeline import duration


def should_alert(runtime_seconds, threshold_minutes):
    """Return True when a job has run for at least threshold_minutes.

    Ops semantics: only fully elapsed minutes count. A job at 179 seconds has
    run 2 minutes, not 3, so a 3 minute threshold must not fire yet.
    """
    return duration.minutes(runtime_seconds) >= threshold_minutes
`

const PIPELINE_USAGE_STARTER = String.raw`"""Usage reporting: the minutes customers are billed for."""

from pipeline import duration


def billed_minutes(session_seconds):
    """Return the billed minutes for a list of session lengths in seconds.

    Billing contract: any started minute bills as a full minute, per session.
    A 30 second session bills 1 minute and a 61 second session bills 2. A
    session of zero seconds started no minute, so it bills nothing.
    """
    total = 0
    for seconds in session_seconds:
        total += duration.minutes(seconds)
    return total
`

const PIPELINE_USAGE_REFERENCE = String.raw`"""Usage reporting: the minutes customers are billed for."""


def billed_minutes(session_seconds):
    """Return the billed minutes for a list of session lengths in seconds.

    Billing contract: any started minute bills as a full minute, per session.
    A 30 second session bills 1 minute and a 61 second session bills 2. A
    session of zero seconds started no minute, so it bills nothing.
    """
    total = 0
    for seconds in session_seconds:
        # Billing rounds up here, in the caller that wants it. The shared helper
        # promises whole elapsed minutes and alerting depends on that promise.
        total += (seconds + 59) // 60
    return total
`

const PIPELINE_TEST_ALERTS = String.raw`from pipeline.alerts import should_alert


def run_tests(record):
    def just_under_three_minutes_stays_quiet():
        fired = should_alert(179, 3)
        assert fired is False, (
            f"179 seconds is 2 fully elapsed minutes, so a 3 minute threshold "
            f"must not fire, got {fired!r}"
        )

    def just_under_one_minute_stays_quiet():
        fired = should_alert(59, 1)
        assert fired is False, (
            f"59 seconds is 0 fully elapsed minutes, so a 1 minute threshold "
            f"must not fire, got {fired!r}"
        )

    def exactly_three_minutes_fires():
        fired = should_alert(180, 3)
        assert fired is True, (
            f"180 seconds is exactly 3 elapsed minutes and must fire, got {fired!r}"
        )

    def exactly_one_minute_fires():
        fired = should_alert(60, 1)
        assert fired is True, (
            f"60 seconds is exactly 1 elapsed minute and must fire, got {fired!r}"
        )

    record("179 seconds does not fire a 3 minute alert", just_under_three_minutes_stays_quiet)
    record("59 seconds does not fire a 1 minute alert", just_under_one_minute_stays_quiet)
    record("180 seconds fires the 3 minute alert", exactly_three_minutes_fires)
    record("60 seconds fires the 1 minute alert", exactly_one_minute_fires)
`

const PIPELINE_TEST_USAGE = String.raw`from pipeline.usage import billed_minutes


def run_tests(record):
    def part_minutes_bill_as_full_minutes():
        billed = billed_minutes([30, 90])
        assert billed == 3, (
            f"a 30 second session bills 1 and a 90 second session bills 2, "
            f"so the total is 3, got {billed}"
        )

    def one_second_past_the_minute_bills_two():
        billed = billed_minutes([61])
        assert billed == 2, (
            f"61 seconds has started a second minute and bills 2, got {billed}"
        )

    def each_session_rounds_up_on_its_own():
        billed = billed_minutes([59, 61])
        assert billed == 3, (
            f"rounding is per session, so 59 bills 1 and 61 bills 2 for a total "
            f"of 3, got {billed}"
        )

    def an_exact_minute_does_not_gain_one():
        billed = billed_minutes([120])
        assert billed == 2, (
            f"120 seconds is exactly 2 started minutes, not 3, got {billed}"
        )

    record("short sessions bill a full minute each", part_minutes_bill_as_full_minutes)
    record("61 seconds bills 2 minutes", one_second_past_the_minute_bills_two)
    record("each session rounds up on its own", each_session_rounds_up_on_its_own)
    record("an exact minute does not gain one", an_exact_minute_does_not_gain_one)
`

/**
 * The boundary tests the neighbor never had, which is the lesson's own closing argument.
 *
 * Every assertion here is the same two contracts the visible suites state, checked at durations
 * the visible suites do not name, plus two direct calls on the shared helper so its documented
 * promise is graded on its own rather than only through a caller. That combination is what
 * separates a real repair from one that pattern-matches the visible seconds: a helper that floors
 * below 180 and rounds up above it, or one that special-cases the four durations the alerting
 * suite asserts, satisfies every visible row and dies here.
 */
const PIPELINE_TEST_BOUNDARIES_HIDDEN = String.raw`from pipeline import duration
from pipeline.alerts import should_alert
from pipeline.usage import billed_minutes


def run_tests(record):
    def the_helper_floors_a_partial_minute():
        got = duration.minutes(90)
        assert got == 1, (
            f"90 seconds is 1 fully elapsed minute plus a partial one, and the "
            f"helper documents whole elapsed minutes, so it must return 1, got {got}"
        )

    def the_helper_floors_a_long_partial_minute():
        got = duration.minutes(3599)
        assert got == 59, (
            f"3599 seconds is 59 fully elapsed minutes, so the shared helper "
            f"must return 59, got {got}"
        )

    def a_long_job_stays_quiet_one_second_early():
        fired = should_alert(3599, 60)
        assert fired is False, (
            f"3599 seconds is 59 fully elapsed minutes, so a 60 minute threshold "
            f"must not fire yet, got {fired!r}"
        )

    def a_long_job_fires_on_the_exact_minute():
        fired = should_alert(3600, 60)
        assert fired is True, (
            f"3600 seconds is exactly 60 elapsed minutes and must fire, got {fired!r}"
        )

    def a_mid_length_job_stays_quiet_one_second_early():
        fired = should_alert(301, 6)
        assert fired is False, (
            f"301 seconds is 5 fully elapsed minutes, so a 6 minute threshold "
            f"must not fire, got {fired!r}"
        )

    def a_long_session_bills_every_started_minute():
        billed = billed_minutes([3601])
        assert billed == 61, (
            f"3601 seconds has started a 61st minute, so it bills 61, got {billed}"
        )

    def a_zero_length_session_bills_nothing():
        billed = billed_minutes([0, 45])
        assert billed == 1, (
            f"a session of zero seconds started no minute and bills 0, so with a "
            f"45 second session the total is 1, got {billed}"
        )

    record("the helper floors a partial minute", the_helper_floors_a_partial_minute)
    record("the helper floors a long partial minute", the_helper_floors_a_long_partial_minute)
    record("a long job stays quiet one second early", a_long_job_stays_quiet_one_second_early)
    record("a long job fires on the exact minute", a_long_job_fires_on_the_exact_minute)
    record(
        "a mid length job stays quiet one second early",
        a_mid_length_job_stays_quiet_one_second_early,
    )
    record("a long session bills every started minute", a_long_session_bills_every_started_minute)
    record("a zero length session bills nothing", a_zero_length_session_bills_nothing)
`

// ───────────────────────────────────────────────────────────────────────────
// Practice workspace: the back office (payroll periods vs the weekly report)
// ───────────────────────────────────────────────────────────────────────────

const PRACTICE_README = buildBrief({
  lesson: "py-l5-the-other-caller",
  kind: "change-log",
  headline: "report weeks moved to Sunday, payroll grouping broke",
  body: `A generated change edited \`backoffice/weeks.py\` so \`week_start\` returns the Sunday of the
week. The analytics weekly report wanted Sunday weeks, and the report has looked right ever
since.

Finance reports that pay periods have been grouped wrong since that change.
\`backoffice/payroll.py\` is owned by the finance team and is read-only. Pay periods start on
Monday and that is not negotiable.

Give payroll its Monday weeks back without giving up the report's Sunday weeks.
\`backoffice/weeks.py\` and \`backoffice/analytics.py\` are yours to edit.`,
})

const BACKOFFICE_WEEKS_STARTER = String.raw`"""Calendar helpers shared by the back office reports."""

from datetime import timedelta


def week_start(d):
    """Return the Monday of the week containing the date d."""
    # Generated change under review: shifted to Sunday for the weekly report.
    # Leave it exactly as it is until you have read every caller.
    return d - timedelta(days=(d.weekday() + 1) % 7)
`

const BACKOFFICE_WEEKS_REFERENCE = String.raw`"""Calendar helpers shared by the back office reports."""

from datetime import timedelta


def week_start(d):
    """Return the Monday of the week containing the date d."""
    return d - timedelta(days=d.weekday())
`

const BACKOFFICE_PAYROLL = String.raw`"""Pay periods. Owned by the finance team and read-only for this repair."""

from backoffice import weeks


def period_key(d):
    """Return the pay period key for the date d.

    Finance contract: a pay period starts on Monday, so the key is the ISO date
    of that Monday.
    """
    return weeks.week_start(d).isoformat()
`

const BACKOFFICE_ANALYTICS_STARTER = String.raw`"""The weekly analytics report."""

from backoffice import weeks


def report_week(d):
    """Return the first day of the report week containing the date d.

    Report contract: report weeks start on Sunday.
    """
    return weeks.week_start(d)
`

const BACKOFFICE_ANALYTICS_REFERENCE = String.raw`"""The weekly analytics report."""

from datetime import timedelta


def report_week(d):
    """Return the first day of the report week containing the date d.

    Report contract: report weeks start on Sunday.
    """
    # Sunday weeks belong to this report. The shared helper promises Monday
    # because payroll depends on that promise.
    return d - timedelta(days=(d.weekday() + 1) % 7)
`

const BACKOFFICE_TEST_WEEKS = String.raw`from datetime import date

from backoffice.analytics import report_week
from backoffice.payroll import period_key


def run_tests(record):
    def payroll_groups_a_wednesday_into_its_monday():
        key = period_key(date(2026, 7, 15))
        assert key == "2026-07-13", (
            f"2026-07-15 is a Wednesday, so its pay period starts on Monday "
            f"2026-07-13, got {key!r}"
        )

    def the_report_groups_that_wednesday_into_its_sunday():
        start = report_week(date(2026, 7, 15))
        assert start == date(2026, 7, 12), (
            f"the report week holding Wednesday 2026-07-15 starts on Sunday "
            f"2026-07-12, got {start!r}"
        )

    record("payroll groups a Wednesday into its Monday", payroll_groups_a_wednesday_into_its_monday)
    record(
        "the report groups that Wednesday into its Sunday",
        the_report_groups_that_wednesday_into_its_sunday,
    )
`

const BACKOFFICE_TEST_WEEKS_HIDDEN = String.raw`from datetime import date

from backoffice.analytics import report_week
from backoffice.payroll import period_key


def run_tests(record):
    def payroll_on_a_sunday_reaches_back_to_monday():
        key = period_key(date(2026, 8, 2))
        assert key == "2026-07-27", f"expected 2026-07-27, got {key!r}"

    def payroll_on_a_monday_returns_that_monday():
        key = period_key(date(2026, 7, 13))
        assert key == "2026-07-13", f"expected 2026-07-13, got {key!r}"

    def the_report_on_a_sunday_returns_that_sunday():
        start = report_week(date(2026, 8, 2))
        assert start == date(2026, 8, 2), f"expected 2026-08-02, got {start!r}"

    def the_report_on_a_saturday_reaches_back_to_sunday():
        start = report_week(date(2026, 8, 1))
        assert start == date(2026, 7, 26), f"expected 2026-07-26, got {start!r}"

    def payroll_crosses_the_year_boundary():
        key = period_key(date(2026, 1, 1))
        assert key == "2025-12-29", f"expected 2025-12-29, got {key!r}"

    record("payroll on a Sunday reaches back to Monday", payroll_on_a_sunday_reaches_back_to_monday)
    record("payroll on a Monday returns that Monday", payroll_on_a_monday_returns_that_monday)
    record("the report on a Sunday returns that Sunday", the_report_on_a_sunday_returns_that_sunday)
    record(
        "the report on a Saturday reaches back to Sunday",
        the_report_on_a_saturday_reaches_back_to_sunday,
    )
    record("payroll crosses the year boundary", payroll_crosses_the_year_boundary)
`

// ───────────────────────────────────────────────────────────────────────────
// The lesson
// ───────────────────────────────────────────────────────────────────────────

export const theOtherCallerLesson: PythonLesson = {
  id: "py-l5-the-other-caller",
  title: "The other caller of the code you changed",
  summary:
    "Change a shared helper without breaking its second caller: map every call site, keep both contracts, and move the special case into the layer that wants it.",
  estimatedMinutes: 32,
  difficulty: "medium",
  skills: ["code reading", "code review", "minimal change", "regression tests"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## Shared code has more than one boss

Yesterday's ticket was small. Sessions shorter than a minute were billing zero minutes on the usage report. An assistant was pointed at the report, followed the number back to a shared helper called \`minutes\`, and changed the helper to round up. The usage suite went green, the diff was one line, and it shipped.

This morning a different team's pager fires a minute early on every job, because their alerting module calls \`minutes\` too, and it was built on the promise that a partial minute does not count. Nobody edited that module. Nobody opened it. It was never among the files the assistant was shown, and it had no test at the boundary where the two answers differ.

That is the most common regression shape in AI-assisted work, and this lesson starts where you actually arrive: after the change landed. Two callers want two different things from one function, and the function currently serves one of them.

## Find every caller first

Before you judge any change to shared code, get the list of who depends on it. Search the repository for the function name and for imports of its module, then write one line per call site saying what that caller asks for. It takes a minute, and it is the entire difference between a repair and a second outage.

| caller | what it asks of \`minutes\` |
| --- | --- |
| the alerting check | whole elapsed minutes, so a partial minute never trips a threshold |
| the billing rollup | any started minute, because a customer who used 30 seconds used the service |

Written out, the conflict is obvious and the one line change stops looking like a fix. Here is the same shape with storage sizes, so the pipeline trace stays yours to do:

\`\`\`python
# storage/size.py
def kilobytes(byte_count):
    """Whole kilobytes stored. A partial kilobyte does not count."""
    return byte_count // 1024


# quota/enforce.py
def over_quota(byte_count, limit_kb):
    return kilobytes(byte_count) > limit_kb    # wants whole stored kilobytes


# invoices/lines.py
def storage_charge_kb(byte_count):
    return kilobytes(byte_count)               # wants any started kilobyte charged
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "callers-before-changes",
  "prompt": "A ticket asks you to change the rounding in a shared helper. What comes first?",
  "options": [
    {
      "label": "Find every call site and write down what each one expects",
      "correct": true,
      "feedback": "Right. A shared helper's behavior is a promise to everyone who imports it, and the only way to know what you are about to break is to read the callers. The search takes a minute and it is what makes the next decision informed instead of lucky."
    },
    {
      "label": "Make the change and run the visible tests to see what breaks",
      "feedback": "Tempting because green feels like proof, but a suite only covers the callers somebody thought to test. The neighbor that breaks in this lesson stayed green through CI, which is exactly why the change shipped."
    },
    {
      "label": "Read the helper's docstring and trust what it claims",
      "feedback": "Worth reading, and it tells you the intended contract, but a docstring only states a claim. Callers are what actually depend on the behavior, and a caller can rely on something the docstring never spelled out."
    },
    {
      "label": "Copy the helper into your own module and edit the copy",
      "feedback": "It dodges today's breakage, which is why it feels safe, but it creates the drifted duplicate from the previous lesson. Now one rule lives in two places and the next legitimate change updates only one of them."
    }
  ]
}
\`\`\`

## The change lives where the need lives

A helper's docstring is a contract, and every caller signed it. When one caller needs something different, the difference belongs in that caller, or behind a new parameter whose default preserves the old behavior for everyone who did not ask for a change.

\`\`\`python
# before: the invoice's rounding was pushed into the shared helper
def kilobytes(byte_count):
    return (byte_count + 1023) // 1024    # quota now trips one kilobyte early


# after: the invoice rounds up at the invoice
def kilobytes(byte_count):
    """Whole kilobytes stored. A partial kilobyte does not count."""
    return byte_count // 1024


def storage_charge_kb(byte_count):
    return (byte_count + 1023) // 1024
\`\`\`

The move to avoid is a branch inside the helper keyed on who is calling. It keeps the code in one place, which feels tidy, but the shared function now knows its callers by name, and the next caller either lands in the wrong branch or adds a third one.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "where-does-ceil-belong",
  "prompt": "One caller needs rounding that contradicts the helper's documented contract. Where does that difference belong?",
  "options": [
    {
      "label": "Push it into the calling code, or add an opt-in parameter that leaves the default unchanged",
      "correct": true,
      "feedback": "Right. Both keep the promise every other caller depends on. Rounding locally is the smaller change, and a default-preserving parameter is fair when several callers will want the option."
    },
    {
      "label": "In the helper body, since that is where the math already lives",
      "feedback": "This is the change that caused the outage. Editing where the math lives is the shortest path to satisfying the caller in front of you, and it silently rewrites the answer for every caller you are not looking at."
    },
    {
      "label": "In a branch inside the helper that checks which module is calling",
      "feedback": "Tempting because the logic stays in one file, but a shared helper that knows its callers by name is worse than two honest functions. Every new caller has to be added to the branch or it gets the wrong answer."
    },
    {
      "label": "In a second copy of the helper file, one per rounding rule",
      "feedback": "It ends today's argument by creating two sources of truth. The copies agree the day you make them and drift on the first change to either one, which is a slower version of the same bug."
    }
  ]
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "blast-radius",
  "prompt": "The alerting check wants whole elapsed minutes and the billing rollup wants any started minute. Sort each arrangement by whether both contracts survive it.",
  "buckets": ["both contracts hold", "a caller breaks"],
  "items": [
    {
      "label": "The helper rounds up and both callers use it as is",
      "bucket": "a caller breaks",
      "feedback": "Billing is happy and alerting fires a minute early on every partial minute, which is the outage this lesson opens with."
    },
    {
      "label": "The helper returns whole elapsed minutes and billing rounds up locally",
      "bucket": "both contracts hold",
      "feedback": "The documented promise is intact for alerting, and the caller with the special need carries it in one place where a reader can see why."
    },
    {
      "label": "The helper returns whole elapsed minutes and billing is left unchanged",
      "bucket": "a caller breaks",
      "feedback": "This is the revert that stops halfway. Alerting recovers and short sessions bill zero minutes again, so yesterday's ticket reopens tomorrow."
    },
    {
      "label": "The helper gains a round_up flag defaulting to False and billing passes True",
      "bucket": "both contracts hold",
      "feedback": "Legitimate too, because the default protects every existing caller. It costs a wider signature, so prefer it when more than one caller will want the option."
    }
  ]
}
\`\`\`

## Prove you did not break the neighbor

The reason yesterday's change survived review is that the neighbor had no test at the boundary where the two rules disagree. Whole minutes and rounded up minutes agree on every exact minute and differ on every other input, and the alerting suite only asserted exact ones. So the repair is not finished when both suites pass. It is finished when the drifted boundary has the test the neighbor was missing, which is why the alerting suite in this lesson pins 179 seconds and 59 seconds rather than only 180 and 60.

## Pitfalls

- Reverting the helper and stopping there. The neighbor recovers, the caller that asked for the change breaks, and you have traded one outage for the other.
- Branching inside the helper on which caller is asking. One shared function that knows its callers by name is harder to change than two honest ones.
- Copying the helper into your caller and editing the copy. It ends the argument today and starts a drift bug next quarter.
- Reading green CI as a list of callers. It is a list of tests, which is a different and usually shorter list.

**Interview nuance:** in a pairing round, a shared helper with a second call site is seeded on purpose, and the interviewer is watching for one sentence. Saying "before I touch this, let me see who else calls it" and then actually searching is one of the clearest experience signals you can give, because it shows you have been on the receiving end of somebody else's local fix.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "green-ci-lie",
  "prompt": "Yesterday's change to the shared helper shipped with CI fully green, and it broke a caller. How?",
  "options": [
    {
      "label": "The neighbor had no test at the boundary where the two roundings disagree",
      "correct": true,
      "feedback": "Right. Green means the tests we have passed, not that the callers we have are safe. The alerting suite only asserted exact minutes, so the one input class that changed was never checked."
    },
    {
      "label": "The change was simply correct, and the alert thresholds were wrong all along",
      "feedback": "The ops team's pager firing a minute early says otherwise, and their module documents whole elapsed minutes. When a working caller changes behavior without being edited, the change is the suspect."
    },
    {
      "label": "Whole minutes and rounded up minutes agree on almost every input anyway",
      "feedback": "They agree only on exact multiples of 60 and disagree on every other second value. The overlap feels large because tests reach for round numbers, which is precisely how the gap stayed invisible."
    },
    {
      "label": "The alerting suite must have been skipped in that CI run",
      "feedback": "A plausible wiring story, and worth ruling out, but here the suite ran and passed. It asserted too little rather than too little running, which is the harder failure to notice."
    }
  ],
  "reveal": "The checklist, in order: list the call sites, state what each caller expects, put the change where the need lives, then add the boundary test the neighbor never had."
}
\`\`\``,
    demoCode: `# One helper, two callers, two different contracts.
def minutes_floor(seconds):
    return seconds // 60


def minutes_ceil(seconds):
    return (seconds + 59) // 60


def alert_fires(minutes_fn, runtime_seconds, threshold):
    # Ops contract: only fully elapsed minutes count.
    return minutes_fn(runtime_seconds) >= threshold


def billed(minutes_fn, sessions):
    # Billing contract: any started minute bills as a full minute.
    return sum(minutes_fn(s) for s in sessions)


print("helper  alert at 179s against a 3 min threshold  billed for [30, 90]")
for name, fn in [("floor", minutes_floor), ("ceil", minutes_ceil)]:
    fires = alert_fires(fn, 179, 3)
    print(f"{name:<6}  {str(fires):<41}  {billed(fn, [30, 90])}")

print()
print("Ops wants no alert at 179 seconds. Billing wants 3 minutes for [30, 90].")
print("floor: ops is quiet, billing under-bills the short sessions.")
print("ceil:  billing is right, ops gets paged a minute early.")
print("No single body satisfies both, so the difference belongs in a caller.")`,
  },
  apply: {
    estimatedMinutes: 13,
    id: "py-l5-the-other-caller-apply",
    executionMode: "workspace",
    prompt: `Fix the early alerts without losing yesterday's usage fix: restore the documented
contract of \`pipeline/duration.py\` and put the round-up where it belongs. Start with
\`README.md\` for the change log. The alerts module is owned by another team and is read-only.
Some tests are hidden.`,
    starterCode: "",
    hints: [
      "List every caller of `minutes` before touching it; there are two and they want different things.",
      "The docstring in `pipeline/duration.py` promises whole elapsed minutes and `should_alert` depends on that promise; only `billed_minutes` wants the round-up.",
      "Restore `seconds // 60` in `minutes` and round up inside `billed_minutes` with `(seconds + 59) // 60` per session.",
    ],
    workspace: {
      language: "python",
      // The brief's goal line is rendered as `Edit ${primaryFilePath}`, and the workspace
      // validator requires the primary file to be editable, so this must not be README.md.
      // README.md is files[0], so it is still the first tab the learner sees.
      primaryFilePath: "pipeline/duration.py",
      editableFilePaths: ["pipeline/duration.py", "pipeline/usage.py"],
      visibleTestPaths: ["tests/test_alerts.py", "tests/test_usage.py"],
      hiddenTestPaths: ["tests/test_boundaries_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: APPLY_README },
        { path: "pipeline/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "pipeline/duration.py",
          role: "editable",
          language: "python",
          content: PIPELINE_DURATION_STARTER,
          description: "The shared helper both callers use",
        },
        {
          path: "pipeline/alerts.py",
          role: "readonly",
          language: "python",
          content: PIPELINE_ALERTS,
          description: "Ops alerting, owned by another team (read-only)",
        },
        {
          path: "pipeline/usage.py",
          role: "editable",
          language: "python",
          content: PIPELINE_USAGE_STARTER,
          description: "The billing caller of the shared helper",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_alerts.py",
          role: "test",
          language: "python",
          content: PIPELINE_TEST_ALERTS,
          description: "Visible alerting tests",
        },
        {
          path: "tests/test_usage.py",
          role: "test",
          language: "python",
          content: PIPELINE_TEST_USAGE,
          description: "Visible usage tests",
        },
        {
          path: "tests/test_boundaries_hidden.py",
          role: "test",
          language: "python",
          content: PIPELINE_TEST_BOUNDARIES_HIDDEN,
          hidden: true,
          description: "Hidden boundary tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_alerts", label: "visible alerts" },
            { module: "test_usage", label: "visible usage" },
            { module: "test_boundaries_hidden", label: "hidden boundaries" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "pipeline/duration.py",
          role: "editable",
          language: "python",
          content: PIPELINE_DURATION_REFERENCE,
        },
        {
          path: "pipeline/usage.py",
          role: "editable",
          language: "python",
          content: PIPELINE_USAGE_REFERENCE,
        },
      ],
    },
  },
  practice: {
    estimatedMinutes: 10,
    id: "py-l5-the-other-caller-practice",
    executionMode: "workspace",
    prompt: `Payroll grouping broke the day after a generated change made week starts land on
Sunday for the analytics report. Repair \`backoffice/weeks.py\` and \`backoffice/analytics.py\`
so payroll gets its documented Monday weeks back while the analytics report keeps its Sunday
weeks. Start with \`README.md\` for the change log. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Both `payroll` and `analytics` import the same helper; write down what each one expects before editing either file.",
      "`week_start` documents Monday and finance depends on it, so Sunday belongs to the analytics layer only.",
      "Restore `d - timedelta(days=d.weekday())` in `week_start` and compute the Sunday start inside `report_week`.",
    ],
    workspace: {
      language: "python",
      // See the apply workspace: primaryFilePath drives the brief's "Edit ..." goal line and
      // must be an editable file.
      primaryFilePath: "backoffice/weeks.py",
      editableFilePaths: ["backoffice/weeks.py", "backoffice/analytics.py"],
      visibleTestPaths: ["tests/test_weeks.py"],
      hiddenTestPaths: ["tests/test_weeks_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PRACTICE_README },
        {
          path: "backoffice/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "backoffice/weeks.py",
          role: "editable",
          language: "python",
          content: BACKOFFICE_WEEKS_STARTER,
          description: "The shared week helper both reports use",
        },
        {
          path: "backoffice/payroll.py",
          role: "readonly",
          language: "python",
          content: BACKOFFICE_PAYROLL,
          description: "Pay periods, owned by finance (read-only)",
        },
        {
          path: "backoffice/analytics.py",
          role: "editable",
          language: "python",
          content: BACKOFFICE_ANALYTICS_STARTER,
          description: "The weekly report caller of the shared helper",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_weeks.py",
          role: "test",
          language: "python",
          content: BACKOFFICE_TEST_WEEKS,
          description: "Visible week tests",
        },
        {
          path: "tests/test_weeks_hidden.py",
          role: "test",
          language: "python",
          content: BACKOFFICE_TEST_WEEKS_HIDDEN,
          hidden: true,
          description: "Hidden week tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_weeks", label: "visible weeks" },
            { module: "test_weeks_hidden", label: "hidden weeks" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "backoffice/weeks.py",
          role: "editable",
          language: "python",
          content: BACKOFFICE_WEEKS_REFERENCE,
        },
        {
          path: "backoffice/analytics.py",
          role: "editable",
          language: "python",
          content: BACKOFFICE_ANALYTICS_REFERENCE,
        },
      ],
    },
  },
}
