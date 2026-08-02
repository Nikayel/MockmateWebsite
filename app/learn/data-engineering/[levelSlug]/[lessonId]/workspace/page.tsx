import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  getFirstLessonOfNextSqlLevel,
  getNextSqlLessonInLevel,
  getSqlLessonLocation,
  listSqlLessonsInLevel,
} from "@/lib/tutorials/sql/registry"
import { buildLessonNav, toLeanLevel } from "@/lib/tutorials/level-path"
import { trackPath } from "@/lib/tutorials/lesson-routes"
import { SqlLessonPlayer } from "@/components/tutorials/SqlLessonPlayer"

type Props = { params: Promise<{ levelSlug: string; lessonId: string }> }

/**
 * The SQL Lesson Workspace route (Server Component) — resolves the single lesson from the URL and
 * computes next-lesson / level-boundary navigation server-side (preserving the "Level N complete"
 * hand-off), then hands the client player only a lean level + the resolved nav so no other lesson's
 * exercise payloads ship to the client. The Read → Apply → Practice loop runs entirely in the client
 * player against in-browser sql.js.
 *
 * ## Why this is a separate route from the page above it
 *
 * The parent `/learn/data-engineering/{levelSlug}/{lessonId}` is public, static, and indexed. THIS route is the
 * graded half: it serializes the full authored lesson (seed SQL, assertion queries, expected result
 * sets, hints, reference solution) into the client payload, which is fine for a signed-in learner
 * and unacceptable in a CDN cache or a search index. Hence the two route-segment configs below,
 * which are load-bearing:
 *
 *  - `dynamic = "force-dynamic"` keeps this response out of every cache. It must never be prerendered
 *    or shared between visitors.
 *  - `robots: { index: false, follow: false }` keeps the graded payload out of search results. The
 *    public reading page is the canonical, indexable URL for this lesson.
 *
 * Sign-in is enforced by `proxy.ts` (via `isLessonWorkspacePath`) plus the `LearnAuthGuard` in this
 * folder's layout. The proxy check is a cookie-presence check and is spoofable; that is a known,
 * pre-existing limit, and the mitigation is exactly the two lines below, so exposure is no worse
 * than it has always been.
 */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function SqlLessonWorkspacePage({ params }: Props) {
  const { lessonId } = await params
  const location = getSqlLessonLocation(lessonId)

  if (!location) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-lg font-medium">Lesson not found</p>
        <p className="text-muted-foreground mt-1 text-sm">
          This lesson may have been moved or renamed.
        </p>
        <Link
          href={trackPath("data-engineering")}
          className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SQL Path
        </Link>
      </div>
    )
  }

  const { level, lesson } = location

  // Resolve navigation server-side via the registry so its exact in-level ordering + the deliberate
  // level-boundary hand-off (`getFirstLessonOfNextSqlLevel`) are preserved unchanged.
  const nav = buildLessonNav({
    level,
    lessonId: lesson.id,
    lessonsInLevel: listSqlLessonsInLevel(level),
    nextInLevel: getNextSqlLessonInLevel(lesson.id),
    firstOfNextLevel: getFirstLessonOfNextSqlLevel(lesson.id),
  })

  // `key={lesson.id}` forces a fresh player instance per lesson so navigating between lessons never
  // carries over the previous lesson's open phase, resume flag, or runner results (local component
  // state, not in the store).
  return <SqlLessonPlayer key={lesson.id} lesson={lesson} level={toLeanLevel(level)} nav={nav} />
}
