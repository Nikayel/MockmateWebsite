import { tool } from "@langchain/core/tools"
import { convertToOpenAITool } from "@langchain/core/utils/function_calling"
import { z } from "zod"
import type { ModelToolCall } from "@/lib/ai/model-tools"
import type { ChatRequestContext } from "../chat/request-context"
import { candidateMessageText } from "../reactions/eligibility"
import type { InterviewCompletionAction } from "./contract"
import { requestsInterviewCompletion } from "./intent"

const inputSchema = z.object({}).strict()
const endInterview = tool((): InterviewCompletionAction => ({ type: "end_interview" }), {
  name: "end_interview",
  description:
    "Finish the post-submit debrief and open the candidate's score and feedback only on their explicit request to finish, help closing the interview, or help finding/opening their score. Technical answers, confusion about the problem, and saying they have no more questions do not authorize closing. The candidate normally chooses View feedback themselves.",
  schema: inputSchema,
})

function canCompleteInterview(request: ChatRequestContext): boolean {
  return (
    request.role === "interviewer" &&
    request.isPostInterview === true &&
    request.hasSubmitted === true &&
    !request.isProactive &&
    !request.isWrapUp &&
    requestsInterviewCompletion(candidateMessageText(request))
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
INTERVIEW COMPLETION: The candidate controls when to open scoring, normally through View feedback. The end_interview tool is an alternative only when their current message explicitly asks to finish, asks how to close the interview, or asks to find/open their score/results. A technical answer, confusion about the problem, or "no more questions" does not authorize closing. Never infer consent from passing tests, a completed answer, elapsed time, or an earlier message. If intent is unclear, leave the interview open and mention View feedback if useful. Do not claim to end the session without calling the tool. The application supplies your closing acknowledgment after a successful call.`
