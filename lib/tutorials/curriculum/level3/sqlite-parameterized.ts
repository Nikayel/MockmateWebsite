import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const DBKIT_README = `# Ship the data-access module

Your team's data-access module goes out with the next release and the security review sent it back.
Implement the three helpers in \`dbkit/queries.py\`.

**\`build_insert(columns, values)\`** returns a \`(sql, params)\` pair for the \`users\` table. The SQL
carries one \`?\` per column and no values at all; the values travel in the params tuple:

\`\`\`python
build_insert(["name", "email"], ["Ada", "ada@example.com"])
# ("INSERT INTO users (name, email) VALUES (?, ?)", ("Ada", "ada@example.com"))
\`\`\`

The column names come from the app's own schema constant, never from a request, so they are
interpolated. Values never are.

**\`flag_unsafe(sources)\`** is the audit the review asked for. Each item is the source line a
teammate wrote for a query. Return the ones that build the SQL text instead of fixing it, using
these four markers: a \`{\` (an f-string hole), \` + \` (concatenation, with a space either side),
a \`%\` (percent formatting), or the text \`.format(\`. Keep the original order.

**\`rows_to_dicts(columns, rows)\`** turns the driver's tuples into dicts, since \`fetchall\` hands
back \`(1, "Ada")\` and the rest of your program wants \`{"id": 1, "name": "Ada"}\`.

Some tests are hidden.
`

const DBKIT_QUERIES_STARTER = String.raw`def build_insert(columns, values):
    """Return (sql, params) for an INSERT into users (see README.md)."""
    # TODO: one "?" per column, values in the params tuple.
    return "", ()


def flag_unsafe(sources):
    """Return the query source lines that build their SQL text (see README.md)."""
    # TODO: keep a source when it contains "{", " + ", "%", or ".format(".
    return []


def rows_to_dicts(columns, rows):
    """Zip driver tuples against the column names."""
    # TODO: turn each row tuple into a dict keyed by column name.
    return []
`

const DBKIT_QUERIES_REFERENCE = String.raw`UNSAFE_MARKERS = ("{", " + ", "%", ".format(")


def build_insert(columns, values):
    placeholders = ", ".join("?" for _ in columns)
    column_list = ", ".join(columns)
    sql = "INSERT INTO users (" + column_list + ") VALUES (" + placeholders + ")"
    return sql, tuple(values)


def flag_unsafe(sources):
    return [source for source in sources if any(marker in source for marker in UNSAFE_MARKERS)]


def rows_to_dicts(columns, rows):
    return [dict(zip(columns, row)) for row in rows]
`

const DBKIT_TEST = String.raw`from dbkit.queries import build_insert, flag_unsafe, rows_to_dicts


def run_tests(record):
    def builds_one_placeholder_per_column():
        sql, params = build_insert(["name", "email"], ["Ada", "ada@example.com"])
        assert sql == "INSERT INTO users (name, email) VALUES (?, ?)", f"got {sql!r}"
        assert params == ("Ada", "ada@example.com"), f"got {params!r}"

    def flags_an_f_string_query():
        sources = [
            'f"SELECT id FROM users WHERE email = {email}"',
            '"SELECT id FROM users WHERE email = ?"',
        ]
        assert flag_unsafe(sources) == [sources[0]], f"got {flag_unsafe(sources)!r}"

    def maps_rows_onto_column_names():
        rows = [(1, "Ada"), (2, "Sam")]
        result = rows_to_dicts(["id", "name"], rows)
        assert result == [{"id": 1, "name": "Ada"}, {"id": 2, "name": "Sam"}], f"got {result!r}"

    record("one placeholder per column", builds_one_placeholder_per_column)
    record("flags an f-string query", flags_an_f_string_query)
    record("maps rows onto column names", maps_rows_onto_column_names)
`

const DBKIT_TEST_HIDDEN = String.raw`from dbkit.queries import build_insert, flag_unsafe, rows_to_dicts


def run_tests(record):
    def keeps_a_quote_out_of_the_sql_text():
        sql, params = build_insert(["name"], ["O'Brien"])
        assert sql == "INSERT INTO users (name) VALUES (?)", f"got {sql!r}"
        assert params == ("O'Brien",), f"got {params!r}"

    def flags_concatenation_and_percent_formatting():
        sources = [
            '"SELECT id FROM users WHERE email = " + email',
            '"SELECT id FROM users WHERE email = %s" % email',
            '"SELECT id FROM users WHERE email = ?"',
        ]
        assert flag_unsafe(sources) == sources[:2], f"got {flag_unsafe(sources)!r}"

    def maps_an_empty_result_set():
        assert rows_to_dicts(["id", "name"], []) == []

    record("a quote stays out of the sql text", keeps_a_quote_out_of_the_sql_text)
    record("flags concatenation and percent formatting", flags_concatenation_and_percent_formatting)
    record("maps an empty result set", maps_an_empty_result_set)
`

export const sqliteParameterizedLesson: PythonLesson = {
  id: "py-l3-sqlite-parameterized",
  title: "Talking to a database from Python: sqlite3 and parameterized queries",
  summary:
    "Connect, execute, fetch and commit with sqlite3, and keep every value out of the SQL text.",
  estimatedMinutes: 20,
  difficulty: "medium",
  skills: ["standard-library", "data-boundary", "validation", "string-formatting"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## The Python side of a database

The SQL course on this platform teaches the query language: \`SELECT\`, joins, aggregation, window functions. This lesson teaches the other half, the part that lives in your Python file. Writing a correct query is not enough if the code around it splices user input into the statement, forgets to commit, or hands the rest of the program a tuple when it expected a record.

\`sqlite3\` is in the standard library, so there is nothing to install. Every driver you will meet later (\`psycopg\` for Postgres, \`mysqlclient\`, \`pyodbc\`) follows the same DB-API shape, so the four moves below transfer unchanged.

### Connect, execute, fetch

\`\`\`python
import sqlite3

conn = sqlite3.connect("app.db")   # a file, or ":memory:" for a throwaway database
cur = conn.cursor()                # a cursor holds one statement and its result rows

cur.execute("SELECT id, name FROM users WHERE active = 1")
rows = cur.fetchall()              # [(1, 'Ada'), (2, 'Sam')]
conn.close()
\`\`\`

The connection is the session, the cursor is the thing that runs a statement and walks its result. \`fetchall()\` returns every remaining row at once, \`fetchone()\` returns the next row or \`None\`, and iterating the cursor streams rows one at a time (the right choice for a large table).

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "cursor-rows-are-tuples",
  "prompt": "You run cur.execute('SELECT id, name FROM users') and then loop over cur.fetchall(). What is each element of that list?",
  "options": [
    {
      "label": "A dict keyed by column name, like {'id': 1, 'name': 'Ada'}",
      "feedback": "Tempting, because that is what most HTTP APIs hand back and what the rest of your program almost always wants. The driver returns tuples by default, and you get dicts only after setting conn.row_factory yourself."
    },
    {
      "label": "A tuple of column values in SELECT order, like (1, 'Ada')",
      "correct": true,
      "feedback": "Right, and that is why the column order in your SELECT is part of your code's contract. Zip the tuple against the names in cur.description, or set a row_factory, before those values travel any further."
    },
    {
      "label": "An object with .id and .name attributes",
      "feedback": "Tempting, because an ORM like SQLAlchemy really does return objects with attributes, and that is what most people meet first. The raw driver sits one layer below that: it knows rows and columns, not classes."
    }
  ]
}
\`\`\`

### Never build the query text out of values

This is the single most important habit in the lesson. Here is the version that looks fine:

\`\`\`python
name = "Ada"
cur.execute(f"SELECT id FROM users WHERE name = '{name}'")   # WRONG
\`\`\`

It works. It keeps working. It ships. Then a customer named O'Brien signs up, and the statement the database receives is \`WHERE name = 'O'Brien'\`, which closes the string literal after the \`O\` and fails to parse. The same hole that an apostrophe trips by accident is the hole an attacker types on purpose: a \`name\` of \`'; DROP TABLE users; --\` ends your statement early and starts a new one.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "fstring-sql-meets-a-quote",
  "prompt": "A teammate builds a lookup by splicing the name straight into the SQL text with an f-string, between two single quotes. It works for months. Then a customer named O'Brien signs up. What does the database do with that lookup?",
  "options": [
    {
      "label": "Nothing changes. The driver escapes the apostrophe before sending it.",
      "feedback": "Tempting, because ORMs and helper layers really do escape values, so it is easy to assume the driver always handles it. By the time the driver sees this statement the apostrophe is already part of the SQL text, so there is nothing left for it to escape."
    },
    {
      "label": "It fails to parse, because the apostrophe closes the string literal early.",
      "correct": true,
      "feedback": "Right. The database receives name = 'O'Brien', which ends the literal after the O and leaves Brien' as garbage. An apostrophe finds this bug by accident; an attacker types one on purpose."
    },
    {
      "label": "It returns the row anyway, matching on the O before the apostrophe.",
      "feedback": "Tempting, because silent truncation is how a lot of string-handling bugs really do behave, and it would be the friendlier failure. SQL is stricter: the statement never parses, so no row is ever compared."
    }
  ]
}
\`\`\`

The fix is to send the statement and the values as two separate things. A \`?\` marks a slot, and the values ride alongside in a sequence:

\`\`\`python
cur.execute("SELECT id FROM users WHERE name = ?", (name,))
cur.execute("INSERT INTO users (name, email) VALUES (?, ?)", ("Ada", "ada@example.com"))
\`\`\`

The SQL text is now a constant. It does not change when \`name\` changes, so nothing a user types can alter the shape of the statement. The driver ships the values over separately and the database treats them as data, never as syntax. As a bonus, the database can cache the plan for a statement it has already seen.

Note the trailing comma in \`(name,)\`. Without it \`(name)\` is just a parenthesized string, and the driver reads each character as a separate parameter.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "what the driver sends",
    "f-string version",
    "parameterized version"
  ],
  "rows": [
    [
      "statement text",
      "WHERE name = 'O'Brien'",
      "WHERE name = ?"
    ],
    [
      "values",
      "(none, they are in the text)",
      "('O'Brien',)"
    ],
    [
      "result",
      "syntax error, or an injection",
      "one row, every time"
    ]
  ],
  "highlightCols": [
    "parameterized version"
  ],
  "caption": "Parameterizing does not escape the value, it moves the value out of the statement entirely."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "placeholder-is-not-interpolation",
  "prompt": "You switch to a placeholder but wrap it in quotes, writing the condition as WHERE name = '?' and passing the name as a parameter. What does that query match?",
  "options": [
    {
      "label": "The name you passed. The quotes only mark the slot as text.",
      "feedback": "Tempting, because quoting is exactly what you would do around a real value in hand-written SQL, and it looks like the same idea. Inside quotes the question mark stops being a placeholder and becomes an ordinary character."
    },
    {
      "label": "Only a row whose name is literally a question mark, and the driver rejects the extra parameter.",
      "correct": true,
      "feedback": "Right. A quoted question mark is just the one-character string. The placeholder is a slot in the statement rather than a piece of text you quote, so it goes in bare and the driver counts zero slots for your one value."
    },
    {
      "label": "Nothing, because a placeholder inside quotes is a syntax error.",
      "feedback": "Tempting, because plenty of SQL misuse really does raise, and a loud failure is what you would want here. Nothing is malformed though: a quoted question mark is a perfectly legal string literal, which is what makes the mistake so quiet."
    }
  ]
}
\`\`\`

One limit worth knowing: a placeholder can only stand in for a **value**, never for a table name, a column name, or a keyword like \`ASC\`. \`SELECT * FROM ?\` is not valid SQL. When an identifier really has to vary, check it against a fixed allowlist of names your own code owns, then interpolate that checked name.

### Writes are transactions

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "insert-without-commit",
  "prompt": "A script connects, runs an INSERT, prints 'saved', and exits. It never calls conn.commit(). You reopen the database and query the table. What do you find?",
  "options": [
    {
      "label": "No row. The insert was discarded when the connection closed without a commit.",
      "correct": true,
      "feedback": "Right. The driver opens a transaction for you on the first write and throws it away unless you commit. The script printed 'saved' and told you the truth about the statement running, not about it lasting."
    },
    {
      "label": "The row is there. commit only matters when several statements have to land together.",
      "feedback": "Tempting, because grouping really is one job of a transaction and it is the reason usually given for commit. Durability is the other job: until you commit there is nothing permanent to group."
    },
    {
      "label": "The row is there, because sqlite writes to a plain file rather than to a server.",
      "feedback": "Tempting, because a local file feels like it should behave the way open() and write() do. This is a full transactional engine even in a single file: the change lands in a journal first and only joins the database at commit time."
    }
  ],
  "reveal": "A missing commit is the classic first-database bug, and it is quiet: nothing raises, the script prints its success message, and the data is simply not there afterwards. Use the connection as a context manager and it commits on a clean exit and rolls back on an exception."
}
\`\`\`

Every write runs inside a transaction. Nothing is durable until you commit:

\`\`\`python
cur.execute("INSERT INTO users (name) VALUES (?)", ("Ada",))
conn.commit()      # without this, the row disappears when the connection closes
\`\`\`

Better, let the connection manage it for you. Used as a context manager it commits when the block exits cleanly and rolls back when an exception escapes:

\`\`\`python
with conn:
    cur.execute("INSERT INTO users (name) VALUES (?)", ("Ada",))
    cur.execute("INSERT INTO audit (action) VALUES (?)", ("created user",))
# both rows landed, or neither did
\`\`\`

For many rows, \`executemany\` runs one statement against a sequence of parameter tuples in a single transaction, which is far faster than a loop of \`execute\` calls.

### What runs where

\`sqlite3\` is stdlib in CPython, but it is not bundled into the Python build that powers this browser sandbox, so \`import sqlite3\` fails here. Open a terminal in the environment you set up in "Running Python & installing packages" and every snippet above runs as written, against a real file. The exercises below grade the skills that surround the connection, which is where the bugs actually live: building the statement and its parameters as two separate things, auditing query text that was built by formatting, and turning the driver's tuples into records the rest of your program can read.

**Interview nuance:** "why parameterize?" has a weak answer and a strong one. The weak answer is "to stop SQL injection". The strong answer is that a parameterized statement and its values are sent to the database as two different things, so user input is never parsed as syntax. Injection is what that prevents; escaping is a different and worse strategy that tries to neutralize dangerous characters in text you have already merged. Say the second one, then add that placeholders bind values only, so a varying table or column name needs an allowlist instead.`,
    demoCode: `# sqlite3 is not bundled into this browser sandbox, so this demo shows the shape a driver
# receives: a fixed statement, and the values kept separate from it.
def build_lookup(name):
    return "SELECT id FROM users WHERE name = ?", (name,)


for candidate in ["Ada", "O'Brien", "'; DROP TABLE users; --"]:
    sql, params = build_lookup(candidate)
    print(sql, "|", params)`,
  },
  apply: {
    id: "py-l3-sqlite-parameterized-apply",
    executionMode: "single-file",
    prompt: `Warm-up: implement \`build_lookup(email, min_age)\`.

Return the dict \`{"sql": ..., "params": [...]}\` a driver would take, where \`sql\` is exactly
\`"SELECT id, name FROM users WHERE email = ? AND age >= ?"\` and \`params\` is a list holding the two
values in that order. The SQL text is a constant: it must not change when the arguments change.`,
    starterCode: `def build_lookup(email, min_age):
    # Return {"sql": <the parameterized statement>, "params": [email, min_age]}.
    pass`,
    hints: [
      "The statement never varies, so it is a plain string literal with two `?` placeholders in it.",
      "Nothing about `email` or `min_age` belongs in the SQL text. They both go in the params list.",
      'Return `{"sql": sql, "params": [email, min_age]}` with the values in the same order as the placeholders.',
    ],
    referenceSolution: `def build_lookup(email, min_age):
    sql = "SELECT id, name FROM users WHERE email = ? AND age >= ?"
    return {"sql": sql, "params": [email, min_age]}`,
    testCases: [
      {
        input: { email: "ada@example.com", min_age: 21 },
        expected: {
          sql: "SELECT id, name FROM users WHERE email = ? AND age >= ?",
          params: ["ada@example.com", 21],
        },
        description: "an ordinary lookup",
      },
      {
        input: { email: "o'brien@example.com", min_age: 0 },
        expected: {
          sql: "SELECT id, name FROM users WHERE email = ? AND age >= ?",
          params: ["o'brien@example.com", 0],
        },
        description: "an apostrophe leaves the SQL text untouched",
      },
      {
        input: { email: "'; DROP TABLE users; --", min_age: 18 },
        expected: {
          sql: "SELECT id, name FROM users WHERE email = ? AND age >= ?",
          params: ["'; DROP TABLE users; --", 18],
        },
        description: "an injection payload stays a plain value",
      },
      {
        input: { email: "sam@example.com", min_age: 65 },
        expected: {
          sql: "SELECT id, name FROM users WHERE email = ? AND age >= ?",
          params: ["sam@example.com", 65],
        },
        description: "the statement is identical for every input",
      },
    ],
  },
  practice: {
    id: "py-l3-sqlite-parameterized-practice",
    executionMode: "workspace",
    prompt: `Your team's data-access module ships with the next release, and the security review sent it
back. Implement the three helpers in \`dbkit/queries.py\`: \`build_insert\` (one \`?\` per column, values
in the params tuple), \`flag_unsafe\` (return the query source lines that build their SQL text by
formatting), and \`rows_to_dicts\` (zip the driver's tuples against the column names). The README has
the exact markers \`flag_unsafe\` looks for. Some tests are hidden.`,
    starterCode: "",
    hints: [
      '`", ".join("?" for _ in columns)` gives you one placeholder per column, comma separated.',
      "For `flag_unsafe`, keep a source when `any(marker in source for marker in markers)` is true, and keep the input order.",
      "`dict(zip(columns, row))` pairs each column name with the value at the same position.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "dbkit/queries.py",
      editableFilePaths: ["dbkit/queries.py"],
      visibleTestPaths: ["tests/test_queries.py"],
      hiddenTestPaths: ["tests/test_queries_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: DBKIT_README },
        { path: "dbkit/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "dbkit/queries.py",
          role: "editable",
          language: "python",
          content: DBKIT_QUERIES_STARTER,
          description: "Implement the three helpers here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_queries.py",
          role: "test",
          language: "python",
          content: DBKIT_TEST,
          description: "Visible query tests",
        },
        {
          path: "tests/test_queries_hidden.py",
          role: "test",
          language: "python",
          content: DBKIT_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_queries", label: "visible queries" },
            { module: "test_queries_hidden", label: "hidden queries" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "dbkit/queries.py",
          role: "editable",
          language: "python",
          content: DBKIT_QUERIES_REFERENCE,
        },
      ],
    },
  },
}
