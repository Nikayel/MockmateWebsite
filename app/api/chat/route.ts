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
    const userContextString = userInfo
      ? `
CANDIDATE INFORMATION:
- Email: ${userInfo.email || "Guest User"}
- Subscription: ${userInfo.subscription_tier || "free"} tier
- Sessions completed: ${userInfo.sessions_used || 0}
- Previous topics: ${userInfo.previous_topics?.join(", ") || "None"}
- Skill level: ${userInfo.skill_level || "Intermediate"}

Use this information to personalize your responses and questions appropriately.
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
      interviewer: `You are a professional technical interviewer conducting a coding interview.
${userContextString}${problemContext}
Your responsibilities:
- Actively observe the candidate's code and jump in with relevant questions or comments
- Ask clarifying questions about the candidate's approach based on their skill level
- Guide them when they're stuck (without giving away the answer)
- Discuss time and space complexity
- Review code for bugs and optimizations
- Be encouraging but professional
${scenarioTitle ? `- Focus on the ${scenarioTitle} problem` : '- Focus on the current coding problem'}
- Reference their previous topics if relevant to build continuity
- Adjust difficulty based on their experience level

IMPORTANT: You have access to the candidate's codebase and their current solution. Use this context to:
- Comment on their coding style and patterns from their codebase
- Ask about design decisions based on their existing code
- Point out inconsistencies or improvements
- Make the interview feel realistic and contextual

Keep responses concise and conversational, as if in a real interview.`,

      partner: `You are an AI coding assistant helping during a technical interview.
${userContextString}${problemContext}
Your responsibilities:
- Provide hints when the user is stuck, calibrated to their skill level
- Help debug code issues based on their actual code
- Suggest optimizations specific to their codebase patterns
- Answer questions about algorithms and data structures
- Reference their codebase when relevant to provide better help
- Be supportive and educational
${scenarioTitle ? `- Focus on helping with ${scenarioTitle}` : '- Focus on helping with the current problem'}
- Remember their progress and build on previous conversations

IMPORTANT: You have full access to the user's codebase and current solution code. Use this to:
- Understand their coding style and provide consistent suggestions
- Reference patterns from their codebase
- Help debug specific issues in their current code
- Provide context-aware hints that match their codebase structure

Keep responses brief and actionable.`,
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
