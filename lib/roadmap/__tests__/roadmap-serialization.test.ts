import { describe, expect, it } from "vitest"

import { serializeRoadmapDocument, sortRoadmapsByCreatedAt } from "../roadmap-serialization"

const timestamp = (date: string) => ({
  toDate: () => new Date(date),
})

describe("roadmap serialization", () => {
  it("converts Firestore timestamp-like roadmap dates to API strings", () => {
    const roadmap = serializeRoadmapDocument({
      id: "roadmap-1",
      data: () => ({
        userId: "user-1",
        status: "active",
        createdAt: timestamp("2026-01-01T00:00:00.000Z"),
        updatedAt: timestamp("2026-01-02T00:00:00.000Z"),
        interviewDate: timestamp("2026-02-01T00:00:00.000Z"),
        dailyPlans: [
          {
            dayNumber: 1,
            date: timestamp("2026-01-03T00:00:00.000Z"),
            questions: [{ scenarioId: "dsa-two-sum", status: "completed", completedAt: null }],
          },
        ],
        milestones: [
          {
            id: "milestone-1",
            targetDate: timestamp("2026-01-10T00:00:00.000Z"),
            completedAt: timestamp("2026-01-09T00:00:00.000Z"),
          },
        ],
      }),
    })

    expect(roadmap).toMatchObject({
      id: "roadmap-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      interviewDate: "2026-02-01T00:00:00.000Z",
      dailyPlans: [{ date: "2026-01-03T00:00:00.000Z" }],
      milestones: [
        {
          targetDate: "2026-01-10T00:00:00.000Z",
          completedAt: "2026-01-09T00:00:00.000Z",
        },
      ],
    })
  })

  it("sorts serialized roadmaps newest first", () => {
    const older = serializeRoadmapDocument({
      id: "older",
      data: () => ({ createdAt: "2026-01-01T00:00:00.000Z" }),
    })
    const newer = serializeRoadmapDocument({
      id: "newer",
      data: () => ({ createdAt: "2026-01-02T00:00:00.000Z" }),
    })

    expect([older, newer].sort(sortRoadmapsByCreatedAt).map((roadmap) => roadmap.id)).toEqual([
      "newer",
      "older",
    ])
  })
})
