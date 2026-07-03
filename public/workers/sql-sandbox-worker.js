// Web Worker for SQL execution through sql.js (SQLite compiled to WASM).
//
// Mirrors public/workers/python-sandbox-worker.js: the WASM module is compiled ONCE per session
// (the expensive step) and kept warm; every run creates a fresh in-memory `SQL.Database` (cheap) so
// one exercise's schema can never leak into the next. Message protocol matches the Python worker:
//   { type: "status" }      progress while the engine boots
//   { type: "exec-start" }  boot done — the runner swaps its generous boot timeout for a tight one
//   { type: "result" }      final payload
//
// Two grading modes:
//   single-file → run seed, run the learner's SELECT via a PREPARED statement (so the column list
//                 survives even a 0-row result), return { columns, rows }.
//   workspace   → run seed + the learner's multi-statement script, run hidden assertion queries
//                 (dbt "count of violations = 0"), and emit the byte-identical
//                 "__WORKSPACE_TEST_RESULTS__:" + JSON marker the Python workspace runner emits.
let sqlReadyPromise = null

function postStatus(message) {
  self.postMessage({ type: "status", message, timestamp: Date.now() })
}

function loadSqlRuntime() {
  if (!sqlReadyPromise) {
    sqlReadyPromise = (async () => {
      postStatus("Loading SQL engine...")
      // Self-hosted under public/wasm/ (same-origin) — no CDN fetch, so cold start is fast and
      // there are no CSP/network surprises. `initSqlJs` is defined by sql-wasm.js on the global.
      importScripts("/wasm/sql-wasm.js")
      const SQL = await initSqlJs({ locateFile: (file) => `/wasm/${file}` })
      postStatus("SQL engine ready")
      return SQL
    })().catch((error) => {
      // Do NOT cache a failed load — a later run should be able to retry without a page reload.
      sqlReadyPromise = null
      throw error
    })
  }
  return sqlReadyPromise
}

/** Normalize a sql.js prepared statement into { columns, rows } — columns survive a 0-row result. */
function runSelect(db, sql) {
  const stmt = db.prepare(sql)
  try {
    const columns = stmt.getColumnNames()
    const rows = []
    while (stmt.step()) {
      rows.push(stmt.get())
    }
    return { columns, rows }
  } finally {
    stmt.free()
  }
}

/** Sum of COUNT(*) across every user table — the idempotency signal (same script twice → same rows). */
function totalRowCount(db) {
  const tables = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  )
  let total = 0
  if (tables.length) {
    for (const [name] of tables[0].values) {
      const counted = db.exec(`SELECT COUNT(*) FROM "${name}"`)
      total += counted.length ? Number(counted[0].values[0][0]) : 0
    }
  }
  return total
}

function gradeWorkspace(SQL, { seedSql, code, assertions, checkIdempotency }) {
  const results = []
  const db = new SQL.Database()
  try {
    if (seedSql) db.exec(seedSql)

    let scriptError = null
    try {
      db.exec(code)
    } catch (error) {
      scriptError = error && error.message ? error.message : String(error)
    }

    if (scriptError) {
      // The learner's script itself didn't run — one honest failure, no assertions to check.
      results.push({
        suite: "script",
        name: "Your script runs without a SQL error",
        passed: false,
        error: scriptError,
        isHidden: false,
      })
      return results
    }

    for (const assertion of assertions || []) {
      try {
        const res = db.exec(assertion.sql)
        const violations = res.length ? res[0].values.length : 0
        results.push({
          suite: assertion.suite,
          name: assertion.name,
          passed: violations === 0,
          error: violations ? `${violations} row(s) violated this check` : null,
          isHidden: !!assertion.isHidden,
        })
      } catch (error) {
        results.push({
          suite: assertion.suite,
          name: assertion.name,
          passed: false,
          error: error && error.message ? error.message : String(error),
          isHidden: !!assertion.isHidden,
        })
      }
    }

    if (checkIdempotency) {
      // A SECOND fresh DB, seeded identically, with the learner script run twice. An idempotent
      // script (DROP IF EXISTS → CREATE → INSERT, or a MERGE/upsert) leaves the same row count.
      const twice = new SQL.Database()
      try {
        if (seedSql) twice.exec(seedSql)
        twice.exec(code)
        const first = totalRowCount(twice)
        twice.exec(code)
        const second = totalRowCount(twice)
        results.push({
          suite: "idempotency",
          name: "Running your script twice yields the same row count",
          passed: first === second,
          error:
            first === second ? null : `First run left ${first} row(s); second run left ${second}`,
          isHidden: false,
        })
      } catch (error) {
        results.push({
          suite: "idempotency",
          name: "Running your script twice yields the same row count",
          passed: false,
          error: error && error.message ? error.message : String(error),
          isHidden: false,
        })
      } finally {
        twice.close()
      }
    }

    return results
  } finally {
    db.close()
  }
}

self.onmessage = async function (event) {
  const { mode, seedSql, code, assertions, checkIdempotency } = event.data || {}

  try {
    const SQL = await loadSqlRuntime()

    // Pre-warm ping: compile the WASM module eagerly on lesson mount, then return before the first
    // real Run so the learner never waits on a cold start.
    if (mode === "warm") {
      self.postMessage({ type: "result", success: true, logs: [] })
      return
    }

    // Boot is done; tell the runner to start its (short) execution timeout.
    self.postMessage({ type: "exec-start", timestamp: Date.now() })

    if (mode === "workspace") {
      const results = gradeWorkspace(SQL, { seedSql, code, assertions, checkIdempotency })
      // Emit the marker as a log line, exactly like the Python workspace runner's stdout — so the
      // main-thread runner parses it with the same scan and the results pipeline is reused verbatim.
      self.postMessage({
        type: "result",
        success: true,
        logs: [
          {
            type: "log",
            message: "__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results),
            timestamp: Date.now(),
          },
        ],
      })
      return
    }

    // single-file: seed, then run the learner's SELECT and return { columns, rows }.
    const db = new SQL.Database()
    try {
      if (seedSql) db.exec(seedSql)
      const result = runSelect(db, code)
      self.postMessage({ type: "result", success: true, result, logs: [] })
    } finally {
      db.close()
    }
  } catch (error) {
    self.postMessage({
      type: "result",
      success: false,
      error: error && error.message ? error.message : String(error),
      logs: [],
    })
  }
}
