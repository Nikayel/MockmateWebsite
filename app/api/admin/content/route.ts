/**
 * Content Management API
 *
 * Manage interview problems, scenarios, and educational content
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyToken, getAdminRole } from "@/lib/admin/rbac"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

export interface Problem {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  category: string
  tags: string[]
  pattern: string
  hints: string[]
  solution?: string
  starterCode?: string
  testCases?: Array<{ input: string; expected: string }>
  active: boolean
  usageCount: number
  avgScore: number
  createdAt: string
  updatedAt: string
}

// GET - List problems/content
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

    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get("difficulty")
    const category = searchParams.get("category")
    const active = searchParams.get("active")

    let query = adminDb.collection("problems").orderBy("createdAt", "desc")

    if (difficulty && difficulty !== "all") {
      query = query.where("difficulty", "==", difficulty)
    }
    if (category && category !== "all") {
      query = query.where("category", "==", category)
    }
    if (active === "true") {
      query = query.where("active", "==", true)
    }

    const snapshot = await query.limit(200).get()

    const problems: Problem[] = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        difficulty: data.difficulty || "medium",
        category: data.category || "general",
        tags: data.tags || [],
        pattern: data.pattern || "",
        hints: data.hints || [],
        solution: data.solution,
        starterCode: data.starterCode,
        testCases: data.testCases,
        active: data.active ?? true,
        usageCount: data.usageCount || 0,
        avgScore: data.avgScore || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      }
    })

    // Get unique categories and patterns
    const categories = [...new Set(problems.map((p) => p.category))].filter(Boolean)
    const patterns = [...new Set(problems.map((p) => p.pattern))].filter(Boolean)

    const stats = {
      total: problems.length,
      active: problems.filter((p) => p.active).length,
      easy: problems.filter((p) => p.difficulty === "easy").length,
      medium: problems.filter((p) => p.difficulty === "medium").length,
      hard: problems.filter((p) => p.difficulty === "hard").length,
      avgUsage:
        problems.length > 0
          ? Math.round(problems.reduce((s, p) => s + p.usageCount, 0) / problems.length)
          : 0,
    }

    return NextResponse.json({
      success: true,
      problems,
      filters: { categories, patterns },
      stats,
    })
  } catch (error) {
    console.error("[Content API] GET Error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch content" }, { status: 500 })
  }
}

// POST - Create problem
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
      title,
      description,
      difficulty = "medium",
      category = "general",
      tags = [],
      pattern = "",
      hints = [],
      solution,
      starterCode,
      testCases = [],
      active = true,
    } = body

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: "Title and description are required" },
        { status: 400 }
      )
    }

    const now = Timestamp.now()
    const problemData = {
      title,
      description,
      difficulty,
      category,
      tags,
      pattern,
      hints,
      solution,
      starterCode,
      testCases,
      active,
      usageCount: 0,
      avgScore: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.userId,
    }

    const docRef = await adminDb.collection("problems").add(problemData)

    await adminDb.collection("admin_audit_log").add({
      adminId: auth.userId,
      action: "create_problem",
      details: { problemId: docRef.id, title },
      timestamp: now,
    })

    return NextResponse.json({ success: true, problemId: docRef.id })
  } catch (error) {
    console.error("[Content API] POST Error:", error)
    return NextResponse.json({ success: false, error: "Failed to create problem" }, { status: 500 })
  }
}

// PUT - Update problem
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
      return NextResponse.json({ success: false, error: "Problem ID is required" }, { status: 400 })
    }

    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
    }

    await adminDb.collection("problems").doc(id).update(updateData)

    await adminDb.collection("admin_audit_log").add({
      adminId: auth.userId,
      action: "update_problem",
      details: { problemId: id, updates: Object.keys(updates) },
      timestamp: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Content API] PUT Error:", error)
    return NextResponse.json({ success: false, error: "Failed to update problem" }, { status: 500 })
  }
}

// DELETE - Delete problem
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
        { success: false, error: "Only super admins can delete content" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "Problem ID is required" }, { status: 400 })
    }

    await adminDb.collection("problems").doc(id).delete()

    await adminDb.collection("admin_audit_log").add({
      adminId: auth.userId,
      action: "delete_problem",
      details: { problemId: id },
      timestamp: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Content API] DELETE Error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete problem" }, { status: 500 })
  }
}
