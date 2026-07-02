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
  const { code, files, entrypoint } = event.data
  const logs = []

  try {
    const pyodide = await loadPyodideRuntime()

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
        const workspaceRoot = `/home/pyodide/workspace_${workspaceRunCounter++}`
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
