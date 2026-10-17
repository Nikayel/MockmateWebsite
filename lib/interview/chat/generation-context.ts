import type { generateAIResponse } from "@/lib/ai-providers"
import type { InterviewPhase } from "@/lib/interview/interview-phases"
import type { ChatRequestContext } from "./request-context"

export interface ChatGenerationContext {
  request: ChatRequestContext
  userId: string | undefined
  systemPrompt: string
  fullUserMessage: string
  history: NonNullable<Parameters<typeof generateAIResponse>[2]>
  currentPhase: InterviewPhase
  signal: AbortSignal
}
