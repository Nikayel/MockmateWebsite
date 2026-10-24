import type { SessionDetail } from "../session-rows"
import type { SessionConversation } from "./conversation"
import type { SessionWork } from "./work"

export interface SessionInspection {
  session: SessionDetail
  conversations: SessionConversation[]
  work: SessionWork
}
