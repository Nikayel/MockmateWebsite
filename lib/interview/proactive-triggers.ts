/**
 * Context-Aware Proactive Triggers
 *
 * Replaces fixed timer-based interruptions with intelligent, context-aware triggers.
 * The AI interviewer should intervene based on:
 * - Code milestones (wrote meaningful code)
 * - Silence detection (no typing, no messages)
 * - Test results (passed/failed)
 * - Difficulty-adjusted timing
 * - Phase-appropriate questions
 *
 * These triggers use the scenario's proactive data (midCodingProbes, whatIfQuestions,
 * commonWrongApproaches) to ask tailored, problem-specific questions instead of generic ones.
 */

import type { DSAScenario, MidCodingProbe, WrongApproach } from "@/lib/scenarios/types"

/**
 * Proactive context used for trigger decisions
 */
export interface ProactiveContext {
  // Code state
  codeLineCount: number
  codeHasChanged: boolean
  lastCodeChangeMs: number // ms since last code change

  // Interview state
  lastMessageMs: number // ms since last message (user or AI)
  lastUserMessageMs: number // ms since last user message
  messageCount: number
  phase: "intro" | "discussion" | "coding" | "testing" | "post_interview"

  // Test state
  testsHaveRun: boolean
  testsPassed: boolean
  passRate: number // 0-100

  // Scenario
  difficulty: "easy" | "medium" | "hard"
  estimatedTimeMinutes: number

  // What's already been asked (to avoid repetition)
  askedTopics: Set<string>
  askedProbeIndices: Set<number>
}

/**
 * Result of checking if we should trigger a proactive intervention
 */
export interface ProactiveTriggerResult {
  shouldTrigger: boolean
  triggerType:
    | "silence_check_in"
    | "code_walkthrough"
    | "what_if_question"
    | "wrong_approach_nudge"
    | "complexity_ask"
    | "optimization_push"
    | "test_discussion"
    | "edge_case_probe"
    | "none"
  message?: string
  topicId?: string // For tracking what we've asked
}

/**
 * Silence thresholds based on difficulty (in milliseconds)
 * Harder problems get more thinking time before we interrupt
 */
const SILENCE_THRESHOLDS: Record<"easy" | "medium" | "hard", number> = {
  easy: 45 * 1000, // 45 seconds
  medium: 75 * 1000, // 75 seconds (1.25 min)
  hard: 120 * 1000, // 2 minutes
}

/**
 * Code line thresholds for "has meaningful code"
 */
const CODE_MILESTONE_LINES = 5

/**
 * Check for silence-based trigger
 */
function checkSilenceTrigger(
  ctx: ProactiveContext,
  scenario: DSAScenario | null
): ProactiveTriggerResult {
  const silenceThreshold = SILENCE_THRESHOLDS[ctx.difficulty]
  const silenceMs = Math.min(ctx.lastCodeChangeMs, ctx.lastUserMessageMs)

  if (silenceMs < silenceThreshold) {
    return { shouldTrigger: false, triggerType: "none" }
  }

  // Don't ask if we're not in coding phase
  if (ctx.phase !== "coding" && ctx.phase !== "discussion") {
    return { shouldTrigger: false, triggerType: "none" }
  }

  // Already asked about silence recently
  if (ctx.askedTopics.has("silence")) {
    return { shouldTrigger: false, triggerType: "none" }
  }

  const messages = [
    "What are you thinking about?",
    "How's it going? Where are you at?",
    "Walk me through what you're considering.",
    "Anything I can help clarify?",
  ]

  return {
    shouldTrigger: true,
    triggerType: "silence_check_in",
    message: messages[Math.floor(Math.random() * messages.length)],
    topicId: "silence",
  }
}

/**
 * Check for code milestone trigger (wrote enough code to discuss)
 */
function checkCodeMilestoneTrigger(
  ctx: ProactiveContext,
  scenario: DSAScenario | null
): ProactiveTriggerResult {
  if (ctx.phase !== "coding") {
    return { shouldTrigger: false, triggerType: "none" }
  }

  // Need meaningful code
  if (ctx.codeLineCount < CODE_MILESTONE_LINES) {
    return { shouldTrigger: false, triggerType: "none" }
  }

  // Code must have changed recently (within 30 sec) - they're actively coding
  if (ctx.lastCodeChangeMs > 30 * 1000) {
    return { shouldTrigger: false, triggerType: "none" }
  }

  // Already asked about code walkthrough
  if (ctx.askedTopics.has("walkthrough")) {
    return { shouldTrigger: false, triggerType: "none" }
  }

  // Use scenario-specific mid-coding probes if available
  if (scenario?.midCodingProbes && scenario.midCodingProbes.length > 0) {
    const availableProbes = scenario.midCodingProbes.filter(
      (_, i) => !ctx.askedProbeIndices.has(i)
    )

    if (availableProbes.length > 0) {
      const probe = availableProbes[0]
      return {
        shouldTrigger: true,
        triggerType: "code_walkthrough",
        message: probe.question,
        topicId: `probe_${scenario.midCodingProbes.indexOf(probe)}`,
      }
    }
  }

  // Fallback to generic walkthrough
  return {
    shouldTrigger: true,
    triggerType: "code_walkthrough",
    message: "Walk me through what you have so far.",
    topicId: "walkthrough",
  }
}

/**
 * Check for test-based triggers
 */
function checkTestTrigger(
  ctx: ProactiveContext,
  scenario: DSAScenario | null
): ProactiveTriggerResult {
  if (!ctx.testsHaveRun) {
    return { shouldTrigger: false, triggerType: "none" }
  }

  // Tests passed - ask about optimization or edge cases
  if (ctx.testsPassed && ctx.passRate >= 80) {
    // Check if we should push for optimization
    if (
      scenario?.optimizationPush &&
      !ctx.askedTopics.has("optimization")
    ) {
      return {
        shouldTrigger: true,
        triggerType: "optimization_push",
        message: scenario.optimizationPush.nudge,
        topicId: "optimization",
      }
    }

    // Ask a what-if question
    if (scenario?.whatIfQuestions && !ctx.askedTopics.has("whatif")) {
      const availableWhatIfs = scenario.whatIfQuestions.filter(
        (q) => !ctx.askedTopics.has(`whatif_${q.substring(0, 20)}`)
      )
      if (availableWhatIfs.length > 0) {
        const whatIf = availableWhatIfs[Math.floor(Math.random() * availableWhatIfs.length)]
        return {
          shouldTrigger: true,
          triggerType: "what_if_question",
          message: whatIf,
          topicId: `whatif_${whatIf.substring(0, 20)}`,
        }
      }
    }

    // Ask about complexity
    if (!ctx.askedTopics.has("complexity")) {
      return {
        shouldTrigger: true,
        triggerType: "complexity_ask",
        message: "Nice! What's the time and space complexity of your solution?",
        topicId: "complexity",
      }
    }
  }

  // Tests failed - help debug
  if (!ctx.testsPassed && ctx.passRate < 80 && !ctx.askedTopics.has("test_debug")) {
    return {
      shouldTrigger: true,
      triggerType: "test_discussion",
      message: "Let's look at that failing test case. Can you trace through what's happening?",
      topicId: "test_debug",
    }
  }

  return { shouldTrigger: false, triggerType: "none" }
}

/**
 * Check if the candidate might be going down a wrong path
 * This is a heuristic based on the scenario's commonWrongApproaches
 */
function checkWrongApproachTrigger(
  ctx: ProactiveContext,
  scenario: DSAScenario | null,
  currentCode: string
): ProactiveTriggerResult {
  if (ctx.phase !== "coding" || !scenario?.commonWrongApproaches) {
    return { shouldTrigger: false, triggerType: "none" }
  }

  // Need some code to analyze
  if (ctx.codeLineCount < 3) {
    return { shouldTrigger: false, triggerType: "none" }
  }

  const codeLower = currentCode.toLowerCase()

  for (const wrongApproach of scenario.commonWrongApproaches) {
    // Check if we already warned about this approach
    const topicId = `wrong_${wrongApproach.description.substring(0, 20)}`
    if (ctx.askedTopics.has(topicId)) {
      continue
    }

    // Check if any of the code signals are present
    const hasSignal = wrongApproach.codeSignals.some((signal) =>
      codeLower.includes(signal.toLowerCase())
    )

    if (hasSignal) {
      return {
        shouldTrigger: true,
        triggerType: "wrong_approach_nudge",
        message: wrongApproach.intervention,
        topicId,
      }
    }
  }

  return { shouldTrigger: false, triggerType: "none" }
}

/**
 * Main function: Determine if we should proactively intervene
 *
 * Returns the most important trigger that should fire, or none.
 * Priority: wrong approach > test results > silence > code milestone
 */
export function checkProactiveTrigger(
  ctx: ProactiveContext,
  scenario: DSAScenario | null,
  currentCode: string = ""
): ProactiveTriggerResult {
  // Don't trigger in intro or post_interview phases
  if (ctx.phase === "intro" || ctx.phase === "post_interview") {
    return { shouldTrigger: false, triggerType: "none" }
  }

  // Priority 1: Wrong approach detection (catch them early)
  const wrongApproach = checkWrongApproachTrigger(ctx, scenario, currentCode)
  if (wrongApproach.shouldTrigger) {
    return wrongApproach
  }

  // Priority 2: Test-based triggers (respond to their results)
  const testTrigger = checkTestTrigger(ctx, scenario)
  if (testTrigger.shouldTrigger) {
    return testTrigger
  }

  // Priority 3: Code milestone (engage with their progress)
  const codeMilestone = checkCodeMilestoneTrigger(ctx, scenario)
  if (codeMilestone.shouldTrigger) {
    return codeMilestone
  }

  // Priority 4: Silence (they might be stuck)
  const silence = checkSilenceTrigger(ctx, scenario)
  if (silence.shouldTrigger) {
    return silence
  }

  return { shouldTrigger: false, triggerType: "none" }
}

/**
 * Get a what-if question for the current scenario
 * Used by the AI to ask follow-up questions after the candidate solves the problem
 */
export function getWhatIfQuestion(
  scenario: DSAScenario | null,
  askedTopics: Set<string>
): string | null {
  if (!scenario?.whatIfQuestions || scenario.whatIfQuestions.length === 0) {
    return null
  }

  const availableWhatIfs = scenario.whatIfQuestions.filter(
    (q) => !askedTopics.has(`whatif_${q.substring(0, 20)}`)
  )

  if (availableWhatIfs.length === 0) {
    return null
  }

  return availableWhatIfs[Math.floor(Math.random() * availableWhatIfs.length)]
}

/**
 * Get the appropriate mid-coding probe for the current state
 */
export function getMidCodingProbe(
  scenario: DSAScenario | null,
  askedProbeIndices: Set<number>,
  currentCode: string
): MidCodingProbe | null {
  if (!scenario?.midCodingProbes || scenario.midCodingProbes.length === 0) {
    return null
  }

  const availableProbes = scenario.midCodingProbes.filter(
    (_, i) => !askedProbeIndices.has(i)
  )

  if (availableProbes.length === 0) {
    return null
  }

  // For now, return the first available probe
  // Future: could do semantic matching on the trigger
  return availableProbes[0]
}

/**
 * Check if the current code matches any wrong approach patterns
 */
export function detectWrongApproach(
  scenario: DSAScenario | null,
  currentCode: string
): WrongApproach | null {
  if (!scenario?.commonWrongApproaches || !currentCode) {
    return null
  }

  const codeLower = currentCode.toLowerCase()

  for (const wrongApproach of scenario.commonWrongApproaches) {
    const hasSignal = wrongApproach.codeSignals.some((signal) =>
      codeLower.includes(signal.toLowerCase())
    )

    if (hasSignal) {
      return wrongApproach
    }
  }

  return null
}
