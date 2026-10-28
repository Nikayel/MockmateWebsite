import type { z } from "zod"
import type {
  chatRequestSchema,
  ConsoleLogItem,
  TestResultItem,
  UserContext,
} from "@/lib/interview/chat-request-schema"

export type ChatRequestData = z.infer<typeof chatRequestSchema>

export interface ChatSolutionComplexity {
  estimated?: string
  optimal?: string
  optimalSpace?: string
  isOptimal?: boolean
}

export interface ChatEdgeCase {
  description: string
  input: unknown
}

export interface ChatRequestContext {
  /** Server-issued identity for this logical response, shared by provider attempts. */
  generationId?: string
  sessionContext?: ChatRequestData["sessionContext"]
  message?: string
  candidateMessage?: string
  responseMode?: "json" | "validated-stream"
  context?: Array<{ type: string; message: string }>
  role?: "interviewer" | "partner"
  partnerAvailable?: boolean
  isPostInterview?: boolean
  userContext?: UserContext
  workspaceContext?: ChatRequestData["workspaceContext"]
  currentCode?: string
  isProactive?: boolean
  scenarioTitle?: string
  scenarioId?: string
  scenarioType?: string
  scenarioPattern?: string
  scenarioCompany?: string | null
  elapsedTime?: number
  sessionId?: string
  userId?: string
  partnerMessagesCount?: number
  lastPartnerExchange?: string
  recentNudgeTopics?: string[]
  userAnsweredTopics?: string[]
  timeSinceLastMessage?: number
  isWrapUp?: boolean
  edgeCases?: ChatEdgeCase[]
  testResults?: TestResultItem[]
  consoleLogs?: ConsoleLogItem[]
  conversationTracker?: Record<string, unknown>
  hasSubmitted?: boolean
  solutionComplexity?: ChatSolutionComplexity
  realInterviewMode?: boolean
  hasFuzzyStatement?: boolean
  scenarioClarifyingQuestions?: unknown
  scenarioFuzzyStatement?: string
  starterCodeLength: number
  messageCount: number
  testsHaveRun: boolean
  currentCodeLength: number
}

export function buildChatRequestContext(validatedData: ChatRequestData): ChatRequestContext {
  const testResults = validatedData.testResults as TestResultItem[] | undefined
  const currentCode = validatedData.currentCode
  const starterCodeLength = validatedData.starterCodeLength || 0

  return {
    sessionContext: validatedData.sessionContext,
    message: validatedData.message,
    candidateMessage: validatedData.candidateMessage,
    responseMode: validatedData.responseMode,
    context: validatedData.context,
    role: validatedData.role,
    partnerAvailable: validatedData.partnerAvailable,
    isPostInterview: validatedData.isPostInterview,
    userContext: validatedData.userContext as UserContext | undefined,
    workspaceContext: validatedData.workspaceContext,
    currentCode,
    isProactive: validatedData.isProactive,
    scenarioTitle: validatedData.scenarioTitle,
    scenarioId: validatedData.scenarioId,
    scenarioType: validatedData.scenarioType,
    scenarioPattern: validatedData.scenarioPattern,
    scenarioCompany: validatedData.scenarioCompany,
    elapsedTime: validatedData.elapsedTime,
    sessionId: validatedData.sessionId,
    userId: validatedData.userId,
    partnerMessagesCount: validatedData.partnerMessagesCount,
    lastPartnerExchange: validatedData.lastPartnerExchange,
    recentNudgeTopics: validatedData.recentNudgeTopics,
    userAnsweredTopics: validatedData.userAnsweredTopics,
    timeSinceLastMessage: validatedData.timeSinceLastMessage,
    isWrapUp: validatedData.isWrapUp,
    edgeCases: validatedData.edgeCases as ChatEdgeCase[] | undefined,
    testResults,
    consoleLogs: validatedData.consoleLogs as ConsoleLogItem[] | undefined,
    conversationTracker: validatedData.conversationTracker,
    hasSubmitted: validatedData.hasSubmitted,
    solutionComplexity: validatedData.solutionComplexity as ChatSolutionComplexity | undefined,
    realInterviewMode: validatedData.realInterviewMode,
    hasFuzzyStatement: validatedData.hasFuzzyStatement,
    scenarioClarifyingQuestions: validatedData.scenarioClarifyingQuestions,
    scenarioFuzzyStatement: validatedData.scenarioFuzzyStatement,
    starterCodeLength,
    messageCount: Array.isArray(validatedData.context) ? validatedData.context.length : 0,
    testsHaveRun: Array.isArray(testResults) && testResults.length > 0,
    currentCodeLength: currentCode?.length || 0,
  }
}
