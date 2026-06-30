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

// ───────────────────────────────────────────────────────────────────────────
// L4-M2 — Decorators & Metaprogramming
// ───────────────────────────────────────────────────────────────────────────

const DEC_README = `# A decorator that takes an argument

Build a **parameterized** decorator. Implement \`multiply_by(factor)\` in
\`decorators/wrappers.py\` — a decorator *factory* that returns a decorator which multiplies the
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

A plain decorator takes a function. A **decorator with arguments** is one level deeper: a *factory*
that takes the arguments and *returns* a decorator.

\`\`\`python
def multiply_by(factor):          # 1. takes the argument
    def decorator(fn):            # 2. the actual decorator
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs) * factor   # 3. wraps the call
        return wrapper
    return decorator

@multiply_by(3)
def add(a, b):
    return a + b

add(2, 3)    # 15
\`\`\`

Read \`@multiply_by(3)\` as \`add = multiply_by(3)(add)\` — call the factory, then apply the decorator
it returns.

### functools.wraps

A wrapper hides the original's \`__name__\` and docstring. \`@functools.wraps(fn)\` copies them across
so the wrapped function still looks like itself:

\`\`\`python
import functools

def multiply_by(factor):
    def decorator(fn):
        @functools.wraps(fn)          # keep fn's name/doc
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs) * factor
        return wrapper
    return decorator
\`\`\`

Always add \`functools.wraps\` to real decorators — debuggers, logs, and \`help()\` depend on it.

### Recap

A parameterized decorator is a factory returning a decorator returning a wrapper; \`*args/**kwargs\`
forwards any call and \`functools.wraps\` preserves the original's identity. You'll build
\`multiply_by\` — first inline, then over a \`decorators\` package.`,
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
    prompt: `Warm-up (one file): implement \`multiply_by(factor)\` — a decorator factory that multiplies a
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
          content: buildRunner("test_decorators", "test_decorators_hidden", "visible decorators", "hidden decorators"),
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
    markdown: `## Customizing attribute access

### Descriptors

A **descriptor** is a class that defines \`__get__\`/\`__set__\` and is used as a *class attribute*.
Python routes attribute access through it — perfect for validation that lives in one place:

\`\`\`python
class Positive:
    def __set_name__(self, owner, name):
        self.storage_name = "_" + name          # remember where to stash the value

    def __get__(self, instance, owner):
        return getattr(instance, self.storage_name)

    def __set__(self, instance, value):
        if value < 0:
            raise ValueError("must be non-negative")
        setattr(instance, self.storage_name, value)

class Account:
    balance = Positive()       # the descriptor guards every Account.balance
\`\`\`

Now \`Account(100).balance\` is \`100\`, but \`Account(-5)\` raises — the validation can't be
bypassed. \`__set_name__\` runs when the owning class is created and tells the descriptor which
attribute name it's bound to.

### Metaclasses (the peek)

A **metaclass** is "the class of a class" — it controls how classes themselves are built. The
default is \`type\`; \`class Account:\` is roughly \`Account = type("Account", (), {...})\`.

\`\`\`python
class Meta(type):
    def __new__(mcls, name, bases, namespace):
        # runs once, when the class is defined — register it, validate it, inject methods
        return super().__new__(mcls, name, bases, namespace)

class Thing(metaclass=Meta):
    ...
\`\`\`

You'll rarely write one — dataclasses, ORMs, and \`abc\` use them under the hood — but knowing
classes are objects built by \`type\` demystifies a lot of "magic".

### Recap

Descriptors put reusable get/set logic behind a class attribute; metaclasses customize class
creation itself (\`type\` is the default). You'll build a \`Positive\` descriptor that validates an
account balance — first inline, then across a \`models\` package.`,
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
      visibleTestPaths: ["tests/test_account.py"],
      hiddenTestPaths: ["tests/test_account_hidden.py"],
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
          path: "tests/test_account.py",
          role: "test",
          language: "python",
          content: DESC_TEST,
          description: "Visible descriptor tests",
        },
        {
          path: "tests/test_account_hidden.py",
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
          content: buildRunner("test_account", "test_account_hidden", "visible account", "hidden account"),
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
    {
      id: "py-l4-metaprogramming",
      title: "Decorators & Metaprogramming",
      description: "Parameterized decorators, descriptors, and how classes are created.",
      lessons: [decoratorsAdvancedLesson, descriptorsMetaclassesLesson],
    },
  ],
}
