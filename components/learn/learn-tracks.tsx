/**
 * The Learn hub's single source of truth: one entry per learning track, with the
 * brand mark each track is recognised by.
 *
 * Header (desktop + mobile), the Learn picker window, and /learn all render from
 * this list, so a new track shows up on every surface at once and the three can
 * never drift apart.
 *
 * The marks are hand-authored inline SVG rather than an icon dependency: they
 * ship in the HTML (no extra request, no new package), and they inherit nothing
 * from the theme on purpose, because a brand colour is a brand colour in both
 * light and dark mode.
 */

type MarkProps = { className?: string }

/** Python's two interlocking snakes, in the official blue/yellow. */
function PythonMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <path
        fill="#3776AB"
        d="M49.5,2 C38,2 30,5 30,13 v10 h20 v3 H23 c-8,0 -15,5 -17,15 -2,11 -2,18 0,29 2,9 7,15 15,15 h8 V63 c0,-9 8,-17 17,-17 h19 c8,0 14,-6 14,-14 V13 c0,-7 -6,-11 -14,-11 z"
      />
      <circle cx="37" cy="13" r="4" fill="#ffffff" />
      <path
        fill="#FFD43B"
        d="M50.5,98 C62,98 70,95 70,87 v-10 h-20 v-3 h27 c8,0 15,-5 17,-15 2,-11 2,-18 0,-29 -2,-9 -7,-15 -15,-15 h-8 V37 c0,9 -8,17 -17,17 h-19 c-8,0 -14,6 -14,14 v19 c0,7 6,11 14,11 z"
      />
      <circle cx="63" cy="87" r="4" fill="#ffffff" />
    </svg>
  )
}

/**
 * Data engineering's pipeline mark: a source store on the left, a pipe carrying it down and
 * across, and the curated layers it lands in. Keeps the SQL track's blue family, because SQL is
 * still the first section of this course, but reads as movement rather than as one database.
 */
function DataEngineeringMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <path fill="#0369A1" d="M8,20 h36 v24 c0,4 -8,7 -18,7 S8,48 8,44 z" />
      <ellipse cx="26" cy="20" rx="18" ry="7" fill="#38BDF8" />
      <ellipse cx="26" cy="20" rx="11" ry="4" fill="#E0F2FE" opacity="0.55" />
      <path
        d="M26,51 v13 c0,6 4,10 10,10 h16"
        fill="none"
        stroke="#0284C7"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path fill="#0284C7" d="M52,66 l12,8 -12,8 z" />
      <rect x="70" y="58" width="24" height="9" rx="3" fill="#7DD3FC" />
      <rect x="70" y="70" width="24" height="9" rx="3" fill="#38BDF8" />
      <rect x="70" y="82" width="24" height="9" rx="3" fill="#0EA5E9" />
    </svg>
  )
}

/** System design's connected-services mark. */
function SystemDesignMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <g stroke="#6D28D9" strokeWidth="5" strokeLinecap="round">
        <line x1="50" y1="30" x2="24" y2="70" />
        <line x1="50" y1="30" x2="76" y2="70" />
        <line x1="24" y1="70" x2="76" y2="70" />
      </g>
      <rect x="34" y="10" width="32" height="24" rx="7" fill="#8B5CF6" />
      <rect x="8" y="58" width="32" height="24" rx="7" fill="#A78BFA" />
      <rect x="60" y="58" width="32" height="24" rx="7" fill="#C4B5FD" />
    </svg>
  )
}

export type LearnTrack = {
  id: string
  label: string
  href: string
  /** One line on what the track actually teaches, in the learner's words. */
  blurb: string
  /** The track's learning loop, shown as chips on the card. */
  loop: string[]
  Mark: (props: MarkProps) => React.JSX.Element
}

export const LEARN_TRACKS: LearnTrack[] = [
  {
    id: "python",
    label: "Python",
    href: "/learn/python",
    blurb:
      "The exact Python that intern and new-grad SWE and DE interviews test, run in your browser.",
    loop: ["Read", "Apply", "Practice"],
    Mark: PythonMark,
  },
  {
    id: "data-engineering",
    label: "Data Engineering",
    href: "/learn/data-engineering",
    blurb:
      "SQL, cloud platforms, and pipelines, all graded against a real database running in your browser.",
    loop: ["Read", "Apply", "Practice"],
    Mark: DataEngineeringMark,
  },
  {
    id: "system-design",
    label: "System Design",
    href: "/learn/system-design",
    blurb:
      "Read the concept, write your own design answer, then take a full timed round against an AI interviewer.",
    loop: ["Read", "Design", "Drill"],
    Mark: SystemDesignMark,
  },
]

/** True while the user is anywhere inside the Learn hub. */
export function isLearnPath(pathname: string): boolean {
  return pathname.startsWith("/learn")
}
