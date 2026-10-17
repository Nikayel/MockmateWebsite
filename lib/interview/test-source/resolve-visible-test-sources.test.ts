import { describe, expect, it } from "vitest"
import { bugfixOnboardingScenario } from "@/lib/scenarios/real-world/bugfix/bugfix-onboarding"
import { resolveVisibleTestSources } from "./resolve-visible-test-sources"

const name = "does not explain an adjustment with a row that was already reconciled"
const result = {
  description: "visible reconciliation lookup: " + name,
  input: "visible reconciliation lookup",
  passed: false,
}
const path = "tests/reconciliation.test.js"
const file = { path, content: 'record("' + name + '", () => {})' }

describe("public test source resolution", () => {
  it("finds the actual onboarding failure without changing scenario content", () => {
    const workspace = bugfixOnboardingScenario.workspace!
    expect(
      resolveVisibleTestSources([result], workspace.files, workspace.visibleTestPaths).get(result)
    ).toBe(path)
  })

  it("uses a runner's explicit public suite path for dynamic titles", () => {
    const dynamic = { ...result, input: "./tests/math.test.ts", description: "generated title" }
    expect(
      resolveVisibleTestSources(
        [dynamic],
        [{ path: "tests/math.test.ts", content: "" }],
        ["tests/math.test.ts"]
      ).get(dynamic)
    ).toBe("tests/math.test.ts")
  })

  it("does not infer a source from an ambiguous title", () => {
    const duplicate = { ...file, path: "tests/second.test.js" }
    expect(
      resolveVisibleTestSources([result], [file, duplicate], [path, duplicate.path]).size
    ).toBe(0)
  })

  it("requires an available declared public test file", () => {
    expect(resolveVisibleTestSources([result], [file], []).size).toBe(0)
    expect(resolveVisibleTestSources([result], [], [path]).size).toBe(0)
    expect(resolveVisibleTestSources([result], [{ ...file, hidden: true }], [path]).size).toBe(0)
    expect(resolveVisibleTestSources([{ ...result, isHidden: true }], [file], [path]).size).toBe(0)
    expect(resolveVisibleTestSources([{ ...result, passed: true }], [file], [path]).size).toBe(0)
  })

  it("ignores comments and incidental string values", () => {
    for (const content of [
      "// " + file.content,
      "/* " + file.content + " */",
      'const expected = "' + name + '"',
    ]) {
      expect(resolveVisibleTestSources([result], [{ ...file, content }], [path]).size).toBe(0)
    }
  })

  it("handles punctuation, quoted titles, and Python record calls", () => {
    const title = "credits: don't match [settled] rows (again)?"
    const quoted = { ...result, description: result.input + ": " + title }
    const python = {
      path: "tests/checks.py",
      language: "python",
      content: '# record("ignored", fn)\nrecord(' + JSON.stringify(title) + ", check)",
    }
    expect(resolveVisibleTestSources([quoted], [python], [python.path]).get(quoted)).toBe(
      python.path
    )
  })

  it("does not fall back to a filename for unknown or malformed results", () => {
    for (const query of [
      { ...result, input: {} },
      { ...result, description: "missing prefix" },
      { ...result, description: result.input + ": " },
    ]) {
      expect(resolveVisibleTestSources([query], [file], [path]).size).toBe(0)
    }
  })
})
