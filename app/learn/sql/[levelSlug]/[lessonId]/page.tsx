import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  getFirstLessonOfNextSqlLevel,
  getNextSqlLessonInLevel,
  getSqlLessonLocation,
  listSqlLessonsInLevel,
} from "@/lib/tutorials/sql/registry"
import { buildLessonNav, toLeanLevel } from "@/lib/tutorials/level-path"
import { SqlLessonPlayer } from "@/components/tutorials/SqlLessonPlayer"

type Props = { params: Promise<{ levelSlug: string; lessonId: string }> }

/**
 * The SQL Lesson Player route (Server Component) — resolves the single lesson from the URL and
 * computes next-lesson / level-boundary navigation server-side (preserving the "Level N complete"
 * hand-off), then hands the client player only a lean level + the resolved nav so no other lesson's
 * exercise payloads ship to the client. Auth is hard-gated by `proxy.ts` (PROTECTED_ROUTES →
 * "/learn/sql") plus the in-page `LearnAuthGuard` in the layout, and the Read → Apply → Practice loop
 * runs entirely in the client player.
 */
export default async function SqlLessonPage({ params }: Props) {
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
          href="/learn/sql"
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
