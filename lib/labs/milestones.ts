/**
 * Shared milestone presentation metadata.
 *
 * A loaded `CaseLab` supplies its own per-milestone `title`/`purpose`; this is
 * the fallback used by the rail and stations before a lab is loaded, and the
 * single source of truth for default milestone copy (keeps the rail and the
 * station switcher in sync).
 */

import type { MilestoneKind } from "./types"

export interface MilestoneMeta {
  title: string
  purpose: string
}

export const DEFAULT_MILESTONE_META: Record<MilestoneKind, MilestoneMeta> = {
  clarify: { title: "Clarify", purpose: "Surface the ambiguity before building." },
  decompose: { title: "Decompose", purpose: "Break the system into its parts." },
  design: { title: "Design", purpose: "Commit to a contract and defend tradeoffs." },
  build: { title: "Build", purpose: "Work inside the real codebase." },
  review: { title: "Review", purpose: "Turn the work into a score and next step." },
}
