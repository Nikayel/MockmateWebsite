import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const CFG_README = `# Postmortem: the startup log printed a database password

The billing service logs one \`app.startup\` record on boot. Last week that record was shipped to the
log aggregator with a live database password inside it, because the redactor only looked at the top
level of the config and the password sits one level down, inside the parsed \`database\` value. The
same review found that nobody can say which config layer a value came from.

Two files are yours. \`service/spec.py\` and \`service/errors.py\` are read-only.

## \`service/config.py\`

\`\`\`python
load_settings(file_values, env, overrides=None)
\`\`\`

Returns one settings dict built from four layers. Later layers win:

1. \`DEFAULTS\` from \`spec.py\`
2. \`file_values\`, keyed by field name (\`"port"\`, \`"database"\`, ...)
3. \`env\`, keyed by \`ENV_PREFIX\` plus the upper-cased field name (\`"APP_PORT"\`)
4. \`overrides\`, keyed by field name

Rules that hold for every layer:

- A key that is not in \`FIELD_TYPES\` is ignored, and so is an env name that does not start with
  \`ENV_PREFIX\`.
- An env value that is empty or only whitespace counts as **not set**, so the layer below it stands.
- String values are coerced to the type \`FIELD_TYPES\` names: \`"int"\`, \`"bool"\`
  (\`true\`/\`1\`/\`yes\` and \`false\`/\`0\`/\`no\`, any case), \`"json"\`, or \`"str"\`. A value that is already
  a non-string is taken as-is, since an override can pass a real \`int\`.
- A string that will not coerce raises \`ConfigError\` (from \`service/errors.py\`) whose message
  contains the **field name**, so an operator reading the crash knows which variable to fix.

\`\`\`python
load_settings({"port": "9000"}, {"APP_PORT": "9100"}, {"port": 9200})["port"]  # 9200
\`\`\`

## \`service/log_record.py\`

\`\`\`python
is_secret_key(key)          # True when the key names a secret
redact_record(value)        # a copy with every secret value replaced by REDACTED
build_startup_record(file_values, env, overrides=None)
\`\`\`

\`is_secret_key\` uses the \`SECRET_HINTS\` in \`spec.py\`. \`redact_record\` walks dicts **and lists** to
any depth. \`build_startup_record\` returns:

\`\`\`python
{"event": "app.startup", "config": <the redacted settings>, "secrets_present": [<field names>]}
\`\`\`

\`secrets_present\` is the sorted list of secret-named fields that are set, so an on-call engineer can
tell a key was configured without ever seeing it.

Some tests are hidden. One of them serializes the whole record to JSON and asserts that no secret
value appears anywhere in the text.
`

const CFG_SPEC = String.raw`"""Read-only config contract shared by the loader and the logger."""

FIELD_TYPES = {
    "port": "int",
    "max_retries": "int",
    "debug": "bool",
    "region": "str",
    "api_token": "str",
    "db_password": "str",
    "database": "json",
}

DEFAULTS = {"port": 8000, "max_retries": 3, "debug": False, "region": "us-east-1"}

ENV_PREFIX = "APP_"

SECRET_HINTS = ("token", "secret", "password", "api_key", "apikey")

REDACTED = "[redacted]"
`

const CFG_ERRORS = String.raw`class ConfigError(ValueError):
    """Raised when a config value cannot be coerced to the type the spec names."""
`

const CFG_CONFIG_STARTER = String.raw`import json

from service.errors import ConfigError
from service.spec import DEFAULTS, ENV_PREFIX, FIELD_TYPES


def coerce_value(field, value):
    """Turn one raw value into the type FIELD_TYPES names (see README.md)."""
    # TODO: coerce strings by field type and raise ConfigError naming the field when that fails.
    return value


def load_settings(file_values, env, overrides=None):
    """Merge the defaults, file, env, and override layers (see README.md)."""
    # TODO: apply the four layers in precedence order, skipping keys the spec does not name.
    return dict(DEFAULTS)
`

const CFG_CONFIG_REFERENCE = String.raw`import json

from service.errors import ConfigError
from service.spec import DEFAULTS, ENV_PREFIX, FIELD_TYPES

TRUE_WORDS = ("true", "1", "yes")
FALSE_WORDS = ("false", "0", "no")


def coerce_value(field, value):
    if not isinstance(value, str):
        return value
    kind = FIELD_TYPES[field]
    text = value.strip()
    if kind == "int":
        try:
            return int(text)
        except ValueError:
            raise ConfigError(f"{field}: expected an integer, got {value!r}")
    if kind == "bool":
        lowered = text.lower()
        if lowered in TRUE_WORDS:
            return True
        if lowered in FALSE_WORDS:
            return False
        raise ConfigError(f"{field}: expected a boolean, got {value!r}")
    if kind == "json":
        try:
            return json.loads(text)
        except ValueError:
            raise ConfigError(f"{field}: expected JSON, got {value!r}")
    return value


def _apply(settings, values):
    for field, value in values.items():
        if field in FIELD_TYPES:
            settings[field] = coerce_value(field, value)


def load_settings(file_values, env, overrides=None):
    settings = dict(DEFAULTS)
    _apply(settings, file_values)
    for name, value in env.items():
        if not name.startswith(ENV_PREFIX):
            continue
        field = name[len(ENV_PREFIX):].lower()
        if field not in FIELD_TYPES:
            continue
        if isinstance(value, str) and value.strip() == "":
            continue
        settings[field] = coerce_value(field, value)
    _apply(settings, overrides or {})
    return settings
`

const CFG_LOG_STARTER = String.raw`from service.config import load_settings
from service.spec import REDACTED, SECRET_HINTS


def is_secret_key(key):
    """Report whether this key names a secret (see README.md)."""
    # TODO: decide from SECRET_HINTS, ignoring case.
    return False


def redact_record(value):
    """Return a copy with every secret value replaced by REDACTED (see README.md)."""
    # TODO: handle nested dicts and lists, not only the top level.
    return value


def build_startup_record(file_values, env, overrides=None):
    """Build the app.startup log record (see README.md)."""
    # TODO: load the settings, redact them, and list which secret fields are set.
    return {"event": "app.startup", "config": {}, "secrets_present": []}
`

const CFG_LOG_REFERENCE = String.raw`from service.config import load_settings
from service.spec import REDACTED, SECRET_HINTS


def is_secret_key(key):
    lowered = str(key).lower()
    return any(hint in lowered for hint in SECRET_HINTS)


def redact_record(value):
    if isinstance(value, dict):
        return {
            key: REDACTED if is_secret_key(key) else redact_record(inner)
            for key, inner in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [redact_record(item) for item in value]
    return value


def build_startup_record(file_values, env, overrides=None):
    settings = load_settings(file_values, env, overrides)
    return {
        "event": "app.startup",
        "config": redact_record(settings),
        "secrets_present": sorted(field for field in settings if is_secret_key(field)),
    }
`

const CFG_TEST_CONFIG = String.raw`from service.config import load_settings
from service.errors import ConfigError


def run_tests(record):
    def later_layers_win():
        settings = load_settings(
            {"port": "9000", "region": "eu-west-1"},
            {"APP_PORT": "9100", "APP_MAX_RETRIES": "5"},
            {"port": 9200},
        )
        assert settings["port"] == 9200, f"expected port 9200, got {settings['port']!r}"
        assert settings["max_retries"] == 5, f"expected max_retries 5, got {settings['max_retries']!r}"
        assert settings["region"] == "eu-west-1", f"expected region 'eu-west-1', got {settings['region']!r}"
        assert settings["debug"] is False, f"expected debug False from the defaults, got {settings['debug']!r}"

    def coerces_each_declared_type():
        settings = load_settings(
            {"debug": "YES", "database": '{"host": "db1", "password": "hunter2"}'},
            {"APP_PORT": "9000"},
        )
        assert settings["debug"] is True, f"expected debug True for 'YES', got {settings['debug']!r}"
        assert settings["port"] == 9000, f"expected port 9000 as an int, got {settings['port']!r}"
        expected_db = {"host": "db1", "password": "hunter2"}
        assert settings["database"] == expected_db, f"expected {expected_db}, got {settings['database']!r}"

    def bad_integer_names_the_field():
        try:
            load_settings({}, {"APP_PORT": "eight thousand"})
        except ConfigError as exc:
            assert "port" in str(exc), f"expected the message to name 'port', got {str(exc)!r}"
        else:
            raise AssertionError("expected ConfigError for APP_PORT='eight thousand', got no error")

    record("later layers win", later_layers_win)
    record("coerces each declared type", coerces_each_declared_type)
    record("a bad integer names the field", bad_integer_names_the_field)
`

const CFG_TEST_LOG = String.raw`from service.log_record import build_startup_record, is_secret_key, redact_record


def run_tests(record):
    def spots_secret_keys_by_hint():
        for key in ("api_token", "DB_PASSWORD", "stripe_api_key"):
            assert is_secret_key(key) is True, f"expected {key!r} to be secret, got False"
        for key in ("port", "region", "database"):
            assert is_secret_key(key) is False, f"expected {key!r} to be public, got True"

    def redacts_a_nested_password():
        redacted = redact_record({"database": {"host": "db1", "password": "hunter2"}})
        expected = {"database": {"host": "db1", "password": "[redacted]"}}
        assert redacted == expected, f"expected {expected}, got {redacted!r}"

    def startup_record_lists_secret_fields():
        result = build_startup_record({"api_token": "tok-123", "db_password": "hunter2"}, {})
        assert result["event"] == "app.startup", f"expected event 'app.startup', got {result['event']!r}"
        expected_names = ["api_token", "db_password"]
        assert result["secrets_present"] == expected_names, (
            f"expected secrets_present {expected_names}, got {result['secrets_present']!r}"
        )
        assert result["config"]["api_token"] == "[redacted]", (
            f"expected the token redacted, got {result['config']['api_token']!r}"
        )

    record("spots secret keys by hint", spots_secret_keys_by_hint)
    record("redacts a nested password", redacts_a_nested_password)
    record("the startup record lists secret fields", startup_record_lists_secret_fields)
`

const CFG_TEST_HIDDEN = String.raw`import json

from service.config import load_settings
from service.errors import ConfigError
from service.log_record import build_startup_record, redact_record


def run_tests(record):
    def blank_env_value_is_not_set():
        settings = load_settings({"port": "7000"}, {"APP_PORT": "   ", "APP_REGION": ""})
        assert settings["port"] == 7000, f"expected the file value 7000 to stand, got {settings['port']!r}"
        assert settings["region"] == "us-east-1", (
            f"expected the default region 'us-east-1', got {settings['region']!r}"
        )

    def unknown_keys_are_ignored():
        settings = load_settings({"colour": "red"}, {"PORT": "1", "APP_TIMEOUT": "9"})
        assert "colour" not in settings, f"'colour' is not in the spec, got {settings!r}"
        assert "timeout" not in settings, f"'timeout' is not in the spec, got {settings!r}"
        assert settings["port"] == 8000, (
            f"expected 'PORT' without the prefix to be ignored, got port {settings['port']!r}"
        )

    def bad_json_and_bad_bool_name_their_fields():
        try:
            load_settings({"database": "not json"}, {})
        except ConfigError as exc:
            assert "database" in str(exc), f"expected the message to name 'database', got {str(exc)!r}"
        else:
            raise AssertionError("expected ConfigError for database='not json', got no error")
        try:
            load_settings({}, {"APP_DEBUG": "maybe"})
        except ConfigError as exc:
            assert "debug" in str(exc), f"expected the message to name 'debug', got {str(exc)!r}"
        else:
            raise AssertionError("expected ConfigError for APP_DEBUG='maybe', got no error")

    def redaction_reaches_into_lists():
        value = {"replicas": [{"host": "db1", "db_password": "hunter2"}, {"host": "db2"}]}
        redacted = redact_record(value)
        expected = {"replicas": [{"host": "db1", "db_password": "[redacted]"}, {"host": "db2"}]}
        assert redacted == expected, f"expected {expected}, got {redacted!r}"
        assert value["replicas"][0]["db_password"] == "hunter2", (
            "redact_record must not mutate the value it was handed"
        )

    def no_secret_survives_serialization():
        result = build_startup_record(
            {"database": '{"host": "db1", "password": "hunter2", "replicas": [{"api_key": "ak-99"}]}'},
            {"APP_API_TOKEN": "tok-123"},
        )
        dumped = json.dumps(result)
        for leaked in ("hunter2", "ak-99", "tok-123"):
            assert leaked not in dumped, f"{leaked!r} reached the log record: {dumped}"
        assert "db1" in dumped, f"expected the non-secret host to survive, got {dumped}"

    record("a blank env value is not set", blank_env_value_is_not_set)
    record("unknown keys are ignored", unknown_keys_are_ignored)
    record("bad JSON and bad bool name their fields", bad_json_and_bad_bool_name_their_fields)
    record("redaction reaches into lists", redaction_reaches_into_lists)
    record("no secret survives serialization", no_secret_survives_serialization)
`

export const configLoggingLesson: PythonLesson = {
  id: "py-l4-config-logging",
  title: "Configuration, secrets & structured logging",
  summary: "Load typed config from the environment, keep secrets safe, and log structured records.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["configuration", "secrets", "structured-logging", "twelve-factor"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Config lives in the environment, not in your code

A service that hard-codes its port, database URL, or feature flags can only run in one place. Twelve-factor apps push all of that into environment variables so a single build artifact runs unchanged in dev, staging, and prod. You change behavior by changing the environment, never by editing and redeploying code. That is also why the demo's \`load_config\` takes an \`env\` dict as an argument instead of reaching into \`os.environ\` directly: passing the environment in keeps the function pure and trivial to test.

### Environment values are always strings

\`os.environ\` (and the \`env\` dict here) maps strings to strings. There are no ints, bools, or lists inside it. Reading config is therefore two steps: supply a default for missing keys, then coerce the string into the type you actually want.

\`\`\`python
port = int(env.get("PORT", "8000"))          # "9000" becomes 9000
debug = env.get("DEBUG", "false").lower() == "true"
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bool-of-the-string-false",
  "prompt": "A teammate finds the .lower() comparison verbose and simplifies it to debug = bool(env.get('DEBUG', 'false')). Production has DEBUG set to the string false. What is debug in production?",
  "options": [
    {
      "label": "False, since the value literally says false",
      "feedback": "Exactly the reading that lets this through review: the line looks like it says what it means. bool() never inspects the text, it only asks whether the object is empty."
    },
    {
      "label": "True, because every non-empty string is truthy",
      "correct": true,
      "feedback": "Right, and the fallout is worse than a wrong flag. The only value that would give you False here is the empty string, so this flag is on in every environment."
    },
    {
      "label": "False, because bool() parses the text the same way int('9000') parses a number",
      "feedback": "A fair guess given how int() behaves, and the asymmetry is genuinely surprising. int() parses, bool() only measures emptiness, so the two constructors are not the same kind of thing."
    },
    {
      "label": "It raises ValueError, since false is not a valid boolean literal",
      "feedback": "That is what int('abc') would do, and you would be far better off if bool worked that way. bool accepts absolutely any object, which is why this failure is silent."
    }
  ]
}
\`\`\`

\`env.get("PORT", "8000")\` returns the default only when \`"PORT"\` is absent. If the key exists, you get its string value and must convert it yourself.

### Secrets: record presence, never the value

API keys, tokens, and passwords come from the environment too, but they must never appear in source control or in logs. The safe pattern is to log whether a secret is configured, not what it is:

\`\`\`python
has_secret = "SECRET" in env    # a True/False flag is safe to emit; the value is not
\`\`\`

\`"SECRET" in env\` tests key membership, so it stays \`False\` until the key exists and never reads the value.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "safe-way-to-log-a-secret",
  "prompt": "During an incident nobody can tell which API key a pod was started with. Which line is actually safe to add to the startup log?",
  "options": [
    {
      "label": "Log the first four characters, key[:4] plus an ellipsis, so you can tell keys apart",
      "feedback": "Very common in real code and it feels like a compromise. It is still the secret, just less of it, and it lands in whatever aggregator, screenshot, or support ticket the log reaches."
    },
    {
      "label": "Log a boolean, has_api_key set from 'API_KEY' in env",
      "correct": true,
      "feedback": "Right. Presence is what almost every incident actually needs, and membership never touches the value, so there is nothing to leak even if the log level is turned up."
    },
    {
      "label": "Log the full key, but only at DEBUG level so it never reaches production",
      "feedback": "The reasoning holds right up until the incident where someone raises the log level to debug the incident. Log level is a runtime setting, not a security boundary."
    },
    {
      "label": "Log a SHA-256 of the key, so you can compare pods without exposing anything",
      "feedback": "Better than the alternatives above and genuinely used for correlation. It is still a stable fingerprint of a secret, and if the secret has low entropy the hash can be guessed offline, so it is not free."
    }
  ]
}
\`\`\`

### Structured logging

Log machine-readable records, not sentences. Key/value fields let a log system filter and aggregate (for example, find every \`startup\` where \`debug\` was \`True\`):

\`\`\`python
import logging
logger = logging.getLogger(__name__)
logger.info("startup", extra={"port": port, "debug": debug})
\`\`\`

The \`extra\` fields attach to the log record, but they only surface if your handler uses a structured (often JSON) formatter. The default formatter prints just the message text.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "empty-env-var-is-not-missing",
  "prompt": "A deploy template writes PORT= with nothing after the equals sign, so the variable exists with an empty value. Your code is port = int(env.get('PORT', '8000')). What does the service do at boot?",
  "options": [
    {
      "label": "Starts on port 8000, since an empty value counts as unset",
      "feedback": "The assumption behind a great many broken deploys. get only checks whether the key is there, and it is: the value just happens to be the empty string, which is a value like any other."
    },
    {
      "label": "Crashes with ValueError, because int() is handed an empty string",
      "correct": true,
      "feedback": "Right, and crashing at boot is the good outcome. The fix is to treat empty as missing explicitly, for example env.get('PORT') or '8000', so the default covers both cases."
    },
    {
      "label": "Starts on port 0, since int() of an empty string is zero",
      "feedback": "That is how a few other languages behave, and it would be worse than the crash: port 0 tells the OS to pick any free port, so the service would come up somewhere nobody can reach."
    },
    {
      "label": "Starts on port 8000, because get treats an empty string as falsy and falls back",
      "feedback": "You are describing env.get('PORT') or '8000', which really does fall back on empty because or tests truthiness. The default argument to get is chosen by key presence alone."
    }
  ]
}
\`\`\`

### Pitfalls

- \`bool("false")\` is \`True\`. Every non-empty string is truthy, so never coerce a flag with \`bool(...)\`. Compare the lowered string explicitly, as above.
- \`int(env.get("PORT", "8000"))\` raises \`ValueError\` if \`PORT\` is set to \`""\` or \`"abc"\`. A present-but-empty variable is not the same as a missing one, and \`.get\` only defends against the missing case.
- Reusing a reserved field name in \`extra\` (like \`message\` or \`name\`) raises \`KeyError\`. Choose your own keys.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "why-load-config-once",
  "prompt": "A reviewer asks why you build one Config at startup instead of calling os.environ.get wherever a value is needed. What is the strongest answer?",
  "options": [
    {
      "label": "Reading os.environ repeatedly is slow, so caching the values saves real time",
      "feedback": "Tempting because caching usually is a performance argument. os.environ is a dict, so a lookup is nanoseconds, and nothing in a request budget will ever notice it."
    },
    {
      "label": "One place validates everything, so a bad value kills the process at boot instead of on one code path at 3am",
      "correct": true,
      "feedback": "Right. Scattered lookups mean a typo in an env var stays invisible until the one endpoint that reads it runs, which is usually during an incident and rarely on your screen."
    },
    {
      "label": "os.environ is not safe to read from multiple threads",
      "feedback": "It sounds like the kind of thing that would be true, and it is worth being able to reject confidently: reads are perfectly safe. Mutating it at runtime is the questionable practice, not reading it."
    },
    {
      "label": "It keeps the os import in one module, which reduces coupling",
      "feedback": "A tidy side effect, and not nothing in a large codebase. It is a style argument though, and it would not survive a reviewer who asks what actually breaks without it."
    }
  ],
  "reveal": "The three real reasons stack up: validate once and fail fast at boot, hand the function an env dict so tests need no environment at all, and give every request the same snapshot instead of values that can shift under it."
}
\`\`\`

**Interview nuance:** interviewers probe why config should be loaded once, at startup, into a typed object rather than read from \`os.environ\` all over the codebase. Loading once gives you a single place to validate and fail fast, makes the code testable (you inject an \`env\` dict, exactly like this exercise), and guarantees every request sees one consistent snapshot instead of values that could change mid-run.`,
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
    prompt: `Repair the billing service's boot path after a postmortem: its \`app.startup\` log record
went out with a live database password in it, and nobody could say which config layer any value came
from.

In \`service/config.py\`, implement \`coerce_value(field, value)\` and
\`load_settings(file_values, env, overrides=None)\`. The settings come from four layers, later ones
winning: the spec's \`DEFAULTS\`, then \`file_values\`, then \`env\` (keyed by \`ENV_PREFIX\` plus the
upper-cased field name), then \`overrides\`. Keys the spec does not name are ignored, an env value that
is blank or whitespace counts as not set, and a string that will not coerce to its declared type
raises \`ConfigError\` with the field name in the message.

In \`service/log_record.py\`, implement \`is_secret_key\`, \`redact_record\`, and
\`build_startup_record\`. The record is
\`{"event": "app.startup", "config": <redacted settings>, "secrets_present": <sorted field names>}\`.
No secret value may appear anywhere in it, at any depth.

\`README.md\` has the full contract. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Each layer is the same merge step with a different key shape, so the env layer is the only one that has to translate a name and skip blanks.",
      "Coercion belongs in one function keyed off `FIELD_TYPES[field]`, and it returns a non-string value untouched so a typed override passes straight through. Every failure path raises `ConfigError` with an f-string that starts with the field name.",
      "Redaction has to recurse: for a dict, replace the value when `is_secret_key(key)` and otherwise call `redact_record` on it; for a list, map over the items; for anything else return the value. `field = name[len(ENV_PREFIX):].lower()` is the env translation.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "service/config.py",
      editableFilePaths: ["service/config.py", "service/log_record.py"],
      visibleTestPaths: ["tests/test_config.py", "tests/test_log_record.py"],
      hiddenTestPaths: ["tests/test_startup_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CFG_README },
        { path: "service/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "service/spec.py",
          role: "readonly",
          language: "python",
          content: CFG_SPEC,
          description: "Field types, defaults, and secret hints (read-only)",
        },
        {
          path: "service/errors.py",
          role: "readonly",
          language: "python",
          content: CFG_ERRORS,
          description: "ConfigError (read-only)",
        },
        {
          path: "service/config.py",
          role: "editable",
          language: "python",
          content: CFG_CONFIG_STARTER,
          description: "Layered config loading and type coercion",
        },
        {
          path: "service/log_record.py",
          role: "editable",
          language: "python",
          content: CFG_LOG_STARTER,
          description: "Redaction and the startup log record",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_config.py",
          role: "test",
          language: "python",
          content: CFG_TEST_CONFIG,
          description: "Visible layering and coercion tests",
        },
        {
          path: "tests/test_log_record.py",
          role: "test",
          language: "python",
          content: CFG_TEST_LOG,
          description: "Visible redaction tests",
        },
        {
          path: "tests/test_startup_hidden.py",
          role: "test",
          language: "python",
          content: CFG_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case and leak tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_config", label: "visible config" },
            { module: "test_log_record", label: "visible log record" },
            { module: "test_startup_hidden", label: "hidden startup" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "service/config.py",
          role: "editable",
          language: "python",
          content: CFG_CONFIG_REFERENCE,
        },
        {
          path: "service/log_record.py",
          role: "editable",
          language: "python",
          content: CFG_LOG_REFERENCE,
        },
      ],
    },
  },
}
