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
//
// The depth spec's "at most two levers" ceiling is deliberately exceeded here and nowhere else in
// the level: composing the level IS this exercise's subject, and every file is a lever the level
// already taught. The cost is paid down in scaffolding instead. Teach used to spend its second
// half on money arithmetic (a `summarize` over raw orders, banker's rounding, how to store money)
// with no relationship to packaging, and Apply was that same money function; both are now about
// the package. The four APIs the reference used that no fence demonstrated (`feedstore.config`,
// `feedstore.pipeline`, `FlakyTransport`, and the injected `pipeline` seam) each have one now.
//
// Time budget (counted, not guessed). Teach 9: ~1,150 prose words, three checks, a layout block
// and three code fences. Apply 15: 40 provided lines to read (the source, two parsers, the table),
// 13 to write across the two boundaries the package owns. Practice 61: 75 lines of README, 26 of
// read-only transport, 112 to write across four files, and the four seams that carry it.
// 9 + 15 + 61 = 85, the lesson total. The Practice-to-Apply ratio lands at 8.6x, inside the spec's
// 12x smell threshold, against 16x before this pass.
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
    estimatedMinutes: 9,
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

### Submodules do the work; \`__init__.py\` is the face

Inside the wheel your package is a directory of submodules, one per job. A caller should not have to learn that map. They import from the package root, and \`__init__.py\` is where the root's names come from:

\`\`\`text
feedstore/
    __init__.py     the public face: re-exports + the entry point
    config.py       raw env mapping -> typed settings
    parsers.py      the parser table and its lookup
    pipeline.py     one run: fetch, parse, filter, report
    transport.py    the feed source
\`\`\`

\`\`\`python
# feedstore/__init__.py
from feedstore.config import Settings, load_settings
from feedstore.pipeline import Pipeline
from feedstore.transport import FlakyTransport, TransportError

__all__ = ["FlakyTransport", "Pipeline", "Settings", "TransportError", "load_settings", "run_feed"]


def run_feed(env, transport):
    return Pipeline(load_settings(env), transport).run()
\`\`\`

Now \`from feedstore import run_feed, FlakyTransport\` works, and \`feedstore.pipeline\` is free to be reorganised tomorrow without breaking a single caller. That is the point of the indirection: the import path is a contract, and a submodule path is a contract you did not mean to make.

\`__all__\` is a plain list of strings that does exactly two things. It is the list \`from feedstore import *\` copies, and it is the documented public surface that linters and doc tools read. It does not hide anything: \`feedstore.config\` is still importable by anyone who wants it. It is a promise about what you will keep working, not a lock.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "what-dunder-all-actually-does",
  "prompt": "You leave the internal PARSERS table out of feedstore.__all__. A caller then writes 'from feedstore.parsers import PARSERS' and mutates it. What happened?",
  "options": [
    {
      "label": "Nothing stopped them. __all__ only governs star-imports and documents intent",
      "correct": true,
      "feedback": "Right, and this is the whole reason a leading underscore is a convention rather than a guarantee. Python has no private. What you get is a stated surface, and the argument you can point at in review when someone reaches around it."
    },
    {
      "label": "The import raises ImportError, because a name absent from __all__ is not exported",
      "feedback": "That would make __all__ an access-control mechanism, which is how most people first read it. It is only consulted by 'import *', and a direct submodule import never asks it anything."
    },
    {
      "label": "It works, but only because parsers.py has no __all__ of its own",
      "feedback": "Reasonable, and it correctly guesses that __all__ is per-module. Adding one to parsers.py would still not block the direct import, because __all__ never gates ordinary attribute access."
    },
    {
      "label": "The name is importable but read-only, since module-level names outside __all__ are frozen",
      "feedback": "Nothing in Python freezes a module attribute, and a dict would be mutable regardless of the name it is bound to. Genuinely protecting that table means not exposing the object, for example handing back a copy."
    }
  ]
}
\`\`\`

### Hand the package its dependencies

The sandbox has no network, so the feed source here is a stand-in. That constraint is also the design lesson: a package that *constructs* its own I/O client cannot be tested, replaced, or reused. A package that is *given* one can be all three. The retry policy is yours; the thing being retried is the caller's:

\`\`\`python
class TransportError(RuntimeError):
    """One attempt failed. A later attempt may still succeed."""


class FlakyTransport:
    """A source that fails its first fail_times calls, then succeeds."""

    def __init__(self, payload, fail_times=0):
        self.payload = payload
        self.fail_times = fail_times
        self.calls = 0

    def fetch(self):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise TransportError("fetch attempt " + str(self.calls) + " failed")
        return self.payload


def fetch_with_retries(transport, max_attempts):
    last_error = None
    for _ in range(max_attempts):
        try:
            return transport.fetch()
        except TransportError as error:
            last_error = error       # survives the except block; the bare name would not
    raise last_error


source = FlakyTransport("a1,7\\n", fail_times=2)
print(fetch_with_retries(source, 3), source.calls)   # a1,7  3
\`\`\`

Two details there are worth stealing. The loop is bounded by an *attempt count*, not by "until it works", so a source that is genuinely down fails in bounded time instead of hanging. And the last error is captured into a variable, because Python deletes the \`except ... as error\` name at the end of the block: reading \`error\` after the \`for\` loop is a \`NameError\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "injected-vs-constructed-dependency",
  "prompt": "Pipeline takes its transport as a constructor argument rather than building a FlakyTransport itself. A colleague calls that indirection for its own sake. What does the argument actually buy?",
  "options": [
    {
      "label": "Any object with fetch() can be passed in, so the package works with sources it has never heard of and can be tested without one",
      "correct": true,
      "feedback": "Right, and note that no interface declaration was needed for it. Duck typing means the contract is the fetch() method, so a test double, a cached reader, and next year's real client all substitute freely."
    },
    {
      "label": "It makes the pipeline faster, since the transport is built once and reused",
      "feedback": "True as a side effect and irrelevant as a reason: you could cache a self-constructed client just as easily. The win is about who chooses the object, not how many times it is built."
    },
    {
      "label": "It lets mypy verify the transport, which it could not do for a locally constructed one",
      "feedback": "Backwards. A locally constructed object has a concrete known type, so it is the easier one to check. An injected parameter is exactly what needs a Protocol annotation before mypy can say anything useful."
    },
    {
      "label": "It is required for packaging, because a wheel cannot contain code that instantiates network clients at import time",
      "feedback": "A wheel happily contains anything. There is a real rule near here though: doing I/O at import time is a genuine packaging sin, because importing your package should never open a socket."
    }
  ]
}
\`\`\`

### Pitfalls

- Work at import time is work every caller pays for, including the test suite and the CLI's \`--help\`. Reading a config file, opening a connection, or calling an API from module scope makes your package slow and fragile to import. Define things at import time; do things when called. The one deliberate exception is registration: a \`@register("csv")\` decorator runs at import, which is precisely why the module defining the parsers has to be imported for them to exist.
- A submodule that is never imported does not run. If \`feedstore/__init__.py\` never touches \`feedstore.parsers\`, no \`@register\` in that file has fired, and the table is empty in a way that looks like the decorator is broken.

**Interview nuance:** "how do you ship it" is a design question wearing an ops costume. The answers that carry weight are the ones about boundaries: \`pyproject.toml\` as declarative metadata a tool reads without executing your code, a package root that is a deliberate public surface rather than whatever files happen to exist, untrusted input parsed into typed values once at the edge, and dependencies handed in rather than constructed, so the package can be tested at all. Version and upload are the easy part.`,
    demoCode: `# One package, two boundaries: raw env -> typed settings, raw text -> rows.
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    source_format: str
    min_score: int


def load_settings(env):
    raw = (env.get("FEED_MIN_SCORE") or "").strip()
    return Settings(
        source_format=(env.get("FEED_FORMAT") or "").strip() or "csv",
        min_score=int(raw) if raw else 0,
    )


print(load_settings({}))
print(load_settings({"FEED_FORMAT": "pipe", "FEED_MIN_SCORE": " 5 "}))`,
  },
  apply: {
    id: "py-l4-packaging-capstone-apply",
    estimatedMinutes: 15,
    executionMode: "single-file",
    prompt: `Implement \`load_settings(env)\` and \`run_feed(env, source)\`, the two boundaries a package like
this owns.

\`load_settings(env)\` turns a raw env mapping into \`{"source_format": str, "min_score": int}\`.
\`FEED_FORMAT\` defaults to \`"csv"\` and \`FEED_MIN_SCORE\` defaults to \`0\`; a key that is missing,
empty, or only whitespace takes its default, and \`min_score\` comes back as an \`int\` rather than
the string the environment gave you.

\`run_feed(env, source)\` is the entry point. It loads the settings, fetches the raw feed from the
\`source\` it was handed, parses it with the parser \`PARSERS\` holds for that format, keeps the rows
whose \`score\` is at least \`min_score\`, and returns
\`{"format": ..., "calls": ..., "parsed": ..., "kept": ...}\`, where \`calls\` is how many times the
source was fetched. \`run_feed\` must never construct a source of its own: the graded \`report\` shim
builds one and hands it in.

\`report({"FEED_MIN_SCORE": "5"}, "a1,7\\nb2,3\\nc3,9\\n")\` is
\`{"format": "csv", "calls": 1, "parsed": 3, "kept": 2}\`.`,
    starterCode: `DEFAULT_FORMAT = "csv"
DEFAULT_MIN_SCORE = 0


class FeedSource:
    """The partner feed source. Provided: it hands back its payload and counts the calls."""

    def __init__(self, payload):
        self.payload = payload
        self.calls = 0

    def fetch(self):
        self.calls += 1
        return self.payload


def parse_csv(text):
    rows = []
    for line in text.splitlines():
        if not line.strip():
            continue
        item_id, score = line.split(",")
        rows.append({"id": item_id.strip(), "score": int(score)})
    return rows


def parse_pipe(text):
    rows = []
    for line in text.splitlines():
        if not line.strip():
            continue
        item_id, score = line.split("|")
        rows.append({"id": item_id.strip(), "score": int(score)})
    return rows


PARSERS = {"csv": parse_csv, "pipe": parse_pipe}


def load_settings(env):
    # TODO: read the two env keys, fall back to the defaults when a value is missing or blank,
    # and give min_score its numeric type.
    return {}


def run_feed(env, source):
    # TODO: settings, then the feed text from the source you were given, then the parser for
    # this run's format, then the rows that clear the floor, then the report.
    return {}


def report(env, payload):
    """Graded entry point: builds a source, then hands it to run_feed."""
    return run_feed(env, FeedSource(payload))`,
    hints: [
      '`env.get(key)` can hand back `None` or `"  "`, and both of those mean the same thing here: use the default. Strip first, then decide.',
      "`run_feed` composes four things it does not implement: `load_settings`, `source.fetch()`, `PARSERS[...]`, and a filter over the parsed rows. Every one of the four report keys is available once those have run.",
      '`(env.get("FEED_FORMAT") or "").strip() or DEFAULT_FORMAT` collapses both blank cases; `int(raw)` gives `min_score` its type; `source.calls` is where the fetch count already lives.',
    ],
    referenceSolution: `DEFAULT_FORMAT = "csv"
DEFAULT_MIN_SCORE = 0


class FeedSource:
    """The partner feed source. Provided: it hands back its payload and counts the calls."""

    def __init__(self, payload):
        self.payload = payload
        self.calls = 0

    def fetch(self):
        self.calls += 1
        return self.payload


def parse_csv(text):
    rows = []
    for line in text.splitlines():
        if not line.strip():
            continue
        item_id, score = line.split(",")
        rows.append({"id": item_id.strip(), "score": int(score)})
    return rows


def parse_pipe(text):
    rows = []
    for line in text.splitlines():
        if not line.strip():
            continue
        item_id, score = line.split("|")
        rows.append({"id": item_id.strip(), "score": int(score)})
    return rows


PARSERS = {"csv": parse_csv, "pipe": parse_pipe}


def load_settings(env):
    raw_score = (env.get("FEED_MIN_SCORE") or "").strip()
    return {
        "source_format": (env.get("FEED_FORMAT") or "").strip() or DEFAULT_FORMAT,
        "min_score": int(raw_score) if raw_score else DEFAULT_MIN_SCORE,
    }


def run_feed(env, source):
    settings = load_settings(env)
    rows = PARSERS[settings["source_format"]](source.fetch())
    kept = [row for row in rows if row["score"] >= settings["min_score"]]
    return {
        "format": settings["source_format"],
        "calls": source.calls,
        "parsed": len(rows),
        "kept": len(kept),
    }


def report(env, payload):
    """Graded entry point: builds a source, then hands it to run_feed."""
    return run_feed(env, FeedSource(payload))`,
    testCases: [
      {
        input: { env: { FEED_MIN_SCORE: "5" }, payload: "a1,7\nb2,3\nc3,9\n" },
        expected: { format: "csv", calls: 1, parsed: 3, kept: 2 },
        description: "the csv default, with a score floor",
      },
      {
        input: { env: {}, payload: "a1,7\nb2,3\n" },
        expected: { format: "csv", calls: 1, parsed: 2, kept: 2 },
        description: "an empty env falls back to csv and a floor of 0",
      },
      {
        input: { env: { FEED_FORMAT: "pipe", FEED_MIN_SCORE: "4" }, payload: "b2|3\nc3|9\n" },
        expected: { format: "pipe", calls: 1, parsed: 2, kept: 1 },
        description: "a different format is looked up in the table",
      },
      {
        input: { env: { FEED_FORMAT: "   ", FEED_MIN_SCORE: " " }, payload: "a1,7\n" },
        expected: { format: "csv", calls: 1, parsed: 1, kept: 1 },
        description: "blank values fall back to the defaults",
      },
      {
        input: { env: { FEED_MIN_SCORE: "100" }, payload: "a1,7\nb2,3\n" },
        expected: { format: "csv", calls: 1, parsed: 2, kept: 0 },
        description: "a floor nothing clears still parses",
      },
      {
        input: { env: {}, payload: "" },
        expected: { format: "csv", calls: 1, parsed: 0, kept: 0 },
        description: "an empty feed",
      },
    ],
  },
  practice: {
    id: "py-l4-packaging-capstone-practice",
    estimatedMinutes: 61,
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
