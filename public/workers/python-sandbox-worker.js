// Web Worker for Python execution through Pyodide.
let pyodideReadyPromise = null

function postStatus(message) {
  self.postMessage({
    type: "status",
    message,
    timestamp: Date.now(),
  })
}

function serializeValue(value) {
  if (value && typeof value.toJs === "function") {
    return value.toJs({ dict_converter: Object.fromEntries })
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
    })()
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

    let executionResult

    if (Array.isArray(files) && entrypoint) {
      const workspaceRoot = "/home/pyodide/workspace"
      try {
        pyodide.FS.mkdir(workspaceRoot)
      } catch {
        // Workspace already exists from a previous run.
      }

      for (const file of files) {
        const filePath = `${workspaceRoot}/${file.path.replace(/^\.?\//, "")}`
        ensureParentDirectories(pyodide, filePath)
        pyodide.FS.writeFile(filePath, file.content)
      }

      const previousCwd = pyodide.FS.cwd()
      pyodide.FS.chdir(workspaceRoot)
      try {
        executionResult = await pyodide.runPythonAsync(
          `exec(open(${JSON.stringify(entrypoint)}).read())`
        )
      } finally {
        pyodide.FS.chdir(previousCwd)
      }
    } else {
      executionResult = await pyodide.runPythonAsync(code)
    }

    self.postMessage({
      type: "result",
      success: true,
      result: serializeValue(executionResult),
      logs,
    })
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
