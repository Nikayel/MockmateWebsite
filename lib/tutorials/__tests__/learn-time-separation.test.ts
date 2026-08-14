/**
 * Enforces the separation between Learn time telemetry and the dashboard practice stat.
 *
 * The product rule: time on /learn must NEVER count toward the user-facing "Practice" hours
 * (`user_stats.totalPracticeMinutes`), which by contract measure clamped interview-session
 * wall clock only. Learn time is an admin/research surface (`users/{uid}/learn_usage` +
 * `learn_daily`). A rule in prose drifts, so this test makes the build fail when either side
 * starts reaching across the boundary.
 *
 * Comments are stripped before matching: the modules deliberately DOCUMENT the rule by naming
 * the forbidden identifiers, and documentation must not trip the guard that enforces it.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()

function codeWithoutComments(relativePath: string): string {
  const source = readFileSync(join(ROOT, relativePath), "utf8")
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
}

/** The Learn time modules: everything that measures, records, or serves lesson time. */
const LEARN_TIME_MODULES = [
  "lib/tutorials/learn-time.ts",
  "lib/tutorials/learn-time-client.ts",
  "components/tutorials/useLearnTimeTracker.ts",
  "lib/admin/learn-usage-views.ts",
]

/** The practice-stat side: the only writer of user_stats and the dashboard read path. */
const PRACTICE_STAT_MODULES = ["lib/session-metrics.ts", "app/api/user/metrics/route.ts"]

describe("learn time never touches the practice stat", () => {
  it.each(LEARN_TIME_MODULES)(
    "%s does not reference the practice-stat collections or fields",
    (path) => {
      const code = codeWithoutComments(path)
      for (const forbidden of ["user_stats", "totalPracticeMinutes", "interview_sessions"]) {
        expect(code, `${path} must not reference ${forbidden}`).not.toContain(forbidden)
      }
    }
  )

  it.each(PRACTICE_STAT_MODULES)("%s does not read the learn time collections", (path) => {
    const code = codeWithoutComments(path)
    for (const forbidden of ["learn_usage", "learn_daily", "learn-time"]) {
      expect(code, `${path} must not reference ${forbidden}`).not.toContain(forbidden)
    }
  })

  // The guard above matches on names, so hold the names themselves stable: renaming a
  // collection would silently blind every assertion in this file.
  it("the guarded collection names are still the ones the service writes", () => {
    const service = readFileSync(join(ROOT, "lib/tutorials/learn-time.ts"), "utf8")
    expect(service).toContain('"learn_usage"')
    expect(service).toContain('"learn_daily"')
  })
})
