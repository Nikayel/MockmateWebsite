import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// Practice workspace: the feedstore package (the Level 4 capstone)
//
// This is the last exercise of the level, so it composes the level's skills rather than
// drilling one: config parsing (config-logging), a decorator factory that registers into a
// strategy table plus the factory lookup over it (decorators-advanced + solid-patterns),
// duck-typed dependency injection over a fake flaky transport (abc-protocols; the sandbox has
// no network, so the transport is a read-only stand-in), and packaging proper, where the
// graded surface is what `__init__.py` exports and every test imports from the package root.
//
// Four editable files, each with a distinct job: settings, the registry, the pipeline, and the
// package's public face. The hidden suite grades the seams, not the numbers: a brand new format
// registered through the public `register` decorator and a stranger transport object injected at
// the entry point must both work with zero further edits.
// ───────────────────────────────────────────────────────────────────────────

const CAPSTONE_README = buildBrief({
  lesson: "py-l4-packaging-capstone",
  kind: "capstone",
  headline: "ship the `feedstore` package",
  body: `A partner publishes a scored item feed over a connection that drops. Your job is the package that
reads it: settings from the environment, a parser chosen by format name, a fetch that survives a
flaky source, and one public entry point a caller can use without knowing any of that.

Four files are yours. \`feedstore/transport.py\` is read-only.

## \`feedstore/config.py\`

\`load_settings(env)\` returns a \`Settings\` with three fields read from a raw env mapping:

| env key | field | default |
| --- | --- | --- |
| \`FEED_FORMAT\` | \`source_format\` | \`"csv"\` |
| \`FEED_MAX_ATTEMPTS\` | \`max_attempts\` (int) | \`3\` |
| \`FEED_MIN_SCORE\` | \`min_score\` (int) | \`0\` |

A key that is missing, empty, or only whitespace takes the default. A \`max_attempts\` below 1
is unusable, so \`load_settings\` raises \`ValueError\` for it.

## \`feedstore/parsers.py\`

\`register(name)\` is a decorator that adds the decorated parser to \`PARSERS\` under \`name\` and
leaves the function itself usable. \`get_parser(name)\` returns the registered parser, or raises
\`UnknownFormatError\` naming the format it could not find. \`parse_csv\` and \`parse_pipe\` are
written for you and must end up registered as \`"csv"\` and \`"pipe"\`.

## \`feedstore/pipeline.py\`

\`Pipeline(settings, transport)\` runs one feed. \`fetch()\` calls \`transport.fetch()\`, retries a
\`TransportError\` until \`max_attempts\` calls have been made, and re-raises the last error if
every attempt fails. It records how many calls it made in \`self.attempts\`. \`run()\` fetches,
parses with the parser for \`source_format\`, keeps the rows whose \`score\` is at least
\`min_score\`, and returns:

\`\`\`python
{"format": "csv", "attempts": 1, "parsed": 3, "kept": 2}
\`\`\`

## \`feedstore/__init__.py\`

The package's public face. Callers import from \`feedstore\`, never from a submodule, so the names
\`Settings\`, \`load_settings\`, \`Pipeline\`, \`register\`, \`get_parser\`, \`UnknownFormatError\`,
\`TransportError\`, \`FlakyTransport\`, and \`run_feed\` must all be reachable there and listed in
\`__all__\`. \`PARSERS\` is not one of them: the table stays internal, and callers reach it through
\`register\` and \`get_parser\`. \`run_feed(env, transport)\` is the entry point: it turns the env
mapping into settings and runs one pipeline over the given transport.

Anyone must be able to add a format, or hand you a different source, using only those public
names.
`,
})

const CAPSTONE_PYPROJECT = String.raw`# The build backend a frontend (pip, uv, build) installs before it can build this project.
# Without this table there is nothing to turn the source tree into a wheel.
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "feedstore"
version = "1.0.0"
description = "Read a scored partner feed from a flaky source"
requires-python = ">=3.11"
dependencies = []

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]

[tool.ruff]
line-length = 100

[tool.pytest.ini_options]
testpaths = ["tests"]
`

const CAPSTONE_TRANSPORT = String.raw`"""The feed source (read-only).

The real client speaks HTTP. This sandbox has no network and no threads, so FlakyTransport
stands in for it: it hands back a canned payload and can be told to fail the first few calls
the way a real connection does.
"""


class TransportError(RuntimeError):
    """Raised when one fetch attempt fails. A later attempt may still succeed."""


class FlakyTransport:
    """A feed source that fails its first fail_times calls, then succeeds."""

    def __init__(self, payload, fail_times=0):
        self.payload = payload
        self.fail_times = fail_times
        self.calls = 0

    def fetch(self):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise TransportError("fetch attempt " + str(self.calls) + " failed")
        return self.payload
`

const CAPSTONE_CONFIG_STARTER = String.raw`"""Settings for one feed run. See README.md for the env keys and defaults."""

from dataclasses import dataclass

DEFAULT_FORMAT = "csv"
DEFAULT_MAX_ATTEMPTS = 3
DEFAULT_MIN_SCORE = 0


@dataclass(frozen=True)
class Settings:
    source_format: str
    max_attempts: int
    min_score: int


def load_settings(env):
    """Build Settings from a raw env mapping (see README.md)."""
    # TODO: read the three env keys, fall back to the defaults above when a value is
    # missing or blank, give the two numeric fields their numeric type, and reject an
    # attempt count that cannot run.
    raise NotImplementedError("load_settings")
`

const CAPSTONE_CONFIG_REFERENCE = String.raw`"""Settings for one feed run. See README.md for the env keys and defaults."""

from dataclasses import dataclass

DEFAULT_FORMAT = "csv"
DEFAULT_MAX_ATTEMPTS = 3
DEFAULT_MIN_SCORE = 0


@dataclass(frozen=True)
class Settings:
    source_format: str
    max_attempts: int
    min_score: int


def _value(env, key, default):
    raw = env.get(key)
    if raw is None:
        return default
    text = str(raw).strip()
    return text if text else default


def load_settings(env):
    """Build Settings from a raw env mapping (see README.md)."""
    max_attempts = int(_value(env, "FEED_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS))
    if max_attempts < 1:
        raise ValueError("FEED_MAX_ATTEMPTS must be at least 1, got " + str(max_attempts))
    return Settings(
        source_format=_value(env, "FEED_FORMAT", DEFAULT_FORMAT),
        max_attempts=max_attempts,
        min_score=int(_value(env, "FEED_MIN_SCORE", DEFAULT_MIN_SCORE)),
    )
`

const CAPSTONE_PARSERS_STARTER = String.raw`"""Feed parsers and the registry that picks one by format name."""

PARSERS = {}


class UnknownFormatError(LookupError):
    """Raised when no parser is registered under a requested format name."""


def register(name):
    """Decorator: add the decorated parser to PARSERS under name."""
    # TODO: store the decorated function under name and hand the function back so it
    # stays callable on its own.
    raise NotImplementedError("register")


def get_parser(name):
    """Return the parser registered under name."""
    # TODO: look name up, and raise UnknownFormatError naming it when nothing is there.
    raise NotImplementedError("get_parser")


# TODO: register parse_csv under "csv" and parse_pipe under "pipe" without editing their bodies.


def parse_csv(text):
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        item_id, score = line.split(",")
        rows.append({"id": item_id.strip(), "score": int(score)})
    return rows


def parse_pipe(text):
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        item_id, score = line.split("|")
        rows.append({"id": item_id.strip(), "score": int(score)})
    return rows
`

const CAPSTONE_PARSERS_REFERENCE = String.raw`"""Feed parsers and the registry that picks one by format name."""

PARSERS = {}


class UnknownFormatError(LookupError):
    """Raised when no parser is registered under a requested format name."""


def register(name):
    """Decorator: add the decorated parser to PARSERS under name."""

    def decorate(parser):
        PARSERS[name] = parser
        return parser

    return decorate


def get_parser(name):
    """Return the parser registered under name."""
    if name not in PARSERS:
        raise UnknownFormatError("no parser registered for format " + repr(name))
    return PARSERS[name]


@register("csv")
def parse_csv(text):
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        item_id, score = line.split(",")
        rows.append({"id": item_id.strip(), "score": int(score)})
    return rows


@register("pipe")
def parse_pipe(text):
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        item_id, score = line.split("|")
        rows.append({"id": item_id.strip(), "score": int(score)})
    return rows
`

const CAPSTONE_PIPELINE_STARTER = String.raw`"""One feed run: fetch, parse, filter, report. See README.md."""

from feedstore.parsers import get_parser
from feedstore.transport import TransportError


class Pipeline:
    def __init__(self, settings, transport):
        self.settings = settings
        self.transport = transport
        self.attempts = 0

    def fetch(self):
        """Return the raw feed text, surviving a transport that fails (see README.md)."""
        # TODO: call the transport, keep going while the settings still allow another call,
        # record how many calls you made, and let the last failure out if none succeed.
        raise NotImplementedError("Pipeline.fetch")

    def run(self):
        """Return the report for one feed run (see README.md)."""
        # TODO: fetch, parse with the parser for this run's format, keep the rows that
        # clear the score floor, and report the four keys.
        raise NotImplementedError("Pipeline.run")
`

const CAPSTONE_PIPELINE_REFERENCE = String.raw`"""One feed run: fetch, parse, filter, report. See README.md."""

from feedstore.parsers import get_parser
from feedstore.transport import TransportError


class Pipeline:
    def __init__(self, settings, transport):
        self.settings = settings
        self.transport = transport
        self.attempts = 0

    def fetch(self):
        """Return the raw feed text, surviving a transport that fails (see README.md)."""
        last_error = None
        for attempt in range(1, self.settings.max_attempts + 1):
            self.attempts = attempt
            try:
                return self.transport.fetch()
            except TransportError as error:
                last_error = error
        raise last_error

    def run(self):
        """Return the report for one feed run (see README.md)."""
        text = self.fetch()
        rows = get_parser(self.settings.source_format)(text)
        kept = [row for row in rows if row["score"] >= self.settings.min_score]
        return {
            "format": self.settings.source_format,
            "attempts": self.attempts,
            "parsed": len(rows),
            "kept": len(kept),
        }
`

const CAPSTONE_INIT_STARTER = String.raw`"""feedstore: read a scored partner feed from a flaky source.

Callers import from this package root, never from a submodule. See README.md for the
names this package owes them.
"""

# TODO: re-export the package's public names from the submodules that define them, and list
# every public name in __all__.

__all__ = []


def run_feed(env, transport):
    """Entry point: run one feed for the given environment and source (see README.md)."""
    # TODO: turn the env mapping into settings, then run one pipeline over the transport.
    raise NotImplementedError("run_feed")
`

const CAPSTONE_INIT_REFERENCE = String.raw`"""feedstore: read a scored partner feed from a flaky source.

Callers import from this package root, never from a submodule. See README.md for the
names this package owes them.
"""

from feedstore.config import Settings, load_settings
from feedstore.parsers import UnknownFormatError, get_parser, register
from feedstore.pipeline import Pipeline
from feedstore.transport import FlakyTransport, TransportError

# Exactly the nine names README.md promises callers. PARSERS is deliberately not one of them:
# the table is an implementation detail, reached through register() and get_parser().
__all__ = [
    "FlakyTransport",
    "Pipeline",
    "Settings",
    "TransportError",
    "UnknownFormatError",
    "get_parser",
    "load_settings",
    "register",
    "run_feed",
]


def run_feed(env, transport):
    """Entry point: run one feed for the given environment and source (see README.md)."""
    return Pipeline(load_settings(env), transport).run()
`

const CAPSTONE_TEST = String.raw`"""Visible capstone tests: the contract, read through the package's public API."""

import feedstore

CSV_FEED = "a1,7\nb2,3\nc3,9\n"

PUBLIC_NAMES = [
    "FlakyTransport",
    "Pipeline",
    "Settings",
    "TransportError",
    "UnknownFormatError",
    "get_parser",
    "load_settings",
    "register",
    "run_feed",
]


def run_tests(record):
    def empty_env_uses_defaults():
        from feedstore import load_settings

        settings = load_settings({})
        got = (settings.source_format, settings.max_attempts, settings.min_score)
        assert got == ("csv", 3, 0), f"expected ('csv', 3, 0) from an empty env, got {got!r}"

    def env_values_are_read_and_typed():
        from feedstore import load_settings

        settings = load_settings(
            {"FEED_FORMAT": "pipe", "FEED_MAX_ATTEMPTS": "5", "FEED_MIN_SCORE": "4"}
        )
        got = (settings.source_format, settings.max_attempts, settings.min_score)
        assert got == ("pipe", 5, 4), f"expected ('pipe', 5, 4), got {got!r}"
        assert isinstance(settings.max_attempts, int), (
            f"expected max_attempts to be an int, got {type(settings.max_attempts).__name__}"
        )

    def builtin_parsers_are_registered():
        from feedstore import get_parser

        csv_rows = get_parser("csv")("a1,7\n")
        assert csv_rows == [{"id": "a1", "score": 7}], (
            f"expected [{{'id': 'a1', 'score': 7}}] from the csv parser, got {csv_rows!r}"
        )
        pipe_rows = get_parser("pipe")("b2|3\n")
        assert pipe_rows == [{"id": "b2", "score": 3}], (
            f"expected [{{'id': 'b2', 'score': 3}}] from the pipe parser, got {pipe_rows!r}"
        )

    def run_feed_reports_one_clean_run():
        from feedstore import FlakyTransport, run_feed

        report = run_feed({"FEED_MIN_SCORE": "5"}, FlakyTransport(CSV_FEED))
        expected = {"format": "csv", "attempts": 1, "parsed": 3, "kept": 2}
        assert report == expected, f"expected {expected!r} from run_feed, got {report!r}"

    def public_names_live_on_the_package_root():
        missing = [name for name in PUBLIC_NAMES if not hasattr(feedstore, name)]
        assert missing == [], f"expected these names on the feedstore package, missing {missing!r}"
        unlisted = [name for name in PUBLIC_NAMES if name not in getattr(feedstore, "__all__", [])]
        assert unlisted == [], (
            f"expected every public name in feedstore.__all__, missing {unlisted!r}"
        )

    record("an empty env falls back to the defaults", empty_env_uses_defaults)
    record("env values are read and given their type", env_values_are_read_and_typed)
    record("csv and pipe are registered in the parser table", builtin_parsers_are_registered)
    record("run_feed reports one clean run", run_feed_reports_one_clean_run)
    record("the public names live on the package root", public_names_live_on_the_package_root)
`

const CAPSTONE_TEST_HIDDEN = String.raw`"""Hidden capstone tests: the edges, and whether the seams hold.

Two of these grade composition rather than values. A new format registered through the public
decorator must reach the pipeline with no other edit, and a source object this package has never
seen must run through the entry point, because the pipeline was handed its transport rather
than building one.
"""

CSV_FEED = "a1,7\nb2,3\nc3,9\n"


class StrangerSource:
    """A feed source from outside this package. It only promises fetch()."""

    def __init__(self, payload):
        self.payload = payload
        self.calls = 0

    def fetch(self):
        self.calls += 1
        return self.payload


def run_tests(record):
    def blank_values_fall_back():
        from feedstore import load_settings

        settings = load_settings(
            {"FEED_FORMAT": "   ", "FEED_MAX_ATTEMPTS": "", "FEED_MIN_SCORE": " "}
        )
        got = (settings.source_format, settings.max_attempts, settings.min_score)
        assert got == ("csv", 3, 0), f"expected ('csv', 3, 0) from blank values, got {got!r}"

    def unusable_attempt_count_is_rejected():
        from feedstore import load_settings

        try:
            settings = load_settings({"FEED_MAX_ATTEMPTS": "0"})
        except ValueError:
            return
        raise AssertionError(
            f"expected ValueError for FEED_MAX_ATTEMPTS=0, got Settings {settings!r}"
        )

    def a_failing_source_is_retried_within_budget():
        from feedstore import FlakyTransport, run_feed

        source = FlakyTransport(CSV_FEED, fail_times=2)
        report = run_feed({"FEED_MAX_ATTEMPTS": "3"}, source)
        assert report["attempts"] == 3, (
            f"expected attempts to be 3 after two failures, got {report['attempts']!r}"
        )
        assert report["parsed"] == 3, f"expected parsed to be 3, got {report['parsed']!r}"
        assert source.calls == 3, f"expected the source to be called 3 times, got {source.calls!r}"

    def a_source_that_never_recovers_raises():
        from feedstore import FlakyTransport, TransportError, run_feed

        source = FlakyTransport(CSV_FEED, fail_times=9)
        try:
            report = run_feed({"FEED_MAX_ATTEMPTS": "2"}, source)
        except TransportError:
            assert source.calls == 2, (
                f"expected exactly 2 attempts before giving up, got {source.calls!r}"
            )
            return
        raise AssertionError(f"expected TransportError after 2 failures, got report {report!r}")

    def a_new_format_plugs_in_through_the_public_api():
        from feedstore import FlakyTransport, register, run_feed

        @register("tsv")
        def parse_tsv(text):
            rows = []
            for line in text.splitlines():
                if not line.strip():
                    continue
                item_id, score = line.split("\t")
                rows.append({"id": item_id.strip(), "score": int(score)})
            return rows

        direct = parse_tsv("z9\t2\n")
        assert direct == [{"id": "z9", "score": 2}], (
            f"expected register to hand the parser back callable, got {direct!r}"
        )
        feed = "z9\t2\nz8\t8\n"
        report = run_feed({"FEED_FORMAT": "tsv", "FEED_MIN_SCORE": "5"}, FlakyTransport(feed))
        expected = {"format": "tsv", "attempts": 1, "parsed": 2, "kept": 1}
        assert report == expected, (
            f"expected {expected!r} once tsv was registered through the public API, got {report!r}"
        )

    def an_unregistered_format_is_named_in_the_error():
        from feedstore import FlakyTransport, UnknownFormatError, run_feed

        try:
            report = run_feed({"FEED_FORMAT": "xml"}, FlakyTransport(CSV_FEED))
        except UnknownFormatError as error:
            assert "xml" in str(error), (
                f"expected the error to name the missing format 'xml', got {str(error)!r}"
            )
            return
        raise AssertionError(f"expected UnknownFormatError for format 'xml', got {report!r}")

    def a_foreign_source_runs_through_the_entry_point():
        from feedstore import run_feed

        source = StrangerSource(CSV_FEED)
        report = run_feed({"FEED_MIN_SCORE": "8"}, source)
        expected = {"format": "csv", "attempts": 1, "parsed": 3, "kept": 1}
        assert report == expected, (
            f"expected {expected!r} from a foreign source object, got {report!r}"
        )
        assert source.calls == 1, f"expected the source to be fetched once, got {source.calls!r}"

    record("blank env values fall back to the defaults", blank_values_fall_back)
    record("an attempt count below 1 is rejected", unusable_attempt_count_is_rejected)
    record("a failing source is retried within budget", a_failing_source_is_retried_within_budget)
    record("a source that never recovers raises", a_source_that_never_recovers_raises)
    record("a new format plugs in through the public API", a_new_format_plugs_in_through_the_public_api)
    record("an unregistered format is named in the error", an_unregistered_format_is_named_in_the_error)
    record("a foreign source runs through the entry point", a_foreign_source_runs_through_the_entry_point)
`

export const packagingCapstoneLesson: PythonLesson = {
  id: "py-l4-packaging-capstone",
  title: "Packaging & a production capstone",
  summary: "Build a typed, tested, packaged feed reader that integrates the whole track.",
  estimatedMinutes: 85,
  difficulty: "hard",
  skills: ["packaging", "capstone", "type-hints", "testing"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Packaging: the last mile

Your code only creates value once someone else can run it. Packaging is how you hand a colleague \`pip install feedstore\` instead of a folder and a prayer. A published package pins your version, declares its dependencies, and installs the same way on every machine, which is exactly what CI, Docker images, and teammates depend on.

### What a wheel actually is

A **wheel** (\`.whl\`) is a zip of your importable code plus metadata, named to a fixed convention. \`pyproject.toml\` is the single source of truth: the \`[project]\` table declares \`name\`, \`version\`, \`requires-python\`, and \`dependencies\`, plus a \`dev\` extra for \`pytest\`, \`ruff\`, and \`mypy\`. A \`[build-system]\` table names the build backend that turns the project into artifacts.

\`\`\`bash
uv build        # writes dist/feedstore-1.0.0.tar.gz and dist/feedstore-1.0.0-py3-none-any.whl
uv publish      # uploads those artifacts to a package index (PyPI)
\`\`\`

The \`py3-none-any\` tag means pure Python, any interpreter, any OS. Nothing to compile.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "why-pyproject-over-setup-py",
  "prompt": "A colleague points out that their package still ships a setup.py and installs perfectly well. What is the real argument for pyproject.toml?",
  "options": [
    {
      "label": "setup.py no longer works. Modern pip refuses to install from one",
      "feedback": "Widely believed, and the deprecation warnings encourage it. Direct invocations like python setup.py install are what got deprecated. A setup.py project still installs today, which is exactly why the better argument is needed."
    },
    {
      "label": "pyproject.toml is declarative data, so a tool can read the metadata without executing your code",
      "correct": true,
      "feedback": "Right. setup.py is a program pip has to run just to learn a package's name and dependencies, and [build-system] additionally tells the tool which backend to install before any of that starts."
    },
    {
      "label": "Builds are faster, because TOML parses more quickly than Python does",
      "feedback": "Parsing speed is real but irrelevant at this scale: both are milliseconds against a build measured in seconds. The win is about not running arbitrary code, not about how fast the file is read."
    },
    {
      "label": "Only pyproject.toml projects can be published to PyPI",
      "feedback": "PyPI accepts the artifacts, not the source layout, so a wheel built from setup.py uploads the same way. What has genuinely converged on pyproject.toml is the tooling: ruff, mypy, and pytest all configure there."
    }
  ]
}
\`\`\`

### The production checklist

A shippable library is **structured** (a clean package with clear entry points), **typed** (hints on the public API so callers and \`mypy\` know the contract), **validated** (untrusted input parsed into typed values at the boundary), and **tested** (\`pytest\` over the real cases, run in CI). Your capstone hits all four.

### Parsing at the boundary

Raw input is not your model. Each raw order arrives as a dict whose \`"amount"\` is a *string*, so \`summarize\` must parse it into a number before it can do arithmetic:

\`\`\`python
def summarize(raw_orders):
    paid = [o for o in raw_orders if o["paid"]]
    revenue = round(sum(float(o["amount"]) for o in paid), 2)
    return {"count": len(raw_orders), "paid": len(paid), "revenue": revenue}

rows = [{"amount": "10.0", "paid": True}, {"amount": "5.0", "paid": False}]
print(summarize(rows))
# {'count': 2, 'paid': 1, 'revenue': 10.0}
\`\`\`

\`count\` is every order, \`paid\` is how many cleared, and \`revenue\` sums only the paid amounts. The capstone package has the same job at two boundaries: raw environment values become typed settings, and the raw text of a feed becomes rows.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "round-once-at-the-end",
  "prompt": "Each line total is unit_price times quantity times 1.0825 for tax, so the raw amounts carry many decimals. To keep the running total tidy you round each one to cents before adding it. Ten thousand orders later, how does your revenue compare to summing first and rounding once?",
  "options": [
    {
      "label": "Identical. Money is measured in cents anyway, so rounding earlier changes nothing",
      "feedback": "It feels safe because every intermediate value looks like a real price. Each round throws away up to half a cent, and ten thousand discarded halves do not reliably cancel out."
    },
    {
      "label": "It drifts away from the true total, because every intermediate round discards information permanently",
      "correct": true,
      "feedback": "Right, and this is why finance systems specify exactly where rounding happens. Carry full precision through the arithmetic and round once, at the moment a human or a ledger needs a number."
    },
    {
      "label": "It is more accurate, since the total never carries sub-cent noise",
      "feedback": "An appealing argument, and it is the one that gets this shipped. Sub-cent noise in an intermediate value is not an error, it is information. Deleting it early is what turns it into one."
    },
    {
      "label": "It only matters if the amounts are floats. With Decimal the two orders of operations agree",
      "feedback": "Decimal does fix representation, so 0.1 plus 0.2 is exactly 0.3. It does not restore digits you already rounded off, so early rounding loses the same money whatever the type."
    }
  ]
}
\`\`\`

### Pitfalls

- \`int("10.0")\` raises \`ValueError\` because \`"10.0"\` is not an integer literal. Parse decimal strings with \`float("10.0")\`.
- Round once, at the very end. Sum first, then \`round(total, 2)\`. Floats cannot hold most decimals exactly, so \`0.1 + 0.2 == 0.3\` is \`False\` (it is \`0.30000000000000004\`), and rounding after each addition compounds that error.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bankers-rounding-half-to-even",
  "prompt": "A refund calculation lands on exactly 0.125 and you write round(0.125, 2). What comes back?",
  "options": [
    {
      "label": "0.13, rounding the half up the way everyone was taught in school",
      "feedback": "The rule almost every human uses, and it is why this shows up as a one cent discrepancy in a reconciliation report. Python rounds a tie to the nearest EVEN digit instead, so 2 wins over 3."
    },
    {
      "label": "0.12, because Python rounds a tie to the nearest even digit",
      "correct": true,
      "feedback": "Right. Rounding half up biases every tie upward, and over a large ledger that bias accumulates. Half to even splits the ties, which is why it is the standard for money and statistics."
    },
    {
      "label": "0.13, because round() works on the printed decimal text rather than the underlying float",
      "feedback": "Worth discarding explicitly: round() operates on the binary value, never on its printed form. That distinction is exactly why round(2.675, 2) surprises people by giving 2.67."
    },
    {
      "label": "0.12, but only by luck, since 0.125 is not exactly representable and lands just under the midpoint",
      "feedback": "Sharp instinct, and it is the right explanation for round(2.675, 2). It does not apply here: 0.125 is one eighth, which binary floats hold exactly, so this really is a tie and the even rule decides it."
    }
  ]
}
\`\`\`

**Interview nuance:** \`float\` cannot represent most base-10 fractions exactly, so a long chain of price additions drifts. \`round(total, 2)\` cleans up the display but not the stored value, and \`round\` uses banker's rounding, so \`round(0.125, 2)\` gives \`0.12\` (rounded to even), not \`0.13\`. Production money code stores integer cents or uses \`Decimal\`; reach for \`float\` only when a tiny rounding error is acceptable.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "how-to-store-money",
  "prompt": "You are designing the orders table and the matching Python model for a real payments service. How should an amount be stored?",
  "options": [
    {
      "label": "As a float, rounded to two decimals whenever it is displayed",
      "feedback": "Simplest, and it is what the warm-up does because the numbers are small and rounded exactly once. In a payments service the drift eventually shows up as a ledger that does not balance, and nobody can tell you which cent went missing."
    },
    {
      "label": "As an integer number of cents, converted to a display amount only at the boundary",
      "correct": true,
      "feedback": "Right. Integers are exact, they add without any representation error, and every arithmetic bug is pushed to the one conversion at the edge where you can test it. A NUMERIC column read into Decimal is the other defensible answer."
    },
    {
      "label": "As a Decimal in Python, on top of a float column in the database",
      "feedback": "Half of a good design, and the half people usually get right. The float column undoes it on every write and read, so the exactness only survives inside one process."
    },
    {
      "label": "As a float in storage but Decimal in Python, since the precision only matters during arithmetic",
      "feedback": "Storage is arithmetic's input, so the error is already baked in before you compute anything. Precision has to hold at every step, not only in the step you are looking at."
    }
  ],
  "reveal": "This is the last habit of the level and it generalises past money: decide where exactness is required, keep the exact representation everywhere inside that boundary, and convert only at the edges where a human or another system needs a different shape."
}
\`\`\``,
    demoCode: `from dataclasses import dataclass


@dataclass
class Order:
    id: int
    amount: float
    paid: bool


orders = [Order(1, 10.0, True), Order(2, 5.0, False)]
paid = [o for o in orders if o.paid]
print({"count": len(orders), "paid": len(paid), "revenue": round(sum(o.amount for o in paid), 2)})`,
  },
  apply: {
    id: "py-l4-packaging-capstone-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`summarize(raw_orders)\`. Each raw order is a dict with
\`"amount"\` (a numeric string) and \`"paid"\` (a bool). Return
\`{"count": <all>, "paid": <paid>, "revenue": <sum of paid amounts, rounded to 2>}\`.

For one paid \`"10.0"\` and one unpaid \`"5.0"\`, revenue is \`10.0\`.`,
    starterCode: `def summarize(raw_orders):
    # count all, count paid, and sum paid amounts (float) rounded to 2 decimals.
    pass`,
    hints: [
      'Filter paid orders: `[o for o in raw_orders if o["paid"]]`.',
      'Revenue: `round(sum(float(o["amount"]) for o in paid), 2)`.',
      "Return the three keys: `count`, `paid`, `revenue`.",
    ],
    referenceSolution: `def summarize(raw_orders):
    paid = [o for o in raw_orders if o["paid"]]
    return {
        "count": len(raw_orders),
        "paid": len(paid),
        "revenue": round(sum(float(o["amount"]) for o in paid), 2),
    }`,
    testCases: [
      {
        input: {
          raw_orders: [
            { id: 1, amount: "10.0", paid: true },
            { id: 2, amount: "5.0", paid: false },
          ],
        },
        expected: { count: 2, paid: 1, revenue: 10.0 },
        description: "one paid, one not",
      },
      {
        input: { raw_orders: [] },
        expected: { count: 0, paid: 0, revenue: 0 },
        description: "empty",
      },
      {
        input: {
          raw_orders: [
            { id: 1, amount: "3.0", paid: true },
            { id: 2, amount: "7.0", paid: true },
          ],
        },
        expected: { count: 2, paid: 2, revenue: 10.0 },
        description: "all paid",
      },
    ],
  },
  practice: {
    id: "py-l4-packaging-capstone-practice",
    executionMode: "workspace",
    prompt: `Capstone: ship the \`feedstore\` package so a caller can read one partner feed through its
public API alone. Four files are yours: \`feedstore/config.py\` builds the run's settings from an
env mapping, \`feedstore/parsers.py\` holds the parser registry and its lookup,
\`feedstore/pipeline.py\` runs a feed against a source that sometimes fails, and
\`feedstore/__init__.py\` is the package's public face and its \`run_feed\` entry point.
\`feedstore/transport.py\` is read-only. Adding a format or swapping the source must take no edit
inside the package. Start with \`README.md\`. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Build it in dependency order: settings first, then the registry, then the pipeline that uses both, then the exports that expose them.",
      '`register("csv")` is called before the function it decorates is bound, so `register` is a factory: it takes the name, and the thing it returns is the actual decorator that receives the parser. That inner decorator has to hand the parser back unchanged, or `parse_csv` stops being callable on its own.',
      "`Pipeline.fetch` is a bounded retry loop, so its counter has to be visible on `self.attempts` after every path through it, including the failing one, and the last `TransportError` has to outlive the `except` block that caught it if it is going to be re-raised afterwards. `__init__.py` does no work of its own beyond `run_feed`, which is one line composing `load_settings` and `Pipeline`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "feedstore/config.py",
      editableFilePaths: [
        "feedstore/config.py",
        "feedstore/parsers.py",
        "feedstore/pipeline.py",
        "feedstore/__init__.py",
      ],
      visibleTestPaths: ["tests/test_feedstore.py"],
      hiddenTestPaths: ["tests/test_feedstore_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CAPSTONE_README },
        { path: "pyproject.toml", role: "docs", language: "text", content: CAPSTONE_PYPROJECT },
        {
          path: "feedstore/__init__.py",
          role: "editable",
          language: "python",
          content: CAPSTONE_INIT_STARTER,
          description: "The public API surface and the run_feed entry point",
        },
        {
          path: "feedstore/config.py",
          role: "editable",
          language: "python",
          content: CAPSTONE_CONFIG_STARTER,
          description: "Build Settings from the environment",
        },
        {
          path: "feedstore/parsers.py",
          role: "editable",
          language: "python",
          content: CAPSTONE_PARSERS_STARTER,
          description: "The parser registry and its lookup",
        },
        {
          path: "feedstore/pipeline.py",
          role: "editable",
          language: "python",
          content: CAPSTONE_PIPELINE_STARTER,
          description: "Fetch with retries, parse, filter, report",
        },
        {
          path: "feedstore/transport.py",
          role: "readonly",
          language: "python",
          content: CAPSTONE_TRANSPORT,
          description: "The stand-in feed source (read-only)",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_feedstore.py",
          role: "test",
          language: "python",
          content: CAPSTONE_TEST,
          description: "Visible capstone tests",
        },
        {
          path: "tests/test_feedstore_hidden.py",
          role: "test",
          language: "python",
          content: CAPSTONE_TEST_HIDDEN,
          hidden: true,
          description: "Hidden capstone tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_feedstore", label: "visible feedstore" },
            { module: "test_feedstore_hidden", label: "hidden feedstore" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "feedstore/__init__.py",
          role: "editable",
          language: "python",
          content: CAPSTONE_INIT_REFERENCE,
        },
        {
          path: "feedstore/config.py",
          role: "editable",
          language: "python",
          content: CAPSTONE_CONFIG_REFERENCE,
        },
        {
          path: "feedstore/parsers.py",
          role: "editable",
          language: "python",
          content: CAPSTONE_PARSERS_REFERENCE,
        },
        {
          path: "feedstore/pipeline.py",
          role: "editable",
          language: "python",
          content: CAPSTONE_PIPELINE_REFERENCE,
        },
      ],
    },
  },
}
