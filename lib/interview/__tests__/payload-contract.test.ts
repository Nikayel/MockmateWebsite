/**
 * SLICE 0 — Behavior contract (acceptance oracle for the interview-page refactor).
 *
 * The refactor is behavior-preserving: the same API calls with the same request
 * bodies, in the same shapes. Rather than hand-copy the inline payload builders
 * (which would duplicate logic and rot), this test statically scans the entire
 * interview feature surface for the request/persistence "sinks" and snapshots the
 * exact field set each one sends:
 *
 *   - fetch(<url>, { method, body: JSON.stringify({ ...keys }) })
 *   - saveSessionState(sessionId, { ...keys })              (Firestore autosave)
 *   - { sessionState: { ...keys } }                          (guest-session PUT autosave)
 *   - const sessionData = { ...keys }                        (localStorage autosave)
 *
 * Because it scans `app/interview/**`, `lib/interview/**` and the adopted
 * interview hooks, the contract stays found as logic moves out of page.tsx into
 * `_hooks/` during the refactor. If a slice drops, renames, or adds a payload
 * field, the snapshot changes and the slice must prove the change is an intended
 * no-op (or be reverted). DO NOT blindly `-u` this snapshot to make a slice pass.
 */
import { readdirSync, readFileSync, statSync } from "fs"
import { resolve } from "path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "../../..")

// Directories that are wholly interview-specific — scan recursively.
const SCAN_DIRS = ["app/interview", "lib/interview"]

// Interview hooks/services that live alongside non-interview code in lib/hooks.
// Listed explicitly so the contract stays scoped as the refactor adopts them.
const SCAN_FILES = [
  "lib/hooks/useInterviewSession.ts",
  "lib/hooks/useInterviewPhase.ts",
  "lib/hooks/useHintAgent.ts",
  "lib/hooks/use-streaming-feedback.ts",
]

function collectSourceFiles(): string[] {
  const out: string[] = []
  const walk = (abs: string) => {
    for (const entry of readdirSync(abs)) {
      if (entry.startsWith("._")) continue
      const full = resolve(abs, entry)
      const st = statSync(full)
      if (st.isDirectory()) {
        if (entry === "__tests__" || entry === "node_modules") continue
        walk(full)
      } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
        out.push(full)
      }
    }
  }
  for (const dir of SCAN_DIRS) walk(resolve(ROOT, dir))
  for (const f of SCAN_FILES) out.push(resolve(ROOT, f))
  return out
}

function objectKeys(node: ts.ObjectLiteralExpression): string[] {
  const keys: string[] = []
  for (const prop of node.properties) {
    if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
      const name = prop.name
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) keys.push(name.text)
      else keys.push("<computed>")
    } else if (ts.isSpreadAssignment(prop)) {
      keys.push("...spread")
    }
  }
  return keys.sort()
}

function unwrapJsonStringify(node: ts.Expression): ts.ObjectLiteralExpression | null {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "JSON" &&
    node.expression.name.text === "stringify" &&
    node.arguments.length > 0 &&
    ts.isObjectLiteralExpression(node.arguments[0])
  ) {
    return node.arguments[0]
  }
  return null
}

type Contract = Record<string, string[][]>

function addContract(contract: Contract, label: string, keys: string[]) {
  if (!contract[label]) contract[label] = []
  contract[label].push(keys)
}

function scanContract(): Contract {
  const contract: Contract = {}

  for (const file of collectSourceFiles()) {
    const text = readFileSync(file, "utf8")
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

    const visit = (node: ts.Node) => {
      // fetch("/api/...", { method, body: JSON.stringify({...}) })
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "fetch" &&
        node.arguments.length >= 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const url = node.arguments[0].text
        const opts = node.arguments[1]
        let method = "GET"
        let keys: string[] = ["<no-json-body>"]
        if (opts && ts.isObjectLiteralExpression(opts)) {
          for (const prop of opts.properties) {
            if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue
            if (prop.name.text === "method" && ts.isStringLiteral(prop.initializer)) {
              method = prop.initializer.text
            }
            if (prop.name.text === "body") {
              const obj = unwrapJsonStringify(prop.initializer)
              if (obj) keys = objectKeys(obj)
            }
          }
        }
        addContract(contract, `fetch ${method} ${url}`, keys)
      }

      // saveSessionState(sessionId, { ...firestore autosave fields })
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "saveSessionState" &&
        node.arguments.length >= 2 &&
        ts.isObjectLiteralExpression(node.arguments[1])
      ) {
        addContract(contract, "saveSessionState(sessionId, {...})", objectKeys(node.arguments[1]))
      }

      // const sessionData = { ...localStorage autosave fields }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "sessionData" &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        addContract(contract, "localStorage sessionData", objectKeys(node.initializer))
      }

      // { sessionState: { ...guest autosave fields } }
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "sessionState" &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        addContract(contract, "guest-session sessionState", objectKeys(node.initializer))
      }

      ts.forEachChild(node, visit)
    }
    visit(sf)
  }

  // Normalize: sort each label's occurrences for a deterministic snapshot.
  const normalized: Contract = {}
  for (const label of Object.keys(contract).sort()) {
    normalized[label] = contract[label]
      .map((keys) => keys)
      .sort((a, b) => a.join(",").localeCompare(b.join(",")))
  }
  return normalized
}

describe("interview payload contract (Slice 0 oracle)", () => {
  it("captures every API request/persistence field set across the interview feature", () => {
    const contract = scanContract()
    expect(contract).toMatchSnapshot()
  })

  it("still sends the core endpoints with their key fields", () => {
    const contract = scanContract()
    // Spot-checks that fail loudly if a whole endpoint disappears during refactor.
    const labels = Object.keys(contract)
    expect(labels.some((l) => l === "fetch POST /api/generate-feedback")).toBe(true)
    expect(labels.some((l) => l.startsWith("fetch POST /api/chat"))).toBe(true)
  })

  it("no longer POSTs /api/execute from the interview — code runs client-side (Piston deprecated)", () => {
    // Intentional contract change: `executeScenario` runs the in-browser sandbox
    // (`executeScenarioInBrowser`) and the server-side Piston `/api/execute` fallback was removed.
    // See lib/piston.ts (@deprecated) and code-execution-helpers.ts.
    const contract = scanContract()
    expect(Object.keys(contract).some((l) => l === "fetch POST /api/execute")).toBe(false)
  })
})
