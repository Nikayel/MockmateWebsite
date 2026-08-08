/**
 * Feature Flags API
 *
 * Manage feature flags for gradual rollouts, A/B testing, and kill switches.
 *
 * These documents are read at runtime by `lib/feature-flags.ts`, which resolves
 * Firestore first and only then falls back to env and the static defaults. That
 * makes every write here an operational change to running servers, so each one
 * validates its input, records before/after, and drops the flag cache.
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import { withPermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { logAdminAction } from "@/lib/admin/audit"
import {
  FLAG_NAMES,
  FLAG_PROPAGATION_NOTE,
  invalidateFlagCache,
  isKnownFlagKey,
} from "@/lib/feature-flags"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

const AUDIT_CREATE_FLAG = "create_feature_flag"
const AUDIT_UPDATE_FLAG = "update_feature_flag"
const AUDIT_DELETE_FLAG = "delete_feature_flag"

/** The collection name, kept next to the resolver that reads it. */
const FLAGS_COLLECTION = "feature_flags"

/**
 * Identity and provenance. `key` is what application code looks a flag up by,
 * so repointing it silently rewires whatever that key gates; `createdBy` and
 * `createdAt` are the record of who introduced it. A PUT naming any of these is
 * rejected outright rather than quietly ignored, so a caller attempting mass
 * assignment gets an error instead of the false impression that it worked.
 */
const IMMUTABLE_FLAG_FIELDS = ["key", "createdBy", "createdAt", "updatedAt", "id"] as const

const flagTypeSchema = z.enum(["release", "experiment", "ops", "permission", "kill_switch"])
const flagEnvironmentSchema = z.enum(["all", "production", "staging", "development"])

/**
 * Flag keys are the join between this page and code, so the format is pinned:
 * lowercase, digits and underscores. `normalizeFlagKey()` uppercases on the
 * read side, so `My Flag` and `my_flag` would otherwise be the same switch
 * stored under two documents.
 */
const flagKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Key must be lowercase letters, digits and underscores")

/** Fields a caller may set. Anything outside this shape is dropped by Zod, not written. */
const mutableFlagSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  enabled: z.boolean().default(false),
  type: flagTypeSchema.default("release"),
  rolloutPercentage: z.number().int().min(0).max(100).default(100),
  targetTiers: z.array(z.string().trim().min(1)).max(20).default([]),
  targetUserIds: z.array(z.string().trim().min(1)).max(500).default([]),
  environment: flagEnvironmentSchema.default("all"),
  expiresAt: z.string().datetime().or(z.string().date()).nullable().optional(),
})

export const createFlagSchema = mutableFlagSchema.extend({ key: flagKeySchema })

/** Every mutable field optional: a PUT may carry only the one field it changes. */
export const updateFlagSchema = mutableFlagSchema.partial().extend({
  id: z.string().trim().min(1),
})

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
  /**
   * Whether some code path actually reads this key. A flag nobody reads is an
   * orphan: it can be toggled all day and change nothing, which is exactly the
   * illusion this whole page used to create.
   */
  wired: boolean
}

/** Turn a Zod failure into one readable line naming the field. */
function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ")
}

/** Reject a body that names an identity or provenance field. */
function rejectImmutableFields(body: Record<string, unknown>): string | null {
  const offenders = IMMUTABLE_FLAG_FIELDS.filter(
    (field) => field !== "id" && Object.prototype.hasOwnProperty.call(body, field)
  )
  return offenders.length > 0
    ? `These fields cannot be changed after a flag is created: ${offenders.join(", ")}`
    : null
}

/** The fields of a stored flag worth recording in an audit before/after pair. */
function auditableFlagState(data: Record<string, unknown>): Record<string, unknown> {
  return {
    key: data.key,
    name: data.name,
    enabled: data.enabled ?? false,
    type: data.type ?? "release",
    rolloutPercentage: data.rolloutPercentage ?? 100,
    targetUserIds: data.targetUserIds ?? [],
    environment: data.environment ?? "all",
  }
}

/**
 * GET - List feature flags, or the change history for one flag.
 *
 * The old gate was `if (!role)`, which admits every admin role including the
 * read-only analyst and support. Flags are operational configuration and this
 * listing exposes kill switches and rollout targeting, so it belongs with the
 * roles that can change them: MANAGE_SETTINGS.
 */
export const GET = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const historyFor = new URL(request.url).searchParams.get("history")
    if (historyFor) {
      return await respondWithHistory(historyFor)
    }

    const snapshot = await adminDb.collection(FLAGS_COLLECTION).orderBy("createdAt", "desc").get()

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
        wired: typeof data.key === "string" && isKnownFlagKey(data.key),
      }
    })

    const stats = {
      total: flags.length,
      enabled: flags.filter((f) => f.enabled).length,
      experiments: flags.filter((f) => f.type === "experiment").length,
      killSwitches: flags.filter((f) => f.type === "kill_switch").length,
      orphans: flags.filter((f) => !f.wired).length,
    }

    return NextResponse.json({
      success: true,
      flags,
      stats,
      // The keys code actually reads, so the create dialog can offer them
      // instead of leaving an operator to guess a name nothing consumes.
      wiredKeys: FLAG_NAMES.map((name) => name.toLowerCase()),
      propagationNote: FLAG_PROPAGATION_NOTE,
    })
  } catch (error) {
    console.error("[Feature Flags API] GET Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch feature flags" },
      { status: 500 }
    )
  }
})

/**
 * Change history for one flag, read back out of the audit log.
 *
 * Deliberately a single equality filter with no `orderBy`: that combination is
 * served by the automatic single-field index, so this cannot 500 on a composite
 * index nobody deployed. Ordering happens in memory over at most 50 rows.
 */
async function respondWithHistory(flagId: string): Promise<NextResponse> {
  const snapshot = await adminDb
    .collection("admin_audit_log")
    .where("target.id", "==", flagId)
    .limit(50)
    .get()

  const history = snapshot.docs
    .map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        action: data.action as string,
        adminId: data.adminId as string,
        adminEmail: (data.adminEmail as string | null) ?? null,
        before: (data.before as Record<string, unknown> | null) ?? null,
        after: (data.after as Record<string, unknown> | null) ?? null,
        ip: (data.ip as string | null) ?? null,
        timestamp: data.timestamp?.toDate?.()?.toISOString() ?? null,
      }
    })
    .sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))

  return NextResponse.json({ success: true, history })
}

// POST - Create feature flag. [super_admin, admin] is exactly MANAGE_SETTINGS.
export const POST = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request, context) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const parsed = createFlagSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: formatZodError(parsed.error) },
        { status: 400 }
      )
    }

    const { key, expiresAt, ...rest } = parsed.data

    const existing = await adminDb.collection(FLAGS_COLLECTION).where("key", "==", key).get()
    if (!existing.empty) {
      return NextResponse.json(
        { success: false, error: "A flag with this key already exists" },
        { status: 400 }
      )
    }

    const now = Timestamp.now()
    const flagData = {
      key,
      ...rest,
      createdBy: context.userId,
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
    }

    const docRef = await adminDb.collection(FLAGS_COLLECTION).add(flagData)
    invalidateFlagCache()

    await logAdminAction(
      context,
      AUDIT_CREATE_FLAG,
      { flagId: docRef.id, key, wired: isKnownFlagKey(key) },
      {
        request,
        target: { type: FLAGS_COLLECTION, id: docRef.id, label: key },
        before: null,
        after: auditableFlagState(flagData),
      }
    )

    return NextResponse.json({
      success: true,
      flagId: docRef.id,
      // Say so at creation time rather than letting an operator discover it by
      // toggling a switch that does nothing.
      wired: isKnownFlagKey(key),
      propagationNote: FLAG_PROPAGATION_NOTE,
    })
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

    const body = (await request.json()) as Record<string, unknown>

    const immutableError = rejectImmutableFields(body)
    if (immutableError) {
      return NextResponse.json({ success: false, error: immutableError }, { status: 400 })
    }

    const parsed = updateFlagSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: formatZodError(parsed.error) },
        { status: 400 }
      )
    }

    const { id, expiresAt, ...updates } = parsed.data

    const docRef = adminDb.collection(FLAGS_COLLECTION).doc(id)
    const doc = await docRef.get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Feature flag not found" }, { status: 404 })
    }

    const previous = doc.data() as Record<string, unknown>

    // Zod already stripped everything outside the mutable shape, so this object
    // can only contain fields a caller is allowed to set.
    const updateData: Record<string, unknown> = { ...updates, updatedAt: Timestamp.now() }
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null
    }

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        { success: false, error: "No updatable fields supplied" },
        { status: 400 }
      )
    }

    await docRef.update(updateData)
    // Drop the cached snapshot so this process serves the new value at once.
    // Other instances still wait out their own TTL; see FLAG_PROPAGATION_NOTE.
    invalidateFlagCache()

    await logAdminAction(
      context,
      AUDIT_UPDATE_FLAG,
      { flagId: id, changedFields: Object.keys(updateData).filter((f) => f !== "updatedAt") },
      {
        request,
        target: { type: FLAGS_COLLECTION, id, label: String(previous.key ?? "") },
        before: auditableFlagState(previous),
        after: auditableFlagState({ ...previous, ...updateData }),
      }
    )

    return NextResponse.json({ success: true, propagationNote: FLAG_PROPAGATION_NOTE })
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

    const docRef = adminDb.collection(FLAGS_COLLECTION).doc(id)
    // Read before deleting: once the document is gone the audit log is the only
    // remaining record of what the flag was set to when it was removed.
    const doc = await docRef.get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Feature flag not found" }, { status: 404 })
    }
    const previous = doc.data() as Record<string, unknown>

    await docRef.delete()
    invalidateFlagCache()

    await logAdminAction(
      context,
      AUDIT_DELETE_FLAG,
      { flagId: id, key: previous.key },
      {
        request,
        target: { type: FLAGS_COLLECTION, id, label: String(previous.key ?? "") },
        before: auditableFlagState(previous),
        after: null,
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Feature Flags API] DELETE Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete feature flag" },
      { status: 500 }
    )
  }
})
