/**
 * Which timed drill exercises the same system a lesson just taught, and the reverse.
 *
 * ## Why this is a curated table and not derived from `skills`
 *
 * The ticket (CUR-12, SD-W13) proposed deriving the mapping from each lesson's `skills` against each
 * scenario's `tags`, on the reasonable-sounding grounds that both already exist so no table needs
 * maintaining. Measured, that approach matches 30 of 208 lessons and gets several of them WRONG:
 * `sd-l1-serialization-compression` maps to the distributed-cache drill because both carry the tag
 * "performance", and `sd-l2-key-value` maps to the rate-limiter drill because both say "redis". A
 * shared adjective is not a shared subject.
 *
 * A wrong cross-link is worse than no cross-link. It sends a learner who just finished a lesson on
 * wire formats into a 45-minute timed round on caching, and the learner concludes the recommendation
 * is noise and stops trusting it.
 *
 * So the pairs are written down. The set is small (12 drills), the correspondences are obvious to a
 * human and invisible to a token match, and `lesson-drills.test.ts` asserts both ends of every pair
 * resolve against the live registries. That is the same discipline as the curriculum's ticket
 * registry: a central list plus a test that fails when a call site drifts, rather than a rule in prose.
 *
 * ## Why only the case studies
 *
 * A drill is a whole open-ended round: "design Uber". That maps onto a Level 10 case study, which is
 * the same exercise untimed. It does NOT map onto `sd-l7-sli-slo-sla`, and there is no honest drill to
 * send that learner to. Deliberately leaving 180-odd lessons unmapped is the point: coverage here
 * would be manufactured, and `lessonsWithoutDrill` is not a metric anybody should try to drive down.
 */
import { scenarios } from "@/lib/scenarios"
import type { SystemDesignScenario } from "@/lib/scenarios/types"

/**
 * Lesson id to drill id. Append-only in spirit: removing a pair silently drops a learner's route from
 * the lesson to the round, which nothing else would report.
 *
 * Only exact-subject pairs belong here. If you are reaching to justify one, leave it out.
 */
export const LESSON_DRILLS: ReadonlyArray<{ lessonId: string; drillId: string }> = [
  { lessonId: "sd-l10-url-shortener", drillId: "system-design-url-shortener" },
  { lessonId: "sd-l10-rate-limiter", drillId: "system-design-rate-limiter" },
  { lessonId: "sd-l10-instagram", drillId: "system-design-instagram" },
  { lessonId: "sd-l10-distributed-cache", drillId: "system-design-distributed-cache" },
  { lessonId: "sd-l10-video-streaming", drillId: "system-design-video-streaming" },
  { lessonId: "sd-l10-chat-messaging", drillId: "system-design-chat-system" },
  { lessonId: "sd-l10-ride-sharing", drillId: "system-design-uber" },
  { lessonId: "sd-l10-notification-system", drillId: "system-design-notification" },
  { lessonId: "sd-l10-file-sync", drillId: "system-design-file-storage" },
  { lessonId: "sd-l10-ecommerce-flash-sale", drillId: "system-design-ecommerce" },
  { lessonId: "sd-l10-news-feed", drillId: "system-design-newsfeed" },
] as const

/**
 * Drills with no lesson pair, recorded so the gap is a decision rather than an oversight.
 *
 * `system-design-twitter` ("Design Twitter/X News Feed") overlaps `sd-l10-news-feed`, which is
 * already paired with `system-design-newsfeed`. Pairing it to `sd-l10-typeahead` was the tempting
 * move and it is wrong: typeahead is search autocomplete, not feed generation, and a learner sent
 * from an autocomplete lesson into a feed-ranking round would rightly conclude the recommendation is
 * noise. Left unmapped on purpose.
 */
export const UNMAPPED_DRILLS: readonly string[] = ["system-design-twitter"] as const

/** Every system-design drill in the scenario registry. */
function systemDesignScenarios(): SystemDesignScenario[] {
  return scenarios.filter((s): s is SystemDesignScenario => s.type === "system-design")
}

export interface LessonDrill {
  id: string
  title: string
  estimatedTime: number
  /** Deep link into a timed round, browse-then-choose rather than auto-started. */
  href: string
}

/**
 * The drill path. Kept in step with `systemDesignDrillPath` in `SystemDesignDrills.tsx`: `scenario`
 * alone is ignored by the interview page, and `practice=true` is what makes it take over the route
 * without auto-starting the round the way `roadmap=true` would.
 */
export function drillHref(drillId: string): string {
  return `/interview?scenario=${drillId}&practice=true`
}

/** The drill for a lesson, or null when the lesson has no honest counterpart. */
export function drillForLesson(lessonId: string): LessonDrill | null {
  const pair = LESSON_DRILLS.find((entry) => entry.lessonId === lessonId)
  if (!pair) return null
  const scenario = systemDesignScenarios().find((s) => s.id === pair.drillId)
  // A pair naming a scenario that no longer exists would render a dead link, which is invisible
  // until a learner clicks it. The test pins this; returning null keeps prod from shipping a 404.
  if (!scenario) return null
  return {
    id: scenario.id,
    title: scenario.title,
    estimatedTime: scenario.estimatedTime,
    href: drillHref(scenario.id),
  }
}

export interface DrillLesson {
  id: string
  /** Public reading route for the lesson, so the drill can point back at what teaches it. */
  href: string
}

/** The lesson a drill has a counterpart in, or null. */
export function lessonForDrill(drillId: string): DrillLesson | null {
  const pair = LESSON_DRILLS.find((entry) => entry.drillId === drillId)
  if (!pair) return null
  return { id: pair.lessonId, href: `/learn/system-design/case-studies/${pair.lessonId}` }
}
