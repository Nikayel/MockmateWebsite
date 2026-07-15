import type { BugFixScenario } from "../../types"

const starter = `def merge_threads(existing_threads, incoming_threads):
    merged = list(existing_threads)
    index_by_id = {thread["id"]: idx for idx, thread in enumerate(merged)}

    for incoming in incoming_threads:
        existing_index = index_by_id.get(incoming["id"], -1)
        if existing_index > 0:
            merged[existing_index] = {**merged[existing_index], **incoming}
        else:
            index_by_id[incoming["id"]] = len(merged)
            merged.append(incoming)

    return merged
`

const reference = `def merge_threads(existing_threads, incoming_threads):
    merged = list(existing_threads)
    index_by_id = {thread["id"]: idx for idx, thread in enumerate(merged)}

    for incoming in incoming_threads:
        existing_index = index_by_id.get(incoming["id"])
        if existing_index is not None:
            merged[existing_index] = {**merged[existing_index], **incoming}
        else:
            index_by_id[incoming["id"]] = len(merged)
            merged.append(incoming)

    return merged
`

const projection = `def summarize_threads(threads):
    return [f"{thread['id']}:{thread.get('status', 'open')}" for thread in threads]


def count_unresolved(threads):
    return sum(1 for thread in threads if thread.get("status", "open") != "resolved")
`

const visibleTests = `from src.comment_threads import merge_threads
from src.thread_projection import summarize_threads, count_unresolved

def run_tests(record):
    def resolving_root_thread_does_not_duplicate_it():
        existing = [{"id": "t1", "status": "open"}, {"id": "t2", "status": "open"}]
        incoming = [{"id": "t1", "status": "resolved"}]
        merged = merge_threads(existing, incoming)
        assert summarize_threads(merged) == ["t1:resolved", "t2:open"]
        # sidebar badge: only t2 is still open
        assert count_unresolved(merged) == 1

    def new_thread_appends_after_existing():
        merged = merge_threads([{"id": "t1", "status": "open"}], [{"id": "t2", "status": "open"}])
        assert [thread["id"] for thread in merged] == ["t1", "t2"]
        assert count_unresolved(merged) == 2

    record("resolving the root thread does not duplicate it", resolving_root_thread_does_not_duplicate_it)
    record("a brand-new thread appends after the existing ones", new_thread_appends_after_existing)
`

const hiddenTests = `from src.comment_threads import merge_threads
from src.thread_projection import summarize_threads, count_unresolved

def run_tests(record):
    def later_thread_updates_in_place():
        existing = [{"id": "t1", "body": "a"}, {"id": "t2", "body": "b"}]
        merged = merge_threads(existing, [{"id": "t2", "body": "updated"}])
        assert len(merged) == 2
        assert merged[1]["body"] == "updated"

    def create_then_resolve_in_one_batch_keeps_one_thread():
        # the server pushes a brand-new thread and resolves it in the same sync
        merged = merge_threads([], [{"id": "t9", "status": "open"}, {"id": "t9", "status": "resolved"}])
        assert summarize_threads(merged) == ["t9:resolved"]
        assert count_unresolved(merged) == 0

    def repeated_incoming_id_applies_last_write():
        existing = [{"id": "t1"}, {"id": "t2", "body": "x"}, {"id": "t3"}]
        merged = merge_threads(existing, [{"id": "t2", "body": "y"}, {"id": "t2", "body": "z"}])
        assert len(merged) == 3
        assert merged[1]["body"] == "z"

    def update_for_unknown_id_is_appended():
        existing = [{"id": "t1", "status": "open"}]
        merged = merge_threads(existing, [{"id": "t404", "status": "open"}])
        assert [thread["id"] for thread in merged] == ["t1", "t404"]

    def resolved_thread_is_kept_through_merge():
        existing = [{"id": "t1", "status": "resolved"}, {"id": "t2", "status": "open"}]
        merged = merge_threads(existing, [{"id": "t2", "status": "resolved"}])
        assert summarize_threads(merged) == ["t1:resolved", "t2:resolved"]
        assert count_unresolved(merged) == 0

    record("a later thread updates in place", later_thread_updates_in_place)
    record("create then resolve in one batch keeps one thread", create_then_resolve_in_one_batch_keeps_one_thread)
    record("a repeated incoming id applies the last write", repeated_incoming_id_applies_last_write)
    record("an update for an unknown id is appended", update_for_unknown_id_is_appended)
    record("a resolved thread is kept through a merge", resolved_thread_is_kept_through_merge)
`

const runner = `import json
import os
import sys
import traceback
sys.path.insert(0, os.getcwd())
from tests import test_comment_threads, test_comment_threads_hidden

results = []

def record_factory(suite):
    def record(name, fn):
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None, "isHidden": "hidden" in suite.lower()})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc(), "isHidden": "hidden" in suite.lower()})
    return record

test_comment_threads.run_tests(record_factory("visible comment threads"))
test_comment_threads_hidden.run_tests(record_factory("hidden comment threads"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`

export const bugfixCommentThreadMergeScenario: BugFixScenario = {
  id: "bugfix-comment-thread-merge",
  title: "Editor Comments: Sidebar Over-Counts Unresolved Threads",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Google", "Notion", "Dropbox", "Microsoft"],
  description:
    "A collaborative editor's comment sidebar sometimes reports one more unresolved thread than the document actually has, and a reviewer held a doc open believing a comment was still unresolved.",
  userReport:
    "Reviewer here. Our comment sidebar shows an unresolved badge so we know when a doc still has open comments. On some docs the badge sits one higher than the open comments actually visible, and the very first comment shows up twice in the margin. It seems to follow a server sync that touches the top comment; edits to later comments look fine. I kept a doc open thinking a comment was still unresolved when it was not.",
  tags: ["python", "backend", "sync", "collaboration", "real-codebase"],
  estimatedTime: 40,
  problemStatement: `A collaborative editor syncs comment threads from the server into local state. A sidebar badge shows how many threads are still unresolved so reviewers know when a document needs attention.

**Incident Report**
On some documents the unresolved badge sits one higher than the open comments a reviewer can see, and the first comment renders twice in the margin. It follows a sync that updates the top comment; updates to later comments merge cleanly. A reviewer held a document open believing an unresolved comment remained when it did not.

Read the codebase files, run the tests, and make the smallest fix in the merge function without changing its public signature.`,
  buggyCode: { python: starter },
  codebaseFiles: {
    python: [
      {
        fileName: "src/thread_projection.py",
        content: projection,
        description: "Read-only UI projection: sidebar summary and unresolved badge count",
      },
      {
        fileName: "tests/test_comment_threads.py",
        content: visibleTests,
        description: "Visible sync regression tests",
      },
    ],
  },
  expectedBehavior:
    "An incoming thread that matches an existing id updates that thread in place and keeps its position. No thread is ever duplicated or dropped, regardless of where it sits in the list, so the unresolved badge always reflects the real open-comment count.",
  bugDescription:
    "The merge treats a found position of zero as 'not found', so a thread stored at the front of the list is appended a second time instead of updated in place. Every other position updates correctly, and the duplicate leaves the unresolved badge one too high whenever the front thread was still open.",
  groundTruth:
    "Root cause: the presence check rejects a stored position of zero, so the thread at the front of the list is treated as new and duplicated; every other position updates correctly, which is why review and most syncs looked fine. Fix: test presence explicitly instead of by the position's sign, so a stored position of zero counts as found. Survival story: `existing_index > 0` reads as a plausible bounds check and holds for every thread except the one at the front, so it passed review and only the top thread duplicates. Red herrings, all reachable and provably innocent: (1) the merge never removes threads, so an existing resolved thread is preserved by design, not dropped; (2) a batch that repeats an id applies each update in order (last write wins) without creating duplicates; (3) an update for an id not yet local is appended as a new thread, the intended source-of-truth behavior. count_unresolved only excludes resolved threads and is not part of the duplication.",
  hints: [
    "The badge sits one higher than the true open-comment count, and only on some docs. Reproduce that case and compare the merged threads against what the sidebar should show.",
    "Every thread merges cleanly except one. Look at what is different about the thread that gets duplicated versus the ones that update in place.",
  ],
  testCases: [
    {
      input: { incoming: "t1", position: "front" },
      expected: "updated in place, badge stays correct",
      description: "Workspace tests cover a synced update to the thread at the front of the list",
    },
  ],
  expectedTouchedFiles: ["src/comment_threads.py"],
  observedSymptoms: [
    "After a sync that touches the top comment, the sidebar badge counts one more unresolved thread than the document has, and the first comment appears twice.",
    "Updates to later comments merge in place with no duplication.",
  ],
  reproductionSteps: [
    "Read README.md for the sync contract and how the unresolved badge is computed.",
    "Inspect tests/test_comment_threads.py to see which sync case fails.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "A synced update to a thread already present updates it in place, wherever it sits in the list.",
    "No thread is duplicated or dropped, so the unresolved badge matches the real open-comment count.",
    "Repeated incoming ids, unknown ids, and existing resolved threads behave exactly as before.",
    "Only src/comment_threads.py changes.",
  ],
  debuggingSkills: [
    "reproduction",
    "reading the data contract",
    "hypothesis",
    "minimal patch",
    "verification",
  ],
  rootCauseRubric: [
    "Identifies that the presence check rejects a valid stored position at the front of the list.",
    "Connects the duplicated thread to the badge over-count a reviewer believed, not just to a failing test.",
    "Rules out thread removal, repeated ids, and unknown ids as innocent with evidence.",
    "Names a regression guard such as a front-of-list update test.",
  ],
  workspace: {
    language: "python",
    primaryFilePath: "src/comment_threads.py",
    editableFilePaths: ["src/comment_threads.py"],
    visibleTestPaths: ["tests/test_comment_threads.py"],
    hiddenTestPaths: ["tests/test_comment_threads_hidden.py"],
    testRunnerPath: "tests/run_workspace_tests.py",
    files: [
      { path: "src/__init__.py", role: "readonly", language: "python", content: "" },
      { path: "tests/__init__.py", role: "test", language: "python", content: "", hidden: true },
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content: `# Comment Thread Sync

The editor syncs comment threads from the server into local state. A sidebar badge shows the number of unresolved threads (threads whose status is not "resolved") so reviewers know when a document still needs attention.

## Merge contract

- Match incoming threads to local threads by id and update them in place, preserving their existing order.
- A thread is never duplicated and never dropped by a merge.
- A sync batch may repeat an id; apply each update in order (last write wins).
- A sync batch may reference an id that is not local yet; treat it as a new thread and append it.
- Existing resolved threads stay in the list; the badge simply excludes them from its count.`,
        description: "Product and sync-contract notes",
      },
      {
        path: "src/thread_projection.py",
        role: "readonly",
        language: "python",
        content: projection,
        description: "Read-only UI projection helper (summary + unresolved badge count)",
      },
      {
        path: "src/comment_threads.py",
        role: "editable",
        language: "python",
        content: starter,
        description: "Thread merge function used by the sync worker",
      },
      {
        path: "tests/test_comment_threads.py",
        role: "test",
        language: "python",
        content: visibleTests,
        description: "Visible comment-thread tests",
      },
      {
        path: "tests/test_comment_threads_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: hiddenTests,
        description: "Hidden regression + terrain tests",
      },
      {
        path: "tests/run_workspace_tests.py",
        role: "test",
        language: "python",
        hidden: true,
        content: runner,
        description: "Hidden workspace runner",
      },
    ],
    referenceFiles: [
      {
        path: "src/comment_threads.py",
        role: "editable",
        language: "python",
        content: reference,
      },
    ],
  },
}
