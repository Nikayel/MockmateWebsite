import type { ReactNode } from "react"
import { LearnAuthGuard } from "@/components/tutorials/LearnAuthGuard"

/**
 * Shared layout for the System-Design tutorial. The hard auth gate lives in two layers: the Edge
 * proxy (`proxy.ts` PROTECTED_ROUTES → "/learn/system-design") redirects signed-out users before
 * render, and `LearnAuthGuard` is the in-page defense-in-depth. Progress + saved answers require a
 * real user; there is no code execution here (free-response only).
 */
export default function LearnSystemDesignLayout({ children }: { children: ReactNode }) {
  return <LearnAuthGuard>{children}</LearnAuthGuard>
}
