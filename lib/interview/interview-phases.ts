/**
 * Interview Phase Management
 *
 * Defines the phases of a technical interview and the rules for each phase.
 * This ensures Sable (the AI interviewer) behaves appropriately at each stage.
 */

// =============================================================================
// INTERVIEW PHASES
// =============================================================================

export type InterviewPhase =
  | "intro" // Initial greeting and problem introduction
  | "discussion" // Candidate explains approach, interviewer probes
  | "coding" // Candidate writes code, interviewer observes
  | "testing" // Tests run, discuss results and complexity
  | "post_interview" // Wrap-up after submit, final thoughts
  | "complete" // Session ended, direct to feedback

export interface PhaseContext {
  currentPhase: InterviewPhase
  phaseStartedAt: number
  testsHaveRun: boolean
  allTestsPassed: boolean
  hasSubmitted: boolean
}

// =============================================================================
// PHASE DETECTION
// =============================================================================

export function detectInterviewPhase(context: {
  messageCount: number
  hasExplainedApproach: boolean
  hasStartedCoding: boolean
  testsHaveRun: boolean
  allTestsPassed: boolean
  hasSubmitted: boolean
}): InterviewPhase {
  // User clicked submit -> post-interview wrap-up
  if (context.hasSubmitted) {
    return "post_interview"
  }

  // Tests have run -> testing phase (discuss results)
  if (context.testsHaveRun) {
    return "testing"
  }

  // Has written code -> coding phase
  if (context.hasStartedCoding) {
    return "coding"
  }

  // Has explained approach -> discussion phase
  if (context.hasExplainedApproach) {
    return "discussion"
  }

  // Just started -> intro
  if (context.messageCount <= 2) {
    return "intro"
  }

  // Default to discussion after intro
  return "discussion"
}

// =============================================================================
// PHASE-SPECIFIC PROMPTS
// =============================================================================

export const PHASE_PROMPTS: Record<InterviewPhase, string> = {
  intro: `
CURRENT PHASE: INTRODUCTION
Your goal: Greet the candidate, confirm they understand the problem, set expectations.

PHASE RULES:
- Keep it brief (2-3 sentences)
- Ask if they have questions about the problem
- Encourage them to think aloud
- DO NOT dive into follow-up questions yet
- DO NOT ask about complexity yet

EXAMPLE OPENER:
"Hey! I'm Sable, I'll be your interviewer today. Take a minute to read through the problem, and when you're ready, walk me through how you're thinking about it."
`,

  discussion: `
CURRENT PHASE: APPROACH DISCUSSION
Your goal: Understand their approach, probe their reasoning, validate before coding.

PHASE RULES:
- Ask ONE question at a time
- Probe alternatives: "What made you choose that over [X]?"
- Probe trade-offs: "What's the trade-off there?"
- If they've explained well, say "Good reasoning. Go ahead and code it."
- DO NOT give away the solution or complexity
- DO NOT over-question - let them code once they've demonstrated understanding

WHEN CANDIDATE PROPOSES AN APPROACH:
1. If brute force: Accept it, then ask "Can you think of a way to optimize?"
2. If optimal (or can't be improved): Ask why they chose it, then let them code - don't keep pushing
3. If wrong: Ask them to trace through an example
4. In real interviews: brute force is FINE as a starting point. Accept it, let them code, THEN discuss optimization.

RED FLAGS TO PROBE:
- They jump to coding without explaining
- They can't explain WHY their approach works
- They miss obvious edge cases in their explanation
`,

  coding: `
CURRENT PHASE: CODING
Your goal: Observe their coding, ask clarifying questions, guide if stuck.

PHASE RULES:
- Let them code in peace - don't interrupt every line
- If they go quiet for a while: "What are you thinking about?"
- If they write confusing code: "Can you walk me through that?"
- If they seem stuck: Give a small hint, not the answer
- DO NOT tell them if their code is right/wrong before tests run
- DO NOT give away complexity yet

WHEN TO INTERVENE:
- They've been silent for 30+ seconds
- They're heading toward a bug you can see
- They ask a question

HOW TO HINT (progressive):
1. Leading question: "Have you thought about what happens when X?"
2. Concrete example: "What would this return for input [X]?"
3. Direct nudge: "Think about the data structure for lookups"
4. Last resort: "Consider using a hash map here"
`,

  testing: `
CURRENT PHASE: TESTING & REVIEW
Your goal: Discuss test results, analyze complexity, explore improvements.

PHASE RULES:
- Acknowledge test results briefly
- If all passed: Move to complexity questions
- If some failed: Help them debug (don't give the answer)
- Ask about complexity - but make THEM derive it
- DO NOT repeat earlier feedback
- DO NOT give away complexity - ask "What's the complexity? Walk me through it."

COMPLEXITY DISCUSSION:
- If they state complexity: "Walk me through your reasoning"
- If they're wrong: "Let's trace through - how many times does that loop run?"
- If they ask "is it O(n)?": "What do you think? How did you arrive at that?"
- NEVER just confirm or give the answer

AFTER TESTS PASS:
- "Nice, tests are passing. What's the time complexity?"
- Check the SOLUTION COMPLEXITY context - if already optimal, DO NOT ask to optimize
- If NOT optimal: "Could you do better than [current complexity]?"
- If ALREADY optimal: "What edge cases might we be missing?" or "What's a trade-off of this approach?"
- In real interviews, if a solution can't be optimized, interviewers move on

EXAMPLE (OPTIMAL SOLUTION):
"Tests pass, nice. What's the complexity? [they answer O(n)] Good. Since you're hitting the optimal bound here, what edge cases might trip up your solution?"

EXAMPLE (SUBOPTIMAL SOLUTION):
"Tests pass. What's the complexity? [they answer O(n²)] Right. Is there a way to do better? Think about what data structure could help."
`,

  post_interview: `
CURRENT PHASE: POST-INTERVIEW WRAP-UP
Your goal: Give final thoughts, summarize, direct to detailed feedback.

PHASE RULES:
- This is the FINAL conversation before they see scores
- Give a brief, honest assessment (2-3 sentences)
- Mention one thing they did well
- Mention one area to focus on
- Tell them to click "View Detailed Feedback" to see scores
- DO NOT give specific scores (they'll see those in feedback)
- DO NOT start a new line of questioning
- DO NOT ask them to click "Submit" - they already did

WRAP-UP FORMAT:
"Alright [name], nice work on this one. [One positive]. [One area to improve].
When you're ready, click 'View Detailed Feedback' to see your full evaluation and next steps."

THINGS TO AVOID:
- "Click Submit" (they already submitted)
- Starting new technical discussions
- Giving away the score
- Generic praise without substance
`,

  complete: `
CURRENT PHASE: COMPLETE
The session has ended. Direct the user to view their detailed feedback.

Say: "That's a wrap! Click 'View Detailed Feedback' to see your scores and personalized improvement plan."
`,
}

// =============================================================================
// CONVERSATION TRACKING
// =============================================================================

export interface ConversationTracker {
  // What has the candidate covered?
  approachExplained: boolean
  approachType: "none" | "brute_force" | "optimized" | "unclear"

  // Complexity discussion
  timeComplexityMentioned: boolean
  timeComplexityValue: string | null // e.g., "O(n)"
  spaceComplexityMentioned: boolean
  spaceComplexityValue: string | null
  complexityExplanationGiven: boolean // Did they explain WHY?

  // Edge cases
  edgeCasesMentioned: string[] // List of edge cases they mentioned
  edgeCasesAskedByInterviewer: string[] // Edge cases interviewer already asked about

  // Progress
  hasStartedCoding: boolean
  hasRunTests: boolean
  wasAskedToOptimize: boolean
  didOptimize: boolean

  // Mistakes and corrections
  bugsMade: number
  bugsSelfCorrected: number
  hintsGiven: number
}

export function createEmptyTracker(): ConversationTracker {
  return {
    approachExplained: false,
    approachType: "none",
    timeComplexityMentioned: false,
    timeComplexityValue: null,
    spaceComplexityMentioned: false,
    spaceComplexityValue: null,
    complexityExplanationGiven: false,
    edgeCasesMentioned: [],
    edgeCasesAskedByInterviewer: [],
    hasStartedCoding: false,
    hasRunTests: false,
    wasAskedToOptimize: false,
    didOptimize: false,
    bugsMade: 0,
    bugsSelfCorrected: 0,
    hintsGiven: 0,
  }
}

/**
 * Extract tracking information from conversation messages
 */
export function updateTrackerFromMessage(
  tracker: ConversationTracker,
  message: string,
  role: "user" | "interviewer"
): ConversationTracker {
  const updated = { ...tracker }
  const lowerMessage = message.toLowerCase()

  if (role === "user") {
    // Check for approach explanation
    if (
      lowerMessage.includes("approach") ||
      lowerMessage.includes("i would") ||
      lowerMessage.includes("i'll use") ||
      lowerMessage.includes("my plan") ||
      lowerMessage.includes("thinking")
    ) {
      updated.approachExplained = true
    }

    // Check for complexity mentions
    const complexityMatch = message.match(/O\([^)]+\)/gi)
    if (complexityMatch) {
      complexityMatch.forEach((c) => {
        const complexity = c.toUpperCase()
        if (lowerMessage.includes("time") || lowerMessage.includes("runtime")) {
          updated.timeComplexityMentioned = true
          updated.timeComplexityValue = complexity
        } else if (lowerMessage.includes("space") || lowerMessage.includes("memory")) {
          updated.spaceComplexityMentioned = true
          updated.spaceComplexityValue = complexity
        } else {
          // Default to time complexity if not specified
          updated.timeComplexityMentioned = true
          updated.timeComplexityValue = complexity
        }
      })

      // Check if they explained why
      if (
        lowerMessage.includes("because") ||
        lowerMessage.includes("since") ||
        lowerMessage.includes("due to") ||
        lowerMessage.includes("loop") ||
        lowerMessage.includes("iterate")
      ) {
        updated.complexityExplanationGiven = true
      }
    }

    // Check for edge case mentions
    const edgeCaseKeywords = [
      "empty",
      "null",
      "none",
      "zero",
      "negative",
      "single",
      "one element",
      "duplicate",
      "edge case",
      "what if",
      "corner case",
      "boundary",
    ]
    edgeCaseKeywords.forEach((keyword) => {
      if (lowerMessage.includes(keyword) && !updated.edgeCasesMentioned.includes(keyword)) {
        updated.edgeCasesMentioned.push(keyword)
      }
    })

    // Check for brute force vs optimized
    if (
      lowerMessage.includes("brute force") ||
      lowerMessage.includes("nested loop") ||
      lowerMessage.includes("n squared") ||
      lowerMessage.includes("n^2")
    ) {
      updated.approachType = "brute_force"
    } else if (
      lowerMessage.includes("hash") ||
      lowerMessage.includes("map") ||
      lowerMessage.includes("set") ||
      lowerMessage.includes("optimize") ||
      lowerMessage.includes("better")
    ) {
      if (updated.approachType === "brute_force") {
        updated.didOptimize = true
      }
      updated.approachType = "optimized"
    }
  }

  if (role === "interviewer") {
    // Track what interviewer has asked about
    if (
      lowerMessage.includes("optimize") ||
      lowerMessage.includes("better approach") ||
      lowerMessage.includes("improve")
    ) {
      updated.wasAskedToOptimize = true
    }

    // Track edge cases interviewer asked about
    const edgeCaseKeywords = ["empty", "null", "single", "one element", "edge case"]
    edgeCaseKeywords.forEach((keyword) => {
      if (
        lowerMessage.includes(keyword) &&
        !updated.edgeCasesAskedByInterviewer.includes(keyword)
      ) {
        updated.edgeCasesAskedByInterviewer.push(keyword)
      }
    })

    // Track hints given
    if (
      lowerMessage.includes("hint") ||
      lowerMessage.includes("consider") ||
      lowerMessage.includes("think about") ||
      lowerMessage.includes("what if")
    ) {
      updated.hintsGiven++
    }
  }

  return updated
}

/**
 * Build tracking context string for the AI prompt
 */
export function buildTrackingContext(tracker: ConversationTracker): string {
  const sections: string[] = []

  // Approach status
  if (tracker.approachExplained) {
    sections.push(`CANDIDATE HAS EXPLAINED APPROACH: ${tracker.approachType}`)
    if (tracker.approachType === "brute_force" && !tracker.wasAskedToOptimize) {
      sections.push(`-> ACTION: Ask if they can optimize`)
    }
    if (tracker.wasAskedToOptimize && tracker.didOptimize) {
      sections.push(`-> Candidate improved from brute force to optimized (GOOD SIGNAL)`)
    }
  } else {
    sections.push(`CANDIDATE HAS NOT YET EXPLAINED APPROACH`)
  }

  // Complexity status
  if (tracker.timeComplexityMentioned) {
    sections.push(
      `TIME COMPLEXITY DISCUSSED: ${tracker.timeComplexityValue}${tracker.complexityExplanationGiven ? " (with explanation)" : " (no explanation given)"}`
    )
    if (!tracker.complexityExplanationGiven) {
      sections.push(`-> ACTION: Ask them to walk through their reasoning`)
    }
  }
  if (tracker.spaceComplexityMentioned) {
    sections.push(`SPACE COMPLEXITY DISCUSSED: ${tracker.spaceComplexityValue}`)
  }

  // Edge cases status
  if (tracker.edgeCasesMentioned.length > 0) {
    sections.push(`EDGE CASES CANDIDATE MENTIONED: ${tracker.edgeCasesMentioned.join(", ")}`)
    sections.push(`-> DO NOT say they didn't mention edge cases - they did!`)
  }
  if (tracker.edgeCasesAskedByInterviewer.length > 0) {
    sections.push(
      `EDGE CASES YOU ALREADY ASKED ABOUT: ${tracker.edgeCasesAskedByInterviewer.join(", ")}`
    )
    sections.push(`-> DO NOT ask about these again`)
  }

  // Hints given
  if (tracker.hintsGiven > 0) {
    sections.push(`HINTS GIVEN SO FAR: ${tracker.hintsGiven}`)
  }

  return sections.length > 0
    ? `\nCONVERSATION TRACKING (what has already been covered):\n${sections.join("\n")}\n`
    : ""
}

// =============================================================================
// INTERVIEWER BEHAVIOR RULES
// =============================================================================

export const INTERVIEWER_BEHAVIOR_RULES = `
CRITICAL INTERVIEWER RULES (NEVER VIOLATE):

1. NEVER GIVE AWAY ANSWERS:
   - If candidate asks "is it O(n)?": Say "Walk me through your reasoning"
   - If candidate asks about the solution: Say "What are you thinking?"
   - If candidate is stuck: Give progressive hints, not answers

2. NEVER CONTRADICT YOURSELF:
   - If you said something earlier, stick with it or explicitly correct yourself
   - If you said O(n) space, don't later say O(h) without acknowledging the update

3. NEVER MAKE FALSE ACCUSATIONS:
   - Before saying "you didn't mention X", check conversation tracking
   - If they mentioned edge cases, acknowledge it: "Right, you covered that"
   - Don't repeat feedback they've already addressed

4. NEVER HALLUCINATE STATISTICS:
   - Don't make up numbers like "3/7 questions answered"
   - Only reference concrete things from the conversation

5. ACT LIKE A REAL INTERVIEWER:
   - Accept brute force first, then ask to optimize
   - Let them discover bugs themselves when possible
   - Self-correction is a POSITIVE signal, not a negative
   - If they improve their solution, give credit for that

6. RESPECT INTERVIEW PHASES:
   - In intro: Don't dive into technical questions
   - In coding: Let them code, don't over-interrupt
   - In post-interview: Wrap up, don't start new discussions
   - After submit: Direct to "View Detailed Feedback", not "Submit"
`

// =============================================================================
// PROGRESSIVE HINT SYSTEM
// =============================================================================

export interface HintLevel {
  level: number
  type: "leading_question" | "concrete_example" | "direct_nudge" | "explicit_help"
  description: string
}

export const HINT_PROGRESSION: HintLevel[] = [
  {
    level: 1,
    type: "leading_question",
    description: "Ask a question that points toward the issue without revealing it",
  },
  {
    level: 2,
    type: "concrete_example",
    description: "Walk through a specific input that exposes the problem",
  },
  {
    level: 3,
    type: "direct_nudge",
    description: "Suggest the general direction (data structure, technique)",
  },
  {
    level: 4,
    type: "explicit_help",
    description: "Give specific guidance (only if running out of time)",
  },
]

export function getHintGuidance(hintsGiven: number): string {
  const currentLevel = Math.min(hintsGiven + 1, 4)
  const hint = HINT_PROGRESSION[currentLevel - 1]

  return `
HINT GUIDANCE (You've given ${hintsGiven} hints so far):
Current hint level: ${currentLevel}/4 - ${hint.type}
Strategy: ${hint.description}

${currentLevel === 1 ? `EXAMPLE: "Have you thought about what happens when the input is empty?"` : ""}
${currentLevel === 2 ? `EXAMPLE: "Let's trace through with input [2,7] and target 9 - what happens at each step?"` : ""}
${currentLevel === 3 ? `EXAMPLE: "Think about what data structure gives you O(1) lookups"` : ""}
${currentLevel === 4 ? `EXAMPLE: "Consider using a hash map to store values you've seen"` : ""}
`
}
