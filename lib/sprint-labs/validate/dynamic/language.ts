/**
 * Picks which harness a ticket's tests replay through. No Sprint Labs ticket schema has a
 * per-ticket "test language" field (`lib/sprint-labs/types.ts`'s `TicketPublic` doesn't carry one;
 * `workbook.yaml` carries ONE `language` for the whole workbook) -- yet Meridian is a single
 * `language: typescript` workbook whose sprint 3 ("Tenants") is explicitly about Postgres/RLS
 * (WORKBOOK-SPEC.md §2). This function is the documented, minimal, additive resolution: a ticket
 * routes to SQL when the WHOLE workbook declares `language: sql`, OR the ticket's own `labels[]`
 * names `sql` -- otherwise TypeScript/JavaScript (`runTsWorkspace` handles both; `ts-transpiler`
 * strips no-op JS through the same path). No sprint-3-shaped ticket exists yet to confirm the
 * `labels` convention against real content (see sql-replay.ts's header for the fuller scope note);
 * flagged for whoever authors Meridian's sprint 3 (Tasks 17-20) to confirm or correct.
 */
import type { AuthoredTicket, AuthoredWorkbook } from "../tree"

export type TicketRunnerLanguage = "typescript" | "sql"

export function resolveTicketRunnerLanguage(
  workbook: AuthoredWorkbook,
  ticket: AuthoredTicket
): TicketRunnerLanguage {
  const workbookLanguage =
    typeof workbook.raw.language === "string" ? workbook.raw.language.toLowerCase() : null
  if (workbookLanguage === "sql") return "sql"
  if (ticket.labels.some((label) => label.toLowerCase() === "sql")) return "sql"
  return "typescript"
}
