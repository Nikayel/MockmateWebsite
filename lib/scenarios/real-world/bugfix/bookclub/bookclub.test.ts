import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "vitest"
import { bugfixBookclubReadingStreakWorkspaceScenario as scenario } from "../bugfix-bookclub-reading-streak-workspace"
import { sealed } from "@/lib/scenarios/sealed/legacy/bugfix-bookclub-reading-streak-workspace.server"
import {
  applyTestRunToProgress,
  acknowledgeMilestone,
  initialGuidedLabProgress,
  isGuidedLabComplete,
} from "@/lib/bugfix/guided-lab/gating"

interface Result {
  suite: string
  name: string
  passed: boolean
  error: string | null
}
const workspace = scenario.workspace!
function run(edits: Map<string, string>): Result[] {
  const root = mkdtempSync(join(tmpdir(), "bookclub-release-"))
  try {
    for (const file of workspace.files) {
      const path = join(root, file.path)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, edits.get(file.path) ?? file.content)
    }
    const stdout = execFileSync(process.env.PYTHON || "python3", [workspace.testRunnerPath!], {
      cwd: root,
      encoding: "utf8",
    })
    return JSON.parse(stdout.split("__WORKSPACE_TEST_RESULTS__:")[1]) as Result[]
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe("BookClub executable shipment", () => {
  it("progresses from genuine starter failures through four repairs and final verification", () => {
    const config = scenario.guidedLab!
    const edits = new Map<string, string>()
    let progress = initialGuidedLabProgress(config, "now")
    progress.checkpointAcks = ["investigation#0", "investigation#1"]
    progress = acknowledgeMilestone(config, progress, "m1-investigate", "now")
    let results = run(edits)
    expect(results).toHaveLength(36)
    for (const group of ["streak", "history", "calendar", "cache"]) {
      expect(
        results.some((result) => result.suite.endsWith(group) && !result.passed),
        group
      ).toBe(true)
    }
    expect(results.filter((r) => r.suite === "visible baseline").every((r) => r.passed)).toBe(true)
    // Each patch is exercised in the real Python repository before its gate is evaluated.
    const statsPath = "app/services/stats_service.py"
    edits.set(
      statsPath,
      workspace.files
        .find((file) => file.path === statsPath)!
        .content.replace(
          "reader_day(event.started_at, user_id)",
          "reader_day(event.finished_at, user_id)"
        )
    )
    for (const [index, group] of ["streak", "history", "calendar", "cache"].entries()) {
      if (group !== "streak") {
        const path =
          group === "history"
            ? "app/services/reading_service.py"
            : group === "calendar"
              ? statsPath
              : "app/services/dashboard_service.py"
        edits.set(path, sealed.referenceFiles.find((file) => file.path === path)!.content)
      }
      results = run(edits)
      expect(
        results.filter((r) => r.suite.endsWith(group)).every((r) => r.passed),
        JSON.stringify(results.filter((r) => !r.passed))
      ).toBe(true)
      progress = applyTestRunToProgress(config, progress, results, "now")
      expect(progress.currentMilestoneId).toBe(config.milestones[index + 2].id)
      expect(isGuidedLabComplete(config, progress)).toBe(false)
    }
    expect(results.every((result) => result.passed)).toBe(true)
    progress = applyTestRunToProgress(config, progress, run(edits), "now")
    expect(isGuidedLabComplete(config, progress)).toBe(true)
  })

  it("catches a timestamp-only cursor and an incomplete cache identity", () => {
    const fixed = new Map(sealed.referenceFiles.map((file) => [file.path, file.content]))
    const historyPath = "app/services/reading_service.py"
    const wrongCursor = new Map(fixed)
    wrongCursor.set(
      historyPath,
      fixed
        .get(historyPath)!
        .replace(
          "(event.finished_at, event.id) < (boundary, int(event_id))",
          "event.finished_at < boundary"
        )
    )
    expect(run(wrongCursor).some((r) => r.suite.includes("history") && !r.passed)).toBe(true)
    const wrongCache = new Map(fixed)
    const cachePath = "app/services/dashboard_service.py"
    wrongCache.set(cachePath, fixed.get(cachePath)!.replace("repository.revision()", "0"))
    expect(run(wrongCache).some((r) => r.suite.includes("cache") && !r.passed)).toBe(true)
  })
})
