"use client"

import { useReducedMotion } from "framer-motion"
import { ReactLenis } from "lenis/react"

interface LenisProviderProps {
  children: React.ReactNode
}

/**
 * Smooth scroll provider for marketing pages only.
 * Must NOT be applied to /interview, /practice, /dashboard, or any route
 * that contains CodeMirror, scroll-area components, or resizable panels.
 * Disabled automatically when the user prefers reduced motion.
 */
export function LenisProvider({ children }: LenisProviderProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <>{children}</>
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
        // Prevent Lenis from interfering with touch devices that already feel native
        touchMultiplier: 1.5,
      }}
    >
      {children}
    </ReactLenis>
  )
}
