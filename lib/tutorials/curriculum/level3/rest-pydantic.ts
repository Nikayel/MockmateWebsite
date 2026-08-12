import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const API_README = `# Fetch then validate

Never trust raw external data. Validate it at the boundary. \`api/client.py\` (read-only) simulates
an HTTP fetch returning a raw dict. Implement \`parse_user(raw)\` in \`api/models.py\` so it coerces
the fields into a typed \`User\` dataclass:

- \`id\` -> \`int\`
- \`name\` -> \`str\`
- \`active\` -> \`bool\`

A missing field should raise (a \`KeyError\` is fine). Some tests are hidden.
`

const API_CLIENT = String.raw`def fetch_user(user_id):
    """Pretend to GET /users/{id} and return the raw JSON body (httpx would do this for real)."""
    data = {
        "1": {"id": "1", "name": "Ada", "active": 1},
        "2": {"id": "2", "name": "Sam", "active": 0},
    }
    return data[str(user_id)]
`

const API_MODELS_STARTER = String.raw`from dataclasses import dataclass


@dataclass
class User:
    id: int
    name: str
    active: bool


def parse_user(raw):
    """Validate a raw user dict into a typed User (see README.md)."""
    # TODO: coerce raw["id"], raw["name"], raw["active"] and build a User.
    return None
`

const API_MODELS_REFERENCE = String.raw`from dataclasses import dataclass


@dataclass
class User:
    id: int
    name: str
    active: bool


def parse_user(raw):
    return User(id=int(raw["id"]), name=str(raw["name"]), active=bool(raw["active"]))
`

const API_TEST = String.raw`from api.client import fetch_user
from api.models import User, parse_user


def run_tests(record):
    def coerces_field_types():
        result = parse_user({"id": "1", "name": "Ada", "active": 1})
        assert result == User(1, "Ada", True), f"got {result!r}"

    def parses_inactive_user():
        result = parse_user({"id": 2, "name": "Sam", "active": 0})
        assert result == User(2, "Sam", False), f"got {result!r}"

    def validates_fetched_data():
        assert parse_user(fetch_user(1)) == User(1, "Ada", True)

    record("coerces field types", coerces_field_types)
    record("parses an inactive user", parses_inactive_user)
    record("validates fetched data", validates_fetched_data)
`

const API_TEST_HIDDEN = String.raw`from api.models import User, parse_user


def run_tests(record):
    def coerces_a_string_id():
        assert parse_user({"id": "99", "name": "Mo", "active": True}) == User(99, "Mo", True)

    def missing_field_raises():
        try:
            parse_user({"id": 1, "name": "X"})  # no "active"
            raised = False
        except KeyError:
            raised = True
        assert raised, "a missing field should raise"

    record("coerces a string id", coerces_a_string_id)
    record("missing field raises", missing_field_raises)
`

export const restPydanticLesson: PythonLesson = {
  id: "py-l3-rest-pydantic",
  title: "Validating API data at the boundary (httpx/pydantic preview)",
  summary: "Fetch external JSON and validate it into a typed model at the boundary.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["validation", "dataclasses", "data-boundary", "type-coercion"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Fetching and validating external data

### Why the boundary is where bugs get caught

An external API is code you do not control. It can rename a field, send \`"1"\` where you expected \`1\`, drop \`active\` entirely, or add junk you never asked for. If that raw JSON flows deep into your program, a wrong type surfaces as a crash three functions away from the real cause. The discipline that prevents this: fetch, then immediately turn the untrusted \`dict\` into a typed object you can trust. Everything downstream then works with clean, known values.

### httpx: fetch the raw JSON

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "status-codes-do-not-raise",
  "prompt": "You call httpx.get(url). The server answers 404 and returns an HTML error page. You have not called raise_for_status(). What does your code get back?",
  "options": [
    {
      "label": "An exception. A 404 is an error, so the client raises.",
      "feedback": "Tempting, because a 404 obviously is a failure and some HTTP clients in other languages really do throw. httpx counts any completed exchange as a success at the transport level: a reply arrived, so nothing raises."
    },
    {
      "label": "An ordinary Response object whose status_code is 404. Nothing raises until you check.",
      "correct": true,
      "feedback": "Right, and the next line is where it actually breaks: response.json() tries to parse an HTML error page. Call raise_for_status() so the failure names the status code instead of a JSON decode error."
    },
    {
      "label": "response.json() returns None, so you can test for that.",
      "feedback": "Tempting, because a None-on-failure convention would be convenient and some libraries do work that way. json() either parses the body or raises a decode error. It never invents a None for you."
    }
  ]
}
\`\`\`

\`httpx\` is the modern HTTP client (sync or async, same API):

\`\`\`python
import httpx

response = httpx.get("https://api.example.com/users/1")
response.raise_for_status()   # raise on 4xx/5xx instead of parsing an error page
raw = response.json()         # a plain dict, still untrusted
\`\`\`

\`response.json()\` gives you a \`dict\`. Nothing about it is validated yet. The types are whatever the server chose to send.

### pydantic validates and coerces

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "pydantic-coerces-not-just-rejects",
  "prompt": "A pydantic model declares id: int, name: str, active: bool. The API sends {'id': '1', 'name': 'Ada', 'active': 1}, so id arrives as a string and active as a number. What does User(**raw) do?",
  "options": [
    {
      "label": "Raises ValidationError, because id came in as a string rather than an int.",
      "feedback": "Tempting, because strict checking is the reason you reached for pydantic at all. pydantic converts whenever the conversion is unambiguous, so the string '1' quietly becomes the int 1."
    },
    {
      "label": "Builds a User with id=1 and active=True, converting both on the way in.",
      "correct": true,
      "feedback": "Right. pydantic validates AND coerces. It raises only when a value cannot be converted at all, or when a required field is missing from the payload entirely."
    },
    {
      "label": "Builds a User but leaves id as the string '1', since annotations do nothing at runtime.",
      "feedback": "Exactly right for a plain @dataclass, which is what makes this such a natural answer. pydantic is a library that opts in: it reads those same annotations and actually enforces them."
    }
  ]
}
\`\`\`

In production you hand that \`dict\` to a \`pydantic\` model. \`pydantic\` reads the declared field types, coerces where it is safe, and raises \`ValidationError\` where it is not:

\`\`\`python
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    active: bool

User(**raw)   # "1" becomes 1, 1 becomes True, a missing field raises ValidationError
\`\`\`

### This sandbox: a dataclass plus explicit coercion

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "field",
    "raw",
    "raw type",
    "coerced",
    "coerced type"
  ],
  "rows": [
    [
      "id",
      "'1'",
      "str",
      "1",
      "int"
    ],
    [
      "name",
      "'Ada'",
      "str",
      "'Ada'",
      "str"
    ],
    [
      "active",
      "1",
      "int",
      "True",
      "bool"
    ]
  ],
  "highlightCols": [
    "coerced",
    "coerced type"
  ],
  "caption": "The raw dict from the API is coerced field-by-field into the typed User at the boundary: '1' becomes 1, 1 becomes True."
}
\`\`\`

There is no network and no \`pydantic\` here, so you do the same job by hand with a \`@dataclass\`. That difference matters: a \`@dataclass\` gives you the shape, but its type annotations are not enforced at runtime. Building a plain dataclass with \`id="1"\` stores the string \`"1"\` with no error at all. So you coerce each field yourself, exactly like the demo below:

\`\`\`python
raw = {"id": "1", "name": "Ada", "active": 1}
User(id=int(raw["id"]), name=str(raw["name"]), active=bool(raw["active"]))
# User(id=1, name='Ada', active=True)
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "index-vs-get-at-the-boundary",
  "prompt": "The API stops sending the active field altogether. Your boundary code reads it as bool(raw.get('active')). What happens?",
  "options": [
    {
      "label": "KeyError, so you find out about the change immediately.",
      "feedback": "That is what raw['active'] would do, and it is the behaviour you want at a boundary. .get is specifically the version that refuses to raise: it hands back None for a key that is not there."
    },
    {
      "label": "active silently becomes False, and the damage shows up somewhere else entirely.",
      "correct": true,
      "feedback": "Right. .get returns None, bool(None) is False, and every genuinely active user is now recorded as inactive. Index at the boundary so a missing field fails at the place it went missing."
    },
    {
      "label": "TypeError, because bool() cannot be handed a None.",
      "feedback": "Tempting, because passing None to a converter often does raise, and int(None) genuinely does. bool() is the exception: it accepts any object and only asks whether it is truthy, so bool(None) is simply False."
    }
  ]
}
\`\`\`

Reach for \`raw["id"]\` (indexing), not \`raw.get("id")\`. Indexing raises \`KeyError\` on a missing field, which is the "a missing field should raise" behavior the Practice wants. \`.get\` would silently hand you \`None\` and push the failure downstream.

### Pitfall: \`bool()\` of a string is almost always \`True\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bool-of-string-is-true",
  "prompt": "The API changes and starts sending active as the string 'false' where it used to send the number 0. Your boundary code still does bool(raw['active']). What ends up stored on the user?",
  "options": [
    {
      "label": "False, because the value says false.",
      "feedback": "Tempting, because that is unmistakably what the API meant and any human reading the payload would agree. bool() does not read English. It only asks whether the value is empty."
    },
    {
      "label": "True, because bool() of any non-empty string is True.",
      "correct": true,
      "feedback": "Right, and bool('0') is True for exactly the same reason. Every user flips to active, nothing raises, and nothing in your logs looks wrong. That is the worst kind of data bug."
    },
    {
      "label": "ValueError, since 'false' is not a boolean literal.",
      "feedback": "That is what int('false') would give you, so the instinct carries over from the id field. bool() never rejects anything: it maps every object to True or False and has no failure mode."
    }
  ],
  "reveal": "Coercion is only safe when you know the shape of what is arriving. bool() in particular cannot fail, so a changed API becomes silently wrong data instead of a crash. When a flag can arrive as text, list the accepted values explicitly."
}
\`\`\`

\`bool(1)\` is \`True\` and \`bool(0)\` is \`False\`, so coercing a 0/1 flag works. But \`bool\` of any non-empty string is \`True\`: \`bool("false")\` is \`True\`, and even \`bool("0")\` is \`True\`. If the API ever sends \`active\` as the string \`"false"\`, a naive \`bool()\` silently flips it to \`True\`. Know your source's shape, and when a flag can arrive as text, map it explicitly (for example \`raw["active"] in (1, "1", "true", True)\`) instead of trusting \`bool()\`.

**Interview nuance:** Python type hints are not enforced at runtime. \`id: int\` on a \`@dataclass\` is documentation the interpreter ignores. The constructor will happily store a \`str\` in that field. Runtime guarantees come only from something that actually checks, like \`pydantic\`, or from explicit coercion you write yourself. That is the whole reason the "validate at the boundary" pattern exists: annotations describe intent, boundary code enforces it.`,
    demoCode: `from dataclasses import dataclass


@dataclass
class User:
    id: int
    name: str
    active: bool


raw = {"id": "1", "name": "Ada", "active": 1}
print(User(id=int(raw["id"]), name=str(raw["name"]), active=bool(raw["active"])))`,
  },
  apply: {
    id: "py-l3-rest-pydantic-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`parse_user(raw)\`. Coerce a raw user dict into a clean dict with
\`id\` as an \`int\`, \`name\` as a \`str\`, and \`active\` as a \`bool\`.

For \`{"id": "1", "name": "Ada", "active": 1}\` return \`{"id": 1, "name": "Ada", "active": True}\`.`,
    starterCode: `def parse_user(raw):
    # Coerce raw["id"] -> int, raw["name"] -> str, raw["active"] -> bool. Return a dict.
    pass`,
    hints: [
      'Coerce each field: `int(raw["id"])`, `str(raw["name"])`, `bool(raw["active"])`.',
      "Return them in a new dict with the same keys.",
    ],
    referenceSolution: `def parse_user(raw):
    return {"id": int(raw["id"]), "name": str(raw["name"]), "active": bool(raw["active"])}`,
    testCases: [
      {
        input: { raw: { id: "1", name: "Ada", active: 1 } },
        expected: { id: 1, name: "Ada", active: true },
        description: "coerces string id and int active",
      },
      {
        input: { raw: { id: 2, name: "Sam", active: 0 } },
        expected: { id: 2, name: "Sam", active: false },
        description: "inactive user",
      },
      {
        input: { raw: { id: "99", name: "Mo", active: true } },
        expected: { id: 99, name: "Mo", active: true },
        description: "already-bool active",
      },
    ],
  },
  practice: {
    id: "py-l3-rest-pydantic-practice",
    executionMode: "workspace",
    prompt: `Implement \`parse_user(raw)\` in \`api/models.py\`: validate a raw user dict into the typed \`User\`
dataclass, coercing \`id\` to \`int\`, \`name\` to \`str\`, and \`active\` to \`bool\`. A missing field
should raise. Some tests are hidden.`,
    starterCode: "",
    hints: [
      'Build the dataclass: `User(id=int(raw["id"]), ...)`.',
      'Indexing a missing key (`raw["active"]`) already raises `KeyError`. That\'s the desired behaviour.',
      "Coerce `active` with `bool(...)`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "api/models.py",
      editableFilePaths: ["api/models.py"],
      visibleTestPaths: ["tests/test_models.py"],
      hiddenTestPaths: ["tests/test_models_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: API_README },
        { path: "api/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "api/client.py",
          role: "readonly",
          language: "python",
          content: API_CLIENT,
          description: "Simulated HTTP client (read-only)",
        },
        {
          path: "api/models.py",
          role: "editable",
          language: "python",
          content: API_MODELS_STARTER,
          description: "Implement parse_user here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_models.py",
          role: "test",
          language: "python",
          content: API_TEST,
          description: "Visible validation tests",
        },
        {
          path: "tests/test_models_hidden.py",
          role: "test",
          language: "python",
          content: API_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_models", label: "visible models" },
            { module: "test_models_hidden", label: "hidden models" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "api/models.py",
          role: "editable",
          language: "python",
          content: API_MODELS_REFERENCE,
        },
      ],
    },
  },
}
