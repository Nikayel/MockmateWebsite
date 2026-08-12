// ───────────────────────────────────────────────────────────────────────────
// L4-M5: Quality, Packaging & Capstone
// ───────────────────────────────────────────────────────────────────────────

import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const MOCK_README = `# Test with a mock, design for testability

Write code that's easy to test by **injecting** its dependency. Implement \`send_all(sender,
messages)\` in \`notify/service.py\` so it calls \`sender(message)\` for every message and returns how
many were sent.

The tests pass a \`unittest.mock.Mock\` as \`sender\` and assert how it was called. \`send_all(sender,
["a", "b"])\` returns \`2\` and calls \`sender\` twice. Some tests are hidden.
`

const MOCK_SERVICE_STARTER = String.raw`def send_all(sender, messages):
    """Call sender(message) for each message; return how many were sent (see README.md)."""
    # TODO: loop messages, call sender(message), count them.
    return 0
`

const MOCK_SERVICE_REFERENCE = String.raw`def send_all(sender, messages):
    count = 0
    for message in messages:
        sender(message)
        count += 1
    return count
`

const MOCK_TEST = String.raw`from unittest.mock import Mock

from notify.service import send_all


def run_tests(record):
    def sends_each_message():
        sender = Mock()
        result = send_all(sender, ["a", "b"])
        assert result == 2, f"expected 2, got {result!r}"
        assert sender.call_count == 2, f"expected 2 calls, got {sender.call_count}"

    def no_messages_sends_nothing():
        sender = Mock()
        assert send_all(sender, []) == 0
        assert sender.call_count == 0

    record("sends each message", sends_each_message)
    record("no messages sends nothing", no_messages_sends_nothing)
`

const MOCK_TEST_HIDDEN = String.raw`from unittest.mock import Mock

from notify.service import send_all


def run_tests(record):
    def calls_with_the_right_args():
        sender = Mock()
        send_all(sender, ["hello", "world"])
        sender.assert_any_call("hello")
        sender.assert_any_call("world")

    def returns_the_count():
        assert send_all(Mock(), ["x", "y", "z"]) == 3

    record("calls sender with each message", calls_with_the_right_args)
    record("returns the number sent", returns_the_count)
`

export const testingToolingLesson: PythonLesson = {
  id: "py-l4-testing-tooling",
  title: "Mocking, coverage & modern tooling",
  summary: "Design code for testability, mock its dependencies, and know the modern tool stack.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["mocking", "testing", "ruff", "mypy"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Why fake a dependency

A test that reaches out to the network, a database, or \`datetime.now()\` is slow, flaky, and non-deterministic. It goes red when the wifi drops, not when your code is wrong. The fix is a design choice, not a testing trick: pass collaborators in as arguments so a test can hand your function a stand-in it fully controls. That is dependency injection, and it is the single habit that makes code testable.

Compare a \`send_all\` that hard-codes its sender:

\`\`\`python
import smtplib

def send_all(messages):
    server = smtplib.SMTP("smtp.example.com")   # untestable: opens a real socket
    ...
\`\`\`

with the injectable version you build here, where \`sender\` arrives as a parameter. Now a test can supply any callable, including a mock.

## Mock: a recorder you assert against

\`unittest.mock.Mock\` is a stand-in that answers every attribute access and every call, and records what happened. You do not tell it what to return; you inspect it afterward. The demo below runs \`send_all(sender, ["a", "b"])\`, which calls \`sender("a")\` then \`sender("b")\` and returns \`2\`. That return is an ordinary \`int\` (\`len(messages)\`), because the mock is never asked for its own result.

After the run, the mock carries the whole call history:

\`\`\`python
sender.call_count            # 2
sender.assert_any_call("a")  # passes: "a" appears in the history
sender.call_args_list        # [call('a'), call('b')]
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "unconfigured-mock-return-value",
  "prompt": "The code under test does: result = client.fetch(user_id), then if result: save(result). Your test passes in a plain Mock() and never sets return_value. Does the save branch run?",
  "options": [
    {
      "label": "No. An unconfigured mock returns None, which is falsy",
      "feedback": "The most common wrong model of Mock, and it makes tests look far more meaningful than they are. Mock is built to answer everything, so returning None would defeat its whole design."
    },
    {
      "label": "Yes. The call returns another Mock, and a Mock is truthy",
      "correct": true,
      "feedback": "Right, and that is why a test like this passes whatever your code does. If the branch matters, configure the return explicitly with client.fetch.return_value."
    },
    {
      "label": "It raises AttributeError, because fetch was never configured on the mock",
      "feedback": "That is what you get from Mock(spec=Client) or create_autospec, which is exactly why those exist. A plain Mock invents any attribute you ask for, silently."
    },
    {
      "label": "No. The mock records the call instead of returning a value from it",
      "feedback": "It does record the call, and that recording is the point of a mock. Recording and returning are not alternatives though: every call is logged and also hands back a value."
    }
  ]
}
\`\`\`

This is why the Apply and Practice steps keep \`sender\` as a parameter: the driver passes in a recorder (Apply) or a real \`Mock\` (Practice), then asserts how you called it.

The recorder answers a handful of different questions, and mixing them up is why mock assertions pass when they should not:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["You inspect", "It tells you", "Careful"],
  "rows": [
    ["m.call_count", "how many times it was called", "counts calls, not distinct arguments"],
    ["m.called", "whether it was called at all", "True even for a single call with wrong arguments"],
    ["m.assert_any_call(x)", "x appears somewhere in the history", "says nothing about order or count"],
    ["m.assert_called_once_with(x)", "exactly one call, and it was x", "the strictest of these, and usually the one you want"],
    ["m.call_args_list", "the full ordered history", "compare against [call(a), call(b)] to pin order"],
    ["m.return_value", "what the mock hands back", "defaults to another Mock, never to None"]
  ],
  "highlightCols": ["Careful"],
  "caption": "The last row causes the quietest bugs: an unconfigured mock returns another Mock, which is truthy, so a test asserting 'if result:' passes no matter what your code did. Any assert_called* method you misspell is also silently a no-op, because Mock happily invents attributes."
}
\`\`\`

## Pitfalls

A plain \`Mock\` answers to anything. Call a method that does not exist and it silently hands back another \`Mock\` instead of failing:

\`\`\`python
m = Mock()
m.snd("hi")   # typo of .send: no error, and the test still "passes"
\`\`\`

So a test can be green while production crashes. Two fixes: \`Mock(spec=Emailer)\` rejects attributes the real class does not have (\`m.snd\` now raises \`AttributeError\`), and \`create_autospec(Emailer)\` additionally checks call signatures, so calling \`send()\` with the wrong arguments raises \`TypeError\` inside the test.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "assert-called-with-checks-last-call",
  "prompt": "send_all(sender, ['a', 'b']) has just run, so the mock recorded two calls. Your test then asserts sender.assert_called_with('a'). What happens?",
  "options": [
    {
      "label": "It passes. 'a' was one of the calls, and that is what the method checks",
      "feedback": "The name really does read that way, which is why this one is missed in review. It checks the most recent call only, so with two calls it is asking about the second."
    },
    {
      "label": "It fails, because it only checks the most recent call, which was sender('b')",
      "correct": true,
      "feedback": "Right. Use assert_any_call when you mean somewhere in the history, or compare call_args_list against a list when you also care about the order."
    },
    {
      "label": "It passes, but only because call_count happens to be greater than one",
      "feedback": "Getting the direction backwards is understandable given how many of these methods there are. More calls make this assertion harder to satisfy, not easier, since only the last one is examined."
    },
    {
      "label": "It quietly does nothing, since assert methods on a Mock are no-ops",
      "feedback": "A sharp thing to be suspicious about: a MISSPELLED assert method really is a silent no-op, because Mock invents the attribute and returns another Mock. This name is spelled correctly, so it genuinely runs."
    }
  ]
}
\`\`\`

Also watch \`assert_called_with\`: it checks only the most recent call. After the demo, \`sender.assert_called_with("a")\` fails because the last call was \`sender("b")\`. Use \`assert_any_call\` when you mean "somewhere in the history."

When a collaborator cannot be injected, the fallback is \`unittest.mock.patch\`, and it has one rule that trips up nearly everybody:

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "patch-where-it-is-looked-up",
  "prompt": "myapp/service.py starts with: from myapp.clients import fetch_user, and get_profile() calls fetch_user(uid). Your test patches myapp.clients.fetch_user. What happens?",
  "options": [
    {
      "label": "The real function is replaced, since that is the module where it is defined",
      "feedback": "The intuition nearly everyone starts with, and the patch does succeed: it really does swap the attribute on myapp.clients. The problem is that service.py is no longer reading from there."
    },
    {
      "label": "Nothing is intercepted. The from-import already bound a reference in service, so you must patch myapp.service.fetch_user",
      "correct": true,
      "feedback": "Right. from X import Y copies the object into the importing module's namespace at import time, so patch where the name is looked up, not where it was defined."
    },
    {
      "label": "AttributeError, because fetch_user is not an attribute of myapp.clients",
      "feedback": "It is an attribute there, which is precisely what makes this quiet. patch only raises when the target name genuinely does not exist, and here it does."
    },
    {
      "label": "It works, but the patch leaks into later tests unless you use a context manager or decorator",
      "feedback": "Leaking is a real concern with patch.start() and no matching stop(). Both the decorator and the with-block undo themselves, so cleanup is not the issue here. The target path is."
    }
  ]
}
\`\`\`

## The modern tool stack

- \`ruff\`: one very fast tool that lints and formats, replacing \`flake8\`, \`isort\`, and \`black\`.
- \`mypy\` (or \`ty\`): reads your type hints and flags mismatches before runtime.
- \`pytest --cov\` (coverage.py): reports which lines your tests exercised. Cover the branches that matter, not a 100% badge.
- \`pre-commit\`: runs all of these on \`git commit\`, so nothing broken lands.

**Interview nuance:** know what a coverage number does not tell you. \`pytest --cov\` reports line coverage by default, so a line counts as covered the moment it runs once. An \`if\` with no \`else\` can show 100% while the case where the condition is false never executes. Add \`--cov-branch\` to require both directions of each branch, and remember that even full branch coverage only proves the lines ran, not that your assertions checked the right thing.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "what-100-percent-coverage-proves",
  "prompt": "Your PR reports 100 percent line coverage on the module you changed. What has that actually established?",
  "options": [
    {
      "label": "Every line ran at least once while the suite was executing",
      "correct": true,
      "feedback": "Right, and that is the entire claim. Coverage is a floor: it tells you what was definitely not exercised, and never that what ran was correct."
    },
    {
      "label": "Every branch was taken in both directions",
      "feedback": "That is a different measurement, and you have to ask for it with --cov-branch. An if with no else reaches 100 percent line coverage while the false path never runs once."
    },
    {
      "label": "The module has no untested behavior left in it",
      "feedback": "The reading that makes coverage targets so seductive to managers. Behavior is not lines: an unhandled empty list, a boundary value, an exception path with no raise in the suite are all uncovered behavior on fully covered lines."
    },
    {
      "label": "The assertions in those tests checked the right values",
      "feedback": "Nothing in the world can establish that from a coverage number. Delete every assert in the suite and coverage stays at 100 percent, which is the fastest way to see what the metric does not measure."
    }
  ],
  "reveal": "Each tool in the stack answers one narrow question. Coverage says which lines ran, mypy says which types cannot line up, and only your assertions say whether the answers were right. They catch different bugs, and none of the three substitutes for another."
}
\`\`\``,
    demoCode: `from unittest.mock import Mock


def send_all(sender, messages):
    for m in messages:
        sender(m)
    return len(messages)


sender = Mock()
print(send_all(sender, ["a", "b"]))   # 2
print(sender.call_count)              # 2`,
  },
  apply: {
    id: "py-l4-testing-tooling-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`send_all(sender, messages)\` to call the injected \`sender\` once per
message and return how many were sent. The provided \`run\` driver passes a recorder in as the
\`sender\`, so this rehearses the dependency injection the workspace step then verifies with a mock.

\`run(["a", "b", "c"])\` is \`3\`.`,
    starterCode: `def send_all(sender, messages):
    # Call sender(message) for each message; return how many were sent.
    pass


def run(messages):
    received = []
    return send_all(received.append, messages)`,
    hints: [
      "Loop the messages and call `sender(message)` for each.",
      "Keep a running count and return it.",
      "`sender` is whatever the caller injects; here `run` passes a list's `.append`.",
    ],
    referenceSolution: `def send_all(sender, messages):
    count = 0
    for message in messages:
        sender(message)
        count += 1
    return count


def run(messages):
    received = []
    return send_all(received.append, messages)`,
    testCases: [
      { input: { messages: ["a", "b", "c"] }, expected: 3, description: "three messages" },
      { input: { messages: [] }, expected: 0, description: "none" },
      { input: { messages: ["only"] }, expected: 1, description: "one message" },
    ],
  },
  practice: {
    id: "py-l4-testing-tooling-practice",
    executionMode: "workspace",
    prompt: `Implement \`send_all(sender, messages)\` in \`notify/service.py\`: call the injected \`sender\` once
per message and return the number sent. The tests pass a \`Mock\` and assert how it was called, so
keep \`sender\` as an injected parameter. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Loop the messages and call `sender(message)` for each.",
      "Keep a running count and return it.",
      "Because `sender` is a parameter, a test can pass a `Mock()` and inspect `call_count`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "notify/service.py",
      editableFilePaths: ["notify/service.py"],
      visibleTestPaths: ["tests/test_service.py"],
      hiddenTestPaths: ["tests/test_service_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: MOCK_README },
        { path: "notify/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "notify/service.py",
          role: "editable",
          language: "python",
          content: MOCK_SERVICE_STARTER,
          description: "Implement send_all here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_service.py",
          role: "test",
          language: "python",
          content: MOCK_TEST,
          description: "Visible mock-based tests",
        },
        {
          path: "tests/test_service_hidden.py",
          role: "test",
          language: "python",
          content: MOCK_TEST_HIDDEN,
          hidden: true,
          description: "Hidden mock-call tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_service", label: "visible service" },
            { module: "test_service_hidden", label: "hidden service" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "notify/service.py",
          role: "editable",
          language: "python",
          content: MOCK_SERVICE_REFERENCE,
        },
      ],
    },
  },
}
