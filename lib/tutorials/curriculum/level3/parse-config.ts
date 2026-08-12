import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ---------------------------------------------------------------------------
// Workspace file contents for the deploy-settings practice challenge.
// Two editable modules with one seam: the reader decides what the raw text of a
// value is, the rules module decides what type that text becomes.
// ---------------------------------------------------------------------------

const README = `# Ticket DEP-412: the deploy tool reads settings files nobody agrees on

Every service in the fleet ships a \`deploy.settings\` file, and the files in the wild are messier
than the parser that reads them. A release went out authenticating with the literal text
\`abc123 # rotate me\`, because the operator wrote \`token = abc123 # rotate me\` and the parser kept
the comment. Another crashed because a password deliberately quoted as \`"  hunter2  "\` had its
spaces trimmed off. A third booted with \`port\` set to the string \`"eighty"\` and fell over hours
later, and a fourth booted with no host at all because the checker stopped at the first missing key.

You own two modules, and they meet at one seam: **\`lines.py\` decides what the raw text of a value
is, \`rules.py\` decides what that text is worth given the type the key was declared with.**
\`rules.py\` never trims, because trimming is the reader's job and a quoted value must keep its
spaces.

\`settings/spec.py\` is read-only. It holds the required keys, the comment and quote characters, the
declared type of every typed key in \`VALUE_TYPES\`, and the words that count as \`True\` and \`False\`.

## \`settings/lines.py\`

\`\`\`python
split_entries(text)   # -> list of (key, raw_value) tuples, in file order
\`\`\`

For each line, working on the stripped line:

- Skip it when it is blank or starts with \`#\`.
- Skip it when it holds no \`=\`, or when the part before the first \`=\` is empty once trimmed.
- Split on the **first** \`=\` only, and trim whitespace around the key and around the value.
- A value that **opens** with a double quote runs to the next double quote. Keep everything between
  the two quotes exactly, spaces and \`#\` included, and discard whatever follows the closing quote,
  comment or not. A value that opens a quote and never closes it is not quoted at all, and falls
  through to the rules below.
- Otherwise the value ends where an inline comment begins. A comment starts at the first space
  followed by \`#\`, and a value that starts with \`#\` is empty.

Duplicate keys are **kept**, in order. Deciding which one wins is not this module's job.

\`\`\`python
split_entries('port = 8080  # default\\nnote = " keep  me "\\ntoken = "abc" # rotate me')
# [("port", "8080"), ("note", " keep  me "), ("token", "abc")]
\`\`\`

## \`settings/rules.py\`

\`\`\`python
typed_value(key, raw)   # -> the value this key was declared to hold
build_settings(text)    # -> dict
missing_keys(settings)  # -> sorted list of the required keys that are absent
\`\`\`

\`typed_value\` does not guess a type from the text. It looks the **key** up in \`VALUE_TYPES\` and
converts to the type declared there, so a typo in a config file is caught at boot rather than three
hours in:

| \`VALUE_TYPES[key]\` | \`typed_value\` returns |
| --- | --- |
| absent (the key is not declared) | the text it was handed, unchanged |
| \`"int"\` | the \`int\`, for digits optionally led by a \`-\` |
| \`"bool"\` | \`True\` for a word in \`TRUE_WORDS\`, \`False\` for one in \`FALSE_WORDS\`, in any case |
| \`"list"\` | the comma-separated items, each trimmed, empty items dropped |

An empty value is the one exception: whatever the key was declared to hold, \`""\` stays \`""\`, which
is how an operator writes "declared but unset". Otherwise, text that does not fit its declared type
is a broken file, so \`typed_value\` raises \`ValueError\` naming both the key and the text it was
handed. It never trims; only the \`"list"\` items are trimmed, one by one.

\`\`\`python
typed_value("port", "8080")        # 8080
typed_value("port", "eighty")      # ValueError, naming port and 'eighty'
typed_value("hosts", "a, b ,c")    # ["a", "b", "c"]
typed_value("greeting", " hi ")    # ' hi ' unchanged, greeting is not declared
\`\`\`

- \`build_settings\` reads \`text\` through \`split_entries\` and returns one dict of typed values.
  When a key appears more than once, the **last** entry wins.
- \`missing_keys\` reports **every** required key from \`REQUIRED_KEYS\` that is absent, sorted, so an
  operator fixes the file in one pass. A key set to the empty string counts as present.

Some tests are hidden.
`

const SPEC = String.raw`"""Read-only settings contract shared by the reader and the rules."""

REQUIRED_KEYS = ("host", "port", "token")

COMMENT_CHAR = "#"

QUOTE_CHAR = '"'

# What each declared key holds. A key that is not listed here keeps its text.
VALUE_TYPES = {
    "port": "int",
    "retries": "int",
    "timeout": "int",
    "debug": "bool",
    "verbose": "bool",
    "hosts": "list",
    "tags": "list",
}

TRUE_WORDS = ("true", "yes", "on")

FALSE_WORDS = ("false", "no", "off")
`

const LINES_STARTER = String.raw`from settings.spec import COMMENT_CHAR, QUOTE_CHAR


def split_entries(text):
    """Return (key, raw_value) tuples in file order (see README.md)."""
    # TODO: skip blanks, comments, keyless lines; split on the first "="; honour
    # quoted values and inline comments.
    return []
`

const LINES_REFERENCE = String.raw`from settings.spec import COMMENT_CHAR, QUOTE_CHAR


def _read_value(raw):
    value = raw.strip()
    if value.startswith(QUOTE_CHAR):
        closing = value.find(QUOTE_CHAR, 1)
        if closing != -1:
            return value[1:closing]
    if value.startswith(COMMENT_CHAR):
        return ""
    marker = " " + COMMENT_CHAR
    cut = value.find(marker)
    if cut != -1:
        return value[:cut].strip()
    return value


def split_entries(text):
    entries = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith(COMMENT_CHAR):
            continue
        if "=" not in stripped:
            continue
        key, raw = stripped.split("=", 1)
        key = key.strip()
        if not key:
            continue
        entries.append((key, _read_value(raw)))
    return entries
`

const RULES_STARTER = String.raw`from settings.lines import split_entries
from settings.spec import FALSE_WORDS, REQUIRED_KEYS, TRUE_WORDS, VALUE_TYPES


def typed_value(key, raw):
    """Convert raw to the type this key was declared to hold (see README.md)."""
    # TODO: look the key up in VALUE_TYPES, convert, and reject text that does not fit.
    return raw


def build_settings(text):
    """Return one dict of typed settings, last duplicate winning (see README.md)."""
    # TODO: read the entries through split_entries and type each value.
    return {}


def missing_keys(settings):
    """Return every required key that is absent, sorted (see README.md)."""
    # TODO: report all of them, not the first one.
    return []
`

const RULES_REFERENCE = String.raw`from settings.lines import split_entries
from settings.spec import FALSE_WORDS, REQUIRED_KEYS, TRUE_WORDS, VALUE_TYPES


def _reject(key, raw, wanted):
    return ValueError(key + " expects " + wanted + ", got " + repr(raw))


def typed_value(key, raw):
    declared = VALUE_TYPES.get(key)
    if declared is None or raw == "":
        return raw
    if declared == "int":
        digits = raw[1:] if raw.startswith("-") else raw
        if not digits.isdigit():
            raise _reject(key, raw, "an int")
        return int(raw)
    if declared == "bool":
        lowered = raw.lower()
        if lowered in TRUE_WORDS:
            return True
        if lowered in FALSE_WORDS:
            return False
        raise _reject(key, raw, "a boolean")
    return [item.strip() for item in raw.split(",") if item.strip()]


def build_settings(text):
    settings = {}
    for key, raw in split_entries(text):
        settings[key] = typed_value(key, raw)
    return settings


def missing_keys(settings):
    return sorted(key for key in REQUIRED_KEYS if key not in settings)
`

const TEST_LINES = String.raw`from settings.lines import split_entries


def run_tests(record):
    def keeps_pairs_in_file_order():
        text = "# deploy settings\n\nhost = api.internal\nport = 8080\nDEBUG\n"
        result = split_entries(text)
        expected = [("host", "api.internal"), ("port", "8080")]
        assert result == expected, f"expected {expected}, got {result!r}"

    def splits_on_the_first_equals_only():
        result = split_entries("url =  http://x/?a=b  ")
        expected = [("url", "http://x/?a=b")]
        assert result == expected, f"expected {expected}, got {result!r}"

    def drops_an_inline_comment():
        result = split_entries("port = 8080  # the default")
        expected = [("port", "8080")]
        assert result == expected, f"expected {expected}, got {result!r}"

    def keeps_duplicate_keys():
        result = split_entries("mode = fast\nmode = safe")
        expected = [("mode", "fast"), ("mode", "safe")]
        assert result == expected, f"expected both entries {expected}, got {result!r}"

    record("keeps pairs in file order", keeps_pairs_in_file_order)
    record("splits on the first = only", splits_on_the_first_equals_only)
    record("drops an inline comment", drops_an_inline_comment)
    record("keeps duplicate keys for the rules layer", keeps_duplicate_keys)
`

const TEST_RULES = String.raw`from settings.rules import build_settings, missing_keys, typed_value


def run_tests(record):
    def types_a_value_by_its_declared_type():
        assert typed_value("debug", "true") is True, (
            f"expected True for debug 'true', got {typed_value('debug', 'true')!r}"
        )
        assert typed_value("port", "8080") == 8080, (
            f"expected int 8080 for port, got {typed_value('port', '8080')!r}"
        )
        assert typed_value("host", "8080") == "8080", (
            f"expected '8080' unchanged because host is not declared, "
            f"got {typed_value('host', '8080')!r}"
        )

    def an_undeclarable_value_is_rejected():
        try:
            got = typed_value("port", "eighty")
        except ValueError as err:
            message = str(err)
            assert "port" in message, f"expected the key named in {message!r}"
            assert "eighty" in message, f"expected the offending text named in {message!r}"
        else:
            raise AssertionError(f"expected ValueError for port 'eighty', got {got!r}")

    def last_duplicate_wins():
        result = build_settings("mode = fast\nmode = safe")
        expected = {"mode": "safe"}
        assert result == expected, f"expected {expected}, got {result!r}"

    def missing_keys_reports_every_gap():
        result = missing_keys({"port": 8080})
        expected = ["host", "token"]
        assert result == expected, f"expected {expected}, got {result!r}"

    record("types a value by its declared type", types_a_value_by_its_declared_type)
    record("an undeclarable value is rejected", an_undeclarable_value_is_rejected)
    record("the last duplicate wins", last_duplicate_wins)
    record("missing_keys reports every gap", missing_keys_reports_every_gap)
`

const TEST_HIDDEN = String.raw`from settings.lines import split_entries
from settings.rules import build_settings, missing_keys, typed_value


def run_tests(record):
    def quoted_values_keep_their_whitespace_and_hash():
        result = split_entries('token = "  abc # 123  "')
        expected = [("token", "  abc # 123  ")]
        assert result == expected, f"expected {expected}, got {result!r}"
        settings = build_settings('token = "  abc # 123  "')
        assert settings["token"] == "  abc # 123  ", (
            f"expected the quoted text untyped and untrimmed, got {settings['token']!r}"
        )

    def a_hash_inside_a_value_is_not_a_comment():
        result = split_entries("url = http://x/page#frag\nnote = # nothing here")
        expected = [("url", "http://x/page#frag"), ("note", "")]
        assert result == expected, f"expected {expected}, got {result!r}"

    def keyless_lines_are_skipped():
        result = split_entries("  = orphan\nhost = api.internal\n")
        expected = [("host", "api.internal")]
        assert result == expected, f"expected {expected}, got {result!r}"

    def a_quoted_value_ends_at_its_closing_quote():
        result = split_entries('token = "abc" # rotate me\npass = "abc\n')
        expected = [("token", "abc"), ("pass", '"abc')]
        assert result == expected, f"expected {expected}, got {result!r}"

    def typing_handles_signs_and_case():
        assert typed_value("retries", "-3") == -3, (
            f"expected int -3, got {typed_value('retries', '-3')!r}"
        )
        assert typed_value("verbose", "OFF") is False, (
            f"expected False for 'OFF', got {typed_value('verbose', 'OFF')!r}"
        )
        assert typed_value("port", "") == "", (
            f"expected '' left alone even though port is an int key, "
            f"got {typed_value('port', '')!r}"
        )
        assert typed_value("greeting", " 12 ") == " 12 ", (
            f"expected ' 12 ' unchanged because rules never trim an undeclared key, "
            f"got {typed_value('greeting', ' 12 ')!r}"
        )

    def a_list_value_is_split_and_trimmed():
        assert typed_value("hosts", "a, b ,c") == ["a", "b", "c"], (
            f"expected ['a', 'b', 'c'], got {typed_value('hosts', 'a, b ,c')!r}"
        )
        assert typed_value("tags", "one,,two,") == ["one", "two"], (
            f"expected the empty items dropped, got {typed_value('tags', 'one,,two,')!r}"
        )

    def a_bad_boolean_is_rejected():
        try:
            got = typed_value("debug", "maybe")
        except ValueError as err:
            message = str(err)
            assert "debug" in message and "maybe" in message, (
                f"expected the key and the text named in {message!r}"
            )
        else:
            raise AssertionError(f"expected ValueError for debug 'maybe', got {got!r}")

    def an_empty_value_still_counts_as_present():
        settings = build_settings("host =\nport = 8080\ntoken = x")
        assert settings["host"] == "", f"expected host to be the empty string, got {settings['host']!r}"
        result = missing_keys(settings)
        assert result == [], f"expected no missing keys, got {result!r}"

    def whole_file_end_to_end():
        text = (
            "# deploy settings\n"
            "\n"
            "host = api.internal   # staging\n"
            "port = 8080\n"
            "port = 9090\n"
            'greeting = " hello  world "\n'
            "debug = TRUE\n"
            "hosts = a.internal, b.internal   # both\n"
            "RETRIES\n"
        )
        settings = build_settings(text)
        expected = {
            "host": "api.internal",
            "port": 9090,
            "greeting": " hello  world ",
            "debug": True,
            "hosts": ["a.internal", "b.internal"],
        }
        assert settings == expected, f"expected {expected}, got {settings!r}"
        gaps = missing_keys(settings)
        assert gaps == ["token"], f"expected ['token'], got {gaps!r}"

    record("quoted values keep whitespace and #", quoted_values_keep_their_whitespace_and_hash)
    record("a # inside a value is not a comment", a_hash_inside_a_value_is_not_a_comment)
    record("keyless lines are skipped", keyless_lines_are_skipped)
    record("a quoted value ends at its closing quote", a_quoted_value_ends_at_its_closing_quote)
    record("typing handles signs and case", typing_handles_signs_and_case)
    record("a list value is split and trimmed", a_list_value_is_split_and_trimmed)
    record("a bad boolean is rejected", a_bad_boolean_is_rejected)
    record("an empty value still counts as present", an_empty_value_still_counts_as_present)
    record("a whole file end to end", whole_file_end_to_end)
`

export const parseConfigLesson: PythonLesson = {
  id: "py-l3-parse-config",
  title: "Working across files",
  summary: "Build a config parser across modules, using a read-only helper and real test files.",
  estimatedMinutes: 35,
  difficulty: "medium",
  skills: ["modules", "imports", "string-parsing", "type-coercion"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why one file stops being enough

A script that does everything in one file is easy to start and painful to grow. You cannot reuse a function without copying it, you cannot test a rule in isolation, and every edit risks breaking something unrelated. Splitting code into **modules** (one \`.py\` file per responsibility) fixes this. A config parser is a clean example: one module knows how to turn a string into the right type, another knows how to walk lines of text. Each part stays small, testable, and imported only where it is needed.

## What \`import\` actually does

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "import-runs-file-once",
  "prompt": "Two different modules in your project both run 'from app.coerce import coerce'. app/coerce.py has a print() at the top of the file, outside any function. How many times does that line print in one run of the program?",
  "options": [
    {
      "label": "Twice, once for each import statement",
      "feedback": "Tempting, because both import statements really do execute, and an import reads a lot like a function call. But only the first one runs the file. After that Python has the module cached and the second import just binds a name."
    },
    {
      "label": "Once, the first import runs the file and later imports reuse it",
      "correct": true,
      "feedback": "Right. A module is executed once per process and stored in sys.modules, so top-level work (reading a config, opening a connection, building a dict) happens exactly once no matter how many files import it."
    },
    {
      "label": "Zero times, importing one name only pulls in that one function",
      "feedback": "Tempting, because the 'from X import y' form looks surgical, as if it lifted a single function out of the file. But Python has to execute the whole file before the name y exists at all, so every top-level statement runs."
    }
  ]
}
\`\`\`

\`import\` is not a copy-paste of code into your file. When Python first runs \`from app.coerce import coerce\`, it does three things:

1. Finds \`app/coerce.py\`, creates a module object, and registers it in \`sys.modules\` so a repeat import reuses it instead of re-running the file.
2. Executes the file top to bottom, once, populating that module object.
3. Binds the name \`coerce\` into the current file's namespace.

The two import forms differ in the name you get:

\`\`\`python
import app.coerce              # call it as app.coerce.coerce(...)
from app.coerce import coerce  # call it as coerce(...)
\`\`\`

In the Practice workspace the same thing happens across two modules: one imports the other, and both import shared constants from a read-only module. Each rule lives in exactly one place, so fixing it fixes every caller.

## Coercing a raw string to a type

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "isdigit-rejects-minus",
  "prompt": "coerce has to decide whether text is integer-looking. What does '-3'.isdigit() return?",
  "options": [
    {
      "label": "True, because -3 is an integer",
      "feedback": "Tempting, because -3 is obviously an integer to a human reader. But isdigit answers a narrower question: is every single character in this string a digit? The minus sign is not, so you get False."
    },
    {
      "label": "False, because the minus sign is not a digit",
      "correct": true,
      "feedback": "Right. isdigit is a character-by-character test, so a sign, a decimal point, or a stray space all make it False. That is exactly why coerce strips a leading minus before testing."
    },
    {
      "label": "It raises a ValueError, since -3 needs int() to parse",
      "feedback": "Close in spirit: int('-3x') really would raise. But isdigit is a predicate on a string, not a parser. It never raises for ordinary text, it just answers True or False."
    }
  ]
}
\`\`\`

Config values arrive as strings, so \`coerce\` has to decide whether a value is really an integer:

\`\`\`python
>>> "  hi ".strip()
'hi'
>>> "-3".isdigit()               # the "-" makes this False
False
>>> "-3".lstrip("-").isdigit()   # strip the sign first, then test
True
>>> int("-3")
-3
\`\`\`

The rule is: trim the string, strip a leading \`-\` before calling \`isdigit\`, return \`int(value)\` when it looks integer, otherwise return the trimmed string. That is your Apply warm-up.

## Parsing \`key = value\` lines

A config file is lines of \`key = value\`. The loop guards blanks and comments, then splits once:

\`\`\`python
for line in text.splitlines():
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        continue
    key, value = stripped.split("=", 1)   # maxsplit=1
    # store key.strip() -> coerce(value.strip())
\`\`\`

Given \`"# db\\nhost = localhost\\nport = 8080"\`, this produces \`{"host": "localhost", "port": 8080}\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "split-without-maxsplit",
  "prompt": "A config file contains the line 'url = http://x/?a=1'. Your loop does key, value = stripped.split('=') with no maxsplit argument. What happens on that line?",
  "options": [
    {
      "label": "It works: split hands back the key and everything after the first =",
      "feedback": "Tempting, because that is the behaviour you want, and it is what split('=', 1) gives you. Plain split has no such limit though: it cuts at every = in the line, so this one produces three pieces, not two."
    },
    {
      "label": "It raises ValueError: too many values to unpack (expected 2)",
      "correct": true,
      "feedback": "Right. split('=') returns three parts here and a two-name assignment cannot absorb three. Passing a maxsplit of 1 cuts on the first = only and leaves any = inside the value intact."
    },
    {
      "label": "It quietly drops everything after the second =, storing url as http://x/?a",
      "feedback": "Close, and that is a real bug you will meet: it is what split('=')[0] and [1] would do, truncating in silence. Tuple unpacking is the louder version. It refuses to guess and raises instead."
    }
  ]
}
\`\`\`

## Pitfalls

- **Splitting without \`maxsplit\`.** \`"url = a=b".split("=")\` returns three parts, so \`key, value = ...\` raises \`ValueError: too many values to unpack (expected 2)\`. Passing \`1\` splits on the first \`=\` only and keeps any \`=\` inside the value intact.
- **Forgetting to trim the key.** \`"host = localhost".split("=", 1)\` gives \`["host ", " localhost"]\`. The value passes through \`coerce\`, which trims it, but the key does not. Store \`"host "\` (with the trailing space) as the key and a later \`config["host"]\` lookup raises \`KeyError\` instead of returning the value. Call \`.strip()\` on the key before storing it.

**Interview nuance:** bounded splitting is the detail interviewers probe when you parse text. \`stripped.split("=", 1)\` splits on the first \`=\` only, so a value that itself contains \`=\` (a URL like \`url = a=b\`, a base64 token, a connection string) stays intact, while a bare \`split("=")\` raises \`ValueError\` the instant a value holds a second delimiter. Pair that with deciding a value's type from the raw string (trim it, strip a leading sign, then test \`isdigit\`) and you are doing real boundary parsing: turning loose text into typed data without trusting its shape.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "which-lines-survive",
  "prompt": "Sort each config line by what the parsing loop above does with it.",
  "buckets": ["Becomes an entry", "Skipped"],
  "items": [
    {
      "label": "name = Ada",
      "bucket": "Becomes an entry",
      "feedback": "The ordinary case. Key 'name' mapped to the string 'Ada', with whitespace trimmed off both sides."
    },
    {
      "label": "# retries = 5",
      "bucket": "Skipped",
      "feedback": "After stripping, the line starts with #, so the comment guard drops it before any splitting happens. Note that it would have parsed cleanly otherwise, which is the point of the guard."
    },
    {
      "label": "a line containing only spaces",
      "bucket": "Skipped",
      "feedback": "stripped is the empty string, which is falsy, so the blank guard catches it first."
    },
    {
      "label": "DEBUG",
      "bucket": "Skipped",
      "feedback": "There is no = anywhere in the line, so unpacking would raise. The 'if = not in stripped' guard is what keeps one malformed line from killing the whole parse."
    },
    {
      "label": "url = a=b",
      "bucket": "Becomes an entry",
      "feedback": "Splitting on the first = only gives key 'url' and value 'a=b'. This is the line that punishes a bare split('=')."
    },
    {
      "label": "port =   8080  ",
      "bucket": "Becomes an entry",
      "feedback": "Key 'port' mapped to the int 8080. coerce trims the value and converts integer-looking text, so the caller gets a number rather than a padded string."
    }
  ],
  "reveal": "Every guard in that loop exists because some real config file broke a parser that lacked it. Your Practice reader has to survive all six of these lines, and the hidden tests check the awkward ones."
}
\`\`\``,
  },
  apply: {
    id: "py-l3-parse-config-apply",
    executionMode: "single-file",
    prompt: `Warm-up: implement \`coerce(raw)\`.

Return an \`int\` when \`raw\` is integer-looking (all digits, optionally with a leading \`-\`),
otherwise return the trimmed string. Examples: \`"42"\` → \`42\`, \`"-3"\` → \`-3\`, \`"  hi "\` → \`"hi"\`.`,
    starterCode: `def coerce(raw):
    # Return an int for integer-looking text, else the trimmed string.
    pass`,
    hints: [
      "Trim first: `value = raw.strip()`.",
      '`value.lstrip("-").isdigit()` is True for "42" and "-3" but not "hi".',
      "When it's integer-looking, `return int(value)`; otherwise `return value`.",
    ],
    referenceSolution: `def coerce(raw):
    value = raw.strip()
    if value.lstrip("-").isdigit():
        return int(value)
    return value`,
    testCases: [
      { input: { raw: "42" }, expected: 42, description: "plain integer" },
      { input: { raw: "-3" }, expected: -3, description: "negative integer" },
      { input: { raw: "  7 " }, expected: 7, description: "integer with whitespace" },
      { input: { raw: "hello" }, expected: "hello", description: "non-numeric stays a string" },
    ],
  },
  practice: {
    id: "py-l3-parse-config-practice",
    executionMode: "workspace",
    prompt: `Repair the deploy tool's settings reader after ticket DEP-412: one release authenticated with
a token that still had its inline comment glued on, one crashed on a quoted password whose spaces
were trimmed away, one booted with \`port\` set to the word "eighty", and one booted with no host
because the checker stopped at the first missing key.

The work spans two modules that meet at one seam. In \`settings/lines.py\`, implement
\`split_entries(text)\`, which returns \`(key, raw_value)\` tuples in file order. It skips blanks,
\`#\` comment lines, lines with no \`=\`, and lines whose key is empty. It splits on the first \`=\`
only, runs a quoted value to its closing quote and keeps the inside exactly, and otherwise ends the
value where an inline comment begins. Duplicate keys are kept, in order.

In \`settings/rules.py\`, implement \`typed_value(key, raw)\`, \`build_settings(text)\`, and
\`missing_keys(settings)\`. \`typed_value\` does not sniff the type from the text: it converts to the
type the key was declared with in \`VALUE_TYPES\` and raises \`ValueError\` when the text does not
fit, so a typo is caught at boot. \`build_settings\` reads the file through \`split_entries\` and lets
the last entry for a key win. \`missing_keys\` returns every absent key from \`REQUIRED_KEYS\`,
sorted, not the first one.

\`README.md\` has the full contract, including the table of declared types. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "The two modules divide the work cleanly: only the reader is allowed to trim, so by the time a value reaches `typed_value` its whitespace is already whatever it is meant to be.",
      "In the reader, decide the value in one small helper with the cases in priority order: a value that opens a quote, then a value that is nothing but a comment, then a value with a comment after it. `str.find` takes a start index, which is how you locate a closing quote without matching the opening one.",
      "In the rules, the key decides everything, so the first thing `typed_value` does is a lookup in `VALUE_TYPES`, and every branch after that is one declared type. The warm-up already showed you how to test integer-looking text; the difference here is that failing the test is an error rather than a fallback. `build_settings` gets last-wins for free from the order `split_entries` hands you, and `missing_keys` is one sorted comprehension.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "settings/lines.py",
      editableFilePaths: ["settings/lines.py", "settings/rules.py"],
      visibleTestPaths: ["tests/test_lines.py", "tests/test_rules.py"],
      hiddenTestPaths: ["tests/test_settings_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: README },
        { path: "settings/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "settings/spec.py",
          role: "readonly",
          language: "python",
          content: SPEC,
          description:
            "Required keys, the comment/quote characters, and the declared types (read-only)",
        },
        {
          path: "settings/lines.py",
          role: "editable",
          language: "python",
          content: LINES_STARTER,
          description: "Turn file text into (key, raw_value) entries",
        },
        {
          path: "settings/rules.py",
          role: "editable",
          language: "python",
          content: RULES_STARTER,
          description: "Type the values, resolve duplicates, report missing keys",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_lines.py",
          role: "test",
          language: "python",
          content: TEST_LINES,
          description: "Visible reader tests",
        },
        {
          path: "tests/test_rules.py",
          role: "test",
          language: "python",
          content: TEST_RULES,
          description: "Visible typing and validation tests",
        },
        {
          path: "tests/test_settings_hidden.py",
          role: "test",
          language: "python",
          content: TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_lines", label: "visible lines" },
            { module: "test_rules", label: "visible rules" },
            { module: "test_settings_hidden", label: "hidden settings" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "settings/lines.py",
          role: "editable",
          language: "python",
          content: LINES_REFERENCE,
        },
        {
          path: "settings/rules.py",
          role: "editable",
          language: "python",
          content: RULES_REFERENCE,
        },
      ],
    },
  },
}
