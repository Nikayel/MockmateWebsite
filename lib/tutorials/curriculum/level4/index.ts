/**
 * Level 4: Codebase (workspace). Senior-track depth across real files: advanced OOP, metaprogramming,
 * concurrency, performance, and production tooling.
 *
 * Authored by Agent 2 following the workspace authoring contract documented in `../level3/index.ts`:
 * every package dir needs an `__init__.py`; the runner (`role:"test"`, `hidden:true`) prints
 * `__WORKSPACE_TEST_RESULTS__:` + JSON. Workspace tests run real Python `assert`s (so floats are
 * compared exactly, so keep graded values integer or rounded). Each lesson pairs a single-file `apply`
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
// L4-M1: Advanced OOP & Design Patterns
// ───────────────────────────────────────────────────────────────────────────

const ABC_README = `# Program to an interface with ABCs

\`shapes/base.py\` (read-only) defines an abstract base class \`Shape\` with an abstract \`area()\`.
\`shapes/square.py\` (read-only) is a worked example. Implement \`Rectangle(Shape)\` in
\`shapes/rectangle.py\`: store \`width\` and \`height\` and return \`width * height\` from \`area()\`.

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
    """Sum the area of every shape, programming to the Shape abstraction."""
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

### Why interfaces matter

When a function says "give me any \`Shape\`", it should not care whether the object is a \`Rectangle\`, a \`Circle\`, or a type a coworker adds next month. You write a consumer like \`total_area\` once against the abstraction \`area()\`, and every conforming type flows through it unchanged. That is the point of an interface: you add new types without editing the code that consumes them, instead of stacking \`if isinstance(...)\` branches. Interviewers use this to check whether you design for extension. Python gives you two tools here, and they differ in how a type "counts" as conforming.

### Abstract base classes: conform by inheritance

An abstract base class declares the methods a subclass must provide. Decorate them with \`@abstractmethod\` and the base becomes non-instantiable until every abstract method is overridden:

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

\`Shape()\` raises \`TypeError\` because you cannot instantiate a class that still has unimplemented abstract methods. \`Rectangle(3, 4)\` works and \`.area()\` returns \`12\`, as the demo below shows. This is nominal typing: \`Rectangle\` conforms because it explicitly declares \`class Rectangle(Shape)\`. Reach for an ABC when you own the hierarchy and want to share concrete helper code on the base or force implementers to fill in the blanks.

### Protocols: conform by shape

A \`Protocol\` flips the rule. Any object with a matching \`area()\` method qualifies, with no inheritance and no import of your type:

\`\`\`python
from typing import Protocol

class HasArea(Protocol):
    def area(self) -> float: ...

def total_area(shapes: list[HasArea]) -> float:
    return sum(s.area() for s in shapes)
\`\`\`

This is structural (duck) typing made checkable. A third-party \`Circle\` you cannot subclass still passes \`total_area\` as long as it has an \`area()\` method. Reach for a Protocol to accept things that already fit the shape, especially across library boundaries you do not control.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Question", "ABC (abc.ABC)", "Protocol (typing.Protocol)"],
  "rows": [
    ["How does a class conform?", "By inheriting: class Rectangle(Shape)", "By having the right methods, with no inheritance"],
    ["Typing style", "Nominal: conformance is declared", "Structural: conformance is observed"],
    ["Can it accept a third-party class?", "Only if you can edit it to subclass", "Yes, it never needs to know your type exists"],
    ["Enforced when?", "At instantiation: TypeError on a missing method", "At type-check time; runtime needs @runtime_checkable"],
    ["Can it ship shared code?", "Yes, concrete helpers live on the base", "No, it is a shape description only"],
    ["Reach for it when", "You own the hierarchy and want shared behaviour", "You are accepting things that already fit"]
  ],
  "highlightCols": ["Question"],
  "caption": "One question decides it: do you control the classes that must conform? If yes, an ABC also buys you shared code. If they come from a library you do not own, only a Protocol can describe them."
}
\`\`\`

### Pitfalls

- A subclass that forgets even one abstract method stays abstract itself. Remove \`area\` from \`Rectangle\` and \`Rectangle(3, 4)\` raises \`TypeError\`. The failure comes at construction time, not when the class is defined, so a broken subclass can look fine until someone builds one.
- A \`Protocol\` is not enforced at runtime by default. \`isinstance(obj, HasArea)\` raises \`TypeError\` unless you decorate the protocol with \`@runtime_checkable\`, and even then the check only confirms the method name exists, never its signature or return type.

**Interview nuance:** ABCs use nominal subtyping (you conform by declaring the parent) while Protocols use structural subtyping (you conform by having the right members). Protocol conformance is verified by a static type checker such as \`mypy\` or \`pyright\`, not by the interpreter. At runtime \`total_area\` runs on anything with an \`area()\` method regardless of annotations, because Python is already duck-typed. The Protocol does not add a runtime gate; it makes the contract explicit and machine-checkable before you ship.`,
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
      "Implement `area(self)` to satisfy the abstract method: return `self.width * self.height`.",
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
          content: buildRunner(
            "test_shapes",
            "test_shapes_hidden",
            "visible shapes",
            "hidden shapes"
          ),
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
**factory** picks one by name, so adding a discount never edits the dispatcher (open/closed).

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
    markdown: `## Why SOLID shows up in code review

Almost every service has a spot where behavior branches by a key: pick a discount by customer tier, a parser by file type, a shipping rate by region. It usually starts as a three-line \`if/elif\`. A year later it is forty branches, every teammate edits the same function, and every edit risks breaking a case that already worked. **SOLID** is five design principles for arranging code so that new behavior is additive instead of invasive. Two of them do most of the work here.

- **S**ingle responsibility: each function or class has one reason to change.
- **O**pen/closed: code is open to extension but closed to modification. You add a case by adding code, not by editing code that already passed its tests.

The other three matter less here but come up in review, so it is worth being able to name all five:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Principle", "In one line", "The smell it names"],
  "rows": [
    ["S: single responsibility", "one reason to change", "a class that both parses and saves, so two teams edit it"],
    ["O: open/closed", "extend by adding, not by editing", "the forty-branch if/elif nobody dares touch"],
    ["L: Liskov substitution", "a subtype must work anywhere its base does", "a subclass that raises NotImplementedError on an inherited method"],
    ["I: interface segregation", "many small interfaces beat one fat one", "implementers stubbing methods they never needed"],
    ["D: dependency inversion", "depend on the abstraction, not the concrete type", "a service that builds its own DB client, so tests cannot swap it"]
  ],
  "highlightCols": ["The smell it names"],
  "caption": "The highlighted column is the useful half. Almost nobody recalls the five letters under pressure, but everyone recognises the smells, and each smell is what the principle was written to describe."
}
\`\`\`

A long \`if/elif\` chain violates open/closed: every new tier reopens \`price_for\` and puts a tested function back on the table. Two patterns remove the chain.

### Strategy: behavior as a value

A **strategy** is one interchangeable unit of behavior. In Python, functions are first-class objects, so the simplest strategy is just a function you can store and pass around:

\`\`\`python
def regular(a):
    return round(a, 2)

def member(a):
    return round(a * 0.9, 2)   # 10% off
\`\`\`

Each strategy has the same shape (\`amount\` in, price out), so a caller can swap one for another without knowing which one it holds.

### Factory: pick the strategy by key

A **factory** maps a key to a strategy so the caller never sees the choices:

\`\`\`python
STRATEGIES = {"regular": regular, "member": member}

def price_for(kind, amount):
    strategy = STRATEGIES.get(kind, regular)  # default to full price
    return strategy(amount)

print(price_for("member", 100))   # 90.0
\`\`\`

Adding a \`vip\` tier is one new function plus one dict entry. \`price_for\` itself never changes. That is open/closed in three lines, and it is exactly what you will build: first inline, then behind a \`pricing\` package.

### Two traps interns hit

Store the function, not its result. \`{"member": member}\` stores the callable; \`{"member": member(100)}\` calls it immediately and stores the number \`90.0\`, so a later \`strategy(amount)\` raises \`TypeError: 'float' object is not callable\`.

Handle the unknown key. \`STRATEGIES[kind]\` raises \`KeyError\` for a tier you have not registered. Use \`STRATEGIES.get(kind, regular)\` so an unknown \`kind\` falls back to full price, which is what the exercises require.

**Interview nuance:** an \`if/elif\` chain does up to \`k\` comparisons for \`k\` branches, while the dict dispatch is one average-case \`O(1)\` hash lookup no matter how many strategies exist. But interviewers care more about the design consequence than the constant factor: with the table, adding a strategy touches zero existing lines, so nothing that already passed can regress. Named dispatch tables like this are how real routers, command handlers, and plugin registries stay open for extension as they grow.`,
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
    prompt: `Warm-up (one file): implement \`price_for(kind, amount)\` that applies a discount by \`kind\`. \`regular\`
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
      {
        input: { kind: "mystery", amount: 100 },
        expected: 100,
        description: "unknown is full price",
      },
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
      "Notice you never branch on `kind`. That's the open/closed win.",
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
          content: buildRunner(
            "test_checkout",
            "test_checkout_hidden",
            "visible checkout",
            "hidden checkout"
          ),
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

// ───────────────────────────────────────────────────────────────────────────
// L4-M2: Decorators & Metaprogramming
// ───────────────────────────────────────────────────────────────────────────

const DEC_README = `# A decorator that takes an argument

Build a **parameterized** decorator. Implement \`multiply_by(factor)\` in
\`decorators/wrappers.py\`, a decorator *factory* that returns a decorator which multiplies the
wrapped function's result by \`factor\`. Use \`functools.wraps\` so the wrapped function keeps its
name.

\`decorators/math_ops.py\` (read-only) applies it: \`@multiply_by(3)\` on \`add\` makes
\`add(2, 3) == 15\`. Some tests are hidden.
`

const DEC_WRAPPERS_STARTER = String.raw`import functools


def multiply_by(factor):
    """A decorator factory: multiply the wrapped function's result by factor (see README.md)."""

    def decorator(fn):
        # TODO: return a wrapper that multiplies fn(...) by factor. Use functools.wraps(fn).
        return fn

    return decorator
`

const DEC_WRAPPERS_REFERENCE = String.raw`import functools


def multiply_by(factor):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs) * factor

        return wrapper

    return decorator
`

const DEC_MATH_OPS = String.raw`from decorators.wrappers import multiply_by


@multiply_by(3)
def add(a, b):
    return a + b


@multiply_by(10)
def amount(x):
    return x
`

const DEC_TEST = String.raw`from decorators.math_ops import add, amount


def run_tests(record):
    def triples_the_sum():
        assert add(2, 3) == 15, f"expected 15, got {add(2, 3)!r}"

    def scales_by_ten():
        assert amount(5) == 50, f"expected 50, got {amount(5)!r}"

    record("triples the sum", triples_the_sum)
    record("scales by ten", scales_by_ten)
`

const DEC_TEST_HIDDEN = String.raw`from decorators.math_ops import add, amount


def run_tests(record):
    def preserves_name_with_wraps():
        assert add.__name__ == "add", f"expected 'add', got {add.__name__!r} (use functools.wraps)"

    def scales_zero():
        assert amount(0) == 0

    record("preserves __name__ via functools.wraps", preserves_name_with_wraps)
    record("scales zero", scales_zero)
`

const decoratorsAdvancedLesson: PythonLesson = {
  id: "py-l4-decorators-advanced",
  title: "Decorators with arguments & functools.wraps",
  summary: "Write a parameterized, well-behaved decorator that preserves the wrapped function.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["decorators", "functools", "closures", "metaprogramming"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Decorators that take arguments

Real decorators almost always need configuration. \`@retry(times=3)\`, \`@lru_cache(maxsize=128)\`, and Flask's \`@app.route("/users")\` all take arguments, because you cannot hardcode a retry count or a route into the decorator itself. A decorator that accepts arguments is called a decorator factory, and it is the pattern you reach for whenever the behavior you are adding needs to be tuned per function.

### The three-layer model

A plain decorator is one function: it takes \`fn\` and returns a replacement. A parameterized decorator adds one outer layer that takes the config and returns that plain decorator. So there are three nested callables, each taking a different thing:

\`\`\`python
def multiply_by(factor):              # factory: takes the config
    def decorator(fn):                # decorator: takes the function
        def wrapper(*args, **kwargs): # wrapper: takes the call
            return fn(*args, **kwargs) * factor
        return wrapper
    return decorator
\`\`\`

Read \`@multiply_by(3)\` written above \`add\` as two steps:

\`\`\`python
add = multiply_by(3)(add)
# step 1: multiply_by(3) runs and returns \`decorator\`
# step 2: decorator(add) runs and returns \`wrapper\`, rebound to the name \`add\`
\`\`\`

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Layer", "Takes", "Returns", "Runs"],
  "rows": [
    ["multiply_by(factor)", "the config, 3", "the decorator", "once, at the @ line"],
    ["decorator(fn)", "the function being decorated", "the wrapper", "once, at the @ line"],
    ["wrapper(*args, **kwargs)", "the call arguments", "fn's result, times factor", "on every call"]
  ],
  "highlightCols": ["Runs"],
  "caption": "The highlighted column explains the classic mistake. Two layers run once when the module loads and only the third runs per call, so writing @multiply_by without the parentheses skips the factory entirely and hands your function in as factor."
}
\`\`\`

\`factor\` stays reachable inside \`wrapper\` because \`wrapper\` is a closure over the factory's scope. \`*args, **kwargs\` in \`wrapper\` forwards any call signature through untouched, so \`multiply_by\` works on \`add\`, on a one-argument function, or on anything else.

### functools.wraps

\`wrapper\` is a brand-new function object, so by default it reports itself, not the function it replaced:

\`\`\`python
print(add.__name__)   # 'wrapper'  (wrong: this corrupts logs, help(), and tracebacks)
\`\`\`

\`@functools.wraps(fn)\` copies \`fn\`'s \`__name__\`, \`__qualname__\`, \`__doc__\`, and \`__module__\` onto \`wrapper\`, updates \`wrapper.__dict__\`, and sets \`wrapper.__wrapped__ = fn\` so introspection tools can still find the original. With it in place, the demo below prints \`add\`, which is exactly what the second \`print\` verifies. Add \`functools.wraps\` to every real decorator you write.

### Pitfall: forgetting the parentheses

A factory must be called. \`@multiply_by(3)\` is correct; \`@multiply_by\` is not. If you drop the \`(3)\`, Python runs \`multiply_by(add)\`, binds \`factor = add\`, and replaces \`add\` with the inner \`decorator\`. Nothing fails at definition time, so the bug hides until the next call:

\`\`\`python
@multiply_by          # missing (3)
def add(a, b):
    return a + b

add(2, 3)   # TypeError: multiply_by.<locals>.decorator() takes 1 positional argument but 2 were given
\`\`\`

The plain \`@name\` form (no call) is only for decorators that take a function directly. Anything parameterized needs the call.

**Interview nuance:** know when each layer runs. The factory and the \`decorator\` run exactly once, at definition time, when \`@multiply_by(3)\` is evaluated. Only \`wrapper\` runs on every call. So expensive setup (compiling a regex, opening a connection) belongs in the outer layers where it happens once, not inside \`wrapper\`. Each call to \`multiply_by\` also creates a fresh scope, so \`multiply_by(3)\` and \`multiply_by(5)\` capture independent \`factor\` values. The classic late-binding closure bug, where every closure shares one variable, only bites when you reuse the same name, for example building decorators inside a \`for\` loop.`,
    demoCode: `import functools


def multiply_by(factor):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs) * factor

        return wrapper

    return decorator


@multiply_by(3)
def add(a, b):
    return a + b


print(add(2, 3))      # 15
print(add.__name__)   # add`,
  },
  apply: {
    id: "py-l4-decorators-advanced-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`multiply_by(factor)\`, a decorator factory that multiplies a
function's result by \`factor\`. It's applied to \`add\` below, and the \`run\` driver calls it.

\`run(2, 3)\` should be \`15\` (because \`(2 + 3) * 3\`).`,
    starterCode: `import functools


def multiply_by(factor):
    def decorator(fn):
        # TODO: return a wrapper multiplying fn(...) by factor (use functools.wraps).
        return fn

    return decorator


@multiply_by(3)
def add(a, b):
    return a + b


def run(a, b):
    return add(a, b)`,
    hints: [
      "Inside `decorator`, define `wrapper(*args, **kwargs)` returning `fn(*args, **kwargs) * factor`.",
      "Decorate the wrapper with `@functools.wraps(fn)` and return it.",
      "`return wrapper` from `decorator`.",
    ],
    referenceSolution: `import functools


def multiply_by(factor):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs) * factor

        return wrapper

    return decorator


@multiply_by(3)
def add(a, b):
    return a + b


def run(a, b):
    return add(a, b)`,
    testCases: [
      { input: { a: 2, b: 3 }, expected: 15, description: "(2 + 3) * 3" },
      { input: { a: 1, b: 1 }, expected: 6, description: "(1 + 1) * 3" },
      { input: { a: 10, b: 5 }, expected: 45, description: "(10 + 5) * 3" },
    ],
  },
  practice: {
    id: "py-l4-decorators-advanced-practice",
    executionMode: "workspace",
    prompt: `Implement \`multiply_by(factor)\` in \`decorators/wrappers.py\`: a decorator factory whose wrapper
multiplies the wrapped function's result by \`factor\`, using \`functools.wraps\` to preserve the
function's name. The read-only \`math_ops.py\` applies it. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Three nested layers: `multiply_by(factor)` → `decorator(fn)` → `wrapper(*args, **kwargs)`.",
      "The wrapper returns `fn(*args, **kwargs) * factor`.",
      "Decorate `wrapper` with `@functools.wraps(fn)` so `add.__name__` stays `'add'`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "decorators/wrappers.py",
      editableFilePaths: ["decorators/wrappers.py"],
      visibleTestPaths: ["tests/test_decorators.py"],
      hiddenTestPaths: ["tests/test_decorators_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: DEC_README },
        {
          path: "decorators/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "decorators/wrappers.py",
          role: "editable",
          language: "python",
          content: DEC_WRAPPERS_STARTER,
          description: "Implement multiply_by here",
        },
        {
          path: "decorators/math_ops.py",
          role: "readonly",
          language: "python",
          content: DEC_MATH_OPS,
          description: "Functions decorated with multiply_by (read-only)",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_decorators.py",
          role: "test",
          language: "python",
          content: DEC_TEST,
          description: "Visible decorator tests",
        },
        {
          path: "tests/test_decorators_hidden.py",
          role: "test",
          language: "python",
          content: DEC_TEST_HIDDEN,
          hidden: true,
          description: "Hidden functools.wraps tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_decorators",
            "test_decorators_hidden",
            "visible decorators",
            "hidden decorators"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "decorators/wrappers.py",
          role: "editable",
          language: "python",
          content: DEC_WRAPPERS_REFERENCE,
        },
      ],
    },
  },
}

const DESC_README = `# A validating descriptor

Customize attribute access with a **descriptor**. Implement \`Positive\` in \`models/fields.py\` so it:
- stores the value on the instance (under a private name from \`__set_name__\`)
- returns it from \`__get__\`
- **raises \`ValueError\`** from \`__set__\` when the value is negative

\`models/account.py\` (read-only) uses it: \`balance = Positive()\`. Some tests are hidden.
`

const DESC_FIELDS_STARTER = String.raw`class Positive:
    """A data descriptor that only allows non-negative values (see README.md)."""

    def __set_name__(self, owner, name):
        self.storage_name = "_" + name

    def __get__(self, instance, owner):
        # TODO: return the stored value from the instance.
        return None

    def __set__(self, instance, value):
        # TODO: raise ValueError if value < 0, else store it on the instance.
        pass
`

const DESC_FIELDS_REFERENCE = String.raw`class Positive:
    def __set_name__(self, owner, name):
        self.storage_name = "_" + name

    def __get__(self, instance, owner):
        return getattr(instance, self.storage_name)

    def __set__(self, instance, value):
        if value < 0:
            raise ValueError("value must be non-negative")
        setattr(instance, self.storage_name, value)
`

const DESC_ACCOUNT = String.raw`from models.fields import Positive


class Account:
    balance = Positive()

    def __init__(self, balance):
        self.balance = balance
`

const DESC_TEST = String.raw`from models.account import Account


def run_tests(record):
    def stores_and_reads():
        assert Account(100).balance == 100, f"got {Account(100).balance!r}"

    def allows_zero():
        assert Account(0).balance == 0

    def rejects_negative():
        try:
            Account(-5)
            raised = False
        except ValueError:
            raised = True
        assert raised, "a negative balance should raise ValueError"

    record("stores and reads", stores_and_reads)
    record("allows zero", allows_zero)
    record("rejects a negative balance", rejects_negative)
`

const DESC_TEST_HIDDEN = String.raw`from models.account import Account


def run_tests(record):
    def reassignment_is_validated():
        account = Account(100)
        account.balance = 50
        assert account.balance == 50
        try:
            account.balance = -1
            raised = False
        except ValueError:
            raised = True
        assert raised, "assigning a negative value should raise"

    def instances_are_independent():
        a, b = Account(10), Account(20)
        assert (a.balance, b.balance) == (10, 20)

    record("reassignment is validated", reassignment_is_validated)
    record("instances stay independent", instances_are_independent)
`

const descriptorsMetaclassesLesson: PythonLesson = {
  id: "py-l4-descriptors-metaclasses",
  title: "Descriptors & a peek at metaclasses",
  summary: "Customize attribute access with a descriptor and understand how classes are created.",
  estimatedMinutes: 22,
  difficulty: "hard",
  skills: ["descriptors", "metaclasses", "attributes", "metaprogramming"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Attribute access you can't route around

When a rule like "a balance is never negative" lives in one setter, someone eventually assigns the field from another code path and skips the check. A **descriptor** moves that rule off the value and onto the *attribute itself*, so every read and write of an account's \`balance\` goes through the same code no matter who touches it. This is how ORMs, typed config, and form fields validate assignments in real systems. It is also a favorite interview topic because it reveals whether you understand Python's attribute machinery instead of just its syntax.

### The mental model

A descriptor is any object that defines \`__get__\`, \`__set__\`, or \`__delete__\` and is stored as a **class attribute**. When you write \`acct.balance\`, Python does not just look in \`acct.__dict__\`. It finds \`balance\` on the class, sees it is a descriptor, and calls \`type(acct).__dict__['balance'].__get__(acct, Account)\`. Assignment calls \`__set__\` the same way.

One detail drives everything: the descriptor object is created **once**, when the class is defined, and shared by every instance. So the per-instance value must be stored on the instance, not on the descriptor. In the demo, \`__set_name__\` runs at class-creation time and records \`storage_name = "_balance"\`, then \`__set__\` stashes the value with \`setattr(instance, "_balance", value)\` and \`__get__\` reads it back. \`Account(100).balance\` returns \`100\`; \`Account(0)\` is fine; \`Account(-5)\` raises \`ValueError\` and cannot be bypassed.

### Pitfalls

- **Storing state on the descriptor.** Writing \`self.value = value\` inside \`__set__\` looks natural but shares one slot across all instances:

\`\`\`python
class Broken:
    def __get__(self, instance, owner): return self.value
    def __set__(self, instance, value): self.value = value  # shared!

class C: x = Broken()
a, b = C(), C()
a.x = 1
b.x = 2
print(a.x)   # 2  (b clobbered a)
\`\`\`

  The fix is exactly what the demo does: store on \`instance\` under a separate name.

- **Same storage name as the attribute.** If \`storage_name\` were \`"balance"\` instead of \`"_balance"\`, then \`setattr(instance, "balance", value)\` re-triggers \`__set__\` forever and you get a \`RecursionError\`. The \`_\` prefix is what breaks the loop.

- **Descriptor as an instance attribute.** \`balance = Positive()\` must sit in the class body. Assign it inside \`__init__\` and Python never invokes the protocol; it is just a normal attribute.

**Interview nuance:** descriptors come in two flavors and the difference decides precedence. A **data descriptor** defines \`__set__\` or \`__delete__\` and *wins over* the instance \`__dict__\`. A **non-data descriptor** defines only \`__get__\` and *loses to* it. That is why \`@property\` (data) cannot be shadowed by an instance attribute, while \`functools.cached_property\` (non-data) writes its result into \`instance.__dict__\` on first access and is then read straight from the dict on later calls, skipping recomputation.

### The peek at metaclasses

A metaclass is "the class of a class". The default is \`type\`, and \`class Account: ...\` is roughly \`Account = type("Account", (), namespace)\`. A custom metaclass hooks class creation to register, validate, or inject methods:

\`\`\`python
class Meta(type):
    def __new__(mcls, name, bases, namespace):
        return super().__new__(mcls, name, bases, namespace)

class Thing(metaclass=Meta): ...
\`\`\`

You will rarely write one. \`abc.ABCMeta\`, \`enum.Enum\`, and Django models use them under the hood. Note that \`@dataclass\` is a class *decorator*, not a metaclass, so \`type(SomeDataclass) is type\`. Knowing classes are objects built by \`type\` is what dissolves the "magic".`,
    demoCode: `class Positive:
    def __set_name__(self, owner, name):
        self.storage_name = "_" + name

    def __get__(self, instance, owner):
        return getattr(instance, self.storage_name)

    def __set__(self, instance, value):
        if value < 0:
            raise ValueError("must be non-negative")
        setattr(instance, self.storage_name, value)


class Account:
    balance = Positive()

    def __init__(self, balance):
        self.balance = balance


print(Account(100).balance)   # 100`,
  },
  apply: {
    id: "py-l4-descriptors-metaclasses-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement the \`Positive\` descriptor so \`Account\` stores and returns a
balance through it (raising \`ValueError\` on negatives). The \`run\` driver builds an \`Account\` and
returns its balance.

\`run(100)\` is \`100\`; \`run(0)\` is \`0\`.`,
    starterCode: `class Positive:
    def __set_name__(self, owner, name):
        self.storage_name = "_" + name

    def __get__(self, instance, owner):
        # TODO: return the stored value.
        pass

    def __set__(self, instance, value):
        # TODO: raise ValueError if value < 0, else store it.
        pass


class Account:
    balance = Positive()

    def __init__(self, balance):
        self.balance = balance


def run(balance):
    return Account(balance).balance`,
    hints: [
      "In `__get__`, return `getattr(instance, self.storage_name)`.",
      "In `__set__`, `if value < 0: raise ValueError(...)`, otherwise `setattr(instance, self.storage_name, value)`.",
      "`__set_name__` already gives you `self.storage_name` (e.g. `_balance`).",
    ],
    referenceSolution: `class Positive:
    def __set_name__(self, owner, name):
        self.storage_name = "_" + name

    def __get__(self, instance, owner):
        return getattr(instance, self.storage_name)

    def __set__(self, instance, value):
        if value < 0:
            raise ValueError("value must be non-negative")
        setattr(instance, self.storage_name, value)


class Account:
    balance = Positive()

    def __init__(self, balance):
        self.balance = balance


def run(balance):
    return Account(balance).balance`,
    testCases: [
      { input: { balance: 100 }, expected: 100, description: "stores and reads 100" },
      { input: { balance: 0 }, expected: 0, description: "zero is allowed" },
      { input: { balance: 50 }, expected: 50, description: "stores and reads 50" },
    ],
  },
  practice: {
    id: "py-l4-descriptors-metaclasses-practice",
    executionMode: "workspace",
    prompt: `Implement the \`Positive\` descriptor in \`models/fields.py\`: \`__get__\` returns the stored value,
\`__set__\` raises \`ValueError\` for negatives and otherwise stores the value (the storage name comes
from \`__set_name__\`). \`Account\` uses it for \`balance\`. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "`__get__`: `return getattr(instance, self.storage_name)`.",
      "`__set__`: guard `value < 0` with `raise ValueError(...)`, else `setattr(instance, self.storage_name, value)`.",
      "Storing under `self.storage_name` (not a fixed name) keeps each instance independent.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "models/fields.py",
      editableFilePaths: ["models/fields.py"],
      visibleTestPaths: ["tests/test_positive_field.py"],
      hiddenTestPaths: ["tests/test_positive_field_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: DESC_README },
        { path: "models/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "models/fields.py",
          role: "editable",
          language: "python",
          content: DESC_FIELDS_STARTER,
          description: "Implement the Positive descriptor here",
        },
        {
          path: "models/account.py",
          role: "readonly",
          language: "python",
          content: DESC_ACCOUNT,
          description: "Account uses the descriptor (read-only)",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_positive_field.py",
          role: "test",
          language: "python",
          content: DESC_TEST,
          description: "Visible descriptor tests",
        },
        {
          path: "tests/test_positive_field_hidden.py",
          role: "test",
          language: "python",
          content: DESC_TEST_HIDDEN,
          hidden: true,
          description: "Hidden descriptor tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_positive_field",
            "test_positive_field_hidden",
            "visible account",
            "hidden account"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "models/fields.py",
          role: "editable",
          language: "python",
          content: DESC_FIELDS_REFERENCE,
        },
      ],
    },
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L4-M3: Concurrency & Async
// ───────────────────────────────────────────────────────────────────────────

const CONC_README = `# Parallelize a batch with concurrent.futures

\`jobs/worker.py\` (read-only) has \`double(n)\`. Implement \`run_all(numbers)\` in \`jobs/runner.py\`
so it maps \`double\` over every number with a \`concurrent.futures.ThreadPoolExecutor\`, returning
the results **in input order**.

Some runtimes have no OS threads (this in-browser sandbox is one), where starting a pool raises
\`RuntimeError\`. Catch it and **fall back to a sequential map**. The ordered results are identical
either way.

\`run_all([1, 2, 3])\` is \`[2, 4, 6]\`. Some tests are hidden.
`

const CONC_WORKER = String.raw`def double(n):
    """A unit of work (stands in for an I/O-bound task)."""
    return n * 2
`

const CONC_RUNNER_STARTER = String.raw`from concurrent.futures import ThreadPoolExecutor

from jobs.worker import double


def run_all(numbers):
    """Run double over every number with a thread pool; return results in order (see README.md)."""
    # TODO: map the double worker over numbers with a ThreadPoolExecutor, but fall back
    # to a sequential map if the runtime has no threads (catch RuntimeError).
    return []
`

const CONC_RUNNER_REFERENCE = String.raw`from concurrent.futures import ThreadPoolExecutor

from jobs.worker import double


def run_all(numbers):
    try:
        with ThreadPoolExecutor(max_workers=4) as executor:
            return list(executor.map(double, numbers))
    except RuntimeError:
        # No OS threads here (e.g. the browser sandbox), same ordered results, run sequentially.
        return [double(n) for n in numbers]
`

const CONC_TEST = String.raw`from jobs.runner import run_all


def run_tests(record):
    def maps_in_order():
        assert run_all([1, 2, 3]) == [2, 4, 6], f"got {run_all([1, 2, 3])!r}"

    def empty_input():
        assert run_all([]) == []

    record("maps over the batch in order", maps_in_order)
    record("empty input returns empty", empty_input)
`

const CONC_TEST_HIDDEN = String.raw`from jobs.runner import run_all


def run_tests(record):
    def single_item():
        assert run_all([10]) == [20]

    def negatives_and_zero():
        assert run_all([5, 0, -1]) == [10, 0, -2]

    record("single item", single_item)
    record("negatives and zero", negatives_and_zero)
`

const concurrencyLesson: PythonLesson = {
  id: "py-l4-concurrency",
  title: "Threads, the GIL & concurrent.futures",
  summary: "Choose a concurrency model and parallelize a batch with a thread pool.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["concurrency", "threading", "concurrent-futures", "gil"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Doing more than one thing at once

Every real service waits: on a database, an HTTP API, a file, a message queue. If you fetch 100 URLs one at a time, your program spends nearly all its wall-clock time blocked, doing nothing. Concurrency lets those waits overlap, so 100 slow calls finish in roughly the time of the slowest one instead of the sum of all of them. Choosing the right model (threads, processes, or \`async\`) is a classic interview question because the wrong choice makes code either no faster or outright wrong.

The reason overlapping waits pays off so enormously is that the costs are not close to each other. Each rung below is roughly ten times the one before it:

\`\`\`csdiagram
{
  "type": "ladder",
  "title": "What a Python program is actually waiting on",
  "scale": "log",
  "bands": [
    { "label": "CPU instruction", "value": 1, "display": "~1 ns", "note": "One bytecode step. The GIL serialises these across threads." },
    { "label": "Main memory read", "value": 100, "display": "~100 ns", "note": "A dict lookup or attribute access lands here." },
    { "label": "SSD read", "value": 100000, "display": "~100 μs", "note": "1,000x slower than RAM. The GIL is released while you wait." },
    { "label": "Datacenter round trip", "value": 500000, "display": "~500 μs", "note": "Service to service inside one region." },
    { "label": "Internet API call", "value": 100000000, "display": "~100 ms", "note": "100 million CPU instructions' worth of doing nothing." }
  ],
  "caption": "One HTTP call costs about as much time as 100 million CPU instructions. Overlapping those waits is where nearly all the win comes from, which is why I/O-bound work is the case threads help."
}
\`\`\`

Read the gap between the bottom rung and the top one and the decision rule below almost writes itself: if your program is sitting on the top rung, giving it more cores changes nothing, but letting the waits overlap changes everything.

### The GIL: one bytecode at a time

CPython protects its internal memory with a **Global Interpreter Lock**. Only one thread executes Python bytecode at any instant, so pure-Python threads never run *in parallel* across cores. What rescues threading is that the GIL is **released during blocking I/O** (and inside many C extensions like \`numpy\`). While one thread waits on a socket, it drops the lock and another thread runs. That gives you the decision rule:

- **I/O-bound** work (network, disk, waiting): threads help, because the waits overlap.
- **CPU-bound** work (hashing, parsing, pure-Python math): threads do not help. Use \`ProcessPoolExecutor\` (separate processes, each with its own GIL) or push the work into a native library.

### concurrent.futures: one API for both

\`concurrent.futures\` gives threads and processes the same interface. The common pattern maps a function over inputs:

\`\`\`python
from concurrent.futures import ThreadPoolExecutor

def double(n):
    return n * 2

with ThreadPoolExecutor(max_workers=4) as executor:
    print(list(executor.map(double, [1, 2, 3])))   # [2, 4, 6]
\`\`\`

\`executor.map\` returns results in **input order**, not completion order, even though the tasks finish out of order. Swap in \`ProcessPoolExecutor\` and the code is identical. For finer control, \`executor.submit(fn, x)\` returns a \`Future\`, and \`as_completed(futures)\` yields them as they finish. Two things to remember about \`map\`: it returns a **lazy iterator**, so wrap it in \`list(...)\` when you need a real list (the exercise does), and it re-raises a worker's exception when you iterate to that result, not when you call \`map\`.

### Pitfall: threads sharing state

Independent tasks are safe to parallelize. Shared mutable state is not. \`count += 1\` is read, add, write: three steps, and the interpreter can switch threads between them, so two threads read the same value and one increment is lost. The GIL does not make your code thread-safe. Fix it with a \`Lock\`, or better, design the work so tasks never touch shared state (as \`double\` does here).

### Running where there are no threads

This in-browser sandbox (Pyodide/WASM) has no OS threads, so building a pool raises \`RuntimeError: can't start new thread\`. A portable \`run_all\` tries the pool and falls back to a sequential map, producing identical ordered results everywhere:

\`\`\`python
try:
    with ThreadPoolExecutor(max_workers=4) as executor:
        return list(executor.map(double, numbers))
except RuntimeError:
    return [double(n) for n in numbers]
\`\`\`

**Interview nuance:** Interviewers often follow up with "what is the difference between concurrency and parallelism?" Concurrency is structuring work so tasks make progress by interleaving, which is what a thread pool and \`async\` give you under the GIL. Parallelism is tasks running at the same instant on different cores, which is what a process pool gives you (or the experimental free-threaded no-GIL build added in Python 3.13). So a \`ThreadPoolExecutor\` buys you concurrency and overlaps I/O waits, but only processes buy you CPU parallelism. Naming that distinction, and tying it to the GIL, is exactly the signal they are listening for.`,
    demoCode: `from concurrent.futures import ThreadPoolExecutor


def double(n):
    return n * 2


try:
    with ThreadPoolExecutor(max_workers=4) as executor:
        print(list(executor.map(double, [1, 2, 3])))   # threads where available
except RuntimeError:
    print([double(n) for n in [1, 2, 3]])              # sequential fallback -> [2, 4, 6]`,
  },
  apply: {
    id: "py-l4-concurrency-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`run_all(numbers)\` to return a list with each number doubled, in
order. (This is the sequential baseline; the workspace step parallelizes it.)

\`run_all([1, 2, 3])\` is \`[2, 4, 6]\`.`,
    starterCode: `def run_all(numbers):
    # Return each number doubled, in order.
    pass`,
    hints: ["A comprehension keeps order: `[n * 2 for n in numbers]`.", "Return the new list."],
    referenceSolution: `def run_all(numbers):
    return [n * 2 for n in numbers]`,
    testCases: [
      { input: { numbers: [1, 2, 3] }, expected: [2, 4, 6], description: "doubles in order" },
      { input: { numbers: [] }, expected: [], description: "empty input" },
      { input: { numbers: [10] }, expected: [20], description: "single item" },
      { input: { numbers: [5, 0, -1] }, expected: [10, 0, -2], description: "negatives and zero" },
    ],
  },
  practice: {
    id: "py-l4-concurrency-practice",
    executionMode: "workspace",
    prompt: `Implement \`run_all(numbers)\` in \`jobs/runner.py\`: map the read-only \`double\` worker over
\`numbers\` with a \`concurrent.futures.ThreadPoolExecutor\`, returning the results in input order.
This sandbox has **no OS threads**, so catch the \`RuntimeError\` and fall back to a sequential map.
Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Open a pool inside a `try:`. `with ThreadPoolExecutor(max_workers=4) as executor: return list(executor.map(double, numbers))`.",
      "`executor.map(double, numbers)` runs the work and preserves order.",
      "Add `except RuntimeError: return [double(n) for n in numbers]` so it still works where threads are unavailable.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "jobs/runner.py",
      editableFilePaths: ["jobs/runner.py"],
      visibleTestPaths: ["tests/test_runner.py"],
      hiddenTestPaths: ["tests/test_runner_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CONC_README },
        { path: "jobs/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "jobs/worker.py",
          role: "readonly",
          language: "python",
          content: CONC_WORKER,
          description: "The unit of work (read-only)",
        },
        {
          path: "jobs/runner.py",
          role: "editable",
          language: "python",
          content: CONC_RUNNER_STARTER,
          description: "Implement run_all here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_runner.py",
          role: "test",
          language: "python",
          content: CONC_TEST,
          description: "Visible concurrency tests",
        },
        {
          path: "tests/test_runner_hidden.py",
          role: "test",
          language: "python",
          content: CONC_TEST_HIDDEN,
          hidden: true,
          description: "Hidden concurrency tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_runner",
            "test_runner_hidden",
            "visible runner",
            "hidden runner"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "jobs/runner.py",
          role: "editable",
          language: "python",
          content: CONC_RUNNER_REFERENCE,
        },
      ],
    },
  },
}

const AIO_README = `# Concurrent I/O with asyncio

\`aio/fetch.py\` (read-only) has \`async def fetch_one(n)\`, a **coroutine** standing in for an async
network call. Implement \`fetch_all(numbers)\` in \`aio/gather.py\` so it builds a \`fetch_one(n)\`
coroutine for every number and runs them all, returning the results in order.

Normally you'd write \`asyncio.run(asyncio.gather(*coros))\`. This in-browser sandbox is **already
inside a running event loop**, so \`asyncio.run\` can't be called here. Use the provided
\`run_coroutines\` helper from \`aio.loop\` to run the coroutines instead.

\`fetch_all([1, 2, 3])\` is \`[10, 20, 30]\`. Some tests are hidden.
`

const AIO_FETCH = String.raw`async def fetch_one(n):
    """A coroutine standing in for an async network call."""
    return n * 10
`

const AIO_LOOP = String.raw`def run_coroutines(coros):
    """Run already-created coroutines to completion and collect their results, in order.

    A stand-in for asyncio.run(asyncio.gather(*coros)) for this sandbox, which is already inside a
    running event loop (so asyncio.run can't be used). The coroutines here don't await real I/O, so
    each finishes on its first step.
    """
    results = []
    for coro in coros:
        try:
            coro.send(None)
        except StopIteration as done:
            results.append(done.value)
    return results
`

const AIO_GATHER_STARTER = String.raw`from aio.fetch import fetch_one
from aio.loop import run_coroutines


def fetch_all(numbers):
    """Build a fetch_one(n) coroutine per number and run them all in order (see README.md)."""
    # TODO: pass a fetch_one(n) coroutine for each number to run_coroutines.
    return []
`

const AIO_GATHER_REFERENCE = String.raw`from aio.fetch import fetch_one
from aio.loop import run_coroutines


def fetch_all(numbers):
    return run_coroutines(fetch_one(n) for n in numbers)
`

const AIO_TEST = String.raw`from aio.gather import fetch_all


def run_tests(record):
    def gathers_in_order():
        assert fetch_all([1, 2, 3]) == [10, 20, 30], f"got {fetch_all([1, 2, 3])!r}"

    def empty_input():
        assert fetch_all([]) == []

    record("gathers results in order", gathers_in_order)
    record("empty input returns empty", empty_input)
`

const AIO_TEST_HIDDEN = String.raw`from aio.gather import fetch_all


def run_tests(record):
    def single_item():
        assert fetch_all([5]) == [50]

    def includes_zero():
        assert fetch_all([0, 2]) == [0, 20]

    record("single item", single_item)
    record("includes zero", includes_zero)
`

const asyncioLesson: PythonLesson = {
  id: "py-l4-asyncio",
  title: "async / await & asyncio",
  summary: "Run many I/O tasks concurrently with coroutines and asyncio.gather.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["asyncio", "async-await", "coroutines", "concurrency"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Concurrency on one thread

A web service that fetches 50 URLs spends almost all its time *waiting* on the network, not computing. Threads can overlap that waiting, but you pay for context switches, GIL contention, and locks around shared state. \`asyncio\` overlaps it on a single thread: while one task waits, the loop runs another. Because a task runs uninterrupted until its next \`await\`, you rarely reach for a lock. This is the default tool for I/O-bound fan-out (many network calls or database queries) in modern Python.

### Coroutines are values, not running code

\`async def\` defines a coroutine function. Calling it does not run the body; it returns a coroutine object that is suspended at the top, waiting to be driven:

\`\`\`python
import asyncio

async def fetch_one(n):
    await asyncio.sleep(0.1)   # hands control back to the loop while "waiting"
    return n * 10

coro = fetch_one(1)   # nothing has run yet; coro is a coroutine object
\`\`\`

\`await\` is the only place a coroutine gives up control. Between awaits it runs straight through like ordinary code.

\`\`\`csdiagram
{
  "type": "call-stack",
  "title": "One thread, three coroutines, control moving only at await",
  "steps": [
    { "stack": ["event loop"], "note": "A single thread. The loop holds three ready coroutines." },
    { "stack": ["event loop", "fetch_one(1)"], "note": "Task 1 runs straight through, like ordinary code, until it hits an await." },
    { "stack": ["event loop"], "note": "await hands control back. Task 1 is now WAITING on I/O, not blocking the thread." },
    { "stack": ["event loop", "fetch_one(2)"], "note": "The loop starts task 2 while task 1's I/O is still in flight." },
    { "stack": ["event loop"], "note": "Task 2 awaits as well. Two waits now overlap on one thread." },
    { "stack": ["event loop", "fetch_one(3)"], "note": "And task 3. All three waits are in flight together." },
    { "stack": ["event loop"], "note": "The loop has nothing runnable and simply waits for whichever I/O finishes first." },
    { "stack": ["event loop", "fetch_one(1)"], "returning": "result 1", "note": "Task 1's I/O completed. The loop resumes it exactly where it paused, and it returns." }
  ],
  "caption": "The stack is never deeper than one task, because only one coroutine runs at a time. What overlaps is the WAITING, not the executing. That is also why a blocking call inside a coroutine is fatal: the loop cannot take control back until an await, so nothing else on this thread can progress."
}
\`\`\`

### Overlapping the waiting with gather

\`asyncio.gather\` schedules many coroutines at once and waits for all of them, returning results in **argument order** (not finish order):

\`\`\`python
async def main():
    return await asyncio.gather(fetch_one(1), fetch_one(2), fetch_one(3))

asyncio.run(main())   # [10, 20, 30] after ~0.1s total, not 0.3s
\`\`\`

\`asyncio.run(coro)\` is the one synchronous door into async code: it starts a fresh event loop, runs the coroutine to completion, and closes the loop.

### Why this sandbox uses a helper

\`asyncio.run\` refuses to start when a loop is already running and raises \`RuntimeError\`. This sandbox runs your code *inside* a loop, so it hands you \`run_coroutines(coros)\` instead. It drives each coroutine with \`coro.send(None)\` and reads the return value off the resulting \`StopIteration\`. That works because the sandbox \`fetch_one\` awaits nothing, so a single \`send\` finishes it. You still build real coroutines with \`fetch_one(n)\`; you just pass them to \`run_coroutines\` in place of \`asyncio.run(asyncio.gather(*coros))\`.

### Pitfall: a coroutine you never drive

Calling \`fetch_one(5)\` and treating the result like a number does nothing useful. The body never runs, and Python warns \`RuntimeWarning: coroutine 'fetch_one' was never awaited\`. A coroutine only executes when something awaits it, gathers it, or runs it on a loop. The reverse trap is just as common: never put a blocking call (\`time.sleep\`, a synchronous DB driver, a heavy compute loop) inside a coroutine, because it freezes the whole thread and no other task can make progress.

**Interview nuance:** asyncio is *cooperative*, not preemptive. The event loop can only switch tasks at an \`await\`; it cannot interrupt running code. So \`gather\` speeds up work that spends its time awaiting real I/O, but a CPU-bound coroutine (or a stray \`time.sleep\`) starves every other task on the loop. That is the core reason asyncio scales I/O-bound fan-out yet does nothing for CPU-bound work, where you reach for processes instead.`,
    demoCode: `# Normally: asyncio.run(asyncio.gather(fetch_one(1), fetch_one(2), fetch_one(3)))
# This sandbox is already inside an event loop, so we drive the coroutines directly:
async def fetch_one(n):
    return n * 10


def run_coroutines(coros):
    out = []
    for coro in coros:
        try:
            coro.send(None)
        except StopIteration as done:
            out.append(done.value)
    return out


print(run_coroutines(fetch_one(n) for n in [1, 2, 3]))   # [10, 20, 30]`,
  },
  apply: {
    id: "py-l4-asyncio-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`fetch_all(numbers)\` to build a \`fetch_one(n)\` coroutine for each
number and run them all with the provided \`run_coroutines\` helper, returning the results in order.

(In a normal program you'd write \`asyncio.run(asyncio.gather(*coros))\`; this sandbox is already
inside an event loop, so \`run_coroutines\` stands in for it.)

\`fetch_all([1, 2, 3])\` is \`[10, 20, 30]\`.`,
    starterCode: `async def fetch_one(n):
    return n * 10


def run_coroutines(coros):
    results = []
    for coro in coros:
        try:
            coro.send(None)
        except StopIteration as done:
            results.append(done.value)
    return results


def fetch_all(numbers):
    # TODO: build a fetch_one(n) coroutine for each number and pass them to run_coroutines.
    pass`,
    hints: [
      "Build the coroutines: `fetch_one(n) for n in numbers`.",
      "Hand them to the provided runner: `run_coroutines(fetch_one(n) for n in numbers)`.",
      "Return that result.",
    ],
    referenceSolution: `async def fetch_one(n):
    return n * 10


def run_coroutines(coros):
    results = []
    for coro in coros:
        try:
            coro.send(None)
        except StopIteration as done:
            results.append(done.value)
    return results


def fetch_all(numbers):
    return run_coroutines(fetch_one(n) for n in numbers)`,
    testCases: [
      { input: { numbers: [1, 2, 3] }, expected: [10, 20, 30], description: "gathers in order" },
      { input: { numbers: [] }, expected: [], description: "empty input" },
      { input: { numbers: [5] }, expected: [50], description: "single item" },
    ],
  },
  practice: {
    id: "py-l4-asyncio-practice",
    executionMode: "workspace",
    prompt: `Implement \`fetch_all(numbers)\` in \`aio/gather.py\`: build a \`fetch_one(n)\` coroutine for every
number and run them with the read-only \`run_coroutines\` helper (imported from \`aio.loop\`),
returning the results in order. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "`fetch_one` and `run_coroutines` are already imported for you.",
      "Build one coroutine per number: `fetch_one(n) for n in numbers`.",
      "`return run_coroutines(fetch_one(n) for n in numbers)`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "aio/gather.py",
      editableFilePaths: ["aio/gather.py"],
      visibleTestPaths: ["tests/test_gather.py"],
      hiddenTestPaths: ["tests/test_gather_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: AIO_README },
        { path: "aio/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "aio/fetch.py",
          role: "readonly",
          language: "python",
          content: AIO_FETCH,
          description: "Async fetch_one coroutine (read-only)",
        },
        {
          path: "aio/loop.py",
          role: "readonly",
          language: "python",
          content: AIO_LOOP,
          description: "run_coroutines helper, the sandbox's asyncio.run stand-in (read-only)",
        },
        {
          path: "aio/gather.py",
          role: "editable",
          language: "python",
          content: AIO_GATHER_STARTER,
          description: "Implement fetch_all here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_gather.py",
          role: "test",
          language: "python",
          content: AIO_TEST,
          description: "Visible asyncio tests",
        },
        {
          path: "tests/test_gather_hidden.py",
          role: "test",
          language: "python",
          content: AIO_TEST_HIDDEN,
          hidden: true,
          description: "Hidden asyncio tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_gather",
            "test_gather_hidden",
            "visible gather",
            "hidden gather"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "aio/gather.py",
          role: "editable",
          language: "python",
          content: AIO_GATHER_REFERENCE,
        },
      ],
    },
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L4-M4: Performance & Production Practices
// ───────────────────────────────────────────────────────────────────────────

const PERF_README = `# Make a slow function fast

\`fib\` computes Fibonacci numbers by naive recursion, which recomputes the same subproblems
exponentially. Implement \`fib(n)\` in \`perf/compute.py\` with \`functools.lru_cache\` so each \`n\`
is computed once.

\`fib(0)\` is \`0\`, \`fib(1)\` is \`1\`, \`fib(10)\` is \`55\`. Some tests are hidden.
`

const PERF_COMPUTE_STARTER = String.raw`from functools import lru_cache


def fib(n):
    """Return the nth Fibonacci number (0, 1, 1, 2, 3, 5, ...), see README.md."""
    # TODO: add @lru_cache above this def, and recurse: fib(n-1) + fib(n-2) with a base case.
    return 0
`

const PERF_COMPUTE_REFERENCE = String.raw`from functools import lru_cache


@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
`

const PERF_TEST = String.raw`from perf.compute import fib


def run_tests(record):
    def base_cases():
        assert fib(0) == 0 and fib(1) == 1, f"got fib(0)={fib(0)}, fib(1)={fib(1)}"

    def small_value():
        assert fib(10) == 55, f"expected 55, got {fib(10)!r}"

    record("base cases", base_cases)
    record("fib(10) is 55", small_value)
`

const PERF_TEST_HIDDEN = String.raw`from perf.compute import fib


def run_tests(record):
    def larger_value():
        assert fib(20) == 6765, f"expected 6765, got {fib(20)!r}"

    def cached_is_fast():
        # With lru_cache this returns instantly; the value must still be correct.
        assert fib(30) == 832040, f"expected 832040, got {fib(30)!r}"

    record("fib(20) is 6765", larger_value)
    record("fib(30) is 832040", cached_is_fast)
`

const performanceLesson: PythonLesson = {
  id: "py-l4-performance",
  title: "Profiling, complexity & caching",
  summary: "Find the hot path, fix complexity, and memoize repeated work with lru_cache.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["performance", "lru-cache", "complexity", "profiling"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Make it fast: measure, then fix the right thing

Slow code costs money and latency in production, and the human instinct for *where* it is slow is almost always wrong. Engineers waste hours micro-optimizing a loop that runs once while an accidental \`O(n²)\` scan buried three functions away eats the request budget. The discipline is: measure first, fix algorithmic complexity, then cache repeated work. Only after that do you tune lines.

### Profile before you touch anything

\`cProfile\` runs your code and reports, per function, how many times it was called and how much time it took. \`timeit\` runs a tiny snippet many times for a stable microbenchmark.

\`\`\`python
import cProfile
cProfile.run("slow_function()")
# ncalls  tottime  cumtime  filename:lineno(function)
#  1  0.002  0.900  app.py:12(slow_function)
# 900000  0.850  0.850  app.py:30(lookup)   <- the real hot path
\`\`\`

Read \`tottime\` (time in that function itself) and \`ncalls\`. A function called 900,000 times is your target, not the one that merely *looks* heavy.

### Complexity is the biggest lever

No micro-tuning beats a better data structure. A \`set\` and a \`dict\` are hash maps: membership is average \`O(1)\`. A \`list\` scan is \`O(n)\`.

\`\`\`python
if x in big_set:    # O(1) average
if x in big_list:   # O(n), linear scan every time
\`\`\`

Turning an \`O(n²)\` nested loop into an \`O(n)\` pass with a \`set\` lookup is the difference between a request that returns and one that times out.

### Memory is a lever too: \`__slots__\`

By default every instance carries its own \`__dict__\`, a hash map holding its attributes. That is what
makes \`obj.anything = 1\` work at runtime, and it costs memory on every object you create. Declaring
\`__slots__\` replaces that dict with a fixed set of descriptors:

\`\`\`python
class Point:
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x = x
        self.y = y
\`\`\`

Measured on CPython 3.11 for a two-attribute object, \`sys.getsizeof\` reports 48 bytes with \`__slots__\`
against 56 bytes **plus** a separate per-instance dict without it. Across a million objects that gap
is the difference between fitting in memory and not. Attribute access also gets slightly faster,
because it is an array offset rather than a dict lookup.

The cost is flexibility, and it is worth naming precisely:

- Assigning an undeclared attribute raises \`AttributeError\`, not a silent success. That is often a
  feature: typos in attribute names become errors instead of new attributes.
- There is no \`__dict__\`, so code that introspects one (some serializers, some mocking) breaks.
- A subclass that does not declare its own \`__slots__\` gets a \`__dict__\` back, and the saving with it.

Reach for it when you have many small, fixed-shape objects (points, rows, events, graph nodes). Skip
it for the handful of long-lived service objects, where the memory is irrelevant and the flexibility
is not.

**Interview nuance:** CPython already softens the default case with **key-sharing dictionaries**
(PEP 412): instances of the same class share one copy of their key layout, so the marginal per-instance
dict is smaller than a standalone dict of the same size. That is why the honest claim is "slots remove
the per-instance dict entirely", not a fixed multiplier. If someone quotes you a flat "slots saves 50
percent", the useful follow-up is: measured on which Python, with how many attributes, and against
shared keys or not?

### Cache repeated work with \`lru_cache\`

When a pure function is called repeatedly with the same arguments, \`functools.lru_cache\` stores results keyed by the arguments. Naive \`fib\` recomputes \`fib(n-1)\` and \`fib(n-2)\` down overlapping trees, so it runs in roughly \`O(φⁿ)\` time, where φ ≈ 1.618 is the golden ratio (\`fib(35)\` already triggers tens of millions of calls). Memoization computes each distinct \`n\` exactly once:

\`\`\`python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(10))   # 55
print(fib(30))   # 832040, instant thanks to the cache
\`\`\`

\`@lru_cache(maxsize=None)\` keeps every result; in Python 3.9+ the shorthand is \`@functools.cache\`. This is exactly what the exercises ask for: a memoized \`fib\` where each \`n\` is computed once.

### Generators for memory

A generator streams values instead of building a list, so it uses constant memory over huge sequences:

\`\`\`python
total = sum(x * x for x in range(10_000_000))   # no 10M-element list
\`\`\`

### Pitfalls

- \`lru_cache\` keys on the arguments, so every argument must be **hashable**. \`fib(2)\` is fine; passing a \`list\` or \`dict\` raises \`TypeError: unhashable type\`.
- With \`maxsize=None\` the cache never evicts. That is perfect for \`fib\`, but calling a cached function with millions of distinct arguments leaks memory.
- Recursive \`fib\` recurses \`n\` frames deep, so a cold \`fib(3000)\` hits Python's default recursion limit (\`RecursionError\`) before the cache helps. Warm it incrementally (\`fib(500)\`, then \`fib(1000)\`, ...) so each call only recurses to the first uncached \`n\`, or convert to a loop.

**Interview nuance:** memoization works because \`fib\` has *overlapping subproblems*. There are only \`n + 1\` distinct inputs (\`0\` through \`n\`), each solved once, so the cache collapses exponential time to \`O(n)\` time and \`O(n)\` space. Being able to name that space cost, and the recursion-depth limit, is what separates "I added a decorator" from understanding why it works.`,
    demoCode: `from functools import lru_cache


@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


print(fib(30))   # 832040, instant, thanks to the cache`,
  },
  apply: {
    id: "py-l4-performance-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`fib(n)\` (the nth Fibonacci number) and memoize it with
\`@lru_cache\` so repeated subproblems are computed once.

\`fib(10)\` is \`55\`.`,
    starterCode: `from functools import lru_cache


def fib(n):
    # Add @lru_cache above, then recurse with a base case for n < 2.
    pass`,
    hints: [
      "Base case: `if n < 2: return n`.",
      "Recurse: `return fib(n - 1) + fib(n - 2)`.",
      "Add `@lru_cache(maxsize=None)` on the line above `def fib` to memoize it.",
    ],
    referenceSolution: `from functools import lru_cache


@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)`,
    testCases: [
      { input: { n: 0 }, expected: 0, description: "fib(0)" },
      { input: { n: 1 }, expected: 1, description: "fib(1)" },
      { input: { n: 10 }, expected: 55, description: "fib(10)" },
      { input: { n: 15 }, expected: 610, description: "fib(15)" },
    ],
  },
  practice: {
    id: "py-l4-performance-practice",
    executionMode: "workspace",
    prompt: `Implement \`fib(n)\` in \`perf/compute.py\` with \`functools.lru_cache\` so the recursion is
memoized (each \`n\` computed once). It must return correct Fibonacci values, including for larger
\`n\`. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Decorate the function: `@lru_cache(maxsize=None)` above `def fib(n):`.",
      "Base case `if n < 2: return n`, else `fib(n - 1) + fib(n - 2)`.",
      "The cache is what keeps `fib(30)` instant instead of exponential.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "perf/compute.py",
      editableFilePaths: ["perf/compute.py"],
      visibleTestPaths: ["tests/test_compute.py"],
      hiddenTestPaths: ["tests/test_compute_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PERF_README },
        { path: "perf/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "perf/compute.py",
          role: "editable",
          language: "python",
          content: PERF_COMPUTE_STARTER,
          description: "Implement a memoized fib here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_compute.py",
          role: "test",
          language: "python",
          content: PERF_TEST,
          description: "Visible performance tests",
        },
        {
          path: "tests/test_compute_hidden.py",
          role: "test",
          language: "python",
          content: PERF_TEST_HIDDEN,
          hidden: true,
          description: "Hidden larger-value tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_compute",
            "test_compute_hidden",
            "visible compute",
            "hidden compute"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "perf/compute.py",
          role: "editable",
          language: "python",
          content: PERF_COMPUTE_REFERENCE,
        },
      ],
    },
  },
}

const CFG_README = `# Load typed config from the environment

Twelve-factor apps read config from the **environment**, with defaults and type coercion, and never
leak secrets. \`config/defaults.py\` (read-only) holds the defaults. Implement \`load_config(env)\` in
\`config/settings.py\` so it returns:

\`\`\`python
{"port": <int>, "debug": <bool>, "has_secret": <bool>}
\`\`\`

- \`port\`: \`int\` of \`env["PORT"]\` or the default
- \`debug\`: \`True\` only when \`env["DEBUG"]\` is \`"true"\` (case-insensitive), else the default
- \`has_secret\`: whether \`"SECRET"\` is in \`env\` (record presence, never the value)

Some tests are hidden.
`

const CFG_DEFAULTS = String.raw`DEFAULTS = {"PORT": "8000", "DEBUG": "false"}
`

const CFG_SETTINGS_STARTER = String.raw`from config.defaults import DEFAULTS


def load_config(env):
    """Turn an env dict into typed settings (see README.md)."""
    # TODO: coerce PORT to int, DEBUG to bool, and record whether SECRET is present.
    return {}
`

const CFG_SETTINGS_REFERENCE = String.raw`from config.defaults import DEFAULTS


def load_config(env):
    port = int(env.get("PORT", DEFAULTS["PORT"]))
    debug = env.get("DEBUG", DEFAULTS["DEBUG"]).lower() == "true"
    return {"port": port, "debug": debug, "has_secret": "SECRET" in env}
`

const CFG_TEST = String.raw`from config.settings import load_config


def run_tests(record):
    def reads_and_coerces():
        result = load_config({"PORT": "9000", "DEBUG": "true", "SECRET": "abc"})
        assert result == {"port": 9000, "debug": True, "has_secret": True}, f"got {result!r}"

    def applies_defaults():
        result = load_config({})
        assert result == {"port": 8000, "debug": False, "has_secret": False}, f"got {result!r}"

    record("reads and coerces env", reads_and_coerces)
    record("applies defaults", applies_defaults)
`

const CFG_TEST_HIDDEN = String.raw`from config.settings import load_config


def run_tests(record):
    def debug_is_case_insensitive():
        result = load_config({"DEBUG": "TRUE"})
        assert result == {"port": 8000, "debug": True, "has_secret": False}, f"got {result!r}"

    def never_exposes_secret_value():
        result = load_config({"PORT": "3000", "SECRET": "topsecret"})
        assert result == {"port": 3000, "debug": False, "has_secret": True}, f"got {result!r}"
        assert "topsecret" not in result.values(), "the secret value must not be in the config"

    record("DEBUG is case-insensitive", debug_is_case_insensitive)
    record("never exposes the secret value", never_exposes_secret_value)
`

const configLoggingLesson: PythonLesson = {
  id: "py-l4-config-logging",
  title: "Configuration, secrets & structured logging",
  summary: "Load typed config from the environment, keep secrets safe, and log structured records.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["configuration", "secrets", "structured-logging", "twelve-factor"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Config lives in the environment, not in your code

A service that hard-codes its port, database URL, or feature flags can only run in one place. Twelve-factor apps push all of that into environment variables so a single build artifact runs unchanged in dev, staging, and prod. You change behavior by changing the environment, never by editing and redeploying code. That is also why the demo's \`load_config\` takes an \`env\` dict as an argument instead of reaching into \`os.environ\` directly: passing the environment in keeps the function pure and trivial to test.

### Environment values are always strings

\`os.environ\` (and the \`env\` dict here) maps strings to strings. There are no ints, bools, or lists inside it. Reading config is therefore two steps: supply a default for missing keys, then coerce the string into the type you actually want.

\`\`\`python
port = int(env.get("PORT", "8000"))          # "9000" becomes 9000
debug = env.get("DEBUG", "false").lower() == "true"
\`\`\`

\`env.get("PORT", "8000")\` returns the default only when \`"PORT"\` is absent. If the key exists, you get its string value and must convert it yourself.

### Secrets: record presence, never the value

API keys, tokens, and passwords come from the environment too, but they must never appear in source control or in logs. The safe pattern is to log whether a secret is configured, not what it is:

\`\`\`python
has_secret = "SECRET" in env    # a True/False flag is safe to emit; the value is not
\`\`\`

\`"SECRET" in env\` tests key membership, so it stays \`False\` until the key exists and never reads the value.

### Structured logging

Log machine-readable records, not sentences. Key/value fields let a log system filter and aggregate (for example, find every \`startup\` where \`debug\` was \`True\`):

\`\`\`python
import logging
logger = logging.getLogger(__name__)
logger.info("startup", extra={"port": port, "debug": debug})
\`\`\`

The \`extra\` fields attach to the log record, but they only surface if your handler uses a structured (often JSON) formatter. The default formatter prints just the message text.

### Pitfalls

- \`bool("false")\` is \`True\`. Every non-empty string is truthy, so never coerce a flag with \`bool(...)\`. Compare the lowered string explicitly, as above.
- \`int(env.get("PORT", "8000"))\` raises \`ValueError\` if \`PORT\` is set to \`""\` or \`"abc"\`. A present-but-empty variable is not the same as a missing one, and \`.get\` only defends against the missing case.
- Reusing a reserved field name in \`extra\` (like \`message\` or \`name\`) raises \`KeyError\`. Choose your own keys.

**Interview nuance:** interviewers probe why config should be loaded once, at startup, into a typed object rather than read from \`os.environ\` all over the codebase. Loading once gives you a single place to validate and fail fast, makes the code testable (you inject an \`env\` dict, exactly like this exercise), and guarantees every request sees one consistent snapshot instead of values that could change mid-run.`,
    demoCode: `def load_config(env):
    port = int(env.get("PORT", "8000"))
    debug = env.get("DEBUG", "false").lower() == "true"
    return {"port": port, "debug": debug, "has_secret": "SECRET" in env}


print(load_config({"PORT": "9000", "DEBUG": "true", "SECRET": "x"}))`,
  },
  apply: {
    id: "py-l4-config-logging-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`load_config(env)\` to turn an env dict into
\`{"port": int, "debug": bool, "has_secret": bool}\`. Default \`PORT\` to \`8000\` and \`DEBUG\` to off.
\`debug\` is \`True\` only when \`DEBUG\` is \`"true"\` (any case). \`has_secret\` records whether
\`"SECRET"\` is present (never its value).

\`load_config({})\` is \`{"port": 8000, "debug": False, "has_secret": False}\`.`,
    starterCode: `def load_config(env):
    # Coerce PORT->int (default 8000), DEBUG->bool, and record whether SECRET is present.
    pass`,
    hints: [
      'Port: `int(env.get("PORT", "8000"))` (env values are strings).',
      'Debug: `env.get("DEBUG", "false").lower() == "true"`.',
      'Secret presence (not value): `"SECRET" in env`.',
    ],
    referenceSolution: `def load_config(env):
    port = int(env.get("PORT", "8000"))
    debug = env.get("DEBUG", "false").lower() == "true"
    return {"port": port, "debug": debug, "has_secret": "SECRET" in env}`,
    testCases: [
      {
        input: { env: { PORT: "9000", DEBUG: "true", SECRET: "abc" } },
        expected: { port: 9000, debug: true, has_secret: true },
        description: "reads and coerces",
      },
      {
        input: { env: {} },
        expected: { port: 8000, debug: false, has_secret: false },
        description: "applies defaults",
      },
      {
        input: { env: { DEBUG: "TRUE" } },
        expected: { port: 8000, debug: true, has_secret: false },
        description: "case-insensitive debug",
      },
    ],
  },
  practice: {
    id: "py-l4-config-logging-practice",
    executionMode: "workspace",
    prompt: `Implement \`load_config(env)\` in \`config/settings.py\`: use the read-only \`DEFAULTS\` for \`PORT\`
and \`DEBUG\`, coerce \`PORT\` to \`int\` and \`DEBUG\` to \`bool\` (\`"true"\` case-insensitive), and set
\`has_secret\` from whether \`"SECRET"\` is present, never its value. Some tests are hidden.`,
    starterCode: "",
    hints: [
      'Port: `int(env.get("PORT", DEFAULTS["PORT"]))`.',
      'Debug: `env.get("DEBUG", DEFAULTS["DEBUG"]).lower() == "true"`.',
      'Record presence only: `"has_secret": "SECRET" in env`.',
    ],
    workspace: {
      language: "python",
      primaryFilePath: "config/settings.py",
      editableFilePaths: ["config/settings.py"],
      visibleTestPaths: ["tests/test_settings.py"],
      hiddenTestPaths: ["tests/test_settings_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CFG_README },
        { path: "config/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "config/defaults.py",
          role: "readonly",
          language: "python",
          content: CFG_DEFAULTS,
          description: "Default config values (read-only)",
        },
        {
          path: "config/settings.py",
          role: "editable",
          language: "python",
          content: CFG_SETTINGS_STARTER,
          description: "Implement load_config here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_settings.py",
          role: "test",
          language: "python",
          content: CFG_TEST,
          description: "Visible config tests",
        },
        {
          path: "tests/test_settings_hidden.py",
          role: "test",
          language: "python",
          content: CFG_TEST_HIDDEN,
          hidden: true,
          description: "Hidden config/secret tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_settings",
            "test_settings_hidden",
            "visible settings",
            "hidden settings"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "config/settings.py",
          role: "editable",
          language: "python",
          content: CFG_SETTINGS_REFERENCE,
        },
      ],
    },
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L4-M5: Quality, Packaging & Capstone
// ───────────────────────────────────────────────────────────────────────────

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

const testingToolingLesson: PythonLesson = {
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

Also watch \`assert_called_with\`: it checks only the most recent call. After the demo, \`sender.assert_called_with("a")\` fails because the last call was \`sender("b")\`. Use \`assert_any_call\` when you mean "somewhere in the history."

## The modern tool stack

- \`ruff\`: one very fast tool that lints and formats, replacing \`flake8\`, \`isort\`, and \`black\`.
- \`mypy\` (or \`ty\`): reads your type hints and flags mismatches before runtime.
- \`pytest --cov\` (coverage.py): reports which lines your tests exercised. Cover the branches that matter, not a 100% badge.
- \`pre-commit\`: runs all of these on \`git commit\`, so nothing broken lands.

**Interview nuance:** know what a coverage number does not tell you. \`pytest --cov\` reports line coverage by default, so a line counts as covered the moment it runs once. An \`if\` with no \`else\` can show 100% while the case where the condition is false never executes. Add \`--cov-branch\` to require both directions of each branch, and remember that even full branch coverage only proves the lines ran, not that your assertions checked the right thing.`,
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
          content: buildRunner(
            "test_service",
            "test_service_hidden",
            "visible service",
            "hidden service"
          ),
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

const packagingCapstoneLesson: PythonLesson = {
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

### Pitfalls

- \`int("10.0")\` raises \`ValueError\` because \`"10.0"\` is not an integer literal. Parse decimal strings with \`float("10.0")\`.
- Round once, at the very end. Sum first, then \`round(total, 2)\`. Floats cannot hold most decimals exactly, so \`0.1 + 0.2 == 0.3\` is \`False\` (it is \`0.30000000000000004\`), and rounding after each addition compounds that error.

**Interview nuance:** \`float\` cannot represent most base-10 fractions exactly, so a long chain of price additions drifts. \`round(total, 2)\` cleans up the display but not the stored value, and \`round\` uses banker's rounding, so \`round(0.125, 2)\` gives \`0.12\` (rounded to even), not \`0.13\`. Production money code stores integer cents or uses \`Decimal\`; reach for \`float\` only when a tiny rounding error is acceptable.`,
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
          content: buildRunner(
            "test_orders_report",
            "test_orders_report_hidden",
            "visible report",
            "hidden report"
          ),
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

export const level4: PythonLevel = {
  id: 4,
  slug: "engineering",
  title: "Level 4: Engineering",
  tagline: "Advanced OOP, decorators, concurrency, async, profiling, and packaging.",
  defaultExecutionMode: "workspace",
  estimatedHours: 4,
  modules: [
    {
      id: "py-l4-advanced-oop",
      title: "Advanced OOP & Design Patterns",
      description: "Program to interfaces with ABCs/Protocols and apply SOLID patterns.",
      lessons: [abcProtocolsLesson, solidPatternsLesson],
    },
    {
      id: "py-l4-metaprogramming",
      title: "Decorators & Metaprogramming",
      description: "Parameterized decorators, descriptors, and how classes are created.",
      lessons: [decoratorsAdvancedLesson, descriptorsMetaclassesLesson],
    },
    {
      id: "py-l4-concurrency-async",
      title: "Concurrency & Async",
      description: "Parallelize with threads and run concurrent I/O with asyncio.",
      lessons: [concurrencyLesson, asyncioLesson],
    },
    {
      id: "py-l4-performance-production",
      title: "Performance & Production Practices",
      description: "Profile and cache hot paths, and load typed config with safe secret handling.",
      lessons: [performanceLesson, configLoggingLesson],
    },
    {
      id: "py-l4-quality-packaging",
      title: "Quality, Packaging & Capstone",
      description: "Mock dependencies, use modern tooling, and ship a typed, tested package.",
      lessons: [testingToolingLesson, packagingCapstoneLesson],
    },
  ],
}
