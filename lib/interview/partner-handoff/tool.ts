import { tool } from "@langchain/core/tools"
import { convertToOpenAITool } from "@langchain/core/utils/function_calling"
import { z } from "zod"
import type { ModelToolCall } from "@/lib/ai/model-tools"
import type { ChatRequestContext } from "../chat/request-context"
import { hasSparraPartner, type PartnerHandoffAction } from "./contract"

const inputSchema = z.object({}).strict()
const openSparra = tool((): PartnerHandoffAction => ({ type: "open_sparra" }), {
  name: "open_sparra",
  description:
    "Open Sparra, the candidate's AI partner, for requested code walkthroughs, sample-input traces, explanations of functions, or implementation help. Stay with the interviewer for requirements, constraints, evaluation, brief clarifications, or progress updates. Do not call if the candidate declines Sparra or wants to continue here.",
  schema: inputSchema,
})

export function canOfferPartnerHandoff(request: ChatRequestContext): boolean {
  const scenarioType = request.sessionContext?.task.type ?? request.scenarioType
  return (
    process.env.INTERVIEW_PARTNER_HANDOFF_ENABLED !== "false" &&
    request.role === "interviewer" &&
    request.partnerAvailable === true &&
    hasSparraPartner(scenarioType) &&
    !request.isProactive &&
    !request.isWrapUp &&
    !request.isPostInterview &&
    !request.hasSubmitted
  )
}

export function getPartnerHandoffTools(request: ChatRequestContext) {
  return canOfferPartnerHandoff(request) ? [convertToOpenAITool(openSparra)] : undefined
}

export const PARTNER_HANDOFF_GUIDANCE = `
SPARRA HANDOFF: Sparra is available in this session. For requests to walk through repository code, trace sample input, or teach implementation details, call open_sparra instead of doing the walkthrough yourself. The tool opens the Sparra tab and prepares the candidate's question for them to send. Requirements and task clarifications remain your job. Brief answers (such as whether values is a list) can stay here. Respect requests to remain with you; never repeatedly redirect a candidate who declines. Do not claim to open a tab without calling the tool. The application supplies your acknowledgment after a successful call.`

export async function executePartnerHandoff(
  calls: ModelToolCall[] | undefined,
  request: ChatRequestContext
): Promise<PartnerHandoffAction | undefined> {
  if (!canOfferPartnerHandoff(request)) return undefined
  const call = calls?.find(
    (candidate) =>
      candidate.name === openSparra.name && inputSchema.safeParse(candidate.args).success
  )
  if (!call) return undefined
  return openSparra.invoke({})
}
