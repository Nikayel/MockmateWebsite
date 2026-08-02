import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  getFirstLessonOfNextSystemDesignLevel,
  getNextSystemDesignLessonInLevel,
  getSystemDesignLessonLocation,
  listSystemDesignLessonsInLevel,
} from "@/lib/tutorials/system-design/registry"
import { buildLessonNav, toLeanLevel } from "@/lib/tutorials/level-path"
import { trackPath } from "@/lib/tutorials/lesson-routes"
import { SystemDesignLessonPlayer } from "@/components/tutorials/SystemDesignLessonPlayer"

type Props = { params: Promise<{ levelSlug: string; lessonId: string }> }

/**
 * The System-Design Lesson Workspace route (Server Component) — resolves the single lesson from the
 * URL and computes next-lesson / level-boundary navigation server-side, then hands the client player
 * only a lean level + the resolved nav. The Read → Design loop runs entirely in the client player.
 *
 * ## Why this is a separate route from the page above it
 *
 * The parent `/learn/system-design/{levelSlug}/{lessonId}` is public, static, and indexed. THIS
 * route is the graded half: it serializes the full authored lesson, including each exercise's
 * `modelAnswerOutline`, into the client payload. That is the point for a signed-in learner writing
 * a design answer and self-comparing, and it is exactly what must never reach a CDN cache or a
 * search index. Hence the two route-segment configs below, which are load-bearing:
 *
 *  - `dynamic = "force-dynamic"` keeps this response out of every cache. It must never be prerendered
 *    or shared between visitors.
 *  - `robots: { index: false, follow: false }` keeps the model answers out of search results. The
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

export default async function SystemDesignLessonWorkspacePage({ params }: Props) {
  const { lessonId } = await params
  const location = getSystemDesignLessonLocation(lessonId)

  if (!location) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-lg font-medium">Lesson not found</p>
        <p className="text-muted-foreground mt-1 text-sm">
          This lesson may have been moved or renamed.
        </p>
        <Link
          href={trackPath("system-design")}
          className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to System Design Path
        </Link>
      </div>
    )
  }

  const { level, lesson } = location

  // Resolve navigation server-side via the registry so its exact in-level ordering + the deliberate
  // level-boundary hand-off are preserved; the client player only renders what we compute here.
  const nav = buildLessonNav({
    level,
    lessonId: lesson.id,
    lessonsInLevel: listSystemDesignLessonsInLevel(level),
    nextInLevel: getNextSystemDesignLessonInLevel(lesson.id),
    firstOfNextLevel: getFirstLessonOfNextSystemDesignLevel(lesson.id),
  })

  // `key={lesson.id}` forces a fresh player instance per lesson so navigating between lessons never
  // carries over the previous lesson's open phase, resume flag, or answer text (local component state).
  return (
    <SystemDesignLessonPlayer
      key={lesson.id}
      lesson={lesson}
      level={toLeanLevel(level)}
      nav={nav}
    />
  )
}
