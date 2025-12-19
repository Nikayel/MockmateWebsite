import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAuth } from '@/lib/auth-helpers'
import { generatePersonalizedRoadmap } from '@/lib/roadmap/prioritization-algorithm'
import { scenarios } from '@/lib/scenarios'
import { UserRoadmapAssessment, PersonalizedRoadmap } from '@/lib/data/company-questions/types'

const COLLECTION = 'user_roadmaps'

/**
 * GET /api/roadmap - Get user's active roadmap
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authResult.userId

    // Get user's active roadmap
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    if (snapshot.empty) {
      return NextResponse.json({ roadmap: null })
    }

    const doc = snapshot.docs[0]
    const roadmap = {
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to ISO strings
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      interviewDate: doc.data().interviewDate?.toDate?.()?.toISOString() || doc.data().interviewDate,
    }

    return NextResponse.json({ roadmap })
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
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authResult.userId
    const body = await request.json()

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

    // Generate roadmap
    const roadmap = generatePersonalizedRoadmap(dsaScenarios, assessment, userId)

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
    const roadmapDoc = {
      ...roadmap,
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
