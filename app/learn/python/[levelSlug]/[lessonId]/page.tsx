"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getLessonLocation } from "@/lib/tutorials/registry"
import { LessonPlayer } from "@/components/tutorials/LessonPlayer"

/**
 * The Lesson Player route (client) — resolves the lesson from the URL and runs the
 * Read → Apply → Practice loop. Auth hard-gating is added in Slice C (PROTECTED_ROUTES +
 * an in-page redirect); progress persistence in Slice B.
 */
export default function LessonPage() {
  const params = useParams<{ levelSlug: string; lessonId: string }>()
  const lessonId = params?.lessonId ?? ""
  const location = getLessonLocation(lessonId)

  if (!location) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-lg font-medium">Lesson not found</p>
        <p className="text-muted-foreground mt-1 text-sm">
          This lesson may have been moved or renamed.
        </p>
        <Link
          href="/learn/python"
          className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Python Path
        </Link>
      </div>
    )
  }

  const { level, lesson } = location

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/learn/python/${level.slug}`}
          className="border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
        >
          LEVEL {level.id}
        </Link>
        <h1 className="text-xl font-semibold">{lesson.title}</h1>
        <Link
          href="/learn/python"
          className="text-muted-foreground hover:text-foreground ml-auto inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Levels
        </Link>
      </div>

      <LessonPlayer lesson={lesson} level={level} />
    </div>
  )
}
