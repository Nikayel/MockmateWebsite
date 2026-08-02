import type { ReactNode } from "react"

/**
 * Shared layout for the SQL track. Deliberately a pass-through: `/learn/sql`, each level
 * index, and each lesson's public reading page are all PUBLIC and indexable, so nothing here may
 * gate rendering.
 *
 * The auth gate moved down to `[levelSlug]/[lessonId]/workspace/layout.tsx`, which wraps the only
 * part of this track that requires an account. If you are about to add a `LearnAuthGuard` back here,
 * you would be un-publishing the entire course: this layout wraps the statically generated pages,
 * and a guard makes them render as "Loading…" for every visitor and every crawler.
 */
export default function LearnSqlLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
