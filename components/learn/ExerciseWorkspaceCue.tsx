"use client"

import Link from "next/link"
import { ArrowRight, SquareTerminal } from "lucide-react"

import { useAuth } from "@/lib/auth-context"
import { lessonWorkspacePath } from "@/lib/tutorials/lesson-routes"
import type { CourseId } from "@/lib/tutorials/types"

/**
 * The one-line cue under an Apply or Practice prompt saying the editor is on this site.
 *
 * ## The problem it fixes
 *
 * A public lesson page reads: here is the task, "3 hints and 1 automated check are waiting in the
 * workspace", and then nothing until a sign-in card 800 pixels further down. A reader who has just
 * finished reading a task they want to attempt has no idea, at that moment, that attempting it is
 * something this site does. The reasonable inference from a page that shows a SQL problem and no
 * editor is that you are expected to go and open your own, which is the moment the visit ends.
 *
 * `LessonUnlockCard` says the same thing properly, but it says it at the foot of the article. This
 * says it where the intent actually forms, which is directly under the prompt, and it stays a single
 * line so the article does not turn into an advert interrupting itself twice per page.
 *
 * ## Why it renders the same markup either way
 *
 * The article around it is statically generated and CDN-cached byte-identically for every visitor.
 * This resolves auth after hydration, and auth-initializing counts as signed out, so the server HTML,
 * the first paint and the signed-out steady state are identical markup. Only the label and the href
 * swap for a signed-in learner, and both labels are one line, so nothing reflows under the reader.
 * That constraint is inherited from `LessonUnlockCard` and is the reason neither component renders a
 * spinner.
 */
export interface ExerciseWorkspaceCueProps {
  courseId: CourseId
  levelSlug: string
  lessonId: string
  /** Screen-reader context, so the link is not a bare "solve it here" out of its section. */
  phaseLabel: string
}

export function ExerciseWorkspaceCue({
  courseId,
  levelSlug,
  lessonId,
  phaseLabel,
}: ExerciseWorkspaceCueProps) {
  const { user, initialized } = useAuth()
  const signedIn = initialized && Boolean(user)

  const workspaceHref = lessonWorkspacePath(courseId, levelSlug, lessonId)
  const href = signedIn ? workspaceHref : `/login?redirect=${encodeURIComponent(workspaceHref)}`

  return (
    <p className="mt-3 text-sm">
      <Link
        href={href}
        aria-label={
          signedIn
            ? `Open the editor for the ${phaseLabel} exercise`
            : `Sign in to solve the ${phaseLabel} exercise here`
        }
        className="text-accent-strong hover:text-accent-strong/80 focus-visible:ring-accent/50 group inline-flex items-center gap-1.5 rounded-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <SquareTerminal className="h-4 w-4 shrink-0" aria-hidden="true" />
        {signedIn ? "Open the editor and solve it here" : "Solve it here in your browser"}
        <ArrowRight
          className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>{" "}
      {/* Says what is true rather than what sells: the runtime is the browser, so there is genuinely
          nothing to install. Claiming "no setup" on a page whose editor needed a local toolchain
          would be the kind of promise a reader checks once and never trusts again. */}
      <span className="text-muted-foreground">
        Nothing to install, and your work saves as you go.
      </span>
    </p>
  )
}
