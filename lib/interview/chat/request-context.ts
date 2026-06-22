import type { z } from "zod"
import type {
  chatRequestSchema,
  ConsoleLogItem,
  TestResultItem,
  UserContext,
} from "@/lib/interview/chat-request-schema"

type ChatRequestData = z.infer<typeof chatRequestSchema>

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
  message?: string
  context?: Array<{ type: string; message: string }>
  role?: "interviewer" | "partner"
  userContext?: UserContext
  workspaceContext?: ChatRequestData["workspaceContext"]
  currentCode?: string
  isProactive?: boolean
  scenarioTitle?: string
  scenarioType?: string
  bugfixReflection?: ChatRequestData["bugfixReflection"]
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
    message: validatedData.message,
    context: validatedData.context,
    role: validatedData.role,
    userContext: validatedData.userContext as UserContext | undefined,
    workspaceContext: validatedData.workspaceContext,
    currentCode,
    isProactive: validatedData.isProactive,
    scenarioTitle: validatedData.scenarioTitle,
    scenarioType: validatedData.scenarioType,
    bugfixReflection: validatedData.bugfixReflection,
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
