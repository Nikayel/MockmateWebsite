"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"

import type { OnboardingBeat, OnboardingConfig } from "@/lib/labs/onboarding/config"
import { markOnboardingSeen } from "@/lib/labs/onboarding/onboarding-state"

/**
 * The "you're hired" onboarding cinematic — one reusable overlay for every lab.
 *
 * Driven entirely by an `OnboardingConfig` (see `lib/labs/onboarding/config.ts`):
 * Meridian ships the full five-beat arc, a Case Lab ships a lighter one. The
 * overlay is a committed dark visual world — a different *place* from the app —
 * so it paints its own background and colours explicitly and does not follow the
 * app theme (artifact-design's single-theme allowance).
 *
 * It sits above the page (including its `<Header/>`) while it plays, and unmounts
 * on handoff, so the navbar and the real surface are right there the moment the
 * cinematic ends. Cognitive-load law: one beat, one focal point; the three.js
 * system map is the only 3D moment and is lazy-loaded so nothing heavy touches
 * first paint or the server.
 */

const SystemMap = dynamic(() => import("./SystemMap").then((m) => m.SystemMap), {
  ssr: false,
  loading: () => <div className="lab-onb-map-loading" aria-hidden />,
})

const OVERLAY_CSS = `
.lab-onb {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: #0B0E14;
  color: #E6E9EF;
  font-family: var(--font-geist, system-ui, sans-serif);
  overflow: hidden;
}
.lab-onb::before {
  /* A faint amber wash from below — the ambient backdrop, nothing to read. */
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 80% at 50% 118%, rgba(232, 161, 60, 0.13), transparent 60%);
  pointer-events: none;
}
.lab-onb-chapters {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  padding: 20px 16px 4px;
}
.lab-onb-chapter {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: #8A93A6;
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 5px 11px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.lab-onb-chapter:hover { color: #E6E9EF; border-color: rgba(255, 255, 255, 0.24); }
.lab-onb-chapter.is-active {
  color: #0B0E14;
  background: #E8A13C;
  border-color: #E8A13C;
}
.lab-onb-chapter:focus-visible { outline: 2px solid #E8A13C; outline-offset: 2px; }
.lab-onb-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
}
.lab-onb-beat {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}
.lab-onb-eyebrow {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #E8A13C;
}
.lab-onb-serif {
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.01em;
  text-wrap: balance;
}
.lab-onb-offer-lead { font-size: clamp(28px, 5vw, 52px); }
.lab-onb-offer-sub { font-size: clamp(18px, 2.6vw, 26px); color: #E6E9EF; }
.lab-onb-heading { font-size: clamp(24px, 4vw, 40px); }
.lab-onb-line {
  font-size: clamp(15px, 2vw, 19px);
  line-height: 1.6;
  color: #C4CBD8;
  max-width: 56ch;
}
.lab-onb-pair-orb {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: radial-gradient(circle at 35% 30%, #f3c37e, #E8A13C 55%, #b9781f);
  box-shadow: 0 0 34px rgba(232, 161, 60, 0.5);
}
.lab-onb-map { width: 100%; display: flex; flex-direction: column; gap: 14px; align-items: center; }
.lab-onb-map-canvas {
  position: relative;
  width: 100%;
  height: min(46vh, 360px);
}
.lab-onb-map-loading { width: 100%; height: min(46vh, 360px); }
.lab-onb-map-tile-label {
  position: absolute;
  top: 0;
  left: 0;
  /* Above the WebGL canvas (z-index 0), or the tile reads as an empty box. */
  z-index: 2;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #E6E9EF;
  white-space: nowrap;
  pointer-events: none;
  /* Invisible until the render loop projects it onto its tile, so there's no first-frame pile in
     the top-left corner; the loop fades each label in as it's positioned. */
  opacity: 0;
  transition: opacity 0.3s, border-color 0.3s;
  /* A readable chip so the module name reads cleanly against the glow behind it. */
  padding: 3px 9px;
  border-radius: 7px;
  background: rgba(11, 14, 20, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
}
.lab-onb-map-caption {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: baseline;
  justify-content: center;
  min-height: 24px;
  font-size: 14px;
}
.lab-onb-map-caption-label { color: #E8A13C; font-weight: 600; }
.lab-onb-map-caption-role { color: #C4CBD8; }
.lab-onb-map-caption code,
.lab-onb-map-fallback code {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 12px;
  color: #8A93A6;
  background: rgba(255, 255, 255, 0.05);
  padding: 1px 6px;
  border-radius: 5px;
}
.lab-onb-map-fallback { width: 100%; max-width: 640px; }
.lab-onb-map-fallback ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.lab-onb-map-fallback li {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: #141922;
  text-align: left;
}
.lab-onb-map-fallback-label { font-weight: 600; color: #E6E9EF; }
.lab-onb-map-fallback-role { font-size: 13px; color: #8A93A6; }
.lab-onb-controls {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px 26px;
}
.lab-onb-skip {
  appearance: none;
  background: transparent;
  border: none;
  color: #8A93A6;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  padding: 8px 4px;
  transition: color 0.2s;
}
.lab-onb-skip:hover { color: #E6E9EF; }
.lab-onb-controls-right { display: flex; align-items: center; gap: 10px; }
.lab-onb-back {
  appearance: none;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #C4CBD8;
  font: inherit;
  font-size: 14px;
  padding: 9px 16px;
  border-radius: 999px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.lab-onb-back:hover { border-color: rgba(255, 255, 255, 0.32); color: #E6E9EF; }
.lab-onb-next {
  appearance: none;
  border: none;
  background: #E8A13C;
  color: #0B0E14;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 22px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.lab-onb-next:hover { background: #f0b45a; }
.lab-onb-next:active { transform: translateY(1px); }
.lab-onb-skip:focus-visible,
.lab-onb-back:focus-visible,
.lab-onb-next:focus-visible { outline: 2px solid #E8A13C; outline-offset: 2px; }
@media (max-width: 520px) {
  .lab-onb-chapter { font-size: 10px; padding: 4px 8px; }
}
`

function BeatContent({ beat }: { beat: OnboardingBeat }) {
  switch (beat.kind) {
    case "offer":
      return (
        <div className="lab-onb-beat">
          {beat.lines.map((line, i) => (
            <motion.p
              key={line}
              className={`lab-onb-serif ${i === 0 ? "lab-onb-offer-lead" : "lab-onb-offer-sub"}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.5, duration: 0.7 }}
            >
              {line}
            </motion.p>
          ))}
        </div>
      )
    case "company":
      return (
        <div className="lab-onb-beat">
          <h2 className="lab-onb-serif lab-onb-heading">{beat.heading}</h2>
          {beat.lines.map((line, i) => (
            <motion.p
              key={line}
              className="lab-onb-line"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.28, duration: 0.5 }}
            >
              {line}
            </motion.p>
          ))}
        </div>
      )
    case "system-map":
      return (
        <div className="lab-onb-beat">
          <h2 className="lab-onb-serif lab-onb-heading">{beat.heading}</h2>
          <SystemMap modules={beat.modules} />
        </div>
      )
    case "pair":
      return (
        <div className="lab-onb-beat">
          <div className="lab-onb-pair-orb" aria-hidden />
          <span className="lab-onb-eyebrow">{beat.partnerName}</span>
          {beat.lines.map((line, i) => (
            <motion.p
              key={line}
              className="lab-onb-line"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.28, duration: 0.5 }}
            >
              {line}
            </motion.p>
          ))}
        </div>
      )
    case "handoff":
      return (
        <div className="lab-onb-beat">
          <h2 className="lab-onb-serif lab-onb-heading">{beat.heading}</h2>
          <p className="lab-onb-line">{beat.body}</p>
        </div>
      )
  }
}

export function LabOnboarding({
  config,
  onDone,
}: {
  config: OnboardingConfig
  /** Called once the cinematic is finished or skipped; the overlay is done. */
  onDone: () => void
}) {
  const [beatIndex, setBeatIndex] = useState(0)
  const overlayRef = useRef<HTMLDivElement>(null)
  const beats = config.beats
  const isLast = beatIndex === beats.length - 1
  const beat = beats[beatIndex]

  const finish = useCallback(() => {
    markOnboardingSeen(config.id)
    onDone()
  }, [config.id, onDone])

  const next = useCallback(() => {
    setBeatIndex((i) => {
      if (i >= beats.length - 1) {
        finish()
        return i
      }
      return i + 1
    })
  }, [beats.length, finish])

  const back = useCallback(() => setBeatIndex((i) => Math.max(0, i - 1)), [])

  // Keyboard: forward on Enter/→, back on ←, skip on Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault()
        next()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        back()
      } else if (e.key === "Escape") {
        e.preventDefault()
        finish()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, back, finish])

  // Own the viewport while playing: no background scroll, and focus lands inside the overlay.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    overlayRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const finalCtaLabel = isLast && beat.kind === "handoff" ? beat.ctaLabel : "Next"

  return (
    <MotionConfig reducedMotion="user">
      <style>{OVERLAY_CSS}</style>
      <div
        ref={overlayRef}
        className="lab-onb"
        role="dialog"
        aria-modal="true"
        aria-label={`Welcome to ${config.company}`}
        tabIndex={-1}
      >
        <nav className="lab-onb-chapters" aria-label="Onboarding chapters">
          {beats.map((b, i) => (
            <button
              key={b.chapter}
              type="button"
              className={`lab-onb-chapter ${i === beatIndex ? "is-active" : ""}`}
              aria-current={i === beatIndex ? "step" : undefined}
              onClick={() => setBeatIndex(i)}
            >
              {b.chapter}
            </button>
          ))}
        </nav>

        <div className="lab-onb-stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={beatIndex}
              style={{ width: "100%", display: "flex", justifyContent: "center" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45 }}
            >
              <BeatContent beat={beat} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="lab-onb-controls">
          <button type="button" className="lab-onb-skip" onClick={finish}>
            Skip the tour
          </button>
          <div className="lab-onb-controls-right">
            {beatIndex > 0 && (
              <button type="button" className="lab-onb-back" onClick={back}>
                Back
              </button>
            )}
            <button type="button" className="lab-onb-next" onClick={next}>
              {finalCtaLabel}
            </button>
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}
