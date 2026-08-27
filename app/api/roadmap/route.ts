import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { generatePersonalizedRoadmap } from "@/lib/roadmap/prioritization-algorithm"
import { generateRAGEnhancedRoadmap, type RAGEnhancedRoadmap } from "@/lib/rag/roadmap-rag"
import { scenarios } from "@/lib/scenarios"
import { UserRoadmapAssessment, PersonalizedRoadmap } from "@/lib/data/company-questions/types"
import { CreateRoadmapSchema, validationErrorResponse } from "@/lib/validations/api-schemas"
import { resolveCategoryMix } from "@/lib/roadmap/category-weights"
import { logger } from "@/lib/logger"
import {
  serializeRoadmapDocument,
  sortRoadmapsByCreatedAt,
  toDateValue,
  type FirestoreRoadmapData,
  type RoadmapDocumentSnapshot,
} from "@/lib/roadmap/roadmap-serialization"

const COLLECTION = "user_roadmaps"

// Legacy roadmap docs created before the status field existed need a one-time status
// backfill. That backfill requires a full-collection scan on every empty GET, which is
// expensive because roadmap docs are routinely 100KB+. Once those old docs are migrated,
// set ROADMAP_LEGACY_STATUS_BACKFILL=false to skip the scan. Enabled by default so the
// legacy-fix path stays reachable until an operator turns it off.
const LEGACY_STATUS_BACKFILL_ENABLED = process.env.ROADMAP_LEGACY_STATUS_BACKFILL !== "false"

type RoadmapStatus = PersonalizedRoadmap["status"]

interface UpdateRoadmapRequestBody {
  roadmapId?: string
  status?: RoadmapStatus
}

function isRoadmapStatus(value: unknown): value is RoadmapStatus {
  return (
    value === "active" || value === "archived" || value === "completed" || value === "abandoned"
  )
}

/**
 * GET /api/roadmap - Get user's active roadmap or all roadmaps
 * Query params:
 *   - all=true: Get all roadmaps (active, archived, completed, abandoned)
 *   - status=active|archived|completed|abandoned: Filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      logger.warn("[Roadmap API] Unauthorized request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.userId

    // Server-side tier gate: roadmap is a Pro feature
    // (token already verified by verifyAuth above)
    const tierCheck = await requireTierForUser(userId, "pro")
    if (tierCheck.response) return tierCheck.response
    logger.info("[Roadmap API] GET request for user:", { userId })

    const { searchParams } = new URL(request.url)
    const getAll = searchParams.get("all") === "true"
    const statusFilter = searchParams.get("status")

    // Check for expired active roadmaps and archive them
    const now = new Date()

    // Note: Avoid composite index requirement by not using orderBy with multiple where clauses
    // We'll sort client-side instead
    const activeSnapshot = await adminDb
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .get()

    logger.info("[Roadmap API] Found active roadmaps", { count: activeSnapshot.docs.length })

    const batch = adminDb.batch()
    const expiredDocIds = new Set<string>()

    activeSnapshot.docs.forEach((doc) => {
      const data = doc.data() as FirestoreRoadmapData
      const interviewDate = toDateValue(data.interviewDate)
      if (interviewDate < now) {
        batch.update(doc.ref, { status: "archived", updatedAt: new Date() })
        expiredDocIds.add(doc.id)
      }
    })

    if (expiredDocIds.size > 0) {
      await batch.commit()
    }

    // Resolve the docs to return based on query params.
    // Note: Avoid composite index requirement by not using orderBy - we sort client-side
    let snapshotDocs: RoadmapDocumentSnapshot[]
    if (getAll) {
      // Get all roadmaps
      const allSnapshot = await adminDb.collection(COLLECTION).where("userId", "==", userId).get()
      snapshotDocs = allSnapshot.docs
    } else if (statusFilter) {
      // Get roadmaps by status
      const filteredSnapshot = await adminDb
        .collection(COLLECTION)
        .where("userId", "==", userId)
        .where("status", "==", statusFilter)
        .get()
      snapshotDocs = filteredSnapshot.docs
    } else {
      // Default path: reuse the active roadmaps already fetched above instead of running
      // the identical status=="active" query a second time. Drop any docs the expiry batch
      // just archived so they are not returned as active.
      snapshotDocs = activeSnapshot.docs.filter((doc) => !expiredDocIds.has(doc.id))
    }

    if (snapshotDocs.length === 0) {
      logger.info("[Roadmap API] No roadmaps found matching query")

      // Legacy status-field backfill (one-time migration path). Skipped for getAll because
      // that query already scanned every user doc (the same scan would return the same empty
      // result), and skippable entirely via env flag once old docs are migrated.
      if (LEGACY_STATUS_BACKFILL_ENABLED && !getAll) {
        // Check if there are any roadmaps without proper status field (legacy data fix)
        const allDocsSnapshot = await adminDb
          .collection(COLLECTION)
          .where("userId", "==", userId)
          .get()

        logger.info("[Roadmap API] Total documents for user:", {
          count: allDocsSnapshot.docs.length,
        })

        // Find roadmaps that need status field fix
        const docsNeedingFix = allDocsSnapshot.docs.filter((doc) => {
          const data = doc.data() as FirestoreRoadmapData
          const hasNoStatus = !data.status
          const interviewDate = toDateValue(data.interviewDate)
          const isNotExpired = interviewDate >= new Date()
          logger.debug("[Roadmap API] Doc status check", {
            docId: doc.id,
            status: data.status,
            company: data.targetCompany || data.companyName,
            needsFix: hasNoStatus && isNotExpired,
          })
          return hasNoStatus && isNotExpired
        })

        // Fix legacy roadmaps missing status field
        if (docsNeedingFix.length > 0) {
          logger.info("[Roadmap API] Fixing legacy roadmaps missing status field", {
            count: docsNeedingFix.length,
          })
          const backfillBatch = adminDb.batch()

          // Set the most recent one as active, others as abandoned
          const sortedDocs = docsNeedingFix.sort((a, b) => {
            const aCreated = toDateValue((a.data() as FirestoreRoadmapData).createdAt, new Date(0))
            const bCreated = toDateValue((b.data() as FirestoreRoadmapData).createdAt, new Date(0))
            return bCreated.getTime() - aCreated.getTime()
          })

          sortedDocs.forEach((doc, index) => {
            backfillBatch.update(doc.ref, {
              status: index === 0 ? "active" : "abandoned",
              updatedAt: new Date(),
            })
          })

          await backfillBatch.commit()

          // Return the now-active roadmap
          const fixedDoc = sortedDocs[0]
          const convertedRoadmap = serializeRoadmapDocument(fixedDoc, {
            status: "active",
            updatedAt: new Date().toISOString(),
          })

          logger.info("[Roadmap API] Returning fixed roadmap", { roadmapId: convertedRoadmap.id })
          return NextResponse.json({ roadmap: convertedRoadmap })
        }
      }

      return NextResponse.json(getAll ? { roadmaps: [] } : { roadmap: null })
    }

    logger.info("[Roadmap API] Found roadmaps matching query", { count: snapshotDocs.length })

    if (getAll || statusFilter) {
      // Sort by createdAt descending (client-side to avoid index requirement)
      const roadmaps = snapshotDocs
        .map((doc) => serializeRoadmapDocument(doc))
        .sort(sortRoadmapsByCreatedAt)
      return NextResponse.json({ roadmaps })
    } else {
      // Get the most recent active roadmap (sort client-side)
      const sortedDocs = snapshotDocs.sort((a, b) => {
        const aCreated = toDateValue((a.data() as FirestoreRoadmapData).createdAt, new Date(0))
        const bCreated = toDateValue((b.data() as FirestoreRoadmapData).createdAt, new Date(0))
        return bCreated.getTime() - aCreated.getTime()
      })
      const roadmap = serializeRoadmapDocument(sortedDocs[0])
      return NextResponse.json({ roadmap })
    }
  } catch (error) {
    logger.error("Error fetching roadmap:", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch roadmap" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/roadmap - Create a new roadmap
 * Query params:
 *   - rag=true: Enable RAG-enhanced generation with personalized insights
 *
 * Note: Roadmap creation is a Pro-only feature
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.userId

    // Check subscription tier - roadmap is a Pro-only feature.
    // Uses requireTierForUser like the GET and PATCH handlers below. This used to
    // hand-roll `subscription_tier === "free"`, which ignored subscription_status
    // entirely, so a pro account in past_due could still create roadmaps here
    // while being blocked from reading or updating them.
    const tierCheck = await requireTierForUser(userId, "pro")
    if (!tierCheck.allowed) {
      // Genuine free users keep the roadmap-specific upsell; a degraded paid
      // subscription gets the standard inactive-subscription response instead,
      // since telling them to "upgrade to Pro" would be wrong.
      if (tierCheck.tier === "free") {
        return NextResponse.json(
          {
            error: "Pro feature required",
            message:
              "Interview roadmaps are available with Pro. Upgrade to unlock a prep plan tailored to your target company, role, and skills.",
            code: "PRO_REQUIRED",
            upgradeUrl: "/upgrade",
          },
          { status: 403 }
        )
      }
      return tierCheck.response!
    }

    // One schema instead of scattered ifs: CreateRoadmapSchema carries the
    // membership guard (an id outside the catalog would sail through
    // resolveCategoryMix and the generator as a silently broken roadmap), the
    // unparseable-date 400 (a NaN date makes daysRemaining NaN and the generator
    // divides work across it), and the same absent-field defaults the hand-rolled
    // parsing applied. The wizard only emits schema-valid payloads, so the 400
    // only ever rejects stale or hand-built bodies. safeParse directly (not the
    // validateRequest helper) because the helper's <T> collapses the schema's
    // input and output types, which discards the .default() narrowing.
    const validation = CreateRoadmapSchema.safeParse(await request.json())
    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const {
      targetCompany,
      interviewDate,
      experienceLevel,
      targetTrack,
      problemsSolved,
      hoursPerDay,
      patternFamiliarity,
      mixMode,
      selectedCategories,
    } = validation.data

    const { searchParams } = new URL(request.url)
    const enableRAG = searchParams.get("rag") !== "false" // RAG enabled by default

    // Calculate days remaining
    const now = new Date()
    const interview = new Date(interviewDate)
    const daysRemaining = Math.max(
      1,
      Math.ceil((interview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )

    // Resolve the category composition the user chose (defaults to the research
    // full mix). Weighted by experience level, target track, and company.
    const categoryMix = resolveCategoryMix({
      mixMode,
      selectedCategories,
      experienceLevel,
      targetTrack,
      companyId: targetCompany,
    })

    // Build assessment
    const assessment: UserRoadmapAssessment = {
      targetCompany,
      interviewDate: interview,
      daysRemaining,
      experienceLevel,
      targetTrack,
      problemsSolvedEstimate: problemsSolved,
      patternFamiliarity,
      hoursPerDay,
      preferredDifficulty: "mixed",
      targetScore: 80,
      categoryMix,
    }

    // Generate roadmap from the full scenario library (DSA + bug-fix +
    // feature-building); the generator honors the resolved category mix.
    let roadmap: PersonalizedRoadmap | RAGEnhancedRoadmap | null

    if (enableRAG) {
      logger.info("[Roadmap] Generating RAG-enhanced roadmap for user", { userId })
      roadmap = await generateRAGEnhancedRoadmap({
        userId,
        assessment,
        scenarios,
        enableRAG: true,
        enableAIInsights: true,
      })
    } else {
      logger.info("[Roadmap] Generating standard roadmap for user", { userId })
      roadmap = generatePersonalizedRoadmap(scenarios, assessment, userId)
    }

    if (!roadmap) {
      return NextResponse.json({ error: "Failed to generate roadmap" }, { status: 500 })
    }

    // Mark any existing active roadmaps as abandoned
    const existingSnapshot = await adminDb
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .get()

    const batch = adminDb.batch()
    existingSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: "abandoned", updatedAt: new Date() })
    })

    // Prepare roadmap for Firestore (convert dates)
    const ragEnhancements = "ragEnhancements" in roadmap ? roadmap.ragEnhancements : null
    const roadmapDoc = {
      ...roadmap,
      // Explicitly set status to 'active' (ensure it's always present)
      status: "active",
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      interviewDate: interview,
      assessment: {
        ...assessment,
        interviewDate: interview,
      },
      dailyPlans: roadmap.dailyPlans.map((plan) => ({
        ...plan,
        date: new Date(plan.date),
      })),
      milestones: roadmap.milestones.map((m) => ({
        ...m,
        targetDate: new Date(m.targetDate),
      })),
      // Include RAG enhancements if present
      ...(ragEnhancements ? { ragEnhancements } : {}),
    }

    // Save new roadmap
    const docRef = adminDb.collection(COLLECTION).doc(roadmap.id)
    batch.set(docRef, roadmapDoc)

    await batch.commit()

    return NextResponse.json({
      roadmap: {
        ...roadmap,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error("Error creating roadmap:", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create roadmap" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/roadmap - Update roadmap status (e.g., archive)
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.userId

    // Server-side tier gate: roadmap is a Pro feature
    // (token already verified by verifyAuth above)
    const tierCheck = await requireTierForUser(userId, "pro")
    if (tierCheck.response) return tierCheck.response
    const body = (await request.json()) as UpdateRoadmapRequestBody
    const { roadmapId, status } = body

    if (!roadmapId || !status) {
      return NextResponse.json({ error: "Roadmap ID and status are required" }, { status: 400 })
    }

    if (!isRoadmapStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Get the roadmap
    const docRef = adminDb.collection(COLLECTION).doc(roadmapId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 })
    }

    const roadmapData = doc.data()

    // Verify ownership
    if (roadmapData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update status
    await docRef.update({
      status,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error updating roadmap:", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update roadmap" },
      { status: 500 }
    )
  }
}
