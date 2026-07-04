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

  // The workspace is a full-height 3-column tool that owns its own top bar (§C). `key={lesson.id}`
  // forces a fresh player instance per lesson so navigating between lessons never carries over the
  // previous lesson's open phase, resume flag, or runner results (which are local component state,
  // not in the store).
  return <LessonPlayer key={lesson.id} lesson={lesson} level={level} />
}
