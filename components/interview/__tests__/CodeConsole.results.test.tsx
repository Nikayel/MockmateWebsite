import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { CodeConsole, type TestResult } from "../CodeConsole"

const visibleFailure: TestResult = {
  description: "visible reconciliation lookup: rejects settled rows",
  passed: false,
  input: "visible reconciliation lookup",
  error: "Expected deep equality\nExpected: []\nReceived: [0,1]",
}
const hiddenFailure: TestResult = {
  description: "hidden reconciliation edges: honors the open-row contract",
  passed: false,
  input: "hidden reconciliation edges",
  error: "Expected deep equality, got private-fixture-values vs secret-expectation",
  isHidden: true,
}
const passingTest: TestResult = {
  description: "keeps existing behavior",
  passed: true,
  input: null,
  error: null,
}

function renderResults(results: TestResult[]) {
  const passed = results.filter((result) => result.passed).length
  return renderToStaticMarkup(
    <CodeConsole
      testResults={results}
      testSummary={{
        total: results.length,
        passed,
        failed: results.length - passed,
        passRate: (passed / results.length) * 100,
      }}
    />
  )
}

describe("console failure feedback", () => {
  it("counts visible and hidden failures without repeating assertion output in the lead", () => {
    const html = renderResults([passingTest, visibleFailure, hiddenFailure])
    expect(html).toContain("2 tests failing (1 visible, 1 hidden)")
    expect(html.match(/Received: \[0,1\]/g)).toHaveLength(1)
    expect(html).not.toContain("private-fixture-values")
    expect(html).not.toContain("secret-expectation")
  })

  it("still reports a failure when every visible test passes", () => {
    const html = renderResults([passingTest, hiddenFailure])
    expect(html).toContain("1 test failing (1 hidden)")
    expect(html).not.toContain("private-fixture-values")
  })

  it("keeps assertion failures as test failures even when none pass", () => {
    const html = renderResults([visibleFailure, hiddenFailure])
    expect(html).toContain("2 tests failing (1 visible, 1 hidden)")
    expect(html).not.toContain("Logic Error")
  })

  it("never exposes hidden assertion values through the error banner", () => {
    const html = renderResults([hiddenFailure])
    expect(html).toContain("1 test failing (1 hidden)")
    expect(html).not.toContain("private-fixture-values")
    expect(html).not.toContain("secret-expectation")
  })

  it("retains the diagnostic banner for visible syntax failures", () => {
    const html = renderResults([{ ...visibleFailure, error: "SyntaxError: Unexpected token }" }])
    expect(html).toContain("Syntax Error")
    expect(html).toContain("Unexpected token }")
  })
})
