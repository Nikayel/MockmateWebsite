import { PRICING_CONFIG } from "@/lib/config"
import { PRO_AI_LIMIT_MULTIPLIER } from "@/lib/pricing"

/**
 * The Free-vs-Pro feature matrix rendered on /pricing.
 *
 * Client-safe pure data: lesson counts arrive as a parameter because they are
 * derived from `lib/tutorials/course-catalog`, which is server-only by
 * construction (importing it pulls the full authored curriculum). The pricing
 * page computes the counts at build time and threads them down, so the page
 * can never advertise a lesson count the catalog does not contain.
 *
 * Session counts come from PRICING_CONFIG for the same reason: they are the
 * enforced server quota, not copy, and must move with the config or this page
 * advertises a limit the server no longer grants.
 */

export interface CourseLessonCounts {
  python: number
  dataEngineering: number
  systemDesign: number
}

/**
 * One string for every surface that sells the roadmap (plan cards, locked list,
 * matrix, /upgrade checkout card). Each clause is backed by an input the
 * roadmap wizard actually collects (UserRoadmapAssessment): targetCompany,
 * targetTrack ("role-aware question prioritization"), and experienceLevel plus
 * patternFamiliarity for the skills claim.
 */
export const ROADMAP_FEATURE_COPY = "Interview roadmap tailored to your company, role, and skills"

export function totalLessonCount(counts: CourseLessonCounts): number {
  return counts.python + counts.dataEngineering + counts.systemDesign
}

/** true = included, false = not included, string = a value worth stating ("8 / month"). */
export type PlanCell = boolean | string

export interface PlanFeatureRow {
  label: string
  free: PlanCell
  pro: PlanCell
}

export interface PlanFeatureGroup {
  /** Stable id the component maps to an icon; the data file stays icon-free. */
  id: "courses" | "practice" | "retention"
  title: string
  note: string
  rows: PlanFeatureRow[]
}

export function buildFeatureMatrix(counts: CourseLessonCounts): PlanFeatureGroup[] {
  return [
    {
      id: "courses",
      title: "Courses & self-paced learning",
      note: "Free for everyone. Lessons never spend an interview session.",
      rows: [
        { label: `Python course · ${counts.python} interactive lessons`, free: true, pro: true },
        {
          label: `Data Engineering & SQL course · ${counts.dataEngineering} lessons`,
          free: true,
          pro: true,
        },
        {
          label: `System Design course · ${counts.systemDesign} lessons with design exercises`,
          free: true,
          pro: true,
        },
        { label: "Case Labs: scope and build inside a real codebase", free: true, pro: true },
        { label: "In-browser editor that runs your code and tests", free: true, pro: true },
      ],
    },
    {
      id: "practice",
      title: "AI interview practice",
      note: "Metered in sessions. Starting one grants 10 free re-opens.",
      rows: [
        {
          label: "Full interview sessions",
          free: `${PRICING_CONFIG.free.sessionsPerMonth} / month`,
          pro: `${PRICING_CONFIG.pro.sessionsPerMonth} / month`,
        },
        { label: "Voice + chat AI interviewer", free: true, pro: true },
        {
          label: "AI chat throughput (requests and tokens per minute)",
          free: "Standard",
          pro: `${PRO_AI_LIMIT_MULTIPLIER}x higher`,
        },
        { label: "DSA track · 20+ problems, unlimited practice", free: true, pro: true },
        { label: "Debugging track · hunt real bugs in multi-file code", free: true, pro: true },
        { label: "Scored feedback on four interview criteria", free: true, pro: true },
        { label: "Progress dashboard & analytics", free: true, pro: true },
      ],
    },
    {
      id: "retention",
      title: "Retention & coaching",
      note: "The Pro layer: keeps what you practice from fading.",
      rows: [
        { label: "Spaced repetition review scheduling", free: false, pro: true },
        { label: ROADMAP_FEATURE_COPY, free: false, pro: true },
        { label: "Pattern mastery tracking", free: false, pro: true },
        {
          label: "Open learner model: inspect and challenge the AI's read of your skills",
          free: false,
          pro: true,
        },
        { label: "Priority support", free: false, pro: true },
      ],
    },
  ]
}
