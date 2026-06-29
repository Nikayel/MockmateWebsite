import { RoundsPageClient } from "@/components/rounds/RoundsPageClient"

/**
 * Rounds Page - Server Component
 *
 * Showcases the two interview rounds (Bug Fix + Case Lab) that previously lived
 * in the landing hero, now paired with a scroll-reactive 3D orb. The client
 * component handles the orb, scroll, and animations.
 */
export default function RoundsPage() {
  return <RoundsPageClient />
}
