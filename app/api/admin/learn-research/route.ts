/**
 * Learn research readout + de-identified export (admin only).
 *
 * GET /api/admin/learn-research
 *   ?view=checks | exercises | funnel | export   (default: checks)
 *   ?since=ISO8601                               (default: all time)
 *   ?format=json | csv                           (export only, default: csv)
 *
 * `checks`, `exercises`, and `funnel` are operational readouts over ALL data: they tell
 * whoever maintains the curriculum which item is too hard and which lesson leaks, which
 * is product work, not research.
 *
 * `export` is the research path and behaves differently on purpose: it includes ONLY
 * rows whose learner had consented at the time of observation, and it never emits a real
 * uid. Those two rules are what make the extract usable in a study.
 */
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { withPermission, unauthorizedResponse } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import {
  deidentify,
  fetchAllProgress,
  fetchItemResponses,
  summarizeCheckDifficulty,
  summarizeExerciseStruggle,
  summarizeLessonFunnel,
} from "@/lib/tutorials/learn-analytics"

export const dynamic = "force-dynamic"

/** Minimal RFC4180 quoting: any field may contain a comma, quote, or newline. */
function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return ""
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const cell = (value: unknown): string => {
    if (value === null || value === undefined) return ""
    const text = typeof value === "object" ? JSON.stringify(value) : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => cell(row[column])).join(",")),
  ].join("\n")
}

/**
 * The three readout views are curriculum analytics, so VIEW_ANALYTICS. The
 * export view leaves the building as a file, so it needs EXPORT_DATA on top;
 * previously any admin role, support included, could download it. The
 * infrastructure check moved below the auth check so an unauthenticated caller
 * cannot probe whether the Admin SDK booted.
 */
export const GET = withPermission(PERMISSIONS.VIEW_ANALYTICS, async (request, context) => {
  if (!adminDb) {
    return NextResponse.json(
      { success: false, error: "Firebase Admin SDK not initialized." },
      { status: 503 }
    )
  }

  const params = request.nextUrl.searchParams
  const view = params.get("view") ?? "checks"
  const since = params.get("since") ?? undefined

  if (view === "export" && !context.permissions.includes(PERMISSIONS.EXPORT_DATA)) {
    return unauthorizedResponse(
      `Access denied - missing permission: ${PERMISSIONS.EXPORT_DATA}`,
      403
    )
  }

  try {
    if (view === "funnel") {
      const progress = await fetchAllProgress()
      return NextResponse.json({ success: true, rows: summarizeLessonFunnel(progress) })
    }

    if (view === "export") {
      // Consent gate: research use requires an opt-in recorded at observation time.
      const rows = await fetchItemResponses({ since, consentedOnly: true })
      const safe = rows.map(deidentify)
      if ((params.get("format") ?? "csv") === "json") {
        return NextResponse.json({ success: true, count: safe.length, rows: safe })
      }
      return new NextResponse(toCsv(safe as unknown as Array<Record<string, unknown>>), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="learn-item-responses.csv"`,
        },
      })
    }

    const rows = await fetchItemResponses({ since })
    if (view === "exercises") {
      return NextResponse.json({ success: true, rows: summarizeExerciseStruggle(rows) })
    }
    return NextResponse.json({ success: true, rows: summarizeCheckDifficulty(rows) })
  } catch (error) {
    console.error("[learn-research] failed", error)
    return NextResponse.json({ success: false, error: "Failed to build readout" }, { status: 500 })
  }
})
