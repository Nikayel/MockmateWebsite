import { defineBugfixScenario } from "../../define-bugfix-scenario"
import { createJavaScriptTestRunner } from "../../workspace-test-runner"
import { model, solver, renderer, readme } from "./maze-navigation/source"
import { visibleTests, hiddenTests } from "./maze-navigation/tests"

export const bugfixMazeNavigationScenario = defineBugfixScenario({
  id: "bugfix-maze-navigation",
  title: "Maze Library: Paths Fail After Directional Cells and Doors",
  type: "bugfix",
  companyAlignment: "meta-maze",
  executionMode: "workspace",
  difficulty: "hard",
  description:
    "A maze viewer loses its endpoint labels and rejects routes through its newer corridor types.",
  task: "Repair the maze library so path search and rendering satisfy the documented navigation rules.",
  userReport:
    "The route preview no longer labels the start and exit, and some mazes with arrows or doors show no route even when a player can finish them.",
  tags: ["javascript", "graphs", "state-space", "multi-file", "real-codebase"],
  estimatedTime: 60,
  problemStatement: `The maze library already parses grids, searches for routes, and renders a preview. The ordinary corridor test still passes, but previews and newer navigation features fail.

Read README.md and the model before editing. First repair rendering, then verify ordinary traversal, directional cells, and keys/doors in that order. Preserve the public APIs and the original maze. Return any shortest legal route, or null when the exit is unreachable. Finish by explaining the time and space costs of your implementation with three possible keys.`,
  buggyCode: { javascript: solver },
  codebaseFiles: {
    javascript: [{ fileName: "src/maze.js", content: model, description: "Read-only grid model" }],
  },
  expectedBehavior:
    "Search finds a shortest legal path under the arrow and key contracts, and rendering preserves special cells and the original grid.",
  bugDescription: "",
  hints: [
    "Separate the route the solver returns from what the preview displays.",
    "Trace a route by hand under the documented movement rules before changing a condition.",
  ],
  testCases: [
    {
      input: { rows: ["#S##", "#>.E", "####"] },
      expected: "a legal route to the exit",
      description: "Workspace suites exercise rendering and navigation contracts",
    },
  ],
  expectedTouchedFiles: ["src/solver.js", "src/render.js"],
  successCriteria: [
    "Rendering retains all special cells without mutating the grid.",
    "Every returned path is legal and shortest, including when keys are needed.",
    "Unreachable cyclic mazes terminate and return null.",
    "Explain the search-state bound and the memory cost of storing paths.",
  ],
  workspace: {
    language: "javascript",
    primaryFilePath: "src/solver.js",
    editableFilePaths: ["src/solver.js", "src/render.js"],
    visibleTestPaths: ["tests/maze.test.js"],
    hiddenTestPaths: ["tests/maze.hidden.test.js"],
    testRunnerPath: "tests/run-workspace-tests.js",
    files: [
      { path: "README.md", role: "docs", language: "markdown", content: readme },
      { path: "src/maze.js", role: "readonly", language: "javascript", content: model },
      { path: "src/solver.js", role: "editable", language: "javascript", content: solver },
      { path: "src/render.js", role: "editable", language: "javascript", content: renderer },
      { path: "tests/maze.test.js", role: "test", language: "javascript", content: visibleTests },
      {
        path: "tests/maze.hidden.test.js",
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
          { name: "visible maze", path: "./maze.test" },
          { name: "hidden maze", path: "./maze.hidden.test" },
        ]),
      },
    ],
  },
})
