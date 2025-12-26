import { NextRequest, NextResponse } from "next/server"
import { chatRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { generateAIResponse, validateResponseRelevance, type TaskComplexity } from "@/lib/ai-providers"
import { trackAIChatServer } from "@/lib/analytics-server"
import { getCompanyStyle, getPatternMetadata, type DSAPattern } from "@/lib/types/dsa-patterns"
import { logger } from "@/lib/logger"
import { buildHintContext, buildFeedbackContext } from "@/lib/rag/context-builder"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import { getCompanyInterviewKnowledge } from "@/lib/rag/knowledge-base/company-knowledge"
import type { CompanyId } from "@/lib/data/company-questions/types"

interface UserContext {
  email?: string
  full_name?: string
  subscription_tier?: string
  sessions_used?: number
  previous_topics?: string[]
  skill_level?: string
}

// Context window management constants
const MAX_HISTORY_MESSAGES = 20 // Keep last 20 messages
const MAX_MESSAGE_LENGTH = 4000 // Truncate individual messages
const MAX_WORKSPACE_FILES = 5 // Limit workspace files
const MAX_FILE_SIZE = 10000 // 10KB per file max

/**
 * Sliding window for conversation history
 * Keeps most recent messages, summarizes old ones if needed
 */
function manageContextWindow(
  context: Array<{ type: string; message: string }>,
  maxMessages: number = MAX_HISTORY_MESSAGES
): Array<{ type: string; message: string }> {
  if (!context || !Array.isArray(context)) return []

  // If within limits, return as-is
  if (context.length <= maxMessages) {
    return context.map(msg => ({
      ...msg,
      message: msg.message.length > MAX_MESSAGE_LENGTH
        ? msg.message.slice(0, MAX_MESSAGE_LENGTH) + '... [truncated]'
        : msg.message
    }))
  }

  // Keep first message (usually greeting) and last N-1 messages
  const firstMessage = context[0]
  const recentMessages = context.slice(-(maxMessages - 1))

  // Create summary of dropped messages
  const droppedCount = context.length - maxMessages
  const summaryMessage = {
    type: 'model',
    message: `[Previous ${droppedCount} messages summarized for context management]`
  }

  return [
    {
      ...firstMessage,
      message: firstMessage.message.length > MAX_MESSAGE_LENGTH
        ? firstMessage.message.slice(0, MAX_MESSAGE_LENGTH) + '... [truncated]'
        : firstMessage.message
    },
    summaryMessage,
    ...recentMessages.map(msg => ({
      ...msg,
      message: msg.message.length > MAX_MESSAGE_LENGTH
        ? msg.message.slice(0, MAX_MESSAGE_LENGTH) + '... [truncated]'
        : msg.message
    }))
  ]
}

/**
 * Manage workspace context size
 */
function manageWorkspaceContext(
  workspaceContext: Array<{ path: string; content: string }>,
  maxFiles: number = MAX_WORKSPACE_FILES,
  maxFileSize: number = MAX_FILE_SIZE
): Array<{ path: string; content: string }> {
  if (!workspaceContext || !Array.isArray(workspaceContext)) return []

  // Take only the most relevant files (first N)
  const limitedFiles = workspaceContext.slice(0, maxFiles)

  // Truncate large files
  return limitedFiles.map(file => ({
    path: file.path,
    content: file.content.length > maxFileSize
      ? file.content.slice(0, maxFileSize) + '\n// ... [file truncated for context management]'
      : file.content
  }))
}

/**
 * Build RAG-enhanced context for the AI partner role
 * Retrieves relevant patterns, hints, and knowledge from the RAG system
 */
async function buildRAGContext(options: {
  scenarioTitle?: string
  scenarioPattern?: string
  scenarioCompany?: string
  scenarioType?: string
  problemText?: string
  userCode?: string
  userId?: string
}): Promise<string> {
  const ragContextParts: string[] = []

  try {
    // 1. Get pattern-specific knowledge if pattern is known
    if (options.scenarioPattern) {
      const patternKnowledge = getPatternKnowledge(options.scenarioPattern as DSAPattern)
      if (patternKnowledge) {
        ragContextParts.push(`
## Pattern Knowledge: ${patternKnowledge.displayName}

### When to Use
${patternKnowledge.whenToUse.slice(0, 3).map(w => `- ${w}`).join('\n')}

### Key Insights
${patternKnowledge.keyInsights.slice(0, 3).map(i => `- ${i}`).join('\n')}

### Common Mistakes to Avoid
${patternKnowledge.commonMistakes.slice(0, 2).map(m => `- ${m}`).join('\n')}

### Expected Complexity
- Time: ${patternKnowledge.timeComplexity.typical}
- Space: ${patternKnowledge.spaceComplexity.typical}
`)
      }
    }

    // 2. Get company-specific interview knowledge
    if (options.scenarioCompany && options.scenarioCompany !== 'Generic') {
      const companyKnowledge = getCompanyInterviewKnowledge(options.scenarioCompany as CompanyId)
      if (companyKnowledge) {
        ragContextParts.push(`
## ${companyKnowledge.companyName} Interview Tips

### Interview Style
${companyKnowledge.interviewStyle.description}
Pace: ${companyKnowledge.interviewStyle.pace}
Expectations: ${companyKnowledge.interviewStyle.expectations.slice(0, 3).map(e => `- ${e}`).join('\n')}

### Focus Areas
${companyKnowledge.topPatterns.slice(0, 4).map(p => `- ${p.pattern}`).join('\n')}

### What They Value
${companyKnowledge.cultureTips.slice(0, 2).map(t => `- ${t}`).join('\n')}
`)
      }
    }

    // 3. Build hint context from RAG if we have problem text
    if (options.problemText && options.problemText.length > 20) {
      const hintContext = await buildHintContext({
        problemText: options.problemText,
        problemPattern: options.scenarioPattern as DSAPattern,
        userCode: options.userCode,
        userId: options.userId,
      })

      if (hintContext.retrievedDocs.length > 0) {
        ragContextParts.push(`
## Relevant Knowledge from RAG (${hintContext.retrievedDocs.length} documents)

${hintContext.retrievedDocs.slice(0, 2).map((doc, i) => `
### Reference ${i + 1}
${doc.text.substring(0, 400)}${doc.text.length > 400 ? '...' : ''}
`).join('\n')}
`)
      }
    }
  } catch (error) {
    // RAG errors should not break the chat - log and continue
    logger.error('[Chat API] RAG context build error', { error })
  }

  if (ragContextParts.length === 0) {
    return ''
  }

  return `
=== RAG-ENHANCED CONTEXT ===
${ragContextParts.join('\n')}
=== END RAG CONTEXT ===
`
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await chatRateLimit(request)
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
    const { message, context, role, userContext, workspaceContext, currentCode, isProactive, scenarioTitle, scenarioType, scenarioPattern, scenarioCompany, elapsedTime, sessionId, userId } = await request.json()

    // For proactive messages (interviewer jumping in), message might be empty
    if (!message && !isProactive) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Build user context string for personalized responses
    const userInfo = userContext as UserContext
    // Extract first name or last name from full_name or email
    let userName = "there"
    if (userInfo?.full_name) {
      const nameParts = userInfo.full_name.trim().split(/\s+/)
      // Use first name if available, otherwise use last name
      userName = nameParts[0] || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "")
    } else if (userInfo?.email) {
      const emailName = userInfo.email.split("@")[0]
      const nameParts = emailName.split(".")
      if (nameParts.length > 0) {
        userName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
      }
    }

    const userContextString = userInfo
      ? `
CANDIDATE INFORMATION:
- Name: ${userName} (use first name or last name only, never full name)
- Email: ${userInfo.email || "Guest User"}
- Subscription: ${userInfo.subscription_tier || "free"} tier
- Sessions completed: ${userInfo.sessions_used || 0}
- Previous topics: ${userInfo.previous_topics?.join(", ") || "None"}
- Skill level: ${userInfo.skill_level || "Intermediate"}

IMPORTANT: When referencing the candidate, use their first name or last name only (e.g., "John" or "Smith"), never their full name. Keep it casual and professional.
`
      : ""

    // Manage workspace context with sliding window
    const managedWorkspace = manageWorkspaceContext(workspaceContext)
    let workspaceContextStr = ""
    if (managedWorkspace.length > 0) {
      workspaceContextStr = "\n\n=== USER'S CODEBASE CONTEXT ===\n"
      managedWorkspace.forEach((file) => {
        workspaceContextStr += `\n--- File: ${file.path} ---\n${file.content}\n`
      })
      workspaceContextStr += "\n=== END CODEBASE CONTEXT ===\n"
    }

    // Add current code context (truncate if too long)
    let currentCodeContext = ""
    if (currentCode && currentCode.trim()) {
      const truncatedCode = currentCode.length > MAX_FILE_SIZE
        ? currentCode.slice(0, MAX_FILE_SIZE) + '\n// ... [code truncated]'
        : currentCode
      currentCodeContext = `\n\n=== CURRENT SOLUTION CODE ===\n${truncatedCode}\n=== END CURRENT CODE ===\n`
    }

    // Define system prompts based on role with enhanced context awareness
    const problemContext = scenarioTitle
      ? `\n\nCURRENT PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType.toUpperCase()})` : ''}\n`
      : ''

    // Get company-specific interview style
    const companyStyle = getCompanyStyle(scenarioCompany || 'Generic')

    // Get pattern-specific metadata for DSA problems
    const patternMeta = scenarioPattern ? getPatternMetadata(scenarioPattern as DSAPattern) : null

    // Build company-specific context - handle Generic case (no specific company)
    const isGenericCompany = !companyStyle.company || companyStyle.company === 'Generic'
    const companyContext = isGenericCompany ? `
INTERVIEW STYLE: ${companyStyle.style}
YOU ARE: A professional technical interviewer conducting a coding interview. Do NOT mention any specific company name.

FOCUS AREAS: ${companyStyle.focusAreas.join(', ')}
EVALUATION EMPHASIS: ${companyStyle.evaluationEmphasis.join(', ')}
PERSONALITY: ${companyStyle.interviewerPersonality}
` : `
COMPANY: ${companyStyle.company}
INTERVIEW STYLE: ${companyStyle.style}
YOU ARE: A ${companyStyle.company} interviewer conducting a technical interview.
Mention you're interviewing for ${companyStyle.company} in your first response.

FOCUS AREAS: ${companyStyle.focusAreas.join(', ')}
EVALUATION EMPHASIS: ${companyStyle.evaluationEmphasis.join(', ')}
PERSONALITY: ${companyStyle.interviewerPersonality}
`

    // Build pattern-specific context for DSA problems
    const patternContext = patternMeta ? `
PROBLEM PATTERN: ${patternMeta.name}
KEY TECHNIQUES: ${patternMeta.keyTechniques.join(', ')}
EXPECTED COMPLEXITY: Time ${patternMeta.timeComplexityHints[0]}, Space ${patternMeta.spaceComplexityHints[0]}
PATTERN-SPECIFIC FOLLOW-UPS TO ASK:
${patternMeta.interviewerFollowUps.slice(0, 3).map(q => `- ${q}`).join('\n')}
` : ''

    // Build system design specific context with phase-based guidance
    const isSystemDesign = scenarioType === 'system-design'
    const elapsedMinutes = elapsedTime ? Math.floor(elapsedTime / 60) : 0

    // System design interviews should follow 4 phases (~45 min total)
    const getSystemDesignPhase = (minutes: number) => {
      if (minutes < 10) return 'requirements' // Phase 1: Requirements gathering
      if (minutes < 20) return 'high-level' // Phase 2: High-level design
      if (minutes < 35) return 'deep-dive' // Phase 3: Deep dive
      return 'wrap-up' // Phase 4: Bottlenecks & wrap-up
    }

    const systemDesignPhase = isSystemDesign ? getSystemDesignPhase(elapsedMinutes) : null

    const systemDesignContext = isSystemDesign ? `
INTERVIEW TYPE: System Design (Architecture Discussion - NOT a coding interview)

CURRENT PHASE: ${systemDesignPhase?.toUpperCase()} (${elapsedMinutes} min elapsed)

PHASE GUIDANCE:
${systemDesignPhase === 'requirements' ? `
REQUIREMENTS PHASE (0-10 min):
- Ask clarifying questions about scope and scale
- Help candidate define functional requirements (what the system must do)
- Help candidate define non-functional requirements (latency, availability, scale)
- Ask: "How many users?" "What's the expected traffic?" "What's more important: consistency or availability?"
- DON'T jump into architecture yet - requirements first!
` : ''}
${systemDesignPhase === 'high-level' ? `
HIGH-LEVEL DESIGN PHASE (10-20 min):
- Guide candidate to draw the major components
- Ask about API design: "What endpoints do we need?"
- Ask about data model: "What entities do we need to store?"
- Ask about communication: "How will components communicate?"
- Encourage thinking out loud about architectural choices
` : ''}
${systemDesignPhase === 'deep-dive' ? `
DEEP DIVE PHASE (20-35 min):
- Pick 1-2 components to explore deeply
- Ask about scaling: "What happens at 10x traffic?"
- Ask about failure modes: "What if this component fails?"
- Discuss trade-offs: "Why did you choose X over Y?"
- Probe on specific algorithms or data structures for key components
` : ''}
${systemDesignPhase === 'wrap-up' ? `
WRAP-UP PHASE (35-45 min):
- Ask about single points of failure
- Discuss monitoring and observability
- Ask about security considerations
- Summarize the design and discuss improvements
- Ask: "What would you do differently with more time?"
` : ''}

SYSTEM DESIGN EVALUATION CRITERIA:
- Requirements Gathering: Did they ask good clarifying questions?
- Architecture: Did they propose a clear, logical system design?
- Scalability: Did they address how to handle increased load?
- Trade-offs: Did they discuss pros/cons of their choices?
- Communication: Did they explain their thinking clearly?

SYSTEM DESIGN SPECIFIC RULES:
- This is a DISCUSSION, not a coding exercise
- There is NO "correct answer" - evaluate reasoning and trade-offs
- Ask open-ended questions to understand their thinking
- Guide them through phases naturally based on elapsed time
- Focus on WHY they make decisions, not just WHAT they propose
- Encourage them to think about scale (millions of users, TB of data)
- Ask about failure scenarios and edge cases
` : ''

    // Build bug fix specific context
    const isBugFix = scenarioType === 'bugfix'
    const bugFixContext = isBugFix ? `
INTERVIEW TYPE: Bug Fix / Debugging Interview

THIS IS A DEBUGGING EXERCISE - Focus on:
1. Understanding the bug: Ask them to explain what the bug is
2. Debugging approach: How are they finding the issue?
3. Root cause analysis: Do they understand WHY it happens?
4. Fix quality: Is the fix correct and complete?
5. Prevention: How to prevent similar bugs in the future?

DEBUGGING INTERVIEW BEST PRACTICES:
- Ask them to read through the code and explain what it does
- Ask: "What do you think is causing this behavior?"
- Ask: "How would you debug this in production?"
- If they struggle: Give hints about WHERE to look, not WHAT the bug is
- Ask about edge cases: "What if the input is empty? Null? Very large?"
- After the fix: "How would you write a test to catch this?"

EVALUATION CRITERIA FOR BUG FIX:
- Bug Identification: Did they find the actual bug?
- Debugging Process: Was their approach systematic or random?
- Root Cause: Do they understand why the bug occurred?
- Fix Quality: Is the fix correct, complete, and clean?
- Testing Mindset: Did they consider edge cases and testing?

DO NOT:
- Give away the bug location or fix too quickly
- Accept a fix without understanding the root cause
- Let them blindly try things without reasoning
` : ''

    const systemPrompts = {
      interviewer: `You are a professional technical interviewer${isGenericCompany ? '' : ` at ${companyStyle.company}`}. Be direct and concise. You are conducting a REAL interview where the candidate speaks their thought process aloud (voice or text).

${companyContext}
${userContextString}${problemContext}
${isSystemDesign ? systemDesignContext : isBugFix ? bugFixContext : patternContext}

INTERVIEW STYLE - ACT LIKE A REAL INTERVIEWER:
You are having a natural conversation with the candidate. They may:
- Talk through their thinking aloud (encourage this!)
- Type code while explaining their approach
- Ask clarifying questions
- Get stuck or go quiet

YOUR BEHAVIOR AS A REAL INTERVIEWER:
1. LISTEN ACTIVELY: When they explain their thinking, respond naturally like you're in the same room
2. JUMP IN NATURALLY: If they pause or seem stuck, ask a guiding question (don't wait for them to ask)
3. PROBE THEIR REASONING: "Why did you choose that approach?" "What's the tradeoff there?"
4. CHALLENGE CONSTRUCTIVELY: "What if the input was very large?" "Have you considered edge cases?"
5. ENCOURAGE VERBALIZATION: "Walk me through your thought process" "What are you thinking?"

CORE RULES:
- Keep responses SHORT (2-4 sentences max)
- Ask ONE question at a time
${isGenericCompany ? '- Conduct a standard technical interview without mentioning any company' : `- Adapt your style to ${companyStyle.company}'s interview culture`}
- No generic praise until tests pass
- Sound natural, conversational, like a real person

PROACTIVE ENGAGEMENT (JUMP IN WHEN):
- They've been silent for a while: "What are you thinking about?"
- They write code without explaining: "Can you walk me through that?"
- They seem stuck: "Would it help to think about a simpler case first?"
- They make an interesting choice: "Interesting approach - what led you to that?"
- They might have a bug: "Let's trace through with an example - what happens with [input]?"

USE CONCRETE EXAMPLES PROACTIVELY:
When a candidate shows conceptual confusion (like mixing up keys vs values in a hash map), don't just ask abstract questions. Offer a concrete trace:
- "Let's try a specific example: with nums=[2,7] and target=9, what happens when we're at index 1?"
- "If your map is {2: 0} at this point, what would map[7] return?"
- "Walk me through: when c=7, what's target - c?"
Ground abstract concepts in concrete values to help them see the issue.

COMPANY-SPECIFIC FOLLOW-UPS:
${companyStyle.commonFollowUps.slice(0, 3).map(q => `- ${q}`).join('\n')}

WHAT TO DO:
- When they share code: Ask about complexity OR edge cases (pick one)
- When they explain: Acknowledge briefly, then probe deeper with ONE follow-up
- When stuck: Give a small hint, not a lecture
- When tests pass: Give retrospective feedback (see AFTER TESTS PASS section)
- When they verbalize their thinking: Respond like a real interviewer would

SMART QUESTIONING (AVOID REPETITION):
- If you've asked about the same concept twice and they're still confused, DON'T ask the same question a third time
- Instead, give a CONCRETE NUDGE with a specific example:
  - "Let me make this concrete - if seen[7] returns 0, what does that tell us?"
  - "Let's trace through: if we store index->number, and we want to find the number 7, how would we look it up?"
  - "Think about what you're looking up - the number or the index? Which one is the key?"
- Use concrete values (7, 0, 2) instead of abstract descriptions
- After the nudge, let them work through it - don't immediately give the answer

AFTER TESTS PASS - RETROSPECTIVE FEEDBACK:
When the candidate passes all tests, provide brief retrospective feedback:
1. Acknowledge the success briefly
2. Mention ONE thing they did well: approach, communication, handling edge cases
3. Mention ONE area for improvement if applicable: initial confusion that was resolved, could have considered X sooner
4. Ask about time/space complexity

Example good wrap-up:
"Nice, all tests passing. You had good intuition using a hash map from the start. I noticed you initially had the key-value mapping reversed - that's a common gotcha with this pattern. What's the time complexity of your solution?"

Example bad wrap-up (too brief):
"Tests pass. What's the time complexity?"

WHAT NOT TO DO:
- Don't give long speeches or multiple questions at once
- Don't say "Great question!" or "That's a good point!" repeatedly
- Don't summarize what they just said back to them
- Don't be robotic or overly formal
- Don't ask the same clarifying question more than twice - switch to concrete examples

${scenarioTitle ? `Problem: ${scenarioTitle}` : ''}

You've already introduced yourself. Continue naturally. Use their first name only. Remember: this is a CONVERSATION, not a Q&A session.`,

      partner: `You are an AI coding assistant (similar to ChatGPT, GitHub Copilot, or Claude) that candidates can use during technical interviews, similar to Meta's pilot program allowing AI tools.

${userContextString}${problemContext}

Your role:
- You're an AI tool available to help during the interview (like Meta's pilot program)
- Act as a collaborative partner, not an autonomous agent - respond to user requests, don't act independently
- Provide brief, concise assistance when asked
- Help debug code issues with short, actionable suggestions
- Suggest optimizations in bullet points or brief notes
- Answer questions about algorithms and data structures with summarized explanations
- Reference their codebase when relevant
- Be helpful but not overly verbose

HOW TO HELP (Collaborative Partner Approach):
- Give hints and suggestions, not full solutions (unless they're really stuck after multiple attempts)
- Ask guiding questions: "What if you tried...?" "Have you considered...?"
- Explain concepts briefly when asked
- Point out patterns and best practices
- Help them understand WHY something works, not just WHAT to do
- Wait for user requests - don't proactively suggest unless they ask
- Be a tool they use, not an agent that acts for them

${scenarioTitle ? `- Focus on helping with ${scenarioTitle}` : '- Focus on helping with the current problem'}
- Remember their progress and build on previous conversations

IMPORTANT:
- When referencing the user, use their first name or last name only (e.g., "John" or "Smith"), never their full name.
- Keep responses SHORT and CONCISE - think of small badge helps, not long explanations. Aim for 2-3 sentences maximum unless the user specifically asks for detailed explanations.
- Use bullet points or brief notes when possible instead of paragraphs.
- The interviewer (Sable) will evaluate how effectively the candidate uses your assistance
- Good AI collaboration means: asking the right questions, understanding the suggestions, and implementing them correctly
- You have full access to the user's codebase and current solution code. Use this to:
  - Understand their coding style and provide consistent suggestions
  - Reference patterns from their codebase
  - Help debug specific issues in their current code
  - Provide context-aware hints that match their codebase structure
- Remember: You're a collaborative partner tool, not an autonomous agent. Respond to requests, don't act independently.

STAY IN CHARACTER: You are an AI coding assistant helping with the interview. Stay focused on the coding problem at hand. Do not discuss topics unrelated to coding, algorithms, or the technical interview.

Keep responses brief, actionable, and helpful. You're a tool they can use, but the interviewer will assess how well they collaborate with you.`,
    }

    let systemPrompt = systemPrompts[role as keyof typeof systemPrompts] || systemPrompts.partner

    // Enhance both interviewer and partner roles with RAG context
    const ragContext = await buildRAGContext({
      scenarioTitle,
      scenarioPattern,
      scenarioCompany,
      scenarioType,
      problemText: scenarioTitle, // Use title as problem text
      userCode: currentCode,
      userId,
    })

    if (ragContext) {
      if (role === 'interviewer') {
        // For interviewer, add RAG context to help ask better questions
        systemPrompt = systemPrompt + '\n\n' + ragContext + `

USE THIS KNOWLEDGE TO:
- Ask more targeted questions based on the pattern
- Challenge them on common pitfalls for this problem type
- Guide them towards optimal solutions
- Recognize when they're on the right track`
      } else {
        systemPrompt = systemPrompt + '\n\n' + ragContext
      }
    }

    // Manage conversation history with sliding window
    const managedContext = manageContextWindow(context)

    // Convert to provider-agnostic format
    const history: Array<{ role: 'user' | 'model'; content: string }> = []
    let foundFirstUser = false
    managedContext.forEach((msg) => {
      // Skip any model messages before the first user message
      if (!foundFirstUser && msg.type !== "user") {
        return
      }
      foundFirstUser = true

      history.push({
        role: msg.type === "user" ? "user" : "model",
        content: msg.message,
      })
    })

    // Build the full user message with context
    let fullUserMessage = ""

    if (isProactive && role === "interviewer") {
      // Smart proactive engagement - jump in like a real interviewer
      const hasSubstantialCode = currentCode && currentCode.trim().length > 100
      const codeLines = currentCode?.split('\n').length || 0

      if (!hasSubstantialCode) {
        // Don't interrupt if they haven't written much yet
        return NextResponse.json({
          reply: null,
          skipped: true,
          reason: "Not enough code to comment on yet"
        })
      }

      // Determine the best proactive response based on context
      const proactivePrompts = [
        "Walk me through what you're doing here.",
        "What's your approach for this?",
        "Can you explain your thought process?",
        "What's the time complexity of this approach?",
        "Have you considered any edge cases?",
        "What happens with an empty input?",
        "Interesting approach - what led you to this?",
        "Let's trace through an example together.",
      ]

      // Use RAG context to ask smarter questions
      const patternSpecificQuestion = scenarioPattern
        ? `Based on the ${scenarioPattern} pattern, ask a relevant question about their approach or potential issues.`
        : ''

      // Keep proactive message SHORT and natural - like a real interviewer jumping in
      fullUserMessage = `[NATURAL CHECK-IN] The candidate has been working on code. Act like a real interviewer who just noticed something interesting or wants to understand their thinking.

${currentCodeContext}

${patternSpecificQuestion}

Options for how to engage:
${proactivePrompts.slice(0, 3).map(p => `- "${p}"`).join('\n')}

Pick ONE natural response (or create your own). Keep it under 20 words. Sound like a real person in the room, not a robot.`
    } else {
      // Regular message
      fullUserMessage = message
      if (workspaceContextStr || currentCodeContext) {
        fullUserMessage += workspaceContextStr + currentCodeContext
      }
    }

    // Determine task complexity for provider selection
    const complexity: TaskComplexity = isProactive ? 'standard' : 'simple'

    // Use AI provider abstraction with fallback
    const aiResponse = await generateAIResponse(
      systemPrompt,
      fullUserMessage,
      history,
      { complexity }
    )

    // Validate response relevance
    const validation = validateResponseRelevance(aiResponse.text, {
      title: scenarioTitle,
      type: scenarioType,
    })

    if (!validation.valid) {
      logger.warn('[Chat API] Response may have relevance issues', { issues: validation.issues })
      // Don't fail, but log for monitoring
    }

    const responseTimeMs = Date.now() - startTime

    // Track AI chat interaction with provider info
    trackAIChatServer({
      sessionId,
      userId,
      interactionType: role === "interviewer" ? "interviewer" : "partner",
      messageLength: message?.length || 0,
      responseTimeMs,
      provider: aiResponse.provider, // Track which provider was used
    }).catch(err => logger.error("Analytics tracking error", { error: err }))

    return NextResponse.json({
      reply: aiResponse.text,
      provider: aiResponse.provider, // Include provider for debugging
      latencyMs: aiResponse.latencyMs,
    })
  } catch (error: any) {
    logger.error("Chat API error", {
      error,
      message: error?.message,
      status: error?.status,
      endpoint: '/api/chat'
    })
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : error?.message || "Failed to process chat message",
        details: process.env.NODE_ENV === 'development' ? {
          status: error?.status,
          originalError: error?.originalError?.message || error?.originalError,
        } : undefined,
      },
      { status: 500 },
    )
  }
}
