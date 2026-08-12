import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

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

export const solidPatternsLesson: PythonLesson = {
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "which-principle-blocks-the-test",
  "prompt": "OrderService builds its own Postgres client inside __init__, so a unit test has no way to swap in a fake. Which principle does that break first?",
  "options": [
    {
      "label": "Single responsibility, because the class both connects to the database and processes orders",
      "feedback": "Tempting, and it is the answer most people reach for because SRP is the one principle everyone remembers. Constructing a dependency is not really a second responsibility, though. The blocker is that the caller cannot supply a different one."
    },
    {
      "label": "Dependency inversion, because the service depends on the concrete client instead of an abstraction it is handed",
      "correct": true,
      "feedback": "Right. Take the client as a constructor argument and the test passes a fake, the production code passes the real one, and OrderService stops caring which it got."
    },
    {
      "label": "Open/closed, because you have to edit OrderService to test it",
      "feedback": "Close, and the two often travel together, since inverted dependencies are what make extension cheap. But open/closed is about adding new behavior without editing, and here the problem is that the dependency is hard-wired at all."
    },
    {
      "label": "Interface segregation, because the client exposes more methods than OrderService uses",
      "feedback": "That is a real smell and worth naming in review, but it is not what stops the test. Even a one-method client would still be unswappable while the service constructs it itself."
    }
  ]
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "strategy-signature-is-the-contract",
  "prompt": "A teammate adds a bulk tier whose discount depends on the item count, so they write def bulk(amount, count) and register it next to the others. The caller still does strategy(amount). What happens for a bulk customer?",
  "options": [
    {
      "label": "It works. A dict can hold any callable, so bulk is a perfectly good value to store",
      "feedback": "Half right, and that is why the bug ships: the dict genuinely accepts it and the registration line looks fine. The mismatch only surfaces at the call, where one argument is passed and two are required."
    },
    {
      "label": "TypeError, because bulk is missing a required positional argument",
      "correct": true,
      "feedback": "Right. The shared signature is the real interface here, not the dict. A strategy that needs extra data has to get it another way, for example by being a closure that already captured the count."
    },
    {
      "label": "count silently defaults to None and the price comes back wrong",
      "feedback": "That would happen if the parameter had been written as count=None, which is a real and worse failure mode because it is silent. As written there is no default, so Python refuses the call outright."
    },
    {
      "label": "Only the type checker complains, since Python does not enforce arity at runtime",
      "feedback": "Python is loose about types but strict about arity: the call itself is rejected before the body runs. Annotations are unenforced at runtime, argument counts are not."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "dispatch-table-raises-or-prices",
  "prompt": "Four versions of the same dispatch, all with price_for(kind, amount) calling strategy(amount). Sort each by what the customer sees.",
  "buckets": ["Blows up", "Returns a price"],
  "items": [
    {
      "label": "STRATEGIES = {'member': member}, then STRATEGIES.get('member', regular)(100)",
      "bucket": "Returns a price",
      "feedback": "The dict stores the function object itself, so the lookup hands back something callable and calling it with 100 gives 90.0."
    },
    {
      "label": "STRATEGIES = {'member': member(100)}, then STRATEGIES.get('member', regular)(100)",
      "bucket": "Blows up",
      "feedback": "member(100) ran while the dict was being built, so the value stored is the float 90.0. Calling it raises TypeError: 'float' object is not callable."
    },
    {
      "label": "STRATEGIES['student'](100), where no student key was ever registered",
      "bucket": "Blows up",
      "feedback": "Square-bracket lookup on a missing key raises KeyError, and a new tier reaching checkout before someone registers it is exactly how that ships."
    },
    {
      "label": "STRATEGIES.get('student', regular)(100), where no student key was ever registered",
      "bucket": "Returns a price",
      "feedback": "The default argument to get is the safety net: an unregistered tier falls back to regular and pays full price instead of crashing checkout."
    }
  ]
}
\`\`\`

### Two traps interns hit

Store the function, not its result. \`{"member": member}\` stores the callable; \`{"member": member(100)}\` calls it immediately and stores the number \`90.0\`, so a later \`strategy(amount)\` raises \`TypeError: 'float' object is not callable\`.

Handle the unknown key. \`STRATEGIES[kind]\` raises \`KeyError\` for a tier you have not registered. Use \`STRATEGIES.get(kind, regular)\` so an unknown \`kind\` falls back to full price, which is what the exercises require.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "why-the-table-beats-the-chain",
  "prompt": "You are in review defending the dispatch table over the if/elif chain, and there are only five tiers. What is the strongest argument?",
  "options": [
    {
      "label": "One hash lookup instead of up to five comparisons, so pricing gets faster",
      "feedback": "True on paper and the first thing most candidates say, but five string comparisons are nanoseconds and nobody profiled this. Leading with speed signals that you reach for micro-optimisation before design."
    },
    {
      "label": "Adding a tier touches zero existing lines, so nothing that already passes can regress",
      "correct": true,
      "feedback": "Right. Open/closed is a blast-radius argument, not a speed one. That is also why routers, command handlers, and plugin registries all end up as dispatch tables."
    },
    {
      "label": "The dict version is shorter, so there is less code to read",
      "feedback": "Often true, and brevity is worth something, but it is a weak defence: someone can always rewrite the chain into a compact ternary and your argument evaporates. Blast radius survives that rewrite."
    }
  ],
  "reveal": "Both answers are correct facts. Only one of them is a reason. The dispatch table wins because adding behavior stops being an edit to code that already works, which is the entire point of open/closed."
}
\`\`\`

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
          content: buildRunner([
            { module: "test_checkout", label: "visible checkout" },
            { module: "test_checkout_hidden", label: "hidden checkout" },
          ]),
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
