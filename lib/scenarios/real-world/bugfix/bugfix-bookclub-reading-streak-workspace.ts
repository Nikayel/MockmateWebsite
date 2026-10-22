import type { BugFixScenario } from "../../types"
import { bookclubDocumentationFiles } from "./bookclub/docs"
import { bookclubSourceFiles } from "./bookclub/source"
import { bookclubTestFiles } from "./bookclub/tests"
import { bookclubGuidedLab } from "./bookclub/milestones"

const files = [...bookclubDocumentationFiles, ...bookclubSourceFiles, ...bookclubTestFiles]
const editablePaths = bookclubSourceFiles
  .filter((file) => file.role === "editable")
  .map((file) => file.path)

export const bugfixBookclubReadingStreakWorkspaceScenario: BugFixScenario = {
  id: "bugfix-bookclub-reading-streak-workspace",
  title: "BookClub: Repair the Reader Dashboard",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Generic"],
  description: "Repair broken streaks, missing history, calendar totals, and stale dashboards.",
  task: "Repair BookClub's reader dashboard through the guided phases, using task.md as the product contract.",
  symptom: {
    subject: "Alex",
    tag: "reading streak",
    expected: "3 days",
    actual: "0 days",
    delta: "−3 days",
  },
  userReport:
    "My streak says zero after three days of finishing books. Other readers are also reporting inconsistent profiles after the rollout.",
  tags: ["python", "guided-lab", "real-codebase", "pagination", "time-zones", "caching"],
  estimatedTime: 90,
  problemStatement:
    "Repair the reader dashboard one phase at a time. Open task.md for the incident and acceptance criteria.",
  buggyCode: {
    python: bookclubSourceFiles.find((file) => file.path === "app/services/stats_service.py")!
      .content,
  },
  codebaseFiles: {
    python: files
      .filter((file) => !file.hidden)
      .map((file) => ({
        fileName: file.path,
        content: file.content,
        description: file.description ?? file.role,
      })),
  },
  expectedBehavior:
    "Streaks, paginated history, local monthly totals, and cached dashboards satisfy task.md across consecutive requests.",
  bugDescription: "",
  observedSymptoms: [
    "Alex's streak shows zero after three consecutive completion days.",
    "Support reports missing history entries, month-boundary discrepancies, and stale profiles.",
  ],
  reproductionSteps: [
    "Open task.md and docs/incident.md.",
    "Follow the current phase and Run Tests before editing.",
  ],
  successCriteria: ["Complete each repair phase and the full 36-check release run."],
  debuggingSkills: [
    "reproduction",
    "codebase navigation",
    "stable pagination",
    "calendar boundaries",
    "cache invalidation",
    "regression verification",
  ],
  expectedTouchedFiles: editablePaths,
  hints: [
    "Compare a failing request with the contract in task.md.",
    "Trace the value through routes, services, and the repository.",
    "Verify a sequence of requests as well as isolated calls.",
  ],
  testCases: [
    {
      input: { reader: 1, today: "2026-06-28" },
      expected: { reading_streak: 3, books_this_month: 4, total_pages_read: 1270 },
      description: "Reader dashboard obeys the product contract",
    },
  ],
  guidedLab: bookclubGuidedLab,
  workspace: {
    language: "python",
    primaryFilePath: "app/services/stats_service.py",
    editableFilePaths: editablePaths,
    visibleTestPaths: bookclubTestFiles
      .filter((file) => !file.hidden && file.path.includes("test_"))
      .map((file) => file.path),
    hiddenTestPaths: bookclubTestFiles
      .filter((file) => file.hidden && file.path.includes("test_"))
      .map((file) => file.path),
    testRunnerPath: "tests/run_workspace_tests.py",
    files,
  },
}
