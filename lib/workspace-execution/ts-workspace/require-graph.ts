/**
 * The Node-side mirror of js-sandbox-worker.js's hand-rolled CommonJS require-graph, extended for
 * TypeScript: `require("./foo")` and `require("./foo.ts")` both resolve to the SAME compiled
 * `foo.js` module entry (TS/TSX source files are renamed .ts/.tsx -> .js at transpile time; plain
 * .js files keep their own path as the module key). Bare specifiers such as `"assert"` or
 * `"vitest"` are looked up in `specialModules` and returned directly, unresolved.
 *
 * Deliberately a SEPARATE implementation from the worker's copy (not a shared runtime module) —
 * the two run in genuinely different realms (a Worker's global scope vs a `new Function` body in
 * this Node process), and node-harness.ts's header explains why globals specifically must never
 * be shared between them. Keep the resolution algorithm here and in js-sandbox-worker.js's TS
 * branch in sync by hand; both are covered by tests against the same fixture
 * (__tests__/fixtures/five-file-workspace.ts).
 */

export interface ModuleRecord {
  exports: unknown
}

export interface RequireGraphOptions {
  /** Compiled module source, keyed by its .js-normalized path (e.g. "src/math.js"). */
  modules: Record<string, string>
  /** Bare specifiers resolved directly to a value, bypassing path resolution entirely. */
  specialModules: Record<string, unknown>
}

/**
 * Resolves a `require()` target against the requiring module's directory. An explicit `.ts`/
 * `.tsx` extension on the specifier is rewritten to `.js` (the workspace's source files were
 * transpiled and re-keyed that way); an extensionless specifier gets `.js` appended, matching the
 * existing JS/Python workspace convention; `.js`/`.json` specifiers are left alone. A specifier
 * that does not start with "." (a bare module name) is returned unresolved — callers look those
 * up in `specialModules` rather than in the path-keyed `modules` map.
 */
export function resolveTsModulePath(currentDir: string, targetPath: string): string {
  let cleanTarget = targetPath
  if (/\.tsx?$/.test(cleanTarget)) {
    cleanTarget = cleanTarget.replace(/\.tsx?$/, ".js")
  } else if (!cleanTarget.endsWith(".js") && !cleanTarget.endsWith(".json")) {
    cleanTarget += ".js"
  }

  if (!cleanTarget.startsWith(".")) {
    return cleanTarget
  }

  const parts = (currentDir ? currentDir.split("/") : []).concat(cleanTarget.split("/"))
  const stack: string[] = []
  for (const part of parts) {
    if (part === "." || part === "") continue
    if (part === "..") {
      stack.pop()
    } else {
      stack.push(part)
    }
  }
  return stack.join("/")
}

/**
 * Builds a `require(path, currentDir?)` function closed over `modules` and a per-graph instance
 * cache, so requiring the same path twice from different files returns the SAME exports object
 * (real CommonJS singleton-module semantics).
 */
export function createRequireGraph(
  options: RequireGraphOptions
): (path: string, currentDir?: string) => unknown {
  const { modules, specialModules } = options
  const cache: Record<string, ModuleRecord> = {}

  function requireModule(path: string, currentDir = ""): unknown {
    if (Object.prototype.hasOwnProperty.call(specialModules, path)) {
      return specialModules[path]
    }

    const resolved = resolveTsModulePath(currentDir, path)
    if (cache[resolved]) {
      return cache[resolved].exports
    }

    const moduleCode = modules[resolved]
    if (moduleCode === undefined) {
      throw new Error(`Module not found: ${path} (resolved as: ${resolved})`)
    }

    const moduleRecord: ModuleRecord = { exports: {} }
    cache[resolved] = moduleRecord

    const nextDir = resolved.includes("/") ? resolved.slice(0, resolved.lastIndexOf("/")) : ""
    const wrapper = new Function(
      "exports",
      "require",
      "module",
      "__filename",
      "__dirname",
      moduleCode
    ) as (...args: unknown[]) => void
    const localRequire = (target: string) => requireModule(target, nextDir)
    wrapper(moduleRecord.exports, localRequire, moduleRecord, resolved, nextDir)
    return moduleRecord.exports
  }

  return requireModule
}
