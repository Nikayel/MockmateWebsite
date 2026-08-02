import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  getFirstLessonOfNextLevel,
  getLessonLocation,
  getNextLessonInLevel,
  listLessonsInLevel,
} from "@/lib/tutorials/registry"
import { buildLessonNav, toLeanLevel } from "@/lib/tutorials/level-path"
import { trackPath } from "@/lib/tutorials/lesson-routes"
import { LessonPlayer } from "@/components/tutorials/LessonPlayer"

type Props = { params: Promise<{ levelSlug: string; lessonId: string }> }

/**
 * The Lesson Workspace route (Server Component) — resolves the single lesson from the URL and
 * computes navigation server-side (reusing the same registry `next`/`firstOfNext` helpers so the
 * Python nav behavior is preserved exactly), then hands the client player only a lean level + the
 * resolved nav so no other lesson's exercise payloads ship to the client.
 *
 * ## Why this is a separate route from the page above it
 *
 * The parent `/learn/python/{levelSlug}/{lessonId}` is public, static, and indexed. THIS route is
 * the graded half: it serializes the full authored lesson (starter code, hints, reference solution,
 * test cases) into the client payload, which is fine for a signed-in learner and unacceptable in a
 * CDN cache or a search index. Hence the two route-segment configs below, which are load-bearing:
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

export default async function PythonLessonWorkspacePage({ params }: Props) {
  const { lessonId } = await params
  const location = getLessonLocation(lessonId)

  if (!location) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-lg font-medium">Lesson not found</p>
        <p className="text-muted-foreground mt-1 text-sm">
          This lesson may have been moved or renamed.
        </p>
        <Link
          href={trackPath("python")}
          className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Python Path
        </Link>
      </div>
    )
  }

  const { level, lesson } = location

  // Reuse the registry's `next`/`firstOfNext` helpers so the current Python nav semantics (including
  // the separately-tracked routing quirk) are preserved unchanged — this only moves them server-side.
  const nav = buildLessonNav({
    level,
    lessonId: lesson.id,
    lessonsInLevel: listLessonsInLevel(level),
    nextInLevel: getNextLessonInLevel(lesson.id),
    firstOfNextLevel: getFirstLessonOfNextLevel(lesson.id),
  })

  // The workspace is a full-height 3-column tool that owns its own top bar (§C). `key={lesson.id}`
  // forces a fresh player instance per lesson so navigating between lessons never carries over the
  // previous lesson's open phase, resume flag, or runner results (which are local component state,
  // not in the store).
  return <LessonPlayer key={lesson.id} lesson={lesson} level={toLeanLevel(level)} nav={nav} />
}
