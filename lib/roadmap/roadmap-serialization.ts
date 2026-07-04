import type { DailyPlan, Milestone, PersonalizedRoadmap } from "@/lib/data/company-questions/types"

type TimestampLike = {
  toDate: () => Date
}

export type RoadmapQuestionStatus = DailyPlan["questions"][number]["status"]

export type FirestoreRoadmapQuestion = Omit<
  DailyPlan["questions"][number],
  "completedAt" | "score"
> & {
  completedAt?: unknown
  score?: number | null
}

export type FirestoreDailyPlan = Omit<Partial<DailyPlan>, "date" | "questions"> & {
  date?: unknown
  questions?: FirestoreRoadmapQuestion[]
}

export type FirestoreMilestone = Omit<Partial<Milestone>, "targetDate" | "completedAt"> & {
  targetDate?: unknown
  completedAt?: unknown
}

export type FirestoreRoadmapData = Omit<
  Partial<PersonalizedRoadmap>,
  "createdAt" | "updatedAt" | "interviewDate" | "dailyPlans" | "milestones"
> & {
  userId?: string
  createdAt?: unknown
  updatedAt?: unknown
  interviewDate?: unknown
  dailyPlans?: FirestoreDailyPlan[]
  milestones?: FirestoreMilestone[]
}

export type RoadmapApiRecord = Omit<
  FirestoreRoadmapData,
  "createdAt" | "updatedAt" | "interviewDate" | "dailyPlans" | "milestones"
> & {
  id: string
  createdAt?: string
  updatedAt?: string
  interviewDate?: string
  dailyPlans: Array<Omit<FirestoreDailyPlan, "date"> & { date?: string }>
  milestones: Array<
    Omit<FirestoreMilestone, "targetDate" | "completedAt"> & {
      targetDate?: string
      completedAt?: string
    }
  >
}

export interface RoadmapDocumentSnapshot {
  id: string
  data(): FirebaseFirestore.DocumentData | undefined
}

export function isRoadmapQuestionStatus(value: unknown): value is RoadmapQuestionStatus {
  return (
    value === "pending" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "skipped" ||
    value === "evaluating"
  )
}

export function serializeDateValue(value: unknown): string | undefined {
  if (!value) return undefined

  if (isTimestampLike(value)) {
    return value.toDate().toISOString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "string") {
    return value
  }

  return undefined
}

export function toDateValue(value: unknown, fallback = new Date()): Date {
  if (isTimestampLike(value)) return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === "string" || typeof value === "number") return new Date(value)
  return fallback
}

export function serializeRoadmapDocument(
  doc: RoadmapDocumentSnapshot,
  overrides: Partial<RoadmapApiRecord> = {}
): RoadmapApiRecord {
  const data = (doc.data() || {}) as FirestoreRoadmapData

  return {
    ...data,
    createdAt: serializeDateValue(data.createdAt),
    updatedAt: serializeDateValue(data.updatedAt),
    interviewDate: serializeDateValue(data.interviewDate),
    dailyPlans: serializeDailyPlans(data.dailyPlans),
    milestones: serializeMilestones(data.milestones),
    ...overrides,
    id: doc.id,
  }
}

export function sortRoadmapsByCreatedAt(a: RoadmapApiRecord, b: RoadmapApiRecord): number {
  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
}

function serializeDailyPlans(
  dailyPlans: FirestoreDailyPlan[] = []
): RoadmapApiRecord["dailyPlans"] {
  return dailyPlans.map((plan) => ({
    ...plan,
    date: serializeDateValue(plan.date),
    // Read-time defaulting so legacy DSA-only nodes (no category axis) stay
    // valid without a data migration.
    questions: (plan.questions ?? []).map((question) => ({
      ...question,
      category: question.category ?? "dsa",
      scenarioType: question.scenarioType ?? "dsa",
    })),
  }))
}

function serializeMilestones(
  milestones: FirestoreMilestone[] = []
): RoadmapApiRecord["milestones"] {
  return milestones.map((milestone) => ({
    ...milestone,
    targetDate: serializeDateValue(milestone.targetDate),
    completedAt: serializeDateValue(milestone.completedAt),
  }))
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  )
}
