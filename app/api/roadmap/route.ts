import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAuth } from '@/lib/auth-helpers'
import { generatePersonalizedRoadmap } from '@/lib/roadmap/prioritization-algorithm'
import { generateRAGEnhancedRoadmap, type RAGEnhancedRoadmap } from '@/lib/rag/roadmap-rag'
import { scenarios } from '@/lib/scenarios'
import { UserRoadmapAssessment, PersonalizedRoadmap } from '@/lib/data/company-questions/types'

const COLLECTION = 'user_roadmaps'

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
      console.log('[Roadmap API] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authResult.userId
    console.log('[Roadmap API] GET request for user:', userId)

    const { searchParams } = new URL(request.url)
    const getAll = searchParams.get('all') === 'true'
    const statusFilter = searchParams.get('status')

    // Check for expired active roadmaps and archive them
    const now = new Date()
    const activeSnapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get()

    console.log('[Roadmap API] Found', activeSnapshot.docs.length, 'active roadmaps')

    const batch = adminDb.batch()
    let hasExpired = false

    activeSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const interviewDate = data.interviewDate?.toDate?.() || new Date(data.interviewDate)
      if (interviewDate < now) {
        batch.update(doc.ref, { status: 'archived', updatedAt: new Date() })
        hasExpired = true
      }
    })

    if (hasExpired) {
      await batch.commit()
    }

    // Get roadmaps based on query params
    let snapshot
    if (getAll) {
      // Get all roadmaps
      snapshot = await adminDb
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get()
    } else if (statusFilter) {
      // Get roadmaps by status
      snapshot = await adminDb
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .where('status', '==', statusFilter)
        .orderBy('createdAt', 'desc')
        .get()
    } else {
      // Get active roadmap only (default behavior)
      snapshot = await adminDb
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()
    }

    if (snapshot.empty) {
      console.log('[Roadmap API] No roadmaps found matching query')

      // Check if there are any roadmaps without proper status field (legacy data fix)
      const allDocsSnapshot = await adminDb
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .get()

      console.log('[Roadmap API] Total documents for user:', allDocsSnapshot.docs.length)

      // Find roadmaps that need status field fix
      const docsNeedingFix = allDocsSnapshot.docs.filter(doc => {
        const data = doc.data()
        const hasNoStatus = !data.status
        const interviewDate = data.interviewDate?.toDate?.() || new Date(data.interviewDate)
        const isNotExpired = interviewDate >= new Date()
        console.log('[Roadmap API] Doc:', doc.id, 'status:', data.status, 'company:', data.targetCompany || data.companyName, 'needsFix:', hasNoStatus && isNotExpired)
        return hasNoStatus && isNotExpired
      })

      // Fix legacy roadmaps missing status field
      if (docsNeedingFix.length > 0 && !getAll) {
        console.log('[Roadmap API] Fixing', docsNeedingFix.length, 'legacy roadmaps missing status field')
        const batch = adminDb.batch()

        // Set the most recent one as active, others as abandoned
        const sortedDocs = docsNeedingFix.sort((a, b) => {
          const aCreated = a.data().createdAt?.toDate?.() || new Date(0)
          const bCreated = b.data().createdAt?.toDate?.() || new Date(0)
          return bCreated.getTime() - aCreated.getTime()
        })

        sortedDocs.forEach((doc, index) => {
          batch.update(doc.ref, {
            status: index === 0 ? 'active' : 'abandoned',
            updatedAt: new Date(),
          })
        })

        await batch.commit()

        // Return the now-active roadmap
        const fixedDoc = sortedDocs[0]
        const data = fixedDoc.data()

        // Convert all date fields properly
        const convertedRoadmap = {
          id: fixedDoc.id,
          ...data,
          status: 'active',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: new Date().toISOString(),
          interviewDate: data.interviewDate?.toDate?.()?.toISOString() || data.interviewDate,
          dailyPlans: data.dailyPlans?.map((plan: any) => ({
            ...plan,
            date: plan.date?.toDate?.()?.toISOString() || plan.date,
          })) || [],
          milestones: data.milestones?.map((m: any) => ({
            ...m,
            targetDate: m.targetDate?.toDate?.()?.toISOString() || m.targetDate,
          })) || [],
        }

        console.log('[Roadmap API] Returning fixed roadmap:', convertedRoadmap.id)
        return NextResponse.json({ roadmap: convertedRoadmap })
      }

      return NextResponse.json(getAll ? { roadmaps: [] } : { roadmap: null })
    }

    console.log('[Roadmap API] Found', snapshot.docs.length, 'roadmaps matching query')

    const convertRoadmap = (doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        interviewDate: data.interviewDate?.toDate?.()?.toISOString() || data.interviewDate,
        // Convert nested dates in dailyPlans and milestones
        dailyPlans: data.dailyPlans?.map((plan: any) => ({
          ...plan,
          date: plan.date?.toDate?.()?.toISOString() || plan.date,
        })) || [],
        milestones: data.milestones?.map((m: any) => ({
          ...m,
          targetDate: m.targetDate?.toDate?.()?.toISOString() || m.targetDate,
        })) || [],
      }
    }

    if (getAll || statusFilter) {
      const roadmaps = snapshot.docs.map(convertRoadmap)
      return NextResponse.json({ roadmaps })
    } else {
      const roadmap = convertRoadmap(snapshot.docs[0])
      return NextResponse.json({ roadmap })
    }
  } catch (error) {
    console.error('Error fetching roadmap:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch roadmap' },
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authResult.userId

    // Check subscription tier - roadmap is a Pro-only feature
    const profileDoc = await adminDb.collection('profiles').doc(userId).get()
    const profile = profileDoc.data()
    const subscriptionTier = profile?.subscription_tier || 'free'

    if (subscriptionTier === 'free') {
      return NextResponse.json(
        {
          error: 'Pro feature required',
          message: 'Personalized study roadmaps are available with Pro. Upgrade to unlock custom prep plans tailored to your target company and interview date.',
          code: 'PRO_REQUIRED',
          upgradeUrl: '/upgrade'
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const enableRAG = searchParams.get('rag') !== 'false' // RAG enabled by default

    const {
      targetCompany,
      interviewDate,
      experienceLevel,
      problemsSolved,
      hoursPerDay,
      patternFamiliarity,
    } = body

    if (!targetCompany || !interviewDate) {
      return NextResponse.json(
        { error: 'Target company and interview date are required' },
        { status: 400 }
      )
    }

    // Calculate days remaining
    const now = new Date()
    const interview = new Date(interviewDate)
    const daysRemaining = Math.max(1, Math.ceil((interview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    // Build assessment
    const assessment: UserRoadmapAssessment = {
      targetCompany,
      interviewDate: interview,
      daysRemaining,
      experienceLevel: experienceLevel || 'intermediate',
      problemsSolvedEstimate: problemsSolved || 0,
      patternFamiliarity: patternFamiliarity || [],
      hoursPerDay: hoursPerDay || 2,
      preferredDifficulty: 'mixed',
      targetScore: 80,
    }

    // Get DSA scenarios
    const dsaScenarios = scenarios.filter(s => s.type === 'dsa')

    // Generate roadmap - use RAG-enhanced version if enabled
    let roadmap: PersonalizedRoadmap | RAGEnhancedRoadmap | null

    if (enableRAG) {
      console.log('[Roadmap] Generating RAG-enhanced roadmap for user:', userId)
      roadmap = await generateRAGEnhancedRoadmap({
        userId,
        assessment,
        scenarios: dsaScenarios,
        enableRAG: true,
        enableAIInsights: true,
      })
    } else {
      console.log('[Roadmap] Generating standard roadmap for user:', userId)
      roadmap = generatePersonalizedRoadmap(dsaScenarios, assessment, userId)
    }

    if (!roadmap) {
      return NextResponse.json(
        { error: 'Failed to generate roadmap' },
        { status: 500 }
      )
    }

    // Mark any existing active roadmaps as abandoned
    const existingSnapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get()

    const batch = adminDb.batch()
    existingSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'abandoned', updatedAt: new Date() })
    })

    // Prepare roadmap for Firestore (convert dates)
    const ragEnhancements = 'ragEnhancements' in roadmap ? roadmap.ragEnhancements : null
    const roadmapDoc = {
      ...roadmap,
      // Explicitly set status to 'active' (ensure it's always present)
      status: 'active',
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      interviewDate: interview,
      assessment: {
        ...assessment,
        interviewDate: interview,
      },
      dailyPlans: roadmap.dailyPlans.map(plan => ({
        ...plan,
        date: new Date(plan.date),
      })),
      milestones: roadmap.milestones.map(m => ({
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
      }
    })
  } catch (error) {
    console.error('Error creating roadmap:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create roadmap' },
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authResult.userId
    const body = await request.json()
    const { roadmapId, status } = body

    if (!roadmapId || !status) {
      return NextResponse.json(
        { error: 'Roadmap ID and status are required' },
        { status: 400 }
      )
    }

    if (!['active', 'archived', 'completed', 'abandoned'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get the roadmap
    const docRef = adminDb.collection(COLLECTION).doc(roadmapId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Roadmap not found' },
        { status: 404 }
      )
    }

    const roadmapData = doc.data()

    // Verify ownership
    if (roadmapData?.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update status
    await docRef.update({
      status,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating roadmap:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update roadmap' },
      { status: 500 }
    )
  }
}
