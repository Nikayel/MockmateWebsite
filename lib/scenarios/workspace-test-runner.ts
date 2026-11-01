/** Shared assert-suite protocol for authored JavaScript workspaces; runs in Node and the worker. */
export function createJavaScriptTestRunner(suites: Array<{ name: string; path: string }>): string {
  return `const suites = ${JSON.stringify(suites)}
const results = []
function failure(suite, name, error) {
  results.push({ suite, name, passed: false, error: error instanceof Error ? (error.message || error.name) : String(error), isHidden: suite.startsWith("hidden") })
}
async function record(suite, name, fn) {
  try { await fn(); results.push({ suite, name, passed: true, error: null, isHidden: suite.startsWith("hidden") }) }
  catch (error) { failure(suite, name, error) }
}
;(async () => {
  for (const { name: suite, path } of suites) {
    try {
      const before = results.length
      await require(path).runTests((name, fn) => record(suite, name, fn))
      if (results.length === before) throw new Error("Suite reported no test results")
    } catch (error) { failure(suite, "load or execute test suite", error) }
  }
  if (!results.length) failure("runner", "execute workspace tests", new Error("No test suites configured"))
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
})().catch((error) => {
  failure("runner", "execute workspace tests", error)
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
})
`
}
