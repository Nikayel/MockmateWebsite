"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getSystemDesignLessonLocation } from "@/lib/tutorials/system-design/registry"
import { SystemDesignLessonPlayer } from "@/components/tutorials/SystemDesignLessonPlayer"

/**
 * The System-Design Lesson Player route (client) — resolves the lesson from the URL and runs the
 * Read → Design loop. Auth is hard-gated by `proxy.ts` (PROTECTED_ROUTES → "/learn/system-design")
 * plus the in-page `LearnAuthGuard` in the layout.
 */
export default function SystemDesignLessonPage() {
  const params = useParams<{ levelSlug: string; lessonId: string }>()
  const lessonId = params?.lessonId ?? ""
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

  // `key={lesson.id}` forces a fresh player instance per lesson so navigating between lessons never
  // carries over the previous lesson's open phase, resume flag, or answer text (local component state).
  return <SystemDesignLessonPlayer key={lesson.id} lesson={lesson} level={level} />
}
