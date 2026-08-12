import type { PythonLesson } from "../../types"
import { EMPTY_INIT } from "../workspace-runner"
import { buildPytestRunner } from "./pytest-runner"

// ───────────────────────────────────────────────────────────────────────────
// L3-M3: Testing with pytest
// ───────────────────────────────────────────────────────────────────────────

const PT_README = `# TDD a bank balance

The pytest tests already exist. Make them pass. Implement \`balance_after(start, transactions)\` in
\`bank/account.py\` so it applies a list of signed \`transactions\` (deposits are positive,
withdrawals negative) to a \`start\` balance and returns the new balance.

Example: \`balance_after(100, [10, -30, 5])\` is \`85\`. Some tests are hidden.
`

const PT_ACCOUNT_STARTER = String.raw`def balance_after(start, transactions):
    """Apply signed transactions to start and return the new balance (see README.md)."""
    # TODO: add every transaction to the starting balance.
    return start
`

const PT_ACCOUNT_REFERENCE = String.raw`def balance_after(start, transactions):
    return start + sum(transactions)
`

const PT_TEST = String.raw`from bank.account import balance_after


def test_applies_deposits():
    assert balance_after(0, [10, 20]) == 30


def test_applies_withdrawals():
    assert balance_after(100, [-30, -20]) == 50


def test_empty_transactions_unchanged():
    assert balance_after(50, []) == 50
`

const PT_TEST_HIDDEN = String.raw`from bank.account import balance_after


def test_mixed_transactions():
    assert balance_after(100, [10, -30, 5]) == 85


def test_overdraft_allowed():
    assert balance_after(0, [-5]) == -5
`

export const pytestBasicsLesson: PythonLesson = {
  id: "py-l3-pytest-basics",
  title: "pytest assertions & structure",
  summary: "Make a suite of pytest tests pass by implementing the module they cover.",
  estimatedMinutes: 16,
  difficulty: "medium",
  skills: ["pytest", "testing", "assertions", "tdd"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why tests are the code that guards your code

When you change \`balance_after\` six months from now, the only thing standing between a clean refactor and a corrupted account balance is a test that still remembers what "correct" meant. On a real team, a pull request without tests is a pull request nobody can safely merge, because reviewers cannot tell whether it works, only that it compiles. \`pytest\` is the tool most Python shops reach for because it turns "I think this works" into a repeatable, machine-checkable claim.

## The mental model: plain functions, plain asserts

\`pytest\` has almost no ceremony. You write a normal function whose name starts with \`test_\`, put a plain \`assert\` inside it, and run \`pytest\`. Discovery is convention-based: \`pytest\` walks the directory, imports files named \`test_*.py\` (or \`*_test.py\`), and runs every \`test_\`-prefixed function it finds. No base class, no registration, no \`main\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "plain-assert-is-enough",
  "prompt": "A test contains one line: assert balance_after(100, [10, -30, 5]) == 85. The function is buggy and returns 90. What does pytest print when the test fails?",
  "options": [
    {
      "label": "Just AssertionError, so you have to add a message to every assert to learn anything.",
      "feedback": "Tempting, because that is precisely what a bare assert does in ordinary Python, and it is the reason other frameworks ship assertEqual style helpers. pytest rewrites the asserts in your test files as it imports them, so it can show both sides."
    },
    {
      "label": "The failing line plus the value it actually got and the value you expected.",
      "correct": true,
      "feedback": "Right. That rewriting is why a plain assert is enough in pytest and why you almost never need a custom message. You get output along the lines of 'assert 90 == 85' for free."
    },
    {
      "label": "Nothing useful unless you rerun it with pytest -v.",
      "feedback": "Close, in that -v does change the output: it lists each test by name instead of printing dots. But the detail inside a failure is on by default. -v changes the summary, not the assertion report."
    }
  ]
}
\`\`\`

The magic is in the \`assert\`. \`pytest\` rewrites the \`assert\` statements in your test files as it imports them, so a failing \`assert\` reports the actual and expected values instead of a bare \`AssertionError\`. That is why \`assert balance_after(100, [10, -30, 5]) == 85\` is enough: on failure you see the number it actually got.

### Arrange, act, assert

A readable test has three beats: set up inputs, call the code, check the result.

\`\`\`python
# tests/test_account.py
from bank.account import balance_after

def test_mixed_transactions():
    start, txns = 100, [10, -30, 5]   # arrange
    result = balance_after(start, txns)  # act
    assert result == 85               # assert
\`\`\`

Test-driven development runs this loop backwards: write the failing test first (red), then write the smallest code that makes it pass (green). Here the tests already exist. Your job is to implement \`balance_after\` so \`start + sum(transactions)\` produces the expected total and the suite turns green. The Practice puts that same function in a \`bank/account.py\` package with a real test file, plus hidden cases you cannot peek at.

## Pitfall: a test that never runs still "passes"

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "discovery-is-convention",
  "prompt": "You add a function named check_deposits to tests/test_account.py. It contains an assert that would definitely fail. You run pytest. What do you see?",
  "options": [
    {
      "label": "A failure. pytest imports the file, so everything in it runs.",
      "feedback": "Tempting, because pytest really does import the whole file, so the function is certainly loaded into memory. Importing is not calling though: pytest only invokes functions whose names begin with test_."
    },
    {
      "label": "A green suite. pytest never calls it, so the assert never executes.",
      "correct": true,
      "feedback": "Right, and this is the dangerous outcome, because a green suite that tested nothing is worse than a red one. Watch the collected count in pytest -v output whenever a number looks suspiciously low."
    },
    {
      "label": "A collection error, since pytest cannot tell whether it was meant to be a test.",
      "feedback": "Tempting, because a strict tool would flag an ambiguous name, and you would want it to. pytest's discovery is pure convention with no warning attached: a name that does not match is simply not a test."
    }
  ]
}
\`\`\`

If you misspell the prefix and name a function \`check_deposits\` instead of \`test_deposits\`, \`pytest\` silently skips it. The suite goes green while testing nothing, which is worse than a red suite because it hands you false confidence. The same trap hits a file named \`account_tests.py\` (wrong pattern) or a helper that raises but is never called. The fix: keep the \`test_\` prefix, name files \`test_*.py\`, and run \`pytest -v\` to read the count of collected tests. If the number looks low, something is not being discovered.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "float-equality-in-tests",
  "prompt": "Money becomes float in your model, and a test now asserts: balance_after(0.0, [0.1, 0.2]) == 0.3. Does that test pass?",
  "options": [
    {
      "label": "Yes. 0.1 plus 0.2 is 0.3.",
      "feedback": "Tempting, because it is true in decimal arithmetic and it is obviously what the code means. Binary floats cannot store 0.1 or 0.2 exactly, so the sum lands on 0.30000000000000004 and the comparison comes out False."
    },
    {
      "label": "No. The sum is 0.30000000000000004, so == is False.",
      "correct": true,
      "feedback": "Right. Write assert result == pytest.approx(0.3) instead, which compares within a small relative tolerance. Exact float equality is one of the main ways a test suite turns flaky."
    },
    {
      "label": "It depends on the machine and the Python build.",
      "feedback": "Reasonable-sounding, and there really are platform differences in some corners of floating point. This is not one of them: IEEE 754 pins the result down, so every mainstream Python gives the same 0.30000000000000004."
    }
  ],
  "reveal": "Real money systems usually store cents as an int, or use Decimal, precisely so this never comes up. When you genuinely do hold floats, compare with a tolerance and never with ==."
}
\`\`\`

**Interview nuance:** never compare floats with \`==\` in a test. \`balance_after(0.0, [0.1, 0.2]) == 0.3\` is \`False\`, because IEEE 754 stores \`0.1 + 0.2\` as \`0.30000000000000004\`. An interviewer asking "how would you test a function that returns a float" wants to hear about tolerance, not exact equality. In \`pytest\` you write \`assert result == pytest.approx(0.3)\`, which passes if the values are within a small relative tolerance. Integer transactions dodge this, but the moment money becomes \`float\`, exact-equality tests get flaky and the real bug hides behind the noise.`,
    demoCode: `def balance_after(start, transactions):
    return start + sum(transactions)


# what a pytest test would assert:
assert balance_after(100, [10, -30, 5]) == 85
print("all good")`,
  },
  apply: {
    id: "py-l3-pytest-basics-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`balance_after(start, transactions)\`. Add every signed amount in
\`transactions\` to \`start\` and return the result.

\`balance_after(100, [10, -30, 5])\` is \`85\`.`,
    starterCode: `def balance_after(start, transactions):
    # Return start plus the sum of all transactions.
    pass`,
    hints: [
      "`sum(transactions)` adds the deposits and withdrawals (signs included).",
      "Add it to the starting balance: `start + sum(transactions)`.",
    ],
    referenceSolution: `def balance_after(start, transactions):
    return start + sum(transactions)`,
    testCases: [
      { input: { start: 100, transactions: [10, -30, 5] }, expected: 85, description: "mixed" },
      { input: { start: 0, transactions: [10, 20] }, expected: 30, description: "deposits" },
      { input: { start: 50, transactions: [] }, expected: 50, description: "no transactions" },
      { input: { start: 0, transactions: [-5] }, expected: -5, description: "overdraft" },
    ],
  },
  practice: {
    id: "py-l3-pytest-basics-practice",
    executionMode: "workspace",
    prompt: `Make the pytest suite pass: implement \`balance_after(start, transactions)\` in
\`bank/account.py\` so it applies the signed \`transactions\` to \`start\`. Open the visible test file
to read the cases; some tests are hidden.`,
    starterCode: "",
    hints: [
      "Read `tests/test_account.py` to see exactly what's expected.",
      "`sum(transactions)` handles deposits and withdrawals together.",
      "`return start + sum(transactions)`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "bank/account.py",
      editableFilePaths: ["bank/account.py"],
      visibleTestPaths: ["tests/test_account.py"],
      hiddenTestPaths: ["tests/test_account_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PT_README },
        { path: "bank/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "bank/account.py",
          role: "editable",
          language: "python",
          content: PT_ACCOUNT_STARTER,
          description: "Implement balance_after here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_account.py",
          role: "test",
          language: "python",
          content: PT_TEST,
          description: "Visible pytest suite",
        },
        {
          path: "tests/test_account_hidden.py",
          role: "test",
          language: "python",
          content: PT_TEST_HIDDEN,
          hidden: true,
          description: "Hidden pytest suite",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildPytestRunner(
            "test_account",
            "test_account_hidden",
            "visible account",
            "hidden account"
          ),
          hidden: true,
          description: "pytest-style test runner",
        },
      ],
      referenceFiles: [
        {
          path: "bank/account.py",
          role: "editable",
          language: "python",
          content: PT_ACCOUNT_REFERENCE,
        },
      ],
    },
  },
}
