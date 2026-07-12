import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  getFirstLessonOfNextSystemDesignLevel,
  getNextSystemDesignLessonInLevel,
  getSystemDesignLessonLocation,
  listSystemDesignLessonsInLevel,
} from "@/lib/tutorials/system-design/registry"
import { buildLessonNav, toLeanLevel } from "@/lib/tutorials/level-path"
import { SystemDesignLessonPlayer } from "@/components/tutorials/SystemDesignLessonPlayer"

type Props = { params: Promise<{ levelSlug: string; lessonId: string }> }

/**
 * The System-Design Lesson Player route (Server Component) — resolves the single lesson from the URL
 * and computes next-lesson / level-boundary navigation server-side, then hands the client player only
 * a lean level + the resolved nav (no other lesson's model answers ship to the client). Auth is
 * hard-gated by `proxy.ts` (PROTECTED_ROUTES → "/learn/system-design") plus the in-page
 * `LearnAuthGuard` in the layout, and the Read → Design loop runs entirely in the client player.
 */
export default async function SystemDesignLessonPage({ params }: Props) {
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
          href="/learn/system-design"
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
