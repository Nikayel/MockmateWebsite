import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const CAPSTONE_README = `# Capstone: a typed, tested order service

Bring it all together: packages, type hints, dataclasses, validation, and tests. The \`orders\`
package has a \`pyproject.toml\`, a typed \`Order\` model with \`parse_order\` (read-only), and sample
data. Implement \`summarize(raw_orders)\` in \`orders/report.py\` so it:

1. parses each raw order with the read-only \`parse_order\`
2. returns \`{"count": <all>, "paid": <paid only>, "revenue": <sum of paid amounts, rounded to 2>}\`

Only **paid** orders count toward revenue. Some tests are hidden.
`

const CAPSTONE_PYPROJECT = String.raw`[project]
name = "orders"
version = "1.0.0"
description = "A typed, tested order-summary service"
requires-python = ">=3.11"
dependencies = []

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]

[tool.ruff]
line-length = 100

[tool.pytest.ini_options]
testpaths = ["tests"]
`

const CAPSTONE_MODELS = String.raw`from dataclasses import dataclass


@dataclass
class Order:
    id: int
    amount: float
    paid: bool


def parse_order(raw):
    """Validate a raw order dict into a typed Order (coercing field types)."""
    return Order(id=int(raw["id"]), amount=float(raw["amount"]), paid=bool(raw["paid"]))
`

const CAPSTONE_REPORT_STARTER = String.raw`from orders.models import parse_order


def summarize(raw_orders):
    """Parse the raw orders and report count / paid / revenue (see README.md)."""
    # TODO: parse each raw order, then total count, paid count, and paid revenue (round 2).
    return {}
`

const CAPSTONE_REPORT_REFERENCE = String.raw`from orders.models import parse_order


def summarize(raw_orders):
    orders = [parse_order(raw) for raw in raw_orders]
    paid = [order for order in orders if order.paid]
    return {
        "count": len(orders),
        "paid": len(paid),
        "revenue": round(sum(order.amount for order in paid), 2),
    }
`

const CAPSTONE_TEST = String.raw`from orders.report import summarize


def run_tests(record):
    def summarizes_mixed_orders():
        raw = [
            {"id": 1, "amount": "10.0", "paid": True},
            {"id": 2, "amount": "5.0", "paid": False},
        ]
        assert summarize(raw) == {"count": 2, "paid": 1, "revenue": 10.0}, f"got {summarize(raw)!r}"

    def empty_is_zeroed():
        assert summarize([]) == {"count": 0, "paid": 0, "revenue": 0}

    record("summarizes mixed orders", summarizes_mixed_orders)
    record("empty input is zeroed", empty_is_zeroed)
`

const CAPSTONE_TEST_HIDDEN = String.raw`from orders.report import summarize


def run_tests(record):
    def all_paid():
        raw = [
            {"id": 1, "amount": "3.0", "paid": True},
            {"id": 2, "amount": "7.0", "paid": True},
        ]
        assert summarize(raw) == {"count": 2, "paid": 2, "revenue": 10.0}

    def none_paid():
        raw = [{"id": 1, "amount": "9.0", "paid": False}]
        assert summarize(raw) == {"count": 1, "paid": 0, "revenue": 0}

    record("all orders paid", all_paid)
    record("no orders paid", none_paid)
`

export const packagingCapstoneLesson: PythonLesson = {
  id: "py-l4-packaging-capstone",
  title: "Packaging & a production capstone",
  summary: "Build a typed, tested, packaged order service that integrates the whole track.",
  estimatedMinutes: 25,
  difficulty: "hard",
  skills: ["packaging", "capstone", "type-hints", "testing"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Packaging: the last mile

Your code only creates value once someone else can run it. Packaging is how you hand a colleague \`pip install orders\` instead of a folder and a prayer. A published package pins your version, declares its dependencies, and installs the same way on every machine, which is exactly what CI, Docker images, and teammates depend on.

### What a wheel actually is

A **wheel** (\`.whl\`) is a zip of your importable code plus metadata, named to a fixed convention. \`pyproject.toml\` is the single source of truth: the \`[project]\` table declares \`name\`, \`version\`, \`requires-python\`, and \`dependencies\`, plus a \`dev\` extra for \`pytest\`, \`ruff\`, and \`mypy\`. A \`[build-system]\` table names the build backend that turns the project into artifacts.

\`\`\`bash
uv build        # writes dist/orders-1.0.0.tar.gz and dist/orders-1.0.0-py3-none-any.whl
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

\`count\` is every order, \`paid\` is how many cleared, and \`revenue\` sums only the paid amounts. In the capstone, a read-only \`parse_order\` does this coercion for you, turning each raw dict into a typed \`Order\`.

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
      "feedback": "Simplest, and it is what the capstone does because the numbers are small and rounded exactly once. In a payments service the drift eventually shows up as a ledger that does not balance, and nobody can tell you which cent went missing."
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
    prompt: `Capstone: implement \`summarize(raw_orders)\` in \`orders/report.py\`. Parse each raw order with
the read-only \`parse_order\` (into a typed \`Order\`), then return
\`{"count", "paid", "revenue"}\` where revenue sums **paid** orders' amounts, rounded to 2 decimals.
Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Parse first: `[parse_order(raw) for raw in raw_orders]`.",
      "Paid orders are those with `order.paid` truthy.",
      "`revenue` is `round(sum(o.amount for o in paid), 2)`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "orders/report.py",
      editableFilePaths: ["orders/report.py"],
      visibleTestPaths: ["tests/test_orders_report.py"],
      hiddenTestPaths: ["tests/test_orders_report_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CAPSTONE_README },
        { path: "pyproject.toml", role: "docs", language: "text", content: CAPSTONE_PYPROJECT },
        { path: "orders/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "orders/models.py",
          role: "readonly",
          language: "python",
          content: CAPSTONE_MODELS,
          description: "Typed Order model + parse_order (read-only)",
        },
        {
          path: "orders/report.py",
          role: "editable",
          language: "python",
          content: CAPSTONE_REPORT_STARTER,
          description: "Implement summarize here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_orders_report.py",
          role: "test",
          language: "python",
          content: CAPSTONE_TEST,
          description: "Visible capstone tests",
        },
        {
          path: "tests/test_orders_report_hidden.py",
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
            { module: "test_orders_report", label: "visible report" },
            { module: "test_orders_report_hidden", label: "hidden report" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "orders/report.py",
          role: "editable",
          language: "python",
          content: CAPSTONE_REPORT_REFERENCE,
        },
      ],
    },
  },
}
