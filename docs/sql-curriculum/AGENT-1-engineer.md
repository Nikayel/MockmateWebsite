# AGENT 1 — SQL course engineer ("ship the spec")

The build-agent runbook: turn `docs/sql-curriculum/SPEC.md` into a working **Learn SQL & Databases**
feature on the existing Learn-Python machinery. Mirrors the Python course's `AGENT-1-backend-engineer.md`.
Its job is the **engine + a thin vertical slice + wiring** so the curriculum agent (AGENT 2) can then
pour in all 46 lessons. **Reuse, don't rebuild** — the only genuinely new subsystem is the sql.js runner.

---


