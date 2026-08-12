import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

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

export const descriptorsMetaclassesLesson: PythonLesson = {
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "how-many-descriptor-objects",
  "prompt": "Account declares balance = Positive() in its class body. A batch job then constructs 1000 Account objects. How many Positive objects exist?",
  "options": [
    {
      "label": "1000, one per account, since each account has its own balance",
      "feedback": "Tempting, because every account really does have its own balance value and the descriptor is what manages it. But balance = Positive() runs once, in the class body, so the descriptor is class state and the values are what live per instance."
    },
    {
      "label": "Exactly one, created when the class body ran",
      "correct": true,
      "feedback": "Right. One descriptor object is shared by every instance, which is precisely why it must never keep the value in self and must write to the instance instead."
    },
    {
      "label": "One per attribute access, built fresh each time Python routes through the protocol",
      "feedback": "Understandable, since the protocol call does look like something being constructed. Python only looks the existing descriptor up on the class and calls a method on it; nothing new is allocated per access."
    },
    {
      "label": "Zero until the first assignment, since descriptors are created lazily",
      "feedback": "Class bodies are not lazy. Every line in a class body runs when the class statement executes, so the descriptor exists before any Account is ever built."
    }
  ]
}
\`\`\`

One detail drives everything: the descriptor object is created **once**, when the class is defined, and shared by every instance. So the per-instance value must be stored on the instance, not on the descriptor. In the demo, \`__set_name__\` runs at class-creation time and records \`storage_name = "_balance"\`, then \`__set__\` stashes the value with \`setattr(instance, "_balance", value)\` and \`__get__\` reads it back. \`Account(100).balance\` returns \`100\`; \`Account(0)\` is fine; \`Account(-5)\` raises \`ValueError\` and cannot be bypassed.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "storage-name-collision-recursion",
  "prompt": "The underscore in storage_name looks like a style choice, so you simplify __set_name__ to self.storage_name = name. What does Account(100) do now?",
  "options": [
    {
      "label": "Works fine. The class attribute and the instance dict are separate namespaces, so there is no collision",
      "feedback": "Tempting, and for an ordinary class attribute it would be exactly right. But a descriptor that defines __set__ takes priority over the instance dict, so setattr does not quietly write to it, it calls the descriptor again."
    },
    {
      "label": "Raises RecursionError, because setattr re-enters __set__ forever",
      "correct": true,
      "feedback": "Right. setattr(instance, 'balance', value) is the same operation that got you into __set__, so the underscore is not cosmetic, it is what points the write at a name the descriptor does not own."
    },
    {
      "label": "Raises ValueError, because the descriptor now validates its own output",
      "feedback": "The validation would indeed run again on the way back in, but 100 passes it every time, so it never trips. What kills the call is depth, not the check."
    },
    {
      "label": "Stores the value, but reads of acct.balance now return the Positive object",
      "feedback": "That is what you see with a non-data descriptor, or with a plain class attribute shadowed on the instance. Here __set__ exists, so the write never completes to begin with."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "why-property-cannot-self-cache",
  "prompt": "functools.cached_property computes once, writes the result into instance.__dict__, and later reads come straight from that dict with no recomputation. Why can @property not cache itself the same way?",
  "options": [
    {
      "label": "property is implemented in C, so it has no way to write into instance.__dict__",
      "feedback": "Plausible, and being written in C does explain some of property's speed. It has full access to the instance though, so writing the entry is not the obstacle. Reading it back is."
    },
    {
      "label": "property defines __set__, so it always wins over instance.__dict__ and the cached entry would never be read",
      "correct": true,
      "feedback": "Right. That is the data descriptor rule in one sentence: define __set__ or __delete__ and you take priority over the instance dict, which is also why nobody can shadow a property by assigning to it."
    },
    {
      "label": "property recomputes on purpose, so the value stays correct when the fields behind it change",
      "feedback": "That is the design intent, and it is why you would still pick property for a value derived from mutable state. The question is mechanism, though: even if property wanted to cache, the lookup order would defeat it."
    },
    {
      "label": "Caching would need __set_name__, and property does not implement it",
      "feedback": "Reasonable, since __set_name__ is how a descriptor learns the attribute name it was assigned to. cached_property does use it, but that is bookkeeping. The blocker for property is precedence, not naming."
    }
  ]
}
\`\`\`

**Interview nuance:** descriptors come in two flavors and the difference decides precedence. A **data descriptor** defines \`__set__\` or \`__delete__\` and *wins over* the instance \`__dict__\`. A **non-data descriptor** defines only \`__get__\` and *loses to* it. That is why \`@property\` (data) cannot be shadowed by an instance attribute, while \`functools.cached_property\` (non-data) writes its result into \`instance.__dict__\` on first access and is then read straight from the dict on later calls, skipping recomputation.

### The peek at metaclasses

A metaclass is "the class of a class". The default is \`type\`, and \`class Account: ...\` is roughly \`Account = type("Account", (), namespace)\`. A custom metaclass hooks class creation to register, validate, or inject methods:

\`\`\`python
class Meta(type):
    def __new__(mcls, name, bases, namespace):
        return super().__new__(mcls, name, bases, namespace)

class Thing(metaclass=Meta): ...
\`\`\`

You will rarely write one. \`abc.ABCMeta\`, \`enum.Enum\`, and Django models use them under the hood. Note that \`@dataclass\` is a class *decorator*, not a metaclass, so \`type(SomeDataclass) is type\`. Knowing classes are objects built by \`type\` is what dissolves the "magic".

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "which-one-is-not-a-metaclass",
  "prompt": "All three of these change what a class does, and all three get called metaclass tricks in conversation. Which one is not built on a metaclass?",
  "options": [
    {
      "label": "abc.ABC, which refuses to instantiate a class that still has unimplemented abstract methods",
      "feedback": "This one really is a metaclass: ABCMeta is what tracks the abstract names and installs the gate in object construction. Subclassing ABC is just the polite way to opt into it."
    },
    {
      "label": "enum.Enum, where the assignments in the class body become singleton members",
      "feedback": "Also a genuine metaclass. Ordinary class creation would leave those as plain class attributes, so something has to intercept the namespace and rebuild them as members."
    },
    {
      "label": "@dataclass, which generates __init__ and __repr__ from the annotations",
      "correct": true,
      "feedback": "Right. It is an ordinary class decorator that runs after the class object already exists and adds methods to it, which is why type(SomeDataclass) is still type."
    }
  ],
  "reveal": "A class is an object, so anything you can do while building it you can usually also do to it afterwards. That is why the jobs people reach for metaclasses for (registering subclasses, validating a class body, adding methods) are almost always better served by a class decorator or by __init_subclass__, both of which a reviewer can read without knowing the metaclass protocol."
}
\`\`\``,
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
          content: buildRunner([
            { module: "test_positive_field", label: "visible account" },
            { module: "test_positive_field_hidden", label: "hidden account" },
          ]),
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
