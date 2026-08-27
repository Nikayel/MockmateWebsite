/**
 * Server-only orchestration around the pure `resolvePartnerMode` (PLAN.md
 * Task 14): loads the sealed `author_brief.yaml` for a review-only ticket.
 *
 * Kept OUT of modes.ts on purpose. `loadSealedTicket`
 * (lib/scenarios/sealed/sprint-labs/registry.server.ts) throws at MODULE
 * LOAD time if evaluated in a browser, so anything that imports it
 * transitively becomes unsafe for a client component to import even once,
 * for even one unrelated symbol. `modes.ts` must stay importable from
 * PartnerChat.tsx for `PartnerMode`'s type alone; this file is the one that
 * actually reaches into the sealed bundle, and its `.server.ts` name
 * matches the convention every other sealed-content file in this system
 * already uses (DEMO-101.server.ts, registry.server.ts) to flag it as
 * unsafe for the client.
 *
 * This is the file added to lib/sprint-labs/__tests__/sealing.test.ts's
 * ALLOWED_IMPORTERS for the chat surface, mirroring how
 * lib/sprint-labs/grading/attempts-service.ts is the sole importer for the
 * attempts surface -- the thin route never imports `loadSealedTicket`
 * directly.
 */

import { loadSealedTicket } from "@/lib/scenarios/sealed/sprint-labs/registry.server"
import type { TicketPublic } from "@/lib/sprint-labs/types"
import { resolvePartnerMode, type PartnerMode, type PartnerSlot } from "./modes"

/**
 * Resolves one ticket's real `ai_policy` (server-derived, never
 * client-claimed) into a `PartnerMode`, loading the sealed author_brief only
 * when the policy actually needs it (review-only) -- an assisted or
 * unassisted ticket never touches the sealed registry at all.
 */
export async function resolvePartnerModeForTicket(
  workbookId: string,
  ticket: Pick<TicketPublic, "aiPolicy" | "aiPolicyReason">,
  slot: PartnerSlot,
  filesContext: string | undefined,
  ticketKey: string
): Promise<PartnerMode> {
  let authorBrief = null
  if (ticket.aiPolicy === "review-only") {
    const sealed = await loadSealedTicket(workbookId, ticketKey)
    authorBrief = sealed?.authorBrief ?? null
  }

  return resolvePartnerMode(ticket.aiPolicy, slot, {
    aiPolicyReason: ticket.aiPolicyReason,
    authorBrief,
    filesContext,
  })
}
