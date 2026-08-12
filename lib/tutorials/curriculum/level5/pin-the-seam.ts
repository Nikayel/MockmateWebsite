/**
 * L5 real-codebase module, lesson 3: "Pin the seam with a regression test".
 *
 * Multi-file workspace lesson, and the first one in the corpus where a TEST FILE is the
 * learner's deliverable. A vague bug report has to become a regression test written at the
 * cheap seam, proven red against the build that shipped the bug, and then turned green by
 * the smallest fix. Apply: an admin search service whose pagination helper strides by
 * page_size - 1, so page 2 repeats the tail of page 1. Practice: a nightly export job whose
 * batching helper drops the remainder, so runs whose row count is not an exact multiple of
 * the batch size silently lose rows.
 *
 * Grading device: a read-only audit suite runs the learner's tests/test_regression.py twice,
 * swapping search.pagination.page (resp. export.batching.chunks) between a frozen copy of the
 * old build and the current build via setattr inside try/finally. That is why the workspace
 * lists a `role: "test"` file inside `editableFilePaths` (the overlay honors editableFilePaths
 * regardless of role) and why both the README and the audit's failure messages steer the
 * learner to call through the module attribute instead of a from-import.
 *
 * Workspace contract (mirrors level3/level4): every package dir has an __init__.py; the runner
 * (role "test", hidden) prints __WORKSPACE_TEST_RESULTS__: + JSON; a suite label containing the
 * word "hidden" marks its rows hidden. Apply runs four suites: the regression file the learner
 * writes and the audit that coaches it (both visible), a small visible behavior suite on the
 * repaired page(), and a hidden sweep of the same function. The visible behavior suite exists
 * because apply is the guided phase and `test-result-mapping` masks every hidden failure to one
 * generic sentence: a repair that only special-cases the call the learner pinned has to fail a
 * NAMED row, or the guidance is gone. The hidden sweep stays for the part that must not be
 * gameable (more page sizes, the endpoint, past-the-end, non-mutation). Practice hides the audit
 * instead, so the learner has to run the red-first ritual on their own discipline. This file only
 * exports the lesson; the lead agent wires it into level5/index.ts inside the
 * "py-l5-real-codebases" module.
 *
 * Budget: 40 minutes (12 read, roughly 16 apply, roughly 12 practice). The apply exercise costs
 * more than a normal workspace because the learner reads a build-swapping audit harness, writes a
 * test in an unfamiliar record(name, fn) shape, watches it go red, and only then makes the fix.
 */
import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"

const EMPTY_INIT = ""

/**
 * One suite the runner imports from `tests/` and runs: the module name (no extension) and the
 * label its rows carry. A label containing the word "hidden" is what makes `record_factory` mark
 * those rows hidden, so the label is part of the grading contract, not decoration.
 */
type RunnerSuite = { module: string; label: string }

/**
 * Local runner builder. `buildRunner` is file-local in level3/level4 and not importable, so this
 * copy takes N suites rather than the fixed visible/hidden pair those files hard-code. The apply
 * workspace needs four (three visible suites plus a hidden one); the shape of the emitted runner
 * is otherwise byte-identical to the level3/level4 contract.
 */
function buildRunner(suites: RunnerSuite[]): string {
  const imports = suites.map((suite) => suite.module).join(", ")
  const calls = suites
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


${calls}
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`
}

// ───────────────────────────────────────────────────────────────────────────
// Apply workspace: admin search (a result repeats at the top of page 2)
// ───────────────────────────────────────────────────────────────────────────

const APPLY_README = buildBrief({
  lesson: "py-l5-pin-the-seam",
  slot: "apply",
  kind: "bug-report",
  headline: "a search result shows up twice",
  body: `Support says a row from the end of page 1 shows up again at the top of page 2 in admin
search. They cannot tell us which query it happens on, and page 1 itself looks right.

\`search/service.py\` is the endpoint: it filters rows and calls \`search/pagination.py\` with
\`PAGE_SIZE = 3\`. Start at the endpoint and step down until you reach the narrowest function
that still shows the reported behavior.

Two things to do, in this order:

1. Write the regression test in \`tests/test_regression.py\`. Call the function as
   \`pagination.page(...)\` and keep \`run_tests(record)\` as the entry point.
2. Fix \`page\` in \`search/pagination.py\`.

\`tests/test_audit.py\` is read-only. It runs your regression test against the old build and
against the current one, and its failure messages tell you what is still missing.
\`tests/test_pagination.py\` is read-only too, and checks the repaired \`page\` on its own.

The hidden tests check \`page\` at more page sizes and through the endpoint that
reported the bug.`,
})

const SEARCH_PAGINATION_STARTER = String.raw`"""Windowing for the admin search results."""

# Generated change under review: page size was made configurable here.


def page(items, page_num, page_size):
    """Return the slice of items shown on page page_num, counting from 1."""
    start = (page_num - 1) * (page_size - 1)
    return items[start:start + page_size]
`

const SEARCH_PAGINATION_REFERENCE = String.raw`"""Windowing for the admin search results."""


def page(items, page_num, page_size):
    """Return the slice of items shown on page page_num, counting from 1."""
    start = (page_num - 1) * page_size
    return items[start:start + page_size]
`

const SEARCH_SERVICE = String.raw`"""Admin search endpoint: filter the rows, then hand one window to the caller."""

from search import pagination

PAGE_SIZE = 3


def search(rows, query, page_num):
    """Return one page of the rows whose name contains query."""
    matches = [row for row in rows if query.lower() in row["name"].lower()]
    window = pagination.page(matches, page_num, PAGE_SIZE)
    return {
        "page": page_num,
        "total_matches": len(matches),
        "results": [f"{row['id']}: {row['name']}" for row in window],
    }
`

const SEARCH_TEST_REGRESSION_STARTER = String.raw`# Regression tests for the reported pagination bug.
#
# Call the function as pagination.page(...) so the audit suite can swap builds under it.
# Keep run_tests(record) as the entry point, and keep the worked example below.

from search import pagination

ITEMS = ["a", "b", "c", "d"]


def run_tests(record):
    def page_one_returns_the_first_window():
        got = pagination.page(ITEMS, 1, 2)
        assert got == ["a", "b"], f"page 1 at size 2 should be ['a', 'b'], got {got!r}"

    record("page 1 returns the first two items", page_one_returns_the_first_window)

    # TODO: add the test that pins the reported bug.
    # Define a nested function that asserts the behavior the report describes, then
    # register it with record("a readable name", the_function).
`

const SEARCH_TEST_REGRESSION_REFERENCE = String.raw`# Regression tests for the reported pagination bug.
#
# Call the function as pagination.page(...) so the audit suite can swap builds under it.
# Keep run_tests(record) as the entry point, and keep the worked example below.

from search import pagination

ITEMS = ["a", "b", "c", "d"]
SIX = ["a", "b", "c", "d", "e", "f"]


def run_tests(record):
    def page_one_returns_the_first_window():
        got = pagination.page(ITEMS, 1, 2)
        assert got == ["a", "b"], f"page 1 at size 2 should be ['a', 'b'], got {got!r}"

    def page_two_does_not_repeat_page_one():
        got = pagination.page(SIX, 2, 3)
        assert got == ["d", "e", "f"], f"page 2 at size 3 should be ['d', 'e', 'f'], got {got!r}"

    record("page 1 returns the first two items", page_one_returns_the_first_window)
    record("page 2 does not repeat the end of page 1", page_two_does_not_repeat_page_one)
`

const SEARCH_TEST_AUDIT = String.raw`"""Audit suite (read-only). It grades the regression test you write.

It runs your tests/test_regression.py twice: once against a frozen copy of the build
that shipped the bug, once against the code in the repo. A regression test only counts
when it fails on the old build and passes on the current one. You do not have to read
the machinery below; its failure messages tell you what is still missing.
"""

from search import pagination
from tests import test_regression

ITEMS_12 = list("abcdefghijkl")


def _old_build_page(items, page_num, page_size):
    """Frozen copy of the build that shipped the bug. Do not edit."""
    start = (page_num - 1) * (page_size - 1)
    return items[start:start + page_size]


def _run_suite(build):
    """Run tests/test_regression.py once, with pagination.page swapped for build."""
    outcomes = []

    def record(name, fn):
        try:
            fn()
            outcomes.append((name, True, ""))
        except Exception as exc:
            outcomes.append((name, False, str(exc) or type(exc).__name__))

    original = pagination.page
    setattr(pagination, "page", build)
    try:
        test_regression.run_tests(record)
    except Exception as exc:
        outcomes.append(("run_tests raised outside a recorded test", False, str(exc)))
    finally:
        setattr(pagination, "page", original)
    return outcomes


def run_tests(record):
    def your_suite_records_at_least_one_test():
        outcomes = _run_suite(pagination.page)
        assert outcomes, (
            "tests/test_regression.py recorded no tests, so it cannot prove anything; "
            "register each test with record(name, fn)"
        )

    def your_suite_fails_on_the_old_build():
        red = [name for name, passed, _ in _run_suite(_old_build_page) if not passed]
        assert red, (
            "tests/test_regression.py passes on the old build, add a test that catches "
            "the page 2 overlap; if you already did, check that it calls "
            "pagination.page(...) rather than a from-imported name"
        )

    def your_suite_passes_on_the_current_build():
        red = [
            f"{name}: {error}"
            for name, passed, error in _run_suite(pagination.page)
            if not passed
        ]
        assert not red, (
            "your suite fails on the current build, now make the fix in "
            "search/pagination.py (" + "; ".join(red) + ")"
        )

    def page_two_starts_where_page_one_ended():
        got = pagination.page(ITEMS_12, 2, 3)
        assert got == ITEMS_12[3:6], (
            f"page 1 ends at {ITEMS_12[2]!r}, so page 2 should be {ITEMS_12[3:6]!r}, got {got!r}"
        )

    record("your suite records at least one test", your_suite_records_at_least_one_test)
    record("your suite fails on the old build", your_suite_fails_on_the_old_build)
    record("your suite passes on the current build", your_suite_passes_on_the_current_build)
    record("page 2 starts where page 1 ended", page_two_starts_where_page_one_ended)
`

const SEARCH_TEST_PAGINATION = String.raw`"""Behavior checks on the repaired page() (read-only).

Your regression test pins the one case in the bug report. These two check the repair
itself: page 1 is still the first window, and walking every page rebuilds the list
exactly once. A repair that only satisfies the single call you pinned passes your own
suite and fails here, by name.
"""

from search import pagination

ITEMS = list("abcdefgh")


def _walk_every_page(items, page_size):
    """Collect pages from 1 until one comes back empty, bounded so a bad build still stops."""
    seen = []
    for page_num in range(1, len(items) + 2):
        window = pagination.page(list(items), page_num, page_size)
        if not window:
            break
        seen.extend(window)
    return seen


def run_tests(record):
    def page_one_is_the_first_window():
        for size in [2, 5]:
            got = pagination.page(list(ITEMS), 1, size)
            assert got == ITEMS[:size], (
                f"page 1 at size {size} should be {ITEMS[:size]!r}, got {got!r}"
            )

    def the_pages_tile_the_list():
        for size in [2, 5]:
            seen = _walk_every_page(ITEMS, size)
            assert seen == ITEMS, (
                f"walking every page at size {size} should rebuild the list once, got {seen!r}"
            )

    record("page 1 is the first window", page_one_is_the_first_window)
    record("the pages tile the list", the_pages_tile_the_list)
`

const SEARCH_TEST_PAGINATION_HIDDEN = String.raw`"""Hidden checks on the repaired page(), independent of the test you wrote.

Your regression test proves you can pin the reported bug. These prove the repair holds
at page sizes your test never used and through the endpoint that reported it. Every
check hands page() its own copy of the list, so one bad build cannot poison the rest.
"""

from search import pagination, service

ITEMS = list("abcdefghijkl")
ROWS = [{"id": index, "name": f"user {index}"} for index in range(1, 11)]


def _walk_every_page(items, page_size):
    """Collect pages from 1 until one comes back empty, bounded so a bad build still stops."""
    seen = []
    for page_num in range(1, len(items) + 2):
        window = pagination.page(list(items), page_num, page_size)
        if not window:
            break
        seen.extend(window)
    return seen


def run_tests(record):
    def page_one_is_the_first_window_at_every_size():
        for size in [1, 2, 3, 4, 5, 7]:
            got = pagination.page(list(ITEMS), 1, size)
            assert got == ITEMS[:size], (
                f"page 1 at size {size} should be {ITEMS[:size]!r}, got {got!r}"
            )

    def the_pages_tile_the_list_at_every_size():
        for size in [1, 2, 4, 5, 7]:
            seen = _walk_every_page(ITEMS, size)
            assert seen == ITEMS, (
                f"walking every page at size {size} should rebuild the list once, got {seen!r}"
            )

    def a_page_past_the_end_is_empty():
        got = pagination.page(list(ITEMS), 5, 3)
        assert got == [], f"twelve items in threes is four pages, so page 5 is empty, got {got!r}"
        empty = pagination.page([], 1, 3)
        assert empty == [], f"paging an empty list should give an empty page, got {empty!r}"

    def paging_leaves_the_rows_alone():
        rows = list(ITEMS)
        for page_num in [1, 2, 3]:
            pagination.page(rows, page_num, 4)
        assert rows == ITEMS, f"page() must not change the list it is handed, got {rows!r}"

    def the_endpoint_no_longer_repeats_a_row():
        first = service.search(ROWS, "user", 1)["results"]
        second = service.search(ROWS, "user", 2)["results"]
        shared = [line for line in first if line in second]
        assert not shared, f"page 2 repeats {shared!r} from page 1"
        expected = [f"{row['id']}: {row['name']}" for row in ROWS[:6]]
        assert first + second == expected, (
            f"the first two pages should be {expected!r}, got {first + second!r}"
        )

    record("page 1 is the first window at every size", page_one_is_the_first_window_at_every_size)
    record("the pages tile the list at every size", the_pages_tile_the_list_at_every_size)
    record("a page past the end is empty", a_page_past_the_end_is_empty)
    record("paging leaves the rows alone", paging_leaves_the_rows_alone)
    record("the endpoint no longer repeats a row", the_endpoint_no_longer_repeats_a_row)
`

// ───────────────────────────────────────────────────────────────────────────
// Practice workspace: the nightly export job (a dropped remainder)
// ───────────────────────────────────────────────────────────────────────────

const PRACTICE_README = buildBrief({
  lesson: "py-l5-pin-the-seam",
  kind: "bug-report",
  headline: "the nightly export sometimes misses rows",
  body: `Ops says the nightly export sometimes comes up a few rows short against the source table.
They cannot say which nights, and nobody can point at the deploy that started it.

\`export/batching.py\` splits the rows into batches. \`export/writer.py\` formats each batch
into the lines the job writes out, and is read-only.

Two things to do, in this order:

1. Write the regression test in \`tests/test_regression.py\`. Call the function as
   \`batching.chunks(...)\` and keep \`run_tests(record)\` as the entry point.
2. Fix \`chunks\` in \`export/batching.py\`.

A hidden audit runs your regression test against the old build and against the current one.
It only passes when your test fails on the old build and passes after your fix, so write the
test first and watch it go red.`,
})

const EXPORT_BATCHING_STARTER = String.raw`"""Batching for the nightly export job."""

# Generated change under review: batching was added so the writer could stream.


def chunks(rows, size):
    """Split rows into consecutive batches of at most size rows each."""
    return [rows[i * size:(i + 1) * size] for i in range(len(rows) // size)]
`

const EXPORT_BATCHING_REFERENCE = String.raw`"""Batching for the nightly export job."""


def chunks(rows, size):
    """Split rows into consecutive batches of at most size rows each."""
    batch_count = (len(rows) + size - 1) // size
    return [rows[i * size:(i + 1) * size] for i in range(batch_count)]
`

const EXPORT_WRITER = String.raw`"""Nightly export: turn the rows into the text lines the job writes out."""

from export import batching

BATCH_SIZE = 3


def export_lines(rows):
    """Return every export line, one batch at a time."""
    lines = []
    for batch in batching.chunks(rows, BATCH_SIZE):
        for row in batch:
            lines.append(f"{row['id']}:{row['name']}")
    return lines
`

const EXPORT_TEST_REGRESSION_STARTER = String.raw`# Regression tests for the reported export bug.
#
# Call the function as batching.chunks(...) so the audit can swap builds under it.
# Keep run_tests(record) as the entry point, and keep the worked example below.

from export import batching

ROWS = [1, 2, 3, 4, 5, 6]


def run_tests(record):
    def six_rows_in_threes_give_two_batches():
        got = batching.chunks(ROWS, 3)
        assert got == [[1, 2, 3], [4, 5, 6]], f"six rows in threes should give two batches, got {got!r}"

    record("six rows in threes give two batches", six_rows_in_threes_give_two_batches)

    # TODO: add the test that pins the reported bug.
    # The report says the export only misses rows sometimes, so the worked example above
    # cannot reach it. Define a nested function, then register it with record(...).
`

const EXPORT_TEST_REGRESSION_REFERENCE = String.raw`# Regression tests for the reported export bug.
#
# Call the function as batching.chunks(...) so the audit can swap builds under it.
# Keep run_tests(record) as the entry point, and keep the worked example below.

from export import batching

ROWS = [1, 2, 3, 4, 5, 6]
SEVEN_ROWS = [1, 2, 3, 4, 5, 6, 7]


def run_tests(record):
    def six_rows_in_threes_give_two_batches():
        got = batching.chunks(ROWS, 3)
        assert got == [[1, 2, 3], [4, 5, 6]], f"six rows in threes should give two batches, got {got!r}"

    def seven_rows_in_threes_keep_the_remainder():
        got = batching.chunks(SEVEN_ROWS, 3)
        assert got == [[1, 2, 3], [4, 5, 6], [7]], (
            f"seven rows in threes should keep the last row, got {got!r}"
        )

    record("six rows in threes give two batches", six_rows_in_threes_give_two_batches)
    record("seven rows in threes keep the remainder", seven_rows_in_threes_keep_the_remainder)
`

const EXPORT_TEST_AUDIT_HIDDEN = String.raw`"""Hidden audit suite: it grades the regression test you write.

It runs your tests/test_regression.py against a frozen copy of the old build and
against the code in the repo. Your suite has to fail on the old build and pass on
the current one.
"""

from export import batching
from tests import test_regression

ROWS_7 = [1, 2, 3, 4, 5, 6, 7]


def _old_build_chunks(rows, size):
    """Frozen copy of the build that shipped the bug. Do not edit."""
    return [rows[i * size:(i + 1) * size] for i in range(len(rows) // size)]


def _run_suite(build):
    """Run tests/test_regression.py once, with batching.chunks swapped for build."""
    outcomes = []

    def record(name, fn):
        try:
            fn()
            outcomes.append((name, True, ""))
        except Exception as exc:
            outcomes.append((name, False, str(exc) or type(exc).__name__))

    original = batching.chunks
    setattr(batching, "chunks", build)
    try:
        test_regression.run_tests(record)
    except Exception as exc:
        outcomes.append(("run_tests raised outside a recorded test", False, str(exc)))
    finally:
        setattr(batching, "chunks", original)
    return outcomes


def run_tests(record):
    def your_suite_records_at_least_one_test():
        assert _run_suite(batching.chunks), "tests/test_regression.py recorded no tests"

    def your_suite_fails_on_the_old_build():
        red = [name for name, passed, _ in _run_suite(_old_build_chunks) if not passed]
        assert red, (
            "tests/test_regression.py passes on the old build; call batching.chunks(...) "
            "and pin a row count the old build gets wrong"
        )

    def your_suite_passes_on_the_current_build():
        red = [name for name, passed, _ in _run_suite(batching.chunks) if not passed]
        assert not red, "your suite fails on the current build: " + "; ".join(red)

    def seven_rows_keep_the_remainder():
        got = batching.chunks(ROWS_7, 3)
        assert got == [[1, 2, 3], [4, 5, 6], [7]], f"got {got!r}"
        flat = [row for batch in got for row in batch]
        assert flat == ROWS_7, f"batches should flatten back to the rows, got {flat!r}"

    def a_short_run_still_exports():
        got = batching.chunks([1, 2], 5)
        assert got == [[1, 2]], f"got {got!r}"

    def no_rows_give_no_batches():
        got = batching.chunks([], 3)
        assert got == [], f"got {got!r}"

    def size_one_gives_one_batch_per_row():
        got = batching.chunks([1, 2, 3], 1)
        assert got == [[1], [2], [3]], f"got {got!r}"

    record("your suite records at least one test", your_suite_records_at_least_one_test)
    record("your suite fails on the old build", your_suite_fails_on_the_old_build)
    record("your suite passes on the current build", your_suite_passes_on_the_current_build)
    record("seven rows keep the remainder", seven_rows_keep_the_remainder)
    record("a short run still exports", a_short_run_still_exports)
    record("no rows give no batches", no_rows_give_no_batches)
    record("size one gives one batch per row", size_one_gives_one_batch_per_row)
`

// ───────────────────────────────────────────────────────────────────────────
// The lesson
// ───────────────────────────────────────────────────────────────────────────

export const pinTheSeamLesson: PythonLesson = {
  id: "py-l5-pin-the-seam",
  title: "Pin the seam with a regression test",
  summary:
    "Turn a vague bug report into a regression test that fails on the old build of the right module, then make the smallest fix that turns it green.",
  estimatedMinutes: 40,
  difficulty: "hard",
  skills: ["test design", "regression tests", "minimal reproduction", "debugging"],
  teach: {
    estimatedMinutes: 12,
    markdown: `## A fix without a red test is a rumor

You have already written probe cases against a snippet: pick an input, predict the output, run it, compare. In a repo that instinct needs one extra decision, because now you also choose where the test lives. Put it in the wrong layer and it either needs a page of setup or stays green while the bug is still there.

The claim here is narrow. A fix with no red test behind it is a rumor. You believe the bug is gone, and nothing in the repo will tell you when it comes back.

## From vague report to seam

The seam is the narrowest function where the reported behavior still reproduces. Finding it is a descent, not a search:

1. Reproduce at the layer the report describes, usually the endpoint or the screen.
2. Step down one call, feed it the same shaped input, and check whether the wrong behavior is still there.
3. Keep going until the behavior disappears. The last layer that still shows it is your seam.

This is the shrink habit pointed at the call chain instead of the input. Once you have the seam, compare what the two candidate tests cost. Say a report claims a new record sometimes overwrites an old one, and the id is chosen by a small helper:

\`\`\`python
# At the endpoint: the report's own words, plus three things that can break
payload = create_record(db_rows, {"name": "Ada", "team": "core"})
assert payload["record"]["id"] == 6
\`\`\`

\`\`\`python
# At the seam: one call, one behavior
assert ids.next_id([1, 2, 5]) == 6
\`\`\`

The endpoint test drags request parsing, defaults and response shape into an id bug. Change the response format next quarter and it goes red for a reason unrelated to the bug it was written for, so the next reader deletes it. The seam test survives that change, because it only ever claimed one thing.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "seam-choice",
  "prompt": "A duplicate id bug reproduces through the create-record endpoint, and it still reproduces when you call the small next_id(existing_ids) helper directly. Where does the regression test belong?",
  "options": [
    {
      "label": "At the endpoint, because that is what the report describes",
      "feedback": "Tempting because the test then mirrors the report word for word, which feels faithful to the user. But it drags parsing, defaults and response formatting into an id bug, so it needs heavy setup and will go red later for reasons that have nothing to do with this defect."
    },
    {
      "label": "On next_id, the smallest function that still shows the bug",
      "correct": true,
      "feedback": "Right. The behavior reproduces there, so that is the seam. One call, no setup, and it keeps its meaning when the layers above it are refactored, which is what you want from a test you intend to keep forever."
    },
    {
      "label": "At both levels, so nothing can slip through",
      "feedback": "Feels rigorous, and rigor is the right instinct in the wrong place. The same defect drives both failures, so the endpoint copy adds no detection you do not already have while doubling what future maintainers have to keep alive."
    },
    {
      "label": "In a manual QA checklist, since the fix is small",
      "feedback": "This documents the bug without guarding it. A checklist step only runs when a human remembers to run it, so the next refactor can reintroduce the defect and no build will say a word."
    }
  ]
}
\`\`\`

## Red first, then green

Now the ritual. Write the test, run it against the code exactly as it is, and watch it fail. That red run is the only evidence the test detects anything at all. Reverse the order and you get a test that agrees with whatever the code currently does, bug included.

This is the failure mode that AI workflows industrialize. Ask for a fix and you usually get the patch and a matching test in one response. The test was written from the patched code, so it has never been red, and it often asserts the shape of the new implementation rather than the contract. It looks like coverage. It proves nothing.

Both workspaces in this lesson enforce the order for you. An audit suite runs your regression test twice and refuses to pass until your suite fails on the old build.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "red-first-why",
  "prompt": "Why must a regression test be run against the unfixed code and seen to fail before you make the fix?",
  "options": [
    {
      "label": "Because a test that has never failed proves nothing about what it detects",
      "correct": true,
      "feedback": "Right. Until you have seen it red you only know that it agrees with the current code. The red run is the evidence that this particular test notices this particular defect, which is the entire reason to keep it around."
    },
    {
      "label": "Because red before green is the convention in most style guides",
      "feedback": "It does get taught as a convention, which is exactly why it feels skippable when you are in a hurry. It is really a proof obligation: the red run is evidence, not etiquette, and skipping it throws the evidence away."
    },
    {
      "label": "Because a test written first lifts the coverage number more",
      "feedback": "Coverage counts lines executed, not defects detected. A test written after the fix touches the same lines and moves the number identically while catching nothing, which is how a green dashboard hides an unpinned bug."
    },
    {
      "label": "Because only subtle bugs need this, and this one is subtle",
      "feedback": "The easy bug you never pinned is the one that comes back, because easy code gets refactored casually. Difficulty decides how long the fix takes, not whether the test has earned its place in the suite."
    }
  ]
}
\`\`\`

## Why the audit swaps builds

The audit keeps a frozen copy of the buggy function and installs it with a module attribute assignment, then restores the original in a \`finally\` block. That is the same mechanism \`pytest\`'s \`monkeypatch\` uses on real jobs, and it has one consequence you have to respect while writing the test:

\`\`\`python
from search import pagination

pagination.page(items, 2, 3)   # looked up on the module at call time, sees the swap
\`\`\`

\`\`\`python
from search.pagination import page

page(items, 2, 3)              # a name bound once at import, never sees the swap
\`\`\`

A from-import copies the function object into your module's namespace. Rebinding the attribute afterwards does not reach back and change your copy, so your test would grade the same build twice. Call through the module and your test runs whichever build the audit installed.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "import-binding",
  "prompt": "The audit swaps pagination.page between the old build and the current one by assigning to the module attribute. Which test style sees the swap?",
  "options": [
    {
      "label": "from search import pagination, then call pagination.page(...)",
      "correct": true,
      "feedback": "Right. The attribute is looked up on the module object every time the call runs, so whichever function the audit installed is the one that executes. This is the reason monkeypatching works at all."
    },
    {
      "label": "from search.pagination import page, then call page(...)",
      "feedback": "This is the most common import style in real code, which is exactly why it catches people out here. The from-import copies the function object into your namespace at import time, so a later rebinding of the module attribute never reaches your copy."
    },
    {
      "label": "Copy the function body into the test file and call the copy",
      "feedback": "Now the test grades a frozen snapshot instead of the code that ships. It would stay green forever no matter what happened in the real module, which is the opposite of what a regression test is for."
    },
    {
      "label": "Either style, because Python imports are live references",
      "feedback": "Module objects really are shared, so the intuition is half right. But a from-import binds a name to an object rather than to a live link, so rebinding the attribute later leaves your local name pointing at the old function."
    }
  ]
}
\`\`\`

## The smallest fix

With the pin in place you can repair with more confidence, because the test you just watched go red is now watching you. Still make the smallest change that turns it green, and let the rest of the suite tell you whether you reached too far. A pin plus a small diff is a fix you can defend in review.

## Pitfalls

- Testing through the endpoint because that is where the report lives. Heavy setup, and it goes red later for unrelated reasons.
- Binding the function with a from-import, so a build swap or a monkeypatch never reaches your test.
- Writing the test after the fix. It passes on the first run, which feels good and demonstrates nothing.
- Deleting the worked example test to make room for yours. Add alongside it; a suite that knows one bug is thinner than it looks.

**Interview nuance:** in a debugging round the follow-up is almost always "how do you know your test would have caught this?", and the only honest answer is "I watched it fail on the unfixed code". Say that and you have shown your process rather than your patch. Import binding is its own common screen question, because a candidate who has monkeypatched something for real knows why the from-import version quietly does nothing.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "pin-then-fix",
  "prompt": "A teammate ships the fix first, then adds a passing test for it in the same pull request. The fix itself is correct. What risk remains?",
  "options": [
    {
      "label": "The test may describe the new implementation rather than the contract, and would have passed before the fix too",
      "correct": true,
      "feedback": "Right. Written from the patched code, it can assert incidental details and never once demonstrate that it detects the defect. If the bug returns through a slightly different route, a test like that can stay green the whole time."
    },
    {
      "label": "No risk, because a correct fix makes the test redundant",
      "feedback": "Correct today says nothing about the next refactor, and the next refactor is the whole reason the test exists. The fix protects this build; only a test that has been red protects the builds after it."
    },
    {
      "label": "The extra test slows the build down",
      "feedback": "One assertion against one function is noise next to any real suite, and a suite that runs fast because it detects nothing is a poor trade. Runtime is simply not the risk being weighed here."
    },
    {
      "label": "The test might turn out to be flaky",
      "feedback": "Flakiness comes from time, ordering or shared state, none of which this test touches. It is a real problem worth naming, just a different one from a test that was never shown to detect anything."
    }
  ],
  "reveal": "The repo-scale ritual, in order: reproduce the report, step down the call chain to the seam, write the test there, watch it fail, make the smallest fix, watch everything pass, and keep the test forever."
}
\`\`\``,
    demoCode: `# The red-green ritual in miniature: one pin, two builds of the same helper.
# The report: a new record sometimes overwrites an old one.
EXISTING = [1, 2, 5]


def old_build_next_id(existing_ids):
    return len(existing_ids) + 1


def current_build_next_id(existing_ids):
    return max(existing_ids) + 1


def pin(next_id):
    """The regression test: a gap in the ids must not hand back a used id."""
    got = next_id(EXISTING)
    assert got == 6, f"expected 6 after {EXISTING}, got {got}"


for label, build in [("old build", old_build_next_id), ("current build", current_build_next_id)]:
    try:
        pin(build)
        print(f"{label}: PASS")
    except AssertionError as exc:
        print(f"{label}: FAIL (expected) {exc}")

print()
print("A pin that passes on both builds is not a regression test, it is a coincidence.")`,
  },
  apply: {
    id: "py-l5-pin-the-seam-apply",
    executionMode: "workspace",
    prompt: `Write the regression test in \`tests/test_regression.py\` that fails on the old build of
\`search/pagination.py\`, then fix \`page\` so every suite passes. Call the function as
\`pagination.page(...)\` so the audit suite can swap builds under it. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Reproduce before you test: hand-run `pagination.page(list('abcdef'), 2, 3)` and compare its first element with the last element of page 1.",
      "Write the failing test first in `tests/test_regression.py` and call through `pagination.page(...)`; a from-import of `page` keeps pointing at one build when the audit swaps them.",
      "Once the audit confirms your suite fails on the old build, change `start` to `(page_num - 1) * page_size` and rerun.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "tests/test_regression.py",
      editableFilePaths: ["tests/test_regression.py", "search/pagination.py"],
      visibleTestPaths: [
        "tests/test_regression.py",
        "tests/test_audit.py",
        "tests/test_pagination.py",
      ],
      hiddenTestPaths: ["tests/test_pagination_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: APPLY_README },
        { path: "search/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "search/pagination.py",
          role: "editable",
          language: "python",
          content: SEARCH_PAGINATION_STARTER,
          description: "Repair page here, after your test is red",
        },
        {
          path: "search/service.py",
          role: "readonly",
          language: "python",
          content: SEARCH_SERVICE,
          description: "The endpoint above the seam (read-only)",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_regression.py",
          role: "test",
          language: "python",
          content: SEARCH_TEST_REGRESSION_STARTER,
          description: "Write your regression test here",
        },
        {
          path: "tests/test_audit.py",
          role: "test",
          language: "python",
          content: SEARCH_TEST_AUDIT,
          description: "Audit suite that grades your regression test (read-only)",
        },
        {
          path: "tests/test_pagination.py",
          role: "test",
          language: "python",
          content: SEARCH_TEST_PAGINATION,
          description: "Behavior checks on the repaired page() (read-only)",
        },
        {
          path: "tests/test_pagination_hidden.py",
          role: "test",
          language: "python",
          content: SEARCH_TEST_PAGINATION_HIDDEN,
          hidden: true,
          description: "Hidden checks on the repaired page()",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_regression", label: "visible regression" },
            { module: "test_audit", label: "visible audit" },
            { module: "test_pagination", label: "visible pagination" },
            { module: "test_pagination_hidden", label: "hidden pagination" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "tests/test_regression.py",
          role: "editable",
          language: "python",
          content: SEARCH_TEST_REGRESSION_REFERENCE,
        },
        {
          path: "search/pagination.py",
          role: "editable",
          language: "python",
          content: SEARCH_PAGINATION_REFERENCE,
        },
      ],
    },
  },
  practice: {
    id: "py-l5-pin-the-seam-practice",
    executionMode: "workspace",
    prompt: `The nightly export job sometimes drops the last few rows and nobody can say when it
started. Write the regression test in \`tests/test_regression.py\` that fails on the old build
of \`export/batching.py\`, then fix \`chunks\` so all suites pass. Call it as
\`batching.chunks(...)\` so the audit can swap builds. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "The word sometimes is the clue: work out which row counts the report is hinting at, then pick one of them for your test.",
      "Call through `batching.chunks(...)` in your test; the hidden audit swaps builds by patching the module attribute, and a from-import would never see it.",
      "Make the batch count `(len(rows) + size - 1) // size` so a partial last batch gets its own chunk.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "tests/test_regression.py",
      editableFilePaths: ["tests/test_regression.py", "export/batching.py"],
      visibleTestPaths: ["tests/test_regression.py"],
      hiddenTestPaths: ["tests/test_audit_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PRACTICE_README },
        { path: "export/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "export/batching.py",
          role: "editable",
          language: "python",
          content: EXPORT_BATCHING_STARTER,
          description: "Repair chunks here, after your test is red",
        },
        {
          path: "export/writer.py",
          role: "readonly",
          language: "python",
          content: EXPORT_WRITER,
          description: "The export layer above the seam (read-only)",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_regression.py",
          role: "test",
          language: "python",
          content: EXPORT_TEST_REGRESSION_STARTER,
          description: "Write your regression test here",
        },
        {
          path: "tests/test_audit_hidden.py",
          role: "test",
          language: "python",
          content: EXPORT_TEST_AUDIT_HIDDEN,
          hidden: true,
          description: "Hidden audit suite",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_regression", label: "visible regression" },
            { module: "test_audit_hidden", label: "hidden audit" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "tests/test_regression.py",
          role: "editable",
          language: "python",
          content: EXPORT_TEST_REGRESSION_REFERENCE,
        },
        {
          path: "export/batching.py",
          role: "editable",
          language: "python",
          content: EXPORT_BATCHING_REFERENCE,
        },
      ],
    },
  },
}
