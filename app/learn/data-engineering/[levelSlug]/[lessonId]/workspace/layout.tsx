import type { ReactNode } from "react"
import { LearnAuthGuard } from "@/components/tutorials/LearnAuthGuard"

/**
 * The auth gate for the Data Engineering lesson workspace, and the ONLY auth gate under `/learn/data-engineering`.
 *
 * It sits here rather than on the track layout on purpose. Everything above this folder (the track
 * landing, each level index, and the public lesson reading page) is now public and statically
 * generated; guarding the track layout would make every one of those pages server-render as the
 * literal string "Loading…" for signed-out visitors and crawlers, which is what the previous
 * arrangement did.
 *
 * Two layers, as before: `proxy.ts` bounces an obviously-anonymous request before render (matched by
 * `isLessonWorkspacePath`, so the gate and the link builder read from one definition), and this
 * guard is the in-page defense-in-depth. Execution stays free and quota-free (client-side sql.js); the account is what gives progress somewhere to live.
 */
export default function SqlLessonWorkspaceLayout({ children }: { children: ReactNode }) {
  return <LearnAuthGuard>{children}</LearnAuthGuard>
}
