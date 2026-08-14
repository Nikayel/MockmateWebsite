"use client"

import React from "react"

interface GridBackgroundProps {
  className?: string
}

/**
 * GridBackground — the ambient surface behind the /careers and /docs heroes.
 *
 * Theme-aware. It used to paint `from-black via-gray-950 to-black` unconditionally
 * while the pages above it drew their copy with `text-foreground`, so in light mode
 * near-black text landed on a black wash and the whole page went unreadable. Every
 * layer now resolves through the design tokens, with `dark:` overrides pinning the
 * dark treatment to exactly what it was before.
 *
 * The grid and noise are deliberately near-threshold: they exist to break up a flat
 * surface, not to be seen. Light mode needs a *darker* line at a *higher* alpha to
 * read at the same strength a white line does on black, which is why the two themes
 * carry different values rather than one shared rgba.
 */
export function GridBackground({ className = "" }: GridBackgroundProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Base wash — warm neutral in light, the original black ramp in dark. */}
      <div className="from-background via-card to-background absolute inset-0 bg-gradient-to-b dark:from-black dark:via-gray-950 dark:to-black" />

      {/* Subtle grid pattern. Light draws ink lines, dark draws light lines. */}
      <div className="absolute inset-0 [background-image:linear-gradient(rgba(38,36,31,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(38,36,31,0.5)_1px,transparent_1px)] [background-size:60px_60px] opacity-[0.06] dark:[background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] dark:opacity-[0.03]" />

      {/* Accent glow - top */}
      <div className="bg-accent/[0.07] dark:bg-accent/[0.04] absolute top-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full blur-[120px]" />

      {/* Accent glow - bottom left */}
      <div className="bg-neural/[0.06] dark:bg-neural/[0.03] absolute bottom-0 left-0 h-[300px] w-[500px] rounded-full blur-[100px]" />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

export default GridBackground
