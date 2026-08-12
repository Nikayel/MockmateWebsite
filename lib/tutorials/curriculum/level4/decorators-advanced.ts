// ───────────────────────────────────────────────────────────────────────────
// L4-M2: Decorators & Metaprogramming
// ───────────────────────────────────────────────────────────────────────────

import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

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

export const decoratorsAdvancedLesson: PythonLesson = {
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "which-layer-runs-per-call",
  "prompt": "You drop a print('building') as the first line inside decorator(fn), above the def wrapper line. Three functions are decorated with @multiply_by(3), and each one is then called ten times. How many times does 'building' print?",
  "options": [
    {
      "label": "30, once per call",
      "feedback": "Tempting, because the decorator is what replaced the function, so it feels like it is involved in every call. Only the innermost wrapper is on the call path. The two outer layers finished their work long before."
    },
    {
      "label": "3, once per decorated function",
      "correct": true,
      "feedback": "Right. The @ line is evaluated once per decoration site while the module loads, so both outer layers run three times total and then never again."
    },
    {
      "label": "1, since multiply_by(3) is written the same way in all three places",
      "feedback": "Close, and worth being precise about: multiply_by(3) is a fresh call at every @ line, so it builds three separate decorator objects with three separate closures. Identical source text is not one shared object."
    },
    {
      "label": "0, because nothing runs until the decorated function is called",
      "feedback": "That is how the wrapper body behaves, but the decoration itself is eager: Python evaluates the @ expression at definition time, which is why a broken decorator can blow up on import."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "decorated-function-name",
  "prompt": "add is decorated with @multiply_by(3). A logging line prints add.__name__. What shows up in the logs?",
  "options": [
    {
      "label": "add, because the name add is still what the module exports",
      "feedback": "Tempting, because the module-level name really is add and calling add(2, 3) works. But __name__ is an attribute of the function object, and the object bound to that name is no longer the one you wrote."
    },
    {
      "label": "wrapper, the name of the inner function that replaced it",
      "correct": true,
      "feedback": "Right. Every decorated function in the codebase reports the same name, which is exactly how a whole log stream turns into an unreadable pile of wrapper entries."
    },
    {
      "label": "multiply_by, the decorator that was applied",
      "feedback": "Reasonable, since multiply_by is the name you actually typed at the @ line. But the object that ends up bound to add is what decorator returned, and that is wrapper."
    },
    {
      "label": "An AttributeError, since closures do not carry __name__",
      "feedback": "Closures are ordinary function objects and carry the full set of attributes. The problem is not that __name__ is missing, it is that it describes the wrong function."
    }
  ]
}
\`\`\`

### functools.wraps

\`wrapper\` is a brand-new function object, so by default it reports itself, not the function it replaced:

\`\`\`python
print(add.__name__)   # 'wrapper'  (wrong: this corrupts logs, help(), and tracebacks)
\`\`\`

\`@functools.wraps(fn)\` copies \`fn\`'s \`__name__\`, \`__qualname__\`, \`__doc__\`, and \`__module__\` onto \`wrapper\`, updates \`wrapper.__dict__\`, and sets \`wrapper.__wrapped__ = fn\` so introspection tools can still find the original. With it in place, the demo below prints \`add\`, which is exactly what the second \`print\` verifies. Add \`functools.wraps\` to every real decorator you write.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "factory-without-parentheses",
  "prompt": "In a hurry you write @multiply_by with no parentheses above def add(a, b). What is the first thing that goes wrong?",
  "options": [
    {
      "label": "The import fails right away, because factor was never supplied",
      "feedback": "You would want that, and it is what makes this bug nasty. multiply_by(add) is a perfectly legal call: add just becomes the value of factor, so the module imports without a word."
    },
    {
      "label": "Nothing until add(2, 3) is called, which raises TypeError about positional arguments",
      "correct": true,
      "feedback": "Right. The name add now points at the inner decorator, which takes exactly one argument (fn), so passing two arguments is what finally exposes the missing call."
    },
    {
      "label": "Nothing ever, since factor quietly defaults to 1",
      "feedback": "There is no default in the signature, so nothing can fall back. And even a default would not save you, because the layer bound to add is the wrong one regardless of what factor holds."
    },
    {
      "label": "add(2, 3) returns 5 without multiplying, since the factory was skipped",
      "feedback": "A plausible silent-failure story, and silent failures do happen with decorators. Not here, though: add no longer refers to your function at all, so the original body never runs."
    }
  ]
}
\`\`\`

### Pitfall: forgetting the parentheses

A factory must be called. \`@multiply_by(3)\` is correct; \`@multiply_by\` is not. If you drop the \`(3)\`, Python runs \`multiply_by(add)\`, binds \`factor = add\`, and replaces \`add\` with the inner \`decorator\`. Nothing fails at definition time, so the bug hides until the next call:

\`\`\`python
@multiply_by          # missing (3)
def add(a, b):
    return a + b

add(2, 3)   # TypeError: multiply_by.<locals>.decorator() takes 1 positional argument but 2 were given
\`\`\`

The plain \`@name\` form (no call) is only for decorators that take a function directly. Anything parameterized needs the call.

**Interview nuance:** know when each layer runs. The factory and the \`decorator\` run exactly once, at definition time, when \`@multiply_by(3)\` is evaluated. Only \`wrapper\` runs on every call. So expensive setup (compiling a regex, opening a connection) belongs in the outer layers where it happens once, not inside \`wrapper\`. Each call to \`multiply_by\` also creates a fresh scope, so \`multiply_by(3)\` and \`multiply_by(5)\` capture independent \`factor\` values. The classic late-binding closure bug, where every closure shares one variable, only bites when you reuse the same name, for example building decorators inside a \`for\` loop.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "where-expensive-setup-belongs",
  "prompt": "You are writing @retry(times=3), and deciding where to compile the regex that matches retryable error messages. Compiling is not free. Which layer should own it?",
  "options": [
    {
      "label": "Inside wrapper, so the regex is always fresh for the call it serves",
      "feedback": "Tempting, because keeping setup next to the code that uses it is usually good hygiene. But wrapper is the one layer on the hot path, so you would pay the compile on every single call forever, and the regex never actually varies per call."
    },
    {
      "label": "Inside the factory, before it returns decorator",
      "correct": true,
      "feedback": "Right. The factory runs once per @ line, at import, and its scope is the only one that can see times, so config-dependent setup belongs there and the wrapper just closes over the result."
    },
    {
      "label": "At module top level as a global that every retry decorator shares",
      "feedback": "Close, and for a truly constant regex this is fine and even simpler. It stops working the moment the setup depends on the arguments, because a module-level global cannot see times."
    }
  ],
  "reveal": "The three layers are three different lifetimes: import-time config, import-time per-function setup, and per-call work. Put each piece of work in the outermost layer that can still see everything it needs."
}
\`\`\``,
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
          content: buildRunner([
            { module: "test_decorators", label: "visible decorators" },
            { module: "test_decorators_hidden", label: "hidden decorators" },
          ]),
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
