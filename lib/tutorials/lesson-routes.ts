/**
 * Learn URL authority — the single place that knows the shape of every `/learn` path.
 *
 * There are two URLs per lesson, and the difference between them is the whole security model:
 *
 *  - {@link publicLessonPath} `/learn/{track}/{levelSlug}/{lessonId}` is the **canonical, public,
 *    statically generated reading page**. It renders a {@link import("./public-preview").PublicLessonPreview},
 *    which is an allowlist projection — no reference solution, no test case, no model answer, and no
 *    user state ever reaches it. It is byte-identical for every visitor, which is both what makes it
 *    CDN-cacheable and what makes it provably not cloaking.
 *  - {@link lessonWorkspacePath} `/learn/{track}/{levelSlug}/{lessonId}/workspace` is the
 *    **auth-gated interactive player**. It carries the graded payload and is noindexed.
 *
 * Kept deliberately free of registry imports so client components can import it without pulling the
 * multi-megabyte authored curriculum into their bundle. Anything that needs to enumerate real
 * lessons uses `lib/tutorials/course-catalog.ts` (server-only) instead.
 */
import type { CourseId } from "./types"

/** Route base for each course. Keys are the `CourseId` union, so a new course fails to compile here first. */
export const LEARN_BASE_PATH: Record<CourseId, string> = {
  python: "/learn/python",
  "data-engineering": "/learn/data-engineering",
  "system-design": "/learn/system-design",
}

/** Human label for a course, for breadcrumbs and metadata. */
export const LEARN_COURSE_LABEL: Record<CourseId, string> = {
  python: "Python",
  "data-engineering": "Data Engineering",
  "system-design": "System Design",
}

/**
 * Paths this course used to live at, kept so the 308s in `next.config.mjs` and any copy that still
 * says "SQL" can be traced back here. `/learn/sql/*` was the Data Engineering course's base path
 * until the SQL track became one section of it.
 */
export const LEGACY_LEARN_BASE_PATH: Partial<Record<CourseId, string>> = {
  "data-engineering": "/learn/sql",
}

/** The child segment that carries the graded, auth-gated player. */
export const WORKSPACE_SEGMENT = "workspace"

export const LEARN_HUB_PATH = "/learn"

/** `/learn/{track}` — the public Path landing for a course. */
export function trackPath(courseId: CourseId): string {
  return LEARN_BASE_PATH[courseId]
}

/** `/learn/{track}/{levelSlug}` — the public level index. */
export function levelPath(courseId: CourseId, levelSlug: string): string {
  return `${LEARN_BASE_PATH[courseId]}/${levelSlug}`
}

/**
 * `/learn/{track}/{levelSlug}/{lessonId}` — the canonical, indexable reading page.
 * This is the URL that goes in the sitemap and in every `rel=canonical`.
 */
export function publicLessonPath(courseId: CourseId, levelSlug: string, lessonId: string): string {
  return `${LEARN_BASE_PATH[courseId]}/${levelSlug}/${lessonId}`
}

/**
 * `/learn/{track}/{levelSlug}/{lessonId}/workspace` — the auth-gated interactive player.
 * Never appears in the sitemap and always renders `robots: { index: false }`.
 */
export function lessonWorkspacePath(
  courseId: CourseId,
  levelSlug: string,
  lessonId: string
): string {
  return `${publicLessonPath(courseId, levelSlug, lessonId)}/${WORKSPACE_SEGMENT}`
}

/**
 * True when a pathname addresses a lesson workspace, which is the only part of `/learn` that
 * requires sign-in. Matched as a whole trailing SEGMENT (with an optional trailing slash) rather
 * than with `endsWith`, so `/learn/python/x/y/workspace/` and any future child under it are both
 * covered while a lesson id that merely ends in the word "workspace" is not.
 *
 * Used by `proxy.ts`. Kept here so the gate predicate and the link builder can never drift apart.
 */
export function isLessonWorkspacePath(pathname: string): boolean {
  return /^\/learn\/[^/]+\/[^/]+\/[^/]+\/workspace(\/|$)/.test(pathname)
}
