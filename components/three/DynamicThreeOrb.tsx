"use client"

import dynamic from "next/dynamic"

/**
 * Client-only, code-split wrapper around {@link ThreeOrb}.
 *
 * `ThreeOrb` pulls in the full three.js runtime (~513 KB). The orb is a purely
 * decorative, absolutely-positioned background, so we load it via `next/dynamic`
 * with `ssr: false` to keep three.js out of the initial bundle for the landing
 * hero and /rounds. No `loading` placeholder is provided on purpose: the orb is
 * a `-z-0`, `pointer-events-none` background layer, so a deferred mount causes
 * no layout shift.
 *
 * All theme-recolor, prefers-reduced-motion, and renderer-disposal logic lives
 * inside ThreeOrb's effect and is unaffected by the dynamic import; props are
 * forwarded unchanged.
 */
export const DynamicThreeOrb = dynamic(
  () => import("@/components/three/ThreeOrb").then((m) => m.ThreeOrb),
  { ssr: false },
)
