import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const CFG_README = `# Load typed config from the environment

Twelve-factor apps read config from the **environment**, with defaults and type coercion, and never
leak secrets. \`config/defaults.py\` (read-only) holds the defaults. Implement \`load_config(env)\` in
\`config/settings.py\` so it returns:

\`\`\`python
{"port": <int>, "debug": <bool>, "has_secret": <bool>}
\`\`\`

- \`port\`: \`int\` of \`env["PORT"]\` or the default
- \`debug\`: \`True\` only when \`env["DEBUG"]\` is \`"true"\` (case-insensitive), else the default
- \`has_secret\`: whether \`"SECRET"\` is in \`env\` (record presence, never the value)

Some tests are hidden.
`

const CFG_DEFAULTS = String.raw`DEFAULTS = {"PORT": "8000", "DEBUG": "false"}
`

const CFG_SETTINGS_STARTER = String.raw`from config.defaults import DEFAULTS


def load_config(env):
    """Turn an env dict into typed settings (see README.md)."""
    # TODO: coerce PORT to int, DEBUG to bool, and record whether SECRET is present.
    return {}
`

const CFG_SETTINGS_REFERENCE = String.raw`from config.defaults import DEFAULTS


def load_config(env):
    port = int(env.get("PORT", DEFAULTS["PORT"]))
    debug = env.get("DEBUG", DEFAULTS["DEBUG"]).lower() == "true"
    return {"port": port, "debug": debug, "has_secret": "SECRET" in env}
`

const CFG_TEST = String.raw`from config.settings import load_config


def run_tests(record):
    def reads_and_coerces():
        result = load_config({"PORT": "9000", "DEBUG": "true", "SECRET": "abc"})
        assert result == {"port": 9000, "debug": True, "has_secret": True}, f"got {result!r}"

    def applies_defaults():
        result = load_config({})
        assert result == {"port": 8000, "debug": False, "has_secret": False}, f"got {result!r}"

    record("reads and coerces env", reads_and_coerces)
    record("applies defaults", applies_defaults)
`

const CFG_TEST_HIDDEN = String.raw`from config.settings import load_config


def run_tests(record):
    def debug_is_case_insensitive():
        result = load_config({"DEBUG": "TRUE"})
        assert result == {"port": 8000, "debug": True, "has_secret": False}, f"got {result!r}"

    def never_exposes_secret_value():
        result = load_config({"PORT": "3000", "SECRET": "topsecret"})
        assert result == {"port": 3000, "debug": False, "has_secret": True}, f"got {result!r}"
        assert "topsecret" not in result.values(), "the secret value must not be in the config"

    record("DEBUG is case-insensitive", debug_is_case_insensitive)
    record("never exposes the secret value", never_exposes_secret_value)
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
    prompt: `Implement \`load_config(env)\` in \`config/settings.py\`: use the read-only \`DEFAULTS\` for \`PORT\`
and \`DEBUG\`, coerce \`PORT\` to \`int\` and \`DEBUG\` to \`bool\` (\`"true"\` case-insensitive), and set
\`has_secret\` from whether \`"SECRET"\` is present, never its value. Some tests are hidden.`,
    starterCode: "",
    hints: [
      'Port: `int(env.get("PORT", DEFAULTS["PORT"]))`.',
      'Debug: `env.get("DEBUG", DEFAULTS["DEBUG"]).lower() == "true"`.',
      'Record presence only: `"has_secret": "SECRET" in env`.',
    ],
    workspace: {
      language: "python",
      primaryFilePath: "config/settings.py",
      editableFilePaths: ["config/settings.py"],
      visibleTestPaths: ["tests/test_settings.py"],
      hiddenTestPaths: ["tests/test_settings_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CFG_README },
        { path: "config/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "config/defaults.py",
          role: "readonly",
          language: "python",
          content: CFG_DEFAULTS,
          description: "Default config values (read-only)",
        },
        {
          path: "config/settings.py",
          role: "editable",
          language: "python",
          content: CFG_SETTINGS_STARTER,
          description: "Implement load_config here",
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
          content: CFG_TEST,
          description: "Visible config tests",
        },
        {
          path: "tests/test_settings_hidden.py",
          role: "test",
          language: "python",
          content: CFG_TEST_HIDDEN,
          hidden: true,
          description: "Hidden config/secret tests",
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
          path: "config/settings.py",
          role: "editable",
          language: "python",
          content: CFG_SETTINGS_REFERENCE,
        },
      ],
    },
  },
}
