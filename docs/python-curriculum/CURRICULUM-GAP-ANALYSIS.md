# Learn Python — Curriculum Gap Analysis

**Scope reviewed:** 46 shipped lessons across L1 Foundations → L4 Production.
**Lens:** what a learner genuinely *needs* — for coding interviews (this course feeds an interview-practice product), for real Python jobs, and to avoid the bugs that bite every beginner — that the current tree misses or under-teaches.
**Method:** matched the stated coverage against the topics a working Python dev and interview candidate must have. I flagged only genuine gaps; I note where a topic is *technically present but buried too late or too shallow*, which is its own kind of gap.

---

## A. Beginner-survival gaps (L1–L2)

### 1. `enumerate` / `zip` / `dict.items()` iteration idioms
**What's missing:** L1 teaches `for`/`while`/`range`/`break`/`continue`, but never the three idioms Python developers actually loop with. There is no `enumerate` (index + value), no `zip` (parallel iteration over two lists), and — critically — no lesson shows iterating a dict with `.items()` / `.keys()` / `.values()`.
**Why it's needed:** These appear in nearly every real script and the majority of interview solutions. Without them learners write the C-style `for i in range(len(xs)): xs[i]` anti-pattern and manual index bookkeeping that graders and interviewers flag immediately. "Iterate two lists together" and "loop with a counter" are day-one job tasks.
**Severity:** **High** — glaring omission, daily-use, trivial to add.
**Slot:** L1, new lesson directly after `for/while/range/break/continue` (or fold into it): *"Looping like a Pythonista: enumerate, zip, and iterating dicts."*

### 2. Identity vs equality: `is` vs `==`, and `is None`
**What's missing:** L1 covers booleans/None/truthiness, but not the identity operator or the `is` vs `==` distinction.
**Why it's needed:** This is one of the most common real bugs and a frequent interview gotcha: `x == None` vs `x is None`, `if x is True`, and the trap that `is` *sometimes* works on small ints/interned strings and then silently breaks on larger values. Because the course already teaches `None`, the omission leaves learners writing `== None` and misusing `is` for value comparison.
**Severity:** **High** — classic latent bug, tiny addition, directly reinforces existing None content.
**Slot:** L1, extend the booleans/None/truthiness lesson (or a 5-minute lesson right after it).

### 3. Python's data model: references, mutability, mutable default args, `copy` vs `deepcopy`
**What's missing:** Three linked, high-severity items with no home:
- **Pass-by-object-reference / aliasing** — that `b = a` on a list doesn't copy, and mutating through one name changes the other.
- **The mutable-default-argument trap** (`def f(x=[])`) — L1 teaches "functions + defaults" but almost certainly does not surface this specific footgun.
- **`copy.copy` vs `copy.deepcopy`** — shallow vs deep copy of nested structures.
**Why it's needed:** This cluster produces the single most common category of "why did my other list change?" bugs in real codebases, and the mutable-default-arg question is a near-guaranteed interview screen. It's also conceptual bedrock: learners can't reason about functions, classes, or data pipelines correctly without the reference model.
**Severity:** **High** — highest real-world bug frequency + interview staple.
**Slot:** L1, a dedicated lesson after lists/dicts: *"How Python holds your data: references, mutability, and copying"*; add the mutable-default-arg gotcha explicitly into the existing functions lesson.

### 4. Recursion
**What's missing:** Not taught anywhere. Functions, defaults, and tracebacks are covered; recursion is not.
**Why it's needed:** Recursion is an interview fundamental (tree/graph traversal, divide-and-conquer, backtracking) and a conceptual prerequisite for understanding call stacks, `RecursionError`, and much of the DSA material this product exists to support. Its absence is conspicuous for a course that feeds an interview platform.
**Severity:** **High** (given the interview-prep mission) — otherwise Medium.
**Slot:** End of L1 functions module or start of L2, as its own lesson (base case / recursive case / stack depth / when to prefer iteration).

### 5. Environment & package basics: `venv` + `pip` + `requirements.txt`
**What's missing:** The *only* environment lesson is `uv`/`pyproject` at **L3**. There is no plain `python -m venv`, `pip install`, `pip freeze`, or `requirements.txt`.
**Why it's needed:** This is a genuine survival skill and it arrives far too late. Nearly every existing job, tutorial, CI config, and Stack Overflow answer assumes `venv` + `pip`; `uv` is excellent but still the minority tool. A learner who reaches L3 before knowing how to install a package or isolate dependencies has been unable to run real third-party code for the entire beginner arc.
**Severity:** **High** — foundational, and currently mis-sequenced.
**Slot:** Early — L1 (a short "running Python & installing packages" lesson) or the top of L2's modules/imports module. Keep `uv`/`pyproject` at L3 as the modern follow-up.

### 6. `if __name__ == "__main__":`
**What's missing:** No explicit lesson. It may be *used* in L3 CLI code, but the idiom itself — and *why* it exists (import-vs-run, avoiding side effects on import) — is never taught.
**Why it's needed:** Every script and every reviewer expects it; not understanding it causes "my code runs when I import it" bugs and confusion about module execution. It's also a common "explain this line" interview prompt.
**Severity:** **Medium**.
**Slot:** L2 modules/imports lesson (explicit), reinforced in the L3 CLI lesson.

### 7. Interactive debugging: `breakpoint()` / `pdb`
**What's missing:** L1 teaches *reading* tracebacks; L4 covers *profiling*. Nothing covers *interactive debugging* — `breakpoint()`, stepping, inspecting frames — the actual loop developers use to fix bugs.
**Why it's needed:** "How do you debug?" is a standard interview question and a daily job skill. Print-debugging alone is a real ceiling for beginners.
**Severity:** **Medium**.
**Slot:** L1 (extend the tracebacks lesson to add `breakpoint()`), or L3 near logging. *Caveat:* verify `pdb`/`breakpoint()` behaves in the Pyodide executor; if not, teach it conceptually with a runnable print/logging fallback.

### 8. Numeric precision: floating-point pitfalls, `round`, `Decimal`
**What's missing:** L1 covers ints/floats/arithmetic but (almost certainly) not the `0.1 + 0.2 != 0.3` reality, `round()`'s banker's-rounding surprises, or `Decimal` for money.
**Why it's needed:** Currency/tax/financial calculations are extremely common in real jobs, and float-equality bugs are a frequent source of failing tests. "Why is this sum off by a penny?" is a real support ticket.
**Severity:** **Medium**.
**Slot:** L1 ints/floats lesson (add the caveat) with `Decimal` introduced in L2.

### 9. Small but high-use syntax: ternary expression, tuple unpacking / swap, `match`/`case`
**What's missing:** The conditional expression `a if cond else b`; multiple assignment / swap (`a, b = b, a`) and basic tuple unpacking as an *early* idiom (currently unpacking only appears via `*args` in L2); and structural pattern matching (`match`/`case`, 3.10+).
**Why it's needed:** Ternaries and unpacking are pervasive in idiomatic code and comprehensions; interviewers expect them. `match`/`case` is increasingly common in modern codebases.
**Severity:** **Low–Medium** (ternary/unpacking Medium as they're everyday; `match`/`case` Low).
**Slot:** Ternary + unpacking into L1 (variables / if-else lessons); `match`/`case` a short L2 lesson after if/elif.

---

## B. Standard-library & real-work gaps (L2–L3)

### 10. `re` — regular expressions
**What's missing:** Entirely absent from all four levels.
**Why it's needed:** Regex is a core tool for real jobs (log parsing, validation, data cleaning, scraping, ETL) and a recurring interview topic. A Python course that reaches "Production" (L4) without ever mentioning `re` has a real hole.
**Severity:** **High**.
**Slot:** L2, new lesson near string methods / stdlib: *"Pattern-matching text with `re`"* (search/match/findall/groups/sub, raw strings, when *not* to use regex). Reinforce in L3 file-processing.

### 11. `collections`: `Counter`, `defaultdict`, `namedtuple`, `deque`
**What's missing:** L2 lists `collections` under "stdlib," but the specific power tools aren't broken out. `Counter` (frequency counts), `defaultdict` (grouping), and `deque` (O(1) queue) are the ones that matter.
**Why it's needed:** These are interview *gold* (frequency/anagram/grouping problems collapse to one line) and constant in production data code. Teaching them explicitly separates learners who write 10-line manual counting loops from those who don't.
**Severity:** **Medium** (High for the interview track).
**Slot:** L2, expand the stdlib lesson into a dedicated *"Better data structures with `collections`"* lesson.

### 12. `datetime` in depth: `strptime`/`strftime`, `timedelta`, naive vs aware
**What's missing:** `datetime` is named in L2 stdlib, but parsing/formatting (`strptime`/`strftime`), date arithmetic (`timedelta`), and — most importantly — **timezone-aware vs naive datetimes** are under-taught.
**Why it's needed:** Date/time handling is ubiquitous and notoriously bug-prone; naive-vs-aware confusion and format-string mistakes cause real production incidents (off-by-hours, DST, "works on my machine" timezone bugs). Parsing/formatting dates is a routine job task.
**Severity:** **Medium**.
**Slot:** L2 stdlib module (dedicated datetime lesson), with adjacency to L3 file-processing.

### 13. Text encoding / bytes / Unicode
**What's missing:** No coverage of `str` vs `bytes`, `.encode()`/`.decode()`, UTF-8, or `UnicodeDecodeError`.
**Why it's needed:** File and network/data work routinely hits encoding errors; "why won't this CSV open?" and `UnicodeDecodeError` are among the first real-world walls beginners hit. Relevant the moment L2 introduces file/json/csv work.
**Severity:** **Medium**.
**Slot:** L2 (context-managers/json/csv lesson) or L3 pathlib/file-processing.

### 14. Consuming a simple HTTP API — earlier
**What's missing:** APIs first appear at **L3** as full REST-with-`httpx`+`pydantic`. There's no earlier, simpler "GET some JSON from a URL and use it" moment.
**Why it's needed:** Calling an API and parsing JSON is one of the most motivating and common early real tasks; deferring it until L3's heavyweight treatment means beginners never touch the single most "this feels like a real job" skill. (This also aligns with the product's own emphasis on APIs.)
**Severity:** **Medium**.
**Slot:** L2, a lightweight lesson adjacent to json/context-managers (a single `httpx.get(...).json()`), with L3 remaining the rigorous REST/pydantic treatment.

### 15. `sqlite3` / DB-API glue (Python side of databases)
**What's missing:** No database interaction from Python — `sqlite3`, the DB-API, cursors, parameterized queries. *(Noted: a separate new SQL course covers SQL itself.)*
**Why it's needed:** Even with SQL taught elsewhere, learners still need the Python-side bridge: connecting, executing parameterized queries (and *why* string-formatting SQL is an injection bug), fetching rows, transactions. This is standard job work and a natural handoff point to the SQL course.
**Severity:** **Medium** (the SQL-language gap is covered; the Python-glue gap is not).
**Slot:** L3, a new lesson bridging to the SQL course (`sqlite3` + parameterized queries + safe interpolation).

---

## C. Career / data-engineering-adjacent gaps

### 16. Big-O / complexity thinking — introduced *early*, not at L4
**What's missing:** "Complexity" is technically present, but only inside L4's `profiling/complexity/lru_cache` lesson — i.e., after 40+ lessons and framed as an advanced/production concern. There is no *early* mental model for "which data structure and why," e.g. dict/set membership is O(1) vs list membership O(n).
**Why it's needed:** This product exists to prepare people for coding interviews, where Big-O reasoning and data-structure selection are *the* evaluation axis. Learners need "use a set for membership, a dict for lookup, and here's why" while they're *learning* lists/dicts (L1–L2), not as an L4 afterthought. The current placement means the most interview-critical mindset arrives last.
**Severity:** **High** (directly on-mission for an interview-prep product).
**Slot:** A light conceptual lesson at end of L1 / start of L2 (*"Choosing the right data structure: cost of operations"*); keep L4 profiling as the deep, measurement-based dive.

### 17. Testing mindset — introduced earlier
**What's missing:** All testing lives in L3 (`pytest`). There's no `assert` or "write a tiny check for your function" moment in L1–L2.
**Why it's needed:** Testing-as-you-go is a habit best built early; introducing `assert` and a one-line self-check alongside functions/exceptions in L2 makes the L3 pytest jump smaller and instills a professional reflex. "How do you know your code works?" is both a job expectation and an interview question.
**Severity:** **Medium**.
**Slot:** L2 (add `assert` + minimal self-testing to the functions/exceptions lessons); full `pytest` stays L3.

### 18. `numpy` / `pandas` data work
**What's missing:** No numerical or dataframe work anywhere.
**Why it's needed:** For any data-engineering / data-analysis / ML-adjacent career path — explicitly called out as a target — `pandas` and `numpy` are non-negotiable, and they're the skill that converts "I know Python" into "I can do the job." (Pyodide supports both, so they can run client-side.) The severity is audience-dependent: **High** for a DE/data track, **Low** for a pure backend/software track — hence Medium overall, and it should likely be an *optional module* rather than core spine.
**Severity:** **Medium** (High for DE-track learners).
**Slot:** New optional L3 module *"Data work with numpy & pandas"* (arrays, dataframes, select/filter/groupby, read_csv), positioned as a track, not a gate.

---

## D. Lower-priority / note-level items

- **`input()` / stdin** — beginners expect interactive scripts, but the browser (Pyodide) executor likely can't support blocking stdin. *Recommendation:* teach it conceptually with a clear "won't run in the browser sandbox" note rather than a runnable exercise, so learners aren't blindsided in a terminal later. **Low.**
- **Walrus `:=`, self-documenting f-strings `f"{x=}"`, format-spec mini-language** (padding, thousands separators, `:.2f`) — idiomatic polish; fold as asides into existing L1/L2 f-string and comprehension lessons. **Low.**
- **Mutating a list/dict while iterating it** (`RuntimeError`/skipped-element bug) — a common real bug; can be a one-paragraph callout in the collections/loops material. **Low–Medium.**
- **Interview *patterns* bridge** (hashmap/two-pointer/sliding-window as Python idioms) — presumably owned by the separate DSA course (per `HANDOFF-WhyDSA`); worth an explicit cross-link from L2 so learners see the handoff. **Note only.**

---

## Top 8 to add first (ranked)

| # | Gap | Severity | Where it slots | Why it's #-ranked |
|---|-----|----------|----------------|-------------------|
| 1 | `enumerate` / `zip` / `dict.items()` iteration idioms | High | L1, after for/while loops | Daily-use, glaring omission, cheap to add, unblocks idiomatic loops everywhere |
| 2 | Data model: references, mutable default arg, `copy`/`deepcopy` | High | L1, after lists/dicts (+ functions lesson) | Highest real-world bug frequency + guaranteed interview question |
| 3 | Big-O / data-structure-choice thinking, taught early | High | End L1 / start L2 (deep dive stays L4) | Directly on-mission for an interview-prep product; currently mis-sequenced to L4 |
| 4 | `is` vs `==` and `is None` (identity vs equality) | High | L1, extend booleans/None lesson | Classic latent bug, tiny addition, reinforces existing None content |
| 5 | `venv` + `pip` + `requirements.txt` basics | High | Early L1/L2 (uv stays L3) | Survival skill currently stranded at L3; blocks running real code for the whole beginner arc |
| 6 | Recursion | High | End L1 / start L2 | Interview staple + conceptual prerequisite for the DSA material this product supports |
| 7 | `re` (regular expressions) | High | L2, near strings/stdlib | Entirely absent; core to real jobs (parsing/validation/ETL) and interviews |
| 8 | `collections`: `Counter` / `defaultdict` / `namedtuple` / `deque` | Med–High | L2, expand stdlib lesson | Interview "gold," constant in production data code; turns 10-line loops into one line |

*Strongest honorable mentions (add next): deeper `datetime` (naive-vs-aware), `if __name__ == "__main__"`, earlier testing/`assert`, interactive debugging (`breakpoint()`/`pdb`), and — for the data track — a `numpy`/`pandas` module.*