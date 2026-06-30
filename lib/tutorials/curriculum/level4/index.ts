/**
 * Level 4 — Codebase (workspace). Senior-track depth across real files: advanced OOP, metaprogramming,
 * concurrency, performance, and production tooling.
 *
 * Authored by Agent 2 following the workspace authoring contract documented in `../level3/index.ts`:
 * every package dir needs an `__init__.py`; the runner (`role:"test"`, `hidden:true`) prints
 * `__WORKSPACE_TEST_RESULTS__:` + JSON. Workspace tests run real Python `assert`s (so floats are
 * compared exactly — keep graded values integer or rounded). Each lesson pairs a single-file `apply`
 * warm-up with a multi-file `practice` challenge.
 */
import type { PythonLesson, PythonLevel } from "../../types"

const EMPTY_INIT = ""

/** Standard workspace runner: imports two test modules and runs each module's run_tests(record). */
function buildRunner(
  visibleModule: string,
  hiddenModule: string,
  visibleSuite: string,
  hiddenSuite: string
): string {
  return String.raw`import json
import os
import sys
import traceback

sys.path.insert(0, os.getcwd())
from tests import ${visibleModule}, ${hiddenModule}

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


${visibleModule}.run_tests(record_factory("${visibleSuite}"))
${hiddenModule}.run_tests(record_factory("${hiddenSuite}"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`
}

// ───────────────────────────────────────────────────────────────────────────
// L4-M1 — Advanced OOP & Design Patterns
// ───────────────────────────────────────────────────────────────────────────

const ABC_README = `# Program to an interface with ABCs

\`shapes/base.py\` (read-only) defines an abstract base class \`Shape\` with an abstract \`area()\`.
\`shapes/square.py\` (read-only) is a worked example. Implement \`Rectangle(Shape)\` in
\`shapes/rectangle.py\` — store \`width\` and \`height\` and return \`width * height\` from \`area()\`.

The read-only \`total_area(shapes)\` sums any shapes' areas through the abstraction. Some tests are
hidden.
`

const ABC_BASE = String.raw`from abc import ABC, abstractmethod


class Shape(ABC):
    @abstractmethod
    def area(self):
        """Return the area of the shape."""
        raise NotImplementedError
`

const ABC_SQUARE = String.raw`from shapes.base import Shape


class Square(Shape):
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side * self.side
`

const ABC_REPORT = String.raw`def total_area(shapes):
    """Sum the area of every shape — programming to the Shape abstraction."""
    return sum(shape.area() for shape in shapes)
`

const ABC_RECTANGLE_STARTER = String.raw`from shapes.base import Shape


class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        # TODO: return width * height.
        return 0
`

const ABC_RECTANGLE_REFERENCE = String.raw`from shapes.base import Shape


class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height
`

const ABC_TEST = String.raw`from shapes.rectangle import Rectangle
from shapes.square import Square
from shapes.report import total_area


def run_tests(record):
    def rectangle_area():
        assert Rectangle(3, 4).area() == 12, f"got {Rectangle(3, 4).area()!r}"

    def polymorphic_total():
        assert total_area([Rectangle(2, 3), Square(4)]) == 22

    record("rectangle area", rectangle_area)
    record("total_area over mixed shapes", polymorphic_total)
`

const ABC_TEST_HIDDEN = String.raw`from shapes.base import Shape
from shapes.rectangle import Rectangle


def run_tests(record):
    def larger_rectangle():
        assert Rectangle(5, 5).area() == 25

    def abstract_base_cannot_be_instantiated():
        try:
            Shape()
            raised = False
        except TypeError:
            raised = True
        assert raised, "Shape() should raise TypeError (it is abstract)"

    record("larger rectangle", larger_rectangle)
    record("abstract base cannot be instantiated", abstract_base_cannot_be_instantiated)
`

const abcProtocolsLesson: PythonLesson = {
  id: "py-l4-abc-protocols",
  title: "ABCs & Protocols",
  summary: "Define interfaces with abc and Protocol, then program to the abstraction.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["abc", "protocols", "interfaces", "polymorphism"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Programming to an interface

### Abstract base classes (abc)

An **abstract base class** defines an interface that subclasses must implement. Mark methods
\`@abstractmethod\` and the class can't be instantiated until they're all provided:

\`\`\`python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        ...

class Rectangle(Shape):
    def __init__(self, width, height):
        self.width, self.height = width, height

    def area(self):
        return self.width * self.height
\`\`\`

\`Shape()\` raises \`TypeError\`; \`Rectangle(3, 4)\` works. Code that takes "any \`Shape\`" works for
every subclass — that's **polymorphism**.

### Protocols (structural)

\`abc\` uses **inheritance** (a class declares "I am a Shape"). A \`Protocol\` types by **shape** —
any object with an \`area()\` method qualifies, no inheritance needed:

\`\`\`python
from typing import Protocol

class HasArea(Protocol):
    def area(self) -> float: ...

def total_area(shapes: list[HasArea]) -> float:
    return sum(s.area() for s in shapes)
\`\`\`

Use an **ABC** when you control the hierarchy and want shared code; a **Protocol** to accept
anything that already fits the shape.

### Recap

ABCs enforce an interface through inheritance and \`@abstractmethod\`; Protocols match by structure.
Either way you "program to the abstraction" so one function handles many types. You'll implement a
\`Rectangle\` shape — first standalone, then as a real \`Shape\` subclass in a package.`,
    demoCode: `from abc import ABC, abstractmethod


class Shape(ABC):
    @abstractmethod
    def area(self):
        ...


class Rectangle(Shape):
    def __init__(self, width, height):
        self.width, self.height = width, height

    def area(self):
        return self.width * self.height


print(Rectangle(3, 4).area())   # 12`,
  },
  apply: {
    id: "py-l4-abc-protocols-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement a \`Rectangle\` class with \`__init__(self, width, height)\` and an
\`area()\` method returning \`width * height\`. The provided \`run\` driver builds one and returns its
area.

\`run(3, 4)\` is \`12\`.`,
    starterCode: `class Rectangle:
    def __init__(self, width, height):
        # Store width and height on self.
        pass

    def area(self):
        # Return width * height.
        pass


def run(width, height):
    return Rectangle(width, height).area()`,
    hints: [
      "In `__init__`, set `self.width = width` and `self.height = height`.",
      "In `area`, return `self.width * self.height`.",
    ],
    referenceSolution: `class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height


def run(width, height):
    return Rectangle(width, height).area()`,
    testCases: [
      { input: { width: 3, height: 4 }, expected: 12, description: "3 by 4" },
      { input: { width: 5, height: 5 }, expected: 25, description: "a square" },
      { input: { width: 2, height: 10 }, expected: 20, description: "a wide rectangle" },
    ],
  },
  practice: {
    id: "py-l4-abc-protocols-practice",
    executionMode: "workspace",
    prompt: `Implement \`Rectangle(Shape)\` in \`shapes/rectangle.py\`: subclass the abstract \`Shape\`, store
\`width\` and \`height\`, and return \`width * height\` from \`area()\`. It must work polymorphically
with \`total_area\`. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Subclass the base: `class Rectangle(Shape):`.",
      "Implement `area(self)` to satisfy the abstract method — return `self.width * self.height`.",
      "Because you override `area`, `Rectangle` becomes concrete and can be instantiated.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "shapes/rectangle.py",
      editableFilePaths: ["shapes/rectangle.py"],
      visibleTestPaths: ["tests/test_shapes.py"],
      hiddenTestPaths: ["tests/test_shapes_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: ABC_README },
        { path: "shapes/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "shapes/base.py",
          role: "readonly",
          language: "python",
          content: ABC_BASE,
          description: "Shape abstract base class (read-only)",
        },
        {
          path: "shapes/square.py",
          role: "readonly",
          language: "python",
          content: ABC_SQUARE,
          description: "Worked Square example (read-only)",
        },
        {
          path: "shapes/report.py",
          role: "readonly",
          language: "python",
          content: ABC_REPORT,
          description: "total_area over the abstraction (read-only)",
        },
        {
          path: "shapes/rectangle.py",
          role: "editable",
          language: "python",
          content: ABC_RECTANGLE_STARTER,
          description: "Implement Rectangle here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_shapes.py",
          role: "test",
          language: "python",
          content: ABC_TEST,
          description: "Visible shape tests",
        },
        {
          path: "tests/test_shapes_hidden.py",
          role: "test",
          language: "python",
          content: ABC_TEST_HIDDEN,
          hidden: true,
          description: "Hidden abstract-class tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner("test_shapes", "test_shapes_hidden", "visible shapes", "hidden shapes"),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "shapes/rectangle.py",
          role: "editable",
          language: "python",
          content: ABC_RECTANGLE_REFERENCE,
        },
      ],
    },
  },
}

const SOLID_README = `# Strategy + factory pricing

Refactor pricing toward SOLID: each discount is a **strategy** (a pluggable function) and a
**factory** picks one by name — so adding a discount never edits the dispatcher (open/closed).

\`pricing/strategies.py\` (read-only) has \`regular\`, \`member\`, and \`vip\` strategies. Implement
\`price_for(kind, amount)\` in \`pricing/checkout.py\` so it looks up the strategy for \`kind\` and
applies it, defaulting to \`regular\` for unknown kinds. Some tests are hidden.
`

const SOLID_STRATEGIES = String.raw`def regular(amount):
    return round(amount, 2)


def member(amount):
    return round(amount * 0.9, 2)


def vip(amount):
    return round(amount * 0.8, 2)
`

const SOLID_CHECKOUT_STARTER = String.raw`from pricing.strategies import regular, member, vip

STRATEGIES = {"regular": regular, "member": member, "vip": vip}


def price_for(kind, amount):
    """Pick the strategy for kind (default regular) and apply it (see README.md)."""
    # TODO: look up STRATEGIES.get(kind, regular) and call it on amount.
    return amount
`

const SOLID_CHECKOUT_REFERENCE = String.raw`from pricing.strategies import regular, member, vip

STRATEGIES = {"regular": regular, "member": member, "vip": vip}


def price_for(kind, amount):
    strategy = STRATEGIES.get(kind, regular)
    return strategy(amount)
`

const SOLID_TEST = String.raw`from pricing.checkout import price_for


def run_tests(record):
    def regular_price():
        assert price_for("regular", 100) == 100, f"got {price_for('regular', 100)!r}"

    def member_discount():
        assert price_for("member", 100) == 90, f"got {price_for('member', 100)!r}"

    def vip_discount():
        assert price_for("vip", 100) == 80, f"got {price_for('vip', 100)!r}"

    record("regular price", regular_price)
    record("member discount", member_discount)
    record("vip discount", vip_discount)
`

const SOLID_TEST_HIDDEN = String.raw`from pricing.checkout import price_for


def run_tests(record):
    def unknown_kind_defaults_to_regular():
        assert price_for("mystery", 100) == 100, f"got {price_for('mystery', 100)!r}"

    def vip_on_smaller_amount():
        assert price_for("vip", 50) == 40, f"got {price_for('vip', 50)!r}"

    record("unknown kind defaults to regular", unknown_kind_defaults_to_regular)
    record("vip on a smaller amount", vip_on_smaller_amount)
`

const solidPatternsLesson: PythonLesson = {
  id: "py-l4-solid-patterns",
  title: "SOLID & design patterns (factory, strategy)",
  summary: "Refactor toward SOLID with pluggable strategies selected by a factory.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["solid", "strategy-pattern", "factory-pattern", "design"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## SOLID, in practice

**SOLID** is five design principles. The two you'll feel most:

- **S**ingle responsibility — a module/class does one thing.
- **O**pen/closed — open to extension, closed to modification: add behaviour *without* editing
  existing code.

A long \`if/elif\` chain violates open/closed — every new case edits the same function. Two patterns
fix that.

### Strategy: pluggable algorithms

A **strategy** is an interchangeable piece of behaviour, passed as a value (here, a function):

\`\`\`python
def member(amount):
    return round(amount * 0.9, 2)
\`\`\`

### Factory: pick a strategy by name

A **factory** maps a key to the right strategy, so the caller stays ignorant of the choices:

\`\`\`python
STRATEGIES = {"regular": regular, "member": member, "vip": vip}

def price_for(kind, amount):
    strategy = STRATEGIES.get(kind, regular)   # factory lookup
    return strategy(amount)                     # apply the strategy
\`\`\`

Adding a "student" discount is one new function plus one dict entry — \`price_for\` never changes.
That's open/closed.

### Recap

Strategy makes behaviour a pluggable value; a factory selects it by key — together they replace
branching with a lookup and keep code open for extension. You'll build \`price_for\` — first inline,
then over a \`pricing\` package.`,
    demoCode: `def regular(a):
    return round(a, 2)


def member(a):
    return round(a * 0.9, 2)


STRATEGIES = {"regular": regular, "member": member}
print(STRATEGIES.get("member", regular)(100))   # 90.0`,
  },
  apply: {
    id: "py-l4-solid-patterns-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`price_for(kind, amount)\` — apply a discount by \`kind\`. \`regular\`
is full price, \`member\` is 10% off, \`vip\` is 20% off, and any unknown kind is full price. Round to
2 decimals.

\`price_for("member", 100)\` is \`90\`; \`price_for("vip", 100)\` is \`80\`.`,
    starterCode: `def price_for(kind, amount):
    # Map kind -> rate (regular 1.0, member 0.9, vip 0.8; default 1.0), then apply.
    pass`,
    hints: [
      'Use a dict of rates: `{"regular": 1.0, "member": 0.9, "vip": 0.8}`.',
      "Look up with a default: `rates.get(kind, 1.0)`.",
      "`return round(amount * rates.get(kind, 1.0), 2)`.",
    ],
    referenceSolution: `def price_for(kind, amount):
    rates = {"regular": 1.0, "member": 0.9, "vip": 0.8}
    return round(amount * rates.get(kind, 1.0), 2)`,
    testCases: [
      { input: { kind: "regular", amount: 100 }, expected: 100, description: "full price" },
      { input: { kind: "member", amount: 100 }, expected: 90, description: "10% off" },
      { input: { kind: "vip", amount: 100 }, expected: 80, description: "20% off" },
      { input: { kind: "mystery", amount: 100 }, expected: 100, description: "unknown is full price" },
    ],
  },
  practice: {
    id: "py-l4-solid-patterns-practice",
    executionMode: "workspace",
    prompt: `Implement \`price_for(kind, amount)\` in \`pricing/checkout.py\`: use the \`STRATEGIES\` factory dict
to pick the strategy for \`kind\` (defaulting to \`regular\`) and apply it to \`amount\`. Adding a
strategy must not require editing \`price_for\`. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "`STRATEGIES.get(kind, regular)` returns the right strategy function (or the default).",
      "Call the returned function on `amount` and return the result.",
      "Notice you never branch on `kind` — that's the open/closed win.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "pricing/checkout.py",
      editableFilePaths: ["pricing/checkout.py"],
      visibleTestPaths: ["tests/test_checkout.py"],
      hiddenTestPaths: ["tests/test_checkout_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: SOLID_README },
        { path: "pricing/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "pricing/strategies.py",
          role: "readonly",
          language: "python",
          content: SOLID_STRATEGIES,
          description: "Pricing strategies (read-only)",
        },
        {
          path: "pricing/checkout.py",
          role: "editable",
          language: "python",
          content: SOLID_CHECKOUT_STARTER,
          description: "Implement price_for here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_checkout.py",
          role: "test",
          language: "python",
          content: SOLID_TEST,
          description: "Visible pricing tests",
        },
        {
          path: "tests/test_checkout_hidden.py",
          role: "test",
          language: "python",
          content: SOLID_TEST_HIDDEN,
          hidden: true,
          description: "Hidden pricing tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner("test_checkout", "test_checkout_hidden", "visible checkout", "hidden checkout"),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "pricing/checkout.py",
          role: "editable",
          language: "python",
          content: SOLID_CHECKOUT_REFERENCE,
        },
      ],
    },
  },
}

export const level4: PythonLevel = {
  id: 4,
  slug: "engineering",
  title: "Level 4 — Codebase",
  tagline: "Work across real files — follow imports, change a function, prove it with a test.",
  defaultExecutionMode: "workspace",
  estimatedHours: 8,
  modules: [
    {
      id: "py-l4-advanced-oop",
      title: "Advanced OOP & Design Patterns",
      description: "Program to interfaces with ABCs/Protocols and apply SOLID patterns.",
      lessons: [abcProtocolsLesson, solidPatternsLesson],
    },
  ],
}
