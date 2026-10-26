import { tool } from "@langchain/core/tools"
import { convertToOpenAITool } from "@langchain/core/utils/function_calling"
import { z } from "zod"
import type { ModelToolCall } from "@/lib/ai/model-tools"
import { canOfferInterviewerReaction } from "./eligibility"
import type { ChatRequestContext } from "../chat/request-context"

const inputSchema = z.object({}).strict()
const acknowledgeMessage = tool(() => "acknowledged" as const, {
  name: "acknowledge_message",
  description:
    "Acknowledge the candidate's entire message with a small receipt reaction and no text reply. Use only for a brief social acknowledgment, dismissal of help, or intent to go work independently. Never for a question, findings, a technical claim, code explanation, test results, session controls, distress, or acceptance of an offered hint or explanation. This does not approve correctness or advance the interview.",
  schema: inputSchema,
})

export function getInterviewerReactionTools(request: ChatRequestContext) {
  return canOfferInterviewerReaction(request) ? [convertToOpenAITool(acknowledgeMessage)] : []
}

export async function executeInterviewerReaction(
  calls: ModelToolCall[] | undefined,
  request: ChatRequestContext
) {
  if (!canOfferInterviewerReaction(request)) return undefined
  if (
    !calls?.some(
      (call) => call.name === acknowledgeMessage.name && inputSchema.safeParse(call.args).success
    )
  )
    return undefined
  return acknowledgeMessage.invoke({})
}

export const INTERVIEWER_REACTION_GUIDANCE = `
CONVERSATION RECEIPTS: For a brief acknowledgment ("sure"), dismissal ("no thanks"), or request to go work independently, use acknowledge_message when available and provide no text reply. Do not repeat the task, say "take your time", ask a follow-up, or reopen Sparra. This reaction means receipt, never correctness. Read the entire message and preceding interviewer turn: questions, requests for help, technical claims, findings, test results, submissions, and agreements accepting an offered hint/explanation require the normal conversation flow. If no reaction tool is available, answer as briefly as the situation allows. Never print tool names or reaction JSON as dialogue.`
