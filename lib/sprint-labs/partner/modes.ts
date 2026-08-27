/**
 * Sable partner — mode resolver (docs/sprint-labs/AGENT-CONTEXT.md §6,
 * EXECUTION-STATE.md owner decision 4, PLAN.md Task 14).
 *
 * Enforced as CAPABILITY, never as prompt-side conscience: `PartnerMode` is a
 * typed union where the illegal combination has no representable slot,
 * mirroring lib/interview/topic-ledger.ts's `NextAction` (the leak-shaped
 * move is absent from the option set, not merely forbidden in prose). Here
 * the thing made unrepresentable is "a mode with no repo-read capability
 * that nonetheless carries file content": `filesContext` exists ONLY on
 * `{kind: "chat"}`, so `tutor-blind` and `none` cannot be constructed with
 * file content attached, and `resolvePartnerMode` is the one place that
 * decides whether to copy a caller-supplied `filesContext` onto the result.
 *
 * `PartnerSlot` exists because `ai_policy: "unassisted"` alone is
 * ambiguous between two real, distinct experiences documented side by side
 * in AGENT-CONTEXT.md §6's mode table: the ticket's own measurement
 * instrument (`unassisted` — no agent session at all, the default) and the
 * repo-blind "tutor" overlay (a DIFFERENT, always-available surface that
 * happens to take a repo-blind form specifically on unassisted tickets).
 * `slot` is what tells the resolver which of the two is being asked for;
 * it only changes the outcome for `unassisted` (see the `assisted`/
 * `review-only` branches below, where it is a no-op by design — v0 ships no
 * edit/bash tools, so a chat-only "tutor" adds nothing an assisted ticket's
 * plain chat does not already offer, and review-only's whole point is the
 * fixed author-agent persona regardless of which slot was asked for).
 *
 * This module is intentionally free of any import from the sealed
 * sprint-labs registry loader (see the sibling resolve-mode.server.ts,
 * which imports it) — that loader throws at MODULE LOAD time if evaluated
 * in a browser, so a client component (PartnerChat.tsx) that only needs
 * `PartnerMode`'s TYPE must be able to import this file without
 * transitively crashing. The async orchestration that actually loads a
 * sealed author_brief lives in resolve-mode.server.ts, not here.
 */

import type { AiPolicy } from "@/lib/sprint-labs/types"
import type { SealedAuthorBrief } from "@/lib/scenarios/sealed/sprint-labs/types"

/** Which partner surface is being requested. Only `unassisted` branches on it (see file header). */
export type PartnerSlot = "partner" | "tutor"

/**
 * The resolved capability for one chat turn. Each variant carries exactly
 * the context it is allowed to have — nothing more, by type.
 */
export type PartnerMode =
  | { kind: "chat"; filesContext: string }
  | { kind: "tutor-blind" }
  | { kind: "author-agent"; brief: SealedAuthorBrief }
  | { kind: "none"; reason: string }

export interface ResolvePartnerModeOptions {
  /** Used only for `aiPolicy === "unassisted"`, `slot === "partner"`: the ticket's in-fiction ai_policy_reason. */
  aiPolicyReason?: string
  /** Used only for `aiPolicy === "review-only"`: the sealed author_brief, or null/undefined if the ticket authored none. */
  authorBrief?: SealedAuthorBrief | null
  /**
   * Used only for `aiPolicy === "assisted"`: the already-rendered workspace
   * file context (see context-layers.ts's `renderWorkspaceFiles`). Silently
   * dropped for every other (policy, slot) pair — this IS the capability
   * gate; nothing downstream needs to re-check it.
   */
  filesContext?: string
}

const NO_REASON_FALLBACK =
  "There's no agent on this ticket. (No ai_policy_reason was authored for it yet — that's a content gap, not a deliberate silence.)"
const NO_BRIEF_FALLBACK =
  "This ticket's author briefing isn't ready yet, so there's no one to defend this PR from here."

/**
 * Pure. Resolves the ticket's real `ai_policy` (always server-derived from
 * the sealed/public ticket — NEVER a client-claimed value) plus which slot
 * was requested into exactly one `PartnerMode`.
 */
export function resolvePartnerMode(
  aiPolicy: AiPolicy,
  slot: PartnerSlot,
  opts: ResolvePartnerModeOptions = {}
): PartnerMode {
  if (aiPolicy === "review-only") {
    if (!opts.authorBrief) return { kind: "none", reason: NO_BRIEF_FALLBACK }
    return { kind: "author-agent", brief: opts.authorBrief }
  }

  if (aiPolicy === "unassisted") {
    if (slot === "tutor") return { kind: "tutor-blind" }
    return { kind: "none", reason: opts.aiPolicyReason?.trim() || NO_REASON_FALLBACK }
  }

  // assisted
  return { kind: "chat", filesContext: opts.filesContext ?? "" }
}
