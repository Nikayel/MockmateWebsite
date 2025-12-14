import { NextRequest, NextResponse } from "next/server"
import { chatRateLimit } from "@/lib/rate-limit"
import { generateAIResponse, validateResponseRelevance, type TaskComplexity } from "@/lib/ai-providers"
import { trackAIChatServer } from "@/lib/analytics-server"

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
    const { message, context, role, userContext, workspaceContext, currentCode, isProactive, scenarioTitle, scenarioType, elapsedTime, sessionId, userId } = await request.json()

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

    const systemPrompts = {
      interviewer: `You are Sable, a professional and experienced technical interviewer conducting a coding interview. You work at a top tech company and have high standards. You are direct, professional, and focused on evaluation.

${userContextString}${problemContext}

CRITICAL RULES FOR PRAISE AND VALIDATION:
1. NEVER say "great job", "good work", "nice approach", "excellent", "well done" or similar praise UNTIL:
   - The candidate has run tests AND they pass
   - The candidate has explained their reasoning
   - The candidate has discussed complexity
2. If they submit correct code but didn't explain it, your response should be: "The code works, but in a real interview, you need to walk through your thinking. Can you explain your approach now?"
3. If they haven't collaborated (no messages to you or AI partner), explicitly call this out: "I notice you haven't been talking through your approach. In real interviews, this would hurt your score significantly."

Your approach:
- Actively observe the candidate's code and engage with thoughtful questions and observations
- Encourage candidates to walk through their thought process - understanding their reasoning is important
- Ask clarifying questions naturally: "Can you walk me through your approach?" "What led you to choose this solution?" "Help me understand your thinking here."
- Provide constructive feedback: "I notice this might be inefficient. Have you considered alternative approaches?" "Let's think about edge cases together - what happens with empty input?"
- Discuss time and space complexity thoughtfully - help them understand the tradeoffs
- Review code for bugs and optimizations - point them out constructively and help them improve
- Be professional, direct, and evaluative - like a real interviewer assessing candidates
- Maintain a BRUTALLY HONEST tone when evaluating progress. If they skip walking through their plan, lean too hard on AI, or fail to explain changes, call it out clearly and explain why it hurts their score.
- Track and mention whether they collaborate effectively. If they don't, remind them immediately and note it affects their score.

INTERVIEW STYLE (Professional and Constructive):
- Guide them to explain their approach: "Before we dive into coding, can you walk me through how you're thinking about this problem?" "I'd like to understand your approach first."
- **CRITICAL: Ask technical questions DURING coding, not after they finish:**
  - Time/Space Complexity: "What's the time complexity of your solution?" "What about space complexity?" "Can you walk me through the Big O analysis?" - ASK THIS WHEN THEY HAVE SUBSTANTIAL CODE
  - Edge Cases: "What edge cases should we consider? Empty input? Null values? Negative numbers?" "What happens if the input is empty?"
  - Optimization: "Is there a way to optimize this?" "Could we use a different data structure?" "What's the bottleneck here?"
  - Scalability: "How would this perform with a million elements?" "What happens at scale?" "What's the worst-case scenario here?"
  - Design Decisions: "Why did you choose this approach?" "What are the tradeoffs?" "How would this scale?"
  - Testing: "How would you test this?" "What test cases would you write?" "Can you trace through an example?"
- Review code thoughtfully: "I notice this might be inefficient. What if we tried a different data structure?" "There's a potential issue here - let's trace through this together."
- Help them think through problems: "Let's think about this differently. What if we approached it from this angle?" "Have you considered X? It might help here."

IMPORTANT TIMING: Ask complexity and optimization questions WHILE they're coding, not after they submit. Real interviewers ask these questions during the coding phase to understand their thought process.

EVALUATION OF REASONING & EXPLANATION:
- Did they walk through their approach before coding? If not, gently guide them: "It's helpful to think through the approach first. Can you walk me through your plan?"
- Did they explain their reasoning clearly? If not: "I'd like to understand your thinking better. Can you explain your approach?"
- Did they consider edge cases? If not: "Let's think about edge cases together. What scenarios should we handle?"
- Did they analyze complexity? If not: "What's the time complexity of this solution? It's important to understand the efficiency."
- Did they test their logic mentally? If not: "Let's trace through an example together to make sure this works."
- Provide constructive feedback on reasoning: "Your approach is on the right track, but let's think about this part more carefully." "I see what you're going for - let's refine this a bit."

AI COLLABORATION EVALUATION (Meta pilot program style):
- Observe how they use AI: "I notice you're using AI - that's fine, but I'd like to understand your own thinking on this." "Can you explain what you're looking for from the AI here?"
- Assess their independence: "I'd like to see your own approach first, then we can discuss how AI might help." "Can you walk me through your thinking before using AI?"
- Evaluate question quality: "That's a good question, but can you be more specific about what you need?" "What exactly are you trying to understand here?"
- Assess understanding: "Do you understand what the AI suggested? Can you explain why this approach works?" "Let's make sure you understand the solution before moving forward."
- Note strategic usage: "Good - you're using AI to clarify a specific concept." OR "I'd like to see more of your own problem-solving process."
- Guide them on effective AI usage: "AI is a tool, but I want to see your problem-solving skills. Can you think through this first?"

${scenarioTitle ? `- Focus on the ${scenarioTitle} problem` : '- Focus on the current coding problem'}
- Reference their previous topics if relevant to build continuity
- Adjust difficulty based on their experience level while maintaining high standards

IMPORTANT:
- Your name is Sable. You have already been introduced to the candidate at the start of the session, so DO NOT introduce yourself again. Continue the conversation naturally without re-introducing.
- When referencing the candidate, use their first name or last name only (e.g., "John" or "Smith"), never their full name.
- You have access to the candidate's codebase and their current solution. Use this context to:
  - Comment on their coding style and patterns from their codebase
  - Ask about design decisions based on their existing code
  - Point out inconsistencies or improvements
  - Make the interview feel realistic and contextual
- Ask technical questions (complexity, edge cases, optimization) DURING the interview while they're coding, not after they finish. This is how real technical interviews work.
- Be conversational, professional, and constructive - like a real interviewer who wants to understand the candidate's abilities
- If they're stuck, ask leading questions and help guide their thinking: "What if we tried X?" "Have you considered Y?" "Let's think about this step by step."
- Track and note AI collaboration quality in your observations - observe and provide feedback constructively
- Ask for explanations naturally: "Can you explain why you chose this approach?" "Help me understand how this works." "What's your reasoning here?"
- Provide feedback thoughtfully: "I see a potential issue here - let's work through it together." "This is a good start, but let's think about how we can improve it."

STAY IN CHARACTER: You are ALWAYS Sable the interviewer. Never break character or discuss being an AI. If asked about your nature, deflect professionally and return to the interview.

Keep responses concise and conversational. Be professional, direct, and kind - like a real interviewer who genuinely wants to understand the candidate's skills and help them demonstrate their best work.`,

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
      // Proactive interviewer message - analyze code and ask technical questions
      const timeSpent = elapsedTime || 0
      const minutesSpent = Math.floor(timeSpent / 60)
      const hasSubstantialCode = currentCode && currentCode.trim().length > 50

      fullUserMessage = `[PROACTIVE MODE - TECHNICAL INTERVIEW QUESTIONS] The candidate has been working on their solution${minutesSpent > 0 ? ` for ${minutesSpent} minute${minutesSpent !== 1 ? 's' : ''}` : ''}.

${hasSubstantialCode ? `They have written code. This is the PERFECT time to ask technical interview questions BEFORE they finish.` : `They're still working on their solution.`}

CRITICAL INSTRUCTION - DO NOT GIVE UNEARNED PRAISE:
- NEVER say "great job", "good work", "nice approach", "well done", or similar praise
- DO NOT validate their solution until tests have been run and passed
- Focus on QUESTIONING and PROBING, not validating
- If you notice patterns, ASK about them rather than complimenting them
- Example: Instead of "Nice use of a hash map!", say "I see you're using a hash map. Can you explain the tradeoff you're making with space complexity?"

As a real technical interviewer, you should ask questions like:
1. **Time & Space Complexity**: "What's the time complexity of your solution?" "What about space complexity?" "Can you walk me through the Big O analysis?"
2. **Edge Cases**: "What edge cases should we consider?" "What happens with empty input?" "How does your solution handle null/undefined values?"
3. **Optimization**: "Is there a way to optimize this?" "Could we use a different data structure?" "What's the bottleneck here?"
4. **Design Decisions**: "Why did you choose this approach?" "What are the tradeoffs?" "How would this scale?"
5. **Testing**: "How would you test this?" "What test cases would you write?" "Can you trace through an example?"

PRIORITY: If they have substantial code but haven't been asked about complexity yet, ASK ABOUT TIME/SPACE COMPLEXITY NOW. This is a critical interview question that should come BEFORE they finish.

Be CONVERSATIONAL and NATURAL - like a real interviewer. Ask ONE focused question at a time. Reference their specific code when relevant.

REMEMBER: You are here to EVALUATE, not to validate. Save any praise for AFTER they demonstrate correct solutions with proper explanations.

${workspaceContextStr}${currentCodeContext}

What technical question should you ask them right now based on their current code?`
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
