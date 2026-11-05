import { defineBugfixScenario } from "../../define-bugfix-scenario"
import { createJavaScriptTestRunner } from "../../workspace-test-runner"
import { client, headers, response, readme } from "./http-client-library/source"
import { visibleTests, hiddenTests } from "./http-client-library/tests"

export const bugfixHttpClientLibraryScenario = defineBugfixScenario({
  id: "bugfix-http-client-library",
  title: "Client Library: Requests Interfere and Responses Change Shape",
  type: "bugfix",
  companyAlignment: "stripe-library-debugging",
  executionMode: "workspace",
  difficulty: "medium",
  description:
    "A client-library update changes later requests and returns unexpected response values to callers.",
  task: "Investigate failing client-library regressions and restore request isolation and response decoding contracts.",
  userReport:
    "After an export request, the same client's health request asks for the export format. Some successful responses also arrive as raw strings or throw before we can use them.",
  tags: ["javascript", "http", "library-debugging", "multi-file", "real-codebase"],
  estimatedTime: 45,
  problemStatement: `You are maintaining Parcel, an unfamiliar HTTP client library. Callers report requests affecting later calls, unexpected raw response strings, and failures on successful empty responses.

Read README.md and trace the visible tests through src/client.js before editing. Repair the library modules while keeping the public API, ordinary text responses, transport failures, and HTTP errors unchanged. The injected transport is deterministic and performs no real network calls. Explain each independent regression and the evidence that your repair preserves other callers.`,
  buggyCode: { javascript: headers },
  codebaseFiles: {
    javascript: [
      {
        fileName: "src/client.js",
        content: client,
        description: "Read-only client entry point and transport boundary",
      },
    ],
  },
  expectedBehavior:
    "Every request has independent case-insensitive headers; JSON and no-content responses follow the documented decoding contract without suppressing failures.",
  bugDescription: "",
  hints: [
    "Compare a single request with a sequence using the same client.",
    "Follow one unexpected response value through the documented transport shape and decoder.",
  ],
  testCases: [
    {
      input: { path: "/health", contentType: "application/json; charset=utf-8" },
      expected: "a decoded JSON object",
      description: "Workspace suites exercise public client behavior",
    },
  ],
  expectedTouchedFiles: ["src/headers.js", "src/response.js"],
  successCriteria: [
    "Requests preserve input objects and cannot change later calls.",
    "Header casing and JSON media-type parameters do not change behavior.",
    "No-content responses return null; malformed JSON and transport/HTTP errors still fail.",
  ],
  workspace: {
    language: "javascript",
    primaryFilePath: "src/headers.js",
    editableFilePaths: ["src/headers.js", "src/response.js"],
    visibleTestPaths: ["tests/client.test.js"],
    hiddenTestPaths: ["tests/client.hidden.test.js"],
    testRunnerPath: "tests/run-workspace-tests.js",
    files: [
      { path: "README.md", role: "docs", language: "markdown", content: readme },
      { path: "src/client.js", role: "readonly", language: "javascript", content: client },
      { path: "src/headers.js", role: "editable", language: "javascript", content: headers },
      { path: "src/response.js", role: "editable", language: "javascript", content: response },
      { path: "tests/client.test.js", role: "test", language: "javascript", content: visibleTests },
      {
        path: "tests/client.hidden.test.js",
        role: "test",
        language: "javascript",
        content: hiddenTests,
        hidden: true,
      },
      {
        path: "tests/run-workspace-tests.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: createJavaScriptTestRunner([
          { name: "visible client library", path: "./client.test" },
          { name: "hidden client library", path: "./client.hidden.test" },
        ]),
      },
    ],
  },
})
