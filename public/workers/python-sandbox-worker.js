// Web Worker for Python execution through Pyodide.
let pyodideReadyPromise = null
// Monotonic counter used to give each workspace run its own filesystem dir so
// files from a previous scenario can never leak into a later one.
let workspaceRunCounter = 0

function postStatus(message) {
  self.postMessage({
    type: "status",
    message,
    timestamp: Date.now(),
  })
}

function serializeValue(value) {
  if (value && typeof value.toJs === "function") {
    const converted = value.toJs({ dict_converter: Object.fromEntries })
    // The JS copy is independent of the Python object, so release the proxy to
    // avoid leaking PyProxies across a long session.
    if (typeof value.destroy === "function") {
      try {
        value.destroy()
      } catch {
        // Already destroyed / not destroyable — ignore.
      }
    }
    return converted
  }
  return value
}

async function loadPyodideRuntime() {
  if (!pyodideReadyPromise) {
    pyodideReadyPromise = (async () => {
      postStatus("Downloading Python runtime...")
      importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js")

      postStatus("Initializing Python runtime...")
      const pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
      })

      postStatus("Python runtime ready")
      return pyodide
    })().catch((error) => {
      // Do NOT cache a failed load — otherwise every later run replays the same
      // rejection and the runtime can never recover without a full page reload.
      pyodideReadyPromise = null
      throw error
    })
  }

  return pyodideReadyPromise
}

/** Every workspace run gets its own directory under this prefix. */
const WORKSPACE_ROOT_PREFIX = "/home/pyodide/workspace_"

/**
 * Drop the previous run's workspace modules from the import cache.
 *
 * `sys.modules` is keyed by module NAME, not by path, so a fresh directory per run does
 * NOT give a fresh import: run 2's `import solution` finds run 1's entry and returns it,
 * and the learner's edit is silently ignored. Only the first run in a page load ever
 * reflected their code -- every later Run re-graded the first, and a reload was the only
 * way out. That is the same forged pass the fresh-globals namespace below exists to
 * prevent; globals were just the layer it was caught at.
 *
 * Purging by workspace path prefix (rather than diffing against a boot snapshot) touches
 * only the learner's own modules, so a previously imported stdlib or micropip package
 * stays warm.
 *
 * `invalidate_caches()` matters too: the FS finder caches directory listings, and we are
 * writing brand-new files under a brand-new path on every run.
 */
async function purgeWorkspaceModules(pyodide) {
  await pyodide.runPythonAsync(`
import sys, importlib

def _from_workspace(module):
    path = getattr(module, "__file__", None)
    if path:
        return str(path).startswith(${JSON.stringify(WORKSPACE_ROOT_PREFIX)})
    # Namespace packages carry __path__ and no __file__.
    for entry in getattr(module, "__path__", None) or ():
        if str(entry).startswith(${JSON.stringify(WORKSPACE_ROOT_PREFIX)}):
            return True
    return False

for _name in [n for n, m in list(sys.modules.items()) if m is not None and _from_workspace(m)]:
    del sys.modules[_name]

importlib.invalidate_caches()
`)
}

function ensureParentDirectories(pyodide, path) {
  const parts = path.split("/").filter(Boolean)
  let currentPath = ""

  for (let index = 0; index < parts.length - 1; index++) {
    currentPath += `/${parts[index]}`
    try {
      pyodide.FS.mkdir(currentPath)
    } catch {
      // Directory already exists.
    }
  }
}

self.onmessage = async function (event) {
  const { code, files, entrypoint, warm } = event.data
  const logs = []

  try {
    const pyodide = await loadPyodideRuntime()

    // Pre-warm ping: boot the runtime eagerly on workspace mount, then return before
    // executing anything so the user's first real Run never pays the cold start.
    if (warm) {
      self.postMessage({ type: "result", success: true, logs: [] })
      return
    }

    pyodide.setStdout({
      batched: (message) => {
        logs.push({ type: "log", message, timestamp: Date.now() })
      },
    })
    pyodide.setStderr({
      batched: (message) => {
        logs.push({ type: "error", message, timestamp: Date.now() })
      },
    })

    // Boot is done; tell the runner to start its (short) execution timeout.
    self.postMessage({ type: "exec-start", timestamp: Date.now() })

    let executionResult

    // Fresh globals per run: user definitions must NOT persist across runs, or a
    // previous run's function could satisfy a test the current code no longer
    // defines (a forged pass). CPython injects __builtins__ into a bare dict.
    const namespace = pyodide.toPy({})

    try {
      if (Array.isArray(files) && entrypoint) {
        // Before anything is written: the previous run's modules must not answer this
        // run's imports. See purgeWorkspaceModules.
        await purgeWorkspaceModules(pyodide)

        const workspaceRoot = `${WORKSPACE_ROOT_PREFIX}${workspaceRunCounter++}`
        pyodide.FS.mkdir(workspaceRoot)

        for (const file of files) {
          const filePath = `${workspaceRoot}/${file.path.replace(/^\.?\//, "")}`
          ensureParentDirectories(pyodide, filePath)
          pyodide.FS.writeFile(filePath, file.content)
        }

        const previousCwd = pyodide.FS.cwd()
        pyodide.FS.chdir(workspaceRoot)
        try {
          executionResult = await pyodide.runPythonAsync(
            `exec(open(${JSON.stringify(entrypoint)}).read())`,
            { globals: namespace }
          )
        } finally {
          pyodide.FS.chdir(previousCwd)
          // Reclaim the run's files so the FS does not grow across a session.
          try {
            await pyodide.runPythonAsync(
              `import shutil; shutil.rmtree(${JSON.stringify(workspaceRoot)}, ignore_errors=True)`
            )
          } catch {
            // Best-effort cleanup.
          }
        }
      } else {
        executionResult = await pyodide.runPythonAsync(code, { globals: namespace })
      }

      self.postMessage({
        type: "result",
        success: true,
        result: serializeValue(executionResult),
        logs,
      })
    } finally {
      if (typeof namespace.destroy === "function") {
        try {
          namespace.destroy()
        } catch {
          // Ignore.
        }
      }
    }
  } catch (error) {
    self.postMessage({
      type: "result",
      success: false,
      error: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : undefined,
      logs,
    })
  }
}
