/**
 * Feature Flags API
 *
 * Manage feature flags for gradual rollouts, A/B testing, and kill switches
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyToken, getAdminRole } from "@/lib/admin/rbac"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

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

// GET - List feature flags
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const role = await getAdminRole(auth.userId)
    if (!role) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
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
}

// POST - Create feature flag
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const role = await getAdminRole(auth.userId)
    if (!role || !["super_admin", "admin"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
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
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
    }

    const docRef = await adminDb.collection("feature_flags").add(flagData)

    await adminDb.collection("admin_audit_log").add({
      adminId: auth.userId,
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
}

// PUT - Update feature flag
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const role = await getAdminRole(auth.userId)
    if (!role || !["super_admin", "admin"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
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

    const updateData: Record<string, any> = {
      ...updates,
      updatedAt: Timestamp.now(),
    }

    if (updates.expiresAt) {
      updateData.expiresAt = Timestamp.fromDate(new Date(updates.expiresAt))
    }

    await docRef.update(updateData)

    await adminDb.collection("admin_audit_log").add({
      adminId: auth.userId,
      action: "update_feature_flag",
      details: { flagId: id, updates: Object.keys(updates) },
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
}

// DELETE - Delete feature flag
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const role = await getAdminRole(auth.userId)
    if (role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Only super admins can delete feature flags" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "Flag ID is required" }, { status: 400 })
    }

    await adminDb.collection("feature_flags").doc(id).delete()

    await adminDb.collection("admin_audit_log").add({
      adminId: auth.userId,
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
}
