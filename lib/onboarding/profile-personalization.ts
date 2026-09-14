import type { Profile } from "@/lib/types"

export type TargetRole = NonNullable<Profile["role"]>
export type InterviewGoal = NonNullable<Profile["goal"]>
export type InterviewTimeline = NonNullable<Profile["interview_timeline"]>

export interface ProfilePersonalizationData {
  role: TargetRole
  goal: InterviewGoal
  targetCompany: string | null
  interviewTimeline: InterviewTimeline
  weeklyGoal: number
}

export const TARGET_ROLE_OPTIONS = [
  { value: "student", label: "Intern / student", description: "Building interview foundations" },
  { value: "junior", label: "New grad / junior", description: "Early-career engineering roles" },
  { value: "mid", label: "Mid-level", description: "Independent contributor roles" },
  { value: "senior", label: "Senior+", description: "Leadership and deeper tradeoffs" },
] as const satisfies ReadonlyArray<{
  value: TargetRole
  label: string
  description: string
}>

export const INTERVIEW_GOAL_OPTIONS = [
  { value: "faang", label: "Big Tech", description: "Structured, high-signal loops" },
  { value: "startup", label: "Startup", description: "Practical, fast-moving interviews" },
  { value: "promotion", label: "Level up", description: "Prepare for the next level" },
  { value: "general", label: "General prep", description: "Build durable interview skill" },
] as const satisfies ReadonlyArray<{
  value: InterviewGoal
  label: string
  description: string
}>

export const INTERVIEW_TIMELINE_OPTIONS = [
  { value: "interviewing_now", label: "Interviewing now" },
  { value: "within_month", label: "Within a month" },
  { value: "within_quarter", label: "Within 3 months" },
  { value: "exploring", label: "Just exploring" },
] as const satisfies ReadonlyArray<{ value: InterviewTimeline; label: string }>

export const WEEKLY_GOAL_OPTIONS = [
  { value: 1, label: "1 session", description: "Keep momentum" },
  { value: 3, label: "3 sessions", description: "Build steadily" },
  { value: 5, label: "5 sessions", description: "Interview sprint" },
] as const

export function needsProfilePersonalization(
  profile: Pick<Profile, "profile_calibration_completed"> | null | undefined
): boolean {
  return profile?.profile_calibration_completed !== true
}

export function shouldShowProfilePersonalization(
  profile: Pick<Profile, "profile_calibration_completed"> | null | undefined,
  completedSessionCount: number
): boolean {
  return completedSessionCount > 0 && needsProfilePersonalization(profile)
}
