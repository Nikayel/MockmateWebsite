"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getSqlLessonLocation } from "@/lib/tutorials/sql/registry"
import { SqlLessonPlayer } from "@/components/tutorials/SqlLessonPlayer"

/**
 * The SQL Lesson Player route (client) — resolves the lesson from the URL and runs the
 * Read → Apply → Practice loop. Auth is hard-gated by `proxy.ts` (PROTECTED_ROUTES → "/learn/sql")
 * plus the in-page `LearnAuthGuard` in the layout.
 */
export default function SqlLessonPage() {
  const params = useParams<{ levelSlug: string; lessonId: string }>()
  const lessonId = params?.lessonId ?? ""
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

  return <SqlLessonPlayer lesson={lesson} level={level} />
}
