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

export const bugfixCommentThreadMergeScenario: BugFixScenario = {
  id: "bugfix-comment-thread-merge",
  title: "Document Comment Thread Duplication",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Google", "Notion", "Dropbox", "Microsoft"],
  description: "Fix a document-comment sync bug that duplicates the first thread",
  tags: ["python", "backend", "sync", "off-by-one", "real-codebase"],
  estimatedTime: 40,
  problemStatement: `A collaborative editor syncs comment threads from the server into local state. Users report that the first root thread sometimes appears twice after refresh, while later threads merge correctly.

Find and fix the merge bug without changing the public function signature.`,
  buggyCode: { python: starter },
  codebaseFiles: {
    python: [
      {
        fileName: "src/thread_projection.py",
        content: "Builds UI summaries from merged threads.",
        description: "Read-only projection helper",
      },
      {
        fileName: "tests/test_comment_threads.py",
        content: "Visible sync regression tests.",
        description: "Visible tests",
      },
    ],
  },
  expectedBehavior:
    "Incoming threads with existing IDs should update the existing thread, including when the thread is at index 0.",
  bugDescription:
    "The merge treats index 0 as not found, so the first existing thread is appended again instead of updated.",
  hints: [
    "Look closely at the meaning of a found index.",
    "Index 0 is a valid location.",
    "Avoid using truthiness for lookup results that may be 0.",
  ],
  testCases: [
    {
      input: { incoming: "thread-1" },
      expected: "merged without duplication",
      description: "Workspace tests cover index zero thread updates",
    },
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
        content:
          "Thread sync receives partial updates from the server. Existing threads must be updated in place by ID to preserve UI ordering.",
      },
      {
        path: "src/thread_projection.py",
        role: "readonly",
        language: "python",
        content: `def summarize_threads(threads):
    return [f"{thread['id']}:{thread.get('status', 'open')}" for thread in threads]
`,
        description: "Read-only UI projection helper",
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
        content: `from src.comment_threads import merge_threads
from src.thread_projection import summarize_threads

def run_tests(record):
    def first_thread_updates_without_duplicate():
        existing = [{"id": "t1", "status": "open"}, {"id": "t2", "status": "open"}]
        incoming = [{"id": "t1", "status": "resolved"}]
        merged = merge_threads(existing, incoming)
        assert len(merged) == 2
        assert summarize_threads(merged) == ["t1:resolved", "t2:open"]

    def new_thread_appends():
        merged = merge_threads([{"id": "t1", "status": "open"}], [{"id": "t2", "status": "open"}])
        assert [thread["id"] for thread in merged] == ["t1", "t2"]

    record("first thread updates without duplicate", first_thread_updates_without_duplicate)
    record("new thread appends", new_thread_appends)
`,
        description: "Visible comment-thread tests",
      },
      {
        path: "tests/test_comment_threads_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: `from src.comment_threads import merge_threads

def run_tests(record):
    def later_thread_still_updates():
        existing = [{"id": "t1", "body": "a"}, {"id": "t2", "body": "b"}]
        merged = merge_threads(existing, [{"id": "t2", "body": "updated"}])
        assert len(merged) == 2
        assert merged[1]["body"] == "updated"

    record("later thread still updates", later_thread_still_updates)
`,
        description: "Hidden regression for non-zero indexes",
      },
      {
        path: "tests/run_workspace_tests.py",
        role: "test",
        language: "python",
        hidden: true,
        content: `import json
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
`,
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
