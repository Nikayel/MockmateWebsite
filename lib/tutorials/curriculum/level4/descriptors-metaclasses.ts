import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// Practice workspace: a declarative device-settings schema.
//
// Apply is one descriptor holding one value on one class. Practice is what a
// descriptor is actually FOR: several Setting objects coexist on one class, so
// per-instance, per-name storage via __set_name__ is genuinely required and a
// shared store visibly fails; reads before any write must fall back to a
// default; class-level access has to hand back the descriptor itself. The
// second editable file is the metaclass-adjacent payoff the lesson title
// promises: __init_subclass__ collects the declared fields into a registry,
// which is how dataclasses, ORMs and pydantic all work.
//
// The hidden suite exists to catch the classic shared-state bug specifically:
// a class-level dict inside the descriptor passes every single-instance test.
// ───────────────────────────────────────────────────────────────────────────

const SETTINGS_README = `# DEV-318: device profiles need real settings

\`schema/profiles.py\` (read-only) declares device profiles by listing settings in the class body,
for example \`brightness = Setting(minimum=0, maximum=100, default=50)\`. Nothing behind those
declarations is implemented yet. Two files are yours.

## \`schema/fields.py\`

\`Setting\` is the descriptor behind every declared setting. It must:

- return that setting's \`default\` when the attribute has never been written on this profile object
- raise \`ValueError\` from a write whose value is outside \`minimum\` to \`maximum\` inclusive
- store a valid write so that reading it back returns it, while no other profile object and no
  other setting on the same object sees that value
- return the \`Setting\` object itself when it is read off the class instead of an instance, so
  tooling can inspect \`minimum\`, \`maximum\` and \`default\`

## \`schema/profile.py\`

\`Profile\` is the base class every profile inherits. It must give each subclass:

- \`SETTINGS\`, a dict from declared setting name to its \`Setting\` object, in declaration order,
  including settings inherited from a parent profile and excluding a child's settings from the
  parent's own registry
- a constructor \`Profile(**overrides)\` that applies each override through the same validation a
  plain assignment gets, and raises \`ValueError\` for a name that is not a declared setting
- \`settings_snapshot()\`, returning a dict from every declared setting name to its current value

Some tests are hidden.
`

const SETTINGS_FIELDS_STARTER = String.raw`class Setting:
    """One declared, validated setting on a device profile (see README.md)."""

    def __init__(self, minimum, maximum, default):
        self.minimum = minimum
        self.maximum = maximum
        self.default = default

    def __set_name__(self, owner, name):
        self.name = name
        # TODO: record a storage name this descriptor does not itself own.

    def __get__(self, instance, owner):
        # TODO: handle class-level access, and reads that happen before any write.
        return None

    def __set__(self, instance, value):
        # TODO: reject out-of-range values, and store the rest where the README says they live.
        pass
`

const SETTINGS_FIELDS_REFERENCE = String.raw`class Setting:
    """One declared, validated setting on a device profile."""

    def __init__(self, minimum, maximum, default):
        self.minimum = minimum
        self.maximum = maximum
        self.default = default

    def __set_name__(self, owner, name):
        self.name = name
        self.storage_name = "_setting_" + name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return getattr(instance, self.storage_name, self.default)

    def __set__(self, instance, value):
        if value < self.minimum or value > self.maximum:
            raise ValueError(
                f"{self.name} must be between {self.minimum} and {self.maximum}, got {value!r}"
            )
        setattr(instance, self.storage_name, value)
`

const SETTINGS_PROFILE_STARTER = String.raw`from schema.fields import Setting


class Profile:
    """Base class for declarative device profiles (see README.md)."""

    SETTINGS = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        # TODO: give this subclass its own SETTINGS registry, inherited names first.

    def __init__(self, **overrides):
        # TODO: apply each override, rejecting names that were never declared.
        pass

    def settings_snapshot(self):
        # TODO: report the current value of every declared setting.
        return {}
`

const SETTINGS_PROFILE_REFERENCE = String.raw`from schema.fields import Setting


class Profile:
    """Base class for declarative device profiles."""

    SETTINGS = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        collected = {}
        for base in cls.__bases__:
            collected.update(getattr(base, "SETTINGS", {}))
        for name, value in vars(cls).items():
            if isinstance(value, Setting):
                collected[name] = value
        cls.SETTINGS = collected

    def __init__(self, **overrides):
        for name, value in overrides.items():
            if name not in type(self).SETTINGS:
                raise ValueError(f"unknown setting {name!r}")
            setattr(self, name, value)

    def settings_snapshot(self):
        return {name: getattr(self, name) for name in type(self).SETTINGS}
`

const SETTINGS_PROFILES = String.raw`"""The declared device profiles (read-only)."""

from schema.fields import Setting
from schema.profile import Profile


class CameraProfile(Profile):
    brightness = Setting(minimum=0, maximum=100, default=50)
    contrast = Setting(minimum=0, maximum=100, default=40)
    fps = Setting(minimum=1, maximum=60, default=30)


class NightCameraProfile(CameraProfile):
    gain = Setting(minimum=0, maximum=8, default=2)
`

const SETTINGS_TEST = String.raw`from schema.profiles import CameraProfile


def run_tests(record):
    def unwritten_settings_read_as_defaults():
        profile = CameraProfile()
        got = (profile.brightness, profile.contrast, profile.fps)
        assert got == (50, 40, 30), f"expected the declared defaults (50, 40, 30), got {got!r}"

    def a_valid_write_reads_back():
        profile = CameraProfile()
        profile.brightness = 80
        assert profile.brightness == 80, f"expected 80 after writing 80, got {profile.brightness!r}"

    def an_out_of_range_write_is_rejected():
        profile = CameraProfile()
        try:
            profile.brightness = 101
            raised = None
        except ValueError as exc:
            raised = exc
        assert raised is not None, (
            "expected ValueError when writing 101 to brightness (max 100), got no exception and "
            f"a stored value of {profile.brightness!r}"
        )

    def the_registry_lists_declared_settings():
        got = list(CameraProfile.SETTINGS)
        assert got == ["brightness", "contrast", "fps"], (
            f"expected CameraProfile.SETTINGS to list ['brightness', 'contrast', 'fps'], got {got!r}"
        )

    def overrides_are_applied_at_construction():
        got = CameraProfile(brightness=70, fps=24).settings_snapshot()
        expected = {"brightness": 70, "contrast": 40, "fps": 24}
        assert got == expected, f"expected {expected!r}, got {got!r}"

    record("unwritten settings read as their defaults", unwritten_settings_read_as_defaults)
    record("a valid write reads back", a_valid_write_reads_back)
    record("an out-of-range write is rejected", an_out_of_range_write_is_rejected)
    record("the registry lists the declared settings", the_registry_lists_declared_settings)
    record("constructor overrides reach the snapshot", overrides_are_applied_at_construction)
`

const SETTINGS_TEST_HIDDEN = String.raw`"""Hidden tests: they ask WHERE each value lives, not whether one value round-trips."""

from schema.fields import Setting
from schema.profiles import CameraProfile, NightCameraProfile


def run_tests(record):
    def two_profiles_do_not_share_a_value():
        first = CameraProfile()
        second = CameraProfile()
        first.brightness = 10
        second.brightness = 90
        assert first.brightness == 10, (
            f"expected the first profile to keep brightness 10, got {first.brightness!r}. A second "
            "profile writing 90 overwrote it, so the value is living on the shared Setting object "
            "rather than on each profile."
        )
        assert second.brightness == 90, f"expected 90, got {second.brightness!r}"

    def one_setting_does_not_overwrite_another():
        profile = CameraProfile()
        profile.brightness = 80
        profile.contrast = 12
        got = (profile.brightness, profile.contrast, profile.fps)
        assert got == (80, 12, 30), (
            f"expected (80, 12, 30), got {got!r}. Each setting needs its own storage name, so a "
            "write to one does not land in the slot another one reads."
        )

    def a_write_does_not_disturb_other_profiles_defaults():
        written = CameraProfile(brightness=90)
        untouched = CameraProfile()
        assert untouched.brightness == 50, (
            f"expected an untouched profile to still read the default 50, got "
            f"{untouched.brightness!r}, so the default is being cached on the descriptor."
        )
        assert written.brightness == 90, f"expected 90, got {written.brightness!r}"

    def the_lower_bound_is_inclusive_and_below_it_raises():
        profile = CameraProfile()
        profile.fps = 1
        assert profile.fps == 1, f"expected fps 1 to be accepted (min 1), got {profile.fps!r}"
        try:
            profile.fps = 0
            raised = None
        except ValueError as exc:
            raised = exc
        assert raised is not None, (
            f"expected ValueError when writing 0 to fps (min 1), got no exception and {profile.fps!r}"
        )

    def class_access_returns_the_descriptor():
        got = CameraProfile.brightness
        assert isinstance(got, Setting), (
            f"expected CameraProfile.brightness to be the Setting object itself, got {got!r}"
        )
        bounds = (got.minimum, got.maximum, got.default)
        assert bounds == (0, 100, 50), f"expected bounds (0, 100, 50), got {bounds!r}"

    def a_subclass_inherits_the_registry_without_leaking_back():
        child = list(NightCameraProfile.SETTINGS)
        assert child == ["brightness", "contrast", "fps", "gain"], (
            f"expected the child registry to be ['brightness', 'contrast', 'fps', 'gain'], got {child!r}"
        )
        parent = list(CameraProfile.SETTINGS)
        assert parent == ["brightness", "contrast", "fps"], (
            f"expected the parent registry to stay ['brightness', 'contrast', 'fps'], got {parent!r}"
        )
        snapshot = NightCameraProfile(gain=5).settings_snapshot()
        expected = {"brightness": 50, "contrast": 40, "fps": 30, "gain": 5}
        assert snapshot == expected, f"expected {expected!r}, got {snapshot!r}"

    def an_undeclared_override_is_rejected():
        try:
            CameraProfile(zoom=3)
            raised = None
        except ValueError as exc:
            raised = exc
        assert raised is not None, (
            "expected ValueError for the undeclared setting 'zoom', got no exception"
        )

    record("two profiles do not share one value", two_profiles_do_not_share_a_value)
    record("one setting does not overwrite another", one_setting_does_not_overwrite_another)
    record("a write leaves other profiles on their defaults", a_write_does_not_disturb_other_profiles_defaults)
    record("the lower bound is inclusive", the_lower_bound_is_inclusive_and_below_it_raises)
    record("class access returns the descriptor", class_access_returns_the_descriptor)
    record("a subclass inherits the registry", a_subclass_inherits_the_registry_without_leaking_back)
    record("an undeclared override is rejected", an_undeclared_override_is_rejected)
`

export const descriptorsMetaclassesLesson: PythonLesson = {
  id: "py-l4-descriptors-metaclasses",
  title: "Descriptors & a peek at metaclasses",
  summary: "Customize attribute access with a descriptor and understand how classes are created.",
  estimatedMinutes: 28,
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
    prompt: `Build the settings layer behind the device profiles in \`schema/profiles.py\`, which declare
their settings in the class body and are read-only. Implement the \`Setting\` descriptor in
\`schema/fields.py\` so a declared setting validates its range, falls back to its default before
anything is written, and is inspectable from the class. Implement the \`Profile\` base class in
\`schema/profile.py\` so every subclass gains a registry of the settings it declares, a constructor
that applies overrides, and a snapshot of its current values. \`README.md\` states the full contract.
Some tests are hidden.`,
    starterCode: "",
    hints: [
      "One `Setting` object is created per declared name when the class body runs, and every profile object shares it, so decide where a written value has to live before you write `__set__`. In `schema/profile.py`, note that the registry has to be built once per subclass rather than once per profile object.",
      "`__set_name__` is where each descriptor can learn a storage name of its own, `__get__` is called with `instance` set to `None` for class-level access, and `getattr` takes a third argument for the name that was never written. `__init_subclass__` runs as each subclass is created and can read the class body it was given.",
      'In `__get__`: `if instance is None: return self`, then `return getattr(instance, self.storage_name, self.default)`. In `__init_subclass__`, start from `getattr(base, "SETTINGS", {})` for each entry in `cls.__bases__`, then add the entries of `vars(cls)` whose value passes `isinstance(value, Setting)`, and assign the result to `cls.SETTINGS`.',
    ],
    workspace: {
      language: "python",
      primaryFilePath: "schema/fields.py",
      editableFilePaths: ["schema/fields.py", "schema/profile.py"],
      visibleTestPaths: ["tests/test_settings.py"],
      hiddenTestPaths: ["tests/test_settings_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: SETTINGS_README },
        { path: "schema/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "schema/fields.py",
          role: "editable",
          language: "python",
          content: SETTINGS_FIELDS_STARTER,
          description: "Implement the Setting descriptor here",
        },
        {
          path: "schema/profile.py",
          role: "editable",
          language: "python",
          content: SETTINGS_PROFILE_STARTER,
          description: "Implement the Profile base class here",
        },
        {
          path: "schema/profiles.py",
          role: "readonly",
          language: "python",
          content: SETTINGS_PROFILES,
          description: "The declared device profiles (read-only)",
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
          content: SETTINGS_TEST,
          description: "Visible settings tests",
        },
        {
          path: "tests/test_settings_hidden.py",
          role: "test",
          language: "python",
          content: SETTINGS_TEST_HIDDEN,
          hidden: true,
          description: "Hidden settings tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_settings", label: "visible settings" },
            { module: "test_settings_hidden", label: "hidden settings" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "schema/fields.py",
          role: "editable",
          language: "python",
          content: SETTINGS_FIELDS_REFERENCE,
        },
        {
          path: "schema/profile.py",
          role: "editable",
          language: "python",
          content: SETTINGS_PROFILE_REFERENCE,
        },
      ],
    },
  },
}
