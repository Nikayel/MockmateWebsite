/**
 * Enhanced Research Analysis API
 *
 * GET /api/admin/research/enhanced
 * Returns production-grade statistical analysis including:
 * - T-tests for significance
 * - Effect sizes (Cohen's d)
 * - Prediction accuracy metrics
 * - Calibration data
 * - Trend analysis
 * - Research quality score
 *
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { requirePermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { analyzeResearchData } from "@/lib/research/analyzer"

export async function GET(request: NextRequest) {
  try {
    // Verify Admin SDK is initialized
    if (!adminDb) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase Admin SDK not initialized.",
        },
        { status: 500 }
      )
    }

    // The statistical read-out is analytics. `support` is a customer support
    // role with no analytics permission, and verifyAdminAccess() let it through
    // along with every other role.
    const authResult = await requirePermission(request, PERMISSIONS.VIEW_ANALYTICS)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    // Perform comprehensive analysis
    const analysis = await analyzeResearchData()

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    console.error("Enhanced research analysis error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
