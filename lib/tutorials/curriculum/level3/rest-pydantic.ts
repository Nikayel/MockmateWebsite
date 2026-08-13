import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

/**
 * Time budget behind `estimatedMinutes` (counted, not guessed): teach 6 (about 1,100 prose words
 * and five checks), apply 12 (25 prompt lines to read, a 12-line reference to write), practice 37
 * (67 README lines plus 75 lines of read-only modules and visible tests to read, 94 lines to write
 * across two files). Lesson total 55 = 6 + 12 + 37.
 *
 * Apply used to be a two-line `parse_user` that called `int()`, `str()` and `bool()` on three keys,
 * a 47x jump into the practice reference and the worst ramp in the course. It now runs the same
 * schema the practice runs (report every problem, name the field, never raise) on a strictly
 * smaller surface: three fixed types, no coercion, one flat payload. Practice keeps its coercers,
 * its nesting, its optional/nullable rules and its dataclasses, so pasting the apply answer in
 * still gets you nothing.
 */

const API_README = buildBrief({
  lesson: "py-l3-rest-pydantic",
  kind: "ticket",
  headline: "the storefront sync fails without saying which field broke",
  body: `The nightly job reads accounts from the storefront API and each account carries a list of orders.
When a payload is wrong the job dies on the first bad value with a bare \`TypeError\`, so support
cannot tell whether one order was malformed or the whole account was. Rebuild the boundary so it
reports **every** problem it found, and names the exact field path of each one.

\`storefront/api.py\` (a stand-in for httpx, no network here) and \`storefront/models.py\` are
read-only. Two files are yours.

## \`storefront/fields.py\`

Three value-level coercers. Each takes \`(value, path)\` and returns a \`(value, error)\` pair:
on success \`(coerced_value, None)\`, on failure \`(None, "<path>: expected <type>, got <value!r>")\`.

- \`as_int(value, path)\` accepts an \`int\`, or a \`str\` that \`int()\` parses (\`"1004"\`). A \`bool\` is
  rejected even though \`True\` is an \`int\` in Python, because a flag is not an id.
- \`as_str(value, path)\` accepts a \`str\` and nothing else. It does **not** stringify a number: an
  \`id\` arriving where a \`name\` belongs is a bug worth surfacing.
- \`as_bool(value, path)\` accepts \`True\`/\`False\`, the ints \`1\`/\`0\`, and the strings \`"true"\`/\`"false"\`
  in any case. Everything else is an error.

\`\`\`python
as_int("1004", "id")        # (1004, None)
as_int(None, "orders[1].id")  # (None, "orders[1].id: expected int, got None")
\`\`\`

## \`storefront/parse.py\`

\`\`\`python
parse_order(raw, path)   # -> (Order or None, [errors])
parse_account(raw)       # -> (Account or None, [errors])
\`\`\`

Both collect errors instead of raising, and both return \`None\` for the object when their error list
is not empty. \`parse_order\` requires \`id\` (int), \`total\` (int), and \`paid\` (bool), and prefixes
every path with the \`path\` it was given, so a bad total in the second order reads
\`orders[1].total: expected int, got 'abc'\`.

All three order fields are required, and a **missing key** is reported differently from a wrong
value: there is no value to name, so the message is \`"<path>.<field>: missing"\` and nothing else.
\`parse_order({"id": 3}, "orders[2]")\` returns
\`["orders[2].total: missing", "orders[2].paid: missing"]\`, in the field order above. This is the
same \`"<field>: missing"\` shape the account fields use, with the order's path in front of it.

\`parse_account\` fills an \`Account\` from \`models.py\` and treats its fields three different ways:

| field | rule | a missing key | a \`None\` value |
| --- | --- | --- | --- |
| \`id\`, \`name\` | required, never null | \`"id: missing"\` | an \`expected\` error |
| \`email\` | required key, nullable value | \`"email: missing"\` | kept as \`None\` |
| \`nickname\` | optional | \`None\` | \`None\` |

\`orders\` is required and must be a list: a missing key gives \`"orders: missing"\` and a non-list
gives \`"orders: expected list, got <value!r>"\`. Orders that parse are collected in order; orders
that fail contribute their errors and are left out.

Keys the payload carries that are not listed above are ignored, because the API adds fields without
warning and a new one must not break last week's job.

Errors come back in field order: \`id\`, \`name\`, \`email\`, \`nickname\`, then the orders by index.`,
})

const API_CLIENT = String.raw`"""Stand-in for an httpx call. Returns canned raw JSON bodies, so runs are deterministic."""

_ACCOUNTS = {
    "1004": {
        "id": "1004",
        "name": "Ada Lovelace",
        "email": None,
        "plan_tier": "gold",
        "orders": [
            {"id": 1, "total": 2599, "paid": "true", "currency": "USD"},
            {"id": 2, "total": 400, "paid": 0},
        ],
    },
    "1005": {
        "id": 1005,
        "name": "Sam Reed",
        "email": "sam@example.com",
        "orders": [
            {"id": 7, "total": 1200, "paid": True},
            {"id": 8, "total": "abc", "paid": True},
        ],
    },
}


def fetch_account(account_id):
    """Pretend to GET /accounts/{id} and return the raw, untrusted JSON body."""
    return _ACCOUNTS[str(account_id)]
`

const API_MODELS = String.raw`"""Read-only target shapes. Annotations here are documentation; parse.py does the enforcing."""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Order:
    id: int
    total: int
    paid: bool


@dataclass
class Account:
    id: int
    name: str
    email: Optional[str]
    nickname: Optional[str]
    orders: List[Order] = field(default_factory=list)
`

const API_FIELDS_STARTER = String.raw`def as_int(value, path):
    """Return (int, None) or (None, error) for one raw value (see README.md)."""
    # TODO: accept ints and int-like strings, reject bools and everything else.
    return None, None


def as_str(value, path):
    """Return (str, None) or (None, error) for one raw value (see README.md)."""
    # TODO: accept only a real str.
    return None, None


def as_bool(value, path):
    """Return (bool, None) or (None, error) for one raw value (see README.md)."""
    # TODO: accept the listed true/false spellings and reject the rest.
    return None, None
`

const API_FIELDS_REFERENCE = String.raw`def as_int(value, path):
    if isinstance(value, bool):
        return None, f"{path}: expected int, got {value!r}"
    if isinstance(value, int):
        return value, None
    if isinstance(value, str):
        try:
            return int(value), None
        except ValueError:
            pass
    return None, f"{path}: expected int, got {value!r}"


def as_str(value, path):
    if isinstance(value, str):
        return value, None
    return None, f"{path}: expected str, got {value!r}"


def as_bool(value, path):
    if isinstance(value, bool):
        return value, None
    if isinstance(value, str):
        lowered = value.lower()
        if lowered == "true":
            return True, None
        if lowered == "false":
            return False, None
    elif isinstance(value, int):
        if value == 1:
            return True, None
        if value == 0:
            return False, None
    return None, f"{path}: expected bool, got {value!r}"
`

const API_PARSE_STARTER = String.raw`from storefront.fields import as_bool, as_int, as_str
from storefront.models import Account, Order

ORDER_FIELDS = (("id", as_int), ("total", as_int), ("paid", as_bool))


def parse_order(raw, path):
    """Return (Order, []) or (None, errors) for one raw order (see README.md)."""
    # TODO: coerce each ORDER_FIELDS entry under "<path>.<field>" and collect every error.
    return None, []


def parse_account(raw):
    """Return (Account, []) or (None, errors) for one raw account (see README.md)."""
    # TODO: apply the required / nullable / optional rules, then parse the nested orders.
    return None, []
`

const API_PARSE_REFERENCE = String.raw`from storefront.fields import as_bool, as_int, as_str
from storefront.models import Account, Order

ORDER_FIELDS = (("id", as_int), ("total", as_int), ("paid", as_bool))


def parse_order(raw, path):
    values = {}
    errors = []
    for name, coerce in ORDER_FIELDS:
        if name not in raw:
            errors.append(f"{path}.{name}: missing")
            continue
        value, error = coerce(raw[name], f"{path}.{name}")
        if error is not None:
            errors.append(error)
        else:
            values[name] = value
    if errors:
        return None, errors
    return Order(id=values["id"], total=values["total"], paid=values["paid"]), []


def parse_account(raw):
    values = {"email": None, "nickname": None}
    errors = []

    for name, coerce in (("id", as_int), ("name", as_str)):
        if name not in raw:
            errors.append(f"{name}: missing")
            continue
        value, error = coerce(raw[name], name)
        if error is not None:
            errors.append(error)
        else:
            values[name] = value

    if "email" not in raw:
        errors.append("email: missing")
    elif raw["email"] is not None:
        value, error = as_str(raw["email"], "email")
        if error is not None:
            errors.append(error)
        else:
            values["email"] = value

    if raw.get("nickname") is not None:
        value, error = as_str(raw["nickname"], "nickname")
        if error is not None:
            errors.append(error)
        else:
            values["nickname"] = value

    orders = []
    if "orders" not in raw:
        errors.append("orders: missing")
    elif not isinstance(raw["orders"], list):
        errors.append(f"orders: expected list, got {raw['orders']!r}")
    else:
        for index, item in enumerate(raw["orders"]):
            order, order_errors = parse_order(item, f"orders[{index}]")
            errors.extend(order_errors)
            if order is not None:
                orders.append(order)

    if errors:
        return None, errors
    return Account(
        id=values["id"],
        name=values["name"],
        email=values["email"],
        nickname=values["nickname"],
        orders=orders,
    ), []
`

const API_FIELDS_TEST = String.raw`from storefront.fields import as_bool, as_int, as_str


def run_tests(record):
    def coerces_an_int_like_string():
        value, error = as_int("1004", "id")
        assert (value, error) == (1004, None), f"expected (1004, None), got {(value, error)!r}"

    def names_the_path_of_a_bad_int():
        value, error = as_int(None, "orders[1].id")
        expected = "orders[1].id: expected int, got None"
        assert value is None, f"expected None on failure, got {value!r}"
        assert error == expected, f"expected {expected!r}, got {error!r}"

    def refuses_to_stringify_a_number():
        value, error = as_str(1004, "name")
        expected = "name: expected str, got 1004"
        assert value is None, f"expected None on failure, got {value!r}"
        assert error == expected, f"expected {expected!r}, got {error!r}"

    def reads_the_written_out_booleans():
        for raw, want in (("true", True), ("FALSE", False), (1, True), (0, False)):
            value, error = as_bool(raw, "paid")
            assert (value, error) == (want, None), (
                f"as_bool({raw!r}) expected ({want}, None), got {(value, error)!r}"
            )

    record("coerces an int-like string", coerces_an_int_like_string)
    record("names the path of a bad int", names_the_path_of_a_bad_int)
    record("refuses to stringify a number", refuses_to_stringify_a_number)
    record("reads the written-out booleans", reads_the_written_out_booleans)
`

const API_PARSE_TEST = String.raw`from storefront.api import fetch_account
from storefront.models import Account, Order
from storefront.parse import parse_account, parse_order


def run_tests(record):
    def parses_a_clean_order():
        order, errors = parse_order({"id": 7, "total": 1200, "paid": True}, "orders[0]")
        assert errors == [], f"expected no errors, got {errors!r}"
        assert order == Order(7, 1200, True), f"expected Order(7, 1200, True), got {order!r}"

    def parses_a_fetched_account():
        account, errors = parse_account(fetch_account(1004))
        assert errors == [], f"expected no errors, got {errors!r}"
        expected = Account(
            id=1004,
            name="Ada Lovelace",
            email=None,
            nickname=None,
            orders=[Order(1, 2599, True), Order(2, 400, False)],
        )
        assert account == expected, f"expected {expected!r}, got {account!r}"

    def reports_the_failing_order_by_path():
        account, errors = parse_account(fetch_account(1005))
        expected = ["orders[1].total: expected int, got 'abc'"]
        assert errors == expected, f"expected {expected!r}, got {errors!r}"
        assert account is None, f"expected None when errors exist, got {account!r}"

    def collects_every_error_not_only_the_first():
        raw = {"id": "x", "name": 12, "email": "a@b.c", "orders": []}
        account, errors = parse_account(raw)
        expected = ["id: expected int, got 'x'", "name: expected str, got 12"]
        assert errors == expected, f"expected {expected!r}, got {errors!r}"
        assert account is None, f"expected None when errors exist, got {account!r}"

    record("parses a clean order", parses_a_clean_order)
    record("parses a fetched account", parses_a_fetched_account)
    record("reports the failing order by path", reports_the_failing_order_by_path)
    record("collects every error, not only the first", collects_every_error_not_only_the_first)
`

const API_PARSE_TEST_HIDDEN = String.raw`from storefront.models import Account, Order
from storefront.parse import parse_account, parse_order

BASE = {"id": 1, "name": "Ada", "email": None, "orders": []}


def with_fields(**changes):
    raw = dict(BASE)
    raw.update(changes)
    return raw


def run_tests(record):
    def missing_email_key_differs_from_a_null_email():
        raw = dict(BASE)
        del raw["email"]
        _, errors = parse_account(raw)
        assert errors == ["email: missing"], f"expected ['email: missing'], got {errors!r}"

        account, errors = parse_account(BASE)
        assert errors == [], f"a null email is allowed, got {errors!r}"
        assert account.email is None, f"expected email None, got {account.email!r}"

    def optional_nickname_is_absent_without_complaint():
        account, errors = parse_account(with_fields(nickname="ada"))
        assert errors == [], f"expected no errors, got {errors!r}"
        assert account.nickname == "ada", f"expected 'ada', got {account.nickname!r}"

        account, errors = parse_account(BASE)
        assert errors == [], f"expected no errors, got {errors!r}"
        assert account.nickname is None, f"expected None, got {account.nickname!r}"

    def unknown_fields_are_ignored():
        account, errors = parse_account(with_fields(loyalty_points=5, beta_flags=["x"]))
        assert errors == [], f"a new API field must not break the parse, got {errors!r}"
        assert account == Account(1, "Ada", None, None, []), f"got {account!r}"

    def a_bool_is_not_an_id():
        _, errors = parse_order({"id": True, "total": 10, "paid": False}, "orders[0]")
        expected = ["orders[0].id: expected int, got True"]
        assert errors == expected, f"expected {expected!r}, got {errors!r}"

    def a_missing_order_field_is_named():
        _, errors = parse_order({"id": 3}, "orders[2]")
        expected = ["orders[2].total: missing", "orders[2].paid: missing"]
        assert errors == expected, f"expected {expected!r}, got {errors!r}"

    def orders_must_be_a_list_and_good_ones_still_load():
        _, errors = parse_account(with_fields(orders="none"))
        expected = ["orders: expected list, got 'none'"]
        assert errors == expected, f"expected {expected!r}, got {errors!r}"

        _, errors = parse_account(
            with_fields(
                orders=[
                    {"id": 1, "total": 5, "paid": "yes"},
                    {"id": 2, "total": 6, "paid": "false"},
                    {"id": "no", "total": 7, "paid": True},
                ]
            )
        )
        expected = [
            "orders[0].paid: expected bool, got 'yes'",
            "orders[2].id: expected int, got 'no'",
        ]
        assert errors == expected, f"expected {expected!r}, got {errors!r}"

    record("a missing email key differs from a null email", missing_email_key_differs_from_a_null_email)
    record("an optional nickname may be absent", optional_nickname_is_absent_without_complaint)
    record("unknown fields are ignored", unknown_fields_are_ignored)
    record("a bool is not an id", a_bool_is_not_an_id)
    record("a missing order field is named", a_missing_order_field_is_named)
    record("orders must be a list", orders_must_be_a_list_and_good_ones_still_load)
`

export const restPydanticLesson: PythonLesson = {
  id: "py-l3-rest-pydantic",
  title: "Validating API data at the boundary (httpx/pydantic preview)",
  summary: "Fetch external JSON and validate it into a typed model at the boundary.",
  estimatedMinutes: 55,
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

### Reporting every problem instead of the first one

A boundary that raises on the first bad field tells support about one problem per run. A boundary that collects tells them about all of them at once. The move is to have each converter hand back a **pair**, \`(value, error)\`, and never raise: the caller decides what to do with the error half.

\`\`\`python
def as_hex(value, path):
    """Return (number, None) on success, or (None, message) on failure. Never raises."""
    if isinstance(value, str) and value.startswith("0x"):
        return int(value, 16), None
    return None, f"{path}: expected a hex string, got {value!r}"


print(as_hex("0x1f", "color"))   # (31, None)
print(as_hex(31, "color"))       # (None, "color: expected a hex string, got 31")

errors = []
for path, raw in (("color", 31), ("accent", "0x0a"), ("edge", None)):
    value, error = as_hex(raw, path)
    if error is not None:
        errors.append(error)
print(errors)
# ['color: expected a hex string, got 31', 'edge: expected a hex string, got None']
\`\`\`

Two details in that message do real work. \`{value!r}\` asks for the \`repr\`, so a string arrives quoted and \`None\` reads as \`None\` rather than as an empty gap, which is the difference between a report you can act on and one you cannot. And the \`path\` is passed in rather than known by the converter, so the same converter can name a top-level field or a deeply nested one.

### \`bool\` is an \`int\`, so order your checks

\`\`\`python
print(isinstance(True, int))    # True: bool is a subclass of int
print(isinstance(True, bool))   # True
print(f"{None!r} {'7'!r} {7!r}")   # None '7' 7
\`\`\`

An \`id\` field that accepts any \`int\` therefore accepts \`True\` as the id \`1\`. When a flag arriving where a number belongs should be an error, test \`isinstance(value, bool)\` **before** \`isinstance(value, int)\` and reject it there.

Reach for \`raw["id"]\` (indexing), not \`raw.get("id")\`. Indexing raises \`KeyError\` on a missing field, so the absence is reported where it happened. \`.get\` would silently hand you \`None\` and push the failure downstream. When a boundary has to keep going instead of stopping at the first problem, ask \`"id" in raw\` first: that way a missing key is still a distinct, named outcome rather than a \`None\` you cannot tell apart from a real null.

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
    // 12 minutes: ~25 lines of prompt to read, a 12-line reference to write, one nuance
    // (a bool is not an id) that costs a re-read of the teach section's isinstance fence.
    estimatedMinutes: 12,
    prompt: `Implement \`validate_user(raw)\`, the boundary check the user feed runs before anything
downstream sees a row. It reports **every** problem in the payload rather than stopping at the
first, and it never raises.

Return a dict with two keys:

\`\`\`python
{"user": {"id": 1, "name": "Ada", "active": True}, "errors": []}
\`\`\`

- \`user\` holds the three declared fields when the payload is clean, and \`None\` when it is not.
- \`errors\` is a list of messages, in the field order \`id\`, \`name\`, \`active\`.

\`id\` must be an \`int\`, \`name\` a \`str\`, and \`active\` a \`bool\`. Nothing is converted here: a value
of the wrong type is a problem to report, not a value to fix. A \`bool\` is **not** an \`id\`, even
though \`True\` is an \`int\` in Python, because a flag is not an identifier.

- a field the payload does not carry gives \`"<field>: missing"\`
- a field of the wrong type gives \`"<field>: expected <type>, got <value>"\`, where the type is the
  wanted type's name and the value is its \`repr\`

\`\`\`python
validate_user({"id": "1", "name": 12, "active": 1})
# {"user": None, "errors": [
#     "id: expected int, got '1'",
#     "name: expected str, got 12",
#     "active: expected bool, got 1",
# ]}
validate_user({"id": 3})
# {"user": None, "errors": ["name: missing", "active: missing"]}
\`\`\`

Keys the payload carries that are not one of the three are ignored, because the API adds fields
without warning and a new one must not fail the row.`,
    starterCode: `def validate_user(raw):
    # Return {"user": ..., "errors": [...]}. Report every bad or missing field, in field order.
    pass`,
    hints: [
      "Nothing raises. Keep one `errors` list, append to it as you check each field, and decide what to return only once every field has been looked at.",
      'Three fields with three wanted types is a table you can walk: a tuple of `("id", int)` pairs keeps the field order and the check in one place. `"id" in raw` answers the missing question before you touch `raw["id"]`.',
      '`f"{value!r}"` gives you the repr, so a string comes out quoted. For the wanted type\'s name, `int.__name__` is `"int"`. Remember that `isinstance(True, int)` is `True`, so a check written with `isinstance` alone lets a bool through as an id.',
    ],
    referenceSolution: `FIELDS = (("id", int), ("name", str), ("active", bool))


def validate_user(raw):
    values = {}
    errors = []
    for name, wanted in FIELDS:
        if name not in raw:
            errors.append(f"{name}: missing")
            continue
        value = raw[name]
        if type(value) is not wanted:
            errors.append(f"{name}: expected {wanted.__name__}, got {value!r}")
        else:
            values[name] = value
    if errors:
        return {"user": None, "errors": errors}
    return {"user": values, "errors": []}`,
    testCases: [
      {
        input: { raw: { id: 1, name: "Ada", active: true } },
        expected: { user: { id: 1, name: "Ada", active: true }, errors: [] },
        description: "a clean payload reports no errors",
      },
      {
        input: { raw: { id: "1", name: 12, active: 1 } },
        expected: {
          user: null,
          errors: [
            "id: expected int, got '1'",
            "name: expected str, got 12",
            "active: expected bool, got 1",
          ],
        },
        description: "collects every wrong type, not only the first",
      },
      {
        input: { raw: { id: 3 } },
        expected: { user: null, errors: ["name: missing", "active: missing"] },
        description: "a missing field is named without a value",
      },
      {
        input: { raw: { id: true, name: "Ada", active: false } },
        expected: { user: null, errors: ["id: expected int, got True"] },
        description: "a bool is not an id",
      },
      {
        input: { raw: { id: 2, name: "Sam", active: false, plan_tier: "gold" } },
        expected: { user: { id: 2, name: "Sam", active: false }, errors: [] },
        description: "an undeclared field is ignored",
      },
    ],
  },
  practice: {
    id: "py-l3-rest-pydantic-practice",
    executionMode: "workspace",
    estimatedMinutes: 37,
    prompt: `Rebuild the storefront sync boundary so a bad payload reports every problem and names the field
path of each one, instead of dying on the first bad value.

Write the value coercers in \`storefront/fields.py\` and the shape validation in
\`storefront/parse.py\`. An account carries a list of orders, so an error has to read
\`orders[1].total: expected int, got 'abc'\`. \`email\` is required but may be null, \`nickname\` may be
absent entirely, and fields the API adds later must be ignored rather than rejected. \`README.md\`
has the full contract. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Nothing raises here. A coercer hands back a pair, and the callers above it decide what to do with the error half.",
      'In `parse_account`, keep one `errors` list and append to it as you go. Ask `"email" in raw` before you look at `raw["email"]`, because a missing key and a null value are two different outcomes.',
      '`isinstance(True, int)` is `True`, so `as_int` has to check `isinstance(value, bool)` first and reject. For the nested orders, call `parse_order(item, f"orders[{index}]")` inside `enumerate` and `errors.extend(...)` what comes back.',
    ],
    workspace: {
      language: "python",
      primaryFilePath: "storefront/parse.py",
      editableFilePaths: ["storefront/fields.py", "storefront/parse.py"],
      visibleTestPaths: ["tests/test_fields.py", "tests/test_parse.py"],
      hiddenTestPaths: ["tests/test_parse_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: API_README },
        {
          path: "storefront/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "storefront/api.py",
          role: "readonly",
          language: "python",
          content: API_CLIENT,
          description: "Simulated HTTP client (read-only)",
        },
        {
          path: "storefront/models.py",
          role: "readonly",
          language: "python",
          content: API_MODELS,
          description: "Target dataclasses (read-only)",
        },
        {
          path: "storefront/fields.py",
          role: "editable",
          language: "python",
          content: API_FIELDS_STARTER,
          description: "Value-level coercers",
        },
        {
          path: "storefront/parse.py",
          role: "editable",
          language: "python",
          content: API_PARSE_STARTER,
          description: "Shape validation and field paths",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_fields.py",
          role: "test",
          language: "python",
          content: API_FIELDS_TEST,
          description: "Visible coercer tests",
        },
        {
          path: "tests/test_parse.py",
          role: "test",
          language: "python",
          content: API_PARSE_TEST,
          description: "Visible parsing tests",
        },
        {
          path: "tests/test_parse_hidden.py",
          role: "test",
          language: "python",
          content: API_PARSE_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_fields", label: "visible fields" },
            { module: "test_parse", label: "visible parse" },
            { module: "test_parse_hidden", label: "hidden parse" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "storefront/fields.py",
          role: "editable",
          language: "python",
          content: API_FIELDS_REFERENCE,
        },
        {
          path: "storefront/parse.py",
          role: "editable",
          language: "python",
          content: API_PARSE_REFERENCE,
        },
      ],
    },
  },
}
