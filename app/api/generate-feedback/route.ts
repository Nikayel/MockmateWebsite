import { NextRequest, NextResponse } from "next/server"
import { feedbackRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { generateFeedbackResponse } from "@/lib/ai-providers"
import { trackFeedbackGenerationServer } from "@/lib/analytics-server"
import { embedAndStoreSolution } from "@/lib/rag"
import { completeSessionWithMastery } from "@/lib/learning-state"
import { analyzeAndTrackMisconceptions } from "@/lib/rag/misconception-detection"
import { logger } from "@/lib/logger"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { calculateMasteryScore } from "@/lib/spaced-repetition/mastery-score"
import type { Difficulty } from "@/lib/spaced-repetition"

// Import feedback system modules
import {
  type FeedbackScores,
  type StructuredFeedback,
  preScreenConversation,
  validateConversationWithAI,
  getDefaultValidation,
  analyzeAICodeOverlap,
  analyzeCodeCompleteness,
  isBlankDesignTemplate,
  calculateValidatedScores,
  applyScoreFloors,
  critiqueScores,
  critiqueFeedbackText,
  buildRAGFeedbackContext,
  parseFeedbackSections,
  injectScoresIntoFeedback,
  sanitizeFeedbackForScoreConsistency,
} from "@/lib/feedback"
// Import structured extraction for grounded feedback
import {
  extractConversationEvidence,
  buildEvidenceSummary,
  type ExtractedEvidence,
} from "@/lib/feedback/structured-extraction"

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await feedbackRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Enforce quota limits (session & budget)
  const quotaResult = await enforceQuota(request)
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  const startTime = Date.now()

  try {
    const {
      code,
      scenarioTitle,
      scenarioType,
      scenarioId,
      scenarioDifficulty,
      scenarioPattern,
      testResults,
      language,
      timeSpent,
      aiCollaborationMetrics,
      interactionMetrics,
      efficiencyMetrics,
      conversationTranscript,
      partnerMessages,
      phaseTracking,
      sessionId,
      userId,
    } = await request.json()

    if (!code || !scenarioTitle) {
      return NextResponse.json({ error: "Code and scenario title are required" }, { status: 400 })
    }

    // Input validation: reject oversized code to prevent abuse
    const MAX_CODE_LENGTH = 100000 // 100KB limit
    if (code.length > MAX_CODE_LENGTH) {
      logger.warn("[Feedback API] Code too large", { codeLength: code.length })
      return NextResponse.json(
        {
          error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
        },
        { status: 400 }
      )
    }

    // Input validation: reject oversized conversation transcript
    const MAX_TRANSCRIPT_LENGTH = 200000 // 200KB limit
    if (
      conversationTranscript &&
      typeof conversationTranscript === "string" &&
      conversationTranscript.length > MAX_TRANSCRIPT_LENGTH
    ) {
      logger.warn("[Feedback API] Transcript too large", {
        transcriptLength: conversationTranscript.length,
      })
      return NextResponse.json(
        {
          error: `Conversation transcript exceeds maximum length`,
        },
        { status: 400 }
      )
    }

    // Calculate collaboration message count
    const collaborationMessages =
      (aiCollaborationMetrics?.partnerMessagesSent || 0) +
      (interactionMetrics?.interviewerQuestionsAnswered || 0)

    // Calculate test metrics
    const testsPassed = testResults?.filter((t: any) => t.passed).length || 0
    const testsTotal = testResults?.length || 0

    // Scenario-specific system instruction - AI generates narrative only, scores are algorithmic
    const getSystemInstruction = () => {
      const baseRules = `
IMPORTANT: Scores are PRE-CALCULATED. Just reference them in your feedback. Focus on actionable narrative.

RULES:
- ~200 words max. Be concise.
- Focus on actionable improvements.
- Reference the conversation and discussion quality.
`

      if (scenarioType === "system-design") {
        return `You are a brutally honest senior system design interviewer at a FAANG company. Be direct—if they didn't try, call it out.

${baseRules}

## CRITICAL: HANDLE LOW SCORES APPROPRIATELY
If overall score is below 25:
- TL;DR must explicitly state they did NOT engage or participate meaningfully
- "What Worked" should say "The candidate opened the problem" or similar minimal acknowledgment
- "Fix Next" must lead with: "CRITICAL: You must actually participate in the interview"
- Be blunt: "You submitted without discussing anything" / "You typed nothing" / "Zero engagement"

## OUTPUT FORMAT FOR SYSTEM DESIGN

CRITICAL FORMATTING RULES:
- Each bullet point MUST start on a NEW LINE
- Use ONLY hyphen (-) bullets, NOT asterisks (*)
- There MUST be a newline after each section header before the bullets

**TL;DR** – One sentence: If score < 25, state clearly they did not participate. Otherwise: what they did well + biggest gap.

**Score Snapshot** (use the PRE-CALCULATED SCORES provided)
- Requirements: X/100 – Did they clarify functional & non-functional requirements?
- Architecture: X/100 – Did they propose clear components and data flow?
- Scalability: X/100 – Did they address scaling, caching, trade-offs?
- Communication: X/100 – Did they explain decisions clearly?
- Overall: X/100

**What Worked**
- If score >= 30: specific design strength with evidence from discussion
- If score < 30: "The candidate opened the design template" (be honest - don't fabricate positives)

**Fix Next**
- If score < 25: Start with "ENGAGE WITH THE INTERVIEWER - system design is a CONVERSATION, not a silent exercise"
- specific improvement for system design interviews

**Action Plan**
CRITICAL: Don't suggest generic improvements the user already demonstrated. If they communicated well, don't tell them to communicate more.
1. If score < 25: "IMMEDIATE: Understand that system design interviews require active discussion." If score >= 70, suggest a specific deeper dive (e.g., "Design the caching layer in detail")
2. Short-term: Name a specific system to study that builds on what they discussed (e.g., "Study how Netflix handles CDN caching")
3. Long-term: Suggest a hands-on project related to the design (e.g., "Build a simple distributed cache to understand trade-offs firsthand")

SYSTEM DESIGN FOCUS:
- Evaluate requirements gathering, not code
- Focus on architecture decisions and trade-offs
- Value clear communication and collaboration
- Consider: Did they ask clarifying questions? Discuss alternatives? Handle scale?
- BE HONEST: If they didn't engage, don't pretend they did. Call it out directly.
`
      }

      if (scenarioType === "bugfix") {
        return `You are a senior debugging expert delivering focused feedback on bug fix performance. Be direct and constructive.

${baseRules}

## OUTPUT FORMAT FOR BUG FIX

CRITICAL FORMATTING RULES:
- Each bullet point MUST start on a NEW LINE
- Use ONLY hyphen (-) bullets, NOT asterisks (*)
- There MUST be a newline after each section header before the bullets

**TL;DR** – One sentence: bug identification success + biggest gap.

**Score Snapshot** (use the PRE-CALCULATED SCORES provided)
- Bug Found: X/100 – Did they correctly identify the bug?
- Root Cause: X/100 – Did they explain why the bug occurred?
- Fix Quality: X/100 – Was the fix clean and correct?
- Communication: X/100 – Did they explain their debugging process?
- Overall: X/100

**What Worked**
- specific debugging strength with evidence

**Fix Next**
- specific improvement for debugging skills

**Action Plan**
CRITICAL: Don't suggest improvements the user already demonstrated. If they found the bug quickly, focus on next-level skills.
1. IMMEDIATE: If they struggled, suggest a specific debugging technique. If they succeeded, suggest a harder bug type to practice (e.g., "Try race condition bugs next")
2. Short-term: Name a specific debugging tool or pattern to learn (e.g., "Practice using binary search debugging on large codebases")
3. Long-term: Connect to real-world debugging scenarios (e.g., "Contribute to an open-source project to practice debugging unfamiliar code")

BUG FIX FOCUS:
- Evaluate the debugging process, not just the fix
- Value root cause analysis
- Consider: Did they explain their hypothesis? Test incrementally?
`
      }

      // Default DSA instruction
      return `You are a senior interviewer delivering a focused, constructive technical debrief. Be HONEST about gaps, but RECOGNIZE ACHIEVEMENTS - if someone solved the problem correctly, acknowledge that accomplishment.

${baseRules}

## CRITICAL: HANDLING INCOMPLETE/STUB SOLUTIONS
If the code analysis shows "INCOMPLETE SOLUTION DETECTED":
- This means the candidate wrote only base case checks (like null checks) but NO actual algorithm
- Examples: "if root is None: return None" with "pass", or just edge case handling
- TL;DR MUST state: "Solution is incomplete - only edge cases handled, no actual algorithm implemented"
- "What Worked" should ONLY say: "Identified the base case" - nothing more. Do NOT praise code structure or efficiency for non-existent code.
- "Fix Next" MUST lead with: "CRITICAL: You must actually IMPLEMENT the algorithm, not just write the base case"
- Do NOT mention "optimal complexity" for incomplete solutions - there IS no working algorithm to analyze
- Be blunt: "You submitted a skeleton without the actual solution"

## HANDLING LOW TEST PASS RATES
If tests passed < 50%:
- Lead with what's broken, not what works
- "What Worked" should be minimal - don't fabricate positives
- Focus feedback on fixing the failing cases

## HANDLING POOR COMMUNICATION (CRITICAL)
If communication score < 60 or "Approach explained: NO" in the analysis:
- This is a MAJOR issue even if the solution is correct
- In real FAANG interviews, you MUST explain your approach before coding
- TL;DR must mention: "...but needs to explain approach before coding"
- "Fix Next" MUST include: "EXPLAIN YOUR APPROACH before writing code - interviewers need to understand your thought process"
- Communication score justification should state: "Did not explain approach before coding"
- Even with a correct solution, call this out: "You got the right answer, but in a real interview, coding silently is a red flag"

## OUTPUT FORMAT

CRITICAL FORMATTING RULES:
- Each bullet point MUST start on a NEW LINE
- Use ONLY hyphen (-) bullets, NOT asterisks (*)
- There MUST be a newline after each section header before the bullets

**TL;DR** – One sentence: If incomplete, state clearly "Solution incomplete - only base case, no algorithm." Otherwise: what they did well + biggest gap.

**Score Snapshot** (use the PRE-CALCULATED SCORES provided)
- Understanding: X/100 – If incomplete, state "Cannot demonstrate understanding without implementing solution"
- Problem-Solving: X/100 – If incomplete, state "No problem-solving demonstrated - base case only"
- Code Quality: X/100 – If incomplete, state "Incomplete code cannot be evaluated for quality"
- Communication: X/100 – brief justification
- Overall: X/100

**What Worked**
- First strength (specific, with evidence)
- Second strength if applicable
- Third strength if applicable

**Fix Next**
- Most important improvement needed
- Second improvement if applicable
- Third improvement if applicable

**Action Plan**
CRITICAL RULES FOR ACTION PLAN:
- NEVER suggest improving something the user already demonstrated well (e.g., don't say "explain before coding" if they did explain)
- If communication score >= 80, don't suggest communication improvements - focus on technical growth
- If all scores >= 80, focus on NEXT LEVEL challenges (harder problems, new patterns, speed optimization)
- Action items must be SPECIFIC and reference the actual problem/pattern attempted
- Reference related problems by name when suggesting practice (e.g., "Try Contains Duplicate II" not "try similar problems")

1. IMMEDIATE: If score >= 80, suggest implementing an alternative approach discussed OR a direct follow-up problem. If score < 80, address the biggest gap.
2. Short-term: Suggest a specific harder variation or related pattern to practice (name the problem)
3. Long-term: Connect to their target company prep or broader skill development

DSA FOCUS:
- Reference actual data (tests passed, complexity, time).
- Never praise if tests fail. Address failures first.
- NEVER mention "optimal complexity" or efficiency for solutions that don't work or are incomplete.
- Be honest: a null check is NOT "good code structure" - it's the bare minimum that everyone writes.
`
    }

    const systemInstruction = getSystemInstruction()

    const testResultsSummary =
      testResults && Array.isArray(testResults)
        ? `\n\nTEST RESULTS:\n- Total tests: ${testsTotal}\n- Passed: ${testsPassed}\n- Failed: ${testsTotal - testsPassed}\n`
        : ""

    const timeInfo = timeSpent
      ? `TIME SPENT: ${Math.floor(timeSpent / 60)} minutes ${timeSpent % 60} seconds`
      : ""

    // Simplified efficiency info (removed redundant verbose metrics)
    const efficiencyInfo = efficiencyMetrics
      ? `
CODE EFFICIENCY ANALYSIS:
- Lines of code: ${efficiencyMetrics.linesOfCode || "N/A"}
- Code complexity level: ${efficiencyMetrics.complexity || "N/A"}
- Estimated time complexity: ${efficiencyMetrics.estimatedTimeComplexity || "N/A"}
- Optimal time complexity: ${efficiencyMetrics.optimalTimeComplexity || "N/A"}
- Estimated space complexity: ${efficiencyMetrics.estimatedSpaceComplexity || "N/A"}
- Optimal space complexity: ${efficiencyMetrics.optimalSpaceComplexity || "N/A"}
- Efficiency score: ${efficiencyMetrics.efficiencyScore || "N/A"}/100
- Time complexity match: ${efficiencyMetrics.estimatedTimeComplexity === efficiencyMetrics.optimalTimeComplexity ? "YES - Optimal" : "NO - Suboptimal"}
- Space complexity match: ${efficiencyMetrics.estimatedSpaceComplexity === efficiencyMetrics.optimalSpaceComplexity ? "YES - Optimal" : "NO - Suboptimal"}
`
      : `
CODE EFFICIENCY ANALYSIS:
- No efficiency data available
`

    // HYBRID VALIDATION FLOW:
    // Step 1: Fast algorithmic pre-screening
    // Step 2: AI semantic validation (only if pre-screening passes)
    // Step 3: Calculate scores using both signals
    // Step 4: Apply score floors for correct solutions

    const passRate = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0

    // Step 1: Pre-screen conversation (fast, no AI)
    const preScreen = preScreenConversation(conversationTranscript)

    // Step 2: AI validation
    // For system design, always validate with AI (even minimal conversations) to get accurate feedback
    // For other types, skip AI call if: no content, gibberish detected, or keyword stuffing
    const shouldValidateWithAI =
      scenarioType === "system-design"
        ? true // Always validate system design to analyze what was discussed (or not discussed)
        : preScreen.hasContent &&
          !preScreen.suspiciousPatterns.possibleGibberish &&
          !preScreen.suspiciousPatterns.keywordStuffing &&
          preScreen.candidateMessageCount >= 1

    const aiValidation = shouldValidateWithAI
      ? await validateConversationWithAI(
          conversationTranscript,
          code,
          efficiencyMetrics
            ? {
                time: efficiencyMetrics.estimatedTimeComplexity || "unknown",
                space: efficiencyMetrics.estimatedSpaceComplexity || "unknown",
              }
            : null
        )
      : getDefaultValidation()

    // For system design with no/minimal conversation, ensure validation reflects reality
    // (Blank design notes are handled in scoring logic, not here - we still want to analyze conversation if it exists)
    if (scenarioType === "system-design" && !preScreen.hasContent) {
      // Override default validation to reflect that nothing was discussed
      aiValidation.isCoherent = false
      aiValidation.responsesRelevant = false
      aiValidation.approachExplained = false
      aiValidation.approachQuality = "none"
      aiValidation.complexityDiscussed = false
      aiValidation.edgeCasesConsidered = false
      aiValidation.alternativesDiscussed = false
      aiValidation.communicationScore = 10 // Very low score for no communication
      aiValidation.questionsAsked = 0
      aiValidation.questionsAnswered = 0
    }

    // Step 2.5: AI Code Overlap Detection
    // Check if candidate blindly copied AI Partner suggestions
    const aiCodeOverlap = analyzeAICodeOverlap(code, partnerMessages)
    const hasBlindCopying = aiCodeOverlap.hasHighOverlap && !aiCodeOverlap.modificationsMade

    // Step 2.6: Structured Extraction from Transcript (BEFORE scoring)
    // Extract concrete evidence to ground scoring in actual quotes
    let extractedEvidence: ExtractedEvidence | undefined
    try {
      if (
        conversationTranscript &&
        Array.isArray(conversationTranscript) &&
        conversationTranscript.length > 0
      ) {
        const transcriptMessages = conversationTranscript.map(
          (msg: { type?: string; role?: string; message?: string; content?: string }) => ({
            role:
              msg.type === "user" || msg.role === "user" || msg.role === "candidate"
                ? ("user" as const)
                : ("interviewer" as const),
            content: msg.message || msg.content || "",
          })
        )

        extractedEvidence = await extractConversationEvidence(transcriptMessages, {
          title: scenarioTitle,
          optimalTimeComplexity: efficiencyMetrics?.optimalTimeComplexity || "O(n)",
          optimalSpaceComplexity: efficiencyMetrics?.optimalSpaceComplexity || "O(1)",
          criticalEdgeCases: ["empty input", "single element", "null values"],
        })

        logger.info("Structured extraction completed for scoring", {
          sessionId,
          approachExplained: extractedEvidence.approach.explained,
          complexityDiscussed: extractedEvidence.timeComplexity.mentioned,
          edgeCasesMentioned: extractedEvidence.edgeCases.mentionedByCandidate.length,
          selfCorrectedBugs: extractedEvidence.progression.selfCorrectedBugs,
          improvedAfterPrompt: extractedEvidence.progression.improvedAfterPrompt,
        })
      }
    } catch (error) {
      logger.warn("Structured extraction failed, continuing without evidence", { error, sessionId })
    }

    // Step 3: Calculate validated scores using algorithmic + AI signals + extracted evidence
    // Different scoring models for different scenario types
    const validatedScores = calculateValidatedScores(
      passRate,
      efficiencyMetrics,
      preScreen,
      aiValidation,
      scenarioType, // Pass scenario type for specialized scoring
      code, // Pass code/design notes for system design blank template detection
      extractedEvidence // NEW: Pass extracted evidence for grounded scoring
    )

    // Apply AI copying penalty if detected
    // If they blindly copied >70% of their code from AI, penalize understanding
    if (hasBlindCopying && scenarioType !== "system-design") {
      validatedScores.understanding = Math.min(
        validatedScores.understanding,
        Math.max(30, validatedScores.understanding - 25) // Cap at 30 or reduce by 25
      )
      logger.info("AI copying penalty applied", {
        sessionId,
        overlapPercentage: aiCodeOverlap.overlapPercentage,
        originalUnderstanding: validatedScores.understanding + 25,
        newUnderstanding: validatedScores.understanding,
      })
    }

    // Step 3.5: Phase-aware scoring penalties
    // Detect skipped phases and apply penalties for incomplete interview flow
    interface PhaseAnalysis {
      skippedPhases: string[]
      penalties: { phase: string; penalty: number; reason: string }[]
      totalPenalty: number
      submittedFromPhase: string
      incompleteFlow: boolean
    }

    const phaseAnalysis: PhaseAnalysis = {
      skippedPhases: [],
      penalties: [],
      totalPenalty: 0,
      submittedFromPhase: phaseTracking?.submittedFromPhase || "unknown",
      incompleteFlow: false,
    }

    if (phaseTracking && scenarioType !== "system-design") {
      // Detect skipped phases
      const tracker = phaseTracking.conversationTracker

      // 1. No discussion phase (jumped to coding without explaining approach)
      if (!tracker?.approachExplained && preScreen.candidateMessageCount > 0) {
        phaseAnalysis.skippedPhases.push("discussion")
        phaseAnalysis.penalties.push({
          phase: "discussion",
          penalty: 15,
          reason: "Did not explain approach before coding",
        })
        // Apply to communication score
        validatedScores.communication = Math.max(20, validatedScores.communication - 15)
      }

      // 2. No testing phase (submitted without running tests)
      if (!phaseTracking.testsRanBeforeSubmit) {
        phaseAnalysis.skippedPhases.push("testing")
        phaseAnalysis.penalties.push({
          phase: "testing",
          penalty: 10,
          reason: "Submitted without running tests",
        })
        // Apply to problem-solving score
        validatedScores.problemSolving = Math.max(20, validatedScores.problemSolving - 10)
      }

      // 3. No complexity discussion (tests passed but never discussed complexity)
      if (
        passRate >= 80 &&
        !tracker?.timeComplexityMentioned &&
        !aiValidation.complexityDiscussed
      ) {
        phaseAnalysis.skippedPhases.push("complexity_discussion")
        phaseAnalysis.penalties.push({
          phase: "complexity_discussion",
          penalty: 10,
          reason: "Did not discuss time/space complexity",
        })
        // Apply to understanding score
        validatedScores.understanding = Math.max(30, validatedScores.understanding - 10)
      }

      // 4. Heavy hint dependency (5+ hints)
      if (tracker?.hintsGiven >= 5) {
        phaseAnalysis.penalties.push({
          phase: "hints",
          penalty: 15,
          reason: `Used ${tracker.hintsGiven} hints - solution may not be independently derived`,
        })
        // Apply to understanding and problem-solving
        validatedScores.understanding = Math.max(30, validatedScores.understanding - 10)
        validatedScores.problemSolving = Math.max(30, validatedScores.problemSolving - 5)
      }

      // 5. Early/panic submission (from intro or early coding phase)
      if (
        phaseTracking.submittedFromPhase === "intro" ||
        (phaseTracking.submittedFromPhase === "coding" && !phaseTracking.testsRanBeforeSubmit)
      ) {
        phaseAnalysis.incompleteFlow = true
        phaseAnalysis.penalties.push({
          phase: "early_submission",
          penalty: 20,
          reason: "Submitted very early without completing interview flow",
        })
        // Apply to all scores
        validatedScores.understanding = Math.max(20, validatedScores.understanding - 10)
        validatedScores.problemSolving = Math.max(20, validatedScores.problemSolving - 10)
      }

      // Calculate total penalty
      phaseAnalysis.totalPenalty = phaseAnalysis.penalties.reduce((sum, p) => sum + p.penalty, 0)

      if (phaseAnalysis.penalties.length > 0) {
        logger.info("Phase-aware penalties applied", {
          sessionId,
          skippedPhases: phaseAnalysis.skippedPhases,
          penalties: phaseAnalysis.penalties,
          totalPenalty: phaseAnalysis.totalPenalty,
        })
      }
    }

    // Step 4: Apply score floors for correct solutions
    const algorithmicScores = applyScoreFloors(
      validatedScores,
      passRate,
      efficiencyMetrics?.efficiencyScore,
      aiValidation
    )

    // Step 5: Constitutional AI Score Critique
    // Now with extracted evidence for grounded critique
    const scoreCritique = await critiqueScores(algorithmicScores, {
      passRate,
      scenarioType: scenarioType || "dsa",
      aiValidation,
      codeCompleteness: code ? analyzeCodeCompleteness(code, language || "python") : undefined,
      hasBlindCopying,
      // NEW: Pass extracted evidence for grounded critique
      extractedEvidence,
      problemContext: {
        title: scenarioTitle,
        optimalTimeComplexity: efficiencyMetrics?.optimalTimeComplexity || "O(n)",
        optimalSpaceComplexity: efficiencyMetrics?.optimalSpaceComplexity || "O(1)",
      },
    })

    // Use adjusted scores if critique made changes
    const finalScores =
      scoreCritique.madeChanges && scoreCritique.adjustedScores
        ? scoreCritique.adjustedScores
        : algorithmicScores

    // Send validated summary to AI for narrative generation
    const conversationSummary = `
COMMUNICATION ANALYSIS (hybrid validated):
- Coherent responses: ${aiValidation.isCoherent ? "YES" : "NO - possible gibberish detected"}
- Responses relevant to questions: ${aiValidation.responsesRelevant ? "YES" : "NO"}
- Approach explained: ${aiValidation.approachExplained ? `YES (${aiValidation.approachQuality})` : "NO"}
- Complexity discussed: ${aiValidation.complexityDiscussed ? "YES" : "NO"}
- Complexity accurate: ${aiValidation.complexityAccurate ? "YES" : "NO - stated: " + (aiValidation.statedComplexity || "none")}
- Edge cases considered: ${aiValidation.edgeCasesConsidered ? "YES" : "NO"}
- Alternatives discussed: ${aiValidation.alternativesDiscussed ? "YES" : "NO"}
- Questions answered: ${aiValidation.questionsAnswered}/${aiValidation.questionsAsked}
- Communication score: ${aiValidation.communicationScore}/100
- Total candidate messages: ${preScreen.candidateMessageCount}
${
  phaseAnalysis.skippedPhases.length > 0
    ? `
INTERVIEW FLOW ISSUES (penalties already applied to scores):
- Submitted from phase: ${phaseAnalysis.submittedFromPhase}
- Skipped phases: ${phaseAnalysis.skippedPhases.join(", ")}
${phaseAnalysis.penalties.map((p) => `- ${p.reason} (-${p.penalty} points)`).join("\n")}
${phaseAnalysis.incompleteFlow ? "⚠️ INCOMPLETE INTERVIEW FLOW - candidate did not complete the standard interview process" : ""}

CRITICAL: In "Fix Next", mention the skipped phases:
${phaseAnalysis.skippedPhases.includes("discussion") ? '- "EXPLAIN YOUR APPROACH before coding - interviewers need to understand your thought process"' : ""}
${phaseAnalysis.skippedPhases.includes("testing") ? '- "RUN TESTS before submitting - verify your solution works"' : ""}
${phaseAnalysis.skippedPhases.includes("complexity_discussion") ? '- "DISCUSS COMPLEXITY after solving - explain time/space trade-offs"' : ""}
`
    : ""
}
${
  extractedEvidence
    ? `
EXTRACTED EVIDENCE (ground your feedback in these facts):
${buildEvidenceSummary(extractedEvidence)}

CRITICAL: Your feedback must be consistent with the extracted evidence above.
- If evidence shows they mentioned edge cases, DO NOT say "didn't mention edge cases"
- If evidence shows they discussed complexity, DO NOT say "didn't discuss complexity"
- Quote specific examples from the evidence when giving feedback
`
    : ""
}

PRE-CALCULATED SCORES (use these as your scores):
${
  scenarioType === "system-design"
    ? `- Requirements: ${finalScores.understanding}/100
- Architecture: ${finalScores.problemSolving}/100
- Scalability: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
    : scenarioType === "bugfix"
      ? `- Bug Found: ${finalScores.understanding}/100
- Root Cause: ${finalScores.problemSolving}/100
- Fix Quality: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
      : `- Understanding: ${finalScores.understanding}/100
- Problem-Solving: ${finalScores.problemSolving}/100
- Code Quality: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
}
- Overall: ${finalScores.overall}/100
`

    // Build scenario-specific prompt
    const buildPrompt = () => {
      const baseInfo = `PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType.toUpperCase()})` : ""}
${timeInfo}
${conversationSummary}`

      if (scenarioType === "system-design") {
        // System design: focus on discussion, not code
        const hasDiscussion = preScreen.candidateMessageCount > 0
        const hasMinimalDiscussion =
          preScreen.candidateMessageCount > 0 && preScreen.candidateMessageCount < 3
        const hasBlankNotes = code ? isBlankDesignTemplate(code) : true

        // Determine engagement level for AI context
        let engagementContext: string
        if (!hasDiscussion && hasBlankNotes) {
          engagementContext = `
⚠️ ZERO ENGAGEMENT DETECTED ⚠️
- Candidate messages: 0
- Design notes: BLANK (only template placeholders)
- This is a FAILED submission - they did not participate at all
- Your feedback MUST reflect this: be direct that they typed nothing and engaged with nothing
- Do NOT fabricate any positives - there is nothing to praise`
        } else if (hasBlankNotes) {
          engagementContext = `
⚠️ MINIMAL ENGAGEMENT - BLANK DESIGN NOTES ⚠️
- Candidate messages: ${preScreen.candidateMessageCount}
- Design notes: BLANK (only template placeholders, no actual design written)
- They may have said a few words but did NOT document any design
- This is a failing submission - be direct about the lack of written design work`
        } else if (!hasDiscussion || hasMinimalDiscussion) {
          engagementContext = `
⚠️ MINIMAL CONVERSATION ⚠️
- Candidate messages: ${preScreen.candidateMessageCount}
- They wrote some design notes but barely discussed with the interviewer
- System design interviews REQUIRE active discussion - call this out`
        } else {
          engagementContext = `
✓ Normal engagement level
- Candidate messages: ${preScreen.candidateMessageCount}
- Average message length: ${Math.round(preScreen.avgMessageLength)} chars
- Has design content: YES`
        }

        return `Generate system design interview feedback using the pre-calculated scores below.

${baseInfo}

${engagementContext}

DESIGN NOTES SUBMITTED:
\`\`\`
${
  code && code.trim()
    ? code.length > 1500
      ? code.slice(0, 1500) + "\n// ... [truncated]"
      : code
    : "[EMPTY - No design notes provided]"
}
\`\`\`

CRITICAL INSTRUCTIONS:
- Use the PRE-CALCULATED SCORES above exactly - they reflect what actually happened
- If overall score < 20: This is a FAILED submission. Be blunt: "You submitted without doing anything" / "Zero participation"
- If overall score 20-30: They barely tried. Call out the specific failures (no discussion, blank template, etc.)
- "What Worked" for empty submissions: ONLY say "The candidate opened the design problem" - nothing more
- "Fix Next" for empty submissions: Lead with "You must actually ENGAGE in system design interviews"
- Do NOT invent positives that don't exist. If they didn't discuss requirements, don't say they "showed potential"
- Be a tough but fair interviewer - call out non-participation directly`
      }

      if (scenarioType === "bugfix") {
        // Bug fix: focus on debugging process
        return `Generate bug fix interview feedback using the pre-calculated scores below.

${baseInfo}
${testResultsSummary}

CANDIDATE'S FIX:
\`\`\`${language || "javascript"}
${code.length > 2000 ? code.slice(0, 2000) + "\n// ... [truncated]" : code}
\`\`\`
${
  testResults && testResults.filter((t: any) => !t.passed).length > 0
    ? `
REMAINING ISSUES (first 3):
${testResults
  .filter((t: any) => !t.passed)
  .slice(0, 3)
  .map(
    (t: any) =>
      `- ${t.description}: expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(t.actual)}`
  )
  .join("\n")}
`
    : ""
}

IMPORTANT:
- Evaluate the DEBUGGING PROCESS, not just whether the fix works
- Use the PRE-CALCULATED SCORES above exactly
- Focus on: bug identification, root cause analysis, fix quality, communication`
      }

      // Default DSA prompt - analyze code completeness first
      const codeAnalysis = code
        ? analyzeCodeCompleteness(code, language || "python")
        : {
            isIncomplete: true,
            reason: "No code submitted",
            hasBaseCase: false,
            hasActualLogic: false,
            stubPatterns: ["empty"],
          }

      // Build completeness context for AI
      let completenessContext = ""
      if (codeAnalysis.isIncomplete) {
        completenessContext = `
⚠️ INCOMPLETE SOLUTION DETECTED ⚠️
- Reason: ${codeAnalysis.reason}
- Has base case only: ${codeAnalysis.hasBaseCase ? "YES" : "NO"}
- Has actual algorithm logic: ${codeAnalysis.hasActualLogic ? "YES" : "NO"}
${codeAnalysis.stubPatterns.length > 0 ? `- Stub patterns found: ${codeAnalysis.stubPatterns.join(", ")}` : ""}
- This is a FAILING submission - the solution is not complete
- Your feedback MUST reflect this: be direct that they only wrote edge case handling, no actual solution
- Do NOT praise complexity or efficiency - there is no working algorithm to analyze
- "What Worked" should ONLY mention "Identified the base case" at most
`
      } else if (passRate < 30) {
        completenessContext = `
⚠️ LOW PASS RATE (${Math.round(passRate)}%) ⚠️
- Most tests are failing
- Focus on what's broken, not minor positives
- Do NOT mention "optimal complexity" if the solution doesn't work
`
      } else if (passRate < 50) {
        completenessContext = `
⚠️ PARTIAL SOLUTION (${Math.round(passRate)}% passing) ⚠️
- Less than half of tests pass
- Lead with fixing failures before praising what works
`
      }

      return `Generate interview feedback narrative using the pre-calculated scores below.

${baseInfo}
${testResultsSummary}
${efficiencyInfo}
${completenessContext}

SOLUTION CODE:
\`\`\`${language || "javascript"}
${code.length > 2000 ? code.slice(0, 2000) + "\n// ... [truncated]" : code}
\`\`\`
${
  testResults && testResults.filter((t: any) => !t.passed).length > 0
    ? `
FAILED TESTS (first 3):
${testResults
  .filter((t: any) => !t.passed)
  .slice(0, 3)
  .map(
    (t: any) =>
      `- ${t.description}: expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(t.actual)}`
  )
  .join("\n")}
`
    : ""
}

CRITICAL INSTRUCTIONS:
- Use the PRE-CALCULATED SCORES above exactly - they reflect what actually happened
- If "INCOMPLETE SOLUTION DETECTED" above: Be blunt that the solution is not complete. Do NOT fabricate positives.
- If pass rate < 50%: Lead with failures, minimize "What Worked"
- NEVER say "optimal complexity achieved" for incomplete or failing solutions
- A base case check (like null check) is NOT praiseworthy - it's the minimum everyone writes
- Be a tough but fair interviewer - honesty helps candidates improve`
    }

    const prompt = buildPrompt()

    // Build RAG-enhanced context for better feedback (non-blocking)
    // Maps scenario type to ScenarioType for context builder
    const ragScenarioType =
      scenarioType === "bugfix"
        ? "bugfix"
        : scenarioType === "system-design"
          ? "system-design"
          : "dsa"

    let ragFeedbackContext = ""
    try {
      ragFeedbackContext = await buildRAGFeedbackContext({
        problemText: scenarioTitle || "",
        userCode: code || "",
        testResults: { passed: testsPassed, total: testsTotal },
        scenarioPattern: efficiencyMetrics?.problemPattern, // Pattern from efficiency analysis
        scenarioType: ragScenarioType, // Use knowledge base specific to scenario type
        difficulty: efficiencyMetrics?.difficulty as "easy" | "medium" | "hard",
        userId,
      })
    } catch (error) {
      logger.warn("[Feedback API] RAG context failed, continuing without", { error })
    }

    // Combine system instruction with RAG context
    const enhancedSystemInstruction = ragFeedbackContext
      ? systemInstruction + "\n\n" + ragFeedbackContext
      : systemInstruction

    // Use AI provider abstraction for narrative feedback only
    const aiResponse = await generateFeedbackResponse(
      enhancedSystemInstruction,
      prompt,
      [], // No history needed for feedback
      { userId, sessionId, scenarioId } // Pass for usage tracking
    )

    const feedback = aiResponse.text

    // Step 6: Constitutional AI Feedback Critique
    const feedbackCritique = await critiqueFeedbackText(feedback, finalScores, {
      passRate,
      scenarioType: scenarioType || "dsa",
      isIncomplete: code ? analyzeCodeCompleteness(code, language || "python").isIncomplete : false,
    })

    // Use revised feedback if critique made changes
    const rawFinalFeedback =
      feedbackCritique.madeChanges && feedbackCritique.revisedFeedback
        ? feedbackCritique.revisedFeedback
        : feedback

    // CRITICAL: Inject authoritative scores into feedback text
    // This ensures the Score Snapshot section in the feedback text always matches
    // the algorithmically calculated scores, preventing discrepancies between
    // post-interview modal (uses API scores) and session details (may parse feedback text)
    const feedbackWithScores = injectScoresIntoFeedback(rawFinalFeedback, finalScores, scenarioType)

    // Sanitize feedback to remove contradictory criticism
    // e.g., remove "EXPLAIN YOUR APPROACH" if communication score >= 60
    const finalFeedback = sanitizeFeedbackForScoreConsistency(feedbackWithScores, finalScores)

    // USE FINAL SCORES as primary (after Constitutional AI review)
    // AI-generated narrative is just for user-facing feedback text
    const scores: FeedbackScores = {
      understanding: finalScores.understanding,
      problemSolving: finalScores.problemSolving,
      codeQuality: finalScores.codeQuality,
      communication: finalScores.communication,
      // Legacy scores for backward compatibility
      correctness: finalScores.codeQuality,
      efficiency: efficiencyMetrics?.efficiencyScore || 50,
      reasoningExplanation: finalScores.communication,
      aiCollaboration: collaborationMessages > 0 ? 70 : 50,
      overall: finalScores.overall,
    }

    // Parse structured sections from AI narrative (use final critiqued feedback)
    const sections = parseFeedbackSections(finalFeedback)

    // Build structured response
    const structuredFeedback: StructuredFeedback = {
      scores,
      tldr: sections.tldr || "Feedback generated successfully.",
      whatWorked: sections.whatWorked || [],
      fixNext: sections.fixNext || [],
      actionPlan: sections.actionPlan || [],
      aiWatchlist: sections.aiWatchlist || "No watchlist items captured.",
      rawFeedback: finalFeedback,
    }

    // Track feedback generation
    const durationMinutes = Math.round((Date.now() - startTime) / 60000)
    if (sessionId) {
      trackFeedbackGenerationServer({
        sessionId,
        userId,
        scenarioType: scenarioType || "unknown",
        performanceScore: scores.overall,
        durationMinutes,
      }).catch((err) => logger.error("Analytics tracking error", { error: err }))
    }

    // Calculate mastery score (technical score) for all requests
    // Technical score = Mastery score = objective metrics without communication
    // This is returned to the frontend for the Overall/Technical toggle
    const difficulty = (scenarioDifficulty || efficiencyMetrics?.difficulty || "medium") as
      | "easy"
      | "medium"
      | "hard"
    // Use extracted evidence for more accurate hint count if available
    const hintsUsedActual =
      extractedEvidence?.hints.totalGiven ?? interactionMetrics?.hintsUsed ?? 0
    let masteryScoreForResponse = calculateMasteryScore({
      testCasesPassed: testsPassed,
      testCasesTotal: testsTotal,
      timeSpentMinutes: timeSpent ? Math.round(timeSpent / 60) : 0,
      hintsUsed: hintsUsedActual,
      hintsTotal: 5,
      problemDifficulty: difficulty as Difficulty,
      approachExplained: extractedEvidence?.approach.explained ?? aiValidation.approachExplained,
      complexityDiscussed:
        extractedEvidence?.timeComplexity.mentioned ?? aiValidation.complexityDiscussed,
      interviewerMessagesCount: aiValidation.questionsAsked || 0,
    })

    // CRITICAL: When tests all pass, mastery should be >= overall
    // Philosophy: If you solved the problem correctly, your "code knowledge" (mastery)
    // should not be lower than your "interview performance" (overall)
    // This prevents confusing situations where you get 100% tests but mastery < overall
    if (testsTotal > 0 && testsPassed === testsTotal) {
      if (masteryScoreForResponse.masteryScore < scores.overall) {
        // Boost mastery to match overall when all tests pass
        masteryScoreForResponse = {
          ...masteryScoreForResponse,
          masteryScore: scores.overall,
        }
        logger.info("Mastery score boosted to match overall (100% pass rate)", {
          originalMastery: masteryScoreForResponse.masteryScore,
          boostedTo: scores.overall,
        })
      }
    }

    // Update learning state for spaced repetition email reminders
    // Also update problem-level mastery for enhanced SM-2 spaced repetition
    // Use scenarioId (e.g., 'dsa-two-sum') for spaced repetition tracking, not sessionId (Firebase session UUID)
    if (userId && scenarioTitle && scenarioId) {
      try {
        // Use canonical values from frontend, with fallbacks
        const pattern = (scenarioPattern ||
          efficiencyMetrics?.problemPattern ||
          "arrays-hashing") as DSAPattern
        const difficulty = (scenarioDifficulty || efficiencyMetrics?.difficulty || "medium") as
          | "easy"
          | "medium"
          | "hard"

        // Calculate mastery score (technical proficiency only, excludes communication)
        // This is critical for spaced repetition - we need to measure code mastery, not interview skills
        // Use extracted evidence when available for accurate hint/approach tracking
        const masteryScoreResult = calculateMasteryScore({
          testCasesPassed: testsPassed,
          testCasesTotal: testsTotal,
          timeSpentMinutes: timeSpent ? Math.round(timeSpent / 60) : 0,
          hintsUsed: hintsUsedActual,
          hintsTotal: 5, // Standard hint limit
          problemDifficulty: difficulty as Difficulty,
          approachExplained:
            extractedEvidence?.approach.explained ?? aiValidation.approachExplained,
          complexityDiscussed:
            extractedEvidence?.timeComplexity.mentioned ?? aiValidation.complexityDiscussed,
          interviewerMessagesCount: aiValidation.questionsAsked || 0,
        })

        logger.info("SR update starting", {
          userId,
          scenarioId,
          scenarioTitle,
          pattern,
          difficulty,
          performanceScore: scores.overall,
          masteryScore: masteryScoreResult.masteryScore,
          scoreDifference: scores.overall - masteryScoreResult.masteryScore,
        })

        // Update both topic-level (legacy) and problem-level mastery
        // CRITICAL: Pass BOTH performance score (interview) AND mastery score (technical)
        await completeSessionWithMastery(userId, {
          scenarioId: scenarioId,
          title: scenarioTitle,
          pattern,
          difficulty,
          performanceScore: scores.overall, // Full interview score (includes communication 20%)
          masteryScore: masteryScoreResult.masteryScore, // Technical-only score for SR algorithm
          timeSpentMinutes: timeSpent ? Math.round(timeSpent / 60) : undefined,
          hintsUsed: interactionMetrics?.hintsUsed || 0,
          completedAt: new Date().toISOString(),
        })

        logger.info("SR update completed successfully", { userId, scenarioId })
      } catch (err) {
        // Non-blocking - don't fail feedback if learning state update fails
        logger.error("Learning state update error", {
          error: err,
          userId,
          scenarioId,
          scenarioTitle,
        })
      }
    } else {
      // Log why SR update was skipped
      logger.warn("SR update skipped - missing required fields", {
        hasUserId: !!userId,
        hasScenarioTitle: !!scenarioTitle,
        hasScenarioId: !!scenarioId,
        userId: userId || "missing",
        scenarioId: scenarioId || "missing",
        scenarioTitle: scenarioTitle || "missing",
      })
    }

    // Store solution in RAG vector store for future similarity matching
    if (userId && sessionId && code) {
      try {
        await embedAndStoreSolution(userId, sessionId, code, {
          problemTitle: scenarioTitle,
          language: language || "javascript",
          passed: scores.overall >= 70,
          score: scores.overall,
          problemType: scenarioType || "dsa",
        })
      } catch (err) {
        // Non-blocking - don't fail feedback if RAG storage fails
        logger.error("RAG solution storage error", { error: err })
      }
    }

    // Analyze code for misconceptions and track them (non-blocking)
    // Only analyze DSA problems where we can detect pattern-specific errors
    if (
      userId &&
      code &&
      scenarioType === "dsa" &&
      (scenarioPattern || efficiencyMetrics?.problemPattern)
    ) {
      try {
        const pattern = (scenarioPattern || efficiencyMetrics?.problemPattern) as DSAPattern
        await analyzeAndTrackMisconceptions(userId, code, pattern, {
          passed: testsPassed,
          total: testsTotal,
          failingTests:
            testResults
              ?.filter((t: any) => !t.passed)
              ?.slice(0, 5)
              ?.map(
                (t: any) =>
                  `${t.description}: expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(t.actual)}`
              ) || [],
        })
      } catch (err) {
        // Non-blocking - don't fail feedback if misconception analysis fails
        logger.error("Misconception analysis error", { error: err })
      }
    }

    return NextResponse.json({
      feedback: finalFeedback,
      performanceScore: scores.overall,
      technicalScore: masteryScoreForResponse.masteryScore, // Technical = Mastery (objective metrics)
      scores: scores, // Full score breakdown
      structured: structuredFeedback, // Full structured data
      // Flags for frontend warnings
      silentSolution: algorithmicScores.silentSolution || false, // True if solved correctly but didn't explain approach
      incompleteSolution: code
        ? analyzeCodeCompleteness(code, language || "python").isIncomplete
        : false,
      aiCopyingDetected: hasBlindCopying, // True if >70% code copied from AI Partner
      aiOverlapPercentage: aiCodeOverlap.overlapPercentage, // How much code matches AI suggestions
      // Phase-aware scoring flags
      phaseAnalysis:
        phaseAnalysis.skippedPhases.length > 0 || phaseAnalysis.incompleteFlow
          ? {
              submittedFromPhase: phaseAnalysis.submittedFromPhase,
              skippedPhases: phaseAnalysis.skippedPhases,
              penalties: phaseAnalysis.penalties,
              totalPenalty: phaseAnalysis.totalPenalty,
              incompleteFlow: phaseAnalysis.incompleteFlow,
            }
          : undefined,
      // Constitutional AI critique metadata (only if changes were made)
      ...(scoreCritique.madeChanges || feedbackCritique.madeChanges
        ? {
            constitutionalAICritique: {
              scoreCritique: scoreCritique.madeChanges
                ? {
                    critiques: scoreCritique.critiques,
                    reasoning: scoreCritique.reasoning,
                    originalScores: {
                      understanding: algorithmicScores.understanding,
                      problemSolving: algorithmicScores.problemSolving,
                      codeQuality: algorithmicScores.codeQuality,
                      communication: algorithmicScores.communication,
                      overall: algorithmicScores.overall,
                    },
                    adjustedScores: scoreCritique.adjustedScores,
                  }
                : null,
              feedbackCritique: feedbackCritique.madeChanges
                ? {
                    critiques: feedbackCritique.critiques,
                    reasoning: feedbackCritique.reasoning,
                  }
                : null,
            },
          }
        : {}),
      provider: aiResponse.provider,
      latencyMs: aiResponse.latencyMs,
    })
  } catch (error) {
    logger.error("Feedback generation error", { error, endpoint: "/api/generate-feedback" })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate feedback" },
      { status: 500 }
    )
  }
}
