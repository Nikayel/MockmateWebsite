import { NextRequest, NextResponse } from "next/server"
import { chatRateLimit } from "@/lib/rate-limit"
import { generateAIResponse, validateResponseRelevance, type TaskComplexity } from "@/lib/ai-providers"
import { trackAIChatServer } from "@/lib/analytics-server"
import { getCompanyStyle, getPatternMetadata, type DSAPattern } from "@/lib/types/dsa-patterns"

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

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await chatRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
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

    const systemPrompts = {
      interviewer: `You are a professional technical interviewer${isGenericCompany ? '' : ` at ${companyStyle.company}`}. Be direct and concise.

${companyContext}
${userContextString}${problemContext}
${patternContext}

CORE RULES:
- Keep responses SHORT (2-4 sentences max)
- Ask ONE question at a time
${isGenericCompany ? '- Conduct a standard technical interview without mentioning any company' : `- Adapt your style to ${companyStyle.company}'s interview culture`}
- No generic praise until tests pass
- Sound natural, not robotic

COMPANY-SPECIFIC FOLLOW-UPS:
${companyStyle.commonFollowUps.slice(0, 3).map(q => `- ${q}`).join('\n')}

WHAT TO DO:
- When they share code: Ask about complexity OR edge cases (pick one)
- When they explain: Acknowledge briefly, then probe deeper with ONE follow-up
- When stuck: Give a small hint, not a lecture
- When tests pass: Brief acknowledgment, then ask a follow-up question

WHAT NOT TO DO:
- Don't give long speeches or multiple questions at once
- Don't say "Great question!" or "That's a good point!" repeatedly
- Don't summarize what they just said back to them

${scenarioTitle ? `Problem: ${scenarioTitle}` : ''}

You've already introduced yourself. Continue naturally. Use their first name only.`,

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

    const systemPrompt = systemPrompts[role as keyof typeof systemPrompts] || systemPrompts.partner

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
      // DISABLED: Proactive messages were too intrusive and awkward
      // Instead, just return a simple check-in if they have substantial code
      const hasSubstantialCode = currentCode && currentCode.trim().length > 100

      if (!hasSubstantialCode) {
        // Don't interrupt if they haven't written much yet
        return NextResponse.json({
          reply: null,
          skipped: true,
          reason: "Not enough code to comment on yet"
        })
      }

      // Keep proactive message SHORT and non-intrusive
      fullUserMessage = `[BRIEF CHECK-IN] The candidate has code. Ask ONE short question about complexity or edge cases. Keep it under 15 words. Example: "What's the time complexity?" or "What if the input is empty?"

${currentCodeContext}

Ask ONE brief question:`
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
      console.warn('[Chat API] Response may have relevance issues:', validation.issues)
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
    }).catch(err => console.error("Analytics tracking error:", err))

    return NextResponse.json({
      reply: aiResponse.text,
      provider: aiResponse.provider, // Include provider for debugging
      latencyMs: aiResponse.latencyMs,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process chat message" },
      { status: 500 },
    )
  }
}
