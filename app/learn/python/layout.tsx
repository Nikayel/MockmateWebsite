import type { ReactNode } from "react"
import { LearnAuthGuard } from "@/components/tutorials/LearnAuthGuard"

/**
 * Shared layout for the Python tutorial. The hard auth gate lives in two layers: the Edge proxy
 * (`proxy.ts` PROTECTED_ROUTES) redirects signed-out users before render, and `LearnAuthGuard`
 * is the in-page defense-in-depth.
 */
export default function LearnPythonLayout({ children }: { children: ReactNode }) {
  return <LearnAuthGuard>{children}</LearnAuthGuard>
}
