"use client"

import dynamic from "next/dynamic"

/**
 * Client-only, code-split wrapper around {@link MemoryBrain}.
 *
 * `MemoryBrain` pulls in the full three.js runtime (~513 KB). It is a purely
 * decorative right-column visual on /why-codesparring, so we load it via
 * `next/dynamic` with `ssr: false` to keep three.js out of the initial bundle
 * for that page. No `loading` placeholder is provided on purpose: the brain sits
 * inside a fixed-aspect, radial-masked panel, so a deferred mount causes no
 * layout shift.
 *
 * All theme-recolor, prefers-reduced-motion, and renderer-disposal logic lives
 * inside MemoryBrain's effect and is unaffected by the dynamic import.
 */
export const DynamicMemoryBrain = dynamic(
  () => import("@/components/three/MemoryBrain").then((m) => m.MemoryBrain),
  { ssr: false },
)
