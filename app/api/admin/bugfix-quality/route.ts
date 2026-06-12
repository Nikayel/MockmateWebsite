import { NextRequest } from "next/server"
import { buildBugfixScenarioAuditRows } from "@/lib/bugfix"
import { realWorldBugFixScenarios } from "@/lib/scenarios-realworld"
import { successResponse, unauthorizedResponse, verifyAdminAccess } from "@/lib/admin/middleware"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request)

  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error || "Unauthorized", authResult.status)
  }

  const rows = buildBugfixScenarioAuditRows(realWorldBugFixScenarios)
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
