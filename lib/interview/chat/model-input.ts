import { buildInterviewerPrompt } from "@/lib/interview/interviewer-prompts"
import {
  buildSessionBaselinePrompt,
  buildSessionEvidencePrompt,
} from "@/lib/interview/session-context/prompts"
import { timelineProviderHistory } from "@/lib/interview/session-context/conversation"
import { getInterviewerTurns } from "@/lib/interview/conversation-pacing"
import { buildProviderHistory } from "./context-builders"
import { buildChatPromptFlow, type ChatPromptFlowResult } from "./prompt-flow"
import { buildChatScenarioContext, type ChatScenarioOptions } from "./scenario-context"
import { buildChatInterviewerContext } from "./interviewer-context"
import { buildChatPartnerPrompt } from "./partner-prompt"
import { buildChatRetrievalContext } from "./retrieval-context"
import type { ChatInterviewState } from "./interview-state"
import type { ChatRequestContext } from "./request-context"
import type { ChatGenerationContext } from "./generation-context"

export interface ChatModelInput {
  systemPrompt: string
  history: ChatGenerationContext["history"]
  promptFlow: ChatPromptFlowResult
}

export async function buildChatModelInput(
  request: ChatRequestContext,
  state: ChatInterviewState,
  options: ChatScenarioOptions,
  userId: string | undefined
): Promise<ChatModelInput> {
  const { role, sessionContext, context, scenarioTitle } = request
  const scenario = buildChatScenarioContext(request, options)
  const interviewerContext = buildChatInterviewerContext(request, state, scenario)
  const stableSystemPrompt =
    role === "interviewer"
      ? buildInterviewerPrompt(interviewerContext, sessionContext ? "stable" : "all")
      : buildChatPartnerPrompt(scenarioTitle, scenario)
  const interviewerTurnGuidance =
    role === "interviewer" && sessionContext
      ? buildInterviewerPrompt(interviewerContext, "turn")
      : ""
  const retrievalContext = await buildChatRetrievalContext(request, userId)
  const systemPrompt = sessionContext
    ? stableSystemPrompt + buildSessionBaselinePrompt(sessionContext)
    : stableSystemPrompt + retrievalContext
  const history = sessionContext
    ? timelineProviderHistory(sessionContext.timeline)
    : buildProviderHistory(context)
  const promptFlow = buildChatPromptFlow({
    ...request,
    context: role === "interviewer" ? getInterviewerTurns(sessionContext, context) : context,
    currentCodeContext: scenario.currentCodeContext,
    workspaceContextStr: scenario.workspaceContextStr,
    elapsedMinutes: scenario.elapsedMinutes,
    sessionEvidence: sessionContext
      ? interviewerTurnGuidance + retrievalContext + buildSessionEvidencePrompt(sessionContext)
      : undefined,
  })
  return { systemPrompt, history, promptFlow }
}
