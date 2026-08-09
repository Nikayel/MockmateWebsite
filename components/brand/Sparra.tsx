import type { AnimationEventHandler, CSSProperties } from "react"
import { cn } from "@/lib/utils"

/**
 * Sparra — the CodeSparring character mark.
 *
 * Server-safe inline SVG. Pass `state` to animate (motion lives in
 * components/brand/sparra.css, disabled under prefers-reduced-motion);
 * omit it for a static mark (nav, footer, favicons).
 *
 * Brand rules (design/brand/README.md): one Sparra on screen at a time,
 * reactions are one-shot (see useSparraReaction), scoring is determinate
 * and never completes before the result lands.
 */
export type SparraState = "idle" | "thinking" | "scoring" | "pass" | "fail" | "streak"

interface SparraProps {
  /** Animated state. Omit for a static default-face mark. */
  state?: SparraState
  /** Rendered size in px. */
  size?: number
  /** Accessible name. Omit when purely decorative (aria-hidden). */
  label?: string
  className?: string
  /** Scoring only: match to the real p95 of the wait this fronts. */
  scoreDurationMs?: number
  /** Fires for the one-shot pass/fail wrapper animations. */
  onAnimationEnd?: AnimationEventHandler<HTMLSpanElement>
}

const CHIP = { width: 64, height: 64, rx: 17 }
const FACE_TRANSFORM = "translate(10.88 10.88) scale(0.66)"

/** Ring circumference for the scoring variant (2π·33, per brand asset). */
const SCORE_RING_LENGTH = 207

function EmberGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#ffb347" />
      <stop offset=".55" stopColor="#ff8a3d" />
      <stop offset="1" stopColor="#e0552a" />
    </linearGradient>
  )
}

function DuoGradient({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  )
}

/** Default face: bracket eyes + grin. Blink groups are driven by sparra.css in idle. */
function DefaultFace() {
  return (
    <g
      transform={FACE_TRANSFORM}
      stroke="#2a1206"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <g className="sparra-eyes-open">
        <path d="M20 24 14 32 20 40" strokeWidth="6" />
        <path d="M44 24 50 32 44 40" strokeWidth="6" />
      </g>
      <g className="sparra-eyes-shut" opacity="0">
        <path d="M14 32 21 32" strokeWidth="6" />
        <path d="M43 32 50 32" strokeWidth="6" />
      </g>
      <path d="M27 44Q32 49 37 44" strokeWidth="5" />
    </g>
  )
}

function ThinkingFace() {
  return (
    <g transform={FACE_TRANSFORM}>
      <circle cx="21" cy="31" r="4.5" fill="#2f1c02" />
      <circle cx="43" cy="31" r="4.5" fill="#2f1c02" />
      <path d="M25 45 39 45" stroke="#2f1c02" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <g>
        <circle className="sparra-dot" cx="24" cy="10" r="3" fill="#2f1c02" />
        <circle className="sparra-dot" cx="32" cy="10" r="3" fill="#2f1c02" />
        <circle className="sparra-dot" cx="40" cy="10" r="3" fill="#2f1c02" />
      </g>
    </g>
  )
}

function PassFace() {
  return (
    <g
      transform={FACE_TRANSFORM}
      stroke="#06251a"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <path d="M14 31Q20 23 26 31" strokeWidth="6" />
      <path d="M38 31Q44 23 50 31" strokeWidth="6" />
      <path d="M24 43Q32 52 40 43" strokeWidth="5.5" />
    </g>
  )
}

function FailFace() {
  return (
    <g
      transform={FACE_TRANSFORM}
      stroke="#2b0b07"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <path d="M15 26 25 34M25 26 15 34" strokeWidth="5.5" />
      <path d="M39 26 49 34M49 26 39 34" strokeWidth="5.5" />
      <path d="M25 48Q32 41 39 48" strokeWidth="5.5" />
    </g>
  )
}

function StreakFace() {
  return (
    <g
      transform={FACE_TRANSFORM}
      stroke="#1c0b33"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <path d="M14 31 26 31" strokeWidth="5.5" />
      <path d="M38 31 50 31" strokeWidth="5.5" />
      <path d="M25 46Q32 51 39 46" strokeWidth="5.5" />
      <path
        className="sparra-flame"
        d="M32 6 34.5 13 41.5 13 36 17.5 38 24.5 32 20 26 24.5 28 17.5 22.5 13 29.5 13Z"
        fill="#1c0b33"
        stroke="none"
      />
    </g>
  )
}

const CHIP_VARIANTS: Record<
  Exclude<SparraState, "scoring"> | "default",
  { gradientId: string; gradient: React.ReactNode; face: React.ReactNode }
> = {
  default: {
    gradientId: "sparra-g-ember",
    gradient: <EmberGradient id="sparra-g-ember" />,
    face: <DefaultFace />,
  },
  idle: {
    gradientId: "sparra-g-ember",
    gradient: <EmberGradient id="sparra-g-ember" />,
    face: <DefaultFace />,
  },
  thinking: {
    gradientId: "sparra-g-think",
    gradient: <DuoGradient id="sparra-g-think" from="#ffd27a" to="#e09a2a" />,
    face: <ThinkingFace />,
  },
  pass: {
    gradientId: "sparra-g-pass",
    gradient: <DuoGradient id="sparra-g-pass" from="#7dd6a8" to="#2f9f6d" />,
    face: <PassFace />,
  },
  fail: {
    gradientId: "sparra-g-fail",
    gradient: <DuoGradient id="sparra-g-fail" from="#f0998a" to="#c9483a" />,
    face: <FailFace />,
  },
  streak: {
    gradientId: "sparra-g-streak",
    gradient: <DuoGradient id="sparra-g-streak" from="#c3a4f0" to="#7b4fc9" />,
    face: <StreakFace />,
  },
}

/** Scoring variant: determinate ring around an inset chip with scanning eyes. */
function ScoringSvg({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width={size} height={size}>
      <defs>
        <DuoGradient id="sparra-g-score" from="#8ab4f0" to="#3b6fc9" />
      </defs>
      <g transform="rotate(-90 36 36)">
        <circle cx="36" cy="36" r="33" fill="none" stroke="rgba(59,111,201,.22)" strokeWidth="4" />
        <circle
          className="sparra-ring"
          cx="36"
          cy="36"
          r="33"
          fill="none"
          stroke="#8ab4f0"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={SCORE_RING_LENGTH}
          strokeDashoffset={SCORE_RING_LENGTH}
        />
      </g>
      <rect x="12" y="12" width="48" height="48" rx="13" fill="url(#sparra-g-score)" />
      <g transform="translate(20.16 20.16) scale(0.4875)" fill="#07162e">
        <g className="sparra-eyes">
          <circle cx="21" cy="30" r="4.5" />
          <circle cx="43" cy="30" r="4.5" />
        </g>
        <path
          d="M24 45 40 45"
          stroke="#07162e"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  )
}

export function Sparra({
  state,
  size = 64,
  label,
  className,
  scoreDurationMs = 10000,
  onAnimationEnd,
}: SparraProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const }

  const style =
    state === "scoring"
      ? ({ "--sparra-score-duration": `${scoreDurationMs}ms` } as CSSProperties)
      : undefined

  const variant = CHIP_VARIANTS[state === "scoring" ? "default" : (state ?? "default")]

  return (
    <span
      className={cn("sparra", className)}
      data-state={state}
      style={style}
      onAnimationEnd={onAnimationEnd}
      {...a11y}
    >
      {state === "scoring" ? (
        <ScoringSvg size={size} />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
          <defs>{variant.gradient}</defs>
          <rect
            width={CHIP.width}
            height={CHIP.height}
            rx={CHIP.rx}
            fill={`url(#${variant.gradientId})`}
          />
          {variant.face}
        </svg>
      )}
    </span>
  )
}

export default Sparra
