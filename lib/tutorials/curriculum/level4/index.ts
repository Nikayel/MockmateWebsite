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
every subclass. That's **polymorphism**.

### Protocols (structural)

\`abc\` uses **inheritance** (a class declares "I am a Shape"). A \`Protocol\` types by **shape**.
Any object with an \`area()\` method qualifies, no inheritance needed:

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
\`Rectangle\` shape, first standalone, then as a real \`Shape\` subclass in a package.`,
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
    markdown: `## SOLID, in practice

**SOLID** is five design principles. The two you'll feel most:

- **S**ingle responsibility: a module/class does one thing.
- **O**pen/closed: open to extension, closed to modification, so you add behaviour *without* editing
  existing code.

A long \`if/elif\` chain violates open/closed. Every new case edits the same function. Two patterns
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

Adding a "student" discount is one new function plus one dict entry. \`price_for\` never changes.
That's open/closed.

### Recap

Strategy makes behaviour a pluggable value; a factory selects it by key. Together they replace
branching with a lookup and keep code open for extension. You'll build \`price_for\`, first inline,
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

Read \`@multiply_by(3)\` as \`add = multiply_by(3)(add)\`: call the factory, then apply the decorator
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

Always add \`functools.wraps\` to real decorators, because debuggers, logs, and \`help()\` depend on it.

### Recap

A parameterized decorator is a factory returning a decorator returning a wrapper; \`*args/**kwargs\`
forwards any call and \`functools.wraps\` preserves the original's identity. You'll build
\`multiply_by\`, first inline, then over a \`decorators\` package.`,
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
    markdown: `## Customizing attribute access

### Descriptors

A **descriptor** is a class that defines \`__get__\`/\`__set__\` and is used as a *class attribute*.
Python routes attribute access through it, perfect for validation that lives in one place:

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

Now \`Account(100).balance\` is \`100\`, but \`Account(-5)\` raises. The validation can't be
bypassed. \`__set_name__\` runs when the owning class is created and tells the descriptor which
attribute name it's bound to.

### Metaclasses (the peek)

A **metaclass** is "the class of a class": it controls how classes themselves are built. The
default is \`type\`; \`class Account:\` is roughly \`Account = type("Account", (), {...})\`.

\`\`\`python
class Meta(type):
    def __new__(mcls, name, bases, namespace):
        # runs once, when the class is defined, register it, validate it, inject methods
        return super().__new__(mcls, name, bases, namespace)

class Thing(metaclass=Meta):
    ...
\`\`\`

You'll rarely write one (dataclasses, ORMs, and \`abc\` use them under the hood), but knowing
classes are objects built by \`type\` demystifies a lot of "magic".

### Recap

Descriptors put reusable get/set logic behind a class attribute; metaclasses customize class
creation itself (\`type\` is the default). You'll build a \`Positive\` descriptor that validates an
account balance, first inline, then across a \`models\` package.`,
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
          content: buildRunner(
            "test_account",
            "test_account_hidden",
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

### The GIL

CPython's **Global Interpreter Lock** lets only one thread run Python bytecode at a time. So:

- **I/O-bound** work (network, disk, waiting): **threads help**, because while one thread waits, another
  runs.
- **CPU-bound** work (number crunching): threads *don't* speed it up; use **multiprocessing**
  (separate processes, separate GILs) or a native library.

### concurrent.futures: one clean API

\`concurrent.futures\` gives the same interface for both pools. The simplest pattern maps a function
over inputs:

\`\`\`python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(fetch, urls))   # results stay in input order
\`\`\`

Swap \`ThreadPoolExecutor\` for \`ProcessPoolExecutor\` for CPU-bound work. The code stays the same. For finer
control, \`executor.submit(fn, x)\` returns a \`Future\`, and \`as_completed(futures)\` yields them as
they finish.

### Safety

Independent tasks (no shared mutable state) are safe to parallelize. If threads share state, guard it
with a \`Lock\`, but prefer designing the work so they don't.

### When threads aren't available

Some runtimes have no OS threads at all, notably this in-browser sandbox (Pyodide/WASM without
cross-origin isolation). There, building a pool raises \`RuntimeError: can't start new thread\`. A
resilient \`run_all\` **tries the pool and falls back to a sequential map**, so it works everywhere
and the ordered results are identical:

\`\`\`python
try:
    with ThreadPoolExecutor(max_workers=4) as executor:
        return list(executor.map(double, numbers))
except RuntimeError:
    return [double(n) for n in numbers]
\`\`\`

### Recap

The GIL means threads help I/O-bound but not CPU-bound work; \`concurrent.futures\` maps work over a
pool with order preserved; and capability-detecting a missing feature (here, threads) keeps code
portable. You'll run a batch through a \`ThreadPoolExecutor\` with a sequential fallback.`,
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
    markdown: `## Concurrency without threads

\`asyncio\` runs many I/O-bound tasks on **one** thread by cooperatively switching whenever a task
*awaits*. No locks, no GIL contention: ideal for thousands of network calls.

### Coroutines

An \`async def\` defines a **coroutine**. Calling it doesn't run it; it returns a coroutine object
you must \`await\` (or run on the event loop):

\`\`\`python
import asyncio

async def fetch_one(n):
    await asyncio.sleep(0.1)   # yields control while "waiting"
    return n * 10
\`\`\`

### Running concurrently with gather

\`asyncio.gather\` schedules many coroutines at once and waits for all of them, returning results in
order:

\`\`\`python
async def main():
    return await asyncio.gather(fetch_one(1), fetch_one(2), fetch_one(3))

asyncio.run(main())    # [10, 20, 30], the three "waits" overlap
\`\`\`

\`asyncio.run(coro)\` starts the event loop, runs the coroutine to completion, and closes the loop.
It's the one synchronous entry point into async code.

### Running it in this sandbox

\`asyncio.run\` only works when **no** loop is already running. This in-browser sandbox runs your code
*inside* an event loop, so calling \`asyncio.run\` here raises \`RuntimeError: cannot be called from a
running event loop\`. So the exercise gives you a \`run_coroutines(coros)\` helper that runs
already-created coroutines and collects their results. It's the sandbox's stand-in for
\`asyncio.run(asyncio.gather(*coros))\`. You still build real coroutines with \`fetch_one(n)\`; you
just hand them to \`run_coroutines\` instead of \`asyncio.run\`.

### await vs sequential

Awaiting each call one-by-one would be sequential; \`gather\` overlaps the waiting, so N slow calls
take about as long as the slowest one, **but only when each coroutine actually \`await\`s real I/O**
(a network or disk call that yields control). The \`fetch_one\` coroutines in this sandbox don't await
anything real, so \`run_coroutines\` here just runs them in order to show the shape of the code; the
speedup you get in production comes entirely from overlapping real waiting, not from \`gather\` itself.

### Recap

\`async def\` makes a coroutine, \`await\` suspends until it's ready, and \`asyncio.gather\` runs many
concurrently, driven by \`asyncio.run\` in a normal program, or \`run_coroutines\` in this sandbox.
You'll build a batch of \`fetch_one\` coroutines and collect their ordered results.`,
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
    markdown: `## Making code fast: measure first

### Profile before optimizing

Don't guess where time goes. Measure. \`cProfile\` and \`timeit\` show the real hot spots:

\`\`\`python
import cProfile
cProfile.run("slow_function()")   # per-call counts and time
\`\`\`

Optimize the few lines that dominate, not the ones that *look* slow.

### Complexity is the big lever

Algorithmic complexity beats micro-tuning. A set lookup is O(1) vs a list scan's O(n):

\`\`\`python
if x in big_set:     # O(1)
if x in big_list:    # O(n)
\`\`\`

### Caching with lru_cache

Repeated calls with the same arguments? \`functools.lru_cache\` memoizes results, turning an
exponential recursion into a linear one:

\`\`\`python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
\`\`\`

Without the cache, \`fib(35)\` recomputes the same subproblems billions of times; with it, each \`n\`
is computed once.

### Generators for memory

A generator streams values instead of building a giant list, using constant memory for huge sequences:

\`\`\`python
total = sum(x * x for x in range(10_000_000))   # no list materialized
\`\`\`

### Recap

Profile to find the hot path, fix complexity first, memoize repeated work with \`lru_cache\`, and
stream with generators to save memory. You'll make a slow recursive \`fib\` fast with \`lru_cache\`.`,
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
    markdown: `## Configuration, secrets & logging

### Config from the environment

Twelve-factor apps read config from the **environment**, not hard-coded constants, so the same
build runs in dev and prod. Provide sensible **defaults** and **coerce** types (env values are
strings):

\`\`\`python
port = int(env.get("PORT", "8000"))
debug = env.get("DEBUG", "false").lower() == "true"
\`\`\`

### Secrets

Never hard-code or log secret values. Read them from the environment, and when logging, record
*whether* something is set, not the value:

\`\`\`python
config = {"has_secret": "SECRET" in env}   # safe to log; the value never is
\`\`\`

### Structured logging

Log machine-readable records (key/value or JSON), not prose, so logs are searchable and
aggregatable:

\`\`\`python
import logging
logger = logging.getLogger(__name__)
logger.info("startup", extra={"port": port, "debug": debug})
\`\`\`

### Recap

Read config from the environment with defaults and type coercion, keep secrets out of code and logs
(track presence, not value), and log structured records. You'll build a \`load_config\` that turns an
env dict into typed settings.`,
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
    markdown: `## Robust tests & clean tooling

### Mocking dependencies

Tests shouldn't hit the network, a database, or the clock. **Inject** the dependency so a test can
pass a stand-in. \`unittest.mock.Mock\` records how it was called:

\`\`\`python
from unittest.mock import Mock

def send_all(sender, messages):     # sender is injected
    for m in messages:
        sender(m)
    return len(messages)

sender = Mock()
send_all(sender, ["a", "b"])
sender.call_count            # 2
sender.assert_any_call("a")  # was it called with "a"?
\`\`\`

Designing for injection (passing the dependency in) is what makes code testable in the first place.

### Coverage

\`pytest --cov\` (coverage.py) reports which lines your tests actually exercise. Aim to cover the
**branches that matter**, not chase 100% for its own sake.

### Modern tooling

- **ruff**: an extremely fast linter + formatter (replaces flake8/isort/black).
- **mypy** / **ty**: static type checkers that read your hints.
- **pre-commit**: runs ruff/mypy/tests automatically on \`git commit\`, so problems never land.

\`\`\`toml
# .pre-commit-config.yaml runs these on every commit
- ruff check --fix
- mypy .
\`\`\`

### Recap

Inject dependencies so you can mock them; measure with coverage; and let ruff/mypy/pre-commit keep
quality high automatically. You'll build an injectable \`send_all\` that a \`Mock\` can verify.`,
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
    markdown: `## Packaging & distribution

### From project to package

A library others can install is built from your \`pyproject.toml\` into a **wheel**:

\`\`\`bash
uv build            # produces dist/orders-1.0.0-py3-none-any.whl
uv publish          # (or twine upload) to a package index
\`\`\`

The wheel bundles your code + metadata so \`pip install orders\` just works. \`pyproject.toml\`
declares the name, version, Python requirement, and dependencies (including a \`dev\` extra for
\`pytest\`/\`ruff\`/\`mypy\`).

### The production checklist

A library ready to ship is:

- **structured**: a clean package with a clear entry point
- **typed**: hints on the public API so callers (and mypy) know the contract
- **validated**: untrusted input parsed into typed models at the boundary
- **tested**: pytest covering the real cases, run in CI

### Your capstone

This pulls the whole track together: a packaged \`orders\` service with a typed \`Order\` model and
validation (read-only) and a real \`pyproject.toml\`. Implement \`summarize(raw_orders)\` (parse the
raw orders and report total count, paid count, and paid revenue) and make the suite green.

### Recap

\`pyproject.toml\` + \`uv build\` turn a project into an installable wheel; a production-ready library
is structured, typed, validated, and tested. Finish the capstone to complete the Python path.`,
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
      visibleTestPaths: ["tests/test_report.py"],
      hiddenTestPaths: ["tests/test_report_hidden.py"],
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
          path: "tests/test_report.py",
          role: "test",
          language: "python",
          content: CAPSTONE_TEST,
          description: "Visible capstone tests",
        },
        {
          path: "tests/test_report_hidden.py",
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
            "test_report",
            "test_report_hidden",
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
  title: "Level 4: Codebase",
  tagline: "Work across real files: follow imports, change a function, prove it with a test.",
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
