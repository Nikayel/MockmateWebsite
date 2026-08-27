# Lab 01 — "Prove It": a cheat-proof research sandbox

Catalog entry for CodeSparring — **workbook #2**. This is the sbx repo
(`Nikayel/finance-agent`) repackaged as a Sprint Lab.

Its real job in the doc set is to prove the content model is not accidentally
hardcoded to Meridian: a different language, a different domain, seven sprints
instead of ten, and one sprint that no agent may touch. If it doesn't fit
`workbook.yaml` without a code change, the schema is wrong.
See [`WORKBOOK-SPEC.md`](WORKBOOK-SPEC.md) §6.

---

## Catalog card

**Title:** Prove It — Build a Sandbox That Catches a Lying Backtest
**Track:** Systems / Backend · **Language:** Python 3.11 (stdlib only)
**Length:** 7 sprints · ~18 tickets · 12–16 h
**Level:** Senior / Staff
**Prereqs:** comfortable with processes, files and pytest

> **The pitch.** An AI can produce a beautiful Sharpe ratio in thirty seconds
> and almost all of them are garbage — the strategy peeked at the future, or
> the number can't be re-derived. You will build the harness that makes both
> impossible: untrusted strategy code runs in a sealed subprocess that is
> physically never given tomorrow's data, and every run is recorded as
> `(data_hash, code_hash, seed) → result` so `verify` can re-derive it
> byte-for-byte. Your final exam is a strategy that beats the honest one — and
> your own harness proving it was never a measurement.

**You will learn to:** design a security boundary at the OS layer instead of
in-process; make an API where a whole class of bug *cannot be expressed*;
canonicalize data so a hash means something; make an append-only log survive
`kill -9`; hunt nondeterminism; and write the attacks that break your own work.

**Topics:** process isolation · `setrlimit` / seatbelt · subprocess protocols ·
canonical serialization · content addressing · durability & torn writes ·
determinism · adversarial testing · CI that verifies its own history

---

## Why this one is different

Most "build X from scratch" labs grade you on *does it work*. This one grades
you on **can you show it works** — which is the actual bottleneck now that a
model can produce plausible code faster than you can read it.

Three mechanics carry that, and they're worth reusing in every later workbook:

1. **The red/green history gate.** CI replays every commit you make. A commit
   whose subject starts `Add failing` must be red; every other commit must be
   green. You cannot retro-fit the tests. This is the only lab that grades your
   *commit log*.
2. **Containment is reported, not asserted.** The cell reports which guarantees
   were actually in force on the machine it ran on, and tests that depend on an
   absent guarantee **skip with a stated reason** instead of passing quietly. A
   ticket fails if you make a claim the platform can't back.
3. **Sprint 5 is unassisted.** You must write the attacks by hand. A gate whose
   attacks were written by the same process that built the gate proves nothing —
   so the editor's AI is off for that sprint, and the platform says why.

---

## Sprint map

| # | Sprint | Tickets | The thing you actually learn |
|---|---|---|---|
| 1 | **Skeleton** | Package layout, `argparse` dispatch, exit-code contract, `--version` | A CLI's exit codes and stderr are part of its public API. A fifth verb is a design failure, and there's a test that fails if one appears. |
| 2 | **Sealed data** | Content-addressed store, canonical JSON, append-only ledger, tamper detection | Floats can't be in a hash. `ls` re-hashes the bytes instead of trusting its own manifest. And the newline — not the write — is the commit marker. |
| 3 | **The cell** | Subprocess isolation, `setrlimit` caps, host watchdog, `killpg` escalation | Every in-process defence (stripping builtins, `__subclasses__` games) is escapable by construction. The boundary has to be the kernel. |
| 4 | **Time gate** | Length-prefixed frame protocol, sim-clock, the `Market` client, fill rule | The future isn't *hidden* from the strategy — it has not been written into that process's memory yet. `dir()`, `gc.get_objects()` find nothing. |
| 5 | **Attack it** 🚫AI | ≥8 hand-written cheating strategies: seek-ahead, hold refs across ticks, replay the pipe, monkeypatch the client, read `/proc`, probe the limits | Adversarial thinking is the skill. This is the sprint that can't be delegated, and the lab enforces it. |
| 6 | **Determinism** | Pin every nondeterminism source, mutation-test the pins, ship `verify` | The mutation suite is the point: unpin the source, prove the instability was *real*, then prove your fix holds. |
| 7 | **The demo** | One command on a fresh clone: seal → run honest / cheater / peeker → `verify` | Ship the artifact that makes the argument in 40 seconds without you narrating it. |

**Capstone (graded, timed):** you're handed a strategy with a 2.9 PnL and a
clean-looking diff. Decide whether to sign it off. The correct answer is a
`DIVERGED` and a one-paragraph explanation of *which* line made it
irreproducible.

---

## Hidden-test flavour (the escaped defects)

What separates a pass from a strong pass, per sprint — these are the tests the
learner doesn't see until submit:

- **S2:** `kill -9` mid-append, then append again. Naive code fuses the
  fragment into the next line and bricks the ledger forever. Needs a torn-tail
  discard under `flock(LOCK_EX)`.
- **S2:** a manifest carrying a timestamp is not idempotent — seal the same
  file twice and the digests must match.
- **S3:** `RLIMIT_CPU` with soft == hard sends `SIGKILL`, not `SIGXCPU`, on
  Linux. You need a one-second hard-limit grace or your handler never runs.
- **S3:** `RLIMIT_AS` is refused outright by macOS. Memory has to be policed by
  the host, or your product behaves differently on two platforms.
- **S3:** a strategy that swallows `SIGTERM`. Escalation must reach `SIGKILL`
  on the process *group*.
- **S4:** an oversized length prefix must be refused **before** the body is read.
- **S6:** `isoformat()` drops `.000000` on whole seconds, so one instant
  reaches the ledger as two different strings and `verify` diverges on
  identical input.
- **S6:** hashing anything host-dependent (a tick count, a duration) makes
  every host-stopped run irreproducible on someone else's machine.

Each of these is a real bug that was found and fixed in the reference build,
which is why they read like traps rather than exercises.

---

## Reference build (proof the lab is real)

- 70 commits, each replayed by CI as red-or-green per its subject line
- 743 tests · 2,635 lines of `src` · **zero runtime dependencies**
- CI matrix: macOS + Ubuntu × Python 3.11 + 3.13, plus a fresh-venv install
  smoke, plus the demo on a clean clone, plus the history replay
- Reference repo: <https://github.com/Nikayel/finance-agent>

Use the reference commits as the retro diffs: at the end of each sprint the
learner sees how the reference solved the same ticket, and the message that
went with it.
