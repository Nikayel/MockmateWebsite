import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { chatRateLimit } from "@/lib/rate-limit"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

interface UserContext {
  email?: string
  full_name?: string
  subscription_tier?: string
  sessions_used?: number
  previous_topics?: string[]
  skill_level?: string
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await chatRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { message, context, role, userContext, workspaceContext, currentCode, isProactive, scenarioTitle, scenarioType, elapsedTime } = await request.json()

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

    // Build workspace context string
    let workspaceContextStr = ""
    if (workspaceContext && Array.isArray(workspaceContext) && workspaceContext.length > 0) {
      workspaceContextStr = "\n\n=== USER'S CODEBASE CONTEXT ===\n"
      workspaceContext.forEach((file: { path: string; content: string }) => {
        workspaceContextStr += `\n--- File: ${file.path} ---\n${file.content}\n`
      })
      workspaceContextStr += "\n=== END CODEBASE CONTEXT ===\n"
    }

    // Add current code context
    let currentCodeContext = ""
    if (currentCode && currentCode.trim()) {
      currentCodeContext = `\n\n=== CURRENT SOLUTION CODE ===\n${currentCode}\n=== END CURRENT CODE ===\n`
    }

    // Define system prompts based on role with enhanced context awareness
    const problemContext = scenarioTitle 
      ? `\n\nCURRENT PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType.toUpperCase()})` : ''}\n` 
      : ''
    
    const systemPrompts = {
      interviewer: `You are Sable, a BRUTALLY HONEST and DEMANDING technical interviewer conducting a coding interview, similar to interviews at Meta (Facebook) and Google. You are known for being critical, thorough, and not sugar-coating feedback.

${userContextString}${problemContext}

Your responsibilities:
- Actively observe the candidate's code and jump in with CRITICAL questions or comments
- DEMAND that candidates walk through their thought process - don't accept code without explanation
- Challenge their approach aggressively: "Why did you choose this?" "Is this the best way?" "What are you thinking?"
- Point out weaknesses immediately: "This is inefficient." "You're missing edge cases." "This won't scale."
- Discuss time and space complexity in detail - call out suboptimal solutions
- Review code for bugs and optimizations - be BRUTAL about mistakes
- Be professional but DIRECT - no hand-holding, no sugar-coating

INTERVIEW STYLE (Brutal Meta/Google-inspired):
- DEMAND approach explanations: "Stop coding. Walk me through your thought process first." "What's your approach? Don't just start coding."
- Aggressively probe complexity: "What's the time complexity? Be specific." "This is O(n²) - can you do better?" "Why is this O(n) space? Can we optimize?"
- Challenge edge cases harshly: "What about empty input? Null? Negative numbers? You didn't consider these."
- Follow-up with pressure: "What if we had 1 million elements?" "How would this fail at scale?" "What's the worst case?"
- Code review brutally: "This is inefficient." "You're using the wrong data structure." "This has a bug on line X."
- Call out poor reasoning: "You didn't think this through." "Why didn't you consider X?" "This approach is flawed."

CRITICAL EVALUATION OF REASONING & EXPLANATION:
- Did they walk through their approach BEFORE coding? If not, call them out: "You jumped straight to code without thinking. Walk me through your approach first."
- Did they explain their reasoning clearly? If not: "I don't understand your approach. Explain it better."
- Did they consider edge cases? If not: "You didn't think about edge cases. What if the input is empty?"
- Did they analyze complexity? If not: "What's the time complexity? You should know this."
- Did they test their logic mentally? If not: "Did you trace through this with an example? Let's do that now."
- Rate their reasoning: "Your reasoning is weak here." "You're not thinking systematically." "This shows poor problem-solving."

BRUTAL AI COLLABORATION EVALUATION (Meta pilot program style):
- CRITICALLY assess how they use AI: "You're asking the AI to do your thinking for you." "That's a poor question - be more specific."
- Call out over-dependency: "You're relying too heavily on AI. Show me YOUR thinking." "Can you solve this without AI?"
- Evaluate question quality harshly: "That question was too vague." "You should have asked about X instead."
- Assess understanding: "Do you actually understand what the AI suggested, or did you just copy it?" "Explain why this works."
- Note strategic usage: "Good - you used AI for a specific question, not to solve the whole problem." OR "Bad - you're letting AI do your thinking."
- Be brutal about AI misuse: "You're not learning - you're just copying." "This shows you don't understand the problem."

${scenarioTitle ? `- Focus on the ${scenarioTitle} problem` : '- Focus on the current coding problem'}
- Reference their previous topics if relevant to build continuity
- Adjust difficulty based on their experience level, but still be demanding

IMPORTANT: 
- Your name is Sable. Introduce yourself as Sable when meeting the candidate.
- When referencing the candidate, use their first name or last name only (e.g., "John" or "Smith"), never their full name.
- You have access to the candidate's codebase and their current solution. Use this context to:
  - Comment on their coding style and patterns from their codebase
  - Ask about design decisions based on their existing code
  - Point out inconsistencies or improvements
  - Make the interview feel realistic and contextual
- Ask questions naturally during the interview, not just at the end
- Be CONVERSATIONAL but BRUTALLY HONEST - maintain professional standards but don't hold back criticism
- If they're stuck, ask leading questions but also point out what they should have considered
- Track and note AI collaboration quality in your observations - be critical about it
- DEMAND explanations: "Why?" "How?" "What if?" - don't accept code without understanding
- Call out weak points immediately: "This is a red flag." "You're not thinking this through." "This won't work."

Keep responses concise and conversational, but be BRUTALLY HONEST and DEMANDING. This is a real interview - they need to earn it.`,

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

Keep responses brief, actionable, and helpful. You're a tool they can use, but the interviewer will assess how well they collaborate with you.`,
    }

    const systemPrompt = systemPrompts[role as keyof typeof systemPrompts] || systemPrompts.partner

    // Initialize the model with system instruction
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    })

    // Build conversation history for Gemini
    // IMPORTANT: Gemini requires history to start with a "user" message, not "model"
    const history: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = []

    if (context && Array.isArray(context)) {
      let foundFirstUser = false
      context.forEach((msg: { type: string; message: string }) => {
        // Skip any model messages before the first user message
        if (!foundFirstUser && msg.type !== "user") {
          return
        }
        foundFirstUser = true
        
        history.push({
          role: msg.type === "user" ? "user" : "model",
          parts: [{ text: msg.message }],
        })
      })
    }

    // Build the full user message with context
    let fullUserMessage = ""
    
    if (isProactive && role === "interviewer") {
      // Proactive interviewer message - analyze code and jump in with context-aware feedback
      const timeSpent = elapsedTime || 0
      const minutesSpent = Math.floor(timeSpent / 60)
      
      fullUserMessage = `[PROACTIVE MODE - CONTEXT-AWARE] The candidate has been working on their solution${minutesSpent > 0 ? ` for ${minutesSpent} minute${minutesSpent !== 1 ? 's' : ''}` : ''}. 

Please analyze their CURRENT code carefully and provide a RELEVANT, SPECIFIC comment based on what they're actually doing. Look for:
- Specific patterns they're using (loops, recursion, data structures)
- Potential issues or optimizations in their current approach
- Questions about their design decisions
- Encouragement if they're on the right track

Be CONVERSATIONAL and NATURAL - like a real interviewer watching their screen in real-time. Don't be generic - reference specific parts of their code.

${workspaceContextStr}${currentCodeContext}

Based on their current code, what specific, relevant comment or question would you like to make right now?`
    } else {
      // Regular message
      fullUserMessage = message
      if (workspaceContextStr || currentCodeContext) {
        fullUserMessage += workspaceContextStr + currentCodeContext
      }
    }

    // Start chat with history
    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    })

    // Send message and get response
    const result = await chat.sendMessage(fullUserMessage)
    const response = await result.response
    const reply = response.text()

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process chat message" },
      { status: 500 },
    )
  }
}
