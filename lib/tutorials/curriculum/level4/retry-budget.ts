// ───────────────────────────────────────────────────────────────────────────
// L4-M6: AI Engineering Plumbing
// ───────────────────────────────────────────────────────────────────────────

/**
 * L4: the control loop around a flaky, expensive model call.
 *
 * The sandbox is Pyodide 0.26.4, which is the CPython 3.12 standard library and nothing else: no
 * network, no threads, no wheels. So the model here is a provided fake that replays a scripted
 * sequence of failures and reports what each attempt cost. That is deliberate rather than a
 * concession. Every decision this lesson grades (which failures are worth repeating, how long to
 * wait, when to stop, what makes a retry safe) is arithmetic and control flow the learner writes;
 * the stub carries none of it.
 *
 * Time budget (counted, not guessed). Teach 8: ~1,150 prose words, four checks, four code fences.
 * Apply 12: 45 provided lines to read (two fakes and the grader's probe), 20 to write across
 * `backoff_delay` and `call_with_budget`. Practice 35: 60 lines of README, 45 of read-only gateway
 * and spec, 37 to write across two files. 8 + 12 + 35 = 55, the lesson total.
 *
 * Ramp: practice reference is 37 real lines against an apply reference of 70, a ratio of 0.53x.
 * The apply reference carries the provided fakes, which is why the number is below one. Measured by
 * skill rather than by line count, Apply writes the backoff and the budget loop and Practice writes
 * the idempotency layer over a different side-effecting operation, which is one conceptual step.
 */
import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const RETRY_README = buildBrief({
  lesson: "py-l4-retry-budget",
  kind: "postmortem",
  headline: "the refund job paid 41 customers twice",
  body: `Tuesday's refund run timed out against the payments gateway partway through, so it was restarted.
Forty-one accounts were refunded a second time. The gateway's own record says every one of those
duplicates was a separate, valid request: our job asked for them.

Two defects, both in the client:

1. The job sent a fresh request id on every attempt, so the gateway had no way to tell a retry from
   a new refund. A timeout is silence about the outcome, and the first attempt had in fact landed.
2. The job kept no record of what it had already settled, so the restart began again from the top.

Nothing here waits on a clock. The gateway is a fake and there is no latency to absorb, so retry
immediately and keep your attention on the key.

Two files are yours. \`dispatch/gateway.py\` and \`dispatch/spec.py\` are read-only.

## \`dispatch/keys.py\`

\`\`\`python
canonical(payload)        # one stable string for the operation
idempotency_key(payload)  # the key this refund is sent under
\`\`\`

A payload looks like this, and every payload carries all five fields:

\`\`\`python
{"account": "a1", "cents": 500, "reason": "duplicate charge", "attempt": 2, "sent_at": "2026-08-16T02:11:07Z"}
\`\`\`

\`KEY_FIELDS\` in \`spec.py\` names the three that identify the refund. The other two describe the
attempt, and an attempt is not an operation: if either of them reaches the key, every retry becomes
a new refund and the gateway will honor it. Two payloads that agree on \`KEY_FIELDS\` must produce
the same key, whatever order their fields appear in. A different amount is a different refund.

## \`dispatch/runner.py\`

\`\`\`python
RefundRunner(gateway)        # .ledger starts empty
runner.submit(payload)       # {"status": ..., "receipt": ...}
runner.run(payloads, call_budget)
\`\`\`

\`submit\` sends one refund and returns one of four statuses:

| status | when | receipt |
|---|---|---|
| \`"settled"\` | the gateway accepted it and returned a receipt | the receipt |
| \`"replayed"\` | this runner has already settled this operation | the receipt it settled before |
| \`"rejected"\` | the gateway refused it | \`None\` |
| \`"unresolved"\` | \`MAX_ATTEMPTS\` attempts all timed out | \`None\` |

\`GatewayRejected\` means the request was refused, so sending it again refuses it again.
\`GatewayTimeout\` means the response never arrived, which says nothing about whether the refund
landed. Both are in \`dispatch/gateway.py\`.

Every attempt at one refund goes out under one key, and a settled key goes in \`self.ledger\` so a
second \`submit\` of the same operation answers from there without touching the gateway at all.

\`run(payloads, call_budget)\` walks the payloads in order and returns:

\`\`\`python
{"results": [...], "skipped": [<account names>], "calls": <gateway.calls>}
\`\`\`

\`call_budget\` is a ceiling on gateway calls for the whole job. Once \`gateway.calls\` has reached
it, the remaining payloads are not attempted: their account names go in \`skipped\`, in order, so the
next run knows exactly what is outstanding. A partial run that says what it did not do is a result.
A partial run that stays quiet is the postmortem you are reading.
`,
})

const RETRY_SPEC = String.raw`"""Read-only. What the refund job and the gateway agree on."""

# The only fields that identify a refund. Everything else on a payload describes the
# attempt, and an attempt is not an operation.
KEY_FIELDS = ("account", "cents", "reason")

# How many times one refund may be sent before the job gives up and says so.
MAX_ATTEMPTS = 3
`

const RETRY_GATEWAY = String.raw`"""Read-only. The payments API, and the two ways it fails."""


class GatewayRejected(Exception):
    """The gateway refused the request. Sending it again changes nothing."""


class GatewayTimeout(Exception):
    """The response never arrived. The refund may or may not have been applied."""


class PaymentGateway:
    """A refund endpoint that is idempotent, but only if you send the same key twice.

    The charges list is the server's own record of what really happened. The tests read
    it, so a duplicate refund shows up there whatever your job believes it did.
    """

    def __init__(self, script=()):
        self.script = list(script)
        self.calls = 0
        self.charges = []
        self._settled = {}

    def refund(self, key, account, cents):
        outcome = self.script[self.calls] if self.calls < len(self.script) else "ok"
        self.calls += 1
        if outcome == "rejected":
            raise GatewayRejected(account + ": refund refused")
        if key in self._settled:
            # Same key, so this is the same refund. Hand back the original receipt.
            return dict(self._settled[key])
        if outcome == "dropped":
            raise GatewayTimeout(account + ": the request never arrived")
        receipt = {"account": account, "cents": cents, "receipt": "r%d" % (len(self.charges) + 1)}
        self.charges.append(receipt)
        self._settled[key] = receipt
        if outcome == "lost":
            raise GatewayTimeout(account + ": the refund landed but the response was lost")
        return dict(receipt)
`

const RETRY_KEYS_STARTER = String.raw`import json

from dispatch.spec import KEY_FIELDS


def canonical(payload):
    """Return one stable string for the operation this payload describes, see README.md."""
    # TODO: two payloads that describe the same refund must produce the same string.
    return json.dumps(payload, sort_keys=True)


def idempotency_key(payload):
    """Return the key this refund is sent under, see README.md."""
    # TODO: build it from the canonical form of the operation.
    return "refund:" + canonical(payload)
`

const RETRY_KEYS_REFERENCE = String.raw`import json

from dispatch.spec import KEY_FIELDS


def canonical(payload):
    return json.dumps({field: payload[field] for field in KEY_FIELDS}, sort_keys=True)


def idempotency_key(payload):
    return "refund:" + canonical(payload)
`

const RETRY_RUNNER_STARTER = String.raw`from dispatch.gateway import GatewayRejected, GatewayTimeout
from dispatch.keys import idempotency_key
from dispatch.spec import MAX_ATTEMPTS


class RefundRunner:
    """Sends each refund at most once, however many times it has to ask. See README.md."""

    def __init__(self, gateway):
        self.gateway = gateway
        self.ledger = {}

    def submit(self, payload):
        """Return {"status": ..., "receipt": ...} for one refund, see README.md."""
        # TODO: one key for the whole operation, a bounded retry that tells the two
        # failures apart, and a ledger the next run reads before it sends anything.
        receipt = self.gateway.refund(
            idempotency_key(payload), payload["account"], payload["cents"]
        )
        return {"status": "settled", "receipt": receipt}

    def run(self, payloads, call_budget):
        """Return the job summary, see README.md."""
        # TODO: stop once the gateway call budget is gone, and report what never went out.
        return {
            "results": [self.submit(payload) for payload in payloads],
            "skipped": [],
            "calls": self.gateway.calls,
        }
`

const RETRY_RUNNER_REFERENCE = String.raw`from dispatch.gateway import GatewayRejected, GatewayTimeout
from dispatch.keys import idempotency_key
from dispatch.spec import MAX_ATTEMPTS


class RefundRunner:
    def __init__(self, gateway):
        self.gateway = gateway
        self.ledger = {}

    def submit(self, payload):
        key = idempotency_key(payload)
        if key in self.ledger:
            return {"status": "replayed", "receipt": self.ledger[key]}
        for _ in range(MAX_ATTEMPTS):
            try:
                receipt = self.gateway.refund(key, payload["account"], payload["cents"])
            except GatewayRejected:
                return {"status": "rejected", "receipt": None}
            except GatewayTimeout:
                continue
            else:
                self.ledger[key] = receipt
                return {"status": "settled", "receipt": receipt}
        return {"status": "unresolved", "receipt": None}

    def run(self, payloads, call_budget):
        results = []
        skipped = []
        for payload in payloads:
            if self.gateway.calls >= call_budget:
                skipped.append(payload["account"])
                continue
            results.append(self.submit(payload))
        return {"results": results, "skipped": skipped, "calls": self.gateway.calls}
`

const RETRY_TEST_KEYS = String.raw`from dispatch.keys import idempotency_key

BASE = {"account": "a1", "cents": 500, "reason": "duplicate charge"}


def run_tests(record):
    def retry_metadata_does_not_change_the_key():
        first = idempotency_key(dict(BASE, attempt=1, sent_at="2026-08-16T02:00:00Z"))
        second = idempotency_key(dict(BASE, attempt=4, sent_at="2026-08-16T02:11:07Z"))
        assert first == second, f"the same refund produced two keys: {first!r} and {second!r}"

    def a_different_amount_is_a_different_operation():
        first = idempotency_key(dict(BASE, attempt=1, sent_at="t"))
        second = idempotency_key(dict(BASE, cents=900, attempt=1, sent_at="t"))
        assert first != second, f"500 and 900 cents share the key {first!r}"

    def the_key_carries_no_volatile_field():
        key = idempotency_key(dict(BASE, attempt=7, sent_at="2026-08-16T02:11:07Z"))
        assert isinstance(key, str), f"expected a string key, got {type(key).__name__}"
        assert "2026-08-16" not in key, f"the timestamp reached the key: {key!r}"

    record("retry metadata does not change the key", retry_metadata_does_not_change_the_key)
    record("a different amount is a different operation", a_different_amount_is_a_different_operation)
    record("the key carries no volatile field", the_key_carries_no_volatile_field)
`

const RETRY_TEST_RUNNER = String.raw`from dispatch.gateway import PaymentGateway
from dispatch.runner import RefundRunner

PAYLOAD = {
    "account": "a1",
    "cents": 500,
    "reason": "duplicate charge",
    "attempt": 1,
    "sent_at": "2026-08-16T02:00:00Z",
}


def run_tests(record):
    def a_clean_refund_settles_once():
        gateway = PaymentGateway(["ok"])
        result = RefundRunner(gateway).submit(PAYLOAD)
        assert result["status"] == "settled", f"expected 'settled', got {result['status']!r}"
        assert result["receipt"]["receipt"] == "r1", f"expected receipt r1, got {result['receipt']!r}"
        assert len(gateway.charges) == 1, f"expected 1 charge, got {len(gateway.charges)}"

    def a_lost_response_is_retried_but_not_recharged():
        gateway = PaymentGateway(["lost", "ok"])
        result = RefundRunner(gateway).submit(dict(PAYLOAD, attempt=2, sent_at="later"))
        assert result["status"] == "settled", f"expected 'settled', got {result['status']!r}"
        assert gateway.calls == 2, f"expected 2 gateway calls, got {gateway.calls}"
        assert len(gateway.charges) == 1, (
            f"the customer was refunded {len(gateway.charges)} times, not once: {gateway.charges!r}"
        )

    def a_rejected_refund_is_not_retried():
        gateway = PaymentGateway(["rejected", "ok"])
        result = RefundRunner(gateway).submit(PAYLOAD)
        assert result["status"] == "rejected", f"expected 'rejected', got {result['status']!r}"
        assert gateway.calls == 1, f"a refusal was retried: {gateway.calls} calls"
        assert gateway.charges == [], f"expected no charge, got {gateway.charges!r}"

    record("a clean refund settles once", a_clean_refund_settles_once)
    record("a lost response is retried but not recharged", a_lost_response_is_retried_but_not_recharged)
    record("a rejected refund is not retried", a_rejected_refund_is_not_retried)
`

const RETRY_TEST_HIDDEN = String.raw`from dispatch.gateway import PaymentGateway
from dispatch.runner import RefundRunner

PAYLOAD = {
    "account": "a1",
    "cents": 500,
    "reason": "duplicate charge",
    "attempt": 1,
    "sent_at": "2026-08-16T02:00:00Z",
}


def run_tests(record):
    def a_rerun_never_reaches_the_gateway():
        gateway = PaymentGateway(["ok"])
        runner = RefundRunner(gateway)
        runner.submit(PAYLOAD)
        result = runner.submit(dict(PAYLOAD, attempt=9, sent_at="tomorrow"))
        assert result["status"] == "replayed", f"expected 'replayed', got {result['status']!r}"
        assert result["receipt"]["receipt"] == "r1", f"expected receipt r1, got {result['receipt']!r}"
        assert gateway.calls == 1, f"the rerun called the gateway again: {gateway.calls} calls"

    def a_dropped_request_is_retried_and_charges_once():
        gateway = PaymentGateway(["dropped", "ok"])
        result = RefundRunner(gateway).submit(PAYLOAD)
        assert result["status"] == "settled", f"expected 'settled', got {result['status']!r}"
        assert len(gateway.charges) == 1, f"expected 1 charge, got {gateway.charges!r}"

    def three_timeouts_leave_it_unresolved():
        gateway = PaymentGateway(["dropped", "dropped", "dropped", "ok"])
        result = RefundRunner(gateway).submit(PAYLOAD)
        assert result["status"] == "unresolved", f"expected 'unresolved', got {result['status']!r}"
        assert result["receipt"] is None, f"expected no receipt, got {result['receipt']!r}"
        assert gateway.calls == 3, f"expected 3 attempts, got {gateway.calls}"

    def the_call_budget_stops_the_run():
        gateway = PaymentGateway(["ok", "ok", "ok"])
        payloads = [dict(PAYLOAD, account=name) for name in ("a1", "a2", "a3")]
        summary = RefundRunner(gateway).run(payloads, 2)
        assert len(summary["results"]) == 2, f"expected 2 results, got {summary['results']!r}"
        assert summary["skipped"] == ["a3"], f"expected ['a3'] skipped, got {summary['skipped']!r}"
        assert summary["calls"] == 2, f"expected 2 calls, got {summary['calls']}"

    def two_accounts_are_two_refunds():
        gateway = PaymentGateway(["ok", "ok"])
        payloads = [dict(PAYLOAD, account="a1"), dict(PAYLOAD, account="a2")]
        summary = RefundRunner(gateway).run(payloads, 10)
        assert len(gateway.charges) == 2, f"expected 2 charges, got {gateway.charges!r}"
        assert summary["skipped"] == [], f"expected nothing skipped, got {summary['skipped']!r}"

    record("a rerun never reaches the gateway", a_rerun_never_reaches_the_gateway)
    record("a dropped request is retried and charges once", a_dropped_request_is_retried_and_charges_once)
    record("three timeouts leave it unresolved", three_timeouts_leave_it_unresolved)
    record("the call budget stops the run", the_call_budget_stops_the_run)
    record("two accounts are two refunds", two_accounts_are_two_refunds)
`

const RETRY_APPLY_PROVIDED = String.raw`import random

TERMINAL = ("bad_request", "unauthorized")
BASE_DELAY = 0.5
MAX_DELAY = 8.0


class ModelError(Exception):
    """Read-only. Every failure the fake model raises, and what that attempt still cost."""

    def __init__(self, kind, tokens):
        super().__init__(kind)
        self.kind = kind
        self.tokens = tokens


class FakeModel:
    """Read-only. One scripted outcome per call: "ok:120", "overloaded:8", "bad_request:0"."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    def send(self, prompt):
        outcome = self.script[self.calls] if self.calls < len(self.script) else "timeout:0"
        self.calls += 1
        kind, raw = outcome.split(":")
        if kind == "ok":
            return {"text": "the summary", "tokens": int(raw)}
        raise ModelError(kind, int(raw))


class FakeClock:
    """Read-only. Time moves only when you sleep on it, so the tests run instantly."""

    def __init__(self):
        self.elapsed = 0.0
        self.sleeps = []

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.elapsed += seconds
`

const RETRY_APPLY_GRADER = String.raw`def probe_delays(seed):
    """Read-only. Eight delays out of your backoff_delay, so the grader can see its shape."""
    rng = random.Random(seed)
    return [backoff_delay(attempt, rng) for attempt in range(8)]


def run_task(script, token_budget, time_budget, max_attempts):
    """Graded entry point: the task result, plus what the grader measured about your backoff."""
    model = FakeModel(script)
    clock = FakeClock()
    result = call_with_budget(
        model, clock, random.Random(3), token_budget, time_budget, max_attempts
    )
    delays = probe_delays(1)
    result["calls"] = model.calls
    result["delays_capped"] = all(
        0.0 <= delay <= min(MAX_DELAY, BASE_DELAY * 2 ** attempt)
        for attempt, delay in enumerate(delays)
    )
    result["delays_vary"] = delays != probe_delays(2)
    return result
`

const RETRY_APPLY_STARTER = `${RETRY_APPLY_PROVIDED}

def backoff_delay(attempt, rng):
    """Return how long to wait before the next attempt, see the task above."""
    # Full jitter: pick uniformly between zero and the ceiling for this attempt.
    return 0.0


def call_with_budget(model, clock, rng, token_budget, time_budget, max_attempts):
    """Return {"status": ..., "text": ..., "tokens": ...}, see the task above."""
    # One try/except around model.send is the whole loop. The hard part is what each
    # branch decides.
    return {"status": "partial", "text": "", "tokens": 0}


${RETRY_APPLY_GRADER}`

const RETRY_APPLY_REFERENCE = `${RETRY_APPLY_PROVIDED}

def backoff_delay(attempt, rng):
    return rng.uniform(0.0, min(MAX_DELAY, BASE_DELAY * 2 ** attempt))


def call_with_budget(model, clock, rng, token_budget, time_budget, max_attempts):
    spent = 0
    for attempt in range(max_attempts):
        try:
            reply = model.send("summarize the ticket")
        except ModelError as exc:
            spent += exc.tokens
            if exc.kind in TERMINAL:
                return {"status": "failed", "text": "", "tokens": spent}
            if spent >= token_budget or attempt == max_attempts - 1:
                return {"status": "partial", "text": "", "tokens": spent}
            delay = backoff_delay(attempt, rng)
            if clock.elapsed + delay > time_budget:
                return {"status": "partial", "text": "", "tokens": spent}
            clock.sleep(delay)
        else:
            spent += reply["tokens"]
            return {"status": "ok", "text": reply["text"], "tokens": spent}
    return {"status": "partial", "text": "", "tokens": spent}


${RETRY_APPLY_GRADER}`

export const retryBudgetLesson: PythonLesson = {
  id: "py-l4-retry-budget",
  title: "Retry, backoff and the token budget",
  summary:
    "Write the loop around a flaky, expensive call: jittered backoff, a real budget, and a key that makes a retry safe.",
  estimatedMinutes: 55,
  difficulty: "hard",
  skills: ["retries", "backoff", "idempotency", "budgets"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## The loop around the call is yours to write

A model API is one HTTP call, and the client library makes it look like a function call. It is not one. It fails several ways, it costs money per attempt, it is slow enough that the user is watching, and none of that is the library's problem. The loop around it is yours, and it is the piece of AI glue code that is most often written wrong. Every fact in this lesson is ordinary distributed-systems hygiene; what makes it worth its own lesson is that the per-attempt cost is money rather than milliseconds, so the mistakes are expensive in a way a normal retry loop's are not.

### Two kinds of failure, and only one is worth repeating

A failed call is either **retryable** (the same request, sent again, might work) or **terminal** (it will fail identically forever). Rate limiting, an overloaded server, and a network timeout are retryable. A malformed request, a bad key, and a missing model are terminal. The distinction is not decoration: retrying a terminal error costs a full attempt, in tokens and in seconds, and buys nothing.

\`\`\`python
class ModelError(Exception):
    def __init__(self, kind, tokens):
        super().__init__(kind)
        self.kind = kind          # "overloaded", "timeout", "bad_request", ...
        self.tokens = tokens      # a failed attempt still burned tokens


TERMINAL = ("bad_request", "unauthorized")

try:
    reply = model.send(prompt)
except ModelError as exc:
    print(exc.kind, exc.tokens)        # unauthorized 0
    if exc.kind in TERMINAL:
        raise
\`\`\`

An exception can carry data. \`exc.kind\` and \`exc.tokens\` are ordinary attributes set in \`__init__\`, and reading them is how the handler decides anything at all.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "retrying-a-terminal-error",
  "prompt": "A summarizer gets back an unauthorized error on its first call. The retry loop treats every failure the same way: wait, then send the identical request again, up to six times. What does that loop buy you?",
  "options": [
    {
      "label": "It recovers, because six attempts is plenty for a transient authentication blip",
      "feedback": "Authentication really does have transient failures, which is why this reasoning survives review. Those look like a 503 from the auth service, not a refusal of your credential. A refusal is a verdict on the request you sent."
    },
    {
      "label": "Nothing at all, at six times the latency and six times the spend",
      "correct": true,
      "feedback": "Right, and the second half is the part people miss. The wall-clock cost is visible in a latency graph; the token cost is only visible on the invoice at the end of the month."
    },
    {
      "label": "It fails faster overall, since a refused request is rejected before any tokens are billed",
      "feedback": "Often true for an auth failure specifically, and worth knowing. It does not generalize: a request rejected after the prompt was read, or a response that failed a schema check, has already been paid for."
    },
    {
      "label": "It recovers on the second attempt, because the client refreshes the credential between attempts",
      "feedback": "Some SDKs do refresh a token on a 401, and if yours does then one retry is correct. That is a specific, documented behavior of one client, not something a generic retry loop can assume."
    }
  ]
}
\`\`\`

### Backoff, and why every client waits a different amount

Waiting a fixed two seconds between attempts is worse than it looks. Every client that failed at the same moment retries at the same moment, so the overloaded service gets the identical spike it just shed, on a two-second cycle, forever. Exponential backoff spreads the attempts out in time (\`0.5\`, \`1\`, \`2\`, \`4\`, ...), and a cap stops the growth before a retry outlives the request that wanted it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "synchronized-retry-spike",
  "prompt": "Two hundred workers hit an overloaded endpoint at the same instant, all fail, and every one of them is coded to retry after exactly two seconds, then four, then eight. What arrives at the endpoint two seconds later?",
  "options": [
    {
      "label": "A smoother load, since each worker paused before trying again",
      "feedback": "The pause is real and the instinct behind it is right. The trouble is that all two hundred paused for the same length of time, starting from the same instant, so the pause moved the spike without flattening it."
    },
    {
      "label": "All two hundred at once, which is the spike the endpoint just shed",
      "correct": true,
      "feedback": "Right. Identical timers on identical clients produce a synchronized herd, and doubling the wait only changes how often the herd arrives, not that it arrives together."
    },
    {
      "label": "Roughly half of them, because the rest will have succeeded on a different replica by then",
      "feedback": "Plausible if the failures were independent, and in that world retries genuinely do thin out. These failed together because of one shared cause, which is exactly the case where their retries also happen together."
    },
    {
      "label": "Nothing the endpoint cannot handle, since its rate limiter is there to absorb bursts",
      "feedback": "A rate limiter does keep the spike from taking the service down, and that is worth something. What it does is reject two hundred requests, which sends two hundred clients into their next retry, still in lockstep."
    }
  ]
}
\`\`\`

The repair is **full jitter**: do not wait the ceiling, wait a random amount between zero and the ceiling. The ceiling still doubles; the actual waits scatter, so two clients that failed together almost never retry together.

\`\`\`python
import random

BASE_DELAY = 0.5
MAX_DELAY = 8.0
rng = random.Random(7)          # seeded, so a test can reproduce the sequence

for attempt in range(5):
    ceiling = min(MAX_DELAY, BASE_DELAY * 2 ** attempt)
    print(attempt, round(ceiling, 2), round(rng.uniform(0.0, ceiling), 3))

# 0 0.5 0.162
# 1 1.0 0.151
# 2 2.0 1.302
# 3 4.0 0.29
# 4 8.0 4.287
\`\`\`

\`random.Random(seed)\` is a generator you own, so seeding it makes a run reproducible without touching the global \`random\` state that the rest of the process shares. \`rng.uniform(a, b)\` returns a float between \`a\` and \`b\`.

### A budget is not an attempt count

"Retry up to five times" is a bound on attempts. Nobody is billed for attempts. The two things that actually run out are **tokens** (money) and **wall-clock seconds** (the user waiting, or the deadline of whatever called you). Track those directly, and when one is gone, stop and return what you have.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "attempt-cap-is-not-a-budget",
  "prompt": "An agent step is capped at eight attempts and nothing else. One task hits a model that keeps failing with a server error, after reading a 6,000-token prompt each time. What is the cap protecting?",
  "options": [
    {
      "label": "The bill, because eight attempts is an upper bound on what the task can spend",
      "feedback": "It is an upper bound, which is why it feels like a budget. Look at what it bounds: eight times whatever one attempt happens to cost, and one attempt's cost is set by the prompt, which grows every time someone adds a tool or a retrieved document."
    },
    {
      "label": "Very little, since it bounds attempts while the bill is in tokens and seconds",
      "correct": true,
      "feedback": "Right. Eight attempts at 6,000 tokens is 48,000 tokens for zero output, and the number 8 appears nowhere in that arithmetic. Count what you are charged for."
    },
    {
      "label": "The user, since eight attempts finish well inside a normal request timeout",
      "feedback": "Only if the attempts are fast, and the failures worth retrying are usually the slow ones. Eight attempts with backoff between them can run for a minute before anyone hears anything."
    },
    {
      "label": "Nothing, because a server error is terminal and this loop should not be retrying at all",
      "feedback": "The word terminal is doing the wrong work here. A 5xx is the server saying it went wrong, not that your request was wrong, so it is the textbook retryable case. The problem is the missing budget, not the retry."
    }
  ]
}
\`\`\`

Aborting to a **partial result** is a design decision, not a failure to handle the error. A caller that gets back \`{"status": "partial", "text": "", "tokens": 4200}\` can decide to degrade, queue the work, or tell the user. A caller that gets an exception thrown from inside a loop learns nothing about what was spent.

### Reading the reply before you trust it

A call that returns is not a call that succeeded. When the model is choosing a tool, the reply is a structured object, and a model can produce one that parses as JSON but is missing a field your code then indexes into. Checking the shape before acting on it costs four lines:

\`\`\`python
REQUIRED = {"name": str, "args": dict}


def valid_tool_call(reply):
    return all(
        field in reply and isinstance(reply[field], kind) for field, kind in REQUIRED.items()
    )


print(valid_tool_call({"name": "search", "args": {"q": "cache"}}))   # True
print(valid_tool_call({"name": "search"}))                           # False
print(valid_tool_call({"name": "search", "args": "cache"}))          # False
\`\`\`

The interesting part is which bucket that failure goes in. A reply that fails the shape check is **retryable**, because asking again may well produce a well-formed one, and it is the one retryable failure where sending the identical request is the wrong move: you would usually add the validation error to the prompt. A request the API itself rejected is terminal. Same loop, opposite verdicts, and telling them apart is the whole job of the handler.

### An idempotency key is what makes a retry safe

Everything above assumes a retry is free to send. It is free only when the call has no side effect. The moment the call charges a card, sends an email, or writes a row, a retry can do the thing twice, because a timeout tells you the response was lost, not that the request was.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "timeout-then-fresh-request-id",
  "prompt": "A charge request times out. Your client generates a new request id, sends the charge again, and this time gets a receipt back. What did the customer experience?",
  "options": [
    {
      "label": "One charge, because the attempt that timed out never completed",
      "feedback": "This is the assumption almost every duplicate-charge postmortem turns out to rest on. A timeout is your client giving up on waiting; the server was never told, and may have finished the work a moment later."
    },
    {
      "label": "Possibly two, because a timeout is silence about the outcome rather than proof of failure",
      "correct": true,
      "feedback": "Right, and possibly is the operative word: you cannot tell from the client side, which is precisely why the fix has to make the second request harmless instead of making the guess better."
    },
    {
      "label": "One charge, because the gateway deduplicates by amount and account within a short window",
      "feedback": "Some do exactly this, and it is a real feature. It is also a guess about which requests are duplicates, so it merges two genuine identical charges and misses two that differ by a cent."
    },
    {
      "label": "An error, because the gateway refuses a second identical charge so soon after the first",
      "feedback": "Fraud rules do sometimes fire here, and that would at least be loud. It is a heuristic aimed at a different problem, so it protects you by accident on some payloads and not at all on others."
    }
  ],
  "reveal": "A retry is safe when the second request is recognizably the same operation as the first. That recognition is the idempotency key, and it has to come from the operation rather than from the attempt."
}
\`\`\`

An **idempotency key** is a string the client sends with the request, identifying the *operation*. The server stores the result under that key, so a second request carrying the same key returns the first result instead of doing the work again. Two rules make it work, and both are easy to break:

- It is derived from what the operation **is**, never from the attempt. Anything that changes between attempts (an attempt counter, a timestamp, a fresh random id) turns every retry into a new operation.
- It is stable across processes. \`json.dumps\` with \`sort_keys=True\` gives one string for one set of fields, whatever order the dict happened to be built in.

\`\`\`python
import json

KEY_FIELDS = ("account", "cents", "reason")


def idempotency_key(payload):
    return "refund:" + json.dumps(
        {field: payload[field] for field in KEY_FIELDS}, sort_keys=True
    )


first = {"account": "a1", "cents": 500, "reason": "duplicate charge", "attempt": 1}
again = {"reason": "duplicate charge", "cents": 500, "account": "a1", "attempt": 4}
print(idempotency_key(first) == idempotency_key(again))   # True
print(idempotency_key(first))
# refund:{"account": "a1", "cents": 500, "reason": "duplicate charge"}
\`\`\`

The server side of that bargain is not always available to you, and it is not the whole story anyway. A job that restarts from the top will re-send work it already finished, and the gateway will happily answer from its own store, but only if it still has the key. Keeping your own ledger of settled keys means the restart never sends the request at all, which is cheaper and does not depend on how long somebody else's cache lives.

### Pitfalls

- Retrying on a bare \`except Exception\` retries the terminal failures too. Name the kinds you mean.
- A cap with no jitter is still synchronized. The randomness is the point, not the doubling.
- \`random.random()\` uses the process-wide generator, so seeding it for a test changes behavior for every other caller in the process. Own an instance with \`random.Random(seed)\`.
- A budget checked only at the top of the loop is not a budget. Check it after the attempt that spent the tokens.
- Storing a key after the response arrives leaves a window where the work is done and unrecorded. That window is why the server keeps its own store: yours is an optimization, not the guarantee.

**Interview nuance:** the follow-up on this is almost always "and what if the retry storm is the thing taking the service down?" The answer is a **circuit breaker**, which sits above the retry loop rather than inside it: after enough consecutive failures it stops sending anything for a cooling-off period, so a dead dependency gets no traffic at all instead of every client's full retry budget. Retries protect one request from bad luck. A breaker protects the dependency from every request at once. Being able to say that they solve different problems, and that a retry loop without one turns a partial outage into a total one, is the answer being probed for.

**Sources:** [Timeouts, retries and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) · [random.uniform](https://docs.python.org/3/library/random.html) · [Idempotent requests](https://docs.stripe.com/api/idempotent_requests)`,
    demoCode: `import random

BASE_DELAY = 0.5
MAX_DELAY = 8.0
rng = random.Random(7)

for attempt in range(6):
    ceiling = min(MAX_DELAY, BASE_DELAY * 2 ** attempt)
    print(attempt, "ceiling", round(ceiling, 2), "wait", round(rng.uniform(0.0, ceiling), 3))`,
  },
  apply: {
    id: "py-l4-retry-budget-apply",
    estimatedMinutes: 12,
    executionMode: "single-file",
    prompt: `Write the two functions the retry loop is made of.

\`backoff_delay(attempt, rng)\` returns how long to wait before the next attempt: full jitter
between zero and \`min(MAX_DELAY, BASE_DELAY * 2 ** attempt)\`. Attempts are numbered from zero.

\`call_with_budget(model, clock, rng, token_budget, time_budget, max_attempts)\` runs the loop and
returns \`{"status": ..., "text": ..., "tokens": ...}\`, where \`tokens\` is everything the task
spent, failed attempts included. \`model.send(prompt)\` either returns
\`{"text": ..., "tokens": ...}\` or raises \`ModelError\` carrying \`.kind\` and \`.tokens\`.

- A reply is \`{"status": "ok", "text": <the text>, "tokens": <total>}\`.
- A \`ModelError\` whose \`.kind\` is in \`TERMINAL\` ends the task: \`"failed"\`, with \`text\` set to
  the empty string. Its tokens still count.
- Any other \`ModelError\` is retryable, but only if there is anything left to retry with. Stop with
  \`"partial"\` when the tokens spent have reached \`token_budget\`, when that was the last attempt
  allowed, or when the delay you are about to wait would push \`clock.elapsed\` past
  \`time_budget\`. Otherwise wait it out with \`clock.sleep(delay)\` and go again.

\`run_task\` at the bottom builds the fakes, calls your loop, and adds what it measured about your
backoff. Leave it alone.`,
    starterCode: RETRY_APPLY_STARTER,
    hints: [
      "One `try` around `model.send`, with the retryable path in the `except` and the success path in an `else`. Every exit from the loop returns a dict of the same shape, so the caller never has to ask which one it got.",
      "The order of the checks inside the `except` is the whole exercise. Add the tokens first, since a failed attempt was still paid for. Then ask whether this failure can be retried at all, then whether anything is left to retry with.",
      "Full jitter is `rng.uniform(0.0, ceiling)` where `ceiling` is `min(MAX_DELAY, BASE_DELAY * 2 ** attempt)`. The last attempt is `attempt == max_attempts - 1`, and sleeping after it would waste time nobody is waiting for.",
    ],
    referenceSolution: RETRY_APPLY_REFERENCE,
    testCases: [
      {
        input: { script: ["ok:120"], token_budget: 1000, time_budget: 60.0, max_attempts: 4 },
        expected: {
          status: "ok",
          text: "the summary",
          tokens: 120,
          calls: 1,
          delays_capped: true,
          delays_vary: true,
        },
        description: "the first call succeeds",
      },
      {
        input: {
          script: ["overloaded:8", "overloaded:8", "ok:150"],
          token_budget: 1000,
          time_budget: 60.0,
          max_attempts: 4,
        },
        expected: {
          status: "ok",
          text: "the summary",
          tokens: 166,
          calls: 3,
          delays_capped: true,
          delays_vary: true,
        },
        description: "two overloads, then success, and the failures are billed too",
      },
      {
        input: {
          script: ["bad_request:5"],
          token_budget: 1000,
          time_budget: 60.0,
          max_attempts: 4,
        },
        expected: {
          status: "failed",
          text: "",
          tokens: 5,
          calls: 1,
          delays_capped: true,
          delays_vary: true,
        },
        description: "a terminal error is not retried",
      },
      {
        input: {
          script: ["overloaded:60", "overloaded:60", "ok:100"],
          token_budget: 100,
          time_budget: 60.0,
          max_attempts: 4,
        },
        expected: {
          status: "partial",
          text: "",
          tokens: 120,
          calls: 2,
          delays_capped: true,
          delays_vary: true,
        },
        description: "the token budget aborts to a partial result",
      },
      {
        input: {
          script: ["timeout:3", "timeout:3"],
          token_budget: 1000,
          time_budget: 60.0,
          max_attempts: 2,
        },
        expected: {
          status: "partial",
          text: "",
          tokens: 6,
          calls: 2,
          delays_capped: true,
          delays_vary: true,
        },
        description: "attempts run out before the budget does",
      },
      {
        input: {
          script: ["timeout:3", "ok:100"],
          token_budget: 1000,
          time_budget: 0.0,
          max_attempts: 4,
        },
        expected: {
          status: "partial",
          text: "",
          tokens: 3,
          calls: 1,
          delays_capped: true,
          delays_vary: true,
        },
        description: "there is no time left to wait, so it does not wait",
      },
    ],
  },
  practice: {
    id: "py-l4-retry-budget-practice",
    estimatedMinutes: 35,
    executionMode: "workspace",
    prompt: `Repair the refund job on ticket CS-033. It timed out partway through, was restarted, and paid
41 customers twice. The gateway's record says every duplicate was a separate valid request, because
the job sent a fresh request id on each attempt and kept no note of what it had already settled.

Fill in \`dispatch/keys.py\` so one refund has one key however many times it is sent, and
\`dispatch/runner.py\` so \`RefundRunner\` retries a lost response under that same key, never retries
a refusal, records what it settled, and stops when the job's gateway call budget is gone rather than
running past it in silence.

The gateway is a fake with no latency, so there is nothing to wait for and no backoff to write here.
\`README.md\` has the four statuses and the exact summary shape. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "The two bugs are independent and the second one is not about retries at all. One is inside a single `submit`: every attempt at one refund has to go out under one key. The other is across `submit` calls: the runner has to remember what it settled, or a restart sends everything again.",
      "Build the key from `KEY_FIELDS` only. `attempt` and `sent_at` describe the attempt, and a key that moves when they move is not a key. `json.dumps(..., sort_keys=True)` over a dict comprehension gives one string per operation.",
      "In `submit`, the two exception types get different treatment: `GatewayRejected` returns immediately, `GatewayTimeout` continues the loop, and falling out of the loop is its own status. `run` checks `self.gateway.calls` against the budget before each payload, not after, so a payload it never attempted lands in `skipped` rather than in the results.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "dispatch/keys.py",
      editableFilePaths: ["dispatch/keys.py", "dispatch/runner.py"],
      visibleTestPaths: ["tests/test_keys.py", "tests/test_runner.py"],
      hiddenTestPaths: ["tests/test_runner_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: RETRY_README },
        { path: "dispatch/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "dispatch/spec.py",
          role: "readonly",
          language: "python",
          content: RETRY_SPEC,
          description: "Read-only: which fields identify a refund",
        },
        {
          path: "dispatch/gateway.py",
          role: "readonly",
          language: "python",
          content: RETRY_GATEWAY,
          description: "Read-only: the payments API and its two failures",
        },
        {
          path: "dispatch/keys.py",
          role: "editable",
          language: "python",
          content: RETRY_KEYS_STARTER,
          description: "The idempotency key for one refund",
        },
        {
          path: "dispatch/runner.py",
          role: "editable",
          language: "python",
          content: RETRY_RUNNER_STARTER,
          description: "The retry loop, the ledger, and the call budget",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_keys.py",
          role: "test",
          language: "python",
          content: RETRY_TEST_KEYS,
          description: "Visible key-derivation tests",
        },
        {
          path: "tests/test_runner.py",
          role: "test",
          language: "python",
          content: RETRY_TEST_RUNNER,
          description: "Visible retry tests",
        },
        {
          path: "tests/test_runner_hidden.py",
          role: "test",
          language: "python",
          content: RETRY_TEST_HIDDEN,
          hidden: true,
          description: "Hidden ledger and budget tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_keys", label: "visible keys" },
            { module: "test_runner", label: "visible runner" },
            { module: "test_runner_hidden", label: "hidden runner" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "dispatch/keys.py",
          role: "editable",
          language: "python",
          content: RETRY_KEYS_REFERENCE,
        },
        {
          path: "dispatch/runner.py",
          role: "editable",
          language: "python",
          content: RETRY_RUNNER_REFERENCE,
        },
      ],
    },
  },
}
