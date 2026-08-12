// ───────────────────────────────────────────────────────────────────────────
// L4-M1: Advanced OOP & Design Patterns
// ───────────────────────────────────────────────────────────────────────────

import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ── Practice workspace: one export pipeline that uses BOTH tools at once ────────────────────
// The practice exercise is deliberately unrelated to the apply Rectangle: the graded skill is
// choosing between nominal (ABC) and structural (Protocol) conformance and knowing which of the
// two the interpreter actually enforces, and when.

const EXPORT_README = buildBrief({
  lesson: "py-l4-abc-protocols",
  kind: "ticket",
  headline: "wire up the export pipeline",
  body: String.raw`The reporting service renders rows through two different kinds of writer, and the two kinds
conform to the contract in two different ways.

## Read-only background

- \`pipeline/base.py\` defines the abstract base class \`Exporter\`. It declares \`header()\` and
  \`render(row)\` abstract, and it ships one concrete helper, \`render_all(rows)\`, that every
  subclass inherits.
- \`pipeline/contracts.py\` defines the runtime-checkable protocol \`Renderer\`, which describes
  the same two methods as a shape rather than as a parent.
- \`pipeline/vendor.py\` holds three classes you cannot edit: \`VendorTsvWriter\`,
  \`VendorCounter\` (it never got a \`render\`), and \`HalfBuiltExporter\` (a teammate's
  in-progress \`Exporter\` subclass whose \`render\` never landed).

A row is a dict shaped like \`{"id": "a1", "amount": 30}\`.

## What to write

### \`pipeline/exporters.py\`

- \`CsvExporter\` must conform nominally, so that it inherits \`render_all\` from the base.
  \`header()\` returns \`"id,amount"\` and \`render(row)\` returns \`"a1,30"\`.
- \`AuditLine\` is vendored into another service that must not receive the \`Exporter\`
  hierarchy, so it must conform structurally and must not inherit anything of ours.
  \`header()\` returns \`"event"\` and \`render(row)\` returns \`"a1=30"\`.

### \`pipeline/registry.py\`

- \`classify(renderer)\` returns \`"nominal"\`, \`"structural"\`, or \`"none"\`.
- \`register(registry, key, renderer)\` stores the renderer under \`key\` and returns the
  registry, but raises \`TypeError\` when the renderer does not satisfy the contract.
- \`try_construct(factory)\` calls \`factory()\` and returns the instance, or \`None\` when
  construction is refused.
- \`export_rows(renderer, rows)\` returns the header line followed by one rendered line per row.
  It must reuse the base class helper whenever the renderer is entitled to it.
`,
})

const EXPORT_BASE = String.raw`from abc import ABC, abstractmethod


class Exporter(ABC):
    """Nominal contract: you conform by inheriting, and you inherit render_all in return."""

    @abstractmethod
    def header(self):
        """Return the header line."""
        raise NotImplementedError

    @abstractmethod
    def render(self, row):
        """Return one rendered line for a row dict."""
        raise NotImplementedError

    def render_all(self, rows):
        return [self.header()] + [self.render(row) for row in rows]
`

const EXPORT_CONTRACTS = String.raw`from typing import Protocol, runtime_checkable


@runtime_checkable
class Renderer(Protocol):
    """Structural contract: anything with these two methods counts, whatever its parents."""

    def header(self):
        ...

    def render(self, row):
        ...
`

const EXPORT_VENDOR = String.raw`from pipeline.base import Exporter


class VendorTsvWriter:
    """Ships in a package you cannot edit, so it can never subclass Exporter."""

    def header(self):
        return "id\tamount"

    def render(self, row):
        return f"{row['id']}\t{row['amount']}"


class VendorCounter:
    """Also vendored, but it never got a render method."""

    def header(self):
        return "count"


class HalfBuiltExporter(Exporter):
    """A teammate's branch: header landed, render did not."""

    def header(self):
        return "id,amount"
`

const EXPORT_EXPORTERS_STARTER = String.raw`class CsvExporter:
    # TODO: make CsvExporter conform to the Exporter contract the way that earns render_all.
    def header(self):
        return ""

    def render(self, row):
        return ""


class AuditLine:
    # TODO: make AuditLine conform to the Renderer contract without inheriting from us.
    def header(self):
        return ""

    def render(self, row):
        return ""
`

const EXPORT_EXPORTERS_REFERENCE = String.raw`from pipeline.base import Exporter


class CsvExporter(Exporter):
    def header(self):
        return "id,amount"

    def render(self, row):
        return f"{row['id']},{row['amount']}"


class AuditLine:
    def header(self):
        return "event"

    def render(self, row):
        return f"{row['id']}={row['amount']}"
`

const EXPORT_REGISTRY_STARTER = String.raw`from pipeline.base import Exporter
from pipeline.contracts import Renderer


def classify(renderer):
    """Return "nominal", "structural", or "none". See README.md."""
    # TODO: report how this renderer conforms, checking the stricter contract first.
    return "none"


def register(registry, key, renderer):
    """Store renderer under key and return registry. See README.md."""
    # TODO: refuse renderers that satisfy neither contract.
    registry[key] = renderer
    return registry


def try_construct(factory):
    """Call factory() and return the instance, or None if it is refused. See README.md."""
    # TODO: decide which failure this has to survive, and when that failure happens.
    return factory()


def export_rows(renderer, rows):
    """Return the header line plus one line per row. See README.md."""
    # TODO: reuse the base class helper when the renderer is entitled to it.
    return []
`

const EXPORT_REGISTRY_REFERENCE = String.raw`from pipeline.base import Exporter
from pipeline.contracts import Renderer


def classify(renderer):
    """Return "nominal", "structural", or "none"."""
    if isinstance(renderer, Exporter):
        return "nominal"
    if isinstance(renderer, Renderer):
        return "structural"
    return "none"


def register(registry, key, renderer):
    """Store renderer under key and return registry."""
    if classify(renderer) == "none":
        raise TypeError(f"{type(renderer).__name__} does not satisfy the Renderer contract")
    registry[key] = renderer
    return registry


def try_construct(factory):
    """Call factory() and return the instance, or None if it is refused."""
    try:
        return factory()
    except TypeError:
        return None


def export_rows(renderer, rows):
    """Return the header line plus one line per row."""
    if isinstance(renderer, Exporter):
        return renderer.render_all(rows)
    return [renderer.header()] + [renderer.render(row) for row in rows]
`

const EXPORT_TEST = String.raw`from pipeline.exporters import AuditLine, CsvExporter
from pipeline.registry import classify, export_rows, register
from pipeline.vendor import VendorCounter, VendorTsvWriter

ROWS = [{"id": "a1", "amount": 30}, {"id": "b2", "amount": 7}]


def run_tests(record):
    def csv_renders_one_row():
        line = CsvExporter().render(ROWS[0])
        assert line == "a1,30", f"expected 'a1,30', got {line!r}"

    def csv_inherits_render_all():
        lines = CsvExporter().render_all(ROWS)
        expected = ["id,amount", "a1,30", "b2,7"]
        assert lines == expected, f"expected {expected}, got {lines!r}"

    def classify_reports_how_each_one_conforms():
        assert classify(CsvExporter()) == "nominal", (
            f"expected 'nominal' for CsvExporter, got {classify(CsvExporter())!r}"
        )
        assert classify(VendorTsvWriter()) == "structural", (
            f"expected 'structural' for VendorTsvWriter, got {classify(VendorTsvWriter())!r}"
        )
        assert classify(VendorCounter()) == "none", (
            f"expected 'none' for VendorCounter, got {classify(VendorCounter())!r}"
        )

    def register_keeps_conformers_and_rejects_the_rest():
        registry = {}
        returned = register(registry, "csv", CsvExporter())
        assert returned is registry, f"expected register to return the same dict, got {returned!r}"
        assert list(registry) == ["csv"], f"expected keys ['csv'], got {list(registry)!r}"
        try:
            register(registry, "counter", VendorCounter())
            raised = "nothing"
        except TypeError:
            raised = "TypeError"
        assert raised == "TypeError", f"expected TypeError for VendorCounter, got {raised}"

    def audit_line_exports_structurally():
        lines = export_rows(AuditLine(), ROWS)
        expected = ["event", "a1=30", "b2=7"]
        assert lines == expected, f"expected {expected}, got {lines!r}"

    record("csv renders one row", csv_renders_one_row)
    record("csv inherits render_all", csv_inherits_render_all)
    record("classify reports how each one conforms", classify_reports_how_each_one_conforms)
    record("register rejects non-conformers", register_keeps_conformers_and_rejects_the_rest)
    record("audit line exports structurally", audit_line_exports_structurally)
`

const EXPORT_TEST_HIDDEN = String.raw`from pipeline.base import Exporter
from pipeline.exporters import AuditLine, CsvExporter
from pipeline.registry import export_rows, try_construct
from pipeline.vendor import HalfBuiltExporter, VendorCounter, VendorTsvWriter

ROWS = [{"id": "a1", "amount": 30}, {"id": "b2", "amount": 7}]


def run_tests(record):
    def audit_line_does_not_inherit():
        assert not issubclass(AuditLine, Exporter), (
            f"expected AuditLine to be no subclass of Exporter, got mro {AuditLine.__mro__!r}"
        )
        has_helper = hasattr(AuditLine(), "render_all")
        assert has_helper is False, (
            f"expected AuditLine to carry no render_all, got hasattr {has_helper!r}"
        )

    def incomplete_abc_subclass_is_refused_at_construction():
        built = try_construct(HalfBuiltExporter)
        assert built is None, f"expected None for HalfBuiltExporter, got {built!r}"

    def incomplete_duck_class_still_constructs():
        built = try_construct(VendorCounter)
        assert built is not None, "expected an instance for VendorCounter, got None"
        assert isinstance(built, VendorCounter), (
            f"expected a VendorCounter instance, got {type(built).__name__}"
        )

    def vendor_exports_without_the_base_helper():
        lines = export_rows(VendorTsvWriter(), ROWS)
        expected = ["id\tamount", "a1\t30", "b2\t7"]
        assert lines == expected, f"expected {expected}, got {lines!r}"

    def empty_rows_still_produce_a_header():
        csv_lines = export_rows(CsvExporter(), [])
        assert csv_lines == ["id,amount"], f"expected ['id,amount'], got {csv_lines!r}"
        audit_lines = export_rows(AuditLine(), [])
        assert audit_lines == ["event"], f"expected ['event'], got {audit_lines!r}"

    record("audit line does not inherit", audit_line_does_not_inherit)
    record("incomplete ABC subclass refused at construction", incomplete_abc_subclass_is_refused_at_construction)
    record("incomplete duck class still constructs", incomplete_duck_class_still_constructs)
    record("vendor exports without the base helper", vendor_exports_without_the_base_helper)
    record("empty rows still produce a header", empty_rows_still_produce_a_header)
`

export const abcProtocolsLesson: PythonLesson = {
  id: "py-l4-abc-protocols",
  title: "ABCs & Protocols",
  summary: "Define interfaces with abc and Protocol, then program to the abstraction.",
  estimatedMinutes: 45,
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
      "feedback": "@abstractmethod is the only one of the two that refuses the object outright: instantiating a class with an unimplemented abstract method raises TypeError. A Protocol never blocks construction. It can be checked at runtime, but only if you opt in with @runtime_checkable and only by asking isinstance yourself, and even then it just looks for the method names."
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
    prompt: `Finish the reporting service's export pipeline, which has to carry two kinds of writer at
once: writers you own, and writers that ship from a vendor package nobody here can edit.

Write the two exporters in \`pipeline/exporters.py\` and the four registry functions in
\`pipeline/registry.py\`, to the contract in \`README.md\`. \`CsvExporter\` must end up with the
base class helper \`render_all\`; \`AuditLine\` must end up without it. The registry has to sort
vendor classes into the ones that satisfy the contract and the ones that do not, and it has to
survive a teammate's half-finished subclass without crashing the run.

Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Two of the classes in play satisfy the contract by having the right methods, and one satisfies it by declaring a parent. Only one of those two facts buys you inherited code.",
      "`classify` has to test the stricter contract first, because a nominal conformer is also a structural one. `try_construct` needs a `try`/`except` around the call itself, not around a later method call.",
      "You can ask `isinstance` about both contracts, including the protocol, because `pipeline/contracts.py` decorates it `@runtime_checkable`. So `classify` is not two different kinds of check, it is the same check twice in the right order. `export_rows` has two branches for the same reason: one of them rebuilds the header-plus-rows list itself, and the other has already inherited a method that does exactly that.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "pipeline/exporters.py",
      editableFilePaths: ["pipeline/exporters.py", "pipeline/registry.py"],
      visibleTestPaths: ["tests/test_pipeline.py"],
      hiddenTestPaths: ["tests/test_pipeline_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: EXPORT_README },
        { path: "pipeline/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "pipeline/base.py",
          role: "readonly",
          language: "python",
          content: EXPORT_BASE,
          description: "Exporter abstract base class (read-only)",
        },
        {
          path: "pipeline/contracts.py",
          role: "readonly",
          language: "python",
          content: EXPORT_CONTRACTS,
          description: "Renderer protocol (read-only)",
        },
        {
          path: "pipeline/vendor.py",
          role: "readonly",
          language: "python",
          content: EXPORT_VENDOR,
          description: "Vendor and half-finished classes you cannot edit (read-only)",
        },
        {
          path: "pipeline/exporters.py",
          role: "editable",
          language: "python",
          content: EXPORT_EXPORTERS_STARTER,
          description: "Write CsvExporter and AuditLine here",
        },
        {
          path: "pipeline/registry.py",
          role: "editable",
          language: "python",
          content: EXPORT_REGISTRY_STARTER,
          description: "Write classify, register, try_construct, and export_rows here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_pipeline.py",
          role: "test",
          language: "python",
          content: EXPORT_TEST,
          description: "Visible pipeline tests",
        },
        {
          path: "tests/test_pipeline_hidden.py",
          role: "test",
          language: "python",
          content: EXPORT_TEST_HIDDEN,
          hidden: true,
          description: "Hidden conformance and construction tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_pipeline", label: "visible pipeline" },
            { module: "test_pipeline_hidden", label: "hidden pipeline" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "pipeline/exporters.py",
          role: "editable",
          language: "python",
          content: EXPORT_EXPORTERS_REFERENCE,
        },
        {
          path: "pipeline/registry.py",
          role: "editable",
          language: "python",
          content: EXPORT_REGISTRY_REFERENCE,
        },
      ],
    },
  },
}
