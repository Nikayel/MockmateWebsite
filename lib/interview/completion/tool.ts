import { tool } from "@langchain/core/tools"
import { convertToOpenAITool } from "@langchain/core/utils/function_calling"
import { z } from "zod"
import type { ModelToolCall } from "@/lib/ai/model-tools"
import type { ChatRequestContext } from "../chat/request-context"
import { candidateMessageText } from "../reactions/eligibility"
import type { InterviewCompletionAction } from "./contract"

const inputSchema = z.object({}).strict()
const endInterview = tool((): InterviewCompletionAction => ({ type: "end_interview" }), {
  name: "end_interview",
  description:
    "Finish the post-submit debrief and open the candidate's score and feedback. Call when the candidate asks to end the interview, asks to see or find their full interview score/results, or says they have no more questions in response to the final invitation. Do not call for a technical answer, a request to continue, or a refusal of a particular hint or optimization. This completes the interview; do not ask them to find a button.",
  schema: inputSchema,
})

function canCompleteInterview(request: ChatRequestContext): boolean {
  return (
    request.role === "interviewer" &&
    request.isPostInterview === true &&
    request.hasSubmitted === true &&
    !request.isProactive &&
    !request.isWrapUp &&
    Boolean(candidateMessageText(request).trim())
  )
}

export function getInterviewCompletionTools(request: ChatRequestContext) {
  return canCompleteInterview(request) ? [convertToOpenAITool(endInterview)] : []
}

export async function executeInterviewCompletion(
  calls: ModelToolCall[] | undefined,
  request: ChatRequestContext
): Promise<InterviewCompletionAction | undefined> {
  if (!canCompleteInterview(request)) return undefined
  if (
    !calls?.some(
      (call) => call.name === endInterview.name && inputSchema.safeParse(call.args).success
    )
  )
    return undefined
  return endInterview.invoke({})
}

export const INTERVIEW_COMPLETION_GUIDANCE = `
INTERVIEW COMPLETION: The end_interview tool finishes the debrief and opens scoring. Use it when the candidate asks to end, asks where to find or see their score/results, or declines further questions after your final invitation (for example, "No nothing to add"). Read their message in context: a technical trade-off explanation, declining one optimization, or "no, I still have a question" is not consent to finish. Do not end while a substantive question is pending. Never tell them to look for, click, or scroll to a score button. Do not claim to end the session without calling the tool. The application supplies your closing acknowledgment after a successful call.`
