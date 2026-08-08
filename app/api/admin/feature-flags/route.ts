/**
 * Feature Flags API
 *
 * Manage feature flags for gradual rollouts, A/B testing, and kill switches
 */

import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { withPermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

/**
 * Fields a PUT may change. Everything outside this list is identity or
 * provenance: `key` is what application code looks a flag up by, and
 * `createdBy`/`createdAt` are the audit trail for who introduced it.
 */
const MUTABLE_FLAG_FIELDS = [
  "name",
  "description",
  "enabled",
  "type",
  "rolloutPercentage",
  "targetTiers",
  "targetUserIds",
  "environment",
  "expiresAt",
] as const

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string
  enabled: boolean
  type: "release" | "experiment" | "ops" | "permission" | "kill_switch"
  rolloutPercentage: number
  targetTiers: string[]
  targetUserIds: string[]
  environment: "all" | "production" | "staging" | "development"
  createdBy: string
  createdAt: string
  updatedAt: string
  expiresAt?: string
}

/**
 * GET - List feature flags.
 *
 * The old gate was `if (!role)`, which admits every admin role including the
 * read-only analyst and support. Flags are operational configuration and this
 * listing exposes kill switches and rollout targeting, so it belongs with the
 * roles that can change them: MANAGE_SETTINGS.
 */
export const GET = withPermission(PERMISSIONS.MANAGE_SETTINGS, async () => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const snapshot = await adminDb.collection("feature_flags").orderBy("createdAt", "desc").get()

    const flags: FeatureFlag[] = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        key: data.key,
        name: data.name,
        description: data.description,
        enabled: data.enabled ?? false,
        type: data.type || "release",
        rolloutPercentage: data.rolloutPercentage ?? 100,
        targetTiers: data.targetTiers || [],
        targetUserIds: data.targetUserIds || [],
        environment: data.environment || "all",
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt,
      }
    })

    const stats = {
      total: flags.length,
      enabled: flags.filter((f) => f.enabled).length,
      experiments: flags.filter((f) => f.type === "experiment").length,
      killSwitches: flags.filter((f) => f.type === "kill_switch").length,
    }

    return NextResponse.json({ success: true, flags, stats })
  } catch (error) {
    console.error("[Feature Flags API] GET Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch feature flags" },
      { status: 500 }
    )
  }
})

// POST - Create feature flag. [super_admin, admin] is exactly MANAGE_SETTINGS.
export const POST = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request, context) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const body = await request.json()
    const {
      key,
      name,
      description = "",
      enabled = false,
      type = "release",
      rolloutPercentage = 100,
      targetTiers = [],
      targetUserIds = [],
      environment = "all",
      expiresAt,
    } = body

    if (!key || !name) {
      return NextResponse.json(
        { success: false, error: "Key and name are required" },
        { status: 400 }
      )
    }

    // Check for duplicate key
    const existing = await adminDb.collection("feature_flags").where("key", "==", key).get()

    if (!existing.empty) {
      return NextResponse.json(
        { success: false, error: "A flag with this key already exists" },
        { status: 400 }
      )
    }

    const now = Timestamp.now()
    const flagData = {
      key,
      name,
      description,
      enabled,
      type,
      rolloutPercentage,
      targetTiers,
      targetUserIds,
      environment,
      createdBy: context.userId,
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
    }

    const docRef = await adminDb.collection("feature_flags").add(flagData)

    await adminDb.collection("admin_audit_log").add({
      adminId: context.userId,
      action: "create_feature_flag",
      details: { flagId: docRef.id, key, name },
      timestamp: now,
    })

    return NextResponse.json({ success: true, flagId: docRef.id })
  } catch (error) {
    console.error("[Feature Flags API] POST Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create feature flag" },
      { status: 500 }
    )
  }
})

// PUT - Update feature flag
export const PUT = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request, context) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "Flag ID is required" }, { status: 400 })
    }

    const docRef = adminDb.collection("feature_flags").doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Feature flag not found" }, { status: 404 })
    }

    // Allowlist rather than `{ ...updates }`. Spreading the request body into
    // update() is mass assignment: it let a caller rewrite `key`, which is what
    // application code looks the flag up by, so pointing an existing flag's key
    // at another flag silently rewires whatever that key gates, and it let them
    // forge `createdBy` and `createdAt`.
    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() }
    for (const field of MUTABLE_FLAG_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        updateData[field] = updates[field]
      }
    }

    if (updates.expiresAt) {
      updateData.expiresAt = Timestamp.fromDate(new Date(updates.expiresAt))
    }

    await docRef.update(updateData)

    await adminDb.collection("admin_audit_log").add({
      adminId: context.userId,
      action: "update_feature_flag",
      // Record what was actually applied, not what was asked for.
      details: { flagId: id, updates: Object.keys(updateData) },
      timestamp: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Feature Flags API] PUT Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update feature flag" },
      { status: 500 }
    )
  }
})

/**
 * DELETE - Delete feature flag. Was super_admin only, and MANAGE_ADMINS is the
 * only permission with that exact audience, so this preserves the existing
 * restriction rather than widening deletion to every settings manager.
 */
export const DELETE = withPermission(PERMISSIONS.MANAGE_ADMINS, async (request, context) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "Flag ID is required" }, { status: 400 })
    }

    await adminDb.collection("feature_flags").doc(id).delete()

    await adminDb.collection("admin_audit_log").add({
      adminId: context.userId,
      action: "delete_feature_flag",
      details: { flagId: id },
      timestamp: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Feature Flags API] DELETE Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete feature flag" },
      { status: 500 }
    )
  }
})
