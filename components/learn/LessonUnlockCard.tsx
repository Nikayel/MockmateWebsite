"use client"

import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

import { useAuth } from "@/lib/auth-context"
import { lessonWorkspacePath } from "@/lib/tutorials/lesson-routes"
import type { CourseId } from "@/lib/tutorials/types"

/**
 * The honest sign-in wall at the foot of a public lesson page.
 *
 * ## Why it is written this way
 *
 * The card names what is behind the wall instead of hiding what is in front of it. There is no
 * blurred paragraph, no faded-out code block, no "read the rest" teaser: the entire lesson the page
 * promises is already above this card, in full. What sign-in buys is the interactive half (an editor
 * seeded with starter code, hints, the reference solution, automatic grading, saved progress and
 * spaced review), and that is exactly the list below. A visitor who reads it and leaves has still
 * had the whole lesson, which is the deal the public corpus is making.
 *
 * ## Why the auth swap cannot change the prerendered HTML
 *
 * The page around this card is statically generated and CDN-cached byte-identically for every
 * visitor. This component is the ONLY thing on it that depends on who is looking, and it resolves
 * that after hydration. Auth-initializing renders the signed-out variant rather than a spinner, so
 * the server HTML, the first paint, and the signed-out steady state are the same markup and nothing
 * shifts. Only the call to action swaps for a signed-in learner, so the box keeps its height.
 */
export interface LessonUnlockCardProps {
  courseId: CourseId
  levelSlug: string
  lessonId: string
  /** Used only in the accessible label, so screen-reader users hear which lesson opens. */
  lessonTitle: string
}

/** What a signed-in learner gets that a reader does not. Stated as capabilities, not as marketing. */
const UNLOCKS: readonly string[] = [
  "A code editor seeded with this lesson's starter code",
  "Hints when you get stuck, revealed one at a time",
  "Automatic grading against the lesson's checks",
  "The reference solution once you have had a real attempt",
  "Saved progress and spaced review so it actually sticks",
]

export function LessonUnlockCard({
  courseId,
  levelSlug,
  lessonId,
  lessonTitle,
}: LessonUnlockCardProps) {
  const { user, initialized } = useAuth()
  // Treat "still initializing" as signed out: see the module comment. This is deliberate, not a
  // missing loading state.
  const signedIn = initialized && Boolean(user)

  const workspaceHref = lessonWorkspacePath(courseId, levelSlug, lessonId)
  const href = signedIn ? workspaceHref : `/login?redirect=${encodeURIComponent(workspaceHref)}`

  return (
    <aside
      aria-labelledby="lesson-unlock-heading"
      className="border-accent/40 bg-accent/[0.06] mt-12 rounded-2xl border p-6 sm:p-7"
    >
      <h2
        id="lesson-unlock-heading"
        className="text-foreground text-lg font-semibold tracking-tight"
      >
        Run it, get graded, keep your progress
      </h2>
      <p className="text-muted-foreground mt-2 text-sm text-pretty">
        You have just read the whole lesson. The practice half runs in your browser, and it needs an
        account so your work has somewhere to live.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {UNLOCKS.map((unlock) => (
          <li key={unlock} className="text-foreground/90 flex items-start gap-2.5 text-sm">
            <Check className="text-accent-strong mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-pretty">{unlock}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link
          href={href}
          aria-label={
            signedIn
              ? `Open the workspace for ${lessonTitle}`
              : `Sign in to practice ${lessonTitle}`
          }
          className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 group inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {signedIn ? "Open the workspace" : "Sign in to practice this lesson"}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
        {/* Both variants render one line of the same size, so the post-hydration swap for a
            signed-in learner moves nothing below it. */}
        <p className="text-muted-foreground mt-3 text-xs">
          {signedIn
            ? "Your progress saves as you go, and the lesson comes back for review."
            : "Free to start. The courses do not cost anything to work through."}
        </p>
      </div>
    </aside>
  )
}
