// ───────────────────────────────────────────────────────────────────────────
// L4-M1: Advanced OOP & Design Patterns
// ───────────────────────────────────────────────────────────────────────────

import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

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

export const abcProtocolsLesson: PythonLesson = {
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "abstractmethod-fires-at-instantiation",
  "prompt": "A teammate writes class Circle(Shape) but forgets to define area(). When does Python complain?",
  "options": [
    {
      "label": "At class definition time, as soon as the module is imported",
      "feedback": "Tempting, because that is when the interpreter reads the class body and could compare it against the base. But ABCs only record which abstract names are still missing at definition time; nothing is rejected yet."
    },
    {
      "label": "At instantiation, when someone calls Circle(2)",
      "correct": true,
      "feedback": "Right. The gate lives in object construction, so a class with a missing abstract method imports cleanly and looks fine until the first Circle(2) raises TypeError."
    },
    {
      "label": "The first time something calls circle.area()",
      "feedback": "Close, and that is exactly what happens if the base raises NotImplementedError from an ordinary method instead of using @abstractmethod. The decorator moves the failure earlier, to construction, which is the whole reason to prefer it."
    },
    {
      "label": "Never, because Python does not enforce abstract methods",
      "feedback": "True of a bare base class whose method body is just pass, and true of Protocols. But abc.ABC installs a real runtime gate: ABCMeta refuses to build an instance while any abstract name is unimplemented."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "abc-or-protocol",
  "prompt": "Sort each situation into the tool that fits it.",
  "buckets": ["Reach for an ABC", "Reach for a Protocol"],
  "items": [
    {
      "label": "You own every implementer and want to ship a concrete helper method they all inherit",
      "bucket": "Reach for an ABC",
      "feedback": "Shared code can only live on a base class. A Protocol describes a shape and carries no implementation to inherit."
    },
    {
      "label": "You want to accept a class from a library you cannot edit, as long as it has the right method",
      "bucket": "Reach for a Protocol",
      "feedback": "Structural typing is the only option here. You cannot make a third-party class inherit from a base you wrote."
    },
    {
      "label": "You want the interpreter itself to refuse a half-finished implementation",
      "bucket": "Reach for an ABC",
      "feedback": "@abstractmethod is the only one of the two with a runtime gate. Protocol conformance is checked by mypy, never by the interpreter."
    },
    {
      "label": "You want mypy to verify that two unrelated classes both satisfy one contract",
      "bucket": "Reach for a Protocol",
      "feedback": "Neither class needs to know the other exists, or that the contract exists. Having the right members is the whole requirement."
    }
  ]
}
\`\`\`

That last row of the table is the one people trip over, because "checked by a type checker" is easy to read as "checked, eventually, somehow":

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "protocol-isinstance-runtime",
  "prompt": "You want a runtime guard, so you write: if isinstance(circle, HasArea). The Circle instance does define area(). What happens?",
  "options": [
    {
      "label": "It returns True, since Circle has the method the protocol lists",
      "feedback": "Tempting, because that is exactly what the protocol means and what mypy concludes. But a plain Protocol cannot be used with isinstance at all, so the call never gets as far as inspecting Circle."
    },
    {
      "label": "It returns False, since Circle never inherits from HasArea",
      "feedback": "That is how an ABC would answer, because ABCs are nominal. Protocols never ask about inheritance, and the real problem here is one step earlier: the isinstance call itself is rejected."
    },
    {
      "label": "It raises TypeError unless HasArea is decorated with @runtime_checkable",
      "correct": true,
      "feedback": "Right. And even with the decorator the check only confirms that the method names exist, never their signatures or return types."
    },
    {
      "label": "It raises TypeError no matter what, since protocols exist only for static checkers",
      "feedback": "Almost. That is the default behavior, but @runtime_checkable exists precisely to opt a protocol into isinstance, so the gate is opt-in rather than impossible."
    }
  ]
}
\`\`\`

### Pitfalls

- A subclass that forgets even one abstract method stays abstract itself. Remove \`area\` from \`Rectangle\` and \`Rectangle(3, 4)\` raises \`TypeError\`. The failure comes at construction time, not when the class is defined, so a broken subclass can look fine until someone builds one.
- A \`Protocol\` is not enforced at runtime by default. \`isinstance(obj, HasArea)\` raises \`TypeError\` unless you decorate the protocol with \`@runtime_checkable\`, and even then the check only confirms the method name exists, never its signature or return type.

**Interview nuance:** ABCs use nominal subtyping (you conform by declaring the parent) while Protocols use structural subtyping (you conform by having the right members). Protocol conformance is verified by a static type checker such as \`mypy\` or \`pyright\`, not by the interpreter. At runtime \`total_area\` runs on anything with an \`area()\` method regardless of annotations, because Python is already duck-typed. The Protocol does not add a runtime gate; it makes the contract explicit and machine-checkable before you ship.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "which-failure-is-real-at-runtime",
  "prompt": "Three things go wrong in one afternoon. Which one does the interpreter itself reject, with no type checker involved?",
  "options": [
    {
      "label": "A Circle that defines area() but subclasses nothing is passed to total_area(shapes: list[HasArea])",
      "feedback": "Tempting, because it looks like a contract being violated. But annotations are inert at runtime, and structurally the Circle fits anyway, so this runs and returns the right number."
    },
    {
      "label": "Rectangle subclasses Shape, its area() was dropped in a bad merge, and someone calls Rectangle(3, 4)",
      "correct": true,
      "feedback": "Right. @abstractmethod is the one runtime gate of the three: ABCMeta refuses to construct an instance while an abstract name is unimplemented, so this raises TypeError."
    },
    {
      "label": "A Square with area() subclasses object instead of Shape and is passed to a function annotated list[Shape]",
      "feedback": "Close, and mypy flags this one loudly because list[Shape] is nominal. At runtime the annotation is never consulted, so the call succeeds and sums correctly."
    }
  ],
  "reveal": "Exactly one of the three is enforced by the interpreter, and it is the ABC construction gate. Everything else here is caught by mypy before you ship, or not at all. That gap is the practical difference between nominal and structural typing."
}
\`\`\``,
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
          content: buildRunner([
            { module: "test_shapes", label: "visible shapes" },
            { module: "test_shapes_hidden", label: "hidden shapes" },
          ]),
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
