import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTier } from "@/lib/quota-enforcement"
import { generatePersonalizedRoadmap } from "@/lib/roadmap/prioritization-algorithm"
import { generateRAGEnhancedRoadmap, type RAGEnhancedRoadmap } from "@/lib/rag/roadmap-rag"
import { scenarios } from "@/lib/scenarios"
import {
  UserRoadmapAssessment,
  PersonalizedRoadmap,
  type RoadmapCategory,
  type RoadmapMixMode,
} from "@/lib/data/company-questions/types"
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

interface CreateRoadmapRequestBody {
  targetCompany?: UserRoadmapAssessment["targetCompany"]
  interviewDate?: string | Date
  experienceLevel?: UserRoadmapAssessment["experienceLevel"]
  targetTrack?: UserRoadmapAssessment["targetTrack"]
  problemsSolved?: number
  hoursPerDay?: number
  patternFamiliarity?: UserRoadmapAssessment["patternFamiliarity"]
  // Category composition choice (full research mix / DSA only / custom subset).
  mixMode?: RoadmapMixMode
  selectedCategories?: RoadmapCategory[]
}

const VALID_MIX_MODES: RoadmapMixMode[] = ["full", "dsa-only", "custom"]
const VALID_CATEGORIES: RoadmapCategory[] = ["dsa", "bugfix", "decomposition", "system-design"]

function parseMixMode(value: unknown): RoadmapMixMode {
  return VALID_MIX_MODES.includes(value as RoadmapMixMode) ? (value as RoadmapMixMode) : "full"
}

function parseSelectedCategories(value: unknown): RoadmapCategory[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((c): c is RoadmapCategory => VALID_CATEGORIES.includes(c as RoadmapCategory))
}

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

    // Server-side tier gate: roadmap is a Pro feature
    const tierCheck = await requireTier(request, "pro")
    if (tierCheck.response) return tierCheck.response

    const userId = authResult.userId
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

    // Check subscription tier - roadmap is a Pro-only feature
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()
    const profile = profileDoc.data()
    const subscriptionTier = profile?.subscription_tier || "free"

    if (subscriptionTier === "free") {
      return NextResponse.json(
        {
          error: "Pro feature required",
          message:
            "Personalized study roadmaps are available with Pro. Upgrade to unlock custom prep plans tailored to your target company and interview date.",
          code: "PRO_REQUIRED",
          upgradeUrl: "/upgrade",
        },
        { status: 403 }
      )
    }

    const body = (await request.json()) as CreateRoadmapRequestBody
    const { searchParams } = new URL(request.url)
    const enableRAG = searchParams.get("rag") !== "false" // RAG enabled by default

    const {
      targetCompany,
      interviewDate,
      experienceLevel,
      targetTrack,
      problemsSolved,
      hoursPerDay,
      patternFamiliarity,
    } = body

    if (!targetCompany || !interviewDate) {
      return NextResponse.json(
        { error: "Target company and interview date are required" },
        { status: 400 }
      )
    }

    // Calculate days remaining
    const now = new Date()
    const interview = new Date(interviewDate)
    const daysRemaining = Math.max(
      1,
      Math.ceil((interview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )

    // Resolve the category composition the user chose (defaults to the research
    // full mix). Weighted by experience level, target track, and company.
    const experience = experienceLevel || "intermediate"
    const categoryMix = resolveCategoryMix({
      mixMode: parseMixMode(body.mixMode),
      selectedCategories: parseSelectedCategories(body.selectedCategories),
      experienceLevel: experience,
      targetTrack,
      companyId: targetCompany,
    })

    // Build assessment
    const assessment: UserRoadmapAssessment = {
      targetCompany,
      interviewDate: interview,
      daysRemaining,
      experienceLevel: experience,
      targetTrack,
      problemsSolvedEstimate: problemsSolved || 0,
      patternFamiliarity: patternFamiliarity || [],
      hoursPerDay: hoursPerDay || 2,
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

    // Server-side tier gate: roadmap is a Pro feature
    const tierCheck = await requireTier(request, "pro")
    if (tierCheck.response) return tierCheck.response

    const userId = authResult.userId
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
