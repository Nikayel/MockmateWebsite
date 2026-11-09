import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import type { PersonalizedRoadmap } from "@/lib/data/company-questions/types"

const firestore = vi.hoisted(() => {
  const get = vi.fn()
  const query = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get,
    doc: vi.fn((id = "reserved-roadmap") => ({ id })),
  }
  const batch = { set: vi.fn(), update: vi.fn(), commit: vi.fn() }
  return { get, batch, collection: vi.fn(() => query) }
})
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: { collection: firestore.collection, batch: () => firestore.batch },
}))
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: vi.fn() }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: vi.fn() }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: vi.fn() }))
vi.mock("@/lib/rag/roadmap-rag", () => ({ generateRAGEnhancedRoadmap: vi.fn() }))
vi.mock("@/lib/roadmap/free-roadmap-entitlement", () => ({
  reserveFirstFreeRoadmap: vi.fn(),
  confirmFirstFreeRoadmap: vi.fn(),
  releaseFirstFreeRoadmapReservation: vi.fn(),
}))
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() } }))

import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { getFlagAsync } from "@/lib/feature-flags"
import { generateRAGEnhancedRoadmap } from "@/lib/rag/roadmap-rag"
import {
  reserveFirstFreeRoadmap,
  confirmFirstFreeRoadmap,
  releaseFirstFreeRoadmapReservation,
} from "@/lib/roadmap/free-roadmap-entitlement"
import { POST } from "./route"

const body = { targetCompany: "stripe", interviewDate: "2027-01-01", hoursPerDay: 2 }
async function createRoadmap(payload: unknown = body, enableRAG = true) {
  const request = new NextRequest(`http://localhost/api/roadmap?rag=${enableRAG}`, {
    method: "POST",
  })
  request.json = async () => payload
  return (await POST(request)) as unknown as {
    status: number
    data: { roadmap: PersonalizedRoadmap; code?: string }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyAuth).mockResolvedValue({ authenticated: true, userId: "learner" })
  vi.mocked(requireTierForUser).mockResolvedValue({
    allowed: false,
    tier: "free",
    response: NextResponse.json({ code: "PRO_REQUIRED" }, { status: 403 }),
  })
  vi.mocked(getFlagAsync).mockResolvedValue(true)
  vi.mocked(reserveFirstFreeRoadmap).mockResolvedValue({ status: "reserved" })
  vi.mocked(confirmFirstFreeRoadmap).mockResolvedValue(undefined)
  vi.mocked(releaseFirstFreeRoadmapReservation).mockResolvedValue(undefined)
  firestore.get.mockResolvedValue({ empty: true, docs: [] })
  firestore.batch.commit.mockResolvedValue(undefined)
})

describe("roadmap creation and the first free offer", () => {
  it("saves and confirms an eligible free learner's balanced company roadmap", async () => {
    const result = await createRoadmap()
    expect(result.status).toBe(200)
    const roadmap = result.data.roadmap
    expect(roadmap.id).toBe("reserved-roadmap")
    expect(roadmap.categoryMix?.mode).toBe("balanced")
    const nodes = roadmap.dailyPlans.flatMap((plan) => plan.questions)
    const debugging = nodes.filter((question) => question.scenarioType === "bugfix")
    expect(debugging.length).toBeGreaterThan(0)
    expect(debugging.length).toBe(
      nodes.filter((question) => question.scenarioType === "dsa").length
    )
    expect(debugging[0].companyAlignment).toBe("stripe-library-debugging")
    expect(firestore.batch.set).toHaveBeenCalledWith(
      { id: "reserved-roadmap" },
      expect.objectContaining({
        is_first_free_roadmap: true,
        dailyPlans: roadmap.dailyPlans,
      })
    )
    expect(confirmFirstFreeRoadmap).toHaveBeenCalledWith("learner", "reserved-roadmap")
    expect(releaseFirstFreeRoadmapReservation).not.toHaveBeenCalled()
    expect(generateRAGEnhancedRoadmap).not.toHaveBeenCalled()
  })

  it("keeps paid creation available without claiming the free offer", async () => {
    vi.mocked(requireTierForUser).mockResolvedValue({ allowed: true, tier: "pro" })
    const result = await createRoadmap(body, false)
    expect(result.status).toBe(200)
    expect(result.data.roadmap.categoryMix?.mode).toBe("balanced")
    expect(reserveFirstFreeRoadmap).not.toHaveBeenCalled()
    expect(confirmFirstFreeRoadmap).not.toHaveBeenCalled()
  })

  it("denies unauthenticated creation before checking entitlements", async () => {
    vi.mocked(verifyAuth).mockResolvedValue({ authenticated: false })
    expect((await createRoadmap()).status).toBe(401)
    expect(requireTierForUser).not.toHaveBeenCalled()
    expect(reserveFirstFreeRoadmap).not.toHaveBeenCalled()
  })

  it("keeps inactive paid subscriptions blocked even with the offer enabled", async () => {
    vi.mocked(requireTierForUser).mockResolvedValue({
      allowed: false,
      tier: "pro",
      response: NextResponse.json({ code: "PRO_REQUIRED" }, { status: 403 }),
    })
    expect((await createRoadmap()).status).toBe(403)
    expect(reserveFirstFreeRoadmap).not.toHaveBeenCalled()
    expect(firestore.batch.set).not.toHaveBeenCalled()
  })

  it("keeps the feature flag in control of free creation", async () => {
    vi.mocked(getFlagAsync).mockResolvedValue(false)
    expect((await createRoadmap()).status).toBe(403)
    expect(reserveFirstFreeRoadmap).not.toHaveBeenCalled()
  })

  it("rejects free learners who already have a roadmap", async () => {
    firestore.get.mockResolvedValueOnce({ empty: false, docs: [{ id: "existing" }] })
    expect(await createRoadmap()).toMatchObject({
      status: 403,
      data: { code: "FREE_ROADMAP_ALREADY_USED" },
    })
    expect(reserveFirstFreeRoadmap).not.toHaveBeenCalled()
  })

  it.each([
    [{ status: "claimed", roadmapId: "existing" }, 403, "FREE_ROADMAP_ALREADY_USED"],
    [{ status: "in_progress" }, 409, "FREE_ROADMAP_IN_PROGRESS"],
  ] as const)("does not duplicate a %j offer", async (reservation, status, code) => {
    vi.mocked(reserveFirstFreeRoadmap).mockResolvedValue(reservation)
    expect(await createRoadmap()).toMatchObject({ status, data: { code } })
    expect(firestore.batch.set).not.toHaveBeenCalled()
    expect(releaseFirstFreeRoadmapReservation).not.toHaveBeenCalled()
  })

  it("releases its reservation when a payload fails validation so the learner can retry", async () => {
    expect((await createRoadmap({ ...body, targetCompany: "unknown-company" })).status).toBe(400)
    expect(releaseFirstFreeRoadmapReservation).toHaveBeenCalledWith("learner", "reserved-roadmap")
    expect(confirmFirstFreeRoadmap).not.toHaveBeenCalled()
    expect(firestore.batch.set).not.toHaveBeenCalled()
  })

  it("releases its reservation after persistence fails without consuming the offer", async () => {
    firestore.batch.commit.mockRejectedValueOnce(new Error("Firestore unavailable"))
    expect((await createRoadmap()).status).toBe(500)
    expect(releaseFirstFreeRoadmapReservation).toHaveBeenCalledWith("learner", "reserved-roadmap")
    expect(confirmFirstFreeRoadmap).not.toHaveBeenCalled()
  })
})
