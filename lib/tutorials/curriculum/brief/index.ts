/**
 * Workspace briefs: the `README.md` a multi-file exercise ships as its work ticket.
 *
 * Curriculum files import from here, not from the two modules behind it, so the split between
 * identity (`ticket-registry`) and presentation (`build-brief`) stays an implementation detail.
 */
export { buildBrief, BRIEF_KINDS, HIDDEN_TESTS_NOTE } from "./build-brief"
export type { BriefInput, BriefKind } from "./build-brief"
export {
  TICKETS,
  TICKET_ID_PATTERN,
  ticketFor,
  nextTicketId,
  type BriefSlot,
  type TicketEntry,
} from "./ticket-registry"
