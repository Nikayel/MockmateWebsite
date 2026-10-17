import type { PromptContext } from "@/lib/interview/interviewer-prompts"
import type { GuidedChatState, PackChatContext } from "./context-builders"
import {
  buildBugFixContext,
  buildCompanyPromptContext,
  buildConsoleContext,
  buildCurrentCodeContext,
  buildEnvironmentContext,
  buildPatternPromptContext,
  buildProblemContext,
  buildSystemDesignPromptContext,
  buildUserPersonalizationContext,
  buildWorkspaceContextString,
} from "./context-builders"
import { buildInterviewerLevelContext } from "@/lib/rag/knowledge-base/interview-behavior-knowledge"
import type { UserContext } from "@/lib/interview/chat-request-schema"
import type { ChatRequestContext } from "./request-context"

export interface ChatScenarioOptions {
  guidedLab?: GuidedChatState
  pack?: PackChatContext
}
export interface ChatScenarioContext {
  prompt: Pick<
    PromptContext,
    | "scenarioType"
    | "problemTitle"
    | "problemDifficulty"
    | "userLevel"
    | "companyContext"
    | "userContextString"
    | "problemContext"
    | "levelContext"
    | "scenarioContext"
    | "consoleContext"
    | "environmentContext"
    | "isGenericCompany"
    | "companyName"
  >
  elapsedMinutes: number
  workspaceContextStr: string
  currentCodeContext: string
  isBugFix: boolean
  isSystemDesign: boolean
}

export function buildChatScenarioContext(
  request: ChatRequestContext,
  options: ChatScenarioOptions
): ChatScenarioContext {
  const {
    sessionContext,
    userContext,
    workspaceContext,
    currentCode,
    scenarioTitle,
    scenarioType,
    scenarioCompany,
    scenarioPattern,
    consoleLogs,
    testResults,
    elapsedTime,
  } = request
  const userInfo = userContext as UserContext
  const { userContextString, candidateLevel } = buildUserPersonalizationContext(userInfo)

  // Build level-specific interviewer context
  // This adapts questions and expectations based on candidate's experience level
  const levelContext =
    scenarioType === "bugfix" || scenarioType === "system-design"
      ? `CANDIDATE EXPERIENCE: ${candidateLevel}. Calibrate the depth of relevant investigation or design questions to this experience. Accept informal explanations; do not turn level expectations into a mandatory question checklist. Do not import algorithm optimization requirements into this round.`
      : buildInterviewerLevelContext(candidateLevel)

  // Manage workspace context with sliding window
  const workspaceContextStr = sessionContext ? "" : buildWorkspaceContextString(workspaceContext)

  // Add current code context (truncate if too long)
  const currentCodeContext = sessionContext ? "" : buildCurrentCodeContext(currentCode)

  // Define system prompts based on role with enhanced context awareness
  const problemContext = buildProblemContext(scenarioTitle, scenarioType)

  // Get company-specific interview style
  const { companyStyle, companyContext, isGenericCompany } =
    buildCompanyPromptContext(scenarioCompany)

  // Get pattern-specific metadata for DSA problems
  const { patternMeta, patternContext } = buildPatternPromptContext(scenarioPattern)

  // Build console/test results context for interviewer awareness
  // TestResultItem and ConsoleLogItem interfaces defined at module level
  const consoleLogsArray = consoleLogs

  const consoleContext = buildConsoleContext(
    testResults,
    consoleLogsArray,
    scenarioType,
    !sessionContext || sessionContext.testsMatchCurrentRevision
  )

  // How the candidate runs code (Run Tests / Submit buttons; no terminal exists).
  // Goes to BOTH roles: the debugging partner was the one telling candidates to
  // type "python3 src/main.py fixtures/input.txt" into a shell that isn't there.
  const environmentContext = buildEnvironmentContext(scenarioType)

  // Build system design specific context with phase-based guidance
  const { isSystemDesign, elapsedMinutes, systemDesignContext } = buildSystemDesignPromptContext(
    scenarioType,
    elapsedTime
  )

  // Build bug fix specific context (incl. guided-lab milestone / AI-restraint state,
  // and stdout-oracle pack state-machine scoping when present).
  const { isBugFix, bugFixContext } = buildBugFixContext(
    scenarioType,
    options.guidedLab,
    options.pack
  )

  return {
    prompt: {
      scenarioType,
      problemTitle: scenarioTitle || "",
      problemDifficulty: scenarioPattern || patternMeta?.name || "medium",
      userLevel: candidateLevel,
      companyContext,
      userContextString,
      problemContext,
      levelContext,
      scenarioContext: isSystemDesign
        ? systemDesignContext
        : isBugFix
          ? bugFixContext
          : patternContext,
      consoleContext,
      environmentContext,
      isGenericCompany,
      companyName: companyStyle.company,
    },
    elapsedMinutes,
    workspaceContextStr,
    currentCodeContext,
    isBugFix,
    isSystemDesign,
  }
}
