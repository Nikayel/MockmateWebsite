import { NextRequest } from "next/server"
import { buildBugfixScenarioAuditRows } from "@/lib/bugfix"
import { realWorldBugFixScenarios } from "@/lib/scenarios-realworld"
import { hydrateSealedLegacyBugfix } from "@/lib/scenarios/sealed/legacy-registry.server"
import { successResponse, unauthorizedResponse, verifyAdminAccess } from "@/lib/admin/middleware"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request)

  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error || "Unauthorized", authResult.status)
  }

  // Re-merge the sealed answer content (bug description, rubric, reference files)
  // server-side before auditing. The client modules no longer carry it, so the
  // quality gate would otherwise flag every scenario for a missing reference
  // solution and see an empty root cause. bugfix-quality.ts stays client-safe.
  const hydratedScenarios = await Promise.all(
    realWorldBugFixScenarios.map(hydrateSealedLegacyBugfix)
  )
  const rows = buildBugfixScenarioAuditRows(hydratedScenarios)
  const failingRows = rows.filter((row) => !row.complete)
  const totalIssues = rows.reduce((sum, row) => sum + row.issueCount, 0)

  return successResponse({
    rows,
    stats: {
      total: rows.length,
      passing: rows.length - failingRows.length,
      failing: failingRows.length,
      totalIssues,
      seedSet: true,
    },
  })
}
